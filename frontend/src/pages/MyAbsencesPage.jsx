import React, { useState, useEffect } from 'react';
import {
  IconCalendar,
  IconSearch,
  IconUpload,
  IconClock,
  IconCheckCircle,
  IconXCircle,
  IconAlertTriangle,
  IconEye,
  IconX,
  IconHourglass
} from '../components/Icons';
import { apiFetch } from '../api/api';
import { useAuth } from '../auth/AuthContext';
import '../components/DashboardLayout.css';

// 🔥 Fonction pour extraire une date
const getDateFromValue = (value) => {
  if (!value) return null;
  if (typeof value === 'object' && value.seconds !== undefined) {
    return new Date(value.seconds * 1000);
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  if (typeof value === 'number') {
    return new Date(value);
  }
  if (value.toDate && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return null;
};

// 🔥 Calcule le nombre de jours entre deux dates (minimum 1)
const getDaysBetween = (start, end) => {
  if (!start || !end) return 1;
  const s = getDateFromValue(start);
  const e = getDateFromValue(end);
  if (!s || !e) return 1;
  const diff = (e - s) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(diff) + 1);
};

// 🔥 Calcule le nombre d'heures pour une absence (hors retard)
const calculateNormalHours = (absence) => {
  const days = getDaysBetween(absence.startDate, absence.endDate);
  if (absence.declaredBy) {
    return days * 3;
  }
  switch (absence.type) {
    case 'medical':
    case 'personal':
      return days * 3;
    case 'authorized_leave':
      return days * 6;
    case 'unjustified':
      return days * 3;
    default:
      return days * 3;
  }
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  try {
    if (typeof timestamp === 'object' && timestamp.seconds !== undefined) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    }
    return 'Date inconnue';
  } catch { return 'Date inconnue'; }
};

const getStatusInfo = (status, deadline) => {
  switch (status) {
    case 'pending':
      return { label: 'En attente', color: '#f59e0b', icon: IconHourglass };
    case 'approved':
      return { label: 'Validée', color: '#10b981', icon: IconCheckCircle };
    case 'rejected':
      return { label: 'Refusée', color: '#ef4444', icon: IconXCircle };
    case 'to_justify':
      if (deadline && new Date(deadline) < new Date()) {
        return { label: 'Délai dépassé', color: '#dc2626', icon: IconAlertTriangle };
      }
      return { label: 'À justifier (48h)', color: '#f59e0b', icon: IconAlertTriangle };
    default:
      return { label: 'Inconnu', color: '#64748b', icon: IconAlertTriangle };
  }
};

export default function MyAbsencesPage() {
  const { role, backendUser } = useAuth();
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedChildId, setSelectedChildId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [motif, setMotif] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const fetchAbsences = async () => {
    setLoading(true);
    try {
      const endpoint = role === 'parent' ? '/absences/children' : '/absences/my';
      const data = await apiFetch(endpoint);
      console.log(`🔍 Données reçues de ${endpoint} :`, data);
      if (data && data.success) {
        const absencesData = data.absences || [];
        console.log(`📦 Nombre d'absences chargées : ${absencesData.length}`);
        setAbsences(absencesData);
      } else {
        setError(data?.error || 'Impossible de charger les absences.');
      }
    } catch (err) {
      console.error('Erreur chargement absences:', err);
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsences();
  }, [role]);

  const handleJustifySubmit = async (e) => {
    e.preventDefault();
    if (!selectedAbsence || !selectedFile) {
      setError('Veuillez sélectionner un fichier.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('category', 'justificatif_absence');
      const uploadResult = await apiFetch('/documents/upload', { method: 'POST', body: formData });
      if (!uploadResult.success) throw new Error(uploadResult.error || 'Erreur upload');
      const justificationUrl = uploadResult.url || uploadResult.fileUrl || '';
      const justifyResult = await apiFetch(`/absences/${selectedAbsence.id}/justify`, {
        method: 'POST',
        body: JSON.stringify({ justificationUrl, reason: motif || selectedAbsence.reason })
      });
      if (!justifyResult.success) throw new Error(justifyResult.error || 'Erreur justification');
      setIsSubmitted(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setIsSubmitted(false);
        setSelectedFile(null);
        setMotif('');
        fetchAbsences();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================
  // 🔥 DÉTECTION DES RETARDS (flexible)
  // ============================================================

  const isLateAbsence = (absence) => {
    if (absence.isLate === true) return true;
    if (absence.type === 'late') return true;
    if (absence.reason && absence.reason.toLowerCase().includes('retard')) return true;
    return false;
  };

  const normalAbsences = absences.filter(a => !isLateAbsence(a));
  const lateAbsences = absences.filter(a => isLateAbsence(a));

  // Absences normales justifiées / non justifiées
  const justifiedNormal = normalAbsences.filter(a => a.status === 'approved');
  const unJustifiedNormal = normalAbsences.filter(a => a.status !== 'approved');

  // Retards justifiés / non justifiés
  const justifiedLate = lateAbsences.filter(a => a.status === 'approved');
  const unJustifiedLate = lateAbsences.filter(a => a.status !== 'approved');

  // Heures des absences normales non justifiées
  const normalHoursUnJustified = unJustifiedNormal.reduce((acc, a) => acc + calculateNormalHours(a), 0);

  // Heures des retards non justifiés : 2 retards = 3h
  const lateCountUnJustified = unJustifiedLate.length;
  const lateGroups = Math.floor(lateCountUnJustified / 2);
  const lateHoursUnJustified = lateGroups * 3;

  // Total cumulé des heures non justifiées
  const totalCumulatedHours = normalHoursUnJustified + lateHoursUnJustified;

  // Heures validées (justifiées) : seules les absences normales comptent
  const totalValidatedHours = justifiedNormal.reduce((acc, a) => acc + calculateNormalHours(a), 0);

  // Nombre d'absences à justifier (to_justify + pending) pour la carte "À justifier"
  const toJustifyCount = absences.filter(a => a.status === 'to_justify' || a.status === 'pending').length;

  // Taux d'assiduité
  const justifiedTotal = absences.filter(a => a.status === 'approved').length;
  const totalAbsences = absences.length;
  const presenceRate = totalAbsences > 0 ? Math.round((justifiedTotal / totalAbsences) * 100) : 100;

  // Nombre d'absences non justifiées (retards groupés par 2)
  const unJustifiedNormalCount = unJustifiedNormal.length;
  const unJustifiedLateGroups = Math.floor(unJustifiedLate.length / 2);
  const unJustifiedCount = unJustifiedNormalCount + unJustifiedLateGroups;

  console.log('unJustifiedLate.length:', unJustifiedLate.length);
  console.log('unJustifiedLateGroups:', unJustifiedLateGroups);
  console.log('unJustifiedCount:', unJustifiedCount);

  const childrenList = Array.isArray(backendUser?.children) ? backendUser.children : [];

  const filteredAbsences = absences.filter(a => {
    const matchChild = role !== 'parent' || selectedChildId === 'all' || a.userId === selectedChildId;
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchSearch = (a.reason || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.courseName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (a.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        formatDate(a.startDate).includes(searchQuery);
    return matchChild && matchStatus && matchSearch;
  });

  // ============================================================
  // RENDU
  // ============================================================

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto', padding: '0 2rem 2rem' }}>
      {/* HEADER */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">
            {role === 'parent' ? (childrenList.length > 1 ? 'Absences de mes enfants' : 'Absence de mon enfant') : 'Mes Absences'}
          </h2>
          <p className="overview-subtitle">
            {role === 'parent'
              ? "Consultez l'historique d'assiduité de vos enfants et transmettez des justificatifs."
              : 'Consultez votre historique et déposez vos justificatifs.'}
          </p>
        </div>
      </div>

      {/* STATISTIQUES – 5 cartes */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total cumulé</span>
            <div className="stat-icon-wrapper"><IconClock className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{totalCumulatedHours.toFixed(1)}h</span>
          </div>
          <div className="stat-subtitle">Heures non justifiées</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Heures validées</span>
            <div className="stat-icon-wrapper"><IconCheckCircle className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{totalValidatedHours.toFixed(1)}h</span>
          </div>
          <div className="stat-subtitle">{justifiedTotal} absence(s) justifiée(s)</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">À justifier</span>
            <div className="stat-icon-wrapper"><IconHourglass className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{toJustifyCount}</span>
          </div>
          <div className="stat-subtitle">Délai : 48h</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Taux d'assiduité</span>
            <div className="stat-icon-wrapper"><IconCalendar className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{presenceRate}%</span>
            <span className="stat-trend up">{presenceRate >= 85 ? 'Conforme' : 'Attention'}</span>
          </div>
          <div className="stat-subtitle" style={{ color: presenceRate >= 85 ? 'var(--status-approved)' : '#ef4444' }}>
            Seuil : 85%
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Non justifiées</span>
            <div className="stat-icon-wrapper"><IconAlertTriangle className="icon-md" /></div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{unJustifiedCount}</span>
          </div>
          <div className="stat-subtitle">
            {unJustifiedLate.length > 0 && `${unJustifiedLate.length} retard(s) non justifié(s) → ${lateGroups} absence(s)`}
            {unJustifiedLate.length === 0 && 'Aucun retard non justifié'}
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="panel-title">Historique</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {role === 'parent' && childrenList.length > 1 && (
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #bae6fd', background: '#f0f9ff', color: '#0369a1', fontSize: '0.85rem', fontWeight: '700', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all">Tous mes enfants ({childrenList.length})</option>
                {childrenList.map((c) => (
                  <option key={c.uid} value={c.uid}>{c.displayName} ({c.className})</option>
                ))}
              </select>
            )}
            <div className="search-bar">
              <IconSearch className="search-icon" />
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontSize: '0.85rem', fontWeight: '500', outline: 'none', cursor: 'pointer' }}>
              <option value="all">Tous les statuts</option>
              <option value="to_justify">À justifier</option>
              <option value="approved">Validées</option>
              <option value="pending">En attente</option>
              <option value="rejected">Refusées</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>Chargement...</div>
        ) : error ? (
          <div style={{ padding: '2rem', color: '#ef4444' }}>{error}</div>
        ) : filteredAbsences.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
            <p>Aucune absence enregistrée.</p>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {role === 'parent' && <th>Élève</th>}
                <th>Période</th>
                <th>Motif</th>
                <th>Type</th>
                <th>Source</th>
                <th>Statut</th>
                <th>Heures</th>
                <th>Justificatif</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAbsences.map((item) => {
                const statusInfo = getStatusInfo(item.status, item.justificationDeadline);
                const StatusIcon = statusInfo.icon;
                const isTeacherDeclared = item.declaredBy && item.declaredByName;
                const canJustify = item.status === 'to_justify' && (!item.justificationDeadline || new Date(item.justificationDeadline) > new Date());
                
                const isLate = isLateAbsence(item);
                const typeLabel = isLate ? '🕐 Retard' : (item.type || 'Absence');
                let hoursDisplay = 0;
                if (!isLate) {
                  hoursDisplay = calculateNormalHours(item);
                }
                
                return (
                  <tr key={item.id}>
                    {role === 'parent' && (
                      <td>
                        <strong style={{ display: 'block', color: '#0f172a', fontSize: '0.85rem' }}>{item.displayName || 'Étudiant'}</strong>
                        {item.className && <span style={{ color: '#0284c7', fontSize: '0.72rem', fontWeight: 600 }}>{item.className}</span>}
                      </td>
                    )}
                    <td>{formatDate(item.startDate)} → {formatDate(item.endDate)}</td>
                    <td>{item.reason || 'Non précisé'}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: '500',
                        background: isLate ? '#fef3c7' : '#e2e8f0',
                        color: isLate ? '#92400e' : '#475569'
                      }}>
                        {typeLabel}
                      </span>
                      {isLate && (
                        <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          2 retards = 1 absence (3h)
                        </span>
                      )}
                    </td>
                    <td>
                      {isTeacherDeclared ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ynov-text-muted)' }}>
                          Professeur : {item.declaredByName}
                          {item.courseName && ` (${item.courseName})`}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--ynov-text-muted)' }}>Auto-déclarée</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${item.status === 'approved' ? 'approved' : 'pending'}`} style={{ background: statusInfo.color + '20', color: statusInfo.color }}>
                        <StatusIcon className="status-icon" />
                        {statusInfo.label}
                      </span>
                    </td>
                    <td><strong>{hoursDisplay}h</strong></td>
                    <td>
                      {item.justificationUrl ? (
                        <a href={item.justificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ynov-cyan)', textDecoration: 'underline' }}>📄 Voir</a>
                      ) : (
                        <span style={{ color: 'var(--ynov-text-muted)' }}>Aucun</span>
                      )}
                    </td>
                    <td>
                      {canJustify ? (
                        <button className="btn-outline" onClick={() => { setSelectedAbsence(item); setIsModalOpen(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <IconUpload className="action-icon" /> Justifier
                        </button>
                      ) : (
                        <button className="btn-outline" disabled style={{ opacity: 0.5, cursor: 'default' }}>Détails</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE JUSTIFICATION – inchangée */}
      {isModalOpen && selectedAbsence && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div className="modal-content" style={{
            background: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            padding: '24px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            border: '1px solid #e2e8f0'
          }}>
            <div className="modal-header">
              <h3>Justifier l'absence</h3>
              <button onClick={() => setIsModalOpen(false)}><IconX className="action-icon" /></button>
            </div>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '18px', border: '1px solid #e2e8f0' }}>
              <div><strong>Période :</strong> {formatDate(selectedAbsence.startDate)} → {formatDate(selectedAbsence.endDate)}</div>
              {selectedAbsence.courseName && <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Cours : {selectedAbsence.courseName}</div>}
            </div>
            {isSubmitted ? (
              <div style={{ textAlign: 'center', color: '#10b981', padding: '20px' }}>
                <IconCheckCircle className="icon-lg" style={{ display: 'block', margin: '0 auto' }} />
                <div style={{ fontWeight: '600', fontSize: '1rem', marginTop: '8px' }}>Justificatif transmis !</div>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>En attente de validation par le RH.</p>
              </div>
            ) : (
              <form onSubmit={handleJustifySubmit}>
                <div className="form-group">
                  <label>Motif</label>
                  <select value={motif} onChange={(e) => setMotif(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1.5px solid #e2e8f0' }}>
                    <option value="">Sélectionnez un motif...</option>
                    <option value="Raison médicale / Maladie">Raison médicale / Maladie</option>
                    <option value="Rendez-vous médical">Rendez-vous médical</option>
                    <option value="Problème de transport">Problème de transport</option>
                    <option value="Obligation administrative">Obligation administrative</option>
                    <option value="Événement familial">Événement familial</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Justificatif (PDF, JPG, PNG) *</label>
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSelectedFile(e.target.files[0])} required style={{ width: '100%', padding: '8px', border: '1.5px dashed #cbd5e1', borderRadius: '6px' }} />
                  {selectedFile && <p style={{ fontSize: '0.8rem', color: 'var(--ynov-cyan)', marginTop: '4px' }}>📎 {selectedFile.name}</p>}
                </div>
                {error && <div style={{ color: '#ef4444', marginBottom: '12px' }}>{error}</div>}
                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Envoi...' : 'Envoyer'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}