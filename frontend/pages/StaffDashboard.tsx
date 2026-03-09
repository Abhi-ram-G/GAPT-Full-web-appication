
import React, { useContext, useMemo, useState, useEffect } from 'react';
// Corrected: Split imports to fix "no exported member" errors
import { useNavigate } from 'react-router';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { UserRole, User, AcademicTask, TaskPriority, TaskStatus } from '../types';

const StaffDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [studentStats, setStudentStats] = useState<Record<string, any>>({});
  const [studentSearch, setStudentSearch] = useState('');
  const [allTasks, setAllTasks] = useState<AcademicTask[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [allUsers, tasks] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getTasks()
      ]);

      const filtered = allUsers.filter(u => u.role === UserRole.STUDENT);
      setStudents(filtered);
      setAllTasks(tasks);

      const stats: Record<string, any> = {};
      await Promise.all(filtered.map(async (s) => {
        const data = await ApiService.getAcademicData(s.id);
        const totalDays = 60;
        const present = Math.round((data.attendance / 100) * totalDays);
        const absent = totalDays - present;
        stats[s.id] = { present, absent, data };
      }));
      setStudentStats(stats);
    };
    fetchData();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.regNo?.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const menteesCount = useMemo(() => {
    return students.filter(s => s.department?.split(' (')[0] === user?.department?.split(' (')[0]).length;
  }, [students, user]);

  const deptName = user?.department?.split(' (')[0] || 'Faculty of Engineering';
  const degreeName = user?.department?.split('(')[1]?.replace(')', '') || 'PHD / M.E';
  const joiningBatch = user?.createdAt ? new Date(user.createdAt).getFullYear() : '2024';

  const openStudentDetail = (student: User) => {
    setSelectedStudent(student);
  };

  const closeStudentDetail = () => {
    setSelectedStudent(null);
  };

  const getStudentTasks = (student: User) => {
    return allTasks.filter(t => t.department === student.department && t.studyYear === student.studyYear);
  };

  return (
    <DashboardLayout title="Staff Classroom Portal">
      <div className="space-y-8 pb-20">
        <div className="bg-surface-elevated border border-border-subtle rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-700"></div>
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 flex flex-col items-center justify-center text-center p-6 bg-surface-deep rounded-3xl border border-border-subtle shadow-inner">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black text-3xl md:text-4xl mb-4 shadow-2xl border-4 border-surface-elevated">
                {(user?.name?.[0] || '?').toUpperCase()}
              </div>
              <h2 className="text-text-primary font-black text-lg md:text-xl uppercase tracking-tighter leading-tight">{user?.name}</h2>
              <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mt-1">Staff Faculty Profile</p>
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <DetailItem label="Department" value={deptName} />
                <DetailItem label="Highest Degree" value={degreeName} />
                <DetailItem label="Joining Batch" value={joiningBatch.toString()} />
              </div>
              <div className="space-y-4">
                <DetailItem label="Designation" value={user?.designation || 'Assistant Professor'} color="text-emerald-500" />
                <DetailItem label="Teaching Experience" value={user?.experience || '8+ Years'} />
              </div>
              <div className="bg-surface-deep p-6 rounded-[2rem] border border-border-subtle flex flex-col justify-center items-center text-center shadow-inner relative">
                <div className="absolute top-4 right-4">
                  <div className="relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="22" className="stroke-border-subtle" strokeWidth="4" fill="transparent" />
                      <circle cx="28" cy="28" r="22" className="stroke-emerald-500 transition-all duration-1000 ease-out" strokeWidth="4" fill="transparent" strokeDasharray="138.23" strokeDashoffset="2.76" strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-[9px] md:text-[10px] font-black text-text-primary">98%</span>
                  </div>
                  <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mt-1 text-center">Attendance</p>
                </div>
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2">Assigned Mentees</p>
                <p className="text-3xl md:text-4xl font-black text-text-primary">{menteesCount}</p>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
            <button onClick={() => navigate(`/profile/${user?.id}`)} className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] hover:text-text-primary transition-colors">View Full Profile</button>
            <button onClick={() => navigate(`/profile/${user?.id}`)} className="w-10 h-10 rounded-2xl bg-surface-deep border border-border-subtle flex items-center justify-center text-text-muted hover:text-primary transition-all shadow-xl active:scale-90">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="p-6 bg-surface-elevated border border-border-subtle rounded-3xl shadow-sm flex flex-col items-center md:items-start text-center md:text-left">
            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">Class Strength</p>
            <p className="text-3xl font-black text-text-primary tracking-tighter">{students.length}</p>
          </div>
          <div className="p-6 bg-surface-elevated border border-border-subtle rounded-3xl shadow-sm flex flex-col items-center md:items-start text-center md:text-left">
            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">Pending Attendance</p>
            <p className="text-3xl font-black text-text-primary tracking-tighter">0</p>
          </div>
          <div className="p-6 bg-surface-elevated border border-border-subtle rounded-3xl shadow-sm sm:col-span-2 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">Evaluations Done</p>
            <p className="text-3xl font-black text-text-primary tracking-tighter">0%</p>
          </div>
        </div>

        <div className="bg-surface-elevated border border-border-subtle rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">Class List</h3>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Monitor students and their institutional progress</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-12 py-3.5 text-xs text-text-primary outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-text-muted/50 font-bold"
                />
                <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/staff/task-registry?action=add')}
                  className="flex-1 sm:flex-none bg-surface-deep hover:bg-surface-component text-text-primary border border-border-subtle px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                  Add Task
                </button>
                <button
                  onClick={() => navigate('/email?compose=true')}
                  className="p-3.5 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                  title="Compose Email"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                </button>
                <button
                  onClick={() => navigate('/staff/attendance')}
                  className="flex-1 sm:flex-none bg-primary hover:opacity-90 text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-primary/20 active:scale-95"
                >
                  Mark Attendance
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredStudents.map((student) => {
              const academic = studentStats[student.id]?.data || { cgpa: 0 };
              return (
                <div key={student.id} onClick={() => openStudentDetail(student)} className="p-6 bg-surface-deep/50 rounded-[1.5rem] md:rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-surface-component transition-all cursor-pointer border border-border-subtle hover:border-primary/30 shadow-sm gap-4">
                  <div className="flex items-center space-x-6">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-text-muted font-black text-lg md:text-xl group-hover:bg-primary group-hover:text-white transition-colors shadow-inner">
                      {student.name[0]}
                    </div>
                    <div>
                      <p className="text-text-primary font-black uppercase text-sm md:text-base tracking-tight group-hover:text-primary transition-colors">{student.name}</p>
                      <p className="text-[9px] md:text-[10px] text-text-muted font-mono tracking-widest mt-1 uppercase break-all">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-6 md:space-x-10">
                    <div className="text-right">
                      <p className="text-[8px] text-text-muted uppercase font-black tracking-widest mb-1">Academic CGPA</p>
                      <p className="text-base md:text-lg font-black text-text-primary">{(academic.cgpa || 0).toFixed(2)}</p>
                    </div>
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-surface-elevated group-hover:bg-primary group-hover:text-white text-text-muted rounded-2xl flex items-center justify-center transition-all border border-border-subtle shadow-inner group-hover:rotate-12">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {selectedStudent && (() => {
        const stats = studentStats[selectedStudent.id] || { present: 0, absent: 0, data: { cgpa: 0, credits: 0 } };
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-in fade-in duration-300">
            <div className="bg-surface-elevated border border-border-subtle w-full max-w-2xl rounded-[2.5rem] md:rounded-[3rem] shadow-2xl relative overflow-hidden p-8 md:p-10 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={closeStudentDetail} className="absolute top-6 md:top-8 right-6 md:right-8 text-text-muted hover:text-text-primary transition-colors z-20 w-10 h-10 bg-surface-deep border border-border-subtle rounded-xl flex items-center justify-center shadow-inner">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mb-10 md:mb-12">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-[2rem] md:rounded-[2.5rem] bg-primary flex items-center justify-center text-white text-4xl md:text-5xl font-black shadow-xl shadow-primary/20">{selectedStudent.name[0]}</div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-black text-text-primary uppercase tracking-tighter mb-2">{selectedStudent.name}</h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="text-[9px] md:text-[10px] font-black bg-primary/10 text-primary px-4 py-1.5 rounded-full border border-primary/20 tracking-widest uppercase">ID: {selectedStudent.regNo}</span>
                    <span className="text-[9px] md:text-[10px] font-black bg-surface-deep text-text-muted px-4 py-1.5 rounded-full border border-border-subtle tracking-widest uppercase">{selectedStudent.department}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 mb-10 md:mb-12">
                <div className="space-y-6">
                  <h4 className="text-[10px] md:text-[11px] font-black text-text-muted uppercase tracking-[0.3em] border-b border-border-subtle pb-4">Audit analytics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 md:p-6 rounded-3xl shadow-sm">
                      <p className="text-[8px] md:text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Present</p>
                      <p className="text-3xl md:text-4xl font-black text-text-primary tracking-tighter">{stats.present}</p>
                    </div>
                    <div className="bg-rose-500/5 border border-rose-500/10 p-5 md:p-6 rounded-3xl shadow-sm">
                      <p className="text-[8px] md:text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1">Absent</p>
                      <p className="text-3xl md:text-4xl font-black text-text-primary tracking-tighter">{stats.absent}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] md:text-[11px] font-black text-text-muted uppercase tracking-[0.3em] border-b border-border-subtle pb-4">Academic matrix</h4>
                  <div className="space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center bg-surface-deep p-4 rounded-2xl border border-border-subtle"><span className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-widest">Global CGPA</span><span className="text-xl md:text-2xl font-black text-text-primary tracking-tighter">{(stats.data?.cgpa || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between items-center bg-surface-deep p-4 rounded-2xl border border-border-subtle"><span className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-widest">Paperless Credits</span><span className="text-xl md:text-2xl font-black text-primary tracking-tighter">{stats.data?.credits || 0}</span></div>
                  </div>
                </div>
              </div>

              <div className="mt-10 md:mt-12 flex justify-end">
                <button onClick={() => navigate(`/profile/${selectedStudent.id}`)} className="w-full sm:w-auto px-10 py-4 bg-primary text-white font-black uppercase text-[9px] md:text-[10px] tracking-[0.3em] rounded-2xl shadow-xl active:scale-95 transition-all">Go to Full Profile</button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
};

const DetailItem: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-text-primary' }) => (
  <div>
    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-sm font-black uppercase tracking-tight ${color}`}>{value}</p>
  </div>
);

export default StaffDashboard;
