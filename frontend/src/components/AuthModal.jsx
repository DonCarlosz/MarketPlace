import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Store,
  Mail,
  Lock,
  User as UserIcon,
  MapPin,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  RotateCw,
} from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    authModalView,
    closeAuthModal,
    setAuthModalView,
    login,
    sendSignupOtp,
    verifySignupOtp,
    sendForgotPasswordOtp,
    resetPasswordWithOtp,
    resendOtp,
  } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleResetState = () => {
    setError('');
    setStatusMessage('');
    setResetSuccess(false);
    setLoading(false);
    setOtp('');
  };

  const switchView = (view) => {
    handleResetState();
    setAuthModalView(view);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Signup: Send OTP to email
  const handleRegisterInitiate = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await sendSignupOtp({
        name,
        email,
        password,
        city: city || 'Local Area',
        neighborhood,
      });
      setStatusMessage(res.message || `A 6-digit verification code was sent to ${email}`);
      setAuthModalView('verify-signup');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Signup: Verify OTP and log in
  const handleVerifySignup = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!otp || otp.trim().length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);

    try {
      await verifySignupOtp(email, otp.trim());
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. The code may be expired or invalid.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 of Forgot Password: Send OTP to email
  const handleForgotInitiate = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');
    setLoading(true);

    try {
      const res = await sendForgotPasswordOtp(email);
      setStatusMessage(res.message || `A 6-digit password reset code was sent to ${email}`);
      setAuthModalView('verify-forgot');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send password reset code. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 of Forgot Password: Verify OTP and update password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setStatusMessage('');

    if (!otp || otp.trim().length < 6) {
      setError('Please enter the 6-digit code received in your email.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await resetPasswordWithOtp(email, otp.trim(), newPassword);
      setStatusMessage(res.message || 'Password has been reset successfully!');
      setResetSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Password reset failed. Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP helper
  const handleResend = async (purpose) => {
    setError('');
    setResending(true);
    try {
      const res = await resendOtp(email, purpose);
      setStatusMessage(res.message || 'A new 6-digit code has been sent to your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend code. Please wait a moment and try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-[420px] max-h-[calc(100vh-2rem)] flex flex-col bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden text-slate-900 my-auto animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 z-20 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition"
          title="Close"
          aria-label="Close authentication modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Container */}
        <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-6 overscroll-contain">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-5 pt-1">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-100 mb-2.5">
              <Store className="w-5 h-5" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 leading-snug">
              {authModalView === 'login' && 'Welcome to LocalMarket'}
              {authModalView === 'register' && 'Join LocalMarket'}
              {authModalView === 'verify-signup' && 'Verify Your Email'}
              {authModalView === 'forgot' && 'Reset your password'}
              {authModalView === 'verify-forgot' && 'Enter Verification Code'}
            </h2>

            <p className="text-[12px] text-slate-500 mt-1 max-w-[300px]">
              {authModalView === 'login' &&
                'Find second-hand treasures, brand-new goods & local services.'}
              {authModalView === 'register' &&
                'Connect with verified neighbors and trade safely with zero fees.'}
              {authModalView === 'verify-signup' &&
                `We sent a 6-digit verification code to ${email}.`}
              {authModalView === 'forgot' &&
                'Enter your registered email to receive a password recovery code.'}
              {authModalView === 'verify-forgot' &&
                `Enter the 6-digit code sent to ${email} to set a new password.`}
            </p>
          </div>

          {/* Status Alert */}
          {statusMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{statusMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-[11px] text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* VIEW 1: LOGIN */}
          {authModalView === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Forgot your password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition shadow-md shadow-indigo-100 mt-1"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>

              <div className="pt-3 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Not on LocalMarket yet?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('register')}
                    className="font-bold text-slate-900 hover:text-indigo-600 transition"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* VIEW 2: REGISTER STEP 1 (Enter Details -> Triggers OTP) */}
          {authModalView === 'register' && (
            <form onSubmit={handleRegisterInitiate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Full Name</label>
                <div className="relative flex items-center">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Email</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">City / Region</label>
                  <div className="relative flex items-center">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Lagos"
                      className="w-full text-xs pl-8 pr-2.5 py-2 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Neighborhood</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="e.g. Ikeja"
                    className="w-full text-xs px-3 py-2 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 transition"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-500 text-center leading-tight pt-0.5">
                We will email a 6-digit verification code to ensure account authenticity.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition shadow-md shadow-slate-200 mt-1"
              >
                {loading ? 'Sending Verification Code...' : 'Continue with Email'}
              </button>

              <div className="pt-2.5 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="font-bold text-slate-900 hover:text-indigo-600 transition"
                  >
                    Log in
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* VIEW 2B: REGISTER STEP 2 (Verify OTP) */}
          {authModalView === 'verify-signup' && (
            <form onSubmit={handleVerifySignup} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 text-center">
                  6-Digit Verification Code
                </label>
                <div className="relative flex items-center justify-center">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    required
                    autoFocus
                    className="w-48 text-center text-2xl font-mono tracking-widest py-3 rounded-2xl border-2 border-indigo-200 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition shadow-inner font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Code expires in 10 minutes.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition shadow-md shadow-indigo-100"
              >
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => switchView('register')}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit Details
                </button>

                <button
                  type="button"
                  onClick={() => handleResend('signup')}
                  disabled={resending}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold disabled:opacity-50 transition"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3: FORGOTTEN PASSWORD STEP 1 (Enter Email -> Triggers OTP) */}
          {authModalView === 'forgot' && (
            <form onSubmit={handleForgotInitiate} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Registered Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition shadow-md shadow-indigo-100"
              >
                {loading ? 'Sending Recovery Code...' : 'Send Recovery Code'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Log In
                </button>
              </div>
            </form>
          )}

          {/* VIEW 3B: FORGOTTEN PASSWORD STEP 2 (Verify OTP & Reset Password) */}
          {authModalView === 'verify-forgot' && (
            <div>
              {resetSuccess ? (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Password Reset Complete</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    Your password has been successfully updated. You can now log in to your account.
                  </p>
                  <button
                    type="button"
                    onClick={() => switchView('login')}
                    className="w-full py-2.5 bg-indigo-600 text-white text-xs font-bold rounded-2xl hover:bg-indigo-700 transition"
                  >
                    Log In Now
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 text-center">
                      6-Digit Code
                    </label>
                    <div className="flex justify-center">
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        required
                        autoFocus
                        className="w-48 text-center text-2xl font-mono tracking-widest py-2.5 rounded-2xl border-2 border-indigo-200 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition shadow-inner font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      New Password
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        required
                        className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-300 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition shadow-md shadow-indigo-100"
                  >
                    {loading ? 'Updating Password...' : 'Reset Password'}
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => switchView('forgot')}
                      className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Change Email
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResend('forgot_password')}
                      disabled={resending}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold disabled:opacity-50 transition"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                      {resending ? 'Sending...' : 'Resend Code'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
