
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { UserRole, UserStatus, User, Course } from '../types';
import { MockDB } from '../store';

const DEPT_CODES: Record<string, string> = {
  'Artificial Intelligence': 'AD',
  'Computer Science': 'CS',
  'Information Technology': 'IT',
  'Data Science': 'DS',
  'Cyber Security': 'CY',
  'Mechanical Engineering': 'ME',
  'Civil Engineering': 'CE',
  'Electrical & Electronics': 'EE',
  'Electronics & Communication': 'EC',
  'Structural Engineering': 'SE',
  'MBA': 'MB',
  'MCA': 'MC'
};

const CreateMailId: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole.STAFF | UserRole.STUDENT>(UserRole.STUDENT);
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [curriculum, setCurriculum] = useState<Course[]>([]);
  const [recentCreations, setRecentCreations] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    bulkNames: '',
    department: '', 
    year: '1st Year',
    batchYear: '28',
    experience: '',
    designation: 'Associate Professor I'
  });
  
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

  useEffect(() => {
    const loadCurriculum = async () => {
      const cur = await MockDB.getCurriculum();
      setCurriculum(cur);
    };
    loadCurriculum();
    refreshHistory();
  }, []);

  const refreshHistory = async () => {
    const allUsers = await MockDB.getUsers();
    setRecentCreations(allUsers.slice(-10).reverse());
  };

  const getDeptCode = (fullDept: string) => {
    const baseDeptName = fullDept.split(' (')[0];
    return DEPT_CODES[baseDeptName] || baseDeptName.substring(0, 2).toUpperCase();
  };

  const generateEmail = (name: string, dept: string, role: UserRole) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '');
    const roleCode = role === UserRole.STUDENT ? 'std' : 'stf';
    const deptCode = getDeptCode(dept).toLowerCase();
    return `${cleanName}.${roleCode}.${deptCode}@bitsathy.ac.in`;
  };

  const generateRegNo = (dept: string, batchYear: string, sequence: number) => {
    const deptCode = getDeptCode(dept);
    const seqStr = sequence.toString().padStart(3, '0');
    return `BIT${batchYear}${deptCode}${seqStr}`;
  };

  const getDefaultPassword = (role: UserRole) => {
    switch (role) {
      case UserRole.STUDENT: return 'stdbitsathy';
      case UserRole.HOD: return '@hodbitsathy';
      case UserRole.DEAN: return 'deanbitsathy@';
      default: return 'stfbitsathy';
    }
  };

  const getRoleFromDesignation = (designation: string, defaultRole: UserRole) => {
    if (designation === 'Head of Department') return UserRole.HOD;
    if (designation === 'Dean') return UserRole.DEAN;
    if (designation === 'Associate Professor I') return UserRole.ASSOC_PROF_I;
    if (designation === 'Associate Professor II') return UserRole.ASSOC_PROF_II;
    return defaultRole;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const users = await MockDB.getUsers();
    const batchYear = formData.batchYear;
    const dept = formData.department;
    
    if (mode === 'SINGLE') {
      const email = generateEmail(formData.name, dept, activeRole);
      if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setStatus({ type: 'error', msg: 'ID Conflict: This email ID already exists.' });
        return;
      }

      const sameDeptUsers = users.filter(u => u.regNo?.includes(getDeptCode(dept)));
      const sequence = sameDeptUsers.length + 1;
      const regNo = generateRegNo(dept, batchYear, sequence);
      
      const roleToAssign = activeRole === UserRole.STUDENT 
        ? UserRole.STUDENT 
        : getRoleFromDesignation(formData.designation, UserRole.STAFF);

      const newUser: User = {
        id: crypto.randomUUID(),
        name: formData.name.trim().toUpperCase(),
        email: email,
        password: getDefaultPassword(roleToAssign),
        regNo: activeRole === UserRole.STUDENT ? regNo : undefined,
        role: roleToAssign,
        status: UserStatus.APPROVED,
        createdAt: new Date().toISOString(),
        department: dept,
        studyYear: activeRole === UserRole.STUDENT ? formData.year : undefined,
        experience: activeRole === UserRole.STAFF ? formData.experience : undefined,
        designation: activeRole === UserRole.STAFF ? formData.designation : undefined,
      };

      await MockDB.addUser(newUser);
      setStatus({ type: 'success', msg: `ID Activated: ${email}.` });
      setFormData(prev => ({ ...prev, name: '' }));
    } else {
      const names = formData.bulkNames.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 0);
      if (names.length === 0) return;

      const deptCode = getDeptCode(dept);
      let currentUsers = await MockDB.getUsers();
      let startSequence = currentUsers.filter(u => u.regNo?.includes(deptCode)).length + 1;
      
      const roleToAssign = activeRole === UserRole.STUDENT 
        ? UserRole.STUDENT 
        : getRoleFromDesignation(formData.designation, UserRole.STAFF);
      const defaultPwd = getDefaultPassword(roleToAssign);

      for (const name of names) {
        const email = generateEmail(name, dept, activeRole);
        if (currentUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) continue;

        const regNo = activeRole === UserRole.STUDENT ? generateRegNo(dept, batchYear, startSequence++) : undefined;
        await MockDB.addUser({
          id: crypto.randomUUID(), name: name.toUpperCase(), email, password: defaultPwd, regNo, 
          role: roleToAssign, status: UserStatus.APPROVED, createdAt: new Date().toISOString(),
          department: dept, studyYear: activeRole === UserRole.STUDENT ? formData.year : undefined,
          experience: activeRole === UserRole.STAFF ? formData.experience : undefined,
          designation: activeRole === UserRole.STAFF ? formData.designation : undefined,
        });
        currentUsers = await MockDB.getUsers();
      }

      setStatus({ type: 'success', msg: `Batch Processed: ${names.length} identities created.` });
      setFormData(prev => ({ ...prev, bulkNames: '' }));
    }
    refreshHistory();
  };

  const domainGroups = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    curriculum.forEach(c => {
      if (!groups[c.domain]) groups[c.domain] = [];
      groups[c.domain].push(c);
    });
    return groups;
  }, [curriculum]);

  return (
    <DashboardLayout title="Institutional Identity Management">
      <div className="max-w-6xl mx-auto py-4 space-y-8 pb-20">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-4 flex items-center justify-center shadow-xl max-w-lg mx-auto">
           <div className="flex bg-slate-950 p-1.5 rounded-2xl w-full border border-slate-800/50">
             <button onClick={() => setActiveRole(UserRole.STUDENT)} className={`flex-1 py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRole === UserRole.STUDENT ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Student Creation</button>
             <button onClick={() => setActiveRole(UserRole.STAFF)} className={`flex-1 py-4 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeRole === UserRole.STAFF ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>Staff ID Creation</button>
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="p-8 md:p-12">
            <div className="flex justify-center mb-12">
              <div className="flex bg-slate-950 p-1.5 rounded-2xl w-full max-w-md border border-slate-800/50">
                 <button onClick={() => setMode('BULK')} className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'BULK' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Bulk Batch</button>
                 <button onClick={() => setMode('SINGLE')} className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'SINGLE' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Single ID</button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{mode === 'SINGLE' ? 'Full Name' : 'List of Names'}</label>
                  {mode === 'SINGLE' ? (
                    <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="E.G. JAI AKASH S R" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold" />
                  ) : (
                    <textarea required rows={8} value={formData.bulkNames} onChange={e => setFormData({...formData, bulkNames: e.target.value.toUpperCase()})} placeholder="JAI AKASH&#10;BOBBY SMITH..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold resize-none custom-scrollbar" />
                  )}
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Institutional Branch</label>
                  <select required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/30 transition-all">
                    <option value="" disabled>Choose Department...</option>
                    {Object.entries(domainGroups).map(([domain, courses]) => (
                      <optgroup key={domain} label={domain}>
                        {(courses as Course[]).map(c => <option key={c.id} value={`${c.name} (${c.degree})`}>{c.name} ({c.degree})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {activeRole === UserRole.STUDENT ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Year</label>
                      <select required value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none">
                        {['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Batch ID</label>
                      <input type="text" required value={formData.batchYear} onChange={e => setFormData({...formData, batchYear: e.target.value})} placeholder="28" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white outline-none font-bold" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Experience</label>
                        <input type="text" value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} placeholder="e.g. 12+ Yrs" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white outline-none font-bold" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Designation</label>
                        <select value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white outline-none font-bold">
                          <option value="Associate Professor I">Assoc. Prof I</option>
                          <option value="Associate Professor II">Assoc. Prof II</option>
                          <option value="Head of Department">HOD</option>
                          <option value="Dean">Dean</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 pt-6">
                <button type="submit" disabled={(!formData.name.trim() && !formData.bulkNames.trim()) || !formData.department} className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-sm transition-all shadow-2xl ${activeRole === UserRole.STUDENT ? 'bg-blue-600' : 'bg-emerald-600'} disabled:opacity-20`}>Activate Institutional Identity</button>
                {status && <div className={`mt-8 p-6 rounded-2xl border text-center font-black uppercase text-xs ${status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>{status.msg}</div>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateMailId;
