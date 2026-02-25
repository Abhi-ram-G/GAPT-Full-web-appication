
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { MockDB } from '../store';
import { User, UserRole, TaskStatus } from '../types';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

interface StudentWithStats extends User {
  attendance: number;
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
    const [allUsers, allTasks] = await Promise.all([
      MockDB.getUsers(),
      MockDB.getTasks()
    ]);

    const foundMentor = allUsers.find(u => u.id === mentorId);
    if (!foundMentor) {
      navigate('/hod/assign-students');
      return;
    }
    setMentor(foundMentor);

    const mList = allUsers.filter(u => u.mentorId === mentorId);

    const enrichList = async (list: User[]) => {
      const enriched: StudentWithStats[] = [];
      for (const s of list) {
        const academic = await MockDB.getAcademicData(s.id);
        const cohortTasks = allTasks.filter(t => t.department === s.department && t.studyYear === s.studyYear);
        enriched.push({
          ...s,
          attendance: academic.attendance,
          tasks: {
            todo: cohortTasks.filter(t => t.status === TaskStatus.TODO).length,
            progress: cohortTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
            done: cohortTasks.filter(t => t.status === TaskStatus.COMPLETED).length
          }
        });
      }
      return enriched;
    };

    const enrichedMentees = await enrichList(mList);
    setMentees(enrichedMentees);
    setIsLoading(false);
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
      <DashboardLayout title="Mentor Audit">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregating Mentorship Data...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Mentorship Caseload Audit">
      <div className="max-w-7xl mx-auto space-y-12 pb-24">
        
        {/* Header Section */}
        <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                 <button 
                   onClick={() => navigate('/hod/assign-students')}
                   className="w-14 h-14 bg-slate-950 border border-border-subtle rounded-2xl flex items-center justify-center text-text-muted hover:text-primary transition-all active:scale-95 shadow-inner"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                 </button>
                 <div className="w-20 h-20 rounded-[1.5rem] bg-primary flex items-center justify-center text-white font-black text-3xl shadow-xl">
                   {mentor?.name[0]}
                 </div>
                 <div>
                    <h2 className="text-text-primary font-black text-3xl uppercase tracking-tighter">{mentor?.name}</h2>
                    <p className="text-primary text-[10px] font-black uppercase tracking-widest mt-2">{mentor?.designation} • Caseload Audit</p>
                 </div>
              </div>
              <div className="bg-slate-950/40 border border-white/5 px-12 py-6 rounded-2xl text-center">
                 <p className="text-3xl font-black text-primary">{mentees.length}</p>
                 <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mt-1">Total Assigned Mentees</p>
              </div>
           </div>
        </div>

        {/* Year-wise Caseload Sections */}
        <div className="space-y-16">
          {STUDY_YEARS.map(year => {
            const studentsInYear = groupedMentees[year];
            if (!studentsInYear) return null;

            return (
              <section key={year} className="space-y-6">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-2 h-6 bg-primary rounded-full shadow-[0_0_8px_rgba(93,88,255,0.4)]"></div>
                  <h3 className="text-text-primary font-black text-xl lowercase tracking-tight">{year} cohort</h3>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{studentsInYear.length} Students</span>
                </div>
                
                <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] overflow-hidden shadow-xl">
                  <div className="p-4 space-y-3">
                    {studentsInYear.map(s => (
                      <MenteeRow key={s.id} mentee={s} />
                    ))}
                  </div>
                </div>
              </section>
            );
          })}

          {mentees.length === 0 && (
            <div className="py-24 text-center border-4 border-dashed border-border-subtle rounded-[2.5rem] bg-surface-component/40">
              <p className="text-text-muted font-black uppercase tracking-widest text-xs">No mentees assigned to this faculty member</p>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

const MenteeRow: React.FC<{ mentee: StudentWithStats }> = ({ mentee }) => (
  <div className="w-full px-6 py-4 rounded-2xl border-2 border-border-subtle bg-surface-elevated/40 flex flex-col lg:flex-row lg:items-center gap-6 group hover:border-primary/20 transition-all shadow-sm">
     <div className="flex items-center gap-5 min-w-[280px] flex-1">
        <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center font-black text-text-muted shadow-inner group-hover:bg-primary group-hover:text-white transition-all">
           {mentee.name[0]}
        </div>
        <div className="min-w-0">
           <h4 className="text-sm font-black text-text-primary uppercase truncate tracking-tight">{mentee.name}</h4>
           <p className="text-[9px] text-text-muted font-mono tracking-widest mt-0.5 uppercase">{mentee.regNo} • {mentee.department?.split(' (')[0]}</p>
        </div>
     </div>

     <div className="min-w-[100px] text-center border-y lg:border-y-0 lg:border-x border-white/5 py-4 lg:py-0 lg:px-6">
        <p className="text-[8px] text-text-muted font-black uppercase tracking-widest mb-1">ATTENDANCE</p>
        <p className={`text-sm font-black tracking-tight ${mentee.attendance >= 75 ? 'text-emerald-500' : 'text-rose-500'}`}>
          {mentee.attendance}%
        </p>
     </div>

     <div className="min-w-[220px] flex items-center justify-center lg:justify-end gap-6 lg:pl-4">
        <div className="text-center">
           <p className="text-xs font-black text-rose-500 leading-none">{mentee.tasks.todo}</p>
           <p className="text-[8px] text-text-muted font-black uppercase tracking-[0.1em] mt-1">PENDING</p>
        </div>
        <div className="text-center">
           <p className="text-xs font-black text-blue-400 leading-none">{mentee.tasks.progress}</p>
           <p className="text-[8px] text-text-muted font-black uppercase tracking-[0.1em] mt-1">ONGOING</p>
        </div>
        <div className="text-center">
           <p className="text-xs font-black text-emerald-400 leading-none">{mentee.tasks.done}</p>
           <p className="text-[8px] text-text-muted font-black uppercase tracking-[0.1em] mt-1">DONE</p>
        </div>
     </div>
  </div>
);

export default MentorDetail;
