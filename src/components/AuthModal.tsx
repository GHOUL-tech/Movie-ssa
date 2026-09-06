import React, { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Lock, 
  Mail, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  Film, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  KeyRound,
  Fingerprint,
  Globe,
  Calendar,
  Image as ImageIcon,
  AlertTriangle,
  Smile,
  LogIn,
  UserPlus,
  Send,
  RefreshCw,
  CheckCircle2,
  Copy,
  Code,
  Key,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_PRESETS, ANIME_AVATARS, getInitialAvatar } from '../utils/avatars';
import { COUNTRIES } from '../utils/countries';
import { sendOtpViaEmail, EMAILJS_DRAFT_TEMPLATE } from '../services/emailService';

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalTab, 
    openAuthModal, 
    login, 
    signup, 
    findUserByEmail, 
    resetPasswordAndLogin 
  } = useAuth();

  // Tab state
  const isLogin = authModalTab === 'login';

  // Forgot password flow state
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'new_password'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [targetResetUser, setTargetResetUser] = useState<any>(null);
  const [isOtpSimulated, setIsOtpSimulated] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [showEmailJsDraftModal, setShowEmailJsDraftModal] = useState(false);
  const [copiedDraft, setCopiedDraft] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupAge, setSignupAge] = useState<string>('');
  const [signupCountry, setSignupCountry] = useState<string>('United States');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Photo / Avatar mode: 'initial' | 'anime' | 'preset' | 'custom'
  const [avatarCategory, setAvatarCategory] = useState<'initial' | 'anime' | 'presets'>('initial');
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>('');

  // Errors & loading
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset forgot password state when auth modal tab switches or closes
  useEffect(() => {
    setIsForgotPassword(false);
    setForgotStep('email');
    setError(null);
    setResetSuccessMessage(null);
  }, [authModalTab, isAuthModalOpen]);

  // Timer countdown for resending OTP
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpResendCountdown > 0) {
      interval = setInterval(() => {
        setOtpResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpResendCountdown]);

  // Compute dynamic initial avatar based on name
  const nameInitialAvatar = getInitialAvatar(signupName || 'User');
  const effectiveAvatar = avatarCategory === 'initial' 
    ? nameInitialAvatar 
    : (selectedAvatarUrl || (avatarCategory === 'anime' ? ANIME_AVATARS[0].url : AVATAR_PRESETS[0].url));

  if (!isAuthModalOpen) return null;

  // Age calculation
  const parsedAge = signupAge.trim() ? parseInt(signupAge, 10) : undefined;
  const isUnder18 = parsedAge !== undefined && parsedAge < 18;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginIdentifier.trim()) {
      setError('Please enter your Account ID, username, or email.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(loginIdentifier, loginPassword);
      if (!res.success) {
        setError(res.error || 'Failed to login');
      } else {
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Firebase login error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await login('zinovis_vip', 'password123');
      if (!res.success) {
        setError(res.error || 'Failed to login');
      } else {
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Firebase login error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setResetSuccessMessage(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setLoading(true);
    try {
      const user = await findUserByEmail(cleanEmail);
      if (!user) {
        setError(`No account found matching email "${cleanEmail}". Please check your email or create a new account.`);
        setLoading(false);
        return;
      }

      // Generate secure 6-digit numeric OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      setTargetResetUser(user);

      const emailResult = await sendOtpViaEmail({
        to_email: cleanEmail,
        to_name: user.name || user.username || 'Streamer',
        otp_code: otpCode,
      });

      setIsOtpSimulated(!!emailResult.isSimulated);
      setForgotStep('otp');
      setEnteredOtp('');
      setOtpResendCountdown(45);
      setResetSuccessMessage(`A 6-digit verification code was sent to ${cleanEmail}`);
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanInput = enteredOtp.trim();
    if (!cleanInput) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (cleanInput !== generatedOtp.trim()) {
      setError('Invalid verification code. Please double check the 6-digit OTP sent to your email.');
      return;
    }

    setForgotStep('new_password');
    setError(null);
    setResetSuccessMessage('Code verified! Enter your new password below.');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resetNewPassword || resetNewPassword.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setError('New passwords do not match. Please re-enter.');
      return;
    }

    if (!targetResetUser?.id) {
      setError('Account session expired. Please restart password reset.');
      setForgotStep('email');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordAndLogin(targetResetUser.id, resetNewPassword);
      if (!res.success) {
        setError(res.error || 'Failed to update password.');
      } else {
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyEmailJsDraft = () => {
    const draftText = `EMAILJS DRAFT TEMPLATE FOR PASSWORD RESET
---------------------------------------------
SUBJECT: ${EMAILJS_DRAFT_TEMPLATE.subject}

TEMPLATE VARIABLES:
${Object.entries(EMAILJS_DRAFT_TEMPLATE.templateParams).map(([k, v]) => `• {{${k}}}: ${v}`).join('\n')}

HTML BODY:
${EMAILJS_DRAFT_TEMPLATE.htmlBody}

PLAIN TEXT:
${EMAILJS_DRAFT_TEMPLATE.plainText}
`;
    navigator.clipboard.writeText(draftText);
    setCopiedDraft(true);
    setTimeout(() => setCopiedDraft(false), 3000);
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate Name
    if (!signupName.trim()) {
      setError('Please enter your Full Name.');
      return;
    }

    // Validate Email
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    // Validate Age
    if (parsedAge === undefined || isNaN(parsedAge) || parsedAge < 5 || parsedAge > 120) {
      setError('Please enter a valid age between 5 and 120.');
      return;
    }

    // Validate Password
    if (!signupPassword || signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    // Validate Confirm Password
    if (signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      return;
    }

    // Determine final avatar
    const finalAvatar = effectiveAvatar;

    setLoading(true);
    try {
      // Derive a clean username from name or email prefix
      const derivedUsername = signupName.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') + Math.floor(Math.random() * 1000);

      const res = await signup({
        name: signupName.trim(),
        username: derivedUsername,
        email: signupEmail.trim(),
        age: parsedAge,
        country: signupCountry,
        isUnder18: isUnder18,
        password: signupPassword,
        avatar: finalAvatar,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create account');
      } else {
        closeAuthModal();
      }
    } catch (err: any) {
      setError(err.message || 'Firebase registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-neutral-950/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-md sm:max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto p-6 sm:p-8 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800/80 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-all z-10"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-0.5 shadow-lg shadow-red-500/20 flex-shrink-0">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
              {isForgotPassword ? (
                <KeyRound className="w-5 h-5 text-red-500" />
              ) : (
                <Film className="w-5 h-5 text-red-500" />
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-wide">
              {isForgotPassword 
                ? 'Forgot & Reset Password' 
                : isLogin 
                  ? 'Sign In to Zinovis' 
                  : 'Create Free VIP Account'}
            </h3>
            <p className="text-xs text-neutral-400">
              {isForgotPassword
                ? forgotStep === 'email'
                  ? 'Step 1 of 3: Enter your account email'
                  : forgotStep === 'otp'
                  ? 'Step 2 of 3: Enter 6-digit OTP code'
                  : 'Step 3 of 3: Create & confirm new password'
                : isLogin 
                  ? 'Access your saved watchlist & multi-server stream queue' 
                  : '100% Free • Synced with Firebase Cloud Backend'}
            </p>
          </div>
        </div>

        {/* Tab Switcher (Only when not in forgot password mode) */}
        {!isForgotPassword && (
          <div className="flex p-1 bg-neutral-950 border border-neutral-800 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setError(null);
                openAuthModal('login');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isLogin 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                openAuthModal('signup');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !isLogin 
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Sign Up</span>
            </button>
          </div>
        )}

        {/* Success message */}
        {resetSuccessMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{resetSuccessMessage}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-shake">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FORGOT PASSWORD WORKFLOW */}
        {/* ========================================================================= */}
        {isForgotPassword ? (
          <div className="space-y-4">
            
            {/* Step Indicator Badges */}
            <div className="grid grid-cols-3 gap-2 pb-2">
              <div className={`text-center py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                forgotStep === 'email'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-500'
              }`}>
                1. Email
              </div>
              <div className={`text-center py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                forgotStep === 'otp'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-500'
              }`}>
                2. Enter OTP
              </div>
              <div className={`text-center py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all ${
                forgotStep === 'new_password'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-500'
              }`}>
                3. New Password
              </div>
            </div>

            {/* STEP 1: EMAIL */}
            {forgotStep === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80">
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Enter the email registered with your Zinovis account. If an account is found, we'll send a 6-digit verification code to reset your password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Your Registered Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-red-600/30 hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send 6-Digit OTP Code</span>
                    </>
                  )}
                </button>

                {/* Draft Email Template Info */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailJsDraftModal(true)}
                    className="w-full py-2 px-3 rounded-2xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/90 text-xs font-medium text-neutral-400 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Code className="w-3.5 h-3.5 text-red-400" />
                    <span>View EmailJS Draft Template & Setup</span>
                  </button>
                </div>

                {/* Return to Sign in */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Code destination:</span>
                    <span className="text-xs font-bold text-white">{forgotEmail}</span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Please check your inbox (and spam/junk folder) for the 6-digit verification code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    6-Digit Verification Code <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Key className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full pl-10 pr-3.5 py-3 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-center text-lg font-mono font-bold tracking-[0.4em] text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-red-600/30 hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify OTP Code</span>
                </button>

                {/* Resend OTP */}
                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setForgotStep('email')}
                    className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={otpResendCountdown > 0 || loading}
                    className="text-red-400 hover:text-red-300 font-semibold disabled:opacity-40 disabled:hover:text-neutral-500 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{otpResendCountdown > 0 ? `Resend code in ${otpResendCountdown}s` : 'Resend OTP Code'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: NEW PASSWORD & CONFIRM */}
            {forgotStep === 'new_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-neutral-950/60 border border-neutral-800/80">
                  <div className="text-xs font-bold text-white mb-0.5">
                    Account: {targetResetUser?.name || targetResetUser?.username}
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Please enter and confirm your new password below.
                  </p>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showResetNewPassword ? 'text' : 'password'}
                      placeholder="Min. 4 characters"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                      required
                      minLength={4}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                      className="absolute right-3.5 text-neutral-500 hover:text-neutral-300"
                    >
                      {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                    <input
                      type={showResetConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your new password"
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                      required
                      minLength={4}
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                      className="absolute right-3.5 text-neutral-500 hover:text-neutral-300"
                    >
                      {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-red-600/30 hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Change Password & Sign In</span>
                    </>
                  )}
                </button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError(null);
                    }}
                    className="text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    Cancel & Return to Sign In
                  </button>
                </div>
              </form>
            )}

          </div>
        ) : isLogin ? (
          /* ================= LOGIN FORM ================= */
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                Account ID, Username, or Email
              </label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. zinovis_vip or name@domain.com"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setForgotStep('email');
                    setForgotEmail(loginIdentifier.includes('@') ? loginIdentifier : '');
                    setError(null);
                  }}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 text-neutral-500 hover:text-neutral-300"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-red-600/30 hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Zinovis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>



            {/* Switch to Sign Up */}
            <div className="pt-3 border-t border-neutral-800/80 text-center">
              <p className="text-xs text-neutral-400">
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    openAuthModal('signup');
                  }}
                  className="font-bold text-red-400 hover:text-red-300 hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer ml-1"
                >
                  <span>Sign Up / Create Free Account</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>
          </form>
        ) : (
          /* ================= SIGNUP FORM (ALL USER REQUESTED FIELDS) ================= */
          <form onSubmit={handleSignupSubmit} className="space-y-4">
            
            {/* 1. Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Enter your full name (e.g. Rahin Ahmed)"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            {/* 2. Email */}
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            {/* 3. Age & 4. Country (Row) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Age */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Age <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type="number"
                    min="5"
                    max="120"
                    placeholder="e.g. 17 or 22"
                    value={signupAge}
                    onChange={(e) => setSignupAge(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                </div>
              </div>

              {/* Country (All Countries Dropdown) */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Globe className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                  <select
                    value={signupCountry}
                    onChange={(e) => setSignupCountry(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500 appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.name} value={c.name} className="bg-neutral-900 text-white">
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Dynamic Age Filter Warning / Notification */}
            {signupAge.trim() && (
              <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 border transition-all ${
                isUnder18 
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400' 
                  : 'bg-blue-950/40 border-blue-500/40 text-blue-400'
              }`}>
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <div>
                  {isUnder18 ? (
                    <span>
                      <strong>Safe Mode Active (Age {parsedAge}):</strong> All 18+ adult content will automatically be filtered down from your catalog.
                    </span>
                  ) : (
                    <span>
                      <strong>Adult Streamer (Age {parsedAge}):</strong> Unrestricted access to entire global cinema catalog.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 5. Password & 6. Confirm Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Pass */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 bg-neutral-950 border border-neutral-800 focus:border-red-500 rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-red-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword(!showSignupPassword)}
                    className="absolute right-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Pass */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-type password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-9 py-2.5 bg-neutral-950 border rounded-2xl text-xs sm:text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 transition-all ${
                      signupConfirmPassword && signupPassword !== signupConfirmPassword
                        ? 'border-red-500 focus:ring-red-500'
                        : signupConfirmPassword && signupPassword === signupConfirmPassword
                        ? 'border-emerald-500 focus:ring-emerald-500'
                        : 'border-neutral-800 focus:border-red-500 focus:ring-red-500'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-neutral-500 hover:text-neutral-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* 7. Photo / Profile Pic Selection */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-neutral-300">
                  Profile Photo (Photo or Anime)
                </label>
                <span className="text-[11px] text-neutral-500">Auto-suggests initial if empty</span>
              </div>

              {/* Avatar Category Selector */}
              <div className="flex p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAvatarCategory('initial');
                    setSelectedAvatarUrl(nameInitialAvatar);
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    avatarCategory === 'initial'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Smile className="w-3.5 h-3.5 text-amber-400" />
                  <span>Name Initial</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvatarCategory('anime');
                    if (!selectedAvatarUrl || selectedAvatarUrl.startsWith('data:')) {
                      setSelectedAvatarUrl(ANIME_AVATARS[0].url);
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    avatarCategory === 'anime'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span>Anime Heroes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAvatarCategory('presets');
                    if (!selectedAvatarUrl || selectedAvatarUrl.startsWith('data:')) {
                      setSelectedAvatarUrl(AVATAR_PRESETS[0].url);
                    }
                  }}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                    avatarCategory === 'presets'
                      ? 'bg-neutral-800 text-white shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Film className="w-3.5 h-3.5 text-red-400" />
                  <span>VIP Streamers</span>
                </button>
              </div>

              {/* Category Display */}
              {avatarCategory === 'initial' && (
                <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-red-500 shadow-md shadow-red-500/20 flex-shrink-0">
                    <img src={nameInitialAvatar} alt="Initial Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Suggested Name Initial Avatar:</span>
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px] font-black">
                        {(signupName.trim().charAt(0) || 'U').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Automatically renders a vibrant lettermark using your name ({signupName || 'User'}).
                    </p>
                  </div>
                </div>
              )}

              {avatarCategory === 'anime' && (
                <div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {ANIME_AVATARS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(preset.url)}
                        className={`relative flex-shrink-0 w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all ${
                          selectedAvatarUrl === preset.url
                            ? 'border-red-500 scale-105 shadow-md shadow-red-500/40 ring-2 ring-red-500/30'
                            : 'border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600'
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        {selectedAvatarUrl === preset.url && (
                          <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {avatarCategory === 'presets' && (
                <div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(preset.url)}
                        className={`relative flex-shrink-0 w-12 h-12 rounded-2xl overflow-hidden border-2 transition-all ${
                          selectedAvatarUrl === preset.url
                            ? 'border-red-500 scale-105 shadow-md shadow-red-500/40 ring-2 ring-red-500/30'
                            : 'border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600'
                        }`}
                        title={preset.name}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        {selectedAvatarUrl === preset.url && (
                          <div className="absolute inset-0 bg-red-600/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-red-600/30 hover:shadow-red-500/50 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Create VIP Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Switch to Sign In */}
            <div className="pt-3 border-t border-neutral-800/80 text-center">
              <p className="text-xs text-neutral-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    openAuthModal('login');
                  }}
                  className="font-bold text-red-400 hover:text-red-300 hover:underline transition-colors inline-flex items-center gap-1 cursor-pointer ml-1"
                >
                  <span>Sign In here</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </div>
          </form>
        )}

      </div>

      {/* EmailJS Draft Template Modal */}
      {showEmailJsDraftModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn">
          <div 
            className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">EmailJS Draft Template for OTP</h4>
                  <p className="text-xs text-neutral-400">Copy this template directly into your EmailJS dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailJsDraftModal(false)}
                className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Copy Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
              <div>
                <div className="text-xs font-bold text-white">Ready-to-Use EmailJS Draft Template</div>
                <div className="text-[11px] text-neutral-400">Includes subject line, styled HTML body, and parameter placeholders.</div>
              </div>
              <button
                type="button"
                onClick={handleCopyEmailJsDraft}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/30"
              >
                {copiedDraft ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Draft Template</span>
                  </>
                )}
              </button>
            </div>

            {/* Details */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-300 mb-1">Subject Line</label>
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-neutral-200">
                  {EMAILJS_DRAFT_TEMPLATE.subject}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">EmailJS Template Variables</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800">
                  {Object.entries(EMAILJS_DRAFT_TEMPLATE.templateParams).map(([key, desc]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="font-mono text-red-400 font-bold">{`{{${key}}}`}</span>
                      <span className="text-neutral-400 text-[11px]">- {desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">HTML Content (Formatted for Email Clients)</label>
                <pre className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {EMAILJS_DRAFT_TEMPLATE.htmlBody}
                </pre>
              </div>

              <div>
                <label className="block font-bold text-neutral-300 mb-1">Plain Text Fallback</label>
                <pre className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-32 whitespace-pre-wrap">
                  {EMAILJS_DRAFT_TEMPLATE.plainText}
                </pre>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setShowEmailJsDraftModal(false)}
                className="px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
