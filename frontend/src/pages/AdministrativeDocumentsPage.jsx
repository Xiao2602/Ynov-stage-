import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconDocument, IconSearch, IconPlus, IconCheckCircle, IconXCircle } from '../components/Icons';
import { apiFetch } from '../api/api';
import './AdministrativeDocumentsPage.css';

export default function AdministrativeDocumentsPage() {
  const { user, backendUser } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refusalRequest, setRefusalRequest] = useState(null);
  const [refusalMessage, setRefusalMessage] = useState('');
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3500);
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/document-requests/queue');
      if (res && res.success) {
        setRequests(res.data || res.requests || []);
      }
    } catch (err) {
      console.error('Erreur chargement file d’attente :', err);
      showToast('Impossible de charger la file d’attente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const typeOptions = useMemo(
    () => [...new Set(requests.map((request) => request.type || request.documentType || 'Autre'))].sort(),
    [requests]
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const typeStr = request.type || request.documentType || '';
      const nameStr = request.requesterName || request.student || '';
      const idStr = request.id || '';
      const statusStr = request.status || '';

      const matchesSearch = `${nameStr} ${typeStr} ${idStr}`.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || typeStr === typeFilter;
      const matchesStatus = statusFilter === 'all' || statusStr === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requests, search, statusFilter, typeFilter]);

  const handleAssign = async (requestId) => {
    try {
      const agentName = user?.displayName || backendUser?.displayName || user?.email?.split('@')[0] || 'Agent RH';
      const res = await apiFetch(`/api/document-requests/${requestId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          assignedTo: user.uid,
          assignedToName: agentName
        })
      });

      if (res && res.success) {
        showToast('Demande prise en charge.', 'success');
        await loadQueue();
      } else {
        showToast(res?.error || 'Erreur lors de l’affectation.', 'error');
      }
    } catch (err) {
      console.error('Erreur assignation :', err);
      showToast(err.message || 'Erreur d’affectation.', 'error');
    }
  };

  const handleApprove = async () => {
    if (!approvalRequest) return;
    try {
      const res = await apiFetch(`/api/document-requests/${approvalRequest.id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({
          note: approvalNote || 'Votre document a été validé et est prêt.'
        })
      });

      if (res && res.success) {
        showToast('Demande approuvée avec succès !', 'success');
        setApprovalRequest(null);
        setApprovalNote('');
        await loadQueue();
      } else {
        showToast(res?.error || 'Erreur lors de l’approbation.', 'error');
      }
    } catch (err) {
      console.error('Erreur approbation :', err);
      showToast(err.message || 'Erreur lors de la validation.', 'error');
    }
  };

  const openRefusalDialog = (request) => {
    setRefusalRequest(request);
    setRefusalMessage(
      `Bonjour ${request.requesterName || 'l’étudiant'},\n\nAprès examen de votre demande concernant le document « ${request.type || request.documentType} » (${request.id}), nous vous informons que celle-ci ne peut pas être validée en l'état.\n\nMotif : Les justificatifs fournis sont incomplets ou non conformes.\n\nCordialement,\nLe service administratif`
    );
  };

  const confirmRefusal = async () => {
    if (!refusalRequest) return;
    try {
      const res = await apiFetch(`/api/document-requests/${refusalRequest.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: refusalMessage.trim()
        })
      });

      if (res && res.success) {
        showToast('Demande refusée et demandeur notifié.', 'info');
        setRefusalRequest(null);
        setRefusalMessage('');
        await loadQueue();
      } else {
        showToast(res?.error || 'Erreur lors du refus.', 'error');
      }
    } catch (err) {
      console.error('Erreur refus :', err);
      showToast(err.message || 'Erreur lors du refus.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="document-request-status ready">Validé</span>;
      case 'in_progress':
        return <span className="document-request-status review" style={{ background: '#e0f2fe', color: '#0369a1' }}>En cours</span>;
      case 'rejected':
        return <span className="document-request-status" style={{ background: '#fee2e2', color: '#b91c1c' }}>Refusé</span>;
      case 'cancelled':
        return <span className="document-request-status" style={{ background: '#f1f5f9', color: '#64748b' }}>Annulé</span>;
      default:
        return <span className="document-request-status review">En attente</span>;
    }
  };

  return (
    <section className="administrative-page">
      <header className="administrative-header">
        <div>
          <p className="administrative-kicker">Gestion documentaire</p>
          <h1>Demandes à traiter</h1>
          <p>File d'attente des demandes de documents administratifs soumises par les étudiants.</p>
        </div>
        <div className="administrative-summary">
          <strong>{filteredRequests.length}</strong>
          <span>demande{filteredRequests.length > 1 ? 's' : ''} affichée{filteredRequests.length > 1 ? 's' : ''}</span>
        </div>
      </header>

      <div className="administrative-toolbar">
        <label className="administrative-search">
          <IconSearch />
          <input
            type="search"
            placeholder="Rechercher un demandeur ou document"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          aria-label="Filtrer par type de document"
        >
          <option value="all">Tous les types de document</option>
          {typeOptions.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filtrer les demandes"
        >
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="in_progress">En cours</option>
          <option value="approved">Validé</option>
          <option value="rejected">Refusé</option>
          <option value="cancelled">Annulé</option>
        </select>
      </div>

      <div className="administrative-list">
        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Chargement de la file d'attente...</p>
        ) : filteredRequests.map((request) => {
          const submittedStr = request.createdAt
            ? new Date(request.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

          return (
            <article className="document-request-card" key={request.id}>
              <div className="document-request-main">
                <div className="document-request-icon">
                  <IconDocument />
                </div>
                <div>
                  <p className="document-request-id">{request.id}</p>
                  <h2>{request.type || request.documentType}</h2>
                  <p className="document-request-student">
                    <strong>{request.requesterName}</strong> ({request.requesterEmail})
                  </p>
                  <p className="document-request-dates">
                    Reçu le {submittedStr}
                    {request.urgency === 'urgent' && <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '8px' }}>• URGENT</span>}
                  </p>
                  <p style={{ fontSize: '0.86rem', color: '#475569', marginTop: '6px', fontStyle: 'italic' }}>
                    "{request.message}"
                  </p>
                  {request.assignedToName && (
                    <p style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '4px' }}>
                      Pris en charge par : {request.assignedToName}
                    </p>
                  )}
                  {request.rejectionReason && (
                    <p style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>
                      Motif du refus : {request.rejectionReason}
                    </p>
                  )}
                </div>
              </div>

              <div className="document-request-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                {getStatusBadge(request.status)}

                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  {request.status === 'pending' && (
                    <button
                      type="button"
                      className="document-action"
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1' }}
                      onClick={() => handleAssign(request.id)}
                    >
                      Prendre en charge
                    </button>
                  )}

                  {request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'cancelled' && (
                    <>
                      <button
                        type="button"
                        className="document-action reject"
                        onClick={() => openRefusalDialog(request)}
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        className="document-action approve"
                        onClick={() => {
                          setApprovalRequest(request);
                          setApprovalNote('');
                        }}
                      >
                        Valider
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!loading && filteredRequests.length === 0 && (
          <p className="administrative-empty">Aucune demande ne correspond à vos filtres.</p>
        )}
      </div>

      {/* MODAL VALIDATION */}
      {approvalRequest && (
        <div className="refusal-modal-backdrop" role="presentation">
          <section className="refusal-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <div className="refusal-modal-header">
              <div>
                <p className="administrative-kicker">Validation de la demande</p>
                <h2 id="approval-title">Approuver « {approvalRequest.type || approvalRequest.documentType} »</h2>
              </div>
              <button
                type="button"
                className="refusal-close"
                onClick={() => setApprovalRequest(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p className="refusal-modal-intro">
              Vous pouvez ajouter une note d'accompagnement qui sera transmise à l'étudiant ({approvalRequest.requesterName}).
            </p>
            <textarea
              className="refusal-message"
              placeholder="Ex: Votre attestation a été générée et est disponible."
              value={approvalNote}
              onChange={(event) => setApprovalNote(event.target.value)}
              rows="6"
            />
            <div className="refusal-modal-actions">
              <button
                type="button"
                className="document-action"
                onClick={() => setApprovalRequest(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="document-action approve"
                onClick={handleApprove}
              >
                Confirmer l'approbation
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL REFUS */}
      {refusalRequest && (
        <div className="refusal-modal-backdrop" role="presentation">
          <section className="refusal-modal" role="dialog" aria-modal="true" aria-labelledby="refusal-title">
            <div className="refusal-modal-header">
              <div>
                <p className="administrative-kicker">Refus de la demande</p>
                <h2 id="refusal-title">Justification à envoyer</h2>
              </div>
              <button
                type="button"
                className="refusal-close"
                onClick={() => setRefusalRequest(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <p className="refusal-modal-intro">
              Le motif du refus est obligatoire et sera notifié directement au demandeur.
            </p>
            <textarea
              className="refusal-message"
              value={refusalMessage}
              onChange={(event) => setRefusalMessage(event.target.value)}
              rows="10"
              aria-label="Message de refus"
            />
            <div className="refusal-modal-actions">
              <button
                type="button"
                className="document-action"
                onClick={() => setRefusalRequest(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                className="document-action reject"
                onClick={confirmRefusal}
                disabled={!refusalMessage.trim()}
              >
                Confirmer le refus
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
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
