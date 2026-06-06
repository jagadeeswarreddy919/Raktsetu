import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { updateProfileSuccess, logout } from '../redux/authSlice';
import { socket } from '../utils/socket';
import { 
  Heart, Activity, Award, Calendar, ToggleLeft, ToggleRight, Share2, 
  Clipboard, Download, Check, MessageSquare, Printer, X, ShieldAlert, 
  Bell, Settings, Layout, Users, Star, TrendingUp, Info, HelpCircle, 
  MapPin, CheckCircle, Clock, Gift, BookOpen, ChevronRight, Menu, ArrowRight,
  RefreshCw, Loader2, Sparkles, Plus, FileText, Globe, Compass, Phone, Search,
  Home, Smartphone, Laptop
} from 'lucide-react';
import { 
  firebaseSendEmailVerification, 
  firebaseGetCurrentUserToken,
  firebaseVerifyEmailOTP
} from '../utils/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { STATES_DATA } from '../utils/statesData';
import { BLOOD_BANKS_DATA } from '../utils/bloodBanksData';
import AppreciationCertificate from '../components/AppreciationCertificate';
import SmartSearchInput from '../components/SmartSearchInput';
import { getTimeBasedGreeting } from '../utils/greeting';

// Localization bundles for 6 major languages
const LOCALIZATION = {
  en: {
    greeting: "Good Evening",
    availability: "Donation Availability",
    active: "Active (Listed)",
    inactive: "Inactive (Hidden)",
    scoreRank: "Lifesaver XP & Rank",
    verified: "Verified Lifesaver",
    badgeTitle: "Appreciation Seals",
    inviteFriends: "Refer & Invite Friends",
    copyLink: "Copy link and secure +100 XP!",
    nearbyRequests: "Regional Urgent Blood Matches",
    chatNow: "Secure Chat",
    pledgeNow: "Pledge 1 Unit",
    cooldownTitle: "Donation Cooldown Tracker",
    cooldownTip: "Keep iron intake high and stay hydrated!",
    aiRecommendation: "AI Match Insights",
    aiTip: "High matches forecasted nearby based on seasonal trends.",
    volMode: "Volunteer Preference",
    volAvailable: "I am available for emergency donations tonight",
    registeredCamps: "Upcoming Donation Camps",
    healthCheck: "Interactive Health Analyzer",
    bmiTitle: "Fast BMI Calculator",
    notifications: "Match Alert Feed",
    leaderboard: "National Leaderboard",
    rewardWallet: "Redeemable Reward Wallet",
    pointsBalance: "Points Balance",
    redeemBtn: "Redeem Coupon",
    chatBotTitle: "AI Healthcare Assistant",
    chatBotWelcome: "Hello! Ask me about eligibility, dietary tips, or how to claim your badges.",
    compactMode: "Compact UI Spacing",
    accentColor: "Theme Accent Palette",
    language: "Localization Language",
    editProfile: "Edit Medical Profile"
  },
  hi: {
    greeting: "शुभ संध्या",
    availability: "रक्तदान की उपलब्धता",
    active: "सक्रिय (सूचीबद्ध)",
    inactive: "निष्क्रिय (छिपा हुआ)",
    scoreRank: "जीवनरक्षक XP और रैंक",
    verified: "सत्यापित जीवनरक्षक",
    badgeTitle: "प्रशंसा पत्र और बैज",
    inviteFriends: "मित्रों को आमंत्रित करें",
    copyLink: "लिंक साझा करें और +100 XP प्राप्त करें!",
    nearbyRequests: "क्षेत्रीय आपातकालीन रक्त अनुरोध",
    chatNow: "सुरक्षित चैट",
    pledgeNow: "1 यूनिट दान करें",
    cooldownTitle: "रक्तदान अंतराल ट्रैकर",
    cooldownTip: "आयरन युक्त आहार लें और पर्याप्त पानी पीएं!",
    aiRecommendation: "एआई स्मार्ट अंतर्दृष्टि",
    aiTip: "मौसम के अनुसार निकटवर्ती क्षेत्रों में अधिक मांग का अनुमान है।",
    volMode: "स्वयंसेवक प्राथमिकता",
    volAvailable: "मैं आज रात आपातकालीन रक्तदान के लिए उपलब्ध हूँ",
    registeredCamps: "आगामी रक्तदान शिविर",
    healthCheck: "इंटरएक्टिव स्वास्थ्य विश्लेषक",
    bmiTitle: "तेज़ बीएमआई कैलकुलेटर",
    notifications: "अलर्ट सूचना केंद्र",
    leaderboard: "राष्ट्रीय लीडरबोर्ड",
    rewardWallet: "रिवॉर्ड वॉलेट और कूपन",
    pointsBalance: "अंक संतुलन",
    redeemBtn: "कूपन भुनाएं",
    chatBotTitle: "एआई स्वास्थ्य सहायक",
    chatBotWelcome: "नमस्ते! पात्रता, आहार युक्तियाँ या बैज के बारे में मुझसे पूछें।",
    compactMode: "सघन इंटरफ़ेस (Compact)",
    accentColor: "थीम का रंग",
    language: "भाषा सेटिंग",
    editProfile: "चिकित्सा प्रोफ़ाइल संपादित करें"
  },
  gu: {
    greeting: "શુભ સાંજ",
    availability: "રક્તદાન ઉપલબ્ધતા",
    active: "સક્રિય (દર્શાવેલ)",
    inactive: "નિષ્ક્રિય (છુપાયેલ)",
    scoreRank: "જીવનરક્ષક XP અને રેન્ક",
    verified: "પ્રમાણિત જીવનરક્ષક",
    badgeTitle: "પ્રશંસા બેજ",
    inviteFriends: "મિત્રોને આમંત્રિત કરો",
    copyLink: "લિંક શેર કરો અને +100 XP મેળવો!",
    nearbyRequests: "તાત્કાલિક રક્ત વિનંતીઓ",
    chatNow: "સુરક્ષિત ચેટ",
    pledgeNow: "૧ યુનિટ આપો",
    cooldownTitle: "રક્તદાન કૂલડાઉન ટ્રૅકર",
    cooldownTip: "આયર્ન લો અને પુષ્કળ પાણી પીવો!",
    aiRecommendation: "AI સ્માર્ટ સલાહ",
    aiTip: "હાલના ટ્રેન્ડ મુજબ નજીકમાં વધુ માંગની શક્યતા છે.",
    volMode: "સ્વયંસેવક મોડ",
    volAvailable: "હું આજે રાત્રે તાત્કાલિક રક્તદાન માટે ઉપલબ્ધ છું",
    registeredCamps: "આગામી રક્તદાન કેમ્પ",
    healthCheck: "આરોગ્ય કેલ્ક્યુલેટર",
    bmiTitle: "ઝડપી BMI કેલ્ક્યુલેટર",
    notifications: "ચેતવણી કેન્દ્ર",
    leaderboard: "લીડરબોર્ડ",
    rewardWallet: "ઇનામ વૉલેટ",
    pointsBalance: "પોઇન્ટ બેલેન્સ",
    redeemBtn: "કૂપન મેળવો",
    chatBotTitle: "AI આરોગ્ય સહાયક",
    chatBotWelcome: "નમસ્તે! પાત્રતા અથવા આહાર વિશે કોઈ પણ પ્રશ્ન પૂછો.",
    compactMode: "કોમ્પેક્ટ મોડ",
    accentColor: "થીમ કલર",
    language: "ભાષા પસંદ કરો",
    editProfile: "પ્રોફાઇલ સંપાદિત કરો"
  },
  mr: {
    greeting: "शुभ संध्याकाळ",
    availability: "रक्तदान उपलब्धता",
    active: "सक्रिय (नोंदणीकृत)",
    inactive: "निष्क्रिय (अदृश्य)",
    scoreRank: "जीवनरक्षक XP आणि रँक",
    verified: "सत्यापित जीवनरक्षक",
    badgeTitle: "सन्मान पदक",
    inviteFriends: "मित्रांना आमंत्रित करा",
    copyLink: "दुवा कॉपी करा आणि +100 XP मिळवा!",
    nearbyRequests: "जवळपासचे तात्काळ रक्त मागणी",
    chatNow: "सुरक्षित गप्पा",
    pledgeNow: "१ युनिट मदत करा",
    cooldownTitle: "रक्तदान विश्रांती ट्रॅकर",
    cooldownTip: "लोहयुक्त आहार घ्या आणि हायड्रेटेड राहा!",
    aiRecommendation: "एआय स्मार्ट अंदाज",
    aiTip: "हंगामी बदलानुसार जवळपास रक्ताचा तुटवडा भासू शकतो.",
    volMode: "स्वयंसेवक मोड",
    volAvailable: "मी आज रात्री तातडीच्या मदतीसाठी उपलब्ध आहे",
    registeredCamps: "नजीकचे रक्तदान शिबीर",
    healthCheck: "आरोग्य तपासणी विश्लेषक",
    bmiTitle: "त्वरित बीएमआय गणक",
    notifications: "सूचना केंद्र",
    leaderboard: "लीडरबोर्ड",
    rewardWallet: "बक्षीस वॉलेट",
    pointsBalance: "एकूण जमा गुण",
    redeemBtn: "कूपन वापरा",
    chatBotTitle: "एआय आरोग्य मदतनीस",
    chatBotWelcome: "नमस्कार! पात्रता आणि निरोगी आहाराबद्दल मला काहीही विचारा.",
    compactMode: "कॉपॅक्ट मोड",
    accentColor: "थीम रंग",
    language: "भाषा निवडा",
    editProfile: "वैद्यकीय माहिती बदला"
  },
  kn: {
    greeting: "ಶುಭ ಸಂಜೆ",
    availability: "ರಕ್ತದಾನ ಲಭ್ಯತೆ",
    active: "ಸಕ್ರಿಯ (ಲಿಸ್ಟ್ ಆಗಿದೆ)",
    inactive: "ನಿಷ್ಕ್ರಿಯ (ಮರೆಮಾಡಲಾಗಿದೆ)",
    scoreRank: "ಲೈಫ್ ಸೇವರ್ XP ಮತ್ತು ರ್ಯಾಂಕ್",
    verified: "ದೃಢೀಕೃತ ರಕ್ತದಾನಿ",
    badgeTitle: "ಗೌರವ ಬ್ಯಾಡ್ಜ್‌ಗಳು",
    inviteFriends: "ಸ್ನೇಹಿತರನ್ನು ಆಹ್ವಾನಿಸಿ",
    copyLink: "ಲಿಂಕ್ ಕಾಪಿ ಮಾಡಿ ಮತ್ತು +100 XP ಪಡೆಯಿರಿ!",
    nearbyRequests: "ತುರ್ತು ರಕ್ತದ ಅವಶ್ಯಕತೆಗಳು",
    chatNow: "ಸುರಕ್ಷಿತ ಚಾಟ್",
    pledgeNow: "೧ ಯೂನಿಟ್ ನೀಡಿ",
    cooldownTitle: "ರಕ್ತದಾನ ಕಾಲಾವಧಿ ಟ್ರ್ಯಾಕರ್",
    cooldownTip: "ಕಬ್ಬಿಣದ ಅಂಶ ಹೆಚ್ಚಿರುವ ಆಹಾರ ಸೇವಿಸಿ!",
    aiRecommendation: "AI ಸ್ಮಾರ್ಟ್ ಮಾಹಿತಿ",
    aiTip: "ನಿಮ್ಮ ಸಮೀಪದಲ್ಲಿ ಹೆಚ್ಚಿನ ರಕ್ತದ ಬೇಡಿಕೆ ಕಂಡುಬರಬಹುದು.",
    volMode: "ಸ್ವಯಂಸೇವಕ ಮೋಡ್",
    volAvailable: "ನಾನು ಇಂದು ರಾತ್ರಿ ತುರ್ತು ರಕ್ತದಾನಕ್ಕೆ ಲಭ್ಯನಿದ್ದೇನೆ",
    registeredCamps: "ಮುಂಬರುವ ರಕ್ತದಾನ ಶಿಬಿರಗಳು",
    healthCheck: "ಆರೋಗ್ಯ ವಿಶ್ಲೇಷಕ",
    bmiTitle: "ತ್ವರಿತ BMI ಕ್ಯಾಲ್ಕುಲೇಟರ್",
    notifications: "ಅಲರ್ಟ್ ಕೇಂದ್ರ",
    leaderboard: "ಲೀಡರ್‌ಬೋರ್ಡ್",
    rewardWallet: "ರಿವಾರ್ಡ್ ವಾಲೆಟ್",
    pointsBalance: "ಪಾಯಿಂಟ್ಸ್ ಬ್ಯಾಲೆನ್ಸ್",
    redeemBtn: "ಕೂಪನ್ ಕ್ಲೈಮ್ ಮಾಡಿ",
    chatBotTitle: "AI ಆರೋಗ್ಯ ಸಹಾಯಕ",
    chatBotWelcome: "ನಮಸ್ಕಾರ! ಅರ್ಹತೆ ಮತ್ತು ಆಹಾರಕ್ರಮದ ಬಗ್ಗೆ ನನ್ನನ್ನು ಕೇಳಿ.",
    compactMode: "ಕಾಂಪ್ಯಾಕ್ಟ್ ಮೋಡ್",
    accentColor: "ಥೀಮ್ ಬಣ್ಣ",
    language: "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
    editProfile: "ಪ್ರೊಫೈಲ್ ತಿದ್ದುಪಡಿ"
  },
  ta: {
    greeting: "மாலை வணக்கம்",
    availability: "இரத்த தானம் கிடைக்கும் நிலை",
    active: "செயலில் உள்ளது",
    inactive: "செயலிழந்துள்ளது",
    scoreRank: "உயிர்காப்பாளர் XP & தகுதி",
    verified: "சரிபார்க்கப்பட்ட கொடையாளர்",
    badgeTitle: "பாராட்டு பேட்ஜ்கள்",
    inviteFriends: "நண்பர்களை அழைத்திடுங்கள்",
    copyLink: "இணைப்பை பகிர்ந்து +100 XP பெற்றிடுங்கள்!",
    nearbyRequests: "அவசர இரத்த தேவைகள்",
    chatNow: "பாதுகாப்பான அரட்டை",
    pledgeNow: "1 யூனிட் தானம்",
    cooldownTitle: "தானம் செய்ய வேண்டிய நாட்கள்",
    cooldownTip: "சத்தான உணவுகளை உட்கொண்டு நீரேற்றத்துடன் இருங்கள்!",
    aiRecommendation: "AI அறிவார்ந்த பரிந்துரைகள்",
    aiTip: "பருவநிலைக்கு ஏற்ப உங்கள் அருகில் அதிக இரத்த தேவை ஏற்படலாம்.",
    volMode: "தன்னார்வலர் முன்னுரிமை",
    volAvailable: "இன்று இரவு அவசர இரத்த தானத்திற்கு நான் தயார்",
    registeredCamps: "அடுத்து வரும் இரத்த தான முகாம்கள்",
    healthCheck: "உடல்நல கணக்கீடு",
    bmiTitle: "வேகமான BMI கால்குலேட்டர்",
    notifications: "அறிவிப்பு பலகை",
    leaderboard: "தலைமைப் பட்டியல்",
    rewardWallet: "பரிசு வாலட்",
    pointsBalance: "மொத்த புள்ளிகள்",
    redeemBtn: "கூப்பனை பயன்படுத்துக",
    chatBotTitle: "AI மருத்துவ உதவியாளர்",
    chatBotWelcome: "வணக்கம்! தகுதி மற்றும் ஆரோக்கிய குறிப்புகளை என்னிடம் கேளுங்கள்.",
    compactMode: "கச்சிதமான வடிவம்",
    accentColor: "தீம் நிறம்",
    language: "மொழி அமைப்பு",
    editProfile: "விவரங்களை திருத்துக"
  }
};

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

const DonorDashboard = () => {
  const { user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [syncingEmail, setSyncingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState(null);

  const [emailOtpVal, setEmailOtpVal] = useState('');
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  const isUnverified = user ? !user.isEmailVerified : false;

  const handleVerifyEmailOTP = async (e) => {
    e.preventDefault();
    if (!emailOtpVal.trim()) return;
    setVerifyingEmailOtp(true);
    setVerificationFeedback(null);
    try {
      const res = await firebaseVerifyEmailOTP(user?.email, emailOtpVal);
      dispatch(updateProfileSuccess(res.user));
      setVerificationFeedback({
        type: 'success',
        message: 'Email successfully verified via OTP! Your account is now fully verified.'
      });
      setEmailOtpVal('');
    } catch (err) {
      console.error(err);
      setVerificationFeedback({
        type: 'error',
        message: err.message || 'Verification code verification failed. Please check the code and try again.'
      });
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

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

  // Dynamic customization state
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam || 'dashboard');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [lang, setLang] = useState('en');
  const [accent, setAccent] = useState('red');
  const [compact, setCompact] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Availability, SOS Panic alert and volunteer settings
  const [availability, setAvailability] = useState(user?.availability ?? true);
  const [availabilityStatus, setAvailabilityStatus] = useState(user?.availabilityStatus || 'Available');
  const [smartMatchAlert, setSmartMatchAlert] = useState(null);

  const [emergencyVolunteer, setEmergencyVolunteer] = useState(false);
  const [sosPanicActive, setSosPanicActive] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Blood banks filter states
  const [bankState, setBankState] = useState('');
  const [bankDistrict, setBankDistrict] = useState('');
  
  // Dashboard & requests list state
  const [nearbyRequests, setNearbyRequests] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Donor-Side Patient Request States
  const [reqPatientName, setReqPatientName] = useState('');
  const [reqBloodGroup, setReqBloodGroup] = useState('O+');
  const [reqUnitsRequired, setReqUnitsRequired] = useState(1);
  const [reqHospitalName, setReqHospitalName] = useState('');
  const [reqNeededBy, setReqNeededBy] = useState('');
  const [reqEmergencyMode, setReqEmergencyMode] = useState(false);
  const [reqReason, setReqReason] = useState('');
  const [reqState, setReqState] = useState(normalizeState(user?.state || ''));
  const [reqDistrict, setReqDistrict] = useState(normalizeDistrict(user?.state || '', user?.district || ''));
  const [reqCity, setReqCity] = useState(normalizeCity(user?.state || '', user?.district || '', user?.city || ''));
  const [reqPincode, setReqPincode] = useState(user?.pincode || '');
  const [reqHospitalAddress, setReqHospitalAddress] = useState(user?.address || '');

  // My Requests Tracking
  const [myRequests, setMyRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestsSubTab, setRequestsSubTab] = useState('browse'); // 'browse' | 'create'
  const [declinedRequests, setDeclinedRequests] = useState(() => JSON.parse(localStorage.getItem('declinedRequests') || '[]'));

  useEffect(() => {
    localStorage.setItem('declinedRequests', JSON.stringify(declinedRequests));
  }, [declinedRequests]);

  const [emailAlerts, setEmailAlerts] = useState(() => JSON.parse(localStorage.getItem('emailAlerts') !== 'false'));
  const [smsAlerts, setSmsAlerts] = useState(() => JSON.parse(localStorage.getItem('smsAlerts') !== 'false'));
  const [pushAlerts, setPushAlerts] = useState(() => JSON.parse(localStorage.getItem('pushAlerts') !== 'false'));

  useEffect(() => {
    localStorage.setItem('emailAlerts', JSON.stringify(emailAlerts));
  }, [emailAlerts]);

  useEffect(() => {
    localStorage.setItem('smsAlerts', JSON.stringify(smsAlerts));
  }, [smsAlerts]);

  useEffect(() => {
    localStorage.setItem('pushAlerts', JSON.stringify(pushAlerts));
  }, [pushAlerts]);

  // PWA App Installation States
  const [deferredPrompt, setDeferredPrompt] = useState(window.deferredPrompt || null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches || 
    window.navigator.standalone || 
    false
  );
  const [showInstallInstructions, setShowInstallInstructions] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e;
    };

    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleMediaChange = (e) => {
      setIsPwaInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to PWA install prompt: ${outcome}`);
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    } else {
      setShowInstallInstructions(true);
    }
  };

  useEffect(() => {
    if (user) {
      setEditName(user.fullName || '');
      setEditPhone(user.phone || '');
      setEditState(normalizeState(user.state || ''));
      setEditDistrict(normalizeDistrict(user.state || '', user.district || ''));
      setEditCity(normalizeCity(user.state || '', user.district || '', user.city || ''));
      setEditAddress(user.address || '');
      setEditPincode(user.pincode || '');
      setEditBloodGroup(user.bloodGroup || 'O+');
      setEditWeight(user.weight || '');
      setEditDOB(user.DOB ? user.DOB.split('T')[0] : '');
      setEditGender(user.gender || 'Male');
      setEditConditions(user.medicalConditions?.join(', ') || '');
      setEditAllergies(user.allergies?.join(', ') || '');

      setReqState(normalizeState(user.state || ''));
      setReqDistrict(normalizeDistrict(user.state || '', user.district || ''));
      setReqCity(normalizeCity(user.state || '', user.district || '', user.city || ''));
    }
  }, [user]);

  // Smart Match Search States (Donor finding other donors)
  // Default to empty so ALL donors show initially
  const [filterBloodGroup, setFilterBloodGroup] = useState('');
  const [filterState, setFilterState] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterPincode, setFilterPincode] = useState('');
  const [filterAvailability, setFilterAvailability] = useState('all'); // all, available, emergency
  const [filterVerified, setFilterVerified] = useState(false);
  const [eligibleDonors, setEligibleDonors] = useState([]);
  const [searching, setSearching] = useState(false);

  // Browse Blood Requests filter states
  const [browseBloodGroup, setBrowseBloodGroup] = useState('');
  const [browseState, setBrowseState] = useState('');
  const [browseEmergencyOnly, setBrowseEmergencyOnly] = useState(false);

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

  // Edit Profile Form States
  const [editName, setEditName] = useState(user?.fullName || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editState, setEditState] = useState(normalizeState(user?.state || ''));
  const [editDistrict, setEditDistrict] = useState(normalizeDistrict(user?.state || '', user?.district || ''));
  const [editCity, setEditCity] = useState(normalizeCity(user?.state || '', user?.district || '', user?.city || ''));
  const [editAddress, setEditAddress] = useState(user?.address || '');
  const [editPincode, setEditPincode] = useState(user?.pincode || '');
  const [editBloodGroup, setEditBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [editWeight, setEditWeight] = useState(user?.weight || '');
  const [editDOB, setEditDOB] = useState(user?.DOB ? new Date(user.DOB).toISOString().split('T')[0] : '');
  const [editGender, setEditGender] = useState(user?.gender || 'Male');
  const [editConditions, setEditConditions] = useState(user?.medicalConditions?.join(', ') || '');
  const [editAllergies, setEditAllergies] = useState(user?.allergies?.join(', ') || '');

  // Geolocation loading state
  const [gpsLoading, setGpsLoading] = useState(false);

  // Verification Upload simulation
  const [medicalReportName, setMedicalReportName] = useState('');
  const [doctorVerificationName, setDoctorVerificationName] = useState('');
  const [isVerifyingFile, setIsVerifyingFile] = useState(false);

  // Cooldown countdown date simulation (42 days remaining from typical 90 days interval)
  const [daysRemaining, setDaysRemaining] = useState(42);
  
  // Quick Health Analyzer values
  const [bmiHeight, setBmiHeight] = useState('');
  const [bmiWeightVal, setBmiWeightVal] = useState('');
  const [bmiResult, setBmiResult] = useState(null);

  const [communityStories, setCommunityStories] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [campaignDrives, setCampaignDrives] = useState([]);
  const [fulfilledPledges, setFulfilledPledges] = useState(0);
  const [newCommunityPost, setNewCommunityPost] = useState("");

  // AI Chatbot assistant floating states
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [chatbotMessages, setChatbotMessages] = useState([
    { sender: 'bot', text: LOCALIZATION[lang].chatBotWelcome }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);

  // Activity Contribution Matrix Heatmap representation (12 weeks * 7 days)
  const [heatmapData, setHeatmapData] = useState([]);

  // Dynamic calculation of user XP level
  const userXP = (user?.rewardPoints || 0) * 10 + (user?.totalReferrals || 0) * 100;
  
  const getRankInfo = (xp) => {
    if (xp < 500) return { rank: 'Bronze Donor', level: 1, limit: 500, color: 'text-amber-700' };
    if (xp < 1500) return { rank: 'Silver Donor', level: 2, limit: 1500, color: 'text-slate-400' };
    if (xp < 3000) return { rank: 'Gold Donor', level: 3, limit: 3000, color: 'text-yellow-500' };
    if (xp < 5000) return { rank: 'Platinum Donor', level: 4, limit: 5000, color: 'text-indigo-400 font-extrabold' };
    return { rank: 'Hero Donor', level: 5, limit: 10000, color: 'text-rose-500 font-black tracking-widest uppercase animate-pulse' };
  };
  const rankObj = getRankInfo(userXP);

  // Accent selector mapping to actual tailwind coloring rules
  const getAccentColors = (currentAccent) => {
    switch (currentAccent) {
      case 'indigo':
        return {
          bg: 'bg-indigo-600',
          hover: 'hover:bg-indigo-700',
          text: 'text-indigo-500',
          glow: 'shadow-indigo-500/20',
          border: 'border-indigo-500/20',
          accent: 'indigo'
        };
      case 'emerald':
        return {
          bg: 'bg-emerald-600',
          hover: 'hover:bg-emerald-700',
          text: 'text-emerald-500',
          glow: 'shadow-emerald-500/20',
          border: 'border-emerald-500/20',
          accent: 'emerald'
        };
      case 'amber':
        return {
          bg: 'bg-amber-600',
          hover: 'hover:bg-amber-700',
          text: 'text-amber-500',
          glow: 'shadow-amber-500/20',
          border: 'border-amber-500/20',
          accent: 'amber'
        };
      case 'violet':
        return {
          bg: 'bg-violet-600',
          hover: 'hover:bg-violet-700',
          text: 'text-violet-500',
          glow: 'shadow-violet-500/20',
          border: 'border-violet-500/20',
          accent: 'violet'
        };
      case 'red':
      default:
        return {
          bg: 'bg-primary-600',
          hover: 'hover:bg-primary-700',
          text: 'text-primary-500',
          glow: 'shadow-primary-500/20',
          border: 'border-primary-500/20',
          accent: 'primary'
        };
    }
  };
  const uiTheme = getAccentColors(accent);

  useEffect(() => {
    setHeatmapData([]);
  }, []);

  // Sync user state properties on reload
  useEffect(() => {
    if (user) {
      setAvailability(user.availability ?? true);
      setAvailabilityStatus(user.availabilityStatus || 'Available');
    }
  }, [user]);

  // Initial fetches for patient tickets
  useEffect(() => {
    if (user && token) {
      fetchMyRequests();
    }
  }, [user, token]);

  // Smart Search donor finder fetch trigger
  useEffect(() => {
    if (activeTab === 'smartMatch') {
      fetchEligibleDonors();
    }
  }, [activeTab, filterBloodGroup, filterState, filterDistrict, filterCity, filterPincode, filterAvailability, filterVerified]);



  useEffect(() => {
    const fetchRequests = async () => {
      try {
        // Fetch pending requests matching donor's state and district
        const res = await axios.get(
          `${API_URL}/api/requests?state=${user?.state || ''}&district=${user?.district || ''}`
        );
        // Show all pending requests that are not from the current user
        setNearbyRequests(res.data.filter((r) => r.status === 'Pending'));
        const pledged = res.data.filter((r) =>
          r.status === 'Fulfilled' &&
          r.donorsPledged?.some((p) => (p.donor?._id || p.donor)?.toString() === user?._id?.toString())
        );
        setFulfilledPledges(pledged.length);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchRequests();
  }, [user, activeTab]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/auth/leaderboard`);
        setLeaderboard(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!user || activeTab !== 'campaigns') return;
    const fetchCampaigns = async () => {
      try {
        const params = new URLSearchParams();
        if (user.state) params.append('state', user.state);
        if (user.district) params.append('district', user.district);
        if (user.city) params.append('city', user.city);
        const res = await axios.get(`${API_URL}/api/campaigns?${params.toString()}`);
        setCampaignDrives(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchCampaigns();
  }, [user, activeTab]);

  // Socket.IO real-time blood requests listener
  useEffect(() => {
    if (!user || !user._id) return;
    
    // Register active user session
    socket.emit('register', user._id);
    
    // Listen for new emergency blood match alerts
    socket.on('new_blood_request', (data) => {
      console.log('[WebSocket] Smart Blood Match Alert Received:', data);
      
      // Check current availability status
      setAvailabilityStatus((currentStatus) => {
        if (currentStatus === 'Not Available' || currentStatus === 'Busy') {
          console.log(`[WebSocket] Ignored match alert because status is ${currentStatus}`);
          return currentStatus;
        }
        
        if (currentStatus === 'Emergency Only' && !data.emergencyMode) {
          console.log('[WebSocket] Ignored non-emergency match alert because status is Emergency Only');
          return currentStatus;
        }
        
        // Show floating Smart Match Alert Panel
        setSmartMatchAlert(data);
        
        // Add to alert feed/logs at the top
        setLogs((prev) => [
          {
            id: Date.now(),
            type: 'emergency',
            title: data.emergencyMode ? '🚨 EMERGENCY BLOOD MATCH!' : '🩸 New Match Request',
            desc: `${data.bloodGroup} needed at ${data.hospitalName}`,
            time: 'Just now',
            unread: true,
            rawRequest: data,
            chatPartnerId: data.requesterId || data.requester?._id || data.requester
          },
          ...prev
        ]);
        
        return currentStatus;
      });
    });

    socket.on('chat_notification', (data) => {
      setLogs((prev) => [
        {
          id: Date.now(),
          type: 'chat',
          title: `💬 ${data.senderName || 'New chat message'}`,
          desc: data.message,
          time: 'Just now',
          unread: true,
          chatPartnerId: data.senderId,
          chatId: data.chatId
        },
        ...prev
      ]);
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

    socket.on('request_accepted', (data) => {
      console.log('[WebSocket] Request Accepted Alert Received:', data);
      alert(data.message || `🎉 Good news! Your blood request has been accepted by a volunteer.`);
      fetchMyRequests(); // Reload tickets
    });
    
    return () => {
      socket.off('new_blood_request');
      socket.off('chat_notification');
      socket.off('donation_verified');
      socket.off('request_accepted');
    };
  }, [user, token]);

  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      try {
        const res = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const filtered = (res.data || []).filter(n => {
          if (n.type === 'greeting') {
            const msg = n.message || '';
            if (!msg.startsWith('📢') && !msg.startsWith('🎉')) {
              return false; // Ignore welcome/onboarding greeting wishes
            }
          }
          return true;
        });
        const mapped = filtered.map((n) => ({
          id: n._id,
          type: n.type === 'chat_message' ? 'chat' : n.type === 'greeting' ? 'greeting' : 'emergency',
          title: n.type === 'greeting' ? '👋 Welcome' : n.type === 'chat_message' ? '💬 Chat' : '🩸 Blood Alert',
          desc: n.message,
          time: new Date(n.createdAt).toLocaleString(),
          unread: !n.read,
          chatPartnerId: n.donor?._id || n.donor,
          rawRequest: n.bloodRequest ? { requester: n.donor?._id, requesterId: n.donor?._id } : null,
          chatId: n.chat
        }));
        setLogs(mapped);
      } catch (err) {
        console.error('Failed to load notifications', err);
      }
    };
    
    fetchNotifications();

    // Background polling every 1 second to fetch real-time updates seamlessly in the UI list
    const interval = setInterval(fetchNotifications, 1000);

    return () => clearInterval(interval);
  }, [token]);

  const markAllRead = async () => {
    setLogs((prev) => prev.map((l) => ({ ...l, unread: false })));
    try {
      await axios.put(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Mark all read failed', err);
    }
  };

  const deleteLog = async (id) => {
    setLogs((prev) => prev.filter(l => l.id !== id));
    try {
      await axios.delete(`${API_URL}/api/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Delete notification failed', err);
    }
  };

  const markAsRead = async (id) => {
    const target = logs.find(l => l.id === id);
    if (!target || !target.unread) return;

    setLogs((prev) => prev.map(l => l.id === id ? { ...l, unread: false } : l));
    try {
      await axios.put(`${API_URL}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error('Mark notification as read failed', err);
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
      alert(err.response?.data?.message || 'Failed to start chat session.');
    }
  };

  const handleAvailabilityStatusChange = async (status) => {
    if (handleActionBlock('change availability status')) return;
    try {
      const res = await axios.put(
        `${API_URL}/api/auth/profile`,
        { availabilityStatus: status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAvailabilityStatus(status);
      setAvailability(status === 'Available' || status === 'Emergency Only');
      dispatch(updateProfileSuccess(res.data.user));
    } catch (err) {
      console.error('Availability status update failed', err);
      alert('Failed to update availability status.');
    }
  };

  const toggleAvailability = async () => {
    const nextStatus = availability ? 'Not Available' : 'Available';
    await handleAvailabilityStatusChange(nextStatus);
  };

  const copyReferral = () => {
    const link = `https://onedrop-india.vercel.app/register?ref=${user?.referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              setReqState(matchedState);
              
              let matchedDistrict = '';
              Object.keys(STATES_DATA[matchedState]).forEach(dst => {
                if (fetchedDistrict.toLowerCase().includes(dst.toLowerCase()) || dst.toLowerCase().includes(fetchedDistrict.toLowerCase())) {
                  matchedDistrict = dst;
                }
              });

              if (matchedDistrict) {
                setReqDistrict(matchedDistrict);
                
                let matchedCity = '';
                STATES_DATA[matchedState][matchedDistrict].forEach(cty => {
                  if (fetchedCity.toLowerCase().includes(cty.toLowerCase()) || cty.toLowerCase().includes(fetchedCity.toLowerCase())) {
                    matchedCity = cty;
                  }
                });

                if (matchedCity) {
                  setReqCity(matchedCity);
                } else if (STATES_DATA[matchedState][matchedDistrict].length > 0) {
                  setReqCity(STATES_DATA[matchedState][matchedDistrict][0]);
                }
              } else {
                const firstDst = Object.keys(STATES_DATA[matchedState])[0];
                setReqDistrict(firstDst);
                setReqCity(STATES_DATA[matchedState][firstDst][0]);
              }
            } else {
              setReqState(user?.state || 'Karnataka');
              setReqDistrict(user?.district || 'Bengaluru Urban');
              setReqCity(user?.city || 'Bangalore Mandal');
            }

            if (fetchedPostcode) {
              setReqPincode(fetchedPostcode);
            } else {
              setReqPincode(user?.pincode || '560001');
            }

            setReqHospitalAddress(addr.road || addr.suburb || user?.address || 'City Hospital Road');
            alert(`📍 GPS Coordinates Synced!\nLat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}\nLocation: ${response.data.display_name}`);
          }
        } catch (err) {
          console.error('[GPS Geocoding Error]', err);
          setReqState(user?.state || 'Karnataka');
          setReqDistrict(user?.district || 'Bengaluru Urban');
          setReqCity(user?.city || 'Bangalore Mandal');
          setReqPincode(user?.pincode || '560001');
          setReqHospitalAddress(user?.address || 'St. Johns Medical St.');
          alert(`📍 GPS Synced (Offline Simulation Fallback)!\nLat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`);
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        console.error('[Geolocation Error]', error);
        setReqState(user?.state || 'Karnataka');
        setReqDistrict(user?.district || 'Bengaluru Urban');
        setReqCity(user?.city || 'Bangalore Mandal');
        setReqPincode(user?.pincode || '560001');
        setReqHospitalAddress(user?.address || 'Apollo St.');
        alert(`📍 GPS Signal Intercepted! (Home Coordinates Auto-filled as Mock GPS)`);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };



  const fetchMyRequests = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/requests`);
      const filtered = res.data.filter(r => r.requester?._id === user?._id || r.requester === user?._id);
      setMyRequests(filtered);
    } catch (err) {
      console.error('[Fetch Requests Error]', err);
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
        verified: filterVerified ? 'true' : 'false',
        excludeId: user?._id  // Always exclude self from results
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

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (handleActionBlock('create a blood request')) return;
    try {
      await axios.post(
        `${API_URL}/api/requests`,
        {
          patientName: reqPatientName,
          bloodGroup: reqBloodGroup,
          unitsRequired: parseInt(reqUnitsRequired),
          hospitalName: reqHospitalName,
          neededBy: reqNeededBy,
          emergencyMode: reqEmergencyMode,
          reason: reqReason,
          state: reqState,
          district: reqDistrict,
          city: reqCity,
          pincode: reqPincode,
          hospitalAddress: reqHospitalAddress
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Blood request ticket published successfully. Smart matching alerts sent in real-time!');
      setReqPatientName('');
      setReqUnitsRequired(1);
      setReqHospitalName('');
      setReqNeededBy('');
      setReqEmergencyMode(false);
      setReqReason('');
      fetchMyRequests();
      setRequestsSubTab('browse');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm("Are you sure you want to permanently remove this blood request ticket?")) return;
    try {
      await axios.delete(`${API_URL}/api/requests/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Blood request ticket successfully deleted.");
      fetchMyRequests();
    } catch (err) {
      console.error("[Delete Request Error]", err);
      alert(err.response?.data?.message || "Failed to remove the request ticket.");
    }
  };

  const handleDeclineRequest = (requestId) => {
    if (window.confirm("Are you sure you want to decline/hide this blood request match?")) {
      setDeclinedRequests(prev => [...prev, requestId]);
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
      alert('Thank you for pledging! The request has been successfully accepted and closed.');
      // Refresh pending requests matching donor's state and district
      const res = await axios.get(
        `${API_URL}/api/requests?state=${user?.state || ''}&district=${user?.district || ''}`
      );
      setNearbyRequests(res.data.filter(r => r.status === 'Pending'));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to pledge.');
    }
  };

  const handleAcceptSmartMatch = async (requestId) => {
    if (handleActionBlock('accept emergency smart match')) return;
    try {
      await axios.post(
        `${API_URL}/api/requests/${requestId}/pledge`,
        { unitsPledged: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Thank you for pledging! The emergency request has been successfully accepted.');
      
      const matchedReq = smartMatchAlert;
      setSmartMatchAlert(null); // Dismiss panel
      
      // Refresh requests listing
      const res = await axios.get(`${API_URL}/api/requests?state=${user?.state || ''}&district=${user?.district || ''}`);
      setNearbyRequests(res.data.filter(r => r.status === 'Pending'));
      
      // Optionally trigger direct chat with the requester
      if (matchedReq?.request?.requester) {
        if (confirm('Would you like to initiate a secure chat session with the recipient right now?')) {
          await handleInitiateChat(matchedReq.request.requester);
        }
      } else if (matchedReq?.requester?._id || matchedReq?.requester) {
        const reqId = matchedReq?.requester?._id || matchedReq?.requester;
        if (confirm('Would you like to initiate a secure chat session with the recipient right now?')) {
          await handleInitiateChat(reqId);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to accept the blood request.');
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
          pincode: editPincode,
          bloodGroup: editBloodGroup,
          weight: editWeight ? parseFloat(editWeight) : undefined,
          DOB: editDOB || undefined,
          gender: editGender,
          medicalConditions: editConditions.split(',').map(c => c.trim()).filter(Boolean),
          allergies: editAllergies.split(',').map(a => a.trim()).filter(Boolean)
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

  // State cascade changes
  const handleStateChange = (e) => {
    setEditState(e.target.value);
    setEditDistrict('');
    setEditCity('');
  };

  const handleDistrictChange = (e) => {
    setEditDistrict(e.target.value);
    setEditCity('');
  };

  const handleReqStateChange = (e) => {
    setReqState(e.target.value);
    setReqDistrict('');
    setReqCity('');
  };

  const handleReqDistrictChange = (e) => {
    setReqDistrict(e.target.value);
    setReqCity('');
  };

  const analyticData = user
    ? [{
        name: 'Registered',
        pointXP: userXP,
        referrals: user?.totalReferrals || 0,
        responses: fulfilledPledges
      }]
    : [];

  // Simulated Medical Report submission
  const handleMedicalReportSubmit = (e) => {
    e.preventDefault();
    if (handleActionBlock('submit medical reports')) return;
    if (!medicalReportName) return;
    setIsVerifyingFile(true);
    setTimeout(() => {
      setIsVerifyingFile(false);
      alert('Report uploaded successfully! Medical panels are evaluating your verified lifesaver badge.');
      setMedicalReportName('');
      setDoctorVerificationName('');
    }, 2000);
  };

  // Interactive Health BMI Analyzer
  const calculateBMI = (e) => {
    e.preventDefault();
    if (!bmiHeight || !bmiWeightVal) return;
    const hInMeters = parseFloat(bmiHeight) / 100;
    const computedBMI = (parseFloat(bmiWeightVal) / (hInMeters * hInMeters)).toFixed(1);
    let desc = "Healthy Range";
    if (computedBMI < 18.5) desc = "Underweight";
    else if (computedBMI > 24.9) desc = "Overweight";
    setBmiResult({ bmi: computedBMI, desc });
  };

  // Interactive chatbot responses
  const handleChatbotSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = { sender: 'user', text: chatInput };
    setChatbotMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsBotTyping(true);

    setTimeout(() => {
      let replyText = "Based on standard Indian Red Cross directives, you should wait at least 90 days between blood donation campaigns. Always keep your iron index high and stay hydrated!";
      const query = chatInput.toLowerCase();
      if (query.includes('eligible') || query.includes('can i')) {
        replyText = "To donate blood, you must be 18-65 years old, weigh at least 45kg, and have no active symptoms of infections, cold, or high pressure. Complete your profile diagnostic card to verify eligibility.";
      } else if (query.includes('badge') || query.includes('point') || query.includes('rewards')) {
        replyText = "Make successful regional pledges or refer active coordinates to accumulate ONEDROP points. You can claim golden Appreciation Certificates as you level up!";
      } else if (query.includes('diet') || query.includes('eat') || query.includes('food')) {
        replyText = "Pre-donation: Eat protein-rich foods, high iron snacks (spinach, dates, raisins) and drink 4-5 cups of pure water. Avoid fat-rich dairy assets right before donation.";
      }
      setChatbotMessages(prev => [...prev, { sender: 'bot', text: replyText }]);
      setIsBotTyping(false);
    }, 120000 / 100); // 1.2s delay
  };

  // Simulated community updates
  const handlePostCommunity = (e) => {
    e.preventDefault();
    if (handleActionBlock('post to community feed')) return;
    if (!newCommunityPost.trim()) return;
    const newPost = {
      id: communityStories.length + 1,
      author: user?.fullName || "Lifesaver Hero",
      bloodGroup: user?.bloodGroup || "O+",
      city: user?.city || "Bangalore",
      content: newCommunityPost,
      likes: 0,
      liked: false,
      comments: []
    };
    setCommunityStories([newPost, ...communityStories]);
    setNewCommunityPost("");
    alert('Lifesaver story shared with the national community feeds!');
  };

  const handleLikeStory = (id) => {
    setCommunityStories(prev => prev.map(story => {
      if (story.id === id) {
        return {
          ...story,
          likes: story.liked ? story.likes - 1 : story.likes + 1,
          liked: !story.liked
        };
      }
      return story;
    }));
  };

  const [activeStoryComment, setActiveStoryComment] = useState({});
  const handleAddComment = (storyId, commentText) => {
    if (!commentText.trim()) return;
    setCommunityStories(prev => prev.map(story => {
      if (story.id === storyId) {
        return {
          ...story,
          comments: [...story.comments, { author: user?.fullName || "Lifesaver Member", text: commentText }]
        };
      }
      return story;
    }));
    setActiveStoryComment(prev => ({ ...prev, [storyId]: "" }));
  };

  const filteredBanks = bankState 
    ? (BLOOD_BANKS_DATA[bankState]?.filter(b => !bankDistrict || b.district === bankDistrict) || [])
    : [];

  const visibleRequests = nearbyRequests.filter(r => !declinedRequests.includes(r._id));

  return (
    <div className={`min-h-screen flex ${compact ? 'compact-mode' : ''} ${sosPanicActive ? 'sos-pulse-border' : ''} bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 transition-all duration-300 relative`}>
      
      {/* Dynamic Emergency Alarm Overlay Banner */}
      <AnimatePresence>
        {sosPanicActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="fixed top-16 left-0 right-0 z-50 bg-rose-600 text-white py-2 text-center text-xs font-black tracking-widest uppercase flex items-center justify-center gap-2 shadow-2xl"
          >
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            Active Emergency Matchmaking Mode (SOS Enabled) • Broadcasted to nearby hospitals
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar Navigation Panel */}
      <div className={`fixed inset-y-0 left-0 top-16 z-40 bg-white dark:bg-dark-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col justify-between py-6`}>
        <div className="space-y-6">
          <div className="px-4 flex justify-between items-center">
            {sidebarOpen && <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Main Console</span>}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg"
            >
              <Layout className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <nav className="px-3 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'requests', label: 'Blood Requests', icon: Heart, badge: nearbyRequests.length },
              { id: 'smartMatch', label: 'Smart Match Finder', icon: Sparkles },
              { id: 'donations', label: 'Donations', icon: Calendar },
              { id: 'rewards', label: 'Rewards', icon: Gift },
              { id: 'referrals', label: 'Referrals', icon: Share2 },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'community', label: 'Community', icon: Users },
              { id: 'campaigns', label: 'Campaigns', icon: BookOpen },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: logs.filter(l => l.unread).length },
              { id: 'bloodbanks', label: 'Blood Banks', icon: Compass },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? `${uiTheme.bg} text-white shadow-lg ${uiTheme.glow}` 
                      : 'hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <IconComp className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span>{item.label}</span>}
                  </div>
                  {sidebarOpen && item.badge > 0 && (
                    <span className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${isActive ? 'bg-white text-slate-900' : 'bg-red-500 text-white'}`}>
                      {item.badge}
                    </span>
                  )}
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
              <p className="text-[10px] text-slate-400 font-bold uppercase">{rankObj.rank}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Container Layout */}
      <div className={`flex-grow md:pl-20 ${sidebarOpen ? 'md:pl-64' : 'md:pl-20'} pb-24 md:pb-10 pt-10`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          {/* Mobile Tab Scroll Selector (Slide Bar) */}
          <div className="md:hidden flex overflow-x-auto whitespace-nowrap scrollbar-none gap-2 pb-2 pt-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Activity },
              { id: 'requests', label: 'Blood Requests', icon: Heart },
              { id: 'smartMatch', label: 'Smart Match Finder', icon: Sparkles },
              { id: 'donations', label: 'Donations', icon: Calendar },
              { id: 'rewards', label: 'Rewards', icon: Gift },
              { id: 'referrals', label: 'Referrals', icon: Share2 },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'community', label: 'Community', icon: Users },
              { id: 'campaigns', label: 'Campaigns', icon: BookOpen },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'bloodbanks', label: 'Blood Banks', icon: Compass },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                    isActive 
                      ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
                      : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <IconComp className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Glassmorphic Email Verification Banner */}
          {isUnverified && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 backdrop-blur-lg border border-amber-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl animate-pulse">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-black text-sm uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Email Verification Required
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-semibold leading-relaxed">
                    Your account is currently running in a limited status because your email address <span className="font-extrabold text-slate-800 dark:text-white">({user?.email})</span> is unverified. Please check your inbox for the verification link **or** enter the 6-digit verification code below.
                  </p>
                  
                  <form onSubmit={handleVerifyEmailOTP} className="flex items-center gap-2 mt-3 bg-white/20 dark:bg-dark-950/20 p-1.5 rounded-xl border border-amber-500/20 max-w-xs">
                    <input
                      type="text"
                      maxLength="6"
                      required
                      placeholder="Enter 6-Digit OTP"
                      value={emailOtpVal}
                      onChange={(e) => setEmailOtpVal(e.target.value.replace(/[^0-9]/g, ''))}
                      className="px-3 py-1.5 w-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-extrabold outline-none text-center tracking-widest font-mono text-slate-800 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={verifyingEmailOtp || !emailOtpVal}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] rounded-lg shadow-sm transition-all uppercase whitespace-nowrap"
                    >
                      {verifyingEmailOtp ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </form>

                  {verificationFeedback && (
                    <p className={`text-xs font-bold mt-2.5 ${verificationFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
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

          {/* Dynamic Customized Header Greeting */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-dark-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/5 rounded-full blur-3xl -z-10"></div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <span>ONEDROP Enterprise Hub</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </p>
              <h1 className="text-2xl md:text-3xl font-black mt-1">
                {getTimeBasedGreeting(lang)}, {user?.fullName?.split(' ')[0]} ❤️
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Fulfilled pledges: <span className="font-extrabold text-emerald-500">{fulfilledPledges}</span> • Pending regional requests: <span className="font-extrabold text-primary-500">{nearbyRequests.length}</span>
              </p>
            </div>

            {/* Quick Actions Dropdowns */}
            <div className="flex items-center flex-wrap gap-3">
              {/* Donation Availability Status Dropdown Selector */}
              <div className="relative inline-block">
                <select
                  value={availabilityStatus}
                  onChange={(e) => handleAvailabilityStatusChange(e.target.value)}
                  className={`pl-8 pr-8 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all appearance-none cursor-pointer bg-white dark:bg-dark-800 shadow-md ${
                    availabilityStatus === 'Available' ? 'text-emerald-600 border-emerald-500/30 focus:ring-emerald-500 dark:text-emerald-400' :
                    availabilityStatus === 'Busy' ? 'text-amber-600 border-amber-500/30 focus:ring-amber-500 dark:text-amber-400' :
                    availabilityStatus === 'Emergency Only' ? 'text-purple-600 border-purple-500/30 focus:ring-purple-500 dark:text-purple-400' :
                    'text-rose-600 border-rose-500/30 focus:ring-rose-500 dark:text-rose-400'
                  }`}
                  style={{ 
                    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`, 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'right 10px center', 
                    backgroundSize: '14px' 
                  }}
                >
                  <option value="Available" className="text-emerald-600 font-bold dark:bg-dark-900">🟢 Available</option>
                  <option value="Busy" className="text-amber-600 font-bold dark:bg-dark-900">🟡 Busy</option>
                  <option value="Not Available" className="text-rose-600 font-bold dark:bg-dark-900">🔴 Not Available</option>
                  <option value="Emergency Only" className="text-purple-600 font-bold dark:bg-dark-900">🟣 Emergency Only</option>
                </select>
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-2.5 w-2.5">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    availabilityStatus === 'Available' ? 'bg-emerald-400' :
                    availabilityStatus === 'Busy' ? 'bg-amber-400' :
                    availabilityStatus === 'Emergency Only' ? 'bg-purple-400' :
                    'bg-rose-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    availabilityStatus === 'Available' ? 'bg-emerald-500' :
                    availabilityStatus === 'Busy' ? 'bg-amber-500' :
                    availabilityStatus === 'Emergency Only' ? 'bg-purple-500' :
                    'bg-rose-500'
                  }`}></span>
                </span>
              </div>
              <button 
                onClick={() => {
                  if (handleActionBlock('toggle SOS mode')) return;
                  setSosPanicActive(!sosPanicActive);
                }} 
                className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5 ${
                  sosPanicActive 
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse' 
                    : 'bg-slate-900 hover:bg-black text-white'
                }`}
              >
                <ShieldAlert className="w-4 h-4" /> SOS MODE
              </button>
              <button 
                onClick={() => setShowEditModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 transition-all"
              >
                {LOCALIZATION[lang].editProfile}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >

              {/* TAB 1: DASHBOARD MAIN SCREEN */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  
                  {/* Grid system statistics */}
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { title: 'Lifesaver Score', val: `${userXP} XP`, desc: `Rank: ${rankObj.rank}`, icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                      { title: 'Donations completed', val: user?.rewardPoints > 200 ? '3 sessions' : '1 session', desc: 'Next eligible in 42 days', icon: Heart, color: 'text-primary-500', bg: 'bg-primary-500/10' },
                      { title: 'Referral Signups', val: `${user?.totalReferrals || 4} signups`, desc: `Points gained: ${(user?.totalReferrals || 4) * 100} XP`, icon: Share2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                      { title: 'Response Efficiency', val: '98%', desc: 'Top 5% responder status', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
                    ].map((card, idx) => {
                      const CardIcon = card.icon;
                      return (
                        <div key={idx} className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg relative overflow-hidden flex items-start justify-between">
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{card.title}</span>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">{card.val}</h2>
                            <p className="text-xs text-slate-500 font-semibold">{card.desc}</p>
                          </div>
                          <div className={`p-3 rounded-2xl ${card.bg} ${card.color}`}>
                            <CardIcon className="w-6 h-6" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Heatmap & Availability columns */}
                  <div className="grid lg:grid-cols-3 gap-8">
                    
                    {/* Left detailed diagnostic information */}
                    <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Activity className={uiTheme.text} /> Lifesaver Contribution Heatmap
                        </h3>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded font-black">Online Activity Tracker</span>
                      </div>
                      
                      <p className="text-xs text-slate-400">
                        GitHub contribution grid mapping your regional pledges, invite campaigns, community feedback, and health log milestones:
                      </p>

                      <div className="grid grid-cols-12 gap-1.5 p-2 bg-slate-50 dark:bg-dark-950 rounded-2xl">
                        {Array.from({ length: 84 }).map((_, i) => {
                          const level = i % 13 === 0 ? 4 : i % 7 === 0 ? 3 : i % 5 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
                          return (
                            <div 
                              key={i} 
                              className={`h-4 rounded-sm transition-all duration-300 hover:scale-125 cursor-pointer heatmap-cell-0 heatmap-level-${level}`}
                              title={`Day ${i + 1}: ${level * 2} contributions`}
                            />
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-1">
                        <span>Less than usual</span>
                        <div className="flex gap-1 items-center">
                          <span>Less</span>
                          <div className="w-2.5 h-2.5 rounded-sm heatmap-cell-0"></div>
                          <div className="w-2.5 h-2.5 rounded-sm heatmap-level-1"></div>
                          <div className="w-2.5 h-2.5 rounded-sm heatmap-level-2"></div>
                          <div className="w-2.5 h-2.5 rounded-sm heatmap-level-3"></div>
                          <div className="w-2.5 h-2.5 rounded-sm heatmap-level-4"></div>
                          <span>More</span>
                        </div>
                      </div>
                    </div>

                    {/* Right column: Availability status & Rewards details */}
                    <div className="space-y-6">
                      {/* Active Status Card */}
                      <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-4">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
                          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Active Coordinates</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            availabilityStatus === 'Available' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>{availabilityStatus}</span>
                        </div>
                        
                        <div className="space-y-3 text-xs text-slate-500 font-bold font-sans">
                          <div className="flex justify-between items-center">
                            <span>Donor Match Scope:</span>
                            <span className="text-slate-800 dark:text-white font-extrabold">State-Wide</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Assigned Area:</span>
                            <span className="text-slate-800 dark:text-white font-extrabold">{user?.city || 'Bangalore'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Live Matches:</span>
                            <span className="text-emerald-500 font-extrabold">{visibleRequests.length} matching tickets</span>
                          </div>
                        </div>
                      </div>

                      {/* Rewards Progress Card */}
                      <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-4">
                        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                          <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest">Rank Progression</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-455 font-bold">ONEDROP Level {Math.floor(userXP / 500) + 1}</span>
                            <span className="font-extrabold text-primary-500">{userXP % 500} / 500 XP</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 dark:bg-dark-800 rounded-full h-2 relative overflow-hidden">
                            <div className={`h-full ${uiTheme.bg} rounded-full transition-all duration-500`} style={{ width: `${(userXP % 500) / 5}%` }}></div>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 font-medium italic mt-2">
                            Pledge to 2 more emergency requests to unlock the next level and obtain premium Appreciation Badges!
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Rewards wallet & dynamic PWA install alert block */}
                  <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl flex flex-col sm:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl"></div>
                    <div className="space-y-1 text-center sm:text-left">
                      <span className={`px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full tracking-widest ${isPwaInstalled ? 'bg-emerald-500 text-white' : 'bg-primary-500'}`}>
                        {isPwaInstalled ? '✓ App Installed' : 'Install App'}
                      </span>
                      <h4 className="font-extrabold text-sm mt-1 font-sans">
                        {isPwaInstalled ? 'ONEDROP Desktop & Mobile App' : 'Access ONEDROP Offline Anytime'}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                        {isPwaInstalled 
                          ? 'Running in standalone native application mode. Live database proximity logs and real-time push alerts are fully active.'
                          : 'Save shortcuts on your screen for seamless offline hospital match notifications without internet bandwidth.'
                        }
                      </p>
                    </div>
                    {isPwaInstalled ? (
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-black text-xs rounded-xl flex-shrink-0">
                        <Check className="w-4 h-4 text-emerald-400" /> Offline Ready
                      </div>
                    ) : (
                      <button 
                        onClick={handleInstallPWA} 
                        className="px-5 py-2.5 bg-white text-slate-900 font-extrabold text-xs rounded-xl hover:shadow-lg transition-all flex-shrink-0"
                      >
                        Install PWA App
                      </button>
                    )}
                  </div>

                </div>
              )}

              {activeTab === 'requests' && (
                <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 flex-wrap gap-2 mb-2">
                    <div>
                      <h3 className="font-extrabold text-lg flex items-center gap-2">
                        <Heart className="text-primary-500 animate-pulse" /> National Blood Requests
                      </h3>
                      <p className="text-xs text-slate-400">Browse all active blood requests across India. Accept to donate and help save a life.</p>
                    </div>
                    <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                      {visibleRequests.filter(r => r.requester?._id !== user?._id && r.requester !== user?._id).length} Requests Active
                    </span>
                  </div>

                  {/* Sub-Tabs Toggler */}
                  <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <button
                      onClick={() => setRequestsSubTab('browse')}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                        requestsSubTab === 'browse'
                          ? `${uiTheme.bg} text-white shadow-md`
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-350'
                      }`}
                    >
                      Browse Requests (Donate)
                    </button>
                    <button
                      onClick={() => {
                        setRequestsSubTab('create');
                        fetchMyRequests();
                      }}
                      className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
                        requestsSubTab === 'create'
                          ? `${uiTheme.bg} text-white shadow-md`
                          : 'bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-600 dark:text-slate-350'
                      }`}
                    >
                      Create Request Form & My Tickets
                    </button>
                  </div>

                  {requestsSubTab === 'browse' ? (
                    <div className="space-y-5">
                      {/* Filter Bar */}
                      <div className="flex flex-wrap gap-3 items-center p-4 bg-slate-50 dark:bg-dark-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Filter:</span>
                        <select
                          value={browseBloodGroup}
                          onChange={(e) => setBrowseBloodGroup(e.target.value)}
                          className="px-3 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                        >
                          <option value="">All Blood Groups</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <select
                          value={browseState}
                          onChange={(e) => setBrowseState(e.target.value)}
                          className="px-3 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
                        >
                          <option value="">All States</option>
                          {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={browseEmergencyOnly}
                            onChange={(e) => setBrowseEmergencyOnly(e.target.checked)}
                            className="w-4 h-4 rounded"
                          />
                          🚨 Emergency Only
                        </label>
                        <span className="ml-auto text-xs font-extrabold text-primary-500">
                          {visibleRequests.filter(r =>
                            (!browseBloodGroup || r.bloodGroup === browseBloodGroup) &&
                            (!browseState || r.state === browseState) &&
                            (!browseEmergencyOnly || r.emergencyMode)
                          ).length} requests found
                        </span>
                      </div>

                      {/* Request Cards */}
                      {visibleRequests.filter(r =>
                        (!browseBloodGroup || r.bloodGroup === browseBloodGroup) &&
                        (!browseState || r.state === browseState) &&
                        (!browseEmergencyOnly || r.emergencyMode) &&
                        r.requester?._id !== user?._id && r.requester !== user?._id
                      ).length > 0 ? (
                        visibleRequests.filter(r =>
                          (!browseBloodGroup || r.bloodGroup === browseBloodGroup) &&
                          (!browseState || r.state === browseState) &&
                          (!browseEmergencyOnly || r.emergencyMode) &&
                          r.requester?._id !== user?._id && r.requester !== user?._id
                        ).map((req) => (
                          <div key={req._id} className={`p-5 border rounded-2xl flex flex-col gap-4 shadow-sm hover:shadow-md transition-all ${
                            req.emergencyMode
                              ? 'bg-rose-50 dark:bg-rose-950/10 border-rose-300 dark:border-rose-800/50'
                              : 'bg-slate-50 dark:bg-dark-80/40 border-slate-200/50 dark:border-slate-800'
                          }`}>
                            {/* Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="px-2.5 py-1 text-[11px] font-black bg-primary-600 text-white rounded-lg">
                                    🩸 {req.bloodGroup} Needed
                                  </span>
                                  {req.emergencyMode && (
                                    <span className="px-2.5 py-1 text-[11px] font-black bg-rose-600 text-white rounded-lg flex items-center gap-1 animate-pulse">
                                      🚨 EMERGENCY
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500 font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                                    📍 {req.city || req.district || req.state || 'India'}{req.state ? `, ${req.state}` : ''}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-base text-slate-800 dark:text-white">{req.patientName}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    🏥 {req.hospitalName}
                                    {req.hospitalAddress && <span> — {req.hospitalAddress}</span>}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-0.5">
                                    Units: <span className="font-extrabold text-primary-500">{req.unitsRequired || 1}</span>
                                    {' '}• Needed by: <span className="font-bold">{new Date(req.neededBy).toLocaleDateString()}</span>
                                    {req.reason && <span> • {req.reason}</span>}
                                  </p>
                                </div>
                              </div>

                              {/* Requester Info */}
                              {req.requester && (
                                <div className="flex-shrink-0 p-3 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1 min-w-[150px]">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Posted By</p>
                                  <p className="font-extrabold text-slate-800 dark:text-white">{req.requester.fullName}</p>
                                  <p className="text-slate-400">📞 {req.requester.phone || 'N/A'}</p>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                              {req.requester && req.requester._id && req.requester._id !== user?._id && (
                                <button
                                  onClick={() => handleInitiateChat(req.requester._id)}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 rounded-xl hover:bg-indigo-100 transition-all"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                                </button>
                              )}
                              {req.requester?.phone && (
                                <a
                                  href={`tel:${req.requester.phone}`}
                                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl hover:bg-emerald-100 transition-all"
                                >
                                  <Phone className="w-3.5 h-3.5" /> Call
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeclineRequest(req._id)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/30 rounded-xl transition"
                              >
                                ✕ Decline
                              </button>
                              <button
                                onClick={() => handlePledge(req._id)}
                                className={`flex items-center gap-1.5 px-5 py-2 text-xs font-black text-white ${uiTheme.bg} ${uiTheme.hover} rounded-xl transition-all shadow-md flex-grow sm:flex-grow-0`}
                              >
                                ✅ Accept & Donate
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 space-y-3 text-slate-400">
                          <Heart className="w-14 h-14 mx-auto text-slate-300" />
                          <p className="text-sm font-bold text-slate-500">No blood requests match your filters.</p>
                          <p className="text-xs">Try clearing filters to see all national requests, or check back later.</p>
                          <button
                            onClick={() => {
                              setBrowseBloodGroup('');
                              setBrowseState('');
                              setBrowseEmergencyOnly(false);
                              setDeclinedRequests([]);
                              localStorage.removeItem('declinedRequests');
                            }}
                            className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl"
                          >
                            Clear Filters
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-8">
                      {/* Create Request Form */}
                      <div className="p-6 bg-slate-50 dark:bg-dark-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                        <h4 className="font-extrabold text-xs text-primary-500 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                          <Plus className="w-4 h-4" /> Create Blood Request
                        </h4>
                        <form onSubmit={handleCreateRequest} className="space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Patient Name</label>
                            <input
                              type="text"
                              required
                              value={reqPatientName}
                              onChange={(e) => setReqPatientName(e.target.value)}
                              className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                              placeholder="Patient's Full Name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Blood Group</label>
                              <select
                                value={reqBloodGroup}
                                onChange={(e) => setReqBloodGroup(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-primary-500 font-extrabold"
                              >
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Units Required</label>
                              <input
                                type="number"
                                min="1"
                                required
                                value={reqUnitsRequired}
                                onChange={(e) => setReqUnitsRequired(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Hospital Name</label>
                              <input
                                type="text"
                                required
                                value={reqHospitalName}
                                onChange={(e) => setReqHospitalName(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                                placeholder="e.g. Apollo Hospital"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Needed By Date</label>
                              <input
                                type="date"
                                required
                                value={reqNeededBy}
                                onChange={(e) => setReqNeededBy(e.target.value)}
                                className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                              />
                            </div>
                          </div>

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
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">State</label>
                              <select
                                required
                                value={reqState}
                                onChange={handleReqStateChange}
                                className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none"
                              >
                                <option value="">Select State</option>
                                {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">District</label>
                              <select
                                required
                                disabled={!reqState}
                                value={reqDistrict}
                                onChange={handleReqDistrictChange}
                                className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none disabled:opacity-55"
                              >
                                <option value="">Select District</option>
                                {Object.keys(STATES_DATA[reqState] || {}).map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-1">City</label>
                              <select
                                required
                                disabled={!reqDistrict}
                                value={reqCity}
                                onChange={(e) => setReqCity(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] outline-none disabled:opacity-55"
                              >
                                <option value="">Select City</option>
                                {(STATES_DATA[reqState]?.[reqDistrict] || []).map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Hospital Address</label>
                              <input
                                type="text"
                                value={reqHospitalAddress}
                                onChange={(e) => setReqHospitalAddress(e.target.value)}
                                placeholder="Building, street address"
                                className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 mb-1">Pincode</label>
                              <input
                                type="text"
                                required
                                value={reqPincode}
                                onChange={(e) => setReqPincode(e.target.value)}
                                placeholder="Pincode"
                                className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Reason for Request</label>
                            <textarea
                              value={reqReason}
                              onChange={(e) => setReqReason(e.target.value)}
                              className="w-full p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                              rows="2"
                              placeholder="Describe patient condition briefly (optional)"
                            ></textarea>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="reqEmergencyMode"
                              checked={reqEmergencyMode}
                              onChange={(e) => setReqEmergencyMode(e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
                            />
                            <label htmlFor="reqEmergencyMode" className="text-xs font-extrabold text-rose-600 dark:text-rose-400 cursor-pointer flex items-center gap-1">
                              🚨 Emergency Priority Mode (Sends immediate alerts)
                            </label>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
                          >
                            Submit Blood Request
                          </button>
                        </form>
                      </div>

                      {/* Active Tickets Registry */}
                      <div className="p-6 bg-slate-50 dark:bg-dark-800/40 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
                        <h4 className="font-extrabold text-xs text-primary-500 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                          <FileText className="w-4 h-4" /> My Published Tickets
                        </h4>
                        <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2">
                          {myRequests.length > 0 ? (
                            myRequests.map((req) => (
                              <div key={req._id} className="p-4 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 rounded">
                                      {req.bloodGroup} Required
                                    </span>
                                    <h5 className="font-bold text-xs text-slate-800 dark:text-white mt-1.5">{req.patientName}</h5>
                                    <p className="text-[10px] text-slate-400">{req.hospitalName} • Units: {req.unitsRequired}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${
                                      req.status === 'Fulfilled' ? 'bg-emerald-500/10 text-emerald-600' :
                                      req.status === 'Pending' ? 'bg-amber-500/10 text-amber-600' :
                                      'bg-slate-350 text-slate-600'
                                    }`}>
                                      {req.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRequest(req._id)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition"
                                      title="Remove Request Ticket"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Pledgers list inside ticket */}
                                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Volunteer Pledges</p>
                                  {req.donorsPledged?.length > 0 ? (
                                    req.donorsPledged.map((p) => (
                                      <div key={p._id} className="p-2.5 bg-slate-50 dark:bg-dark-850 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                        <div className="text-[11px]">
                                          <p className="font-bold text-slate-800 dark:text-white">{p.donor?.fullName || 'Anonymous Volunteer'}</p>
                                          <p className="text-slate-450 text-[10px]">Blood: {p.donor?.bloodGroup} | Status: <span className="font-black text-primary-500">{p.status}</span></p>
                                        </div>
                                        {p.status === 'Pledged' && (
                                          <div className="flex gap-1.5 w-full md:w-auto">
                                            <button
                                              onClick={() => handlePledgeOutcome(req._id, p._id, 'Donated')}
                                              className="px-2.5 py-1 text-[10px] font-black text-white bg-emerald-600 rounded-lg shadow-sm"
                                            >
                                              Mark Donated
                                            </button>
                                            <button
                                              onClick={() => handlePledgeOutcome(req._id, p._id, 'Cancelled')}
                                              className="px-2.5 py-1 text-[10px] font-black text-white bg-rose-600 rounded-lg shadow-sm"
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-[10px] text-slate-500 italic">Waiting for volunteer pledges...</p>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-12 text-slate-400 space-y-2">
                              <Activity className="w-10 h-10 mx-auto animate-pulse" />
                              <p className="text-xs">You have not published any blood request tickets yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 11: SMART MATCH FINDER */}
              {activeTab === 'smartMatch' && (
                <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="font-black text-lg flex items-center gap-2">
                      <Sparkles className="text-primary-500 animate-pulse" /> Intelligent Smart Match Finder
                    </h3>
                    <p className="text-xs text-slate-450">Type in blood group and location keywords. Matches Indian regional hierarchies automatically using regex and smart coordinates mapping.</p>
                  </div>

                  <div className="max-w-2xl">
                    <SmartSearchInput 
                      onFilterUpdate={(filters) => {
                        // Only update if the parsed value is valid; don't default to 'O+'
                        setFilterBloodGroup(filters.bloodGroup || '');
                        setFilterState(filters.state || '');
                        setFilterDistrict(filters.district || '');
                        setFilterCity(filters.city || '');
                      }} 
                      placeholder="Type e.g. AB- Kadapa, O+ Bangalore, or leave blank to see all..."
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

                  {/* Donor Search Grid */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searching ? (
                      <div className="col-span-full text-center py-12 space-y-2 text-slate-400">
                        <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary-500" />
                        <p className="text-sm font-semibold">Running real-time database queries & AI matching...</p>
                      </div>
                    ) : eligibleDonors.length > 0 ? (
                      eligibleDonors.map((donor) => (
                        <div key={donor._id} className="p-5 bg-slate-50 dark:bg-dark-80/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl hover:shadow-lg transition-all space-y-4 relative overflow-hidden">
                          {donor.isVerifiedDonor && (
                            <span className="absolute top-3 right-3 px-2 py-0.5 bg-amber-500/10 text-amber-600 text-[8px] font-black uppercase tracking-wider rounded-lg border border-amber-500/20">
                              ⭐ Verified
                            </span>
                          )}
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center font-black text-xs border border-primary-500/20">
                              {donor.bloodGroup}
                            </div>
                            <div className="text-xs truncate max-w-[70%]">
                              <h5 className="font-extrabold text-slate-800 dark:text-white truncate">{donor.fullName}</h5>
                              <p className="text-slate-450 truncate">{donor.city}, {donor.state}</p>
                            </div>
                          </div>

                          <div className="space-y-1.5 text-[11px] text-slate-500">
                            <p className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Match Score: <span className="font-black text-primary-500">{donor.matchScore || 100} Score</span></span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-slate-400" />
                              <span>Response Efficiency: <span className="font-extrabold text-emerald-500">{donor.responseRate || '98%'}</span></span>
                            </p>
                            <p className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                              <span>Status: <span className="font-extrabold text-slate-650 dark:text-slate-200">{donor.availabilityStatus}</span></span>
                            </p>
                          </div>

                          {donor._id !== user?._id && (
                            <button
                              type="button"
                              onClick={() => handleInitiateChat(donor._id)}
                              className="w-full py-2 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 rounded-xl font-bold text-xs hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-all flex items-center justify-center gap-1.5"
                            >
                              <MessageSquare className="w-4 h-4" /> Secure Chat Now
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12 text-slate-400 space-y-3">
                        <Sparkles className="w-12 h-12 mx-auto text-slate-300" />
                        <p className="text-sm font-bold text-slate-500">No donors match the current filters.</p>
                        <p className="text-xs">Try typing a blood group or city above, or use the availability filter.</p>
                        <p className="text-[10px] text-slate-400">Example: <span className="font-bold">"O+ Hyderabad"</span> or <span className="font-bold">"AB- Mumbai"</span></p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* TAB 3: DONATIONS & HEALTH VERIFICATION */}
              {activeTab === 'donations' && (
                <div className="grid lg:grid-cols-2 gap-8">
                  
                  {/* Cooldown tracker details and tips */}
                  <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500 border-b pb-2">
                      Donations Log & Cooldown details
                    </h3>
                    <div className="space-y-4 text-xs text-slate-500">
                      <div className="p-4 bg-slate-50 dark:bg-dark-800/50 rounded-2xl border border-slate-100 dark:border-slate-850 flex items-center gap-4">
                        <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-slate-700 dark:text-slate-200">Last Pledged Donation</p>
                          <p className="text-[11px] text-slate-400">Completed 48 days ago in Bangalore Urban</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="font-bold text-slate-600 dark:text-slate-300">Important Health Recommendations:</p>
                        <ul className="list-disc pl-4 space-y-1.5">
                          <li>Pre-Donation diet: Increase red meat, fish, spinach, and kidney bean intake.</li>
                          <li>Sleep: Guarantee 7-8 hours of sound sleep the night prior.</li>
                          <li>Hydration: Drink up to 10 full cups of water to prevent blood pressure changes.</li>
                        </ul>
                      </div>
                    </div>

                    {/* Interactive Health BMI Analyser */}
                    <form onSubmit={calculateBMI} className="p-4 bg-slate-50 dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <h4 className="font-bold text-xs flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary-500" /> {LOCALIZATION[lang].bmiTitle}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          type="number" 
                          placeholder="Height (cm)" 
                          required 
                          value={bmiHeight} 
                          onChange={(e) => setBmiHeight(e.target.value)}
                          className="p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-750 text-xs rounded-lg"
                        />
                        <input 
                          type="number" 
                          placeholder="Weight (kg)" 
                          required 
                          value={bmiWeightVal} 
                          onChange={(e) => setBmiWeightVal(e.target.value)}
                          className="p-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-750 text-xs rounded-lg"
                        />
                      </div>
                      <button type="submit" className={`w-full py-2 ${uiTheme.bg} hover:shadow-lg text-white font-extrabold text-xs rounded-lg transition-all`}>
                        Analyze BMI
                      </button>
                      {bmiResult && (
                        <div className="p-3 bg-white dark:bg-dark-900 text-xs text-center rounded-lg border border-slate-200 dark:border-slate-800">
                          Your BMI: <span className="font-black text-primary-500">{bmiResult.bmi}</span> ({bmiResult.desc})
                        </div>
                      )}
                    </form>
                  </div>

                  {/* Medical Upload verification */}
                  <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500 border-b pb-2 flex items-center gap-2">
                      <ShieldAlert className="text-emerald-500" /> Medical Verification System
                    </h3>
                    <p className="text-xs text-slate-400">
                      Upload verified hospital reports to claim your digital verified badge and access emergency SOS broadcasts.
                    </p>

                    <form onSubmit={handleMedicalReportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Doctor Verification ID / Name</label>
                        <input 
                          type="text"
                          placeholder="Dr. Rajesh G (Bangalore)"
                          required
                          value={doctorVerificationName}
                          onChange={(e) => setDoctorVerificationName(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Upload Report Document</label>
                        <input 
                          type="file"
                          required
                          onChange={(e) => setMedicalReportName(e.target.files[0]?.name || 'VerifiedReport.pdf')}
                          className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 text-xs rounded-xl file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-slate-200 dark:file:bg-dark-700"
                        />
                      </div>

                      <button 
                        type="submit" 
                        disabled={isVerifyingFile}
                        className={`w-full py-3 ${uiTheme.bg} ${uiTheme.hover} text-white font-extrabold text-xs rounded-xl transition-all shadow-md disabled:opacity-50`}
                      >
                        {isVerifyingFile ? 'Evaluating Documents...' : 'Submit Verification Request'}
                      </button>
                    </form>
                  </div>
                </div>
              )}


              {/* TAB 4: REWARDS & WALLET */}
              {activeTab === 'rewards' && (
                <div className="space-y-8">
                  
                  {/* points overview */}
                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl"></div>
                    <div className="space-y-2 text-center md:text-left">
                      <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-slate-900 rounded-full">Reward Wallet</span>
                      <h2 className="text-3xl font-black text-white">{user?.rewardPoints || 0} Pts</h2>
                      <p className="text-xs text-slate-400 font-bold uppercase">Estimated XP Level Progress: Level {rankObj.level} ({rankObj.rank})</p>
                    </div>

                    {/* XP levels bar slider */}
                    <div className="w-full md:w-80 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-extrabold text-slate-300">
                        <span>XP: {userXP}</span>
                        <span>Level Limit: {rankObj.limit}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full transition-all duration-700" 
                          style={{ width: `${Math.min(100, (userXP / rankObj.limit) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Redeem rewards coupons list */}
                  <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500 border-b pb-2 flex items-center gap-2">
                      <Gift className="text-amber-500" /> Active Redeemable Vouchers
                    </h3>
                    
                    <p className="text-sm text-slate-500 font-semibold py-6 text-center">
                      Reward vouchers will appear here when partners are registered. Your balance: {user?.rewardPoints || 0} points.
                    </p>
                  </div>
                </div>
              )}


              {/* TAB 5: REFERRALS CENTER */}
              {activeTab === 'referrals' && (
                <div className="grid lg:grid-cols-3 gap-8">
                  
                  {/* Code generator and shares widget */}
                  <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500 border-b pb-2">
                      Your Personal Referral System
                    </h3>
                    <p className="text-xs text-slate-400">
                      Multiply your lifesaver network impact! Invite your friends and colleagues. Get +100 points instantly when they register.
                    </p>

                    <div className="p-4 bg-slate-50 dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-slate-400">Referral Code</span>
                        <p className="font-mono font-black text-sm text-slate-700 dark:text-slate-100">{user?.referralCode || 'ONEDROP-HERO'}</p>
                      </div>
                      <button 
                        onClick={copyReferral}
                        className={`px-4 py-2 ${uiTheme.bg} ${uiTheme.hover} text-white text-xs font-extrabold rounded-xl transition-all shadow-md flex items-center gap-1`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    {/* Social share widget grids */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500">Quick Share Networks:</p>
                      <div className="flex gap-2">
                        {[
                          { label: 'WhatsApp', bg: 'bg-emerald-500 text-white', link: `https://api.whatsapp.com/send?text=Join+our+blood+donor+ecosystem+and+register+at+ONEDROP+using+my+referral+link:+https://onedrop-india.vercel.app/register?ref=${user?.referralCode}` },
                          { label: 'Telegram', bg: 'bg-sky-500 text-white', link: `https://t.me/share/url?url=https://onedrop-india.vercel.app/register?ref=${user?.referralCode}&text=Join+our+blood+donor+ecosystem` },
                          { label: 'Twitter', bg: 'bg-slate-900 text-white', link: `https://twitter.com/intent/tweet?url=https://onedrop-india.vercel.app/register?ref=${user?.referralCode}` }
                        ].map((net, idx) => (
                          <a 
                            key={idx} 
                            href={net.link} 
                            target="_blank" 
                            rel="noreferrer"
                            className={`px-4 py-2 text-xs font-extrabold rounded-xl ${net.bg} shadow-sm hover:shadow-md transition-all`}
                          >
                            {net.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Leaderboards card representation */}
                  <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500 border-b pb-2 flex items-center gap-2">
                      <Award className="text-yellow-500 animate-bounce" /> Regional Leaderboard
                    </h3>

                    <div className="space-y-4">
                      {leaderboard.length > 0 ? leaderboard.map((lead, idx) => (
                        <div key={lead._id || idx} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-850 pb-2">
                          <div className="flex items-center gap-3">
                            <span className={`font-black text-sm w-4 ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-amber-600' : 'text-slate-500'}`}>{idx + 1}</span>
                            <span className={`font-bold text-slate-700 dark:text-slate-200 ${lead._id === user?._id ? 'text-primary-500' : ''}`}>{lead.fullName}</span>
                          </div>
                          <span className="font-black text-slate-650 dark:text-slate-400">{lead.rewardPoints} pts</span>
                        </div>
                      )) : (
                        <p className="text-xs text-slate-500 text-center py-4">No registered donors on the leaderboard yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}


              {/* TAB 6: ANALYTICS CONSOLE */}
              {activeTab === 'analytics' && (
                <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-8">
                  <div className="border-b pb-4">
                    <h3 className="font-extrabold text-lg flex items-center gap-2">
                      <TrendingUp className={uiTheme.text} /> Real-time Donation Analytics Console
                    </h3>
                    <p className="text-xs text-slate-400">Automated tracking of your points and regional response logs.</p>
                  </div>

                  {/* Recharts lines visual chart */}
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticData}>
                        <defs>
                          <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="hidden dark:block" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip />
                        <Area type="monotone" dataKey="pointXP" stroke="#ef4444" fillOpacity={1} fill="url(#colorPoints)" strokeWidth={3} name="Total XP Score" />
                        <Area type="monotone" dataKey="referrals" stroke="#6366f1" fill="none" strokeWidth={2} name="Invited Friends" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-850">
                    <div className="p-4 bg-slate-50 dark:bg-dark-800/40 rounded-2xl text-center">
                      <h4 className="text-2xl font-black text-primary-500">{userXP} XP</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Aggregated Score</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-dark-800/40 rounded-2xl text-center">
                      <h4 className="text-2xl font-black text-indigo-500">{user?.totalReferrals || 0} signups</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Referrals Secured</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-dark-800/40 rounded-2xl text-center">
                      <h4 className="text-2xl font-black text-emerald-500">{fulfilledPledges}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Fulfilled Pledges</p>
                    </div>
                  </div>
                </div>
              )}


              {/* TAB 7: COMMUNITY SECTION */}
              {activeTab === 'community' && (
                <div className="space-y-8">
                  
                  {/* Share story inputs */}
                  <form onSubmit={handlePostCommunity} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
                    <h3 className="font-extrabold text-sm uppercase tracking-widest text-slate-500">Share Your Blood Donation Story</h3>
                    <textarea 
                      required
                      rows="3"
                      value={newCommunityPost}
                      onChange={(e) => setNewCommunityPost(e.target.value)}
                      placeholder="Share your pre-donation routines or thank emergency responders..."
                      className="w-full p-4 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                    ></textarea>
                    <div className="flex justify-end">
                      <button type="submit" className={`px-5 py-2.5 ${uiTheme.bg} hover:shadow-lg text-white font-extrabold text-xs rounded-xl transition-all shadow-md`}>
                        Share with Network
                      </button>
                    </div>
                  </form>

                  <div className="space-y-6">
                    {communityStories.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-8">No community posts yet. Share your first lifesaver story above.</p>
                    ) : communityStories.map((story) => (
                      <div key={story.id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center font-black text-primary-500 text-xs">
                              {story.author.charAt(0)}
                            </div>
                            <div className="text-xs">
                              <p className="font-bold text-slate-800 dark:text-white">{story.author}</p>
                              <p className="text-[10px] text-slate-400">{story.city} • Blood: {story.bloodGroup}</p>
                            </div>
                          </div>

                          <button 
                            onClick={() => handleLikeStory(story.id)}
                            className={`flex items-center gap-1 text-[11px] font-extrabold ${story.liked ? 'text-primary-500' : 'text-slate-400'}`}
                          >
                            ❤️ <span>{story.likes} Likes</span>
                          </button>
                        </div>

                        <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-300">
                          {story.content}
                        </p>

                        {/* Comments feed */}
                        {story.comments.length > 0 && (
                          <div className="p-3.5 bg-slate-50 dark:bg-dark-850 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800 text-[11px]">
                            {story.comments.map((c, idx) => (
                              <p key={idx} className="text-slate-600 dark:text-slate-300">
                                <span className="font-extrabold text-slate-800 dark:text-white">{c.author}: </span>
                                {c.text}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Comment input form */}
                        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                          <input 
                            type="text" 
                            placeholder="Add your appreciative comment..." 
                            value={activeStoryComment[story.id] || ""}
                            onChange={(e) => setActiveStoryComment({ ...activeStoryComment, [story.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleAddComment(story.id, activeStoryComment[story.id]);
                              }
                            }}
                            className="flex-grow p-2 bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-750 text-[11px] rounded-lg outline-none"
                          />
                          <button 
                            onClick={() => handleAddComment(story.id, activeStoryComment[story.id])}
                            className={`px-3 py-1.5 ${uiTheme.bg} text-white font-extrabold text-[10px] rounded-lg`}
                          >
                            Send
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* TAB 8: CAMPAIGNS & CAMPS */}
              {activeTab === 'campaigns' && (
                <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                  <div className="border-b pb-3">
                    <h3 className="font-extrabold text-lg flex items-center gap-2">
                      <BookOpen className="text-indigo-500" /> Nearby Donation Campaigns & Camps
                    </h3>
                    <p className="text-xs text-slate-400">Register or volunteer for medical camps in your district.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {campaignDrives.length > 0 ? campaignDrives.map((camp) => (
                      <div key={camp._id} className="p-5 bg-slate-50 dark:bg-dark-80/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                        <div className="space-y-1">
                          <span className="px-2.5 py-0.5 text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-600 rounded">{camp.status || 'Active'}</span>
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white mt-2">{camp.title}</h4>
                          <p className="text-xs text-slate-500 font-medium">{camp.locationName}, {camp.city}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(camp.startDate).toLocaleDateString()} – {new Date(camp.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Link
                          to="/campaigns"
                          className={`block w-full text-center py-2.5 ${uiTheme.bg} ${uiTheme.hover} text-white font-extrabold text-xs rounded-lg transition-all`}
                        >
                          View Camp Details
                        </Link>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-500 col-span-2 text-center py-6">No registered donation camps in your region yet.</p>
                    )}
                  </div>

                  {/* Achievements certificate viewing panel trigger */}
                  <div className="p-6 bg-slate-50 dark:bg-dark-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200">Official Donation appreciation Certificate</h4>
                      <p className="text-[11px] text-slate-400">Preview and print your cryptographic appreciation seals certified by ONEDROP CMO.</p>
                    </div>
                    <button 
                      onClick={() => setShowCertificateModal(true)}
                      className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-lg transition-all flex items-center gap-1.5"
                    >
                      <Award className="w-4 h-4" /> View Certificate
                    </button>
                  </div>
                </div>
              )}


              {/* TAB 9: SMART NOTIFICATION HUB */}
              {activeTab === 'notifications' && (
                <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-lg space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="font-extrabold text-lg flex items-center gap-2">
                        <Bell className={uiTheme.text} /> Real-time Alert & System Logs
                      </h3>
                      <p className="text-xs text-slate-400">Match alerts, badges earned, and community reactions feed.</p>
                    </div>
                    <button 
                      onClick={markAllRead}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-xs font-bold text-slate-650 dark:text-slate-350 rounded-lg transition-all"
                    >
                      Mark All as Read
                    </button>
                  </div>

                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div 
                        key={log.id} 
                        onClick={() => markAsRead(log.id)}
                        className={`p-4 rounded-2xl flex items-start justify-between border transition-all cursor-pointer hover:border-slate-350 dark:hover:border-slate-700 ${
                          log.unread 
                            ? 'bg-primary-500/5 dark:bg-primary-500/10 border-primary-500/20 shadow-md' 
                            : 'bg-slate-50 dark:bg-dark-80/20 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1 text-xs flex-grow">
                          <p className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                            {log.title}
                            {log.unread && <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>}
                          </p>
                          <p className="text-slate-450 dark:text-slate-400 leading-relaxed">{log.desc}</p>
                          <span className="text-[10px] text-slate-400 block pt-1">{log.time}</span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(log.chatPartnerId || log.rawRequest?.chatPartnerId || log.rawRequest?.requester) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiateChat(
                                    log.chatPartnerId || log.rawRequest?.chatPartnerId || log.rawRequest?.requester?._id || log.rawRequest?.requester
                                  );
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 dark:bg-dark-800 text-white rounded-lg text-[10px] font-bold hover:bg-slate-700 transition"
                              >
                                <MessageSquare className="w-3 h-3" /> {LOCALIZATION[lang].chatNow}
                              </button>
                            )}
                            {/* Show Call & WhatsApp for request_accepted notifications that contain contact info in the message */}
                            {log.type === 'emergency' && log.desc && log.desc.includes('📞') && (() => {
                              const phoneMatch = log.desc.match(/📞[^\n]*?([+\d]{10,15})/);
                              if (phoneMatch) {
                                let ph = phoneMatch[1].trim().replace(/\s+/g, '');
                                if (!ph.startsWith('+')) ph = ph.length === 10 ? `91${ph}` : ph;
                                else ph = ph.replace('+', '');
                                const waUrl = `https://wa.me/${ph}?text=${encodeURIComponent('Hi, I am following up on the blood request on ONEDROP.')}` ;
                                return (
                                  <>
                                    <a
                                      href={`tel:${phoneMatch[1]}`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-700 transition"
                                    >
                                      <Phone className="w-3 h-3" /> Call
                                    </a>
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 px-2.5 py-1 bg-[#25D366] text-white rounded-lg text-[10px] font-bold hover:bg-[#1ebe59] transition"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg>
                                      WhatsApp
                                    </a>
                                  </>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLog(log.id);
                          }}
                          className="ml-3 text-[10px] opacity-60 hover:opacity-100 text-slate-400 hover:text-slate-700 w-5 h-5 flex items-center justify-center bg-slate-100 dark:bg-dark-700 rounded-full flex-shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}


              {/* TAB: CERTIFIED BLOOD BANKS FINDER */}
              {activeTab === 'bloodbanks' && (
                <motion.div
                  key="bloodbanks-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6 animate-fade-in"
                >
                  <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
                    <div className="border-b pb-4 flex justify-between items-center flex-wrap gap-4">
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-lg flex items-center gap-2"><Globe className={`${uiTheme.text} w-5 h-5`} /> 29-States Certified Blood Banks</h3>
                        <p className="text-xs text-slate-400">Search and contact emergency blood storage centers across all 29 Indian states dynamically by state and district.</p>
                      </div>
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
                                  className={`w-full py-2 ${uiTheme.bg} ${uiTheme.hover} text-white font-bold rounded-lg text-[10px] transition text-center flex items-center justify-center gap-1.5 shadow-sm shadow-primary-500/10`}
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
                        <p className="text-[10px] text-slate-400/80 max-w-sm mx-auto leading-relaxed">Select one of the 29 Indian States and specify a District to load certified facilities and call them directly.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}


              {/* TAB 10: SETTINGS (Update Profile & App Settings) */}
              {activeTab === 'settings' && (
                <div className="grid lg:grid-cols-2 gap-8 items-stretch animate-fade-in">
                  
                  {/* Left Column: App Settings & Theme customizer */}
                  <div className="space-y-8 flex flex-col justify-start">
                    
                    {/* Thematic customizer card */}
                    <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
                      <div className="border-b pb-3 flex items-center gap-2">
                        <Settings className="text-slate-500 w-5 h-5 animate-spin-slow" />
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Thematic Customizer</h3>
                          <p className="text-[10px] text-slate-400">Scale UI layouts, localization languages and palettes.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Accent Color Palette Selection */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">{LOCALIZATION[lang].accentColor}</label>
                          <div className="flex gap-3">
                            {[
                              { id: 'red', bg: 'bg-primary-600 border-primary-500' },
                              { id: 'indigo', bg: 'bg-indigo-600 border-indigo-500' },
                              { id: 'emerald', bg: 'bg-emerald-600 border-emerald-500' },
                              { id: 'amber', bg: 'bg-amber-600 border-amber-500' },
                              { id: 'violet', bg: 'bg-violet-600 border-violet-500' }
                            ].map((color) => (
                              <button
                                key={color.id}
                                onClick={() => setAccent(color.id)}
                                className={`w-8 h-8 rounded-full ${color.bg} border-4 transition-all transform hover:scale-110 ${accent === color.id ? 'border-slate-900 dark:border-white shadow-lg' : 'border-transparent'}`}
                              />
                            ))}
                          </div>
                        </div>

                        {/* Localization Language */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">{LOCALIZATION[lang].language}</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'en', label: 'English' },
                              { id: 'hi', label: 'हिंदी (Hindi)' },
                              { id: 'gu', label: 'ગુજરાતી (Gujarati)' },
                              { id: 'mr', label: 'मराठी (Marathi)' },
                              { id: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
                              { id: 'ta', label: 'தமிழ் (Tamil)' }
                            ].map((lng) => (
                              <button
                                key={lng.id}
                                onClick={() => setLang(lng.id)}
                                className={`px-4 py-2 text-xs font-extrabold rounded-xl border transition-all ${lang === lng.id ? `${uiTheme.bg} text-white` : 'bg-slate-50 dark:bg-dark-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}
                              >
                                {lng.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Spacing Scales Compact toggles */}
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">{LOCALIZATION[lang].compactMode}</label>
                          <div className="flex gap-4 items-center justify-between bg-slate-50 dark:bg-dark-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <span className="text-[11px] text-slate-400 font-semibold leading-relaxed">Reduce screen padding for listings:</span>
                            <button 
                              onClick={() => setCompact(!compact)}
                              className={`w-12 h-6 rounded-full p-1 transition-all shrink-0 ${compact ? 'bg-emerald-500' : 'bg-slate-350'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${compact ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* App Alert & Notifications settings card */}
                    <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
                      <div className="border-b pb-3 flex items-center gap-2">
                        <Bell className="text-slate-500 w-5 h-5 animate-pulse" />
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Application Alert Channels</h3>
                          <p className="text-[10px] text-slate-400">Configure background notification delivery channels.</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        {[
                          { title: "Email Alerts", desc: "Receive immediate clinical reports, match alerts and direct greetings.", state: emailAlerts, setState: setEmailAlerts },
                          { title: "SMS Mobile Notifications", desc: "Send SMS dispatch codes when patient requests are created locally.", state: smsAlerts, setState: setSmsAlerts },
                          { title: "Smart PWA Push Reminders", desc: "Show persistent desktop/mobile notifications in the background.", state: pushAlerts, setState: setPushAlerts }
                        ].map((item, idx) => (
                          <div key={idx} className="flex gap-4 items-center justify-between p-3 bg-slate-50 dark:bg-dark-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div>
                              <h4 className="font-bold text-xs text-slate-700 dark:text-slate-200">{item.title}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed font-semibold">{item.desc}</p>
                            </div>
                            <button 
                              onClick={() => item.setState(!item.state)}
                              className={`w-12 h-6 rounded-full p-1 transition-all shrink-0 ${item.state ? 'bg-emerald-500' : 'bg-slate-350'}`}
                            >
                              <div className={`w-4 h-4 bg-white rounded-full transition-all transform ${item.state ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => alert("Application notification alert settings successfully synchronized and saved!")}
                          className={`w-full py-2.5 text-xs font-black text-white ${uiTheme.bg} ${uiTheme.hover} rounded-xl shadow-md transition-all`}
                        >
                          Synchronize Application Settings
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Update Profile Settings form */}
                  <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg space-y-6">
                    <div className="border-b pb-3 flex items-center gap-2">
                      <Users className="text-slate-500 w-5 h-5" />
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider">Update Profile Information</h3>
                        <p className="text-[10px] text-slate-400">Keep your clinical details and contact coordinates up to date.</p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                      
                      <div className="space-y-4">
                        <h4 className="font-extrabold text-[10px] text-primary-500 uppercase tracking-widest border-b pb-1">1. Contact Details</h4>
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
                        <h4 className="font-extrabold text-[10px] text-primary-500 uppercase tracking-widest border-b pb-1">2. Location Coordinates</h4>
                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">State</label>
                            <select 
                              required 
                              value={editState}
                              onChange={handleStateChange}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300"
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
                              onChange={handleDistrictChange}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none disabled:opacity-50 text-slate-700 dark:text-slate-300"
                            >
                              <option value="">Select District</option>
                              {Object.keys(STATES_DATA[editState] || {}).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">City / Mandal</label>
                            <select 
                              required 
                              disabled={!editDistrict}
                              value={editCity}
                              onChange={(e) => setEditCity(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none disabled:opacity-50 text-slate-700 dark:text-slate-300"
                            >
                              <option value="">Select City / Mandal</option>
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
                              placeholder="Street address, building"
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-semibold text-slate-700 dark:text-slate-300"
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
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none font-mono text-slate-700 dark:text-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-extrabold text-[10px] text-primary-500 uppercase tracking-widest border-b pb-1">3. Donor Health Profile</h4>
                        <div className="grid sm:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Blood</label>
                            <select 
                              value={editBloodGroup}
                              onChange={(e) => setEditBloodGroup(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-primary-500 font-extrabold"
                            >
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Weight (kg)</label>
                            <input 
                              type="number" 
                              value={editWeight}
                              onChange={(e) => setEditWeight(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Gender</label>
                            <select 
                              value={editGender}
                              onChange={(e) => setEditGender(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
                            >
                              {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">DOB</label>
                            <input 
                              type="date" 
                              value={editDOB}
                              onChange={(e) => setEditDOB(e.target.value)}
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Medical Conditions</label>
                            <input 
                              type="text" 
                              value={editConditions}
                              onChange={(e) => setEditConditions(e.target.value)}
                              placeholder="e.g. Hypertension, None"
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1">Allergies</label>
                            <input 
                              type="text" 
                              value={editAllergies}
                              onChange={(e) => setEditAllergies(e.target.value)}
                              placeholder="e.g. Penicillin, None"
                              className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-700 dark:text-slate-300 font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className={`w-full py-3 text-xs font-black text-white ${uiTheme.bg} ${uiTheme.hover} rounded-xl shadow-lg transition-all`}
                      >
                        Save Profile Settings
                      </button>
                    </form>
                  </div>

                </div>
              )}

            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      {/* Floating AI Healthcare Assistant Button */}
      <div className="fixed bottom-20 md:fixed md:bottom-6 right-6 z-50 flex flex-col items-end gap-3 print:hidden">
        
        {/* Chatbot Window */}
        <AnimatePresence>
          {chatbotOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="w-80 h-96 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Header */}
              <div className={`p-4 ${uiTheme.bg} text-white flex justify-between items-center`}>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-wider">{LOCALIZATION[lang].chatBotTitle}</span>
                </div>
                <button onClick={() => setChatbotOpen(false)}>✕</button>
              </div>

              {/* Message Streams */}
              <div className="flex-grow p-4 overflow-y-auto space-y-3 text-[11px]">
                {chatbotMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`p-2.5 max-w-[80%] rounded-2xl ${msg.sender === 'user' ? `${uiTheme.bg} text-white` : 'bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-200'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotTyping && (
                  <div className="flex justify-start">
                    <span className="p-2 bg-slate-100 dark:bg-slate-850 text-slate-400 italic rounded-2xl">Typing advice...</span>
                  </div>
                )}
              </div>

              {/* Quick Replies Options */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 flex gap-1.5 overflow-x-auto text-[9px] font-bold">
                {[
                  { q: 'Am I eligible?', label: 'Eligibility' },
                  { q: 'What should I eat?', label: 'Diet Tips' },
                  { q: 'How to claim badges?', label: 'Badges Help' }
                ].map((q, idx) => (
                  <button 
                    key={idx}
                    onClick={() => {
                      setChatInput(q.q);
                    }}
                    className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-750 transition-all flex-shrink-0"
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Chat Form */}
              <form onSubmit={handleChatbotSend} className="p-2 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about pre-donation diagnostic tips..."
                  className="flex-grow p-2.5 bg-slate-50 dark:bg-dark-850 border border-slate-200 dark:border-slate-750 text-xs rounded-xl outline-none"
                />
                <button type="submit" className={`px-4 py-2.5 ${uiTheme.bg} text-white font-black text-xs rounded-xl`}>
                  Send
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Float bubble trigger */}
        <button 
          onClick={() => setChatbotOpen(!chatbotOpen)} 
          className={`p-4 ${uiTheme.bg} text-white rounded-full shadow-2xl hover:scale-105 transition-all`}
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Floating Bottom Nav for Mobile Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-850 py-2 px-6 flex justify-around md:hidden print:hidden">
        {[
          { id: 'main-home', label: 'Home', icon: Home, path: '/' },
          { id: 'dashboard', label: 'Dashboard', icon: Activity },
          { id: 'requests', label: 'Feed', icon: Heart },
          { id: 'rewards', label: 'Wallet', icon: Gift },
          { id: 'notifications', label: 'Alerts', icon: Bell }
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
                setSearchParams({ tab: item.id });
              }}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 ${isActive ? uiTheme.text : 'text-slate-400 dark:text-slate-500'}`}
            >
              <ItemIcon className="w-5.5 h-5.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Edit Profile Modal (Glassmorphism layout) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="relative w-full max-w-2xl bg-white/90 dark:bg-dark-900/90 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowEditModal(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <h2 className="text-2xl font-black">Edit Profile Information</h2>
              <p className="text-xs text-slate-500">Keep your details up-to-date to maintain accurate volunteer listings.</p>
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                    <input 
                      type="tel" 
                      required 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-extrabold text-xs text-primary-500 uppercase tracking-widest border-b pb-1">2. Location Coordinates</h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">State</label>
                    <select 
                      required 
                      value={editState}
                      onChange={handleStateChange}
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
                      onChange={handleDistrictChange}
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
                      placeholder="Street address, building"
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none"
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
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-extrabold text-xs text-primary-500 uppercase tracking-widest border-b pb-1">3. Donor Health Profile</h4>
                <div className="grid sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Blood Group</label>
                    <select 
                      value={editBloodGroup}
                      onChange={(e) => setEditBloodGroup(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-primary-500 font-extrabold"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Weight (kg)</label>
                    <input 
                      type="number" 
                      value={editWeight}
                      onChange={(e) => setEditWeight(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Gender</label>
                    <select 
                      value={editGender}
                      onChange={(e) => setEditGender(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none"
                    >
                      {['Male', 'Female', 'Other'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">DOB</label>
                    <input 
                      type="date" 
                      value={editDOB}
                      onChange={(e) => setEditDOB(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Medical Conditions (Comma separated)</label>
                    <input 
                      type="text" 
                      value={editConditions}
                      onChange={(e) => setEditConditions(e.target.value)}
                      placeholder="e.g. Hypertension, None"
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Allergies (Comma separated)</label>
                    <input 
                      type="text" 
                      value={editAllergies}
                      onChange={(e) => setEditAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, None"
                      className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-770 rounded-xl text-xs outline-none"
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
                  className={`flex-grow py-3 ${uiTheme.bg} ${uiTheme.hover} text-white font-bold rounded-xl text-xs transition-all shadow-md`}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Floating Crimson Glassmorphic Smart Match Alert Panel */}
      <AnimatePresence>
        {smartMatchAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl border border-rose-500/40 rounded-3xl p-6 shadow-[0_20px_50px_rgba(239,68,68,0.35)] space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1">
                  {smartMatchAlert.emergencyMode ? '🚨 EMERGENCY SMART MATCH' : '🩸 PROXIMITY BLOOD MATCH'}
                </span>
              </div>
              <button 
                onClick={() => setSmartMatchAlert(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-400 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 dark:text-white truncate">
                  {smartMatchAlert.patientName}
                </h3>
                <span className="px-3 py-1 text-xs font-black bg-rose-600 text-white rounded-lg shadow-sm">
                  {smartMatchAlert.bloodGroup} Needed
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-1.5 font-bold">
                  <Heart className="w-4 h-4 text-rose-500 flex-shrink-0" />
                  <span>Units Needed: {smartMatchAlert.unitsRequired} Unit(s)</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>Hospital: {smartMatchAlert.hospitalName}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">Area: {smartMatchAlert.place} ({smartMatchAlert.pincode})</span>
                </p>
                {smartMatchAlert.contactNumber && (
                  <p className="flex items-center gap-1.5 font-semibold text-indigo-600 dark:text-indigo-400">
                    <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    <span>Contact: {smartMatchAlert.contactNumber}</span>
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase pt-1">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Requested: {new Date(smartMatchAlert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSmartMatchAlert(null)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-dark-800 hover:bg-slate-200 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-350 font-black text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleAcceptSmartMatch(smartMatchAlert.request?._id || smartMatchAlert.requestId)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-500/20 transition-all animate-pulse"
                >
                  Accept Request
                </button>
              </div>
              {(smartMatchAlert.requesterId || smartMatchAlert.requester) && (
                <button
                  type="button"
                  onClick={() => handleInitiateChat(smartMatchAlert.requesterId || smartMatchAlert.requester?._id || smartMatchAlert.requester)}
                  className="w-full py-2.5 bg-slate-900 dark:bg-dark-800 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Chat with Requester
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA Manual Install Instructions Modal */}
      {showInstallInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="relative w-full max-w-md bg-white/95 dark:bg-dark-900/95 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-2xl space-y-6">
            <button 
              onClick={() => setShowInstallInstructions(false)}
              className="absolute top-6 right-6 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-full text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-rose-100 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black">Install ONEDROP App</h3>
              <p className="text-xs text-slate-500 font-semibold">Add ONEDROP to your home screen for quick offline access and instant push alerts.</p>
            </div>

            {/* Platform specific detection */}
            <div className="space-y-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {/iPhone|iPad|iPod/i.test(navigator.userAgent) ? (
                <div className="bg-slate-50 dark:bg-dark-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <p className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-primary-500" /> iOS & Safari Guide:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-500 dark:text-slate-400 pl-1 leading-relaxed">
                    <li>Tap the <span className="font-black text-slate-800 dark:text-white">Share button</span> (square with upward arrow) in the Safari toolbar.</li>
                    <li>Scroll down the options list and tap <span className="font-black text-slate-800 dark:text-white">"Add to Home Screen"</span>.</li>
                    <li>Confirm by tapping <span className="font-black text-slate-800 dark:text-white">"Add"</span> in the top-right corner.</li>
                  </ol>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-dark-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                  <p className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-primary-500" /> Browser Install Guide:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-slate-500 dark:text-slate-400 pl-1 leading-relaxed">
                    <li>Look for the <span className="font-black text-slate-800 dark:text-white">install/download icon</span> (usually an arrow pointing down or a plus sign) in your browser's address bar.</li>
                    <li>Or click the <span className="font-black text-slate-800 dark:text-white">menu button</span> (three dots or lines) at the top-right/bottom of the browser.</li>
                    <li>Select <span className="font-black text-slate-800 dark:text-white">"Install ONEDROP..."</span> or <span className="font-black text-slate-800 dark:text-white">"Add to Home screen"</span>.</li>
                  </ol>
                </div>
              )}

              {/* Technical features listing */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-[10px] text-slate-400 font-bold">
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Live Match Alerts
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Offline Mode Setup
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Zero Data Cost
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Auto Updates
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstallInstructions(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md"
            >
              Got It
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default DonorDashboard;
