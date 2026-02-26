
import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store/store';
import { UserRole, User, AttendanceRecord, HourStatus, HourAttendance, AttendanceEditRequest, Feature, AccessLevel } from '@/types/types';

const StaffAttendance: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);
  const [students, setStudents] = useState<User[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, HourAttendance[]>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [justificationModal, setJustificationModal] = useState<{ studentId: string, hourIdx: number } | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [isHistory, setIsHistory] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  
  // Custom Calendar State
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const calendarRef = useRef<HTMLDivElement>(null);

  // Approval Tracking State
  const [editRequest, setEditRequest] = useState<AttendanceEditRequest | null>(null);

  const HOUR_LABELS = ['09:00', '10:00', '11:00', '12:00', '02:00', '03:00', '04:00'];
  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    const [allUsers, existing, perms] = await Promise.all([
      MockDB.getUsers(),
      MockDB.getAttendance(selectedDate),
      MockDB.getPermissions()
    ]);
    
    const allStudents = allUsers.filter(u => u.role === UserRole.STUDENT);
    setStudents(allStudents);
    setPermissions(perms);
    
    const initial: Record<string, HourAttendance[]> = {};
    allStudents.forEach(s => {
      const rec = existing.find(r => r.userId === s.id);
      if (rec && rec.hours) {
        initial[s.id] = rec.hours;
      } else {
        initial[s.id] = Array.from({ length: 7 }).map((_, i) => ({
          hour: i + 1,
          status: 'PRESENT' as HourStatus
        }));
      }
    });
    setAttendanceData(initial);
    setIsHistory(selectedDate !== today);

    if (selectedDate !== today && user) {
      const req = await MockDB.getAttendanceEditRequest(user.id, selectedDate);
      setEditRequest(req);
    } else {
      setEditRequest(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, user, currentView]);

  const accessLevel = useMemo(() => {
    return permissions[currentView]?.[Feature.ATTENDANCE_TRACKING] || AccessLevel.NO_ACCESS;
  }, [permissions, currentView]);

  const isEditable = useMemo(() => {
    if (accessLevel === AccessLevel.NO_ACCESS || accessLevel === AccessLevel.VIEW_ALL) return false;
    const isFullyApproved = editRequest?.adminApproved && editRequest?.deanApproved && editRequest?.hodApproved;
    return !isHistory || isFullyApproved;
  }, [accessLevel, isHistory, editRequest]);

  const handleStatusChange = (studentId: string, hourIdx: number, status: HourStatus) => {
    if (!isEditable) return;
    if (status === 'OTHER') {
      setJustificationModal({ studentId, hourIdx });
      setJustificationText(attendanceData[studentId][hourIdx].detail || '');
      return;
    }
    const newData = { ...attendanceData };
    newData[studentId][hourIdx] = { ...newData[studentId][hourIdx], status, detail: undefined };
    setAttendanceData(newData);
  };

  const commitJustification = () => {
    if (!justificationModal) return;
    const { studentId, hourIdx } = justificationModal;
    const newData = { ...attendanceData };
    newData[studentId][hourIdx] = { ...newData[studentId][hourIdx], status: 'OTHER', detail: justificationText };
    setAttendanceData(newData);
    setJustificationModal(null);
    setJustificationText('');
  };

  const handleSave = async () => {
    if (!isEditable) return;
    const records: AttendanceRecord[] = students.map(s => ({
      id: crypto.randomUUID(),
      userId: s.id,
      date: selectedDate,
      isPresent: attendanceData[s.id].filter(h => h.status === 'ABSENT').length < 4,
      hours: attendanceData[s.id],
      markedBy: user?.id || 'system'
    }));
    await MockDB.saveAttendanceBatch(records);
    setSaveStatus(isHistory ? "Historical Ledger Updated." : "Daily Ledger Synchronized.");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const dispatchRequest = async (role: 'ADMIN' | 'DEAN' | 'HOD') => {
    if (!user) return;
    const currentReq: AttendanceEditRequest = editRequest || {
      id: crypto.randomUUID(), requesterId: user.id, requesterName: user.name,
      deptName: user.department || 'Unassigned', date: selectedDate,
      adminApproved: false, deanApproved: false, hodApproved: false, timestamp: new Date().toISOString()
    };
    await MockDB.upsertAttendanceEditRequest(currentReq);
    await MockDB.addNotification({
      id: crypto.randomUUID(),
      message: `Ledger Authority Petition: [${user.name}] for ${selectedDate}. Route: ${role}.`,
      timestamp: new Date().toISOString(), read: false, type: 'EDIT_REQUEST'
    });
    setSaveStatus(`Access request dispatched to ${role}.`);
    setTimeout(() => setSaveStatus(null), 3000);
    fetchData();
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
    setViewDate(new Date(current));
  };

  if (accessLevel === AccessLevel.NO_ACCESS) {
    return (
      <DashboardLayout title="Identity Matrix Rejected">
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h3 className="text-white font-black text-xl uppercase tracking-tighter">Access Domain Restricted</h3>
          <p className="text-slate-500 text-xs mt-2 uppercase font-bold tracking-widest">Consult system governance for module authorization.</p>
        </div>
      </DashboardLayout>
    );
  }

  const formattedDateLabel = new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();

  return (
    <DashboardLayout title="Daily Attendance Ledger">
      <div className="max-w-7xl mx-auto space-y-10 pb-24">
        <div className="bg-[#020617] border border-white/5 rounded-[3.5rem] p-8 md:p-10 flex flex-col xl:flex-row justify-between items-center gap-10 shadow-2xl relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div>
              <h2 className="text-white font-black text-3xl lowercase tracking-tight">daily operational log</h2>
              <div className="flex items-center gap-4 mt-3">
                <span className={`w-2 h-2 rounded-full ${isHistory ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                <p className={`${isHistory ? 'text-amber-500' : 'text-emerald-500'} text-[10px] font-black uppercase tracking-widest`}>
                  {isHistory ? 'Archive Entry' : 'Active Registry'} • {accessLevel.replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            <div className="flex items-center bg-black border border-white/10 rounded-full p-2 px-4 shadow-inner">
               <button onClick={() => changeDate(-1)} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg></button>
               <div onClick={() => setIsCalendarOpen(!isCalendarOpen)} className="px-8 flex flex-col items-center min-w-[220px] cursor-pointer group select-none">
                  <p className="text-sm font-black text-white uppercase tracking-tight group-hover:text-primary transition-colors">{formattedDateLabel}</p>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">Change Ledger Date</p>
               </div>
               <button onClick={() => changeDate(1)} disabled={selectedDate === today} className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white transition-all active:scale-90 disabled:opacity-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg></button>
            </div>
          </div>

          <div className="flex items-center gap-6 relative z-10">
             {accessLevel === AccessLevel.VIEW_ALL && (
               <span className="px-4 py-2 bg-slate-800 text-slate-400 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest">Read Only Mode</span>
             )}
             <button onClick={handleSave} disabled={!isEditable} className="px-10 py-5 bg-primary hover:bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-20">
               Authorize Daily Ledger
             </button>
          </div>
        </div>

        {isHistory && (
           <div className="bg-[#0f172a] border border-amber-500/20 rounded-[2.5rem] p-10 shadow-2xl overflow-hidden relative">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
                 <div>
                    <h3 className="text-xl font-black text-white lowercase tracking-tight">Ledger Authorization Audit</h3>
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-2">
                       {isEditable ? 'Modification Granted: Ledger Unlocked' : 'Institutional Protocol: Access Restricted'}
                    </p>
                 </div>
                 <div className="flex flex-wrap gap-4 items-center">
                    <ApprovalChip label="Admin" approved={!!editRequest?.adminApproved} onPing={() => dispatchRequest('ADMIN')} />
                    <ApprovalChip label="Dean" approved={!!editRequest?.deanApproved} onPing={() => dispatchRequest('DEAN')} />
                    <ApprovalChip label="HOD" approved={!!editRequest?.hodApproved} onPing={() => dispatchRequest('HOD')} />
                 </div>
              </div>
           </div>
        )}

        <div className="bg-[#161e2e] border border-white/5 rounded-[3rem] shadow-2xl overflow-hidden">
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1200px]">
                 <thead>
                    <tr className="bg-black/20 border-b border-white/5">
                       <th className="px-8 py-8 w-80 sticky left-0 bg-[#161e2e] z-30 shadow-lg border-r border-white/5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Identity Matrix</span>
                       </th>
                       {HOUR_LABELS.map((time, i) => (
                         <th key={i} className="px-4 py-8 text-center border-l border-white/5">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest">Hour {i+1}</p>
                            <p className="text-[9px] text-slate-500 font-mono mt-1">{time}</p>
                         </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                    {students.map(s => (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                         <td className="px-8 py-6 sticky left-0 bg-[#161e2e] z-20 border-r border-white/5 shadow-xl">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 font-black text-lg group-hover:text-primary transition-colors shadow-inner">{s.name[0]}</div>
                               <div className="min-w-0">
                                  <p className="text-sm font-black text-white uppercase truncate tracking-tight">{s.name}</p>
                                  <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-1 uppercase">{s.regNo}</p>
                               </div>
                            </div>
                         </td>
                         {attendanceData[s.id]?.map((hour, hIdx) => (
                           <td key={hIdx} className="px-4 py-6 text-center border-l border-white/5">
                              <select 
                                 disabled={!isEditable}
                                 value={hour.status}
                                 onChange={(e) => handleStatusChange(s.id, hIdx, e.target.value as HourStatus)}
                                 className={`appearance-none w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-2 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed ${
                                   hour.status === 'PRESENT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                   hour.status === 'ABSENT' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                   'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                 }`}
                              >
                                 <option value="PRESENT">Present</option>
                                 <option value="ABSENT">Absent</option>
                                 <option value="OTHER">Other</option>
                              </select>
                           </td>
                         ))}
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const ApprovalChip: React.FC<{ label: string, approved: boolean, onPing: () => void }> = ({ label, approved, onPing }) => (
  <div className="flex items-center gap-3">
     <div className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${approved ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
        {label}: {approved ? 'Authorized' : 'Restricted'}
     </div>
     {!approved && <button onClick={onPing} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[8px] font-black uppercase tracking-widest border border-white/5 active:scale-95 transition-all">Ping</button>}
  </div>
);

export default StaffAttendance;
