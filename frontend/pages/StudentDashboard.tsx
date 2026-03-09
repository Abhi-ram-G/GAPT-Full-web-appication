
import React, { useContext, useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { AcademicData, UserRole, MarkRecord, MarkBatch, Course, Subject, User, Timetable, AcademicTask, StudentTaskProgress, AttendanceRecord } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getGreenAcademicAnalysis } from '../geminiService';

const HOUR_LABELS = ['09:00', '10:00', '11:00', '12:00', '02:00', '03:00', '04:00'];

const CustomTrajectoryTooltip = ({ active, payload, label, valueLabel }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface-elevated border border-emerald-500/10 p-4 rounded-2xl shadow-2xl min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 border-b border-emerald-500/10 pb-2">{label}</p>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-text-muted">{valueLabel}</span>
          <span className="text-sm font-black text-text-primary">{data.val}</span>
        </div>
      </div>
    );
  }
  return null;
};

const StudentDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState<AcademicData>({ attendance: 0, cgpa: 0, sgpa: 0, credits: 0, greenPoints: 0 });
  const [analysis, setAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [studentMarks, setStudentMarks] = useState<MarkRecord[]>([]);
  const [batches, setBatches] = useState<MarkBatch[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('ALL');
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [mentor, setMentor] = useState<any>({ name: 'Institutional Mentor', email: 'registry@bitsathy.ac.in' });
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedHourDetail, setSelectedHourDetail] = useState<any>(null);

  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'RESULTS' | 'RESOURCES' | 'SCHEDULE' | 'TASKS'>('ANALYTICS');

  const handleUpdateProgress = async (taskId: string, progress: StudentTaskProgress) => {
    if (!user) return;
    await ApiService.updateStudentTaskProgress(taskId, user.id, progress);
    const t = await ApiService.getTasks();
    setTasks(t);
  };

  useEffect(() => {
    const refresh = async () => {
      if (user?.id) {
        const [marks, b, academicData, cur, users, tts, t, att] = await Promise.all([
          ApiService.getMarkRecordsByStudent(user.id),
          ApiService.getMarkBatches(),
          ApiService.getAcademicData(user.id),
          ApiService.getCurriculum(),
          ApiService.getUsers(),
          ApiService.getTimetables(),
          ApiService.getTasks(),
          ApiService.getAttendance()
        ]);

        setStudentMarks(marks);
        setBatches(b);
        setData(academicData);
        setCurriculum(cur);
        setAllUsers(users);
        setTasks(t);
        setAttendanceRecords(att.filter(a => a.userId === user.id));

        const foundTT = tts.find(t => t.department === user.department && t.studyYear === user.studyYear);
        setTimetable(foundTT || null);

        const currentUserProfile = users.find(u => u.id === user.id);
        if (currentUserProfile?.mentorId) {
          const assignedStaff = users.find(u => u.id === currentUserProfile.mentorId);
          if (assignedStaff) {
            setMentor({ name: assignedStaff.name, email: assignedStaff.email });
          }
        }
      }
    };
    refresh();
  }, [user]);

  const organizedTranscript = useMemo(() => {
    const semesters: Record<string, Record<string, { i1?: number, i2?: number, es?: number, max: number }>> = {};

    studentMarks.forEach(mark => {
      const batch = batches.find(b => b.id === mark.batchId);
      if (!batch) return;

      const semMatch = batch.name.toUpperCase().match(/SEM (\d+)/);
      const semName = semMatch ? `Semester ${semMatch[1]}` : 'General';

      if (!semesters[semName]) semesters[semName] = {};
      if (!semesters[semName][mark.subject]) semesters[semName][mark.subject] = { max: mark.maxMarks };

      const bName = batch.name.toUpperCase();
      if (bName.includes('INTERNAL 1') || bName.includes('IA 1')) semesters[semName][mark.subject].i1 = mark.marks;
      else if (bName.includes('INTERNAL 2') || bName.includes('IA 2')) semesters[semName][mark.subject].i2 = mark.marks;
      else if (bName.includes('END SEM') || bName.includes('SEMESTER') || bName.includes('FINAL')) semesters[semName][mark.subject].es = mark.marks;
    });

    return semesters;
  }, [studentMarks, batches]);

  const trajectoryData = useMemo(() => {
    const sems = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];
    return sems.map((name, idx) => {
      const semNum = idx + 1;
      const semKey = `Semester ${semNum}`;
      const semResults = organizedTranscript[semKey];

      let val = 0;
      if (semResults) {
        const scores = Object.values(semResults).map(s => s.es || (s.i1 && s.i2 ? (s.i1 + s.i2) / 2 : 0)).filter(s => s > 0);
        if (scores.length > 0) {
          val = scores.reduce((a, b) => a + b, 0) / scores.length;
        }
      }
      return { name, val: parseFloat(val.toFixed(2)) };
    }).filter(d => d.val > 0 || d.name === 'Sem 1');
  }, [organizedTranscript]);

  const handleAiAnalysis = async () => {
    if (!user) return;
    setLoadingAnalysis(true);
    const result = await getGreenAcademicAnalysis(data, user.name);
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  return (
    <DashboardLayout title="Institutional Student Portal">
      <div className="space-y-8 pb-20">

        {/* Sub-Navigation Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 bg-surface-component/50 p-2 rounded-2xl md:rounded-3xl border border-border-subtle max-w-fit mx-auto shadow-xl">
          {[
            { id: 'ANALYTICS', label: 'Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { id: 'RESULTS', label: 'Academic Results', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
            { id: 'RESOURCES', label: 'Materials', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
            { id: 'TASKS', label: 'Tasks & Deadlines', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
            { id: 'SCHEDULE', label: 'Hourly Log', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-text-muted hover:text-emerald-500'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={tab.icon}></path></svg>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'ANALYTICS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-surface-component border border-border-subtle rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700"></div>
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 flex flex-col items-center justify-center text-center p-6 bg-surface-elevated rounded-3xl border border-border-subtle shadow-inner">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-3xl md:text-4xl mb-4 shadow-xl border-4 border-surface-component">{(user?.name?.[0] || '?').toUpperCase()}</div>
                  <h2 className="text-text-primary font-black text-lg md:text-xl uppercase tracking-tighter leading-tight">{user?.name}</h2>
                  <p className="text-emerald-500 text-[9px] md:text-[10px] font-black uppercase tracking-widest mt-1">ID: {user?.regNo || 'PENDING'}</p>
                </div>
                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <DetailItem label="Division" value={user?.department?.split(' (')[0] || 'Unassigned'} />
                  <DetailItem label="Batch" value={user?.regNo ? `20${user.regNo.substring(3, 5)}` : '2028'} />
                  <DetailItem label="Current Period" value={user?.studyYear || '1st Year'} color="text-emerald-500" />
                  <div className="sm:col-span-2 md:col-span-3 bg-surface-elevated p-4 md:p-6 rounded-3xl border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                      </div>
                      <div>
                        <p className="text-[8px] md:text-[9px] font-black text-text-muted uppercase tracking-widest">Assigned Institutional Mentor</p>
                        <p className="text-xs md:text-sm font-black text-text-primary uppercase">{mentor.name}</p>
                      </div>
                    </div>
                    <p className="text-[9px] md:text-[10px] font-mono text-text-muted lowercase break-all">{mentor.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard
                label="Attendance Audit"
                value={`${data.attendance}%`}
                color="bg-emerald-500"
                progress={data.attendance}
                subtitle="Institutional"
              />
              <MetricCard
                label="Cumulative GPA"
                value={data.cgpa.toFixed(2)}
                color="bg-teal-500"
                progress={data.cgpa * 10}
                subtitle="Scale 10.0"
              />
              <MetricCard
                label="Green Score"
                value={data.greenPoints}
                color="bg-emerald-600"
                progress={Math.min((data.greenPoints / 1000) * 100, 100)}
                subtitle="Points"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-surface-component border border-emerald-500/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Performance Trajectory</h3>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-lg w-fit">Last 8 Semesters</span>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trajectoryData}>
                        <defs>
                          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0.4} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(16, 185, 129, 0.05)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }} content={<CustomTrajectoryTooltip valueLabel="Grade Avg" />} />
                        <Bar dataKey="val" fill="url(#colorBar)" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Pending Tasks Quick View */}
                <div className="bg-surface-component border border-emerald-500/10 rounded-3xl p-6 md:p-8 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Pending Academic Tasks</h3>
                    <button onClick={() => setActiveTab('TASKS')} className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline">View All</button>
                  </div>
                  <div className="space-y-4">
                    {tasks.filter(t => t.assignedStudents?.some((s: any) => s.studentId === user?.id && s.progress !== StudentTaskProgress.COMPLETED)).slice(0, 3).map(task => {
                      const days = Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={task.id} className="flex items-center justify-between p-4 bg-surface-elevated/50 rounded-2xl border border-border-subtle group hover:border-emerald-500/30 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`w-1.5 h-10 rounded-full ${days < 0 ? 'bg-rose-500' : days <= 2 ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                            <div>
                              <p className="text-xs font-black text-text-primary uppercase truncate max-w-[200px]">{task.title}</p>
                              <p className="text-[9px] text-text-muted font-mono uppercase">{task.subjectName} • {days < 0 ? 'Overdue' : `${days}d left`}</p>
                            </div>
                          </div>
                          <select
                            value={task.assignedStudents?.find((s: any) => s.studentId === user?.id)?.progress}
                            onChange={(e) => handleUpdateProgress(task.id, e.target.value as StudentTaskProgress)}
                            className="bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg outline-none border-none cursor-pointer hover:bg-emerald-500/20 transition-all"
                          >
                            {Object.values(StudentTaskProgress).map(p => (
                              <option key={p} value={p} className="bg-surface-elevated text-text-primary">{p}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                    {tasks.filter(t => t.assignedStudents?.some((s: any) => s.studentId === user?.id && s.progress !== StudentTaskProgress.COMPLETED)).length === 0 && (
                      <div className="py-8 text-center border-2 border-dashed border-emerald-500/5 rounded-2xl">
                        <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">All tasks authorized & completed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-surface-component border border-emerald-500/10 rounded-2xl p-6 flex flex-col shadow-2xl h-fit sticky top-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <h3 className="text-text-primary font-bold">Green AI Advisor</h3>
                  <button onClick={handleAiAnalysis} disabled={loadingAnalysis} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all disabled:opacity-50 w-fit">
                    <svg className={`w-5 h-5 ${loadingAnalysis ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </button>
                </div>
                <div className="flex-1 space-y-4">
                  {analysis ? (
                    <>
                      <div className="p-4 bg-surface-elevated rounded-xl border border-emerald-500/10">
                        <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-text-muted uppercase">Impact Rating</span><span className="text-emerald-500 font-bold">{analysis.greenImpactRating}/10</span></div>
                        <p className="text-sm text-text-primary italic">"{analysis.summary}"</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase mb-2">Recommendations</h4>
                        <ul className="space-y-2">{analysis.suggestions.map((s: string, i: number) => (<li key={i} className="flex items-start space-x-2 text-xs text-text-muted"><span className="text-emerald-500 mt-0.5">•</span><span>{s}</span></li>))}</ul>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                      <div className="w-12 h-12 bg-surface-elevated rounded-full flex items-center justify-center text-text-muted mb-4 border border-emerald-500/10">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                      </div>
                      <p className="text-text-muted text-sm font-medium">Initiate analysis for institutional guidance.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RESULTS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="bg-surface-component border border-emerald-500/10 rounded-3xl md:rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
              <div className="relative z-10 text-center md:text-left">
                <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Consolidated semester transcript</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Comprehensive Academic Registry Reports</p>
              </div>
            </div>

            <div className="space-y-12">
              {Object.keys(organizedTranscript).length === 0 ? (
                <div className="py-24 text-center border-4 border-dashed border-emerald-500/10 rounded-[3rem]">
                  <p className="text-text-muted font-black uppercase tracking-[0.2em]">No evaluation records published</p>
                </div>
              ) : (
                Object.entries(organizedTranscript).reverse().map(([semName, subjects]) => (
                  <div key={semName} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-6">
                      <div className="w-2 h-6 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                      <h4 className="text-text-primary font-black text-xl uppercase tracking-tighter">{semName} Matrix</h4>
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{Object.keys(subjects).length} Unit Entries</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {Object.entries(subjects).map(([subject, scores]) => {
                        const isComplete = scores.es !== undefined;
                        const isPass = (scores.es || 0) >= 50;
                        return (
                          <div key={subject} className="bg-surface-component border border-emerald-500/10 rounded-[2.5rem] p-8 hover:bg-surface-elevated hover:border-emerald-500/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-8 group shadow-lg">
                            <div className="flex items-center gap-6 flex-1 min-w-0">
                              <div className={`w-2 h-14 rounded-full transition-all group-hover:h-16 ${isComplete ? (isPass ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-800'}`}></div>
                              <div className="min-w-0">
                                <h5 className="text-lg font-black text-text-primary uppercase truncate tracking-tight group-hover:text-emerald-500 transition-colors">{subject}</h5>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[9px] font-bold text-text-muted uppercase">Registry Unit Assessment</span>
                                  {isComplete && (
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${isPass ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{isPass ? 'Authorized Clear' : 'Arrear Status'}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 md:min-w-[450px]">
                              <PillarScore label="IA 1" value={scores.i1} />
                              <PillarScore label="IA 2" value={scores.i2} />
                              <PillarScore label="Semester" value={scores.es} highlight />
                            </div>

                            <div className="bg-slate-950/40 p-6 rounded-3xl border border-white/5 text-center min-w-[140px] flex flex-col justify-center shadow-inner group-hover:bg-slate-950 transition-colors">
                              <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1.5">Consolidated Result</p>
                              <p className={`text-2xl font-black ${isComplete ? (isPass ? 'text-emerald-400' : 'text-rose-500') : 'text-slate-700'}`}>
                                {scores.es ? `${((scores.es / scores.max) * 100).toFixed(0)}%` : '--'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'RESOURCES' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="bg-surface-component border border-emerald-500/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
              <div className="relative z-10">
                <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Institutional resource library</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Authorized Curriculum Modules & Materials</p>
              </div>
            </div>
            <div className="py-20 text-center border-4 border-dashed border-emerald-500/10 rounded-[3rem]">
              <p className="text-text-muted font-black uppercase tracking-widest text-xs">Registry module pending synchronization.</p>
            </div>
          </div>
        )}

        {activeTab === 'TASKS' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="bg-surface-component border border-emerald-500/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
              <div className="relative z-10">
                <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Assigned academic tasks</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Personalized Assignment Registry & Progress Audit</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {tasks.filter(t => t.assignedStudents?.some((s: any) => s.studentId === user?.id)).length === 0 ? (
                <div className="col-span-full py-24 text-center border-4 border-dashed border-emerald-500/10 rounded-[3rem]">
                  <p className="text-text-muted font-black uppercase tracking-widest text-xs">No tasks currently assigned to your profile.</p>
                </div>
              ) : (
                tasks.filter(t => t.assignedStudents?.some((s: any) => s.studentId === user?.id)).map(task => {
                  const studentAssignment = task.assignedStudents?.find((s: any) => s.studentId === user?.id);
                  const days = Math.ceil((new Date(task.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const isOverdue = days < 0;

                  return (
                    <div key={task.id} className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl hover:border-emerald-500/20 transition-all flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${isOverdue ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : days <= 2 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {isOverdue ? 'Overdue' : `${days}d Remaining`}
                        </span>
                        <span className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border bg-slate-800 text-slate-400">{task.status}</span>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <p className="text-[10px] font-black text-emerald-500 uppercase mb-1">{task.subjectName} • {task.staffName}</p>
                          <h4 className="text-xl font-black text-text-primary uppercase truncate leading-tight">{task.title}</h4>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-3">{task.description}</p>

                        <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                          <div className="flex justify-between items-center">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest">Your Progress</p>
                            <select
                              value={studentAssignment?.progress}
                              onChange={(e) => handleUpdateProgress(task.id, e.target.value as StudentTaskProgress)}
                              className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg outline-none border-none cursor-pointer hover:bg-emerald-500/20 transition-all"
                            >
                              {Object.values(StudentTaskProgress).map(p => (
                                <option key={p} value={p} className="bg-surface-elevated text-text-primary">{p}</option>
                              ))}
                            </select>
                          </div>
                          {studentAssignment?.details && (
                            <p className="text-[10px] text-text-muted italic bg-surface-deep p-3 rounded-xl border border-border-subtle">"{studentAssignment.details}"</p>
                          )}
                          {studentAssignment?.marks !== undefined && (
                            <div className="flex items-center justify-between bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                              <span className="text-[9px] font-black text-emerald-600 uppercase">Evaluation Mark</span>
                              <span className="text-sm font-black text-emerald-500">{studentAssignment.marks}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-text-muted">
                          <span>Deadline</span>
                          <span className="text-emerald-500 font-mono">{new Date(task.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'SCHEDULE' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
            <div className="bg-surface-component border border-emerald-500/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
              <div className="relative z-10">
                <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Active daily schedule</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Authorized Faculty Hourly Registry</p>
              </div>
            </div>

            <div className="bg-surface-component border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-white font-black text-xl lowercase tracking-tight">Attendance Log</h3>
                <input
                  type="date"
                  value={selectedAttendanceDate}
                  onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {HOUR_LABELS.map((time, i) => {
                  const record = attendanceRecords.find(r => r.date === selectedAttendanceDate);
                  const hourData = record?.hours?.find(h => h.hour === i + 1);
                  const isPresent = hourData?.status === 'PRESENT';
                  const isAbsent = hourData?.status === 'ABSENT';
                  const isOther = hourData?.status === 'OTHER';

                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedHourDetail({ ...hourData, hour: i + 1, date: selectedAttendanceDate })}
                      className={`p-4 rounded-2xl border text-center transition-all hover:scale-105 ${isPresent ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        isAbsent ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          isOther ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            'bg-slate-900 border-white/5 text-slate-500'
                        }`}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest mb-1">Hour {i + 1}</p>
                      <p className="text-xs font-bold">{hourData?.status || 'NO DATA'}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedHourDetail && (
              <div className="bg-surface-component border border-white/5 rounded-3xl p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-white font-black text-xl lowercase tracking-tight">Hour {selectedHourDetail.hour} Details</h3>
                    <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">{selectedHourDetail.date}</p>
                  </div>
                  <button onClick={() => setSelectedHourDetail(null)} className="text-slate-500 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
                    <p className={`text-sm font-black uppercase ${selectedHourDetail.status === 'PRESENT' ? 'text-emerald-400' :
                      selectedHourDetail.status === 'ABSENT' ? 'text-rose-400' :
                        'text-amber-400'
                      }`}>{selectedHourDetail.status || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time</p>
                    <p className="text-sm font-black text-white">{selectedHourDetail.time || 'N/A'}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Marked By</p>
                    <p className="text-sm font-black text-white">{selectedHourDetail.staffName || 'System'}</p>
                  </div>
                </div>
                {selectedHourDetail.detail && (
                  <div className="mt-6 bg-slate-950 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Justification / Details</p>
                    <p className="text-sm text-slate-300">{selectedHourDetail.detail}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

const PillarScore: React.FC<{ label: string; value?: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`p-4 rounded-2xl border text-center transition-all ${highlight ? 'bg-emerald-500/10 border-emerald-500/20 scale-105 shadow-xl shadow-emerald-500/5' : 'bg-surface-deep border-border-subtle'}`}>
    <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mb-2 truncate">{label}</p>
    <p className={`text-xl font-black ${value !== undefined ? (highlight ? 'text-emerald-500' : 'text-text-primary') : 'text-text-muted'}`}>
      {value ?? '--'}
    </p>
    {value !== undefined && (
      <div className="w-full h-1 bg-black/10 rounded-full mt-2 overflow-hidden">
        <div className={`h-full transition-all duration-700 ${highlight ? 'bg-emerald-500' : 'bg-text-muted/30'}`} style={{ width: `${value}%` }}></div>
      </div>
    )}
  </div>
);

const DetailItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-text-primary' }) => (<div><p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p><p className={`text-sm font-black uppercase tracking-tight ${color}`}>{value}</p></div>);
const MetricCard: React.FC<{
  label: string;
  value: string | number;
  color: string;
  progress?: number;
  subtitle?: string;
}> = ({ label, value, color, progress, subtitle }) => (
  <div className="bg-surface-component border border-emerald-500/10 rounded-3xl p-6 relative overflow-hidden group flex flex-col items-center md:items-start text-center md:text-left shadow-lg transition-all hover:shadow-emerald-500/5">
    <div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700`}></div>
    <div className="relative z-10 w-full">
      <p className="text-text-muted text-[10px] md:text-[11px] font-black uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-baseline gap-2 mb-2">
        <p className="text-3xl md:text-4xl font-black text-text-primary tracking-tighter">{value}</p>
        {subtitle && <span className="text-[10px] font-bold text-text-muted uppercase">{subtitle}</span>}
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="w-full h-2 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-out ${color}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Efficiency</span>
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">{progress.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  </div>
);

export default StudentDashboard;