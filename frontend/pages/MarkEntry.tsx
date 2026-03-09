
import React, { useState, useEffect, useContext, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { User, UserRole, MarkBatch, MarkRecord, BatchStatus, Course, Subject } from '../types';
import { ApiService } from '../store';

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

  // Comparative Data State
  const [historyMarks, setHistoryMarks] = useState<Record<string, { i1?: number, i2?: number }>>({});
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const init = async () => {
      const cur = await ApiService.getCurriculum();
      setCurriculum(cur);
      const allBatches = (await ApiService.getMarkBatches());
      setBatches(allBatches);

      if (allBatches.length > 0) {
        setSelectedBatchId(allBatches[0]?.id || '');
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const activeBatch = useMemo(() => batches.find(b => b.id === selectedBatchId), [batches, selectedBatchId]);

  const assessmentType = useMemo(() => {
    if (!activeBatch) return 'FORMATIVE';
    const name = activeBatch.name.toUpperCase();
    if (name.includes('END SEM') || name.includes('SEMESTER') || name.includes('FINAL')) return 'SUMMATIVE';
    return 'FORMATIVE';
  }, [activeBatch]);

  const activeSemesterFromBatch = useMemo(() => {
    if (!activeBatch) return null;
    const match = activeBatch.name.match(/SEM (\d+)/i);
    return match ? parseInt(match[1]) : null;
  }, [activeBatch]);

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

  const availableSubjects = useMemo(() => {
    if (!activeBatch || !selectedDept || !user) return [];
    const course = curriculum.find(c => `${c.name} (${c.degree})` === selectedDept);
    if (!course) return [];
    const allowedSems = YEAR_TO_SEMESTERS[selectedYear] || [];

    return course.subjects
      .filter(s => {
        const isAssigned = s.assignedStaffIds?.includes(user.id);
        const isExecutive = [UserRole.ADMIN, UserRole.DEAN, UserRole.HOD].includes(user.role);
        const isCorrectSemForYear = allowedSems.includes(s.semester);
        const isCorrectSemForBatch = activeSemesterFromBatch ? s.semester === activeSemesterFromBatch : true;
        const isInBatch = activeBatch.subjects.includes(s.name.toUpperCase()) || activeBatch.subjects.includes(s.code.toUpperCase());
        return (isAssigned || isExecutive) && isInBatch && isCorrectSemForYear && isCorrectSemForBatch;
      })
      .map(s => s.name);
  }, [selectedBatchId, selectedDept, curriculum, user, activeBatch, selectedYear, activeSemesterFromBatch]);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      if (!subject || !availableSubjects.includes(subject)) {
        setSubject(availableSubjects[0]);
      }
    } else {
      setSubject('');
    }
  }, [availableSubjects, selectedBatchId, selectedDept]);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedDept || !subject || !selectedBatchId) {
        setStudents([]);
        setMarkData({});
        setHistoryMarks({});
        return;
      }

      const allUsers = await ApiService.getUsers();
      const filtered = allUsers.filter(u =>
        u.role === UserRole.STUDENT &&
        u.department === selectedDept &&
        u.studyYear === selectedYear
      );
      setStudents(filtered);

      const [records, allMarkRecords] = await Promise.all([
        ApiService.getMarkRecords(selectedBatchId),
        ApiService.getMarkRecords()
      ]);

      const currentRecords = records.filter(r => r.subject === subject);
      const existing: Record<string, number> = {};
      currentRecords.forEach(r => existing[r.studentId] = r.marks);
      setMarkData(existing);

      // Fetch History for Comparison
      if (assessmentType === 'SUMMATIVE') {
        const hMap: Record<string, { i1?: number, i2?: number }> = {};
        filtered.forEach(s => {
          const studentHistory = allMarkRecords.filter(r => r.studentId === s.id && r.subject === subject);
          const internalBatches = batches.filter(b => b.name.toUpperCase().includes('INTERNAL'));

          studentHistory.forEach(r => {
            const b = batches.find(batch => batch.id === r.batchId);
            if (!b) return;
            const bName = b.name.toUpperCase();
            if (bName.includes('INTERNAL 1')) hMap[s.id] = { ...hMap[s.id], i1: r.marks };
            else if (bName.includes('INTERNAL 2')) hMap[s.id] = { ...hMap[s.id], i2: r.marks };
          });
        });
        setHistoryMarks(hMap);
      } else {
        setHistoryMarks({});
      }
    };
    fetchData();
  }, [selectedDept, selectedYear, selectedBatchId, subject, assessmentType]);

  const metrics = useMemo(() => {
    const values = Object.values(markData).filter((v): v is number => v !== undefined);
    if (values.length === 0) return { avg: "0", high: 0, completion: 0 };
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const high = Math.max(...values);
    const completion = (values.length / (students.length || 1)) * 100;
    return { avg: avg.toFixed(1), high, completion: Math.round(completion) };
  }, [markData, students]);

  const handleSave = async () => {
    if (activeBatch?.status === BatchStatus.FROZEN) return;
    setStatus({ type: 'info', msg: 'Synchronizing performance matrix...' });

    try {
      for (const s of students) {
        const marks = markData[s.id] ?? null;
        if (marks === null) continue;

        await ApiService.upsertMarkRecord({
          batchId: selectedBatchId,
          studentId: s.id,
          subject: subject,
          marks: marks,
          maxMarks: 100,
          updatedBy: user?.id || 'system'
        });
      }
      setStatus({ type: 'success', msg: `Registry entry successful for ${subject}.` });
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus({ type: 'error', msg: 'Critical: Sync failure. Contact Academic Registry.' });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Performance Entry">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Institutional Performance Ledger">
      <div className="max-w-7xl mx-auto space-y-8 pb-24">

        {/* Header Protocol */}
        <div className={`p-6 rounded-[2.5rem] border flex items-center justify-between shadow-2xl transition-all ${assessmentType === 'SUMMATIVE' ? 'bg-emerald-600 border-emerald-500' : 'bg-primary border-primary/20'}`}>
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-[1.5rem] bg-black/20 backdrop-blur-md flex items-center justify-center text-white font-black text-2xl shadow-inner border border-white/10">
              {assessmentType === 'SUMMATIVE' ? 'S' : 'F'}
            </div>
            <div>
              <h2 className="text-white font-black text-2xl uppercase tracking-tighter leading-none">
                {assessmentType === 'SUMMATIVE' ? 'Summative Assessment Protocol' : 'Formative Evaluation Mode'}
              </h2>
              <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Registry Clearance: {activeBatch?.status}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {assessmentType === 'SUMMATIVE' && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${showHistory ? 'bg-white text-emerald-600 border-white' : 'bg-emerald-700 text-white border-emerald-500 hover:bg-emerald-500'}`}
              >
                {showHistory ? 'Hide Assessment History' : 'Show Assessment History'}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={activeBatch?.status === BatchStatus.FROZEN || !subject || students.length === 0}
              className="px-10 py-3.5 bg-black/30 hover:bg-black/50 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-95 disabled:opacity-20 border border-white/10"
            >
              Sync Master Ledger
            </button>
          </div>
        </div>

        {/* Configuration Matrix */}
        <div className="bg-surface-component border border-border-subtle rounded-[3.5rem] p-8 shadow-2xl">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-end">
            <EntryControl label="Assessment Cycle" value={selectedBatchId} onChange={setSelectedBatchId} options={batches.map(b => ({ val: b.id, label: b.name }))} />
            <EntryControl label="Cohort Period" value={selectedYear} onChange={setSelectedYear} options={['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'].map(y => ({ val: y, label: y }))} />
            <EntryControl label="Academic Division" value={selectedDept} onChange={setSelectedDept} options={availableDepartments.map(d => ({ val: d, label: d }))} disabled={availableDepartments.length <= 1} />
            <EntryControl label="Target Registry Unit" value={subject} onChange={setSubject} options={availableSubjects.map(s => ({ val: s, label: s }))} disabled={availableSubjects.length === 0} />
          </div>
        </div>

        {/* Intelligence Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatTile label="Class Mean" value={metrics.avg} suffix="/100" />
          <StatTile label="Highest Registry Mark" value={metrics.high} color="text-emerald-500" />
          <StatTile label="Sync Completion" value={`${metrics.completion}%`} />
          <div className="bg-surface-component border border-border-subtle rounded-3xl p-6 flex flex-col justify-center shadow-xl">
            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">Total Candidates</p>
            <p className="text-2xl font-black text-text-primary tracking-tighter">{students.length} <span className="text-[10px] text-text-muted font-bold ml-1">Enrolled</span></p>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-surface-component border border-border-subtle rounded-[3.5rem] shadow-2xl overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-black/5 dark:bg-black/20 border-b border-border-subtle">
                  <th className="px-10 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Authorized Identity</th>
                  {showHistory && (
                    <>
                      <th className="px-6 py-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">IA 1 (Ref)</th>
                      <th className="px-6 py-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">IA 2 (Ref)</th>
                    </>
                  )}
                  <th className="px-10 py-6 text-[10px] font-black text-text-muted uppercase tracking-[0.2em] text-right">Entry Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-primary/5 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-6">
                        <div className="w-12 h-12 rounded-2xl bg-surface-deep border border-border-subtle flex items-center justify-center font-black text-lg text-primary shadow-inner group-hover:scale-105 transition-transform">
                          {s.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-text-primary uppercase group-hover:text-primary transition-colors">{s.name}</p>
                          <p className="text-[10px] text-text-muted font-mono tracking-widest mt-1 uppercase">{s.regNo}</p>
                        </div>
                      </div>
                    </td>
                    {showHistory && (
                      <>
                        <td className="px-6 py-6 text-center">
                          <span className="text-xs font-black text-indigo-400">{historyMarks[s.id]?.i1 ?? '--'}</span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className="text-xs font-black text-indigo-400">{historyMarks[s.id]?.i2 ?? '--'}</span>
                        </td>
                      </>
                    )}
                    <td className="px-10 py-6 text-right">
                      <input
                        type="number"
                        value={markData[s.id] ?? ''}
                        onChange={e => setMarkData({ ...markData, [s.id]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        disabled={activeBatch?.status === BatchStatus.FROZEN}
                        placeholder="--"
                        className="w-24 bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-center text-lg font-black text-text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-inner placeholder:text-slate-800"
                      />
                    </td>
                  </tr>
                ))}
                {students.length === 0 && (
                  <tr><td colSpan={10} className="py-24 text-center text-text-muted font-black uppercase tracking-[0.2em] text-xs">No records available for current selection</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {status && (
          <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 rounded-full border shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-10 flex items-center gap-4 z-50 ${status.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' :
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

const EntryControl: React.FC<{ label: string, value: string, onChange: (v: string) => void, options: { val: string, label: string }[], disabled?: boolean }> = ({ label, value, onChange, options, disabled }) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-text-primary font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner appearance-none cursor-pointer disabled:opacity-50"
    >
      {options.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
    </select>
  </div>
);

const StatTile: React.FC<{ label: string, value: string | number, suffix?: string, color?: string }> = ({ label, value, suffix, color = "text-text-primary" }) => (
  <div className="bg-surface-component border border-border-subtle rounded-3xl p-6 shadow-xl group hover:border-primary/20 transition-all">
    <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">{label}</p>
    <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}<span className="text-[10px] text-text-muted font-bold ml-1 uppercase">{suffix}</span></p>
  </div>
);

export default MarkEntry;
