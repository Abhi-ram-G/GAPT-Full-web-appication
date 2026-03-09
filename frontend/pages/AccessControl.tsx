import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';
import { User, UserRole, Feature, AccessLevel, PermissionMap } from '../types';
import { motion } from 'framer-motion';

const AccessControl: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Record<string, PermissionMap>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const allUsers = await ApiService.getUsers();
      const perms = await ApiService.getPermissions();
      setUsers(allUsers.filter(u => [UserRole.DEAN, UserRole.HOD, UserRole.STAFF].includes(u.role)));
      setPermissions(perms);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleUpdatePermission = async (role: UserRole, feature: Feature, level: AccessLevel) => {
    await ApiService.updatePermissions(role, feature, level);
    const perms = await ApiService.getPermissions();
    setPermissions(perms);
  };

  if (loading) {
    return (
      <DashboardLayout title="Grand Access">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Grand Access Control">
      <div className="max-w-6xl mx-auto space-y-16 pb-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-text-primary uppercase tracking-tighter">Institutional Grand Access</h1>
          <p className="text-text-muted font-bold uppercase tracking-[0.2em] text-xs">Centralized Governance for Dean, HOD, and Staff Portals</p>
        </div>

        {[UserRole.DEAN, UserRole.HOD, UserRole.STAFF].map((role, roleIdx) => {
          const roleUsers = users.filter(u => u.role === role);
          const rolePerms = permissions[role] || {};

          return (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: roleIdx * 0.1 }}
              className="bg-surface-component rounded-[3rem] border border-border-subtle overflow-hidden shadow-2xl"
            >
              <div className="p-10 border-b border-border-subtle bg-gradient-to-br from-black/20 to-transparent">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-3xl font-black text-primary uppercase tracking-tight">{role.replace('_', ' ')} GOVERNANCE</h3>
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mt-2">Global permission overrides for {role.toLowerCase()} tier</p>
                  </div>
                  <div className="flex -space-x-3">
                    {roleUsers.slice(0, 5).map(u => (
                      <div key={u.id} className="w-12 h-12 rounded-2xl bg-surface-deep border-2 border-surface-component flex items-center justify-center text-primary font-black shadow-lg" title={u.name}>
                        {u.name[0]}
                      </div>
                    ))}
                    {roleUsers.length > 5 && (
                      <div className="w-12 h-12 rounded-2xl bg-primary text-white border-2 border-surface-component flex items-center justify-center text-[10px] font-black shadow-lg">
                        +{roleUsers.length - 5}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-10">
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-3">
                      <span className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                      Tier Members
                    </h4>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{roleUsers.length} Active Accounts</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roleUsers.map(u => (
                      <div key={u.id} className="p-5 bg-surface-deep rounded-[1.5rem] border border-border-subtle flex items-center gap-4 hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center text-primary font-black group-hover:scale-110 transition-transform">{u.name[0]}</div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-black text-text-primary uppercase truncate">{u.name}</p>
                          <p className="text-[10px] font-mono text-text-muted truncate">ID: {u.staffId || String(u.id).slice(0, 8)}</p>
                        </div>
                      </div>
                    ))}
                    {roleUsers.length === 0 && (
                      <div className="col-span-full py-8 text-center bg-black/10 rounded-3xl border border-dashed border-border-subtle">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">No members assigned to this tier</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-widest flex items-center gap-3">
                      <span className="w-3 h-3 bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                      Portal Access Matrix
                    </h4>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Real-time Sync Enabled</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {Object.values(Feature).filter(f => f !== Feature.GRAND_ACCESS).map(feature => (
                      <div key={feature} className="flex flex-col lg:flex-row lg:items-center justify-between p-6 bg-surface-deep rounded-[2rem] border border-border-subtle hover:border-primary/20 transition-all gap-6">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-black/30 flex items-center justify-center text-text-muted border border-white/5">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                          </div>
                          <div>
                            <p className="text-base font-black text-text-primary uppercase tracking-tight">{feature.replace(/_/g, ' ')}</p>
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">Institutional Module</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
                          {[AccessLevel.NO_ACCESS, AccessLevel.VIEW_ALL, AccessLevel.EDIT_ALL].map(level => (
                            <button
                              key={level}
                              onClick={() => handleUpdatePermission(role, feature, level)}
                              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rolePerms[feature] === level ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105' : 'text-text-muted hover:text-text-primary hover:bg-white/5'}`}
                            >
                              {level.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
};

export default AccessControl;
