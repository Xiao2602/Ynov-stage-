import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import '../components/DashboardLayout.css';

export default function DashboardOverview() {
  const { role, backendUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [childrenAbsences, setChildrenAbsences] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);

  const studentRoles = ['student', 'etudiant'];
  const teacherRoles = ['teacher', 'professeur', 'enseignant'];
  const adminRoles = ['admin', 'rh', 'administrateur', 'personnel', 'employee'];

  useEffect(() => {
    const fetchStats = async () => {
      if (!adminRoles.includes(role)) {
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

  useEffect(() => {
    if (role === 'parent') {
      setChildrenLoading(true);
      apiFetch('/absences/children')
        .then(res => {
          if (res?.success) {
            setChildrenAbsences(res.absences || []);
          }
        })
        .catch(err => console.error('Erreur chargement absences enfants:', err))
        .finally(() => setChildrenLoading(false));
    }
  }, [role]);

  // ============================================================
  // RENDU SELON LE RÔLE
  // ============================================================

  // --- Rôle Étudiant ---
  if (studentRoles.includes(role)) {
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
    const childrenList = Array.isArray(backendUser?.children) ? backendUser.children : [];
    const totalAbsencesCount = childrenAbsences.filter(a => a.type !== 'late' && !a.isLate).length;
    const totalLatesCount = childrenAbsences.filter(a => a.type === 'late' || a.isLate).length;
    const toJustifyCount = childrenAbsences.filter(a => a.status === 'to_justify').length;

    return (
      <div className="dashboard-page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <h4>Enfants rattachés</h4>
            <div className="stat-value">{childrenList.length}</div>
            <span className="stat-badge success">Dossier famille actif</span>
          </div>
          <div className="stat-card">
            <h4>Absences cumulées</h4>
            <div className="stat-value">{totalAbsencesCount}</div>
            <span className={`stat-badge ${toJustifyCount > 0 ? 'warning' : 'info'}`}>
              {toJustifyCount > 0 ? `${toJustifyCount} à justifier` : 'Toutes traitées'}
            </span>
          </div>
          <div className="stat-card">
            <h4>Retards signalés</h4>
            <div className="stat-value">{totalLatesCount}</div>
            <span className="stat-badge info">Année en cours</span>
          </div>
        </div>

        <div className="dashboard-section" style={{ marginTop: '24px' }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', color: '#0f172a' }}>Suivi académique de vos enfants</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>Consultez la situation d'assiduité et l'emploi du temps de chacun de vos enfants.</p>
            </div>
            <Link to="/absences/mes-absences" className="ynov-btn-outline" style={{ textDecoration: 'none', padding: '7px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#0284c7', border: '1px solid #bae6fd', background: '#f0f9ff' }}>
              Consulter l'historique complet
            </Link>
          </div>

          {childrenLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Chargement des données familiales...</div>
          ) : childrenList.length === 0 ? (
            <div style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '40px 24px', textAlign: 'center', color: '#64748b' }}>
              <p style={{ margin: '0 0 6px', fontWeight: 800, color: '#0f172a', fontSize: '1.05rem' }}>Aucun enfant n'est actuellement rattaché à votre compte</p>
              <p style={{ margin: 0, fontSize: '0.88rem' }}>Veuillez contacter l'administration de l'établissement pour associer votre profil à vos enfants.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {childrenList.map((child, idx) => {
                const childAbsences = childrenAbsences.filter(a => a.userId === child.uid);
                const childLates = childAbsences.filter(a => a.type === 'late' || a.isLate).length;
                const childAbs = childAbsences.filter(a => a.type !== 'late' && !a.isLate).length;
                const childToJustify = childAbsences.filter(a => a.status === 'to_justify').length;

                return (
                  <div key={child.uid || idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: '#0f172a', fontWeight: 800 }}>{child.displayName || 'Étudiant'}</h4>
                        <span style={{ fontSize: '0.75rem', color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                          {child.className || 'Classe non assignée'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{child.email}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Absences</span>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>
                          {childAbs} {childToJustify > 0 && <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 700 }}>({childToJustify} à justifier)</span>}
                        </strong>
                      </div>
                      <div>
                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Retards</span>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: 800 }}>{childLates}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                      <Link to={`/planning?studentUid=${child.uid}`} style={{ flex: 1, textDecoration: 'none', background: '#e0f2fe', color: '#0284c7', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', transition: 'background 0.15s ease' }}>
                        📅 Emploi du temps
                      </Link>
                      <Link to="/absences/mes-absences" style={{ flex: 1, textDecoration: 'none', background: '#f1f5f9', color: '#334155', padding: '8px 12px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center', transition: 'background 0.15s ease' }}>
                        📋 Justificatifs
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Rôle Professeur ---
  if (teacherRoles.includes(role)) {
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
  if (adminRoles.includes(role)) {
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