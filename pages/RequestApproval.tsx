
import React, { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { User, UserRole, UserStatus, BatchCurriculumStatus, AttendanceEditRequest } from '../types';
import { MockDB } from '../store';
import { AuthContext } from '../AuthContext';

const RequestApproval: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [userRequests, setUserRequests] = useState<User[]>([]);
  const [curriculumRequests, setCurriculumRequests] = useState<any[]>([]);
  const [passwordRequests, setPasswordRequests] = useState<User[]>([]);
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceEditRequest[]>([]);

  useEffect(() => {
    refreshData();
  }, [user]);

  const refreshData = async () => {
    const allUsers = await MockDB.getUsers();
    setUserRequests(allUsers.filter(u => u.status === UserStatus.PENDING));
    setPasswordRequests(allUsers.filter(u => u.passwordViewRequestStatus === 'PENDING'));
    
    const editRequests = await MockDB.getEditRequests();
    setCurriculumRequests(editRequests.filter(r => r.status === 'PENDING'));

    const attReqs = await MockDB.getAttendanceEditRequests();
    // Filter visible requests based on role
    if (user?.role === UserRole.ADMIN) {
      setAttendanceRequests(attReqs.filter(r => !r.adminApproved));
    } else if (user?.role === UserRole.DEAN) {
      setAttendanceRequests(attReqs.filter(r => !r.deanApproved));
    } else if (user?.role === UserRole.HOD) {
      const deptBase = user.department?.split(' (')[0] || '';
      setAttendanceRequests(attReqs.filter(r => r.deptName.startsWith(deptBase) && !r.hodApproved));
    }
  };

  const handleUserAction = async (userId: string, action: UserStatus) => {
    await MockDB.updateUser(userId, { status: action });
    refreshData();
  };

  const handlePasswordRevealAction = async (userId: string, action: 'APPROVED' | 'REJECTED') => {
    await MockDB.updateUser(userId, { passwordViewRequestStatus: action });
    refreshData();
  };

  const handleCurriculumAction = async (reqId: string, batchId: string, deptId: string, action: 'APPROVED' | 'REJECTED', hodId: string, deptName: string) => {
    await MockDB.updateEditRequest(reqId, action);
    if (action === 'APPROVED') {
      await MockDB.setCurriculumStatus(batchId, deptId, BatchCurriculumStatus.EDITABLE);
    } else {
      await MockDB.setCurriculumStatus(batchId, deptId, BatchCurriculumStatus.FROZEN);
    }
    await MockDB.addNotification({
      id: crypto.randomUUID(), userId: hodId, message: `Curriculum Access ${action}: Your request to unlock the ${deptName} curriculum registry has been ${action.toLowerCase()}.`,
      timestamp: new Date().toISOString(), read: false, type: 'ACCESS_GRANTED'
    });
    refreshData();
  };

  const handleAttendanceApproval = async (req: AttendanceEditRequest, approved: boolean) => {
    if (!user) return;
    const updated = { ...req };
    if (user.role === UserRole.ADMIN) updated.adminApproved = approved;
    else if (user.role === UserRole.DEAN) updated.deanApproved = approved;
    else if (user.role === UserRole.HOD) updated.hodApproved = approved;

    await MockDB.upsertAttendanceEditRequest(updated);
    
    if (approved) {
      await MockDB.addNotification({
        id: crypto.randomUUID(),
        userId: req.requesterId,
        message: `Ledger Authority Update: ${user.role} has authorized modification access for ${req.date}.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'EDIT_APPROVED'
      });
    }
    refreshData();
  };

  return (
    <DashboardLayout title="Operational Approval Control">
      <div className="max-w-6xl mx-auto py-2 space-y-12 pb-24">
        
        {/* Attendance Ledger Modification Requests */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Ledger modification Authority</h3>
              <span className="px-4 py-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                {attendanceRequests.length} Authority Petitions
              </span>
           </div>
           
           <div className="grid grid-cols-1 gap-6">
              {attendanceRequests.map(req => (
                <div key={req.id} className="bg-surface-component border border-border-subtle p-8 rounded-[3rem] shadow-xl group hover:border-amber-500/30 transition-all">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                         <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/20 text-amber-500 flex items-center justify-center text-2xl font-black">{req.requesterName[0]}</div>
                         <div>
                            <h4 className="text-text-primary font-black text-lg uppercase tracking-tight">{req.requesterName}</h4>
                            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Petition for Ledger modification • {req.deptName}</p>
                         </div>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 text-center min-w-[180px]">
                         <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-1">Target Ledger Date</p>
                         <p className="text-sm font-black text-white">{new Date(req.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <div className="flex gap-3">
                         <button onClick={() => handleAttendanceApproval(req, false)} className="px-6 py-3 bg-red-500/10 text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Deny Authority</button>
                         <button onClick={() => handleAttendanceApproval(req, true)} className="px-8 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">Grant Authority</button>
                      </div>
                   </div>
                </div>
              ))}
              {attendanceRequests.length === 0 && (
                <div className="py-20 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                   <p className="text-text-muted font-black uppercase tracking-widest text-xs">No pending ledger petitions for your role.</p>
                </div>
              )}
           </div>
        </section>

        {/* User Access Requests */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">institutional identity requests</h3>
              <span className="px-4 py-1.5 bg-surface-component text-text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-border-subtle">
                {userRequests.length} Pending
              </span>
           </div>
           <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-black/5 dark:bg-black/20 border-b border-border-subtle">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest">User Details</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest">Department</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest">Academic Status</th>
                  <th className="px-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {userRequests.map(req => (
                  <tr key={req.id} className="hover:bg-black/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-primary font-black text-lg group-hover:scale-110 transition-transform shrink-0">{req.name[0].toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-text-primary uppercase truncate">{req.name}</p>
                          <p className="text-[11px] font-mono text-text-muted truncate">{req.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs text-text-muted">
                      <span className="px-3 py-1 bg-surface-elevated rounded-lg border border-border-subtle text-text-primary inline-block max-w-[200px] truncate uppercase font-bold">{req.department || 'Not Specified'}</span>
                    </td>
                    <td className="px-8 py-6 text-xs text-primary font-black uppercase">{req.role === UserRole.STUDENT ? (req.studyYear || 'Year TBD') : (req.designation || 'Exp TBD')}</td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button onClick={() => handleUserAction(req.id, UserStatus.REJECTED)} className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Reject</button>
                        <button onClick={() => handleUserAction(req.id, UserStatus.APPROVED)} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">Approve</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {userRequests.length === 0 && <div className="py-20 text-center"><p className="text-text-muted font-black uppercase tracking-widest text-xs">No pending identity requests.</p></div>}
          </div>
        </section>

        {/* Credential Reveal Petitions (Dean-Modified Passwords) */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Credential Reveal petitions</h3>
              <span className="px-4 py-1.5 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-500/20">
                {passwordRequests.length} Security Handshakes
              </span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {passwordRequests.map(req => (
                <div key={req.id} className="bg-surface-component border border-border-subtle p-8 rounded-[3rem] shadow-xl group hover:border-amber-500/30 transition-all">
                   <div className="flex items-center gap-6 mb-8 pb-6 border-b border-white/5">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-amber-500/20 text-amber-500 flex items-center justify-center text-2xl font-black">{req.name[0]}</div>
                      <div>
                         <h4 className="text-text-primary font-black text-lg uppercase tracking-tight">{req.name}</h4>
                         <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">{req.role} • {req.email}</p>
                      </div>
                   </div>
                   <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mb-6 px-4 py-2 bg-black/20 rounded-xl leading-relaxed italic">"Petitioning for reveal of Dean-modified institutional password."</p>
                   <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => handlePasswordRevealAction(req.id, 'REJECTED')} className="py-3 bg-red-500/10 text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">REJECT REVEAL</button>
                      <button onClick={() => handlePasswordRevealAction(req.id, 'APPROVED')} className="py-3 bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">GRANT REVEAL</button>
                   </div>
                </div>
              ))}
              {passwordRequests.length === 0 && (
                <div className="md:col-span-2 py-20 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                   <p className="text-text-muted font-black uppercase tracking-widest text-xs">No pending credential petitions.</p>
                </div>
              )}
           </div>
        </section>

        {/* Curriculum Edit Requests */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Curriculum unlock requests</h3>
              <span className="px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full border border-primary/20">{curriculumRequests.length} HOD Petitions</span>
           </div>
           <div className="grid grid-cols-1 gap-5">
              {curriculumRequests.map(req => (
                <div key={req.id} className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:border-primary/30 transition-all shadow-xl">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary flex items-center justify-center text-white text-2xl font-black shadow-lg">{req.hodName[0]}</div>
                        <div>
                           <h4 className="text-text-primary font-black text-lg uppercase tracking-tight">{req.hodName}</h4>
                           <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Head of Department • {req.deptName}</p>
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">Cohort Reference</p>
                        <p className="text-xs text-primary font-black uppercase tracking-tight">{req.batchName}</p>
                        <p className="text-[9px] text-text-muted italic mt-1">Request timestamp: {new Date(req.timestamp).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => handleCurriculumAction(req.id, req.batchId, req.deptId, 'REJECTED', req.hodId, req.deptName)} className="px-6 py-3 bg-surface-elevated text-text-muted hover:text-red-500 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border border-border-subtle hover:border-red-500/20">Deny</button>
                        <button onClick={() => handleCurriculumAction(req.id, req.batchId, req.deptId, 'APPROVED', req.hodId, req.deptName)} className="px-8 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95">Grant Access</button>
                    </div>
                </div>
              ))}
              {curriculumRequests.length === 0 && <div className="py-20 text-center border-4 border-dashed border-border-subtle rounded-[3rem]"><p className="text-text-muted font-black uppercase tracking-widest text-xs">No pending curriculum petitions.</p></div>}
           </div>
        </section>

      </div>
    </DashboardLayout>
  );
};

export default RequestApproval;
