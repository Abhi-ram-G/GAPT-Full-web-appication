
import React, { useState, useEffect, useContext, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { MockDB } from '../store';
import { User, UserRole, Timetable, Feature, AccessLevel } from '../types';

const STUDY_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year'];
const HOURS = [1, 2, 3, 4, 5, 6, 7];
const HOUR_LABELS = ['09:00', '10:00', '11:00', '12:00', '02:00', '03:00', '04:00'];

const StaffAssignment: React.FC = () => {
  const { user, currentView } = useContext(AuthContext);
  const [selectedYear, setSelectedYear] = useState(STUDY_YEARS[0]);
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);
  const [currentTimetable, setCurrentTimetable] = useState<Timetable | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadData = async () => {
      const [allUsers, allTimetables, perms] = await Promise.all([
        MockDB.getUsers(),
        MockDB.getTimetables(),
        MockDB.getPermissions()
      ]);
      setPermissions(perms);
      const deptBase = user?.department?.split(' (')[0] || '';
      const staff = allUsers.filter(u => u.role !== UserRole.STUDENT && u.department?.startsWith(deptBase));
      setDepartmentStaff(staff);
      const found = allTimetables.find(t => t.department === user?.department && t.studyYear === selectedYear);
      setCurrentTimetable(found || { id: crypto.randomUUID(), department: user?.department || 'Unassigned', studyYear: selectedYear, assignments: HOURS.map(h => ({ hour: h, staffId: '' })), lastUpdated: new Date().toISOString() });
    };
    loadData();
  }, [selectedYear, user]);

  const accessLevel = useMemo(() => {
    return permissions[currentView]?.[Feature.STAFF_ASSIGNMENT] || AccessLevel.NO_ACCESS;
  }, [permissions, currentView]);

  const canEdit = accessLevel === AccessLevel.EDIT_ALL;

  const handleAssign = (hour: number, staffId: string) => {
    if (!canEdit || !currentTimetable) return;
    const updated = { ...currentTimetable, assignments: currentTimetable.assignments.map(a => a.hour === hour ? { ...a, staffId } : a) };
    setCurrentTimetable(updated);
    setActiveDropdown(null);
  };

  const handleSave = async () => {
    if (!canEdit || !currentTimetable) return;
    await MockDB.saveTimetable(currentTimetable);
    setSaveStatus("Registry Synchronized.");
    setTimeout(() => setSaveStatus(null), 3000);
  };

  if (accessLevel === AccessLevel.NO_ACCESS) return null;

  return (
    <DashboardLayout title="Faculty Scheduling Matrix">
      <div className="max-w-6xl mx-auto space-y-10 pb-24">
        <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">Staff Hour Assignment</h2>
              <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-2">{accessLevel.replace(/_/g, ' ')} Clearance</p>
           </div>
           {canEdit && <button onClick={handleSave} className="px-10 py-5 bg-primary text-white rounded-[2rem] font-black uppercase text-xs shadow-xl shadow-primary/20 active:scale-95 transition-all">Authorize Matrix</button>}
        </div>

        <div className="flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-2">
           {STUDY_YEARS.map(year => (
             <button key={year} onClick={() => setSelectedYear(year)} className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${selectedYear === year ? 'bg-primary text-white shadow-xl' : 'bg-surface-component text-text-muted border-border-subtle'}`}>{year}</button>
           ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {HOURS.map((hour, idx) => {
             const assignedStaff = departmentStaff.find(s => s.id === currentTimetable?.assignments.find(a => a.hour === hour)?.staffId);
             const isOpen = activeDropdown === hour;
             const query = searchQueries[hour] || '';
             const filteredStaff = departmentStaff.filter(s => s.name.toLowerCase().includes(query.toLowerCase()));
             return (
               <div key={hour} className="relative bg-surface-component border border-border-subtle rounded-[2.5rem] p-8 shadow-xl hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-4 mb-8">
                     <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-primary font-black text-sm">{hour}</div>
                     <div><p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Hour Index</p><p className="text-xs font-black text-text-primary uppercase">{HOUR_LABELS[idx]}</p></div>
                  </div>
                  <div className="relative">
                    <button disabled={!canEdit} onClick={() => setActiveDropdown(isOpen ? null : hour)} className={`w-full p-5 rounded-2xl border-2 flex flex-col items-start transition-all disabled:opacity-60 ${assignedStaff ? 'bg-surface-elevated border-primary/20' : 'bg-slate-950 border-white/5'}`}>
                       {assignedStaff ? (<><p className="text-sm font-black text-text-primary uppercase truncate w-full">{assignedStaff.name}</p><p className="text-[9px] text-primary font-black uppercase mt-1 tracking-tighter">{assignedStaff.designation || 'Faculty'}</p></>) : <p className="text-xs text-text-muted font-bold uppercase italic">Unassigned</p>}
                    </button>
                    {isOpen && canEdit && (
                      <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 p-4 animate-in slide-in-from-top-2 duration-200">
                         <input autoFocus type="text" placeholder="Search..." value={query} onChange={e => setSearchQueries({...searchQueries, [hour]: e.target.value})} className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-xs text-white outline-none mb-2" />
                         <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                            {filteredStaff.map(s => (<button key={s.id} onClick={() => handleAssign(hour, s.id)} className="w-full text-left p-3 hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/20"><p className="text-[11px] font-black text-text-primary uppercase">{s.name}</p></button>))}
                            <button onClick={() => handleAssign(hour, '')} className="w-full text-left p-3 text-red-500 font-black text-[10px] uppercase tracking-widest border-t border-white/5 mt-2">Clear</button>
                         </div>
                      </div>
                    )}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StaffAssignment;
