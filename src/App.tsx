
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
import PortalConnectionPage from './pages/PortalConnection';
import EditWebsite from './pages/EditWebsite';
import ManageMarkBatches from './pages/ManageMarkBatches';
import MarkEntry from './pages/MarkEntry';
import StudentMaterials from './pages/StudentMaterials';
import StaffMaterials from './pages/StaffMaterials';
import StaffAssignment from './pages/StaffAssignment';
import AssignmentRegistry from './pages/AssignmentRegistry';
import AssignStudents from './pages/AssignStudents';
import MentorDetail from './pages/MentorDetail';
import ProfileDetail from './pages/ProfileDetail';
import Login from './pages/Login';
import Settings from './pages/Settings';
import StaffDirectory from './pages/StaffDirectory';
import StudentDirectory from './pages/StudentDirectory';
import { User, UserRole } from './types/types';
import { MockDB } from './store/store';
import BackendApiService from './services/BackendApiService';
import { AuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

const SESSION_KEY = 'gapt_active_session';
const VIEW_KEY = 'gapt_active_view';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<UserRole>(UserRole.STUDENT);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const recoverSession = async () => {
      const savedEmail = localStorage.getItem(SESSION_KEY);
      const savedView = localStorage.getItem(VIEW_KEY) as UserRole;

      if (savedEmail && localStorage.getItem('gapt_access_token')) {
        try {
          const profile = await BackendApiService.getProfile();
          if (profile) {
            setCurrentUser(profile);
            setCurrentView(savedView || profile.role);
          }
        } catch (e) {
          // Fallback to mock if backend unreachable
          const users = await MockDB.getUsers();
          const found = users.find(u => u.email.toLowerCase() === savedEmail.toLowerCase());
          if (found) {
            setCurrentUser(found);
            setCurrentView(savedView || found.role);
          }
        }
      }
      setIsInitializing(false);
    };
    recoverSession();
  }, []);

  const handleSetView = (role: UserRole) => {
    setCurrentView(role);
    localStorage.setItem(VIEW_KEY, role);
  };

  const login = async (email: string) => {
    try {
      // Try real backend first
      const user = await BackendApiService.authenticate(email, 'password'); // Password would come from UI
      if (user) {
        setCurrentUser(user);
        setCurrentView(user.role);
        localStorage.setItem(SESSION_KEY, email);
        localStorage.setItem(VIEW_KEY, user.role);
        return;
      }
    } catch (e) {
      console.warn("Backend auth failed, trying mock...");
    }

    // Fallback to mock
    const users = await MockDB.getUsers();
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      setCurrentView(found.role);
      localStorage.setItem(SESSION_KEY, email);
      localStorage.setItem(VIEW_KEY, found.role);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(VIEW_KEY);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user: currentUser,
      currentView,
      setCurrentView: handleSetView,
      login,
      logout
    }}>
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={currentUser ? <DashboardRouter /> : <Login />} />

            <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute><DepartmentManagement /></ProtectedRoute>} />
            <Route path="/admin/departments/batch/:batchId" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
            <Route path="/admin/departments/batch/:batchId/dept/:deptId/sem/:semNum" element={<ProtectedRoute><SemesterDetail /></ProtectedRoute>} />
            <Route path="/admin/requests" element={<ProtectedRoute><RequestApproval /></ProtectedRoute>} />
            <Route path="/admin/create-mail" element={<ProtectedRoute><CreateMailId /></ProtectedRoute>} />
            <Route path="/admin/portal-connection" element={<ProtectedRoute><PortalConnectionPage /></ProtectedRoute>} />
            <Route path="/admin/access" element={<ProtectedRoute><ManageAccess /></ProtectedRoute>} />
            <Route path="/admin/edit-website" element={<ProtectedRoute><EditWebsite /></ProtectedRoute>} />
            <Route path="/admin/mark-batches" element={<ProtectedRoute><ManageMarkBatches /></ProtectedRoute>} />
            <Route path="/admin/staff-directory" element={<ProtectedRoute><StaffDirectory /></ProtectedRoute>} />
            <Route path="/admin/student-directory" element={<ProtectedRoute><StudentDirectory /></ProtectedRoute>} />

            <Route path="/staff/attendance" element={<ProtectedRoute><StaffAttendance /></ProtectedRoute>} />
            <Route path="/staff/leave-approval" element={<ProtectedRoute><LeaveApproval /></ProtectedRoute>} />
            <Route path="/staff/mark-entry" element={<ProtectedRoute><MarkEntry /></ProtectedRoute>} />
            <Route path="/staff/materials" element={<ProtectedRoute><StaffMaterials /></ProtectedRoute>} />
            <Route path="/staff/assignments" element={<ProtectedRoute><StaffAssignment /></ProtectedRoute>} />
            <Route path="/staff/task-registry" element={<ProtectedRoute><AssignmentRegistry /></ProtectedRoute>} />

            <Route path="/hod/assign-students" element={<ProtectedRoute><AssignStudents /></ProtectedRoute>} />
            <Route path="/hod/mentor/:mentorId" element={<ProtectedRoute><MentorDetail /></ProtectedRoute>} />

            <Route path="/student/leave-apply" element={<ProtectedRoute><LeaveApply /></ProtectedRoute>} />
            <Route path="/student/materials" element={<ProtectedRoute><StudentMaterials /></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute><AssignmentRegistry /></ProtectedRoute>} />

            <Route path="/profile/:userId" element={<ProtectedRoute><ProfileDetail /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </AuthContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/" />;
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
