import { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiFetchBlob } from '../api/api';
import { IconDocument, IconEye, IconSearch } from '../components/Icons';
import './GeneratedDocumentsPage.css';

const documentTypeLabels = {
  attestation_reussite: 'Attestation de réussite',
  attestation_sous_reserve: 'Attestation sous réserve',
  certificat_scolarite: 'Certificat de scolarité',
};

function formatDate(value) {
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value?.seconds !== undefined
      ? new Date(value.seconds * 1000)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date non renseignée' : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function recipientName(document) {
  return document.generationData?.studentName || document.userName || document.userEmail || 'Étudiant non renseigné';
}

export default function GeneratedDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let active = true;
    async function loadGeneratedDocuments() {
      setLoading(true);
      setError('');
      try {
        const result = await apiFetch('/documents/dashboard');
        if (!result?.success) throw new Error(result?.error || 'Impossible de charger les documents générés.');
        const generatedDocuments = (result.documents || []).filter((document) => document.storageArea === 'generated' || Object.hasOwn(documentTypeLabels, document.category));
        if (active) setDocuments(generatedDocuments);
      } catch (loadError) {
        if (active) setError(loadError.message || 'Impossible de charger les documents générés.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadGeneratedDocuments();
    return () => { active = false; };
  }, []);

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return documents.filter((document) => {
      const type = document.category || '';
      const matchesType = typeFilter === 'all' || type === typeFilter;
      const matchesSearch = !query || [recipientName(document), document.generationData?.program, document.originalName, document.generationData?.reference]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
      return matchesType && matchesSearch;
    });
  }, [documents, search, typeFilter]);

  const openDocument = async (document) => {
    setOpeningId(document.id);
    setError('');
    try {
      if (document.url) {
        window.open(document.url, '_blank', 'noopener,noreferrer');
        return;
      }
      const blob = await apiFetchBlob(`/documents/${document.id}/view`);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (openError) {
      setError(openError.message || 'Impossible d’ouvrir le document.');
    } finally {
      setOpeningId('');
    }
  };

  return (
    <section className="generated-documents-page">
      <header className="generated-documents-header">
        <div><p>Gestion documentaire</p><h2>Documents générés</h2><span>Retrouvez les attestations et certificats créés par l’administration.</span></div>
        <div className="generated-documents-count"><strong>{documents.length}</strong><span>document{documents.length > 1 ? 's' : ''} généré{documents.length > 1 ? 's' : ''}</span></div>
      </header>

      <div className="generated-documents-toolbar">
        <label className="generated-documents-search"><IconSearch /><input type="search" placeholder="Rechercher un étudiant ou une formation" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filtrer par type"><option value="all">Tous les documents</option>{Object.entries(documentTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>

      {error && <p className="generated-documents-feedback error">{error}</p>}
      {loading ? <p className="generated-documents-feedback">Chargement des documents générés…</p> : filteredDocuments.length === 0 ? <p className="generated-documents-feedback">Aucun document généré ne correspond à votre recherche.</p> : <div className="generated-documents-list">
        {filteredDocuments.map((document) => <article className="generated-document-card" key={document.id}>
          <div className="generated-document-icon"><IconDocument /></div>
          <div className="generated-document-content"><span className="generated-document-type">{documentTypeLabels[document.category] || 'Document administratif'}</span><h3>{recipientName(document)}</h3><p>{document.generationData?.program || document.className || 'Formation non renseignée'}</p><small>Généré le {formatDate(document.createdAt)}{document.generationData?.reference ? ` · Réf. ${document.generationData.reference}` : ''}</small></div>
          <button type="button" className="generated-document-view" onClick={() => openDocument(document)} disabled={openingId === document.id}><IconEye />{openingId === document.id ? 'Ouverture…' : 'Voir le PDF'}</button>
        </article>)}
      </div>}
    </section>
  );
}
