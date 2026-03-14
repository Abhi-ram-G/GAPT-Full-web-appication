
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { User, UserRole, UserStatus } from '../types';
import { ApiService } from '../store';
import { AuthContext } from '../AuthContext';
import { ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '../constants';

// Graduation watercolor background – served from /public/assets/
const GRAD_BG = '/assets/graduation_bg.png';

const GaptLogo = ({ className }: { className?: string }) => (
  <div className={`relative ${className}`}>
    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-green-600 rounded-[2.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center p-5 border border-white/20 relative overflow-hidden group transition-transform hover:scale-105 duration-500">
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
      <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-gradient-to-br from-white/10 via-transparent to-transparent rotate-45 pointer-events-none"></div>

      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <div className="flex items-end gap-1 mb-1">
          <div className="w-2 h-4 bg-white rounded-sm opacity-60"></div>
          <div className="w-2 h-7 bg-white rounded-sm opacity-80"></div>
          <div className="w-2 h-5 bg-white rounded-sm"></div>
        </div>
        <div className="w-10 h-1 bg-white/40 rounded-full mt-1"></div>
        <div className="absolute top-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg border border-emerald-100">
          <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
      </div>

      <div className="absolute top-2 left-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-[0_0_8px_white]"></div>
      <div className="absolute bottom-4 right-6 w-1 h-1 bg-emerald-200 rounded-full animate-ping"></div>
    </div>
    <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-full -z-10"></div>
  </div>
);

const Login: React.FC = () => {
  const { login } = React.useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);

  useEffect(() => {
    // If backend returns chosen email in query (?google_email=...), surface it.
    const params = new URLSearchParams(window.location.search);
    const returnedEmail = params.get('google_email');
    if (returnedEmail) {
      setGoogleEmail(returnedEmail);
    } else {
      const cached = localStorage.getItem('google_email_hint');
      if (cached) setGoogleEmail(cached);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      if (err.message.includes('invalid_grant') || err.message.includes('Invalid credentials')) {
        setError("Credentials not found. An access request has been automatically dispatched to the administrator for verification.");
      } else if (err.message.includes('HTML')) {
        setError("Backend communication failure. Check server status.");
      } else {
        setError(err.message || "Authentication failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setError(null);
    const bitsDomain = '@bitsathy.ac.in';
    const chosen = email || googleEmail || '';
    const isBitsMail = chosen.toLowerCase().endsWith(bitsDomain);
    if (!isBitsMail) {
      setError('Use your BITSATHY Google ID (name.xxyy@bitsathy.ac.in).');
      return;
    }
    localStorage.setItem('google_email_hint', chosen);
    setGoogleEmail(chosen);
    setIsGoogleLoading(true);
    // Force Google account chooser with domain and login_hint for clarity.
    const target = `/auth/google?hd=bitsathy.ac.in&login_hint=${encodeURIComponent(chosen)}&prompt=select_account`;
    window.location.href = target;
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden font-sans bg-surface-deep">

      {/* Background Layer - Graduation Watercolor Artwork */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-110"
          style={{ backgroundImage: `url("${GRAD_BG}")` }}
        ></div>
        {/* Subtle dark veil so the card stays readable */}
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50"></div>
      </div>

      <div className="relative z-20 flex flex-col items-center w-full max-w-[1440px] px-6 py-8 animate-in fade-in zoom-in-95 duration-1000">
        <GaptLogo className="w-20 h-20 md:w-24 md:h-24 mb-6 animate-vibrate-slow" />

        <div className="text-center mb-8">
          <h2 className="text-white text-xl md:text-3xl font-black uppercase tracking-[0.2em] drop-shadow-2xl leading-tight">
            Green Academic Performance<br /><span className="text-emerald-400">Tracker</span>
          </h2>
        </div>

        {/* Adaptive Detail Container Box - Color changes automatically with theme */}
        <div className="w-[95%] max-w-md backdrop-blur-3xl bg-surface-elevated/90 border border-white/10 rounded-[2.5rem] md:rounded-[3rem] p-6 md:p-8 shadow-[0_60px_120px_-20px_rgba(0,0,0,0.6)] flex flex-col items-center animate-heartbeat">

          <form onSubmit={handleLogin} className="w-full space-y-4 md:space-y-6">
            {/* Email Input - Light Green Background remains persistent but border adapts */}
            <div className="relative group">
              <label htmlFor="login-email" className="sr-only">Email Address</label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/60 group-focus-within:text-primary transition-colors">
                <Mail className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              </div>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-emerald-50 border-2 border-emerald-100/50 rounded-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-emerald-900/50 shadow-inner text-xs md:text-sm tracking-tight"
                placeholder="Email Address"
              />
            </div>

            {/* Password Input - Light Green Background remains persistent but border adapts */}
            <div className="relative group">
              <label htmlFor="login-password" className="sr-only">Password</label>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/60 group-focus-within:text-primary transition-colors">
                <Lock className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />
              </div>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-emerald-50 border-2 border-emerald-100/50 rounded-full pl-10 md:pl-12 pr-10 py-2.5 md:py-3 text-slate-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-emerald-900/50 shadow-inner text-xs md:text-sm tracking-tight"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600/60 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-lg outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" /> : <Eye className="w-4 h-4 md:w-5 md:h-5" aria-hidden="true" />}
              </button>
            </div>

            <div className="flex justify-end pr-2 md:pr-4">
              <button type="button" className="text-[8px] md:text-[10px] font-black text-text-muted hover:text-primary transition-colors uppercase tracking-[0.2em]">Forgot Password?</button>
            </div>

            {error && (
              <div role="alert" className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 text-[10px] font-black uppercase text-center tracking-widest">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-2.5 md:py-3.5 rounded-full shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] transition-all active:scale-[0.98] uppercase text-xs md:text-sm tracking-[0.5em] disabled:opacity-50 overflow-hidden relative"
            >
              {isLoading ? (
                <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
              ) : (
                <span className="relative z-10">Login</span>
              )}
              <div className="absolute top-0 -left-[100%] w-full h-full bg-white/20 skew-x-[-20deg] group-hover:left-[100%] transition-all duration-700 pointer-events-none"></div>
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full bg-white text-slate-800 font-black py-2.5 md:py-3.5 rounded-full border-2 border-emerald-200 hover:border-emerald-400 shadow-[0_12px_30px_-12px_rgba(0,0,0,0.35)] transition-all active:scale-[0.98] uppercase text-xs md:text-sm tracking-[0.25em] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 md:w-5 md:h-5" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6 1.54 7.38 2.83l5.4-5.4C33.66 3.99 29.2 2 24 2 14.94 2 7.26 7.76 4.34 16l6.88 5.34C12.68 14.06 17.86 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.5 24.5c0-1.57-.14-3.08-.4-4.5H24v9h12.7c-.55 2.82-2.21 5.2-4.7 6.8l7.18 5.58C43.9 37.7 46.5 31.6 46.5 24.5z" />
                    <path fill="#FBBC05" d="M11.22 28.66c-.5-1.48-.78-3.06-.78-4.66s.28-3.18.78-4.66L4.34 14C2.89 17.14 2 20.47 2 24s.89 6.86 2.34 10l6.88-5.34z" />
                    <path fill="#34A853" d="M24 46c5.4 0 9.92-1.78 13.22-4.84l-7.18-5.58c-1.99 1.34-4.54 2.12-6.04 2.12-5.32 0-9.83-3.58-11.44-8.5l-6.9 5.36C7.4 40.26 14.98 46 24 46z" />
                    <path fill="none" d="M2 2h44v44H2z" />
                  </svg>
                  <span className="relative z-10">Login with Google</span>
                </>
              )}
            </button>
            <div className="space-y-1 text-center">
              <p className="text-[10px] text-emerald-200/80 font-semibold uppercase tracking-[0.18em]">
                Use your BITSATHY Google ID (name.xxyy@bitsathy.ac.in) only
              </p>
              {googleEmail && (
                <p className="text-[11px] font-bold text-white/90">
                  Selected account: <span className="text-emerald-300">{googleEmail}</span>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {popup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4" role="dialog" aria-modal="true" aria-labelledby="popup-title">
          <div className="bg-surface-elevated border border-white/10 p-10 md:p-12 rounded-[3rem] md:rounded-[4rem] text-center max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 id="popup-title" className="text-xl md:text-2xl font-black text-text-primary mb-6 uppercase tracking-tighter leading-tight">{popup.title}</h3>
            <p className="text-text-muted text-xs font-medium leading-relaxed mb-10">{popup.message}</p>
            <button onClick={() => setPopup(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 md:py-5 rounded-[2rem] transition-all uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-emerald-900/40 focus-visible:ring-4 focus-visible:ring-emerald-500/50 outline-none">Understand</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
