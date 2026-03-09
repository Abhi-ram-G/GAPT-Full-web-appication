
import React, { useContext, useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { Course, Subject, UserRole } from '../types';

const StaffMaterials: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'info' | 'error', msg: string } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<number, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadIdx = useRef<number | null>(null);

  const loadData = async () => {
    const cur = await ApiService.getCurriculum();
    setCurriculum(cur);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const availableCourses = useMemo(() => {
    if (!user) return [];
    if (user.role === UserRole.ADMIN || user.role === UserRole.DEAN) return curriculum;
    return curriculum.filter(c => `${c.name} (${c.degree})` === user.department);
  }, [curriculum, user]);

  const activeCourse = useMemo(() =>
    availableCourses.find(c => c.id === selectedCourseId),
    [availableCourses, selectedCourseId]
  );

  const availableSubjects = useMemo(() => {
    if (!activeCourse) return [];
    if (user?.role === UserRole.ADMIN || user?.role === UserRole.HOD) return activeCourse.subjects;
    return activeCourse.subjects.filter(s => s.assignedStaffIds?.includes(user?.id || ''));
  }, [activeCourse, user]);

  const activeSubject = useMemo(() =>
    availableSubjects.find(s => s.id === selectedSubjectId),
    [availableSubjects, selectedSubjectId]
  );

  const handleFileSelect = (idx: number) => {
    activeUploadIdx.current = idx;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeUploadIdx.current !== null) {
      setPendingFiles(prev => ({ ...prev, [activeUploadIdx.current!]: file.name }));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    activeUploadIdx.current = null;
  };

  const handleSave = async (idx: number) => {
    if (!selectedCourseId || !selectedSubjectId || !pendingFiles[idx] || !activeCourse || !activeSubject) return;

    const currentMaterials = [...(activeSubject.materials || [])];
    while (currentMaterials.length < activeSubject.lessonsCount) currentMaterials.push('');
    const fileName = pendingFiles[idx];
    currentMaterials[idx] = fileName;

    await ApiService.updateSubjectMaterials(selectedCourseId, selectedSubjectId, currentMaterials);

    // Notification Dispatch Logic
    const allUsers = await ApiService.getUsers();
    const courseFullName = `${activeCourse.name} (${activeCourse.degree})`;

    // Identity all students enrolled in this specific department course
    const targetStudents = allUsers.filter(u =>
      u.role === UserRole.STUDENT &&
      u.department === courseFullName
    );

    const moduleName = activeSubject.lessonNames?.[idx] || `Module ${idx + 1}`;

    for (const std of targetStudents) {
      await ApiService.addNotification({
        id: crypto.randomUUID(),
        userId: std.id,
        message: `Learning Release: Professor ${user?.name} has uploaded new content "${fileName}" for ${activeSubject.name} - ${moduleName}.`,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'MATERIAL_UPDATE'
      });
    }

    setPendingFiles(prev => {
      const copy = { ...prev };
      delete copy[idx];
      return copy;
    });

    setStatus({ type: 'success', msg: `Resource Authorized. ${targetStudents.length} students notified via GAPT Signal.` });
    loadData();
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <DashboardLayout title="Faculty Resource Upload">
      <div className="max-w-6xl mx-auto space-y-10 pb-24 animate-in fade-in duration-500">

        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -mr-40 -mt-40"></div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Department</label>
              <select
                value={selectedCourseId || ''}
                onChange={e => { setSelectedCourseId(e.target.value); setSelectedSubjectId(null); setPendingFiles({}); }}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
              >
                <option value="" disabled>Choose Department...</option>
                {availableCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.degree})</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unit Assignment</label>
              <select
                disabled={!selectedCourseId}
                value={selectedSubjectId || ''}
                onChange={e => { setSelectedSubjectId(e.target.value); setPendingFiles({}); }}
                className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer disabled:opacity-30"
              >
                <option value="" disabled>Select Subject...</option>
                {availableSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          </div>
        </div>

        {status && (
          <div className={`p-5 rounded-2xl border text-center text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top-4 ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
            {status.msg}
          </div>
        )}

        {activeSubject ? (
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
            <div className="p-8 md:p-10 border-b border-white/5 bg-black/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-white font-black text-xl lowercase tracking-tight">{activeSubject.name}</h3>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Registry Code: {activeSubject.code}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-xl border border-emerald-500/20">
                  {activeSubject.materials?.filter(Boolean).length} / {activeSubject.lessonsCount} Deployed
                </span>
              </div>
            </div>

            <div className="p-6 md:p-10 space-y-6">
              {Array.from({ length: activeSubject.lessonsCount }).map((_, i) => {
                const currentFile = activeSubject.materials?.[i];
                const pendingFile = pendingFiles[i];
                const activeFile = pendingFile || currentFile;
                const isModified = !!pendingFile;

                return (
                  <div key={i} className={`flex flex-col xl:flex-row xl:items-center justify-between p-8 rounded-[2.5rem] border transition-all gap-10 group ${isModified ? 'bg-indigo-500/5 border-indigo-500/40' : 'bg-slate-950 border-white/5 hover:border-white/10'}`}>
                    <div className="flex items-center gap-8 min-w-0 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg transition-all ${currentFile ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-500'}`}>{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black text-white uppercase truncate tracking-tight">{activeSubject.lessonNames?.[i] || `Module ${i + 1}`}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <div className={`w-2 h-2 rounded-full ${currentFile ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                          <p className={`text-[10px] font-mono uppercase tracking-widest truncate ${activeFile ? 'text-emerald-400 font-bold' : 'text-slate-700'}`}>
                            {activeFile || 'Archive Pending Deployment'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <button
                        onClick={() => handleFileSelect(i)}
                        className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all active:scale-95 ${activeFile ? 'bg-slate-900 border-white/10 text-slate-400 hover:text-white' : 'bg-primary text-white border-primary/20 shadow-lg'}`}
                      >
                        {currentFile ? 'Update Asset' : 'Select Resource'}
                      </button>

                      {isModified && (
                        <button
                          onClick={() => handleSave(i)}
                          className="px-10 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-900/40 active:scale-95 transition-all flex items-center gap-3"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                          Notify Students
                        </button>
                      )}

                      {currentFile && !isModified && (
                        <div className="px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Registry Sync OK</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="py-32 text-center border-4 border-dashed border-slate-800 rounded-[3rem]">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-700">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <p className="text-slate-600 font-bold uppercase tracking-[0.2em] text-xs">Select unit to begin resource deployment</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StaffMaterials;
