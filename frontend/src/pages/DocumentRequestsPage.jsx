import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiFetch } from '../api/api';
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
  { id: 'DOC-REQ-2026-014', type: 'Attestation de scolarité', date: '12 août 2026', status: 'En cours', message: 'Demande transmise au service administratif.', childUid: null },
  { id: 'DOC-REQ-2026-009', type: 'Relevé de notes', date: '28 juillet 2026', status: 'Disponible', message: 'Votre document est disponible au téléchargement.', childUid: null },
];

function buildFormalMessage(type, requesterName) {
  return `Bonjour,\n\nJe souhaite effectuer une demande concernant le document suivant : « ${type} ».\n\nJe vous remercie de bien vouloir étudier cette demande et de me tenir informé(e) de sa prise en charge.\n\nJe vous remercie par avance pour votre retour.\n\nCordialement,\n${requesterName}`;
}

export default function DocumentRequestsPage() {
  const { user, backendUser, role } = useAuth();
  const isParent = role === 'parent';
  const [requests, setRequests] = useState(initialRequests);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [childrenError, setChildrenError] = useState('');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [type, setType] = useState(documentTypes[0]);
  const userName = user?.displayName || backendUser?.displayName || user?.email || 'Utilisateur';
  const selectedChild = children.find((child) => (child.uid || child.id) === selectedChildId) || null;
  const requesterName = isParent
    ? selectedChild?.displayName || selectedChild?.name || selectedChild?.email || 'votre enfant'
    : userName;
  const [message, setMessage] = useState(buildFormalMessage(documentTypes[0], userName));

  useEffect(() => {
    let active = true;

    async function loadChildren() {
      if (!isParent) {
        if (active) {
          setChildren([]);
          setSelectedChildId('');
          setRequests(initialRequests);
        }
        return;
      }

      setChildrenError('');
      setRequests([]);
      try {
        const result = await apiFetch('/users/my-children');
        if (!result.success) throw new Error(result.error);
        const nextChildren = result.children || [];
        if (!active) return;
        setChildren(nextChildren);
        setSelectedChildId((current) => {
          const ids = nextChildren.map((child) => child.uid || child.id).filter(Boolean);
          return ids.includes(current) ? current : ids[0] || '';
        });
      } catch (error) {
        if (active) {
          setChildren([]);
          setChildrenError(error.message || 'Impossible de charger les enfants associés.');
        }
      }
    }

    loadChildren();
    return () => { active = false; };
  }, [isParent]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests
      .filter((request) => !isParent || request.childUid === selectedChildId)
      .filter((request) => `${request.id} ${request.type} ${request.status}`.toLowerCase().includes(query));
  }, [isParent, requests, search, selectedChildId]);

  const openModal = () => {
    setType(documentTypes[0]);
    setMessage(buildFormalMessage(documentTypes[0], requesterName));
    setIsModalOpen(true);
  };

  const updateDraft = (nextType) => setMessage(buildFormalMessage(nextType, requesterName));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isParent && !selectedChildId) return;
    setRequests((current) => [{
      id: `DOC-REQ-2026-${String(current.length + 15).padStart(3, '0')}`,
      type,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'En cours',
      message: 'Demande transmise au service administratif.',
      childUid: isParent ? selectedChildId : null,
    }, ...current]);
    setIsModalOpen(false);
  };

  const title = isParent ? 'Demandes de documents de mes enfants' : 'Demandes de documents';
  const subtitle = isParent
    ? selectedChild ? `Consultez et créez les demandes concernant ${selectedChild.displayName || selectedChild.name || selectedChild.email || 'votre enfant'}.` : 'Sélectionnez un enfant pour consulter ses demandes.'
    : 'Demandez un document administratif et suivez son traitement.';

  return <section className="document-requests-page">
    <header className="document-requests-header">
      <div><p className="document-requests-kicker">Gestion documentaire</p><h1>{title}</h1><p>{subtitle}</p></div>
      <div style={{ display: 'flex', alignItems: 'end', gap: '12px', flexWrap: 'wrap' }}>
        {isParent && <label style={{ display: 'grid', gap: '6px', color: '#475569', fontSize: '.8rem', fontWeight: 600 }}>Enfant concerné
          <select value={selectedChildId} onChange={(event) => setSelectedChildId(event.target.value)} disabled={!children.length} style={{ minWidth: '220px', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#334155', font: 'inherit' }}>
            <option value="">{children.length ? 'Choisir un enfant' : 'Aucun enfant associé'}</option>
            {children.map((child) => { const childId = child.uid || child.id; return childId ? <option key={childId} value={childId}>{child.displayName || child.name || child.email || 'Enfant sans nom'}</option> : null; })}
          </select>
        </label>}
        <button type="button" className="document-request-primary" onClick={openModal} disabled={isParent && !selectedChildId}><IconPlus /> Nouvelle demande</button>
      </div>
    </header>
    {childrenError && <p className="document-request-empty">{childrenError}</p>}
    <div className="document-requests-toolbar">
      <span><IconInbox /> {filteredRequests.length} demande{filteredRequests.length > 1 ? 's' : ''}</span>
      <label className="document-request-search"><IconSearch /><input type="search" placeholder="Rechercher une demande" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
    </div>
    <div className="document-request-list">
      {filteredRequests.map((request) => <article className="document-request-item" key={request.id}><div className="document-request-item-icon"><IconDocument /></div><div><small>{request.id} · {request.date}</small><h2>{request.type}</h2><p>{request.message}</p></div><span className={`document-request-badge ${request.status === 'Disponible' ? 'ready' : ''}`}>{request.status}</span></article>)}
      {filteredRequests.length === 0 && <p className="document-request-empty">{isParent && selectedChild ? 'Aucune demande pour cet enfant.' : 'Aucune demande trouvée.'}</p>}
    </div>

    {isModalOpen && <div className="document-request-modal-backdrop"><section className="document-request-modal" role="dialog" aria-modal="true" aria-labelledby="document-request-title"><div className="document-request-modal-header"><div><p className="document-requests-kicker">Nouvelle demande</p><h2 id="document-request-title">Demander un document{isParent && selectedChild ? ` pour ${selectedChild.displayName || selectedChild.name || selectedChild.email}` : ''}</h2></div><button type="button" className="document-request-close" onClick={() => setIsModalOpen(false)} aria-label="Fermer">×</button></div><form onSubmit={handleSubmit}><label>Type de document<select value={type} onChange={(event) => { const nextType = event.target.value; setType(nextType); updateDraft(nextType); }}>{documentTypes.map((documentType) => <option key={documentType}>{documentType}</option>)}</select></label><label>Message envoyé au service administratif<textarea rows="9" value={message} onChange={(event) => setMessage(event.target.value)} /></label><p className="document-request-form-help">Le message est rédigé automatiquement dans un format formel. Vous pouvez le modifier avant l’envoi.</p><div className="document-request-modal-actions"><button type="button" className="document-request-secondary" onClick={() => setIsModalOpen(false)}>Annuler</button><button type="submit" className="document-request-primary">Envoyer la demande</button></div></form></section></div>}
  </section>;
}
