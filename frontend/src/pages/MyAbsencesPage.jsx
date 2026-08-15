import React, { useState } from 'react';
import { 
  IconCalendar, 
  IconSearch, 
  IconUpload, 
  IconClock, 
  IconAlertTriangle, 
  IconCheckCircle, 
  IconXCircle, 
  IconEye, 
  IconX,
  IconHourglass
} from '../components/Icons';

export default function MyAbsencesPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);

  // Formulaire de dépôt
  const [motif, setMotif] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [absences, setAbsences] = useState([
    { id: 1, course: 'Architecture des Systèmes Web', teacher: 'Marc Dupont', date: '12 Oct 2026', time: '09:00 - 12:00', duration: '3h', status: 'En attente', reason: 'Rendez-vous médical', docName: 'certificat_medical.pdf' },
    { id: 2, course: 'Développement Mobile Flutter', teacher: 'Sophie Laurent', date: '08 Oct 2026', time: '14:00 - 17:00', duration: '3h', status: 'Justifié', reason: 'Panne de transport', docName: 'justificatif_sncf.pdf' },
    { id: 3, course: 'Sécurité Réseaux & Cryptographie', teacher: 'Karim Bennani', date: '02 Oct 2026', time: '10:00 - 12:00', duration: '2h', status: 'À justifier', reason: null, docName: null },
    { id: 4, course: 'Gestion de Projet Agile / Scrum', teacher: 'Claire Martin', date: '25 Sept 2026', time: '09:00 - 13:00', duration: '4h', status: 'Justifié', reason: 'Obligation administrative', docName: 'attestation_mairie.pdf' },
    { id: 5, course: 'Intelligence Artificielle & Data', teacher: 'Youssef El Amrani', date: '18 Sept 2026', time: '14:00 - 18:00', duration: '4h', status: 'Rejeté', reason: 'Motif non recevable', docName: 'lettre_explication.pdf' },
  ]);

  const handleOpenJustifyModal = (absence) => {
    setSelectedAbsence(absence);
    setMotif(absence.reason || '');
    setSelectedFile(null);
    setIsSubmitted(false);
    setIsModalOpen(true);
  };

  const handleSaveJustification = (e) => {
    e.preventDefault();
    if (!selectedAbsence) return;

    setAbsences(prev => prev.map(item => {
      if (item.id === selectedAbsence.id) {
        return {
          ...item,
          status: 'En attente',
          reason: motif,
          docName: selectedFile ? selectedFile.name : (item.docName || 'justificatif_depose.pdf')
        };
      }
      return item;
    }));

    setIsSubmitted(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setIsSubmitted(false);
    }, 1200);
  };

  const filteredAbsences = absences.filter(a => {
    const matchStatus = statusFilter === 'all' || a.status.toLowerCase() === statusFilter.toLowerCase();
    const matchSearch = a.course.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        a.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        a.date.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      {/* EN-TÊTE DE LA PAGE */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">
            Mes Absences
          </h2>
          <p className="overview-subtitle">
            Consultez votre historique de présences et déposez vos justificatifs d'absence.
          </p>
        </div>

        <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn-primary" 
            onClick={() => handleOpenJustifyModal(absences.find(a => a.status === 'À justifier') || absences[0])}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div style={{ width: '16px', height: '16px' }}><IconUpload /></div>
            Déposer un justificatif
          </button>
        </div>
      </div>

      {/* STATISTIQUES ASSIDUITÉ */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Heures d'absence</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--ynov-dark)' }}>
              <IconClock />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">16h</span>
            <span className="stat-trend" style={{ background: '#f1f5f9', color: '#475569' }}>Ce semestre</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--ynov-text-muted)', fontWeight: '400' }}>
            Total de 5 sessions
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Absences Justifiées</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--status-approved)' }}>
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">7h</span>
            <span className="stat-trend up">Validé</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--status-approved)', fontWeight: '400' }}>
            2 justificatifs acceptés
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">À justifier / En attente</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--status-pending)' }}>
              <IconHourglass />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">5h</span>
          </div>
          <div className="stat-subtitle">
            Délai max : 48h après reprise
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Taux d'assiduité</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--ynov-teal)' }}>
              <IconCalendar />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">96.2%</span>
            <span className="stat-trend up">Conforme</span>
          </div>
          <div className="stat-subtitle" style={{ color: 'var(--status-approved)', fontWeight: '400' }}>
            Seuil minimal : 85%
          </div>
        </div>
      </div>

      {/* PANNEAU LISTE DES ABSENCES */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="panel-title">Historique des Absences</h3>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="search-bar" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ width: '16px', height: '16px' }}><IconSearch /></div>
              <input 
                type="text" 
                placeholder="Rechercher un module, date..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
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
              <option value="all">Tous les statuts</option>
              <option value="justifié">Justifié</option>
              <option value="en attente">En attente</option>
              <option value="à justifier">À justifier</option>
              <option value="rejeté">Rejeté</option>
            </select>
          </div>
        </div>

        <table className="data-table" style={{ marginTop: '16px' }}>
          <thead>
            <tr>
              <th>Module / Cours</th>
              <th>Intervenant</th>
              <th>Date & Horaire</th>
              <th>Durée</th>
              <th>Statut</th>
              <th>Justificatif</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAbsences.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
                  Aucune absence trouvée pour cette sélection.
                </td>
              </tr>
            ) : (
              filteredAbsences.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: '500', color: 'var(--ynov-dark)' }}>{item.course}</div>
                  </td>
                  <td style={{ color: 'var(--ynov-text-muted)' }}>{item.teacher}</td>
                  <td>
                    <div style={{ color: 'var(--ynov-dark)', fontSize: '0.84rem' }}>{item.date}</div>
                    <div style={{ color: 'var(--ynov-text-muted)', fontSize: '0.74rem' }}>{item.time}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: '500', color: '#1e293b' }}>{item.duration}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      item.status === 'Justifié' ? 'approved' :
                      item.status === 'En attente' ? 'pending' :
                      item.status === 'Rejeté' ? 'urgent' : 'pending'
                    }`} style={item.status === 'À justifier' ? { background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' } : {}}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.80rem', color: item.docName ? 'var(--ynov-teal)' : '#94a3b8' }}>
                    {item.docName || 'Aucun fichier'}
                  </td>
                  <td>
                    <button 
                      className="btn-outline" 
                      onClick={() => handleOpenJustifyModal(item)}
                      style={{ padding: '4px 10px', fontSize: '0.78rem', gap: '4px' }}
                      title="Déposer ou modifier un justificatif"
                    >
                      <div style={{ width: '14px', height: '14px' }}><IconUpload /></div>
                      {item.status === 'À justifier' ? 'Justifier' : 'Détails'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DÉPÔT DE JUSTIFICATIF */}
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
            background: 'var(--ynov-white)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            border: '1px solid var(--ynov-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '600', color: 'var(--ynov-dark)' }}>
                Justifier une absence
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ynov-text-muted)' }}
              >
                <div style={{ width: '20px', height: '20px' }}><IconX /></div>
              </button>
            </div>

            {selectedAbsence && (
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--ynov-dark)' }}>{selectedAbsence.course}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ynov-text-muted)', marginTop: '2px' }}>
                  {selectedAbsence.date} • {selectedAbsence.time} ({selectedAbsence.duration})
                </div>
              </div>
            )}

            {isSubmitted ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--status-approved)' }}>
                <div style={{ width: '40px', height: '40px', margin: '0 auto 10px auto' }}><IconCheckCircle /></div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>Justificatif transmis avec succès !</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--ynov-text-muted)', marginTop: '4px' }}>
                  Votre demande est en cours de validation par la scolarité / RH.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSaveJustification} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '500', color: '#334155', marginBottom: '4px' }}>
                    Motif de l'absence *
                  </label>
                  <select 
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    required
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #e2e8f0', fontSize: '0.85rem', outline: 'none' }}
                  >
                    <option value="">Sélectionnez un motif...</option>
                    <option value="Raison médicale / Maladie">Raison médicale / Maladie (certificat requis)</option>
                    <option value="Rendez-vous médical">Rendez-vous médical spécialisé</option>
                    <option value="Problème de transport">Problème de transport avéré</option>
                    <option value="Obligation administrative / Convocation">Obligation administrative / Convocation</option>
                    <option value="Événement familial">Événement familial grave</option>
                    <option value="Autre motif">Autre motif</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: '500', color: '#334155', marginBottom: '4px' }}>
                    Pièce justificative (PDF, JPG, PNG - max 5MB) *
                  </label>
                  <input 
                    type="file" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    style={{ padding: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '6px', fontSize: '0.82rem', width: '100%', cursor: 'pointer' }}
                  />
                  {selectedAbsence?.docName && !selectedFile && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--ynov-text-muted)', marginTop: '3px' }}>
                      Fichier actuel : {selectedAbsence.docName}
                    </span>
                  )}
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
                    Transmettre le justificatif
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
