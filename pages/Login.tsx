
import React, { useState, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
import { ApiService } from '../store';
import { AuthContext } from '../AuthContext';
import { ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '../constants';

const Login: React.FC = () => {
  const { login } = React.useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ title: string; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [matchingUser, setMatchingUser] = useState<User | null>(null);

  // Effect to look up user as they type to check for reveal status
  useEffect(() => {
    const lookup = async () => {
      if (email.includes('@')) {
        const users = await ApiService.getUsers();
        const found = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
        setMatchingUser(found || null);
      } else {
        setMatchingUser(null);
      }
    };
    lookup();
  }, [email]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const users = await ApiService.getUsers();
      const foundUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === DEFAULT_ADMIN_PASSWORD) {
        login(ADMIN_EMAIL);
        setIsLoading(false);
        return;
      }

      if (!foundUser) {
        const isStudent = email.includes('.std.');
        const newUser: User = {
          id: crypto.randomUUID(), 
          email: email.trim().toLowerCase(), 
          password: isStudent ? 'stdbitsathy' : 'stfbitsathy',
          name: email.split('@')[0].replace('.', ' ').toUpperCase(), 
          role: isStudent ? UserRole.STUDENT : UserRole.STAFF,
          status: UserStatus.PENDING, 
          createdAt: new Date().toISOString(), 
          department: 'Pending Assignment', 
          studyYear: '1st Year'
        };
        await ApiService.addUser(newUser);
        setPopup({ title: "Verification Triggered", message: "Institutional identity recognized. Access is currently in 'PENDING' state awaiting administrative verification." });
        setIsLoading(false);
        return;
      }

      if (foundUser.status === UserStatus.PENDING) {
        setPopup({ title: "Access Pending", message: "Your account is in the verification queue. Default password for your role applies upon approval." });
        setIsLoading(false);
        return;
      }

      if (foundUser.status === UserStatus.REJECTED) {
        setError("Institutional access denied. Please contact system governance.");
        setIsLoading(false);
        return;
      }

      if (password === foundUser.password) {
        login(foundUser.email);
      } else {
        setError("Invalid institutional credentials. Please try again.");
      }
    } catch (err) {
      setError("Database connection failure. Please try later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestReveal = async () => {
    if (!matchingUser) return;
    await ApiService.updateUser(matchingUser.id, { passwordViewRequestStatus: 'PENDING' });
    setPopup({ title: "Petition Dispatched", message: "Your request to reveal the modified credential has been sent to the Dean. Please check back later." });
    // Update local state for immediate UI feedback
    setMatchingUser({ ...matchingUser, passwordViewRequestStatus: 'PENDING' });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-surface-deep relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      </div>

      <div className="z-10 w-full max-w-md p-10 backdrop-blur-3xl bg-surface-elevated/40 border border-white/5 rounded-[3rem] shadow-2xl flex flex-col items-center">
        <div className="mb-10 text-center space-y-3">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-primary/20">G</div>
          <h1 className="text-4xl font-black text-text-primary tracking-tighter uppercase">GAPT</h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em]">Paperless institutional monitoring</p>
        </div>

        {/* Institutional Password Reveal Protocol UI */}
        {matchingUser && matchingUser.passwordViewRequestStatus !== undefined && matchingUser.passwordViewRequestStatus !== 'NONE' && (
           <div className="w-full mb-8 animate-in slide-in-from-top-4">
              <div className={`p-6 rounded-3xl border-2 text-center transition-all ${
                matchingUser.passwordViewRequestStatus === 'PENDING' ? 'bg-amber-500/10 border-amber-500/30' :
                matchingUser.passwordViewRequestStatus === 'APPROVED' ? 'bg-emerald-500/10 border-emerald-500/40' :
                'bg-red-500/20 border-red-500/50'
              }`}>
                 <p className="text-[10px] font-black uppercase tracking-widest text-text-primary/70 mb-2">Institutional Security Alert</p>
                 {matchingUser.passwordViewRequestStatus === 'PENDING' ? (
                   <p className="text-xs font-bold text-amber-500 uppercase">Awaiting Dean Authorization...</p>
                 ) : matchingUser.passwordViewRequestStatus === 'APPROVED' ? (
                   <div>
                     <p className="text-xs font-bold text-emerald-500 uppercase mb-2">Access Granted!</p>
                     <p className="text-sm font-black text-text-primary bg-black/20 p-2 rounded-xl border border-white/5 font-mono">PWD: {matchingUser.password}</p>
                   </div>
                 ) : (
                   <p className="text-sm font-black text-red-500 uppercase tracking-tighter scale-110">MEET THE ADMIN</p>
                 )}
              </div>
           </div>
        )}

        {/* Detect Dean Modification */}
        {matchingUser && matchingUser.passwordViewRequestStatus === 'NONE' && (
           <div className="w-full mb-8 p-6 bg-primary/5 border-2 border-primary/20 rounded-3xl text-center animate-in zoom-in-95">
              <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-2">Registry Alert</p>
              <p className="text-[11px] font-bold text-text-primary uppercase leading-tight mb-4">Your institutional password has been modified by the Dean.</p>
              <button 
                onClick={handleRequestReveal}
                className="w-full py-3 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg"
              >
                Request Reveal Petition
              </button>
           </div>
        )}

        <form onSubmit={handleLogin} className="w-full space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Institutional Mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium" placeholder="name.std.ad@bitsathy.ac.in" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium" placeholder="••••••••" />
          </div>
          {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-black uppercase text-center tracking-widest">{error}</div>}
          <button type="submit" disabled={isLoading} className="w-full bg-primary hover:opacity-90 text-white font-black py-5 rounded-[2.5rem] shadow-xl transition-all active:scale-[0.98] uppercase text-xs tracking-[0.2em] disabled:opacity-50">
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : "Authorize Session"}
          </button>
        </form>
      </div>

      {popup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-surface-elevated border border-primary/30 p-10 rounded-[3rem] text-center max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-text-primary mb-4 uppercase tracking-tighter">{popup.title}</h3>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-10">{popup.message}</p>
            <button onClick={() => setPopup(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest">Understand</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
