import { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiFetchBlob } from '../api/api';
import { IconClock, IconDocument, IconEye, IconSearch } from '../components/Icons';
import './AdministrativeDocumentsPage.css';

const checks = [
  { key: 'complete', label: 'Complet' },
  { key: 'signed', label: 'Signé' },
  { key: 'onTime', label: 'Dans les délais' },
];

function formatDate(value) {
  if (!value) return 'Date non renseignée';
  const date = typeof value?.toDate === 'function' ? value.toDate() : value?.seconds !== undefined ? new Date(value.seconds * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non renseignée' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getRequestStatus(request) {
  const issues = [
    !request.complete && 'Incomplet',
    !request.signed && 'Signature manquante',
    !request.onTime && 'Délai dépassé',
  ].filter(Boolean);
  return issues.length ? issues.join(' · ') : 'À valider';
}

function toRequest(document) {
  return {
    id: document.id,
    documentId: document.id,
    documentUrl: document.url || '',
    student: document.userName || document.userEmail || 'Utilisateur',
    className: document.className || document.program || 'Formation non renseignée',
    type: document.category || 'Document administratif',
    originalName: document.originalName || 'Document sans nom',
    submittedAt: formatDate(document.createdAt),
    deadline: 'Non renseignée',
    complete: true,
    signed: true,
    onTime: true,
    status: document.archived ? 'Archivé' : 'À valider',
  };
}

export default function AdministrativeDocumentsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refusalRequest, setRefusalRequest] = useState(null);
  const [refusalMessage, setRefusalMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function loadRequests() {
      setLoading(true);
      setError('');
      try {
        const result = await apiFetch('/documents/dashboard');
        if (!result.success) throw new Error(result.error);
        if (active) setRequests((result.documents || []).map(toRequest));
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger les documents à traiter.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRequests();
    return () => { active = false; };
  }, []);

  const typeOptions = useMemo(() => [...new Set(requests.map((request) => request.type))].sort(), [requests]);
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch = `${request.student} ${request.className} ${request.type} ${request.originalName}`.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || request.status.includes(statusFilter);
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requests, search, statusFilter, typeFilter]);

  const updateRequest = (id, nextStatus) => setRequests((current) => current.map((request) => request.id === id ? { ...request, status: nextStatus } : request));
  const toggleCheck = (id, key) => setRequests((current) => current.map((request) => {
    if (request.id !== id) return request;
    const next = { ...request, [key]: !request[key] };
    return { ...next, status: getRequestStatus(next) };
  }));
  const buildRefusalMessage = (request) => {
    const reasons = checks.filter((check) => !request[check.key]).map((check) => check.key === 'complete' ? 'le dossier transmis est incomplet' : check.key === 'signed' ? 'la signature requise est absente' : 'le document a été transmis hors du délai prévu');
    const reasonText = (reasons.length ? reasons : ['les éléments fournis ne permettent pas sa validation en l’état']).map((reason) => `- ${reason}`).join('\n');
    return `Bonjour ${request.student},\n\nAprès examen de votre document « ${request.originalName} », nous ne pouvons pas le valider pour le moment, pour les raisons suivantes :\n${reasonText}\n\nCordialement,\nLe service administratif`;
  };
  const openRefusalDialog = (request) => { setRefusalRequest(request); setRefusalMessage(buildRefusalMessage(request)); };
  const confirmRefusal = () => { if (!refusalRequest) return; updateRequest(refusalRequest.id, 'Refusé'); setRefusalRequest(null); setRefusalMessage(''); };

  const openDocument = async (request) => {
    setOpeningId(request.id);
    setError('');
    try {
      if (request.documentUrl) {
        window.open(request.documentUrl, '_blank', 'noopener,noreferrer');
        return;
      }
      const blob = await apiFetchBlob(`/documents/${request.documentId}/view`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (openError) {
      setError(openError.message || 'Impossible d’ouvrir le document.');
    } finally {
      setOpeningId('');
    }
  };

  return <section className="administrative-page">
    <header className="administrative-header"><div><p className="administrative-kicker">Gestion documentaire</p><h1>Demandes à traiter</h1><p>Consultez le fichier transmis puis contrôlez sa conformité avant validation.</p></div><div className="administrative-summary"><strong>{filteredRequests.length}</strong><span>documents affichés</span></div></header>
    {error && <p className="administrative-empty">{error}</p>}
    <div className="administrative-toolbar"><label className="administrative-search"><IconSearch /><input type="search" placeholder="Rechercher un demandeur" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrer par type de document"><option value="all">Tous les types de document</option>{typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer les demandes"><option value="all">Tous les statuts</option><option value="À valider">À valider</option><option value="Signature manquante">Signature manquante</option><option value="Incomplet">Incomplet</option><option value="Délai dépassé">Délai dépassé</option><option value="Validé">Validé</option><option value="Refusé">Refusé</option></select></div>
    <div className="administrative-list">
      {loading ? <p className="administrative-empty">Chargement des documents à traiter…</p> : filteredRequests.map((request) => <article className="document-request-card" key={request.id}><div className="document-request-main"><div className="document-request-icon"><IconDocument /></div><div><p className="document-request-id">{request.id}</p><h2>{request.originalName}</h2><p className="document-request-student">{request.student} · {request.className}</p><p className="document-request-dates">Reçu le {request.submittedAt} · Catégorie : {request.type}</p></div></div><div className="document-checks">{checks.map((check) => <button type="button" className={`document-check ${request[check.key] ? 'valid' : 'invalid'}`} key={check.key} onClick={() => toggleCheck(request.id, check.key)}><span>{request[check.key] ? '✓' : '!'}</span>{check.label}</button>)}</div><div className="document-request-actions"><span className={`document-request-status ${request.status === 'À valider' || request.status === 'Validé' ? 'ready' : 'review'}`}>{request.status}</span><button type="button" className="document-action view" onClick={() => openDocument(request)} disabled={openingId === request.id}><IconEye /> {openingId === request.id ? 'Ouverture…' : 'Voir le document'}</button><button type="button" className="document-action reject" onClick={() => openRefusalDialog(request)}>Refuser</button><button type="button" className="document-action approve" disabled={request.status !== 'À valider'} onClick={() => updateRequest(request.id, 'Validé')}>Valider</button></div></article>)}
      {!loading && filteredRequests.length === 0 && <p className="administrative-empty">Aucun document ne correspond à vos filtres.</p>}
    </div>
    <p className="administrative-footnote"><IconClock /> Les contrôles et décisions seront sauvegardés lorsque le workflow de validation sera connecté au serveur.</p>
    {refusalRequest && <div className="refusal-modal-backdrop" role="presentation"><section className="refusal-modal" role="dialog" aria-modal="true" aria-labelledby="refusal-title"><div className="refusal-modal-header"><div><p className="administrative-kicker">Refus du document</p><h2 id="refusal-title">Justification à envoyer</h2></div><button type="button" className="refusal-close" onClick={() => setRefusalRequest(null)} aria-label="Fermer">×</button></div><p className="refusal-modal-intro">Le message est préparé selon les contrôles non conformes. Vous pouvez le modifier avant de confirmer.</p><textarea className="refusal-message" value={refusalMessage} onChange={(event) => setRefusalMessage(event.target.value)} rows="12" aria-label="Message de refus" /><div className="refusal-modal-actions"><button type="button" className="document-action" onClick={() => setRefusalRequest(null)}>Annuler</button><button type="button" className="document-action reject" onClick={confirmRefusal} disabled={!refusalMessage.trim()}>Confirmer le refus</button></div></section></div>}
  </section>;
}
