import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';
import { User, UserRole } from '../types';

const ACCESS_TIERS = [
  UserRole.ADMIN,
  UserRole.DEAN,
  UserRole.HOD,
  UserRole.STAFF,
  UserRole.STUDENT
];

const ROLE_TABS: { label: string; value: 'all' | UserRole }[] = [
  { label: 'All Faculty', value: 'all' },
  { label: 'Admins', value: UserRole.ADMIN },
  { label: 'Deans', value: UserRole.DEAN },
  { label: 'HODs', value: UserRole.HOD },
  { label: 'Staffs', value: UserRole.STAFF },
  { label: 'Students', value: UserRole.STUDENT }
];

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.DEAN]: 'Dean',
  [UserRole.HOD]: 'HOD',
  [UserRole.STAFF]: 'Staff',
  [UserRole.STUDENT]: 'Student'
};

const AccessControl: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoleTab, setActiveRoleTab] = useState<'all' | UserRole>('all');
  const [highlightedUserId, setHighlightedUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await ApiService.getUsers();
        const filtered = allUsers.filter(user => ACCESS_TIERS.includes(user.role));
        setUsers(filtered);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.staffId?.toLowerCase().includes(q) ||
      u.regNo?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const displayedUsers = useMemo(() => {
    if (activeRoleTab === 'all') return filteredUsers;
    return filteredUsers.filter(u => u.role === activeRoleTab);
  }, [filteredUsers, activeRoleTab]);

  useEffect(() => {
    if (!displayedUsers.length) {
      setHighlightedUserId(null);
      return;
    }
    setHighlightedUserId(prev => {
      if (prev && displayedUsers.some(u => u.id === prev)) {
        return prev;
      }
      return displayedUsers[0].id;
    });
  }, [displayedUsers]);

  const openGrandAccess = (member: User) => {
    navigate(`/admin/grand-access/member/${member.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout title="Grand Access">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Grand Access Control">
      <div className="max-w-6xl mx-auto space-y-12 pb-20">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-black text-text-primary uppercase tracking-tighter">Institutional Grand Access</h1>
          <p className="text-text-muted font-bold uppercase tracking-[0.2em] text-xs">
            Centralized governance for admin, dean, hod, staff, and student portals
          </p>
        </div>

        <div className="space-y-4 rounded-[3rem] bg-white shadow-inner border border-border-subtle px-6 py-5">
          <div className="flex flex-wrap gap-3">
            {ROLE_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveRoleTab(tab.value)}
                className={`flex-1 min-w-[120px] text-sm font-black uppercase tracking-[0.3em] rounded-[999px] px-5 py-3 transition ${
                  activeRoleTab === tab.value
                    ? 'bg-emerald-500 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)]'
                    : 'bg-white text-text-muted border border-border-subtle hover:border-emerald-300 hover:text-emerald-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-text-muted">Academic Division</span>
              <div className="rounded-full bg-surface-deep border border-border-subtle px-5 py-3 text-sm font-black text-text-primary uppercase">
                All Departments
              </div>
            </div>

            <div className="flex-1 min-w-[240px]">
              <div className="flex items-center gap-3 rounded-[999px] border border-border-subtle px-4 py-3 bg-white shadow-sm">
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.35-6.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all faculty in current scope..."
                  className="flex-1 text-sm font-black text-text-primary placeholder:text-text-muted outline-none bg-transparent"
                />
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-black">
                  {displayedUsers.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-border-subtle shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-8 py-4 border-b border-border-subtle">
            <h4 className="text-sm font-black uppercase tracking-[0.3em] text-text-primary">Member List</h4>
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">{displayedUsers.length} records</span>
          </div>
          <div className="overflow-hidden">
            <div className="flex flex-col divide-y divide-border-subtle">
              {displayedUsers.length === 0 && (
                <div className="px-8 py-12 text-center text-xs font-black text-text-muted uppercase tracking-[0.3em]">
                  No members found in this scope.
                </div>
              )}
              {displayedUsers.map(user => (
                <div
                  key={user.id}
                  role="button"
                  onClick={() => setHighlightedUserId(user.id)}
                  className={`grid grid-cols-[5fr_1fr] items-center gap-4 px-8 py-4 transition cursor-pointer ${highlightedUserId === user.id ? 'bg-emerald-50 text-text-primary border-y border-emerald-200' : 'hover:bg-surface-deep'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-surface-deep border border-border-subtle flex items-center justify-center font-black uppercase text-primary">
                      {user.name?.[0] || user.email?.[0] || 'U'}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight">{user.name}</p>
                      <p className="text-[9px] font-black text-text-muted uppercase tracking-[0.3em]">{ROLE_LABELS[user.role]}</p>
                      <p className="text-[8px] font-black uppercase tracking-[0.5em] text-emerald-500 mt-1">Edit Access · Member Directory</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openGrandAccess(user);
                      }}
                      className="px-4 py-2 rounded-full bg-primary text-white text-[10px] font-black tracking-[0.4em] uppercase transition hover:bg-primary/90"
                    >
                      Access Grant
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AccessControl;
