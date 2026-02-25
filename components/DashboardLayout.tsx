
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { UserRole, UserStatus, Feature, Notification as GaptNotification, SiteSettings, PermissionMap, AccessLevel, User, Course, AcademicTask } from '../types';
import { MockDB } from '../store';

interface Props {
  children: React.ReactNode;
  title: string;
}

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  DIRECTORY: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>,
  STAFF_DIR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
  STUDENT_DIR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path></svg>,
  DEPARTMENTS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>,
  IDENTITY: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>,
  INTERLINK: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>,
  BRANDING: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>,
  ATTENDANCE: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>,
  MARK_ENTRY: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 v2M7 7h10"></path></svg>,
  LEAVE: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
  ANALYTICS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 02 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>,
  MATERIALS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>,
  ASSIGNMENT: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4-4m-4 4l4 4"></path></svg>,
  TASK: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>,
  MATRIX: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>,
  REQUESTS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
  MENTOR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
};

const DashboardLayout: React.FC<Props> = ({ children, title }) => {
  const { user, currentView, setCurrentView, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingCount, setPendingCount] = useState(0);
  const [leavePendingCount, setLeavePendingCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<GaptNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ name: 'GAPT', description: '', adminEmail: '', themeColor: '', institution: '' });
  const [permissions, setPermissions] = useState<Record<string, PermissionMap>>({} as any);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{
    members: User[],
    departments: Course[],
    tasks: AcademicTask[]
  }>({ members: [], departments: [], tasks: [] });
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const updateData = async () => {
      const users = await MockDB.getUsers();
      const editRequests = await MockDB.getEditRequests();
      const leaveRequests = await MockDB.getLeaveRequests();
      const notifs = await MockDB.getNotifications(user?.id);
      const settings = await MockDB.getSettings();
      const perms = await MockDB.getPermissions();

      setPendingCount(users.filter(u => u.status === UserStatus.PENDING).length + editRequests.filter(r => r.status === 'PENDING').length);
      setLeavePendingCount(leaveRequests.filter(l => l.status === 'PENDING').length);
      setNotifications(notifs);
      setSiteSettings(settings);
      setPermissions(perms);
    };
    updateData();
    const interval = setInterval(updateData, 5000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowNotifications(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  // Handle Global Search Logic
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length < 2) {
        setSearchResults({ members: [], departments: [], tasks: [] });
        return;
      }

      const q = searchQuery.toLowerCase();
      const [allUsers, allCurriculum, allTasks] = await Promise.all([
        MockDB.getUsers(),
        MockDB.getCurriculum(),
        MockDB.getTasks()
      ]);

      const filteredMembers = allUsers.filter(u => 
        u.name.toLowerCase().includes(q) || 
        u.email.toLowerCase().includes(q) || 
        (u.regNo && u.regNo.toLowerCase().includes(q)) ||
        (u.staffId && u.staffId.toLowerCase().includes(q))
      ).slice(0, 5);

      const filteredDepts = allCurriculum.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.degree.toLowerCase().includes(q)
      ).slice(0, 3);

      const filteredTasks = allTasks.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.subjectName.toLowerCase().includes(q)
      ).slice(0, 3);

      setSearchResults({ members: filteredMembers, departments: filteredDepts, tasks: filteredTasks });
    };

    const timeout = setTimeout(performSearch, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const NavItem = ({ to, label, icon, badge }: { to: string, label: string, icon: React.ReactNode, badge?: number }) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} className={`flex items-center justify-between p-3 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary border border-primary/20 font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        <div className="flex items-center space-x-3">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">{badge}</span>
        )}
      </Link>
    );
  };

  const NavContent = () => {
    const permissionsMap = permissions[currentView] || {};
    const isActuallyAdmin = user?.role === UserRole.ADMIN;
    
    const hasAccess = (f: Feature) => {
      if (isActuallyAdmin && currentView === UserRole.ADMIN) {
        const coreGovernance = [Feature.ACCESS_MATRIX, Feature.USER_DIRECTORY, Feature.COHORT_REGISTRY];
        if (coreGovernance.includes(f)) return true;
      }
      const level = permissionsMap[f];
      return level !== undefined && level !== AccessLevel.NO_ACCESS;
    };

    return (
      <div className="flex flex-col h-full">
        <div className="p-6 shrink-0">
          <Link to="/" onClick={() => isActuallyAdmin && setCurrentView(UserRole.ADMIN)} className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-2xl shrink-0 shadow-lg shadow-primary/20">G</div>
            <div className="flex flex-col">
              <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent leading-none">{siteSettings.name}</h2>
              <p className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mt-1 leading-tight max-w-[140px]">Green Academic Performance Tracker</p>
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-8">
          {isActuallyAdmin && (
            <>
              <div className="pb-2 text-[10px] font-bold text-slate-600 uppercase px-3 tracking-widest">Portal Teleport</div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[UserRole.ADMIN, UserRole.DEAN, UserRole.HOD, UserRole.STAFF, UserRole.STUDENT].map((role) => (
                  <button 
                    key={role}
                    onClick={() => { setCurrentView(role); navigate('/'); }} 
                    className={`p-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentView === role ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {role.toLowerCase().replace('_', ' ')}
                  </button>
                ))}
              </div>
            </>
          )}

          {(hasAccess(Feature.USER_DIRECTORY) || hasAccess(Feature.STAFF_DIRECTORY) || hasAccess(Feature.STUDENT_DIRECTORY) || hasAccess(Feature.COHORT_REGISTRY) || hasAccess(Feature.ACCESS_REQUESTS) || hasAccess(Feature.IDENTITY_CREATOR) || hasAccess(Feature.INTERLINK_CONTROL) || hasAccess(Feature.BRANDING_HUB) || hasAccess(Feature.ACCESS_MATRIX)) && (
            <>
              <div className="pt-4 pb-2 text-[10px] font-bold text-slate-600 uppercase px-3 tracking-widest border-t border-slate-800">Governance</div>
              {hasAccess(Feature.USER_DIRECTORY) && <NavItem to="/admin/users" label="Member Directory" icon={FEATURE_ICONS.DIRECTORY} />}
              {hasAccess(Feature.STAFF_DIRECTORY) && <NavItem to="/admin/staff-directory" label="Staff Directory" icon={FEATURE_ICONS.STAFF_DIR} />}
              {hasAccess(Feature.STUDENT_DIRECTORY) && <NavItem to="/admin/student-directory" label="Student Directory" icon={FEATURE_ICONS.STUDENT_DIR} />}
              {hasAccess(Feature.COHORT_REGISTRY) && <NavItem to="/admin/departments" label="Cohort Registry" icon={FEATURE_ICONS.DEPARTMENTS} />}
              {hasAccess(Feature.ACCESS_REQUESTS) && <NavItem to="/admin/requests" label="Access Requests" icon={FEATURE_ICONS.REQUESTS} badge={pendingCount} />}
              {hasAccess(Feature.IDENTITY_CREATOR) && <NavItem to="/admin/create-mail" label="Identity Creator" icon={FEATURE_ICONS.IDENTITY} />}
              {hasAccess(Feature.INTERLINK_CONTROL) && <NavItem to="/admin/portal-connection" label="Interlink Control" icon={FEATURE_ICONS.INTERLINK} />}
              {hasAccess(Feature.BRANDING_HUB) && <NavItem to="/admin/edit-website" label="Branding Hub" icon={FEATURE_ICONS.BRANDING} />}
              {hasAccess(Feature.ACCESS_MATRIX) && <NavItem to="/admin/access" label="Access Matrix" icon={FEATURE_ICONS.MATRIX} />}
            </>
          )}

          {(hasAccess(Feature.MARK_ENTRY) || hasAccess(Feature.ATTENDANCE_TRACKING) || hasAccess(Feature.STUDY_MATERIALS) || hasAccess(Feature.STAFF_ASSIGNMENT) || hasAccess(Feature.LEAVE_MANAGEMENT) || hasAccess(Feature.ASSIGNMENTS) || hasAccess(Feature.ACADEMIC_ANALYTICS) || hasAccess(Feature.GREEN_INSIGHTS) || hasAccess(Feature.MENTOR_ASSIGNMENT)) && (
            <>
              <div className="pt-6 pb-2 text-[10px] font-bold text-slate-600 uppercase px-3 tracking-widest border-t border-slate-800">Academic Ops</div>
              {hasAccess(Feature.MARK_ENTRY) && <NavItem to="/staff/mark-entry" label="Update Marks" icon={FEATURE_ICONS.MARK_ENTRY} />}
              {hasAccess(Feature.ATTENDANCE_TRACKING) && <NavItem to="/staff/attendance" label="Daily Attendance" icon={FEATURE_ICONS.ATTENDANCE} />}
              {hasAccess(Feature.MENTOR_ASSIGNMENT) && <NavItem to="/hod/assign-students" label="Assign Mentors" icon={FEATURE_ICONS.MENTOR} />}
              {hasAccess(Feature.STUDY_MATERIALS) && (
                <NavItem to={currentView === UserRole.STUDENT ? "/student/materials" : "/staff/materials"} label={currentView === UserRole.STUDENT ? "Study Materials" : "Upload Resources"} icon={FEATURE_ICONS.MATERIALS} />
              )}
              {hasAccess(Feature.ASSIGNMENTS) && (
                <NavItem to={currentView === UserRole.STUDENT ? "/student/assignments" : "/staff/task-registry"} label="Deadlines & Tasks" icon={FEATURE_ICONS.TASK} />
              )}
              {hasAccess(Feature.STAFF_ASSIGNMENT) && <NavItem to="/staff/assignments" label="Hourly Scheduling" icon={FEATURE_ICONS.ASSIGNMENT} />}
              {hasAccess(Feature.LEAVE_MANAGEMENT) && (
                <NavItem to={currentView === UserRole.STUDENT ? "/student/leave-apply" : "/staff/leave-approval"} label={currentView === UserRole.STUDENT ? "Apply for Leave" : "Approve Absences"} icon={FEATURE_ICONS.LEAVE} badge={currentView !== UserRole.STUDENT ? leavePendingCount : 0} />
              )}
              {hasAccess(Feature.ACADEMIC_ANALYTICS) && <NavItem to="/" label="Academic Analysis" icon={FEATURE_ICONS.ANALYTICS} />}
              {hasAccess(Feature.GREEN_INSIGHTS) && <NavItem to="/" label="Green Insights" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>} />}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-surface-elevated/50 shrink-0 space-y-2">
          <Link to="/settings" className="flex items-center space-x-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <Link to={`/profile/${user?.id}`} className="flex items-center space-x-3 py-2 px-3 hover:bg-slate-800 rounded-xl transition-all group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shrink-0 group-hover:scale-110 transition-transform">{user?.name?.[0]}</div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-text-primary truncate group-hover:text-primary transition-colors">{user?.name}</p>
              <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest truncate">View Full Profile</p>
            </div>
          </Link>
          <button onClick={logout} className="w-full flex items-center justify-center space-x-2 p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all text-xs font-bold uppercase">
            <span>Logout</span>
          </button>
        </div>
      </div>
    );
  };

  const isAnyResult = searchResults.members.length > 0 || searchResults.departments.length > 0 || searchResults.tasks.length > 0;

  return (
    <div className="min-h-screen flex bg-surface-deep">
      <aside className="hidden md:flex flex-col w-72 h-screen fixed border-r border-slate-800 bg-surface-elevated/50 backdrop-blur-xl z-30">
        <NavContent />
      </aside>
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
        <header className="h-16 md:h-20 flex items-center justify-between px-4 md:px-10 border-b border-slate-800 sticky top-0 bg-surface-deep/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 text-slate-400 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="hidden md:block text-lg md:text-xl font-black text-text-primary uppercase tracking-tighter shrink-0">{title}</h1>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xl mx-4 relative">
             <div className="relative group">
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={searchQuery}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members, depts, tasks... (⌘K)"
                  className="w-full bg-surface-elevated/50 border border-slate-800 rounded-full px-12 py-2.5 text-sm text-text-primary outline-none focus:border-primary/50 transition-all shadow-inner"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden lg:flex items-center gap-1">
                   <span className="text-[10px] font-bold text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700">⌘</span>
                   <span className="text-[10px] font-bold text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-700">K</span>
                </div>
             </div>

             {/* Global Search Dropdown Overlay */}
             {isSearchOpen && (
               <>
                <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsSearchOpen(false)}></div>
                <div className="absolute top-full left-0 right-0 mt-3 bg-surface-elevated border border-slate-800 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                   {searchQuery.length < 2 ? (
                      <div className="p-8 text-center">
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Type to explore institutional data</p>
                      </div>
                   ) : !isAnyResult ? (
                      <div className="p-8 text-center">
                         <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No matching authorized records found</p>
                      </div>
                   ) : (
                      <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-3 space-y-4">
                         {searchResults.members.length > 0 && (
                            <div>
                               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-3">Members ({searchResults.members.length})</p>
                               <div className="space-y-1">
                                  {searchResults.members.map(m => (
                                     <Link 
                                       key={m.id} 
                                       to={`/profile/${m.id}`} 
                                       className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                                     >
                                        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold group-hover:bg-primary transition-colors">{m.name[0]}</div>
                                        <div className="min-w-0">
                                           <p className="text-sm font-bold text-text-primary uppercase truncate tracking-tight">{m.name}</p>
                                           <p className="text-[10px] text-slate-500 font-mono truncate">{m.email}</p>
                                        </div>
                                     </Link>
                                  ))}
                               </div>
                            </div>
                         )}

                         {searchResults.departments.length > 0 && (
                            <div>
                               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-3">Departments ({searchResults.departments.length})</p>
                               <div className="space-y-1">
                                  {searchResults.departments.map(d => (
                                     <button 
                                       key={d.id} 
                                       onClick={() => navigate('/admin/departments')}
                                       className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                                     >
                                        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>
                                        <div className="min-w-0">
                                           <p className="text-sm font-bold text-text-primary uppercase truncate tracking-tight">{d.name}</p>
                                           <p className="text-[10px] text-slate-500 uppercase font-black">{d.degree} Division</p>
                                        </div>
                                     </button>
                                  ))}
                               </div>
                            </div>
                         )}

                         {searchResults.tasks.length > 0 && (
                            <div>
                               <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 px-3">Active Tasks ({searchResults.tasks.length})</p>
                               <div className="space-y-1">
                                  {searchResults.tasks.map(t => (
                                     <button 
                                       key={t.id} 
                                       onClick={() => navigate(currentView === UserRole.STUDENT ? '/student/assignments' : '/staff/task-registry')}
                                       className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                                     >
                                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg></div>
                                        <div className="min-w-0">
                                           <p className="text-sm font-bold text-text-primary uppercase truncate tracking-tight">{t.title}</p>
                                           <p className="text-[10px] text-slate-500 uppercase font-black">{t.subjectName}</p>
                                        </div>
                                     </button>
                                  ))}
                               </div>
                            </div>
                         )}
                      </div>
                   )}
                </div>
               </>
             )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-white transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-64 w-80 bg-surface-elevated border border-slate-800 rounded-2xl shadow-2xl p-4 z-50">
                <h4 className="text-xs font-bold text-slate-500 uppercase mb-4 border-b border-slate-800 pb-2 flex justify-between">Alerts <button onClick={async () => { await MockDB.clearNotifications(user?.id); const n = await MockDB.getNotifications(user?.id); setNotifications(n); }} className="text-red-400">Clear</button></h4>
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.map(n => (
                    <div key={n.id} className="p-3 bg-surface-deep rounded-xl border border-white/5">
                      <p className="text-[10px] text-text-primary/70">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="p-4 md:p-10">{children}</main>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-72 bg-surface-elevated shadow-2xl">
            <NavContent />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
