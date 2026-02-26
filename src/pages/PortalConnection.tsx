
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { PortalConnection, PortalConnectionStatus, PortalPermission } from '@/types/types';
import { MockDB } from '@/store/store';

const PortalConnectionPage: React.FC = () => {
  const [portals, setPortals] = useState<PortalConnection[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPortal, setNewPortal] = useState({ name: '', url: '' });
  const [handshakeId] = useState(`GAPT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
  
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'info' | 'error' } | null>(null);

  useEffect(() => {
    const fetchPortals = async () => {
      // Corrected: added await for MockDB.getPortals()
      const p = await MockDB.getPortals();
      setPortals(p);
    };
    fetchPortals();
  }, []);

  const handleAddPortal = async (e: React.FormEvent) => {
    e.preventDefault();
    const portalToAdd: PortalConnection = {
      id: crypto.randomUUID(),
      name: newPortal.name,
      url: newPortal.url,
      handshakeId: `REMOTE-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      status: PortalConnectionStatus.DISCONNECTED,
      permission: PortalPermission.READ_ONLY
    };
    // Corrected: added await for addPortal and getPortals
    await MockDB.addPortal(portalToAdd);
    const p = await MockDB.getPortals();
    setPortals(p);
    setIsAddModalOpen(false);
    setNewPortal({ name: '', url: '' });
    showStatus(`Portal "${portalToAdd.name}" registered successfully.`, 'success');
  };

  const showStatus = (text: string, type: 'success' | 'info' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const handleConnect = async (id: string) => {
    // Corrected: added await for updatePortal and getPortals
    await MockDB.updatePortal(id, { status: PortalConnectionStatus.PENDING });
    const p = await MockDB.getPortals();
    setPortals(p);
    showStatus("Connection request sent to remote portal admin.", 'info');
  };

  const handleRequestModify = (id: string) => {
    showStatus("Escalation request sent. Notification pushed to remote portal admin.", 'info');
    // In a real system, this would trigger a notification. 
    // For demo, we just log it and simulate "Wait for approval".
  };

  const simulateRemoteApproval = async (id: string, stage: 'CONNECT' | 'MODIFY') => {
    // Corrected: added await for updatePortal and getPortals
    if (stage === 'CONNECT') {
      await MockDB.updatePortal(id, { status: PortalConnectionStatus.CONNECTED, lastSync: new Date().toISOString() });
    } else {
      await MockDB.updatePortal(id, { permission: PortalPermission.READ_WRITE });
    }
    const p = await MockDB.getPortals();
    setPortals(p);
    showStatus(`Remote admin has ${stage === 'CONNECT' ? 'accepted connection' : 'granted write access'}.`, 'success');
  };

  const handleDelete = async (id: string) => {
    // Corrected: added await for deletePortal and getPortals
    await MockDB.deletePortal(id);
    const p = await MockDB.getPortals();
    setPortals(p);
  };

  return (
    <DashboardLayout title="Institutional Interlink Control">
      <div className="max-w-6xl mx-auto py-2 space-y-8">
        
        {/* Local Portal Identity Card */}
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white lowercase tracking-tight">Handshake Identity</h2>
              <p className="text-slate-400 text-sm max-w-md">Share this secure ID with other institutions to allow them to initiate a data bridge with your portal.</p>
            </div>
            <div className="bg-slate-950/80 border border-white/10 p-6 rounded-3xl flex flex-col items-center justify-center min-w-[280px] group transition-all hover:border-indigo-500/50">
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Your Portal Link ID</span>
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-mono font-bold text-indigo-400 tracking-wider">{handshakeId}</span>
                <button 
                  onClick={() => { navigator.clipboard.writeText(handshakeId); showStatus("Handshake ID copied to clipboard", "success"); }}
                  className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Global Connections Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-xl tracking-tight">Managed Portals</h3>
            <p className="text-slate-500 text-xs mt-1 uppercase font-bold tracking-widest">Active Data Interchanges</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            <span>Add Remote Portal</span>
          </button>
        </div>

        {statusMsg && (
          <div className={`p-4 rounded-2xl border text-xs font-bold uppercase tracking-wider animate-in fade-in slide-in-from-top-4 duration-300 flex items-center gap-3 ${
            statusMsg.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
            statusMsg.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
            'bg-blue-500/10 border-blue-500/20 text-blue-400'
          }`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${statusMsg.type === 'success' ? 'bg-emerald-400' : statusMsg.type === 'error' ? 'bg-red-400' : 'bg-blue-400'}`}></div>
            {statusMsg.text}
          </div>
        )}

        {/* Connections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {portals.map(p => (
            <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative group overflow-hidden">
               {/* Status Badge */}
               <div className="absolute top-6 right-6 flex items-center space-x-2">
                  <span className={`w-2 h-2 rounded-full ${
                    p.status === PortalConnectionStatus.CONNECTED ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                    p.status === PortalConnectionStatus.PENDING ? 'bg-amber-500 animate-pulse' : 'bg-slate-700'
                  }`}></span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.status}</span>
               </div>

               <div className="flex items-center space-x-4 mb-6">
                  <div className="w-14 h-14 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg leading-tight">{p.name}</h4>
                    <p className="text-slate-600 text-[10px] font-mono mt-1">{p.url}</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">Permission Mode</p>
                    <p className={`text-xs font-black tracking-tight ${p.permission === PortalPermission.READ_WRITE ? 'text-amber-400' : 'text-slate-300'}`}>
                      {p.permission.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                    <p className="text-[9px] font-bold text-slate-600 uppercase mb-1">Sync Status</p>
                    <p className="text-xs font-black text-slate-300 tracking-tight">
                      {p.lastSync ? new Date(p.lastSync).toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
               </div>

               <div className="flex flex-col space-y-3">
                  {p.status === PortalConnectionStatus.DISCONNECTED && (
                    <button 
                      onClick={() => handleConnect(p.id)}
                      className="w-full py-3 bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all"
                    >
                      Connect Portal
                    </button>
                  )}
                  
                  {p.status === PortalConnectionStatus.PENDING && (
                    <div className="flex gap-2">
                       <button 
                        disabled
                        className="flex-1 py-3 bg-slate-800 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em]"
                      >
                        Awaiting Handshake...
                      </button>
                      <button 
                        onClick={() => simulateRemoteApproval(p.id, 'CONNECT')}
                        className="px-4 py-3 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-xl text-[9px] font-bold uppercase transition-all"
                        title="DEMO: Simulate Acceptance"
                      >
                        SIM ACCEPT
                      </button>
                    </div>
                  )}

                  {p.status === PortalConnectionStatus.CONNECTED && (
                    <div className="flex flex-col space-y-2">
                       <div className="flex gap-2">
                          <button 
                            onClick={() => handleRequestModify(p.id)}
                            disabled={p.permission === PortalPermission.READ_WRITE}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all ${
                              p.permission === PortalPermission.READ_WRITE 
                              ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 cursor-default' 
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {p.permission === PortalPermission.READ_WRITE ? 'Write Access Active' : 'Request Permission to Modify'}
                          </button>
                          {p.permission === PortalPermission.READ_ONLY && (
                            <button 
                              onClick={() => simulateRemoteApproval(p.id, 'MODIFY')}
                              className="px-4 py-3 bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white rounded-xl text-[9px] font-bold uppercase transition-all"
                              title="DEMO: Simulate Modification Approval"
                            >
                              GRANT WRITE
                            </button>
                          )}
                       </div>
                       <div className="flex items-center justify-between pt-2">
                          <button className="text-[9px] font-bold text-slate-600 uppercase hover:text-white underline decoration-slate-800 underline-offset-4">Sync Diagnostics</button>
                          <button onClick={() => handleDelete(p.id)} className="text-[9px] font-bold text-red-500/50 uppercase hover:text-red-500">Terminate Link</button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          ))}
          
          {portals.length === 0 && (
            <div className="md:col-span-2 py-20 text-center border-2 border-dashed border-slate-800 rounded-[2.5rem]">
               <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-700">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
               </div>
               <p className="text-slate-500 text-sm font-medium">No external portals interlinked yet.</p>
               <button onClick={() => setIsAddModalOpen(true)} className="mt-4 text-indigo-400 text-xs font-bold uppercase tracking-widest hover:text-indigo-300">Initiate First Handshake</button>
            </div>
          )}
        </div>

      </div>

      {/* Add Portal Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1e293b] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-white lowercase tracking-tight">Register Remote Institution</h3>
            </div>

            <form onSubmit={handleAddPortal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Portal Display Name</label>
                <input 
                  type="text" required value={newPortal.name}
                  onChange={e => setNewPortal({...newPortal, name: e.target.value})}
                  placeholder="e.g. BITS Main Campus"
                  className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Institutional Link ID (Handshake ID)</label>
                <input 
                  type="text" required value={newPortal.url}
                  onChange={e => setNewPortal({...newPortal, url: e.target.value.toUpperCase()})}
                  placeholder="PASTE HANDSHAKE ID HERE"
                  className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:ring-1 focus:ring-indigo-500 outline-none transition-all" 
                />
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                 <p className="text-[10px] text-amber-500/80 leading-relaxed font-medium">By connecting, you agree to institutional data sharing protocols. Initial connections are Read-Only by default for security.</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-3 text-sm font-bold text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Add Portal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default PortalConnectionPage;
