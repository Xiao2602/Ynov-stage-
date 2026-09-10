import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import '../components/DashboardLayout.css';

export default function DashboardOverview() {
  const { role } = useAuth();
  const location = useLocation();
  const isDocumentDashboard = location.pathname === '/documents/dashboard';
  const [stats, setStats] = useState(null);
  const [documentStats, setDocumentStats] = useState({
    requests: 0,
    generated: 0,
    imported: 0,
    received: 0,
    transferred: 0
  });
  const [documentBreakdown, setDocumentBreakdown] = useState({
    byType: {},
    byStatus: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      if (!['admin', 'rh', 'administrateur', 'personnel'].includes(role)) {
        return;
      }
      setLoading(true);
      setError('');
      try {
        const [absenceData, requestData, documentData] = await Promise.all([
          apiFetch('/absences/statistics'),
          apiFetch('/api/document-requests/queue?limit=500'),
          apiFetch('/api/documents/my?archived=all')
        ]);

        if (absenceData.success) {
          setStats(absenceData.stats);
        } else {
          setError('Impossible de charger les statistiques.');
        }

        const requests = Array.isArray(requestData?.data)
          ? requestData.data
          : Array.isArray(requestData?.requests) ? requestData.requests : [];
        const documents = Array.isArray(documentData?.documents)
          ? documentData.documents
          : Array.isArray(documentData?.data) ? documentData.data : [];
        const generated = requests.filter((request) => (
          request.generated === true ||
          request.source === 'generated' ||
          String(request.documentId || '').startsWith('generated-')
        ));
        const isReceived = (document) => (
          document.received === true ||
          document.source === 'received' ||
          document.origin === 'received' ||
          document.status === 'received' ||
          Boolean(document.recipientUid)
        );
        const isTransferred = (document) => (
          Boolean(document.transferredAt) || document.status === 'transferred'
        );

        setDocumentStats({
          requests: requests.length,
          generated: generated.length,
          imported: documents.filter((document) => !isReceived(document) && !isTransferred(document) && document.source !== 'generated').length,
          received: documents.filter(isReceived).length,
          transferred: new Set([
            ...requests.filter((request) => request.transferredAt).map((request) => request.id),
            ...documents.filter(isTransferred).map((document) => document.id)
          ]).size
        });

        const typeCounts = {};
        requests.forEach((request) => {
          const type = request.type || request.documentType || 'Autre';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        documents.forEach((document) => {
          const type = document.category || document.documentType || 'Autre';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        const statusCounts = {};
        requests.forEach((request) => {
          const status = request.statusLabel || request.status || 'Inconnu';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        documents.forEach((document) => {
          const status = document.statusLabel || document.status || 'Inconnu';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });

        setDocumentBreakdown({ byType: typeCounts, byStatus: statusCounts });
      } catch (err) {
        console.error('Erreur stats:', err);
        setError('Erreur de connexion au serveur. Vérifiez que le backend est démarré.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [role]);

  // ============================================================
  // RENDU SELON LE RÔLE
  // ============================================================

  // --- Rôle Étudiant ---
  if (role === 'etudiant') {
    return (
      <div className="dashboard-page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Documents Validés</h4>
            <div className="stat-value">4 / 5</div>
            <span className="stat-badge success">Conforme</span>
          </div>
          <div className="stat-card">
            <h4>Volume d'absence</h4>
            <div className="stat-value">12h</div>
            <span className="stat-badge warning">Seuil critique : 20h</span>
          </div>
          <div className="stat-card">
            <h4>Moyenne Semestrielle</h4>
            <div className="stat-value">14.5 / 20</div>
            <span className="stat-badge info">Semestre 2</span>
          </div>
        </div>
        <div className="dashboard-section">
          <h3>Suivi des demandes administratives</h3>
          <p>Consultez l'état de vos dossiers en cours.</p>
        </div>
      </div>
    );
  }

  // --- Rôle Parent ---
  if (role === 'parent') {
    return (
      <div className="dashboard-page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Statut du Dossier</h4>
            <div className="stat-value">Validé</div>
            <span className="stat-badge success">Scolarité active</span>
          </div>
          <div className="stat-card">
            <h4>Absences du Trimestre</h4>
            <div className="stat-value">8h</div>
            <span className="stat-badge info">Justifiées : 6h / Non justifiées : 2h</span>
          </div>
        </div>
        <div className="dashboard-section">
          <h3>Bulletins et relevés académiques</h3>
          <p>Accès aux bilans périodiques.</p>
        </div>
      </div>
    );
  }

  // --- Rôle Professeur ---
  if (role === 'professeur') {
    return (
      <div className="dashboard-page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Promotions assignées</h4>
            <div className="stat-value">6</div>
            <span className="stat-badge info">Campus Ynov</span>
          </div>
          <div className="stat-card">
            <h4>Appels en cours</h4>
            <div className="stat-value">2</div>
            <span className="stat-badge warning">Séance active</span>
          </div>
        </div>
        <div className="dashboard-section">
          <h3>Planning des cours</h3>
          <p>Gestion des présences obligatoires.</p>
        </div>
      </div>
    );
  }

  // --- Rôle Admin / RH / Personnel (affichage des statistiques) ---
  if (['admin', 'rh', 'administrateur', 'personnel'].includes(role)) {
    if (loading) {
      return (
        <div className="dashboard-page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <div className="spinner" style={{ borderColor: 'var(--ynov-cyan) #020617 transparent transparent' }}></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="dashboard-page-content" style={{ padding: '2rem', color: '#ef4444' }}>
          <h3>Erreur</h3>
          <p>{error}</p>
          <p style={{ fontSize: '0.9rem', color: 'var(--ynov-text-muted)' }}>
            Vérifiez que le backend est démarré sur <code>http://localhost:5000</code>.
          </p>
        </div>
      );
    }

    if (!stats) {
      return (
        <div className="dashboard-page-content" style={{ padding: '2rem', color: 'var(--ynov-text-muted)' }}>
          <h3>Aucune donnée disponible</h3>
          <p>Les statistiques seront visibles dès que des absences seront enregistrées.</p>
        </div>
      );
    }

    return (
      <div className="dashboard-page-content" style={{ padding: '2rem' }}>
        {/* En-tête */}
        <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 className="overview-title" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ynov-text-light)' }}>
              Tableau de bord
            </h2>
            <p className="overview-subtitle" style={{ color: 'var(--ynov-text-muted)' }}>
              Vue d'ensemble des absences et indicateurs clés
            </p>
          </div>
          {!isDocumentDashboard && <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="ynov-btn-outline" onClick={() => window.location.href = '/absences/demandes'}>
              Gérer les demandes
            </button>
          </div>}
        </div>

        {!isDocumentDashboard && <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          {[
            { label: 'Total demandes', value: stats.total, color: 'var(--ynov-cyan)', icon: '📋', badge: 'Global' },
            { label: 'En attente', value: stats.pending, color: '#f59e0b', icon: '⏳', badge: 'À traiter' },
            { label: 'Approuvées', value: stats.approved, color: '#10b981', icon: '✅', badge: 'Validées' },
            { label: 'Refusées', value: stats.rejected, color: '#ef4444', icon: '❌', badge: 'Rejetées' }
          ].map((card) => (
            <div key={card.label} className="stat-card" style={{
              background: 'var(--ynov-card)',
              border: '1px solid var(--ynov-border)',
              borderRadius: '1rem',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>{card.label}</h4>
                <span aria-hidden="true" style={{ color: card.color, fontSize: '1.5rem' }}>{card.icon}</span>
              </div>
              <div style={{ color: card.color, fontSize: '2.5rem', fontWeight: 700, marginTop: '0.5rem' }}>{card.value}</div>
              <span style={{ background: `${card.color}20`, color: card.color, padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', display: 'inline-block', marginTop: '0.5rem' }}>{card.badge}</span>
            </div>
          ))}
        </div>}

        {isDocumentDashboard && <section style={{ marginBottom: '2.5rem' }}>
          <div className="stats-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: '1rem'
          }}>
            {[
              { label: 'Demandes de documents', value: documentStats.requests, color: 'var(--ynov-cyan)', icon: '📋' },
              { label: 'Documents générés', value: documentStats.generated, color: '#6366f1', icon: '✨' },
              { label: 'Documents importés', value: documentStats.imported, color: '#0ea5e9', icon: '📥' },
              { label: 'Documents reçus', value: documentStats.received, color: '#10b981', icon: '📨' },
              { label: 'Documents transférés', value: documentStats.transferred, color: '#f59e0b', icon: '↗' }
            ].map((card) => (
              <div key={card.label} className="stat-card" style={{
                background: 'var(--ynov-card)',
                border: '1px solid var(--ynov-border)',
                borderRadius: '1rem',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.82rem', fontWeight: 500 }}>{card.label}</h4>
                  <span aria-hidden="true" style={{ color: card.color, fontSize: '1.35rem' }}>{card.icon}</span>
                </div>
                <div style={{ color: card.color, fontSize: '2.15rem', fontWeight: 700, marginTop: '0.45rem' }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </section>}

        {/* Deux colonnes : Types et Départements */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <div className="dashboard-section" style={{
            background: 'var(--ynov-card)',
            border: '1px solid var(--ynov-border)',
            borderRadius: '1rem',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ynov-text-light)', marginBottom: '1rem' }}>
              {isDocumentDashboard ? 'Répartition par type de document' : 'Répartition par type'}
            </h3>
            <div className="card-list-item">
              {Object.entries(isDocumentDashboard ? documentBreakdown.byType : stats.byType).length === 0 && <p style={{ color: 'var(--ynov-text-muted)' }}>Aucun type enregistré.</p>}
              {Object.entries(isDocumentDashboard ? documentBreakdown.byType : stats.byType).map(([type, count]) => (
                <div key={type} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0',
                  borderBottom: '1px solid var(--ynov-border)'
                }}>
                  <span style={{ color: 'var(--ynov-text-muted)' }}>{type}</span>
                  <strong style={{ color: 'var(--ynov-cyan)' }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="dashboard-section" style={{
            background: 'var(--ynov-card)',
            border: '1px solid var(--ynov-border)',
            borderRadius: '1rem',
            padding: '1.5rem'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ynov-text-light)', marginBottom: '1rem' }}>
              {isDocumentDashboard ? 'Répartition par statut' : 'Répartition par département'}
            </h3>
            <div className="card-list-item">
              {Object.entries(isDocumentDashboard ? documentBreakdown.byStatus : stats.byDepartment).length === 0 && <p style={{ color: 'var(--ynov-text-muted)' }}>Aucune donnée enregistrée.</p>}
              {Object.entries(isDocumentDashboard ? documentBreakdown.byStatus : stats.byDepartment).map(([label, count]) => (
                <div key={label} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0',
                  borderBottom: '1px solid var(--ynov-border)'
                }}>
                  <span style={{ color: 'var(--ynov-text-muted)' }}>{label}</span>
                  <strong style={{ color: 'var(--ynov-cyan)' }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {!isDocumentDashboard && <div className="dashboard-section" style={{
          background: 'var(--ynov-card)',
          border: '1px solid var(--ynov-border)',
          borderRadius: '1rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ynov-text-light)', marginBottom: '1rem' }}>
            Actions rapides
          </h3>
          <div className="actions-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {!isDocumentDashboard && <button
              className="ynov-btn-outline"
              onClick={() => window.location.href = '/absences/demandes'}
              style={{
                padding: '0.6rem 1.5rem',
                background: 'transparent',
                border: '1px solid var(--ynov-cyan)',
                color: 'var(--ynov-cyan)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontWeight: 500
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--ynov-cyan)20'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              📋 Gérer les demandes
            </button>}
            <button
              className="ynov-btn-outline"
              onClick={() => window.location.href = '/users'}
              style={{
                padding: '0.6rem 1.5rem',
                background: 'transparent',
                border: '1px solid var(--ynov-cyan)',
                color: 'var(--ynov-cyan)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontWeight: 500
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--ynov-cyan)20'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              👥 Utilisateurs
            </button>
            <button
              className="ynov-btn-outline"
              onClick={() => window.location.href = '/absences/demandes'}
              style={{
                padding: '0.6rem 1.5rem',
                background: 'transparent',
                border: '1px solid var(--ynov-cyan)',
                color: 'var(--ynov-cyan)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                transition: 'background 0.2s',
                fontWeight: 500
              }}
              onMouseOver={(e) => e.target.style.background = 'var(--ynov-cyan)20'}
              onMouseOut={(e) => e.target.style.background = 'transparent'}
            >
              📊 Exporter les données
            </button>
          </div>
        </div>}
      </div>
    );
  }

  // Si le rôle n'est pas reconnu
  return (
    <div className="dashboard-page-content" style={{ padding: '2rem' }}>
      <h3>Rôle non reconnu</h3>
      <p>Votre rôle "{role}" n'est pas pris en charge par le tableau de bord.</p>
    </div>
  );
}