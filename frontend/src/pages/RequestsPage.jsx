import React, { useState } from 'react';
import { 
  IconInbox, 
  IconSearch, 
  IconPlus, 
  IconCheckCircle, 
  IconHourglass, 
  IconAlertTriangle, 
  IconEye, 
  IconX,
  IconClock
} from '../components/Icons';

export default function RequestsPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalRequest, setDetailModalRequest] = useState(null);

  // Formulaire nouvelle demande
  const [newType, setNewType] = useState('Justification Absence');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [requests, setRequests] = useState([
    { id: 'REQ-2026-089', title: 'Justification absence du 12/10 (Architecture Web)', type: 'Justification Absence', date: '13 Oct 2026', status: 'En cours', adminNote: 'En cours de vérification médicale par le secrétariat' },
    { id: 'REQ-2026-062', title: 'Correction présence cours Scrum (25/09)', type: 'Recours Présence', date: '26 Sept 2026', status: 'Validé', adminNote: 'Erreur d\'émargement confirmée par l\'enseignant' },
    { id: 'REQ-2026-045', title: 'Aménagement emploi du temps (Alternance)', type: 'Aménagement', date: '15 Sept 2026', status: 'Rejeté', adminNote: 'Planning non compatible avec le volume horaire obligatoire' },
  ]);

  const handleCreateRequest = (e) => {
    e.preventDefault();
    const newReq = {
      id: `REQ-2026-${Math.floor(100 + Math.random() * 900)}`,
      title: newTitle || `${newType} - ${new Date().toLocaleDateString('fr-FR')}`,
      type: newType,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'En cours',
      adminNote: 'Demande reçue, affectée au pôle pédagogique'
    };

    setRequests([newReq, ...requests]);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsSubmitted(false);
      setNewTitle('');
      setNewDescription('');
    }, 1200);
  };

  const filteredRequests = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status.toLowerCase() === statusFilter.toLowerCase();
    const matchType = typeFilter === 'all' || r.type.toLowerCase() === typeFilter.toLowerCase();
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      {/* EN-TÊTE DE LA PAGE */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">
            Mes Demandes
          </h2>
          <p className="overview-subtitle">
            Suivez vos demandes liées aux absences et aux recours de présence.
          </p>
        </div>

        <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-primary" 
            onClick={() => { setIsModalOpen(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div style={{ width: '16px', height: '16px' }}><IconPlus /></div>
            Nouvelle Demande
          </button>
        </div>
      </div>

      {/* STATISTIQUES DEMANDES */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Demandes</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--ynov-dark)' }}>
              <IconInbox />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.length}</span>
            <span className="stat-trend" style={{ background: 'var(--bg-card-hover)', color: 'var(--ynov-text-muted)' }}>Actives</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--ynov-text-muted)', fontWeight: '400' }}>
            Toutes catégories
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">En cours de traitement</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--status-pending)' }}>
              <IconHourglass />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.filter(r => r.status === 'En cours').length}</span>
          </div>
          <div className="stat-subtitle">
            Délai moyen : 24-48h ouvrées
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Demandes Validées</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--status-approved)' }}>
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.filter(r => r.status === 'Validé').length}</span>
            <span className="stat-trend up">Succès</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--status-approved)', fontWeight: '400' }}>
            Traitées et approuvées
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Demandes Rejetées</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--status-urgent)' }}>
              <IconAlertTriangle />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.filter(r => r.status === 'Rejeté').length}</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--status-urgent)', fontWeight: '400' }}>
            Motifs précisés dans le suivi
          </div>
        </div>
      </div>

      {/* PANNEAU LISTE DES DEMANDES */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="panel-title">Toutes les Demandes</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-bar" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '16px', height: '16px' }}><IconSearch /></div>
              <input 
                type="text" 
                placeholder="Numéro de dossier, objet..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid #e2e8f0', 
                background: '#fff', 
                color: '#334155', 
                fontSize: '0.85rem', 
                fontWeight: '500', 
                outline: 'none', 
                cursor: 'pointer' 
              }}
            >
              <option value="all">Tous les types</option>
              <option value="Justification Absence">Justifications</option>
              <option value="Recours Présence">Recours</option>
              <option value="Aménagement">Aménagements</option>
            </select>

            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)', 
                background: 'var(--bg-card)', 
                color: 'var(--ynov-text-main)', 
                fontSize: '0.85rem', 
                fontWeight: '500', 
                outline: 'none', 
                cursor: 'pointer' 
              }}
            >
              <option value="all">Tous les statuts</option>
              <option value="en cours">En cours</option>
              <option value="validé">Validé</option>
              <option value="rejeté">Rejeté</option>
            </select>
          </div>
        </div>

        <table className="data-table" style={{ marginTop: '16px' }}>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Objet de la demande</th>
              <th>Catégorie</th>
              <th>Date de soumission</th>
              <th>Statut</th>
              <th>Remarque Pédagogique / RH</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
                  Aucune demande trouvée avec les filtres actuels.
                </td>
              </tr>
            ) : (
              filteredRequests.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span style={{ fontWeight: '600', color: 'var(--ynov-teal)', fontSize: '0.82rem' }}>
                      {item.id}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500', color: 'var(--ynov-dark)' }}>{item.title}</div>
                  </td>
                  <td>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '0.76rem', 
                      fontWeight: '500',
                      background: 'var(--bg-card-hover)',
                      color: 'var(--ynov-text-muted)'
                    }}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--ynov-text-muted)' }}>{item.date}</td>
                  <td>
                    <span className={`status-badge ${
                      item.status === 'Validé' ? 'approved' :
                      item.status === 'En cours' ? 'pending' : 'urgent'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.80rem', color: 'var(--ynov-text-muted)', maxWidth: '280px' }}>
                    {item.adminNote}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="table-action-btn" 
                      title="Consulter le dossier"
                      onClick={() => setDetailModalRequest(item)}
                      aria-label="Consulter"
                    >
                      <IconEye />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DÉTAILS DE LA DEMANDE */}
      {detailModalRequest && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--ynov-teal)', textTransform: 'uppercase' }}>
                  Dossier {detailModalRequest.id}
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--ynov-dark)', marginTop: '2px' }}>
                  Suivi de la demande
                </h3>
              </div>
              <button 
                onClick={() => setDetailModalRequest(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ynov-text-muted)' }}
              >
                <div style={{ width: '20px', height: '20px' }}><IconX /></div>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: '600', color: 'var(--ynov-dark)', marginBottom: '4px' }}>
                  {detailModalRequest.title}
                </div>
                <div style={{ color: 'var(--ynov-text-muted)', fontSize: '0.78rem' }}>
                  Catégorie : <strong>{detailModalRequest.type}</strong> • Déposée le {detailModalRequest.date}
                </div>
              </div>

              <div>
                <div style={{ fontWeight: '500', color: 'var(--ynov-text-main)', marginBottom: '4px' }}>État du dossier :</div>
                <span className={`status-badge ${
                  detailModalRequest.status === 'Validé' ? 'approved' :
                  detailModalRequest.status === 'En cours' ? 'pending' : 'urgent'
                }`}>
                  {detailModalRequest.status}
                </span>
              </div>

              <div>
                <div style={{ fontWeight: '500', color: 'var(--ynov-text-main)', marginBottom: '4px' }}>Remarque du service Pédagogique / RH :</div>
                <div style={{ padding: '10px', background: 'var(--bg-card-hover)', borderRadius: '6px', color: 'var(--ynov-text-main)', lineHeight: '1.4' }}>
                  {detailModalRequest.adminNote}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                className="btn-primary" 
                onClick={() => setDetailModalRequest(null)}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION DE DEMANDE */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--ynov-dark)' }}>
                Formuler une nouvelle demande
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ynov-text-muted)' }}
              >
                <div style={{ width: '20px', height: '20px' }}><IconX /></div>
              </button>
            </div>

            {isSubmitted ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--status-approved)' }}>
                <div style={{ width: '40px', height: '40px', margin: '0 auto 10px auto' }}><IconCheckCircle /></div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>Demande enregistrée avec succès !</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--ynov-text-muted)', marginTop: '4px' }}>
                  Un numéro de dossier a été généré et transmis au secrétariat.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--ynov-text-main)', marginBottom: '4px' }}>
                    Type de requête *
                  </label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1.5px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--ynov-text-main)', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="Justification Absence">Justification d'absence</option>
                    <option value="Recours Présence">Recours / Correction d'émargement</option>
                    <option value="Aménagement">Aménagement d'horaires / Stage</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--ynov-text-main)', marginBottom: '4px' }}>
                    Objet résumé *
                  </label>
                  <input 
                    type="text" 
                    placeholder="Ex: Absence du 12 octobre - rendez-vous médical"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1.5px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--ynov-text-main)', fontSize: '0.85rem', outline: 'none' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '500', color: 'var(--ynov-text-main)', marginBottom: '4px' }}>
                    Explications & Détails
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Précisez votre demande, dates concernées ou motif particulier..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1.5px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--ynov-text-main)', fontSize: '0.85rem', outline: 'none', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button 
                    type="button" 
                    className="btn-outline" 
                    onClick={() => setIsModalOpen(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                  >
                    Envoyer la demande
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
