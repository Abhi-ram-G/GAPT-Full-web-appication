
import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { UserRole, Feature, AccessLevel, PermissionMap } from '@/types/types';
import { MockDB } from '@/store/store';

const FEATURE_LABEL_MAP: Record<string, string> = {
  [Feature.ATTENDANCE_TRACKING]: 'DAILY ATTENDANCE',
  [Feature.ASSIGNMENTS]: 'DEADLINE TASK',
  [Feature.STAFF_ASSIGNMENT]: 'HOURS SCHEDULING',
  [Feature.USER_DIRECTORY]: 'MEMBER DIRECTORY',
  [Feature.STAFF_DIRECTORY]: 'STAFF DIRECTORY',
  [Feature.STUDENT_DIRECTORY]: 'STUDENT DIRECTORY',
  [Feature.COHORT_REGISTRY]: 'COHORT REGISTRY',
  [Feature.ACCESS_REQUESTS]: 'ACCESS REQUESTS',
  [Feature.IDENTITY_CREATOR]: 'IDENTITY CREATOR',
  [Feature.INTERLINK_CONTROL]: 'INTERLINK CONTROL',
  [Feature.BRANDING_HUB]: 'BRANDING HUB',
  [Feature.ACCESS_MATRIX]: 'ACCESS MATRIX',
  [Feature.MARK_ENTRY]: 'MARK ENTRY',
  [Feature.STUDY_MATERIALS]: 'STUDY MATERIALS',
  [Feature.LEAVE_MANAGEMENT]: 'LEAVE MANAGEMENT',
  [Feature.ACADEMIC_ANALYTICS]: 'ACADEMIC ANALYTICS',
  [Feature.GREEN_INSIGHTS]: 'GREEN INSIGHTS',
  [Feature.MENTOR_ASSIGNMENT]: 'MENTOR ASSIGNMENT'
};

const ManageAccess: React.FC = () => {
  const [permissions, setPermissions] = useState<Record<UserRole, PermissionMap>>({} as any);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState<{ role: UserRole, feature: Feature } | null>(null);

  const roles = [
    UserRole.STUDENT, 
    UserRole.STAFF, 
    UserRole.HOD, 
    UserRole.DEAN, 
    UserRole.ADMIN
  ];
  
  const features = Object.values(Feature);

  useEffect(() => {
    fetchPerms();
  }, []);

  const fetchPerms = async () => {
    setIsLoading(true);
    const perms = await MockDB.getPermissions();
    setPermissions(perms);
    setIsLoading(false);
  };

  const handleUpdateLevel = async (role: UserRole, feature: Feature, level: AccessLevel) => {
    await MockDB.updatePermissions(role, feature, level);
    const updatedPerms = await MockDB.getPermissions();
    setPermissions(updatedPerms);
    setActiveDropdown(null);

    await MockDB.addNotification({
      id: crypto.randomUUID(),
      message: `Governance Alert: Authority for [${role.replace(/_/g, ' ')}] on module [${feature.replace(/_/g, ' ')}] synchronized to ${level.replace(/_/g, ' ')}.`,
      timestamp: new Date().toISOString(),
      read: false,
      type: 'ACCESS_GRANTED'
    });
  };

  const getOptionsForRole = (role: UserRole) => {
    const base = [AccessLevel.NO_ACCESS, AccessLevel.VIEW_ALL];
    
    if (role === UserRole.STUDENT) return base;
    if (role === UserRole.STAFF) return [...base, AccessLevel.EDIT_STUDENTS];
    if (role === UserRole.HOD) return [...base, AccessLevel.EDIT_STUDENTS, AccessLevel.EDIT_STAFF];
    if (role === UserRole.DEAN) return [
      AccessLevel.NO_ACCESS,
      AccessLevel.VIEW_ALL,
      AccessLevel.EDIT_STUDENTS,
      AccessLevel.EDIT_STAFF,
      AccessLevel.EDIT_HOD,
      AccessLevel.EDIT_STAFF_STUDENTS,
      AccessLevel.EDIT_HOD_STAFF,
      AccessLevel.EDIT_HOD_STAFF_STUDENTS,
      AccessLevel.EDIT_ALL
    ];
    
    // Admin gets everything
    return [
      AccessLevel.NO_ACCESS,
      AccessLevel.VIEW_ALL,
      AccessLevel.EDIT_STUDENTS,
      AccessLevel.EDIT_STAFF,
      AccessLevel.EDIT_HOD,
      AccessLevel.EDIT_DEAN,
      AccessLevel.EDIT_STAFF_STUDENTS,
      AccessLevel.EDIT_HOD_STAFF,
      AccessLevel.EDIT_HOD_STAFF_STUDENTS,
      AccessLevel.EDIT_ALL
    ];
  };

  const getLevelButtonStyle = (level: AccessLevel) => {
    if (level === AccessLevel.NO_ACCESS || level === AccessLevel.VIEW_ALL) {
      return 'bg-transparent border border-[#1e293b] text-[#38bdf8] hover:bg-white/5';
    }
    return 'bg-[#2563eb] text-white border-transparent hover:bg-blue-600 shadow-lg shadow-blue-900/20';
  };

  const getDotColor = (level: AccessLevel) => {
    switch (level) {
      case AccessLevel.NO_ACCESS: return 'bg-slate-600';
      case AccessLevel.VIEW_ALL: return 'bg-[#38bdf8]';
      case AccessLevel.EDIT_STUDENTS: return 'bg-blue-500';
      case AccessLevel.EDIT_STAFF: return 'bg-slate-400';
      case AccessLevel.EDIT_HOD: return 'bg-[#a855f7]';
      case AccessLevel.EDIT_DEAN: return 'bg-sky-400';
      case AccessLevel.EDIT_STAFF_STUDENTS: return 'bg-teal-500';
      case AccessLevel.EDIT_HOD_STAFF: return 'bg-teal-400';
      case AccessLevel.EDIT_HOD_STAFF_STUDENTS: return 'bg-emerald-500';
      case AccessLevel.EDIT_ALL: return 'bg-[#10b981]';
      default: return 'bg-slate-700';
    }
  };

  const getDisplayLabel = (level: AccessLevel) => {
    if (level === AccessLevel.NO_ACCESS) return 'HIDE MENU (NO ACCESS)';
    return level.replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Registry Governance">
        <div className="flex items-center justify-center h-64">
           <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Access Matrix Control">
      <div className="max-w-[1600px] mx-auto py-2 space-y-10 pb-24">
        
        <div className="bg-[#0f172a] border-b border-white/5 pb-10">
           <h2 className="text-white font-black text-3xl lowercase tracking-tight">Institutional Access Matrix</h2>
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Manage operational hierarchies for educational roles</p>
        </div>

        <div className="bg-[#0b1121] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                 <thead>
                    <tr className="bg-black/40">
                       <th className="px-10 py-8 border-b border-white/5 w-80 sticky left-0 bg-[#0b1121] z-40">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Access Domain</span>
                       </th>
                       {roles.map(role => (
                          <th key={role} className="px-6 py-8 border-b border-white/5 text-center">
                             <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {role.replace(/_/g, ' ')}
                             </div>
                          </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {features.map((feature) => (
                       <tr key={feature} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-10 py-8 sticky left-0 bg-[#0b1121] z-30 border-r border-white/5">
                             <div className="flex flex-col">
                                <span className="text-xs font-black text-[#5d58ff] uppercase tracking-widest">
                                  {FEATURE_LABEL_MAP[feature] || feature.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[8px] text-slate-600 font-bold uppercase mt-1">Core Registry Item</span>
                             </div>
                          </td>
                          {roles.map(role => {
                             const level = permissions[role]?.[feature] || AccessLevel.NO_ACCESS;
                             const isDropdownOpen = activeDropdown?.role === role && activeDropdown?.feature === feature;
                             const roleOptions = getOptionsForRole(role);
                             
                             return (
                                <td key={role} className="px-6 py-6 text-center relative">
                                   <div className="inline-block w-60 relative">
                                      <button 
                                         onClick={() => setActiveDropdown(isDropdownOpen ? null : { role, feature })}
                                         className={`w-full py-3.5 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-between gap-3 active:scale-95 z-10 relative ${getLevelButtonStyle(level)}`}
                                      >
                                         <span className="truncate">{getDisplayLabel(level)}</span>
                                         <svg className={`w-4 h-4 shrink-0 transition-transform ${isDropdownOpen ? 'rotate-180 text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                                      </button>

                                      {isDropdownOpen && (
                                        <>
                                         <div className="fixed inset-0 z-40" onClick={() => setActiveDropdown(null)}></div>
                                         <div className="absolute top-full left-0 right-0 mt-2 bg-[#0f172a] border border-white/10 rounded-[1.25rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 py-2 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-white/5">
                                            {roleOptions.map(opt => (
                                              <button 
                                                key={opt}
                                                onClick={() => handleUpdateLevel(role, feature, opt)}
                                                className={`w-full text-left px-6 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-4 group/opt ${level === opt ? 'bg-blue-500/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                                              >
                                                 <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${getDotColor(opt)}`}></div>
                                                 <span className="truncate leading-tight">{getDisplayLabel(opt)}</span>
                                              </button>
                                            ))}
                                         </div>
                                        </>
                                      )}
                                   </div>
                                </td>
                             );
                          })}
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="bg-[#0f172a] border border-white/5 p-10 rounded-[2.5rem] flex items-start gap-10">
           <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
           </div>
           <div>
              <h4 className="text-white font-black text-sm uppercase tracking-widest mb-3">Institutional Policy Alert</h4>
              <p className="text-slate-500 text-xs leading-relaxed max-w-2xl font-bold">
                 Access modifications are audited and synchronized across all active sessions. 
                 Restrictive permissions (Muted Outlines) indicate view-only or hidden states, 
                 while administrative permissions (Solid Blue) indicate full write/edit capability for that domain.
              </p>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageAccess;
