
import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../AuthContext';
import CalendarWidget from './CalendarWidget';
import { UserRole, UserStatus, Feature, Notification as GaptNotification, SiteSettings, PermissionMap, AccessLevel, User, Course, AcademicTask, MembershipRequest } from '../types';
import { ApiService } from '../store';

interface Props {
  children: React.ReactNode;
  title: string;
  /** Total count of records shown on this page, displayed next to the search bar */
  resultCount?: number;
}

const GaptLogo = ({ className }: { className?: string }) => (
  <div className={className}>
    <img
      src="https://img.icons8.com/isometric/512/school.png"
      className="w-full h-full object-contain"
      alt="GAPT Logo"
    />
  </div>
);

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  DIRECTORY: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>,
  STAFF_DIR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
  STUDENT_DIR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path></svg>,
  DEPARTMENTS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>,
  IDENTITY: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>,
  INTERLINK: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>,
  BRANDING: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>,
  ATTENDANCE: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>,
  MARK_ENTRY: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>,
  LEAVE: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
  ANALYTICS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>,
  MATERIALS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>,
  ASSIGNMENT: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4-4m-4 4l4 4"></path></svg>,
  TASK: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>,
  MATRIX: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>,
  REQUESTS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>,
  MENTOR: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>,
  CHAT: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>,
  EMAIL: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>,
  SPREADSHEET: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-8-4h8a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z"></path></svg>,
  EDIT_PROFILE: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>,
  GRAND_ACCESS: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>,
  EXAMINATION: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
};

const DashboardLayout: React.FC<Props> = ({ children, title, resultCount }) => {
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

  const permissionsMap = permissions[currentView] || {};
  const isActuallyAdmin = user?.role === UserRole.ADMIN;

  const hasAccess = (f: Feature) => {
    if (isActuallyAdmin && currentView === UserRole.ADMIN) return true;
    const level = permissionsMap[f];
    return level !== undefined && level !== AccessLevel.NO_ACCESS;
  };

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
      const users = await ApiService.getUsers();
      const editRequests = await ApiService.getEditRequests();
      const membershipReqs = await ApiService.getMembershipRequests() as MembershipRequest[];
      const leaveRequests = await ApiService.getLeaveRequests();
      const notifs = await ApiService.getNotifications(user?.id);
      const settings = await ApiService.getSettings();
      const perms = await ApiService.getPermissions();

      setPendingCount(
        users.filter(u => u.status === UserStatus.PENDING).length +
        editRequests.filter(r => r.status === 'PENDING').length +
        membershipReqs.filter((m: MembershipRequest) => m.status === 'PENDING').length
      );
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
        hasAccess(Feature.USER_DIRECTORY) || hasAccess(Feature.STAFF_DIRECTORY) || hasAccess(Feature.STUDENT_DIRECTORY) ? ApiService.getUsers() : Promise.resolve([]),
        hasAccess(Feature.COHORT_REGISTRY) ? ApiService.getCurriculum() : Promise.resolve([]),
        hasAccess(Feature.ASSIGNMENTS) ? ApiService.getTasks() : Promise.resolve([])
      ]);

      const filteredMembers = allUsers.filter(u => {
        // Further filter members based on specific directory access
        if (u.role === UserRole.STUDENT && !hasAccess(Feature.STUDENT_DIRECTORY) && !hasAccess(Feature.USER_DIRECTORY)) return false;
        if (u.role !== UserRole.STUDENT && !hasAccess(Feature.STAFF_DIRECTORY) && !hasAccess(Feature.USER_DIRECTORY)) return false;

        return u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.regNo && u.regNo.toLowerCase().includes(q)) ||
          (u.staffId && u.staffId.toLowerCase().includes(q));
      }).slice(0, 5);

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
      <Link
        to={to}
        aria-current={isActive ? 'page' : undefined}
        className={`flex items-center justify-between p-3 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary outline-none ${isActive ? 'bg-primary/10 text-primary border border-primary/20 font-medium' : 'text-text-muted hover:bg-surface-component hover:text-text-primary'}`}
      >
        <div className="flex items-center space-x-3">
          <span aria-hidden="true">{icon}</span>
          <span className="text-sm">{label}</span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold" aria-label={`${badge} pending items`}>{badge}</span>
        )}
      </Link>
    );
  };

  const NavContent = () => {
    return (
      <div className="flex flex-col w-full h-[100dvh] md:h-screen min-h-0 overflow-hidden">
        <div className="p-6 shrink-0">
          <Link to="/" onClick={() => isActuallyAdmin && setCurrentView(UserRole.ADMIN)} className="flex items-start gap-3 group">
            <GaptLogo className="w-12 h-12 transition-transform group-hover:scale-110" />
            <div className="flex flex-col">
              <h2 className="text-2xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent leading-none">{siteSettings.name}</h2>
              <p className="text-[7px] font-black text-text-muted uppercase tracking-[0.2em] mt-1 leading-tight max-w-[140px]">Green Academic Performance Tracker</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 min-h-0 px-4 space-y-1 overflow-y-auto custom-scrollbar pb-8">
          {isActuallyAdmin && (
            <>
              <div className="pb-2 text-[10px] font-bold text-text-muted uppercase px-3 tracking-widest">Portal Teleport</div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {[UserRole.ADMIN, UserRole.DEAN, UserRole.HOD, UserRole.STAFF, UserRole.STUDENT].map((role) => (
                  <button
                    key={role}
                    onClick={() => { setCurrentView(role); navigate('/'); }}
                    className={`p-2 rounded-xl text-[9px] font-black uppercase transition-all ${currentView === role ? 'bg-primary text-white' : 'bg-surface-component text-text-muted hover:bg-surface-deep'}`}
                  >
                    {role.toLowerCase().replace('_', ' ')}
                  </button>
                ))}
              </div>
            </>
          )}

          {(hasAccess(Feature.USER_DIRECTORY) || hasAccess(Feature.STAFF_DIRECTORY) || hasAccess(Feature.STUDENT_DIRECTORY) || hasAccess(Feature.COHORT_REGISTRY) || hasAccess(Feature.ACCESS_REQUESTS) || hasAccess(Feature.IDENTITY_CREATOR) || hasAccess(Feature.INTERLINK_CONTROL) || hasAccess(Feature.BRANDING_HUB) || hasAccess(Feature.ACCESS_MATRIX)) && (
            <>
              <div className="pt-4 pb-2 text-[10px] font-bold text-text-muted uppercase px-3 tracking-widest border-t border-border-subtle">Governance</div>
              {hasAccess(Feature.USER_DIRECTORY) && NavItem({ to: "/admin/users", label: "Member Directory", icon: FEATURE_ICONS.DIRECTORY })}
              {hasAccess(Feature.STAFF_DIRECTORY) && NavItem({ to: "/admin/staff-directory", label: "Staff Directory", icon: FEATURE_ICONS.STAFF_DIR })}
              {hasAccess(Feature.STUDENT_DIRECTORY) && NavItem({ to: "/admin/student-directory", label: "Student Directory", icon: FEATURE_ICONS.STUDENT_DIR })}
              {hasAccess(Feature.COHORT_REGISTRY) && NavItem({ to: "/admin/departments", label: "Cohort Registry", icon: FEATURE_ICONS.DEPARTMENTS })}
              {hasAccess(Feature.ACCESS_REQUESTS) && NavItem({ to: "/admin/requests", label: "Access Requests", icon: FEATURE_ICONS.REQUESTS, badge: pendingCount })}
              {hasAccess(Feature.IDENTITY_CREATOR) && NavItem({ to: "/admin/create-mail", label: "Identity Creator", icon: FEATURE_ICONS.IDENTITY })}
              {hasAccess(Feature.INTERLINK_CONTROL) && NavItem({ to: "/admin/portal-connection", label: "Interlink Control", icon: FEATURE_ICONS.INTERLINK })}
              {hasAccess(Feature.BRANDING_HUB) && NavItem({ to: "/admin/edit-website", label: "Branding Hub", icon: FEATURE_ICONS.BRANDING })}
              {hasAccess(Feature.ACCESS_MATRIX) && NavItem({ to: "/admin/access", label: "Access Matrix", icon: FEATURE_ICONS.MATRIX })}
              {isActuallyAdmin && NavItem({ to: "/admin/grand-access", label: "Grand Access", icon: FEATURE_ICONS.GRAND_ACCESS })}
              {hasAccess(Feature.SPREADSHEET) && NavItem({ to: "/spreadsheet", label: "Institutional Sheets", icon: FEATURE_ICONS.SPREADSHEET })}
            </>
          )}

          {(hasAccess(Feature.MARK_ENTRY) || hasAccess(Feature.ATTENDANCE_TRACKING) || hasAccess(Feature.STUDY_MATERIALS) || hasAccess(Feature.STAFF_ASSIGNMENT) || hasAccess(Feature.LEAVE_MANAGEMENT) || hasAccess(Feature.ASSIGNMENTS) || hasAccess(Feature.ACADEMIC_ANALYTICS) || hasAccess(Feature.GREEN_INSIGHTS) || hasAccess(Feature.MENTOR_ASSIGNMENT) || hasAccess(Feature.CHAT) || hasAccess(Feature.EMAIL) || hasAccess(Feature.EXAMINATION_PORTAL)) && (
            <>
              <div className="pt-6 pb-2 text-[10px] font-bold text-text-muted uppercase px-3 tracking-widest border-t border-border-subtle">Academic Ops</div>
              {hasAccess(Feature.CHAT) && NavItem({ to: "/chat", label: "Chat Hub", icon: FEATURE_ICONS.CHAT })}
              {hasAccess(Feature.EMAIL) && NavItem({ to: "/email", label: "BITmail", icon: FEATURE_ICONS.EMAIL })}
              {hasAccess(Feature.MARK_ENTRY) && NavItem({ to: "/staff/mark-entry", label: "Update Marks", icon: FEATURE_ICONS.MARK_ENTRY })}
              {hasAccess(Feature.ATTENDANCE_TRACKING) && NavItem({ to: "/staff/attendance", label: "Daily Attendance", icon: FEATURE_ICONS.ATTENDANCE })}
              {hasAccess(Feature.MENTOR_ASSIGNMENT) && NavItem({ to: "/hod/assign-students", label: "Assign Mentors", icon: FEATURE_ICONS.MENTOR })}
              {hasAccess(Feature.STUDY_MATERIALS) && (
                NavItem({ to: currentView === UserRole.STUDENT ? "/student/materials" : "/staff/materials", label: currentView === UserRole.STUDENT ? "Study Materials" : "Upload Resources", icon: FEATURE_ICONS.MATERIALS })
              )}
              {hasAccess(Feature.ASSIGNMENTS) && (
                NavItem({ to: currentView === UserRole.STUDENT ? "/student/assignments" : "/staff/task-registry", label: "Deadlines & Tasks", icon: FEATURE_ICONS.TASK })
              )}
              {hasAccess(Feature.STAFF_ASSIGNMENT) && NavItem({ to: "/staff/assignments", label: "Hourly Scheduling", icon: FEATURE_ICONS.ASSIGNMENT })}
              {hasAccess(Feature.LEAVE_MANAGEMENT) && (
                NavItem({ to: currentView === UserRole.STUDENT ? "/student/leave-apply" : "/staff/leave-approval", label: currentView === UserRole.STUDENT ? "Apply for Leave" : "Approve Absences", icon: FEATURE_ICONS.LEAVE, badge: currentView !== UserRole.STUDENT ? leavePendingCount : 0 })
              )}
              {hasAccess(Feature.ACADEMIC_ANALYTICS) && (
                NavItem({
                  to: currentView === UserRole.STUDENT ? "/" : "/analytics/student-tracker",
                  label: currentView === UserRole.STUDENT ? "Academic Analysis" : "Performance Tracker",
                  icon: FEATURE_ICONS.ANALYTICS
                })
              )}
              {NavItem({ to: "/examination-portal", label: "Assessment Portal", icon: FEATURE_ICONS.EXAMINATION })}
              {hasAccess(Feature.GREEN_INSIGHTS) && NavItem({ to: "/", label: "Green Insights", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> })}
            </>
          )}

          <div className="pt-6 pb-2 text-[10px] font-bold text-text-muted uppercase px-3 tracking-widest border-t border-border-subtle">Network</div>
          {NavItem({
            to: "/contacts",
            label: "Contact Directory",
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border-subtle bg-surface-elevated/50 shrink-0 space-y-2">
          {hasAccess(Feature.EDIT_PROFILE) && (
            <Link to="/edit-profile" className="flex items-center space-x-3 p-3 rounded-xl text-text-muted hover:bg-surface-component hover:text-text-primary transition-all">
              {FEATURE_ICONS.EDIT_PROFILE}
              <span className="text-sm font-medium">Edit Profile</span>
            </Link>
          )}
          <Link to="/settings" className="flex items-center space-x-3 p-3 rounded-xl text-text-muted hover:bg-surface-component hover:text-text-primary transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
            <span className="text-sm font-medium">Settings</span>
          </Link>
          <Link to={`/profile/${user?.id}`} className="flex items-center space-x-3 py-2 px-3 hover:bg-surface-component rounded-xl transition-all group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold shrink-0 group-hover:scale-110 transition-transform">{user?.name?.[0]}</div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-text-primary truncate group-hover:text-primary transition-colors">{user?.name}</p>
              <p className="text-[8px] text-text-muted font-black uppercase tracking-widest truncate">View Full Profile</p>
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
        Skip to main content
      </a>
      <aside className="hidden md:flex flex-col w-72 h-screen fixed border-r border-border-subtle bg-surface-elevated/50 backdrop-blur-xl z-30" aria-label="Sidebar Navigation">
        {NavContent()}
      </aside>
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
        <header className="min-h-[4rem] md:min-h-[5rem] flex items-center justify-between px-4 md:px-10 border-b border-border-subtle sticky top-0 bg-surface-deep/80 backdrop-blur-md z-40 transition-all duration-300">
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open mobile menu"
              aria-expanded={isMobileMenuOpen}
              className="md:hidden p-2 text-text-muted hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-primary rounded-lg outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <h1 className="text-xs sm:text-sm md:text-lg lg:text-xl font-black text-text-primary uppercase tracking-tighter shrink-0 max-w-[120px] sm:max-w-none truncate">{title}</h1>
          </div>

          {/* Global Search Bar */}
          <div className="flex-1 max-w-xl mx-2 sm:mx-6 relative group" role="search">
            <div className="relative group">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search... (⌘K)"
                aria-label="Global search"
                className="w-full bg-surface-elevated/50 border border-border-subtle rounded-full px-8 md:px-12 py-2 md:py-2.5 text-[10px] md:text-sm text-text-primary outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
              />
              <svg className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2" aria-hidden="true">
                {resultCount !== undefined && (
                  <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full tabular-nums">
                    {resultCount.toLocaleString()}
                  </span>
                )}
                <div className="hidden lg:flex items-center gap-1">
                  <span className="text-[10px] font-bold text-text-muted bg-surface-component px-1.5 py-0.5 rounded border border-border-subtle">⌘</span>
                  <span className="text-[10px] font-bold text-text-muted bg-surface-component px-1.5 py-0.5 rounded border border-border-subtle">K</span>
                </div>
              </div>
            </div>

            {isSearchOpen && (
              <>
                <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsSearchOpen(false)}></div>
                <div className="absolute top-full left-0 right-0 mt-3 bg-surface-elevated border border-border-subtle rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  {searchQuery.length < 2 ? (
                    <div className="p-8 text-center">
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest">Type to explore institutional data</p>
                    </div>
                  ) : !isAnyResult ? (
                    <div className="p-8 text-center">
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest">No matching authorized records found</p>
                    </div>
                  ) : (
                    <div className="max-h-[70vh] overflow-y-auto custom-scrollbar p-3 space-y-4">
                      {searchResults.members.length > 0 && (
                        <div>
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 px-3">Members ({searchResults.members.length})</p>
                          <div className="space-y-1">
                            {searchResults.members.map(m => (
                              <Link
                                key={m.id}
                                to={`/profile/${m.id}`}
                                className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-component transition-colors group"
                              >
                                <div className="w-9 h-9 rounded-lg bg-surface-component flex items-center justify-center text-text-primary font-bold group-hover:bg-primary group-hover:text-white transition-colors">{m.name[0]}</div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-text-primary uppercase truncate tracking-tight">{m.name}</p>
                                  <p className="text-[10px] text-text-muted font-mono truncate">{m.email}</p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.departments.length > 0 && (
                        <div>
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 px-3">Departments ({searchResults.departments.length})</p>
                          <div className="space-y-1">
                            {searchResults.departments.map(d => (
                              <button
                                key={d.id}
                                onClick={() => navigate('/admin/departments')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-component transition-colors group text-left"
                              >
                                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg></div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-text-primary uppercase truncate tracking-tight">{d.name}</p>
                                  <p className="text-[10px] text-text-muted uppercase font-black">{d.degree} Division</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {searchResults.tasks.length > 0 && (
                        <div>
                          <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-2 px-3">Active Tasks ({searchResults.tasks.length})</p>
                          <div className="space-y-1">
                            {searchResults.tasks.map(t => (
                              <button
                                key={t.id}
                                onClick={() => navigate(currentView === UserRole.STUDENT ? '/student/assignments' : '/staff/task-registry')}
                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-component transition-colors group text-left"
                              >
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg></div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-text-primary uppercase truncate tracking-tight">{t.title}</p>
                                  <p className="text-[10px] text-text-muted uppercase font-black">{t.subjectName}</p>
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

          <div className="flex items-center gap-2">
            {hasAccess(Feature.ASSIGNMENTS) && currentView !== UserRole.STUDENT && (
              <button
                onClick={() => navigate('/staff/task-registry?action=add')}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-emerald-500 outline-none"
                aria-label="Deploy New Task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                Task
              </button>
            )}
            <div className="w-px h-6 bg-border-subtle mx-1 hidden sm:block"></div>
            {hasAccess(Feature.EMAIL) && (
              <button
                onClick={() => navigate('/email?compose=true')}
                className="p-2 text-text-muted hover:text-indigo-500 transition-colors relative focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg outline-none"
                aria-label="Compose BITmail"
                title="Compose BITmail"
              >
                {FEATURE_ICONS.EMAIL}
              </button>
            )}
            <div className="w-px h-6 bg-border-subtle mx-1 hidden sm:block"></div>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              aria-label="Toggle notifications"
              aria-expanded={showNotifications}
              className="p-2 text-text-muted hover:text-text-primary transition-colors relative focus-visible:ring-2 focus-visible:ring-primary rounded-lg outline-none"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg>
              {notifications.some(n => !n.read) && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true"></span>}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-64 w-80 bg-surface-elevated border border-border-subtle rounded-2xl shadow-2xl p-4 z-50" role="dialog" aria-label="Notifications">
                <h4 className="text-xs font-bold text-text-muted uppercase mb-4 border-b border-border-subtle pb-2 flex justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    ALERTS
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => { await ApiService.clearNotifications(); const n = await ApiService.getNotifications(user?.id); setNotifications(n); }}
                      className="text-red-500 font-extrabold hover:text-red-600 focus-visible:underline outline-none text-[10px] tracking-widest bg-red-500/10 px-2 py-0.5 rounded transition-colors hover:bg-red-500/20"
                    >
                      CLEAR
                    </button>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-text-muted hover:text-text-primary bg-surface-deep hover:bg-surface-component p-1 rounded outline-none transition-colors border border-border-subtle"
                      aria-label="Close Alerts"
                      title="Close"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </h4>
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-text-muted text-center py-4">No notifications</p>
                  ) : notifications.map(n => (
                    <div key={n.id} className="p-3 bg-surface-deep rounded-xl border border-border-subtle">
                      <p className="text-[10px] text-text-primary/70">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Alignment stage for responsive dashboards */}
        <main id="main-content" className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 md:p-8 lg:p-10 transition-all duration-300 outline-none" tabIndex={-1}>
          {children}
        </main>

        {/* Floating Action Buttons */}
        <AnimatePresence>
          <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-4">
            {hasAccess(Feature.EMAIL) && (
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                whileHover={{ scale: 1.1, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/email')}
                className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center group overflow-hidden border-4 border-surface-deep"
                title="Open Mail Center"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {FEATURE_ICONS.EMAIL}

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="absolute right-full mr-4 px-4 py-2 bg-surface-elevated border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-primary whitespace-nowrap shadow-2xl pointer-events-none hidden md:block"
                >
                  Mail Center
                </motion.div>
              </motion.button>
            )}

            {hasAccess(Feature.ASSIGNMENTS) && currentView !== UserRole.STUDENT && (
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/staff/task-registry?action=add')}
                className="w-16 h-16 bg-primary text-white rounded-full shadow-[0_20px_50px_rgba(16,185,129,0.4)] flex items-center justify-center group overflow-hidden border-4 border-surface-deep"
                title="Deploy New Task"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <svg className="w-8 h-8 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path>
                </svg>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileHover={{ opacity: 1, x: 0 }}
                  className="absolute right-full mr-4 px-4 py-2 bg-surface-elevated border border-border-subtle rounded-xl text-[10px] font-black uppercase tracking-widest text-text-primary whitespace-nowrap shadow-2xl pointer-events-none hidden md:block"
                >
                  Quick Deploy Task
                </motion.div>
              </motion.button>
            )}
          </div>
        </AnimatePresence>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-72 bg-surface-elevated shadow-2xl">
            {NavContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
