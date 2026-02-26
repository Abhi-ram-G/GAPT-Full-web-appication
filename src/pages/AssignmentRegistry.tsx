
import React, { useState, useEffect, useContext, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store';
import { AcademicTask, UserRole, Course, AccessLevel, Feature, TaskPriority, TaskStatus } from '@/types';

const AssignmentRegistry: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    title: '', description: '', dueDate: '', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO,
    subjectId: '', department: '', studyYear: '1st Year'
  });

  const refreshData = async () => {
    const [t, c, p] = await Promise.all([
      MockDB.getTasks(),
      MockDB.getCurriculum(),
      MockDB.getPermissions()
    ]);
    setTasks(t);
    setCurriculum(c);
    setPermissions(p);
    setIsLoading(false);
  };

  useEffect(() => { refreshData(); }, []);

  const accessLevel = useMemo(() => {
    return permissions[currentView]?.[Feature.ASSIGNMENTS] || AccessLevel.NO_ACCESS;
  }, [permissions, currentView]);

  const hasEditAccess = useMemo(() => accessLevel === AccessLevel.EDIT_ALL, [accessLevel]);

  const filteredTasks = useMemo(() => {
    if (currentView === UserRole.STUDENT) {
      return tasks.filter(t => t.department === user?.department && t.studyYear === user?.studyYear);
    }
    const deptBase = user?.department?.split(' (')[0];
    return tasks.filter(t => t.department.startsWith(deptBase || ''));
  }, [tasks, user, currentView]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasEditAccess || !user) return;
    const selectedCourse = curriculum.find(c => c.subjects.some(s => s.id === newTask.subjectId));
    const selectedSubject = selectedCourse?.subjects.find(s => s.id === newTask.subjectId);
    const task: AcademicTask = {
      id: crypto.randomUUID(), title: newTask.title, description: newTask.description,
      dueDate: new Date(newTask.dueDate).toISOString(), priority: newTask.priority,
      status: newTask.status, subjectId: newTask.subjectId, subjectName: selectedSubject?.name || 'Unit',
      department: newTask.department || user.department || 'Unassigned', studyYear: newTask.studyYear,
      staffId: user.id, staffName: user.name, createdAt: new Date().toISOString()
    };
    await MockDB.addTask(task);
    setIsAddModalOpen(false);
    setNewTask({ title: '', description: '', dueDate: '', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, subjectId: '', department: '', studyYear: '1st Year' });
    refreshData();
  };

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    if (!hasEditAccess) return;
    await MockDB.updateTaskStatus(taskId, newStatus);
    refreshData();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (hasEditAccess && confirm('Permanently delete this task?')) {
      await MockDB.deleteTask(id);
      refreshData();
    }
  };

  const getDeadlineStatus = (dueDate: string) => {
    const days = Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: 'Overdue', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
    return { label: `${days}d Remaining`, color: days <= 2 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
  };

  if (accessLevel === AccessLevel.NO_ACCESS) return null;

  return (
    <DashboardLayout title="Academic Tasks & Registry">
      <div className="max-w-6xl mx-auto space-y-10 pb-24">
        <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-10 shadow-2xl relative flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="relative z-10">
            <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">assignment registry</h2>
            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-2">Authorization Mode: {accessLevel.replace(/_/g, ' ')}</p>
          </div>
          {hasEditAccess && (
            <button onClick={() => setIsAddModalOpen(true)} className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
              Deploy Task
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTasks.map(task => {
            const deadline = getDeadlineStatus(task.dueDate);
            const isExpanded = expandedTaskId === task.id;
            return (
              <div key={task.id} onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="bg-surface-component border border-border-subtle p-8 rounded-[2.5rem] shadow-xl hover:border-primary/20 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-6">
                  <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${deadline.color}`}>{deadline.label}</span>
                  {hasEditAccess && <button onClick={(e) => handleDelete(e, task.id)} className="text-text-muted hover:text-rose-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-primary uppercase mb-1">{task.subjectName}</p>
                      <h4 className="text-xl font-black text-text-primary uppercase truncate leading-tight">{task.title}</h4>
                    </div>
                    {hasEditAccess ? (
                      <select value={task.status} onClick={(e) => e.stopPropagation()} onChange={(e) => handleStatusUpdate(task.id, e.target.value as TaskStatus)} className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border outline-none bg-slate-800 text-slate-400">
                        {Object.values(TaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : <span className="px-3 py-1.5 rounded-xl text-[8px] font-black uppercase border bg-slate-800 text-slate-400">{task.status}</span>}
                  </div>
                  <p className={`text-xs text-text-muted leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}>{task.description}</p>
                </div>
                <div className="mt-8 pt-6 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-text-muted"><span>Hard Deadline</span><span className="text-indigo-400 font-mono">{new Date(task.dueDate).toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-surface-elevated border border-border-subtle p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-text-primary mb-10 lowercase tracking-tight">initialize academic task</h3>
            <form onSubmit={handleAddTask} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input type="text" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value.toUpperCase() })} placeholder="TASK NAME" className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none" />
                <input type="datetime-local" required value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none" />
              </div>
              <textarea required value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={4} placeholder="INSTRUCTIONS..." className="w-full bg-surface-deep border border-border-subtle rounded-3xl px-6 py-5 text-sm text-text-primary font-bold outline-none resize-none" />
              <div className="grid grid-cols-2 gap-8">
                <select required value={newTask.subjectId} onChange={e => setNewTask({ ...newTask, subjectId: e.target.value })} className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none">
                  <option value="" disabled>CHOOSE UNIT</option>
                  {curriculum.map(c => c.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
                <select required value={newTask.department} onChange={e => setNewTask({ ...newTask, department: e.target.value })} className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none">
                  <option value="" disabled>CHOOSE DEPT</option>
                  {curriculum.map(c => <option key={c.id} value={`${c.name} (${c.degree})`}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 text-xs font-black text-text-muted uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex-[2] py-5 bg-primary text-white rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl">Authorize Task</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AssignmentRegistry;
