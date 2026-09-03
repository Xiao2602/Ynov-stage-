import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute() {
  const { user, loading, backendLoading, backendUser, backendError } = useAuth();
  const location = useLocation();

  if (loading || (user && backendLoading)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Vérification de votre session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  if (backendError || !backendUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
        <h2>Session non reconnue</h2>
        <p>{backendError || 'Le backend ne reconnaît pas votre compte.'}</p>
        <p>Vérifiez que le serveur backend est démarré puis reconnectez-vous.</p>
      </div>
    );
  }

  return <Outlet />;
}
