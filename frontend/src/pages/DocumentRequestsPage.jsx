import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconDocument, IconInbox, IconPlus, IconSearch, IconDownload, IconTrash, IconArchive, IconSparkles, IconEye } from '../components/Icons';
import { apiFetch, apiFetchBlob } from '../api/api';
import {
  isHtmlDocument,
  buildOfficialDocumentHTML,
  printHtmlDocument
} from '../utils/documentTemplates';
import './DocumentRequestsPage.css';

const documentTypes = [
  'Attestation de scolarité',
  'Certificat de scolarité',
  'Relevé de notes',
  'Convention de stage',
  'Attestation de réussite',
  'Attestation de réussite sous réserve',
  'Autre document administratif',
];

function buildFormalMessage(type, userName) {
  return `Bonjour,\n\nJe souhaite effectuer une demande concernant le document suivant : « ${type} ».\n\nJe vous remercie de bien vouloir étudier ma demande et de me tenir informé(e) de sa prise en charge.\n\nJe vous remercie par avance pour votre retour.\n\nCordialement,\n${userName}`;
}

export default function DocumentRequestsPage() {
  const { user, backendUser, role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [type, setType] = useState(documentTypes[0]);
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  /* Profil Parent : Multi-enfants */
  const isParent = String(role || '').toLowerCase() === 'parent';
  const [childrenList, setChildrenList] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedChildUid, setSelectedChildUid] = useState('all');
  const [targetStudentUid, setTargetStudentUid] = useState('');

  const userName = user?.displayName || backendUser?.displayName || user?.email?.split('@')[0] || 'Étudiant';
  const [message, setMessage] = useState(buildFormalMessage(documentTypes[0], userName));

  const showToast = (msg, toastType = 'success') => {
    setToast({ message: msg, type: toastType });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3500);
  };

  useEffect(() => {
    if (isParent) {
      setChildrenLoading(true);
      apiFetch('/api/users/my-children')
        .then((res) => {
          if (res?.success && Array.isArray(res.children)) {
            setChildrenList(res.children);
            if (res.children.length > 0) {
              setTargetStudentUid(res.children[0].uid);
            }
          }
        })
        .catch((err) => console.error('Erreur chargement enfants :', err))
        .finally(() => setChildrenLoading(false));
    }
  }, [isParent]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (isParent && selectedChildUid && selectedChildUid !== 'all') {
        params.set('studentUid', selectedChildUid);
      }
      const query = params.toString();
      const res = await apiFetch(`/api/document-requests/my${query ? `?${query}` : ''}`);
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
  }, [selectedChildUid]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const typeStr = request.type || request.documentType || '';
      const statusStr = request.statusLabel || request.status || '';
      const msgStr = request.message || '';
      const studentStr = request.studentName || request.requesterName || '';
      return `${request.id} ${typeStr} ${statusStr} ${msgStr} ${studentStr}`.toLowerCase().includes(query);
    });
  }, [requests, search]);

  const openModal = () => {
    setType(documentTypes[0]);
    setUrgency('normal');
    if (isParent && childrenList.length > 0) {
      setTargetStudentUid(selectedChildUid !== 'all' ? selectedChildUid : childrenList[0].uid);
    }
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
      const payload = {
        type,
        documentType: type,
        message,
        urgency
      };
      if (isParent && targetStudentUid) {
        payload.studentUid = targetStudentUid;
      }

      const res = await apiFetch('/api/document-requests', {
        method: 'POST',
        body: JSON.stringify(payload)
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

  const handleDownloadDoc = async (request, filename = 'document') => {
    const isObj = typeof request === 'object' && request !== null;
    const reqObj = isObj ? request : requests.find(r => r.id === request || r.documentId === request);
    const documentId = isObj ? request.documentId : request;

    if (!reqObj?.transferredAt) {
      showToast('Le document sera disponible après son transfert par le service administratif.', 'info');
      return;
    }

    // Si c'est un document officiel HTML (Attestation de réussite, Certificat de scolarité, etc.)
    if (reqObj && isHtmlDocument(reqObj)) {
      try {
        showToast('Génération du PDF en cours...', 'info');
        const blob = await apiFetchBlob(`/api/document-requests/${reqObj.id}/pdf`);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (reqObj.type || reqObj.documentType || 'Document_Officiel').replace(/\s+/g, '_');
        a.download = `${safeName}_${reqObj.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        showToast('Document PDF téléchargé avec succès.', 'success');
        return;
      } catch (err) {
        console.error('Erreur téléchargement PDF :', err);
        const htmlContent = buildOfficialDocumentHTML(reqObj);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (reqObj.type || reqObj.documentType || 'Document_Officiel').replace(/\s+/g, '_');
        a.download = `${safeName}_${reqObj.id}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        showToast('Document téléchargé.', 'info');
        return;
      }
    }

    if (!documentId || String(documentId).startsWith('generated-')) {
      showToast('Aucun fichier physique rattaché.', 'info');
      return;
    }

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

  const getStatusBadge = (status, request) => {
    if (request?.transferredAt) {
      return <span className="document-request-badge ready">Disponible</span>;
    }
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

      {/* SÉLECTEUR MULTI-ENFANTS POUR LE PROFIL PARENT */}
      {isParent && childrenList.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          padding: '12px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
            👨‍👦 Demandes pour :
          </span>
          <button
            type="button"
            onClick={() => setSelectedChildUid('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: selectedChildUid === 'all' ? '1px solid #0ea5e9' : '1px solid #e2e8f0',
              background: selectedChildUid === 'all' ? '#0ea5e9' : '#f8fafc',
              color: selectedChildUid === 'all' ? '#ffffff' : '#475569',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out'
            }}
          >
            Tous mes enfants ({childrenList.length})
          </button>
          {childrenList.map((child) => {
            const isSelected = selectedChildUid === child.uid;
            return (
              <button
                key={child.uid}
                type="button"
                onClick={() => setSelectedChildUid(child.uid)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #0ea5e9' : '1px solid #e2e8f0',
                  background: isSelected ? '#0ea5e9' : '#f8fafc',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out'
                }}
              >
                <span>🎓 {child.displayName || child.email?.split('@')[0]}</span>
                {child.className && (
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: isSelected ? '#ffffff' : '#64748b'
                  }}>
                    {child.className}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isParent && !childrenLoading && childrenList.length === 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '20px',
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fef3c7',
          borderRadius: '12px',
          color: '#b45309',
          fontSize: '0.88rem'
        }}>
          <span>👨‍👦</span>
          <span><strong>Compte Parent :</strong> Aucun profil étudiant n'est actuellement lié à votre compte. Veuillez contacter l'administration pour effectuer le rattachement.</span>
        </div>
      )}

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
                {request.studentName && role === 'parent' && (
                  <small style={{ color: '#0ea5e9', display: 'block', marginTop: '2px', fontWeight: 600 }}>
                    🎓 Étudiant : {request.studentName} {request.className ? `(${request.className})` : ''}
                  </small>
                )}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {getStatusBadge(request.status, request)}
                {request.archived && (
                  <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>Archivée</span>
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
              {role === 'parent' && childrenList.length > 0 && (
                <label style={{ marginBottom: '12px' }}>
                  Demande pour l'enfant
                  <select
                    value={targetStudentUid}
                    onChange={(e) => setTargetStudentUid(e.target.value)}
                    required
                  >
                    {childrenList.map((child) => (
                      <option key={child.uid} value={child.uid}>
                        {child.displayName || child.email?.split('@')[0]} {child.className ? `(${child.className})` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              )}

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

              {Boolean(selectedDetail.transferredAt) && (
                <div style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#065f46',
                  fontSize: '0.88rem'
                }}>
                  <span style={{ fontSize: '1.2rem' }}>✅</span>
                  <div>
                    <strong>Document disponible</strong>
                    <div style={{ color: '#047857', marginTop: '2px' }}>
                      Votre document officiel est transféré et accessible dans votre espace <strong>Mes documents</strong> où vous pouvez le consulter et le télécharger.
                    </div>
                  </div>
                </div>
              )}

              {selectedDetail.archived && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '0.84rem',
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}>
                  <IconArchive size={14} /> Demande archivée
                </span>
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

      {/* MODAL PRÉVISUALISATION ÉTUDIANT */}
      {previewDoc && (
        <div className="document-request-modal-backdrop" role="presentation" onClick={() => setPreviewDoc(null)}>
          <section
            className="document-request-modal"
            style={{ width: 'min(860px, 96%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="document-request-modal-header">
              <div>
                <p className="document-requests-kicker">Document officiel</p>
                <h2 style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                  {previewDoc.title}
                </h2>
              </div>
              <button type="button" className="document-request-close" onClick={() => setPreviewDoc(null)} aria-label="Fermer">×</button>
            </div>

            <iframe
              srcDoc={previewDoc.content}
              title="Aperçu du document officiel"
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                width: '100%',
                minHeight: '520px',
                background: '#fff',
                margin: '12px 0'
              }}
            />

            <div className="document-request-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="document-request-secondary" onClick={() => setPreviewDoc(null)}>Fermer</button>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #059669',
                  background: '#059669',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
                onClick={() => printHtmlDocument(previewDoc.content)}
                title="Imprimer ou enregistrer au format PDF"
              >
                <IconSparkles size={15} /> Imprimer / PDF
              </button>
              <button
                type="button"
                className="document-request-primary"
                onClick={() => handleDownloadDoc(previewDoc.request)}
              >
                <IconDownload size={15} /> Télécharger (PDF)
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
