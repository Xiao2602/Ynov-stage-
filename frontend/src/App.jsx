import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import DashboardLayout from './components/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import AbsenceDashboardOverview from './pages/AbsenceDashboardOverview';
import UsersPage from './pages/UsersPage';
import DocumentsPage from './pages/DocumentsPage';
import DocumentDashboardOverview from './pages/DocumentDashboardOverview';
import DocumentGenerationPage from './pages/DocumentGenerationPage';
import GeneratedDocumentsPage from './pages/GeneratedDocumentsPage';
import MyAbsencesPage from './pages/MyAbsencesPage';
import RequestsPage from './pages/RequestsPage';
import ProfilePage from './pages/ProfilePage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import TeacherStudentsPage from './pages/TeacherStudentsPage';
import TeacherSchedulePage from './pages/TeacherSchedulePage';
import StudentSchedulePage from './pages/StudentSchedulePage';
import TeacherAttendancePage from './pages/TeacherAttendancePage';
import AdministrativeDocumentsPage from './pages/AdministrativeDocumentsPage';
import DocumentRequestsPage from './pages/DocumentRequestsPage';
import ProfileRequestsPage from './pages/ProfileRequestsPage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import ArchivePage from "./pages/ArchivePage";
import TeacherAbsencesList from './pages/TeacherAbsencesList';
import ArchivedAbsencesPage from './pages/ArchivedAbsencesPage';
import TwoFactorLoginPage from './pages/TwoFactorLoginPage';
import AssignPlanningPage from './pages/AssignPlanningPage';
import ConsentPage from './pages/ConsentPage';


import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';

function normalizeDepartment(value = '') {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

function AdminRoute() {
  const { role } = useAuth();

  if (role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function AdminOrEmployeeRoute() {
  const { role } = useAuth();

  if (role !== 'admin' && role !== 'employee' && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

// Le RH ne doit accéder à aucune page fonctionnelle : uniquement au tableau de bord.
function NonHrRoute() {
  const { role } = useAuth();

  if (role === 'rh') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function TeacherRoute() {
  const { role } = useAuth();

  if (role !== 'teacher') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function AdministrativeDocumentsRoute() {
  const { role, backendUser } = useAuth();
  const isAdministrativeStaff = role === 'employee'
    && ['administratif', 'administrative', 'administration'].includes(normalizeDepartment(backendUser?.department));

  if (!isAdministrativeStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function StudentParentRoute() {
  const { role } = useAuth();

  if (role !== 'student' && role !== 'parent') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

function ConsentRoute() {
  const { backendUser } = useAuth();
  return backendUser?.consentVersion ? <Outlet /> : <ConsentPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages publiques */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/2fa-login" element={<TwoFactorLoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Pages protégées */}
        <Route element={<ProtectedRoute />}>
          <Route element={<ConsentRoute />}><Route element={<DashboardLayout />}>
            {/* Absences */}
            <Route path="/dashboard" element={<AbsenceDashboardOverview />} />
            <Route element={<NonHrRoute />}>
              <Route path="/absences" element={<AbsenceDashboardOverview />} />
              <Route path="/absences/mes-absences" element={<MyAbsencesPage />} />
              <Route path="/absences/demandes" element={<RequestsPage />} />

              {/* Documents */}
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/dashboard" element={<DocumentDashboardOverview />} />
              <Route element={<AdminOrEmployeeRoute />}>
                <Route path="/documents/generate" element={<DocumentGenerationPage />} />
                <Route path="/documents/generated" element={<GeneratedDocumentsPage />} />
              </Route>

            {/* Administration */}
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/activity-logs" element={<ActivityLogsPage />} />
              <Route path="/profile-requests" element={<ProfileRequestsPage />} />
              <Route path="/admin/archive" element={<ArchivePage />} />
              <Route path="/admin/archives" element={<ArchivedAbsencesPage />} />
            </Route>
            <Route element={<AdminOrEmployeeRoute />}>
              <Route path="/assign-planning" element={<AssignPlanningPage />} />
            </Route>
            <Route element={<TeacherRoute />}>
              <Route path="/pedagogie/eleves" element={<TeacherStudentsPage />} />
              <Route path="/pedagogie/planning" element={<TeacherSchedulePage />} />
              <Route path="/pedagogie/appel" element={<TeacherAttendancePage />} />
              <Route path="/pedagogie/absences" element={<TeacherAbsencesList />} />
            </Route>
            <Route element={<AdministrativeDocumentsRoute />}>
              <Route path="/documents/traitement" element={<AdministrativeDocumentsPage />} />
            </Route>
            <Route element={<StudentParentRoute />}>
              <Route path="/documents/demandes" element={<DocumentRequestsPage />} />
            </Route>
            <Route path="/planning" element={<StudentSchedulePage />} />
            <Route path="/etudiant/planning" element={<StudentSchedulePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            </Route>
          </Route></Route>
        </Route>

        {/* Route inconnue */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
