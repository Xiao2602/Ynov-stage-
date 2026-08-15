import React from 'react';
import '../components/DashboardLayout.css';

export default function DashboardPage({ userRole }) {
  const renderDashboardContent = () => {
    switch (userRole) {
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

      case 'personnel':
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Requêtes en attente</h4>
                <div className="stat-value">14</div>
                <span className="stat-badge warning">Traitement requis</span>
              </div>
              <div className="stat-card">
                <h4>Conventions de stage</h4>
                <div className="stat-value">6</div>
                <span className="stat-badge info">À viser cette semaine</span>
              </div>
              <div className="stat-card">
                <h4>Inscriptions Totales</h4>
                <div className="stat-value">452</div>
                <span className="stat-badge success">Rentrée 2026</span>
              </div>
            </div>

            <div className="dashboard-section">
              <h3>File d'attente des validations administratives</h3>
              <table className="ynov-table">
                <thead>
                  <tr>
                    <th>Étudiant</th>
                    <th>Filière</th>
                    <th>Objet</th>
                    <th>Décision</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Alexandre Martin</td>
                    <td>Bachelor 2 - Informatique</td>
                    <td>Convention de stage</td>
                    <td>
                      <button className="ynov-btn-small success">Valider</button>
                      <button className="ynov-btn-small danger">Rejeter</button>
                    </td>
                  </tr>
                  <tr>
                    <td>Sarah Leroy</td>
                    <td>Bachelor 2 - Informatique</td>
                    <td>Attestation de présence</td>
                    <td>
                      <button className="ynov-btn-small success">Valider</button>
                      <button className="ynov-btn-small danger">Rejeter</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );

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

      case 'administrateur':
        return (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <h4>Utilisateurs Actifs</h4>
                <div className="stat-value">488</div>
                <span className="stat-badge success">Activité normale</span>
              </div>
              <div className="stat-card">
                <h4>Intégrité Système</h4>
                <div className="stat-value">0 Erreur</div>
                <span className="stat-badge success">Opérationnel</span>
              </div>
              <div className="stat-card">
                <h4>Habilitations</h4>
                <div className="stat-value">5 Profils</div>
                <span className="stat-badge info">Sécurité active</span>
              </div>
            </div>

            <div className="dashboard-section">
              <h3>Administration générale de la plateforme</h3>
              <p>Paramétrage des habilitations, supervision des flux de données et gestion des comptes.</p>
              <div className="actions-group">
                <button className="ynov-btn-outline">Gestion des utilisateurs</button>
                <button className="ynov-btn-outline">Journaux d'audit</button>
                <button className="ynov-btn-outline">Paramètres généraux</button>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="dashboard-page-content">
      {renderDashboardContent()}
    </div>
  );
}