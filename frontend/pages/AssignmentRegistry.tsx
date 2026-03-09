
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router';
import DashboardLayout from '../components/DashboardLayout';
import { AuthContext } from '../AuthContext';
import { ApiService } from '../store';
import { AcademicTask, AccessLevel, Feature } from '../types';

const AssignmentRegistry: React.FC = () => {
  const { currentView } = useContext(AuthContext);
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [permissions, setPermissions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);

  const batchesList = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  useEffect(() => {
    const refreshData = async () => {
      const [t, p] = await Promise.all([
        ApiService.getTasks(),
        ApiService.getPermissions()
      ]);
      setTasks(t);
      setPermissions(p);
      setIsLoading(false);
    };
    refreshData();
  }, []);

  const accessLevel = useMemo(() => {
    return permissions[currentView]?.[Feature.ASSIGNMENTS] || AccessLevel.NO_ACCESS;
  }, [permissions, currentView]);

  const batchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    batchesList.forEach(b => {
      counts[b] = tasks.filter(t => t.studyYear === b).length;
    });
    return counts;
  }, [tasks]);

  if (accessLevel === AccessLevel.NO_ACCESS) return null;
  if (isLoading) return <DashboardLayout title="Academic Tasks & Registry"><div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div></div></DashboardLayout>;

  return (
    <DashboardLayout title="Academic Tasks & Registry">
      <div className="max-w-6xl mx-auto space-y-10 pb-24">
        <div className="bg-surface-component border border-border-subtle rounded-[3rem] p-10 shadow-2xl relative flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="relative z-10">
            <h2 className="text-text-primary font-black text-3xl lowercase tracking-tight">assignment registry</h2>
            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mt-2">Authorization Mode: {accessLevel.replace(/_/g, ' ')}</p>
          </div>
        </div>

        {/* Active Batches Overview */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Active Academic Batches</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {batchesList.map(batch => (
              <button
                key={batch}
                onClick={() => navigate(`/staff/task-registry/batch/${batch}`)}
                className="p-6 rounded-[2rem] border border-border-subtle bg-surface-component hover:border-primary/20 transition-all text-left relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Batch Registry</p>
                <h4 className="text-lg font-black uppercase tracking-tighter text-text-primary">{batch}</h4>
                <div className="mt-4 flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${batchCounts[batch] > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted'}`}></span>
                  <span className="text-[9px] font-black text-text-muted uppercase tracking-widest">{batchCounts[batch]} Tasks Active</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AssignmentRegistry;
