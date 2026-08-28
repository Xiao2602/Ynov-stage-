import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconDocument, IconInbox, IconPlus, IconSearch, IconDownload, IconTrash } from '../components/Icons';
import { apiFetch, apiFetchBlob } from '../api/api';
import './DocumentRequestsPage.css';

const documentTypes = [
  'Attestation de scolarité',
  'Certificat de scolarité',
  'Relevé de notes',
  'Convention de stage',
  'Attestation de réussite',
  'Autre document administratif',
];

function buildFormalMessage(type, userName) {
  return `Bonjour,\n\nJe souhaite effectuer une demande concernant le document suivant : « ${type} ».\n\nJe vous remercie de bien vouloir étudier ma demande et de me tenir informé(e) de sa prise en charge.\n\nJe vous remercie par avance pour votre retour.\n\nCordialement,\n${userName}`;
}

export default function DocumentRequestsPage() {
  const { user, backendUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [type, setType] = useState(documentTypes[0]);
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const userName = user?.displayName || backendUser?.displayName || user?.email || 'Étudiant';
  const [message, setMessage] = useState(buildFormalMessage(documentTypes[0], userName));

  const showToast = (msg, toastType = 'success') => {
    setToast({ message: msg, type: toastType });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3500);
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/document-requests/my');
      if (res && res.success) {
        setRequests(res.data || res.requests || []);
      }
    } catch (err) {
      console.error('Erreur chargement demandes :', err);
      showToast('Impossible de charger vos demandes.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const typeStr = request.type || request.documentType || '';
      const statusStr = request.statusLabel || request.status || '';
      const msgStr = request.message || '';
      return `${request.id} ${typeStr} ${statusStr} ${msgStr}`.toLowerCase().includes(query);
    });
  }, [requests, search]);

  const openModal = () => {
    setType(documentTypes[0]);
    setUrgency('normal');
    setMessage(buildFormalMessage(documentTypes[0], userName));
    setIsModalOpen(true);
  };

  const updateDraft = (nextType) => {
    setMessage(buildFormalMessage(nextType, userName));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      const res = await apiFetch('/api/document-requests', {
        method: 'POST',
        body: JSON.stringify({
          type,
          documentType: type,
          message,
          urgency
        })
      });

      if (res && res.success) {
        showToast('Demande transmise avec succès !', 'success');
        setIsModalOpen(false);
        await loadRequests();
      } else {
        showToast(res?.error || 'Erreur lors de la création.', 'error');
      }
    } catch (err) {
      console.error('Erreur création demande :', err);
      showToast(err.message || 'Erreur lors de la transmission.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette demande ?')) return;

    try {
      const res = await apiFetch(`/api/document-requests/${requestId}/cancel`, {
        method: 'PATCH'
      });
      if (res && res.success) {
        showToast('Demande annulée.', 'info');
        setSelectedDetail(null);
        await loadRequests();
      } else {
        showToast(res?.error || 'Impossible d’annuler.', 'error');
      }
    } catch (err) {
      console.error('Erreur annulation :', err);
      showToast(err.message || 'Erreur lors de l’annulation.', 'error');
    }
  };

  const handleDownloadDoc = async (documentId, filename = 'document') => {
    try {
      showToast('Téléchargement en cours...', 'info');
      const blob = await apiFetchBlob(`/api/documents/${documentId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast('Téléchargement terminé.', 'success');
    } catch (err) {
      console.error('Erreur téléchargement :', err);
      showToast('Impossible de télécharger le document.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="document-request-badge ready">Disponible</span>;
      case 'in_progress':
        return <span className="document-request-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>En cours</span>;
      case 'rejected':
        return <span className="document-request-badge" style={{ background: '#fee2e2', color: '#b91c1c' }}>Refusée</span>;
      case 'cancelled':
        return <span className="document-request-badge" style={{ background: '#f1f5f9', color: '#64748b' }}>Annulée</span>;
      default:
        return <span className="document-request-badge" style={{ background: '#fef3c7', color: '#92400e' }}>En attente</span>;
    }
  };

  return (
    <section className="document-requests-page">
      <header className="document-requests-header">
        <div>
          <p className="document-requests-kicker">Gestion documentaire</p>
          <h1>Demandes de documents</h1>
          <p>Demandez un document administratif et suivez son traitement en temps réel.</p>
        </div>
        <button type="button" className="document-request-primary" onClick={openModal}>
          <IconPlus /> Nouvelle demande
        </button>
      </header>

      <div className="document-requests-toolbar">
        <span>
          <IconInbox /> {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''}
        </span>
        <label className="document-request-search">
          <IconSearch />
          <input
            type="search"
            placeholder="Rechercher une demande"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </div>

      <div className="document-request-list">
        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Chargement de vos demandes...</p>
        ) : filteredRequests.map((request) => {
          const dateStr = request.createdAt
            ? new Date(request.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

          return (
            <article
              className="document-request-item"
              key={request.id}
              onClick={() => setSelectedDetail(request)}
              style={{ cursor: 'pointer' }}
            >
              <div className="document-request-item-icon">
                <IconDocument />
              </div>
              <div style={{ flex: 1 }}>
                <small>{request.id} · {dateStr}</small>
                <h2>{request.type || request.documentType}</h2>
                <p>{request.message}</p>
                {request.rejectionReason && (
                  <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '4px' }}>
                    Motif du refus : {request.rejectionReason}
                  </p>
                )}
                {request.assignedToName && (
                  <small style={{ color: '#0284c7', display: 'block', marginTop: '2px' }}>
                    Prise en charge par : {request.assignedToName}
                  </small>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getStatusBadge(request.status)}
                {request.documentId && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '4px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadDoc(request.documentId, `${request.type}.pdf`);
                    }}
                    title="Télécharger le document prêt"
                  >
                    <IconDownload size={14} /> Télécharger
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {!loading && filteredRequests.length === 0 && (
          <p className="document-request-empty">Aucune demande trouvée.</p>
        )}
      </div>

      {/* MODAL NOUVELLE DEMANDE */}
      {isModalOpen && (
        <div className="document-request-modal-backdrop">
          <section className="document-request-modal" role="dialog" aria-modal="true" aria-labelledby="document-request-title">
            <div className="document-request-modal-header">
              <div>
                <p className="document-requests-kicker">Nouvelle demande</p>
                <h2 id="document-request-title">Demander un document</h2>
              </div>
              <button
                type="button"
                className="document-request-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <label>
                Type de document
                <select
                  value={type}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setType(nextType);
                    updateDraft(nextType);
                  }}
                >
                  {documentTypes.map((docType) => (
                    <option key={docType} value={docType}>{docType}</option>
                  ))}
                </select>
              </label>

              <label style={{ marginTop: '12px' }}>
                Niveau d'urgence
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="tres_urgent">Très urgent</option>
                </select>
              </label>

              <label style={{ marginTop: '12px' }}>
                Message envoyé au service administratif
                <textarea
                  rows="8"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              <p className="document-request-form-help">
                Le message est rédigé automatiquement dans un format formel. Vous pouvez le personnaliser avant l’envoi.
              </p>

              <div className="document-request-modal-actions">
                <button
                  type="button"
                  className="document-request-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="document-request-primary"
                  disabled={submitting || !message.trim()}
                >
                  {submitting ? 'Envoi en cours...' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* MODAL DÉTAILS D'UNE DEMANDE */}
      {selectedDetail && (
        <div className="document-request-modal-backdrop" onClick={() => setSelectedDetail(null)}>
          <section
            className="document-request-modal"
            style={{ maxWidth: '560px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="document-request-modal-header">
              <div>
                <p className="document-requests-kicker">{selectedDetail.id}</p>
                <h2 style={{ fontSize: '1.25rem' }}>{selectedDetail.type || selectedDetail.documentType}</h2>
              </div>
              <button
                type="button"
                className="document-request-close"
                onClick={() => setSelectedDetail(null)}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '8px 0', fontSize: '0.92rem', color: '#334155' }}>
              <p><strong>Statut :</strong> {getStatusBadge(selectedDetail.status)}</p>
              <p style={{ marginTop: '8px' }}>
                <strong>Date de création :</strong>{' '}
                {new Date(selectedDetail.createdAt).toLocaleString('fr-FR')}
              </p>
              {selectedDetail.assignedToName && (
                <p style={{ marginTop: '8px' }}>
                  <strong>Assigné à :</strong> {selectedDetail.assignedToName}
                </p>
              )}
              {selectedDetail.rejectionReason && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b' }}>
                  <strong>Motif de refus :</strong> {selectedDetail.rejectionReason}
                </div>
              )}
              {selectedDetail.approvalNote && (
                <div style={{ marginTop: '12px', padding: '10px', background: '#dcfce7', borderRadius: '6px', color: '#166534' }}>
                  <strong>Note administrative :</strong> {selectedDetail.approvalNote}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <strong>Message de la demande :</strong>
                <pre style={{
                  marginTop: '6px',
                  padding: '12px',
                  background: '#f8fafc',
                  borderRadius: '6px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit',
                  color: '#475569'
                }}>
                  {selectedDetail.message}
                </pre>
              </div>
            </div>

            <div className="document-request-modal-actions" style={{ marginTop: '20px' }}>
              {selectedDetail.status !== 'approved' && selectedDetail.status !== 'cancelled' && (
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#fee2e2',
                    color: '#ef4444',
                    border: 'none',
                    fontWeight: '500'
                  }}
                  onClick={() => handleCancelRequest(selectedDetail.id)}
                >
                  Annuler la demande
                </button>
              )}

              {selectedDetail.documentId && (
                <button
                  type="button"
                  className="document-request-primary"
                  onClick={() => handleDownloadDoc(selectedDetail.documentId, `${selectedDetail.type}.pdf`)}
                >
                  Télécharger le document 📥
                </button>
              )}

              <button
                type="button"
                className="document-request-secondary"
                onClick={() => setSelectedDetail(null)}
              >
                Fermer
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TOAST FLOTTANT */}
      {toast.message && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 20px',
            borderRadius: '8px',
            background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#0284c7' : '#10b981',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}
