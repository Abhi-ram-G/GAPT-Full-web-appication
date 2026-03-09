
import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { UserRole, UserStatus, User, Course, AcademicBatch } from '../types';
import { ApiService } from '../store';

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
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [recentCreations, setRecentCreations] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    bulkNames: '',
    department: '',
    year: '1st Year',
    batchId: '', // Added for academic batch reference
    experience: '',
    designation: 'Associate Professor I',
    emailPart2: '' // Added for the second part of the email (e.g., ad23)
  });

  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string; popup?: boolean } | null>(null);

  useEffect(() => {
    const loadCurriculum = async () => {
      const cur = await ApiService.getCurriculum();
      const bats = await ApiService.getAcademicBatches();
      setCurriculum(cur);
      setBatches(bats);
    };
    loadCurriculum();
    refreshHistory();
  }, []);

  const handleBatchChange = (selectedBatchId: string) => {
    const batch = batches.find(b => b.id === selectedBatchId);
    let newYear = formData.year;

    if (batch) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth(); // 0-indexed (0=Jan, 5=Jun)
      const diff = currentYear - batch.startYear;
      // If we are past June (month >= 5), the new academic year has started
      const academicYear = currentMonth >= 5 ? diff + 1 : diff;

      const yearStrs = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];
      // -1 because array is 0-indexed. Example: academicYear 1 => index 0 ('1st Year')
      const idx = Math.max(0, Math.min(academicYear - 1, yearStrs.length - 1));
      newYear = yearStrs[idx];
    }

    setFormData(prev => ({ ...prev, batchId: selectedBatchId, year: newYear, department: '' }));
  };

  const refreshHistory = async () => {
    const allUsers = await ApiService.getUsers();
    setRecentCreations(allUsers.slice(-10).reverse());
  };

  const getDeptCode = (fullDept: string) => {
    const baseDeptName = fullDept.split(' (')[0];
    return DEPT_CODES[baseDeptName] || baseDeptName.substring(0, 2).toUpperCase();
  };

  const generateEmail = (name: string, part2: string, role: UserRole) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '').split('.')[0]; // Take first part of name
    const domain = role === UserRole.STUDENT ? '@std.bitsathy.ac.in' : '@bitsathy.ac.in';
    return `${cleanName}${part2 ? '.' + part2.toLowerCase() : ''}${domain}`;
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
    return defaultRole;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const isMissingName = mode === 'SINGLE' ? !formData.name.trim() : !formData.bulkNames.trim();
    if (isMissingName || !formData.department) {
      setStatus({ type: 'error', msg: 'Missing Fields: Please fill out Name & Institutional Branch!' });
      return;
    }

    try {
      const users = await ApiService.getUsers();
      const batchYear = formData.batchId
        ? batches.find(b => b.id === formData.batchId)?.startYear.toString().slice(-2) || '24'
        : '24';
      const dept = formData.department;

      if (mode === 'SINGLE') {
        const email = generateEmail(formData.name, formData.emailPart2 || '', activeRole);
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

        const newUser: any = {
          id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}`,
          username: email,
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

        await ApiService.addUser(newUser);
        setStatus({ type: 'success', popup: true, msg: `${newUser.name} is added successfully` });
        setFormData(prev => ({ ...prev, name: '' }));
      } else {
        const names = formData.bulkNames.split(/[\n,]/).map(n => n.trim()).filter(n => n.length > 0);
        if (names.length === 0) return;

        const deptCode = getDeptCode(dept);
        let currentUsers = [...users];
        let startSequence = currentUsers.filter(u => u.regNo?.includes(deptCode)).length + 1;

        const roleToAssign = activeRole === UserRole.STUDENT
          ? UserRole.STUDENT
          : getRoleFromDesignation(formData.designation, UserRole.STAFF);
        const defaultPwd = getDefaultPassword(roleToAssign);

        for (const name of names) {
          const email = generateEmail(name, formData.emailPart2 || '', activeRole);
          if (currentUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) continue;

          const regNo = activeRole === UserRole.STUDENT ? generateRegNo(dept, batchYear, startSequence++) : undefined;
          await ApiService.addUser({
            id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2)}`, username: email, name: name.toUpperCase(), email, password: defaultPwd, regNo,
            role: roleToAssign, status: UserStatus.APPROVED, createdAt: new Date().toISOString(),
            department: dept, studyYear: activeRole === UserRole.STUDENT ? formData.year : undefined,
            experience: activeRole === UserRole.STAFF ? formData.experience : undefined,
            designation: activeRole === UserRole.STAFF ? formData.designation : undefined,
          } as any);
          currentUsers.push({ email, regNo } as any);
        }

        setStatus({ type: 'success', popup: true, msg: `Members are added to member directory successfully` });
        setFormData(prev => ({ ...prev, bulkNames: '' }));
      }
      refreshHistory();
    } catch (err: any) {
      console.error("API Error: ", err);
      setStatus({ type: 'error', popup: true, msg: err.message || 'Error communicating with network registry' });
    }
  };

  const domainGroups = useMemo(() => {
    const groups: Record<string, Course[]> = {};
    const selectedBatch = batches.find(b => b.id === formData.batchId);

    const validCourses = (selectedBatch && activeRole === UserRole.STUDENT)
      ? curriculum.filter(c => selectedBatch.departmentIds.includes(c.id))
      : curriculum;

    validCourses.forEach(c => {
      if (!groups[c.domain]) groups[c.domain] = [];
      groups[c.domain].push(c);
    });
    return groups;
  }, [curriculum, batches, formData.batchId, activeRole]);

  return (
    <DashboardLayout title="Institutional Identity Management">
      <div className="max-w-6xl mx-auto py-4 space-y-8 pb-20 relative">

        {/* Success Pop-up Modal */}
        {status?.popup && status.type === 'success' && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-[#0b1121] border border-emerald-500/30 p-10 rounded-[3rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-4 lowercase tracking-tight">Identity Authorized</h3>
              <p className="text-emerald-400 font-bold uppercase tracking-widest text-[11px] mb-8 leading-relaxed">
                {status?.msg}
              </p>
              <button
                onClick={() => setStatus(null)}
                className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl"
              >
                Close Window
              </button>
            </div>
          </div>
        )}

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
              <div className="space-y-8 flex flex-col h-full">
                <div className="flex flex-col h-full">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">{mode === 'SINGLE' ? 'Full Name' : 'List of Names'}</label>
                  {mode === 'SINGLE' ? (
                    <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })} placeholder="E.G. JAI AKASH S R" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold" />
                  ) : (
                    <textarea required rows={18} value={formData.bulkNames} onChange={e => setFormData({ ...formData, bulkNames: e.target.value.toUpperCase() })} placeholder="JAI AKASH&#10;BOBBY SMITH..." className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold resize-none custom-scrollbar" />
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {activeRole === UserRole.STUDENT && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Batch ID</label>
                      <select required value={formData.batchId} onChange={e => handleBatchChange(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/30 transition-all">
                        <option value="" disabled>Select Cohort...</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Year (Auto)</label>
                      <input type="text" readOnly value={formData.year} className="w-full bg-slate-950/50 border border-slate-800/50 rounded-2xl px-6 py-4 text-slate-500 font-bold outline-none cursor-not-allowed" />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Institutional Branch</label>
                  <select required value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} disabled={activeRole === UserRole.STUDENT && !formData.batchId} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    <option value="" disabled>{activeRole === UserRole.STUDENT && !formData.batchId ? 'Select a Batch First...' : 'Choose Department...'}</option>
                    {Object.entries(domainGroups).map(([domain, courses]) => (
                      <optgroup key={domain} label={domain}>
                        {(courses as Course[]).map(c => <option key={c.id} value={`${c.name} (${c.degree})`}>{c.name} ({c.degree})</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Email Batch/Identifier (Optional)</label>
                  <input type="text" value={formData.emailPart2} onChange={e => setFormData({ ...formData, emailPart2: e.target.value.toLowerCase() })} placeholder="e.g. ad23" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-5 text-white outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-bold" />
                  <p className="text-[10px] text-slate-500 mt-2 font-mono">
                    Preview: {mode === 'SINGLE' && formData.name ? generateEmail(formData.name, formData.emailPart2, activeRole) : `name${formData.emailPart2 ? '.' + formData.emailPart2 : ''}${activeRole === UserRole.STUDENT ? '@std.bitsathy.ac.in' : '@bitsathy.ac.in'}`}
                  </p>
                </div>

                {activeRole === UserRole.STAFF && (
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Experience</label>
                      <input type="text" value={formData.experience} onChange={e => setFormData({ ...formData, experience: e.target.value })} placeholder="e.g. 12+ Yrs" className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white outline-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Designation</label>
                      <select value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white outline-none font-bold">
                        <option value="Associate Professor I">Assoc. Prof I</option>
                        <option value="Associate Professor II">Assoc. Prof II</option>
                        <option value="Head of Department">HOD</option>
                        <option value="Dean">Dean</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 pt-6">
                <button type="submit" className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.3em] text-sm transition-all shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${activeRole === UserRole.STUDENT ? 'bg-blue-600' : 'bg-emerald-600'}`}>Activate Institutional Identity</button>
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
