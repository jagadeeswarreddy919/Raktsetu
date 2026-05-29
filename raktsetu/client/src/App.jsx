import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { io } from 'socket.io-client';
import { logout } from './redux/authSlice';
import { Activity, MessageSquare, LogOut, Heart, Menu, X, Sun, Moon, Bell } from 'lucide-react';
import NotificationStack from './components/NotificationStack';
import { usePushNotifications } from './hooks/usePushNotifications';
import { buildGreetingMessage } from './utils/greeting';
import { requestFcmToken, saveFcmTokenToServer } from './utils/firebase';
import { playNotificationSound } from './utils/sound';
import { API_URL } from './utils/api';

// Page Imports
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DonorDashboard from './pages/DonorDashboard';
import RecipientDashboard from './pages/RecipientDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ChatWorkspace from './pages/ChatWorkspace';
import CampaignHub from './pages/CampaignHub';
import BlogHub from './pages/BlogHub';

// Theme controller utility
const ThemeToggle = () => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
      aria-label="Toggle dark mode"
    >
      {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-dark-800" />}
    </button>
  );
};

// Protected Route Shield
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Bespoke heartbeat blood-drop logo
const RaktsetuLogo = () => (
  <svg viewBox="0 0 24 24" className="w-8 h-8 text-primary-500 fill-current animate-pulse" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 4 10 4 15C4 19.4183 7.58172 23 12 23C16.4183 23 20 19.4183 20 15C20 10 12 2 12 2Z" fill="currentColor"/>
    <path d="M9 15H11.5L12.5 12L13.5 16L14.5 14H16.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const LANDING_SECTIONS = [
  { id: 'search-donors', label: 'Search' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'impact', label: 'Impact' },
  { id: 'compatibility', label: 'Compatibility' },
  { id: 'founders', label: 'Founders' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
];

// Main Navbar Component
const Navbar = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const showLandingSections = !isAuthenticated || !user;

  const handleLogout = () => {
    dispatch(logout());
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'Super Admin':
      case 'Admin': return '/admin';
      case 'Donor': return '/donor';
      case 'Recipient': return '/recipient';
      case 'Hospital': return '/hospital';
      default: return '/';
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/70 dark:bg-dark-950/70 backdrop-blur-md border-b border-dark-200/50 dark:border-dark-800/50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center space-x-2">
            <RaktsetuLogo />
            <Link to="/" className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-sans">
              RAKT<span className="text-primary-500">SETU</span>
            </Link>
          </div>

          {/* Desktop Nav Items */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors">Home</Link>

            {showLandingSections && LANDING_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`/#${section.id}`}
                className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors text-sm"
              >
                {section.label}
              </a>
            ))}

            {isAuthenticated && user && (
              <>
                <a href="/#gallery" className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors">Gallery</a>
                <Link to="/campaigns" className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors">Campaigns</Link>
                <Link to="/blogs" className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors">Articles</Link>
              </>
            )}

            {isAuthenticated && user && (
              <>
                <Link to={getDashboardLink()} className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors">Dashboard</Link>
                <Link to="/chat" className="text-slate-600 dark:text-slate-300 hover:text-primary-500 font-medium transition-colors flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" /> Chat
                </Link>
              </>
            )}

            <ThemeToggle />



            {isAuthenticated && user ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {user.profileImage ? (
                    <img src={user.profileImage} alt={user.fullName} className="w-8 h-8 rounded-full border border-primary-500" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-bold border border-primary-300">
                      {user.fullName ? user.fullName.charAt(0) : '?'}
                    </div>
                  )}
                  <span className="text-sm font-semibold dark:text-slate-200">{user.fullName}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-sm font-bold rounded-lg transition-all"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary-500 transition-colors">
                  Login
                </Link>
                <Link to="/register" className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-md hover:shadow-lg transition-all">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav content */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-slate-800 transition-all">
          <div className="px-2 pt-2 pb-4 space-y-1">
            <Link to="/" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Home</Link>

            {showLandingSections && LANDING_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`/#${section.id}`}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {section.label}
              </a>
            ))}

            {isAuthenticated && user && (
              <>
                <a href="/#gallery" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Gallery</a>
                <Link to="/campaigns" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Campaigns</Link>
                <Link to="/blogs" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Articles</Link>
              </>
            )}

            {isAuthenticated && user ? (
              <>
                <Link to={getDashboardLink()} onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Dashboard</Link>
                <Link to="/chat" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-base font-semibold rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Chat</Link>
                <button
                  onClick={() => { handleLogout(); setMenuOpen(false); }}
                  className="w-full text-left block px-3 py-2 text-base font-semibold rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col space-y-2 px-3">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="w-full text-center py-2 text-base font-semibold text-slate-700 dark:text-slate-300">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="w-full text-center py-2 text-base font-semibold text-white bg-primary-600 rounded-lg">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

const AppShell = () => {
  const [notifications, setNotifications] = useState([]);
  const [pushEnabled, setPushEnabled] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const socketRef = React.useRef(null);

  const triggerNotification = useCallback((notif) => {
    const entry = { ...notif, id: notif.id || Date.now() };
    setNotifications((prev) => [...prev, entry]);
    
    // Play our synthesized notification chime
    playNotificationSound();

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== entry.id));
    }, 8000);
  }, []);

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const { enablePush } = usePushNotifications(triggerNotification);

  const handleEnablePush = async () => {
    const fcmToken = await enablePush();
    if (fcmToken) {
      setPushEnabled(true);
      triggerNotification({
        id: Date.now(),
        title: 'Push notifications enabled',
        message: 'You will receive blood match alerts, greetings, and chat messages.',
        type: 'success'
      });
    }
  };

  useEffect(() => {
    const greeting = buildGreetingMessage(user?.fullName || 'Guest');
    const timer = setTimeout(() => {
      triggerNotification({
        id: 'landing-greeting',
        title: greeting.split(',')[0],
        message: greeting,
        type: 'success'
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) return;

    socketRef.current = io(API_URL);
    socketRef.current.emit('register', user._id);

    socketRef.current.on('greeting', (data) => {
      triggerNotification({
        id: Date.now(),
        title: data.title || 'Welcome',
        message: data.message,
        type: 'success'
      });
    });

    socketRef.current.on('chat_notification', (data) => {
      // Smart active-chat suppression
      const params = new URLSearchParams(window.location.search);
      const activeChatId = params.get('chatId');
      const activePartnerId = params.get('partnerId');
      if (window.location.pathname === '/chat' && (activeChatId === data.chatId || activePartnerId === data.senderId)) {
        return; // Suppress the notification toast as the user is actively viewing this conversation
      }

      triggerNotification({
        id: Date.now(),
        title: `💬 ${data.senderName || 'New message'}`,
        message: data.message,
        type: 'chat',
        chatPartnerId: data.senderId,
        chatId: data.chatId
      });
    });

    socketRef.current.on('new_blood_request', (data) => {
      if (user?.role !== 'Donor') return;
      triggerNotification({
        id: Date.now(),
        title: data.emergencyMode ? '🚨 Emergency blood match' : '🩸 New blood request',
        message: `${data.patientName} needs ${data.bloodGroup} at ${data.hospitalName}`,
        type: 'warning',
        requesterId: data.requesterId || data.requester,
        chatPartnerId: data.requesterId || data.requester
      });
    });

    socketRef.current.on('request_accepted', (data) => {
      if (user?.role !== 'Recipient') return;
      triggerNotification({
        id: Date.now(),
        title: '❤️ Request accepted',
        message: data.message || 'A donor accepted your blood request.',
        type: 'success',
        chatPartnerId: data.donorId || data.donor?._id,
        requesterId: data.donorId || data.donor?._id
      });
    });

    socketRef.current.on('admin_broadcast', (data) => {
      triggerNotification({
        id: Date.now(),
        title: data.title || '📢 Admin Broadcast',
        message: data.message,
        type: data.type || 'warning'
      });
    });

    return () => socketRef.current?.disconnect();
  }, [isAuthenticated, user?._id, user?.role, triggerNotification]);

  useEffect(() => {
    if (isAuthenticated && token && !pushEnabled) {
      requestFcmToken().then((fcm) => {
        if (fcm) saveFcmTokenToServer(fcm, token);
      });
    }
  }, [isAuthenticated, token, pushEnabled]);

  return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-dark-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route path="/campaigns" element={
              <ProtectedRoute>
                <CampaignHub />
              </ProtectedRoute>
            } />
            <Route path="/blogs" element={
              <ProtectedRoute>
                <BlogHub />
              </ProtectedRoute>
            } />

            {/* Dashboards secure checks */}
            <Route path="/donor" element={
              <ProtectedRoute allowedRoles={['Donor']}>
                <DonorDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/recipient" element={
              <ProtectedRoute allowedRoles={['Recipient']}>
                <RecipientDashboard />
              </ProtectedRoute>
            } />

            <Route path="/hospital" element={
              <ProtectedRoute allowedRoles={['Hospital']}>
                <HospitalDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['Admin', 'Super Admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/chat" element={
              <ProtectedRoute>
                <ChatWorkspace />
              </ProtectedRoute>
            } />

            {/* Redirection fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <NotificationStack
          notifications={notifications}
          onRemove={removeNotification}
        />
        
        {/* Simple global footer */}
        <footer className="bg-white dark:bg-dark-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>© {new Date().getFullYear()} RAKTSETU - Connecting Lives Through Blood Donation. Powered by Free & Open Source Tech.</p>
        </footer>
      </div>
  );
};

const App = () => (
  <Router>
    <AppShell />
  </Router>
);

export default App;
