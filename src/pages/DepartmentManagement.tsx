
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Course, AcademicBatch } from '../types';
import { MockDB } from '../store';

const INSTITUTIONAL_DEPARTMENTS = [
  'Artificial Intelligence & Data Science', 'Artificial Intelligence & Machine Learning',
  'Computer Science & Engineering', 'Computer Science & Business Systems',
  'Information Technology', 'Mechanical Engineering', 'Civil Engineering',
  'Electronics & Communication Engineering', 'Electrical & Electronics Engineering',
  'Biomedical Engineering', 'Agricultural Engineering', 'Food Technology',
  'Fashion Technology', 'Mechatronics Engineering', 'Automobile Engineering',
  'MBA', 'MCA'
].sort();

const INSTITUTIONAL_DEGREES = ['B.E', 'B.Tech', 'M.E', 'M.Tech', 'MBA', 'MCA', 'Ph.D', 'Post Graduate'];

const CLUSTERS = ['Computing', 'Circuits', 'Mechanical', 'Bio & Agri', 'Management', 'Fashion'];

const DepartmentManagement: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [isAddDeptModalOpen, setIsAddDeptModalOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState<'BATCHES' | 'REGISTRY'>('BATCHES');
  const [batchTypeFilter, setBatchTypeFilter] = useState<'UG' | 'PG'>('UG');

  const [newBatch, setNewBatch] = useState({ name: '', startYear: 2024, endYear: 2028, batchType: 'UG' as 'UG' | 'PG', selectedDepts: [] as string[] });
  const [newCourse, setNewCourse] = useState({ name: '', degree: 'B.E', domain: 'Computing', batchType: 'UG' as 'UG' | 'PG' });

  const loadData = async () => {
    const [cur, bat] = await Promise.all([
      MockDB.getCurriculum(),
      MockDB.getAcademicBatches()
    ]);
    setCourses(cur);
    setBatches(bat);
  };

  useEffect(() => {
    loadData();
  }, []);

  const persist = async (updatedCourses: Course[], updatedBatches: AcademicBatch[]) => {
    setCourses(updatedCourses);
    setBatches(updatedBatches);
    await MockDB.persistStructure(updatedCourses, updatedBatches);
    await loadData();
  };

  const deleteBatch = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Permanently remove this cohort from the institutional system? This action cannot be reversed.')) {
      const updated = batches.filter(b => b.id !== id);
      await persist(courses, updated);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch: AcademicBatch = {
      id: crypto.randomUUID(),
      name: newBatch.name || `${newBatch.startYear} - ${newBatch.endYear} Cohort`,
      startYear: newBatch.startYear,
      endYear: newBatch.endYear,
      batchType: newBatch.batchType,
      departmentIds: newBatch.selectedDepts
    };
    await persist(courses, [...batches, batch]);
    setIsAddBatchModalOpen(false);
    setNewBatch({ name: '', startYear: 2024, endYear: 2028, batchType: 'UG', selectedDepts: [] });
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const course: Course = {
      id: crypto.randomUUID(),
      name: newCourse.name,
      degree: newCourse.degree,
      domain: newCourse.domain,
      batchType: newCourse.batchType,
      subjects: []
    };
    const updatedCourses = [...courses, course];
    await persist(updatedCourses, batches);
    setIsAddDeptModalOpen(false);
    setNewCourse({ name: '', degree: 'B.E', domain: 'Computing', batchType: 'UG' });
  };

  const deleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this department from the master registry? This will also unregister it from all active institutional batches.')) {
      const updatedBatches = batches.map(b => ({
        ...b,
        departmentIds: b.departmentIds.filter(did => did !== id)
      }));
      const updatedCourses = courses.filter(c => c.id !== id);
      await persist(updatedCourses, updatedBatches);
    }
  };

  const toggleDeptInBatch = (deptId: string) => {
    setNewBatch(prev => ({
      ...prev,
      selectedDepts: prev.selectedDepts.includes(deptId) 
        ? prev.selectedDepts.filter(id => id !== deptId)
        : [...prev.selectedDepts, deptId]
    }));
  };

  const coursesByDomain = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    courses.forEach(c => {
      if (!groups[c.domain]) groups[c.domain] = [];
      groups[c.domain].push(c);
    });
    return groups;
  }, [courses]);

  const filteredBatches = batches.filter(b => b.batchType === batchTypeFilter);

  return (
    <DashboardLayout title="Academic Structure Governance">
      <div className="max-w-6xl mx-auto py-2">
        <div className="flex items-center justify-center gap-4 mb-10">
          <button type="button" onClick={() => setViewMode('BATCHES')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${viewMode === 'BATCHES' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-surface-component text-text-muted border-border-subtle'}`}>Institutional Cohorts</button>
          <button type="button" onClick={() => setViewMode('REGISTRY')} className={`px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest border transition-all ${viewMode === 'REGISTRY' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-surface-component text-text-muted border-border-subtle'}`}>Master Registry</button>
        </div>

        {viewMode === 'BATCHES' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-text-primary font-black text-2xl lowercase tracking-tight">Active cohorts</h3>
                <div className="flex bg-surface-deep p-1 rounded-xl mt-3 border border-border-subtle w-fit">
                  <button onClick={() => setBatchTypeFilter('UG')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${batchTypeFilter === 'UG' ? 'bg-emerald-600 text-white shadow-lg' : 'text-text-muted'}`}>UG Division</button>
                  <button onClick={() => setBatchTypeFilter('PG')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${batchTypeFilter === 'PG' ? 'bg-emerald-600 text-white shadow-lg' : 'text-text-muted'}`}>PG Division</button>
                </div>
              </div>
              <button onClick={() => { setNewBatch({...newBatch, batchType: batchTypeFilter}); setIsAddBatchModalOpen(true); }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                Initialize Batch
              </button>
            </div>

            <div className="space-y-5 pb-20">
              {filteredBatches.map(batch => (
                <div key={batch.id} onClick={() => navigate(`/admin/departments/batch/${batch.id}`)} className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-8 cursor-pointer flex items-center justify-between group transition-all duration-300 hover:border-indigo-500/50 shadow-lg">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-2xl">
                      {batch.startYear.toString().slice(-2)}
                    </div>
                    <div>
                      <h4 className="text-text-primary font-black text-2xl uppercase tracking-tighter leading-tight group-hover:text-primary transition-colors">
                        {batch.startYear} - {batch.endYear} COHORT
                      </h4>
                      <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">{batch.startYear} — {batch.endYear}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="bg-surface-deep px-8 py-5 rounded-[1.5rem] border border-border-subtle flex items-center justify-center">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                        {batch.departmentIds.length} BRANCHES REGISTERED
                      </span>
                    </div>
                    <button type="button" onClick={(e) => deleteBatch(batch.id, e)} className="p-3 bg-surface-deep border-2 border-border-subtle rounded-xl text-red-500 hover:text-white hover:bg-red-600 hover:border-red-500 transition-all active:scale-95">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              ))}
              {filteredBatches.length === 0 && (
                <div className="py-20 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                   <p className="text-text-muted font-black uppercase tracking-[0.2em] text-xs">No batches registered in this division</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'REGISTRY' && (
          <div className="animate-in fade-in duration-500 space-y-12 pb-20">
            <div className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl flex items-center justify-between">
              <div>
                <h3 className="text-text-primary font-black text-2xl lowercase tracking-tight">Institutional Registry</h3>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Master authority list for authorized academic branches</p>
              </div>
              <button onClick={() => setIsAddDeptModalOpen(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                Register Branch
              </button>
            </div>

            {Object.entries(coursesByDomain).map(([domain, domainCourses]) => (
              <div key={domain} className="space-y-6">
                <div className="flex items-center gap-4 px-4">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-text-primary font-black text-sm uppercase tracking-[0.2em]">{domain}</h4>
                  <span className="text-[10px] text-text-muted font-bold">{(domainCourses as Course[]).length} Active Entities</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {(domainCourses as Course[]).map(dept => (
                     <div key={dept.id} className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-8 group hover:border-emerald-500/30 transition-all flex flex-col justify-between shadow-lg">
                        <div className="flex justify-between items-start mb-6">
                           <div className="min-w-0">
                             <h5 className="text-text-primary font-black text-lg uppercase truncate leading-tight group-hover:text-emerald-500 transition-colors">{dept.name}</h5>
                             <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">{dept.degree} • {dept.batchType}</p>
                           </div>
                           <button 
                             type="button" 
                             onClick={(e) => deleteCourse(dept.id, e)} 
                             className="p-2.5 text-text-muted hover:text-white hover:bg-red-600/80 bg-surface-deep rounded-xl transition-all border border-border-subtle active:scale-95"
                           >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                           </button>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            ))}
            {courses.length === 0 && (
              <div className="py-24 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                <p className="text-text-muted font-black uppercase tracking-[0.2em] text-xs">The registry is currently empty</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Initialize Batch Modal */}
      {isAddBatchModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-surface-elevated border border-border-subtle p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-200 my-10">
            <h3 className="text-2xl font-black text-text-primary mb-8 lowercase tracking-tight">Initialize academic cohort</h3>
            <form onSubmit={handleCreateBatch} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Cohort Nomenclature</label>
                  <input type="text" required placeholder="Batch of 2024" value={newBatch.name} onChange={e => setNewBatch({...newBatch, name: e.target.value})} className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none focus:ring-1 focus:ring-indigo-500 transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Academic Division</label>
                  <div className="grid grid-cols-2 gap-3 bg-surface-deep p-1.5 rounded-2xl border border-border-subtle">
                    <button type="button" onClick={() => setNewBatch({...newBatch, batchType: 'UG'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newBatch.batchType === 'UG' ? 'bg-emerald-600 text-white' : 'text-text-muted'}`}>UG</button>
                    <button type="button" onClick={() => setNewBatch({...newBatch, batchType: 'PG'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newBatch.batchType === 'PG' ? 'bg-emerald-600 text-white' : 'text-text-muted'}`}>PG</button>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-1">Assign Initial Branches</label>
                <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                  {Object.entries(coursesByDomain).map(([domain, domainCourses]) => {
                    const filtered = (domainCourses as Course[]).filter(c => c.batchType === newBatch.batchType);
                    if (filtered.length === 0) return null;
                    return (
                      <div key={domain} className="space-y-3">
                        <p className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">{domain}</p>
                        <div className="grid grid-cols-2 gap-3">
                          {filtered.map(dept => {
                            const isSelected = newBatch.selectedDepts.includes(dept.id);
                            return (
                              <button key={dept.id} type="button" onClick={() => toggleDeptInBatch(dept.id)} className={`px-5 py-4 rounded-[1.5rem] text-[10px] font-black uppercase border transition-all ${isSelected ? 'bg-primary text-white border-primary shadow-lg' : 'bg-surface-deep border-border-subtle text-text-muted'}`}>
                                {dept.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {courses.filter(c => c.batchType === newBatch.batchType).length === 0 && (
                    <div className="py-10 text-center bg-surface-deep/40 rounded-3xl border border-dashed border-border-subtle">
                       <p className="text-[10px] text-text-muted font-bold uppercase">No matching branches in registry</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsAddBatchModalOpen(false)} className="flex-1 py-4 text-xs font-black text-text-muted uppercase">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl">Authorize Cohort</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Department Modal */}
      {isAddDeptModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0b1121] border border-white/5 p-10 rounded-[3rem] max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200 my-10">
            <h3 className="text-2xl font-black text-white mb-8 lowercase tracking-tight">Register Master Branch</h3>
            <form onSubmit={handleCreateDept} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Department Nomenclature</label>
                <select 
                  required value={newCourse.name} 
                  onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none appearance-none"
                >
                  <option value="" disabled>Select Department Name...</option>
                  {INSTITUTIONAL_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Degree Type</label>
                  <select 
                    required value={newCourse.degree} 
                    onChange={e => setNewCourse({...newCourse, degree: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
                  >
                    {INSTITUTIONAL_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Cluster</label>
                  <select 
                    required value={newCourse.domain} 
                    onChange={e => setNewCourse({...newCourse, domain: e.target.value})}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold outline-none"
                  >
                    {CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Program Division</label>
                <div className="grid grid-cols-2 gap-4 bg-slate-900 p-1.5 rounded-2xl border border-white/10">
                   <button type="button" onClick={() => setNewCourse({...newCourse, batchType: 'UG'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newCourse.batchType === 'UG' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>UG Program</button>
                   <button type="button" onClick={() => setNewCourse({...newCourse, batchType: 'PG'})} className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newCourse.batchType === 'PG' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>PG Program</button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddDeptModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-emerald-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl">Register Master Branch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DepartmentManagement;
