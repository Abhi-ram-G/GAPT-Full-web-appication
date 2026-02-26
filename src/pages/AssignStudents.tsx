
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store';
import { User, UserRole, TaskStatus } from '@/types';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

interface StudentStats {
  attendance: number;
  tasks: {
    todo: number;
    progress: number;
    done: number;
  };
}

const AssignStudents: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'LIST' | 'ASSIGN'>('LIST');
  const [staff, setStaff] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [studentStats, setStudentStats] = useState<Record<string, StudentStats>>({});

  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [selectedYear, setSelectedYear] = useState(STUDY_YEARS[0]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const [allUsers, allTasks] = await Promise.all([
      MockDB.getUsers(),
      MockDB.getTasks()
    ]);

    const deptBase = user?.department?.split(' (')[0] || '';

    const deptStaff = allUsers.filter(u =>
      u.role !== UserRole.STUDENT &&
      u.department?.startsWith(deptBase) &&
      u.id !== user?.id
    );

    const deptStudents = allUsers.filter(u =>
      u.role === UserRole.STUDENT &&
      u.department?.startsWith(deptBase)
    );

    const stats: Record<string, StudentStats> = {};
    for (const s of deptStudents) {
      const academic = await MockDB.getAcademicData(s.id);
      const cohortTasks = allTasks.filter(t => t.department === s.department && t.studyYear === s.studyYear);

      stats[s.id] = {
        attendance: academic.attendance,
        tasks: {
          todo: cohortTasks.filter(t => t.status === TaskStatus.TODO).length,
          progress: cohortTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
          done: cohortTasks.filter(t => t.status === TaskStatus.COMPLETED).length
        }
      };
    }

    setStaff(deptStaff);
    setStudents(deptStudents);
    setStudentStats(stats);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.studyYear === selectedYear);
  }, [students, selectedYear]);

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleSave = async () => {
    if (!selectedStaffId || selectedStudentIds.length === 0) {
      alert("Mapping Error: Please select an authorized faculty member and at least one student.");
      return;
    }

    const faculty = staff.find(s => s.id === selectedStaffId);
    if (!faculty) return;

    // Passing empty strings for staff2 to remove M2 mapping
    await MockDB.assignStudentsToStaff(faculty.id, faculty.name, '', '', selectedStudentIds);

    setSaveStatus(`Registry Synchronized: ${selectedStudentIds.length} students mapped to [${faculty.name}].`);
    setSelectedStudentIds([]);

    const allUsers = await MockDB.getUsers();
    const deptBase = user?.department?.split(' (')[0] || '';
    setStudents(allUsers.filter(u => u.role === UserRole.STUDENT && u.department?.startsWith(deptBase)));

    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Mentorship Mapping">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Synchronizing Registry...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Institutional Mentorship Hub">
      <div className="max-w-7xl mx-auto space-y-10 pb-24">

        {/* Navigation Toggles */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setActiveTab('LIST')}
            className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === 'LIST' ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'}`}
          >
            Mentors Overview
          </button>
          <button
            onClick={() => setActiveTab('ASSIGN')}
            className={`px-10 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeTab === 'ASSIGN' ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'bg-surface-component text-text-muted border-border-subtle hover:text-text-primary'}`}
          >
            Registry Mapping
          </button>
        </div>

        {activeTab === 'LIST' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
            <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
              <div className="relative z-10">
                <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Departmental Mentors</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Audit faculty assignments and caseloads</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {staff.map(member => {
                const menteeCount = students.filter(s => s.mentorId === member.id).length;
                return (
                  <div
                    key={member.id}
                    onClick={() => navigate(`/hod/mentor/${member.id}`)}
                    className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl hover:border-primary/30 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-5 mb-8">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-slate-950 border border-border-subtle flex items-center justify-center text-primary font-black text-2xl group-hover:scale-105 transition-transform shadow-inner">
                        {member.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-lg font-black text-text-primary uppercase truncate tracking-tight group-hover:text-primary transition-colors">{member.name}</h4>
                        <p className="text-[9px] text-text-muted font-black uppercase tracking-widest mt-1">{member.designation || 'Faculty Member'}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-white/5 p-6 rounded-2xl text-center">
                      <p className="text-3xl font-black text-primary">{menteeCount}</p>
                      <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mt-1">Active Mentees</p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Auditing Enabled</span>
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:translate-x-1 transition-transform">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-10">
            {/* Configuration Panel */}
            <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
              <div className="relative z-10 space-y-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Mentorship assignment</h2>
                    <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Associate academic cohorts with an authorized faculty mentor</p>
                  </div>
                  <div className="bg-slate-950 p-1.5 rounded-2xl border border-border-subtle shadow-inner overflow-x-auto no-scrollbar flex shrink-0">
                    {STUDY_YEARS.map(year => (
                      <button
                        key={year}
                        onClick={() => { setSelectedYear(year); setSelectedStudentIds([]); }}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedYear === year ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="max-w-2xl">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Authorized Faculty Mentor</label>
                    <div className="relative">
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full bg-slate-950 border border-border-subtle rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer shadow-inner"
                      >
                        <option value="" disabled>Choose Mentor...</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.designation || 'Faculty'})</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Matrix Implementation */}
            <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-border-subtle bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-text-primary font-black text-2xl lowercase tracking-tight">student enrollment matrix</h3>
                  <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Select students to map to the chosen mentor</p>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="px-8 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-[10px] font-black uppercase text-text-muted hover:text-primary transition-all shadow-md"
                >
                  {selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0 ? 'DESELECT ALL' : 'SELECT ALL COHORT'}
                </button>
              </div>

              <div className="p-4 space-y-3">
                {filteredStudents.map(s => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  const stats = studentStats[s.id];
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleStudent(s.id)}
                      className={`w-full px-6 py-4 rounded-2xl border-2 transition-all cursor-pointer group flex flex-row items-center gap-6 shadow-sm hover:shadow-md ${isSelected ? 'bg-primary/5 border-primary/40 shadow-primary/5' : 'bg-surface-elevated/40 border-border-subtle hover:border-primary/20'}`}
                    >
                      {/* 1. Identity & Selection */}
                      <div className="flex items-center gap-5 min-w-[280px] flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all shrink-0 shadow-inner ${isSelected ? 'bg-primary text-white scale-105' : 'bg-slate-950 text-slate-700'}`}>
                          {isSelected ? <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg> : s.name[0]}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-text-primary uppercase truncate tracking-tight leading-tight group-hover:text-primary transition-colors">{s.name}</h4>
                          <p className="text-[9px] text-text-muted font-mono tracking-widest mt-0.5 uppercase">{s.regNo}</p>
                        </div>
                      </div>

                      {/* 2. Assigned Mentor */}
                      <div className="min-w-[320px] flex flex-col items-start border-x border-white/5 px-6">
                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-0.5">CURRENT MENTOR</p>
                        <p className={`text-[10px] font-black uppercase tracking-tighter truncate ${s.mentorName ? 'text-primary' : 'text-slate-600 italic'}`}>
                          {s.mentorName || 'NONE ASSIGNED'}
                        </p>
                      </div>

                      {/* 3. Attendance */}
                      <div className="min-w-[100px] text-center border-r border-white/5 pr-6">
                        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1">ATTENDANCE</p>
                        <p className={`text-sm font-black tracking-tight ${stats && stats.attendance >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {stats ? `${stats.attendance}%` : '---'}
                        </p>
                      </div>

                      {/* 4. Task Detail */}
                      <div className="min-w-[220px] flex items-center justify-end gap-6 pl-4">
                        {stats && (
                          <>
                            <div className="text-center">
                              <p className="text-xs font-black text-rose-500 leading-none">{stats.tasks.todo}</p>
                              <p className="text-[8px] text-text-muted font-black uppercase tracking-[0.1em] mt-1">PENDING</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-black text-blue-400 leading-none">{stats.tasks.progress}</p>
                              <p className="text-[8px] text-text-muted font-black uppercase tracking-[0.1em] mt-1">ONGOING</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-black text-emerald-400 leading-none">{stats.tasks.done}</p>
                              <p className="text-[8px] text-text-muted font-black uppercase tracking-[0.1em] mt-1">DONE</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <div className="py-24 text-center border-4 border-dashed border-border-subtle rounded-[2.5rem]">
                    <p className="text-text-muted font-black uppercase tracking-[0.3em] text-xs">Registry Empty for {selectedYear}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Authorization Action */}
            <div className="flex flex-col items-center gap-6">
              <button
                onClick={handleSave}
                disabled={!selectedStaffId || selectedStudentIds.length === 0}
                className="px-24 py-6 bg-primary hover:bg-indigo-500 text-white rounded-[2.5rem] font-black uppercase tracking-[0.5em] text-sm shadow-2xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-20"
              >
                COMMIT MENTOR REGISTRY
              </button>
              {saveStatus && (
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[1.5rem] text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] animate-in zoom-in-95 shadow-xl">
                  {saveStatus}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default AssignStudents;
