
import React, { useState, useContext } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ThemeContext } from '../ThemeContext';
import { MockDB } from '../store';
import { ThemeMode, UserRole } from '../types';

const PRESET_ACCENTS = [
  { name: 'Indigo', color: '#5d58ff' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Violet', color: '#8b5cf6' },
];

const Settings: React.FC = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, setTheme } = useContext(ThemeContext);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'warning', msg: string } | null>(null);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Passwords do not match.' });
      return;
    }
    if (newPassword.length < 6) {
      setStatus({ type: 'error', msg: 'Password must be at least 6 characters.' });
      return;
    }

    if (user?.id) {
      MockDB.updateUser(user.id, { password: newPassword });
      setStatus({ type: 'success', msg: 'Institutional password updated successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatus(null), 3000);
    }
  };

  const updateThemeMode = (mode: ThemeMode) => {
    setTheme({ ...theme, mode });
    if (user?.id) {
      MockDB.updateUser(user.id, { theme: { ...theme, mode } });
    }
  };

  const updatePrimaryColor = (color: string) => {
    setTheme({ ...theme, primaryColor: color });
    if (user?.id) {
      MockDB.updateUser(user.id, { theme: { ...theme, primaryColor: color } });
    }
  };

  const handlePurgeSystem = async () => {
    if (!user || user.role !== UserRole.ADMIN) return;
    
    const confirmed = confirm("CRITICAL: This action will permanently remove ALL institutional entries, including users, marks, attendance, and curriculum. Only the System Administrator account will persist. Continue?");
    
    if (confirmed) {
      setStatus({ type: 'warning', msg: 'Initiating global registry purge...' });
      await MockDB.purgeSystem();
      setTimeout(() => {
        logout();
        window.location.reload();
      }, 2000);
    }
  };

  return (
    <DashboardLayout title="Identity & Workspace Settings">
      <div className="max-w-4xl mx-auto py-8 space-y-12">
        
        {/* Workspace Theme Settings */}
        <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl space-y-8">
          <div>
            <h2 className="text-white font-black text-xl lowercase tracking-tight">Workspace Appearance</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Personalize your visual experience</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Interface Mode</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.values(ThemeMode).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateThemeMode(mode)}
                    className={`py-4 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all ${
                      theme.mode === mode 
                        ? 'bg-primary text-white border-primary shadow-lg' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accent Identity</label>
              <div className="flex flex-wrap gap-4">
                {PRESET_ACCENTS.map((accent) => (
                  <button
                    key={accent.color}
                    onClick={() => updatePrimaryColor(accent.color)}
                    className={`w-12 h-12 rounded-2xl border-4 transition-all hover:scale-110 flex items-center justify-center ${
                      theme.primaryColor === accent.color ? 'border-white' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: accent.color }}
                  >
                    {theme.primaryColor === accent.color && (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
                <div className="relative group">
                   <input 
                     type="color" 
                     value={theme.primaryColor} 
                     onChange={(e) => updatePrimaryColor(e.target.value)}
                     className="w-12 h-12 rounded-2xl cursor-pointer bg-transparent border-none p-0 overflow-hidden"
                   />
                   <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] text-slate-500 font-bold whitespace-nowrap">Custom Hex</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Settings */}
        <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-2xl">
          <h2 className="text-white font-black text-xl lowercase tracking-tight mb-8">Security Configuration</h2>
          
          <form onSubmit={handlePasswordChange} className="space-y-6 max-w-md">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Change Institutional Password</label>
              <input 
                type="password" required value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>
            <div>
              <input 
                type="password" required value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
              />
            </div>
            
            <button 
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
            >
              Update Password
            </button>

            {status && status.type !== 'warning' && (
              <div className={`p-4 rounded-xl border text-center text-[10px] font-black uppercase tracking-widest ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {status.msg}
              </div>
            )}
          </form>
        </section>

        {/* Global Purge - Danger Zone */}
        {user?.role === UserRole.ADMIN && (
          <section className="bg-rose-950/20 border border-rose-500/30 rounded-[3rem] p-10 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
               </div>
               <div>
                  <h2 className="text-rose-500 font-black text-xl lowercase tracking-tight">Governance Danger Zone</h2>
                  <p className="text-rose-500/60 text-[10px] font-bold uppercase tracking-widest mt-1">Destructive institutional actions</p>
               </div>
            </div>
            
            <div className="space-y-6">
               <div className="p-6 bg-rose-500/5 border border-rose-500/10 rounded-3xl">
                  <p className="text-xs text-rose-300 font-medium leading-relaxed">
                    Executing a <strong>Global Registry Purge</strong> will permanently remove all student accounts, faculty assignments, performance records, and academic data. This action is intended for institutional maintenance and cannot be undone.
                  </p>
               </div>
               
               <button 
                 onClick={handlePurgeSystem}
                 className="w-full py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-xl active:scale-95 transition-all"
               >
                 Purge Global Registry
               </button>
            </div>
          </section>
        )}

        <section className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 shadow-xl">
          <h2 className="text-white font-black text-xl lowercase tracking-tight mb-6">Active Session info</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated ID</p>
              <p className="text-sm font-black text-indigo-400 font-mono">{user?.email}</p>
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Member Role</p>
               <p className="text-sm font-black text-slate-300 uppercase">{user?.role}</p>
            </div>
          </div>
        </section>

        {status && status.type === 'warning' && (
          <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-500">
             <div className="w-20 h-20 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin mb-8"></div>
             <h3 className="text-white font-black text-3xl uppercase tracking-tighter mb-4">{status.msg}</h3>
             <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Re-initializing Clean Institutional State...</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Settings;
