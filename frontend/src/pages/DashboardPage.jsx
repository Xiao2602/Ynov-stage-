import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import '../components/DashboardLayout.css';

// Enregistrer les composants Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function DashboardPage() {
  const { role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      const allowedRoles = ['admin', 'rh', 'administrateur', 'personnel', 'employee'];
      if (!allowedRoles.includes(role)) {
        return;
      }
      setLoading(true);
      try {
        const data = await apiFetch('/absences/statistics');
        if (data.success) {
          setStats(data.stats);
        } else {
          setError('Impossible de charger les statistiques.');
        }
      } catch (err) {
        console.error('Erreur stats:', err);
        setError('Erreur de connexion au serveur.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [role]);

  // Préparer les données pour les graphiques
  const getTypeChartData = () => {
    if (!stats || !stats.byType) return null;
    const labels = Object.keys(stats.byType);
    const values = Object.values(stats.byType);
    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            '#23b2a4', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#f97316'
          ],
          borderWidth: 1,
        },
      ],
    };
  };

  const getDepartmentChartData = () => {
    if (!stats || !stats.byDepartment) return null;
    const labels = Object.keys(stats.byDepartment);
    const values = Object.values(stats.byDepartment);
    return {
      labels,
      datasets: [
        {
          label: 'Nombre d\'absences',
          data: values,
          backgroundColor: '#23b2a4',
          borderRadius: 4,
        },
      ],
    };
  };

  const renderDashboardContent = () => {
    switch (role) {
      case 'student':
      case 'etudiant':
        return (
          <>
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
              <div className="section-header">
                <h3>Suivi des demandes administratives</h3>
                <button className="ynov-btn-outline">Nouvelle demande</button>
              </div>
              <table className="ynov-table">
                <thead>
                  <tr>
                    <th>Intitulé du document</th>
                    <th>Date de soumission</th>
                    <th>État du dossier</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Attestation de scolarité 2026-2027</td>
                    <td>10 Août 2026</td>
                    <td><span className="badge-status success">Validé</span></td>
                    <td><button className="link-btn">Télécharger</button></td>
                  </tr>
                  <tr>
                    <td>Convention de stage (2 mois)</td>
                    <td>02 Août 2026</td>
                    <td><span className="badge-status warning">En cours de signature</span></td>
                    <td><button className="link-btn">Consulter</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

      case 'parent':
        return (
          <>
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
              <p>Accès aux bilans périodiques d'évaluation et aux comptes rendus de progression.</p>
              <div className="card-list-item">
                <div className="item-info">
                  <strong>Relevé de notes - B2 Informatique (S1)</strong>
                  <span>Date de publication : 15 Février 2026</span>
                </div>
                <button className="ynov-btn-outline">Télécharger le PDF</button>
              </div>
            </div>
          </>
        );

      case 'admin':
      case 'rh':
      case 'administrateur':
      case 'employee':
      case 'personnel': {
        if (loading) {
          return <div style={{ padding: '2rem', textAlign: 'center' }}>Chargement des statistiques...</div>;
        }
        if (error) {
          return <div style={{ padding: '2rem', color: '#ef4444' }}>{error}</div>;
        }
        if (!stats) {
          return <div style={{ padding: '2rem', color: 'var(--ynov-text-muted)' }}>Aucune donnée disponible.</div>;
        }

        const typeChartData = getTypeChartData();
        const departmentChartData = getDepartmentChartData();

        return (
          <>
            {/* Cartes statistiques existantes */}
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Total demandes</h4>
                <div className="stat-value">{stats.total}</div>
                <span className="stat-badge info">Global</span>
              </div>
              <div className="stat-card highlight">
                <h4>En attente</h4>
                <div className="stat-value">{stats.pending}</div>
                <span className="stat-badge warning">À traiter</span>
              </div>
              <div className="stat-card">
                <h4>Approuvées</h4>
                <div className="stat-value">{stats.approved}</div>
                <span className="stat-badge success">Validées</span>
              </div>
              <div className="stat-card">
                <h4>Rejetées</h4>
                <div className="stat-value">{stats.rejected}</div>
                <span className="stat-badge danger">Refusées</span>
              </div>
            </div>

            {/* Section Graphiques */}
            <div className="charts-grid" style={{ marginTop: '24px' }}>
              {/* Graphique répartition par type */}
              {typeChartData && (
                <div className="chart-card">
                  <h3>Répartition par type d'absence</h3>
                  <div className="chart-wrapper">
                    <Doughnut
                      data={typeChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              boxWidth: 12,
                              padding: 15,
                              font: { size: 12 }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Graphique demandes par département */}
              {departmentChartData && (
                <div className="chart-card">
                  <h3>Demandes par département</h3>
                  <div className="chart-wrapper">
                    <Bar
                      data={departmentChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { precision: 0 }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section actions rapides */}
            <div className="dashboard-section" style={{ marginTop: '24px' }}>
              <h3>Actions rapides</h3>
              <div className="actions-group">
                <button className="ynov-btn-outline" onClick={() => window.location.href = '/absences/demandes'}>
                  Gérer les demandes
                </button>
                <button className="ynov-btn-outline" onClick={() => window.location.href = '/users'}>
                  Utilisateurs
                </button>
                <button className="ynov-btn-outline" onClick={() => window.location.href = '/absences/export/excel'}>
                  Exporter les données
                </button>
              </div>
            </div>
          </>
        );
      }

      case 'teacher':
      case 'enseignant':
      case 'professeur':
        return (
          <>
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
              <h3>Planning des cours et feuilles d'émargement</h3>
              <p>Gestion des présences obligatoires et suivi des jalons de projet.</p>
              <div className="card-list-item">
                <div className="item-info">
                  <strong>Architecture Web & MVC (Bachelor 2)</strong>
                  <span>Aujourd'hui - 14:00 à 17:00 (Salle 402)</span>
                </div>
                <button className="ynov-btn-outline">Effectuer l'appel</button>
              </div>
            </div>
          </>
        );

      default:
        return <div>Rôle non reconnu</div>;
    }
  };

  return (
    <div className="dashboard-page-content">
      {renderDashboardContent()}
    </div>
  );
}