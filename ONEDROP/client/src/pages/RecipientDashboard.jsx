import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { updateProfileSuccess, logout } from '../redux/authSlice';
import { 
  Heart, Activity, FileText, CheckCircle, Clock, 
  ShieldAlert, MessageSquare, X, Search, Filter, Sparkles, 
  Phone, Award, Bell, AlertCircle, HelpCircle, MapPin,
  RefreshCw, Loader2, Printer, Users, Compass, Globe, Layout, Home, Menu
} from 'lucide-react';
import { 
  firebaseSendEmailVerification, 
  firebaseGetCurrentUserToken 
} from '../utils/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../utils/socket';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { STATES_DATA } from '../utils/statesData';
import { BLOOD_BANKS_DATA } from '../utils/bloodBanksData';
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

const RecipientDashboard = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [syncingEmail, setSyncingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null);

  const isUnverified = false;

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

  // Tab State: 'requests' | 'smartMatch'
  const [activeTab, setActiveTab] = useState('requests');

  // Socket reference


  // Floating Toast Alerts
  const [toastAlerts, setToastAlerts] = useState([]);

  // Forms for Blood Request
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [unitsRequired, setUnitsRequired] = useState(1);
  const [hospitalName, setHospitalName] = useState('');
  const [neededBy, setNeededBy] = useState('');
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [reason, setReason] = useState('');

  // Location fields for Blood Request
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState(user?.pincode || '');
  const [hospitalAddress, setHospitalAddress] = useState(user?.address || '');

  const [gpsLoading, setGpsLoading] = useState(false);
  
  // Blood banks filter states
  const [bankState, setBankState] = useState('');
  const [bankDistrict, setBankDistrict] = useState('');

  // Edit Profile States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editState, setEditState] = useState(normalizeState(user?.state || ''));
  const [editDistrict, setEditDistrict] = useState(normalizeDistrict(user?.state || '', user?.district || ''));
  const [editCity, setEditCity] = useState(normalizeCity(user?.state || '', user?.district || '', user?.city || ''));
  const [editAddress, setEditAddress] = useState(user?.address || '');
  const [editPincode, setEditPincode] = useState(user?.pincode || '');

  // Requests Tracking
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [matchingDonors, setMatchingDonors] = useState([]);
  const [loadingMatchingDonors, setLoadingMatchingDonors] = useState(false);
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [matchesModalRequest, setMatchesModalRequest] = useState(null);
  const [modalMatchingDonors, setModalMatchingDonors] = useState([]);
  const [loadingModalMatchingDonors, setLoadingModalMatchingDonors] = useState(false);

  // Edit Request Modal State
  const [showEditRequestModal, setShowEditRequestModal] = useState(false);
  const [editRequestObj, setEditRequestObj] = useState(null);
  const [editPatientName, setEditPatientName] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('O+');
  const [editUnitsRequired, setEditUnitsRequired] = useState(1);
  const [editHospitalName, setEditHospitalName] = useState('');
  const [editNeededBy, setEditNeededBy] = useState('');
  const [editReqPincode, setEditReqPincode] = useState('');
  const [editReqState, setEditReqState] = useState('');
  const [editReqDistrict, setEditReqDistrict] = useState('');
  const [editReqCity, setEditReqCity] = useState('');
  const [editReqHospitalAddress, setEditReqHospitalAddress] = useState('');
  const [editEmergencyMode, setEditEmergencyMode] = useState(false);
  const [editReason, setEditReason] = useState('');

  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [requestsSubTab, setRequestsSubTab] = useState('myRequests'); // 'myRequests' or 'browseRequests'
  const [nearbyRequests, setNearbyRequests] = useState([]);

  // Smart Match Donor Search Filters
  const [filterBloodGroup, setFilterBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [filterState, setFilterState] = useState(user?.state || '');
  const [filterDistrict, setFilterDistrict] = useState(user?.district || '');
  const [filterCity, setFilterCity] = useState(user?.city || '');
  const [filterPincode, setFilterPincode] = useState(user?.pincode || '');
  const [filterAvailability, setFilterAvailability] = useState('all'); // all, available, emergency
  const [filterVerified, setFilterVerified] = useState(false);
  
  // Search Autocomplete Suggestion & Query
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [eligibleDonors, setEligibleDonors] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Flat compiled locations list for autocompletion
  const flatLocations = React.useMemo(() => {
    const list = [];
    Object.keys(STATES_DATA).forEach(st => {
      Object.keys(STATES_DATA[st]).forEach(dst => {
        STATES_DATA[st][dst].forEach(cty => {
          list.push({
            label: `${cty}, ${dst}, ${st}`,
            city: cty,
            district: dst,
            state: st
          });
        });
      });
    });
    return list;
  }, []);

  // Fetch Requests
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

  // Fetch matching donors specifically for the selected request
  useEffect(() => {
    if (!selectedRequest) {
      setMatchingDonors([]);
      return;
    }
    const getMatchingDonors = async () => {
      setLoadingMatchingDonors(true);
      try {
        const params = {
          bloodGroup: selectedRequest.bloodGroup,
          state: selectedRequest.state,
          district: selectedRequest.district,
          city: selectedRequest.city,
          pincode: selectedRequest.pincode,
          excludeId: user?._id
        };
        const res = await axios.get(`${API_URL}/api/requests/search/donors`, { params });
        // Filter out donors who already pledged to this request
        const pledgedIds = new Set(selectedRequest.donorsPledged?.map(p => (p.donor?._id || p.donor)?.toString()) || []);
        const filteredMatches = res.data.filter(d => !pledgedIds.has(d._id.toString()));
        setMatchingDonors(filteredMatches);
      } catch (err) {
        console.error('[Fetch Matching Donors for Selected Request Error]', err);
      } finally {
        setLoadingMatchingDonors(false);
      }
    };
    getMatchingDonors();
  }, [selectedRequest, user]);

  // Fetch matching donors specifically for the matches modal request
  useEffect(() => {
    if (!matchesModalRequest) {
      setModalMatchingDonors([]);
      return;
    }
    const getModalMatchingDonors = async () => {
      setLoadingModalMatchingDonors(true);
      try {
        const params = {
          bloodGroup: matchesModalRequest.bloodGroup,
          state: matchesModalRequest.state,
          district: matchesModalRequest.district,
          city: matchesModalRequest.city,
          pincode: matchesModalRequest.pincode,
          excludeId: user?._id
        };
        const res = await axios.get(`${API_URL}/api/requests/search/donors`, { params });
        const pledgedIds = new Set(matchesModalRequest.donorsPledged?.map(p => (p.donor?._id || p.donor)?.toString()) || []);
        const filteredMatches = res.data.filter(d => !pledgedIds.has(d._id.toString()));
        setModalMatchingDonors(filteredMatches);
      } catch (err) {
        console.error('[Fetch Modal Matching Donors Error]', err);
      } finally {
        setLoadingModalMatchingDonors(false);
      }
    };
    getModalMatchingDonors();
  }, [matchesModalRequest, user]);

  const handleAlertDonor = async (requestId, donorId, donorName) => {
    if (handleActionBlock('send match notification')) return;
    try {
      await axios.post(
        `${API_URL}/api/requests/${requestId}/alert-donor/${donorId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Alert notification successfully sent to donor ${donorName}!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send alert notification.');
    }
  };

  // Smart Match Search
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

  // Socket initialization & notifications listener
  useEffect(() => {
    if (!user?._id) return;
    socket.emit('register', user._id);

    // Live acceptance alert
    socket.on('request_accepted', (data) => {
      // Build WhatsApp click-to-chat link from donor phone number
      let waPhone = (data.donor.phone || '').trim().replace(/\s+/g, '');
      if (!waPhone.startsWith('+')) {
        waPhone = waPhone.length === 10 ? `91${waPhone}` : waPhone;
      } else {
        waPhone = waPhone.replace('+', '');
      }
      const waMessage = encodeURIComponent(`Hi ${data.donor.fullName}, I saw you accepted my blood request on ONEDROP. Can we coordinate the donation details?`);
      const waUrl = `https://wa.me/${waPhone}?text=${waMessage}`;

      const newToast = {
        id: Math.random().toString(),
        patientName: data.request.patientName,
        donorName: data.donor.fullName,
        donorPhone: data.donor.phone,
        donorId: data.donor._id,
        donorWhatsApp: waUrl,
        avatar: data.donor.profileImage
      };
      setToastAlerts(prev => [...prev, newToast]);
      fetchMyRequests();

      // Auto dismiss after 12 seconds
      setTimeout(() => {
        setToastAlerts(prev => prev.filter(t => t.id !== newToast.id));
      }, 12000);
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

    return () => {
      socket.off('request_accepted');
      socket.off('donation_verified');
    };
  }, [user, token]);

  // Initial fetches
  useEffect(() => {
    if (user) {
      fetchMyRequests();
      fetchNearbyRequests();
      fetchEligibleDonors();


      
      setEditName(user.fullName || '');
      setEditPhone(user.phone || '');
      setEditState(normalizeState(user.state || ''));
      setEditDistrict(normalizeDistrict(user.state || '', user.district || ''));
      setEditCity(normalizeCity(user.state || '', user.district || '', user.city || ''));
      setEditAddress(user.address || '');
      setEditPincode(user.pincode || '');
    }
  }, [user]);

  // Trigger search on filter change
  useEffect(() => {
    fetchEligibleDonors();
  }, [filterBloodGroup, filterState, filterDistrict, filterCity, filterPincode, filterAvailability, filterVerified]);



  // Handle autocomplete query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const filtered = flatLocations.filter(loc => 
      loc.label.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);

    setSuggestions(filtered);
  }, [searchQuery, flatLocations]);

  const selectSuggestion = (sug) => {
    setFilterCity(sug.city);
    setFilterDistrict(sug.district);
    setFilterState(sug.state);
    setSearchQuery(sug.label);
    setSuggestions([]);
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

  const handleAutofillGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );

          if (response.data && response.data.address) {
            const addr = response.data.address;
            const fetchedState = addr.state || '';
            const fetchedDistrict = addr.state_district || addr.county || '';
            const fetchedCity = addr.city || addr.town || addr.suburb || addr.village || '';
            const fetchedPostcode = addr.postcode || '';

            let matchedState = '';
            Object.keys(STATES_DATA).forEach(st => {
              if (fetchedState.toLowerCase().includes(st.toLowerCase()) || st.toLowerCase().includes(fetchedState.toLowerCase())) {
                matchedState = st;
              }
            });

            if (matchedState) {
              setState(matchedState);
              
              let matchedDistrict = '';
              Object.keys(STATES_DATA[matchedState]).forEach(dst => {
                if (fetchedDistrict.toLowerCase().includes(dst.toLowerCase()) || dst.toLowerCase().includes(fetchedDistrict.toLowerCase())) {
                  matchedDistrict = dst;
                }
              });

              if (matchedDistrict) {
                setDistrict(matchedDistrict);
                
                let matchedCity = '';
                STATES_DATA[matchedState][matchedDistrict].forEach(cty => {
                  if (fetchedCity.toLowerCase().includes(cty.toLowerCase()) || cty.toLowerCase().includes(fetchedCity.toLowerCase())) {
                    matchedCity = cty;
                  }
                });

                if (matchedCity) {
                  setCity(matchedCity);
                } else if (STATES_DATA[matchedState][matchedDistrict].length > 0) {
                  setCity(STATES_DATA[matchedState][matchedDistrict][0]);
                }
              } else {
                const firstDst = Object.keys(STATES_DATA[matchedState])[0];
                setDistrict(firstDst);
                setCity(STATES_DATA[matchedState][firstDst][0]);
              }
            } else {
              setState(user?.state || 'Karnataka');
              setDistrict(user?.district || 'Bengaluru Urban');
              setCity(user?.city || 'Bangalore Mandal');
            }

            if (fetchedPostcode) {
              setPincode(fetchedPostcode);
            } else {
              setPincode(user?.pincode || '560001');
            }

            setHospitalAddress(addr.road || addr.suburb || user?.address || 'City Hospital Road');
            alert(`📍 GPS Coordinates Synced!\nLat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}\nLocation: ${response.data.display_name}`);
          }
        } catch (err) {
          console.error('[GPS Geocoding Error]', err);
          setState(user?.state || 'Karnataka');
          setDistrict(user?.district || 'Bengaluru Urban');
          setCity(user?.city || 'Bangalore Mandal');
          setPincode(user?.pincode || '560001');
          setHospitalAddress(user?.address || 'St. Johns Medical St.');
          alert(`📍 GPS Synced (Offline Simulation Fallback)!\nLat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('[Geolocation Error]', error);
        setState(user?.state || 'Karnataka');
        setDistrict(user?.district || 'Bengaluru Urban');
        setCity(user?.city || 'Bangalore Mandal');
        setPincode(user?.pincode || '560001');
        setHospitalAddress(user?.address || 'Apollo St.');
        alert(`📍 GPS Signal Intercepted! (Home Coordinates Auto-filled as Mock GPS)`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };



  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (handleActionBlock('create a blood request')) return;
    try {
      const res = await axios.post(
        `${API_URL}/api/requests`,
        {
          patientName, bloodGroup, unitsRequired: parseInt(unitsRequired), hospitalName,
          neededBy, emergencyMode, reason, state, district, city, pincode, hospitalAddress
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Blood request ticket published successfully. Smart matching alerts sent in real-time!');
      
      const newRequest = res.data.request;
      setMatchesModalRequest(newRequest);
      setShowMatchesModal(true);

      setPatientName('');
      setUnitsRequired(1);
      setHospitalName('');
      setNeededBy('');
      setEmergencyMode(false);
      setReason('');
      setState('');
      setDistrict('');
      setCity('');
      fetchMyRequests();
      // Auto toggle to Smart Match tab to see matches
      setActiveTab('smartMatch');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const handleDeleteRequest = async (requestId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently remove this blood request ticket?")) return;
    try {
      await axios.delete(`${API_URL}/api/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Blood request ticket successfully deleted.");
      fetchMyRequests();
      setSelectedRequest(null);
    } catch (err) {
      console.error("[Delete Request Error]", err);
      alert(err.response?.data?.message || "Failed to remove the request ticket.");
    }
  };

  const handleUpdateRequestStatus = async (requestId, nextStatus) => {
    if (handleActionBlock('update request status')) return;
    const confirmMsg = nextStatus === 'Fulfilled' 
      ? 'Are you sure you want to mark this blood request as successfully completed/donated?' 
      : 'Are you sure you want to cancel this blood request?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await axios.put(
        `${API_URL}/api/requests/${requestId}`,
        { status: nextStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Blood request successfully marked as ${nextStatus}.`);
      setSelectedRequest(res.data.request);
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request status.');
    }
  };

  const handleOpenEditModal = (req) => {
    setEditRequestObj(req);
    setEditPatientName(req.patientName || '');
    setEditBloodGroup(req.bloodGroup || 'O+');
    setEditUnitsRequired(req.unitsRequired || 1);
    setEditHospitalName(req.hospitalName || '');
    setEditNeededBy(req.neededBy ? new Date(req.neededBy).toISOString().substring(0, 10) : '');
    setEditReqPincode(req.pincode || '');
    setEditReqState(normalizeState(req.state || ''));
    setEditReqDistrict(normalizeDistrict(req.state || '', req.district || ''));
    setEditReqCity(normalizeCity(req.state || '', req.district || '', req.city || ''));
    setEditReqHospitalAddress(req.hospitalAddress || '');
    setEditEmergencyMode(req.emergencyMode || false);
    setEditReason(req.reason || '');
    setShowEditRequestModal(true);
  };

  const handleEditRequestSubmit = async (e) => {
    e.preventDefault();
    if (handleActionBlock('edit blood request')) return;
    try {
      const res = await axios.put(
        `${API_URL}/api/requests/${editRequestObj._id}`,
        {
          patientName: editPatientName,
          bloodGroup: editBloodGroup,
          unitsRequired: parseInt(editUnitsRequired),
          hospitalName: editHospitalName,
          neededBy: editNeededBy,
          state: editReqState,
          district: editReqDistrict,
          city: editReqCity,
          pincode: editReqPincode,
          hospitalAddress: editReqHospitalAddress,
          emergencyMode: editEmergencyMode,
          reason: editReason
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Blood request ticket successfully updated.');
      setShowEditRequestModal(false);
      setSelectedRequest(res.data.request);
      fetchMyRequests();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update request.');
    }
  };


  const handlePledgeOutcome = async (requestId, pledgeId, status) => {
    if (handleActionBlock('verify pledge status')) return;
    try {
      await axios.put(
        `${API_URL}/api/requests/${requestId}/pledge/${pledgeId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Donation pledge marked as ${status}. Verified lifesaver points distributed!`);
      fetchMyRequests();
      setSelectedRequest(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to verify donation.');
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (handleActionBlock('update profile')) return;
    try {
      const res = await axios.put(
        `${API_URL}/api/auth/profile`,
        {
          fullName: editName,
          phone: editPhone,
          state: editState,
          district: editDistrict,
          city: editCity,
          address: editAddress,
          pincode: editPincode
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      dispatch(updateProfileSuccess(res.data.user));
      alert('Profile updated successfully! For security, you will now be logged out to re-authenticate.');
      dispatch(logout());
      setShowEditModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Profile update failed.');
    }
  };
  const sendMatchNotification = (donorId) => {
    socket.emit('emergency_broadcast', {
      request: { patientName: user.fullName, bloodGroup: filterBloodGroup, city: filterCity },
      state: filterState,
      district: filterDistrict,
      city: filterCity,
      message: `🚨 Recipient ${user.fullName} is requesting O+ blood nearby! Please respond.`
    });
    alert('Smart match push alert sent to donor! They will be notified in real-time.');
  };

  const filteredBanks = bankState 
    ? (BLOOD_BANKS_DATA[bankState]?.filter(b => !bankDistrict || b.district === bankDistrict) || [])
    : [];

  return (
    <div className={`min-h-screen flex bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 transition-all duration-300 relative`}>

      {/* Mobile Slide-Out Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-dark-900 flex flex-col shadow-2xl md:hidden overflow-y-auto"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-primary-600 to-rose-700 border-b border-primary-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-black text-white border-2 border-white/30 text-sm">
                    {user?.fullName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-sm text-white truncate max-w-[150px]">{user?.fullName}</p>
                    <p className="text-[10px] text-rose-100 font-bold uppercase tracking-wider">Recipient Console</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 p-4 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-3 mb-2">Navigation</p>
                {[
                  { id: 'requests', label: 'Requests & Pledges', icon: FileText, desc: 'Manage Blood Requests' },
                  { id: 'smartMatch', label: 'Smart Match Finder', icon: Sparkles, desc: 'Find Nearby Donors' },
                  { id: 'bloodbanks', label: 'Blood Banks', icon: Compass, desc: 'Find Local Blood Banks' }
                ].map((item) => {
                  const IconComp = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <div className={`p-2 rounded-xl flex-shrink-0 ${isActive ? 'bg-white/20' : 'bg-slate-100 dark:bg-dark-800'}`}>
                        <IconComp className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-black truncate ${isActive ? 'text-white' : ''}`}>{item.label}</p>
                        <p className={`text-[10px] truncate ${isActive ? 'text-rose-100' : 'text-slate-400'}`}>{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <button
                  onClick={() => { setShowEditModal(true); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-200 transition-all text-xs font-bold"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  Edit Profile
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation Panel */}
      <div className={`fixed inset-y-0 left-0 top-16 z-40 bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col justify-between py-6`}>

        <div className="space-y-6">
          <div className="px-4 flex justify-between items-center">
            {sidebarOpen && <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Main Console</span>}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg text-slate-500"
            >
              <Layout className="w-5 h-5" />
            </button>
          </div>

          <nav className="px-3 space-y-1">
            {[
              { id: 'requests', label: 'Requests & Pledges', icon: FileText },
              { id: 'smartMatch', label: 'Smart Match Finder', icon: Sparkles },
              { id: 'bloodbanks', label: 'Blood Banks', icon: Compass }
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                      : 'hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Badge */}
        <div className="px-4 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-dark-800 flex items-center justify-center font-black text-primary-500 border-2 border-primary-500">
            {user?.fullName?.charAt(0)}
          </div>
          {sidebarOpen && (
            <div className="text-left text-xs truncate max-w-[140px]">
              <p className="font-extrabold dark:text-slate-200">{user?.fullName}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Recipient Panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Container Layout */}
      <div className={`flex-grow md:pl-20 ${sidebarOpen ? 'md:pl-64' : 'md:pl-20'} pb-24 md:pb-10 pt-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 relative">

          {/* Mobile: Navigation handled via left sidebar drawer (hamburger menu) and bottom nav */}
      
      {/* Floating Notifications Toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 w-full max-w-md pointer-events-none">
        <AnimatePresence>
          {toastAlerts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto p-4 bg-white/95 dark:bg-dark-900/95 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 rounded-2xl flex items-start gap-4 backdrop-blur-md"
            >
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-full flex-shrink-0">
                <Heart className="w-6 h-6 animate-pulse fill-emerald-600" />
              </div>
              <div className="flex-grow space-y-1 min-w-0">
                <h4 className="font-black text-sm text-slate-900 dark:text-white">❤️ Request Accepted!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{toast.donorName}</span> accepted your request for <span className="font-bold">{toast.patientName}</span>.
                </p>
                <p className="text-[10px] text-slate-400">Contact the donor directly to coordinate the donation:</p>
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <a 
                    href={`tel:${toast.donorPhone}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                  >
                    <Phone className="w-3 h-3" /> Call
                  </a>
                  {toast.donorWhatsApp && (
                    <a
                      href={toast.donorWhatsApp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] text-white rounded-lg text-[10px] font-bold hover:bg-[#1ebe59] transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg>
                      WhatsApp
                    </a>
                  )}
                  <button 
                    onClick={() => handleInitiateChat(toast.donorId)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 dark:bg-dark-800 text-white border border-slate-700 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition"
                  >
                    <MessageSquare className="w-3 h-3" /> Chat
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setToastAlerts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Glassmorphic Email Verification Banner */}
      {isUnverified && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-lg border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in z-10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl animate-pulse flex-shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-black text-sm uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Email Verification Required
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                Your recipient portal is running in a limited status because your email address <span className="font-extrabold text-slate-800 dark:text-white">({user?.email})</span> is unverified. Please check your inbox for the verification link.
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

      {/* Header Container */}
      <div className="p-4 sm:p-8 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-wrap justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-all shadow-sm flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <span className="px-3 py-1 text-[10px] font-black uppercase bg-primary-500 rounded-full shadow-sm">Recipient Panel</span>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
              <h1 className="text-xl sm:text-3xl font-black truncate max-w-[200px] sm:max-w-none">{user.fullName}</h1>
              <button 
                onClick={() => setShowEditModal(true)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-bold transition-all shadow-sm flex-shrink-0"
              >
                Edit Profile Coordinates
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Request emergency assistance or filter eligible active donors below.</p>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'requests' ? (
          <motion.div
            key="requests-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="grid md:grid-cols-2 gap-8"
          >
            {/* Create Blood Request Section */}
            <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2"><FileText className="text-primary-500" /> Create Blood Request</h3>
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      onChange={(e) => setUnitsRequired(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital / Clinic Name</label>
                  <input
                    type="text"
                    required
                    value={hospitalName}
                    onChange={(e) => setHospitalName(e.target.value)}
                    placeholder="e.g. City General Hospital"
                    className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  {/* GPS autofill button */}
                <div className="flex justify-between items-center bg-primary-50/40 dark:bg-primary-950/10 p-3 rounded-2xl border border-primary-500/20">
                  <div className="space-y-0.5">
                    <p className="text-xs font-extrabold text-primary-600 dark:text-primary-400">📍 Precision Proximity Coordinates</p>
                    <p className="text-[10px] text-slate-400">Auto-detect hospital location to query nearby matching donors.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAutofillGPS}
                    disabled={gpsLoading}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary-500/10 transition-all flex items-center gap-1.5"
                  >
                    {gpsLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                    📍 {gpsLoading ? 'Syncing...' : 'Autofill GPS'}
                  </button>
                </div>

                {/* Location Fields for Request */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">State</label>
                    <select
                      required
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        setDistrict('');
                        setCity('');
                      }}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Select State</option>
                      {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">District</label>
                    <select
                      required
                      disabled={!state}
                      value={district}
                      onChange={(e) => {
                        setDistrict(e.target.value);
                        setCity('');
                      }}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none disabled:opacity-55 text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Select District</option>
                      {Object.keys(STATES_DATA[state] || {}).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">City</label>
                    <select
                      required
                      disabled={!district}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none disabled:opacity-55 text-slate-700 dark:text-slate-300"
                    >
                      <option value="">Select City</option>
                      {(STATES_DATA[state]?.[district] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital Clinic Address</label>
                    <input
                      type="text"
                      required
                      value={hospitalAddress}
                      onChange={(e) => setHospitalAddress(e.target.value)}
                      placeholder="Street, building details"
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="Pincode"
                      className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>             </div>

                {/* Emergency Modes */}
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between animate-pulse">
                  <div>
                    <p className="text-xs font-bold text-red-600 flex items-center gap-1"><ShieldAlert className="w-4 h-4 animate-bounce" /> Emergency Broadcast Mode</p>
                    <p className="text-[10px] text-red-500/80">Check this box to trigger immediate system-wide push notifications.</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={emergencyMode} 
                    onChange={(e) => setEmergencyMode(e.target.checked)} 
                    className="w-4 h-4 text-primary-600 rounded" 
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
                  className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-[0.98]"
                >
                  Publish Blood Request Ticket
                </button>
              </form>
            </div>

            {/* Registry tracking section */}
            <div className="space-y-6">
              {/* Sub-tabs Toggler */}
              <div className="flex gap-2 p-1 bg-slate-100 dark:bg-dark-800/80 border border-slate-200 dark:border-slate-800 rounded-2xl w-full">
                <button
                  type="button"
                  onClick={() => setRequestsSubTab('myRequests')}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all ${
                    requestsSubTab === 'myRequests'
                      ? 'bg-white dark:bg-dark-900 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  My Requests
                </button>
                <button
                  type="button"
                  onClick={() => setRequestsSubTab('browseRequests')}
                  className={`flex-1 py-2 text-center rounded-xl text-xs font-bold transition-all ${
                    requestsSubTab === 'browseRequests'
                      ? 'bg-white dark:bg-dark-900 text-slate-800 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  Browse Regional Requests ({nearbyRequests.length})
                </button>
              </div>

              {requestsSubTab === 'myRequests' ? (
                <>
                  <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6 animate-fade-in">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Activity className="text-indigo-500" /> Active Assist Tickets</h3>
                    <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2">
                      {myRequests.length > 0 ? (
                        myRequests.map((req) => (
                          <div 
                            key={req._id} 
                            onClick={() => setSelectedRequest(req)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                              selectedRequest?._id === req._id
                                ? 'bg-primary-50/50 dark:bg-primary-950/20 border-primary-500'
                                : 'bg-slate-50 dark:bg-dark-800/50 hover:bg-slate-100/50 border-slate-100 dark:border-slate-800'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 text-[9px] font-black bg-primary-100 dark:bg-primary-950/30 text-primary-600 rounded">
                                  {req.bloodGroup} Needed
                                </span>
                                <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                                  req.status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                              <p className="font-bold text-xs">Patient: {req.patientName}</p>
                              <p className="text-[10px] text-slate-400">{req.unitsFulfilled || 0} / {req.unitsRequired} Units Pledged</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <span className="text-[10px] font-bold text-slate-500">{req.donorsPledged?.length || 0} Pledge(s)</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRequest(req._id, e)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition"
                                title="Remove Request Ticket"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                          <Heart className="w-10 h-10 mx-auto text-slate-300" />
                          <p className="text-xs">No active blood requests filed yet.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pledge and verification list */}
                  {selectedRequest && (
                    <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-4 animate-fade-in">
                      <h3 className="font-bold text-xs text-slate-500 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
                        <span>Volunteers for {selectedRequest.patientName}</span>
                        <button 
                          onClick={() => setSelectedRequest(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </h3>
                      
                      <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-850">
                        <button
                          onClick={() => handleOpenEditModal(selectedRequest)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 text-[10px] font-black uppercase rounded-lg transition-all"
                        >
                          Edit Details
                        </button>
                        {selectedRequest.status !== 'Cancelled' && (
                          <button
                            onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Cancelled')}
                            className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase rounded-lg transition-all"
                          >
                            Cancel
                          </button>
                        )}
                        {selectedRequest.status !== 'Fulfilled' && (
                          <button
                            onClick={() => handleUpdateRequestStatus(selectedRequest._id, 'Fulfilled')}
                            className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-lg transition-all shadow"
                          >
                            Fulfilled
                          </button>
                        )}
                      </div>

                      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                        {selectedRequest.donorsPledged?.length > 0 ? (
                          selectedRequest.donorsPledged.map((p) => {
                            // Build WhatsApp URL for this donor
                            let dWaPhone = (p.donor?.phone || '').trim().replace(/\s+/g, '');
                            if (!dWaPhone.startsWith('+')) {
                              dWaPhone = dWaPhone.length === 10 ? `91${dWaPhone}` : dWaPhone;
                            } else {
                              dWaPhone = dWaPhone.replace('+', '');
                            }
                            const dWaMsg = encodeURIComponent(`Hi ${p.donor?.fullName || 'Donor'}, I am contacting you about my blood request on ONEDROP. Can we coordinate the donation?`);
                            const dWaUrl = dWaPhone ? `https://wa.me/${dWaPhone}?text=${dWaMsg}` : null;

                            return (
                              <div key={p._id} className="p-4 bg-slate-50 dark:bg-dark-800/40 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-3 text-xs">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-0.5">
                                    <p className="font-extrabold text-slate-800 dark:text-white">{p.donor?.fullName || 'Anonymous Lifesaver'}</p>
                                    <p className="text-[10px] text-slate-400">📞 {p.donor?.phone || 'N/A'} • 🩸 {p.donor?.bloodGroup || '—'}</p>
                                  </div>
                                  {p.status !== 'Pledged' && (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      p.status === 'Donated' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                                    }`}>
                                      {p.status}
                                    </span>
                                  )}
                                </div>

                                {/* Contact Buttons Row */}
                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                  {p.donor?.phone && (
                                    <a
                                      href={`tel:${p.donor.phone}`}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                                    >
                                      <Phone className="w-3 h-3" /> Call
                                    </a>
                                  )}
                                  {dWaUrl && (
                                    <a
                                      href={dWaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] text-white rounded-lg text-[10px] font-bold hover:bg-[#1ebe59] transition"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg>
                                      WhatsApp
                                    </a>
                                  )}
                                  {p.donor?._id && (
                                    <button
                                      onClick={() => handleInitiateChat(p.donor._id || p.donor)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                                    >
                                      <MessageSquare className="w-3 h-3" /> Chat
                                    </button>
                                  )}
                                  {p.status === 'Pledged' && (
                                    <>
                                      <button
                                        onClick={() => handlePledgeOutcome(selectedRequest._id, p._id, 'Donated')}
                                        className="ml-auto px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px]"
                                      >
                                        ✓ Mark Donated
                                      </button>
                                      <button
                                        onClick={() => handlePledgeOutcome(selectedRequest._id, p._id, 'Cancelled')}
                                        className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold rounded-lg text-[10px]"
                                      >
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-xs text-slate-400 italic">Waiting for volunteer pledges. Matching donors have been alerted.</p>
                        )}
                      </div>

                      {/* Available Matching Donors */}
                      <div className="border-t border-slate-100 dark:border-slate-805 pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Available Matching Donors ({matchingDonors.length})</p>
                          <button
                            type="button"
                            onClick={() => {
                              setMatchesModalRequest(selectedRequest);
                              setShowMatchesModal(true);
                            }}
                            className="px-2 py-0.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-[9px] font-black uppercase tracking-wider transition-all"
                          >
                            ⚡ Contact Fast
                          </button>
                        </div>
                        {loadingMatchingDonors ? (
                          <div className="text-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary-500" />
                          </div>
                        ) : matchingDonors.length > 0 ? (
                          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2">
                            {matchingDonors.map((donor) => {
                              let dWaPhone = (donor.phone || '').trim().replace(/\s+/g, '');
                              if (!dWaPhone.startsWith('+')) {
                                dWaPhone = dWaPhone.length === 10 ? `91${dWaPhone}` : dWaPhone;
                              } else {
                                dWaPhone = dWaPhone.replace('+', '');
                              }
                              const dWaMsg = encodeURIComponent(`Hi ${donor.fullName}, I saw you are a matching donor on ONEDROP. We need ${selectedRequest.bloodGroup} blood urgently. Can you help?`);
                              const dWaUrl = `https://wa.me/${dWaPhone}?text=${dWaMsg}`;

                              return (
                                <div key={donor._id} className="p-3 bg-slate-50 dark:bg-dark-800/40 rounded-xl border border-slate-100 dark:border-slate-800/40 space-y-2 text-xs">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="font-extrabold text-slate-800 dark:text-white">{donor.fullName}</p>
                                      <p className="text-[9px] text-slate-400">{donor.city}, {donor.state} • Score: {donor.matchScore || 0}</p>
                                    </div>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-primary-100 text-primary-600">
                                      {donor.bloodGroup}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    {donor.phone && (
                                      <a
                                        href={`tel:${donor.phone}`}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                                      >
                                        <Phone className="w-3 h-3" /> Call
                                      </a>
                                    )}
                                    <a
                                      href={dWaUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] text-white rounded-lg text-[10px] font-bold hover:bg-[#1ebe59] transition"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg>
                                      WhatsApp
                                    </a>
                                    <button
                                      onClick={() => handleInitiateChat(donor._id)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                                    >
                                      <MessageSquare className="w-3 h-3" /> Chat
                                    </button>
                                    <button
                                      onClick={() => handleAlertDonor(selectedRequest._id, donor._id, donor.fullName)}
                                      className="ml-auto flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700 transition"
                                    >
                                      Alert Donor
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No matching proximity donors found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center border-b pb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="font-extrabold text-sm flex items-center gap-2">
                        <Heart className="text-primary-500 animate-pulse w-4 h-4" /> Regional Blood Requests
                      </h3>
                      <p className="text-[10px] text-slate-400">Pledge to nearby urgent cases below to earn lifesaver reward points.</p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                    {nearbyRequests.length > 0 ? (
                      nearbyRequests.map((req) => (
                        <div key={req._id} className="p-4 bg-slate-50 dark:bg-dark-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 text-[9px] font-black bg-primary-500 text-white rounded">
                                {req.bloodGroup} Needed
                              </span>
                              {req.emergencyMode && (
                                <span className="px-2 py-0.5 text-[9px] font-black bg-rose-600 text-white rounded animate-pulse">
                                  🚨 Emergency
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                {req.city || 'Regional'}
                              </span>
                            </div>
                            <h4 className="font-bold text-xs text-slate-800 dark:text-white">Patient: {req.patientName}</h4>
                            <p className="text-[10px] text-slate-500">{req.hospitalName} • Units: <span className="font-extrabold text-primary-500">{req.unitsRequired || 1} Unit</span></p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/65">
                            {req.requester && (
                              <button
                                type="button"
                                onClick={() => handleInitiateChat(req.requester._id || req.requester)}
                                className="flex-1 px-3 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-lg hover:bg-indigo-100 transition-all flex items-center justify-center gap-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> Chat
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handlePledge(req._id)}
                              className="flex-1 px-3 py-1.5 text-[10px] font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-all shadow-sm"
                            >
                              Pledge 1 Unit
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-slate-400 space-y-2">
                        <Activity className="w-10 h-10 mx-auto text-slate-300 animate-pulse" />
                        <p className="text-xs font-semibold">No active pending blood requests nearby currently.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'smartMatch' ? (
          <motion.div
            key="smartmatch-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Smart Filter Header Card */}
            <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-extrabold text-lg flex items-center gap-2 text-primary-600">
                  <Sparkles className="w-5 h-5 fill-primary-600 animate-pulse" /> Intelligent Smart Match Finder
                </h3>
                <p className="text-xs text-slate-400">Type in blood group and location keywords. Matches Indian regional hierarchies automatically using regex and smart coordinates mapping.</p>
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

            {/* Smart Match Results Card list */}
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
                      {/* Pulse effect for High MatchScore */}
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

                      {/* Call-to-actions buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
                        <a 
                          href={`tel:${donor.phone}`}
                          className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-[10px] transition"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                        {donor.phone && (() => {
                          let ph = donor.phone.trim().replace(/\s+/g, '');
                          if (!ph.startsWith('+')) ph = ph.length === 10 ? `91${ph}` : ph;
                          else ph = ph.replace('+', '');
                          const waMsg = encodeURIComponent(`Hi ${donor.fullName}, I found your profile on ONEDROP and need ${filterBloodGroup} blood. Can you help?`);
                          return (
                            <a
                              href={`https://wa.me/${ph}?text=${waMsg}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold rounded-lg text-[10px] transition"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg>
                              WhatsApp
                            </a>
                          );
                        })()}
                        <button
                          onClick={() => handleInitiateChat(donor._id)}
                          className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-[10px] transition"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Chat
                        </button>
                        <button
                          onClick={() => sendMatchNotification(donor._id)}
                          className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-[10px] transition shadow-sm active:scale-[0.98]"
                        >
                          Send Alert
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 space-y-2">
                  <AlertCircle className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-xs">No matching donors found matching the current search parameters.</p>
                  <p className="text-[10px] text-slate-400/80">Try relaxing the location filters or changing the blood group.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="bloodbanks-tab"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6 animate-fade-in"
          >
            <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
              <div className="border-b pb-4">
                <h3 className="font-extrabold text-lg flex items-center gap-2"><Globe className="text-primary-500 w-5 h-5" /> 29-States Certified Blood Banks</h3>
                <p className="text-xs text-slate-400">Search and contact emergency blood storage centers across all 29 Indian states dynamically by state and district.</p>
              </div>

              {/* Filter section for state and district */}
              <div className="grid sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-dark-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">State</label>
                  <select
                    value={bankState}
                    onChange={(e) => {
                      setBankState(e.target.value);
                      setBankDistrict('');
                    }}
                    className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select State</option>
                    {Object.keys(BLOOD_BANKS_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">District</label>
                  <select
                    disabled={!bankState}
                    value={bankDistrict}
                    onChange={(e) => setBankDistrict(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none disabled:opacity-55 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select District</option>
                    {bankState && STATES_DATA[bankState] && Object.keys(STATES_DATA[bankState]).map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Blood Bank list */}
              {bankState ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBanks.length > 0 ? (
                    filteredBanks.map((bank, index) => (
                      <div key={index} className="p-5 bg-slate-50 dark:bg-dark-800/40 border border-slate-100 dark:border-slate-800/50 rounded-2xl flex flex-col justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <h5 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{bank.name}</h5>
                            <span className="px-2 py-0.5 text-[8px] font-black bg-primary-100 text-primary-700 rounded uppercase tracking-wider">
                              {bank.hours}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed"><MapPin className="w-3 h-3 inline mr-1 text-slate-400" /> {bank.address}</p>
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded">
                            ⭐ {bank.status}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <a
                            href={`tel:${bank.phone}`}
                            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg text-[10px] transition text-center flex items-center justify-center gap-1.5 shadow-sm shadow-primary-500/10"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call Blood Bank ({bank.phone})
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 text-slate-400">
                      <MapPin className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="text-xs mt-2 font-bold">No certified blood banks matched your district query currently.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 space-y-2 border border-dashed rounded-3xl">
                  <Compass className="w-10 h-10 mx-auto text-slate-300 animate-spin-slow" />
                  <p className="text-xs font-bold text-slate-500">Search National Certified Blood Banks</p>
                  <p className="text-[10px] text-slate-450/80 max-w-sm mx-auto leading-relaxed">Select one of the 29 Indian States and specify a District to load certified facilities and call them directly.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white/95 dark:bg-dark-900/95 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h2 className="text-2xl font-black">Edit Profile Information</h2>
              <p className="text-xs text-slate-500">Update your details to ensure correct coordinates for emergency assists.</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-extrabold text-xs text-primary-500 uppercase tracking-widest border-b pb-1">1. Contact Details</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      required 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-extrabold text-xs text-primary-500 uppercase tracking-widest border-b pb-1">2. Proximity Coordinates</h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">State</label>
                    <select 
                      required 
                      value={editState}
                      onChange={(e) => {
                        setEditState(e.target.value);
                        setEditDistrict('');
                        setEditCity('');
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                    >
                      <option value="">Select State</option>
                      {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">District</label>
                    <select 
                      required 
                      disabled={!editState}
                      value={editDistrict}
                      onChange={(e) => {
                        setEditDistrict(e.target.value);
                        setEditCity('');
                      }}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none disabled:opacity-50"
                    >
                      <option value="">Select District</option>
                      {Object.keys(STATES_DATA[editState] || {}).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Mandal / City</label>
                    <select 
                      required 
                      disabled={!editDistrict}
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none disabled:opacity-50"
                    >
                      <option value="">Select Mandal / City</option>
                      {(STATES_DATA[editState]?.[editDistrict] || []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Detailed Address</label>
                    <input 
                      type="text" 
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      placeholder="Street address, apartment"
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Pincode</label>
                    <input 
                      type="text" 
                      required 
                      value={editPincode}
                      onChange={(e) => setEditPincode(e.target.value)}
                      placeholder="560034"
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="flex-grow py-3 bg-slate-100 dark:bg-dark-800 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-grow py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
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

      {/* Edit Blood Request Modal */}
      {showEditRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            <button 
              onClick={() => setShowEditRequestModal(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h2 className="text-2xl font-black flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary-500 fill-primary-500 animate-pulse" /> Edit Blood Request
              </h2>
              <p className="text-xs text-slate-500">Update request details below. Modified alerts will be reflected across active dashboards.</p>
            </div>

            <form onSubmit={handleEditRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Patient Name</label>
                <input
                  type="text"
                  required
                  value={editPatientName}
                  onChange={(e) => setEditPatientName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Blood Group Needed</label>
                  <select
                    value={editBloodGroup}
                    onChange={(e) => setEditBloodGroup(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-primary-600 font-bold outline-none"
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
                    value={editUnitsRequired}
                    onChange={(e) => setEditUnitsRequired(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-855 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Needed By Date</label>
                  <input
                    type="date"
                    required
                    value={editNeededBy}
                    onChange={(e) => setEditNeededBy(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-850 dark:text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    value={editReqPincode}
                    onChange={(e) => setEditReqPincode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-855 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital / Clinic Name</label>
                <input
                  type="text"
                  required
                  value={editHospitalName}
                  onChange={(e) => setEditHospitalName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">State</label>
                  <select
                    required
                    value={editReqState}
                    onChange={(e) => {
                      setEditReqState(e.target.value);
                      setEditReqDistrict('');
                      setEditReqCity('');
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select State</option>
                    {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">District</label>
                  <select
                    required
                    disabled={!editReqState}
                    value={editReqDistrict}
                    onChange={(e) => {
                      setEditReqDistrict(e.target.value);
                      setEditReqCity('');
                    }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none disabled:opacity-55 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select District</option>
                    {editReqState && Object.keys(STATES_DATA[editReqState] || {}).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">City</label>
                  <select
                    required
                    disabled={!editReqDistrict}
                    value={editReqCity}
                    onChange={(e) => setEditReqCity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] outline-none disabled:opacity-55 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Select City</option>
                    {editReqState && editReqDistrict && (STATES_DATA[editReqState]?.[editReqDistrict] || []).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Hospital Clinic Address</label>
                <input
                  type="text"
                  required
                  value={editReqHospitalAddress}
                  onChange={(e) => setEditReqHospitalAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-850 dark:text-slate-100 outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>

              {/* Emergency Modes */}
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-red-600 flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> Emergency Broadcast Mode</p>
                  <p className="text-[10px] text-red-500/80">Check this box to trigger immediate system-wide push notifications.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={editEmergencyMode} 
                  onChange={(e) => setEditEmergencyMode(e.target.checked)} 
                  className="w-4 h-4 text-primary-600 rounded cursor-pointer" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Critical Reason / Diagnosis</label>
                <textarea
                  rows="2"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-850 dark:text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditRequestModal(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-650 dark:text-slate-350 font-bold rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </div>
      </div>

      {/* Floating Bottom Nav for Mobile Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-850 py-2 px-6 flex justify-around md:hidden print:hidden">
        {[
          { id: 'main-home', label: 'Home', icon: Home, path: '/' },
          { id: 'requests', label: 'Requests', icon: FileText },
          { id: 'smartMatch', label: 'Match', icon: Sparkles },
          { id: 'bloodbanks', label: 'Banks', icon: Compass }
        ].map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeTab === item.id;

          if (item.path) {
            return (
              <Link
                key={item.id}
                to={item.path}
                className="flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 text-slate-400 dark:text-slate-500 hover:text-rose-500"
              >
                <ItemIcon className="w-5.5 h-5.5" />
                <span>{item.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
              }}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <ItemIcon className="w-5.5 h-5.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      {/* Quick Matching Donors Modal */}
      {showMatchesModal && matchesModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-3xl bg-white/95 dark:bg-dark-900/95 border-2 border-primary-500/30 p-6 md:p-8 rounded-3xl shadow-2xl shadow-primary-500/10 max-h-[90vh] overflow-y-auto animate-slide-up flex flex-col">
            
            {/* Close button */}
            <button 
              onClick={() => {
                setShowMatchesModal(false);
                setMatchesModalRequest(null);
              }}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-[10px] font-black uppercase bg-primary-500 text-white rounded-full animate-pulse">
                  Matching Donors List
                </span>
                <span className="px-3 py-1 text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 rounded-full">
                  Blood Group: {matchesModalRequest.bloodGroup}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Heart className="w-6 h-6 text-primary-500 fill-primary-500 animate-pulse" /> 
                Contact Matching Donors Fast
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                We have found proximity matching donors. Call, Chat, or WhatsApp them immediately to coordinate blood donation for <span className="font-extrabold text-slate-800 dark:text-white">{matchesModalRequest.patientName}</span> at <span className="font-extrabold text-slate-800 dark:text-white">{matchesModalRequest.hospitalName}</span>.
              </p>
            </div>

            {/* Donor cards wrapper */}
            <div className="flex-grow overflow-y-auto py-6 space-y-4 max-h-[50vh] pr-2">
              {loadingModalMatchingDonors ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" />
                  <p className="text-xs text-slate-400 mt-2">Searching live matching database...</p>
                </div>
              ) : modalMatchingDonors.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {modalMatchingDonors.map((donor) => {
                    let dWaPhone = (donor.phone || '').trim().replace(/\s+/g, '');
                    if (!dWaPhone.startsWith('+')) {
                      dWaPhone = dWaPhone.length === 10 ? `91${dWaPhone}` : dWaPhone;
                    } else {
                      dWaPhone = dWaPhone.replace('+', '');
                    }
                    const dWaMsg = encodeURIComponent(`Hi ${donor.fullName}, I saw you are a matching donor on ONEDROP. We need ${matchesModalRequest.bloodGroup} blood urgently. Can you help?`);
                    const dWaUrl = `https://wa.me/${dWaPhone}?text=${dWaMsg}`;

                    return (
                      <div 
                        key={donor._id} 
                        className="p-4 bg-slate-50 dark:bg-dark-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4 transition-all hover:scale-[1.01] hover:border-primary-500/20"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <img 
                              src={donor.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${donor.fullName}`}
                              alt={donor.fullName}
                              className="w-10 h-10 rounded-full border border-slate-200 shadow-sm object-cover"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs text-slate-800 dark:text-white">{donor.fullName}</span>
                                {donor.isVerifiedDonor && (
                                  <Award className="w-3.5 h-3.5 text-blue-500 fill-blue-500" title="Verified Lifesaver" />
                                )}
                              </div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase">{donor.city}, {donor.state}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-black bg-primary-100 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400">
                            {donor.bloodGroup}
                          </span>
                        </div>

                        {/* Match details & distance indicators */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] bg-white dark:bg-dark-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800/40">
                          <div>
                            <span className="text-slate-400">Status:</span>
                            <p className="font-bold text-emerald-500">Available</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Match Score:</span>
                            <p className="font-bold text-indigo-500">{donor.matchScore || 95}%</p>
                          </div>
                        </div>

                        {/* Direct coordination panel */}
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          {donor.phone && (
                            <a
                              href={`tel:${donor.phone}`}
                              className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-extrabold hover:bg-emerald-700 transition"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                          )}
                          <a
                            href={dWaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-[#25D366] text-white rounded-lg text-[10px] font-extrabold hover:bg-[#1ebe59] transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg> WhatsApp
                          </a>
                          <button
                            type="button"
                            onClick={() => handleInitiateChat(donor._id)}
                            className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-extrabold hover:bg-indigo-700 transition"
                          >
                            <MessageSquare className="w-3.5 h-3.5" /> Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAlertDonor(matchesModalRequest._id, donor._id, donor.fullName)}
                            className="flex-grow flex items-center justify-center gap-1 py-1.5 bg-rose-600 text-white rounded-lg text-[10px] font-extrabold hover:bg-rose-700 transition"
                          >
                            Alert
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <AlertCircle className="w-10 h-10 mx-auto text-slate-350 animate-pulse" />
                  <p className="text-xs font-extrabold">No matching proximity donors found in your area.</p>
                  <p className="text-[10px]">Try searching with "Smart Match Finder" or expanding your area parameters.</p>
                </div>
              )}
            </div>

            {/* Modal footer action */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowMatchesModal(false);
                  setMatchesModalRequest(null);
                }}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition"
              >
                Close Matches Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Mobile Drawer (Slide Bar) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white dark:bg-dark-900 shadow-2xl flex flex-col justify-between p-6 border-r border-slate-200 dark:border-slate-800 md:hidden"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Recipient Console</span>
                    <h2 className="text-sm font-black text-slate-800 dark:text-slate-200">ONEDROP Dashboard</h2>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1.5 overflow-y-auto max-h-[70vh] scrollbar-none pr-1">
                  {[
                    { id: 'requests', label: 'Requests & Pledges', icon: FileText },
                    { id: 'smartMatch', label: 'Smart Match Finder', icon: Sparkles },
                    { id: 'bloodbanks', label: 'Blood Banks', icon: Compass }
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                          isActive 
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' 
                            : 'hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComp className="w-5 h-5 flex-shrink-0" />
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Sidebar Footer User Badge */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-dark-800 flex items-center justify-center font-black text-primary-500 border-2 border-primary-500">
                  {user?.fullName?.charAt(0)}
                </div>
                <div className="text-left text-xs truncate max-w-[140px]">
                  <p className="font-extrabold dark:text-slate-200">{user?.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Recipient Panel</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav for Mobile Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-850 py-2 px-6 flex justify-around md:hidden print:hidden">
        {[
          { id: 'main-home', label: 'Home', icon: Home, path: '/' },
          { id: 'requests', label: 'Requests', icon: FileText },
          { id: 'smartMatch', label: 'Match', icon: Sparkles },
          { id: 'bloodbanks', label: 'Banks', icon: Compass },
          { id: 'menu', label: 'Menu', icon: Menu, action: () => setMobileMenuOpen(true) }
        ].map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeTab === item.id;

          if (item.path) {
            return (
              <Link
                key={item.id}
                to={item.path}
                className="flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 text-slate-400 dark:text-slate-500 hover:text-rose-500"
              >
                <ItemIcon className="w-5.5 h-5.5" />
                <span>{item.label}</span>
              </Link>
            );
          }

          if (item.action) {
            return (
              <button
                key={item.id}
                onClick={item.action}
                className="flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 text-slate-400 dark:text-slate-500 hover:text-rose-500"
              >
                <ItemIcon className="w-5.5 h-5.5" />
                <span>{item.label}</span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 ${isActive ? 'text-primary-500' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <ItemIcon className="w-5.5 h-5.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      </div>
    </div>
  );
};

export default RecipientDashboard;
