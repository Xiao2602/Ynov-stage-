import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { IconDocument, IconInbox, IconPlus, IconSearch } from '../components/Icons';
import './DocumentRequestsPage.css';

const documentTypes = [
  'Attestation de scolarité',
  'Certificat de scolarité',
  'Relevé de notes',
  'Convention de stage',
  'Attestation de réussite',
  'Autre document administratif',
];

const initialRequests = [
  { id: 'DOC-REQ-2026-014', type: 'Attestation de scolarité', date: '12 août 2026', status: 'En cours', message: 'Demande transmise au service administratif.' },
  { id: 'DOC-REQ-2026-009', type: 'Relevé de notes', date: '28 juillet 2026', status: 'Disponible', message: 'Votre document est disponible au téléchargement.' },
];

function buildFormalMessage(type, userName) {
  return `Bonjour,\n\nJe souhaite effectuer une demande concernant le document suivant : « ${type} ».\n\nJe vous remercie de bien vouloir étudier ma demande et de me tenir informé(e) de sa prise en charge.\n\nJe vous remercie par avance pour votre retour.\n\nCordialement,\n${userName}`;
}

export default function DocumentRequestsPage() {
  const { user, backendUser } = useAuth();
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState(documentTypes[0]);
  const userName = user?.displayName || backendUser?.displayName || user?.email || 'Utilisateur';
  const [message, setMessage] = useState(buildFormalMessage(documentTypes[0], userName));

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => `${request.id} ${request.type} ${request.status}`.toLowerCase().includes(query));
  }, [requests, search]);

  const openModal = () => {
    setType(documentTypes[0]);
    setMessage(buildFormalMessage(documentTypes[0], userName));
    setIsModalOpen(true);
  };

  const updateDraft = (nextType) => {
    setMessage(buildFormalMessage(nextType, userName));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setRequests((current) => [{
      id: `DOC-REQ-2026-${String(current.length + 15).padStart(3, '0')}`,
      type,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'En cours',
      message: 'Demande transmise au service administratif.',
    }, ...current]);
    setIsModalOpen(false);
  };

  return (
    <section className="document-requests-page">
      <header className="document-requests-header">
        <div><p className="document-requests-kicker">Gestion documentaire</p><h1>Demandes de documents</h1><p>Demandez un document administratif et suivez son traitement.</p></div>
        <button type="button" className="document-request-primary" onClick={openModal}><IconPlus /> Nouvelle demande</button>
      </header>
      <div className="document-requests-toolbar">
        <span><IconInbox /> {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''}</span>
        <label className="document-request-search"><IconSearch /><input type="search" placeholder="Rechercher une demande" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
      </div>
      <div className="document-request-list">
        {filteredRequests.map((request) => <article className="document-request-item" key={request.id}><div className="document-request-item-icon"><IconDocument /></div><div><small>{request.id} · {request.date}</small><h2>{request.type}</h2><p>{request.message}</p></div><span className={`document-request-badge ${request.status === 'Disponible' ? 'ready' : ''}`}>{request.status}</span></article>)}
        {filteredRequests.length === 0 && <p className="document-request-empty">Aucune demande trouvée.</p>}
      </div>

      {isModalOpen && <div className="document-request-modal-backdrop"><section className="document-request-modal" role="dialog" aria-modal="true" aria-labelledby="document-request-title"><div className="document-request-modal-header"><div><p className="document-requests-kicker">Nouvelle demande</p><h2 id="document-request-title">Demander un document</h2></div><button type="button" className="document-request-close" onClick={() => setIsModalOpen(false)} aria-label="Fermer">×</button></div><form onSubmit={handleSubmit}><label>Type de document<select value={type} onChange={(event) => { const nextType = event.target.value; setType(nextType); updateDraft(nextType); }}>{documentTypes.map((documentType) => <option key={documentType}>{documentType}</option>)}</select></label><label>Message envoyé au service administratif<textarea rows="9" value={message} onChange={(event) => setMessage(event.target.value)} /></label><p className="document-request-form-help">Le message est rédigé automatiquement dans un format formel. Vous pouvez le modifier avant l’envoi.</p><div className="document-request-modal-actions"><button type="button" className="document-request-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button><button type="submit" className="document-request-primary">Envoyer la demande</button></div></form></section></div>}
    </section>
  );
}
