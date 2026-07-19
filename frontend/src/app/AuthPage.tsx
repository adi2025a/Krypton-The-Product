import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { authAPI } from "../config/api";

interface AuthPageProps {
  // api.ts's authAPI.login only returns { access_token, token_type } --
  // there's no `user` object anywhere in the backend's auth responses.
  // The token itself is already persisted (sessionStorage) inside
  // authAPI.login. App.tsx's handleAuthSuccess still wants the email
  // though (to show "signed in as ..." and drive its own onboarding
  // check), so that's the one thing we hand back up.
  onSuccess: (email: string) => void;
}

type AuthView = "login" | "signup" | "otp";

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  // Shown briefly on the login view after OTP verification succeeds,
  // since verifyOtp doesn't log the user in -- they land back on
  // login and need to know *why* they're here again.
  const [justVerified, setJustVerified] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill all fields"); triggerShake(); return; }
    setLoading(true);
    try {
      // authAPI.login stores the access_token in sessionStorage itself;
      // there's no user object to unpack here, just hand the email
      // back up for App.tsx to remember.
      await authAPI.login(email, password);
      onSuccess(email);
    } catch (err: any) {
      setError(err.message ?? "Login failed");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill all fields"); triggerShake(); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); triggerShake(); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); triggerShake(); return; }
    setLoading(true);
    try {
      await authAPI.signup(email, password);
      setView("otp");
    } catch (err: any) {
      setError(err.message ?? "Signup failed");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOTPPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit code"); triggerShake(); return; }
    setLoading(true);
    setError("");
    try {
      // verifyOtp only marks the account verified -- it deliberately
      // does NOT return a token or auto-login. Send them to the login
      // view instead of calling onSuccess.
      await authAPI.verifyOtp(email, code);
      setOtp(["", "", "", "", "", ""]);
      setPassword("");
      setConfirmPassword("");
      setJustVerified(true);
      setView("login");
    } catch (err: any) {
      setError(err.message ?? "Invalid code");
      triggerShake();
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: Brand Panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-card border-r border-border p-12 relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,229,176,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,176,1) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-['Rajdhani'] text-2xl font-700 tracking-widest text-foreground uppercase">
              KRYPTON
            </span>
          </div>
          <p className="text-muted-foreground text-sm tracking-wide uppercase font-mono">
            AI-Powered Trading Intelligence
          </p>
        </div>

        <div className="relative z-10 space-y-8">
          {[
            { icon: "⚡", title: "Multi-LLM Intelligence", desc: "GPT-4, Gemini, Claude & Groq for market analysis" },
            { icon: "📊", title: "Real-Time Indicators", desc: "EMA, MACD, RSI — live with AI commentary" },
            { icon: "🛡️", title: "Risk Analysis Engine", desc: "Portfolio-aware risk scoring via Binance API" },
          ].map((f) => (
            <div key={f.title} className="flex gap-4">
              <span className="text-2xl mt-0.5">{f.icon}</span>
              <div>
                <div className="font-['Rajdhani'] text-base font-600 text-foreground">{f.title}</div>
                <div className="text-muted-foreground text-sm mt-0.5">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-xs text-muted-foreground font-mono">
          © 2025 Krypton · Not financial advice
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <Zap size={16} className="text-primary-foreground" fill="currentColor" />
            </div>
            <span className="font-['Rajdhani'] text-2xl font-700 tracking-widest text-foreground uppercase">KRYPTON</span>
          </div>

          <AnimatePresence mode="wait">
            {view === "login" && (
              <motion.div key="login" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <h1 className="text-3xl font-['Rajdhani'] font-700 text-foreground mb-1">Welcome back</h1>
                  <p className="text-muted-foreground text-sm">Sign in to your Krypton account</p>
                </div>

                <AnimatePresence>
                  {justVerified && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-primary text-sm bg-primary/10 border border-primary/20 rounded-lg px-3 py-2.5 mb-4"
                    >
                      <CheckCircle2 size={14} />
                      Email verified — you can sign in now.
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.form
                  onSubmit={handleLogin}
                  animate={shake ? { x: [-6, 6, -6, 6, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Email Address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setJustVerified(false); }}
                        placeholder="you@example.com"
                        className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-secondary border border-border rounded-lg pl-10 pr-11 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5"
                      >
                        <AlertCircle size={14} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-['Rajdhani'] font-700 text-base tracking-widest uppercase hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Spinner /> Authenticating...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">Sign In <ArrowRight size={16} /></span>
                    )}
                  </button>
                </motion.form>

                <p className="text-center text-muted-foreground text-sm mt-6">
                  No account?{" "}
                  <button onClick={() => { setView("signup"); setError(""); setJustVerified(false); }} className="text-primary hover:text-primary/80 transition-colors font-medium">
                    Create one
                  </button>
                </p>
              </motion.div>
            )}

            {view === "signup" && (
              <motion.div key="signup" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <div className="mb-8">
                  <h1 className="text-3xl font-['Rajdhani'] font-700 text-foreground mb-1">Create account</h1>
                  <p className="text-muted-foreground text-sm">Start your AI trading journey</p>
                </div>

                <motion.form
                  onSubmit={handleSignup}
                  animate={shake ? { x: [-6, 6, -6, 6, 0] } : {}}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Email Address</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        className="w-full bg-secondary border border-border rounded-lg pl-10 pr-11 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block font-mono">Confirm Password</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full bg-secondary border border-border rounded-lg pl-10 pr-4 py-3 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                      />
                    </div>
                  </div>

                  <PasswordStrength password={password} />

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5"
                      >
                        <AlertCircle size={14} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-['Rajdhani'] font-700 text-base tracking-widest uppercase hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? <span className="flex items-center gap-2"><Spinner /> Sending code...</span> : <span className="flex items-center gap-2">Create Account <ArrowRight size={16} /></span>}
                  </button>
                </motion.form>

                <p className="text-center text-muted-foreground text-sm mt-6">
                  Already have an account?{" "}
                  <button onClick={() => { setView("login"); setError(""); setJustVerified(false); }} className="text-primary hover:text-primary/80 transition-colors font-medium">
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}

            {view === "otp" && (
              <motion.div key="otp" variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.25 }}>
                <div className="mb-8 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 border border-primary/20 rounded-2xl mb-4">
                    <ShieldCheck size={24} className="text-primary" />
                  </div>
                  <h1 className="text-3xl font-['Rajdhani'] font-700 text-foreground mb-1">Verify Email</h1>
                  <p className="text-muted-foreground text-sm">
                    Enter the 6-digit code sent to<br />
                    <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>

                <motion.form
                  onSubmit={handleVerifyOTP}
                  animate={shake ? { x: [-6, 6, -6, 6, 0] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex gap-3 justify-center mb-6" onPaste={handleOTPPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-['JetBrains_Mono'] font-600 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/30 transition-all"
                        style={{ caretColor: "transparent" }}
                      />
                    ))}
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5 mb-4"
                      >
                        <AlertCircle size={14} />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading || otp.join("").length < 6}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-['Rajdhani'] font-700 text-base tracking-widest uppercase hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? <span className="flex items-center gap-2"><Spinner /> Verifying...</span> : <span className="flex items-center gap-2">Verify & Continue <ArrowRight size={16} /></span>}
                  </button>
                </motion.form>

                <div className="text-center mt-4">
                  <ResendTimer onResend={() => authAPI.resendOtp(email)} />
                </div>
                <p className="text-center text-muted-foreground text-sm mt-3">
                  <button onClick={() => { setView("signup"); setError(""); setOtp(["","","","","",""]); }} className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                    Change email
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const strength = getStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength.score
                ? strength.score <= 1 ? "bg-destructive" : strength.score <= 2 ? "bg-amber-500" : strength.score <= 3 ? "bg-yellow-400" : "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{strength.label}</p>
    </div>
  );
}

function getStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] || "Too short" };
}

function ResendTimer({ onResend }: { onResend: () => Promise<any> }) {
  const [seconds, setSeconds] = useState(30);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const handleResend = async () => {
    setResending(true);
    await onResend().catch(() => {});
    setResending(false);
    setSeconds(30);
  };

  if (seconds > 0) return (
    <p className="text-muted-foreground text-sm">
      Resend code in <span className="font-mono text-foreground">{seconds}s</span>
    </p>
  );

  return (
    <button
      onClick={handleResend}
      disabled={resending}
      className="text-primary hover:text-primary/80 text-sm transition-colors disabled:opacity-60"
    >
      {resending ? "Resending..." : "Resend code"}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}