
import React, { useState, useEffect, useContext, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { User, UserRole, Course, AcademicBatch, Feature, AccessLevel } from '../types';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

const StudentPerformanceTracker: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);

  // Data State
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [performanceData, setPerformanceData] = useState<Record<string, any>>({});

  // Selection State
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>(STUDY_YEARS[0]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const [u, c] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getCurriculum()
      ]);

      setCourses(c);
      const allStudents = u.filter(usr => usr.role === UserRole.STUDENT);
      setStudents(allStudents);

      // Role-based scoping for Department selection
      const deptBase = user?.department;
      if (currentView === UserRole.ADMIN || currentView === UserRole.DEAN) {
        if (c.length > 0) setSelectedDept(`${c[0].name} (${c[0].degree})`);
      } else if (deptBase) {
        setSelectedDept(deptBase);
      }

      setIsLoading(false);
    };
    init();
  }, [user, currentView]);

  const availableDepts = useMemo(() => {
    if (currentView === UserRole.ADMIN || currentView === UserRole.DEAN) {
      return courses.map(c => `${c.name} (${c.degree})`);
    }
    return courses
      .filter(c => `${c.name} (${c.degree})` === user?.department)
      .map(c => `${c.name} (${c.degree})`);
  }, [courses, user, currentView]);

  const filteredStudents = useMemo(() => {
    return students.filter(s =>
      s.department === selectedDept &&
      s.studyYear === selectedYear &&
      (searchQuery === '' || s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.regNo?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [students, selectedDept, selectedYear, searchQuery]);

  // Fetch student performance when one is selected
  useEffect(() => {
    const fetchPerf = async () => {
      if (selectedStudentId) {
        const matrix = await ApiService.getStudentPerformanceMatrix(selectedStudentId);
        const academic = await ApiService.getAcademicData(selectedStudentId);
        setPerformanceData({ matrix, academic });
      }
    };
    fetchPerf();
  }, [selectedStudentId]);

  const selectedStudentProfile = useMemo(() => {
    return students.find(s => s.id === selectedStudentId);
  }, [selectedStudentId, students]);

  if (isLoading) {
    return (
      <DashboardLayout title="Performance Tracker">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bridging Academic Registry...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Institutional Performance Auditor">
      <div className="max-w-7xl mx-auto space-y-10 pb-24">

        {/* Filter Section */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
          <div className="relative z-10 grid grid-cols-1 xl:grid-cols-3 gap-8 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Registry Division</label>
              <select
                value={selectedDept}
                onChange={e => { setSelectedDept(e.target.value); setSelectedStudentId(''); }}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                {availableDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Year</label>
              <div className="bg-slate-950 p-1 rounded-2xl border border-white/10 shadow-inner flex overflow-x-auto no-scrollbar">
                {STUDY_YEARS.map(y => (
                  <button
                    key={y}
                    onClick={() => { setSelectedYear(y); setSelectedStudentId(''); }}
                    className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === y ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Search Database</label>
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Search by name or reg no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-12 py-4 text-sm text-white focus:outline-none focus:border-primary transition-all placeholder:text-slate-700 font-bold shadow-inner"
                />
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Student List */}
        {!selectedStudentId && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredStudents.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl hover:border-primary/40 group transition-all text-left relative overflow-hidden"
              >
                <div className="flex items-center gap-5 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-border-subtle flex items-center justify-center text-primary font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                    {s.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black text-text-primary uppercase truncate tracking-tight group-hover:text-primary transition-colors">{s.name}</h4>
                    <p className="text-[10px] text-text-muted font-mono tracking-widest mt-1 uppercase">{s.regNo}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Open Audit</span>
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </div>
                </div>
              </button>
            ))}
            {filteredStudents.length === 0 && (
              <div className="col-span-full py-24 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                <p className="text-text-muted font-black uppercase tracking-[0.2em] text-xs">Zero records found for current criteria</p>
              </div>
            )}
          </div>
        )}

        {/* Detailed Performance View */}
        {selectedStudentId && selectedStudentProfile && performanceData.matrix && (
          <div className="animate-in zoom-in-95 duration-500 space-y-10">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedStudentId('')}
                className="flex items-center gap-3 px-6 py-3 bg-surface-component border border-border-subtle rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-muted hover:text-primary transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Back to Members
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Global CGPA</p>
                  <p className="text-2xl font-black text-primary leading-none">{(performanceData.academic?.cgpa || 0).toFixed(2)}</p>
                </div>
                <div className="w-px h-8 bg-white/5"></div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Attendance</p>
                  <p className="text-2xl font-black text-emerald-500 leading-none">{performanceData.academic?.attendance || 0}%</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-10 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
              <div className="w-24 h-24 rounded-[2rem] bg-slate-950 border border-border-subtle flex items-center justify-center text-primary font-black text-4xl shadow-xl">
                {selectedStudentProfile.name[0]}
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-3xl font-black text-text-primary uppercase tracking-tighter leading-none">{selectedStudentProfile.name}</h3>
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mt-4">
                  <span className="text-primary text-[11px] font-mono font-bold tracking-widest uppercase">{selectedStudentProfile.regNo}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                  <span className="text-text-muted text-[10px] font-black uppercase tracking-widest">{selectedStudentProfile.department}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 text-center min-w-[200px]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Verification</p>
                <p className="text-lg font-black text-emerald-500 uppercase tracking-tight">System Authorized</p>
              </div>
            </div>

            <div className="space-y-12">
              {Object.entries(performanceData.matrix).reverse().map(([semName, subjects]: [string, any]) => (
                <div key={semName} className="space-y-6">
                  <div className="flex items-center gap-4 px-6">
                    <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(93,88,255,0.4)]"></div>
                    <h4 className="text-text-primary font-black text-2xl uppercase tracking-tighter">{semName} Matrix</h4>
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-slate-900 px-4 py-1.5 rounded-xl border border-white/5">{Object.keys(subjects).length} Logic Nodes</span>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    {Object.entries(subjects).map(([subject, scores]: [string, any]) => {
                      const isComplete = scores.es !== undefined;
                      const isPass = (scores.es || 0) >= 50;
                      return (
                        <div key={subject} className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 hover:bg-surface-elevated hover:border-primary/20 transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-10 group shadow-lg">
                          <div className="flex items-center gap-8 flex-1 min-w-0">
                            <div className={`w-2.5 h-16 rounded-full transition-all group-hover:h-20 ${isComplete ? (isPass ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-800'}`}></div>
                            <div className="min-w-0">
                              <h5 className="text-xl font-black text-text-primary uppercase truncate tracking-tight group-hover:text-primary transition-colors leading-tight">{subject}</h5>
                              <div className="flex items-center gap-4 mt-2">
                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Registry ID: {subject.substring(0, 4)}</span>
                                {isComplete && (
                                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${isPass ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>{isPass ? 'PASS' : 'ARREAR'}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6 md:min-w-[500px]">
                            <AuditPillar label="IA 1" value={scores.i1} />
                            <AuditPillar label="IA 2" value={scores.i2} />
                            <AuditPillar label="End Sem" value={scores.es} highlight />
                          </div>

                          <div className="bg-slate-950/40 p-8 rounded-[2rem] border border-white/5 text-center min-w-[160px] flex flex-col justify-center shadow-inner group-hover:bg-slate-950 transition-colors">
                            <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2">Total Yield</p>
                            <p className={`text-3xl font-black ${isComplete ? (isPass ? 'text-emerald-400' : 'text-rose-500') : 'text-slate-700'}`}>
                              {scores.es ? `${((scores.es / scores.max) * 100).toFixed(0)}%` : '--'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(performanceData.matrix).length === 0 && (
                <div className="py-24 text-center border-4 border-dashed border-border-subtle rounded-[3.5rem] bg-black/10">
                  <p className="text-text-muted font-black uppercase tracking-[0.2em] text-xs">No academic records published for this identity in the Python Registry</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

const AuditPillar: React.FC<{ label: string; value?: number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`p-5 rounded-3xl border text-center transition-all ${highlight ? 'bg-primary/10 border-primary/20 scale-105 shadow-xl' : 'bg-slate-950/40 border-border-subtle'}`}>
    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-2 truncate">{label}</p>
    <p className={`text-2xl font-black ${value !== undefined ? (highlight ? 'text-primary' : 'text-text-primary') : 'text-slate-800'}`}>
      {value ?? '--'}
    </p>
    {value !== undefined && (
      <div className="w-full h-1 bg-black/10 rounded-full mt-3 overflow-hidden">
        <div className={`h-full transition-all duration-1000 ${highlight ? 'bg-primary' : 'bg-slate-700'}`} style={{ width: `${value}%` }}></div>
      </div>
    )}
  </div>
);

export default StudentPerformanceTracker;
