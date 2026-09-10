import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute() {
  const { user, loading, backendLoading, backendUser, backendError, refreshBackendUser } = useAuth();
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>Session non reconnue</h2>
        <p style={{ color: '#ef4444', fontSize: '0.95rem' }}>{backendError || 'Le backend ne reconnaît pas votre compte.'}</p>
        <p style={{ color: '#64748b', maxWidth: '420px', fontSize: '0.9rem' }}>
          Le serveur backend était momentanément indisponible pendant son redémarrage.
        </p>
        <button
          onClick={() => {
            if (refreshBackendUser) refreshBackendUser();
            else window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'var(--ynov-cyan, #00b4d8)',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 180, 216, 0.25)'
          }}
        >
          Réessayer la connexion
        </button>
      </div>
    );
  }

  if (backendUser.dataTermsAccepted === false && location.pathname !== '/data-terms') {
    return <Navigate to="/data-terms" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
