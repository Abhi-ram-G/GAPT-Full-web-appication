
import React, { useState, useEffect, useContext, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { User, UserRole, MarkBatch, MarkRecord, BatchStatus, Course, Subject } from '@/types/types';
import { MockDB } from '@/store/store';

const YEAR_TO_SEMESTERS: Record<string, number[]> = {
  '1st Year': [1, 2],
  '2nd Year': [3, 4],
  '3rd Year': [5, 6],
  '4th Year': [7, 8],
  'Final Year': [7, 8],
};

const MarkEntry: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [batches, setBatches] = useState<MarkBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('1st Year');
  const [students, setStudents] = useState<User[]>([]);
  const [markData, setMarkData] = useState<Record<string, number>>({});
  const [subject, setSubject] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'info' | 'error', msg: string } | null>(null);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkValue, setBulkValue] = useState<string>('');

  useEffect(() => {
    const init = async () => {
      const cur = await MockDB.getCurriculum();
      setCurriculum(cur);
      const allBatches = (await MockDB.getMarkBatches()).filter(b => b.status !== BatchStatus.BLOCKED);
      setBatches(allBatches);
      
      if (allBatches.length > 0) {
        setSelectedBatchId(allBatches[0].id);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const availableDepartments = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN || user.role === UserRole.DEAN) {
      return curriculum.map(c => `${c.name} (${c.degree})`);
    }
    return curriculum
      .filter(c => `${c.name} (${c.degree})` === user.department)
      .map(c => `${c.name} (${c.degree})`);
  }, [curriculum, user]);

  useEffect(() => {
    if (availableDepartments.length > 0 && (!selectedDept || !availableDepartments.includes(selectedDept))) {
      setSelectedDept(availableDepartments[0]);
    }
  }, [availableDepartments, selectedDept]);

  // Extract semester number from batch name (e.g. "SEM 3 INTERNAL 1" -> 3)
  const activeSemesterFromBatch = useMemo(() => {
    const activeBatch = batches.find(b => b.id === selectedBatchId);
    if (!activeBatch) return null;
    const match = activeBatch.name.match(/SEM (\d+)/i);
    return match ? parseInt(match[1]) : null;
  }, [batches, selectedBatchId]);

  const availableSubjects = useMemo(() => {
    const activeBatch = batches.find(b => b.id === selectedBatchId);
    if (!activeBatch || !selectedDept || !user) return [];

    const course = curriculum.find(c => `${c.name} (${c.degree})` === selectedDept);
    if (!course) return [];

    const allowedSems = YEAR_TO_SEMESTERS[selectedYear] || [];

    return course.subjects
      .filter(s => {
        const isAssigned = s.assignedStaffIds?.includes(user.id);
        const isExecutive = [UserRole.ADMIN, UserRole.DEAN, UserRole.HOD].includes(user.role);
        
        // Subject must belong to a semester matching the cohort year
        const isCorrectSemForYear = allowedSems.includes(s.semester);
        
        // If batch name implies a specific semester, subject must match that too
        const isCorrectSemForBatch = activeSemesterFromBatch ? s.semester === activeSemesterFromBatch : true;

        const isInBatch = activeBatch.subjects.includes(s.name.toUpperCase()) || activeBatch.subjects.includes(s.code.toUpperCase());
        
        return (isAssigned || isExecutive) && isInBatch && isCorrectSemForYear && isCorrectSemForBatch;
      })
      .map(s => s.name);
  }, [selectedBatchId, selectedDept, curriculum, user, batches, selectedYear, activeSemesterFromBatch]);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!subject || !availableSubjects.includes(subject)) {
        setSubject(availableSubjects[0]);
      }
    } else {
      setSubject('');
    }
  }, [availableSubjects, selectedBatchId, selectedDept]);

  const activeBatch = useMemo(() => batches.find(b => b.id === selectedBatchId), [batches, selectedBatchId]);
  const isFrozen = activeBatch?.status === BatchStatus.FROZEN;

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDept || !subject || !selectedBatchId) {
        setStudents([]);
        setMarkData({});
        return;
      }
      
      const allUsers = await MockDB.getUsers();
      const filtered = allUsers.filter(u => 
        u.role === UserRole.STUDENT && 
        u.department === selectedDept && 
        u.studyYear === selectedYear
      );
      setStudents(filtered);

      const records = await MockDB.getMarkRecords(selectedBatchId);
      const filteredRecords = records.filter(r => r.subject === subject);
      const existing: Record<string, number> = {};
      filteredRecords.forEach(r => existing[r.studentId] = r.marks);
      setMarkData(existing);
    };
    fetchData();
  }, [selectedDept, selectedYear, selectedBatchId, subject]);

  const metrics = useMemo(() => {
    // Fixed: Using a type guard filter to ensure 'values' is correctly inferred as number[] and not unknown[]
    const values = Object.values(markData).filter((v): v is number => v !== undefined);
    if (values.length === 0) return { avg: "0", high: 0, completion: 0 };
    // Fixed: Now 'a' and 'b' are correctly inferred as numbers for arithmetic operations
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    // Fixed: Math.max now correctly receives numbers
    const high = Math.max(...values);
    const completion = (values.length / (students.length || 1)) * 100;
    return { avg: avg.toFixed(1), high, completion: Math.round(completion) };
  }, [markData, students]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.regNo?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  const handleMarkChange = (studentId: string, val: string) => {
    if (isFrozen) return;
    const num = parseInt(val);
    if (isNaN(num)) {
       const newData = {...markData};
       delete newData[studentId];
       setMarkData(newData);
       return;
    }
    setMarkData(prev => ({ ...prev, [studentId]: Math.min(100, Math.max(0, num)) }));
  };

  const handleApplyBulk = () => {
    if (isFrozen || !bulkValue) return;
    const val = parseInt(bulkValue);
    if (isNaN(val)) return;
    const updated = {...markData};
    filteredStudents.forEach(s => {
      updated[s.id] = Math.min(100, Math.max(0, val));
    });
    setMarkData(updated);
    setBulkValue('');
    setStatus({ type: 'info', msg: `Bulk value of ${val} applied to ${filteredStudents.length} students.` });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleSave = async () => {
    if (isFrozen) {
      setStatus({ type: 'error', msg: 'Batch is frozen.' });
      return;
    }
    
    setStatus({ type: 'info', msg: 'Synchronizing performance data with master ledger...' });

    try {
      for (const s of students) {
        const marks = markData[s.id] ?? null;
        if (marks === null) continue;

        const record: MarkRecord = {
          id: crypto.randomUUID(),
          batchId: selectedBatchId,
          studentId: s.id,
          subject: subject,
          marks: marks,
          maxMarks: 100,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.id || 'system'
        };
        await MockDB.upsertMarkRecord(record);

        await MockDB.addNotification({
          id: crypto.randomUUID(),
          userId: s.id,
          message: `Academic Release: Performance score for ${subject} (${activeBatch?.name}) published: ${marks}/100.`,
          timestamp: new Date().toISOString(),
          read: false,
          type: 'MARK_UPDATE'
        });
      }
      
      setStatus({ type: 'success', msg: `Data synchronization successful.` });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus({ type: 'error', msg: 'Critical: Sync failure. Contact Registry.' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Mark Entry">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Performance Ledger Entry">
      <div className="max-w-7xl mx-auto space-y-8 pb-24">
        
        {/* Scoping Alert */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                Scoped Access: Authorized for {user?.department} • Only assigned units visible
              </p>
           </div>
           {activeSemesterFromBatch && (
              <span className="px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-lg">
                Processing SEM {activeSemesterFromBatch} Registry
              </span>
           )}
        </div>

        {/* Control Panel */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[3.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
          
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-5 gap-6 items-end">
            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assessment Cycle</label>
              <select value={selectedBatchId} onChange={e => setSelectedBatchId(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner">
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cohort Year</label>
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner">
                {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Division</label>
              <select 
                value={selectedDept} 
                onChange={e => setSelectedDept(e.target.value)} 
                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner disabled:opacity-50"
                disabled={availableDepartments.length <= 1}
              >
                {availableDepartments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-2 col-span-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Authorized Subject</label>
              <select 
                value={subject} 
                onChange={e => setSubject(e.target.value)} 
                disabled={availableSubjects.length === 0}
                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner disabled:opacity-30"
              >
                {availableSubjects.length === 0 ? (
                  <option value="">No Authorized Units</option>
                ) : (
                  availableSubjects.map(s => <option key={s} value={s}>{s}</option>)
                )}
              </select>
            </div>

            <div className="col-span-1 flex flex-col gap-2">
              <div className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-center border ${isFrozen ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : availableSubjects.length === 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                {isFrozen ? 'LOCKED REGISTRY' : availableSubjects.length === 0 ? 'SEM MISMATCH' : 'READ/WRITE ACCESS'}
              </div>
              <button 
                onClick={handleSave} 
                disabled={isFrozen || !subject || students.length === 0}
                className="w-full py-4 bg-primary hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-20"
              >
                Sync Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Intelligence Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <MetricCard label="Class Average" value={metrics.avg} suffix="/100" />
           <MetricCard label="Highest Mark" value={metrics.high} color="text-emerald-400" />
           <MetricCard label="Registry Completion" value={`${metrics.completion}%`} />
           <div className="bg-[#161e2e] border border-white/5 rounded-3xl p-6 flex flex-col justify-center">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2">Cohort Strength</p>
              <p className="text-2xl font-black text-white">{students.length} <span className="text-[10px] text-slate-600">Students</span></p>
           </div>
        </div>

        {/* Data Matrix */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[3.5rem] shadow-2xl overflow-hidden">
          
          <div className="p-8 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
             <div className="flex-1 max-w-md relative group">
                <input 
                  type="text" 
                  placeholder="Filter student list..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-12 py-3.5 text-xs text-white outline-none focus:border-primary/50 transition-all font-bold placeholder:text-slate-700"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
             </div>

             <div className="flex items-center gap-4">
                <div className="flex bg-black p-1 rounded-xl border border-white/5">
                   <input 
                     type="number" 
                     placeholder="Bulk" 
                     value={bulkValue}
                     onChange={e => setBulkValue(e.target.value)}
                     className="w-20 bg-transparent px-4 py-2 text-xs text-white font-bold outline-none"
                   />
                   <button 
                     onClick={handleApplyBulk}
                     disabled={isFrozen || !bulkValue || !subject}
                     className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20"
                   >
                     Apply to list
                   </button>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-950/40">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Authorized Identity</th>
                  <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Registry Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!subject ? (
                  <tr>
                    <td colSpan={2} className="py-24 text-center border-t border-white/5">
                       <p className="text-rose-500/60 font-black uppercase tracking-[0.3em] text-xs">No unit selected or authorized for this academic period</p>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-24 text-center border-t border-white/5">
                       <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-xs">No matching institutional records in this cohort</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(s => {
                    const val = markData[s.id];
                    const hasMark = val !== undefined;
                    return (
                      <tr key={s.id} className={`hover:bg-white/[0.02] transition-colors group ${!hasMark ? 'bg-rose-500/[0.02]' : ''}`}>
                        <td className="px-10 py-6">
                          <div className="flex items-center gap-5">
                             <div className={`w-12 h-12 rounded-2xl bg-slate-950 border flex items-center justify-center font-black text-lg transition-all group-hover:scale-105 ${hasMark ? 'border-primary/20 text-primary' : 'border-rose-500/20 text-rose-500'}`}>
                               {s.name[0]}
                             </div>
                             <div className="min-w-0">
                                <p className="text-sm font-black text-white uppercase truncate tracking-tight group-hover:text-primary transition-colors">{s.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono tracking-widest mt-1 uppercase">{s.regNo}</p>
                             </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-right">
                          <div className="inline-flex items-center gap-4">
                             {hasMark && (
                                <div className={`w-1.5 h-1.5 rounded-full ${val >= 80 ? 'bg-emerald-500' : val >= 50 ? 'bg-primary' : 'bg-rose-500'}`}></div>
                             )}
                             <input 
                               type="number" 
                               value={val ?? ''} 
                               onChange={e => handleMarkChange(s.id, e.target.value)} 
                               disabled={isFrozen} 
                               placeholder="--"
                               className={`w-28 bg-black border rounded-2xl px-6 py-4 text-center text-lg font-black outline-none focus:ring-2 transition-all shadow-inner placeholder:text-slate-800 ${
                                 isFrozen ? 'border-white/5 text-slate-600' : 
                                 hasMark ? 'border-primary/30 text-white focus:ring-primary/20' : 
                                 'border-rose-500/30 text-rose-500 focus:ring-rose-500/20'
                               }`} 
                             />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {status && (
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 rounded-full border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-10 flex items-center gap-4 z-50 ${
            status.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 
            status.type === 'error' ? 'bg-rose-600 text-white border-rose-500' : 
            'bg-indigo-600 text-white border-indigo-500'
          }`}>
             <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
             <p className="text-[10px] font-black uppercase tracking-widest">{status.msg}</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const MetricCard: React.FC<{ label: string; value: string | number; suffix?: string; color?: string }> = ({ label, value, suffix, color = "text-white" }) => (
  <div className="bg-[#161e2e] border border-white/5 rounded-3xl p-6 transition-all hover:border-primary/20 group">
    <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-2">{label}</p>
    <div className="flex items-baseline gap-1">
      <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
      {suffix && <span className="text-[10px] font-black text-slate-600 uppercase">{suffix}</span>}
    </div>
  </div>
);

export default MarkEntry;
