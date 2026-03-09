
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { User, UserRole, AcademicData, MarkRecord, MarkBatch } from '../types';

const ProfileDetail: React.FC = () => {
   const { userId } = useParams<{ userId: string }>();
   const navigate = useNavigate();
   const { user: currentUser } = useContext(AuthContext);
   const [profileUser, setProfileUser] = useState<User | null>(null);
   const [academic, setAcademic] = useState<AcademicData | null>(null);
   const [marks, setMarks] = useState<MarkRecord[]>([]);
   const [batches, setBatches] = useState<MarkBatch[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   // Executive/Staff Specific Stats
   const [menteesCount, setMenteesCount] = useState(0);
   const [deptStats, setDeptStats] = useState({ staff: 0, students: 0 });

   useEffect(() => {
      const loadProfile = async () => {
         if (!userId) return;
         setIsLoading(true);
         try {
            const allUsers = await ApiService.getUsers();
            // Handle both string and numeric IDs from backend
            const found = allUsers.find(u => String(u.id) === String(userId));

            if (found) {
               setProfileUser(found);

               const [markData, batchData] = await Promise.all([
                  ApiService.getMarkRecordsByStudent(found.id),
                  ApiService.getMarkBatches()
               ]);
               setMarks(markData);
               setBatches(batchData);

               // Academic data - safe for all roles
               try {
                  const acadData = await ApiService.getAcademicData(found.id);
                  setAcademic(acadData);
               } catch {
                  setAcademic({ attendance: 85, cgpa: 0, sgpa: 0, credits: 0, greenPoints: 85 } as any);
               }

               // Fetch mentees if profile belongs to staff/hod
               if (found.role !== UserRole.STUDENT) {
                  const mentees = allUsers.filter(u => u.mentorId === found.id || String(u.mentorId) === String(found.id));
                  setMenteesCount(mentees.length);
               }

               // Fetch department summary if profile belongs to HOD/Dean/Admin
               if (found.role === UserRole.HOD || found.role === UserRole.DEAN || found.role === UserRole.ADMIN) {
                  const deptBase = found.department?.split(' (')[0] || '';
                  const dStaff = allUsers.filter(u => u.role !== UserRole.STUDENT && u.department?.startsWith(deptBase));
                  const dStudents = allUsers.filter(u => u.role === UserRole.STUDENT && u.department?.startsWith(deptBase));
                  setDeptStats({ staff: dStaff.length, students: dStudents.length });
               }
            }
         } catch (err) {
            console.error("Failed to load profile:", err);
         }
         setIsLoading(false);
      };
      loadProfile();
   }, [userId]);

   const organizedTranscript = useMemo(() => {
      const semesters: Record<string, Record<string, { i1?: number, i2?: number, es?: number, max: number }>> = {};

      marks.forEach(mark => {
         const batch = batches.find(b => b.id === mark.batchId);
         if (!batch) return;

         const semMatch = batch.name.toUpperCase().match(/SEM (\d+)/);
         const semName = semMatch ? `Semester ${semMatch[1]}` : 'General';

         if (!semesters[semName]) semesters[semName] = {};
         if (!semesters[semName][mark.subject]) semesters[semName][mark.subject] = { max: mark.maxMarks };

         const bName = batch.name.toUpperCase();
         if (bName.includes('INTERNAL 1') || bName.includes('IA 1')) semesters[semName][mark.subject].i1 = mark.marks;
         else if (bName.includes('INTERNAL 2') || bName.includes('IA 2')) semesters[semName][mark.subject].i2 = mark.marks;
         else if (bName.includes('END SEM') || bName.includes('SEMESTER') || bName.includes('FINAL')) semesters[semName][mark.subject].es = mark.marks;
      });

      return semesters;
   }, [marks, batches]);

   if (isLoading) {
      return (
         <DashboardLayout title="Identity Audit">
            <div className="flex flex-col items-center justify-center h-96 gap-4">
               <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retrieving Full Institutional Profile...</p>
            </div>
         </DashboardLayout>
      );
   }

   if (!profileUser) {
      return (
         <DashboardLayout title="Member Not Found">
            <div className="py-24 text-center">
               <button onClick={() => navigate(-1)} className="text-primary font-black uppercase">Identity not recognized. Return to Directory</button>
            </div>
         </DashboardLayout>
      );
   }

   const isStaffProfile = profileUser.role !== UserRole.STUDENT;
   const isOwnProfile = currentUser?.id === profileUser.id;
   const isViewerAuthorized = currentUser && [UserRole.ADMIN, UserRole.DEAN, UserRole.HOD, UserRole.STAFF].includes(currentUser.role);

   return (
      <DashboardLayout title={`Profile Detail: ${profileUser.name}`}>
         <div className="max-w-7xl mx-auto space-y-10 pb-24">

            {/* Profile Header Block */}
            <div className="bg-surface-elevated border border-border-subtle rounded-3xl md:rounded-[4rem] p-6 md:p-14 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12">
               <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"></div>

               <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-14 w-full">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem] bg-surface-deep border-2 border-border-subtle flex items-center justify-center text-text-primary font-black text-4xl sm:text-5xl md:text-6xl shadow-2xl relative shrink-0">
                     {profileUser.avatar ? <img src={profileUser.avatar} className="w-full h-full object-cover rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[3rem]" /> : profileUser.name[0]}
                     <div className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg sm:rounded-xl md:rounded-2xl bg-emerald-600 border-4 border-surface-elevated flex items-center justify-center shadow-lg">
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                     </div>
                  </div>

                  <div className="flex-1 text-center md:text-left">
                     <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 md:gap-4 mb-4">
                        <h2
                           className="font-black text-text-primary uppercase tracking-tighter leading-tight w-full"
                           style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2.75rem)' }}
                        >{profileUser.name}</h2>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2">
                           <span className={`px-3 md:px-4 py-1 md:py-1.5 rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest border ${isStaffProfile ? 'bg-emerald-600/10 border-emerald-600/20 text-emerald-400' : 'bg-blue-600/10 border-blue-600/20 text-blue-400'}`}>
                              {profileUser.role.replace(/_/g, ' ')}
                           </span>
                           {isOwnProfile && (
                              <span className="px-2 md:px-3 py-1 bg-primary text-white text-[7px] md:text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">Authenticated Me</span>
                           )}
                        </div>
                     </div>
                     <div className="space-y-1 md:space-y-2">
                        <p className="text-text-muted text-sm sm:text-base md:text-lg font-bold uppercase tracking-tight">{profileUser.department}</p>
                        <p className="text-primary text-[9px] md:text-[11px] font-mono font-bold tracking-widest uppercase">{isStaffProfile ? `STAFF ID: ${profileUser.staffId || String(profileUser.id).slice(0, 8).toUpperCase()}` : `REGISTER NO: ${profileUser.regNo || String(profileUser.id).slice(0, 8).toUpperCase()}`}</p>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 md:gap-6 shrink-0 w-full lg:w-auto">
                     <button onClick={() => navigate(-1)} className="flex-1 lg:flex-none px-6 md:px-10 py-4 md:py-5 bg-surface-component hover:bg-surface-deep text-text-primary border border-border-subtle rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] shadow-xl transition-all active:scale-95">Back</button>
                     {isOwnProfile ? (
                        <button onClick={() => navigate('/settings')} className="flex-1 lg:flex-none px-6 md:px-10 py-4 md:py-5 bg-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] shadow-xl shadow-primary/20 transition-all active:scale-95">Manage Identity</button>
                     ) : (
                        <button className="flex-1 lg:flex-none px-6 md:px-10 py-4 md:py-5 bg-primary text-white rounded-[1.5rem] md:rounded-[2rem] font-black uppercase tracking-[0.2em] text-[9px] md:text-[10px] shadow-xl shadow-primary/20 transition-all active:scale-95">Message User</button>
                     )}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
               {/* Summary Sidebar */}
               <div className="space-y-6 md:space-y-8">
                  <div className="bg-surface-elevated border border-border-subtle p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-xl">
                     <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-8 md:mb-10 border-b border-border-subtle pb-4">Registry Audit</h3>

                     <div className="grid grid-cols-1 gap-8 md:gap-10">
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-400 font-black text-lg md:text-xl shadow-inner">
                              {academic?.attendance}%
                           </div>
                           <div>
                              <p className="text-text-primary font-black text-base md:text-lg uppercase tracking-tight">Attendance</p>
                              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Institutional Presence</p>
                           </div>
                        </div>

                        {!isStaffProfile ? (
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-400 font-black text-lg md:text-xl shadow-inner">
                                 {academic?.cgpa.toFixed(2)}
                              </div>
                              <div>
                                 <p className="text-text-primary font-black text-base md:text-lg uppercase tracking-tight">Global CGPA</p>
                                 <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Academic Excellence</p>
                              </div>
                           </div>
                        ) : (
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-lg md:text-xl shadow-inner">
                                 {menteesCount}
                              </div>
                              <div>
                                 <p className="text-text-primary font-black text-base md:text-lg uppercase tracking-tight">Caseload</p>
                                 <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Assigned Mentees</p>
                              </div>
                           </div>
                        )}

                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center text-purple-400 font-black text-lg md:text-xl shadow-inner">
                              {academic?.greenPoints}
                           </div>
                           <div>
                              <p className="text-text-primary font-black text-base md:text-lg uppercase tracking-tight">Green Score</p>
                              <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Digital Footprint</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  {(profileUser.role === UserRole.HOD || profileUser.role === UserRole.DEAN || profileUser.role === UserRole.ADMIN) && (
                     <div className="bg-surface-elevated border border-border-subtle p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-xl">
                        <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-6 md:mb-8 border-b border-border-subtle pb-4">Institutional Oversight</h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-surface-deep rounded-2xl border border-border-subtle">
                              <p className="text-lg md:text-xl font-black text-emerald-400">{deptStats.staff}</p>
                              <p className="text-[8px] text-text-muted font-black uppercase mt-1">Staff Members</p>
                           </div>
                           <div className="p-4 bg-surface-deep rounded-2xl border border-border-subtle">
                              <p className="text-lg md:text-xl font-black text-blue-400">{deptStats.students}</p>
                              <p className="text-[8px] text-text-muted font-black uppercase mt-1">Total Users</p>
                           </div>
                        </div>
                     </div>
                  )}

                  <div className="bg-surface-elevated border border-border-subtle p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-xl">
                     <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-6 md:mb-8 border-b border-border-subtle pb-4">Contact Protocol</h3>
                     <div className="space-y-6">
                        <div>
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Institutional Mail</p>
                           <p className="text-text-primary font-mono font-bold text-xs md:text-sm select-all break-all">{profileUser.email}</p>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Status Verification</p>
                           <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Registry Verified Active
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Main Data Block */}
               <div className="lg:col-span-2 space-y-6 md:space-y-10">
                  <div className="bg-surface-elevated border border-border-subtle p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl">
                     <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-8 md:mb-10">Institutional Dossier</h3>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 md:gap-y-10">
                        <InfoBlock label="Full Identity Name" value={profileUser.name} />
                        <InfoBlock label="Assigned Branch" value={profileUser.department || '---'} />
                        <InfoBlock label="Institutional Role" value={profileUser.role.replace(/_/g, ' ')} />
                        <InfoBlock label="Registry Enrollment" value={isStaffProfile ? (profileUser.staffId || 'Verified Educator') : (profileUser.regNo || 'Enrolled ID')} />

                        {isStaffProfile ? (
                           <>
                              <InfoBlock label="Designation" value={profileUser.designation || 'Faculty Member'} />
                              <InfoBlock label="Teaching Experience" value={profileUser.experience ? `${profileUser.experience} Years` : 'Senior Official'} />
                           </>
                        ) : (
                           <>
                              <InfoBlock label="Academic Period" value={profileUser.studyYear || 'Undergraduate'} />
                              <InfoBlock label="Degree Division" value={profileUser.department?.split('(')[1]?.replace(')', '') || 'B.Tech'} />
                           </>
                        )}

                        <InfoBlock label="Registry Timestamp" value={new Date(profileUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                     </div>
                  </div>

                  {/* Performance Tracker Matrix for Students - Accessible by Staff/Admin */}
                  {!isStaffProfile && (isOwnProfile || isViewerAuthorized) && (
                     <div className="bg-surface-elevated border border-border-subtle p-8 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 md:mb-12">
                           <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em]">3-Pillar Assessment Matrix</h3>
                           <span className="w-fit px-3 py-1 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded-lg border border-primary/20">Authorized Audit View</span>
                        </div>

                        {Object.keys(organizedTranscript).length === 0 ? (
                           <div className="py-16 md:py-20 text-center border-2 border-dashed border-border-subtle rounded-3xl">
                              <p className="text-text-muted font-bold uppercase text-[10px] md:text-xs tracking-widest">No evaluation records published in Registry</p>
                           </div>
                        ) : (
                           <div className="space-y-10 md:space-y-12">
                              {Object.entries(organizedTranscript).reverse().map(([semName, subjects]) => (
                                 <div key={semName} className="space-y-6">
                                    <div className="flex items-center gap-4">
                                       <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                                       <h4 className="text-text-primary font-black text-base md:text-lg uppercase tracking-tight">{semName} Matrix</h4>
                                    </div>

                                    <div className="space-y-4">
                                       {Object.entries(subjects).map(([subject, scores]) => {
                                          const isComplete = scores.es !== undefined;
                                          const isPass = (scores.es || 0) >= 50;
                                          return (
                                             <div key={subject} className="bg-surface-deep border border-border-subtle rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 hover:bg-surface-component transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-6 md:gap-8 group even:bg-surface-component/30">
                                                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                                   <div className={`w-1.5 h-10 md:h-12 rounded-full transition-all ${isComplete ? (isPass ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-border-subtle'}`}></div>
                                                   <div className="min-w-0">
                                                      <h5 className="text-sm md:text-base font-black text-text-primary uppercase truncate tracking-tight group-hover:text-primary transition-colors">{subject}</h5>
                                                      <div className="flex items-center gap-3 mt-1">
                                                         <span className="text-[7px] md:text-[8px] font-bold text-text-muted uppercase tracking-widest">Unit Code: {subject.substring(0, 4)}</span>
                                                         {isComplete && (
                                                            <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${isPass ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>{isPass ? 'AUTH_CLEAR' : 'ARREAR_RECORDS'}</span>
                                                         )}
                                                      </div>
                                                   </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-2 md:gap-3 md:min-w-[300px] xl:min-w-[400px]">
                                                   <MiniPillar label="IA 1" value={scores.i1} />
                                                   <MiniPillar label="IA 2" value={scores.i2} />
                                                   <MiniPillar label="END SEM" value={scores.es} highlight />
                                                </div>

                                                <div className="bg-surface-elevated p-4 md:p-6 rounded-2xl border border-border-subtle text-center min-w-[100px] md:min-w-[120px] shadow-inner">
                                                   <p className="text-[7px] font-black text-text-muted uppercase tracking-widest mb-1">TOTAL</p>
                                                   <p className={`text-lg md:text-xl font-black ${isComplete ? (isPass ? 'text-emerald-400' : 'text-rose-500') : 'text-text-muted'}`}>
                                                      {scores.es ? `${((scores.es / scores.max) * 100).toFixed(0)}%` : '--'}
                                                   </p>
                                                </div>
                                             </div>
                                          );
                                       })}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                  )}

                  {!isStaffProfile && (
                     <div className="bg-surface-elevated border border-border-subtle p-8 md:p-12 rounded-3xl md:rounded-[3.5rem] shadow-xl">
                        <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-8 md:mb-10">Assigned Mentorship Hierarchy</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                           <div className="p-6 bg-surface-deep border border-border-subtle rounded-3xl">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Primary Mentor</p>
                              <p className="text-text-primary font-black text-base md:text-lg uppercase">{profileUser.mentorName || 'Registry Pending'}</p>
                              <p className="text-[9px] text-text-muted uppercase font-bold mt-1">Authorized Official 1</p>
                           </div>
                           <div className="p-6 bg-surface-deep border border-border-subtle rounded-3xl">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Secondary Liaison</p>
                              <p className="text-text-primary font-black text-base md:text-lg uppercase">{profileUser.mentor2Name || 'Registry Pending'}</p>
                              <p className="text-[9px] text-text-muted uppercase font-bold mt-1">Authorized Official 2</p>
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

const MiniPillar: React.FC<{ label: string; value?: number; highlight?: boolean }> = ({ label, value, highlight }) => (
   <div className={`p-3 rounded-xl border text-center transition-all ${highlight ? 'bg-primary/10 border-primary/20' : 'bg-surface-deep border-border-subtle'}`}>
      <p className="text-[6px] font-black text-text-muted uppercase tracking-widest mb-1 truncate">{label}</p>
      <p className={`text-xs md:text-sm font-black ${value !== undefined ? (highlight ? 'text-primary' : 'text-text-primary') : 'text-text-muted'}`}>
         {value ?? '--'}
      </p>
   </div>
);

const InfoBlock: React.FC<{ label: string, value: string }> = ({ label, value }) => (
   <div className="space-y-2">
      <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">{label}</p>
      <p className="text-text-primary font-black text-base md:text-lg uppercase tracking-tight leading-tight">{value}</p>
   </div>
);

export default ProfileDetail;
