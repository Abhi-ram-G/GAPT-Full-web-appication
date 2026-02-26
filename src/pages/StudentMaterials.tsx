
import React, { useContext, useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store/store';
import { Course, Subject } from '@/types/types';

const StudentMaterials: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [expandedSemester, setExpandedSemester] = useState<number | null>(null);
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  // Fixed: handle asynchronous getCurriculum call in useEffect
  useEffect(() => {
    const refresh = async () => {
      const cur = await MockDB.getCurriculum();
      setCurriculum(cur);
    };
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  const studentCourse = useMemo(() => {
    if (!user?.department) return null;
    return curriculum.find(c => `${c.name} (${c.degree})` === user.department);
  }, [curriculum, user?.department]);

  const isSubjectComplete = (subj: Subject) => {
    return (
      subj.materials &&
      subj.materials.length === subj.lessonsCount &&
      subj.materials.every(m => !!m)
    );
  };

  const isSemesterComplete = (subjects: Subject[]) => {
    if (subjects.length === 0) return false;
    return subjects.every(s => isSubjectComplete(s));
  };

  if (!studentCourse) {
    return (
      <DashboardLayout title="Learning Resources">
        <div className="py-24 text-center border-4 border-dashed border-slate-800 rounded-[3rem]">
          <p className="text-slate-600 font-black uppercase tracking-[0.2em]">Registry data pending authorization</p>
          <p className="text-slate-700 text-[10px] uppercase font-bold mt-2">Please contact your department admin</p>
        </div>
      </DashboardLayout>
    );
  }

  const totalSems = studentCourse.batchType === 'UG' ? 8 : 4;

  return (
    <DashboardLayout title="Institutional Resource Library">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10 pb-20">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-2">
              <h2 className="text-white font-black text-3xl lowercase tracking-tight">Curriculum materials</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Read-only access to authorized lesson plans</p>
            </div>
            <div className="bg-slate-950 px-8 py-5 rounded-[1.5rem] border border-white/5 text-center min-w-[200px]">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Authenticated Branch</p>
              <p className="text-sm font-black text-indigo-400 uppercase">{user?.department}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {Array.from({ length: totalSems }).map((_, sIdx) => {
            const semNum = sIdx + 1;
            const semSubjects = studentCourse.subjects.filter(s => s.semester === semNum);
            const isComplete = isSemesterComplete(semSubjects);
            const isExpanded = expandedSemester === semNum;

            return (
              <div key={semNum} className="space-y-4">
                <button
                  onClick={() => setExpandedSemester(isExpanded ? null : semNum)}
                  className={`w-full p-8 rounded-[2.5rem] border-2 transition-all flex items-center justify-between group ${
                    isExpanded 
                    ? (isComplete ? 'bg-emerald-500/5 border-emerald-500/40 shadow-emerald-500/10' : 'bg-slate-900 border-indigo-500/30') 
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all ${
                      isComplete 
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                        : (isExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500')
                    }`}>
                      {semNum}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-black text-xl uppercase tracking-tighter">Semester {semNum}</h4>
                        {isComplete && (
                          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[8px] font-black uppercase border border-emerald-500/20">All Uploaded</span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mt-1">{semSubjects.length} Authorized Units</p>
                    </div>
                  </div>
                  <svg className={`w-6 h-6 text-slate-600 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 animate-in slide-in-from-top-4 duration-300">
                    {semSubjects.length === 0 ? (
                      <div className="col-span-2 py-10 bg-slate-950/20 border border-dashed border-slate-800 rounded-3xl text-center">
                        <p className="text-[10px] text-slate-700 font-black uppercase tracking-widest">No curriculum authorized for this period</p>
                      </div>
                    ) : (
                      semSubjects.map(subj => {
                        const isSubjComplete = isSubjectComplete(subj);
                        const isSubjExpanded = expandedSubject === subj.id;
                        return (
                          <div key={subj.id} className={`bg-slate-900 border rounded-[2rem] overflow-hidden group/subj transition-all ${
                            isSubjComplete ? 'border-emerald-500/20' : 'border-slate-800 hover:border-indigo-500/20'
                          }`}>
                            <button
                              onClick={() => setExpandedSubject(isSubjExpanded ? null : subj.id)}
                              className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-all text-left"
                            >
                              <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-1.5 h-10 rounded-full transition-all group-hover/subj:h-12 ${
                                  isSubjComplete ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`}></div>
                                <div className="min-w-0">
                                  <p className="text-white font-black text-sm uppercase truncate tracking-tight">{subj.name}</p>
                                  <p className="text-[9px] text-slate-500 font-mono tracking-widest mt-0.5">{subj.code} • {subj.credits} Credits</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {isSubjComplete && <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
                                <svg className={`w-4 h-4 text-slate-600 transition-transform ${isSubjExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path>
                                </svg>
                              </div>
                            </button>

                            {isSubjExpanded && (
                              <div className="p-4 bg-slate-950/40 border-t border-white/5 space-y-3 animate-in fade-in duration-200">
                                {Array.from({ length: subj.lessonsCount }).map((_, lIdx) => {
                                  const material = subj.materials?.[lIdx];
                                  const lessonName = subj.lessonNames?.[lIdx] || `Module ${lIdx + 1}`;
                                  return (
                                    <div key={lIdx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-xl border border-white/5 group/lesson">
                                      <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black w-5 ${material ? 'text-emerald-500' : 'text-slate-700'}`}>{lIdx + 1}</span>
                                        <p className="text-[11px] font-black text-slate-300 uppercase tracking-tight truncate max-w-[180px]">{lessonName}</p>
                                      </div>
                                      {material ? (
                                        <button
                                          onClick={() => alert(`Accessing Secure Resource: ${material}`)}
                                          className="px-3 py-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        >
                                          View Content
                                        </button>
                                      ) : (
                                        <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Pending</span>
                                      )}
                                    </div>
                                  );
                                })}
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
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentMaterials;
