
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store/store';
import { Course, Subject, UserRole } from '@/types/types';

const StaffMaterials: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'info' | 'error', msg: string } | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIdx = useRef<number | null>(null);

  const loadData = async () => {
    const cur = await MockDB.getCurriculum();
    setCurriculum(cur);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const staffCourses = useMemo(() => {
    if (!user) return [];
    // Admins and Deans see all departments
    if (currentView === UserRole.ADMIN || currentView === UserRole.DEAN) {
      return curriculum;
    }
    // HODs and Staff see their own department
    const deptBase = user.department?.split(' (')[0] || '';
    return curriculum.filter(c => c.name.includes(deptBase));
  }, [curriculum, user, currentView]);

  const selectedCourse = useMemo(() => 
    curriculum.find(c => c.id === selectedCourseId) || null
  , [curriculum, selectedCourseId]);

  const selectedSubject = useMemo(() => 
    selectedCourse?.subjects.find(s => s.id === selectedSubjectId) || null
  , [selectedCourse, selectedSubjectId]);

  const handleSelectCourse = (course: Course) => {
    setSelectedCourseId(course.id);
    setSelectedSubjectId(null);
  };

  const triggerUpload = (idx: number) => {
    activeUploadIdx.current = idx;
    // Reset file input value to allow re-uploading the same file
    if (fileInputRef.current) fileInputRef.current.value = '';
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lIdx = activeUploadIdx.current;

    if (!file || !selectedCourseId || !selectedSubjectId || lIdx === null) return;

    setUploadingIdx(lIdx);
    setStatus({ type: 'info', msg: `Deploying "${file.name}" to registry...` });

    try {
      // Simulate network handshake
      await new Promise(resolve => setTimeout(resolve, 1200));

      const currentSubject = curriculum
        .find(c => c.id === selectedCourseId)
        ?.subjects.find(s => s.id === selectedSubjectId);

      if (!currentSubject) throw new Error("Target subject not found in state context.");

      const updatedMaterials = [...(currentSubject.materials || [])];
      // Ensure array is padded to lessonsCount
      while (updatedMaterials.length < currentSubject.lessonsCount) {
        updatedMaterials.push('');
      }
      updatedMaterials[lIdx] = file.name;

      await MockDB.updateSubjectMaterials(selectedCourseId, selectedSubjectId, updatedMaterials);
      
      // Atomic local state refresh
      await loadData();

      setStatus({ type: 'success', msg: `Module ${lIdx + 1} resource updated successfully.` });
    } catch (err) {
      console.error("Upload Error:", err);
      setStatus({ type: 'error', msg: 'Sync Failure: Institutional servers unreachable or identity mismatch.' });
    } finally {
      setUploadingIdx(null);
      activeUploadIdx.current = null;
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const isSubjectComplete = (subj: Subject) => {
    return (
      subj.materials &&
      subj.materials.length === subj.lessonsCount &&
      subj.materials.every(m => !!m && m !== '')
    );
  };

  return (
    <DashboardLayout title="Faculty Resource Deployment">
      <div className="max-w-6xl mx-auto space-y-8 pb-24">
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
        />

        <div className="bg-[#0f172a] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl -mr-40 -mt-40 transition-transform group-hover:scale-110 duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-white font-black text-3xl lowercase tracking-tight">Institutional content manager</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Authorized curriculum asset deployment engine</p>
            </div>
            {currentView === UserRole.ADMIN && (
              <span className="px-4 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest">Master Authority View</span>
            )}
          </div>
        </div>

        {status && (
          <div className={`p-5 rounded-2xl border text-center text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-top-2 shadow-xl backdrop-blur-md sticky top-24 z-30 ${
            status.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 
            status.type === 'error' ? 'bg-rose-600 text-white border-rose-500' :
            'bg-indigo-600 text-white border-indigo-500'
          }`}>
             <div className="flex items-center justify-center gap-3">
                {status.type === 'info' && <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {status.msg}
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Unit Selection Matrix */}
          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Authorized Branches</h3>
              <span className="text-[9px] font-bold text-slate-700">{staffCourses.length} Departments</span>
            </div>
            
            <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
              {staffCourses.length === 0 ? (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2rem] text-center bg-black/20">
                  <p className="text-slate-700 text-[10px] font-black uppercase tracking-widest leading-relaxed">No departments found in current authorization scope</p>
                </div>
              ) : (
                staffCourses.map(course => (
                  <div key={course.id} className="space-y-2">
                    <button 
                      onClick={() => handleSelectCourse(course)}
                      className={`w-full p-6 rounded-[1.5rem] border-2 text-left transition-all group ${selectedCourseId === course.id ? 'bg-primary/10 border-primary/30 shadow-lg' : 'bg-slate-900 border-slate-800 hover:border-white/10'}`}
                    >
                      <p className="text-sm font-black text-white uppercase truncate group-hover:text-primary transition-colors">{course.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[9px] text-slate-500 font-mono uppercase tracking-tighter">{course.degree} • {course.batchType}</p>
                        <span className="text-[8px] font-black text-slate-600 uppercase">{course.subjects.length} Units</span>
                      </div>
                    </button>
                    
                    {selectedCourseId === course.id && (
                      <div className="pl-6 space-y-2 animate-in slide-in-from-left-2 duration-300">
                        {course.subjects.map(subj => {
                          const complete = isSubjectComplete(subj);
                          const isActive = selectedSubjectId === subj.id;
                          return (
                            <button 
                              key={subj.id}
                              onClick={() => setSelectedSubjectId(subj.id)}
                              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isActive ? 'bg-white/5 border-white/20 shadow-inner' : 'bg-slate-950 border-white/5 hover:border-white/10'}`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-1.5 h-6 rounded-full transition-colors ${complete ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
                                <p className={`text-[11px] font-black uppercase truncate ${isActive ? 'text-white' : 'text-slate-500'}`}>{subj.name}</p>
                              </div>
                              {complete && <svg className="w-3 h-3 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Asset Deployment Area */}
          <div className="lg:col-span-2">
            {!selectedSubject ? (
              <div className="h-full flex flex-col items-center justify-center py-32 border-4 border-dashed border-white/5 rounded-[3rem] bg-black/20">
                <div className="w-20 h-20 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-slate-700 mb-8 shadow-inner">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                </div>
                <p className="text-slate-600 font-black uppercase tracking-[0.3em] text-xs">Select unit to begin deployment</p>
                <p className="text-slate-800 text-[9px] font-black uppercase tracking-widest mt-2">Master Registry Protocol Active</p>
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-white/5 rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in fade-in duration-500 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-emerald-500 opacity-30"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 pb-8 border-b border-white/5 gap-6">
                   <div className="min-w-0 flex-1">
                      <h4 className="text-white font-black text-3xl uppercase tracking-tighter truncate leading-tight">{selectedSubject.name}</h4>
                      <div className="flex items-center gap-4 mt-3">
                         <span className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{selectedSubject.code}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                         <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{selectedSubject.credits} Credits</span>
                         <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                         <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Sem {selectedSubject.semester}</span>
                      </div>
                   </div>
                   <div className={`shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-lg ${isSubjectComplete(selectedSubject) ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
                      {isSubjectComplete(selectedSubject) ? 'CURRICULUM SYNCED' : 'AWAITING MATERIALS'}
                   </div>
                </div>

                <div className="space-y-4">
                   {Array.from({ length: selectedSubject.lessonsCount }).map((_, lIdx) => {
                     const material = selectedSubject.materials?.[lIdx];
                     const lessonName = selectedSubject.lessonNames?.[lIdx] || `Unit Module ${lIdx + 1}`;
                     const isThisUploading = uploadingIdx === lIdx;

                     return (
                       <div key={lIdx} className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-8 group ${material ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-black/20 border-white/5 hover:border-white/10 shadow-inner'}`}>
                          <div className="flex items-center gap-8 min-w-0 flex-1">
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all shrink-0 shadow-lg ${material ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 group-hover:text-white'}`}>
                               {lIdx + 1}
                             </div>
                             <div className="min-w-0">
                                <p className="text-white font-black text-base uppercase tracking-tight truncate">{lessonName}</p>
                                {material ? (
                                  <div className="flex items-center gap-3 mt-2">
                                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                     <p className="text-[10px] text-emerald-400/80 font-mono uppercase tracking-widest truncate max-w-[200px]">{material}</p>
                                  </div>
                                ) : (
                                  <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2 italic">No Resource Linked</p>
                                )}
                             </div>
                          </div>

                          <button 
                             onClick={() => triggerUpload(lIdx)}
                             disabled={uploadingIdx !== null}
                             className={`min-w-[180px] py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${material ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95'}`}
                          >
                             {isThisUploading ? (
                               <>
                                 <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                 Deploying...
                               </>
                             ) : material ? (
                               'Update File'
                             ) : (
                               'Deploy Asset'
                             )}
                          </button>
                       </div>
                     );
                   })}
                </div>

                <div className="mt-12 p-8 bg-black/40 border border-white/5 rounded-[2.5rem] flex items-start gap-6">
                   <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   </div>
                   <div>
                      <h5 className="text-white font-black text-xs uppercase tracking-widest mb-2">Institutional Compliance Protocol</h5>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                        Assets uploaded to this registry are immediately accessible to authorized students. Ensure documents adhere to the Paperless GAPT Standard (Searchable PDF/Office formats).
                      </p>
                   </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffMaterials;
