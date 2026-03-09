
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { AcademicTask, User, StudentTaskProgress, TaskPriority, TaskStatus, Course, UserRole, AccessLevel, Feature } from '../types';

const BatchTaskDetail: React.FC = () => {
   const { batchId } = useParams<{ batchId: string }>();
   const { user, currentView } = useContext(AuthContext);
   const navigate = useNavigate();
   const [tasks, setTasks] = useState<AcademicTask[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
   const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
   const [isAddModalOpen, setIsAddModalOpen] = useState(false);
   const [curriculum, setCurriculum] = useState<Course[]>([]);
   const [allUsers, setAllUsers] = useState<User[]>([]);
   const [permissions, setPermissions] = useState<Record<string, any>>({});

   const [newTask, setNewTask] = useState({
      title: '', description: '', dueDate: '', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO,
      subjectId: '', department: '', studyYear: batchId || '1st Year', assignedStaffId: '', studentCount: 0, selectedStudentIds: [] as string[]
   });

   const fetchData = async () => {
      const [allTasks, c, u, p] = await Promise.all([
         ApiService.getTasks(),
         ApiService.getCurriculum(),
         ApiService.getUsers(),
         ApiService.getPermissions()
      ]);
      const batchTasks = allTasks.filter(t => t.studyYear === batchId);
      setTasks(batchTasks);
      setCurriculum(c);
      setAllUsers(u);
      setPermissions(p);
      setIsLoading(false);
   };

   useEffect(() => {
      fetchData();
   }, [batchId]);

   const accessLevel = useMemo(() => {
      return permissions[currentView]?.[Feature.ASSIGNMENTS] || AccessLevel.NO_ACCESS;
   }, [permissions, currentView]);

   const hasEditAccess = useMemo(() => accessLevel === AccessLevel.EDIT_ALL, [accessLevel]);

   const groupedByStaff = useMemo(() => {
      const groups: Record<string, { staffName: string, tasks: AcademicTask[] }> = {};
      tasks.forEach(task => {
         if (!groups[task.staffId]) {
            groups[task.staffId] = { staffName: task.staffName, tasks: [] };
         }
         groups[task.staffId].tasks.push(task);
      });
      return groups;
   }, [tasks]);

   const handleAddTask = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasEditAccess || !user) return;
      const selectedCourse = curriculum.find(c => c.subjects.some(s => s.id === newTask.subjectId));
      const selectedSubject = selectedCourse?.subjects.find(s => s.id === newTask.subjectId);
      const assignedStaff = allUsers.find(u => u.id === newTask.assignedStaffId);

      const assignedStudents = allUsers
         .filter(u => newTask.selectedStudentIds.includes(u.id))
         .map(u => ({
            studentId: u.id,
            studentName: u.name,
            progress: StudentTaskProgress.NOT_STARTED
         }));

      const task: AcademicTask = {
         id: crypto.randomUUID(), title: newTask.title, description: newTask.description,
         dueDate: new Date(newTask.dueDate).toISOString(), priority: newTask.priority,
         status: newTask.status, subjectId: newTask.subjectId, subjectName: selectedSubject?.name || 'Unit',
         department: newTask.department || user.department || 'Unassigned', studyYear: batchId || '1st Year',
         staffId: assignedStaff?.id || user.id, staffName: assignedStaff?.name || user.name,
         createdAt: new Date().toISOString(),
         isFrozen: false,
         assignedStudents
      };
      await ApiService.addTask(task);
      setIsAddModalOpen(false);
      setNewTask({ title: '', description: '', dueDate: '', priority: TaskPriority.MEDIUM, status: TaskStatus.TODO, subjectId: '', department: '', studyYear: batchId || '1st Year', assignedStaffId: '', studentCount: 0, selectedStudentIds: [] });
      fetchData();
   };

   if (isLoading) {
      return (
         <DashboardLayout title={`Batch Analysis: ${batchId}`}>
            <div className="flex items-center justify-center h-64">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
         </DashboardLayout>
      );
   }

   const selectedTask = tasks.find(t => t.id === selectedTaskId);
   const selectedStaffTasks = selectedStaffId ? groupedByStaff[selectedStaffId]?.tasks : [];

   // Get all unique students assigned to the selected staff in this batch
   const staffStudents = selectedStaffId ? Array.from(new Set(
      groupedByStaff[selectedStaffId].tasks.flatMap(t => t.assignedStudents?.map(s => JSON.stringify({ id: s.studentId, name: s.studentName })) || [])
   )).map(s => JSON.parse(s)) : [];

   return (
      <DashboardLayout title={`Task Registry: ${batchId}`}>
         <div className="max-w-6xl mx-auto space-y-10 pb-24">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div className="flex items-center gap-4">
                  <button onClick={() => navigate(-1)} className="p-3 bg-surface-component border border-border-subtle rounded-2xl text-text-muted hover:text-primary transition-colors">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                  </button>
                  <div>
                     <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">{batchId} Deployment Matrix</h2>
                     <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mt-1">Batch Task Distribution & Audit</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  {hasEditAccess && (
                     <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-8 py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
                     >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                        Deploy New Task
                     </button>
                  )}
                  <button
                     onClick={() => navigate('/email?compose=true')}
                     className="p-4 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                     title="Compose Email"
                  >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               {/* Staff List */}
               <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] px-4">Authorized Faculty</h3>
                  <div className="space-y-2">
                     {Object.entries(groupedByStaff).map(([staffId, data]) => (
                        <button
                           key={staffId}
                           onClick={() => {
                              setSelectedStaffId(staffId);
                              setSelectedTaskId(null);
                           }}
                           className={`w-full p-6 rounded-[2rem] border transition-all text-left flex items-center justify-between group ${selectedStaffId === staffId ? 'bg-primary/10 border-primary/40 shadow-lg' : 'bg-surface-component border-border-subtle hover:border-primary/20'}`}
                        >
                           <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${selectedStaffId === staffId ? 'bg-primary text-white' : 'bg-surface-deep text-text-muted'}`}>
                                 {data.staffName[0]}
                              </div>
                              <div>
                                 <p className="text-sm font-black text-text-primary uppercase truncate">{data.staffName}</p>
                                 <p className="text-[9px] text-text-muted font-bold uppercase tracking-widest">{data.tasks.length} Tasks Assigned</p>
                              </div>
                           </div>
                           <svg className={`w-4 h-4 text-text-muted transition-transform ${selectedStaffId === staffId ? 'rotate-90 text-primary' : 'group-hover:translate-x-1'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                        </button>
                     ))}
                     {Object.keys(groupedByStaff).length === 0 && (
                        <div className="p-10 text-center border-2 border-dashed border-border-subtle rounded-[2rem]">
                           <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">No faculty assignments found</p>
                        </div>
                     )}
                  </div>
               </div>

               {/* Task List for Selected Staff */}
               <div className="lg:col-span-2 space-y-6">
                  {!selectedStaffId ? (
                     <div className="h-full flex flex-col items-center justify-center py-20 text-center border-4 border-dashed border-border-subtle rounded-[3rem]">
                        <div className="w-16 h-16 bg-surface-component rounded-full flex items-center justify-center text-text-muted mb-6">
                           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        </div>
                        <h4 className="text-text-primary font-black text-xl uppercase tracking-tighter">Select Faculty Member</h4>
                        <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-2">Audit task deployments for specific educators</p>
                     </div>
                  ) : (
                     <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4">
                           <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Active Tasks: {groupedByStaff[selectedStaffId].staffName}</h3>
                           <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Total Students Assigned:</span>
                              <span className="px-3 py-1 bg-surface-deep rounded-lg text-[10px] font-black text-primary">{staffStudents.length}</span>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {selectedStaffTasks.map(task => (
                              <button
                                 key={task.id}
                                 onClick={() => setSelectedTaskId(task.id)}
                                 className={`p-6 rounded-[2.5rem] border transition-all text-left flex flex-col gap-4 group ${selectedTaskId === task.id ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg' : 'bg-surface-component border-border-subtle hover:border-emerald-500/20'}`}
                              >
                                 <div className="flex justify-between items-start w-full">
                                    <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>{task.status}</span>
                                    <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">{new Date(task.dueDate).toLocaleDateString()}</span>
                                 </div>
                                 <div>
                                    <p className="text-[9px] font-black text-emerald-500 uppercase mb-1">{task.subjectName}</p>
                                    <h4 className="text-lg font-black text-text-primary uppercase truncate leading-tight">{task.title}</h4>
                                 </div>
                                 <div className="flex items-center gap-2 mt-2">
                                    <div className="flex -space-x-2">
                                       {task.assignedStudents?.slice(0, 3).map(s => (
                                          <div key={s.studentId} className="w-6 h-6 rounded-full bg-surface-deep border-2 border-surface-component flex items-center justify-center text-[8px] font-black text-text-muted">{s.studentName[0]}</div>
                                       ))}
                                    </div>
                                    <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">
                                       {task.assignedStudents?.length || 0} Students Assigned
                                    </span>
                                 </div>
                              </button>
                           ))}
                        </div>

                        {/* Staff-wide Student Directory */}
                        {!selectedTaskId && staffStudents.length > 0 && (
                           <div className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em] px-4">Staff Student Directory</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                 {staffStudents.map(s => (
                                    <div key={s.id} className="bg-surface-component border border-border-subtle p-4 rounded-2xl flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-lg bg-surface-deep flex items-center justify-center text-primary font-black text-xs">{s.name[0]}</div>
                                       <p className="text-[10px] font-black text-text-primary uppercase truncate">{s.name}</p>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        {/* Assigned Students List for Selected Task */}
                        {selectedTaskId && selectedTask && (
                           <div className="mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="flex items-center justify-between px-4">
                                 <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Assigned Students & Progress Audit</h3>
                                 <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">{selectedTask.title}</span>
                              </div>
                              <div className="bg-surface-component border border-border-subtle rounded-[3rem] overflow-hidden shadow-2xl">
                                 <table className="w-full text-left border-collapse">
                                    <thead>
                                       <tr className="bg-black/20 border-b border-white/5">
                                          <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Student Identity</th>
                                          <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest">Current Status</th>
                                          <th className="px-8 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Evaluation</th>
                                       </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                       {selectedTask.assignedStudents?.map(s => (
                                          <tr key={s.studentId} className="hover:bg-white/5 transition-colors">
                                             <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                   <div className="w-9 h-9 rounded-xl bg-surface-deep border border-white/5 flex items-center justify-center text-primary font-black text-sm">{s.studentName[0]}</div>
                                                   <p className="text-sm font-black text-text-primary uppercase">{s.studentName}</p>
                                                </div>
                                             </td>
                                             <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${s.progress === StudentTaskProgress.COMPLETED ? 'bg-emerald-500/10 text-emerald-500' :
                                                   s.progress === StudentTaskProgress.NOT_STARTED ? 'bg-slate-800 text-slate-500' :
                                                      'bg-amber-500/10 text-amber-500'
                                                   }`}>{s.progress}</span>
                                             </td>
                                             <td className="px-8 py-5 text-right">
                                                <span className="text-sm font-black text-text-primary">{s.marks !== undefined ? s.marks : '--'}</span>
                                                <span className="text-[8px] font-black text-text-muted uppercase ml-2">/ 100</span>
                                             </td>
                                          </tr>
                                       ))}
                                       {(!selectedTask.assignedStudents || selectedTask.assignedStudents.length === 0) && (
                                          <tr>
                                             <td colSpan={3} className="py-10 text-center">
                                                <p className="text-[10px] text-text-muted font-black uppercase tracking-widest">No students assigned to this task</p>
                                             </td>
                                          </tr>
                                       )}
                                    </tbody>
                                 </table>
                              </div>
                           </div>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>

         {isAddModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
               <div className="bg-surface-elevated border border-border-subtle p-10 rounded-[3rem] max-w-3xl w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <h3 className="text-2xl font-black text-text-primary mb-10 lowercase tracking-tight">initialize academic task</h3>
                  <form onSubmit={handleAddTask} className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Task Title</p>
                           <input type="text" required value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value.toUpperCase() })} placeholder="TASK NAME" className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none" />
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Deadline</p>
                           <input type="datetime-local" required value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none" />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Instructions & Description</p>
                        <textarea required value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={4} placeholder="INSTRUCTIONS..." className="w-full bg-surface-deep border border-border-subtle rounded-3xl px-6 py-5 text-sm text-text-primary font-bold outline-none resize-none" />
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Department</p>
                           <select
                              required
                              value={newTask.department}
                              onChange={e => {
                                 const selectedDept = e.target.value;
                                 const deptBase = selectedDept.split(' (')[0];

                                 const matchingStudents = allUsers.filter(u => {
                                    if (u.role !== UserRole.STUDENT) return false;
                                    return u.department?.startsWith(deptBase) || deptBase.startsWith(u.department || '___');
                                 });

                                 setNewTask({
                                    ...newTask,
                                    department: selectedDept,
                                    studentCount: matchingStudents.length,
                                    selectedStudentIds: matchingStudents.map(u => u.id)
                                 });
                              }}
                              className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none"
                           >
                              <option value="" disabled>CHOOSE DEPT</option>
                              {curriculum.map(c => <option key={c.id} value={`${c.name} (${c.degree})`}>{c.name}</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Subject Unit</p>
                           <select required value={newTask.subjectId} onChange={e => setNewTask({ ...newTask, subjectId: e.target.value })} className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none">
                              <option value="" disabled>CHOOSE UNIT</option>
                              {curriculum.map(c => c.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>))}
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Assigned Staff</p>
                           <select
                              required
                              value={newTask.assignedStaffId}
                              onChange={e => setNewTask({ ...newTask, assignedStaffId: e.target.value })}
                              className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none"
                           >
                              <option value="" disabled>SELECT STAFF</option>
                              {allUsers
                                 .filter(u => {
                                    if (u.role === UserRole.STUDENT) return false;
                                    const deptBase = (newTask.department || '').split(' (')[0];
                                    if (!deptBase) return true;
                                    return !u.department || u.department.startsWith(deptBase) || deptBase.startsWith(u.department);
                                 })
                                 .map(s => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
                           </select>
                        </div>
                        <div className="space-y-2">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Student Count to Assign</p>
                           <input
                              type="number"
                              min="0"
                              max={allUsers.filter(u => {
                                 if (u.role !== UserRole.STUDENT) return false;
                                 const deptBase = (newTask.department || '').split(' (')[0];
                                 return u.department?.startsWith(deptBase) || deptBase.startsWith(u.department || '___');
                              }).length}
                              value={newTask.studentCount}
                              onChange={e => {
                                 const count = parseInt(e.target.value);
                                 const students = allUsers.filter(u => {
                                    if (u.role !== UserRole.STUDENT) return false;
                                    const deptBase = (newTask.department || '').split(' (')[0];
                                    return u.department?.startsWith(deptBase) || deptBase.startsWith(u.department || '___');
                                 }).slice(0, count).map(u => u.id);
                                 setNewTask({ ...newTask, studentCount: count, selectedStudentIds: students });
                              }}
                              className="w-full bg-surface-deep border border-border-subtle rounded-2xl px-6 py-4 text-sm text-text-primary font-bold outline-none"
                           />
                        </div>
                     </div>

                     {newTask.studentCount > 0 && (
                        <div className="space-y-4">
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest ml-2">Select Specific Students ({newTask.selectedStudentIds.length}/{newTask.studentCount})</p>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto custom-scrollbar p-2 bg-surface-deep rounded-3xl border border-border-subtle">
                              {allUsers
                                 .filter(u => {
                                    if (u.role !== UserRole.STUDENT) return false;
                                    const deptBase = (newTask.department || '').split(' (')[0];
                                    return u.department?.startsWith(deptBase) || deptBase.startsWith(u.department || '___');
                                 })
                                 .map(s => (
                                    <label key={s.id} className="flex items-center gap-3 p-3 bg-surface-elevated rounded-xl border border-border-subtle cursor-pointer hover:border-primary/50 transition-colors">
                                       <input
                                          type="checkbox"
                                          checked={newTask.selectedStudentIds.includes(s.id)}
                                          onChange={e => {
                                             const ids = e.target.checked
                                                ? [...newTask.selectedStudentIds, s.id]
                                                : newTask.selectedStudentIds.filter(id => id !== s.id);
                                             setNewTask({ ...newTask, selectedStudentIds: ids });
                                          }}
                                          className="w-4 h-4 rounded border-border-subtle text-primary focus:ring-primary"
                                       />
                                       <span className="text-xs font-bold text-text-primary uppercase truncate">{s.name}</span>
                                    </label>
                                 ))}
                           </div>
                        </div>
                     )}

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

export default BatchTaskDetail;
