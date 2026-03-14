import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { User, AcademicBatch, Course, Subject } from '../types';
import { BookOpen, Clock, Users, AlertCircle, Edit3, Calendar, X, Plus } from 'lucide-react';

type Test = {
  id: string;
  title: string;
  status?: string;
  testType?: string;
  batch?: string | number;
  department?: string | number;
  subjectId?: string;
  subject?: string;
  subject_model?: string;
  invigilators?: string[];
  targetYear?: string;
  batchName?: string;
  departmentName?: string;
  subjectName?: string;
  duration?: string;
  startTime?: string;
  endTime?: string;
  invigilatorNames?: string[];
  createdAt?: string;
};

type FormState = {
  title: string;
  testType: string;
  batchId: string;
  departmentId: string;
  subjectId: string;
  staffId: string;
  totalMarks: number;
  duration: string;
  targetYear: string;
};

const ExaminationPortal: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState<FormState>({
    title: '',
    testType: 'UNIT_TEST',
    batchId: '',
    departmentId: '',
    subjectId: '',
    staffId: '',
    totalMarks: 25,
    duration: '60 mins',
    targetYear: '',
  });
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [mappedTestIds, setMappedTestIds] = useState<Set<string>>(new Set());
  const [timeLeftMs, setTimeLeftMs] = useState<number | null>(null);
  const timerRef = React.useRef<number | null>(null);
  const [visibilityWarn, setVisibilityWarn] = useState(false);
  const [evaluationTest, setEvaluationTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [marksDraft, setMarksDraft] = useState<Record<string, number>>({});
  const [isSavingEval, setIsSavingEval] = useState(false);
  const [viewShareOpen, setViewShareOpen] = useState(false);
  const [viewShareStaffIds, setViewShareStaffIds] = useState<string[]>([]);
  const [viewerMap, setViewerMap] = useState<Record<string, string[]>>(() => {
    try {
      const raw = localStorage.getItem('eval_viewers');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const submissionDetailRef = useRef<HTMLDivElement>(null);

  const toggleViewer = (id: string) => {
    setViewShareStaffIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const setAllViewers = (enable: boolean) => {
    if (!staffList.length) return;
    const allIds = staffList.map(s => String(s.id));
    setViewShareStaffIds(enable ? allIds : []);
  };

  const saveViewers = (testId: string) => {
    const updated = { ...viewerMap, [testId]: viewShareStaffIds };
    setViewerMap(updated);
    localStorage.setItem('eval_viewers', JSON.stringify(updated));
    setViewShareOpen(false);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [data, batchData, courseData, userData] = await Promise.all([
          ApiService.getExaminationTests(),
          ApiService.getAcademicBatches(),
          ApiService.getCurriculum(),
          ApiService.getUsers(),
        ]);
        const allUsers = userData as User[];
        const decorated = decorateTests(data as Test[], batchData as any[], courseData as any[], allUsers);
        setTests(decorated);
        setBatches(batchData as AcademicBatch[]);
        setCourses(courseData as Course[]);
        setStaffList(userData.filter(u => ['STAFF', 'HOD', 'DEAN'].includes(u.role)));
        setAllUsers(userData as User[]);

        // If student, prefetch any explicit mappings from attendance rows
        if ((userData as any) && user) {
          if (user.role === 'STUDENT') {
            try {
              const att = await ApiService.getStudentTestAttendance(String(user.id));
              const ids = new Set<string>();
              (att || []).forEach((a: any) => {
                if (a.test) ids.add(String(a.test));
                if (a.test_id) ids.add(String(a.test_id));
              });
              setMappedTestIds(ids);
            } catch (e) {
              // ignore mapping fetch errors
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load assessments');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const normalizeYear = (val?: string | number | null) => {
    if (val === undefined || val === null) return null;
    const str = String(val);
    const digits = str.match(/\d+/);
    return digits ? digits[0] : str;
  };

  const visibleTests = useMemo(() => {
    if (!user) return tests;

    // Invigilators: show only tests where user is assigned as invigilator
    if (user.role === 'STAFF') {
      return tests.filter(t => {
        const invIds: string[] = ((t as any).invigilators || []).map((x: any) => String(x));
        return invIds.includes(String(user.id)) || String((t as any).staff) === String(user.id);
      });
    }

    if (user.role === 'STUDENT') {
      const deptText = (user.department || '').toLowerCase();
      const batchId = (user as any).batch;
      const courseId = (user as any).course;
      const studyYear = normalizeYear((user as any).studyYear || (user as any).study_year);

      return tests.filter(t => {
        const tDeptName = (t.departmentName || '').toLowerCase();
        const tDeptId = (t as any).department;
        const tBatchId = (t as any).batch;
        const tYearRaw = t.targetYear || (t as any).target_year;
        const tYear = normalizeYear(tYearRaw);

        const deptMatch =
          (!deptText && !courseId) ||
          (tDeptName && deptText && tDeptName.includes(deptText)) ||
          (!!tDeptId && courseId && String(tDeptId) === String(courseId));

        const batchMatch =
          !batchId ||
          (!!tBatchId && String(tBatchId) === String(batchId)) ||
          (!!t.batchName && String(t.batchName).toLowerCase().includes(String(batchId).toLowerCase()));

        const yearMatch =
          !studyYear ||
          !tYear ||
          tYear === studyYear ||
          tYear === `Year ${studyYear}` ||
          tYear === `YEAR ${studyYear}`;

        const mapped = mappedTestIds.has(String(t.id));

        return mapped || (deptMatch && batchMatch && yearMatch);
      });
    }

    return tests;
  }, [tests, user]);

  const extractQuestions = (t: Test) => {
    const qd = (t as any).questions_data || (t as any).questionsData || {};
    const flattened: Array<{ id: string; text: string; marks?: number; options?: string[] }> = [];
    Object.keys(qd || {}).forEach(bucket => {
      const arr = qd[bucket];
      if (Array.isArray(arr)) {
        arr.forEach((q: any, idx: number) => flattened.push({
          id: q.id || `${bucket}-${idx}`,
          text: q.text || `Question ${flattened.length + 1}`,
          marks: q.marks ?? (Number(bucket) || undefined),
          options: Array.isArray(q.options) ? q.options : undefined,
        }));
      }
    });
    return flattened;
  };

  const handleOpenTest = async (test: Test) => {
    if (!user) return;
    setAttendanceError(null);
    try {
      // Enforce exam window for students
      const now = new Date().getTime();
      const startTs = test.startTime ? new Date(test.startTime).getTime() : null;
      const endTs = test.endTime ? new Date(test.endTime).getTime() : null;
      if (startTs && now < startTs) {
        setAttendanceError('This test is not open yet.');
        return;
      }
      if (endTs && now > endTs) {
        setAttendanceError('This test window has closed.');
        return;
      }

      const present = await ApiService.getTestAttendanceStatus(String(test.id), String(user.id));
      if (!present) {
        setAttendanceError('You have not been marked present by the invigilator for this test.');
        return;
      }
      const qs = extractQuestions(test);
      const initAnswers: Record<string, string> = {};
      qs.forEach(q => { initAnswers[q.id] = ''; });
      setAnswerMap(initAnswers);
      // set countdown
      const fallbackDurationMs = 60 * 60 * 1000;
      const targetEnd = endTs || (now + fallbackDurationMs);
      setTimeLeftMs(Math.max(0, targetEnd - now));
      setVisibilityWarn(false);
      // request fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setActiveTest(test);
    } catch (err: any) {
      setAttendanceError(err.message || 'Unable to start test. Try again.');
    }
  };

  const handleSubmitAnswers = async () => {
    if (!activeTest) return;
    setIsSubmitting(true);
    try {
      await ApiService.submitTestAnswers(String(activeTest.id), answerMap);
      setActiveTest(null);
      setAnswerMap({});
      setTimeLeftMs(null);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      alert('Responses submitted. Good luck!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Countdown timer and cleanup
  useEffect(() => {
    if (!activeTest || timeLeftMs === null) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setTimeLeftMs(prev => {
        if (prev === null) return null;
        const next = prev - 1000;
        if (next <= 0) {
          window.clearInterval(timerRef.current as number);
          handleSubmitAnswers();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTest, timeLeftMs]);

  // Visibility anti-switch notice
  useEffect(() => {
    if (!activeTest) return;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        setVisibilityWarn(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [activeTest]);

  const formatCountdown = (ms: number | null) => {
    if (ms === null) return '--:--:--';
    const total = Math.max(0, ms);
    const h = Math.floor(total / 3600000);
    const m = Math.floor((total % 3600000) / 60000);
    const s = Math.floor((total % 60000) / 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <AlertCircle className="text-rose-500 mb-3" size={32} />
        <p className="font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-white p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Assessment Portal</h1>
            <p className="text-slate-400">Manage tests, allot students, and monitor attendance.</p>
          </div>
          {user?.role !== 'STUDENT' && (
            <div className="flex justify-end">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Plus size={14} />
                Create Test
              </button>
            </div>
          )}

          {visibleTests.length === 0 && (
            <div className="p-6 bg-slate-900/70 border border-slate-800 rounded-2xl text-slate-400">
              No assessments created yet.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visibleTests.map((test) => (
              <div
                key={test.id}
                className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col gap-4 shadow-xl"
              >
              <div className="flex items-start justify-between">
                <div className="flex gap-2 text-[10px] uppercase font-black tracking-widest">
                  <span className={`px-3 py-1 rounded-lg border ${test.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                    {test.status || 'UPCOMING'}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                    {test.testType?.replace('_', ' ') || 'UNIT TEST'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {test.targetYear && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
                      Year {test.targetYear}
                    </span>
                  )}
                  <button
                    onClick={async () => {
                      if (!window.confirm('Delete this test?')) return;
                      try {
                        await ApiService.deleteExaminationTest(test.id);
                        const refreshed = await ApiService.getExaminationTests();
                        setTests(decorateTests(refreshed as Test[], batches, courses, staffList));
                      } catch (err: any) {
                        alert(err.message || 'Failed to delete test');
                      }
                    }}
                    className="p-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white"
                    title="Delete test"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6l-1 14H6L5 6"></path>
                      <path d="M10 11v6"></path>
                      <path d="M14 11v6"></path>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                    </svg>
                  </button>
                </div>
              </div>

                <div>
                  <h2 className="text-2xl font-black text-emerald-400 tracking-tight">{test.title}</h2>
                  <p className="text-slate-400 text-sm mt-1">No description provided.</p>
                  <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                    {(test.batchName || 'Batch N/A')} • {(test.departmentName || 'Department N/A')} • {(test.subjectName || 'Subject')}
                  </p>
                </div>

                <div className="flex gap-6 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-emerald-500" />
                    <span>{test.subjectName || 'Subject'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-emerald-500" />
                    <span>{test.duration || '60 mins'}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] uppercase font-black text-slate-500 tracking-widest">
                    <div className="flex items-center gap-2">
                      <Clock size={14} /> Exam Window
                    </div>
                    <Edit3 size={14} className="text-slate-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-white font-bold">
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase tracking-widest text-[10px]">Start</span>
                      <span>{test.startTime ? formatDateTime(test.startTime) : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 uppercase tracking-widest text-[10px]">End</span>
                      <span>{test.endTime ? formatDateTime(test.endTime) : '—'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-slate-500 pt-1">
                    <span>Invigilators</span>
                    <span className="text-emerald-400">{(test.invigilatorNames && test.invigilatorNames.join(', ')) || 'Not assigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-2 text-slate-500 text-[11px] font-bold uppercase">
                    <Calendar size={14} /> {formatDateOnly(test.createdAt)}
                  </div>
                  <div className="flex gap-2">
                    {user?.role === 'STUDENT' && (
                      <button
                        onClick={() => handleOpenTest(test)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        Take Test
                      </button>
                    )}
                    {user?.role === 'STAFF' && (
                      <button
                        onClick={() => navigate(`/examination/attendance/${test.id}`)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        Monitor / Attendance
                      </button>
                    )}
                    {user?.role !== 'STUDENT' && user?.role !== 'STAFF' && (
                      <>
                        <button
                          onClick={() => {
                            const params = new URLSearchParams();
                            if (test.batchName) params.set('batch', test.batchName);
                            if (test.departmentName) params.set('department', test.departmentName);
                            navigate(`/examination/schedule/${test.id}?${params.toString()}`);
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                          Schedule
                        </button>
                        <button
                          onClick={async () => {
                            setEvaluationTest(test);
                            setIsLoadingSubs(true);
                            setSelectedSubmissionId(null);
                            setMarksDraft({});
                            try {
                              const subs = await ApiService.getTestSubmissions(String(test.id));
                              setSubmissions(subs || []);
                              // preload first submission marks if available
                              if (subs && subs.length > 0) {
                                const ms = subs[0].marks_assigned || subs[0].marksAssigned || {};
                                const normalized: Record<string, number> = {};
                                Object.keys(ms || {}).forEach(k => normalized[k] = Number(ms[k]) || 0);
                                setMarksDraft(normalized);
                                setSelectedSubmissionId(String(subs[0].id || 0));
                              }
                            } catch (e) {
                              alert('Failed to load submissions');
                              setEvaluationTest(null);
                            } finally {
                              setIsLoadingSubs(false);
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                          Evaluation
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Test Modal */}
      {isCreateModalOpen && user?.role !== 'STUDENT' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">1 • Academic Mapping</div>
                <h2 className="text-2xl font-black text-white">Create Assessment</h2>
                <p className="text-slate-400 text-sm">Configure test type, cohort and staff assignments.</p>
              </div>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Assessment Title</label>
                  <input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Unit Test 1: Machine Learning"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Test Type</label>
                  <select
                    value={formData.testType}
                    onChange={e => setFormData({ ...formData, testType: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="UNIT_TEST">Unit Test</option>
                    <option value="INTERNAL_I">Internal Test I</option>
                    <option value="INTERNAL_II">Internal Test II</option>
                    <option value="SEMESTER">Semester Exam</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Academic Batch (Cohort)</label>
                  <select
                    value={formData.batchId}
                    onChange={e => {
                      const batchId = e.target.value;
                      const batch = batches.find(b => String(b.id) === String(batchId));
                      const today = new Date();
                      const currentYear = today.getFullYear();
                      const currentMonth = today.getMonth() + 1; // 1-12
                      const startYr = (batch as any).startYear || (batch as any).start_year || currentYear;
                      const maxYears = Math.max(1, ((batch as any).endYear || (batch as any).end_year || startYr) - startYr);
                      let academicYear = currentYear - startYr;
                      if (currentMonth >= 6) academicYear += 1; // roll over after May
                      academicYear = Math.min(Math.max(1, academicYear), maxYears);
                      const computedYear = academicYear.toString();
                      setFormData({ ...formData, batchId, departmentId: '', subjectId: '', targetYear: computedYear });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    <option value="">Select Batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({(b as any).startYear || (b as any).start_year}-{(b as any).endYear || (b as any).end_year})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Study Year (Calculated)</label>
                  <input
                    readOnly
                    value={formData.targetYear ? `Year ${formData.targetYear}` : 'Select a batch first'}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-emerald-400 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value, subjectId: '' })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    disabled={!formData.batchId}
                  >
                    <option value="">Select Department...</option>
                    {getAvailableDepartments(batches, courses, formData.batchId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Subject</label>
                  <select
                    value={formData.subjectId}
                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    disabled={!formData.departmentId}
                  >
                    <option value="">Select Subject...</option>
                    {getSubjectsForDepartment(courses, formData.departmentId).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsible Staff</label>
                  <select
                    value={formData.staffId}
                    onChange={e => setFormData({ ...formData, staffId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-all"
                    disabled={!formData.departmentId}
                  >
                    <option value="">Select Staff...</option>
                    {staffList
                      .filter(s => !formData.departmentId || (s.department || '').toLowerCase().includes(getDeptName(courses, formData.departmentId).toLowerCase()))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Marks Target</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[25, 50, 75, 100].map(m => (
                      <button
                        key={m}
                        onClick={() => setFormData({ ...formData, totalMarks: m })}
                        className={`py-3 rounded-xl text-sm font-black border transition-all ${formData.totalMarks === m
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={async () => {
                    if (!formData.title || !formData.batchId || !formData.departmentId || !formData.subjectId || !formData.staffId) {
                      alert('Please fill all required fields.');
                      return;
                    }
                    try {
                      const subjName = getSubjectName(courses, formData.departmentId, formData.subjectId);
                      const payload = {
                        title: formData.title,
                        test_type: formData.testType,
                        batch: formData.batchId,
                        department: formData.departmentId,
                        subject_model: formData.subjectId,
                        staff: formData.staffId,
                        total_marks: formData.totalMarks,
                        duration: formData.duration,
                        target_year: formData.targetYear || '1',
                        status: 'Upcoming',
                        subject: subjName,      // legacy display field
                        lessons: [],
                      };
                      await ApiService.addExaminationTest(payload);
                      const refreshed = await ApiService.getExaminationTests();
                      setTests(decorateTests(refreshed as Test[], batches, courses, staffList));
                      setIsCreateModalOpen(false);
                    } catch (err: any) {
                      alert(err.message || 'Failed to create test');
                    }
                  }}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest transition-all"
                >
                  Create Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Test Modal */}
      {activeTest && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-none md:rounded-3xl w-full h-full md:w-full md:max-w-5xl md:max-h-[95vh] overflow-y-auto shadow-2xl p-4 md:p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Assessment</div>
                <h2 className="text-2xl font-black text-white">{activeTest.title}</h2>
                <p className="text-slate-400 text-sm mt-1">{activeTest.subjectName || activeTest.subject}</p>
              </div>
              <div className="flex items-center gap-3 text-sm text-white font-bold">
                <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
                    Time Left: <span className="text-emerald-400 ml-1">{formatCountdown(timeLeftMs)}</span>
                </div>
                {activeTest.endTime && (
                  <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                    Ends: {formatDateTime(activeTest.endTime)}
                  </div>
                )}
              </div>
            </div>
            {visibilityWarn && (
              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 text-sm font-semibold">
                Please stay on this test screen. Leaving or switching tabs is not allowed.
              </div>
            )}

            {(activeTest as any).questions_data ? (
              <div className="space-y-4">
                {extractQuestions(activeTest).map((q, idx) => (
                  <div key={q.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-slate-300">
                      <span className="font-bold text-white">Q{idx + 1}. {q.text}</span>
                      {q.marks && <span className="text-emerald-400 text-xs font-black">{q.marks} marks</span>}
                    </div>
                    {q.marks === 1 && q.options?.length ? (
                      <div className="space-y-2">
                        {q.options.map((opt, iOpt) => {
                          const id = `${q.id}-opt-${iOpt}`;
                          return (
                            <label key={id} className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 hover:border-emerald-500 cursor-pointer">
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={answerMap[q.id] === opt}
                                onChange={() => setAnswerMap(prev => ({ ...prev, [q.id]: opt }))}
                                className="accent-emerald-500"
                              />
                              <span className="text-slate-200 text-sm">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        value={answerMap[q.id] || ''}
                        onChange={(e) => setAnswerMap(prev => ({ ...prev, [q.id]: e.target.value }))}
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        placeholder="Type your answer..."
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400">
                No question paper attached yet.
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleSubmitAnswers}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all"
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {evaluationTest && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between gap-3 relative">
              <div>
                <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Evaluation</div>
                <h2 className="text-2xl font-black text-white">{evaluationTest.title}</h2>
                <p className="text-slate-400 text-sm">{evaluationTest.subjectName || evaluationTest.subject}</p>
                {user?.role === 'STAFF' && String((evaluationTest as any).staff) !== String(user.id) && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800 text-amber-300 text-[11px] font-black uppercase tracking-widest">
                    View Only (not test creator)
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {submissions.length > 0 && (
                  <>
                    <button
                      onClick={() => submissionDetailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-[11px] font-black uppercase tracking-widest transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => {
                        if (!evaluationTest) return;
                        const pre = viewerMap[String(evaluationTest.id)] || [];
                        setViewShareStaffIds(pre);
                        setViewShareOpen(v => !v);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-black uppercase tracking-widest"
                    >
                      Share
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setEvaluationTest(null); setSubmissions([]); }}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 text-[11px] font-black uppercase tracking-widest"
                >
                  Close
                </button>
              </div>

              {viewShareOpen && evaluationTest && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-300">Share view access</div>
                    <button
                      onClick={() => setViewShareOpen(false)}
                      className="text-slate-500 hover:text-white text-xs font-bold"
                      aria-label="Close share panel"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 mb-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold uppercase tracking-widest text-slate-200">
                    <span>Select All</span>
                    <input
                      type="checkbox"
                      checked={staffList.length > 0 && staffList.every(st => viewShareStaffIds.includes(String(st.id)))}
                      onChange={(e) => setAllViewers(e.target.checked)}
                      className="accent-emerald-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {staffList.length === 0 && (
                      <div className="text-xs text-slate-500">No staff found.</div>
                    )}
                    {staffList.map(st => {
                      const id = String(st.id);
                      const checked = viewShareStaffIds.includes(id);
                      return (
                        <label
                          key={id}
                          onClick={(e) => { e.preventDefault(); toggleViewer(id); }}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors cursor-pointer ${
                            checked ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-200'
                          }`}
                        >
                          <span className="truncate">{st.name || st.username || st.email}</span>
                          <input
                            type="checkbox"
                            readOnly
                            checked={checked}
                            className="accent-emerald-500 pointer-events-none"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => saveViewers(String(evaluationTest.id))}
                    className="w-full mt-3 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest"
                  >
                    Save Access
                  </button>
                </div>
              )}
            </div>

            {isLoadingSubs ? (
              <div className="text-slate-400">Loading submissions...</div>
            ) : submissions.length === 0 ? (
              <div className="text-slate-400">No submissions yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1 space-y-2">
                  {submissions.map((sub, idx) => {
                    const studentName =
                      sub.student_name ||
                      sub.studentName ||
                      (() => {
                        const found = allUsers.find(u => String(u.id) === String(sub.student_id || sub.student));
                        return found?.name || found?.username || found?.email;
                      })() ||
                      sub.student ||
                      sub.student_id ||
                      'Student';
                    const sid = String(sub.id || idx);
                    const isActive = selectedSubmissionId ? selectedSubmissionId === sid : idx === 0;
                    const canGrade = user && (user.role !== 'STAFF' || String((evaluationTest as any).staff) === String(user.id));
                    return (
                      <div
                        key={sid}
                        className={`w-full px-3 py-2 rounded-xl border transition-colors ${isActive ? 'border-emerald-500 bg-emerald-500/10 text-white' : 'border-slate-800 bg-slate-900 text-slate-200'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold truncate">{studentName}</div>
                            <div className="text-[11px] text-slate-400">Submitted: {sub.submitted_at ? formatDateTime(sub.submitted_at) : '—'}</div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedSubmissionId(sid);
                              const ms = sub.marks_assigned || sub.marksAssigned || {};
                              const normalized: Record<string, number> = {};
                              Object.keys(ms || {}).forEach(k => normalized[k] = Number(ms[k]) || 0);
                              setMarksDraft(normalized);
                            }}
                            className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors ${
                              isActive ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-emerald-600 hover:text-white'
                            }`}
                          >
                            {canGrade ? 'Correct' : 'View'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="md:col-span-3 space-y-3" ref={submissionDetailRef}>
                  {(() => {
                    const idxSel = submissions.findIndex(s => String(s.id || submissions.indexOf(s)) === selectedSubmissionId);
                    const idx = idxSel >= 0 ? idxSel : 0;
                    const sub = submissions[idx] || submissions[0];
                    const studentName =
                      sub?.student_name ||
                      sub?.studentName ||
                      (() => {
                        const found = allUsers.find(u => String(u.id) === String(sub?.student_id || sub?.student));
                        return found?.name || found?.username || found?.email;
                      })() ||
                      sub?.student ||
                      sub?.student_id ||
                      'Student';
                    const answers = sub?.answers || {};
                    const questions = extractQuestions(evaluationTest);
                    const assignedMap = sub?.marks_assigned || sub?.marksAssigned || {};
                    const canGrade = user && (user.role !== 'STAFF' || String((evaluationTest as any).staff) === String(user.id));
                    const totalScored = questions.reduce((sum, q) => {
                      const val = marksDraft[q.id] ?? assignedMap?.[q.id] ?? 0;
                      return sum + (Number(val) || 0);
                    }, 0);
                    const totalMax = questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);
                    return (
                      <div className="border border-slate-800 rounded-2xl p-4 space-y-3 bg-slate-900/60">
                        <div className="flex items-center justify-between">
                          <div className="text-white font-bold">Student: {studentName}</div>
                          <div className="text-[11px] text-slate-400">Submitted: {sub?.submitted_at ? formatDateTime(sub.submitted_at) : '—'}</div>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-emerald-300">
                          <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                            Total: {totalScored} / {totalMax || '—'}
                          </span>
                        </div>
                        <div className="space-y-3">
                          {questions.map((q, qidx) => {
                            const maxMark = Number(q.marks) || 0;
                            const current = marksDraft[q.id] ?? (sub?.marks_assigned?.[q.id] || sub?.marksAssigned?.[q.id] || 0);
                            return (
                              <div key={q.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between text-sm text-white font-semibold">
                                  <span>Q{qidx + 1}. {q.text}</span>
                                  {q.marks && <span className="text-emerald-400 text-xs font-black">{q.marks} marks</span>}
                                </div>
                                <div className="mt-1 text-slate-200 text-sm whitespace-pre-wrap">
                                  {answers[q.id] ?? <span className="text-slate-500 italic">No answer</span>}
                                </div>
                                {maxMark > 0 && (
                                  <div className="flex items-center gap-2 text-xs text-slate-300">
                                    <span className="uppercase tracking-widest font-black">Marks</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={maxMark}
                                      step="0.5"
                                      value={current}
                                      onChange={(e) => {
                                        if (!canGrade) return;
                                        const val = Math.max(0, Math.min(maxMark, Number(e.target.value)));
                                        setMarksDraft(prev => ({ ...prev, [q.id]: val }));
                                      }}
                                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm focus:border-emerald-500 focus:outline-none"
                                      disabled={!canGrade}
                                    />
                                    <span className="text-slate-500">/ {maxMark}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end">
                          <button
                            disabled={isSavingEval || !canGrade}
                            onClick={async () => {
                              if (!sub?.id) return;
                              setIsSavingEval(true);
                              try {
                                // clamp all marks to max
                                const sendMarks: Record<string, number> = {};
                                const questions = extractQuestions(evaluationTest);
                                questions.forEach(q => {
                                  const max = Number(q.marks) || 0;
                                  const val = marksDraft[q.id] ?? 0;
                                  sendMarks[q.id] = Math.max(0, Math.min(max, val));
                                });
                                const total = Object.values(sendMarks).reduce((a, b) => a + b, 0);
                                await ApiService.evaluateTestSubmission(String(sub.id), sendMarks, total);
                                alert('Marks saved');
                              } catch (e: any) {
                                alert(e.message || 'Failed to save marks');
                              } finally {
                                setIsSavingEval(false);
                              }
                            }}
                            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                              canGrade
                                ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {isSavingEval ? 'Saving...' : 'Save Marks'}
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {attendanceError && (
        <div className="fixed bottom-4 right-4 bg-rose-600 text-white px-4 py-3 rounded-xl shadow-lg">
          {attendanceError}
          <button className="ml-3 text-xs underline" onClick={() => setAttendanceError(null)}>Dismiss</button>
        </div>
      )}
    </>
  );
};

function formatDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso;
  }
}

function formatDateOnly(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function getAvailableDepartments(batches: AcademicBatch[], courses: Course[], batchId: string) {
  const batch = batches.find(b => String(b.id) === String(batchId));
  if (!batch) return [];
  const deptIds = (batch as any).departmentIds || (batch as any).departments || [];
  return courses.filter(c => deptIds.map(String).includes(String(c.id)));
}

function getSubjectsForDepartment(courses: Course[], deptId: string): Subject[] {
  const dept = courses.find(c => String(c.id) === String(deptId));
  return dept?.subjects || [];
}

function getDeptName(courses: Course[], deptId: string) {
  const dept = courses.find(c => String(c.id) === String(deptId));
  return dept?.name || '';
}

function getSubjectName(courses: Course[], deptId: string, subjectId: string) {
  const dept = courses.find(c => String(c.id) === String(deptId));
  const subj = dept?.subjects?.find(s => String(s.id) === String(subjectId));
  return subj?.name || '';
}

function decorateTests(tests: Test[], batches: any[], courses: any[], users: User[]): Test[] {
  const userMap = new Map(users.map(u => [String(u.id), u]));
    const computeStatus = (test: any) => {
      const now = Date.now();
      const start = test.startTime ? new Date(test.startTime).getTime() : (test.start_time ? new Date(test.start_time).getTime() : null);
      const end = test.endTime ? new Date(test.endTime).getTime() : (test.end_time ? new Date(test.end_time).getTime() : null);
      if (end && now > end) return 'Completed';
      if (start && now >= start && (!end || now <= end)) return 'Active';
      return test.status || 'Upcoming';
    };

    return tests.map(t => {
    const batch = batches.find(b => String(b.id) === String((t as any).batch || t.batchName));
    const dept = courses.find(c => String(c.id) === String((t as any).department || t.departmentName));
    const subject = dept?.subjects?.find((s: any) => String(s.id) === String((t as any).subject_model || t.subjectId)) || null;

    const invigilatorIds: string[] = ((t as any).invigilators || []).map((x: any) => String(x));
    const invNames = invigilatorIds
      .map(id => userMap.get(id)?.name || userMap.get(id)?.username)
      .filter(Boolean) as string[];

    return {
      ...t,
      startTime: (t as any).start_time || t.startTime,
      endTime: (t as any).end_time || t.endTime,
      batchName: batch ? `${batch.name}` : 'Batch N/A',
      departmentName: dept ? dept.name : 'Department N/A',
      subjectName: subject ? subject.name : (t.subjectName || t.subject || 'Subject'),
      invigilatorNames: invNames.length ? invNames : (t.invigilatorNames || []),
      duration: t.duration || (t as any).duration || '60 mins',
      status: computeStatus(t),
    };
  });
}

export default ExaminationPortal;
