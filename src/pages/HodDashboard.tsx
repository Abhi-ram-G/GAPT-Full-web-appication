
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store';
import { UserRole, UserStatus, User, AttendanceRecord, Subject, Course } from '@/types';

const HodDashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [deptStudentsWithAcademic, setDeptStudentsWithAcademic] = useState<any[]>([]);
  const [deptStaffWithDetails, setDeptStaffWithDetails] = useState<any[]>([]);

  const refreshData = async () => {
    const u = await MockDB.getUsers();
    const a = await MockDB.getAttendance(); // Get all to calculate historical %
    const c = await MockDB.getCurriculum();

    setUsers(u);
    setAttendance(a);
    setCurriculum(c);

    const deptBase = user?.department?.split(' (')[0] || '';

    // Enrich Students
    const filteredStudents = u.filter(usr => usr.role === UserRole.STUDENT && usr.department?.startsWith(deptBase) && usr.status === UserStatus.APPROVED);
    const enrichedStudents = [];
    for (const s of filteredStudents) {
      const academic = await MockDB.getAcademicData(s.id);
      enrichedStudents.push({ ...s, academic });
    }
    setDeptStudentsWithAcademic(enrichedStudents.sort((a, b) => b.academic.cgpa - a.academic.cgpa));

    // Enrich Staff
    const filteredStaff = u.filter(usr => usr.role === UserRole.STAFF && usr.department?.startsWith(deptBase) && usr.status === UserStatus.APPROVED);
    const enrichedStaff = filteredStaff.map(staff => {
      const staffRecords = a.filter(rec => rec.userId === staff.id);
      const totalDays = staffRecords.length || 1;
      const presentDays = staffRecords.filter(r => r.isPresent).length;
      const attendancePct = staffRecords.length === 0 ? 100 : Math.round((presentDays / totalDays) * 100);

      // Find assigned subjects across all courses
      const assignedSubjects: string[] = [];
      c.forEach(course => {
        course.subjects.forEach(subj => {
          if (subj.assignedStaffIds?.includes(staff.id)) {
            assignedSubjects.push(subj.code);
          }
        });
      });

      return { ...staff, attendancePct, assignedSubjects };
    });
    setDeptStaffWithDetails(enrichedStaff.sort((a, b) => (parseInt(b.experience || '0')) - (parseInt(a.experience || '0'))));
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const deptBase = useMemo(() => user?.department?.split(' (')[0] || '', [user]);
  const deptCourse = useMemo(() => curriculum.find(c => c.name.startsWith(deptBase)), [curriculum, deptBase]);

  const isSubjectComplete = (subj: Subject) =>
    subj.materials && subj.materials.length === subj.lessonsCount && subj.materials.every(m => !!m);

  return (
    <DashboardLayout title="Departmental Leadership Portal">
      <div className="space-y-8 pb-20">

        {/* Header Stats */}
        <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white text-3xl font-black shadow-xl">{deptBase[0] || 'D'}</div>
              <div>
                <h2 className="text-text-primary font-black text-2xl uppercase tracking-tighter">{deptBase || 'Department'}</h2>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">HOD: {user?.name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <HeaderStat label="Faculty" value={deptStaffWithDetails.length} />
              <HeaderStat label="Students" value={deptStudentsWithAcademic.length} />
              <HeaderStat label="Avg CGPA" value={(deptStudentsWithAcademic.reduce((acc, s) => acc + s.academic.cgpa, 0) / (deptStudentsWithAcademic.length || 1)).toFixed(2)} color="text-primary" />
              <HeaderStat label="Units" value={deptCourse?.subjects.length || 0} color="text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Operations Hub Quick Access */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <QuickActionCard
            label="Staff Hour Assignment"
            desc="Manage hourly faculty scheduling for each academic year."
            onClick={() => navigate('/staff/assignments')}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>}
          />
          <QuickActionCard
            label="Curriculum Audit"
            desc="Review material upload completion across all department units."
            onClick={() => navigate('/admin/departments')}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>}
          />
          <QuickActionCard
            label="Member Registry"
            desc="Access and manage department identities and credentials."
            onClick={() => navigate('/admin/users')}
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>}
          />
        </div>

        {/* Curriculum & Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-surface-component border border-border-subtle rounded-3xl p-6 shadow-xl">
            <h3 className="text-text-primary font-black text-xl lowercase tracking-tight mb-6">Curriculum Integrity</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {deptCourse?.subjects.map(s => {
                const complete = isSubjectComplete(s);
                return (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-surface-elevated/50 rounded-2xl border border-border-subtle group">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-10 rounded-full ${complete ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-surface-component border border-border-subtle'}`}></div>
                      <div><p className="text-xs font-black text-text-primary uppercase">{s.name}</p><p className="text-[9px] text-text-muted font-mono">{s.code}</p></div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${complete ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-component text-text-muted'}`}>{complete ? 'Ready' : 'Pending'}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-surface-component border border-border-subtle rounded-3xl p-6 shadow-xl">
            <h3 className="text-text-primary font-black text-xl lowercase tracking-tight mb-6">Student Rankings</h3>
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              {deptStudentsWithAcademic.map((student, index) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-surface-elevated/50 rounded-2xl border border-border-subtle group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-surface-deep text-text-muted flex items-center justify-center font-black text-xs">{index + 1}</div>
                    <p className="text-sm font-black text-text-primary uppercase truncate">{student.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-[14px] font-black text-primary">{student.academic.cgpa.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Staff Intelligence Section */}
        <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-text-primary font-black text-2xl lowercase tracking-tight">Faculty Intelligence</h3>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Audit attendance & curriculum assignment</p>
            </div>
            <div className="bg-surface-elevated px-6 py-3 rounded-2xl border border-border-subtle flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">{deptStaffWithDetails.length} Educators Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {deptStaffWithDetails.map((staff) => (
              <div key={staff.id} className="bg-surface-elevated/50 border border-border-subtle rounded-[2rem] p-8 hover:bg-surface-elevated hover:border-primary/20 transition-all group flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="flex items-center gap-6 lg:w-1/4">
                  <div className="w-16 h-16 rounded-2xl bg-surface-component flex items-center justify-center text-primary font-black text-2xl shadow-inner border border-border-subtle group-hover:scale-105 transition-transform">
                    {staff.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-text-primary font-black text-lg uppercase truncate tracking-tight">{staff.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded border border-primary/20">{staff.designation || 'Faculty'}</span>
                      <span className="text-[8px] text-text-muted font-bold uppercase">{staff.experience || '8+'} Yrs Exp</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Curriculum Assignments</p>
                  <div className="flex flex-wrap gap-2">
                    {staff.assignedSubjects.length > 0 ? (
                      staff.assignedSubjects.map((s: string) => (
                        <span key={s} className="px-3 py-1 bg-surface-component border border-border-subtle rounded-lg text-[9px] font-black text-text-primary uppercase tracking-tighter">{s}</span>
                      ))
                    ) : (
                      <span className="text-[9px] text-text-muted font-bold uppercase italic">No units assigned</span>
                    )}
                  </div>
                </div>

                <div className="lg:w-1/4 flex flex-col items-end gap-3">
                  <div className="w-full">
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">Attendance Audit</span>
                      <span className={`text-xs font-black ${staff.attendancePct >= 85 ? 'text-emerald-500' : 'text-amber-500'}`}>{staff.attendancePct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${staff.attendancePct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                        style={{ width: `${staff.attendancePct}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-[8px] text-text-muted font-bold uppercase text-right">registry identification: {staff.email.split('@')[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const HeaderStat: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'text-text-primary' }) => (
  <div className="bg-surface-elevated/40 p-4 rounded-2xl border border-border-subtle flex flex-col items-center justify-center min-w-[100px]">
    <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);

const QuickActionCard: React.FC<{ label: string, desc: string, onClick: () => void, icon: React.ReactNode }> = ({ label, desc, onClick, icon }) => (
  <button
    onClick={onClick}
    className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] text-left hover:border-primary/40 hover:bg-surface-elevated transition-all group shadow-xl"
  >
    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">{icon}</div>
    <h4 className="text-text-primary font-black text-lg uppercase tracking-tight mb-2">{label}</h4>
    <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest leading-relaxed">{desc}</p>
  </button>
);

export default HodDashboard;
