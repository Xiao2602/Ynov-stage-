import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

import DashboardLayout from './components/DashboardLayout';
import DashboardOverview from './pages/DashboardOverview';
import UsersPage from './pages/UsersPage';
import DocumentsPage from './pages/DocumentsPage';
import MyAbsencesPage from './pages/MyAbsencesPage';
import RequestsPage from './pages/RequestsPage';

import ProtectedRoute from './auth/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pages publiques */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Pages protégées */}
        <Route element={<ProtectedRoute />}>
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
            <Route path="/documents/demandes" element={<DashboardOverview />} />

            {/* Administration */}
            <Route path="/users" element={<UsersPage />} />
            <Route path="/activity-logs" element={<UsersPage />} />
            <Route path="/settings" element={<UsersPage />} />
          </Route>
        </Route>

        {/* Route inconnue */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}