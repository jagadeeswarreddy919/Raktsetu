import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from datetime import datetime, timedelta

# In-memory ML Model
shortage_model = None

# Blood compatibility matrix
# Key can donate to Value
COMPATIBILITY = {
    'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
    'O+': ['O+', 'A+', 'B+', 'AB+'],
    'A-': ['A-', 'A+', 'AB-', 'AB+'],
    'A+': ['A+', 'AB+'],
    'B-': ['B-', 'B+', 'AB-', 'AB+'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
}

def is_compatible(donor_blood, recipient_blood):
    if donor_blood == recipient_blood:
        return True
    return recipient_blood in COMPATIBILITY.get(donor_blood, [])

def train_shortage_predictor():
    """
    Train a Random Forest model on simulated regional historical data.
    Simulating features: [Month, State_Code, Pincode_Factor, Current_Inventory, Prev_Month_Demand]
    Target: Deficit (Shortage Units)
    """
    global shortage_model
    np.random.seed(42)
    
    # Generate 1000 records of training data
    records_count = 1000
    months = np.random.randint(1, 13, size=records_count)
    state_codes = np.random.randint(1, 10, size=records_count) # 1 to 9 codes
    pincode_factors = np.random.uniform(0.1, 1.0, size=records_count)
    current_inventory = np.random.randint(5, 100, size=records_count)
    prev_month_demand = np.random.randint(10, 120, size=records_count)
    
    # Target value: Deficit = Prev_Demand * Pincode_Factor - Inventory + (Month effect, e.g. summer/monsoon shortages)
    season_factor = np.where((months >= 5) & (months <= 7), 1.3, 1.0) # Summer shortage
    deficit = (prev_month_demand * season_factor * pincode_factors) - current_inventory
    deficit = np.clip(deficit, 0, 150) # Deficits are positive numbers
    
    X = pd.DataFrame({
        'month': months,
        'state_code': state_codes,
        'pincode_factor': pincode_factors,
        'current_inventory': current_inventory,
        'prev_month_demand': prev_month_demand
    })
    y = deficit

    model = RandomForestRegressor(n_estimators=50, random_state=42)
    model.fit(X, y)
    shortage_model = model
    print("[AI ENGINE] Blood Shortage Predictor model trained successfully.")

def predict_shortage(month: int, state_code: int, pincode_factor: float, current_inventory: int, prev_month_demand: int) -> float:
    """
    Predicts the expected blood unit shortage.
    """
    global shortage_model
    if shortage_model is None:
        train_shortage_predictor()
    
    input_data = pd.DataFrame([{
        'month': month,
        'state_code': state_code,
        'pincode_factor': pincode_factor,
        'current_inventory': current_inventory,
        'prev_month_demand': prev_month_demand
    }])
    
    predicted_val = shortage_model.predict(input_data)[0]
    return float(np.round(predicted_val, 2))

def rank_donors(request_details: dict, donors: list) -> list:
    """
    Rank donors based on compatibility, proximity, availability, and eligibility.
    """
    ranked_list = []
    req_group = request_details.get('bloodGroup')
    req_state = request_details.get('state')
    req_district = request_details.get('district')
    req_city = request_details.get('city')
    req_area = request_details.get('area', '')
    req_village = request_details.get('village', '')

    for donor in donors:
        d_group = donor.get('bloodGroup')
        
        # 1. Filter out incompatible blood types immediately
        if not is_compatible(d_group, req_group):
            continue

        score = 0

        # 2. Location Proximity scoring (Database-based hierarchical tags)
        if donor.get('state') == req_state:
            score += 25
            if donor.get('district') == req_district:
                score += 25
                if donor.get('city') == req_city:
                    score += 25
                    # Area/Village match is extremely local
                    if req_area and donor.get('area') == req_area:
                        score += 25
                    elif req_village and donor.get('village') == req_village:
                        score += 25

        # 3. Blood Group compatibility bonus
        if d_group == req_group:
            score += 50  # Exact match priority
        else:
            score += 20  # Compatible O- / general match

        # 4. Availability flag bonus
        if donor.get('availability', True):
            score += 40

        # 5. Last donation eligibility tracking
        last_donation = donor.get('lastDonationDate')
        eligible = True
        if last_donation:
            try:
                # Expecting string or datetime
                if isinstance(last_donation, str):
                    last_date = datetime.strptime(last_donation.split('T')[0], '%Y-%m-%d')
                else:
                    last_date = last_donation
                if datetime.now() - last_date < timedelta(days=90):
                    eligible = False
            except Exception:
                pass
        
        if eligible:
            score += 30
        else:
            score -= 50  # Heavy penalty if currently ineligible to donate

        # 6. Verified Donor bonus
        if donor.get('isVerifiedDonor', False):
            score += 20

        # 7. Engagement Reward Points boost (up to 20 additional points)
        reward_points = donor.get('rewardPoints', 0)
        score += min(reward_points * 0.1, 20)

        # Attach calculation log and score
        donor_ranked = donor.copy()
        donor_ranked['aiScore'] = float(np.round(score, 2))
        donor_ranked['isEligible'] = eligible
        ranked_list.append(donor_ranked)

    # Sort candidates by AI score descending
    ranked_list.sort(key=lambda x: x['aiScore'], reverse=True)
    return ranked_list

# Train the model on import
train_shortage_predictor()
