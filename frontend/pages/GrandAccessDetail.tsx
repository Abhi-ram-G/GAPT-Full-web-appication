import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { ApiService } from '../store';
import { AccessGrantType, AccessLevel, MenuItem, User } from '../types';

const ACCESS_OPTIONS: { value: AccessGrantType; label: string }[] = [
  { value: 'HIDE', label: 'HIDE MENU (NO ACCESS)' },
  { value: AccessLevel.VIEW_ALL, label: 'VIEW ALL' },
  { value: AccessLevel.EDIT_STUDENTS, label: 'EDIT STUDENTS' },
  { value: AccessLevel.EDIT_STAFF, label: 'EDIT STAFF' },
  { value: AccessLevel.EDIT_HOD, label: 'EDIT HOD' },
  { value: AccessLevel.EDIT_DEAN, label: 'EDIT DEAN' },
  { value: AccessLevel.EDIT_STAFF_STUDENTS, label: 'EDIT STAFF STUDENTS' },
  { value: AccessLevel.EDIT_HOD_STAFF, label: 'EDIT HOD STAFF' },
  { value: AccessLevel.EDIT_HOD_STAFF_STUDENTS, label: 'EDIT HOD STAFF STUDENTS' },
  { value: AccessLevel.EDIT_ALL, label: 'EDIT ALL' },
  { value: 'FULL', label: 'FULL ACCESS' }
];

const ACCESS_LABELS: Record<AccessGrantType, string> = {
  HIDE: 'HIDE MENU (NO ACCESS)',
  [AccessLevel.VIEW_ALL]: 'VIEW ALL',
  [AccessLevel.EDIT_STUDENTS]: 'EDIT STUDENTS',
  [AccessLevel.EDIT_STAFF]: 'EDIT STAFF',
  [AccessLevel.EDIT_HOD]: 'EDIT HOD',
  [AccessLevel.EDIT_DEAN]: 'EDIT DEAN',
  [AccessLevel.EDIT_STAFF_STUDENTS]: 'EDIT STAFF STUDENTS',
  [AccessLevel.EDIT_HOD_STAFF]: 'EDIT HOD STAFF',
  [AccessLevel.EDIT_HOD_STAFF_STUDENTS]: 'EDIT HOD STAFF STUDENTS',
  [AccessLevel.EDIT_ALL]: 'EDIT ALL',
  FULL: 'FULL ACCESS'
};

const GrandAccessDetail: React.FC = () => {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [member, setMember] = useState<User | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [roleDefaults, setRoleDefaults] = useState<Record<string, AccessGrantType>>({});
  const [userOverrides, setUserOverrides] = useState<Record<string, AccessGrantType>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedMenus = useMemo(() => {
    const buckets: Record<string, MenuItem[]> = {};
    menus.forEach(menu => {
      buckets[menu.category] = buckets[menu.category] || [];
      buckets[menu.category].push(menu);
    });
    return buckets;
  }, [menus]);

  const effectiveAccess = (menuId: string): AccessGrantType => {
    if (userOverrides[menuId]) return userOverrides[menuId];
    return roleDefaults[menuId] || 'HIDE';
  };

  const handleOverrideChange = (menuId: string, value: AccessGrantType) => {
    setUserOverrides(prev => {
      const baseLevel = roleDefaults[menuId] || 'HIDE';
      if (value === baseLevel) {
        const { [menuId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuId]: value };
    });
  };

  const handleReset = (menuId: string) => {
    setUserOverrides(prev => {
      if (!prev[menuId]) return prev;
      const { [menuId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleSave = async () => {
    if (!member) return;
    setIsSaving(true);
    try {
      const payload = Object.entries(userOverrides).map(([menuId, accessType]) => ({
        menuId,
        accessType
      }));
      await ApiService.updateUserPermissions(member.id, payload);
      setUserOverrides({});
      setError('Permissions updated successfully.');
    } catch (err) {
      setError('Unable to save permissions. Try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderHeader = () => (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">ACCESS DOMAIN</p>
      <h2 className="text-3xl font-black uppercase tracking-[0.4em] text-red-500">
        {member?.name || 'UNKNOWN MEMBER'}
      </h2>
      <p className="text-[10px] uppercase tracking-[0.4em] text-emerald-400">{member?.role}</p>
      <p className="text-[10px] text-slate-500">{member?.email}</p>
    </div>
  );

  useEffect(() => {
    const fetchData = async () => {
      if (!memberId) {
        setError('Member not selected.');
        setLoading(false);
        return;
      }
      try {
        const memberData = await ApiService.getUser(memberId);
        const [menusData, rolePerms, userPerms] = await Promise.all([
          ApiService.getMenus(),
          ApiService.getRolePermissions(memberData.role),
          ApiService.getUserPermissions(memberId)
        ]);
        setMember(memberData);
        setMenus(menusData);
        const defaults: Record<string, AccessGrantType> = {};
        rolePerms.forEach(entry => {
          defaults[entry.menuId] = entry.accessType;
        });
        const overrides: Record<string, AccessGrantType> = {};
        userPerms.forEach(entry => {
          overrides[entry.menuId] = entry.accessType;
        });
        setRoleDefaults(defaults);
        setUserOverrides(overrides);
      } catch (err) {
        setError('Unable to load grand access data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [memberId]);

  if (loading) {
    return (
      <DashboardLayout title="Grand Access Control">
        <div className="max-w-6xl mx-auto flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Grand Access Control">
    <div className="max-w-6xl mx-auto space-y-8 pb-20 bg-[#fff9d6] rounded-[3rem] px-6 py-8 shadow-2xl">
        <div className="flex items-center justify-between gap-6">
          {renderHeader()}
          <div className="flex gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-2 rounded-full border border-slate-700 bg-slate-900/60 text-[10px] font-black uppercase tracking-[0.4em] text-white transition hover:border-emerald-500 hover:text-emerald-400"
            >
              Back to Members
            </button>
            <button
              onClick={handleSave}
              disabled={!Object.keys(userOverrides).length || isSaving}
              className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition ${
                isSaving ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white hover:bg-emerald-600'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 px-6 py-3 text-xs font-bold uppercase tracking-[0.3em]">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(groupedMenus).map(([category, items]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">{category}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">{items.length} menus</p>
              </div>
              <div className="space-y-3">
                {items.map(menu => {
                  const access = effectiveAccess(menu.id);
                  const hasOverride = !!userOverrides[menu.id];
                  return (
                    <div key={menu.id} className="flex items-center justify-between rounded-full bg-slate-900/60 border border-slate-900/80 px-4 py-3 shadow-inner">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-white">{menu.name}</p>
                        <p className="text-[8px] uppercase tracking-[0.4em] text-slate-500">CORE REGISTRY ITEM</p>
                        {hasOverride && (
                          <span className="mt-1 inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-0.5 text-[9px] font-black uppercase tracking-[0.3em] text-emerald-300">
                            Custom Override
                          </span>
                        )}
                      </div>
                      <div className="space-y-2">
                        {[['HIDE','VIEW_ALL'], ['EDIT_STUDENTS','EDIT_STAFF','EDIT_HOD','EDIT_DEAN'], ['EDIT_STAFF_STUDENTS','EDIT_HOD_STAFF','EDIT_HOD_STAFF_STUDENTS','EDIT_ALL','FULL']].map((group, index) => (
                          <div key={`${menu.id}-${index}`} className="flex flex-wrap items-center gap-2">
                            {group.map(key => {
                              const option = ACCESS_OPTIONS.find(opt => opt.value === key);
                              if (!option) return null;
                              return (
                                <button
                                  key={option.value}
                                  onClick={() => handleOverrideChange(menu.id, option.value)}
                                  className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.4em] transition ${
                                    access === option.value
                                      ? 'bg-indigo-500 text-white shadow-[0_10px_25px_rgba(79,70,229,0.35)]'
                                      : 'bg-slate-800 text-slate-400 hover:bg-slate-800/80'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                        {hasOverride && (
                          <button
                            onClick={() => handleReset(menu.id)}
                            className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 underline"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GrandAccessDetail;
