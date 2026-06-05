import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Heart, Users, CheckCircle, Search, Award, Share2, Info, HelpCircle,
  MapPin, Phone, Mail, Clock, ChevronDown, BookOpen, MessageSquare,
  Shield, Bell, Star, BarChart3, Plus, ArrowRight, ShieldAlert,
  Check, Play, Smartphone, Laptop, Compass, HeartHandshake, ShieldCheck,
  LogIn
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { STATES_DATA } from '../utils/statesData';
import AiChatAssistant from '../components/AiChatAssistant';
import { getTimeBasedGreeting } from '../utils/greeting';

// Mock Blood Compatibility Chart datasets
const COMPATIBILITY_DATA = [
  { group: 'O-', canGiveTo: 'All Types (Universal Donor)', canReceiveFrom: 'O-' },
  { group: 'O+', canGiveTo: 'O+, A+, B+, AB+', canReceiveFrom: 'O-, O+' },
  { group: 'A-', canGiveTo: 'A-, A+, AB-, AB+', canReceiveFrom: 'O-, A-' },
  { group: 'A+', canGiveTo: 'A+, AB+', canReceiveFrom: 'O-, O+, A-, A+' },
  { group: 'B-', canGiveTo: 'B-, B+, AB-, AB+', canReceiveFrom: 'O-, B-' },
  { group: 'B+', canGiveTo: 'B+, AB+', canReceiveFrom: 'O-, O+, B-, B+' },
  { group: 'AB-', canGiveTo: 'AB-, AB+', canReceiveFrom: 'O-, A-, B-, AB-' },
  { group: 'AB+', canGiveTo: 'AB+ (Universal Recipient)', canReceiveFrom: 'All Types' }
];

// Mock Founders Data
const FOUNDERS = [
  {
    name: 'Devagudi Jagadeeswar Reddy',
    role: 'Founder & Chief Executive Officer',
    bio: 'Visionary leader from Kadapa, Andhra Pradesh, committed to bridging the gap in critical care logistics and blood storage networks across India.',
    vision: 'Ensuring zero fatalities due to regional blood shortages by leveraging intelligent peer-to-peer proximity architectures.',
    mission: 'Connecting 10 million eligible donors with zero transaction charges and transparent clinical screening pipelines.',
    contribution: 'Designed ONEDROP’s map-free cascading location database index logic.',
    image: '/jagadeeswar.png',
    socials: { github: '#', linkedin: '#', instagram: '#' }
  },
  {
    name: 'Patnam Chinmaya Nanda',
    role: 'Co-Founder & Chief Technology Officer',
    bio: 'Passionate systems architect dedicated to developing real-time distributed software solutions for healthcare access and social welfare.',
    vision: 'Deploying high-speed, secure communication channels and real-time inventory systems to save lives in seconds.',
    mission: 'Scaling ONEDROP’s technical infrastructure to sustain millisecond-level donor matches across every Indian village.',
    contribution: 'Built ONEDROP’s secure chat workspaces and gamified lifesaver rewards system.',
    image: '/chinmaya.png',
    socials: { github: '#', linkedin: '#', instagram: '#' }
  }
];

// Gallery Items Data
const GALLERY_ITEMS = [
  {
    title: "Donation Camp Ahmedabad",
    category: "drives",
    desc: "Over 250 units collected at our state-level corporate donation camp.",
    image: "/camp_ahmedabad.png"
  },
  {
    title: "Clinical Screening Setup",
    category: "clinical",
    desc: "Verified rapid serology testing for donor health security checks.",
    image: "/clinical_setup.png"
  },
  {
    title: "Gift of Life Quote",
    category: "quotes",
    desc: "Your blood is a priceless gift. Share it to save up to three lives.",
    image: "/gift_of_life.png"
  },
  {
    title: "Verified Proximity Logistics",
    category: "clinical",
    desc: "Certified insulated cold-storage bags ready for transport.",
    image: "/proximity_logistics.png"
  },
  {
    title: "Lifesaver Youth Drive",
    category: "drives",
    desc: "Students of Kadapa Engineering College showing off rewards.",
    image: "/youth_drive.png"
  },
  {
    title: "Be a Hero Quote",
    category: "quotes",
    desc: "Heroes don't always wear capes. Some roll up their sleeves.",
    image: "/be_a_hero.png"
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useSelector((state) => state.auth);

  // Search State variables
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [foundDonors, setFoundDonors] = useState([]);
  const [searchRun, setSearchRun] = useState(false);

  // Mockup Interactive States
  const [isEmergencyActive, setIsEmergencyActive] = useState(true);
  const [recipientFormName, setRecipientFormName] = useState('');
  const [recipientFormHospital, setRecipientFormHospital] = useState('');
  const [recipientFormUnits, setRecipientFormUnits] = useState('');
  const [recipientFormPincode, setRecipientFormPincode] = useState('');

  // FAQ state toggle
  const [activeFaq, setActiveFaq] = useState(null);

  // Feedback Form States
  const [galleryCategory, setGalleryCategory] = useState('all');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [galleryItems, setGalleryItems] = useState(GALLERY_ITEMS);

  // Live Stats from Database (fallback to defaults if fetch fails)
  const [liveStats, setLiveStats] = useState({
    activeDonors: 0,
    registeredRecipients: 0,
    hospitals: 0,
    fulfilledRequests: 0,
    savedLives: 0
  });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [statsRes, inventoryRes] = await Promise.all([
          axios.get(`${API_URL}/api/requests/stats/global`),
          axios.get(`${API_URL}/api/requests/stats/inventory`)
        ]);
        if (statsRes.data) setLiveStats(statsRes.data);
        if (inventoryRes.data) setChartData(inventoryRes.data);
      } catch (err) {
        console.error('Failed to fetch live stats:', err);
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/gallery`);
        if (res.data && res.data.length > 0) {
          setGalleryItems(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch gallery items from database, using defaults:', err);
      }
    };
    fetchGallery();
  }, []);

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const timer = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const stats = [
    { label: 'Registered Donors', count: ((liveStats && liveStats.activeDonors) || 0).toLocaleString(), color: 'text-rose-500' },
    { label: 'Registered Recipients', count: ((liveStats && liveStats.registeredRecipients) || 0).toLocaleString(), color: 'text-indigo-500' },
    { label: 'Hospitals Registered', count: ((liveStats && liveStats.hospitals) || 0).toLocaleString(), color: 'text-violet-500' },
    { label: 'Requests Fulfilled', count: ((liveStats && liveStats.fulfilledRequests) || 0).toLocaleString(), color: 'text-emerald-500' },
    { label: 'Units Donated', count: ((liveStats && liveStats.savedLives) || 0).toLocaleString(), color: 'text-amber-500' }
  ];

  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
    setSelectedDistrict('');
    setSelectedCity('');
  };

  const handleDistrictChange = (e) => {
    setSelectedDistrict(e.target.value);
    setSelectedCity('');
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!feedbackEmail || !feedbackMessage) return;

    const targetPhoneNumber = "918500508940";
    const messageText = `*New ONEDROP Feedback*\n\n*From:* ${feedbackEmail}\n*Message:* ${feedbackMessage}`;
    const whatsappUrl = `https://wa.me/${targetPhoneNumber}?text=${encodeURIComponent(messageText)}`;

    window.open(whatsappUrl, '_blank');
    alert("Redirecting to WhatsApp to send feedback to ONEDROP Support...");

    setFeedbackEmail('');
    setFeedbackMessage('');
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchRun(true);
    try {
      const res = await axios.get(`${API_URL}/api/requests/search/donors`, {
        params: {
          state: selectedState,
          district: selectedDistrict,
          bloodGroup: bloodGroup || undefined
        }
      });
      setFoundDonors(res.data);
    } catch (err) {
      console.error("Failed to search donors:", err);
      setFoundDonors([]);
    }
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'Super Admin':
      case 'Admin': return '/admin';
      case 'Donor': return '/donor';
      case 'Recipient': return '/recipient';
      case 'Hospital': return '/hospital';
      default: return '/';
    }
  };

  const scrollToSection = (sectionId) => {
    if (sectionId === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleLandingNav = (tab) => {
    if (tab === 'home') {
      scrollToSection('home');
      return;
    }
    if (tab === 'requests') {
      scrollToSection('search-donors');
      return;
    }
    if (tab === 'chat') {
      if (token) {
        navigate('/chat');
      } else {
        navigate('/login');
      }
      return;
    }
    if (tab === 'profile') {
      if (token) {
        navigate(getDashboardPath());
      } else {
        navigate('/login');
      }
    }
  };

  const MockPhoneNav = ({ activeTab }) => (
    <div className="bg-white border-t border-slate-100 px-4 py-2.5 flex justify-between items-center rounded-b-[36px]">
      {[
        { id: 'home', label: 'Home', icon: Heart },
        { id: 'requests', label: 'Requests', icon: Search },
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'profile', label: 'Profile', icon: Users }
      ].map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleLandingNav(item.id)}
            className={`flex flex-col items-center shrink-0 cursor-pointer transition-colors ${isActive ? 'text-rose-600 font-black' : 'text-slate-400 font-bold'
              }`}
          >
            <Icon className={`w-4 h-4 ${isActive && item.id === 'home' ? 'fill-current' : ''}`} />
            <span className="text-[8px] leading-none mt-0.5 scale-90">{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  const handleInitiateChat = async (recipientId) => {
    if (!token) {
      alert("Please log in to initiate secure chat rooms.");
      navigate("/login");
      return;
    }
    try {
      await axios.post(
        `${API_URL}/api/chats`,
        { recipientId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/chat');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to start chat session.');
    }
  };

  return (
    <div id="home" className="bg-slate-50/50 dark:bg-dark-950 text-slate-900 dark:text-white space-y-16 pb-28 md:pb-20 overflow-x-hidden font-sans">

      {/* 1. Header Alerts & Central Branding Banner */}
      <header className="max-w-7xl mx-auto px-4 pt-8">
        {/* Alerts Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {/* Left Alert Pill */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 bg-emerald-50/90 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="bg-emerald-500 text-white p-2.5 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 animate-pulse">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 dark:text-emerald-400">Both Donors and Recipients Can Donate</p>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">Everyone can be a hero. Give blood. Save lives.</h4>
            </div>
            <div className="ml-auto text-emerald-500">
              <Heart className="w-5 h-5 fill-current animate-bounce" />
            </div>
          </motion.div>

          {/* Right Alert Pill */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 bg-rose-50/90 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
          >
            <div className="bg-rose-500 text-white p-2.5 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider font-extrabold text-rose-700 dark:text-rose-400">Both Donors and Recipients Can Request</p>
              <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">Need blood? You can request anytime, anywhere.</h4>
            </div>
            <div className="ml-auto text-rose-500">
              <Heart className="w-5 h-5 fill-current animate-pulse" />
            </div>
          </motion.div>
        </div>

        {/* Central Brand Identity Section */}
        <div className="text-center space-y-3 pb-8">
          <div className="flex justify-center items-center gap-2 mb-2">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="relative flex items-center justify-center"
            >
              {/* Infinity-like Heart logo vector */}
              <svg className="w-16 h-16 text-rose-600 dark:text-rose-500 fill-current filter drop-shadow-md" viewBox="0 0 100 50">
                <path d="M 30,10 C 15,10 5,20 5,30 C 5,42 20,48 30,48 C 45,48 50,30 55,20 C 60,10 75,5 85,15 C 95,25 95,40 85,45 C 75,50 65,42 60,35 C 55,27 45,10 30,10 Z" />
                <circle cx="50" cy="27" r="8" className="text-rose-500 fill-current animate-ping" />
                <path d="M 50,15 L 53,22 L 60,23 L 55,28 L 56,35 L 50,31 L 44,35 L 45,28 L 40,23 L 47,22 Z" className="text-white fill-current" />
              </svg>
            </motion.div>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">
            RAKT<span className="text-rose-600 dark:text-rose-500">SETU</span>
          </h1>
          <p className="text-base uppercase tracking-widest font-extrabold text-slate-500 dark:text-slate-400">
            Connecting Lives Through Blood Donation
          </p>

          <div className="flex justify-center gap-4 pt-4">
            <Link to="/register" className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-full shadow-lg shadow-rose-600/20 hover:shadow-rose-600/35 transition-all duration-300 text-sm flex items-center gap-2">
              Join as Donor <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="px-6 py-2.5 bg-slate-900 dark:bg-dark-800 text-white dark:text-slate-200 font-extrabold rounded-full hover:bg-slate-800 dark:hover:bg-dark-700 border border-slate-200 dark:border-slate-800 transition-all duration-300 text-sm">
              Request Emergency Help
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Three-Column Main Showcase Grid */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">

          {/* COLUMN 1: DONOR PHONE PREVIEW + VALUE ADDS */}
          <div className="flex flex-col justify-between space-y-8 bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500">
            {/* Value Title */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full">Donor Ecosystem</span>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">I WANT TO DONATE BLOOD</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Be a Lifesaver. Donate Blood. Save Lives.</p>
            </div>

            {/* Interactive iPhone Simulator Chassis */}
            <div className="flex justify-center my-6">
              <div className="relative w-[310px] h-[610px] bg-slate-900 dark:bg-black rounded-[45px] p-3 shadow-2xl border-[6px] border-slate-800 ring-4 ring-slate-700/30 overflow-hidden flex flex-col justify-between text-slate-900">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center gap-1.5 px-3">
                  <div className="w-3 h-3 bg-black rounded-full shadow-inner"></div>
                  <div className="w-10 h-1 bg-slate-950 rounded-full"></div>
                </div>

                {/* iPhone screen content container */}
                <div className="flex-1 bg-slate-50 rounded-[36px] overflow-hidden flex flex-col justify-between pt-6 text-left relative text-xs">

                  {/* Status Bar */}
                  <div className="px-6 pt-1 flex justify-between items-center text-[10px] font-black text-slate-600">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-slate-600 rounded-full block"></span>
                      <span>LTE</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[480px] scrollbar-thin">
                    {/* Welcome Row */}
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full border-2 border-emerald-500 bg-emerald-100 flex items-center justify-center font-black text-emerald-700 text-xs">
                          {(user?.fullName || 'G').charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold leading-none">Welcome,</p>
                          <h4 className="font-extrabold text-slate-800 leading-tight">{user?.fullName || 'Guest'}</h4>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full animate-pulse">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Available
                      </span>
                    </div>

                    {/* Blood Group Card */}
                    <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white p-3 rounded-2xl shadow-md flex justify-between items-center relative overflow-hidden">
                      <div className="space-y-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-rose-100">Blood Group</p>
                        <h3 className="text-xl font-black">O+ Group</h3>
                      </div>
                      <div className="bg-white/10 p-2.5 rounded-full flex items-center justify-center shrink-0">
                        <Heart className="w-6 h-6 text-white fill-current animate-pulse" />
                      </div>
                      {/* Watermark drop */}
                      <svg className="w-16 h-16 absolute -right-4 -bottom-4 text-white/5 fill-current" viewBox="0 0 30 30">
                        <path d="M15 3 C 15 3 6 12 6 18 A 9 9 0 0 0 24 18 C 24 12 15 3 15 3 Z" />
                      </svg>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase leading-none">Reward Points</span>
                        <span className="text-base font-black text-amber-500 mt-1 flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" /> {user?.rewardPoints ?? 0}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase leading-none">Referrals</span>
                        <span className="text-base font-black text-rose-600 mt-1">{user?.totalReferrals ?? 0}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase leading-none">Badges</span>
                        <span className="text-base font-black text-emerald-600 mt-1 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> {user?.badges?.length ?? 0}
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[9px] font-extrabold text-slate-400 uppercase leading-none">Blood Group</span>
                        <span className="text-base font-black text-indigo-600 mt-1">{user?.bloodGroup || '—'}</span>
                      </div>
                    </div>

                    {user?.lastDonationDate && (
                      <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase leading-none">Last Donation</p>
                        <h4 className="font-extrabold text-slate-800 text-[11px] leading-tight mt-1">
                          {new Date(user.lastDonationDate).toLocaleDateString()}
                        </h4>
                      </div>
                    )}

                    {/* Quick Actions Grid */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none pl-1">Quick Actions</p>
                      <div className="grid grid-cols-4 gap-1.5 text-center">
                        {[
                          { label: 'Donate Blood', icon: Heart, bg: 'bg-rose-50 text-rose-600' },
                          { label: 'View Requests', icon: Search, bg: 'bg-indigo-50 text-indigo-600' },
                          { label: 'Donor Card', icon: Award, bg: 'bg-amber-50 text-amber-600' },
                          { label: 'History', icon: Clock, bg: 'bg-emerald-50 text-emerald-600' }
                        ].map((qa, index) => (
                          <button key={index} className="flex flex-col items-center bg-white p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all duration-300">
                            <div className={`${qa.bg} p-1.5 rounded-full flex items-center justify-center shrink-0 mb-1 shadow-sm`}>
                              <qa.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[8px] font-bold text-slate-600 leading-none scale-90">{qa.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <MockPhoneNav activeTab="home" />
                </div>
              </div>
            </div>

            {/* List Details with SVGs */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-dark-800">
              {[
                { label: 'Donate Blood', desc: 'You can donate blood and make a real difference.', bg: 'bg-rose-100 text-rose-600', icon: Heart },
                { label: 'Get Blood Requests', desc: 'Receive requests from people who need blood.', bg: 'bg-amber-100 text-amber-600', icon: Bell },
                { label: 'Accept or Not Available', desc: 'Choose to accept a request or mark yourself not available.', bg: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
                { label: 'Earn Rewards', desc: 'Earn points, unlock badges and climb the leaderboard.', bg: 'bg-amber-100 text-amber-500', icon: Star },
                { label: 'Track Impact', desc: "See your donations and the lives you've helped save.", bg: 'bg-indigo-100 text-indigo-600', icon: BarChart3 }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start group hover:translate-x-1 transition-transform duration-300">
                  <div className={`${item.bg} p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-rose-600 transition-colors">{item.label}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: CENTRAL INTERACTIVE INFOGRAPHIC */}
          <div className="flex flex-col justify-between items-center text-center space-y-8 bg-gradient-to-b from-white to-slate-50 dark:from-dark-900 dark:to-dark-950 border border-slate-100 dark:border-dark-800 p-8 rounded-3xl shadow-xl">

            {/* Top Branding Section */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">Unified System</span>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">EVERYONE CAN BE A HERO</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Donate Blood. Request Blood. Save Lives. Together.</p>
            </div>

            {/* Circular Arrow Feedback Vector Infographic */}
            <div className="relative w-64 h-64 flex items-center justify-center my-6">

              {/* Circular Path Arrows */}
              <svg className="w-full h-full absolute inset-0 animate-spin-slow text-slate-200 dark:text-slate-800" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                  <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="100%" stopColor="#F87171" />
                  </linearGradient>
                </defs>

                {/* Outer decorative tracks */}
                <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="1" strokeDasharray="5,5" />
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="currentColor" strokeWidth="1" />

                {/* Curved Arrow: DONATE (Green, left-to-right sweep bottom) */}
                <path d="M 12 50 A 38 38 0 0 0 88 50" fill="transparent" stroke="url(#greenGrad)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="88,50 84,44 92,44" fill="#10B981" />

                {/* Curved Arrow: REQUEST (Red, right-to-left sweep top) */}
                <path d="M 88 50 A 38 38 0 0 0 12 50" fill="transparent" stroke="url(#redGrad)" strokeWidth="4" strokeLinecap="round" />
                <polygon points="12,50 16,56 8,56" fill="#EF4444" />
              </svg>

              {/* Pulsing center Blood Drop Element */}
              <motion.div
                animate={{ scale: [0.95, 1.05, 0.95] }}
                transition={{ repeat: Infinity, duration: 1.8 }}
                className="absolute bg-white dark:bg-dark-900 border-4 border-rose-50 dark:border-dark-800 p-6 rounded-full shadow-2xl flex items-center justify-center w-24 h-24 z-10"
              >
                <svg className="w-12 h-12 text-rose-600 dark:text-rose-500 fill-current" viewBox="0 0 30 30">
                  <path d="M15 3 C 15 3 6 12 6 18 A 9 9 0 0 0 24 18 C 24 12 15 3 15 3 Z" />
                </svg>
              </motion.div>

              {/* Hands Vector overlays */}
              <div className="absolute left-[-20px] top-1/2 transform -translate-y-1/2 flex flex-col items-center z-20">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-md">
                  <HeartHandshake className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Donate</span>
              </div>

              <div className="absolute right-[-20px] top-1/2 transform -translate-y-1/2 flex flex-col items-center z-20">
                <div className="bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 shadow-md">
                  <Heart className="w-5 h-5 text-rose-600 fill-current" />
                </div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-1">Request</span>
              </div>
            </div>

            {/* Bottom Security Info Badge */}
            <div className="space-y-4 max-w-sm pt-4 border-t border-slate-100 dark:border-dark-800 w-full flex flex-col items-center">
              <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400">Safe • Secure • Reliable</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                ONEDROP ensures verified donors, secure requests, and real-time support for every life that matters. Your data remains fully protected.
              </p>
            </div>
          </div>

          {/* COLUMN 3: RECIPIENT PHONE PREVIEW + VALUE ADDS */}
          <div className="flex flex-col justify-between space-y-8 bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500">
            {/* Value Title */}
            <div className="space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">Request System</span>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">I NEED BLOOD / WANT TO REQUEST</h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Request Blood. Get Help. Save Lives.</p>
            </div>

            {/* Interactive iPhone Simulator Chassis */}
            <div className="flex justify-center my-6">
              <div className={`relative w-[310px] h-[610px] rounded-[45px] p-3 shadow-2xl border-[6px] ring-4 overflow-hidden flex flex-col justify-between text-slate-900 transition-all duration-500 ${isEmergencyActive ? 'bg-rose-950 border-rose-900 ring-rose-800/30 shadow-rose-900/20' : 'bg-slate-900 border-slate-800 ring-slate-700/30'}`}>
                {/* Notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-50 flex items-center justify-center gap-1.5 px-3">
                  <div className="w-3 h-3 bg-black rounded-full shadow-inner"></div>
                  <div className="w-10 h-1 bg-slate-950 rounded-full"></div>
                </div>

                {/* iPhone screen content container */}
                <div className="flex-1 bg-slate-50 rounded-[36px] overflow-hidden flex flex-col justify-between pt-6 text-left relative text-xs">

                  {/* Status Bar */}
                  <div className="px-6 pt-1 flex justify-between items-center text-[10px] font-black text-slate-600">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 bg-slate-600 rounded-full block"></span>
                      <span>LTE</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5 flex-1 overflow-y-auto max-h-[480px] scrollbar-thin">
                    {/* Header with Emergency Toggle */}
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-2xl shadow-sm border border-slate-100">
                      <span className="font-extrabold text-slate-800 text-[11px]">Create Blood Request</span>
                      <button
                        onClick={() => setIsEmergencyActive(!isEmergencyActive)}
                        className={`flex items-center gap-1 px-2.5 py-1 text-[9px] font-black uppercase rounded-full transition-all duration-300 ${isEmergencyActive ? 'bg-red-600 text-white shadow-md shadow-red-500/30 animate-pulse' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {isEmergencyActive ? 'Emergency' : 'Standard'}
                      </button>
                    </div>

                    {/* Blood Group Card */}
                    <div className={`text-white p-3 rounded-2xl shadow-md flex justify-between items-center relative overflow-hidden transition-all duration-500 ${isEmergencyActive ? 'bg-gradient-to-r from-red-600 to-rose-600 animate-pulse' : 'bg-gradient-to-r from-rose-500 to-rose-400'}`}>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-extrabold uppercase tracking-wide text-rose-100 leading-none">Blood Group Needed</p>
                        <h3 className="text-lg font-black leading-tight">O+ Needed</h3>
                      </div>
                      <div className="bg-white/10 p-2 rounded-full shrink-0 flex items-center justify-center">
                        <svg className="w-6 h-6 text-white fill-current" viewBox="0 0 30 30">
                          <path d="M15 3 C 15 3 6 12 6 18 A 9 9 0 0 0 24 18 C 24 12 15 3 15 3 Z" />
                        </svg>
                      </div>
                    </div>

                    {/* Form fields simulators */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm space-y-2">
                      {/* Units */}
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase leading-none mb-1">Units Needed</span>
                        <input
                          type="text"
                          value={recipientFormUnits}
                          onChange={(e) => setRecipientFormUnits(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 font-bold text-slate-700 focus:outline-none"
                        />
                      </div>

                      {/* Hospital */}
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase leading-none mb-1">Hospital Name</span>
                        <input
                          type="text"
                          value={recipientFormHospital}
                          onChange={(e) => setRecipientFormHospital(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 font-bold text-slate-700 focus:outline-none"
                        />
                      </div>

                      {/* Coordinates Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase leading-none mb-1">City / Area</span>
                          <span className="w-full bg-slate-100 border border-slate-100 rounded-lg p-1.5 font-bold text-slate-500 block">Ahmedabad</span>
                        </div>
                        <div>
                          <span className="block text-[8px] font-extrabold text-slate-400 uppercase leading-none mb-1">Pincode</span>
                          <input
                            type="text"
                            value={recipientFormPincode}
                            onChange={(e) => setRecipientFormPincode(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 font-bold text-slate-700 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Patient Name */}
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase leading-none mb-1">Patient Name (Optional)</span>
                        <input
                          type="text"
                          value={recipientFormName}
                          onChange={(e) => setRecipientFormName(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 font-bold text-slate-700 focus:outline-none"
                        />
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <span className="block text-[8px] font-extrabold text-slate-400 uppercase leading-none mb-1">Additional Notes</span>
                        <textarea
                          rows="1"
                          readOnly
                          value="Urgent surgery - Need blood as soon as possible."
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg p-1.5 font-bold text-slate-600 focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={() => {
                        if (!token) {
                          navigate('/login');
                          return;
                        }
                        navigate('/recipient');
                      }}
                      className={`w-full py-2.5 text-white font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md ${isEmergencyActive ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}
                    >
                      Submit Request
                    </button>
                  </div>

                  <MockPhoneNav activeTab="requests" />
                </div>
              </div>
            </div>

            {/* List Details with SVGs */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-dark-800">
              {[
                { label: 'Request Blood', desc: 'Anyone can request blood when they or their loved ones need it.', bg: 'bg-rose-100 text-rose-600', icon: Heart },
                { label: 'Find Eligible Donors', desc: 'Search and filter donors by blood group, area, pincode.', bg: 'bg-indigo-100 text-indigo-600', icon: Search },
                { label: 'Contact Donors', desc: 'Chat or call donors instantly when they accept.', bg: 'bg-indigo-100 text-indigo-500', icon: MessageSquare },
                { label: 'Real-Time Updates', desc: 'Get instant updates when your request is accepted.', bg: 'bg-emerald-100 text-emerald-600', icon: CheckCircle },
                { label: 'You Can Also Donate', desc: 'Yes! Recipients can also donate blood and help others.', bg: 'bg-amber-100 text-amber-500', icon: HeartHandshake }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start group hover:translate-x-1 transition-transform duration-300">
                  <div className={`${item.bg} p-2 rounded-xl flex items-center justify-center shrink-0 shadow-sm mt-0.5`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200 group-hover:text-rose-600 transition-colors">{item.label}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* 3. Deep Crimson Statement ribbon */}
      <section className="w-full bg-gradient-to-r from-red-700 via-rose-600 to-rose-700 py-4 shadow-inner relative overflow-hidden">
        {/* Abstract background graphics */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50 animate-pulse"></div>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <motion.p
            animate={{ scale: [0.98, 1.02, 0.98] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="text-white text-xs sm:text-sm md:text-base font-black tracking-widest uppercase flex items-center justify-center gap-2"
          >
            <span className="text-rose-200 animate-ping">❤</span>
            Donate Today. Request When Needed. Together We Save More Lives.
            <span className="text-rose-200 animate-ping">❤</span>
          </motion.p>
        </div>
      </section>

      {/* 4. Interactive Operational pipelines (Step-by-step progress visualizers) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 lg:px-8 space-y-12 scroll-mt-20">
        <div className="grid lg:grid-cols-[1fr_220px_1fr] gap-8 items-center">

          {/* How Donation Works (Left Pipeline) */}
          <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 p-6 rounded-3xl shadow-lg space-y-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-dark-800 pb-3 flex items-center gap-2">
              <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-600 p-1.5 rounded-lg flex items-center justify-center"><Heart className="w-4 h-4" /></span>
              How Donation Works
            </h3>

            <div className="space-y-4">
              {[
                { step: '1', title: 'Be Available', desc: 'Turn on availability to start helping.', icon: HeartHandshake, color: 'text-rose-500 bg-rose-50 border-rose-200' },
                { step: '2', title: 'Get Requests', desc: 'Receive requests near you.', icon: Bell, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
                { step: '3', title: 'Accept / Not Available', desc: 'Choose to accept or not available.', icon: CheckCircle, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
                { step: '4', title: 'Connect', desc: 'Connect with recipient via chat or call.', icon: MessageSquare, color: 'text-amber-500 bg-amber-50 border-amber-200' },
                { step: '5', title: 'Save Lives', desc: 'Donate blood and save a life.', icon: Heart, color: 'text-red-500 bg-red-50 border-red-200 fill-current' }
              ].map((s, idx) => (
                <div key={idx} className="flex gap-4 items-center group relative">
                  {/* Connector vertical line */}
                  {idx < 4 && (
                    <div className="w-[2px] h-10 bg-slate-100 dark:bg-dark-800 absolute left-6 top-10 -z-10"></div>
                  )}
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                    {s.step}
                  </span>
                  <div className={`p-2 border rounded-2xl flex items-center justify-center shrink-0 w-10 h-10 ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-rose-600 transition-colors">{s.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Action Center Connector Badge */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl text-white text-center space-y-4 shadow-xl hover:scale-105 transition-transform duration-300">
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 leading-none">You Can Do Both</p>

            <div className="flex justify-center items-center gap-2">
              <div className="bg-white/10 p-2 rounded-full flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-white fill-current" />
              </div>
              <span className="text-xl font-black">+</span>
              <div className="bg-white/10 p-2 rounded-full flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 30 30">
                  <path d="M15 3 C 15 3 6 12 6 18 A 9 9 0 0 0 24 18 C 24 12 15 3 15 3 Z" />
                </svg>
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-sm leading-tight">Donate & Request</h4>
              <p className="text-[10px] text-indigo-100 font-medium">Be there for others. And let others be there for you.</p>
            </div>
          </div>

          {/* How Request Works (Right Pipeline) */}
          <div className="bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 p-6 rounded-3xl shadow-lg space-y-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white border-b border-slate-100 dark:border-dark-800 pb-3 flex items-center gap-2">
              <span className="bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 p-1.5 rounded-lg flex items-center justify-center"><Search className="w-4 h-4" /></span>
              How Request Works
            </h3>

            <div className="space-y-4">
              {[
                { step: '1', title: 'Create Request', desc: 'Fill request details and submit.', icon: BookOpen, color: 'text-rose-500 bg-rose-50 border-rose-200' },
                { step: '2', title: 'Find Donors', desc: 'We show eligible donors near you.', icon: Users, color: 'text-indigo-500 bg-indigo-50 border-indigo-200' },
                { step: '3', title: 'Contact Donor', desc: 'Chat or call the donor instantly.', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
                { step: '4', title: 'Get Help', desc: 'Donor confirms and helps you.', icon: Check, color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
                { step: '5', title: 'Stay Safe', desc: 'You get the blood you need.', icon: ShieldCheck, color: 'text-red-500 bg-red-50 border-red-200 fill-current' }
              ].map((s, idx) => (
                <div key={idx} className="flex gap-4 items-center group relative">
                  {/* Connector vertical line */}
                  {idx < 4 && (
                    <div className="w-[2px] h-10 bg-slate-100 dark:bg-dark-800 absolute left-6 top-10 -z-10"></div>
                  )}
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0 shadow">
                    {s.step}
                  </span>
                  <div className={`p-2 border rounded-2xl flex items-center justify-center shrink-0 w-10 h-10 ${s.color}`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition-colors">{s.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* 5. Trust Footprint Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Verified Donors', desc: 'Only verified donors can help.', bg: 'bg-emerald-50/60 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', icon: ShieldCheck },
            { label: '100% Secure', desc: 'Your data is safe with us.', bg: 'bg-indigo-50/60 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-400', icon: Shield },
            { label: 'Real-time Support', desc: 'We are here 24/7 for you.', bg: 'bg-purple-50/60 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/40', text: 'text-purple-700 dark:text-purple-400', icon: Phone },
            { label: 'Every Drop Counts', desc: 'Your donation can save up to 3 lives.', bg: 'bg-rose-50/60 dark:bg-rose-950/10 border-rose-100 dark:border-rose-900/40', text: 'text-rose-700 dark:text-rose-400', icon: Heart },
            { label: 'Stronger Together', desc: 'A community that cares.', bg: 'bg-amber-50/60 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/40', text: 'text-amber-700 dark:text-amber-400', icon: HeartHandshake }
          ].map((c, idx) => (
            <div key={idx} className={`p-5 rounded-2xl border text-center space-y-2 hover:shadow-md transition-shadow duration-300 ${c.bg}`}>
              <div className={`p-2.5 rounded-full inline-flex items-center justify-center shrink-0 bg-white dark:bg-dark-900 shadow-sm ${c.text}`}>
                <c.icon className="w-5 h-5" />
              </div>
              <h4 className={`font-black text-sm ${c.text}`}>{c.label}</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Dynamic Donor locator search block (India state, dist, mandal cascading picker) */}
      <section id="search-donors" className="max-w-4xl mx-auto px-4 scroll-mt-20">
        <div className="p-8 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">Proximity Search Engine</span>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Search Local Verified Donors</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Filter instantly using country-wide regional cascading dropdown layers.</p>
          </div>

          <form onSubmit={handleSearch} className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
              <select
                value={selectedState}
                onChange={handleStateChange}
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none dark:text-white"
              >
                <option value="">Select State</option>
                {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">District</label>
              <select
                value={selectedDistrict}
                onChange={handleDistrictChange}
                disabled={!selectedState}
                required
                className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-50 focus:ring-2 focus:ring-rose-500 focus:outline-none dark:text-white"
              >
                <option value="">Select District</option>
                {Object.keys(STATES_DATA[selectedState] || {}).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none dark:text-white"
              >
                <option value="">All Groups</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-3 mt-2">
              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-lg shadow-md hover:shadow-rose-600/20 transition-all duration-300 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                <Search className="w-5 h-5" /> Find Nearby Donors
              </button>
            </div>
          </form>

          <AnimatePresence>
            {searchRun && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-slate-100 dark:border-dark-800 pt-6 space-y-4"
              >
                <h4 className="font-extrabold text-sm text-slate-500">Matching Volunteers:</h4>
                {foundDonors.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {foundDonors.map((d, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={idx}
                        className="p-4 bg-slate-50 dark:bg-dark-800/40 rounded-2xl border border-slate-100 dark:border-dark-800 flex justify-between items-center"
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-800 dark:text-slate-100">{d.fullName}</p>
                            {d.aiScore !== undefined && (
                              <span className="px-2 py-0.5 text-[9px] font-black bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full shadow-sm">
                                AI Match: {d.aiScore}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" /> {d.city} • <span className="text-emerald-500 font-extrabold">{d.availabilityStatus || 'Available'}</span>
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                          <span className="px-3 py-1 text-xs font-black bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full">{d.bloodGroup}</span>
                          <div className="flex gap-2">
                            {/* Contact/Call Button */}
                            <a
                              href={token && user ? `tel:${d.phone}` : '#'}
                              onClick={(e) => {
                                if (!token || !user) {
                                  e.preventDefault();
                                  alert("Please log in to contact or chat with verified platform donors.");
                                  navigate("/login");
                                }
                              }}
                              className="p-1.5 px-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                              title="Call Donor"
                            >
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                            {/* Chat Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!token || !user) {
                                  alert("Please log in to contact or chat with verified platform donors.");
                                  navigate("/login");
                                } else {
                                  handleInitiateChat(d._id);
                                }
                              }}
                              className="p-1.5 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1"
                              title="Chat with Donor"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Chat
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-rose-500 font-bold">No active donors matched this specific filter. Try broadening your criteria.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 7. Live analytics charts section */}
      <section id="impact" className="max-w-5xl mx-auto px-4 space-y-8 scroll-mt-20">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full">Live Stats Database</span>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Active Platform Impact</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Synchronized analytics monitoring regional healthcare logs.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.map((s, idx) => (
            <div key={idx} className="p-6 bg-white dark:bg-dark-900 border border-slate-100 dark:border-dark-800 rounded-2xl text-center shadow-sm hover:shadow transition-shadow">
              <p className={`text-3xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-[11px] text-slate-500 font-extrabold uppercase mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {Array.isArray(chartData) && chartData.length > 0 && chartData.some((d) => d && (d.Stock > 0 || d.Required > 0)) ? (
          <div className="p-6 bg-white dark:bg-dark-900 border border-slate-150 dark:border-dark-800 rounded-3xl shadow-lg">
            <h3 className="font-extrabold text-sm mb-6 text-center text-slate-600 dark:text-slate-400 uppercase tracking-widest">Hospital Inventory vs Pending Requests</h3>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="group" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="Stock" fill="#EF4444" radius={[4, 4, 0, 0]} name="Registered Hospital Stock" />
                  <Bar dataKey="Required" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Open Request Units" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500 font-semibold py-8">No hospital inventory or open requests registered yet.</p>
        )}
      </section>

      {/* 8. Blood Compatibility Table */}
      <section id="compatibility" className="max-w-5xl mx-auto px-4 space-y-6 scroll-mt-20">
        <h2 className="text-2xl font-black text-center text-slate-800 dark:text-white">Blood Compatibility Index</h2>
        <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-dark-800 shadow-md">
          <table className="w-full text-left text-sm bg-white dark:bg-dark-900">
            <thead className="bg-slate-50 dark:bg-dark-800 text-slate-700 dark:text-slate-300 font-black border-b border-slate-200 dark:border-dark-800 uppercase text-xs">
              <tr>
                <th className="p-4">Blood Group</th>
                <th className="p-4">Can Give Blood To</th>
                <th className="p-4">Can Receive Blood From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {COMPATIBILITY_DATA.map((row) => (
                <tr key={row.group} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition-colors">
                  <td className="p-4 font-black text-rose-500">{row.group}</td>
                  <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{row.canGiveTo}</td>
                  <td className="p-4 text-xs font-semibold text-slate-600 dark:text-slate-300">{row.canReceiveFrom}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. Referral Rewards */}
      <section id="referrals" className="max-w-5xl mx-auto px-4 scroll-mt-20">
        <div className="p-8 bg-gradient-to-r from-rose-600 to-indigo-600 rounded-3xl text-white grid md:grid-cols-2 gap-8 items-center shadow-xl">
          <div className="space-y-4">
            <h2 className="text-3xl font-black">Refer Friends, Save Lives</h2>
            <p className="text-xs text-rose-100 leading-relaxed font-semibold">
              Use your unique referral link to invite friends. Gain 100 reward points and unlock exclusive bronze lifesaver badges when they register and make their first donation!
            </p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                <Award className="w-4 h-4 text-yellow-300" /> Bronze Lifesaver
              </div>
              <div className="flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                <Share2 className="w-4 h-4 text-emerald-300" /> Invite Code Enabled
              </div>
            </div>
          </div>
          <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-rose-200">Your Referral Reward</p>
            <p className="text-4xl font-black">+100 Points</p>
            <p className="text-[11px] text-white/80 font-medium">Credited instantly for every volunteer account registered via your code.</p>
          </div>
        </div>
      </section>


      {/* 9. Gallery Section */}
      <section id="gallery" className="max-w-5xl mx-auto px-4 space-y-12 scroll-mt-20">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-500 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 rounded-full">Interactive Showcase</span>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Lifesaver Media Gallery</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Explore donation drives, motivational quotes, and certified clinical setups.</p>
        </div>

        {/* Categories Tab selector */}
        <div className="flex justify-center gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All Media' },
            { id: 'drives', label: 'Donation Drives' },
            { id: 'quotes', label: 'Quotes & Inspiration' },
            { id: 'clinical', label: 'Clinical Screens' }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setGalleryCategory(cat.id)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all border ${galleryCategory === cat.id
                ? 'bg-rose-600 border-rose-600 text-white shadow-md'
                : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleryItems.filter(item => galleryCategory === 'all' || item.category === galleryCategory).map((item, idx) => (
            <motion.div
              layout
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="group relative h-64 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-2xl transition-all duration-500 animate-fade-in"
            >
              {/* Image */}
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />

              {/* Glassmorphic Overlay Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-6 flex flex-col justify-end text-white opacity-90 group-hover:opacity-100 transition-opacity">
                {item.category === 'quotes' ? (
                  <div className="space-y-2 text-center p-3 bg-black/45 backdrop-blur-sm border border-white/10 rounded-2xl">
                    <p className="text-sm font-black italic tracking-wide">"{item.desc}"</p>
                    <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-widest bg-rose-600 rounded-full inline-block">Motivation</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${item.category === 'drives' ? 'bg-emerald-600' : 'bg-indigo-600'
                      }`}>
                      {item.category === 'drives' ? 'Camp Drive' : 'Logistics'}
                    </span>
                    <h4 className="font-extrabold text-sm leading-snug">{item.title}</h4>
                    <p className="text-[10px] text-slate-350 leading-relaxed font-semibold">{item.desc}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 10. Founders Block */}
      <section id="founders" className="max-w-5xl mx-auto px-4 space-y-12 scroll-mt-20">
        <div className="text-center space-y-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-full">Leadership & Vision</span>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white">Founders & Key Architects</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pioneering healthcare delivery systems for Indian regions.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {FOUNDERS.map((f, idx) => (
            <div key={idx} className="p-8 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-xl flex flex-col sm:flex-row gap-6 items-center text-center sm:text-left hover:scale-[1.01] hover:shadow-2xl transition-all duration-300">
              <img src={f.image} alt={f.name} className="w-24 h-24 rounded-full border-4 border-rose-500 shadow-md shrink-0 object-cover" />
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">{f.name}</h3>
                  <p className="text-xs font-extrabold text-rose-600 uppercase tracking-wider">{f.role}</p>
                </div>
                <p className="text-xs text-slate-500 italic">"{f.bio}"</p>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-dark-800 text-[10px]">
                  <div>
                    <span className="font-black text-rose-500 block">Vision:</span>
                    <p className="text-slate-500 font-semibold">{f.vision}</p>
                  </div>
                  <div>
                    <span className="font-black text-rose-500 block">Mission:</span>
                    <p className="text-slate-500 font-semibold">{f.mission}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>



      {/* 12. FAQ Section */}
      <section id="faq" className="max-w-3xl mx-auto px-4 space-y-8 scroll-mt-20">
        <h2 className="text-2xl font-black text-center text-slate-800 dark:text-white">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {[
            { q: 'Is donating blood safe?', a: 'Yes, blood donation is fully sterile and safe. A brand-new needle is opened for every single session.' },
            { q: 'How often can I donate blood?', a: 'Every 90 days (approx. 3 months) for healthy adult male and female donors.' },
            { q: 'How does ONEDROP filter location without Google Maps?', a: 'We employ a local, custom hierarchical database structure storing States, Districts, and Cities to allow map-free cascading proximity queries.' }
          ].map((item, idx) => (
            <div key={idx} className="border-b border-slate-100 dark:border-dark-800 pb-4">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full flex justify-between items-center py-2 text-left font-black text-slate-800 dark:text-slate-200 focus:outline-none text-sm"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${activeFaq === idx ? 'transform rotate-180 text-rose-500' : ''}`} />
              </button>
              {activeFaq === idx && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed font-semibold">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 13. Contact Feedback sheet */}
      <section id="contact" className="max-w-md mx-auto px-4 scroll-mt-20">
        <div className="p-8 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-xl space-y-6">
          <h2 className="text-2xl font-black text-center text-slate-800 dark:text-white">Contact & Feedback</h2>

          <form className="space-y-4" onSubmit={handleFeedbackSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="name@domain.com"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Message</label>
              <textarea
                rows="4"
                required
                placeholder="Write your question..."
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-white"
              />
            </div>
            <button type="submit" className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-dark-800 dark:hover:bg-dark-700 text-white font-extrabold rounded-lg text-xs transition-all uppercase tracking-wider">
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* 13. Footer Section */}
      <footer className="bg-white dark:bg-dark-900 border-t border-slate-200 dark:border-slate-800 pt-16 pb-24 md:pb-12 text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-rose-600 dark:text-rose-500 fill-current" viewBox="0 0 100 50">
                <path d="M 30,10 C 15,10 5,20 5,30 C 5,42 20,48 30,48 C 45,48 50,30 55,20 C 60,10 75,5 85,15 C 95,25 95,40 85,45 C 75,50 65,42 60,35 C 55,27 45,10 30,10 Z" />
              </svg>
              <span className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">Rakt<span className="text-rose-600">setu</span></span>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              Connecting lives through real-time, peer-to-peer blood donation networks. Utilizing smart proximity location matching to prevent regional shortages across India.
            </p>
            <div className="flex items-center gap-3">
              <a href="#" className="p-2 bg-slate-50 dark:bg-dark-800 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition border border-slate-100 dark:border-slate-800"><Share2 className="w-4 h-4" /></a>
              <a href="mailto:support@onedrop.org" className="p-2 bg-slate-50 dark:bg-dark-800 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition border border-slate-100 dark:border-slate-800"><Mail className="w-4 h-4" /></a>
              <a href="tel:+918500508940" className="p-2 bg-slate-50 dark:bg-dark-800 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition border border-slate-100 dark:border-slate-800"><Phone className="w-4 h-4" /></a>
            </div>
          </div>

          {/* Quick Links Col */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-widest">Ecosystem Links</h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li><button onClick={() => handleLandingNav('home')} className="hover:text-rose-600 transition">Portal Home</button></li>
              <li><button onClick={() => handleLandingNav('requests')} className="hover:text-rose-600 transition">Browse Requests</button></li>
              <li><Link to="/register" className="hover:text-rose-600 transition">Register as Donor</Link></li>
              <li><Link to="/login" className="hover:text-rose-600 transition">Submit Emergency Ticket</Link></li>
            </ul>
          </div>

          {/* Clinical Compatibility Col */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-widest">Compatibility Basics</h4>
            <ul className="space-y-2 text-[11px] leading-relaxed font-semibold">
              <li><span className="text-rose-600 font-extrabold">O- Negative:</span> Universal donor. Can give to all blood groups.</li>
              <li><span className="text-indigo-600 font-extrabold">AB+ Positive:</span> Universal recipient. Can receive from all blood groups.</li>
              <li><span className="text-emerald-600 font-extrabold">Real-time alerts:</span> PWA notification push channels ensure instant matching logs.</li>
            </ul>
          </div>

          {/* Leadership Col */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-widest">Leadership Team</h4>
            <div className="space-y-3 text-[11px] font-semibold">
              <div className="flex items-center gap-2 animate-fade-in">
                <img src="/jagadeeswar.png" alt="Devagudi Jagadeeswar Reddy" className="w-7 h-7 rounded-full object-cover border border-rose-500 shadow-sm shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Devagudi Jagadeeswar Reddy</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase">Founder & CEO</p>
                </div>
              </div>
              <div className="flex items-center gap-2 animate-fade-in">
                <img src="/chinmaya.png" alt="Patnam Chinmaya Nanda" className="w-7 h-7 rounded-full object-cover border border-rose-500 shadow-sm shrink-0" />
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">Patnam Chinmaya Nanda</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase">Co-Founder & CTO</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright ribbon */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 border-t border-slate-100 dark:border-dark-800 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold">
          <p>© {new Date().getFullYear()} ONEDROP - Connecting Lives.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-rose-600 transition">Privacy Policy</a>
            <a href="#" className="hover:text-rose-600 transition">Terms of Service</a>
            <a href="#founders" className="hover:text-rose-600 transition">Key Architects</a>
          </div>
        </div>
      </footer>

      <AiChatAssistant
        title="ONEDROP AI Assistant"
        welcome="Hello! Ask me how to find donors, enable push alerts, or start a secure chat when a blood request is matched."
      />

      {/* Mobile home navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 dark:bg-dark-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 py-2 px-4 flex justify-around print:hidden animate-slide-up">
        {[
          { id: 'home', label: 'Home', icon: Heart },
          { id: 'requests', label: 'Search', icon: Search },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'profile', label: user ? 'Dashboard' : 'Login', icon: user ? Users : LogIn }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleLandingNav(item.id)}
              className="flex flex-col items-center gap-1.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 transition-all hover:scale-110 active:scale-95"
            >
              <Icon className="w-7 h-7 text-slate-600 dark:text-slate-300" />
              {item.label}
            </button>
          );
        })}
      </nav>

    </div>
  );
};

export default LandingPage;
