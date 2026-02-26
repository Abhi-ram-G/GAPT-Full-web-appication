
import React, { useState, useEffect, useMemo, useContext } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { User, UserRole, UserStatus, AcademicBatch, Course, AccessLevel, Feature } from '@/types/types';
import { ApiService, MockDB } from '@/store/store';
import { ADMIN_EMAIL } from '@/constants/constants';
import { AuthContext } from '@/contexts/AuthContext';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];

const UserManagement: React.FC = () => {
  const { currentView } = useContext(AuthContext);
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPassVal, setNewPassVal] = useState('');

  const [enrollmentCategory, setEnrollmentCategory] = useState<'ADMIN' | 'STAFF' | 'STUDENT' | 'HOD' | 'DEAN'>('STUDENT');
  const [viewMode, setViewMode] = useState<'MANAGE' | 'LIST'>('LIST');
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.ADMIN);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [enrollmentMode, setEnrollmentMode] = useState<'SINGLE' | 'BULK'>('SINGLE');

  const [newStudent, setNewStudent] = useState({
    email: '', bulkEmails: '', name: '', departmentId: '', studyYear: '1st Year', regNo: '', batchType: 'UG' as 'UG' | 'PG'
  });

  const [newStaff, setNewStaff] = useState({
    email: '', bulkEmails: '', name: '', role: UserRole.STAFF, department: ''
  });

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setSelectedUserIds([]);
    setSelectedDeptFilter('ALL');
    setSelectedYearFilter('ALL');
    setSearchQuery('');
  }, [activeTab]);

  const fetchData = async () => {
    const [fetchedUsers, fetchedBatches, fetchedCourses, fetchedPerms] = await Promise.all([
      ApiService.getUsers(),
      ApiService.getAcademicBatches(),
      ApiService.getCurriculum(),
      MockDB.getPermissions()
    ]);
    setUsers(fetchedUsers);
    setBatches(fetchedBatches);
    setCourses(fetchedCourses);
    setPermissions(fetchedPerms);
  };

  const currentLevel = useMemo(() => {
    return permissions[currentView]?.[Feature.USER_DIRECTORY] || AccessLevel.NO_ACCESS;
  }, [permissions, currentView]);

  const allDepartments = useMemo(() => {
    const uniqueDepts = new Set<string>();
    courses.forEach(c => uniqueDepts.add(`${c.name} (${c.degree})`));
    return Array.from(uniqueDepts).sort();
  }, [courses]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return users.filter(u => {
      const matchesRole = activeTab === UserRole.STAFF
        ? [UserRole.STAFF, UserRole.ASSOC_PROF_I, UserRole.ASSOC_PROF_II, UserRole.ASSOC_PROF_III].includes(u.role)
        : u.role === activeTab;

      const matchesDept = selectedDeptFilter === 'ALL' || u.department === selectedDeptFilter;
      const matchesYear = activeTab !== UserRole.STUDENT || selectedYearFilter === 'ALL' || u.studyYear === selectedYearFilter;
      const matchesSearch = !searchQuery ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.regNo && u.regNo.toLowerCase().includes(q)) ||
        (u.staffId && u.staffId.toLowerCase().includes(q));

      return matchesRole && matchesDept && matchesYear && matchesSearch;
    });
  }, [users, activeTab, selectedDeptFilter, selectedYearFilter, searchQuery]);

  const canEditCurrentTab = useMemo(() => {
    if (currentLevel === AccessLevel.EDIT_ALL) return true;
    if (currentLevel === AccessLevel.VIEW_ALL || currentLevel === AccessLevel.NO_ACCESS) return false;

    if (activeTab === UserRole.STUDENT) {
      return [AccessLevel.EDIT_STUDENTS, AccessLevel.EDIT_STAFF_STUDENTS, AccessLevel.EDIT_HOD_STAFF_STUDENTS].includes(currentLevel);
    }
    if ([UserRole.STAFF, UserRole.ASSOC_PROF_I, UserRole.ASSOC_PROF_II, UserRole.ASSOC_PROF_III].includes(activeTab)) {
      return [AccessLevel.EDIT_STAFF, AccessLevel.EDIT_STAFF_STUDENTS, AccessLevel.EDIT_HOD_STAFF, AccessLevel.EDIT_HOD_STAFF_STUDENTS].includes(currentLevel);
    }
    if (activeTab === UserRole.HOD) {
      return [AccessLevel.EDIT_HOD, AccessLevel.EDIT_HOD_STAFF, AccessLevel.EDIT_HOD_STAFF_STUDENTS].includes(currentLevel);
    }
    return activeTab === UserRole.DEAN && currentLevel === AccessLevel.EDIT_ALL;
  }, [currentLevel, activeTab]);

  const availableStudentDepartments = useMemo(() => {
    if (enrollmentCategory !== 'STUDENT') return [];
    const currentYear = new Date().getFullYear();
    let targetStartYear = currentYear;
    if (newStudent.studyYear === '1st Year') targetStartYear = currentYear;
    else if (newStudent.studyYear === '2nd Year') targetStartYear = currentYear - 1;
    else if (newStudent.studyYear === '3rd Year') targetStartYear = currentYear - 2;
    else if (newStudent.studyYear === '4th Year') targetStartYear = currentYear - 3;
    else if (newStudent.studyYear === 'Final Year') targetStartYear = currentYear - 4;

    const matchingBatch = batches.find(b => b.startYear === targetStartYear && b.batchType === newStudent.batchType);
    if (!matchingBatch) return [];
    return matchingBatch.departmentIds.map(id => courses.find(c => c.id === id)).filter(Boolean) as Course[];
  }, [newStudent.studyYear, newStudent.batchType, batches, courses, enrollmentCategory]);

  const getDefaultPassword = (role: UserRole) => {
    switch (role) {
      case UserRole.STUDENT: return 'stdbitsathy';
      case UserRole.HOD: return '@hodbitsathy';
      case UserRole.DEAN: return 'deanbitsathy@';
      case UserRole.ADMIN: return 'password';
      default: return 'stfbitsathy';
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enrollmentCategory === 'STUDENT') {
      const selectedCourse = courses.find(c => c.id === newStudent.departmentId);
      const deptName = selectedCourse ? `${selectedCourse.name} (${selectedCourse.degree})` : 'Unassigned';
      if (enrollmentMode === 'SINGLE') {
        await ApiService.addUser({
          id: crypto.randomUUID(), email: newStudent.email.toLowerCase().trim(), name: newStudent.name.toUpperCase().trim(),
          role: UserRole.STUDENT, status: UserStatus.APPROVED, createdAt: new Date().toISOString(), password: 'stdbitsathy',
          regNo: `BIT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          department: deptName, studyYear: newStudent.studyYear
        });
      } else {
        const emails = newStudent.bulkEmails.split(',').map(em => em.trim().toLowerCase()).filter(em => em.length > 0);
        for (const email of emails) {
          await ApiService.addUser({
            id: crypto.randomUUID(), email: email, name: email.split('@')[0].replace('.', ' ').toUpperCase(),
            role: UserRole.STUDENT, status: UserStatus.APPROVED, createdAt: new Date().toISOString(), password: 'stdbitsathy',
            department: deptName, studyYear: newStudent.studyYear, regNo: `BIT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
          });
        }
      }
    } else {
      const roleToAssign = enrollmentCategory === 'ADMIN' ? UserRole.ADMIN : newStaff.role;
      const defaultPwd = getDefaultPassword(roleToAssign);
      if (enrollmentMode === 'SINGLE') {
        await ApiService.addUser({
          id: crypto.randomUUID(), email: newStaff.email.toLowerCase().trim(), name: newStaff.name.toUpperCase().trim(),
          role: roleToAssign, status: UserStatus.APPROVED, createdAt: new Date().toISOString(), password: defaultPwd,
          department: newStaff.department, designation: roleToAssign.replace(/_/g, ' ')
        });
      } else {
        const emails = newStaff.bulkEmails.split(',').map(em => em.trim().toLowerCase()).filter(em => em.length > 0);
        for (const email of emails) {
          await ApiService.addUser({
            id: crypto.randomUUID(), email: email, name: email.split('@')[0].replace('.', ' ').toUpperCase(),
            role: roleToAssign, status: UserStatus.APPROVED, createdAt: new Date().toISOString(), password: defaultPwd,
            department: newStaff.department, designation: roleToAssign.replace(/_/g, ' ')
          });
        }
      }
    }
    setIsAddModalOpen(false);
    await fetchData();
    setNewStudent({ email: '', bulkEmails: '', name: '', departmentId: '', studyYear: '1st Year', regNo: '', batchType: 'UG' });
    setNewStaff({ email: '', bulkEmails: '', name: '', role: UserRole.STAFF, department: '' });
  };

  const deleteUser = async (id: string) => {
    if (confirm('Permanently revoke access for this member?')) {
      await ApiService.deleteUser(id);
      await fetchData();
      setSelectedUserIds(prev => prev.filter(i => i !== id));
    }
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.filter(u => u.email !== ADMIN_EMAIL).map(u => u.id));
    }
  };

  const toggleSelectUser = (id: string) => {
    const user = users.find(u => u.id === id);
    if (user?.email === ADMIN_EMAIL) return;
    setSelectedUserIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <DashboardLayout title="Member Directory">
      <div className="max-w-6xl mx-auto py-2">
        <div className="flex items-center justify-start md:justify-center gap-2 mb-8 overflow-x-auto no-scrollbar">
          <button onClick={() => setViewMode('LIST')} className={`px-10 py-2.5 rounded-full font-bold text-xs border transition-all ${viewMode === 'LIST' ? 'bg-primary text-white shadow-xl' : 'bg-surface-component text-text-muted border-border-subtle'}`}>Member List</button>
          {currentLevel !== AccessLevel.VIEW_ALL && currentLevel !== AccessLevel.NO_ACCESS && (
            <button onClick={() => setViewMode('MANAGE')} className={`px-10 py-2.5 rounded-full font-bold text-xs border transition-all ${viewMode === 'MANAGE' ? 'bg-primary text-white shadow-xl' : 'bg-surface-component text-text-muted border-border-subtle'}`}>Create Members</button>
          )}
        </div>

        {viewMode === 'LIST' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col gap-6 mb-10">
              <div className="flex justify-center space-x-3 overflow-x-auto no-scrollbar">
                {[UserRole.ADMIN, UserRole.STAFF, UserRole.HOD, UserRole.DEAN, UserRole.STUDENT].map(role => (
                  <button key={role} onClick={() => setActiveTab(role)} className={`px-8 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === role ? 'bg-primary text-white shadow-lg' : 'bg-surface-component text-text-muted'}`}>{role.replace(/_/g, ' ')}s</button>
                ))}
              </div>

              {/* Scoping Filters */}
              <div className="flex flex-col md:flex-row items-end justify-center gap-6 animate-in slide-in-from-top-4 duration-500">
                {activeTab !== UserRole.ADMIN && (
                  <div className="w-full md:w-80 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Academic Division</label>
                    <select
                      value={selectedDeptFilter}
                      onChange={e => setSelectedDeptFilter(e.target.value)}
                      className="w-full bg-surface-component border border-border-subtle rounded-2xl px-6 py-3.5 text-xs text-text-primary font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="ALL">All Departments</option>
                      {allDepartments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}

                {activeTab === UserRole.STUDENT && (
                  <div className="w-full md:w-64 space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cohort Year</label>
                    <select
                      value={selectedYearFilter}
                      onChange={e => setSelectedYearFilter(e.target.value)}
                      className="w-full bg-surface-component border border-border-subtle rounded-2xl px-6 py-3.5 text-xs text-text-primary font-bold outline-none focus:ring-1 focus:ring-primary shadow-inner appearance-none cursor-pointer"
                    >
                      <option value="ALL">All Years</option>
                      {STUDY_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Search Matrix */}
              <div className="space-y-4">
                <div className="max-w-2xl mx-auto relative group">
                  <input
                    type="text"
                    placeholder={`Search ${activeTab.toLowerCase()}s in current scope...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-surface-component border border-border-subtle rounded-3xl px-12 py-4 text-sm text-text-primary outline-none focus:border-primary/50 transition-all shadow-inner font-bold placeholder:text-slate-600"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
              </div>
            </div>

            <div className="bg-surface-component border border-border-subtle rounded-3xl overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-black/5 dark:bg-black/20 border-b border-border-subtle">
                  <tr>
                    <th className="px-8 py-5 w-16">
                      <input type="checkbox" checked={selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary/40 cursor-pointer" />
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Member Identity</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest">Registry / Branch</th>
                    <th className="px-8 py-5 text-[10px] font-black text-primary uppercase tracking-widest">Credential Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-black/5 transition-all cursor-pointer group ${selectedUserIds.includes(u.id) ? 'bg-primary/5' : ''}`} onClick={() => toggleSelectUser(u.id)}>
                      <td className="px-8 py-6 w-16" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" disabled={u.email === ADMIN_EMAIL} checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectUser(u.id)} className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-primary focus:ring-primary/40 cursor-pointer disabled:opacity-0" />
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-deep border border-border-subtle flex items-center justify-center font-black text-primary group-hover:scale-110 transition-transform shadow-inner">{u.name[0]}</div>
                          <div>
                            <p className="text-sm font-black text-text-primary uppercase group-hover:text-primary transition-colors">{u.name}</p>
                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest mt-0.5">{u.role.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[10px] font-mono text-text-muted">{u.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black text-primary uppercase tracking-tighter">{u.regNo || u.staffId || 'SYS-ID'}</span>
                          <span className="text-[8px] text-slate-600 font-black uppercase">• {u.department?.split(' (')[0] || 'UNASSIGNED'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-[11px] font-mono font-black text-primary bg-primary/5 inline-block px-3 py-1 rounded-lg border border-primary/20">{u.password || 'ENCRYPTED'}</p>
                      </td>
                      <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                        {canEditCurrentTab && u.email !== ADMIN_EMAIL && (
                          <button onClick={() => deleteUser(u.id)} className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all active:scale-90 border border-red-500/20 shadow-lg shadow-red-900/10">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-24 text-center">
                        <p className="text-text-muted font-black uppercase tracking-[0.3em] text-xs">No institutional records in current scope</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {viewMode === 'MANAGE' && (
          <div className="max-w-2xl mx-auto space-y-4 animate-in fade-in duration-300">
            <EnrollmentAction color="blue-600" label="student enrollment" roleLabel="Institutional Students" onClick={() => { setEnrollmentCategory('STUDENT'); setEnrollmentMode('SINGLE'); setIsAddModalOpen(true); }} />
            <EnrollmentAction color="emerald-600" label="faculty enrollment" roleLabel="Educational Staff" onClick={() => { setEnrollmentCategory('STAFF'); setNewStaff(s => ({ ...s, role: UserRole.STAFF })); setEnrollmentMode('SINGLE'); setIsAddModalOpen(true); }} />
            <EnrollmentAction color="purple-600" label="hod enrollment" roleLabel="Heads of Departments" onClick={() => { setEnrollmentCategory('HOD'); setNewStaff(s => ({ ...s, role: UserRole.HOD })); setEnrollmentMode('SINGLE'); setIsAddModalOpen(true); }} />
            <EnrollmentAction color="indigo-600" label="dean enrollment" roleLabel="Executive Leadership" onClick={() => { setEnrollmentCategory('DEAN'); setNewStaff(s => ({ ...s, role: UserRole.DEAN })); setEnrollmentMode('SINGLE'); setIsAddModalOpen(true); }} />
            {currentLevel === AccessLevel.EDIT_ALL && (
              <EnrollmentAction color="primary" label="admin enrollment" roleLabel="System Governance" onClick={() => { setEnrollmentCategory('ADMIN'); setNewStaff(s => ({ ...s, role: UserRole.ADMIN })); setEnrollmentMode('SINGLE'); setIsAddModalOpen(true); }} />
            )}
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-[#0b1121] border border-white/5 p-8 md:p-12 rounded-[3.5rem] max-w-xl w-full shadow-2xl animate-in zoom-in-95 duration-300 relative my-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">REGISTER {enrollmentCategory}</h3>
              <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 shadow-inner">
                <button onClick={() => setEnrollmentMode('SINGLE')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${enrollmentMode === 'SINGLE' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Single</button>
                <button onClick={() => setEnrollmentMode('BULK')} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${enrollmentMode === 'BULK' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-500 hover:text-slate-300'}`}>Bulk</button>
              </div>
            </div>

            <form onSubmit={handleAddMember} className="space-y-6">
              {enrollmentCategory === 'STUDENT' ? (
                <>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <select required value={newStudent.studyYear} onChange={e => setNewStudent({ ...newStudent, studyYear: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none appearance-none cursor-pointer font-bold shadow-inner">
                        {STUDY_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select required value={newStudent.batchType} onChange={e => setNewStudent({ ...newStudent, batchType: e.target.value as 'UG' | 'PG' })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none appearance-none cursor-pointer font-bold shadow-inner">
                        <option value="UG">UG Division</option>
                        <option value="PG">PG Division</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Show Department Available</label>
                      <select required value={newStudent.departmentId} onChange={e => setNewStudent({ ...newStudent, departmentId: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none appearance-none cursor-pointer font-bold shadow-inner">
                        <option value="" disabled>Select Department</option>
                        {availableStudentDepartments.map(dept => <option key={dept.id} value={dept.id}>{dept.name} ({dept.degree})</option>)}
                      </select>
                    </div>

                    <div className="animate-in slide-in-from-top-4 duration-300 space-y-4">
                      {enrollmentMode === 'SINGLE' ? (
                        <>
                          <input type="text" placeholder="Name" required value={newStudent.name} onChange={e => setNewStudent({ ...newStudent, name: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-1 focus:ring-primary/40 transition-all font-bold" />
                          <input type="email" placeholder="Mail ID" required value={newStudent.email} onChange={e => setNewStudent({ ...newStudent, email: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none font-mono focus:ring-1 focus:ring-primary/40 transition-all" />
                        </>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mail ID List (Separated by Comma)</label>
                          <textarea placeholder="name1@bitsathy.ac.in, name2@bitsathy.ac.in..." required rows={4} value={newStudent.bulkEmails} onChange={e => setNewStudent({ ...newStudent, bulkEmails: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-3xl px-6 py-5 text-sm text-white outline-none font-mono resize-none custom-scrollbar shadow-inner" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Available Department</label>
                      <select required value={newStaff.department} onChange={e => setNewStaff({ ...newStaff, department: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none appearance-none cursor-pointer font-bold shadow-inner">
                        <option value="" disabled>Choose Department</option>
                        {allDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>

                    <div className="animate-in slide-in-from-top-4 duration-300 space-y-4">
                      {enrollmentCategory !== 'ADMIN' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Member Role</label>
                          <select required value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value as UserRole })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none appearance-none cursor-pointer font-bold shadow-inner">
                            <option value={UserRole.STAFF}>Assistant Professor</option>
                            <option value={UserRole.ASSOC_PROF_I}>Associate Professor I</option>
                            <option value={UserRole.ASSOC_PROF_II}>Associate Professor II</option>
                            <option value={UserRole.HOD}>Head of Department</option>
                            <option value={UserRole.DEAN}>Dean / Director</option>
                          </select>
                        </div>
                      )}

                      {enrollmentMode === 'SINGLE' ? (
                        <>
                          <input type="text" placeholder="Name" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-1 focus:ring-primary/40 transition-all font-bold" />
                          <input type="email" placeholder="Mail ID" required value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white outline-none font-mono focus:ring-1 focus:ring-primary/40 transition-all" />
                        </>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Mail ID List (Separated by Comma)</label>
                          <textarea placeholder="prof1@bitsathy.ac.in, prof2@bitsathy.ac.in..." required rows={4} value={newStaff.bulkEmails} onChange={e => setNewStaff({ ...newStaff, bulkEmails: e.target.value })} className="w-full bg-black/40 border border-white/5 rounded-3xl px-6 py-5 text-sm text-white outline-none font-mono resize-none custom-scrollbar shadow-inner" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-10 gap-6">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 text-xs font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-5 bg-primary text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-95 transition-all">Authorize Identity</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

const EnrollmentAction: React.FC<{ color: string, label: string, roleLabel: string, onClick: () => void }> = ({ color, label, roleLabel, onClick }) => (
  <div className={`flex items-center justify-between p-8 bg-surface-component border border-border-subtle rounded-[2.5rem] shadow-xl hover:border-${color}/40 transition-all group`}>
    <div className="flex flex-col">
      <span className="text-xl font-black text-text-primary lowercase tracking-tight group-hover:text-primary transition-colors">{label}</span>
      <p className="text-[10px] text-text-muted uppercase font-black tracking-widest mt-1">{roleLabel}</p>
    </div>
    <button onClick={onClick} className="px-8 py-3 bg-primary text-white font-black text-[10px] rounded-xl uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all">Initialize</button>
  </div>
);

export default UserManagement;
