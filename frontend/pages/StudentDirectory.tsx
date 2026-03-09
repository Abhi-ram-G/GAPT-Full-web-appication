
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import DashboardLayout from '../components/DashboardLayout';
import { User, UserRole, UserStatus, AcademicBatch, Course } from '../types';
import { ApiService } from '../store';

const AttendanceCircle: React.FC<{ percentage: number }> = ({ percentage }) => {
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (p: number) => {
    if (p >= 80) return 'stroke-[#10b981]';
    if (p >= 70) return 'stroke-sky-500';
    return 'stroke-red-500';
  };

  return (
    <div className="relative flex flex-col items-center">
      <div className="relative flex items-center justify-center w-16 h-16">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            className="stroke-slate-800/40"
            strokeWidth="3.5"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={`${getColor(percentage)} transition-all duration-1000 ease-out`}
            strokeWidth="3.5"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute text-[11px] font-black text-white">{percentage}%</span>
      </div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider mt-1">Attendance</span>
    </div>
  );
};

const StudentDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [batches, setBatches] = useState<AcademicBatch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('ALL');
  const [selectedDept, setSelectedDept] = useState<string>('All Departments');
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<Record<string, number>>({});
  const [allUsersCount, setAllUsersCount] = useState<number>(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDirectoryData = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const [allUsers, fetchedBatches, fetchedCourses] = await Promise.all([
        ApiService.getUsers(),
        ApiService.getAcademicBatches(),
        ApiService.getCurriculum()
      ]);

      setAllUsersCount(allUsers.length);

      const approvedStudents = allUsers.filter(u => {
        const uRole = (u.role || '').toString().toUpperCase();
        const uStatus = (u.status || 'APPROVED').toString().toUpperCase();
        return uRole === UserRole.STUDENT && uStatus === UserStatus.APPROVED;
      });

      setStudents(approvedStudents);
      setFilteredStudents(approvedStudents);
      setBatches(fetchedBatches);
      setCourses(fetchedCourses);

      const allDepts = Array.from(new Set(fetchedCourses.map(c => `${c.name} (${c.degree})`)));
      setAvailableDepts(allDepts.sort());

      const attendanceMap: Record<string, number> = {};
      await Promise.all(approvedStudents.map(async (student) => {
        try {
          const data = await ApiService.getAcademicData(student.id);
          attendanceMap[student.id] = data.attendance;
        } catch (err) {
          attendanceMap[student.id] = 85;
        }
      }));
      setStudentAttendance(attendanceMap);
    } catch (err: any) {
      console.error("Failed to fetch student directory data:", err);
      setFetchError(err.message || "Connection Error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectoryData();
  }, []);

  const handleSeedData = async () => {
    try {
      const now = new Date().toISOString();
      const demoStudents = [
        { id: `s1-${Date.now()}`, username: 'student1@gapt.edu', email: 'student1@gapt.edu', name: 'John Doe', role: UserRole.STUDENT, status: UserStatus.APPROVED, createdAt: now, department: availableDepts[0] || 'Computer Science (B.Tech)', studyYear: '3rd Year', regNo: 'BIT-CS001', password: 'password' },
        { id: `s2-${Date.now()}`, username: 'student2@gapt.edu', email: 'student2@gapt.edu', name: 'Jane Smith', role: UserRole.STUDENT, status: UserStatus.APPROVED, createdAt: now, department: availableDepts[0] || 'Computer Science (B.Tech)', studyYear: '3rd Year', regNo: 'BIT-CS002', password: 'password' }
      ];
      for (const s of demoStudents) { await ApiService.addUser(s as any); }
      await fetchDirectoryData();
    } catch (err) { alert("Seeding failed. Is your backend running?"); }
  };

  useEffect(() => {
    let result = [...students];

    if (selectedBatchId !== 'ALL') {
      const selectedBatch = batches.find(b => b.id === selectedBatchId);
      if (selectedBatch) {
        const batchDeptIds = selectedBatch.departmentIds || [];
        const batchDepts = courses
          .filter(c => batchDeptIds.includes(c.id))
          .map(c => `${c.name} (${c.degree})`);
        setAvailableDepts(batchDepts.sort());
      }
    } else {
      const allDeptsFromCourses = Array.from(new Set(courses.map(c => `${c.name} (${c.degree})`)));
      setAvailableDepts(allDeptsFromCourses.sort());
    }

    if (selectedDept !== 'All Departments') {
      result = result.filter(s => {
        const sDept = (s.department || '').trim().toUpperCase();
        const tDept = selectedDept.trim().toUpperCase();
        return sDept === tDept || sDept.includes(tDept) || tDept.includes(sDept);
      });
    }

    setFilteredStudents(result);
  }, [selectedDept, selectedBatchId, students, batches, courses]);

  return (
    <DashboardLayout title="Institutional Student Body" resultCount={filteredStudents.length}>
      <div className="max-w-7xl mx-auto pb-10">
        <div className="mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#020617] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="shrink-0">
            <h2 className="text-white font-black text-2xl tracking-tight lowercase">student directory</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Approved: {students.length}</p>
              <span className="w-1 h-1 rounded-full bg-slate-800"></span>
              <p className="text-sky-500 text-[10px] font-bold uppercase tracking-widest">Matches Filter: {filteredStudents.length}</p>
              {allUsersCount > students.length && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-800"></span>
                  <p className="text-amber-500 text-[10px] font-bold uppercase tracking-widest">Pending/Other: {allUsersCount - students.length}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 w-full lg:w-auto flex-1 lg:justify-end">
            <div className="relative w-full md:w-64">
              <label htmlFor="batch-select" className="sr-only">Filter by batch</label>
              <select
                id="batch-select"
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  setSelectedDept('All Departments');
                }}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-all appearance-none cursor-pointer font-bold shadow-inner"
              >
                <option value="ALL">All Academic Batches</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-64">
              <label htmlFor="student-dept-filter" className="sr-only">Filter by department</label>
              <select
                id="student-dept-filter"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-all appearance-none cursor-pointer font-bold shadow-inner"
              >
                <option value="All Departments">All Departments</option>
                {availableDepts.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="mb-10 p-8 bg-red-500/10 border border-red-500/20 rounded-[2.5rem] text-center">
            <p className="text-red-400 font-bold mb-4">Connection Issue: {fetchError}</p>
            <button onClick={() => fetchDirectoryData()} className="px-6 py-2 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-all">
              Retry Connection
            </button>
          </div>
        )}

        {!isLoading && students.length === 0 && !fetchError && (
          <div className="mb-10 p-12 bg-slate-900/40 border border-white/5 rounded-[3rem] text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354l1.173 2.435 2.684.394-1.942 1.898.458 2.684L12 10.518l-2.373 1.247.458-2.684-1.942-1.898 2.684-.394L12 4.354zM12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"></path></svg>
            </div>
            <h3 className="text-white font-black text-xl mb-2">No Approved Students Found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
              Either no students have been registered, or they are still in 'PENDING' status in the Member Directory.
            </p>
            <div className="flex justify-center gap-4">
              <button onClick={handleSeedData} className="px-8 py-4 bg-sky-500 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20">
                Seed Demo Students
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => <div key={i} className="h-80 bg-slate-900/50 rounded-[3rem] animate-pulse border border-white/5"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-12">
            {filteredStudents.map((student) => {
              const attendance = studentAttendance[student.id] || 0;
              const deptParts = student.department?.split(' (');
              const deptMain = deptParts ? deptParts[0] : 'UNASSIGNED';
              const degree = deptParts && deptParts[1] ? deptParts[1].replace(')', '') : 'B.TECH';

              return (
                <div key={student.id} className="group bg-[#0f172a] border border-white/5 rounded-[3rem] p-8 shadow-2xl hover:border-sky-400/40 transition-all duration-500 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div className="flex items-center space-x-5">
                      <div className="w-16 h-16 rounded-[1.25rem] bg-black border border-white/5 flex items-center justify-center text-slate-500 font-black text-2xl group-hover:scale-110 transition-transform duration-500 overflow-hidden shadow-inner shrink-0">
                        {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : student.name[0]}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white font-black text-lg leading-[1.1] uppercase tracking-tighter break-words mb-1">
                          {student.name}
                        </h3>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{UserRole.STUDENT}</p>
                      </div>
                    </div>
                    <AttendanceCircle percentage={attendance} />
                  </div>

                  <div className="mb-8 relative z-10">
                    <h4 className="text-white font-black text-base uppercase tracking-tight leading-tight line-clamp-2 min-h-[2.5rem]">
                      {deptMain}
                    </h4>
                    <div className="h-px w-full bg-white/5 mt-4"></div>
                  </div>

                  <div className="space-y-4 relative z-10 mb-8 text-xs font-black uppercase tracking-widest">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">Degree</span>
                      <span className="text-white">{degree}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">Year</span>
                      <span className="text-indigo-400">{student.studyYear || 'TBD'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[10px]">ID</span>
                      <span className="text-white font-mono">{student.regNo || student.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                    <button onClick={() => navigate(`/profile/${student.id}`)} className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
                      Audit Profile
                    </button>
                    <button onClick={() => navigate(`/profile/${student.id}`)} className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-sky-400 group-hover:border-sky-400/20 transition-all">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentDirectory;
