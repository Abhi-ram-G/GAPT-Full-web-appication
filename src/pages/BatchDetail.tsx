
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Course, Subject, AcademicBatch, UserRole, BatchCurriculumStatus } from '@/types';
import { MockDB } from '@/store';
import { AuthContext } from '@/contexts/AuthContext';

const BatchDetail: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { user, currentView } = useContext(AuthContext);

  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  const [deptStatuses, setDeptStatuses] = useState<Record<string, BatchCurriculumStatus>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const fetchedCourses = await MockDB.getCurriculum();
      const fetchedBatches = await MockDB.getAcademicBatches();
      setCourses(fetchedCourses);
      setBatches(fetchedBatches);

      const activeBatch = fetchedBatches.find(b => b.id === batchId);
      if (activeBatch && batchId) {
        const statuses: Record<string, BatchCurriculumStatus> = {};
        for (const deptId of activeBatch.departmentIds) {
          statuses[deptId] = await MockDB.getCurriculumStatus(batchId, deptId);
        }
        setDeptStatuses(statuses);
      }
    };
    loadData();
  }, [batchId, refreshTrigger]);

  const persist = async (updatedCourses: Course[], updatedBatches: AcademicBatch[]) => {
    setCourses(updatedCourses);
    setBatches(updatedBatches);
    await MockDB.persistStructure(updatedCourses, updatedBatches);
  };

  const activeBatch = useMemo(() => batches.find(b => b.id === batchId), [batches, batchId]);
  const batchDepartments = useMemo(() => {
    if (!activeBatch) return [];
    return activeBatch.departmentIds.map(id => courses.find(c => c.id === id)).filter(Boolean) as Course[];
  }, [activeBatch, courses]);

  const handleRemoveDeptFromBatch = async (deptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeBatch || !confirm('Unregister this department from the current batch registry?')) return;
    const updatedBatches = batches.map(b => b.id === activeBatch.id ? { ...b, departmentIds: b.departmentIds.filter(id => id !== deptId) } : b);
    await persist(courses, updatedBatches);
  };

  if (!activeBatch) {
    return <DashboardLayout title="Batch Detail"><div className="py-24 text-center"><button onClick={() => navigate('/admin/departments')} className="text-primary font-black uppercase">Cohort not found. Return to Registry</button></div></DashboardLayout>;
  }

  const isAdmin = currentView === UserRole.ADMIN;
  const isHOD = currentView === UserRole.HOD || currentView === UserRole.DEAN;

  return (
    <DashboardLayout title={`Batch Analysis: ${activeBatch.name}`}>
      <div className="max-w-6xl mx-auto space-y-10 pb-20">

        {/* Cohort Header */}
        <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-10">
            <div className="w-28 h-28 rounded-[2rem] bg-primary flex items-center justify-center text-white font-black text-5xl shadow-xl shadow-primary/20 shrink-0">
              {activeBatch.startYear.toString().slice(-2)}
            </div>
            <div>
              <h4 className="text-text-primary font-black text-4xl uppercase tracking-tighter leading-tight">{activeBatch.name}</h4>
              <div className="flex items-center gap-2 mt-4">
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.6em]">{activeBatch.startYear} — {activeBatch.endYear}</p>
                <span className="text-text-muted/60 font-black text-[10px] uppercase tracking-widest">• {activeBatch.batchType} DIVISION</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-surface-deep p-2 pl-8 rounded-2xl flex items-center gap-6 border border-border-subtle group">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{batchDepartments.length} REGISTERED</span>
              {isAdmin && (
                <button onClick={() => setIsAddDeptModalOpen(true)} className="w-10 h-10 bg-white/10 hover:bg-primary hover:text-white text-text-muted rounded-xl transition-all flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                </button>
              )}
            </div>

            <button onClick={() => navigate('/admin/departments')} className="w-14 h-14 bg-surface-elevated hover:bg-black/5 dark:hover:bg-white/10 border border-border-subtle text-text-muted rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
          </div>
        </div>

        {/* Department List */}
        <div className="space-y-6">
          {batchDepartments.map((dept) => {
            const isEngineering = dept.degree === 'B.E' || dept.degree === 'B.Tech';

            return (
              <div key={dept.id} className="relative bg-surface-component border border-border-subtle p-10 rounded-[3rem] shadow-xl transition-all hover:border-primary/20 group/card">

                {(isAdmin || isHOD) && (
                  <button
                    onClick={(e) => handleRemoveDeptFromBatch(dept.id, e)}
                    className="absolute top-10 right-10 w-12 h-12 bg-surface-elevated/50 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-2xl transition-all z-20 flex items-center justify-center group border border-border-subtle"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                )}

                <div className="flex flex-col gap-10">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 rounded-[2rem] bg-surface-elevated border border-border-subtle flex items-center justify-center text-primary font-black text-3xl shadow-inner group-hover/card:scale-105 transition-transform shrink-0">
                      {dept.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-text-primary font-black text-3xl uppercase truncate tracking-tighter group-hover/card:text-primary transition-colors">{dept.name}</h5>
                      <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {dept.degree}
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                        {dept.domain}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Array.from({ length: isEngineering ? 8 : 4 }).map((_, sIdx) => {
                      const semNum = sIdx + 1;
                      const semSubjects = dept.subjects.filter(s => s.semester === semNum);

                      return (
                        <button
                          key={semNum}
                          onClick={() => navigate(`/admin/departments/batch/${batchId}/dept/${dept.id}/sem/${semNum}`)}
                          className={`w-full flex items-center justify-between p-8 rounded-[2rem] border bg-surface-elevated/40 border-border-subtle hover:bg-surface-elevated/80 transition-all group`}
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm bg-surface-component text-text-muted border border-border-subtle group-hover:bg-primary group-hover:text-white transition-all`}>
                              {semNum}
                            </div>
                            <div className="text-left">
                              <p className="text-text-primary font-black text-base uppercase tracking-tight">Semester {semNum}</p>
                              <p className="text-text-muted text-[10px] font-bold uppercase mt-1 tracking-widest">{semSubjects.length} Authorized Units</p>
                            </div>
                          </div>

                          <div className={`w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center text-text-muted group-hover:text-primary transition-all`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BatchDetail;
