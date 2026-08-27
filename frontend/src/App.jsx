import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import DashboardLayout from './components/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import UsersPage from './pages/UsersPage';
import DocumentsPage from './pages/DocumentsPage';
import MyAbsencesPage from './pages/MyAbsencesPage';
import RequestsPage from './pages/RequestsPage';
import ProfilePage from './pages/ProfilePage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import TeacherStudentsPage from './pages/TeacherStudentsPage';
import TeacherSchedulePage from './pages/TeacherSchedulePage';
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
import DataTermsPage from './pages/DataTermsPage';


import ProtectedRoute from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';

function normalizeDepartment(value = '') {
  return value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

function AdminRoute() {
  const { role } = useAuth();

  if (role !== 'admin') {
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
          <Route path="/data-terms" element={<DataTermsPage />} />
          <Route element={<DashboardLayout />}>
            {/* Absences */}
            <Route path="/dashboard" element={<DashboardOverview />} />
            <Route path="/absences" element={<DashboardOverview />} />
            <Route path="/absences/mes-absences" element={<MyAbsencesPage />} />
            <Route path="/absences/demandes" element={<RequestsPage />} />
            <Route path="/absences/stats" element={<DashboardOverview />} />
            

            {/* Documents */}
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/documents/dashboard" element={<DashboardOverview />} />
            

            {/* Administration */}
            <Route element={<AdminRoute />}>
              <Route path="/users" element={<UsersPage />} />
              <Route path="/activity-logs" element={<ActivityLogsPage />} />
              <Route path="/profile-requests" element={<ProfileRequestsPage />} />
              <Route path="/admin/archive" element={<ArchivePage />} />
              <Route path="/admin/archives" element={<ArchivedAbsencesPage />} />
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
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
          </Route>
        </Route>

        {/* Route inconnue */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}