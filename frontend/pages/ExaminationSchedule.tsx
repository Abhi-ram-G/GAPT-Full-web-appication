import React, { useEffect, useState, useContext, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { User, Course, AcademicBatch } from '../types';
import { Calendar, Clock, Users, Save, ArrowLeft, Plus, Trash2, UserCheck, UserX, RefreshCcw, ShieldCheck, Loader2 } from 'lucide-react';

type Question = { id: string; text: string; marks: number };

const marksBuckets = [1, 2, 3, 5];

const ExaminationSchedule: React.FC = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [test, setTest] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState('60 mins');
  const [startDate, setStartDate] = useState('');
  const [startClock, setStartClock] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endClock, setEndClock] = useState('');
  const [invigilators, setInvigilators] = useState<string[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [questions, setQuestions] = useState<Record<number, Question[]>>({
    1: [],
    2: [],
    3: [],
    5: [],
  });
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string>>(new Set());
  const [assignedMap, setAssignedMap] = useState<Map<string, string>>(new Map()); // studentId -> invigilatorId
  const [invigilatorFilter, setInvigilatorFilter] = useState<string | null>(null);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedAssignInvigilator, setSelectedAssignInvigilator] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mappingLocked, setMappingLocked] = useState(false); // saves current mapping; edit unlocks
  const [activeSection, setActiveSection] = useState<'details' | 'schedule' | 'mapping' | 'questions'>('details');
  const [calculatedMarks, setCalculatedMarks] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!testId) return;
      setIsLoading(true);
      setLoadError(null);
      try {
        // fetch test first to know filters
        const t = await ApiService.getExaminationTest(testId);
        const [users, roster, courseData, batchData] = await Promise.all([
          ApiService.getUsers(),
          ApiService.getExaminationStudentList(testId, {
            batch: t?.batch || (t as any)?.batch_id || (t as any)?.batchId,
            department: t?.department || (t as any)?.department_id || (t as any)?.departmentId,
          }).catch(() => []),
          ApiService.getCurriculum().catch(() => []),
          ApiService.getAcademicBatches().catch(() => []),
        ]);
        setTest(t);
        setTitle(t.title || '');
        setDuration(t.duration || '60 mins');
        setCourses(courseData as Course[]);
        setBatches(batchData as AcademicBatch[]);
        const startIso = (t as any).startTime || (t as any).start_time;
        const endIso = (t as any).endTime || (t as any).end_time;
        const startParts = startIso ? toLocalDateTimeParts(startIso) : { date: '', time: '' };
        const endParts = endIso ? toLocalDateTimeParts(endIso) : { date: '', time: '' };
        setStartDate(startParts.date);
        setStartClock(startParts.time);
        setEndDate(endParts.date);
        setEndClock(endParts.time);
        // derive duration from times if both available
        if (startParts.date && startParts.time && endParts.date && endParts.time) {
          const mins = diffMinutes(startParts, endParts);
          if (mins > 0) setDuration(formatDuration(mins));
        }
        const selectedInvs = ((t as any).invigilators || []).map((x: any) => String(x));
        setInvigilators(selectedInvs);
        if (selectedInvs.length) setSelectedAssignInvigilator(String(selectedInvs[0]));
        const studentUsers = users.filter(u => u.role === 'STUDENT');
        setStaffList(users.filter(u => ['STAFF', 'HOD', 'DEAN'].includes(u.role)));
        setAllStudents(studentUsers);
        const rosterSorted = sortStudents(roster || []);
        if (rosterSorted.length === 0) {
          // Fallback: build roster locally so mapping still works even if backend returns empty
          const fallback = filterStudentsFallback(
            studentUsers,
            t,
            t?.batch || (t as any)?.batch_id || (t as any)?.batchId,
            t?.department || (t as any)?.department_id || (t as any)?.departmentId
          );
          setStudents(sortStudents(fallback));
        } else {
          setStudents(rosterSorted);
        }
        const assignedPairs = rosterSorted
          .filter(s => s.assignedInvigilatorId)
          .map(s => [String(s.id), String(s.assignedInvigilatorId)] as [string, string]);
        setAssignedStudentIds(new Set(assignedPairs.map(([id]) => id)));
        setAssignedMap(new Map(assignedPairs));
        setMappingLocked(false);

        const qdata = (t.questions_data as any) || {};
        const bucketed: Record<number, Question[]> = { 1: [], 2: [], 3: [], 5: [] };
        marksBuckets.forEach(m => {
          const arr = Array.isArray(qdata[m]) ? qdata[m] : [];
          bucketed[m] = arr.map((q: any, idx: number) => ({
            id: q.id || `${m}-${idx}`,
            text: q.text || '',
            marks: m,
            options: q.options || (m === 1 ? [] : undefined),
          }));
        });
        setQuestions(bucketed);
      } catch (err: any) {
        console.error('Failed to load schedule', err);
        setLoadError(err?.message || 'Unable to load schedule');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [testId]);

  const invigilatorNames = useMemo(() => {
    const map = new Map(staffList.map(s => [String(s.id), s.name || s.email]));
    return invigilators.map(id => map.get(id) || id).join(', ');
  }, [invigilators, staffList]);

  const invigilatorMap = useMemo(() => new Map(staffList.map(s => [String(s.id), s.name || s.email])), [staffList]);

  const refreshStudentRoster = useCallback(async () => {
    if (!testId) return;
    setIsRosterLoading(true);
    setRosterError(null);
    try {
      const roster = await ApiService.getExaminationStudentList(testId, {
        batch: test?.batch || (test as any)?.batch_id || (test as any)?.batchId,
        department: test?.department || (test as any)?.department_id || (test as any)?.departmentId,
      });
      if (roster && roster.length > 0) {
        const sorted = sortStudents(roster);
        setStudents(sorted);
        const assignedPairs = sorted
          .filter(s => s.assignedInvigilatorId)
          .map(s => [String(s.id), String(s.assignedInvigilatorId)] as [string, string]);
        setAssignedStudentIds(new Set(assignedPairs.map(([id]) => id)));
        setAssignedMap(new Map(assignedPairs));
      } else {
        // fallback: filter all students by batch/department/year
        const filtered = filterStudentsFallback(
          allStudents,
          test,
          test?.batch || (test as any)?.batch_id || (test as any)?.batchId,
          test?.department || (test as any)?.department_id || (test as any)?.departmentId
        );
        setStudents(sortStudents(filtered));
      }
      if (invigilators.length && !selectedAssignInvigilator) {
        setSelectedAssignInvigilator(invigilators[0]);
      }
      setMappingLocked(false);
    } catch (err: any) {
      setRosterError(err.message || 'Failed to load students');
    } finally {
      setIsRosterLoading(false);
    }
  }, [testId, test, invigilators, selectedAssignInvigilator]);

  const handleAssignInvigilator = async (studentId: string, invigilatorId: string) => {
    if (mappingLocked) return;
    if (!testId || !invigilatorId) return;
    try {
      await ApiService.assignStudentToInvigilator(testId, invigilatorId, [studentId]);
      setStudents(prev => prev.map(s => s.id === studentId ? {
        ...s,
        assignedInvigilatorId: invigilatorId,
        assignedInvigilatorName: invigilatorMap.get(invigilatorId) || s.assignedInvigilatorName
      } : s));
    } catch (err: any) {
      alert(err.message || 'Failed to assign invigilator');
    }
  };

  const toggleAttendance = async (studentId: string, current?: boolean) => {
    if (mappingLocked) return;
    if (!testId) return;
    const next = !current;
    try {
      await ApiService.markTestAttendance({ testId, studentId, isPresent: next });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, isPresent: next } : s));
    } catch (err: any) {
      alert(err.message || 'Failed to update attendance');
    }
  };

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      !q ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.regNo && s.regNo.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  }, [students, studentSearch]);

  const availableStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return allStudents
      .filter(s => {
        const id = String((s as any).id);
        const inRoster = students.some(r => r.id === id);
        const assigned = assignedStudentIds.has(id);
        return !inRoster && !assigned;
      })
      .filter(s =>
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        ((s as any).reg_no && String((s as any).reg_no).toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q))
      );
  }, [allStudents, students, studentSearch, assignedStudentIds]);

  const invigilatorSummary = useMemo(() => {
    const counts = new Map<string, number>();
    assignedMap.forEach(invId => {
      counts.set(invId, (counts.get(invId) || 0) + 1);
    });
    return invigilators.map(id => ({
      id,
      name: invigilatorMap.get(id) || id,
      count: counts.get(id) || 0,
    }));
  }, [assignedMap, invigilators, invigilatorMap]);

  const studentStats = useMemo(() => {
    const total = students.length;
    const assigned = students.filter(s => s.assignedInvigilatorId).length;
    return {
      total,
      assigned,
      unassigned: total - assigned,
      selected: selectedStudents.size,
      remaining: Math.max(total - selectedStudents.size, 0),
    };
  }, [students, selectedStudents]);

  const toggleInvigilator = (id: string) => {
    setInvigilators(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectStudent = (id: string) => {
    if (mappingLocked) return;
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    if (mappingLocked) return;
    setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
  };

  const bulkAssignSelected = async () => {
    if (mappingLocked) return;
    if (!testId) return;
    const inv = selectedAssignInvigilator || invigilators[0];
    if (!inv || selectedStudents.size === 0) return;
    try {
      await ApiService.assignStudentToInvigilator(testId, inv, Array.from(selectedStudents));
      // Optimistically update roster with chosen invigilator name
      setStudents(prev => prev.map(s => selectedStudents.has(s.id) ? {
        ...s,
        assignedInvigilatorId: inv,
        assignedInvigilatorName: invigilatorMap.get(inv) || inv
      } : s));
      setAssignedStudentIds(prev => {
        const next = new Set(prev);
        selectedStudents.forEach(id => next.add(id));
        return next;
      });
      setAssignedMap(prev => {
        const next = new Map(prev);
        selectedStudents.forEach(id => next.set(id, inv));
        return next;
      });
      setSelectedStudents(new Set());
      await refreshStudentRoster();
    } catch (err: any) {
      alert(err.message || 'Failed to assign selected students');
    }
  };

  const handleRemoveAssignment = async (studentId: string) => {
    if (mappingLocked) return;
    if (!testId) return;
    try {
      await ApiService.assignStudentToInvigilator(testId, null as any, [studentId]);
      setStudents(prev => prev.map(s => s.id === studentId ? {
        ...s,
        assignedInvigilatorId: null,
        assignedInvigilatorName: null,
      } : s));
      setAssignedStudentIds(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
      setAssignedMap(prev => {
        const next = new Map(prev);
        next.delete(studentId);
        return next;
      });
    } catch (err: any) {
      alert(err.message || 'Failed to remove assignment');
    }
  };

  // Section refs for quick jump navigation
  const sectionRefs = {
    details: useRef<HTMLDivElement>(null),
    schedule: useRef<HTMLDivElement>(null),
    mapping: useRef<HTMLDivElement>(null),
    questions: useRef<HTMLDivElement>(null),
  };

  const sectionOrder: Array<'details' | 'schedule' | 'mapping' | 'questions'> = ['details', 'schedule', 'mapping', 'questions'];

  const goNext = () => {
    const idx = sectionOrder.indexOf(activeSection);
    if (idx < sectionOrder.length - 1) {
      scrollToSection(sectionOrder[idx + 1]);
    }
  };

  const goPrev = () => {
    const idx = sectionOrder.indexOf(activeSection);
    if (idx > 0) {
      scrollToSection(sectionOrder[idx - 1]);
    }
  };

  const scrollToSection = (key: keyof typeof sectionRefs) => {
    setActiveSection(key);
    const ref = sectionRefs[key].current;
    if (ref) {
      ref.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // auto recompute duration whenever time inputs change
  useEffect(() => {
    if (!startDate || !startClock || !endDate || !endClock) return;
    const mins = diffMinutes({ date: startDate, time: startClock }, { date: endDate, time: endClock });
    if (mins > 0) setDuration(formatDuration(mins));
  }, [startDate, startClock, endDate, endClock]);

  // calculate total marks from questions
  useEffect(() => {
    const total = marksBuckets.reduce((sum, m) => sum + (questions[m]?.length || 0) * m, 0);
    setCalculatedMarks(total);
  }, [questions]);

  const canAddMore = (marks: number) => {
    const target = test.total_marks ?? test.totalMarks ?? 0;
    if (!target) return true; // no target set, allow
    const futureTotal = calculatedMarks + marks;
    return futureTotal <= target;
  };

  const addQuestion = (marks: number) => {
    if (!canAddMore(marks)) {
      alert('Total marks reached. Remove a question or increase test total to add more.');
      return;
    }
    setQuestions(prev => ({
      ...prev,
      [marks]: [...prev[marks], { id: `${marks}-${Date.now()}`, text: '', marks, options: marks === 1 ? [''] : undefined }],
    }));
  };

  const updateQuestion = (marks: number, id: string, text: string) => {
    setQuestions(prev => ({
      ...prev,
      [marks]: prev[marks].map(q => q.id === id ? { ...q, text } : q),
    }));
  };

  const removeQuestion = (marks: number, id: string) => {
    setQuestions(prev => ({
      ...prev,
      [marks]: prev[marks].filter(q => q.id !== id),
    }));
  };

  const addOption = (questionId: string) => {
    setQuestions(prev => {
      const next = { ...prev };
      marksBuckets.forEach(m => {
        next[m] = next[m].map(q => q.id === questionId
          ? { ...q, options: [...(q as any).options || [], ''] }
          : q);
      });
      return next;
    });
  };

  const updateOption = (questionId: string, idx: number, val: string) => {
    setQuestions(prev => {
      const next = { ...prev };
      marksBuckets.forEach(m => {
        next[m] = next[m].map(q => {
          if (q.id !== questionId) return q;
          const opts = [...((q as any).options || [])];
          opts[idx] = val;
          return { ...q, options: opts };
        });
      });
      return next;
    });
  };

  const removeOption = (questionId: string, idx: number) => {
    setQuestions(prev => {
      const next = { ...prev };
      marksBuckets.forEach(m => {
        next[m] = next[m].map(q => {
          if (q.id !== questionId) return q;
          const opts = [...((q as any).options || [])];
      opts.splice(idx, 1);
      return { ...q, options: opts };
    });
  });
  return next;
  });
  };

  const handleSave = async () => {
    if (!testId) return;
    if (!title.trim()) { alert('Title required'); return; }
    if (!startDate || !startClock || !endDate || !endClock) { alert('Start and End date/time required'); return; }
    const targetMarks = test.total_marks ?? test.totalMarks ?? 0;
    if (targetMarks && calculatedMarks !== targetMarks) {
      alert(`Total marks mismatch. Test is set to ${targetMarks}, but questions add up to ${calculatedMarks}. Please add or remove questions to match the total.`);
      return;
    }
    setIsSaving(true);
    try {
      const questions_data: any = {};
      marksBuckets.forEach(m => {
        questions_data[m] = questions[m].map(q => ({ id: q.id, text: q.text, marks: m, options: (q as any).options }));
      });

      await ApiService.updateExaminationTest(testId, {
        title,
        duration,
        questions_data,
      });

      await ApiService.scheduleExaminationTest(testId, {
        startTime: toIsoFromParts(startDate, startClock),
        endTime: toIsoFromParts(endDate, endClock),
        invigilators,
      });

      alert('Schedule updated');
      navigate('/examination-portal');
    } catch (err: any) {
      alert(err.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (loadError || !test) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="text-rose-400 text-lg font-bold">Failed to open schedule</div>
        <div className="text-slate-400 text-sm max-w-md">{loadError || 'Test not found or network error.'}</div>
        <button
          onClick={() => navigate('/examination-portal')}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-widest transition-all"
        >
          Back to portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Schedule & Edit</div>
            <h1 className="text-2xl font-black tracking-tight">{test.title}</h1>
          </div>
        </div>

        {/* Section pills */}
        <div className="bg-gradient-to-b from-slate-200/40 to-transparent dark:from-white/5 rounded-[2rem] px-3 py-3 shadow-inner border border-border-subtle">
          <div className="flex justify-between flex-wrap gap-2 md:gap-4" role="tablist" aria-label="Schedule sections">
            {[
              { key: 'details', label: 'Test Details' },
              { key: 'schedule', label: 'Time & Invigilators' },
              { key: 'mapping', label: 'Student Mapping' },
              { key: 'questions', label: 'Question Paper' },
            ].map(tab => (
              <button
                key={tab.key}
                role="tab"
                aria-selected={activeSection === tab.key}
                onClick={() => scrollToSection(tab.key as any)}
                className={`px-6 md:px-7 py-2 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all ${
                  activeSection === tab.key
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-transparent text-slate-500 hover:text-emerald-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 1: Test Details */}
        {activeSection === 'details' && (
        <div ref={sectionRefs.details} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
            <ShieldCheck size={16} className="text-emerald-400" /> Test Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assessment Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Duration (auto)</label>
              <input
                value={duration}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Test Type</label>
              <input
                value={(test.test_type || test.testType || 'Unit Test').replace(/_/g, ' ')}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Marks</label>
              <input
                value={test.total_marks ?? test.totalMarks ?? 'N/A'}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Year</label>
              <input
                value={test.target_year || test.targetYear || '—'}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
              <input
                value={resolveDepartment(test, courses)}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</label>
              <input
                value={resolveSubjectName(test, courses)}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Batch</label>
              <input
                value={resolveBatch(test, batches)}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Year</label>
              <input
                value={test.target_year || test.targetYear || 'N/A'}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Semester</label>
              <input
                value={resolveSemester(test, courses)}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject Code</label>
              <input
                value={resolveSubjectCode(test, courses)}
                readOnly
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={goNext} className="px-5 py-2 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
              Next: Time & Invigilators
            </button>
          </div>
        </div>
        )}

        {/* Section 2: Schedule & Invigilators */}
        {activeSection === 'schedule' && (
        <div ref={sectionRefs.schedule} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
            <Clock size={16} /> Time & Invigilators
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start Date & Time</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="time"
                  value={startClock}
                  onChange={e => setStartClock(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">End Date & Time</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="time"
                  value={endClock}
                  onChange={e => setEndClock(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Invigilators</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {staffList.map(s => {
                const selected = invigilators.includes(String(s.id));
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleInvigilator(String(s.id))}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selected
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {s.name || s.email}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-slate-400">Selected: {invigilatorNames || 'None'}</div>
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <button onClick={goPrev} className="px-5 py-2 rounded-full bg-slate-800 text-slate-200 text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
              Previous
            </button>
            <button onClick={goNext} className="px-5 py-2 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
              Next: Student Mapping
            </button>
          </div>
        </div>
        )}

        {/* Section 3: Student ↔ Invigilator Mapping + Attendance */}
        {activeSection === 'mapping' && (
        <div ref={sectionRefs.mapping} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-400 text-sm font-semibold">
              <Users size={16} /> Assign Students to Invigilators & Mark Attendance
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name or reg no..."
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 w-full md:w-96"
              />
              <button
                onClick={() => { selectAllVisible(); }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-black uppercase tracking-widest transition-all"
                disabled={filteredStudents.length === 0}
              >
                Select All Visible
              </button>
              <button
                onClick={refreshStudentRoster}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-black uppercase tracking-widest transition-all"
              >
                <RefreshCcw size={14} /> Refresh
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">Batch: {resolveBatch(test, batches)}</span>
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">Year: {test.target_year || test.targetYear || 'N/A'}</span>
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800">Department: {resolveDepartment(test, courses)}</span>
          </div>
          {invigilatorSummary.length > 0 && (
            <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              {invigilatorSummary.map(inv => (
                <span key={inv.id} className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 flex items-center gap-2">
                  {inv.name}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-200">{inv.count}</span>
                </span>
              ))}
            </div>
          )}

          {rosterError && (
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-sm">
              {rosterError}
            </div>
          )}

          {!invigilators.length && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-dashed border-slate-700 text-slate-500 text-sm">
              Select at least one invigilator to enable student mapping.
            </div>
          )}

          {isRosterLoading ? (
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 size={18} className="animate-spin" /> Loading roster...
            </div>
          ) : (
            invigilators.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                    <span>Available Students</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300">
                      {availableStudents.length}
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                    {availableStudents.length === 0 ? (
                      <div className="text-[11px] text-slate-500">All students are already in roster.</div>
                    ) : (
                      availableStudents.map((s, idx) => (
                        <button
                          key={(s as any).id || idx}
                          onClick={() => setStudents(prev => sortStudents([...prev, {
                            id: String((s as any).id),
                            name: s.name || s.email,
                            email: s.email,
                            regNo: (s as any).reg_no || (s as any).regNo,
                            isPresent: false,
                          }]))}
                          className="w-full text-left px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm text-white transition-colors"
                        >
                          <div className="font-bold">{s.name || s.email}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{(s as any).reg_no || (s as any).regNo || 'No Reg'}</div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredStudents.map((s, idx) => {
                      const present = Boolean(s.isPresent);
                      const assigned = Boolean(s.assignedInvigilatorId);
                      const selected = selectedStudents.has(s.id);
                      const previewInvigilator = selectedStudents.has(s.id) && selectedAssignInvigilator
                        ? (invigilatorMap.get(selectedAssignInvigilator) || selectedAssignInvigilator)
                        : (s.assignedInvigilatorName || invigilatorMap.get(String(s.assignedInvigilatorId)));
                      return (
                        <div
                          key={s.id || idx}
                          onClick={() => toggleSelectStudent(s.id)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            selected ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-slate-800 bg-slate-950'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-white font-black uppercase tracking-tight">{s.name || s.email}</p>
                              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                {s.regNo || 'N/A'}
                              </p>
                             {previewInvigilator && (
                                <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-black px-2 py-1 rounded-lg bg-slate-800 text-slate-200">
                                  <ShieldCheck size={12} className="text-emerald-400" />
                                  {previewInvigilator}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveAssignment(s.id);
                                    }}
                                    className="ml-2 text-[10px] text-rose-400 hover:text-rose-300 underline"
                                    disabled={mappingLocked}
                                  >
                                    Remove
                                  </button>
                                </span>
                              )}
                            </div>
                            <div className={`w-5 h-5 rounded-full border ${selected ? 'border-emerald-400 bg-emerald-500/60' : 'border-slate-600 bg-slate-800'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredStudents.length === 0 && (
                    <div className="p-8 rounded-2xl bg-slate-900 border border-dashed border-slate-800 text-center text-slate-500 font-bold uppercase tracking-widest mt-4">
                      No students in roster
                    </div>
                  )}
                </div>

                <div className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500">Current Batch Stats</div>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <span>Selected</span>
                    <span className="text-emerald-400">{studentStats.selected}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-slate-400">
                    <span>Remaining</span>
                    <span className="text-slate-200">{studentStats.remaining}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assign to</label>
                    <select
                      value={selectedAssignInvigilator}
                      onChange={(e) => setSelectedAssignInvigilator(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      disabled={mappingLocked}
                    >
                      <option value="">Select Invigilator</option>
                      {invigilators.map(id => (
                        <option key={id} value={id}>{invigilatorMap.get(id) || id}</option>
                      ))}
                    </select>
                    <button
                      onClick={bulkAssignSelected}
                      disabled={mappingLocked || !selectedAssignInvigilator || selectedStudents.size === 0}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        mappingLocked || !selectedAssignInvigilator || selectedStudents.size === 0
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      Confirm Assigning
                    </button>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setMappingLocked(true)}
                        disabled={mappingLocked}
                        className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                          mappingLocked
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-600 text-white hover:bg-emerald-500'
                        }`}
                      >
                        Save Mapping
                      </button>
                      <button
                        onClick={() => setMappingLocked(false)}
                        className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all bg-slate-800 text-slate-200 hover:bg-slate-700"
                      >
                        Edit Mapping
                      </button>
                    </div>
                    {mappingLocked && (
                      <p className="text-[11px] text-emerald-400 font-semibold">
                        Mapping saved. Click “Edit Mapping” to make changes.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          )}

          <div className="flex justify-between gap-3 pt-4">
            <button onClick={goPrev} className="px-5 py-2 rounded-full bg-slate-800 text-slate-200 text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
              Previous
            </button>
            <button onClick={goNext} className="px-5 py-2 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all">
              Next: Question Paper
            </button>
          </div>
        </div>
        )}

        {/* Section 4: Question Paper Builder */}
        {activeSection === 'questions' && (
        <div ref={sectionRefs.questions} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Users size={16} /> Questions by section
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-slate-400 font-bold uppercase tracking-widest">
            <span>Calculated Total: <span className="text-emerald-400">{calculatedMarks}</span></span>
            <span>Test Total: <span className={calculatedMarks === (test.total_marks ?? test.totalMarks ?? 0) ? 'text-emerald-400' : 'text-rose-400'}>
              {test.total_marks ?? test.totalMarks ?? 'N/A'}
            </span></span>
            {calculatedMarks !== (test.total_marks ?? test.totalMarks ?? 0) && (
              <span className="text-amber-400">Add questions to reach the total mark.</span>
            )}
          </div>

          {/* Render buckets one by one vertically */}
          <div className="space-y-4">
            {marksBuckets.map(m => (
              <div key={m} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white">{m} Mark Questions</div>
                  <div className="flex items-center gap-2">
                    {m === 1 && (
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Type: Single / MCQ allowed
                      </div>
                    )}
                    <button
                      onClick={() => addQuestion(m)}
                      disabled={!canAddMore(m)}
                      className={`px-3 py-1 rounded-lg text-white text-xs font-black uppercase tracking-widest flex items-center gap-1 ${
                        canAddMore(m)
                          ? 'bg-emerald-600 hover:bg-emerald-500'
                          : 'bg-slate-700 cursor-not-allowed'
                      }`}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {questions[m].length === 0 && (
                    <div className="text-xs text-slate-500">No questions yet.</div>
                  )}
                  {questions[m].map(q => (
                    <div key={q.id} className="space-y-3 bg-slate-900 border border-slate-800 rounded-xl p-3">
                      <textarea
                        value={q.text}
                        onChange={e => updateQuestion(m, q.id, e.target.value)}
                        rows={m === 1 ? 2 : 3}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                        placeholder={`Question (${m} mark)`}
                      />
                      {m === 1 && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {(q as any).options?.length
                              ? (q as any).options.map((opt: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={e => updateOption(q.id, idx, e.target.value)}
                                      placeholder={`Option ${idx + 1}`}
                                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                                    />
                                    <button
                                      onClick={() => removeOption(q.id, idx)}
                                      className="p-2 text-slate-500 hover:text-rose-400"
                                      title="Remove option"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))
                              : null}
                          </div>
                          <button
                            onClick={() => addOption(q.id)}
                            className="px-3 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeQuestion(m, q.id)}
                          className="p-2 text-slate-500 hover:text-rose-400"
                          title="Remove question"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <button onClick={goPrev} className="px-5 py-2 rounded-full bg-slate-800 text-slate-200 text-[11px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">
              Previous
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Save size={14} /> {isSaving ? 'Saving...' : 'Update Scheduling'}
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

function toLocalDateTimeParts(iso: string) {
  try {
    const d = new Date(iso);
    const off = d.getTimezoneOffset() * 60000;
    const localIso = new Date(d.getTime() - off).toISOString();
    return {
      date: localIso.slice(0, 10),
      time: localIso.slice(11, 16),
    };
  } catch {
    return { date: '', time: '' };
  }
}

function toIsoFromParts(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

function diffMinutes(
  start: { date: string, time: string },
  end: { date: string, time: string }
) {
  try {
    const s = new Date(`${start.date}T${start.time}`);
    const e = new Date(`${end.date}T${end.time}`);
    return Math.round((e.getTime() - s.getTime()) / 60000);
  } catch {
    return 0;
  }
}

function formatDuration(mins: number) {
  if (mins <= 0 || !Number.isFinite(mins)) return '—';
  if (mins < 60) return `${mins} mins`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${rem} mins`;
}

function resolveDepartment(test: any, courses: Course[]) {
  const deptId = test.department || test.department_id || test.departmentId;
  const byId = courses.find(c => String(c.id) === String(deptId));
  return byId?.name || test.departmentName || test.department || 'N/A';
}

function resolveSubject(test: any, courses: Course[]) {
  const deptId = test.department || test.department_id || test.departmentId;
  const subjId = test.subject_model || test.subject_model_id || test.subjectId;
  const course = courses.find(c => String(c.id) === String(deptId));
  if (!course) return null;
  return course.subjects?.find((s: any) => String(s.id) === String(subjId));
}

function resolveSubjectName(test: any, courses: Course[]) {
  const subj = resolveSubject(test, courses);
  return subj?.name || test.subjectName || test.subject || 'N/A';
}

function resolveSubjectCode(test: any, courses: Course[]) {
  const subj = resolveSubject(test, courses);
  return subj?.code || test.subject_code || 'N/A';
}

function resolveSemester(test: any, courses: Course[]) {
  const subj = resolveSubject(test, courses);
  return subj?.semester || test.semester || 'N/A';
}

function resolveBatch(test: any, batches: AcademicBatch[]) {
  const batchId = test.batch || test.batch_id || test.batchId;
  const b = batches.find(bt => String(bt.id) === String(batchId));
  return b?.name || test.batchName || 'N/A';
}

function sortStudents(list: any[]) {
  return [...list].sort((a, b) => {
    const ay = (a.studyYear || a.study_year || '').toString().toLowerCase();
    const by = (b.studyYear || b.study_year || '').toString().toLowerCase();
    if (ay !== by) return ay.localeCompare(by);
    const ad = (a.department || '').toString().toLowerCase();
    const bd = (b.department || '').toString().toLowerCase();
    if (ad !== bd) return ad.localeCompare(bd);
    const an = (a.name || a.email || '').toString().toLowerCase();
    const bn = (b.name || b.email || '').toString().toLowerCase();
    return an.localeCompare(bn);
  });
}

function normalizeYear(val: any) {
  if (!val && val !== 0) return null;
  const str = String(val);
  const digits = str.match(/\d+/);
  return digits ? digits[0] : str;
}

function filterStudentsFallback(users: User[], test: any, batch?: any, dept?: any) {
  const targetBatch = batch ? String(batch).toLowerCase() : '';
  const targetDept = dept ? String(dept).toLowerCase() : '';
  const targetYear = normalizeYear(test?.target_year || test?.targetYear);
  return users
    .filter(u => u.role === 'STUDENT')
    .filter(u => {
      const ubatch = String((u as any).batch || '').toLowerCase();
      const udept = String((u as any).course || u.department || '').toLowerCase();
      const uyear = normalizeYear((u as any).studyYear || (u as any).study_year);
      const batchOk = !targetBatch || ubatch === targetBatch || !ubatch;
      const deptOk = !targetDept || udept === targetDept || (u.department || '').toLowerCase().includes(targetDept);
      const yearOk = !targetYear || !uyear || uyear === targetYear;
      return batchOk && deptOk && yearOk;
    })
    .map(u => ({
      id: String((u as any).id),
      name: u.name || u.email,
      email: u.email,
      regNo: (u as any).reg_no || (u as any).regNo,
      isPresent: false,
    }));
}

export default ExaminationSchedule;
