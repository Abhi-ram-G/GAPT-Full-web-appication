
import React, { useState, useEffect, useContext, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import CalendarWidget from '../components/CalendarWidget';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { UserRole, User, AttendanceRecord, HourStatus, HourAttendance, AttendanceEditRequest, Feature, AccessLevel, Course, AcademicBatch } from '../types';

const StaffAttendance: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [attendanceData, setAttendanceData] = useState<Record<string, HourAttendance[]>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isHistory, setIsHistory] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allBatches, setAllBatches] = useState<AcademicBatch[]>([]);

  // New Flow State
  const [selectedHour, setSelectedHour] = useState<number>(1);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('1');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('09:00 AM - 10:00 AM');

  // Approval Tracking State
  const [editRequest, setEditRequest] = useState<AttendanceEditRequest | null>(null);

  const HOURS = [1, 2, 3, 4, 5, 6, 7];
  const YEARS = ['1', '2', '3', '4'];
  const TIMES = ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '12:00 PM - 01:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM'];

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    const [allUsers, existing, perms, cur, batches] = await Promise.all([
      ApiService.getUsers(),
      ApiService.getAttendance(selectedDate),
      ApiService.getPermissions(),
      ApiService.getCurriculum(),
      ApiService.getAcademicBatches()
    ]);

    const students = allUsers.filter(u => u.role === UserRole.STUDENT);
    setAllStudents(students);
    setPermissions(perms);
    setAllCourses(cur);
    setAllBatches(batches);

    const initial: Record<string, HourAttendance[]> = {};
    students.forEach(s => {
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
    const selectedTimeMs = new Date(selectedDate).getTime();
    const nowMs = new Date().getTime();
    const isPast24Hours = (nowMs - selectedTimeMs) > 24 * 60 * 60 * 1000;
    setIsHistory(isPast24Hours);

    if (isPast24Hours && user) {
      const req = await ApiService.getAttendanceEditRequest(user.id, selectedDate);
      setEditRequest(req && Object.keys(req).length > 0 ? req : null);
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

  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    let matchingCourses = allCourses;

    // Filter by Batch if selected
    if (selectedBatchId) {
      const batch = allBatches.find(b => b.id === selectedBatchId);
      if (batch?.departmentIds?.length) {
        matchingCourses = allCourses.filter(c => batch.departmentIds.includes(c.id));
      } else {
        matchingCourses = [];
      }
    }

    matchingCourses.forEach(c => {
      depts.add(`${c.name} (${c.degree})`);
    });

    if (depts.size === 0 && user?.department && !selectedBatchId) {
      depts.add(user.department);
    }
    return Array.from(depts).sort();
  }, [allCourses, allBatches, selectedBatchId, user]);

  useEffect(() => {
    if (availableDepartments.length > 0 && (!selectedDepartment || !availableDepartments.includes(selectedDepartment))) {
      setSelectedDepartment(availableDepartments.includes(user?.department || '') ? user?.department || availableDepartments[0] : availableDepartments[0]);
    } else if (availableDepartments.length === 0) {
      setSelectedDepartment('');
    }
  }, [availableDepartments, selectedDepartment, user]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = allBatches.find(b => b.id === batchId);
    if (batch) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      let calcYear = currentYear - batch.startYear + (currentMonth >= 5 ? 1 : 0);
      calcYear = Math.max(1, Math.min(calcYear, 4)); // clamp 1-4
      setSelectedYear(calcYear.toString());
    }
  };

  const filteredStudents = useMemo(() => {
    if (!selectedDepartment) return [];
    const deptBase = selectedDepartment.split(' (')[0];
    return allStudents.filter(s => {
      const isYearMatch = s.studyYear === selectedYear || s.studyYear === `${selectedYear}rd Year` || s.studyYear === `${selectedYear}nd Year` || s.studyYear === `${selectedYear}st Year` || s.studyYear === `${selectedYear}th Year`;
      const isDeptMatch = s.department?.startsWith(deptBase) || deptBase.startsWith(s.department || '___');
      return isYearMatch && isDeptMatch;
    });
  }, [allStudents, selectedYear, selectedDepartment]);

  const handleStatusChange = (studentId: string, status: HourStatus) => {
    if (!isEditable) return;
    const newData = { ...attendanceData };
    const hourIdx = selectedHour - 1;
    newData[studentId][hourIdx] = {
      ...newData[studentId][hourIdx],
      status,
      time: selectedTime,
      staffName: user?.name
    };
    setAttendanceData(newData);
  };

  const handleSave = async () => {
    if (!isEditable) return;
    const records = allStudents.map(s => ({
      userId: s.id,
      date: selectedDate,
      isPresent: attendanceData[s.id].filter(h => h.status === 'ABSENT').length < 4,
      hours: attendanceData[s.id],
      markedBy: user?.id || 'system'
    }));
    await ApiService.saveAttendanceBatch(records);
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
    await ApiService.upsertAttendanceEditRequest(currentReq);
    await ApiService.addNotification({
      id: crypto.randomUUID(),
      message: `Ledger Authority Petition: [${user.name}] for ${selectedDate}. Route: ${role}.`,
      timestamp: new Date().toISOString(), read: false, type: 'EDIT_REQUEST'
    });
    setSaveStatus(`Access request dispatched to ${role}.`);
    setTimeout(() => setSaveStatus(null), 3000);
    fetchData();
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

  return (
    <DashboardLayout title="Daily Attendance Ledger">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 pb-24">
        <div className="bg-[#020617] border border-white/5 rounded-3xl md:rounded-[3.5rem] p-6 md:p-10 flex flex-col xl:flex-row justify-between items-center gap-10 shadow-2xl relative">
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
            <div className="text-center md:text-left">
              <h2 className="text-white font-black text-3xl lowercase tracking-tight">daily operational log</h2>
              <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
                <span className={`w-2 h-2 rounded-full ${isHistory ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                <p className={`${isHistory ? 'text-amber-500' : 'text-emerald-500'} text-[10px] font-black uppercase tracking-widest`}>
                  {isHistory ? 'Archive Entry' : 'Active Registry'}
                </p>
              </div>
            </div>

            <CalendarWidget
              selectedDate={new Date(selectedDate)}
              onDateChange={(date) => {
                const d = date.toISOString().split('T')[0];
                if (d <= today) {
                  setSelectedDate(d);
                }
              }}
            />
          </div>

          <div className="flex items-center gap-6 relative z-10">
            {accessLevel === AccessLevel.VIEW_ALL && (
              <span className="px-4 py-2 bg-slate-800 text-slate-400 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest">Read Only Mode</span>
            )}
            <button onClick={handleSave} disabled={!isEditable} className="px-10 py-5 bg-primary hover:bg-indigo-500 text-white rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-20">
              Authorize Ledger
            </button>
          </div>
        </div>

        {isHistory && (
          <div className="bg-[#0f172a] border border-amber-500/20 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl overflow-hidden relative">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-black text-white lowercase tracking-tight">Ledger Authorization Audit</h3>
                <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-2">
                  {isEditable ? 'Modification Granted: Ledger Unlocked' : 'Institutional Protocol: Access Restricted'}
                </p>
              </div>
              <div className="flex flex-wrap gap-4 items-center justify-center md:justify-end">
                <ApprovalChip label="Admin" approved={!!editRequest?.adminApproved} onPing={() => dispatchRequest('ADMIN')} />
                <ApprovalChip label="Dean" approved={!!editRequest?.deanApproved} onPing={() => dispatchRequest('DEAN')} />
                <ApprovalChip label="HOD" approved={!!editRequest?.hodApproved} onPing={() => dispatchRequest('HOD')} />
              </div>
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-surface-component border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Hour</label>
              <select
                value={selectedHour}
                onChange={(e) => setSelectedHour(Number(e.target.value))}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all"
              >
                {HOURS.map(h => <option key={h} value={h} className="bg-slate-900">Hour {h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Batch</label>
              <select
                value={selectedBatchId}
                onChange={(e) => handleBatchChange(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all"
              >
                <option value="" className="bg-slate-900 text-slate-500">All Batches...</option>
                {allBatches.map(b => <option key={b.id} value={b.id} className="bg-slate-900">{b.name} ({b.startYear}-{b.endYear})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all"
              >
                {YEARS.map(y => <option key={y} value={y} className="bg-slate-900">Year {y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all"
              >
                <option value="" disabled className="bg-slate-900 text-slate-500">Choose Department...</option>
                {availableDepartments.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Select Time</label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50 transition-all"
              >
                {TIMES.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-[#161e2e] border border-white/5 rounded-3xl md:rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-white font-black text-xl lowercase tracking-tight">Student Roster</h3>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                {filteredStudents.filter(s => attendanceData[s.id]?.[selectedHour - 1]?.status === 'PRESENT').length} Present
              </span>
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest bg-rose-500/10 px-3 py-1 rounded-lg border border-rose-500/20">
                {filteredStudents.filter(s => attendanceData[s.id]?.[selectedHour - 1]?.status === 'ABSENT').length} Absent
              </span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 px-3 py-1 rounded-lg border border-white/5 ml-2">
                {filteredStudents.length} Total
              </span>
            </div>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm font-bold">No students found for this Year and Department.</div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20 border-b border-white/5">
                    <th className="px-8 py-6 w-1/2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Student Identity</span>
                    </th>
                    <th className="px-8 py-6 text-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Attendance Status</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredStudents.map(s => {
                    const hourData = attendanceData[s.id]?.[selectedHour - 1];
                    return (
                      <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 font-black text-lg group-hover:text-primary transition-colors shadow-inner">{s.name[0]}</div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-white uppercase truncate tracking-tight">{s.name}</p>
                              <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-1 uppercase">{s.regNo}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <select
                            disabled={!isEditable}
                            value={hourData?.status || 'PRESENT'}
                            onChange={(e) => handleStatusChange(s.id, e.target.value as HourStatus)}
                            className={`appearance-none w-48 mx-auto px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none border-2 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed ${hourData?.status === 'PRESENT' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              hourData?.status === 'ABSENT' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' :
                                'bg-amber-500/10 border-amber-500/20 text-amber-400'
                              }`}
                          >
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {saveStatus && (
        <div className="fixed bottom-10 right-10 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest animate-in slide-in-from-bottom-5 z-50">
          {saveStatus}
        </div>
      )}
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
