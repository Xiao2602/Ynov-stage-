import React, { useState, useEffect } from 'react';
import { 
  IconInbox, 
  IconSearch, 
  IconPlus, 
  IconCheckCircle, 
  IconHourglass, 
  IconAlertTriangle, 
  IconEye, 
  IconX
} from '../components/Icons';
import { apiFetch, apiFetchBlob } from '../api/api';
import { useAuth } from '../auth/AuthContext';

// Fonction pour convertir un timestamp Firestore en date lisible
const formatDate = (timestamp) => {
  if (!timestamp) return 'Date inconnue';
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('fr-FR');
    }
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000).toLocaleDateString('fr-FR');
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('fr-FR');
    }
    return 'Date inconnue';
  } catch {
    return 'Date inconnue';
  }
};

export default function RequestsPage() {
  const { role } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailModalRequest, setDetailModalRequest] = useState(null);
  const [error, setError] = useState(null);

  const [newType, setNewType] = useState('medical');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newFile, setNewFile] = useState(null);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const isAdmin = ['admin', 'rh', 'administrateur', 'personnel'].includes(role);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = isAdmin ? '/absences' : '/absences/my';
      const data = await apiFetch(endpoint);
      if (data && data.success) {
        const absences = data.absences || [];
        const formatted = absences.map(a => ({
          id: a.id || a._id,
          title: a.reason || a.type || 'Sans titre',
          type: a.type || 'Autre',
          date: formatDate(a.createdAt),
          startDate: a.startDate,
          endDate: a.endDate,
          description: a.reason || 'Aucune description',
          status: a.status === 'pending' ? 'En cours' :
                  a.status === 'approved' ? 'Validé' : 'Rejeté',
          adminNote: a.reviewNotes || 'Aucune remarque',
          isPending: a.status === 'pending',
          justificationUrl: a.justificationUrl || null,
          reviewerName: a.reviewerName || null,
          displayName: a.displayName || a.userEmail || '',
          className: a.className || a.department || ''
        }));
        setRequests(formatted);

        // Extraire les classes disponibles pour le filtre
        if (isAdmin) {
          const classes = [...new Set(formatted.map(r => r.className).filter(Boolean))];
          setClassOptions(classes);
        }
      } else {
        setError('Impossible de charger les demandes');
      }
    } catch (err) {
      console.error('Erreur fetchRequests:', err);
      setError('Erreur de chargement: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [role]);

  const handleReview = async (id, status, reviewNotes = '') => {
    try {
      const data = await apiFetch(`/absences/${id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewNotes })
      });
      if (data.success) {
        alert(`Demande ${status === 'approved' ? 'approuvée' : 'refusée'} avec succès.`);
        setDetailModalRequest(null);
        fetchRequests();
      } else {
        alert('Erreur : ' + data.error);
      }
    } catch (error) {
      alert('Erreur : ' + error.message);
    }
  };

  const handleExport = async (format) => {
    if (!isAdmin) {
      alert('Seuls les administrateurs et RH peuvent exporter.');
      return;
    }
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        const mappedStatus = statusFilter === 'Validé' ? 'approved' : statusFilter === 'Rejeté' ? 'rejected' : statusFilter === 'En cours' ? 'pending' : statusFilter;
        queryParams.set('status', mappedStatus);
      }
      if (typeFilter && typeFilter !== 'all') queryParams.set('type', typeFilter);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const qs = queryParams.toString();
      const endpoint = `/absences/export/${format}${qs ? `?${qs}` : ''}`;
      const blob = await apiFetchBlob(endpoint);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `absences_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Erreur lors de l\'export : ' + (error.message || 'Vérifiez vos permissions.'));
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let justificationUrl = '';

      if (newFile) {
        const formData = new FormData();
        formData.append('file', newFile);
        formData.append('category', 'justificatif_absence');

        const uploadResult = await apiFetch('/documents/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadResult.success) {
          setError(uploadResult.error || 'Erreur lors de l\'upload du fichier');
          setIsSubmitting(false);
          return;
        }

        justificationUrl = uploadResult.url || uploadResult.fileUrl || '';
      }

      const absenceBody = {
        type: newType,
        startDate: startDate,
        endDate: endDate,
        reason: newTitle || 'Demande sans titre',
        justificationUrl: justificationUrl
      };

      const absenceResult = await apiFetch('/absences', {
        method: 'POST',
        body: JSON.stringify(absenceBody)
      });

      if (absenceResult && absenceResult.success) {
        setIsSubmitted(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setIsSubmitted(false);
          setNewTitle('');
          setNewDescription('');
          setNewFile(null);
          setStartDate(new Date().toISOString().split('T')[0]);
          setEndDate(new Date().toISOString().split('T')[0]);
          fetchRequests();
        }, 1200);
      } else {
        setError(absenceResult?.error || 'Erreur lors de la création de la demande');
      }
    } catch (error) {
      console.error('❌ Erreur:', error);
      setError(error.message || 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🔥 Filtrage avec recherche multicritères (nom, classe, période, motif)
  const filteredRequests = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status.toLowerCase() === statusFilter.toLowerCase();
    const matchType = typeFilter === 'all' || r.type.toLowerCase().includes(typeFilter.toLowerCase());
    const matchSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (r.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (r.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = !classFilter || (r.className || '').toLowerCase().includes(classFilter.toLowerCase());
    
    // Filtrage par période
    let matchStartDate = true;
    let matchEndDate = true;
    if (startDateFilter) {
      const start = new Date(startDateFilter);
      const rStart = new Date(r.startDate);
      matchStartDate = rStart >= start;
    }
    if (endDateFilter) {
      const end = new Date(endDateFilter);
      const rEnd = new Date(r.endDate);
      matchEndDate = rEnd <= end;
    }

    return matchStatus && matchType && matchSearch && matchClass && matchStartDate && matchEndDate;
  });

  return (
    <div className="dashboard-scroll-area" style={{ height: '100%', overflowY: 'auto' }}>
      {/* EN-TÊTE */}
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 className="overview-title">Mes Demandes</h2>
          <p className="overview-subtitle">Suivez le statut de vos demandes</p>
        </div>
        <div className="overview-actions" style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px' }}><IconPlus /></div>
            Nouvelle Demande
          </button>
          {isAdmin && (
            <>
              <button className="ynov-btn-outline" onClick={() => handleExport('excel')}>📊 Excel</button>
              <button className="ynov-btn-outline" onClick={() => handleExport('pdf')}>📄 PDF</button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#fecaca', color: '#991b1b', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #f87171' }}>
          ⚠️ {error}
        </div>
      )}

      {/* STATISTIQUES */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: 'var(--ynov-dark)' }}>
              <IconInbox />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.length}</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">En cours</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: '#f59e0b' }}>
              <IconHourglass />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.filter(r => r.status === 'En cours').length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Validées</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: '#10b981' }}>
              <IconCheckCircle />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.filter(r => r.status === 'Validé').length}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Rejetées</span>
            <div className="stat-icon-wrapper" style={{ width: '32px', height: '32px', color: '#ef4444' }}>
              <IconAlertTriangle />
            </div>
          </div>
          <div className="stat-value-container">
            <span className="stat-value">{requests.filter(r => r.status === 'Rejeté').length}</span>
          </div>
        </div>
      </div>

      {/* TABLEAU AVEC FILTRES MULTICRITÈRES */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h3 className="panel-title">Toutes les Demandes</h3>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Rechercher par nom, motif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '200px' }}
            />
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            {isAdmin && (
              <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <option value="">Toutes les classes</option>
                {classOptions.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            )}
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}>
              <option value="all">Tous</option>
              <option value="medical">Médical</option>
              <option value="personal">Personnel</option>
              <option value="authorized_leave">Congé</option>
              <option value="unjustified">Non justifié</option>
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}>
              <option value="all">Tous</option>
              <option value="en cours">En cours</option>
              <option value="validé">Validé</option>
              <option value="rejeté">Rejeté</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px' }}>Chargement...</div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
            <p>Aucune demande trouvée.</p>
            <p style={{ fontSize: '0.85rem' }}>Cliquez sur "Nouvelle Demande" pour en créer une.</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--ynov-text-muted)' }}>
            <p>Aucune demande ne correspond aux critères de recherche.</p>
          </div>
        ) : (
          <table className="data-table" style={{ marginTop: '16px', width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Étudiant</th>
                <th>Objet</th>
                <th>Catégorie</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Remarque</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td><span style={{ fontWeight: '600', color: 'var(--ynov-teal)' }}>{item.id}</span></td>
                  <td>{item.displayName || '—'}</td>
                  <td>{item.title}</td>
                  <td><span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '0.76rem', background: '#f1f5f9' }}>{item.type}</span></td>
                  <td>{item.date}</td>
                  <td>
                    <span className={`status-badge ${item.status === 'Validé' ? 'approved' : item.status === 'En cours' ? 'pending' : 'urgent'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.80rem', maxWidth: '280px' }}>{item.adminNote}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="table-action-btn" onClick={() => setDetailModalRequest(item)}>
                      <IconEye />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DÉTAIL */}
      {detailModalRequest && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '560px', padding: '28px 24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--ynov-teal)', textTransform: 'uppercase' }}>Dossier {detailModalRequest.id}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '600', margin: '2px 0 0 0' }}>Suivi</h3>
              </div>
              <button 
                onClick={() => setDetailModalRequest(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '20px', height: '20px', color: '#64748b' }}><IconX /></div>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><strong>Étudiant :</strong> {detailModalRequest.displayName || '—'}</div>
              <div><strong>Objet :</strong> {detailModalRequest.title}</div>
              <div><strong>Type :</strong> {detailModalRequest.type}</div>
              <div><strong>Période :</strong> {detailModalRequest.startDate} → {detailModalRequest.endDate}</div>
              <div><strong>Description :</strong> {detailModalRequest.description}</div>
              <div><strong>Date de soumission :</strong> {detailModalRequest.date}</div>
              <div><strong>Statut :</strong> <span className={`status-badge ${detailModalRequest.status === 'Validé' ? 'approved' : detailModalRequest.status === 'En cours' ? 'pending' : 'urgent'}`}>{detailModalRequest.status}</span></div>
              {detailModalRequest.reviewerName && (
                <div><strong>Validé/Refusé par :</strong> {detailModalRequest.reviewerName}</div>
              )}
              {detailModalRequest.justificationUrl && (
                <div>
                  <strong>Justificatif :</strong>{' '}
                  <a href={detailModalRequest.justificationUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ynov-cyan)', textDecoration: 'underline' }}>
                    📄 Voir le document
                  </a>
                </div>
              )}
              <div><strong>Remarque :</strong> {detailModalRequest.adminNote}</div>

              {isAdmin && detailModalRequest.status === 'En cours' && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button className="btn-primary" onClick={() => handleReview(detailModalRequest.id, 'approved', 'Validé par RH')} style={{ flex: 1 }}>✅ Approuver</button>
                  <button className="ynov-btn-outline" onClick={() => handleReview(detailModalRequest.id, 'rejected', 'Refusé par RH')} style={{ flex: 1, borderColor: '#ef4444', color: '#ef4444' }}>❌ Refuser</button>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn-primary" onClick={() => setDetailModalRequest(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION – inchangée */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '28px 24px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>Nouvelle demande</h3>
              <button 
                onClick={() => { setIsModalOpen(false); setNewFile(null); setError(null); }} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: '20px', height: '20px', color: '#64748b' }}><IconX /></div>
              </button>
            </div>

            {isSubmitted ? (
              <div style={{ textAlign: 'center', color: '#10b981', padding: '30px 0' }}>
                <div style={{ fontSize: '3rem' }}>✅</div>
                <p style={{ fontSize: '1.1rem', fontWeight: '500', marginTop: '10px' }}>Demande envoyée avec succès !</p>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest}>
                {/* Type */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>Type *</label>
                  <select 
                    value={newType} 
                    onChange={(e) => setNewType(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: '1.5px solid #e2e8f0', 
                      fontSize: '0.95rem',
                      background: '#fff',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      color: '#1e293b'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#23b2a4'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <option value="medical">Médical</option>
                    <option value="personal">Personnel</option>
                    <option value="authorized_leave">Congé autorisé</option>
                    <option value="unjustified">Non justifié</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                {/* Objet */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>Objet *</label>
                  <input 
                    type="text" 
                    value={newTitle} 
                    onChange={(e) => setNewTitle(e.target.value)} 
                    required 
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: '1.5px solid #e2e8f0', 
                      fontSize: '0.95rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      color: '#1e293b'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#23b2a4'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    placeholder="Ex: Demande de congé..."
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>Description</label>
                  <textarea 
                    rows={3} 
                    value={newDescription} 
                    onChange={(e) => setNewDescription(e.target.value)} 
                    style={{ 
                      width: '100%', 
                      padding: '10px 12px', 
                      borderRadius: '8px', 
                      border: '1.5px solid #e2e8f0', 
                      fontSize: '0.95rem',
                      resize: 'vertical',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      fontFamily: 'inherit',
                      color: '#1e293b'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#23b2a4'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    placeholder="Précisez votre demande..."
                  />
                </div>

                {/* Champs de date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>Date de début *</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      required 
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        border: '1.5px solid #e2e8f0', 
                        fontSize: '0.95rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        color: '#1e293b',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#23b2a4'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>Date de fin *</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      required 
                      style={{ 
                        width: '100%', 
                        padding: '10px 12px', 
                        borderRadius: '8px', 
                        border: '1.5px solid #e2e8f0', 
                        fontSize: '0.95rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        color: '#1e293b',
                        fontFamily: 'inherit'
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = '#23b2a4'}
                      onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                    />
                  </div>
                </div>

                {/* Fichier */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '6px', color: '#1e293b' }}>Document (optionnel)</label>
                  <div style={{ 
                    border: '2px dashed #cbd5e1', 
                    borderRadius: '8px', 
                    padding: '12px',
                    transition: 'border-color 0.2s',
                    background: '#f8fafc'
                  }}>
                    <input 
                      type="file" 
                      onChange={(e) => setNewFile(e.target.files[0])} 
                      style={{ 
                        width: '100%', 
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }} 
                    />
                    {newFile && (
                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: '#23b2a4', 
                        marginTop: '6px',
                        fontWeight: '500'
                      }}>
                        📎 {newFile.name} ({(newFile.size / 1024).toFixed(0)} Ko)
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <div style={{ 
                    color: '#dc2626', 
                    fontSize: '0.85rem', 
                    marginBottom: '14px',
                    padding: '8px 12px',
                    background: '#fef2f2',
                    borderRadius: '6px',
                    border: '1px solid #fca5a5'
                  }}>
                    ⚠️ {error}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '4px' }}>
                  <button 
                    type="button" 
                    onClick={() => { setIsModalOpen(false); setNewFile(null); setError(null); }} 
                    style={{ 
                      padding: '10px 24px', 
                      border: '1.5px solid #cbd5e1', 
                      borderRadius: '8px', 
                      background: 'transparent', 
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      color: '#64748b',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    style={{ 
                      padding: '10px 28px', 
                      background: isSubmitting ? '#94a3b8' : '#23b2a4', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '8px', 
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#1e9b8f'; }}
                    onMouseLeave={(e) => { if (!isSubmitting) e.currentTarget.style.background = '#23b2a4'; }}
                  >
                    {isSubmitting ? 'Envoi...' : 'Envoyer'}
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