
import React, { useContext, useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { MockDB } from '../store';
import { AcademicData, UserRole, MarkRecord, MarkBatch, Course, Subject, User, Timetable } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getGreenAcademicAnalysis } from '../Service';

const HOUR_LABELS = ['09:00', '10:00', '11:00', '12:00', '02:00', '03:00', '04:00'];

const CustomTrajectoryTooltip = ({ active, payload, label, valueLabel }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isInternal = label.includes('Internal');
    const labelToDisplay = isInternal ? 'Average Mark' : valueLabel;
    
    return (
      <div className="bg-surface-elevated border border-border-subtle p-4 rounded-2xl shadow-2xl min-w-[180px] animate-in fade-in zoom-in-95 duration-200">
        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 border-b border-border-subtle pb-2">{label}</p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-bold text-text-muted">{labelToDisplay}</span>
          <span className="text-sm font-black text-text-primary">{data.val}</span>
        </div>
        
        {data.details && data.details.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border-subtle">
            <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Subject Breakdown</p>
            {data.details.map((detail: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center gap-4">
                <span className="text-[10px] text-text-muted truncate max-w-[100px]">{detail.subject}</span>
                <span className="text-[10px] font-bold text-indigo-400">{detail.score}</span>
              </div>
            ))}
          </div>
        )}
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
  
  // UI State
  const [expandedSemester, setExpandedSemester] = useState<number | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ANALYTICS' | 'RESOURCES' | 'SCHEDULE'>('ANALYTICS');

  useEffect(() => {
    const refresh = async () => {
      if (user?.id) {
        const [marks, b, academicData, cur, users, tts] = await Promise.all([
          MockDB.getMarkRecordsByStudent(user.id),
          MockDB.getMarkBatches(),
          MockDB.getAcademicData(user.id),
          MockDB.getCurriculum(),
          MockDB.getUsers(),
          MockDB.getTimetables()
        ]);
        
        setStudentMarks(marks);
        setBatches(b);
        setData(academicData);
        setCurriculum(cur);
        setAllUsers(users);

        const foundTT = tts.find(t => t.department === user.department && t.studyYear === user.studyYear);
        setTimetable(foundTT || null);

        const currentUserProfile = users.find(u => u.id === user.id);
        if (currentUserProfile?.mentorId) {
          const assignedStaff = users.find(u => u.id === currentUserProfile.mentorId);
          if (assignedStaff) {
            setMentor({ name: assignedStaff.name, email: assignedStaff.email });
          }
        } else {
          const staff = users.filter(u => u.role === UserRole.STAFF);
          const userDeptBase = user?.department?.split(' (')[0];
          const sameDeptMentor = staff.find(s => s.department?.startsWith(userDeptBase || ''));
          setMentor(sameDeptMentor || staff[0] || { name: 'Institutional Mentor', email: 'mentor@bitsathy.ac.in' });
        }
      }
    };
    refresh();
  }, [user]);

  const studentCourse = useMemo(() => {
    if (!user?.department) return null;
    return curriculum.find(c => `${c.name} (${c.degree})` === user.department);
  }, [curriculum, user?.department]);

  const availableSemesters = useMemo(() => {
    const yearStr = user?.studyYear || '1st Year';
    let yearNum = 1;
    if (yearStr.includes('2nd')) yearNum = 2;
    else if (yearStr.includes('3rd')) yearNum = 3;
    else if (yearStr.includes('4th')) yearNum = 4;
    else if (yearStr.includes('Final')) yearNum = 4;
    
    const totalSems = yearNum * 2;
    const sems = [];
    for (let i = 1; i <= totalSems; i++) {
      sems.push(`Semester ${i}`);
    }
    return sems;
  }, [user?.studyYear]);

  const { trajectoryData, displayCgpa, valueLabel, subjectWiseData } = useMemo(() => {
    if (selectedSemester === 'ALL') {
      const sems = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8']; 
      let cumulativeEndSemRecords: MarkRecord[] = [];

      const chartData = sems.map((name, idx) => {
        const semNum = idx + 1;
        const filteredBatches = batches.filter(b => 
          b.name.toUpperCase().includes(`SEM ${semNum}`) && 
          b.name.toUpperCase().includes('END SEM')
        );
        const batchIds = filteredBatches.map(b => b.id);
        const currentSemEndRecords = studentMarks.filter(m => batchIds.includes(m.batchId));
        cumulativeEndSemRecords = [...cumulativeEndSemRecords, ...currentSemEndRecords];
        
        let val = 0;
        if (cumulativeEndSemRecords.length > 0) {
          const calculateGradePoint = (m: number, max: number) => {
            const p = (m/max)*100;
            if(p >= 90) return 10; if(p >= 80) return 9; if(p >= 70) return 8; if(p >= 60) return 7; if(p >= 50) return 6; return 0;
          };
          val = cumulativeEndSemRecords.reduce((acc, curr) => acc + calculateGradePoint(curr.marks, curr.maxMarks), 0) / cumulativeEndSemRecords.length;
        }
        return { name, val: parseFloat(val.toFixed(2)), details: [] };
      }).filter(d => d.val > 0 || d.name === 'Sem 1'); 

      return { trajectoryData: chartData, displayCgpa: data.cgpa.toFixed(2), valueLabel: 'CGPA', subjectWiseData: [] };
    } else {
      const semNum = selectedSemester.split(' ')[1];
      const getAvgForType = (keyword: string) => {
        const filteredBatches = batches.filter(b => 
          b.name.toUpperCase().includes(keyword.toUpperCase()) && 
          b.name.toUpperCase().includes(`SEM ${semNum}`)
        );
        const batchIds = filteredBatches.map(b => b.id);
        const records = studentMarks.filter(m => batchIds.includes(m.batchId));
        if (records.length === 0) return { avg: 0, details: [] };
        const avg = records.reduce((acc, curr) => acc + curr.marks, 0) / records.length;
        const details = records.map(r => ({ subject: r.subject, score: r.marks }));
        return { avg: parseFloat(avg.toFixed(1)), details };
      };

      const semBatches = batches.filter(b => b.name.toUpperCase().includes(`SEM ${semNum}`));
      const semMarks = studentMarks.filter(m => semBatches.some(b => b.id === m.batchId));
      const subjectMap: Record<string, { i1: number, i2: number, es: number }> = {};
      semMarks.forEach(m => {
        const batch = semBatches.find(b => b.id === m.batchId);
        if (!subjectMap[m.subject]) subjectMap[m.subject] = { i1: 0, i2: 0, es: 0 };
        if (batch?.name.toUpperCase().includes('INTERNAL 1')) subjectMap[m.subject].i1 = m.marks;
        else if (batch?.name.toUpperCase().includes('INTERNAL 2')) subjectMap[m.subject].i2 = m.marks;
        else if (batch?.name.toUpperCase().includes('END SEM')) subjectMap[m.subject].es = m.marks;
      });

      const i1Data = getAvgForType('INTERNAL 1');
      const i2Data = getAvgForType('INTERNAL 2');
      const esData = getAvgForType('END SEM');

      const chartData = [
        { name: 'Internal 1', val: i1Data.avg, details: i1Data.details },
        { name: 'Internal 2', val: i2Data.avg, details: i2Data.details },
        { name: 'Semester', val: esData.avg, details: esData.details },
      ];

      return { trajectoryData: chartData, displayCgpa: data.sgpa.toFixed(2), valueLabel: 'SGPA', subjectWiseData: Object.entries(subjectMap).map(([subject, scores]) => ({ subject, ...scores })) };
    }
  }, [studentMarks, batches, selectedSemester, data]);

  const handleAiAnalysis = async () => {
    if (!user) return;
    setLoadingAnalysis(true);
    const result = await getGreenAcademicAnalysis(data, user.name);
    setAnalysis(result);
    setLoadingAnalysis(false);
  };

  const organizedTranscript = useMemo(() => {
    const years: Record<string, Record<string, MarkRecord[]>> = {};
    studentMarks.forEach(mark => {
      const batch = batches.find(b => b.id === mark.batchId);
      const year = batch?.academicYear || 'Ongoing';
      const batchName = batch?.name || 'General Assessment';
      if (!years[year]) years[year] = {};
      if (!years[year][batchName]) years[year][batchName] = [];
      years[year][batchName].push(mark);
    });
    return years;
  }, [studentMarks, batches]);

  return (
    <DashboardLayout title="Student Academic Portal">
      <div className="space-y-8 pb-20">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-center gap-4">
           <button 
             onClick={() => setActiveTab('ANALYTICS')}
             className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === 'ANALYTICS' ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'}`}
           >
             Analytics
           </button>
           <button 
             onClick={() => setActiveTab('RESOURCES')}
             className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === 'RESOURCES' ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'}`}
           >
             Resources
           </button>
           <button 
             onClick={() => setActiveTab('SCHEDULE')}
             className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border ${activeTab === 'SCHEDULE' ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'}`}
           >
             Schedule
           </button>
        </div>

        {activeTab === 'ANALYTICS' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700"></div>
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 flex flex-col items-center justify-center text-center p-4 bg-surface-elevated rounded-3xl border border-border-subtle">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-4xl mb-4 shadow-xl border-4 border-surface-component">{user?.name?.[0].toUpperCase()}</div>
                  <h2 className="text-text-primary font-black text-xl uppercase tracking-tighter leading-tight">{user?.name}</h2>
                  <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">student ID: {user?.regNo || 'PENDING'}</p>
                </div>
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <DetailItem label="Department" value={user?.department?.split(' (')[0] || 'Unassigned'} />
                    <DetailItem label="Degree" value={user?.department?.split('(')[1]?.replace(')', '') || 'Degree TBD'} />
                    <DetailItem label="Batch" value={user?.regNo ? `20${user.regNo.substring(3, 5)}` : '2028'} />
                  </div>
                  <div className="space-y-4">
                    <DetailItem label="Current Year" value={user?.studyYear || '1st Year'} color="text-primary" />
                    <div className="pt-2 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                       <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1.5 flex items-center gap-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                          Assigned Mentor
                       </p>
                       <p className="text-sm font-black text-text-primary uppercase leading-tight">{mentor.name}</p>
                       <p className="text-[10px] font-mono text-text-muted mt-1 lowercase truncate">{mentor.email}</p>
                    </div>
                  </div>
                  <div className="bg-surface-elevated p-6 rounded-3xl border border-border-subtle flex flex-col justify-center">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Quick Statistics</p>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center"><span className="text-xs text-text-muted">Total Credits</span><span className="text-xs font-black text-text-primary">{data.credits}</span></div>
                       <div className="flex justify-between items-center"><span className="text-xs text-text-muted">Green Points</span><span className="text-xs font-black text-emerald-400">{data.greenPoints}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MetricCard label="Attendance" value={`${data.attendance}%`} color="bg-blue-500" />
              <MetricCard label="Current CGPA" value={data.cgpa.toFixed(2)} color="bg-emerald-500" />
              <MetricCard label="SGPA (Last Sem)" value={data.sgpa.toFixed(2)} color="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-surface-component border border-border-subtle rounded-3xl p-6 md:p-8 shadow-2xl relative">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Performance Trajectory</h3>
                      <div className="relative group">
                        <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="bg-surface-elevated border border-border-subtle rounded-xl px-4 py-2 text-[10px] font-black uppercase text-primary outline-none hover:border-primary transition-all cursor-pointer pr-10">
                          <option value="ALL">Show All Semesters</option>
                          {availableSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="bg-surface-elevated px-5 py-3 rounded-2xl border border-border-subtle flex flex-col items-center min-w-[120px]">
                       <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Period {valueLabel}</p>
                       <p className="text-xl font-black text-text-primary">{displayCgpa}</p>
                    </div>
                  </div>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trajectoryData}>
                        <defs>
                          <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="var(--primary-accent)" stopOpacity={0.8}/><stop offset="95%" stopColor="var(--primary-accent)" stopOpacity={0.4}/></linearGradient>
                          <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/><stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)', opacity: 0.4}} content={<CustomTrajectoryTooltip valueLabel={valueLabel} />} />
                        <Bar dataKey="val" name={valueLabel} radius={[6, 6, 0, 0]} barSize={trajectoryData.length > 4 ? 30 : 50}>
                          {trajectoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name.includes('Semester') || entry.name.startsWith('Sem') ? 'url(#colorGreen)' : 'url(#colorBar)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {selectedSemester !== 'ALL' && subjectWiseData.length > 0 && (
                  <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-border-subtle bg-black/5"><h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Subject Performance Matrix</h3><p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Detailed Score Breakdown for {selectedSemester}</p></div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {subjectWiseData.map((item, idx) => (
                        <div key={idx} className="bg-surface-elevated border border-border-subtle rounded-3xl p-5 group hover:border-primary/30 transition-all">
                          <div className="flex justify-between items-start mb-4"><div className="min-w-0 flex-1"><p className="text-xs font-black text-text-primary uppercase truncate tracking-tight group-hover:text-primary transition-colors">{item.subject}</p></div></div>
                          <div className="grid grid-cols-3 gap-3">
                            <SubjectScore label="Internal 1" score={item.i1} />
                            <SubjectScore label="Internal 2" score={item.i2} />
                            <SubjectScore label="Semester" score={item.es} highlight />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-border-subtle bg-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div><h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Academic history & transcript</h3><p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Comprehensive Performance Ledger</p></div>
                  </div>
                  <div className="p-6 space-y-12 max-h-[800px] overflow-y-auto custom-scrollbar">
                    {Object.keys(organizedTranscript).length === 0 ? (
                      <div className="py-24 text-center border-4 border-dashed border-border-subtle rounded-[3rem]"><p className="text-text-muted font-black uppercase tracking-[0.2em]">No records published</p></div>
                    ) : (
                      Object.entries(organizedTranscript).reverse().map(([year, cycles]) => (
                        <div key={year} className="space-y-6 relative pl-6">
                          <div className="absolute left-0 top-2 bottom-0 w-px bg-gradient-to-b from-primary/50 to-transparent"></div>
                          <div className="flex items-center gap-3 -ml-[7px]"><div className="w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/10"></div><h4 className="text-primary font-black text-xs uppercase tracking-[0.2em]">Academic Year: {year}</h4></div>
                          <div className="space-y-8">
                            {Object.entries(cycles).map(([batchName, marks]) => (
                              <div key={batchName} className="space-y-4">
                                <div className="flex items-center justify-between border-b border-border-subtle pb-2"><h5 className="text-text-primary font-black text-[11px] uppercase tracking-widest flex items-center gap-2"><span className={`w-1.5 h-4 rounded-full ${batchName.includes('End Sem') ? 'bg-purple-500' : 'bg-emerald-500'}`}></span>{batchName}</h5><span className="text-[9px] font-bold text-text-muted uppercase">{marks.length} Subjects</span></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {marks.map(mark => (
                                    <div key={mark.id} className="bg-surface-elevated border border-border-subtle rounded-2xl p-4 group hover:border-primary/30 transition-all flex items-center justify-between">
                                      <div className="min-w-0"><p className="text-[11px] font-black text-text-primary uppercase tracking-tight truncate group-hover:text-primary transition-colors">{mark.subject}</p><p className="text-[8px] text-text-muted font-bold uppercase tracking-widest mt-0.5">Scale: 0 - {mark.maxMarks}</p></div>
                                      <div className="flex items-center gap-4 shrink-0"><p className={`text-xl font-black ${(mark.marks / mark.maxMarks) >= 0.8 ? 'text-emerald-400' : (mark.marks / mark.maxMarks) >= 0.5 ? 'text-amber-400' : 'text-rose-500'}`}>{mark.marks}</p><div className={`w-1 h-8 rounded-full ${(mark.marks / mark.maxMarks) >= 0.8 ? 'bg-emerald-500' : (mark.marks / mark.maxMarks) >= 0.5 ? 'bg-amber-500' : 'bg-rose-500'}`}></div></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-surface-component border border-border-subtle rounded-2xl p-6 flex flex-col shadow-2xl h-fit sticky top-8">
                <div className="flex items-center justify-between mb-6"><h3 className="text-text-primary font-bold">Green AI Advisor</h3><button onClick={handleAiAnalysis} disabled={loadingAnalysis} className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all disabled:opacity-50"><svg className={`w-5 h-5 ${loadingAnalysis ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></button></div>
                <div className="flex-1 space-y-4">
                  {analysis ? (
                    <><div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle"><div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-text-muted uppercase">Impact Rating</span><span className="text-emerald-400 font-bold">{analysis.greenImpactRating}/10</span></div><p className="text-sm text-text-primary italic">"{analysis.summary}"</p></div><div><h4 className="text-xs font-bold text-text-muted uppercase mb-2">Recommendations</h4><ul className="space-y-2">{analysis.suggestions.map((s: string, i: number) => (<li key={i} className="flex items-start space-x-2 text-xs text-text-muted"><span className="text-emerald-500 mt-0.5">•</span><span>{s}</span></li>))}</ul></div></>
                  ) : (<div className="h-full flex flex-col items-center justify-center text-center px-4 py-12"><div className="w-12 h-12 bg-surface-elevated rounded-full flex items-center justify-center text-text-muted mb-4"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg></div><p className="text-text-muted text-sm">Analyze current scores for academic guidance.</p></div>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RESOURCES' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
             <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                   <div className="space-y-2">
                      <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Institutional Resource Library</h2>
                      <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em]">Authorized curriculum modules & materials</p>
                   </div>
                   <div className="bg-surface-elevated px-8 py-5 rounded-[1.5rem] border border-border-subtle text-center min-w-[200px]">
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Assigned Division</p>
                      <p className="text-sm font-black text-primary uppercase">{user?.department || 'Registry TBD'}</p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 gap-6">
                {!studentCourse ? (
                  <div className="py-24 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                     <p className="text-text-muted font-black uppercase tracking-[0.2em]">Registry data pending authorization</p>
                  </div>
                ) : (
                  Array.from({ length: studentCourse.batchType === 'UG' ? 8 : 4 }).map((_, sIdx) => {
                    const semNum = sIdx + 1;
                    const semSubjects = studentCourse.subjects.filter(s => s.semester === semNum);
                    const isExpanded = expandedSemester === semNum;
                    
                    return (
                      <div key={semNum} className="space-y-4">
                         <button 
                           onClick={() => setExpandedSemester(isExpanded ? null : semNum)}
                           className={`w-full p-8 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group ${isExpanded ? 'bg-surface-component border-primary/30' : 'bg-surface-component/40 border-border-subtle hover:border-primary/20'}`}
                         >
                            <div className="flex items-center gap-6">
                               <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${isExpanded ? 'bg-primary text-white' : 'bg-surface-elevated text-text-muted border border-border-subtle'}`}>
                                 {semNum}
                               </div>
                               <div className="text-left">
                                  <h4 className="text-text-primary font-black text-xl uppercase tracking-tighter">Semester {semNum}</h4>
                                  <p className="text-text-muted text-[9px] font-black uppercase tracking-widest mt-1">{semSubjects.length} Authorized Units</p>
                               </div>
                            </div>
                            <svg className={`w-6 h-6 text-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                         </button>

                         {isExpanded && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 animate-in slide-in-from-top-4 duration-300">
                             {semSubjects.length === 0 ? (
                               <div className="col-span-2 py-10 bg-surface-elevated/20 border border-dashed border-border-subtle rounded-3xl text-center">
                                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">No curriculum authorized for this period</p>
                               </div>
                             ) : (
                               semSubjects.map(subj => {
                                 const isSubjExpanded = expandedSubject === subj.id;
                                 return (
                                   <div key={subj.id} className="bg-surface-component border border-border-subtle rounded-[2rem] overflow-hidden group/subj hover:border-primary/20 transition-all">
                                      <button 
                                        onClick={() => setExpandedSubject(isSubjExpanded ? null : subj.id)}
                                        className="w-full p-6 flex items-center justify-between hover:bg-black/[0.02] transition-all"
                                      >
                                         <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-1.5 h-10 rounded-full bg-primary group-hover/subj:h-12 transition-all"></div>
                                            <div className="text-left min-w-0">
                                               <p className="text-text-primary font-black text-sm uppercase truncate tracking-tight">{subj.name}</p>
                                               <p className="text-[9px] text-text-muted font-mono tracking-widest mt-0.5">{subj.code} • {subj.credits} Credits</p>
                                            </div>
                                         </div>
                                         <svg className={`w-4 h-4 text-text-muted transition-transform ${isSubjExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                      </button>

                                      {isSubjExpanded && (
                                        <div className="p-4 bg-surface-elevated/40 border-t border-border-subtle space-y-6 animate-in fade-in duration-200">
                                           {/* Module Resources */}
                                           <div className="space-y-3">
                                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 pb-2">Institutional Modules</p>
                                              {Array.from({ length: subj.lessonsCount }).map((_, lIdx) => {
                                                const material = subj.materials?.[lIdx];
                                                const lessonName = subj.lessonNames?.[lIdx] || `Module ${lIdx + 1}`;
                                                return (
                                                  <div key={lIdx} className="flex items-center justify-between p-3 bg-surface-component/50 rounded-xl border border-white/5 group/lesson">
                                                     <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-black text-text-muted w-5">{lIdx + 1}</span>
                                                        <p className="text-[11px] font-black text-text-primary uppercase tracking-tight truncate max-w-[180px]">{lessonName}</p>
                                                     </div>
                                                     {material ? (
                                                       <button 
                                                         onClick={() => alert(`Accessing Secure Resource: ${material}`)}
                                                         className="px-3 py-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                       >
                                                         View Material
                                                       </button>
                                                     ) : (
                                                       <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Pending Upload</span>
                                                     )}
                                                  </div>
                                                );
                                              })}
                                           </div>

                                           {/* Question Papers */}
                                           {subj.questionPapers && subj.questionPapers.length > 0 && (
                                              <div className="space-y-3 pt-2">
                                                 <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest border-b border-emerald-500/10 pb-2">Question Repository</p>
                                                 {subj.questionPapers.map((qp, qIdx) => (
                                                   <div key={qIdx} className="flex items-center justify-between p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 group/qp">
                                                      <div className="flex items-center gap-3">
                                                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                                         <p className="text-[11px] font-black text-emerald-400 uppercase tracking-tight truncate max-w-[180px]">{qp.name}</p>
                                                      </div>
                                                      <button 
                                                        onClick={() => alert(`Accessing Archive Paper: ${qp.file}`)}
                                                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg active:scale-95"
                                                      >
                                                        Access Paper
                                                      </button>
                                                   </div>
                                                 ))}
                                              </div>
                                           )}
                                        </div>
                                      )}
                                   </div>
                                 );
                               })
                             )}
                           </div>
                         )}
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        )}

        {activeTab === 'SCHEDULE' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10">
            <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -ml-40 -mt-40"></div>
                <div className="relative z-10">
                   <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Active daily schedule</h2>
                   <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Authorized faculty hourly registry</p>
                </div>
            </div>

            {!timetable ? (
              <div className="py-32 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                 <p className="text-text-muted font-black uppercase tracking-[0.2em]">No schedule authorized for your cohort</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {timetable.assignments.map((assign, idx) => {
                  const faculty = allUsers.find(u => u.id === assign.staffId);
                  return (
                    <div key={idx} className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl hover:border-primary/20 transition-all group">
                       <div className="flex items-center justify-between mb-8">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 border border-border-subtle flex items-center justify-center text-primary font-black text-xs">
                             {assign.hour}
                          </div>
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{HOUR_LABELS[idx]}</span>
                       </div>
                       
                       {faculty ? (
                         <div className="space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xl shadow-lg">
                               {faculty.name[0]}
                            </div>
                            <div className="min-w-0">
                               <p className="text-sm font-black text-text-primary uppercase truncate tracking-tight">{faculty.name}</p>
                               <p className="text-[9px] text-primary font-black uppercase tracking-widest mt-1">{faculty.designation || 'Faculty'}</p>
                            </div>
                         </div>
                       ) : (
                         <div className="py-6 border-2 border-dashed border-border-subtle rounded-3xl flex items-center justify-center">
                            <p className="text-[10px] text-text-muted font-black uppercase italic tracking-widest">No Assignment</p>
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const SubjectScore: React.FC<{ label: string; score: number; highlight?: boolean }> = ({ label, score, highlight }) => (
  <div className={`p-3 rounded-2xl flex flex-col items-center justify-center border ${highlight ? 'bg-primary/10 border-primary/20' : 'bg-surface-component border-border-subtle'}`}>
    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1 truncate w-full text-center">{label}</p>
    <p className={`text-sm font-black ${highlight ? 'text-primary' : 'text-text-muted'}`}>{score || '--'}</p>
    <div className="w-full h-1 bg-black/5 rounded-full mt-2 overflow-hidden"><div className={`h-full transition-all duration-700 ${highlight ? 'bg-primary' : 'bg-text-muted'}`} style={{ width: `${score}%` }} /></div>
  </div>
);

const DetailItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-text-primary' }) => (<div><p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p><p className={`text-sm font-black uppercase tracking-tight ${color}`}>{value}</p></div>);
const MetricCard: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (<div className="bg-surface-component border border-border-subtle rounded-2xl p-6 relative overflow-hidden group"><div className={`absolute top-0 right-0 w-24 h-24 ${color} opacity-10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500`}></div><p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">{label}</p><p className="text-3xl font-bold text-text-primary">{value}</p></div>);

export default StudentDashboard;
