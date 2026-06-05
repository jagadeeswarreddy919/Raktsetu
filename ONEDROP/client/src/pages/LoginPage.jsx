import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure, clearError } from '../redux/authSlice';
import { Heart, Lock, Mail, ArrowRight, HelpCircle, Phone, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../utils/api';
import { 
  requestFcmToken, 
  saveFcmTokenToServer
} from '../utils/firebase';
import {
  supabaseSignInWithEmail,
  supabaseSignInWithGoogle,
  supabaseSendPasswordReset
} from '../utils/supabase';
import { buildGreetingMessage } from '../utils/greeting';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState('');
  
  // Administrative WhatsApp OTP Recovery States
  const [showAdminForgotPassword, setShowAdminForgotPassword] = useState(false);
  const [adminPhone, setAdminPhone] = useState('8500508940');
  const [adminOtp, setAdminOtp] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminForgotPasswordStage, setAdminForgotPasswordStage] = useState(1); // 1 = phone, 2 = OTP & reset
  const [adminForgotSuccess, setAdminForgotSuccess] = useState('');
  const [adminForgotError, setAdminForgotError] = useState('');
  const [adminForgotLoading, setAdminForgotLoading] = useState(false);

  // Standard User WhatsApp OTP Recovery States
  const [userPhone, setUserPhone] = useState('');
  const [userOtp, setUserOtp] = useState('');
  const [userNewPassword, setUserNewPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  const [userForgotPasswordStage, setUserForgotPasswordStage] = useState(1); // 1 = phone, 2 = OTP & reset
  const [userForgotSuccess, setUserForgotSuccess] = useState('');
  const [userForgotError, setUserForgotError] = useState('');
  const [userForgotLoading, setUserForgotLoading] = useState(false);

  // Dynamic WhatsApp Click-to-Chat Redirection Links
  const [adminWaLink, setAdminWaLink] = useState('');
  const [userWaLink, setUserWaLink] = useState('');

  // Sign-in Time Email Verification (OTP & Link) States
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [tempAuthResponse, setTempAuthResponse] = useState(null);

  const formatPhoneForWhatsApp = (phone) => {
    if (!phone) return '';
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.length === 10) {
      clean = `91${clean}`;
    }
    return clean;
  };

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, error, isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    // Clear Redux error queue on route mounts
    dispatch(clearError());
    setFormError('');
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to role specific dashboards
      switch (user.role) {
        case 'Super Admin':
        case 'Admin': navigate('/admin'); break;
        case 'Donor': navigate('/donor'); break;
        case 'Recipient': navigate('/recipient'); break;
        case 'Hospital': navigate('/hospital'); break;
        default: navigate('/');
      }
    }
  }, [isAuthenticated, user, navigate]);



  const handleTabChange = (type) => {
    setLoginType(type);
    setEmail('');
    setPassword('');
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    dispatch(loginStart());

    try {
      let response;
      if (loginType === 'admin') {
        // Direct call to Express server auth login endpoint
        response = await axios.post(`${API_URL}/api/auth/login`, {
          email,
          password
        });
      } else {
        // User login goes through Supabase first
        const { accessToken } = await supabaseSignInWithEmail(email, password);
        response = await axios.post(`${API_URL}/api/auth/supabase-login`, { accessToken });

        // Check if new user registration pre-fill is required
        if (response.data.isNewUser) {
          dispatch(loginFailure('Redirecting to complete profile setup...'));
          navigate('/register', { 
            state: { 
              isNewUser: true, 
              email: response.data.email, 
              supabaseUid: response.data.supabaseUid,
              fullName: response.data.fullName,
              accessToken
            } 
          });
          return;
        }
      }

      // Intercept and enforce Email Verification barrier at sign-in time
      if (loginType === 'user' && response.data.user && !response.data.user.isEmailVerified) {
        setUnverifiedEmail(email);
        setTempAuthResponse(response.data);
        setShowEmailVerification(true);
        try {
          await axios.post(`${API_URL}/api/auth/mock-send-verification`, { email });
        } catch (e) {
          console.warn('[Auto Email Verification Send] Failed:', e.message);
        }
        dispatch(loginFailure('Email verification is required.'));
        return;
      }

      dispatch(loginSuccess({
        token: response.data.token,
        user: response.data.user
      }));

      const fcmToken = await requestFcmToken();
      if (fcmToken) {
        await saveFcmTokenToServer(fcmToken, response.data.token);
      }

      if (typeof window !== 'undefined' && 'Notification' in window && response.data.greeting && Notification.permission === 'granted') {
        new Notification('ONEDROP', {
          body: response.data.greeting || buildGreetingMessage(response.data.user?.fullName),
          icon: '/logo.png'
        });
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
      dispatch(loginFailure(errMsg));
      setFormError(errMsg);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError('');
    dispatch(loginStart());
    try {
      const { accessToken } = await supabaseSignInWithGoogle();
      const response = await axios.post(`${API_URL}/api/auth/supabase-login`, { accessToken });

      if (response.data.isNewUser) {
        dispatch(loginFailure('Redirecting to complete profile setup...'));
        navigate('/register', { 
          state: { 
            isNewUser: true, 
            email: response.data.email, 
            supabaseUid: response.data.supabaseUid,
            fullName: response.data.fullName,
            accessToken
          } 
        });
        return;
      }

      // Intercept and enforce Email Verification barrier at sign-in time
      if (response.data.user && !response.data.user.isEmailVerified) {
        setUnverifiedEmail(response.data.user.email);
        setTempAuthResponse(response.data);
        setShowEmailVerification(true);
        try {
          await axios.post(`${API_URL}/api/auth/mock-send-verification`, { email: response.data.user.email });
        } catch (e) {
          console.warn('[Auto Email Verification Send] Failed:', e.message);
        }
        dispatch(loginFailure('Email verification is required.'));
        return;
      }

      dispatch(loginSuccess({
        token: response.data.token,
        user: response.data.user
      }));

      const fcmToken = await requestFcmToken();
      if (fcmToken) {
        await saveFcmTokenToServer(fcmToken, response.data.token);
      }
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || 'Google Sign-In failed.';
      dispatch(loginFailure(errMsg));
      setFormError(errMsg);
    }
  };

  const handleEmailOtpVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verificationOtp.trim()) return;
    setVerifyingOtp(true);
    setVerificationSuccess('');
    setVerificationError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/mock-verify-email-otp`, {
        email: unverifiedEmail,
        otp: verificationOtp
      });

      setVerificationSuccess('Email successfully verified! Signing in...');
      
      // Auto Sign In on verification success
      setTimeout(() => {
        dispatch(loginSuccess({
          token: tempAuthResponse.token,
          user: { ...tempAuthResponse.user, isEmailVerified: true }
        }));
        
        setShowEmailVerification(false);
        setUnverifiedEmail('');
        setVerificationOtp('');
        setVerificationSuccess('');
        setVerificationError('');
        setTempAuthResponse(null);
      }, 1500);

    } catch (err) {
      console.error(err);
      setVerificationError(err.response?.data?.message || 'OTP verification failed. Please check the code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendVerificationLink = async () => {
    setResendingVerification(true);
    setVerificationSuccess('');
    setVerificationError('');
    try {
      const response = await axios.post(`${API_URL}/api/auth/mock-send-verification`, {
        email: unverifiedEmail
      });
      setVerificationSuccess(response.data.message || 'Verification email dispatched successfully.');
    } catch (err) {
      console.error(err);
      setVerificationError(err.response?.data?.message || 'Failed to dispatch fresh verification email.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleSyncVerificationStatus = async () => {
    setResendingVerification(true);
    setVerificationSuccess('');
    setVerificationError('');
    try {
      // Sync verification status with the backend
      const userRes = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${tempAuthResponse.token}` }
      });

      if (userRes.data.isEmailVerified) {
        setVerificationSuccess('Verification confirmed! Logging you in...');
        setTimeout(() => {
          dispatch(loginSuccess({
            token: tempAuthResponse.token,
            user: userRes.data
          }));
          setShowEmailVerification(false);
          setUnverifiedEmail('');
          setTempAuthResponse(null);
        }, 1500);
      } else {
        setVerificationError('Email status is still unverified. Please check your inbox or use OTP.');
      }
    } catch (err) {
      console.error(err);
      setVerificationError('Sync verification status failed. Please verify with OTP.');
    } finally {
      setResendingVerification(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotPasswordSuccess('');
    setFormError('');
    try {
      await supabaseSendPasswordReset(forgotPasswordEmail);
      setForgotPasswordSuccess('Password reset link sent! Check your email inbox.');
      setForgotPasswordEmail('');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordSuccess('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to dispatch password reset link.');
    }
  };

  const handleAdminForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setAdminForgotSuccess('');
    setAdminForgotError('');
    setAdminForgotLoading(true);
    
    // Open a blank window immediately inside the direct click handler to prevent browser popup blockers!
    const newTab = window.open('', '_blank');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-forgot-password`, {
        phone: adminPhone
      });
      
      const targetPhone = formatPhoneForWhatsApp(adminPhone);
      const activeOtp = response.data.otp || '123456';
      const encodedMsg = encodeURIComponent(`Your ONEDROP Security OTP is: ${activeOtp}`);
      const link = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMsg}`;
      
      setAdminWaLink(link);
      
      if (newTab) {
        newTab.location.href = link;
      }
      
      setAdminForgotSuccess(`OTP verification code generated successfully! We've opened a new tab to send it directly into your WhatsApp. If it didn't open, click the button below.`);
      setAdminForgotPasswordStage(2);
    } catch (err) {
      if (newTab) newTab.close();
      console.error(err);
      setAdminForgotError(err.response?.data?.message || err.message || 'Failed to request password reset OTP.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleAdminResendSms = async () => {
    setAdminForgotSuccess('');
    setAdminForgotError('');
    setAdminForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-resend-sms`, {
        phone: adminPhone
      });
      setAdminForgotSuccess(response.data.message);
    } catch (err) {
      console.error(err);
      setAdminForgotError(err.response?.data?.message || err.message || 'Failed to resend SMS OTP.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleAdminResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setAdminForgotSuccess('');
    setAdminForgotError('');

    if (adminNewPassword !== adminConfirmPassword) {
      setAdminForgotError('Passwords do not match.');
      return;
    }

    setAdminForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-reset-password`, {
        phone: adminPhone,
        otp: adminOtp,
        newPassword: adminNewPassword
      });
      setAdminForgotSuccess(response.data.message);
      
      setTimeout(() => {
        setShowAdminForgotPassword(false);
        setAdminPhone('');
        setAdminOtp('');
        setAdminNewPassword('');
        setAdminConfirmPassword('');
        setAdminForgotPasswordStage(1);
        setAdminForgotSuccess('');
        setAdminForgotError('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setAdminForgotError(err.response?.data?.message || err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleAdminVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setAdminForgotSuccess('');
    setAdminForgotError('');
    setAdminForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-verify-otp`, {
        phone: adminPhone,
        otp: adminOtp
      });
      setAdminForgotSuccess(response.data.message);
      setAdminForgotPasswordStage(3); // Transition to step 3 (New Password form!)
    } catch (err) {
      console.error(err);
      setAdminForgotError(err.response?.data?.message || err.message || 'OTP verification failed. Please check the code.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleUserVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setUserForgotSuccess('');
    setUserForgotError('');
    setUserForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/user-verify-otp`, {
        phone: userPhone,
        otp: userOtp
      });
      setUserForgotSuccess(response.data.message);
      setUserForgotPasswordStage(3); // Transition to step 3 (New Password form!)
    } catch (err) {
      console.error(err);
      setUserForgotError(err.response?.data?.message || err.message || 'OTP verification failed. Please check the code.');
    } finally {
      setUserForgotLoading(false);
    }
  };

  const handleUserForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setUserForgotSuccess('');
    setUserForgotError('');
    setUserForgotLoading(true);
    
    // Open a blank window immediately inside the direct click handler to prevent browser popup blockers!
    const newTab = window.open('', '_blank');
    
    try {
      const response = await axios.post(`${API_URL}/api/auth/user-forgot-password`, {
        phone: userPhone
      });
      
      const targetPhone = formatPhoneForWhatsApp(userPhone);
      const activeOtp = response.data.otp || '123456';
      const encodedMsg = encodeURIComponent(`Your ONEDROP Security OTP is: ${activeOtp}`);
      const link = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMsg}`;
      
      setUserWaLink(link);
      
      if (newTab) {
        newTab.location.href = link;
      }
      
      setUserForgotSuccess(`OTP verification code generated successfully! We've opened a new tab to send it directly into your WhatsApp. If it didn't open, click the button below.`);
      setUserForgotPasswordStage(2);
    } catch (err) {
      if (newTab) newTab.close();
      console.error(err);
      setUserForgotError(err.response?.data?.message || err.message || 'Failed to request password reset OTP.');
    } finally {
      setUserForgotLoading(false);
    }
  };

  const handleUserResendSms = async () => {
    setUserForgotSuccess('');
    setUserForgotError('');
    setUserForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/user-resend-sms`, {
        phone: userPhone
      });
      setUserForgotSuccess(response.data.message);
    } catch (err) {
      console.error(err);
      setUserForgotError(err.response?.data?.message || err.message || 'Failed to resend SMS OTP.');
    } finally {
      setUserForgotLoading(false);
    }
  };

  const handleUserResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setUserForgotSuccess('');
    setUserForgotError('');

    if (userNewPassword !== userConfirmPassword) {
      setUserForgotError('Passwords do not match.');
      return;
    }

    setUserForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/user-reset-password`, {
        phone: userPhone,
        otp: userOtp,
        newPassword: userNewPassword
      });
      setUserForgotSuccess(response.data.message);
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setUserPhone('');
        setUserOtp('');
        setUserNewPassword('');
        setUserConfirmPassword('');
        setUserForgotPasswordStage(1);
        setUserForgotSuccess('');
        setUserForgotError('');
      }, 4000);
    } catch (err) {
      console.error(err);
      setUserForgotError(err.response?.data?.message || err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setUserForgotLoading(false);
    }
  };

  const handleAdminEmailFallback = async () => {
    setAdminForgotSuccess('');
    setAdminForgotError('');
    setAdminForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/admin-forgot-password-email`, {
        phone: adminPhone
      });
      
      if (response.data.otp) {
        setAdminForgotSuccess(`${response.data.message} [🔑 DEVELOPMENT OTP: ${response.data.otp}]`);
      } else {
        setAdminForgotSuccess(response.data.message);
      }
    } catch (err) {
      console.error(err);
      setAdminForgotError(err.response?.data?.message || err.message || 'Failed to dispatch backup email OTP.');
    } finally {
      setAdminForgotLoading(false);
    }
  };

  const handleUserEmailFallback = async () => {
    setUserForgotSuccess('');
    setUserForgotError('');
    setUserForgotLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/user-forgot-password-email`, {
        phone: userPhone
      });
      
      if (response.data.otp) {
        setUserForgotSuccess(`${response.data.message} [🔑 DEVELOPMENT OTP: ${response.data.otp}]`);
      } else {
        setUserForgotSuccess(response.data.message);
      }
    } catch (err) {
      console.error(err);
      setUserForgotError(err.response?.data?.message || err.message || 'Failed to dispatch backup email OTP.');
    } finally {
      setUserForgotLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full p-8 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl space-y-6 transition-all duration-300 relative overflow-hidden">
        {/* Email Verification Slide-in Glassmorphic Overlay */}
        {showEmailVerification && (
          <div className="absolute inset-0 z-20 p-8 bg-white/95 dark:bg-dark-900/95 rounded-3xl flex flex-col justify-between backdrop-blur-md transition-all duration-300">
            <div className="space-y-4 overflow-y-auto max-h-[82%] pr-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white font-sans">Verify Your Email</h3>
                  <p className="text-[10px] text-slate-500 font-semibold font-sans">To prevent fake registrations, email verification is mandatory at sign-in.</p>
                </div>
              </div>

              {verificationSuccess && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900 text-center animate-pulse font-sans">
                  {verificationSuccess}
                </div>
              )}

              {verificationError && (
                <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl text-center border border-red-200 dark:border-red-800 font-sans">
                  {verificationError}
                </div>
              )}

              <div className="space-y-3 pt-2">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium font-sans">
                  We've dispatched a secure verification link and a **6-Digit OTP** code to:
                  <br />
                  <strong className="text-slate-800 dark:text-slate-200">{unverifiedEmail}</strong>
                </p>

                <form onSubmit={handleEmailOtpVerifySubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 font-sans">Enter 6-Digit Code (OTP)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={verificationOtp}
                        onChange={(e) => setVerificationOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-center tracking-widest font-black font-mono text-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingOtp}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs uppercase"
                  >
                    {verifyingOtp ? 'Verifying OTP...' : 'Verify OTP Code'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="text-center mt-3 flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={resendingVerification}
                    onClick={handleResendVerificationLink}
                    className="text-[10px] font-bold text-primary-500 hover:underline outline-none font-sans"
                  >
                    ✉️ Resend Verification Email (Link & OTP)
                  </button>
                  <button
                    type="button"
                    disabled={resendingVerification}
                    onClick={handleSyncVerificationStatus}
                    className="text-[10px] font-bold text-indigo-500 hover:underline outline-none font-sans"
                  >
                    🔄 Clicked the link? Sync Status
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowEmailVerification(false);
                setUnverifiedEmail('');
                setVerificationOtp('');
                setVerificationSuccess('');
                setVerificationError('');
                setTempAuthResponse(null);
              }}
              className="w-full py-2.5 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors font-sans"
            >
              Cancel & Back to Sign In
            </button>
          </div>
        )}

        {/* Forgot Password Slide-in Glassmorphic Overlay */}
        {showForgotPassword && (
          <div className="absolute inset-0 z-20 p-8 bg-white/95 dark:bg-dark-900/95 rounded-3xl flex flex-col justify-between backdrop-blur-md transition-all duration-300">
            <div className="space-y-4 overflow-y-auto max-h-[82%] pr-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/40 flex items-center justify-center text-primary-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Recover Password</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Recover credentials using WhatsApp OTP verification.</p>
                </div>
              </div>

              {userForgotSuccess && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900 text-center animate-pulse">
                    {userForgotSuccess}
                  </div>
                  {userForgotPasswordStage === 2 && userWaLink && (
                    <a
                      href={userWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      🔗 Open WhatsApp to Send OTP
                    </a>
                  )}
                </div>
              )}

              {userForgotError && (
                <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl text-center border border-red-200 dark:border-red-800">
                  {userForgotError}
                </div>
              )}

              {userForgotPasswordStage === 1 ? (
                <form onSubmit={handleUserForgotPasswordSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Registered Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="e.g. 9888877777"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <span className="block mt-1.5 text-[10px] text-slate-400 leading-normal">
                      OTP will be instantly dispatched to your registered phone number via WhatsApp.
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={userForgotLoading}
                    className="w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {userForgotLoading ? 'Sending...' : 'Request WhatsApp OTP'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : userForgotPasswordStage === 2 ? (
                <form onSubmit={handleUserVerifyOtpSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Enter 6-Digit OTP</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={userOtp}
                        onChange={(e) => setUserOtp(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-center tracking-widest font-black"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={userForgotLoading}
                    className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
                  >
                    {userForgotLoading ? 'Verifying...' : 'Verify OTP Code'} <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center mt-2 flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={userForgotLoading}
                      onClick={handleUserResendSms}
                      className="text-[10px] font-bold text-primary-600 dark:text-primary-400 hover:underline outline-none"
                    >
                      💬 Didn't receive the OTP? Resend via SMS
                    </button>
                    <button
                      type="button"
                      disabled={userForgotLoading}
                      onClick={handleUserEmailFallback}
                      className="text-[10px] font-bold text-slate-500 hover:underline outline-none"
                    >
                      ✉️ Or send to Registered Email
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleUserResetPasswordSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={userNewPassword}
                        onChange={(e) => setUserNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={userConfirmPassword}
                        onChange={(e) => setUserConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={userForgotLoading}
                    className="w-full mt-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
                  >
                    {userForgotLoading ? 'Resetting...' : 'Reset Password'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(false);
                setUserPhone('');
                setUserOtp('');
                setUserNewPassword('');
                setUserConfirmPassword('');
                setUserForgotPasswordStage(1);
                setUserForgotSuccess('');
                setUserForgotError('');
              }}
              className="w-full py-2.5 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Admin Forgot Password Slide-in Glassmorphic Overlay */}
        {showAdminForgotPassword && (
          <div className="absolute inset-0 z-20 p-8 bg-white/95 dark:bg-dark-900/95 rounded-3xl flex flex-col justify-between backdrop-blur-md transition-all duration-300">
            <div className="space-y-4 overflow-y-auto max-h-[82%] pr-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center text-purple-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 dark:text-white">Admin Recovery</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">Recover credentials using WhatsApp OTP verification.</p>
                </div>
              </div>

              {adminForgotSuccess && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900 text-center animate-pulse">
                    {adminForgotSuccess}
                  </div>
                  {adminForgotPasswordStage === 2 && adminWaLink && (
                    <a
                      href={adminWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-xs"
                    >
                      🔗 Open WhatsApp to Send OTP
                    </a>
                  )}
                </div>
              )}

              {adminForgotError && (
                <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-xl text-center border border-red-200 dark:border-red-800">
                  {adminForgotError}
                </div>
              )}

              {adminForgotPasswordStage === 1 ? (
                <form onSubmit={handleAdminForgotPasswordSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Registered Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        disabled={true}
                        value={adminPhone}
                        className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-dark-850 border border-slate-200 dark:border-slate-700 rounded-xl text-sm cursor-not-allowed font-black text-purple-600 dark:text-purple-400 outline-none"
                      />
                    </div>
                    <span className="block mt-1.5 text-[10px] text-slate-400 leading-normal">
                      OTP will be instantly dispatched to this phone number via WhatsApp.
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={adminForgotLoading}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {adminForgotLoading ? 'Sending...' : 'Request WhatsApp OTP'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : adminForgotPasswordStage === 2 ? (
                <form onSubmit={handleAdminVerifyOtpSubmit} className="space-y-4 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Enter 6-Digit OTP</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={adminOtp}
                        onChange={(e) => setAdminOtp(e.target.value)}
                        placeholder="••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-center tracking-widest font-black"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={adminForgotLoading}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
                  >
                    {adminForgotLoading ? 'Verifying...' : 'Verify OTP Code'} <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="text-center mt-2 flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={adminForgotLoading}
                      onClick={handleAdminResendSms}
                      className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline outline-none"
                    >
                      💬 Didn't receive the OTP? Resend via SMS
                    </button>
                    <button
                      type="button"
                      disabled={adminForgotLoading}
                      onClick={handleAdminEmailFallback}
                      className="text-[10px] font-bold text-slate-500 hover:underline outline-none"
                    >
                      ✉️ Or send to Registered Email
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleAdminResetPasswordSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-0.5">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={adminConfirmPassword}
                        onChange={(e) => setAdminConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={adminForgotLoading}
                    className="w-full mt-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
                  >
                    {adminForgotLoading ? 'Resetting...' : 'Reset Admin Password'} <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAdminForgotPassword(false);
                setAdminPhone('');
                setAdminOtp('');
                setAdminNewPassword('');
                setAdminConfirmPassword('');
                setAdminForgotPasswordStage(1);
                setAdminForgotSuccess('');
                setAdminForgotError('');
              }}
              className="w-full py-2.5 bg-slate-100 dark:bg-dark-850 hover:bg-slate-200 dark:hover:bg-dark-800 text-slate-600 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors"
            >
              Back to Sign In
            </button>
          </div>
        )}

        <div className="text-center space-y-2">
          <div className={`mx-auto w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
            loginType === 'admin' ? 'bg-purple-100 dark:bg-purple-950/40' : 'bg-primary-100 dark:bg-primary-950/40'
          }`}>
            {loginType === 'admin' ? (
              <Lock className="w-6 h-6 text-purple-600" />
            ) : (
              <Heart className="w-6 h-6 text-primary-500 fill-current animate-pulse" />
            )}
          </div>
          <h2 className="text-2xl font-black">{loginType === 'admin' ? 'Administrative Portal' : 'Welcome Back'}</h2>
          <p className="text-xs text-slate-500">
            {loginType === 'admin' 
              ? 'Access security logs, regional inventory metrics, and registry controls.' 
              : 'Sign in to manage your blood donations and coordinates.'}
          </p>
        </div>

        {/* Tab Segmented Control */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-dark-800 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => handleTabChange('user')}
            className={`py-2 rounded-lg transition-all ${
              loginType === 'user'
                ? 'bg-white dark:bg-dark-900 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            User Login
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('admin')}
            className={`py-2 rounded-lg transition-all ${
              loginType === 'admin'
                ? 'bg-white dark:bg-dark-900 shadow-sm text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Admin Login
          </button>
        </div>

        {formError && (
          <div className="p-3 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/30 rounded-lg text-center border border-red-200 dark:border-red-800 animate-pulse">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              {loginType === 'admin' ? 'Admin Username / Email' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={loginType === 'admin' ? 'admin@onedrop.org' : 'name@domain.com'}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-500">Password</label>
              {loginType === 'user' ? (
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-bold text-primary-500 hover:underline outline-none"
                >
                  Forgot Password?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAdminForgotPassword(true)}
                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline outline-none"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-1 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 ${
              loginType === 'admin' 
                ? 'bg-purple-600 hover:bg-purple-700' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isLoading ? 'Processing...' : loginType === 'admin' ? 'Admin Portal Secure Log In' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Google Sign-In Integration */}
        {loginType === 'user' && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] bg-slate-200 dark:bg-slate-800 w-full" />
              <span className="text-[10px] uppercase font-bold text-slate-400 shrink-0">or continue with</span>
              <div className="h-[1px] bg-slate-200 dark:bg-slate-800 w-full" />
            </div>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}

        <p className="text-center text-xs text-slate-500">
          New to the platform?{' '}
          <Link to="/register" className="text-primary-500 font-bold hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
