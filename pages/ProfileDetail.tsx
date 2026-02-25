
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { MockDB } from '../store';
import { User, UserRole, AcademicData, MarkRecord } from '../types';

const ProfileDetail: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useContext(AuthContext);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [academic, setAcademic] = useState<AcademicData | null>(null);
  const [marks, setMarks] = useState<MarkRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Executive/Staff Specific Stats
  const [menteesCount, setMenteesCount] = useState(0);
  const [deptStats, setDeptStats] = useState({ staff: 0, students: 0 });

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      setIsLoading(true);
      const allUsers = await MockDB.getUsers();
      const found = allUsers.find(u => u.id === userId);
      
      if (found) {
        setProfileUser(found);
        const [acadData, markData] = await Promise.all([
          MockDB.getAcademicData(found.id),
          MockDB.getMarkRecordsByStudent(found.id)
        ]);
        setAcademic(acadData);
        setMarks(markData);

        // Fetch mentees if profile belongs to staff/hod
        if (found.role !== UserRole.STUDENT) {
           const mentees = allUsers.filter(u => u.mentorId === found.id);
           setMenteesCount(mentees.length);
        }

        // Fetch department summary if profile belongs to HOD/Dean
        if (found.role === UserRole.HOD || found.role === UserRole.DEAN || found.role === UserRole.ADMIN) {
           const deptBase = found.department?.split(' (')[0] || '';
           const dStaff = allUsers.filter(u => u.role !== UserRole.STUDENT && u.department?.startsWith(deptBase));
           const dStudents = allUsers.filter(u => u.role === UserRole.STUDENT && u.department?.startsWith(deptBase));
           setDeptStats({ staff: dStaff.length, students: dStudents.length });
        }
      }
      setIsLoading(false);
    };
    loadProfile();
  }, [userId]);

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

  const isStaff = profileUser.role !== UserRole.STUDENT;
  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <DashboardLayout title={`Profile Detail: ${profileUser.name}`}>
      <div className="max-w-7xl mx-auto space-y-10 pb-24">
        
        {/* Profile Header Block */}
        <div className="bg-[#0f172a] border border-white/5 rounded-[4rem] p-10 md:p-14 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12">
           <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none"></div>
           
           <div className="relative z-10 flex flex-col md:flex-row items-center gap-10 md:gap-14 w-full">
              <div className="w-40 h-40 rounded-[3rem] bg-black border-2 border-white/5 flex items-center justify-center text-white font-black text-6xl shadow-2xl relative shrink-0">
                 {profileUser.avatar ? <img src={profileUser.avatar} className="w-full h-full object-cover rounded-[3rem]" /> : profileUser.name[0]}
                 <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-emerald-600 border-4 border-[#0f172a] flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"></path></svg>
                 </div>
              </div>

              <div className="flex-1 text-center md:text-left">
                 <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 mb-4">
                    <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter leading-tight">{profileUser.name}</h2>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isStaff ? 'bg-emerald-600/10 border-emerald-600/20 text-emerald-400' : 'bg-blue-600/10 border-blue-600/20 text-blue-400'}`}>
                      {profileUser.role.replace(/_/g, ' ')}
                    </span>
                    {isOwnProfile && (
                       <span className="px-3 py-1 bg-primary text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-lg">Authenticated Me</span>
                    )}
                 </div>
                 <div className="space-y-2">
                    <p className="text-slate-400 text-lg font-bold uppercase tracking-tight">{profileUser.department}</p>
                    <p className="text-primary text-[11px] font-mono font-bold tracking-widest uppercase">{isStaff ? `STAFF ID: ${profileUser.staffId || profileUser.id.split('-')[0].toUpperCase()}` : `REGISTER NO: ${profileUser.regNo || profileUser.id.split('-')[0].toUpperCase()}`}</p>
                 </div>
              </div>

              <div className="flex flex-col md:flex-row gap-6 shrink-0 w-full lg:w-auto">
                 <button onClick={() => navigate(-1)} className="flex-1 lg:flex-none px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl transition-all active:scale-95">Back</button>
                 {!isOwnProfile && <button className="flex-1 lg:flex-none px-10 py-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-primary/20 transition-all active:scale-95">Message User</button>}
                 {isOwnProfile && <button onClick={() => navigate('/settings')} className="flex-1 lg:flex-none px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-indigo-600/20 transition-all active:scale-95">Manage Identity</button>}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
           {/* Summary Sidebar */}
           <div className="space-y-8">
              <div className="bg-[#0f172a] border border-white/5 p-10 rounded-[3rem] shadow-xl">
                 <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-10 border-b border-white/5 pb-4">Performance Audit</h3>
                 
                 <div className="grid grid-cols-1 gap-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-3xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-400 font-black text-xl shadow-inner">
                          {academic?.attendance}%
                       </div>
                       <div>
                          <p className="text-white font-black text-lg uppercase tracking-tight">Attendance</p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Institutional Presence</p>
                       </div>
                    </div>

                    {!isStaff ? (
                      <>
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xl shadow-inner">
                              {academic?.cgpa.toFixed(2)}
                           </div>
                           <div>
                              <p className="text-white font-black text-lg uppercase tracking-tight">Cumulative GPA</p>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Academic Excellence</p>
                           </div>
                        </div>
                      </>
                    ) : (
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-3xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-xl shadow-inner">
                             {menteesCount}
                          </div>
                          <div>
                             <p className="text-white font-black text-lg uppercase tracking-tight">Caseload</p>
                             <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Assigned Mentees</p>
                          </div>
                       </div>
                    )}

                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-3xl bg-purple-600/10 border border-purple-600/20 flex items-center justify-center text-purple-400 font-black text-xl shadow-inner">
                          {academic?.greenPoints}
                       </div>
                       <div>
                          <p className="text-white font-black text-lg uppercase tracking-tight">Green Score</p>
                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Digital Footprint</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Department Oversight Section for HOD/Dean */}
              {(profileUser.role === UserRole.HOD || profileUser.role === UserRole.DEAN || profileUser.role === UserRole.ADMIN) && (
                 <div className="bg-[#0f172a] border border-white/5 p-10 rounded-[3rem] shadow-xl">
                    <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Institutional Oversight</h3>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                          <p className="text-xl font-black text-emerald-400">{deptStats.staff}</p>
                          <p className="text-[8px] text-slate-500 font-black uppercase mt-1">Staff Members</p>
                       </div>
                       <div className="p-4 bg-slate-950/50 rounded-2xl border border-white/5">
                          <p className="text-xl font-black text-blue-400">{deptStats.students}</p>
                          <p className="text-[8px] text-slate-500 font-black uppercase mt-1">Total Users</p>
                       </div>
                    </div>
                 </div>
              )}

              <div className="bg-[#0f172a] border border-white/5 p-10 rounded-[3rem] shadow-xl">
                 <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-8 border-b border-white/5 pb-4">Contact Protocol</h3>
                 <div className="space-y-6">
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Institutional Mail</p>
                       <p className="text-white font-mono font-bold text-sm select-all">{profileUser.email}</p>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Verification</p>
                       <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Registry Verified Active
                       </span>
                    </div>
                 </div>
              </div>
           </div>

           {/* Comprehensive Details Main Block */}
           <div className="lg:col-span-2 space-y-10">
              <div className="bg-[#0f172a] border border-white/5 p-10 md:p-12 rounded-[3.5rem] shadow-xl">
                 <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-10">Institutional Dossier</h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                    <InfoBlock label="Full Identity Name" value={profileUser.name} />
                    <InfoBlock label="Assigned Branch" value={profileUser.department || '---'} />
                    <InfoBlock label="Institutional Role" value={profileUser.role.replace(/_/g, ' ')} />
                    <InfoBlock label="Registry Enrollment" value={isStaff ? (profileUser.staffId || 'Verified Educator') : (profileUser.regNo || 'Enrolled ID')} />
                    
                    {isStaff ? (
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

              {!isStaff && (
                 <div className="bg-[#0f172a] border border-white/5 p-10 md:p-12 rounded-[3.5rem] shadow-xl">
                    <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-10">Assigned Mentorship Hierarchy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="p-6 bg-black/20 border border-white/5 rounded-3xl">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Primary Mentor</p>
                          <p className="text-white font-black text-lg uppercase">{profileUser.mentorName || 'Registry Pending'}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">Authorized Official 1</p>
                       </div>
                       <div className="p-6 bg-black/20 border border-white/5 rounded-3xl">
                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Secondary Liaison</p>
                          <p className="text-white font-black text-lg uppercase">{profileUser.mentor2Name || 'Registry Pending'}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-bold mt-1">Authorized Official 2</p>
                       </div>
                    </div>
                 </div>
              )}

              {/* Only show transcript summary if it's a student */}
              {!isStaff && (
                <div className="bg-[#0f172a] border border-white/5 p-10 md:p-12 rounded-[3.5rem] shadow-xl overflow-hidden">
                   <h3 className="text-text-muted text-[10px] font-black uppercase tracking-[0.4em] mb-10">Consolidated Performance Record</h3>
                   {marks.length === 0 ? (
                      <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl">
                         <p className="text-slate-600 font-bold uppercase text-xs tracking-widest">No evaluation entries published</p>
                      </div>
                   ) : (
                      <div className="space-y-4">
                         {marks.map(m => (
                            <div key={m.id} className="p-6 bg-black/20 border border-white/5 rounded-[1.75rem] flex items-center justify-between group hover:border-primary/20 transition-all">
                               <div className="min-w-0">
                                  <p className="text-white font-black text-sm uppercase truncate tracking-tight">{m.subject}</p>
                                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Scale: 0 - {m.maxMarks}</p>
                               </div>
                               <div className="flex items-center gap-6">
                                  <div className="text-right">
                                     <p className={`text-2xl font-black ${(m.marks / m.maxMarks) >= 0.8 ? 'text-emerald-500' : 'text-primary'}`}>{m.marks}</p>
                                     <p className="text-[8px] text-slate-600 font-black uppercase tracking-widest">Grade Score</p>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
              )}
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const InfoBlock: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div className="space-y-2">
     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
     <p className="text-white font-black text-lg uppercase tracking-tight leading-tight">{value}</p>
  </div>
);

export default ProfileDetail;
