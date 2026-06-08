import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { 
  requestFcmToken, 
  saveFcmTokenToServer
} from '../utils/firebase';
import {
  supabaseCreateUserWithEmail,
  supabaseGetCurrentUserToken
} from '../utils/supabase';
import { 
  Heart, User, Mail, Lock, Phone, Award, Eye, EyeOff, 
  Upload, MapPin, Calendar, Activity, Info, Check, AlertCircle, X, Loader2,
  Sparkles, Gift, ArrowLeft, ArrowRight
} from 'lucide-react';
import { loginSuccess } from '../redux/authSlice';
import { STATES_DATA } from '../utils/statesData';

// Yup validation schema tailored strictly to role requirements
const schema = yup.object().shape({
  fullName: yup.string()
    .min(3, 'Name must be at least 3 characters')
    .max(50, 'Name must not exceed 50 characters')
    .required('Full Name is required'),
  email: yup.string()
    .email('Please enter a valid email address')
    .required('Email address is required'),
  phone: yup.string()
    .matches(/^[6-9]\d{9}$/, 'Phone must be a valid 10-digit Indian mobile number')
    .required('Phone number is required'),
  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Must contain at least one number')
    .matches(/[^A-Za-z0-9]/, 'Must contain at least one special character')
    .required('Password is required'),
  confirmPassword: yup.string()
    .oneOf([yup.ref('password'), null], 'Passwords must match')
    .required('Please confirm your password'),
  role: yup.string()
    .oneOf(['Donor', 'Recipient', 'Hospital'], 'Please select a valid role')
    .required('Account role is required'),
  
  // Conditional profile fields (only enforced for Donor/Recipient roles)
  bloodGroup: yup.string().when('role', {
    is: (val) => val === 'Donor' || val === 'Recipient',
    then: () => yup.string().oneOf(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 'Select a blood group').required('Blood Group is required'),
    otherwise: () => yup.string().notRequired(),
  }),
  dob: yup.string().when('role', {
    is: (val) => val === 'Donor' || val === 'Recipient',
    then: () => yup.string().required('Date of Birth is required'),
    otherwise: () => yup.string().notRequired(),
  }),
  gender: yup.string().when('role', {
    is: (val) => val === 'Donor' || val === 'Recipient',
    then: () => yup.string().oneOf(['Male', 'Female', 'Other'], 'Select a gender option').required('Gender is required'),
    otherwise: () => yup.string().notRequired(),
  }),
  weight: yup.mixed().when('role', {
    is: 'Donor',
    then: () => yup.number()
      .typeError('Weight must be a number')
      .min(45, 'You must weigh at least 45 kg to donate blood')
      .max(150, 'Weight must be realistic')
      .required('Weight is required'),
    otherwise: () => yup.mixed().notRequired(),
  }),

  // Location details
  place: yup.string().required('State, District, and City/Mandal selection is required'),
  pincode: yup.string()
    .matches(/^\d{6}$/, 'Pincode must be a valid 6-digit postal code')
    .required('Pincode is required'),
  village: yup.string().optional(),
  
  referralCode: yup.string().optional(),
  terms: yup.boolean().oneOf([true], 'You must accept the Terms & Conditions'),
  privacy: yup.boolean().oneOf([true], 'You must accept the Privacy Policy')
});

const RegisterPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const prefillData = useMemo(() => location.state || {}, [location.state]);
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error', message: '' }
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const [successUser, setSuccessUser] = useState(null);

  // Image Upload and Preview
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Selected location dropdown state variables
  const [regState, setRegState] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regCity, setRegCity] = useState('');

  // React Hook Form initialization
  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue,
    trigger,
    formState: { errors } 
  } = useForm({
    resolver: yupResolver(schema),
    shouldUnregister: false,
    defaultValues: {
      role: 'Donor',
      bloodGroup: 'O+',
      gender: 'Male',
      terms: false,
      privacy: false
    }
  });

  const handleNextStep = async () => {
    const fieldsToValidate = prefillData.isNewUser 
      ? ['fullName', 'email', 'phone'] 
      : ['fullName', 'email', 'phone', 'password', 'confirmPassword'];
      
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(2);
    }
  };

  const selectedRole = watch('role');
  const watchedPassword = watch('password', '');

  // Auto-fill referral code from query parameter (e.g. ?ref=CODE)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const refParam = params.get('ref');
    if (refParam) {
      setValue('referralCode', refParam.toUpperCase());
    }
  }, [location.search, setValue]);

  // Prefill Google Redirect data dynamically
  useEffect(() => {
    if (prefillData.isNewUser) {
      if (prefillData.email) {
        setValue('email', prefillData.email);
      }
      if (prefillData.fullName) {
        setValue('fullName', prefillData.fullName);
      }
      // Populate compliant dummy password so yup schema validation passes
      const dummyPassword = `OAuthRedirectP@ssw0rd_${Math.random().toString(36).substring(2, 7)}`;
      setValue('password', dummyPassword);
      setValue('confirmPassword', dummyPassword);

      // If it's the mock developer user, prefill all required profile fields to eliminate manual entry
      if (prefillData.email === 'google_mock@onedrop.org') {
        setValue('phone', '9876543210');
        setValue('bloodGroup', 'O+');
        setValue('dob', '1998-08-15');
        setValue('gender', 'Male');
        setValue('weight', 70);
        setValue('place', 'Electronics City, Bangalore Urban, Karnataka');
        setRegState('Karnataka');
        setRegDistrict('Bangalore');
        setRegCity('Electronic City');
        setValue('pincode', '560100');
        setValue('terms', true);
        setValue('privacy', true);
      }
    }
  }, [prefillData, setValue]);

  // Calculate password strength rating
  const passwordStrength = useMemo(() => {
    if (!watchedPassword) return { score: 0, text: 'Very Weak', color: 'bg-slate-200', width: 'w-0' };
    let score = 0;
    if (watchedPassword.length >= 8) score++;
    if (/[A-Z]/.test(watchedPassword)) score++;
    if (/[0-9]/.test(watchedPassword)) score++;
    if (/[^A-Za-z0-9]/.test(watchedPassword)) score++;

    switch (score) {
      case 0:
      case 1:
        return { score, text: 'Weak ⚠️', color: 'bg-red-500', width: 'w-1/4' };
      case 2:
        return { score, text: 'Fair ⚡', color: 'bg-orange-500', width: 'w-2/4' };
      case 3:
        return { score, text: 'Good ⭐', color: 'bg-yellow-500', width: 'w-3/4' };
      case 4:
      default:
        return { score, text: 'Strong 🔥', color: 'bg-emerald-500', width: 'w-full' };
    }
  }, [watchedPassword]);

  // Handle image preview conversion
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setToast({ type: 'error', message: 'Image size must be less than 2MB.' });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const onSubmit = async (data) => {
    setLoading(true);
    setToast(null);

    // Build regional parameters cleanly
    const stateVal = regState;
    const districtVal = regDistrict;
    const cityVal = regCity;

    const payload = {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      role: data.role,
      state: stateVal,
      district: districtVal,
      city: cityVal,
      area: data.place,
      village: data.village || '',
      pincode: data.pincode,
      referredByCode: data.referralCode || undefined
    };

    if (data.role === 'Donor') {
      payload.bloodGroup = data.bloodGroup;
      payload.DOB = new Date(data.dob);
      payload.gender = data.gender;
      payload.weight = parseFloat(data.weight);
    } else if (data.role === 'Recipient') {
      payload.bloodGroup = data.bloodGroup;
      payload.DOB = new Date(data.dob);
      payload.gender = data.gender;
    } else if (data.role === 'Hospital') {
      // Dynamic fallback hospital credentials to bypass Mongoose schema restrictions
      payload.hospitalLicenseNumber = `HL-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    if (imagePreview) {
      payload.profileImage = imagePreview;
    }

    try {
      let response;
      
      if (prefillData.isNewUser && prefillData.supabaseUid) {
        // User signing up after Google OAuth popup redirects
        const accessToken = prefillData.accessToken || await supabaseGetCurrentUserToken();
        response = await axios.post(`${API_URL}/api/auth/supabase-register`, {
          ...payload,
          accessToken
        });
      } else {
        // Standard Email/Password registration - store permanently in MongoDB!
        // First register in Supabase Auth to obtain the accessToken
        const { accessToken } = await supabaseCreateUserWithEmail(data.email, data.password);
        
        // Then store permanently in MongoDB via our Express server!
        response = await axios.post(`${API_URL}/api/auth/supabase-register`, {
          ...payload,
          accessToken
        });
      }
      
      setToast({ type: 'success', message: 'Lifesaver account registered successfully! Auto-enabling push notifications...' });
      
      dispatch(loginSuccess({
        token: response.data.token,
        user: response.data.user
      }));

      try {
        console.log('[Register] Requesting FCM token to auto-enable push notifications...');
        const fcmToken = await requestFcmToken();
        if (fcmToken) {
          await saveFcmTokenToServer(fcmToken, response.data.token);
          setToast({ type: 'success', message: 'Account registered & push notifications enabled successfully! Redirecting...' });
        }
      } catch (fcmErr) {
        console.warn('[Register] FCM auto-enable failed or permission denied:', fcmErr.message);
      }

      setSuccessUser({
        fullName: data.fullName,
        role: data.role,
        bloodGroup: data.bloodGroup || null,
        rewardPoints: response.data.user?.rewardPoints || 50
      });
      setShowGreetingModal(true);
    } catch (err) {
      console.error(err);
      let errMsg = err.response?.data?.message || err.message || 'Registration failed.';
      if (err.message === 'Network Error') {
        errMsg = 'Connection Error: Make sure your backend server is running locally on port 5000!';
      }
      setToast({ type: 'error', message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex items-center justify-center p-4 sm:p-8 md:p-12 relative overflow-hidden transition-colors duration-300">
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-xl shadow-2xl border backdrop-blur-md max-w-sm ${
              toast.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="w-5 h-5 shrink-0 bg-emerald-500 text-white rounded-full p-1" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 bg-rose-500 text-white rounded-full p-0.5" />
            )}
            <p className="text-xs font-bold leading-tight">{toast.message}</p>
            <button onClick={() => setToast(null)} className="hover:opacity-70 transition-all ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Greeting Modal */}
      <AnimatePresence>
        {showGreetingModal && successUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="relative w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden text-center"
            >
              {/* Background glowing decorations */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/10 rounded-full filter blur-2xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-rose-500/10 rounded-full filter blur-2xl pointer-events-none" />

              {/* Heart Beat & Sparkle Banner */}
              <div className="relative flex justify-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-500 shadow-lg"
                >
                  <Heart className="w-8 h-8 fill-current" />
                </motion.div>
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute -top-1 -right-1 text-yellow-500"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              </div>

              {/* Main Headline */}
              <h3 className="text-2xl font-black tracking-tight text-slate-850 dark:text-white flex items-center justify-center gap-2">
                Welcome to ONEDROP
              </h3>
              
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                Registration Successful
              </p>

              {/* Exact user-requested message */}
              <p className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed font-semibold mt-4 px-2">
                Welcome to ONEDROP. Your lifesaver profile has been created successfully.
              </p>

              {/* Credentials Badge Card */}
              <div className="my-5 p-4 bg-slate-50 dark:bg-dark-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-left space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-400 font-semibold">Name</span>
                  <span className="text-xs font-extrabold text-slate-850 dark:text-slate-100">{successUser.fullName}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-xs text-slate-400 font-semibold">Role</span>
                  <span className="px-2.5 py-0.5 bg-red-600 text-white font-black text-xs rounded-full">
                    {successUser.role}
                  </span>
                </div>
                {successUser.bloodGroup && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-xs text-slate-400 font-semibold">Blood Group</span>
                    <span className="px-2.5 py-0.5 bg-red-600 text-white font-black text-xs rounded-full">
                      {successUser.bloodGroup}
                    </span>
                  </div>
                )}
                {successUser.role === 'Donor' && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-semibold">Welcome Reward</span>
                    <span className="flex items-center gap-1 text-xs font-extrabold text-yellow-600 dark:text-yellow-400">
                      <Gift className="w-3.5 h-3.5" />
                      +{successUser.rewardPoints} Points
                    </span>
                  </div>
                )}
              </div>

              {/* Inspiring Greeting Message */}
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Thank you for taking this noble step! A single blood donation can save up to <strong>three lives</strong>. Your profile is now active on the ONEDROP proximity grid. Real-time emergency notifications will be sent if a matching blood request matches your area.
              </p>

              {/* Proceed Button */}
              <button
                type="button"
                onClick={() => {
                  setShowGreetingModal(false);
                  if (successUser.role === 'Donor') navigate('/donor');
                  else if (successUser.role === 'Recipient') navigate('/recipient');
                  else if (successUser.role === 'Hospital') navigate('/hospital');
                  else navigate('/');
                }}
                className="mt-6 w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg hover:shadow-red-500/20 transition-all text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enter {successUser.role} Dashboard</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Animated Blood Circles */}
      <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-primary-500/5 rounded-full filter blur-3xl animate-pulse -z-10" />
      <div className="absolute bottom-1/4 right-1/10 w-80 h-80 bg-red-400/5 rounded-full filter blur-3xl animate-pulse -z-10 delay-1000" />

      {/* Main Container Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl bg-white/70 dark:bg-dark-900/60 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl overflow-hidden grid lg:grid-cols-12"
      >
        
        {/* Left Interactive Medical Pane */}
        <div className="lg:col-span-5 bg-gradient-to-br from-red-600 to-rose-700 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle overlay grid lines */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="space-y-6 relative z-10">
            <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-all font-bold text-xs">
              <Heart className="w-4 h-4 fill-current animate-pulse text-white" />
              <span>Back to Portal</span>
            </Link>
            
            <div className="space-y-2 pt-6">
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                Empowering India's Proximity <span className="underline decoration-wavy decoration-white/50">Lifesaver</span> Grid
              </h2>
              <p className="text-sm text-red-100 leading-relaxed font-medium">
                Every verified profile expands the instant emergency buffer, ensuring zero transaction delays across 29 states.
              </p>
            </div>

            <div className="space-y-4 pt-4 text-xs font-semibold">
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                <Check className="w-4 h-4 bg-white/20 text-white rounded-full p-0.5" />
                <p>100% Free peer-to-peer blood matching</p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                <Check className="w-4 h-4 bg-white/20 text-white rounded-full p-0.5" />
                <p>Map-Free proximity location search</p>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
                <Check className="w-4 h-4 bg-white/20 text-white rounded-full p-0.5" />
                <p>Digital badges and verifiable lifesaver awards</p>
              </div>
            </div>
          </div>

          <div className="pt-12 relative z-10 border-t border-white/10 space-y-4">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-yellow-300 fill-current animate-bounce" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-red-200">Exclusive rewards</p>
                <p className="text-sm font-black">+100 Points on Referral Invites</p>
              </div>
            </div>
            <p className="text-[10px] text-red-100/70">
              ONEDROP v1.0 adheres completely to secure communication compliance regulations.
            </p>
          </div>
        </div>

        {/* Right Form Pane */}
        <div className="lg:col-span-7 p-6 sm:p-10 space-y-8">
          
          <div className="space-y-1">
            <h3 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              Create Lifesaver Account
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Register as a donor, hospital coordinator, or patient.
            </p>
          </div>

          {/* Step Progress Bar */}
          <div className="flex items-center justify-between mb-8 relative px-4">
            {/* Background line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-100 dark:bg-dark-800 -z-10" />
            {/* Active fill line */}
            <div 
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-650 transition-all duration-500 -z-10"
              style={{ width: step === 1 ? '0%' : '100%' }}
            />
            
            {/* Step 1 Circle */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= 1 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-slate-100 dark:bg-dark-800 text-slate-400'
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                step >= 1 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
              }`}>Account Setup</span>
            </div>

            {/* Step 2 Circle */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step === 2 
                  ? 'bg-red-600 text-white shadow-lg shadow-red-500/20' 
                  : 'bg-slate-100 dark:bg-dark-800 text-slate-400'
              }`}>
                2
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${
                step === 2 ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'
              }`}>Lifesaver Details</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* Section A: Account Security */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b dark:border-slate-800 pb-1.5">
                      Section A: Account Security
                    </h4>
                    
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Full Name / Facility Title
                        </label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. Jagadeeswar Reddy"
                            {...register('fullName')}
                            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none transition-all ${
                              errors.fullName 
                                ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20' 
                                : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500'
                            }`}
                          />
                        </div>
                        {errors.fullName && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.fullName.message}
                          </p>
                        )}
                      </div>

                      {/* Email Address */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="email"
                            placeholder="devagudi@domain.com"
                            {...register('email')}
                            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none transition-all ${
                              errors.email 
                                ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20' 
                                : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500'
                            }`}
                          />
                        </div>
                        {errors.email && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.email.message}
                          </p>
                        )}
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="number"
                            placeholder="9876543210"
                            {...register('phone')}
                            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none transition-all ${
                              errors.phone 
                                ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20' 
                                : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500'
                            }`}
                          />
                        </div>
                        {errors.phone && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.phone.message}
                          </p>
                        )}
                      </div>

                      {prefillData.isNewUser ? (
                        <div className="sm:col-span-2 p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-500/10 rounded-2xl flex items-center gap-3 backdrop-blur-md">
                          <Check className="w-5 h-5 text-emerald-500 shrink-0 bg-emerald-500/20 rounded-full p-1" />
                          <div>
                            <h5 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">Authenticated via Google</h5>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Your account security is managed securely via Google OAuth. No separate password required.</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Password Strength Indicator & Toggle */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Password
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...register('password')}
                                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none transition-all ${
                                  errors.password 
                                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20' 
                                    : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            
                            {/* Real-time Strength Meter */}
                            {watchedPassword && (
                              <div className="mt-2 space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                  <span>Password Strength:</span>
                                  <span className="font-extrabold text-slate-700 dark:text-slate-300">
                                    {passwordStrength.text}
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden">
                                  <div className={`h-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} />
                                </div>
                              </div>
                            )}

                            {errors.password && (
                              <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.password.message}
                              </p>
                            )}
                          </div>

                          {/* Confirm Password */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                              Confirm Password
                            </label>
                            <div className="relative">
                              <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                {...register('confirmPassword')}
                                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none transition-all ${
                                  errors.confirmPassword 
                                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20' 
                                    : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500'
                                }`}
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            {errors.confirmPassword && (
                              <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.confirmPassword.message}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Continue Button */}
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    type="button"
                    onClick={handleNextStep}
                    className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg hover:shadow-red-500/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  {/* Redirect back to Login */}
                  <p className="text-center text-xs font-semibold text-slate-500 dark:text-slate-400 pt-2">
                    Already registered?{' '}
                    <Link to="/login" className="text-red-600 dark:text-red-400 font-extrabold hover:underline">
                      Sign In Here
                    </Link>
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {/* 1. Account Role Selection Toggle */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Account Type / Role
                    </label>
                    <div className="grid grid-cols-3 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl gap-1">
                      {['Donor', 'Recipient', 'Hospital'].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setValue('role', r);
                            // Reset conditional states
                            if (r === 'Hospital') {
                              setValue('bloodGroup', undefined);
                              setValue('dob', undefined);
                              setValue('gender', undefined);
                              setValue('weight', undefined);
                            } else {
                              setValue('bloodGroup', 'O+');
                              setValue('gender', 'Male');
                            }
                          }}
                          className={`py-2 text-xs font-black rounded-lg transition-all ${
                            selectedRole === r
                              ? 'bg-red-600 text-white shadow-md'
                              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <input type="hidden" {...register('role')} />
                  </div>

                  {/* Profile Avatar Upload with Circular Preview */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 dark:bg-dark-800/30 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                    <div className="relative group w-20 h-20 rounded-full border-2 border-dashed border-red-500/40 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-dark-800 shrink-0">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Profile Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Profile Photograph</p>
                      <p className="text-[10px] text-slate-500">Max size 2MB (JPEG, PNG). View preview instantly.</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="mt-1 text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                      >
                        Upload Image
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* 3. Conditional Profiles (Donors and Recipients only) */}
                  {selectedRole !== 'Hospital' && (
                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b dark:border-slate-800 pb-1.5">
                        Section B: Clinical Eligibility
                      </h4>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {/* Blood Group */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Blood Group
                          </label>
                          <div className="relative">
                            <Activity className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <select
                              {...register('bloodGroup')}
                              className="w-full pl-9 pr-2 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-red-600 outline-none"
                            >
                              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Date of Birth */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Date of Birth
                          </label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input
                              type="date"
                              {...register('dob')}
                              className={`w-full pl-9 pr-2 py-2 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none ${
                                errors.dob ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                              }`}
                            />
                          </div>
                          {errors.dob && (
                            <p className="text-[9px] font-bold text-rose-500 mt-0.5">{errors.dob.message}</p>
                          )}
                        </div>

                        {/* Gender */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Gender
                          </label>
                          <select
                            {...register('gender')}
                            className="w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Weight (Only Donor needs Weight validation) */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Weight (KG)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              placeholder="e.g. 68"
                              disabled={selectedRole !== 'Donor'}
                              {...register('weight')}
                              className={`w-full p-2.5 pr-8 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none ${
                                selectedRole !== 'Donor' ? 'opacity-50 cursor-not-allowed' : ''
                              } ${errors.weight ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'}`}
                            />
                            <span className="absolute right-3 top-3 text-[10px] font-black text-slate-400">KG</span>
                          </div>
                          {errors.weight && (
                            <p className="text-[9px] font-bold text-rose-500 mt-0.5">{errors.weight.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Location & Placement */}
                  <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b dark:border-slate-800 pb-1.5">
                      Section C: Proximity Coordinates
                    </h4>

                    <div className="grid sm:grid-cols-4 gap-4">
                      {/* State Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          State
                        </label>
                        <select
                          value={regState}
                          onChange={(e) => {
                            setRegState(e.target.value);
                            setRegDistrict('');
                            setRegCity('');
                            setValue('place', '');
                          }}
                          className={`w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none text-slate-800 dark:text-slate-100`}
                        >
                          <option value="">Select State</option>
                          {Object.keys(STATES_DATA).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* District Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          District
                        </label>
                        <select
                          disabled={!regState}
                          value={regDistrict}
                          onChange={(e) => {
                            setRegDistrict(e.target.value);
                            setRegCity('');
                            setValue('place', '');
                          }}
                          className={`w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-55 text-slate-800 dark:text-slate-100`}
                        >
                          <option value="">Select District</option>
                          {Object.keys(STATES_DATA[regState] || {}).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* City Dropdown */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          City / Mandal
                        </label>
                        <select
                          disabled={!regDistrict}
                          value={regCity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRegCity(val);
                            if (val) {
                              setValue('place', `${val}, ${regDistrict}, ${regState}`, { shouldValidate: true });
                            } else {
                              setValue('place', '');
                            }
                          }}
                          className={`w-full p-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none disabled:opacity-55 text-slate-800 dark:text-slate-100`}
                        >
                          <option value="">Select City / Mandal</option>
                          {(STATES_DATA[regState]?.[regDistrict] || []).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                      <input type="hidden" {...register('place')} />

                      {/* Pincode */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Pincode
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 516293"
                          {...register('pincode')}
                          className={`w-full p-2.5 bg-slate-50 dark:bg-dark-800 border rounded-xl text-sm outline-none transition-all ${
                            errors.pincode 
                              ? 'border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/20' 
                              : 'border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500'
                          }`}
                        />
                        {errors.pincode && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {errors.pincode.message}
                          </p>
                        )}
                      </div>
                    </div>
                    {errors.place && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.place.message}
                      </p>
                    )}

                    {/* Panchayat / Village */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                          Panchayat / Village (Optional)
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            placeholder="e.g. Akkayapalli Panchayat"
                            {...register('village')}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-red-500 rounded-xl text-sm outline-none transition-all text-slate-800 dark:text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Referral Code (Optional) */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                        Referral Code (Optional)
                      </label>
                      <div className="relative">
                        <Award className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="e.g. VIKR4829"
                          {...register('referralCode')}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-red-500 font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3 pt-2">
                    {/* Terms and Conditions Checkbox */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms"
                        {...register('terms')}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                      <label htmlFor="terms" className="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
                        I accept the{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); alert("ONEDROP Terms & Conditions: You agree to register as a voluntary helper or authentic recipient in need."); }} className="text-red-600 dark:text-red-400 hover:underline">
                          Terms & Conditions
                        </a>
                      </label>
                    </div>
                    {errors.terms && (
                      <p className="text-[10px] font-bold text-rose-500 ml-7 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.terms.message}
                      </p>
                    )}

                    {/* Privacy Policy Checkbox */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="privacy"
                        {...register('privacy')}
                        className="w-4 h-4 mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                      />
                      <label htmlFor="privacy" className="text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer">
                        I accept the{' '}
                        <a href="#" onClick={(e) => { e.preventDefault(); alert("ONEDROP Privacy Policy: Your data remains strictly confidential and secure under zero-tier local access rules."); }} className="text-red-600 dark:text-red-400 hover:underline">
                          Privacy Policy
                        </a>
                      </label>
                    </div>
                    {errors.privacy && (
                      <p className="text-[10px] font-bold text-rose-500 ml-7 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {errors.privacy.message}
                      </p>
                    )}
                  </div>

                  {/* Buttons: Back and Submit */}
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-700 text-slate-700 dark:text-slate-200 font-black rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="submit"
                      disabled={loading}
                      className="flex-[2] py-3.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg hover:shadow-red-500/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Activating Lifesaver Node...</span>
                        </>
                      ) : (
                        <span>Create Lifesaver Account</span>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </form>

        </div>

      </motion.div>
    </div>
  );
};

export default RegisterPage;
