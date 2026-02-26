
import React, { useState, useContext, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store';
import { LeaveType, LeaveStatus, LeaveRequest, UserRole } from '@/types';

const LeaveApply: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    type: LeaveType.PERSONAL,
    startDate: '',
    startTime: '09:00',
    endDate: '',
    endTime: '17:00',
    reason: ''
  });
  const [status, setStatus] = useState<string | null>(null);
  const [approver, setApprover] = useState<any>({ id: 'admin-1', name: 'Chief Administrator' });

  useEffect(() => {
    const fetchApprover = async () => {
      if (!user) return;
      // Corrected: added await for MockDB.getUsers()
      const allUsers = await MockDB.getUsers();
      const allStaff = allUsers.filter(u => u.role === UserRole.STAFF);
      const userDeptBase = user?.department?.split(' (')[0];

      let foundApprover;
      if (user?.role === UserRole.STAFF) {
        // Find HOD in the same department, excluding self
        foundApprover = allStaff.find(s =>
          s.id !== user.id &&
          s.department?.startsWith(userDeptBase || '') &&
          s.designation === 'Head of Department'
        );
      } else {
        // Find a Mentor in the same department
        foundApprover = allStaff.find(s => s.department?.startsWith(userDeptBase || ''));
      }
      setApprover(foundApprover || allStaff[0] || { id: 'admin-1', name: 'Chief Administrator' });
    };
    fetchApprover();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const request: LeaveRequest = {
      id: crypto.randomUUID(),
      studentId: user.id,
      studentName: user.name,
      studentYear: user.role === UserRole.STAFF ? (user.designation || 'Faculty') : (user.studyYear || '1st Year'),
      studentDegree: user.role === UserRole.STAFF ? 'Staff Personnel' : (user.department?.split('(')[1]?.replace(')', '') || 'B.Tech'),
      mentorId: approver.id,
      type: formData.type,
      startDate: formData.startDate,
      startTime: formData.startTime,
      endDate: formData.endDate,
      endTime: formData.endTime,
      reason: formData.reason,
      status: LeaveStatus.PENDING,
      createdAt: new Date().toISOString()
    };

    // Corrected: added await for MockDB.addLeaveRequest
    await MockDB.addLeaveRequest(request);

    const approverTitle = user.role === UserRole.STAFF ? 'HOD' : 'Mentor';
    setStatus(`Leave request submitted successfully to your ${approverTitle} (${approver.name}).`);

    setFormData({
      type: LeaveType.PERSONAL,
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '17:00',
      reason: ''
    });
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <DashboardLayout title="Digital Absence Request">
      <div className="max-w-4xl mx-auto py-4">
        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

          <div className="relative z-10">
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-white font-black text-2xl lowercase tracking-tight">request for absence</h2>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Institutional Paperless Workflow</p>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 flex flex-col justify-center min-w-[200px]">
                <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-widest">Target Approver</p>
                <p className="text-sm font-black text-indigo-400 uppercase">{approver.name}</p>
                <p className="text-[9px] text-slate-500 uppercase font-bold">{user?.role === UserRole.STAFF ? 'HOD' : 'Mentor'}</p>
              </div>
            </div>

            {status && (
              <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-center text-xs font-bold uppercase tracking-widest animate-pulse">
                {status}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Leave Category</label>
                  <select
                    required value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as LeaveType })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all appearance-none"
                  >
                    {Object.values(LeaveType).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Commencement Date</label>
                    <input
                      type="date" required value={formData.startDate}
                      onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-6 py-4 text-white font-bold focus:border-indigo-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Commencement Time</label>
                    <input
                      type="time" required value={formData.startTime}
                      onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-6 py-4 text-white font-bold focus:border-indigo-500/50 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Termination Date</label>
                    <input
                      type="date" required value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-6 py-4 text-white font-bold focus:border-indigo-500/50 outline-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Termination Time</label>
                    <input
                      type="time" required value={formData.endTime}
                      onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-6 py-4 text-white font-bold focus:border-indigo-500/50 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Reason for Absence</label>
                <textarea
                  required rows={4} value={formData.reason}
                  onChange={e => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Provide valid institutional justification..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-6 py-5 text-white font-bold focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-sm transition-all shadow-2xl active:scale-[0.98]"
              >
                Authorize Request
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaveApply;
