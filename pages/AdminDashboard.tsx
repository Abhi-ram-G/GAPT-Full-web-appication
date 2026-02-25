import React, { useMemo, useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';
import { User, UserRole, UserStatus } from '../types';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      const data = await ApiService.getUsers();
      setUsers(data);
      setIsLoading(false);
    };
    loadData();
  }, []);
  
  // Basic Stats
  const staffMembers = useMemo(() => users.filter(u => u.role === UserRole.STAFF && u.status === UserStatus.APPROVED), [users]);
  const studentCount = users.filter(u => u.role === UserRole.STUDENT).length;
  const pendingCount = users.filter(u => u.status === UserStatus.PENDING).length;

  // Mock Attendance Logic (In real DB, this would be a COUNT query)
  const staffStats = useMemo(() => {
    const total = staffMembers.length;
    const present = staffMembers.filter((s, i) => i % 6 !== 0).length; 
    const absent = total - present;
    
    return { total, present, absent };
  }, [staffMembers]);

  // Department-wise Breakdown
  const deptBreakdown = useMemo(() => {
    const depts: Record<string, { total: number, present: number, absent: number }> = {};
    
    staffMembers.forEach((s, i) => {
      const dName = s.department?.split(' (')[0] || 'Unassigned';
      if (!depts[dName]) depts[dName] = { total: 0, present: 0, absent: 0 };
      
      depts[dName].total++;
      if (i % 6 !== 0) depts[dName].present++;
      else depts[dName].absent++;
    });
    
    return Object.entries(depts).sort((a, b) => b[1].total - a[1].total);
  }, [staffMembers]);

  if (isLoading) {
    return (
      <DashboardLayout title="Institutional Command Center">
        <div className="flex items-center justify-center h-64">
           <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">Accessing Secure Database...</p>
           </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Institutional Command Center">
      <div className="flex justify-end mb-4">
        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
           <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
           Database Linked (MySQL/Sim)
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <StatCard title="Total Users" value={users.length} icon="users" color="text-blue-400" />
        <StatCard title="Total Staff" value={staffMembers.length} icon="briefcase" color="text-emerald-400" />
        <StatCard title="Total Students" value={studentCount} icon="academic" color="text-purple-400" />
        <StatCard title="Pending Requests" value={pendingCount} icon="clock" color="text-amber-400" />
      </div>

      <div className="space-y-8">
        <div className="bg-surface-component border border-border-subtle rounded-[3rem] overflow-hidden shadow-2xl">
          <div className="p-4 md:p-8 border-b border-border-subtle bg-black/5 dark:bg-slate-800/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h3 className="text-text-primary font-bold text-lg md:text-xl tracking-tight">Staff Attendance Monitoring</h3>
              <p className="text-text-muted text-[10px] md:text-xs font-medium uppercase tracking-widest mt-1">Real-time Daily Institutional Check-in</p>
            </div>
            
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              <div className="bg-surface-elevated px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-border-subtle flex flex-col items-center">
                <span className="text-[8px] md:text-[10px] font-bold text-text-muted uppercase">Total</span>
                <span className="text-lg md:text-2xl font-black text-text-primary">{staffStats.total}</span>
              </div>
              <div className="bg-emerald-500/10 px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-emerald-500/20 flex flex-col items-center">
                <span className="text-[8px] md:text-[10px] font-bold text-emerald-500 uppercase">Present</span>
                <span className="text-lg md:text-2xl font-black text-emerald-400">{staffStats.present}</span>
              </div>
              <div className="bg-red-500/10 px-3 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl border border-red-500/20 flex flex-col items-center">
                <span className="text-[8px] md:text-[10px] font-bold text-red-500 uppercase">Absent</span>
                <span className="text-lg md:text-2xl font-black text-red-400">{staffStats.absent}</span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead className="bg-black/5">
                <tr>
                  <th className="px-6 md:px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border-subtle">Department Name</th>
                  <th className="px-6 md:px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border-subtle text-center">Total Staff</th>
                  <th className="px-6 md:px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border-subtle text-center">Present</th>
                  <th className="px-6 md:px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border-subtle text-center">Absent</th>
                  <th className="px-6 md:px-8 py-4 text-[10px] font-bold text-text-muted uppercase tracking-widest border-b border-border-subtle text-right">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {deptBreakdown.map(([dept, stats]) => {
                  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                  return (
                    <tr key={dept} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">{dept}</span>
                          <span className="text-[10px] text-text-muted font-bold uppercase">Institutional Branch</span>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-5 text-center">
                        <span className="text-sm font-bold text-text-primary/70">{stats.total}</span>
                      </td>
                      <td className="px-6 md:px-8 py-5 text-center">
                        <span className="text-sm font-bold text-emerald-400">{stats.present}</span>
                      </td>
                      <td className="px-6 md:px-8 py-5 text-center">
                        <span className="text-sm font-bold text-red-400">{stats.absent}</span>
                      </td>
                      <td className="px-6 md:px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="w-16 md:w-24 h-1.5 bg-black/10 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${percentage > 75 ? 'bg-emerald-500' : percentage > 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-text-primary w-10">{percentage}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

const StatCard: React.FC<{ title: string; value: number; icon: string; color: string }> = ({ title, value, color }) => (
  <div className="bg-surface-component border border-border-subtle rounded-[2.5rem] p-4 md:p-6 transition-all hover:scale-[1.02] hover:shadow-2xl shadow-slate-950/50 group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-current opacity-[0.05] -mr-8 -mt-8 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
    <div className="flex items-center justify-between mb-2 md:mb-4">
      <span className="text-text-muted text-[8px] md:text-[9px] font-bold uppercase tracking-widest">{title}</span>
      <div className={`w-6 h-6 md:w-8 md:h-8 rounded-lg bg-surface-elevated flex items-center justify-center border border-border-subtle ${color}`}>
        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-current"></div>
      </div>
    </div>
    <div className="text-xl md:text-3xl font-black text-text-primary tracking-tighter">{value}</div>
  </div>
);

export default AdminDashboard;