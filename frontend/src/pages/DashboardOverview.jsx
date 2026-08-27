import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import '../components/DashboardLayout.css';

export default function DashboardOverview() {
  const { role } = useAuth();
  const [stats, setStats] = useState(null);
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
        const data = await apiFetch('/absences/statistics');
        if (data.success) {
          setStats(data.stats);
        } else {
          setError('Impossible de charger les statistiques.');
        }
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
          <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
            <button className="ynov-btn-outline" onClick={() => window.location.href = '/absences/demandes'}>
              Gérer les demandes
            </button>
          </div>
        </div>

        {/* Cartes statistiques */}
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem'
        }}>
          <div className="stat-card" style={{
            background: 'var(--ynov-card)',
            border: '1px solid var(--ynov-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Total demandes</h4>
              <span style={{ color: 'var(--ynov-cyan)', fontSize: '1.5rem' }}>📋</span>
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--ynov-cyan)', marginTop: '0.5rem' }}>
              {stats.total}
            </div>
            <span className="stat-badge info" style={{ background: 'var(--ynov-cyan)20', color: 'var(--ynov-cyan)', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', display: 'inline-block', marginTop: '0.5rem' }}>
              Global
            </span>
          </div>

          <div className="stat-card highlight" style={{
            background: 'var(--ynov-card)',
            border: '1px solid var(--ynov-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>En attente</h4>
              <span style={{ color: '#f59e0b', fontSize: '1.5rem' }}>⏳</span>
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.5rem' }}>
              {stats.pending}
            </div>
            <span className="stat-badge warning" style={{ background: '#f59e0b20', color: '#f59e0b', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', display: 'inline-block', marginTop: '0.5rem' }}>
              À traiter
            </span>
          </div>

          <div className="stat-card" style={{
            background: 'var(--ynov-card)',
            border: '1px solid var(--ynov-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Approuvées</h4>
              <span style={{ color: '#10b981', fontSize: '1.5rem' }}>✅</span>
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#10b981', marginTop: '0.5rem' }}>
              {stats.approved}
            </div>
            <span className="stat-badge success" style={{ background: '#10b98120', color: '#10b981', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', display: 'inline-block', marginTop: '0.5rem' }}>
              Validées
            </span>
          </div>

          <div className="stat-card" style={{
            background: 'var(--ynov-card)',
            border: '1px solid var(--ynov-border)',
            borderRadius: '1rem',
            padding: '1.5rem',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: 'var(--ynov-text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>Refusées</h4>
              <span style={{ color: '#ef4444', fontSize: '1.5rem' }}>❌</span>
            </div>
            <div className="stat-value" style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ef4444', marginTop: '0.5rem' }}>
              {stats.rejected}
            </div>
            <span className="stat-badge danger" style={{ background: '#ef444420', color: '#ef4444', padding: '0.2rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', display: 'inline-block', marginTop: '0.5rem' }}>
              Rejetées
            </span>
          </div>
        </div>

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
              Répartition par type
            </h3>
            <div className="card-list-item">
              {Object.entries(stats.byType).length === 0 && <p style={{ color: 'var(--ynov-text-muted)' }}>Aucun type enregistré.</p>}
              {Object.entries(stats.byType).map(([type, count]) => (
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
              Répartition par département
            </h3>
            <div className="card-list-item">
              {Object.entries(stats.byDepartment).length === 0 && <p style={{ color: 'var(--ynov-text-muted)' }}>Aucun département enregistré.</p>}
              {Object.entries(stats.byDepartment).map(([dept, count]) => (
                <div key={dept} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0',
                  borderBottom: '1px solid var(--ynov-border)'
                }}>
                  <span style={{ color: 'var(--ynov-text-muted)' }}>{dept}</span>
                  <strong style={{ color: 'var(--ynov-cyan)' }}>{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="dashboard-section" style={{
          background: 'var(--ynov-card)',
          border: '1px solid var(--ynov-border)',
          borderRadius: '1rem',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--ynov-text-light)', marginBottom: '1rem' }}>
            Actions rapides
          </h3>
          <div className="actions-group" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
              📋 Gérer les demandes
            </button>
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
        </div>
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