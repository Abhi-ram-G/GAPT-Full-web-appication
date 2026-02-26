import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { MarkBatch, BatchStatus } from '@/types/types';
import { MockDB } from '@/store/store';

const ManageMarkBatches: React.FC = () => {
  const [batches, setBatches] = useState<MarkBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({ name: '', academicYear: '2024-25', subjectsRaw: '' });

  useEffect(() => {
    refreshBatches();
  }, []);

  const refreshBatches = async () => {
    const data = await MockDB.getMarkBatches();
    setBatches(data);
    setIsLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const subjectList = newBatch.subjectsRaw
      .split(/[,;\n]/)
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);

    const batch: MarkBatch = {
      id: crypto.randomUUID(),
      name: newBatch.name,
      academicYear: newBatch.academicYear,
      status: BatchStatus.OPEN,
      subjects: subjectList,
      createdAt: new Date().toISOString()
    };
    await MockDB.addMarkBatch(batch);
    await refreshBatches();
    setIsModalOpen(false);
    setNewBatch({ name: '', academicYear: '2024-25', subjectsRaw: '' });
  };

  const updateStatus = async (id: string, status: BatchStatus) => {
    await MockDB.updateMarkBatch(id, { status });
    await refreshBatches();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Assessment Control">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Assessment Control Center">
      <div className="max-w-6xl mx-auto py-2 space-y-8">
        
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
          <div>
            <h2 className="text-white font-black text-2xl lowercase tracking-tight">mark entry batches</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Configure Institutional Assessment Cycles</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
          >
            Create New Batch
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map(batch => (
            <div key={batch.id} className="bg-slate-900 border border-slate-800 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group flex flex-col">
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <h3 className="text-white font-black text-lg tracking-tight uppercase">{batch.name}</h3>
                   <p className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest mt-1">{batch.academicYear}</p>
                 </div>
                 <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                   batch.status === BatchStatus.OPEN ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                   batch.status === BatchStatus.FROZEN ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                   'bg-red-500/10 text-red-500 border-red-500/20'
                 }`}>
                   {batch.status}
                 </span>
               </div>

               <div className="mb-6 flex-1">
                 <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-3">Associated Subjects</p>
                 <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                    {batch.subjects?.map(s => (
                      <span key={s} className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[9px] text-slate-400 font-mono">{s}</span>
                    ))}
                    {(!batch.subjects || batch.subjects.length === 0) && <span className="text-[10px] text-slate-700 italic">No subjects defined</span>}
                 </div>
               </div>

               <div className="space-y-3">
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Global Governance</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => updateStatus(batch.id, BatchStatus.OPEN)}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${batch.status === BatchStatus.OPEN ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'}`}
                    >
                      Open
                    </button>
                    <button 
                      onClick={() => updateStatus(batch.id, BatchStatus.FROZEN)}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${batch.status === BatchStatus.FROZEN ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'}`}
                    >
                      Freeze
                    </button>
                    <button 
                      onClick={() => updateStatus(batch.id, BatchStatus.BLOCKED)}
                      className={`py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${batch.status === BatchStatus.BLOCKED ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-white'}`}
                    >
                      Block
                    </button>
                  </div>
               </div>

               <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <p className="text-[8px] text-slate-600 font-bold uppercase">Created {new Date(batch.createdAt).toLocaleDateString()}</p>
                  <div className={`w-2 h-2 rounded-full ${batch.status === BatchStatus.OPEN ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
               </div>
            </div>
          ))}
          
          {batches.length === 0 && (
            <div className="md:col-span-3 py-20 text-center border-4 border-dashed border-slate-800 rounded-[3rem]">
               <p className="text-slate-600 font-black uppercase tracking-[0.2em]">No assessment batches configured</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1e293b] border border-white/10 p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-6 lowercase tracking-tight">New Assessment Batch</h3>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Batch Name</label>
                  <input 
                    type="text" required placeholder="INTERNAL I"
                    value={newBatch.name} onChange={e => setNewBatch({...newBatch, name: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Academic Year</label>
                  <select 
                    value={newBatch.academicYear} onChange={e => setNewBatch({...newBatch, academicYear: e.target.value})}
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none appearance-none"
                  >
                    <option value="2024-25">2024-25</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Assessment Subjects (Comma Separated)</label>
                <textarea 
                  required placeholder="MATHEMATICS, DATA STRUCTURES, AI..."
                  value={newBatch.subjectsRaw} onChange={e => setNewBatch({...newBatch, subjectsRaw: e.target.value.toUpperCase()})}
                  rows={3}
                  className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none resize-none no-scrollbar" 
                />
                <p className="text-[9px] text-slate-600 font-bold uppercase mt-2">Enter the subjects specifically for this semester/internal cycle.</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-xs font-black text-slate-500 uppercase">Cancel</button>
                <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20">Create Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageMarkBatches;
