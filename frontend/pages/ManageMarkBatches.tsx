
import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { MarkBatch, BatchStatus } from '../types';
import { ApiService } from '../store';

const BATCH_TEMPLATES = [
  { name: 'INTERNAL 1', label: 'Formative Assessment 1' },
  { name: 'INTERNAL 2', label: 'Formative Assessment 2' },
  { name: 'END SEMESTER', label: 'Summative Final Exam' },
  { name: 'SUPPLEMENTARY', label: 'Arrear Evaluation' }
];

const ManageMarkBatches: React.FC = () => {
  const [batches, setBatches] = useState<MarkBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBatch, setNewBatch] = useState({
    name: '',
    academicYear: '2024-25',
    subjectsRaw: '',
    semNum: '1'
  });

  useEffect(() => {
    refreshBatches();
  }, []);

  const refreshBatches = async () => {
    const data = await ApiService.getMarkBatches();
    setBatches(data);
    setIsLoading(false);
  };

  const applyTemplate = (templateName: string) => {
    setNewBatch(prev => ({
      ...prev,
      name: `SEM ${prev.semNum} ${templateName}`
    }));
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
    await ApiService.addMarkBatch(batch);
    await refreshBatches();
    setIsModalOpen(false);
    setNewBatch({ name: '', academicYear: '2024-25', subjectsRaw: '', semNum: '1' });
  };

  const updateStatus = async (id: string, status: BatchStatus) => {
    await ApiService.updateMarkBatch(id, { status });
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
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${batch.status === BatchStatus.OPEN ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#1e293b] border border-white/10 p-8 md:p-12 rounded-[2.5rem] max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-200 my-10">
            <h3 className="text-2xl font-black text-white mb-8 lowercase tracking-tight">New Assessment Batch</h3>

            <div className="mb-10 space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Template Nomenclature</label>
              <div className="grid grid-cols-2 gap-3">
                {BATCH_TEMPLATES.map(t => (
                  <button
                    key={t.name}
                    onClick={() => applyTemplate(t.name)}
                    className="p-4 bg-slate-900 border border-white/5 rounded-2xl text-left hover:border-primary/40 transition-all group"
                  >
                    <p className="text-[10px] font-black text-white uppercase group-hover:text-primary">{t.name}</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Target Semester</label>
                  <select
                    value={newBatch.semNum}
                    onChange={e => setNewBatch({ ...newBatch, semNum: e.target.value })}
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>Semester {n}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Final Batch Name</label>
                  <input
                    type="text" required placeholder="E.G. SEM 1 END SEMESTER"
                    value={newBatch.name} onChange={e => setNewBatch({ ...newBatch, name: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Academic Year</label>
                  <select
                    value={newBatch.academicYear} onChange={e => setNewBatch({ ...newBatch, academicYear: e.target.value })}
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
                  value={newBatch.subjectsRaw} onChange={e => setNewBatch({ ...newBatch, subjectsRaw: e.target.value.toUpperCase() })}
                  rows={3}
                  className="w-full bg-slate-800 border-slate-700 rounded-xl px-4 py-4 text-white font-bold outline-none resize-none no-scrollbar"
                />
                <p className="text-[9px] text-slate-600 font-bold uppercase mt-2">Enter the subjects specifically for this semester cycle to enable student auto-sync.</p>
              </div>

              <div className="flex space-x-4 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-xs font-black text-slate-500 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Authorize Batch Registry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageMarkBatches;
