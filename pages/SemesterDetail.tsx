
import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Course, Subject, AcademicBatch, UserRole, BatchCurriculumStatus, QuestionPaper } from '../types';
import { MockDB } from '../store';
import { AuthContext } from '../AuthContext';

const SemesterDetail: React.FC = () => {
  const { batchId, deptId, semNum } = useParams<{ batchId: string, deptId: string, semNum: string }>();
  const navigate = useNavigate();
  const { user, currentView } = useContext(AuthContext);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isQPModalOpen, setIsQPModalOpen] = useState(false);
  
  const [newSubject, setNewSubject] = useState({
    name: '',
    code: '',
    credits: 3,
    lessonsCount: 1,
  });
  
  const [lessonFiles, setLessonFiles] = useState<Record<number, string>>({});
  const [lessonNames, setLessonNames] = useState<Record<number, string>>({});
  
  const [newQP, setNewQP] = useState({
    subjectId: '',
    name: '',
    file: ''
  });

  const [status, setStatus] = useState<BatchCurriculumStatus>(BatchCurriculumStatus.FROZEN);
  const [syncingStatus, setSyncingStatus] = useState<string | null>(null);

  // File Upload Handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUpload, setActiveUpload] = useState<{ type: 'LESSON' | 'QP', index?: number, subjectId?: string } | null>(null);

  const loadData = async () => {
    const fetchedCourses = await MockDB.getCurriculum();
    const fetchedBatches = await MockDB.getAcademicBatches();
    setCourses(fetchedCourses);
    setBatches(fetchedBatches);
    
    if (batchId && deptId) {
      const s = await MockDB.getCurriculumStatus(batchId, deptId);
      setStatus(s);
    }
  };

  useEffect(() => { loadData(); }, [batchId, deptId]);

  const activeBatch = useMemo(() => batches.find(b => b.id === batchId), [batches, batchId]);
  const activeCourse = useMemo(() => courses.find(c => c.id === deptId), [courses, deptId]);
  const semesterSubjects = useMemo(() => {
    if (!activeCourse || !semNum) return [];
    return activeCourse.subjects.filter(s => s.semester === parseInt(semNum));
  }, [activeCourse, semNum]);

  useEffect(() => {
    if (semesterSubjects.length > 0 && !newQP.subjectId) {
      setNewQP(prev => ({ ...prev, subjectId: semesterSubjects[0].id }));
    }
  }, [semesterSubjects]);

  const canEdit = useMemo(() => {
    if (currentView === UserRole.ADMIN) return true;
    if (currentView === UserRole.HOD && status === BatchCurriculumStatus.EDITABLE) return true;
    return false;
  }, [currentView, status]);

  const toggleStatus = async () => {
    if (!batchId || !deptId) return;
    const nextStatus = status === BatchCurriculumStatus.FROZEN ? BatchCurriculumStatus.EDITABLE : BatchCurriculumStatus.FROZEN;
    await MockDB.setCurriculumStatus(batchId, deptId, nextStatus);
    await loadData();
  };

  const handleCreateSubject = async (addNewAfter = false) => {
    if (!activeCourse || !batchId || !semNum || !newSubject.name || !newSubject.code) {
      alert("Validation Failure: Subject Nomenclature and Code are mandatory.");
      return;
    }

    const materials = Array.from({ length: newSubject.lessonsCount }).map((_, i) => lessonFiles[i] || '');
    const names = Array.from({ length: newSubject.lessonsCount }).map((_, i) => lessonNames[i] || `Module ${i+1}`);

    const subject: Subject = {
      id: crypto.randomUUID(),
      name: newSubject.name.toUpperCase(),
      code: newSubject.code.toUpperCase(),
      credits: newSubject.credits,
      semester: parseInt(semNum),
      lessonsCount: newSubject.lessonsCount,
      materials: materials,
      lessonNames: names,
      assignedStaffIds: [],
      questionPapers: []
    };

    const updatedCourses = courses.map(c => 
      c.id === deptId ? { ...c, subjects: [...c.subjects, subject] } : c
    );

    await MockDB.persistStructure(updatedCourses, batches);
    await loadData();

    setNewSubject({ name: '', code: '', credits: 3, lessonsCount: 1 });
    setLessonFiles({});
    setLessonNames({});

    if (!addNewAfter) {
      setIsAddModalOpen(false);
    }
    setSyncingStatus("Subject Registered Successfully.");
    setTimeout(() => setSyncingStatus(null), 3000);
  };

  const handleAddQP = async () => {
     if (!newQP.subjectId || !newQP.name) return;

     const paper: QuestionPaper = {
       name: newQP.name.toUpperCase(),
       file: newQP.file || 'GAPT_AUTH_REV_NULL'
     };

     const updatedCourses = courses.map(c => {
       if (c.id === deptId) {
         return {
           ...c,
           subjects: c.subjects.map(s => s.id === newQP.subjectId ? { ...s, questionPapers: [...(s.questionPapers || []), paper] } : s)
         };
       }
       return c;
     });

     await MockDB.persistStructure(updatedCourses, batches);
     await loadData();
     setNewQP({ subjectId: semesterSubjects[0]?.id || '', name: '', file: '' });
     setIsQPModalOpen(false);
     setSyncingStatus("Assessment Resource Synchronized.");
     setTimeout(() => setSyncingStatus(null), 3000);
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('CRITICAL: Permanently remove this academic unit from the master registry?')) return;
    const updatedCourses = courses.map(c => c.id === deptId ? { ...c, subjects: c.subjects.filter(s => s.id !== id) } : c);
    await MockDB.persistStructure(updatedCourses, batches);
    await loadData();
  };

  const triggerFileUpload = (type: 'LESSON' | 'QP', index?: number, subjectId?: string) => {
    setActiveUpload({ type, index, subjectId });
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUpload) return;

    setSyncingStatus(`Uploading: ${file.name}`);

    if (activeUpload.type === 'LESSON' && activeUpload.index !== undefined) {
      if (activeUpload.subjectId) {
        // Direct sync for existing subject module
        const updatedCourses = courses.map(c => {
          if (c.id === deptId) {
            return {
              ...c,
              subjects: c.subjects.map(s => {
                if (s.id === activeUpload.subjectId) {
                  const updatedMats = [...(s.materials || [])];
                  while(updatedMats.length < s.lessonsCount) updatedMats.push('');
                  updatedMats[activeUpload.index!] = file.name;
                  return { ...s, materials: updatedMats };
                }
                return s;
              })
            };
          }
          return c;
        });
        await MockDB.persistStructure(updatedCourses, batches);
        await loadData();
      } else {
        // Local state for modal creation
        setLessonFiles(prev => ({ ...prev, [activeUpload.index!]: file.name }));
      }
    } else if (activeUpload.type === 'QP') {
      setNewQP(prev => ({ ...prev, file: file.name }));
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveUpload(null);
    setSyncingStatus("Registry Link Established.");
    setTimeout(() => setSyncingStatus(null), 2000);
  };

  const openQPModalWithSubject = (subjectId: string) => {
    setNewQP(prev => ({ ...prev, subjectId }));
    setIsQPModalOpen(true);
  };

  if (!activeBatch || !activeCourse) {
    return <DashboardLayout title="Registry Mismatch"><div className="py-32 text-center text-text-muted font-bold">Academic parameters unrecognized. Return to directory.</div></DashboardLayout>;
  }

  return (
    <DashboardLayout title={`${activeCourse.name} - Sem ${semNum}`}>
      <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in duration-500">
        
        {/* Atomic File Uploader (Hidden) */}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        {/* Integrated Navigation & Persistence Status */}
        <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-8 md:p-12 flex flex-col xl:flex-row xl:items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
           <div className="flex items-center gap-10 relative z-10">
              <button 
                onClick={() => navigate(`/admin/departments/batch/${batchId}`)}
                className="w-16 h-16 bg-slate-950 border border-border-subtle rounded-3xl flex items-center justify-center text-text-muted hover:text-primary transition-all active:scale-95 shadow-inner"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
              </button>
              <div>
                 <h2 className="text-text-primary font-black text-3xl uppercase tracking-tighter leading-none">{activeCourse.name}</h2>
                 <div className="flex items-center gap-4 mt-4">
                    <span className={`w-2.5 h-2.5 rounded-full ${status === BatchCurriculumStatus.EDITABLE ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">{activeBatch.name} • Status: {status}</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-wrap items-center gap-6 relative z-10">
              {syncingStatus && (
                <div className="px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-right-4">
                   <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                   <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{syncingStatus}</span>
                </div>
              )}
              
              {(currentView === UserRole.ADMIN || currentView === UserRole.HOD) && (
                <button 
                  onClick={toggleStatus}
                  className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border transition-all ${status === BatchCurriculumStatus.FROZEN ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}
                >
                  {status === BatchCurriculumStatus.FROZEN ? 'Unlock Master Entry' : 'Freeze Registry'}
                </button>
              )}

              {canEdit && (
                <button onClick={() => setIsAddModalOpen(true)} className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl shadow-primary/30 hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-4">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                   Register Unit
                </button>
              )}
           </div>
        </div>

        {/* Subjects Matrix - Detailed Sequential View */}
        <div className="grid grid-cols-1 gap-12">
           {semesterSubjects.map(s => (
             <div key={s.id} className="bg-surface-component border border-border-subtle p-10 md:p-14 rounded-[4rem] shadow-2xl hover:border-primary/20 transition-all group relative">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 mb-12 pb-10 border-b border-white/5">
                   <div className="flex items-center gap-8">
                      <div className="w-24 h-24 rounded-[2.5rem] bg-slate-950 border border-border-subtle flex items-center justify-center text-primary font-black text-3xl shadow-inner group-hover:scale-105 transition-transform shrink-0">
                         {s.code.substring(0, 2)}
                      </div>
                      <div>
                         <h4 className="text-text-primary font-black text-3xl uppercase tracking-tighter leading-tight">{s.name}</h4>
                         <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em] mt-2">{s.code} • {s.credits} Credits • {s.lessonsCount} Sequential Modules</p>
                      </div>
                   </div>
                   {canEdit && (
                     <button onClick={() => deleteSubject(s.id)} className="w-14 h-14 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-90 border border-rose-500/20">
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                     </button>
                   )}
                </div>

                <div className="space-y-16">
                   {/* Modules List - Vertical 'One by One' with direct upload triggers */}
                   <div className="space-y-8">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] border-b border-white/5 pb-4">Authorized Curriculum Modules</p>
                      <div className="space-y-5">
                         {s.lessonNames?.map((name, i) => (
                           <div key={i} className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-950/50 rounded-[3rem] border border-white/5 group/lesson hover:bg-slate-950 transition-all shadow-inner gap-8">
                              <div className="flex items-center gap-10 min-w-0 flex-1">
                                 <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-xl shrink-0 shadow-2xl transition-all ${s.materials?.[i] ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500 group-hover/lesson:text-white'}`}>{i+1}</div>
                                 <div className="min-w-0">
                                    <p className="text-xl font-black text-text-primary uppercase truncate tracking-tight leading-tight">{name}</p>
                                    <div className="flex items-center gap-3 mt-2">
                                       <div className={`w-2 h-2 rounded-full ${s.materials?.[i] ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                       <p className={`text-[11px] font-mono uppercase tracking-widest truncate max-w-[400px] ${s.materials?.[i] ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>
                                          {s.materials?.[i] || 'Registry Asset Awaiting Deployment'}
                                       </p>
                                    </div>
                                 </div>
                              </div>
                              {canEdit && (
                                <button 
                                  onClick={() => triggerFileUpload('LESSON', i, s.id)}
                                  className={`min-w-[200px] py-5 rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.3em] border transition-all shadow-2xl active:scale-95 ${s.materials?.[i] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white' : 'bg-primary text-white border-primary/20 hover:bg-indigo-500'}`}
                                >
                                   {s.materials?.[i] ? 'Update Asset' : 'Deploy Module'}
                                </button>
                              )}
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Terminal Operation: Question Repository */}
                   <div className="space-y-8 pt-12 border-t border-white/5">
                      <div className="flex items-center justify-between">
                         <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em]">Integrated Question Repository</p>
                         <span className="text-[10px] font-black text-text-muted uppercase tracking-widest bg-black/40 px-4 py-2 rounded-xl">{s.questionPapers?.length || 0} Records Found</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {s.questionPapers && s.questionPapers.length > 0 ? (
                            s.questionPapers.map((qp, i) => (
                              <div key={i} className="flex items-center justify-between p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] group/paper hover:border-emerald-500/30 transition-all shadow-xl">
                                 <div className="min-w-0">
                                   <p className="text-sm font-black text-emerald-400 uppercase tracking-tighter truncate">{qp.name}</p>
                                   <p className="text-[9px] text-emerald-500/40 font-mono tracking-tighter truncate mt-1.5">{qp.file}</p>
                                 </div>
                                 <button 
                                   onClick={() => alert(`Master Protocol Review: Initiating secure view for ${qp.file}`)}
                                   className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-500 transition-all active:scale-90 shadow-2xl shadow-emerald-900/40"
                                 >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                 </button>
                              </div>
                            ))
                         ) : (
                            <div className="col-span-full py-16 text-center bg-slate-950/30 rounded-[3rem] border border-dashed border-white/5">
                               <p className="text-[10px] text-slate-700 font-black uppercase italic tracking-[0.3em]">Institutional Assessment archives pending registration</p>
                            </div>
                         )}
                      </div>

                      {canEdit && (
                         <div className="flex justify-center pt-10">
                            <button 
                              onClick={() => openQPModalWithSubject(s.id)} 
                              className="px-14 py-6 bg-slate-900 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-[2.5rem] text-xs font-black uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-95 flex items-center gap-5 group/btn"
                            >
                               <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover/btn:bg-emerald-500/30">
                                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                               </div>
                               Add Question Paper
                            </button>
                         </div>
                      )}
                   </div>
                </div>
             </div>
           ))}
           {semesterSubjects.length === 0 && (
             <div className="py-40 text-center border-4 border-dashed border-border-subtle rounded-[4rem] bg-surface-component/40 shadow-inner">
                <div className="w-20 h-20 bg-slate-950/40 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-700 border border-white/5">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
                <p className="text-text-muted font-black uppercase tracking-[0.4em] text-xs">Academic units pending authorization for this registry cycle</p>
             </div>
           )}
        </div>
      </div>

      {/* Persistence Modal - Sequential Subject Initialization */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-y-auto">
           <div className="bg-[#0b1121] border border-white/10 p-10 md:p-14 rounded-[4rem] max-w-2xl w-full shadow-[0_0_80px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-300 my-10 relative">
              <button onClick={() => setIsAddModalOpen(false)} className="absolute top-12 right-12 text-slate-600 hover:text-white transition-colors bg-black/40 w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              
              <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-12 leading-tight">Master curriculum<br/><span className="text-primary lowercase font-normal italic tracking-normal">unit enrollment</span></h3>
              
              <div className="space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subject Nomenclature</label>
                       <input 
                         type="text" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                         placeholder="E.G. MACHINE LEARNING" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-8 py-5 text-white font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-slate-800" 
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unit Registry Code</label>
                       <input 
                         type="text" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value.toUpperCase()})}
                         placeholder="AD24103" className="w-full bg-slate-950 border border-white/10 rounded-2xl px-8 py-5 text-white font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-slate-800" 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Credits</label>
                       <input 
                         type="number" value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value) || 0})}
                         className="w-full bg-slate-950 border border-white/10 rounded-2xl px-8 py-5 text-white font-bold outline-none shadow-inner" 
                       />
                    </div>
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Module Density</label>
                       <input 
                         type="number" value={newSubject.lessonsCount} onChange={e => setNewSubject({...newSubject, lessonsCount: Math.max(1, parseInt(e.target.value) || 1)})}
                         className="w-full bg-slate-950 border border-white/10 rounded-2xl px-8 py-5 text-white font-bold outline-none shadow-inner" 
                       />
                    </div>
                 </div>

                 <div className="space-y-8">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] border-b border-primary/20 pb-4">Internal Module Architecture</p>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-4 space-y-4">
                       {Array.from({ length: newSubject.lessonsCount }).map((_, i) => (
                         <div key={i} className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 flex flex-col md:flex-row gap-10 items-center group">
                            <div className={`w-14 h-14 rounded-2xl bg-slate-900 border flex items-center justify-center font-black text-lg shrink-0 transition-all ${lessonFiles[i] ? 'border-emerald-500/30 text-emerald-400' : 'border-white/10 text-slate-600'}`}>{i+1}</div>
                            <div className="flex-1 w-full space-y-2">
                               <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-1">Module {i+1} Nomenclature</label>
                               <input 
                                  placeholder={`E.G. Neural Networks Basics`}
                                  value={lessonNames[i] || ''}
                                  onChange={e => setLessonNames({...lessonNames, [i]: e.target.value})}
                                  className="w-full bg-transparent border-b border-white/10 px-2 py-3 text-lg text-white font-black outline-none focus:border-primary transition-all placeholder:text-slate-800"
                               />
                            </div>
                            <div className="shrink-0 flex items-center gap-8">
                               <p className={`text-[11px] font-mono uppercase tracking-tighter truncate max-w-[120px] ${lessonFiles[i] ? 'text-emerald-400' : 'text-slate-800 font-black'}`}>{lessonFiles[i] ? 'Linked' : 'Registry Empty'}</p>
                               <button 
                                 type="button"
                                 onClick={() => triggerFileUpload('LESSON', i)}
                                 className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${lessonFiles[i] ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                               >
                                 {lessonFiles[i] ? 'Switch File' : 'Link Archive'}
                               </button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-6 pt-10">
                    <button type="button" onClick={() => handleCreateSubject(true)} className="flex-1 py-7 bg-white/5 hover:bg-white/10 text-white rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.2em] border border-white/10 transition-all active:scale-95 shadow-xl">Register & Add Next</button>
                    <button type="button" onClick={() => handleCreateSubject(false)} className="flex-[2] py-7 bg-primary text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-[0_20px_50px_rgba(93,88,255,0.4)] transition-all active:scale-95">Authorize Identity</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Persistence Modal - Assessment Synchronizer */}
      {isQPModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
           <div className="bg-[#0b1121] border border-white/10 p-12 md:p-16 rounded-[4rem] max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-300">
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-12 leading-tight">Master assessment<br/><span className="text-emerald-400 lowercase font-normal italic tracking-normal">synchronizer</span></h3>
              <div className="space-y-12">
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Assessment Unit</label>
                    <select 
                      value={newQP.subjectId} 
                      onChange={e => setNewQP({...newQP, subjectId: e.target.value})}
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-8 py-5 text-white font-bold outline-none appearance-none shadow-inner cursor-pointer"
                    >
                       {semesterSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Paper Identity (Nomenclature)</label>
                    <input 
                      type="text" 
                      value={newQP.name}
                      onChange={e => setNewQP({...newQP, name: e.target.value})}
                      placeholder="E.G. END SEMESTER 2024" 
                      className="w-full bg-slate-950 border border-white/10 rounded-2xl px-8 py-5 text-white font-bold outline-none shadow-inner placeholder:text-slate-800" 
                    />
                 </div>
                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Digital Asset Archive</label>
                    <div className="mt-4">
                       <button 
                         type="button"
                         onClick={() => triggerFileUpload('QP')}
                         className={`w-full py-6 rounded-3xl border-2 font-black uppercase text-[11px] tracking-[0.2em] transition-all shadow-inner ${newQP.file ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950 border-white/5 text-slate-600 hover:text-white hover:border-white/10'}`}
                       >
                          {newQP.file ? 'Integrity Verified' : 'Sync Archive File'}
                       </button>
                    </div>
                    {newQP.file && <p className="text-[10px] font-mono text-emerald-500/60 uppercase mt-4 ml-3 truncate">Handshake established: {newQP.file}</p>}
                 </div>

                 <div className="flex gap-6 pt-12">
                    <button type="button" onClick={() => setIsQPModalOpen(false)} className="flex-1 py-5 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Discard</button>
                    <button 
                      type="button"
                      onClick={handleAddQP}
                      disabled={!newQP.name || !newQP.file}
                      className="flex-[2] py-6 bg-emerald-600 text-white rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] active:scale-95 transition-all disabled:opacity-30"
                    >
                      Authorize Paper
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default SemesterDetail;
