import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowRight, RefreshCw, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AuthPage: React.FC = () => {
  const { login, signup, verifyOtp, resendOtp, setShowLLMSetup, setShowBinanceSetup } = useAuth();

  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  
  // State for OTP step
  const [isOtpStep, setIsOtpStep] = useState<boolean>(false);
  const [signupMessage, setSignupMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // OTP resend timer
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isLogin) {
        // 1. Login flow
        await login(email, password);
      } else {
        // 2. Signup flow
        const msg = await signup(email, password);
        setSignupMessage(msg || 'OTP sent to your email.');
        setIsOtpStep(true);
        setResendCooldown(30);
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'An error occurred during authentication';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 3. Verify OTP route
      await verifyOtp(email, otp);
      setSuccessMsg('Email verified successfully! Logging you in...');
      
      // Auto login after verify
      await login(email, password);
      setIsOtpStep(false);
      setShowLLMSetup(true); // Open LLM key input modal for signup
      setShowBinanceSetup(true); // Optional next step
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Invalid or expired OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // 4. Resend OTP route
      const msg = await resendOtp(email);
      setSuccessMsg(msg || 'A new verification OTP has been sent to your email.');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Failed to resend OTP';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060911] flex items-center justify-center p-4">
      {/* Background Animated Blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl animate-pulse-glow pointer-events-none" style={{ animationDelay: '3s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full glass-panel border border-indigo-500/30 mb-4 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span className="text-sm font-semibold tracking-wider uppercase text-indigo-300">Krypton Intelligence</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            Crypto Trading <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">Copilot</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Multi-agent intelligence, risk analytics & live market sentiment
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-panel p-8 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl">
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-sm"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-300 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {!isOtpStep ? (
              /* LOGIN / SIGNUP FORM */
              <motion.div
                key="auth-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Tabs */}
                <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-900/60 border border-white/5">
                  <button
                    type="button"
                    onClick={() => { setIsLogin(true); setError(null); }}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
                      isLogin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsLogin(false); setError(null); }}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-all ${
                      !isLogin ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="trader@krypton.ai"
                        className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>{isLogin ? 'Sign In to Dashboard' : 'Create Free Account'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              /* OTP VERIFICATION STEP */
              <motion.div
                key="otp-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl border border-indigo-500/40 flex items-center justify-center mx-auto mb-3">
                    <KeyRound className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Verify Your Email</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {signupMessage || `We sent a 6-digit code to ${email}`}
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                      6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.trim())}
                      placeholder="123456"
                      className="w-full py-3.5 text-center text-2xl font-mono tracking-[0.5em] rounded-xl glass-input focus:border-cyan-400 text-cyan-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span>Verify & Continue</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setIsOtpStep(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ← Back to Sign Up
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold disabled:opacity-40 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
