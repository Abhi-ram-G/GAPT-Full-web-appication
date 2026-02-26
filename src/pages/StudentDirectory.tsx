
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { User, UserRole, UserStatus } from '@/types/types';
import { MockDB } from '@/store/store';

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
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Attendance</span>
    </div>
  );
};

const StudentDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('All Departments');
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchStudents = async () => {
      const allUsers = await MockDB.getUsers();
      const approvedStudents = allUsers.filter(u => u.role === UserRole.STUDENT && u.status === UserStatus.APPROVED);
      setStudents(approvedStudents);
      setFilteredStudents(approvedStudents);

      const depts = Array.from(new Set(approvedStudents.map(s => s.department).filter(Boolean) as string[]));
      setAvailableDepts(depts.sort());

      const attendanceMap: Record<string, number> = {};
      for (const student of approvedStudents) {
        const data = await MockDB.getAcademicData(student.id);
        attendanceMap[student.id] = data.attendance;
      }
      setStudentAttendance(attendanceMap);
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedDept === 'All Departments') {
      setFilteredStudents(students);
    } else {
      setFilteredStudents(students.filter(s => s.department === selectedDept));
    }
  }, [selectedDept, students]);

  return (
    <DashboardLayout title="Institutional Student Body">
      <div className="max-w-7xl mx-auto pb-10">
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#020617] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
          <div>
            <h2 className="text-white font-black text-2xl tracking-tight lowercase">student directory</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Total Enrolled Members: {students.length}</p>
          </div>
          <div className="relative min-w-[320px]">
            <select 
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-sky-500 transition-all appearance-none cursor-pointer font-bold shadow-inner"
            >
              <option value="All Departments">All Departments</option>
              {availableDepts.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
          {filteredStudents.map((student) => {
            const attendance = studentAttendance[student.id] || 0;
            const deptMain = student.department?.split(' (')[0] || 'DEPARTMENT NOT ASSIGNED';
            const degree = student.department?.split('(')[1]?.replace(')', '') || 'B.TECH';

            return (
              <div 
                key={student.id} 
                className="group bg-[#0f172a] border border-white/5 rounded-[3rem] p-8 shadow-2xl hover:border-sky-400/40 transition-all duration-500 flex flex-col relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="flex items-start justify-between mb-8 relative z-10">
                  <div className="flex items-center space-x-5">
                    <div className="w-16 h-16 rounded-[1.25rem] bg-black border border-white/5 flex items-center justify-center text-slate-500 font-black text-2xl group-hover:scale-110 transition-transform duration-500 overflow-hidden shadow-inner shrink-0">
                       {student.avatar ? <img src={student.avatar} className="w-full h-full object-cover" /> : student.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-white font-black text-lg leading-[1.1] uppercase tracking-tighter break-words mb-1 pr-2">
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

                <div className="space-y-4 relative z-10 mb-8">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Degree</span>
                    <span className="text-white text-xs font-black uppercase">{degree}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Academic Year</span>
                    <span className="text-indigo-400 text-xs font-black uppercase">{student.studyYear || 'TBD'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Institutional ID</span>
                    <span className="text-white text-[9px] font-mono font-bold">{student.regNo || student.id.split('-')[0].toUpperCase()}</span>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                   <button 
                    onClick={() => navigate(`/profile/${student.id}`)}
                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                   >
                    Performance Audit
                   </button>
                   <button 
                    onClick={() => navigate(`/profile/${student.id}`)}
                    className="w-10 h-10 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-sky-400 group-hover:border-sky-400/20 transition-all shadow-xl"
                   >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                   </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentDirectory;
