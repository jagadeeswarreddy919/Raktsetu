from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.ai_engine import predict_shortage, rank_donors

router = APIRouter()

class ShortageRequest(BaseModel):
    month: int
    state_code: int
    pincode_factor: float
    current_inventory: int
    prev_month_demand: int

class ShortageResponse(BaseModel):
    predicted_shortage: float
    message: str

class RequestDetails(BaseModel):
    bloodGroup: str
    state: str
    district: str
    city: str
    area: Optional[str] = ""
    village: Optional[str] = ""

class DonorProfile(BaseModel):
    fullName: str
    email: str
    phone: str
    bloodGroup: str
    state: str
    district: str
    city: str
    area: Optional[str] = ""
    village: Optional[str] = ""
    pincode: str
    availability: Optional[bool] = True
    isVerifiedDonor: Optional[bool] = False
    lastDonationDate: Optional[str] = None
    rewardPoints: Optional[int] = 0

class RankDonorsRequest(BaseModel):
    request: RequestDetails
    donors: List[DonorProfile]

@router.post("/predict-shortage", response_model=ShortageResponse)
def get_prediction(data: ShortageRequest):
    try:
        shortage = predict_shortage(
            month=data.month,
            state_code=data.state_code,
            pincode_factor=data.pincode_factor,
            current_inventory=data.current_inventory,
            prev_month_demand=data.prev_month_demand
        )
        
        message = "High risk of blood deficit!" if shortage > 30 else "Safe buffer levels predicted."
        return ShortageResponse(predicted_shortage=shortage, message=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rank-donors")
def get_donor_rankings(data: RankDonorsRequest):
    try:
        # Convert Pydantic profiles to standard dict arrays
        donors_dict = [d.dict() for d in data.donors]
        request_dict = data.request.dict()
        
        ranked = rank_donors(request_dict, donors_dict)
        return ranked
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
