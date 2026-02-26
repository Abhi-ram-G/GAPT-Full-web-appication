
import React, { useState, useEffect, useContext } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store/store';
import { LeaveRequest, LeaveStatus, UserRole } from '@/types/types';

const LeaveApproval: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  useEffect(() => {
    refreshRequests();
  }, [user]);

  const refreshRequests = async () => {
    if (!user) return;
    // Corrected: added await for MockDB.getLeaveRequests()
    const all = await MockDB.getLeaveRequests();
    
    // If Admin, show everything. If Staff (e.g. HOD), show only mentees/staff who routed to them.
    if (user.role === UserRole.ADMIN) {
      setRequests(all.filter(r => r.status === LeaveStatus.PENDING));
    } else {
      setRequests(all.filter(r => r.mentorId === user.id && r.status === LeaveStatus.PENDING));
    }
  };

  const handleAction = async (id: string, action: LeaveStatus) => {
    // Corrected: added await
    await MockDB.updateLeaveRequest(id, { status: action });
    refreshRequests();
  };

  return (
    <DashboardLayout title="Institutional Authorization Center">
      <div className="max-w-6xl mx-auto py-4">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-black text-2xl tracking-tight lowercase">pending authorization queue</h2>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
              {user?.role === UserRole.ADMIN 
                ? "Institution Oversight: Processing all active requests" 
                : user?.designation === 'Head of Department'
                  ? "Departmental Oversight: Reviewing faculty & staff requests"
                  : "Mentor Oversight: Reviewing student absence requests"}
            </p>
          </div>
          <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
               {requests.length} Requests Awaiting
             </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {requests.map(req => (
            <div key={req.id} className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 md:p-10 shadow-xl relative group overflow-hidden transition-all hover:border-indigo-500/30">
               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
               
               <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-10">
                  <div className="flex items-center gap-6 lg:w-1/3 shrink-0">
                    <div className="w-16 h-16 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center text-white font-black text-2xl shadow-inner">
                      {req.studentName[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-black text-white uppercase tracking-tighter truncate">{req.studentName}</h3>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">
                        {req.studentDegree} • {req.studentYear}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Commencement</p>
                        <p className="text-xs text-white font-bold">{req.startDate}</p>
                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter">at {req.startTime}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Termination</p>
                        <p className="text-xs text-white font-bold">{req.endDate}</p>
                        <p className="text-[10px] text-slate-500 font-mono tracking-tighter">at {req.endTime}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="inline-block px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-500/20">
                          {req.type} Category
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Justification Statement</p>
                      <p className="text-xs text-slate-300 italic line-clamp-3 leading-relaxed">"{req.reason}"</p>
                    </div>
                  </div>

                  <div className="flex lg:flex-col gap-3 lg:w-48 shrink-0">
                    <button 
                      onClick={() => handleAction(req.id, LeaveStatus.REJECTED)}
                      className="flex-1 py-3 px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, LeaveStatus.APPROVED)}
                      className="flex-1 py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20"
                    >
                      Approve
                    </button>
                  </div>
               </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="py-32 text-center border-4 border-dashed border-slate-800 rounded-[3rem]">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <p className="text-slate-600 font-bold uppercase tracking-[0.2em]">All authorizations processed</p>
              <p className="text-[10px] text-slate-500 uppercase mt-2 font-bold">Queue currently clear</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LeaveApproval;
