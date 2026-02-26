import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { SiteSettings } from '../types';
import { MockDB } from '../store';

const THEME_PRESETS = [
  { name: 'GAPT Classic', color: '#5d58ff', label: 'Institutional Blue' },
  { name: 'Emerald High', color: '#10b981', label: 'Green Energy' },
  { name: 'Indigo Core', color: '#6366f1', label: 'System Indigo' },
  { name: 'Amber Warning', color: '#f59e0b', label: 'Academic Gold' },
  { name: 'Slate Dark', color: '#475569', label: 'Neutral Gray' }
];

const EditWebsite: React.FC = () => {
  const [settings, setSettings] = useState<SiteSettings>({ name: '', description: '', adminEmail: '', themeColor: '', institution: '' });
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      const s = await MockDB.getSettings();
      setSettings(s);
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await MockDB.updateSettings(settings);
      setStatus({ type: 'success', msg: 'Site configuration updated successfully.' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: 'Failed to update configuration.' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Branding Hub">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Institutional Branding Hub">
      <div className="max-w-6xl mx-auto py-4 pb-24 space-y-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
               
               <form onSubmit={handleSave} className="space-y-10 relative z-10">
                  <div className="space-y-6">
                    <h3 className="text-xl font-black text-white lowercase tracking-tight">Core Branding</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Portal Name</label>
                        <input 
                          type="text" required value={settings.name}
                          onChange={e => setSettings({...settings, name: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Institution Name</label>
                        <input 
                          type="text" required value={settings.institution}
                          onChange={e => setSettings({...settings, institution: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Description</label>
                      <textarea 
                        required rows={3} value={settings.description}
                        onChange={e => setSettings({...settings, description: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6 pt-6 border-t border-slate-800">
                    <h3 className="text-xl font-black text-white lowercase tracking-tight">Technical Contact</h3>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Admin Email</label>
                      <input 
                        type="email" required value={settings.adminEmail}
                        onChange={e => setSettings({...settings, adminEmail: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6">
                    <button 
                      type="submit"
                      className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-xs shadow-xl transition-all active:scale-95"
                    >
                      Commit Configurations
                    </button>
                    {status && (
                      <span className={`text-[10px] font-black uppercase tracking-widest ${status.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {status.msg}
                      </span>
                    )}
                  </div>
               </form>
            </div>
          </div>

          {/* Presets Side */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-4">Brand Presets</h3>
            <div className="grid grid-cols-1 gap-4">
               {THEME_PRESETS.map(preset => (
                 <button 
                   key={preset.name}
                   onClick={() => setSettings({...settings, themeColor: preset.color})}
                   className={`p-6 rounded-[2rem] border-2 text-left transition-all group ${settings.themeColor === preset.color ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}
                 >
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl shadow-lg" style={{ backgroundColor: preset.color }}></div>
                       <div>
                          <p className="text-white font-black text-sm uppercase truncate">{preset.name}</p>
                          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">{preset.label}</p>
                       </div>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default EditWebsite;
