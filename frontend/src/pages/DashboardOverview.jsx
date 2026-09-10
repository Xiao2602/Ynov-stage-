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
  if (role === 'student' || role === 'etudiant') {
    return (
      <div className="dashboard-page-content" style={{ padding: '2rem' }}>
        <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="overview-title" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ynov-text-light)' }}>
              Espace Étudiant
            </h2>
            <p className="overview-subtitle" style={{ color: 'var(--ynov-text-muted)' }}>
              Bienvenue sur votre portail Ynov Campus. Accédez rapidement à vos documents et absences.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="ynov-btn-outline"
              onClick={() => window.location.href = '/documents'}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'var(--ynov-cyan)',
                color: '#020617',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              📁 Consulter mes documents
            </button>
            <button
              className="ynov-btn-outline"
              onClick={() => window.location.href = '/documents/demandes'}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'transparent',
                border: '1px solid var(--ynov-cyan)',
                color: 'var(--ynov-cyan)',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              📝 Demande de document
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Mes Documents</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>Espace Actif</div>
            <span className="stat-badge success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Consultation & Dépôt</span>
          </div>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Demandes de documents</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#a855f7', marginBottom: '0.5rem' }}>En ligne</div>
            <span className="stat-badge info" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Attestations & Certificats</span>
          </div>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Suivi des Absences</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f59e0b', marginBottom: '0.5rem' }}>Justificatifs</div>
            <span className="stat-badge warning" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Dépôt en ligne</span>
          </div>
        </div>

        <div className="dashboard-section" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
          <h3 style={{ color: 'var(--ynov-text-light)', marginTop: 0 }}>Accès Rapides</h3>
          <p style={{ color: 'var(--ynov-text-muted)', marginBottom: '1.25rem' }}>Gérez vos justificatifs, attestations et demandes administratives en quelques clics.</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.location.href = '/documents'}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              📂 Consulter tous mes documents
            </button>
            <button
              onClick={() => window.location.href = '/absences/mes-absences'}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#1e293b',
                color: '#fff',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              📅 Consulter mes absences
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Rôle Parent ---
  if (role === 'parent') {
    return (
      <div className="dashboard-page-content" style={{ padding: '2rem' }}>
        <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 className="overview-title" style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--ynov-text-light)' }}>
              Espace Parent
            </h2>
            <p className="overview-subtitle" style={{ color: 'var(--ynov-text-muted)' }}>
              Suivez la scolarité, les documents et les absences de votre enfant.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="ynov-btn-outline"
              onClick={() => window.location.href = '/documents'}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'var(--ynov-cyan)',
                color: '#020617',
                border: 'none',
                borderRadius: '0.75rem',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              📁 Documents de mon enfant
            </button>
          </div>
        </div>
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Statut du Dossier</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>Validé</div>
            <span className="stat-badge success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Scolarité active</span>
          </div>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Absences</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>Suivi en ligne</div>
            <span className="stat-badge info" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Justificatifs accessibles</span>
          </div>
        </div>
      </div>
    );
  }

  // --- Rôle Professeur ---
  if (role === 'teacher' || role === 'professeur') {
    return (
      <div className="dashboard-page-content" style={{ padding: '2rem' }}>
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Promotions assignées</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.5rem' }}>Campus Ynov</div>
            <span className="stat-badge info" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Année en cours</span>
          </div>
          <div className="stat-card" style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '1rem', padding: '1.5rem' }}>
            <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.875rem', margin: '0 0 0.5rem 0' }}>Appels & Présences</h4>
            <div className="stat-value" style={{ fontSize: '1.75rem', fontWeight: 700, color: '#22c55e', marginBottom: '0.5rem' }}>Espace Pédagogique</div>
            <span className="stat-badge success" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '0.25rem 0.6rem', borderRadius: '9999px', fontSize: '0.75rem' }}>Gestion active</span>
          </div>
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