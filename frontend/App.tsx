
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import HodDashboard from './pages/HodDashboard';
import DeanDashboard from './pages/DeanDashboard';
import ManageAccess from './pages/ManageAccess';
import StaffAttendance from './pages/StaffAttendance';
import LeaveApply from './pages/LeaveApply';
import LeaveApproval from './pages/LeaveApproval';
import UserManagement from './pages/UserManagement';
import DepartmentManagement from './pages/DepartmentManagement';
import BatchDetail from './pages/BatchDetail';
import SemesterDetail from './pages/SemesterDetail';
import RequestApproval from './pages/RequestApproval';
import CreateMailId from './pages/CreateMailId';
import ChatHub from './pages/ChatHub';
import EmailCenter from './pages/EmailCenter';
import BITmail from './pages/BITmail';
import Spreadsheet from './pages/Spreadsheet';
import TableDetail from './pages/TableDetail';
import EditProfile from './pages/EditProfile';
import PortalConnectionPage from './pages/PortalConnection';
import EditWebsite from './pages/EditWebsite';
import ManageMarkBatches from './pages/ManageMarkBatches';
import MarkEntry from './pages/MarkEntry';
import BatchTaskDetail from './pages/BatchTaskDetail';
import StudentMaterials from './pages/StudentMaterials';
import StaffMaterials from './pages/StaffMaterials';
import StaffAssignment from './pages/StaffAssignment';
import AssignmentRegistry from './pages/AssignmentRegistry';
import AssignStudents from './pages/AssignStudents';
import MentorDetail from './pages/MentorDetail';
import ProfileDetail from './pages/ProfileDetail';
import StudentPerformanceTracker from './pages/StudentPerformanceTracker';
import Login from './pages/Login';
import Settings from './pages/Settings';
import StaffDirectory from './pages/StaffDirectory';
import StudentDirectory from './pages/StudentDirectory';
import AccessControl from './pages/AccessControl';
import Contacts from './pages/Contacts';
import ExaminationPortal from './pages/ExaminationPortal';
import ExaminationAttendance from './pages/ExaminationAttendance';
import ExaminationAllotment from './pages/ExaminationAllotment';
import ExaminationSchedule from './pages/ExaminationSchedule';
import { User, UserRole, Feature, AccessLevel, PermissionMap } from './types';
import { ApiService } from './store';
import { AuthContext } from './AuthContext';
import { ThemeProvider } from './ThemeContext';

const SESSION_KEY = 'gapt_active_session';
const VIEW_KEY = 'gapt_active_view';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<UserRole>(UserRole.STUDENT);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const recoverSession = async () => {
      const token = localStorage.getItem('token');
      const savedView = localStorage.getItem(VIEW_KEY) as UserRole;

      if (token) {
        try {
          const found = await ApiService.getCurrentUser();
          setCurrentUser(found);
          setCurrentView(savedView || found.role);
        } catch (err) {
          console.error("Session recovery failed:", err);
          localStorage.removeItem('token');
        }
      }

      setIsInitializing(false);
    };
    recoverSession();

    // Periodically check for deadlines (every 1 minute)
    // const deadlineInterval = setInterval(() => {
    //   ApiService.checkDeadlines();
    // }, 60000);

    return () => { };
  }, []);

  const handleSetView = (role: UserRole) => {
    setCurrentView(role);
    localStorage.setItem(VIEW_KEY, role);
  };

  const login = async (email: string, password?: string) => {
    // This is now just a wrapper for state updates if ApiService.login was called elsewhere,
    // or it can call ApiService.login itself.
    // For consistency with Login.tsx, let's make it accept password but usually be called from Login.tsx
    if (password) {
      const found = await ApiService.login(email, password);
      setCurrentUser(found);
      setCurrentView(found.role);
      localStorage.setItem(VIEW_KEY, found.role);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem(VIEW_KEY);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      setUser: setCurrentUser,
      currentView,
      setCurrentView: handleSetView,
      login,
      logout
    }}>
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={currentUser ? <DashboardRouter /> : <Login />} />

            <Route path="/admin/users" element={<ProtectedRoute feature={Feature.USER_DIRECTORY}><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute feature={Feature.COHORT_REGISTRY}><DepartmentManagement /></ProtectedRoute>} />
            <Route path="/admin/departments/batch/:batchId" element={<ProtectedRoute feature={Feature.COHORT_REGISTRY}><BatchDetail /></ProtectedRoute>} />
            <Route path="/admin/departments/batch/:batchId/dept/:deptId/sem/:semNum" element={<ProtectedRoute feature={Feature.COHORT_REGISTRY}><SemesterDetail /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute feature={Feature.ACCESS_REQUESTS}><RequestApproval /></ProtectedRoute>} />
            <Route path="/admin/create-mail" element={<ProtectedRoute feature={Feature.IDENTITY_CREATOR}><CreateMailId /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute feature={Feature.CHAT}><ChatHub /></ProtectedRoute>} />
            <Route path="/email" element={<ProtectedRoute feature={Feature.EMAIL}><BITmail /></ProtectedRoute>} />
            <Route path="/spreadsheet" element={<ProtectedRoute feature={Feature.SPREADSHEET}><Spreadsheet /></ProtectedRoute>} />
            <Route path="/spreadsheet/:tableId" element={<ProtectedRoute feature={Feature.SPREADSHEET}><TableDetail /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute feature={Feature.EDIT_PROFILE}><EditProfile /></ProtectedRoute>} />
            <Route path="/admin/portal-connection" element={<ProtectedRoute feature={Feature.INTERLINK_CONTROL}><PortalConnectionPage /></ProtectedRoute>} />
            <Route path="/admin/access" element={<ProtectedRoute requiredRole={UserRole.ADMIN} feature={Feature.ACCESS_MATRIX}><ManageAccess /></ProtectedRoute>} />
            <Route path="/admin/grand-access" element={<ProtectedRoute requiredRole={UserRole.ADMIN}><AccessControl /></ProtectedRoute>} />
            <Route path="/admin/edit-website" element={<ProtectedRoute feature={Feature.BRANDING_HUB}><EditWebsite /></ProtectedRoute>} />
            <Route path="/admin/mark-batches" element={<ProtectedRoute feature={Feature.MARK_ENTRY}><ManageMarkBatches /></ProtectedRoute>} />
            <Route path="/admin/staff-directory" element={<ProtectedRoute feature={Feature.STAFF_DIRECTORY}><StaffDirectory /></ProtectedRoute>} />
            <Route path="/admin/student-directory" element={<ProtectedRoute feature={Feature.STUDENT_DIRECTORY}><StudentDirectory /></ProtectedRoute>} />

            <Route path="/staff/attendance" element={<ProtectedRoute feature={Feature.ATTENDANCE_TRACKING}><StaffAttendance /></ProtectedRoute>} />
            <Route path="/staff/leave-approval" element={<ProtectedRoute feature={Feature.LEAVE_MANAGEMENT}><LeaveApproval /></ProtectedRoute>} />
            <Route path="/staff/mark-entry" element={<ProtectedRoute feature={Feature.MARK_ENTRY}><MarkEntry /></ProtectedRoute>} />
            <Route path="/staff/materials" element={<ProtectedRoute feature={Feature.STUDY_MATERIALS}><StaffMaterials /></ProtectedRoute>} />
            <Route path="/staff/assignments" element={<ProtectedRoute feature={Feature.STAFF_ASSIGNMENT}><StaffAssignment /></ProtectedRoute>} />
            <Route path="/staff/task-registry" element={<ProtectedRoute feature={Feature.ASSIGNMENTS}><AssignmentRegistry /></ProtectedRoute>} />
            <Route path="/staff/task-registry/batch/:batchId" element={<ProtectedRoute feature={Feature.ASSIGNMENTS}><BatchTaskDetail /></ProtectedRoute>} />

            <Route path="/hod/assign-students" element={<ProtectedRoute feature={Feature.MENTOR_ASSIGNMENT}><AssignStudents /></ProtectedRoute>} />
            <Route path="/hod/mentor/:mentorId" element={<ProtectedRoute feature={Feature.MENTOR_ASSIGNMENT}><MentorDetail /></ProtectedRoute>} />

            <Route path="/student/leave-apply" element={<ProtectedRoute feature={Feature.LEAVE_MANAGEMENT}><LeaveApply /></ProtectedRoute>} />
            <Route path="/student/materials" element={<ProtectedRoute feature={Feature.STUDY_MATERIALS}><StudentMaterials /></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute feature={Feature.ASSIGNMENTS}><AssignmentRegistry /></ProtectedRoute>} />

            <Route path="/analytics/student-tracker" element={<ProtectedRoute feature={Feature.ACADEMIC_ANALYTICS}><StudentPerformanceTracker /></ProtectedRoute>} />

            <Route path="/examination-portal" element={<ProtectedRoute><ExaminationPortal /></ProtectedRoute>} />
            <Route path="/examination/schedule/:testId" element={<ProtectedRoute><ExaminationSchedule /></ProtectedRoute>} />
            <Route path="/examination/attendance/:testId" element={<ProtectedRoute><ExaminationAttendance /></ProtectedRoute>} />
            <Route path="/examination/allotment/:testId" element={<ProtectedRoute><ExaminationAllotment /></ProtectedRoute>} />

            <Route path="/profile/:userId" element={<ProtectedRoute><ProfileDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode, feature?: Feature, requiredRole?: UserRole }> = ({ children, feature, requiredRole }) => {
  const { user, currentView } = React.useContext(AuthContext);
  const [permissions, setPermissions] = useState<Record<string, PermissionMap>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPerms = async () => {
      const perms = await ApiService.getPermissions();
      setPermissions(perms);
      setIsLoading(false);
    };
    fetchPerms();
  }, []);

  if (!user) return <Navigate to="/" />;
  if (isLoading) return null;

  // Role-based check (for core governance)
  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" />;
  }

  // Feature-based check
  if (feature) {
    const rolePerms = permissions[currentView] || {};
    const level = rolePerms[feature];

    // Admin in Admin view has bypass for core governance features
    const isActuallyAdmin = user.role === UserRole.ADMIN;
    if (isActuallyAdmin && currentView === UserRole.ADMIN) {
      const coreGovernance = [Feature.ACCESS_MATRIX, Feature.USER_DIRECTORY, Feature.COHORT_REGISTRY];
      if (coreGovernance.includes(feature)) return <>{children}</>;
    }

    if (!level || level === AccessLevel.NO_ACCESS) {
      return <Navigate to="/" />;
    }
  }

  return <>{children}</>;
};

const DashboardRouter: React.FC = () => {
  const { user, currentView } = React.useContext(AuthContext);
  if (!user) return <Login />;

  switch (currentView) {
    case UserRole.ADMIN: return <AdminDashboard />;
    case UserRole.HOD: return <HodDashboard />;
    case UserRole.DEAN: return <DeanDashboard />;
    case UserRole.STAFF: return <StaffDashboard />;
    case UserRole.STUDENT: return <StudentDashboard />;
    default: return <AdminDashboard />;
  }
};

export default App;
