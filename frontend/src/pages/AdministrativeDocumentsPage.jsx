import { useMemo, useState } from 'react';
import { IconClock, IconDocument, IconSearch } from '../components/Icons';
import './AdministrativeDocumentsPage.css';

const initialRequests = [
  { id: 'DOC-2026-104', student: 'Yassine Alami', className: 'Bachelor 2 - Informatique', type: 'Convention de stage', submittedAt: '18 août 2026', deadline: '28 août 2026', complete: true, signed: true, onTime: true, status: 'À valider' },
  { id: 'DOC-2026-103', student: 'Manel Outaleb', className: 'Bachelor 1 - Informatique', type: 'Attestation de scolarité', submittedAt: '17 août 2026', deadline: '25 août 2026', complete: true, signed: false, onTime: true, status: 'Signature manquante' },
  { id: 'DOC-2026-102', student: 'Omar Bennani', className: 'Bachelor 3 - Informatique', type: 'Justificatif administratif', submittedAt: '12 août 2026', deadline: '15 août 2026', complete: false, signed: true, onTime: false, status: 'Incomplet' },
  { id: 'DOC-2026-101', student: 'Sara Bennani', className: 'Bachelor 2 - Informatique', type: 'Convention de stage', submittedAt: '08 août 2026', deadline: '18 août 2026', complete: true, signed: true, onTime: false, status: 'Hors délai' },
];

const checks = [
  { key: 'complete', label: 'Complet' },
  { key: 'signed', label: 'Signé' },
  { key: 'onTime', label: 'Dans les délais' },
];

export default function AdministrativeDocumentsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refusalRequest, setRefusalRequest] = useState(null);
  const [refusalMessage, setRefusalMessage] = useState('');

  const typeOptions = useMemo(
    () => [...new Set(requests.map((request) => request.type))].sort(),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const matchesSearch = `${request.student} ${request.className} ${request.type} ${request.id}`.toLowerCase().includes(query);
      const matchesType = typeFilter === 'all' || request.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requests, search, statusFilter, typeFilter]);

  const updateRequest = (id, nextStatus) => {
    setRequests((current) => current.map((request) => (
      request.id === id ? { ...request, status: nextStatus } : request
    )));
  };

  const buildRefusalMessage = (request) => {
    const reasons = checks
      .filter((check) => !request[check.key])
      .map((check) => {
        if (check.key === 'complete') return 'le dossier transmis est incomplet';
        if (check.key === 'signed') return 'la signature requise est absente';
        return 'le document a été transmis hors du délai prévu';
      });
    const reasonText = (reasons.length > 0 ? reasons : ['les éléments fournis ne permettent pas sa validation en l’état'])
      .map((reason) => `- ${reason}`)
      .join('\n');

    return `Bonjour ${request.student},\n\nAprès examen de votre demande concernant le document « ${request.type} » (${request.id}), nous vous informons que celle-ci ne peut pas être validée pour le moment, pour les raisons suivantes :\n${reasonText}\n\nNous vous invitons à régulariser votre dossier et à transmettre les éléments manquants dans les meilleurs délais.\n\nCordialement,\nLe service administratif`;
  };

  const openRefusalDialog = (request) => {
    setRefusalRequest(request);
    setRefusalMessage(buildRefusalMessage(request));
  };

  const confirmRefusal = () => {
    if (!refusalRequest) return;
    setRequests((current) => current.map((request) => (
      request.id === refusalRequest.id ? { ...request, status: 'Refusé', refusalMessage } : request
    )));
    setRefusalRequest(null);
    setRefusalMessage('');
  };

  const toggleCheck = (id, key) => {
    setRequests((current) => current.map((request) => {
      if (request.id !== id) return request;
      const next = { ...request, [key]: !request[key] };
      const isReady = checks.every((check) => next[check.key]);
      return { ...next, status: isReady ? 'À valider' : 'À vérifier' };
    }));
  };

  return (
    <section className="administrative-page">
      <header className="administrative-header">
        <div>
          <p className="administrative-kicker">Gestion documentaire</p>
          <h1>Demandes à traiter</h1>
          <p>Contrôlez la conformité des documents avant leur validation.</p>
        </div>
        <div className="administrative-summary"><strong>{filteredRequests.length}</strong><span>demandes affichées</span></div>
      </header>

      <div className="administrative-toolbar">
        <label className="administrative-search"><IconSearch /><input type="search" placeholder="Rechercher un demandeur" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrer par type de document">
          <option value="all">Tous les types de document</option>
          {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrer les demandes">
          <option value="all">Tous les statuts</option>
          <option value="À valider">À valider</option>
          <option value="À vérifier">À vérifier</option>
          <option value="Signature manquante">Signature manquante</option>
          <option value="Incomplet">Incomplet</option>
          <option value="Hors délai">Hors délai</option>
          <option value="Validé">Validé</option>
          <option value="Refusé">Refusé</option>
        </select>
      </div>

      <div className="administrative-list">
        {filteredRequests.map((request) => (
          <article className="document-request-card" key={request.id}>
            <div className="document-request-main">
              <div className="document-request-icon"><IconDocument /></div>
              <div><p className="document-request-id">{request.id}</p><h2>{request.type}</h2><p className="document-request-student">{request.student} · {request.className}</p><p className="document-request-dates">Reçu le {request.submittedAt} · Échéance : {request.deadline}</p></div>
            </div>
            <div className="document-checks">
              {checks.map((check) => <button type="button" className={`document-check ${request[check.key] ? 'valid' : 'invalid'}`} key={check.key} onClick={() => toggleCheck(request.id, check.key)}><span>{request[check.key] ? '✓' : '!'}</span>{check.label}</button>)}
            </div>
            <div className="document-request-actions">
              <span className={`document-request-status ${request.status === 'À valider' ? 'ready' : 'review'}`}>{request.status}</span>
              <button type="button" className="document-action reject" onClick={() => openRefusalDialog(request)}>Refuser</button>
              <button type="button" className="document-action approve" disabled={request.status !== 'À valider'} onClick={() => updateRequest(request.id, 'Validé')}>Valider</button>
            </div>
          </article>
        ))}
        {filteredRequests.length === 0 && <p className="administrative-empty">Aucune demande ne correspond à vos filtres.</p>}
      </div>
      <p className="administrative-footnote"><IconClock /> Les demandes affichées sont une vue frontend de démonstration. La validation durable nécessitera une synchronisation avec une source documentaire côté serveur.</p>

      {refusalRequest && (
        <div className="refusal-modal-backdrop" role="presentation">
          <section className="refusal-modal" role="dialog" aria-modal="true" aria-labelledby="refusal-title">
            <div className="refusal-modal-header">
              <div><p className="administrative-kicker">Refus de la demande</p><h2 id="refusal-title">Justification à envoyer</h2></div>
              <button type="button" className="refusal-close" onClick={() => setRefusalRequest(null)} aria-label="Fermer">×</button>
            </div>
            <p className="refusal-modal-intro">Le message a été rédigé automatiquement à partir des contrôles non conformes. Vous pouvez le modifier avant l’envoi.</p>
            <textarea className="refusal-message" value={refusalMessage} onChange={(event) => setRefusalMessage(event.target.value)} rows="12" aria-label="Message de refus" />
            <div className="refusal-modal-actions">
              <button type="button" className="document-action" onClick={() => setRefusalRequest(null)}>Annuler</button>
              <button type="button" className="document-action reject" onClick={confirmRefusal} disabled={!refusalMessage.trim()}>Confirmer le refus</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
