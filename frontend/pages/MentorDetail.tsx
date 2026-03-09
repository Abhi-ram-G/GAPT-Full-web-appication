
import React, { useState, useEffect, useContext, useMemo } from 'react';
// Split imports to ensure compatibility with react-router v7
import { useParams, useNavigate } from 'react-router';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { User, UserRole, TaskStatus } from '../types';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

interface StudentWithStats extends User {
  attendance: number;
  avgMark: number | null;
  tasks: {
    todo: number;
    progress: number;
    done: number;
  };
}

const MentorDetail: React.FC = () => {
  const { mentorId } = useParams<{ mentorId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [mentor, setMentor] = useState<User | null>(null);
  const [mentees, setMentees] = useState<StudentWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    if (!mentorId) return;
    setIsLoading(true);

    try {
      const [allUsers, allTasks, allMarks, allMarkBatches] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getTasks(),
        ApiService.getMarkRecords(),
        ApiService.getMarkBatches()
      ]);

      // Use String() comparison to handle numeric IDs from Django
      const foundMentor = allUsers.find(u => String(u.id) === String(mentorId));
      if (!foundMentor) {
        navigate('/hod/assign-students');
        return;
      }
      setMentor(foundMentor);

      // Filter students assigned to this mentor (string comparison)
      const mList = allUsers.filter(u => String(u.mentorId) === String(mentorId));

      const enriched: StudentWithStats[] = [];
      for (const s of mList) {
        let attendance = 85;
        try {
          const academic = await ApiService.getAcademicData(s.id);
          attendance = academic.attendance;
        } catch { /* fallback to 85 */ }

        const cohortTasks = allTasks.filter(t =>
          t.department === s.department && t.studyYear === s.studyYear
        );

        // Calculate marks summary for this student
        const studentMarks = allMarks.filter(m => String(m.studentId) === String(s.id));
        const avgMark = studentMarks.length > 0
          ? Math.round(studentMarks.reduce((sum, m) => sum + m.marks, 0) / studentMarks.length)
          : null;

        enriched.push({
          ...s,
          attendance,
          avgMark,
          tasks: {
            todo: cohortTasks.filter(t => t.status === TaskStatus.TODO).length,
            progress: cohortTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
            done: cohortTasks.filter(t => t.status === TaskStatus.COMPLETED).length
          }
        });
      }
      setMentees(enriched);
    } catch (err) {
      console.error("Mentorship Registry Sync Failure:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mentorId]);

  const groupedMentees = useMemo(() => {
    return STUDY_YEARS.reduce((acc, year) => {
      const filtered = mentees.filter(s => s.studyYear === year);
      if (filtered.length > 0) {
        acc[year] = filtered;
      }
      return acc;
    }, {} as Record<string, StudentWithStats[]>);
  }, [mentees]);

  if (isLoading) {
    return (
      <DashboardLayout title="Identity Audit">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retrieving Full Institutional Profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Caseload: ${mentor?.name || 'Authorized Official'}`}>
      <div className="max-w-7xl mx-auto space-y-12 pb-24 animate-in fade-in duration-500">

        {/* Profile Header Block */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[4rem] p-10 md:p-14 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-14 w-full">
            <button
              onClick={() => navigate('/hod/assign-students')}
              className="w-16 h-16 rounded-3xl bg-slate-950 border border-white/5 flex items-center justify-center text-slate-500 hover:text-primary transition-all active:scale-95 shadow-inner shrink-0"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>

            <div className="w-32 h-32 rounded-[2.5rem] bg-black border-2 border-white/5 flex items-center justify-center text-white font-black text-5xl shadow-2xl shrink-0">
              {mentor?.name[0]}
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">{mentor?.name}</h2>
                <span className="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-emerald-600/10 border-emerald-600/20 text-emerald-400">
                  {mentor?.designation || 'Educator'}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-slate-400 text-lg font-bold uppercase tracking-tight">{mentor?.department || 'Unassigned Branch'}</p>
                <p className="text-primary text-[11px] font-mono font-bold tracking-widest uppercase">ID: {mentor?.staffId || String(mentor?.id || '').slice(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div className="bg-slate-950/40 border border-white/5 px-12 py-8 rounded-[3rem] text-center min-w-[200px] shadow-inner">
              <p className="text-4xl font-black text-primary mb-1">{mentees.length}</p>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Caseload</p>
            </div>
          </div>
        </div>

        {/* Year-wise Caseload sections */}
        <div className="space-y-20">
          {STUDY_YEARS.map(year => {
            const studentsInYear = groupedMentees[year];
            if (!studentsInYear) return null;

            return (
              <section key={year} className="space-y-8">
                <div className="flex items-center gap-6 px-6">
                  <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(93,88,255,0.4)]"></div>
                  <h3 className="text-text-primary font-black text-2xl uppercase tracking-tighter">{year} Cohort Registry</h3>
                  <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] bg-slate-900 px-4 py-1.5 rounded-xl border border-white/5">{studentsInYear.length} Verified Entries</span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {studentsInYear.map(s => (
                    <div key={s.id} onClick={() => navigate(`/profile/${s.id}`)} className="w-full p-8 rounded-[3rem] border border-border-subtle bg-surface-component hover:bg-surface-elevated hover:border-primary/20 flex flex-col xl:flex-row xl:items-center justify-between gap-8 group transition-all shadow-xl cursor-pointer">
                      <div className="flex items-center gap-8 min-w-0 flex-1">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-slate-950 border border-white/5 flex items-center justify-center font-black text-2xl text-slate-500 shadow-inner group-hover:bg-primary group-hover:text-white transition-all">
                          {s.name[0]}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xl font-black text-text-primary uppercase truncate tracking-tight leading-tight group-hover:text-primary transition-colors">{s.name}</h4>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-bold text-text-muted uppercase font-mono">{s.regNo}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Performance Audit Enabled</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 xl:min-w-[700px]">
                        <MetricBox label="Attendance" value={`${s.attendance}%`} color={s.attendance >= 75 ? 'text-emerald-400' : 'text-rose-500'} />
                        <MetricBox label="Avg Marks" value={s.avgMark !== null ? `${s.avgMark}%` : 'N/A'} color={s.avgMark !== null && s.avgMark >= 50 ? 'text-sky-400' : 'text-slate-500'} />
                        <MetricBox label="To Do" value={s.tasks.todo} color="text-rose-500" />
                        <MetricBox label="Ongoing" value={s.tasks.progress} color="text-blue-400" />
                        <MetricBox label="Done" value={s.tasks.done} color="text-emerald-400" />
                      </div>

                      <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-700 group-hover:text-primary border border-white/5 shadow-inner transition-all group-hover:rotate-12">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {mentees.length === 0 && (
            <div className="py-32 text-center border-4 border-dashed border-border-subtle rounded-[4rem] bg-black/10">
              <p className="text-text-muted font-black uppercase tracking-[0.4em] text-xs">Zero student records mapped to this official registry</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

const MetricBox: React.FC<{ label: string, value: string | number, color: string }> = ({ label, value, color }) => (
  <div className="bg-slate-950/40 p-5 rounded-3xl border border-white/5 text-center transition-all group-hover:bg-slate-950 shadow-inner">
    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
    <p className={`text-xl font-black ${color}`}>{value}</p>
  </div>
);

export default MentorDetail;
