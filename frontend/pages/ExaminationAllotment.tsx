import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { User } from '../types';
import {
  AlertCircle, ArrowLeft, CheckSquare, Loader2, RefreshCw, Search,
  UserPlus2, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type RosterStudent = {
  id: string;
  name: string;
  email: string;
  regNo?: string;
  isPresent?: boolean;
  assignedInvigilatorId?: string | null;
  assignedInvigilatorName?: string | null;
};

const ExaminationAllotment: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [test, setTest] = useState<any>(null);
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [invigilators, setInvigilators] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [assignTo, setAssignTo] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [manualStudentId, setManualStudentId] = useState<string>('');

  // Derived filtered list
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.regNo && s.regNo.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q)
    );
  }, [students, search]);

  const availableStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStudents
      .filter(s => !students.some(r => r.id === String((s as any).id)))
      .filter(s =>
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        ((s as any).reg_no && String((s as any).reg_no).toLowerCase().includes(q)) ||
        ((s as any).regNo && String((s as any).regNo).toLowerCase().includes(q))
      );
  }, [allStudents, students, search]);

  const fetchData = async () => {
    if (!testId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [foundTest, roster, allUsers] = await Promise.all([
        ApiService.getExaminationTest(testId),
        ApiService.getExaminationStudentList(testId, {
          batch: searchParams.get('batch') || undefined,
          department: searchParams.get('department') || undefined
        }),
        ApiService.getUsers()
      ]);

      const rosterList = roster || [];
      const unassignedRoster = rosterList.filter(stu => !stu.assignedInvigilatorId);
      const assignedStudentIds = new Set(
        rosterList
          .filter(stu => !!stu.assignedInvigilatorId)
          .map(stu => String(stu.id))
      );

      setTest(foundTest);
      setStudents(unassignedRoster);
      setAllStudents(
        allUsers
          .filter(u => u.role === 'STUDENT')
          .filter(u => !assignedStudentIds.has(String(u.id)))
      );

      const invs = allUsers.filter(u => ['STAFF', 'HOD', 'DEAN'].includes(u.role));
      setInvigilators(invs);
      setAssignTo(invs[0]?.id || '');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load allotment data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const all = new Set(selectedIds);
    filteredStudents.forEach(s => all.add(s.id));
    setSelectedIds(all);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleAssign = async () => {
    if (!testId || !assignTo || selectedIds.size === 0) return;
    const idsToAssign = Array.from(selectedIds);
    try {
      await ApiService.assignStudentToInvigilator(testId, assignTo, idsToAssign);
      // optimistically remove assigned students from roster
      setStudents(prev => prev.filter(stu => !selectedIds.has(stu.id)));
      clearSelection();
      // refresh roster to reflect new invigilator assignments/server state
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign students');
    }
  };

  const handleManualAdd = () => {
    if (!manualStudentId) return;
    const stu = allStudents.find(s => String((s as any).id) === manualStudentId);
    if (!stu) return;
    setStudents(prev => {
      if (prev.some(p => p.id === manualStudentId)) return prev;
      return [
        ...prev,
        {
          id: String((stu as any).id),
          name: stu.name || stu.username || stu.email,
          email: stu.email,
          regNo: (stu as any).reg_no || (stu as any).regNo,
          isPresent: false,
          assignedInvigilatorId: null,
          assignedInvigilatorName: null,
        }
      ];
    });
    setManualStudentId('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-xs uppercase tracking-[0.3em] font-black">Loading roster…</p>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Unable to load student roster</h2>
        <p className="text-slate-400 mb-6 max-w-xl">{error}</p>
        <button
          onClick={() => navigate('/examination-portal')}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold"
        >
          <ArrowLeft size={16} /> Back to portal
        </button>
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  const remaining = Math.max(students.length - selectedCount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/examination-portal')}
              className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-1">
                Student Mapping
              </p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">{test.title}</h1>
              <p className="text-slate-500 text-sm">
                Batch: {searchParams.get('batch') || test.batchName || 'N/A'} • Year: {test.target_year || test.targetYear || '—'} • Department: {searchParams.get('department') || test.departmentName || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 flex items-center gap-2"
            >
              <RefreshCw size={16} /> Refresh
            </button>
            <div className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
              Total: <span className="text-white font-bold">{students.length}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search students by name, reg no, or email..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAllVisible}
              className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
            >
              <CheckSquare size={16} /> Select Visible
            </button>
            <button
              onClick={clearSelection}
              className="px-4 py-3 rounded-xl bg-slate-800 text-slate-300 text-[11px] font-black uppercase tracking-widest border border-slate-700 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2 block">
              Manually Add Students (no auto-fill)
            </label>
            <div className="flex gap-3">
              <select
                value={manualStudentId}
                onChange={e => setManualStudentId(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select a student…</option>
                {allStudents.map(stu => (
                  <option key={(stu as any).id} value={(stu as any).id}>
                    {(stu.name || stu.username || stu.email)} — {(stu as any).reg_no || (stu as any).regNo || 'No Reg'}
                  </option>
                ))}
              </select>
              <button
                onClick={handleManualAdd}
                className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest"
              >
                Add
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Use this to build the roster; Refresh only reloads from server and won’t auto-add.</p>
          </div>
        </div>

        {/* Available students list (click to add) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 h-full">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-3">
                Available Students
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {availableStudents.length === 0 ? (
                  <p className="text-slate-500 text-[11px]">All available students are already in the roster.</p>
                ) : (
                  availableStudents.map(stu => (
                    <button
                      key={(stu as any).id}
                      onClick={() => {
                        setStudents(prev => [
                          ...prev,
                          {
                            id: String((stu as any).id),
                            name: stu.name || stu.username || stu.email,
                            email: stu.email,
                            regNo: (stu as any).reg_no || (stu as any).regNo,
                            isPresent: false,
                            assignedInvigilatorId: null,
                            assignedInvigilatorName: null,
                          }
                        ]);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-white transition-colors"
                    >
                      <div className="font-bold">{stu.name || stu.username || stu.email}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {(stu as any).reg_no || (stu as any).regNo || 'No Reg'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Single Roster */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-4 md:p-6 min-h-[260px]">
              {filteredStudents.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                  <Users size={40} className="mb-3 opacity-30" />
                  <p className="font-bold uppercase tracking-[0.25em] text-xs">No students in roster</p>
                  <p className="text-[11px] mt-2 text-slate-500">Add students from the list on the left.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <AnimatePresence>
                    {filteredStudents.map((stu, idx) => {
                      const isSelected = selectedIds.has(stu.id);
                      return (
                        <motion.button
                          key={stu.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.01 }}
                          onClick={() => toggleSelect(stu.id)}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_10px_40px_rgba(16,185,129,0.2)]'
                              : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black uppercase ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'}`}>
                                {stu.name?.[0] || '?'}
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm leading-tight">{stu.name}</p>
                                <p className="text-[11px] text-slate-500 font-mono">{stu.regNo || 'No reg no'}</p>
                              </div>
                            </div>
                            {stu.assignedInvigilatorName && (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-widest">
                                {stu.assignedInvigilatorName}
                              </span>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
          {/* Stats */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Current Batch Stats</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-bold">
                <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  Selected <span className="float-right text-white">{selectedCount}</span>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
                  Remaining <span className="float-right text-white">{remaining}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Assign To</p>
              <select
                value={assignTo}
                onChange={e => setAssignTo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              >
                {invigilators.map(inv => (
                  <option key={inv.id} value={inv.id}>{inv.name}</option>
                ))}
              </select>
              <button
                onClick={handleAssign}
                disabled={!assignTo || selectedCount === 0}
                className="w-full mt-3 py-3 rounded-2xl bg-emerald-600 disabled:bg-slate-700 disabled:text-slate-400 text-white font-black uppercase tracking-[0.25em] flex items-center justify-center gap-2 transition-all"
              >
                <UserPlus2 size={16} /> Confirm Allotment
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
              Students are pulled automatically using the test's batch and department. Use Refresh after editing the test or changing batch/department to sync the roster.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExaminationAllotment;
