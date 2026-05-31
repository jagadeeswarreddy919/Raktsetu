import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldAlert, Activity, ClipboardList, Database, Save, CalendarRange, 
  Plus, Heart, MessageSquare, Phone, MapPin, X, RefreshCw, Loader2,
  Printer, Search, Award, Users, Sparkles 
} from 'lucide-react';
import { updateProfileSuccess } from '../redux/authSlice';
import { 
  firebaseSendEmailVerification, 
  firebaseGetCurrentUserToken 
} from '../utils/firebase';
import { socket } from '../utils/socket';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { STATES_DATA } from '../utils/statesData';
import AppreciationCertificate from '../components/AppreciationCertificate';
import SmartSearchInput from '../components/SmartSearchInput';

// Case-insensitive normalization helpers for locations to match STATES_DATA keys
const normalizeState = (stateName) => {
  if (!stateName) return '';
  const match = Object.keys(STATES_DATA).find(
    s => s.toLowerCase() === stateName.toLowerCase()
  );
  return match || stateName;
};

const normalizeDistrict = (stateName, districtName) => {
  if (!stateName || !districtName) return '';
  const normState = normalizeState(stateName);
  if (!STATES_DATA[normState]) return districtName;
  const match = Object.keys(STATES_DATA[normState]).find(
    d => d.toLowerCase() === districtName.toLowerCase() || 
         d.toLowerCase().includes(districtName.toLowerCase()) || 
         districtName.toLowerCase().includes(d.toLowerCase())
  );
  return match || districtName;
};

const normalizeCity = (stateName, districtName, cityName) => {
  if (!stateName || !districtName || !cityName) return '';
  const normState = normalizeState(stateName);
  const normDistrict = normalizeDistrict(stateName, districtName);
  if (!STATES_DATA[normState]?.[normDistrict]) return cityName;
  const match = STATES_DATA[normState][normDistrict].find(
    c => c.toLowerCase() === cityName.toLowerCase() || 
         c.toLowerCase().includes(cityName.toLowerCase()) || 
         cityName.toLowerCase().includes(c.toLowerCase())
  );
  return match || cityName;
};

const HospitalDashboard = () => {
  const { user, token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useDispatch();


  const [syncingEmail, setSyncingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null);

  const isUnverified = false;

  // New tab controller for the left-hand column/main view
  const [activeTab, setActiveTab] = useState('operations'); // 'operations' | 'donorRegistry' | 'browseRequests'
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [nearbyRequests, setNearbyRequests] = useState([]);

  // Smart Matching Donor Search Filters
  const [filterBloodGroup, setFilterBloodGroup] = useState('O+');
  const [filterState, setFilterState] = useState(user?.state || '');
  const [filterDistrict, setFilterDistrict] = useState(user?.district || '');
  const [filterCity, setFilterCity] = useState(user?.city || '');
  const [filterPincode, setFilterPincode] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all'); // all, available, emergency
  const [filterVerified, setFilterVerified] = useState(false);

  const [eligibleDonors, setEligibleDonors] = useState([]);
  const [searching, setSearching] = useState(false);


  const handleResendVerification = async () => {
    setResendingEmail(true);
    setVerificationFeedback(null);
    try {
      await firebaseSendEmailVerification(user?.email);
      setVerificationFeedback({
        type: 'success',
        message: 'Verification email sent! Please check your inbox and spam folders.'
      });
    } catch (err) {
      console.error(err);
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Failed to send verification email.'
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleSyncVerification = async () => {
    setSyncingEmail(true);
    setVerificationFeedback(null);
    try {
      const idToken = await firebaseGetCurrentUserToken(true);
      if (!idToken) {
        throw new Error('Could not retrieve active Firebase session token.');
      }
      
      const res = await axios.post(
        `${API_URL}/api/auth/firebase-sync`,
        { idToken },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      dispatch(updateProfileSuccess(res.data.user));
      setVerificationFeedback({
        type: 'success',
        message: 'Email status synced! Your account is now fully verified.'
      });
    } catch (err) {
      console.error(err);
      setVerificationFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Verification sync failed. Make sure you clicked the link in the email first.'
      });
    } finally {
      setSyncingEmail(false);
    }
  };

  const handleActionBlock = (actionName) => {
    if (isUnverified) {
      alert(`Action Blocked: Please verify your email address to ${actionName || 'perform this action'}. You can request a verification link and sync your status at the top of the page.`);
      return true;
    }
    return false;
  };

  // Inventories state
  const [inventory, setInventory] = useState(
    user?.bloodInventory || { 'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0, 'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0 }
  );

  // Campaign Drive Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [locationName, setLocationName] = useState('');
  const [state, setState] = useState(normalizeState(user?.state || ''));
  const [district, setDistrict] = useState(normalizeDistrict(user?.state || '', user?.district || ''));
  const [city, setCity] = useState(normalizeCity(user?.state || '', user?.district || '', user?.city || ''));
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [bannerImage, setBannerImage] = useState('');

  const [activeDrives, setActiveDrives] = useState([]);

  // Tab controller for the right-hand form column
  const [rightTab, setRightTab] = useState('drive'); // 'drive' or 'request'

  // Request Blood Form state
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [neededBy, setNeededBy] = useState('');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [reason, setReason] = useState('');

  // Geographics for blood request pre-populated from hospital profile
  const [reqState, setReqState] = useState(normalizeState(user?.state || ''));
  const [reqDistrict, setReqDistrict] = useState(normalizeDistrict(user?.state || '', user?.district || ''));
  const [reqCity, setReqCity] = useState(normalizeCity(user?.state || '', user?.district || '', user?.city || ''));
  const [reqPincode, setReqPincode] = useState(user?.pincode || '');
  const [reqHospitalAddress, setReqHospitalAddress] = useState(user?.address || '');

  // Hospital's Blood Request Tickets
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchDrives = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/campaigns`);
      // Filter drives organized by this specific hospital
      const filtered = res.data.filter(d => d.organizer?._id === user._id);
      setActiveDrives(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/requests`);
      const filtered = res.data.filter(r => r.requester?._id === user._id || r.requester === user._id);
      setMyRequests(filtered);
    } catch (err) {
      console.error('[Fetch Requests Error]', err);
    }
  };

  const fetchNearbyRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/requests?state=${user?.state || ''}&district=${user?.district || ''}&city=${user?.city || ''}`);
      setNearbyRequests(res.data.filter(r => r.status === 'Pending' && r.requester?._id !== user?._id && r.requester !== user?._id));
    } catch (err) {
      console.error('[Fetch Regional Requests Error]', err);
    }
  };

  const fetchEligibleDonors = async () => {
    setSearching(true);
    try {
      const params = {
        bloodGroup: filterBloodGroup,
        state: filterState,
        district: filterDistrict,
        city: filterCity,
        pincode: filterPincode,
        verified: filterVerified ? 'true' : 'false'
      };

      if (filterAvailability === 'available') params.availability = 'true';
      if (filterAvailability === 'emergency') params.emergency = 'true';

      const res = await axios.get(`${API_URL}/api/requests/search/donors`, { params });
      setEligibleDonors(res.data);
    } catch (err) {
      console.error('[Search Donors Error]', err);
    } finally {
      setSearching(false);
    }
  };

  // Socket initialization
  useEffect(() => {
    if (user) {
      socket.emit('register', user._id);

      socket.on('request_accepted', (data) => {
        // If the request belongs to this hospital, auto refresh
        if (data.request?.requester === user._id || data.request?.requester?._id === user._id) {
          fetchMyRequests();
        }
      });

      socket.on('donation_verified', (data) => {
        console.log('[WebSocket] Donation Verified:', data);
        alert(data.message || '🎉 Thank you! Your blood donation has been successfully verified.');
        setShowCertificateModal(true);
        
        // Auto refresh user profile to sync updated reward points and badges in state
        axios.get(`${API_URL}/api/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          dispatch(updateProfileSuccess(res.data));
        }).catch(err => console.error('[Profile Auto-Refresh Failed]', err));
      });
    }

    return () => {
      socket.off('request_accepted');
      socket.off('donation_verified');
    };
  }, [user, token]);

  useEffect(() => {
    if (user) {
      fetchDrives();
      fetchMyRequests();
      fetchNearbyRequests();
      fetchEligibleDonors();

      // Normalize locations upon user load/update
      setState(normalizeState(user.state || ''));
      setDistrict(normalizeDistrict(user.state || '', user.district || ''));
      setCity(normalizeCity(user.state || '', user.district || '', user.city || ''));

      setReqState(normalizeState(user.state || ''));
      setReqDistrict(normalizeDistrict(user.state || '', user.district || ''));
      setReqCity(normalizeCity(user.state || '', user.district || '', user.city || ''));
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchEligibleDonors();
    }
  }, [filterBloodGroup, filterState, filterDistrict, filterCity, filterPincode, filterAvailability, filterVerified]);

  const handleInventoryChange = (group, val) => {
    setInventory({
      ...inventory,
      [group]: Math.max(0, parseInt(val) || 0)
    });
  };

  const saveInventory = async () => {
    if (handleActionBlock('update blood inventory')) return;
    try {
      const res = await axios.put(
        `${API_URL}/api/auth/inventory`,
        { bloodInventory: inventory },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Hospital blood bank inventory updated successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update inventory.');
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (handleActionBlock('create a blood request')) return;
    try {
      await axios.post(
        `${API_URL}/api/requests`,
        {
          patientName,
          bloodGroup,
          unitsRequired: parseInt(unitsRequired),
          hospitalName: user.fullName, // Default to hospital name
          neededBy,
          emergencyMode,
          reason,
          state: reqState,
          district: reqDistrict,
          city: reqCity,
          pincode: reqPincode,
          hospitalAddress: reqHospitalAddress
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Blood request ticket published successfully. Smart matching alerts sent in real-time!');
      setPatientName('');
      setUnitsRequired(1);
      setNeededBy('');
      setEmergencyMode(false);
      setReason('');
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const handlePledgeOutcome = async (requestId, pledgeId, status) => {
    if (handleActionBlock('verify pledge status')) return;
    try {
      const res = await axios.put(
        `${API_URL}/api/requests/${requestId}/pledge/${pledgeId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Donation pledge marked as ${status}. Verified lifesaver points distributed!`);
      // Update selected request view in state
      setSelectedRequest(res.data.request);
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify donation.');
    }
  };

  const handleInitiateChat = async (recipientId) => {
    try {
      await axios.post(
        `${API_URL}/api/chats`,
        { recipientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/chat');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to start secure chat.');
    }
  };

  const handlePledge = async (requestId) => {
    if (handleActionBlock('pledge blood')) return;
    try {
      await axios.post(
        `${API_URL}/api/requests/${requestId}/pledge`,
        { unitsPledged: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Thank you for pledging! The request has been successfully accepted.');
      fetchNearbyRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pledge.');
    }
  };

  const handleCreateDrive = async (e) => {
    e.preventDefault();
    if (handleActionBlock('schedule a donation drive')) return;

    try {
      await axios.post(
        `${API_URL}/api/campaigns`,
        {
          title, description, startDate, endDate, locationName,
          state, district, city, pincode, bannerImage
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Donation drive scheduled successfully!');
      // Reset forms
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setLocationName('');
      setBannerImage('');
      fetchDrives();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register donation drive.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Glassmorphic Email Verification Banner */}
      {isUnverified && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-lg border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl animate-pulse flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-black text-sm uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Email Verification Required
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                Your hospital portal is running in a limited status because your email address <span className="font-extrabold text-slate-800 dark:text-white">({user?.email})</span> is unverified. Please check your inbox for the verification link.
              </p>
              {verificationFeedback && (
                <p className={`text-xs font-bold mt-2 ${verificationFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {verificationFeedback.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-shrink-0">
            <button
              onClick={handleResendVerification}
              disabled={resendingEmail}
              className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all flex items-center justify-center gap-2"
            >
              {resendingEmail && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Resend Email
            </button>
            <button
              onClick={handleSyncVerification}
              disabled={syncingEmail}
              className="w-full md:w-auto px-5 py-2.5 bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-dark-700 disabled:opacity-50 text-slate-800 dark:text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingEmail ? 'animate-spin' : ''}`} />
              Sync Status
            </button>
          </div>
        </div>
      )}
      
      <div className="p-8 bg-slate-900 text-white rounded-3xl shadow-xl flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -z-10"></div>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-[10px] font-black uppercase bg-primary-500 rounded-full">Hospital Dashboard</span>
            {user?.isVerifiedHospital ? (
              <span className="px-3 py-1 text-[10px] font-black uppercase bg-emerald-600 rounded-full">Verified Medical Partner</span>
            ) : (
              <span className="px-3 py-1 text-[10px] font-black uppercase bg-amber-600 rounded-full">Verification Pending</span>
            )}
          </div>
          <h1 className="text-3xl font-black mt-2">{user.fullName}</h1>
          <p className="text-xs text-slate-400">License ID: {user.hospitalLicenseNumber || 'Pending'} • Location: {user.city}, {user.state}</p>
        </div>
      </div>

      {/* Premium Glassmorphic Tab Selector */}
      <div className="flex p-1 bg-slate-100 dark:bg-dark-800/80 rounded-2xl shadow-inner border border-slate-200/50 dark:border-slate-800/80 max-w-2xl">
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex-grow py-3 px-4 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'operations'
              ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" /> Operations
        </button>
        <button
          onClick={() => setActiveTab('donorRegistry')}
          className={`flex-grow py-3 px-4 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'donorRegistry'
              ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" /> Smart Match Finder
        </button>
        <button
          onClick={() => setActiveTab('browseRequests')}
          className={`flex-grow py-3 px-4 text-center text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'browseRequests'
              ? 'bg-white dark:bg-dark-900 text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" /> Browse Regional Requests
        </button>
      </div>

      {activeTab === 'operations' && (
        <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          
          {/* Blood Inventory Panel */}
          <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2"><Database className="text-primary-500" /> Blood Bank Inventories (Units)</h3>
              <button
                onClick={saveInventory}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 shadow-md"
              >
                <Save className="w-3.5 h-3.5" /> Save Quantities
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.keys(inventory).map((group) => (
                <div key={group} className="p-4 bg-slate-50 dark:bg-dark-800/40 rounded-2xl border border-slate-100 dark:border-slate-800/40 text-center space-y-2">
                  <span className="text-lg font-black text-primary-500">{group}</span>
                  <input
                    type="number"
                    min="0"
                    value={inventory[group]}
                    onChange={(e) => handleInventoryChange(group, e.target.value)}
                    className="w-full p-2 text-center bg-white dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Active Blood Requests Registry & Pledges */}
          <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 text-primary-600">
              <Heart className="text-primary-500 fill-primary-500 animate-pulse" /> Active Patient Blood Requests
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Requests Registry */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {myRequests.length > 0 ? (
                  myRequests.map((req) => (
                    <div 
                      key={req._id} 
                      onClick={() => setSelectedRequest(req)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                        selectedRequest?._id === req._id
                          ? 'bg-primary-50/50 dark:bg-primary-950/20 border-primary-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-dark-800/50 hover:bg-slate-100/50 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-[9px] font-black bg-primary-100 dark:bg-primary-950/30 text-primary-600 rounded">
                            {req.bloodGroup} Needed
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                            req.status === 'Fulfilled' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                          }`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="font-bold text-xs">Patient: {req.patientName}</p>
                        <p className="text-[10px] text-slate-400">{req.unitsFulfilled || 0} / {req.unitsRequired} Units Pledged</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-500">{req.donorsPledged?.length || 0} Pledge(s)</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Heart className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">No active blood requests filed yet.</p>
                  </div>
                )}
              </div>

              {/* Pledge and verification list */}
              <div className="border border-slate-100 dark:border-slate-800/60 p-4 bg-slate-50/50 dark:bg-dark-900/40 rounded-2xl flex flex-col justify-between min-h-[220px]">
                {selectedRequest ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-widest">
                        Volunteers for {selectedRequest.patientName}
                      </span>
                      <button 
                        onClick={() => setSelectedRequest(null)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {selectedRequest.donorsPledged?.length > 0 ? (
                        selectedRequest.donorsPledged.map((p) => (
                          <div key={p._id} className="p-3 bg-white dark:bg-dark-800/80 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] shadow-sm">
                            <div className="flex items-center gap-2">
                              {p.donor?._id && (
                                <button
                                  onClick={() => handleInitiateChat(p.donor._id || p.donor)}
                                  className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full transition"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <div>
                                <p className="font-bold">{p.donor?.fullName || 'Anonymous Lifesaver'}</p>
                                <p className="text-[9px] text-slate-400">Phone: {p.donor?.phone || 'N/A'}</p>
                              </div>
                            </div>

                            {p.status === 'Pledged' ? (
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handlePledgeOutcome(selectedRequest._id, p._id, 'Donated')}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[9px] transition"
                                >
                                  Donated
                                </button>
                                <button
                                  onClick={() => handlePledgeOutcome(selectedRequest._id, p._id, 'Cancelled')}
                                  className="px-2 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded text-[9px] transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                p.status === 'Donated' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                              }`}>
                                {p.status}
                              </span>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic">Waiting for volunteer pledges. Matching donors have been alerted.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center h-full text-slate-400 space-y-1 text-center py-6">
                    <Activity className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-semibold">Select a Request Ticket</p>
                    <p className="text-[10px] text-slate-400/80">Click any patient ticket to manage its volunteer pledges</p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* List of active drives scheduled by the hospital */}
          <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardList className="text-indigo-500" /> Our Scheduled Campaigns</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {activeDrives.length > 0 ? (
                activeDrives.map((drv) => (
                  <div key={drv._id} className="p-4 bg-slate-50 dark:bg-dark-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm">{drv.title}</p>
                      <p className="text-xs text-slate-400">{drv.locationName} • {drv.city}</p>
                      <p className="text-[10px] text-indigo-500 font-medium">Starts: {new Date(drv.startDate).toLocaleDateString()}</p>
                    </div>
                    <span className="px-3 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                      {drv.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 space-y-1">
                  <CalendarRange className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">No public donation campaigns scheduled yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side form block: Drive vs Request (1 Column) */}
        <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
          
          {/* Tab Controller */}
          <div className="flex p-1 bg-slate-100 dark:bg-dark-800/80 rounded-xl">
            <button
              onClick={() => setRightTab('drive')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                rightTab === 'drive'
                  ? 'bg-white dark:bg-dark-900 text-primary-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Schedule Drive
            </button>
            <button
              onClick={() => setRightTab('request')}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all ${
                rightTab === 'request'
                  ? 'bg-white dark:bg-dark-900 text-primary-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              Request Blood
            </button>
          </div>

          {rightTab === 'drive' ? (
            <div className="space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2"><Plus className="text-primary-500" /> Schedule Donation Drive</h3>
              
              <form onSubmit={handleCreateDrive} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Drive Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Mega Summer Collection"
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
                  <textarea
                    rows="3"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details about donation requirements, schedules..."
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date/Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">End Date/Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Venue / Specific Location</label>
                  <input
                    type="text"
                    required
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="e.g. Main Lobby Reception"
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Campaign Banner Image URL</label>
                  <input
                    type="url"
                    value={bannerImage}
                    onChange={(e) => setBannerImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-xs transition-all shadow-md"
                >
                  Publish Donation Drive
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <h3 className="font-bold text-lg flex items-center gap-2 border-b pb-2"><Heart className="text-primary-500 fill-primary-500" /> Request Patient Blood</h3>
              
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Blood Group Needed</label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-primary-600 font-bold"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Units Required</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={unitsRequired}
                      onChange={(e) => setUnitsRequired(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Needed By Date</label>
                    <input
                      type="date"
                      required
                      value={neededBy}
                      onChange={(e) => setNeededBy(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={reqPincode}
                      onChange={(e) => setReqPincode(e.target.value)}
                      placeholder="e.g. 516001"
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
                    <select
                      value={reqState}
                      onChange={(e) => {
                        setReqState(e.target.value);
                        setReqDistrict('');
                        setReqCity('');
                      }}
                      required
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="">Select State</option>
                      {Object.keys(STATES_DATA).map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">District</label>
                    <select
                      value={reqDistrict}
                      onChange={(e) => {
                        setReqDistrict(e.target.value);
                        setReqCity('');
                      }}
                      required
                      disabled={!reqState}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs disabled:opacity-50"
                    >
                      <option value="">Select District</option>
                      {reqState && Object.keys(STATES_DATA[reqState] || {}).map((dst) => (
                        <option key={dst} value={dst}>{dst}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">City / Mandal</label>
                  <select
                    value={reqCity}
                    onChange={(e) => setReqCity(e.target.value)}
                    required
                    disabled={!reqDistrict}
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {reqState && reqDistrict && (STATES_DATA[reqState]?.[reqDistrict] || []).map((cty) => (
                      <option key={cty} value={cty}>{cty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital Clinic Address</label>
                  <input
                    type="text"
                    required
                    value={reqHospitalAddress}
                    onChange={(e) => setReqHospitalAddress(e.target.value)}
                    placeholder="e.g. Ward 4, Bed 12"
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                {/* Emergency Modes */}
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between animate-pulse">
                  <div>
                    <p className="text-[10px] font-bold text-red-600 flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5 animate-bounce" /> Emergency Broadcast Mode</p>
                    <p className="text-[9px] text-red-500/80">Trigger immediate system-wide push notifications.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emergencyMode} 
                    onChange={(e) => setEmergencyMode(e.target.checked)} 
                    className="w-4 h-4 text-primary-600 rounded cursor-pointer" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Critical Reason / Diagnosis</label>
                  <textarea
                    rows="2"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Accident trauma, major cardiac surgery..."
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-xs transition-all shadow-md active:scale-[0.98]"
                >
                  Publish Blood Request Ticket
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Smart Local Donors tab */}
      {activeTab === 'donorRegistry' && (
        <div className="space-y-6 animate-fade-in">
          <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
            <div className="border-b pb-4">
              <h3 className="font-extrabold text-lg flex items-center gap-2 text-primary-600">
                <Sparkles className="w-5 h-5 fill-primary-600 animate-pulse" /> Intelligent Local Donor Finder
              </h3>
              <p className="text-xs text-slate-400">Type in blood group and location keywords to instantly match Indian regional hierarchies automatically using regex and smart coordinates mapping.</p>
            </div>

            <div className="max-w-2xl">
              <SmartSearchInput 
                onFilterUpdate={(filters) => {
                  setFilterBloodGroup(filters.bloodGroup || 'O+');
                  setFilterState(filters.state || '');
                  setFilterDistrict(filters.district || '');
                  setFilterCity(filters.city || '');
                }} 
                placeholder="Type e.g. AB- Kadapa, O+ Bangalore..."
              />
            </div>

            {/* Quick toggle filters */}
            <div className="flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-dark-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Availability:</span>
                <select 
                  value={filterAvailability} 
                  onChange={(e) => setFilterAvailability(e.target.value)}
                  className="p-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Available</option>
                  <option value="available">🟢 Available Only</option>
                  <option value="emergency">🟣 Emergency Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-500">Pincode:</span>
                <input
                  type="number"
                  placeholder="Pincode"
                  value={filterPincode}
                  onChange={(e) => setFilterPincode(e.target.value)}
                  className="p-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-300 w-24 px-2 py-1 outline-none text-[11px]"
                />
              </div>

              <label className="flex items-center gap-2 font-bold text-slate-500 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filterVerified} 
                  onChange={(e) => setFilterVerified(e.target.checked)}
                  className="w-4 h-4 rounded text-primary-500 border-slate-350"
                />
                <span>⭐ Show Verified Donors Only</span>
              </label>
            </div>
          </div>

          {/* Results grid */}
          <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h4 className="font-extrabold text-sm text-slate-800 dark:text-white uppercase tracking-wider">Eligible Matching Donors ({eligibleDonors.length})</h4>
              <div className="text-xs text-slate-400">Sorted by smart match score logic</div>
            </div>

            {searching ? (
              <div className="text-center py-20">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-slate-400 mt-4">Running Priority Matching algorithm...</p>
              </div>
            ) : eligibleDonors.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eligibleDonors.map((donor) => (
                  <div 
                    key={donor._id}
                    className="p-5 bg-slate-50 dark:bg-dark-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden flex flex-col justify-between"
                  >
                    {donor.matchScore > 1000 && (
                      <div className="absolute top-0 right-0 w-2 h-full bg-emerald-500 animate-pulse"></div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <img 
                            src={donor.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${donor.fullName}`}
                            alt={donor.fullName}
                            className="w-11 h-11 rounded-full border border-slate-200 shadow-sm object-cover"
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <h5 className="font-black text-xs text-slate-800 dark:text-slate-100">{donor.fullName}</h5>
                              {donor.isVerifiedDonor && (
                                <Award className="w-3.5 h-3.5 text-blue-500 fill-blue-500" title="Verified Lifesaver" />
                              )}
                            </div>
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{donor.city}, {donor.state}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="px-2 py-0.5 text-[10px] font-black bg-primary-100 text-primary-600 rounded">
                            {donor.bloodGroup}
                          </span>
                          <p className="text-[9px] text-slate-400 mt-1">Score: {donor.matchScore || 0}</p>
                        </div>
                      </div>

                      {/* Donor parameters details */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-white dark:bg-dark-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50">
                        <div>
                          <span className="text-slate-400">Availability:</span>
                          <p className={`font-bold ${
                            donor.availabilityStatus === 'Available' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>{donor.availabilityStatus}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Total Pledges:</span>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{donor.rewardPoints > 200 ? '5+ Donations' : '1 Donation'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Response Rate:</span>
                          <p className="font-bold text-indigo-500">{donor.responseRate || '85%'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400">Active State:</span>
                          <p className="font-bold text-slate-700 dark:text-slate-300">{donor.lastActiveTime || 'Active'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                      <button
                        type="button"
                        onClick={() => handleInitiateChat(donor._id)}
                        className="flex-grow py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Start Chat
                      </button>
                      <a 
                        href={`tel:${donor.phone}`}
                        className="p-2 bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-slate-350 rounded-xl hover:bg-slate-200 dark:hover:bg-dark-700 transition flex items-center justify-center"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-300 animate-pulse" />
                <p className="text-xs font-semibold">No compatible local donors found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Browse Regional Requests tab */}
      {activeTab === 'browseRequests' && (
        <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6 animate-fade-in">
          <div className="border-b pb-4">
            <h3 className="font-extrabold text-lg flex items-center gap-2 text-primary-600">
              <Heart className="w-5 h-5 fill-primary-600 animate-pulse" /> Regional Patient Blood Requests
            </h3>
            <p className="text-xs text-slate-400">Pledge hospital stock to help local patients in adjacent hospitals, clinics, or communities.</p>
          </div>

          {nearbyRequests.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nearbyRequests.map((req) => (
                <div key={req._id} className="p-5 bg-slate-50 dark:bg-dark-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 text-[10px] font-black bg-primary-500 text-white rounded">
                        {req.bloodGroup} Needed
                      </span>
                      {req.emergencyMode && (
                        <span className="px-2.5 py-0.5 text-[10px] font-black bg-rose-600 text-white rounded animate-pulse">
                          🚨 Emergency
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {req.city || 'Regional'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-800 dark:text-white">Patient: {req.patientName}</h4>
                      <p className="text-xs text-slate-500 mt-1">{req.hospitalName} • Units: <span className="font-extrabold text-primary-500">{req.unitsRequired || 1} Unit</span></p>
                    </div>
                    {req.reason && (
                      <p className="text-[11px] text-slate-500 bg-white dark:bg-dark-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/50 italic">
                        "{req.reason}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/65 mt-auto">
                    {req.requester && (
                      <button
                        type="button"
                        onClick={() => handleInitiateChat(req.requester._id || req.requester)}
                        className="flex-1 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Chat
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handlePledge(req._id)}
                      className="flex-1 py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-sm animate-pulse"
                    >
                      Pledge 1 Unit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Activity className="w-10 h-10 mx-auto text-slate-300 animate-pulse" />
              <p className="text-xs font-semibold">No active pending blood requests nearby currently.</p>
            </div>
          )}
        </div>
      )}

      {/* Appreciation Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:bg-white print:p-0">
          <div className="relative w-full max-w-4xl bg-slate-100 border border-slate-200 p-4 md:p-6 rounded-3xl shadow-2xl print:shadow-none print:border-none print:w-full print:h-full print:rounded-none print:bg-white print:p-0 flex flex-col justify-between overflow-y-auto max-h-[95vh] print:max-h-full">
            <button 
              onClick={() => setShowCertificateModal(false)}
              className="absolute top-4 right-4 z-10 p-1.5 hover:bg-white/80 rounded-full text-slate-600 bg-white/90 shadow print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <AppreciationCertificate user={user} />

            {/* Print trigger block */}
            <div className="flex gap-4 mt-4 justify-end print:hidden">
              <button 
                type="button" 
                onClick={() => setShowCertificateModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs text-slate-600 transition-all"
              >
                Close Preview
              </button>
              <button 
                type="button" 
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 hover:from-black hover:to-slate-900 text-white font-bold rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Certificate
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default HospitalDashboard;
