
import React, { useContext, useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '@/contexts/AuthContext';
import { MockDB } from '@/store';
import { User, UserRole, UserStatus, Course, AcademicBatch } from '@/types';

const DeanDashboard: React.FC = () => {
   const { user } = useContext(AuthContext);
   const [users, setUsers] = useState<User[]>([]);
   const [curriculum, setCurriculum] = useState<Course[]>([]);
   const [batches, setBatches] = useState<AcademicBatch[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [facultySearch, setFacultySearch] = useState('');

   const refreshData = async () => {
      const [u, c, b] = await Promise.all([
         MockDB.getUsers(),
         MockDB.getCurriculum(),
         MockDB.getAcademicBatches()
      ]);
      setUsers(u);
      setCurriculum(c);
      setBatches(b);
      setIsLoading(false);
   };

   useEffect(() => {
      refreshData();
      const interval = setInterval(refreshData, 10000);
      return () => clearInterval(interval);
   }, []);

   const stats = useMemo(() => {
      const faculty = users.filter(u => [UserRole.STAFF, UserRole.ASSOC_PROF_I, UserRole.ASSOC_PROF_II, UserRole.HOD].includes(u.role));
      const students = users.filter(u => u.role === UserRole.STUDENT);
      return {
         totalStaff: faculty.length,
         totalStudents: students.length,
         totalDepts: curriculum.length,
         totalBatches: batches.length
      };
   }, [users, curriculum, batches]);

   const filteredFaculty = useMemo(() => {
      const faculty = users.filter(u => [UserRole.STAFF, UserRole.ASSOC_PROF_I, UserRole.ASSOC_PROF_II, UserRole.HOD, UserRole.DEAN].includes(u.role));
      if (!facultySearch) return faculty;
      const q = facultySearch.toLowerCase();
      return faculty.filter(f =>
         f.name.toLowerCase().includes(q) ||
         f.email.toLowerCase().includes(q) ||
         f.department?.toLowerCase().includes(q) ||
         f.designation?.toLowerCase().includes(q)
      );
   }, [users, facultySearch]);

   const departmentMatrix = useMemo(() => {
      return curriculum.map(dept => {
         const deptFull = `${dept.name} (${dept.degree})`;
         const deptStaff = users.filter(u => u.department === deptFull && u.role !== UserRole.STUDENT);
         const deptStudents = users.filter(u => u.department === deptFull && u.role === UserRole.STUDENT);

         const batchCounts: Record<string, number> = {};
         batches.forEach(b => {
            const yearShort = b.startYear.toString().slice(-2);
            const count = deptStudents.filter(s => s.regNo?.includes(`BIT${yearShort}`)).length;
            batchCounts[b.id] = count;
         });

         return {
            id: dept.id,
            name: dept.name,
            degree: dept.degree,
            staffCount: deptStaff.length,
            studentCount: deptStudents.length,
            batchCounts
         };
      }).sort((a, b) => b.studentCount - a.studentCount);
   }, [curriculum, users, batches]);

   if (isLoading) {
      return (
         <DashboardLayout title="Executive Monitoring">
            <div className="flex items-center justify-center h-64">
               <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
         </DashboardLayout>
      );
   }

   return (
      <DashboardLayout title="Dean's Executive Console">
         <div className="space-y-10 pb-24">

            {/* Institutional Census */}
            <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40"></div>
               <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="flex items-center gap-8">
                     <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center text-white text-4xl font-black shadow-xl">
                        {user?.name?.[0] || 'D'}
                     </div>
                     <div>
                        <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Institutional Registry</h2>
                        <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mt-2">Executive oversight: {user?.name}</p>
                     </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full lg:w-auto">
                     <ExecutiveStat label="Total Faculty" value={stats.totalStaff} color="text-emerald-500" />
                     <ExecutiveStat label="Total Students" value={stats.totalStudents} color="text-blue-500" />
                     <ExecutiveStat label="Active Depts" value={stats.totalDepts} color="text-purple-500" />
                     <ExecutiveStat label="Active Cohorts" value={stats.totalBatches} color="text-amber-500" />
                  </div>
               </div>
            </div>

            {/* Departmental Intelligence Matrix */}
            <div className="bg-surface-component border border-border-subtle rounded-[3rem] shadow-2xl overflow-hidden">
               <div className="p-10 border-b border-border-subtle bg-black/20">
                  <h3 className="text-text-primary font-black text-2xl lowercase tracking-tight">Departmental Matrix</h3>
                  <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Cross-departmental faculty density & batch enrollment census</p>
               </div>

               <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                     <thead>
                        <tr className="bg-slate-950/40">
                           <th className="px-10 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border-subtle">Authorized Branch</th>
                           <th className="px-6 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border-subtle text-center">Faculty</th>
                           <th className="px-6 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border-subtle text-center">Students</th>
                           <th className="px-10 py-6 text-[10px] font-black text-text-muted uppercase tracking-widest border-b border-border-subtle text-right">Batch-Wise Enrollment</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border-subtle">
                        {departmentMatrix.map(dept => (
                           <tr key={dept.id} className="hover:bg-primary/5 transition-colors group">
                              <td className="px-10 py-8">
                                 <div className="flex flex-col">
                                    <span className="text-sm font-black text-text-primary uppercase tracking-tight group-hover:text-primary transition-colors">{dept.name}</span>
                                    <span className="text-[9px] text-text-muted font-bold uppercase mt-1 tracking-widest">{dept.degree} Division</span>
                                 </div>
                              </td>
                              <td className="px-6 py-8 text-center">
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                    <span className="text-lg font-black text-emerald-500">{dept.staffCount}</span>
                                    <span className="text-[8px] font-bold text-emerald-500/70 uppercase">Staff</span>
                                 </div>
                              </td>
                              <td className="px-6 py-8 text-center">
                                 <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                    <span className="text-lg font-black text-blue-500">{dept.studentCount}</span>
                                    <span className="text-[8px] font-bold text-blue-500/70 uppercase">Users</span>
                                 </div>
                              </td>
                              <td className="px-10 py-8 text-right">
                                 <div className="flex justify-end gap-3">
                                    {batches.map((b, idx) => (
                                       <BatchChip
                                          key={b.id}
                                          label={b.startYear.toString().slice(-2)}
                                          count={dept.batchCounts[b.id] || 0}
                                          highlight={idx === 0}
                                       />
                                    ))}
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>

            {/* Global Staff Directory (High Level) */}
            <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-10 shadow-2xl">
               <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b border-border-subtle gap-6">
                  <div>
                     <h3 className="text-text-primary font-black text-2xl lowercase tracking-tight">institutional faculty ledger</h3>
                     <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-1">Audit all verified educators across active branches</p>
                  </div>
                  <div className="flex flex-col md:flex-row items-center gap-4">
                     <div className="relative w-full md:w-80">
                        <input
                           type="text"
                           placeholder="Audit faculty by name or branch..."
                           value={facultySearch}
                           onChange={(e) => setFacultySearch(e.target.value)}
                           className="w-full bg-slate-950 border border-white/10 rounded-2xl px-12 py-3.5 text-xs text-white outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-slate-600 font-bold"
                        />
                        <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                     </div>
                     <div className="px-6 py-3 bg-slate-950 rounded-2xl border border-white/5 whitespace-nowrap min-w-[180px] text-center">
                        <span className="text-primary font-black text-xl">{filteredFaculty.length}</span>
                        <span className="text-[8px] font-black text-text-muted uppercase ml-2 tracking-widest">educators in sync</span>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredFaculty.map(staff => (
                     <div key={staff.id} className="bg-surface-elevated/40 border border-border-subtle p-6 rounded-[2rem] hover:bg-surface-elevated hover:border-primary/30 transition-all group">
                        <div className="flex items-center gap-5 mb-6">
                           <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-border-subtle flex items-center justify-center text-primary font-black text-xl group-hover:scale-105 transition-transform">
                              {staff.name[0]}
                           </div>
                           <div className="min-w-0">
                              <h4 className="text-text-primary font-black text-sm uppercase truncate leading-tight tracking-tight">{staff.name}</h4>
                              <p className="text-[8px] font-black text-primary uppercase mt-1 tracking-widest">{staff.designation || 'Faculty Member'}</p>
                           </div>
                        </div>
                        <div className="space-y-3">
                           <div className="flex justify-between items-center px-2">
                              <span className="text-[9px] font-bold text-text-muted uppercase">Department</span>
                              <span className="text-[9px] font-black text-text-primary uppercase truncate max-w-[140px]">{staff.department?.split(' (')[0] || 'Unassigned'}</span>
                           </div>
                           <div className="flex justify-between items-center px-2">
                              <span className="text-[9px] font-bold text-text-muted uppercase">Credential Status</span>
                              <span className="flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                 Registry Sync
                              </span>
                           </div>
                        </div>
                     </div>
                  ))}
                  {filteredFaculty.length === 0 && (
                     <div className="col-span-full py-20 text-center border-4 border-dashed border-border-subtle rounded-[2.5rem]">
                        <p className="text-text-muted font-black uppercase text-xs tracking-widest">No faculty matching search query</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </DashboardLayout>
   );
};

const ExecutiveStat: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
   <div className="bg-surface-elevated/50 p-6 rounded-2xl border border-border-subtle text-center min-w-[140px]">
      <p className="text-[8px] font-black text-text-muted uppercase tracking-[0.2em] mb-2">{label}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
   </div>
);

const BatchChip: React.FC<{ label: string; count: number; highlight?: boolean }> = ({ label, count, highlight }) => (
   <div className={`px-4 py-2 rounded-xl border flex flex-col items-center min-w-[65px] ${highlight ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-slate-900 border-slate-800'}`}>
      <span className={`text-[8px] font-black uppercase tracking-tighter ${highlight ? 'text-indigo-400' : 'text-slate-500'}`}>B'{label}</span>
      <span className="text-sm font-black text-text-primary">{count}</span>
   </div>
);

export default DeanDashboard;
