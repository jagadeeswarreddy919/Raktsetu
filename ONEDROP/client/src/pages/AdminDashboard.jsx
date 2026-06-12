import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, Users, Activity, FileText, Database, ShieldAlert, Award, 
  BrainCircuit, TrendingUp, Download, Heart, Megaphone, Calendar, MapPin, 
  Gift, RefreshCw, BarChart2, Plus, Trash2, Key, Info, Check, X, AlertTriangle, Play, Hospital, Image,
  Globe, Search, Phone, MessageSquare, Menu, Home
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area } from 'recharts';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { STATES_DATA } from '../utils/statesData';

const AdminDashboard = () => {
  const { token } = useSelector((state) => state.auth);

  // Core telemetry lists
  const [metrics, setMetrics] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [blogsList, setBlogsList] = useState([]);

  // Active UI Navigation state
  const [activePanel, setActivePanel] = useState('Analytics Dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoader, setActionLoader] = useState(false);

  // AI Predictor Tab State
  const [foreState, setForeState] = useState('Karnataka');
  const [foreMonth, setForeMonth] = useState(new Date().getMonth() + 1);
  const [foreInventory, setForeInventory] = useState(25);
  const [foreDemand, setForeDemand] = useState(40);
  const [predictionResult, setPredictionResult] = useState(null);
  const [forecastingLoader, setForecastingLoader] = useState(false);

  // Modals / Selection States
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showBlogModal, setShowBlogModal] = useState(false);
  const [selectedUserRewards, setSelectedUserRewards] = useState(null);
  const [selectedHospitalInventory, setSelectedHospitalInventory] = useState(null);

  // Platform Registry Directory Search
  const [registrySearchQuery, setRegistrySearchQuery] = useState('');

  // AI Fraud scan states
  const [fraudScanning, setFraudScanning] = useState(false);
  const [fraudReports, setFraudReports] = useState([]);
  const [fraudScanned, setFraudScanned] = useState(false);

  // Create Campaign Form State
  const [campTitle, setCampTitle] = useState('');
  const [campDesc, setCampDesc] = useState('');
  const [campStartDate, setCampStartDate] = useState('');
  const [campEndDate, setCampEndDate] = useState('');
  const [campLocName, setCampLocName] = useState('');
  const [campState, setCampState] = useState('');
  const [campDistrict, setCampDistrict] = useState('');
  const [campCity, setCampCity] = useState('');
  const [campPincode, setCampPincode] = useState('');
  const [campBanner, setCampBanner] = useState('');

  // Create Blog Form State
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const [blogTags, setBlogTags] = useState('');
  const [blogCover, setBlogCover] = useState('');

  // Notification Broadcast Form State
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastRole, setBroadcastRole] = useState('All');
  const [broadcastBloodGroup, setBroadcastBloodGroup] = useState('All');
  const [broadcastCity, setBroadcastCity] = useState('');
  const [broadcastState, setBroadcastState] = useState('');
  const [broadcastDonorStatus, setBroadcastDonorStatus] = useState('All');
  const [broadcastLogs, setBroadcastLogs] = useState([]);

  // Dynamic Gallery Management State
  const [galleryList, setGalleryList] = useState([]);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryTitle, setGalleryTitle] = useState('');
  const [galleryCategory, setGalleryCategory] = useState('drives');
  const [galleryDesc, setGalleryDesc] = useState('');
  const [galleryImage, setGalleryImage] = useState('');

  // Global Telemetry Fetcher
  const loadSystemTelemetry = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch administrative metrics summary
      const metricsRes = await axios.get(`${API_URL}/api/admin/metrics`, { headers });
      setMetrics(metricsRes.data);

      // Fetch absolute users list
      const usersRes = await axios.get(`${API_URL}/api/admin/users`, { headers });
      setUsersList(usersRes.data);

      // Fetch blood assist tickets
      const requestsRes = await axios.get(`${API_URL}/api/requests`, { headers });
      setRequestsList(requestsRes.data);

      // Fetch donation camp campaigns
      const campaignsRes = await axios.get(`${API_URL}/api/campaigns`, { headers });
      setCampaignsList(campaignsRes.data);

      // Fetch CMS blogs
      const blogsRes = await axios.get(`${API_URL}/api/blogs`, { headers });
      setBlogsList(blogsRes.data);

      // Fetch Gallery Items
      const galleryRes = await axios.get(`${API_URL}/api/gallery`);
      setGalleryList(galleryRes.data);

      // Fetch admin notification logs
      const logsRes = await axios.get(`${API_URL}/api/admin/notification-logs`, { headers });
      setBroadcastLogs(logsRes.data);

    } catch (err) {
      console.error('Error fetching administrative telemetry', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSystemTelemetry(true); // Initial mount full-page load

      const interval = setInterval(() => {
        loadSystemTelemetry(false); // Seamless 1-second background refreshes
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [token]);

  // Operations Control Actions
  const handlePredictShortage = async (e) => {
    e.preventDefault();
    setForecastingLoader(true);
    setPredictionResult(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/api/admin/predict-shortage`, {
        month: parseInt(foreMonth),
        state: foreState,
        currentInventory: parseInt(foreInventory),
        prevMonthDemand: parseInt(foreDemand)
      }, { headers });
      setPredictionResult(res.data);
    } catch (err) {
      console.error(err);
      alert('Shortage forecast request failed.');
    } finally {
      setForecastingLoader(false);
    }
  };

  const toggleDonorVerification = async (donorId, currentVal) => {
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/verify/donor/${donorId}`, { isVerified: !currentVal }, { headers });
      alert('Donor verification status updated.');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const toggleHospitalVerification = async (hospitalId, currentVal) => {
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/verify/hospital/${hospitalId}`, { isVerified: !currentVal }, { headers });
      alert('Hospital verification status updated.');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const toggleAccountSuspension = async (userId, currentStatus) => {
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      const nextStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
      await axios.put(`${API_URL}/api/admin/user/${userId}/status`, { status: nextStatus }, { headers });
      alert(`User status updated to ${nextStatus}.`);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const toggleRequestEmergencyMode = async (reqId, currentVal) => {
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/requests/${reqId}/emergency`, { emergencyMode: !currentVal }, { headers });
      alert('Emergency mode toggled.');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const updateBloodRequestStatus = async (reqId, nextStatus) => {
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/requests/${reqId}/status`, { status: nextStatus }, { headers });
      alert(`Request status updated to ${nextStatus}.`);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const dispatchBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/admin/broadcast`, {
        title: broadcastTitle,
        message: broadcastMessage,
        targetRole: broadcastRole,
        bloodGroup: broadcastBloodGroup,
        city: broadcastCity,
        state: broadcastState,
        availabilityStatus: broadcastDonorStatus
      }, { headers });
      alert('Notification broadcast successfully dispatched with filters.');
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastRole('All');
      setBroadcastBloodGroup('All');
      setBroadcastCity('');
      setBroadcastState('');
      setBroadcastDonorStatus('All');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to dispatch broadcast.');
    } finally {
      setActionLoader(false);
    }
  };

  // System Management Actions
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/campaigns`, {
        title: campTitle,
        description: campDesc,
        startDate: campStartDate,
        endDate: campEndDate,
        locationName: campLocName,
        state: campState,
        district: campDistrict,
        city: campCity,
        pincode: campPincode,
        bannerImage: campBanner || 'https://images.unsplash.com/photo-1615461066841-6116ecdacd04?auto=format&fit=crop&q=80&w=800'
      }, { headers });
      alert('Campaign drive successfully registered.');
      setShowCampaignModal(false);
      // Reset form
      setCampTitle('');
      setCampDesc('');
      setCampStartDate('');
      setCampEndDate('');
      setCampLocName('');
      setCampState('');
      setCampDistrict('');
      setCampCity('');
      setCampPincode('');
      setCampBanner('');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to establish donation camp.');
    } finally {
      setActionLoader(false);
    }
  };

  const handleDeleteCampaign = async (campId) => {
    if (!window.confirm('Are you sure you want to delete this donation drive?')) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/campaigns/${campId}`, { headers });
      alert('Campaign drive deleted successfully.');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const handleDeleteUser = async (userId, fullName) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${fullName}"? This action cannot be undone.`)) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, { headers });
      alert(`User "${fullName}" deleted successfully.`);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user account.');
    } finally {
      setActionLoader(false);
    }
  };

  const handleDeleteRequest = async (reqId, patientName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the blood request ticket for "${patientName}"? This action cannot be undone.`)) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/requests/${reqId}`, { headers });
      alert(`Request for "${patientName}" deleted successfully.`);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to delete blood request ticket.');
    } finally {
      setActionLoader(false);
    }
  };



  const handleUpdateRewards = async (e) => {
    e.preventDefault();
    if (!selectedUserRewards) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/user/${selectedUserRewards._id}/rewards`, {
        rewardPoints: selectedUserRewards.rewardPoints,
        badges: selectedUserRewards.badges
      }, { headers });
      alert('Rewards and badges successfully saved.');
      setSelectedUserRewards(null);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const handleUpdateHospitalInventory = async (e) => {
    e.preventDefault();
    if (!selectedHospitalInventory) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/hospital/${selectedHospitalInventory._id}/inventory`, {
        bloodInventory: selectedHospitalInventory.bloodInventory
      }, { headers });
      alert('Hospital inventory successfully updated.');
      setSelectedHospitalInventory(null);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  // CMS Blog Actions
  const handleCreateBlog = async (e) => {
    e.preventDefault();
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/blogs`, {
        title: blogTitle,
        content: blogContent,
        tags: blogTags ? blogTags.split(',').map(t => t.trim()) : [],
        coverImage: blogCover || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800'
      }, { headers });
      alert('Blog article published.');
      setShowBlogModal(false);
      setBlogTitle('');
      setBlogContent('');
      setBlogTags('');
      setBlogCover('');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to publish article.');
    } finally {
      setActionLoader(false);
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog article?')) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/admin/blogs/${blogId}`, { headers });
      alert('Blog article deleted.');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  const handleCreateGalleryItem = async (e) => {
    e.preventDefault();
    if (!galleryTitle || !galleryDesc || !galleryImage) {
      alert('All fields are required.');
      return;
    }
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/api/gallery`, {
        title: galleryTitle,
        category: galleryCategory,
        desc: galleryDesc,
        image: galleryImage
      }, { headers });
      alert('Gallery item published successfully.');
      setShowGalleryModal(false);
      setGalleryTitle('');
      setGalleryCategory('drives');
      setGalleryDesc('');
      setGalleryImage('');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to publish gallery item.');
    } finally {
      setActionLoader(false);
    }
  };

  const handleDeleteGalleryItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this gallery item?')) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/api/gallery/${itemId}`, { headers });
      alert('Gallery item removed successfully.');
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
      alert('Failed to remove gallery item.');
    } finally {
      setActionLoader(false);
    }
  };

  // Advanced Permissions Action
  const updateUserRole = async (userId, nextRole) => {
    if (!window.confirm(`Elevate/change this user's role authorization to ${nextRole}?`)) return;
    try {
      setActionLoader(true);
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`${API_URL}/api/admin/user/${userId}/role`, { role: nextRole }, { headers });
      alert(`User role authorization updated successfully to ${nextRole}.`);
      loadSystemTelemetry();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoader(false);
    }
  };

  // Client-Side AI Fraud Scan Checks
  const runAIFraudScanner = () => {
    setFraudScanning(true);
    setFraudReports([]);
    
    setTimeout(() => {
      const reports = [];
      const emailMap = {};
      const phoneMap = {};
      const locationMap = {};

      const disposableDomains = ['mailinator.com', 'tempmail.com', 'trashmail.com', 'yopmail.com', 'dispostable.com', 'temp-mail.org'];

      usersList.forEach(user => {
        const issues = [];
        let riskScore = 0; // out of 100

        // 1. Email check
        const domain = user.email.split('@')[1];
        if (disposableDomains.includes(domain)) {
          issues.push('Registered using a suspicious/disposable email provider.');
          riskScore += 45;
        }

        // 2. Duplicate phone checking
        if (user.phone) {
          const cleanedPhone = user.phone.replace(/[^0-9]/g, '');
          if (phoneMap[cleanedPhone]) {
            phoneMap[cleanedPhone].push(user.fullName);
            issues.push(`Shares identical phone contacts (${user.phone}) with: ${phoneMap[cleanedPhone].slice(0, -1).join(', ')}.`);
            riskScore += 35;
          } else {
            phoneMap[cleanedPhone] = [user.fullName];
          }
        }

        // 3. Location sharing checks (Multiple users in same detailed address)
        if (user.address && user.address !== 'N/A' && user.address.length > 5) {
          const cleanAddr = user.address.trim().toLowerCase();
          if (locationMap[cleanAddr]) {
            locationMap[cleanAddr].push(user.fullName);
            issues.push(`Shares identical street address location parameters with: ${locationMap[cleanAddr].slice(0, -1).join(', ')}.`);
            riskScore += 25;
          } else {
            locationMap[cleanAddr] = [user.fullName];
          }
        }

        // 4. Missing parameters
        if (!user.phone || user.phone === 'N/A') {
          issues.push('Missing essential phone communication channels.');
          riskScore += 15;
        }

        if (issues.length > 0) {
          reports.push({
            user,
            issues,
            riskScore: Math.min(riskScore, 100),
            severity: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low'
          });
        }
      });

      reports.sort((a, b) => b.riskScore - a.riskScore);
      setFraudReports(reports);
      setFraudScanning(false);
      setFraudScanned(true);
    }, 1500);
  };

  // CSV Registry Backup Downloader
  const exportToCSV = () => {
    if (!usersList || usersList.length === 0) {
      alert("No user records available to export.");
      return;
    }
    const headers = [
      "Full Name", "Email Address", "Phone Number", "Role", "Account Status",
      "State", "District", "City", "Pincode", "Address", "Blood Group",
      "Availability Status", "Hospital License Number", "Donor Verified",
      "Hospital Verified", "Referral Code", "Reward Points", "Registered Date"
    ];
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      let stringVal = String(val);
      stringVal = stringVal.replace(/"/g, '""');
      return `"${stringVal}"`;
    };
    const rows = usersList.map(usr => [
      escapeCSV(usr.fullName),
      escapeCSV(usr.email),
      escapeCSV(usr.phone || 'N/A'),
      escapeCSV(usr.role),
      escapeCSV(usr.status || 'Active'),
      escapeCSV(usr.state),
      escapeCSV(usr.district),
      escapeCSV(usr.city),
      escapeCSV(usr.pincode),
      escapeCSV(usr.address || 'N/A'),
      escapeCSV(usr.bloodGroup || 'N/A'),
      escapeCSV(usr.availabilityStatus || 'N/A'),
      escapeCSV(usr.hospitalLicenseNumber || 'N/A'),
      escapeCSV(usr.isVerifiedDonor ? 'Yes' : 'No'),
      escapeCSV(usr.isVerifiedHospital ? 'Yes' : 'No'),
      escapeCSV(usr.referralCode || 'N/A'),
      escapeCSV(usr.rewardPoints || 0),
      escapeCSV(usr.createdAt ? new Date(usr.createdAt).toLocaleString() : 'N/A')
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `onedrop_platform_registry_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper counters
  const totalDonors = (usersList || []).filter(u => u.role === 'Donor').length;
  const totalHospitals = (usersList || []).filter(u => u.role === 'Hospital').length;
  const totalRecipients = (usersList || []).filter(u => u.role === 'Recipient').length;
  const totalAdmins = (usersList || []).filter(u => u.role === 'Admin' || u.role === 'Super Admin').length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-32 flex flex-col justify-center items-center space-y-4">
        <RefreshCw className="w-16 h-16 text-primary-500 animate-spin" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Synchronizing Platform Command Center...</h3>
        <p className="text-xs text-slate-500">Querying real-time Mongoose documents and analytical modules.</p>
      </div>
    );
  }

  // Navigation Panel Arrays
  const menuTiers = [
    {
      title: 'First Tier: Operations',
      items: [
        { name: 'Analytics Dashboard', icon: BarChart2, color: 'text-primary-500' },
        { name: 'Emergency Control Room', icon: Heart, color: 'text-rose-500' },
        { name: 'User Verification', icon: ShieldCheck, color: 'text-emerald-500' },
        { name: 'Platform Registry', icon: Globe, color: 'text-blue-500' },
        { name: 'Notification Center', icon: Megaphone, color: 'text-amber-500' }
      ]
    },
    {
      title: 'Second Tier: System',
      items: [
        { name: 'Campaign System', icon: Calendar, color: 'text-sky-500' },
        { name: 'Reward Management', icon: Award, color: 'text-violet-500' },
        { name: 'Hospital Management', icon: Hospital, color: 'text-teal-500' },
        { name: 'Referral Analytics', icon: Gift, color: 'text-indigo-500' }
      ]
    },
    {
      title: 'Third Tier: Security',
      items: [
        { name: 'AI Fraud Detection', icon: BrainCircuit, color: 'text-pink-500' },
        { name: 'CMS', icon: FileText, color: 'text-cyan-500' },
        { name: 'Manage Gallery', icon: Image, color: 'text-rose-500' },
        { name: 'Advanced Permissions', icon: Key, color: 'text-orange-500' },
        { name: 'System Monitoring', icon: Database, color: 'text-emerald-600' }
      ]
    }
  ];

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Enterprise Title Block */}
      <div className="p-4 sm:p-8 bg-slate-900 text-white rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl -z-10"></div>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-all shadow-sm flex-shrink-0"
          >
            <Menu className="w-5.5 h-5.5" />
          </button>
          <div className="min-w-0">
            <span className="px-3.5 py-1 text-[10px] font-black uppercase tracking-wider bg-primary-500 text-white rounded-full">Secure Enterprise Controller</span>
            <h1 className="text-xl sm:text-3xl font-black mt-2 tracking-tight truncate max-w-[250px] sm:max-w-none">ONEDROP Command Center</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl truncate">Supervise emergency blood lifelines, ML models, security permissions, and platform registers.</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg hover:shadow-emerald-900/30 active:scale-95 w-full md:w-auto justify-center"
        >
          <Download className="w-4 h-4" /> Export User CSV Backup
        </button>
      </div>

      {/* Mobile Tab Scroll Selector (Hidden on mobile, side navigation / bottom nav used instead) */}
      <div className="hidden">
        {menuTiers.flatMap(tier => tier.items).map((item) => {
          const IconComp = item.icon;
          const isActive = activePanel === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActivePanel(item.name)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                isActive 
                  ? 'bg-rose-600 border-rose-600 text-white shadow-md' 
                  : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <IconComp className="w-4 h-4 flex-shrink-0" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mt-10">
        
        {/* Navigation Sidebar Panel */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          {menuTiers.map((tier, tIdx) => (
            <div key={tIdx} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-[10px] font-black tracking-widest text-slate-400 uppercase border-b pb-2 dark:border-slate-800">{tier.title}</h4>
              <nav className="flex flex-col gap-1">
                {tier.items.map((item) => {
                  const IconComp = item.icon;
                  const isActive = activePanel === item.name;
                  return (
                    <button
                      key={item.name}
                      onClick={() => setActivePanel(item.name)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all relative ${
                        isActive 
                          ? 'bg-slate-100 dark:bg-dark-800 text-slate-800 dark:text-white ring-1 ring-slate-200 dark:ring-slate-800 shadow-sm' 
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-800/30'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${item.color}`} />
                      <span>{item.name}</span>
                      {isActive && <div className="absolute right-3 w-1.5 h-1.5 bg-primary-500 rounded-full" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Dashboard Dynamic View Panel */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* TAB 1: Analytics Dashboard */}
          {activePanel === 'Analytics Dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black">Analytical Telemetry Summary</h2>
                  <p className="text-xs text-slate-500">Live platform totals across core database registers.</p>
                </div>
              </div>

              {/* Counters */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Volunteers Registered', val: totalDonors, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-950/20' },
                  { label: 'Hospitals Linked', val: totalHospitals, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
                  { label: 'Recipients Served', val: totalRecipients, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                  { label: 'Admins Active', val: totalAdmins, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20' }
                ].map((card, idx) => (
                  <div key={idx} className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-center relative overflow-hidden">
                    <p className="text-4xl font-black text-slate-800 dark:text-white leading-none">{card.val}</p>
                    <p className={`text-[10px] font-black uppercase tracking-wider mt-2 ${card.color}`}>{card.label}</p>
                    <div className={`absolute top-0 right-0 w-2 h-full ${card.color.replace('text', 'bg')}`} />
                  </div>
                ))}
              </div>

              {/* Predictor deficits engine inline callout */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-lg border border-slate-800 grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 space-y-2">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-primary-600 rounded">Deficit Forecaster Defenses</span>
                  <h3 className="font-bold text-lg flex items-center gap-2"><BrainCircuit className="text-primary-500 animate-pulse" /> Deficit Forecaster ML Simulator</h3>
                  <p className="text-[11px] text-slate-400">Apply state, month, inventory levels and previous metrics demand to simulate Deficits.</p>
                </div>
                <button
                  onClick={() => setActivePanel('System Monitoring')}
                  className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 font-bold text-xs rounded-xl text-center transition-all"
                >
                  Predict Deficit Now
                </button>
              </div>

              {/* Distribution Charts */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">Volunteers Registered by State</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics?.stateDonors || []}>
                        <XAxis dataKey="_id" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                  <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">Active Blood Requests Tickets by State</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics?.stateRequests || []}>
                        <XAxis dataKey="_id" stroke="#888888" fontSize={10} tickLine={false} />
                        <YAxis stroke="#888888" fontSize={10} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Emergency Control Room */}
          {activePanel === 'Emergency Control Room' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Emergency Control Registry</h2>
                <p className="text-xs text-slate-500">Monitor regional blood requests, trigger emergency modes, or dispatch cancel/resolve actions.</p>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-dark-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Patient details</th>
                      <th className="p-4">Required Parameters</th>
                      <th className="p-4">Hospital Details</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Status & Level</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requestsList.length > 0 ? (
                      requestsList.map((req) => (
                        <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 dark:text-white">{req.patientName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">By: {req.requester?.fullName || 'N/A'}</p>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 font-black rounded text-[10px]">{req.bloodGroup}</span>
                            <span className="ml-2 font-semibold text-slate-600 dark:text-slate-400">{req.unitsRequired} Units</span>
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-slate-700 dark:text-slate-300">{req.hospitalName}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Needed: {new Date(req.neededBy).toLocaleDateString()}</p>
                          </td>
                          <td className="p-4 text-slate-500">{req.city}, {req.state}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                                req.status === 'Fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                                req.status === 'Cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {req.status}
                              </span>
                              {req.emergencyMode ? (
                                <span className="flex items-center gap-1 text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded animate-pulse w-fit border border-rose-200">
                                  <ShieldAlert className="w-3 h-3" /> EMERGENCY
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400">Standard Ticket</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right space-y-1.5">
                            <button
                              onClick={() => toggleRequestEmergencyMode(req._id, req.emergencyMode)}
                              className={`px-2 py-1 text-[10px] font-black uppercase rounded block w-full text-center transition-all ${
                                req.emergencyMode 
                                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                                  : 'bg-rose-600 text-white hover:bg-rose-500'
                              }`}
                            >
                              {req.emergencyMode ? 'Set Standard' : 'Set Emergency'}
                            </button>
                            {req.status === 'Pending' && (
                              <button
                                onClick={() => updateBloodRequestStatus(req._id, 'Cancelled')}
                                className="px-2 py-1 bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700 text-[10px] font-bold uppercase rounded block w-full text-center transition-all"
                              >
                                Cancel Request
                              </button>
                            )}
                            {req.status === 'Fulfilled' && (
                              <button
                                onClick={() => handleDeleteRequest(req._id, req.patientName)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold uppercase rounded block w-full text-center transition-all flex items-center justify-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete Request
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center p-12 text-slate-400 font-semibold">No active blood request tickets in database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: User Verification */}
          {activePanel === 'User Verification' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Volunteers & Clinics Verification Gate</h2>
                <p className="text-xs text-slate-500">Approve licensing flags for newly registered clinical hospitals and donor groups.</p>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-dark-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Email / Contacts</th>
                      <th className="p-4">Designation Role</th>
                      <th className="p-4">Location Coordinates</th>
                      <th className="p-4">Credentials & Verification status</th>
                      <th className="p-4 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usersList.map((usr) => (
                      <tr key={usr._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                        <td className="p-4 font-bold">{usr.fullName}</td>
                        <td className="p-4 text-slate-500">
                          <div>{usr.email}</div>
                          <div className="text-[10px] mt-0.5">{usr.phone || 'N/A'}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded font-black text-[10px] ${
                            usr.role === 'Hospital' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' :
                            usr.role === 'Donor' ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600' :
                            usr.role === 'Recipient' ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-600' : 'bg-slate-50 text-slate-500'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500">{usr.city}, {usr.state}</td>
                        <td className="p-4">
                          {usr.role === 'Hospital' && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-mono">Lic: {usr.hospitalLicenseNumber || 'Pending'}</span>
                              <div className="text-[11px]">
                                {usr.isVerifiedHospital ? (
                                  <span className="text-emerald-600 font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> License Verified</span>
                                ) : (
                                  <span className="text-amber-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Awaiting Review</span>
                                )}
                              </div>
                            </div>
                          )}
                          {usr.role === 'Donor' && (
                            <div>
                              {usr.isVerifiedDonor ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-1 text-[11px]"><ShieldCheck className="w-3.5 h-3.5" /> Profile Verified</span>
                              ) : (
                                <span className="text-slate-400 font-bold flex items-center gap-1 text-[11px]"><X className="w-3.5 h-3.5" /> Not Verified</span>
                              )}
                            </div>
                          )}
                          {usr.role !== 'Donor' && usr.role !== 'Hospital' && <span className="text-slate-400">N/A</span>}
                        </td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          {usr.role === 'Donor' && (
                            <button
                              onClick={() => toggleDonorVerification(usr._id, usr.isVerifiedDonor)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                usr.isVerifiedDonor 
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                            >
                              {usr.isVerifiedDonor ? 'Revoke Profile' : 'Verify Profile'}
                            </button>
                          )}
                          {usr.role === 'Hospital' && (
                            <button
                              onClick={() => toggleHospitalVerification(usr._id, usr.isVerifiedHospital)}
                              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                                usr.isVerifiedHospital 
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' 
                                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
                              }`}
                            >
                              {usr.isVerifiedHospital ? 'Revoke License' : 'Verify License'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(usr._id, usr.fullName)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Notification Center */}
          {activePanel === 'Notification Center' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Global Administrative Dispatch Center</h2>
                <p className="text-xs text-slate-500">Compile message templates and broadcast emergency announcements directly to active roles with advanced filters.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 items-start">
                {/* Form Card */}
                <div className="md:col-span-1 p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Broadcast Controls</h3>
                  <form onSubmit={dispatchBroadcast} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Target Audience Group</label>
                      <select
                        value={broadcastRole}
                        onChange={(e) => setBroadcastRole(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      >
                        <option value="All">All Platform Users (All Roles)</option>
                        <option value="Donor">Active Blood Donors Only</option>
                        <option value="Recipient">Registered Blood Recipients Only</option>
                        <option value="Hospital">Verified Hospitals & Clinics Only</option>
                      </select>
                    </div>

                    {broadcastRole === 'Donor' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Blood Group</label>
                          <select
                            value={broadcastBloodGroup}
                            onChange={(e) => setBroadcastBloodGroup(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                          >
                            <option value="All">All Blood Groups</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Donor Availability Status</label>
                          <select
                            value={broadcastDonorStatus}
                            onChange={(e) => setBroadcastDonorStatus(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                          >
                            <option value="All">All Statuses</option>
                            <option value="Available">Available</option>
                            <option value="Busy">Busy</option>
                            <option value="Not Available">Not Available</option>
                            <option value="Emergency Only">Emergency Only</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Target City</label>
                        <input
                          type="text"
                          placeholder="e.g. Tirupati"
                          value={broadcastCity}
                          onChange={(e) => setBroadcastCity(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Target State</label>
                        <input
                          type="text"
                          placeholder="e.g. Andhra Pradesh"
                          value={broadcastState}
                          onChange={(e) => setBroadcastState(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Announcement Message Title</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 🚨 High Deficit Alert near Tirupati"
                        value={broadcastTitle}
                        onChange={(e) => setBroadcastTitle(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Message Body Content</label>
                      <textarea
                        required
                        rows="4"
                        placeholder="Compile notification details to push live..."
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoader}
                      className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                    >
                      <Megaphone className="w-4 h-4" /> {actionLoader ? 'Dispersing Broadcast...' : 'Dispatch Broadcast Alert'}
                    </button>
                  </form>
                </div>

                {/* Logs Table Card */}
                <div className="md:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-widest text-slate-400 border-b pb-2">Broadcast Delivery Logs</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-dark-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="p-3">Title & Message</th>
                          <th className="p-3">Target Filters</th>
                          <th className="p-3">Deliveries</th>
                          <th className="p-3">Sender</th>
                          <th className="p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {broadcastLogs.length > 0 ? (
                          broadcastLogs.map((log) => (
                            <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                              <td className="p-3">
                                <p className="font-bold text-slate-800 dark:text-white">{log.title}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{log.message}</p>
                              </td>
                              <td className="p-3 text-[10px] text-slate-500">
                                <div>Role: <span className="font-semibold">{log.targetRole}</span></div>
                                {log.targetRole === 'Donor' && (
                                  <>
                                    <div>Group: <span className="font-semibold">{log.bloodGroup}</span></div>
                                    <div>Status: <span className="font-semibold">{log.donorStatusFilter}</span></div>
                                  </>
                                )}
                                {(log.locationFilter?.city || log.locationFilter?.state) && (
                                  <div>Loc: <span className="font-semibold">{[log.locationFilter.city, log.locationFilter.state].filter(Boolean).join(', ')}</span></div>
                                )}
                              </td>
                              <td className="p-3 font-bold text-rose-600">{log.successCount} users</td>
                              <td className="p-3 text-slate-400">{log.sentBy?.fullName || 'Admin'}</td>
                              <td className="p-3 text-slate-400 text-[10px]">{new Date(log.createdAt).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="5" className="text-center p-8 text-slate-400 italic">No broadcast logs recorded.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Campaign System */}
          {activePanel === 'Campaign System' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black">Platform Donation Campaigns Hub</h2>
                  <p className="text-xs text-slate-500">Track donation camps, register new camps, and review organizers parameters.</p>
                </div>
                <button
                  onClick={() => setShowCampaignModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Establish Donation Drive
                </button>
              </div>

              {/* Campaigns list */}
              <div className="grid md:grid-cols-3 gap-6">
                {campaignsList.length > 0 ? (
                  campaignsList.map((camp) => (
                    <div key={camp._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden flex flex-col justify-between">
                      {camp.bannerImage && (
                        <img src={camp.bannerImage} alt={camp.title} className="w-full h-32 object-cover" />
                      )}
                      <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                        <div className="space-y-2">
                          <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded text-[9px] font-black uppercase tracking-wider">{camp.status}</span>
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-snug">{camp.title}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-3">{camp.description}</p>
                        </div>

                        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                          <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-primary-500" /> {new Date(camp.startDate).toLocaleDateString()} - {new Date(camp.endDate).toLocaleDateString()}</div>
                          <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-indigo-500" /> {camp.locationName}, {camp.city}</div>
                          <div className="flex items-center gap-1.5 font-bold"><Hospital className="w-3.5 h-3.5 text-emerald-500" /> Org: {camp.organizer?.fullName || 'Platform Admin'}</div>
                        </div>

                        <button
                          onClick={() => handleDeleteCampaign(camp._id)}
                          className="w-full mt-2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Purge Drive Camp
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-3 text-center p-12 text-slate-400 font-semibold">No donation campaign camps cataloged.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Reward Management */}
          {activePanel === 'Reward Management' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Volunteer Leaderboard & Rewards</h2>
                <p className="text-xs text-slate-500">Verify user reward points collections, credit volunteer credentials, and award lifesaver badges.</p>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-dark-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">Volunteer User</th>
                      <th className="p-4">Role Classification</th>
                      <th className="p-4">Referral Invitation Total</th>
                      <th className="p-4">Reward Points Wallet</th>
                      <th className="p-4">Unlocked Badges Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usersList.map((usr) => (
                      <tr key={usr._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                        <td className="p-4">
                          <p className="font-bold">{usr.fullName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{usr.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-600">{usr.role}</span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-600 dark:text-slate-400">{usr.totalReferrals || 0} Invites</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 rounded font-black text-[10px]">⭐ {usr.rewardPoints || 0} pts</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {usr.badges && usr.badges.length > 0 ? (
                              usr.badges.map((badge, bIdx) => (
                                <span key={bIdx} className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 border border-indigo-150 rounded text-[9px] font-semibold">{badge}</span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No Badges Unlocked</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setSelectedUserRewards({ ...usr })}
                            className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all shadow-sm"
                          >
                            Manage Rewards
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: Hospital Management */}
          {activePanel === 'Hospital Management' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Hospitals Clinical Stock & Registry</h2>
                <p className="text-xs text-slate-500">Edit clinical details, evaluate licenses, and update hospital blood inventories directly.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {(usersList || []).filter(u => u.role === 'Hospital').map((hosp) => (
                  <div key={hosp._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{hosp.fullName}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">License ID: {hosp.hospitalLicenseNumber || 'Unassigned'}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                        hosp.isVerifiedHospital ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600'
                      }`}>
                        {hosp.isVerifiedHospital ? 'Verified clinic' : 'Pending verification'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 space-y-1 bg-slate-50 dark:bg-dark-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <div><span className="font-semibold text-slate-600">Location:</span> {hosp.address}, {hosp.city}, {hosp.state}</div>
                      <div><span className="font-semibold text-slate-600">Contacts:</span> {hosp.phone} | {hosp.email}</div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventory Status (Units)</p>
                      <div className="grid grid-cols-4 gap-2">
                        {Object.entries(hosp.bloodInventory || {}).map(([gp, val]) => (
                          <div key={gp} className="p-2 bg-slate-50 dark:bg-dark-800 border border-slate-100 dark:border-slate-700/50 rounded-xl text-center">
                            <span className="block text-[10px] font-black text-rose-600">{gp}</span>
                            <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">{val} U</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedHospitalInventory({ ...hosp })}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all text-center"
                    >
                      Override Blood Inventory Stocks
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: Referral Analytics */}
          {activePanel === 'Referral Analytics' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Referral Analytics & Platform Growth</h2>
                <p className="text-xs text-slate-500">Track invite counts, referral codes distribution, and registered growth curves.</p>
              </div>

              {/* Area Growth Chart */}
              <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4">Platform User Registrations Cumulative growth</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={
                      usersList.slice().reverse().map((u, index) => ({
                        date: new Date(u.createdAt).toLocaleDateString(),
                        Users: index + 1
                      }))
                    }>
                      <XAxis dataKey="date" stroke="#888888" fontSize={9} tickLine={false} />
                      <YAxis stroke="#888888" fontSize={9} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="Users" stroke="#6366F1" fill="#EEF2FF" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Invite Log Registry */}
              <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-widest mb-4 border-b pb-2 dark:border-slate-800">Referrals Invitations & Rewards log</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b dark:border-slate-800">
                        <th className="pb-3 font-semibold">User Inviter</th>
                        <th className="pb-3 font-semibold">Assigned Referral Code</th>
                        <th className="pb-3 font-semibold">Invitation list</th>
                        <th className="pb-3 font-semibold">Total invites</th>
                        <th className="pb-3 font-semibold text-right">Referral Reward Wallet</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(usersList || []).filter(u => u.referralCode).map((u) => (
                        <tr key={u._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                          <td className="py-3 font-bold">{u.fullName}</td>
                          <td className="py-3 font-mono font-semibold text-slate-600 dark:text-slate-400">{u.referralCode}</td>
                          <td className="py-3 text-slate-400 max-w-xs truncate">
                            {u.referralHistory && u.referralHistory.length > 0 ? (
                              <span>Referred: {u.referralHistory.map(h => h.referredUser?.fullName || 'New User').join(', ')}</span>
                            ) : (
                              <span className="italic text-[11px]">No Invitation registered</span>
                            )}
                          </td>
                          <td className="py-3 font-bold font-mono">{u.totalReferrals || 0} Invites</td>
                          <td className="py-3 text-right font-bold text-amber-600">⭐ {u.rewardPoints || 0} pts</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: AI Fraud Detection */}
          {activePanel === 'AI Fraud Detection' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-md">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-pink-600 rounded">Security Shield Engine</span>
                  <h3 className="font-bold text-lg flex items-center gap-2"><BrainCircuit className="text-pink-500 animate-pulse" /> Platform Fraud Check Scanner</h3>
                  <p className="text-[11px] text-slate-400">Evaluate registrations for duplicate telephones, disposable domains, and location clusters.</p>
                </div>
                <button
                  onClick={runAIFraudScanner}
                  disabled={fraudScanning}
                  className="px-5 py-3 bg-pink-600 hover:bg-pink-500 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 uppercase"
                >
                  <RefreshCw className={`w-4 h-4 ${fraudScanning ? 'animate-spin' : ''}`} /> {fraudScanning ? 'Scanning DB...' : 'Initiate AI Scan'}
                </button>
              </div>

              {fraudScanning && (
                <div className="text-center p-12 space-y-3">
                  <RefreshCw className="w-10 h-10 text-pink-500 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Checking database consistency schemas and telemetry overlaps...</p>
                </div>
              )}

              {fraudScanned && !fraudScanning && (
                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 text-xs font-semibold">
                    ✅ Scanning Completed. Evaluated {usersList.length} accounts. Flagged {fraudReports.length} suspicious registrations.
                  </div>

                  <div className="space-y-4">
                    {fraudReports.length > 0 ? (
                      fraudReports.map((report, idx) => (
                        <div key={idx} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-2 flex-grow">
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                report.severity === 'High' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40' :
                                report.severity === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {report.severity} RISK ({report.riskScore}%)
                              </span>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-white">{report.user.fullName}</h4>
                            </div>
                            
                            <div className="text-xs text-slate-500 space-y-1">
                              <p><span className="font-semibold">Email:</span> {report.user.email} | <span className="font-semibold">Phone:</span> {report.user.phone}</p>
                              <p><span className="font-semibold">Location:</span> {report.user.city}, {report.user.state}</p>
                            </div>

                            <div className="space-y-1 bg-rose-50/40 dark:bg-rose-950/10 p-3 rounded-2xl border border-rose-100/50 dark:border-rose-950/40">
                              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Flag Reasons</p>
                              {report.issues.map((iss, iIdx) => (
                                <p key={iIdx} className="text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5 mt-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" /> {iss}
                                </p>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 shrink-0 w-full md:w-fit">
                            <button
                              onClick={() => toggleAccountSuspension(report.user._id, report.user.status)}
                              className={`w-full px-4 py-2 rounded-xl text-xs font-bold text-center transition-all ${
                                report.user.status === 'Suspended'
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/10'
                              }`}
                            >
                              {report.user.status === 'Suspended' ? 'Re-Activate Account' : 'Suspend Account'}
                            </button>
                            <button
                              onClick={() => {
                                setFraudReports(prev => prev.filter(r => r.user._id !== report.user._id));
                                alert('Fraud flag dismissed for this session.');
                              }}
                              className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all text-center"
                            >
                              Dismiss Alert Flag
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-12 text-slate-400 font-semibold bg-white dark:bg-dark-900 rounded-3xl border">
                        🎉 Database scan complete. No potential fraud registers flagged.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 10: CMS */}
          {activePanel === 'CMS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black">CMS Platform Articles</h2>
                  <p className="text-xs text-slate-500">Edit, add, or delete blog articles published on the general public hub.</p>
                </div>
                <button
                  onClick={() => setShowBlogModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Create Blog Post
                </button>
              </div>

              {/* Blogs audit list */}
              <div className="grid md:grid-cols-2 gap-6">
                {blogsList.length > 0 ? (
                  blogsList.map((blog) => (
                    <div key={blog._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        {blog.coverImage && (
                          <img src={blog.coverImage} alt={blog.title} className="w-full h-36 object-cover rounded-2xl" />
                        )}
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-snug">{blog.title}</h4>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{blog.content}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Author: {blog.author?.fullName || 'System Admin'}</span>
                          <span>Published: {new Date(blog.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteBlog(blog._id)}
                          className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Purge Article
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="md:col-span-2 text-center p-12 text-slate-400 font-semibold">No CMS articles published.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB: Manage Gallery */}
          {activePanel === 'Manage Gallery' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black">Landing Page Gallery Manager</h2>
                  <p className="text-xs text-slate-500">Add, view, or remove filterable media assets showcased on the public landing page gallery.</p>
                </div>
                <button
                  onClick={() => setShowGalleryModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Gallery Asset
                </button>
              </div>

              {/* Gallery Items Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {galleryList.length > 0 ? (
                  galleryList.map((item) => (
                    <div key={item._id || item.title} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        {item.image && (
                          <img src={item.image} alt={item.title} className="w-full h-36 object-cover rounded-2xl" />
                        )}
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white leading-snug">{item.title}</h4>
                          <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full ${
                            item.category === 'drives' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                            item.category === 'quotes' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400' :
                            'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400'
                          }`}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">{item.desc}</p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => handleDeleteGalleryItem(item._id)}
                          className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Purge Asset
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="lg:col-span-3 text-center p-12 text-slate-400 font-semibold bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                    No gallery assets found. Default assets are loaded on the main landing page.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 11: Advanced Permissions */}
          {activePanel === 'Advanced Permissions' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Advanced Permissions Switcher</h2>
                <p className="text-xs text-slate-500">Direct adjustments of database role authorizations. Exercise extreme caution.</p>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-900 shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-dark-800/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Authorization Role</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Permissions Toggle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {usersList.map((usr) => (
                      <tr key={usr._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                        <td className="p-4 font-bold">{usr.fullName}</td>
                        <td className="p-4 font-mono text-slate-500">{usr.email}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            usr.role === 'Super Admin' || usr.role === 'Admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' :
                            usr.role === 'Hospital' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {usr.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            usr.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {usr.status || 'Active'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <select
                            value={usr.role}
                            onChange={(e) => updateUserRole(usr._id, e.target.value)}
                            className="p-1.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold outline-none"
                          >
                            <option value="Donor">Donor</option>
                            <option value="Recipient">Recipient</option>
                            <option value="Hospital">Hospital</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 12: System Monitoring */}
          {activePanel === 'System Monitoring' && (
            <div className="space-y-8 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">System Monitoring & Telemetry</h2>
                <p className="text-xs text-slate-500">Live CPU, memory dials, ML Shortage Predictor, and full system Audit Trails.</p>
              </div>

              {/* Predictor deficits forms */}
              <div className="grid md:grid-cols-3 gap-8">
                <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-6">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-primary-100 dark:bg-primary-950/40 text-primary-600 rounded">ML Engine Simulator</span>
                    <h3 className="font-bold text-md flex items-center gap-2"><BrainCircuit className="text-primary-500" /> Deficit Forecaster</h3>
                  </div>

                  <form onSubmit={handlePredictShortage} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">State Region</label>
                      <select
                        value={foreState}
                        onChange={(e) => setForeState(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      >
                        {[
                          'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
                          'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
                          'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
                          'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
                          'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
                          'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
                        ].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Month</label>
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={foreMonth}
                        onChange={(e) => setForeMonth(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Current Stock (Units)</label>
                      <input
                        type="number"
                        min="0"
                        value={foreInventory}
                        onChange={(e) => setForeInventory(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Prev Month Demand (Units)</label>
                      <input
                        type="number"
                        min="0"
                        value={foreDemand}
                        onChange={(e) => setForeDemand(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={forecastingLoader}
                      className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                      {forecastingLoader ? 'Forecasting...' : 'Run Deficit Simulator'}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2 p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex flex-col justify-between">
                  {predictionResult ? (
                    <div className="space-y-4 flex-grow flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-widest">Prediction Results Output</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Forecast for {foreState} (Month {foreMonth})</p>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                          predictionResult.predicted_shortage > 30 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {predictionResult.predicted_shortage > 30 ? 'High Deficit Risk' : 'Normal Stock'}
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-dark-850 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <p className="text-2xl font-black text-slate-850 dark:text-white">
                            {predictionResult.predicted_shortage} <span className="text-xs font-semibold text-slate-400">Units deficit expected</span>
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{predictionResult.message}</p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-primary-500" />
                      </div>

                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Stock Available', units: parseInt(foreInventory), fill: '#10B981' },
                            { name: 'Prev Demand', units: parseInt(foreDemand), fill: '#3B82F6' },
                            { name: 'Predicted Deficit', units: predictionResult.predicted_shortage, fill: '#EF4444' }
                          ]}>
                            <XAxis dataKey="name" fontSize={9} />
                            <YAxis fontSize={9} />
                            <Bar dataKey="units">
                              <Cell fill="#10B981" />
                              <Cell fill="#3B82F6" />
                              <Cell fill="#EF4444" />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-grow flex flex-col items-center justify-center text-slate-400 gap-2 p-12">
                      <BrainCircuit className="w-12 h-12 text-slate-350 animate-pulse" />
                      <p className="text-xs font-semibold">Enter inputs on left to run AI shortage defecit calculator.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Hardware Dials Telemetry */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'CPU Usage', val: '4.8 %', status: 'Healthy', color: 'text-emerald-500' },
                  { label: 'System Memory', val: '242 MB', status: 'Optimal', color: 'text-emerald-500' },
                  { label: 'DB Connections', val: 'MongoDB: OK', status: 'Connected', color: 'text-emerald-500' },
                  { label: 'Telemetry Status', val: 'Online', status: 'Active Sockets', color: 'text-emerald-500' }
                ].map((dial, dIdx) => (
                  <div key={dIdx} className="p-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                    <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">{dial.label}</p>
                    <p className="text-xl font-black text-slate-800 dark:text-white mt-1">{dial.val}</p>
                    <p className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${dial.color}`}><Check className="w-3.5 h-3.5" /> {dial.status}</p>
                  </div>
                ))}
              </div>

              {/* Audit Trails Logs */}
              <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <h3 className="font-bold text-xs text-slate-450 uppercase tracking-widest mb-4 border-b pb-2 dark:border-slate-800">Recent Command Center Action Audit Logs</h3>
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="text-slate-450 border-b dark:border-slate-800 pb-2">
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3">Action logged</th>
                        <th className="pb-3">Operator Executed</th>
                        <th className="pb-3 text-right">Details Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {metrics?.logs?.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/10">
                          <td className="py-2.5 text-slate-400">{new Date(log.createdAt).toLocaleString()}</td>
                          <td className="py-2.5 font-bold text-slate-700 dark:text-slate-300">{log.action}</td>
                          <td className="py-2.5 text-[11px]">{log.performedBy?.fullName || 'SYSTEM OPERATION'} ({log.performedBy?.role || 'SYSTEM'})</td>
                          <td className="py-2.5 text-right text-[10px] text-slate-400 max-w-xs truncate">{JSON.stringify(log.details || {})}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PLATFORM REGISTRY DIRECTORY (Admin-only) */}
          {activePanel === 'Platform Registry' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-xl font-black">Platform Registry Directory</h2>
                <p className="text-xs text-slate-500">Search all registered donors, hospitals, and recipients. Contact them directly via call or WhatsApp.</p>
              </div>

              {/* Search Box */}
              <div className="p-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-sm flex items-center gap-2"><Users className="text-primary-500 w-5 h-5" /> Active Platform Members</h3>
                    <p className="text-[10px] text-slate-400">Showing {usersList.filter(u => {
                      const q = registrySearchQuery.toLowerCase();
                      if (!q) return true;
                      return u.fullName?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q) || (u.city && u.city.toLowerCase().includes(q)) || (u.bloodGroup && u.bloodGroup.toLowerCase().includes(q));
                    }).length} of {usersList.length} total members</p>
                  </div>
                  <div className="w-full max-w-xs relative">
                    <input
                      type="text"
                      placeholder="Search by name, role, city, blood group..."
                      value={registrySearchQuery}
                      onChange={(e) => setRegistrySearchQuery(e.target.value)}
                      className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none text-slate-800 dark:text-slate-300"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* User Cards Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {usersList.filter(u => {
                  const q = registrySearchQuery.toLowerCase();
                  if (!q) return true;
                  return u.fullName?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q) || (u.city && u.city.toLowerCase().includes(q)) || (u.bloodGroup && u.bloodGroup.toLowerCase().includes(q));
                }).length > 0 ? (
                  usersList.filter(u => {
                    const q = registrySearchQuery.toLowerCase();
                    if (!q) return true;
                    return u.fullName?.toLowerCase().includes(q) || u.role?.toLowerCase().includes(q) || (u.city && u.city.toLowerCase().includes(q)) || (u.bloodGroup && u.bloodGroup.toLowerCase().includes(q));
                  }).map((item) => (
                    <div key={item._id} className="p-5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800/50 rounded-2xl flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.profileImage || `https://api.dicebear.com/7.x/adventurer/svg?seed=${item.fullName}`}
                          alt={item.fullName}
                          className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200 dark:border-slate-700"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-extrabold text-xs">{item.fullName}</h5>
                            <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-wider ${
                              item.role === 'Donor' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' : item.role === 'Hospital' ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/20 dark:text-primary-400' : item.role === 'Recipient' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400'
                            }`}>
                              {item.role}
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">{item.city || 'Regional'}, {item.state || 'India'}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] bg-slate-50 dark:bg-dark-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/40">
                        <div>
                          <span className="text-slate-400 text-[10px]">Blood Group</span>
                          <p className="font-black text-primary-500">{item.bloodGroup || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Status</span>
                          <p className={`font-extrabold ${item.status === 'Suspended' ? 'text-rose-500' : 'text-emerald-500'}`}>{item.status || 'Active'}</p>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px]">Availability</span>
                          <p className="font-extrabold text-slate-700 dark:text-slate-300">{item.availabilityStatus || 'Available'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        {item.phone && (
                          <a
                            href={`tel:${item.phone}`}
                            className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold rounded-lg text-[10px] transition text-center flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" /> Call
                          </a>
                        )}
                        {item.phone && (() => {
                          let ph = item.phone.trim().replace(/\s+/g, '');
                          if (!ph.startsWith('+')) ph = ph.length === 10 ? `91${ph}` : ph;
                          else ph = ph.replace('+', '');
                          return (
                            <a
                              href={`https://wa.me/${ph}?text=${encodeURIComponent(`Hi ${item.fullName}, contacting you from ONEDROP Admin regarding blood donation coordination.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold rounded-lg text-[10px] transition flex items-center justify-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.556 4.116 1.527 5.849L.057 23.929a.5.5 0 0 0 .609.61l6.185-1.456A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.892a9.87 9.87 0 0 1-5.017-1.374l-.36-.213-3.73.877.906-3.633-.234-.374A9.877 9.877 0 0 1 2.108 12C2.108 6.534 6.534 2.108 12 2.108S21.892 6.534 21.892 12 17.466 21.892 12 21.892z"/></svg>
                              WA
                            </a>
                          );
                        })()}
                        <div className="flex-1 py-2 bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-slate-400 font-bold rounded-lg text-[10px] text-center flex items-center justify-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" /> {item.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300" />
                    <p className="text-xs mt-2 font-bold">No active platform members match your search criteria.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* CAMPAIGN DIALOG POPUP MODAL */}
      {showCampaignModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-850">
              <h3 className="font-black text-base flex items-center gap-2"><Calendar className="text-primary-500" /> Establish Blood Donation Camp</h3>
              <button onClick={() => setShowCampaignModal(false)} className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-700 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Annual Spring Mega Drive Camp"
                  value={campTitle}
                  onChange={(e) => setCampTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Camp Drive Description</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide parameters and donation criteria..."
                  value={campDesc}
                  onChange={(e) => setCampDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={campStartDate}
                    onChange={(e) => setCampStartDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={campEndDate}
                    onChange={(e) => setCampEndDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Location Name / Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Public Hall"
                  value={campLocName}
                  onChange={(e) => setCampLocName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">State</label>
                  <select
                    required
                    value={campState}
                    onChange={(e) => { setCampState(e.target.value); setCampDistrict(''); setCampCity(''); }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  >
                    <option value="">Select State</option>
                    {Object.keys(STATES_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">District</label>
                  <select
                    required
                    disabled={!campState}
                    value={campDistrict}
                    onChange={(e) => { setCampDistrict(e.target.value); setCampCity(''); }}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none disabled:opacity-50"
                  >
                    <option value="">Select District</option>
                    {campState && Object.keys(STATES_DATA[campState]).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">City</label>
                  <select
                    required
                    disabled={!campDistrict}
                    value={campCity}
                    onChange={(e) => setCampCity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none disabled:opacity-50"
                  >
                    <option value="">Select City</option>
                    {campState && campDistrict && STATES_DATA[campState][campDistrict].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Pincode</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 560001"
                    value={campPincode}
                    onChange={(e) => setCampPincode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 mb-1">Banner Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="Provide image link..."
                    value={campBanner}
                    onChange={(e) => setCampBanner(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoader}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                {actionLoader ? 'Registering Camp Drive...' : 'Establish Camp Drive'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BLOG CMS MODAL */}
      {showBlogModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-850">
              <h3 className="font-black text-base flex items-center gap-2"><FileText className="text-primary-500" /> Publish CMS Article</h3>
              <button onClick={() => setShowBlogModal(false)} className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-700 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateBlog} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Article Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Science Behind Blood Regenerative Lifespans"
                  value={blogTitle}
                  onChange={(e) => setBlogTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Article Content</label>
                <textarea
                  required
                  rows="6"
                  placeholder="Draft article details..."
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Tags (Comma Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Science, Health, LifeSaving"
                  value={blogTags}
                  onChange={(e) => setBlogTags(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Cover Image Link URL</label>
                <input
                  type="text"
                  placeholder="Provide photo URL..."
                  value={blogCover}
                  onChange={(e) => setBlogCover(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoader}
                className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                {actionLoader ? 'Publishing...' : 'Publish Article'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LANDING PAGE GALLERY MODAL */}
      {showGalleryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3 dark:border-slate-850">
              <h3 className="font-black text-base flex items-center gap-2"><Image className="text-rose-500" /> Add Gallery Asset</h3>
              <button onClick={() => setShowGalleryModal(false)} className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 dark:hover:bg-dark-700 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateGalleryItem} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 mb-1">Asset Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Donation Camp Ahmedabad"
                  value={galleryTitle}
                  onChange={(e) => setGalleryTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Asset Category</label>
                <select
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                >
                  <option value="drives">Donation Drives (drives)</option>
                  <option value="quotes">Quotes & Inspiration (quotes)</option>
                  <option value="clinical">Clinical Screens (clinical)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Asset Description</label>
                <textarea
                  required
                  rows="4"
                  placeholder="e.g. Over 250 units collected at our state-level corporate donation camp."
                  value={galleryDesc}
                  onChange={(e) => setGalleryDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Image URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. https://images.unsplash.com/photo-..."
                  value={galleryImage}
                  onChange={(e) => setGalleryImage(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={actionLoader}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                {actionLoader ? 'Adding...' : 'Add Gallery Asset'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE REWARDS MODAL */}
      {selectedUserRewards && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-sm flex items-center gap-2"><Award className="text-amber-500" /> Manage Volunteer Rewards</h3>
              <button onClick={() => setSelectedUserRewards(null)} className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateRewards} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-dark-800 rounded-2xl text-[11px] text-slate-500">
                <div><span className="font-bold text-slate-600">User:</span> {selectedUserRewards.fullName}</div>
                <div><span className="font-bold text-slate-600">Role:</span> {selectedUserRewards.role}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-1">Override Reward Points</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={selectedUserRewards.rewardPoints}
                  onChange={(e) => setSelectedUserRewards({ ...selectedUserRewards, rewardPoints: parseInt(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-500 mb-2">Award Badges</label>
                <div className="space-y-2 bg-slate-50 dark:bg-dark-800 p-4 rounded-2xl border">
                  {['First Invite', 'Life Saver', 'Bronze Lifesaver', 'Gold Lifesaver', 'Century Club'].map((badge) => {
                    const hasBadge = selectedUserRewards.badges?.includes(badge);
                    return (
                      <label key={badge} className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={hasBadge}
                          onChange={(e) => {
                            let nextBadges = selectedUserRewards.badges ? [...selectedUserRewards.badges] : [];
                            if (e.target.checked) {
                              if (!nextBadges.includes(badge)) nextBadges.push(badge);
                            } else {
                              nextBadges = nextBadges.filter(b => b !== badge);
                            }
                            setSelectedUserRewards({ ...selectedUserRewards, badges: nextBadges });
                          }}
                          className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                        />
                        <span>{badge}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoader}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                {actionLoader ? 'Saving changes...' : 'Save Rewards Parameters'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE HOSPITAL INVENTORY MODAL */}
      {selectedHospitalInventory && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-sm flex items-center gap-2"><Database className="text-teal-500" /> Override Blood Inventory</h3>
              <button onClick={() => setSelectedHospitalInventory(null)} className="p-1 bg-slate-50 hover:bg-slate-100 dark:bg-dark-800 rounded-full"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateHospitalInventory} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-dark-800 rounded-2xl text-[11px] text-slate-500">
                <div><span className="font-bold text-slate-600">Hospital:</span> {selectedHospitalInventory.fullName}</div>
                <div><span className="font-bold text-slate-600">License ID:</span> {selectedHospitalInventory.hospitalLicenseNumber}</div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3 bg-slate-50 dark:bg-dark-800 p-4 rounded-2xl border">
                {Object.entries(selectedHospitalInventory.bloodInventory || {}).map(([gp, val]) => (
                  <div key={gp} className="flex justify-between items-center gap-4">
                    <span className="font-black text-rose-600 w-12 text-sm">{gp}</span>
                    <input
                      type="number"
                      min="0"
                      value={val}
                      onChange={(e) => {
                        const nextInventory = { ...selectedHospitalInventory.bloodInventory, [gp]: parseInt(e.target.value) || 0 };
                        setSelectedHospitalInventory({ ...selectedHospitalInventory, bloodInventory: nextInventory });
                      }}
                      className="w-24 p-1.5 bg-white dark:bg-dark-900 border rounded-lg text-center font-bold"
                    />
                    <span className="text-slate-400 font-semibold w-16">Units</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={actionLoader}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                {actionLoader ? 'Updating inventories...' : 'Save Stock Inventory'}
              </button>
            </form>
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
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-white dark:bg-dark-900 shadow-2xl flex flex-col justify-between p-6 border-r border-slate-200 dark:border-slate-800 lg:hidden"
            >
              <div className="space-y-6 flex-grow flex flex-col min-h-0">
                <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Enterprise Console</span>
                    <h2 className="text-sm font-black text-slate-800 dark:text-slate-200">Command Center</h2>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-lg text-slate-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6 overflow-y-auto flex-grow scrollbar-none pr-1">
                  {menuTiers.map((tier, tIdx) => (
                    <div key={tIdx} className="space-y-2">
                      <h4 className="text-[9px] font-black tracking-widest text-slate-400 uppercase border-b pb-1 dark:border-slate-800">{tier.title}</h4>
                      <nav className="flex flex-col gap-1">
                        {tier.items.map((item) => {
                          const IconComp = item.icon;
                          const isActive = activePanel === item.name;
                          return (
                            <button
                              key={item.name}
                              onClick={() => {
                                setActivePanel(item.name);
                                setMobileMenuOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-[11px] font-bold transition-all ${
                                isActive 
                                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/20' 
                                  : 'hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : item.color}`} />
                              <span>{item.name}</span>
                            </button>
                          );
                        })}
                      </nav>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Footer User Badge */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center gap-3 flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-dark-800 flex items-center justify-center font-black text-primary-500 border-2 border-primary-500">
                  A
                </div>
                <div className="text-left text-xs truncate max-w-[140px]">
                  <p className="font-extrabold dark:text-slate-200">Super Administrator</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Root Control</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Bottom Nav for Mobile Devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-850 py-2 px-6 flex justify-around lg:hidden print:hidden">
        {[
          { id: 'main-home', label: 'Home', icon: Home, path: '/' },
          { id: 'Analytics Dashboard', label: 'Analytics', icon: BarChart2 },
          { id: 'Emergency Control Room', label: 'Emergency', icon: Heart },
          { id: 'User Verification', label: 'Verify', icon: ShieldCheck },
          { id: 'menu', label: 'Menu', icon: Menu, action: () => setMobileMenuOpen(true) }
        ].map((item) => {
          const ItemIcon = item.icon;
          const isActive = activePanel === item.id;

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
              onClick={() => setActivePanel(item.id)}
              className={`flex flex-col items-center gap-1 text-[10px] font-extrabold transition-all hover:scale-110 active:scale-95 ${isActive ? 'text-rose-600' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <ItemIcon className="w-5.5 h-5.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminDashboard;


