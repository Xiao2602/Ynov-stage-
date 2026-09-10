import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { 
  IconArchive, 
  IconSearch, 
  IconFolder, 
  IconDocument, 
  IconEye, 
  IconDownload, 
  IconCheckCircle, 
  IconXCircle, 
  IconClock, 
  IconX 
} from '../components/Icons';
import { apiFetch, apiFetchBlob } from '../api/api';
import './ArchivedDocumentsPage.css';

const ONE_WEEK_DAYS = 7;
const ONE_WEEK_MS = ONE_WEEK_DAYS * 24 * 60 * 60 * 1000;

export default function ArchivedDocumentsPage() {
  const { user, role } = useAuth();
  const [requests, setRequests] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all_week'); // all_week, requests_week, documents_week, all_requests, all_documents
  const [delayFilter, setDelayFilter] = useState('7'); // 7, 14, 30, 0 (all)
  const [requestStatusFilter, setRequestStatusFilter] = useState('all'); // all, approved, rejected
  const [previewItem, setPreviewItem] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3500);
  };

  const isStaff = ['admin', 'rh', 'manager', 'employee'].includes(role);

  // Charger les données (demandes et documents)
  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les demandes de documents
      const reqPromise = isStaff
        ? apiFetch('/api/document-requests/queue?limit=500')
        : apiFetch('/api/document-requests/my?limit=500');

      // 2. Récupérer les documents généraux
      const docPromise = apiFetch('/api/documents/my?archived=all');

      const [resReq, resDoc] = await Promise.allSettled([reqPromise, docPromise]);

      if (resReq.status === 'fulfilled' && resReq.value?.success) {
        const rawList = resReq.value.data || resReq.value.requests || [];
        setRequests(rawList);
      } else {
        setRequests([]);
      }

      if (resDoc.status === 'fulfilled' && resDoc.value?.success) {
        const rawDocs = resDoc.value.documents || resDoc.value.data || [];
        setDocuments(rawDocs);
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Erreur chargement archives :', err);
      showToast('Erreur lors du chargement des archives.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [role]);

  // Normalisation et calcul de l'âge des demandes
  const processedRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === 'approved' || r.status === 'rejected' || r.archived)
      .map((r) => {
        const decisionDateStr = r.approvedAt || r.rejectedAt || r.updatedAt || r.createdAt;
        const decisionTime = decisionDateStr ? new Date(decisionDateStr).getTime() : 0;
        const ageMs = decisionTime ? Math.max(0, Date.now() - decisionTime) : 0;
        const daysSinceDecision = Math.floor(ageMs / (24 * 60 * 60 * 1000));
        const isOneWeekOrMore = daysSinceDecision >= ONE_WEEK_DAYS;
        const isManuallyArchived = Boolean(r.archived);

        return {
          id: r.id,
          sourceType: 'request', // 'request' ou 'document'
          title: r.type || r.documentType || 'Attestation / Document administratif',
          requesterName: r.requesterName || 'Étudiant / Utilisateur',
          requesterEmail: r.requesterEmail || '',
          dateDecision: decisionDateStr,
          status: r.status,
          statusLabel: r.status === 'approved' ? 'Validée' : 'Refusée',
          daysElapsed: daysSinceDecision,
          isAutoArchived: isOneWeekOrMore,
          isManuallyArchived,
          isArchived: Boolean(isManuallyArchived || isOneWeekOrMore),
          rawItem: r
        };
      });
  }, [requests]);

  // Normalisation et calcul de l'âge des documents
  const processedDocuments = useMemo(() => {
    return documents.map((doc) => {
      const dateRefStr = doc.archivedAt || doc.updatedAt || doc.createdAt;
      const dateRefTime = dateRefStr ? new Date(dateRefStr).getTime() : 0;
      const ageMs = dateRefTime ? Math.max(0, Date.now() - dateRefTime) : 0;
      const daysSince = Math.floor(ageMs / (24 * 60 * 60 * 1000));
      const isOneWeekOrMore = daysSince >= ONE_WEEK_DAYS;
      const isManuallyArchived = Boolean(doc.archived);

      return {
        id: doc.id,
        sourceType: 'document',
        title: doc.originalName || doc.title || 'Document archivé',
        requesterName: doc.userName || doc.ownerName || 'Titulaire',
        requesterEmail: doc.userEmail || '',
        dateDecision: dateRefStr,
        status: doc.archived ? 'archived' : 'validated',
        statusLabel: doc.archived ? 'Archivé' : 'Validé',
        daysElapsed: daysSince,
        isAutoArchived: isOneWeekOrMore,
        isManuallyArchived,
        isArchived: Boolean(isManuallyArchived || isOneWeekOrMore),
        rawItem: doc
      };
    });
  }, [documents]);

  // Filtrage combiné
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    // Helper pour filtrer selon le mode ou délai d'archivage
    const matchesDelayOrMode = (item) => {
      if (delayFilter === 'auto_week') {
        return item.daysElapsed >= ONE_WEEK_DAYS;
      }
      if (delayFilter === 'manual') {
        return item.isManuallyArchived;
      }
      if (delayFilter === '14') {
        return item.daysElapsed >= 14 || item.isManuallyArchived;
      }
      if (delayFilter === '30') {
        return item.daysElapsed >= 30 || item.isManuallyArchived;
      }
      if (delayFilter === '0') {
        return item.isArchived;
      }
      // '7' par défaut : 1 semaine post-décision (+7j) OU archivé de son propre chef
      return item.daysElapsed >= ONE_WEEK_DAYS || item.isManuallyArchived;
    };

    // 1. Filtrer selon le type de vue
    let combined = [];

    if (categoryFilter === 'all_week') {
      const reqs = processedRequests.filter((r) => r.isArchived && matchesDelayOrMode(r));
      const docs = processedDocuments.filter((d) => d.isArchived && matchesDelayOrMode(d));
      combined = [...reqs, ...docs];
    } else if (categoryFilter === 'requests_week') {
      combined = processedRequests.filter((r) => r.isArchived && matchesDelayOrMode(r));
    } else if (categoryFilter === 'documents_week') {
      combined = processedDocuments.filter((d) => d.isArchived && matchesDelayOrMode(d));
    } else if (categoryFilter === 'all_requests') {
      combined = processedRequests;
    } else if (categoryFilter === 'all_documents') {
      combined = processedDocuments;
    }

    // 2. Filtre statut demande si pertinent
    if (requestStatusFilter !== 'all') {
      combined = combined.filter((item) => {
        if (item.sourceType === 'request') {
          return item.status === requestStatusFilter;
        }
        return true;
      });
    }

    // 3. Recherche textuelle
    if (query) {
      combined = combined.filter((item) => {
        return (
          item.title.toLowerCase().includes(query) ||
          item.requesterName.toLowerCase().includes(query) ||
          item.requesterEmail.toLowerCase().includes(query) ||
          String(item.id).toLowerCase().includes(query)
        );
      });
    }

    // 4. Tri par date décroissante
    combined.sort((a, b) => new Date(b.dateDecision || 0).getTime() - new Date(a.dateDecision || 0).getTime());

    return combined;
  }, [processedRequests, processedDocuments, categoryFilter, delayFilter, requestStatusFilter, search]);

  // Statistiques pour les cartes d'en-tête
  const stats = useMemo(() => {
    const totalArchivedRequests = processedRequests.filter((r) => r.isArchived).length;
    const autoArchivedRequests = processedRequests.filter((r) => r.daysElapsed >= ONE_WEEK_DAYS).length;
    const totalArchivedDocuments = processedDocuments.filter((d) => d.isArchived).length;
    const autoArchivedDocuments = processedDocuments.filter((d) => d.daysElapsed >= ONE_WEEK_DAYS).length;

    return {
      totalArchived: totalArchivedRequests + totalArchivedDocuments,
      autoRequests: autoArchivedRequests,
      autoDocuments: autoArchivedDocuments
    };
  }, [processedRequests, processedDocuments]);

  // Action : Aperçu d'un élément
  const handlePreview = (item) => {
    setPreviewItem(item);
  };

  // Action : Téléchargement
  const handleDownload = async (item) => {
    try {
      if (item.sourceType === 'document') {
        const blob = await apiFetchBlob(`/api/documents/${item.id}/download`);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.title || `document_${item.id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast(`Document « ${item.title} » téléchargé.`, 'success');
      } else {
        // Demande de document : générer ou télécharger le contenu officiel
        const content = `======================================================================
               MAROC YNOV CAMPUS - CASABLANCA
         ARCHIVES DE LA GESTION DOCUMENTAIRE
======================================================================
RÉFÉRENCE OFFICIELLE : ${item.id}
DOCUMENT             : ${item.title.toUpperCase()}
BÉNÉFICIAIRE         : ${item.requesterName} (${item.requesterEmail || 'N/C'})
STATUT               : ${item.statusLabel.toUpperCase()}
DATE DE TRAITEMENT   : ${item.dateDecision ? new Date(item.dateDecision).toLocaleDateString('fr-FR') : 'N/C'}
ARCHIVÉ AUTOMATIQUE  : OUI (+${item.daysElapsed} jours après traitement)
======================================================================`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Archive_${item.title.replace(/\s+/g, '_')}_${item.id}.txt`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast(`Archive « ${item.title} » téléchargée.`, 'success');
      }
    } catch (err) {
      console.error('Erreur téléchargement :', err);
      showToast('Impossible de télécharger le fichier.', 'error');
    }
  };

  // Action : Restaurer / Désarchiver
  const handleUnarchive = async (item) => {
    try {
      if (item.sourceType === 'document') {
        const res = await apiFetch(`/api/documents/${item.id}/unarchive`, { method: 'PATCH' });
        if (res && res.success) {
          showToast(`Document « ${item.title} » restauré avec succès.`, 'success');
          loadData();
        } else {
          showToast(res?.error || 'Erreur lors de la restauration.', 'error');
        }
      } else {
        const res = await apiFetch(`/api/document-requests/${item.id}/unarchive`, { method: 'PATCH' });
        if (res && res.success) {
          showToast(`Demande de document « ${item.title} » restaurée avec succès.`, 'success');
          loadData();
        } else {
          showToast(res?.error || 'Erreur lors de la restauration.', 'error');
        }
      }
    } catch (err) {
      console.error('Erreur désarchivage :', err);
      showToast('Erreur lors de la restauration.', 'error');
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="archived-docs-page">
      {/* TOAST NOTIFICATION */}
      {toast.message && (
        <div className={`archived-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* HEADER */}
      <header className="archived-header">
        <div>
          <div className="archived-kicker">
            <IconArchive size={16} />
            <span>Gestion Documentaire</span>
          </div>
          <h1>Archives Documentaires</h1>
          <p className="archived-description">
            Consultation des demandes de documents archivées 1 semaine après leur validation ou refus, et des documents archivés après 1 semaine.
          </p>
        </div>
        <button
          type="button"
          className="archived-refresh-btn"
          onClick={loadData}
          title="Actualiser les archives"
        >
          <IconClock size={16} />
          <span>Actualiser</span>
        </button>
      </header>

      {/* STATS CARDS */}
      <section className="archived-stats-grid">
        <div className="archived-stat-card">
          <div className="archived-stat-icon purple">
            <IconArchive size={22} />
          </div>
          <div className="archived-stat-content">
            <span className="archived-stat-value">{stats.totalArchived}</span>
            <span className="archived-stat-label">Total éléments archivés</span>
          </div>
        </div>

        <div className="archived-stat-card">
          <div className="archived-stat-icon blue">
            <IconDocument size={22} />
          </div>
          <div className="archived-stat-content">
            <span className="archived-stat-value">{stats.autoRequests}</span>
            <span className="archived-stat-label">Demandes (+7j post-validation/refus)</span>
          </div>
        </div>

        <div className="archived-stat-card">
          <div className="archived-stat-icon emerald">
            <IconFolder size={22} />
          </div>
          <div className="archived-stat-content">
            <span className="archived-stat-value">{stats.autoDocuments}</span>
            <span className="archived-stat-label">Documents archivés (+7j)</span>
          </div>
        </div>

        <div className="archived-stat-card highlight">
          <div className="archived-stat-icon amber">
            <IconClock size={22} />
          </div>
          <div className="archived-stat-content">
            <span className="archived-stat-value">1 Semaine</span>
            <span className="archived-stat-label">Délai d’archivage automatique</span>
          </div>
        </div>
      </section>

      {/* FILTRES INTERACTIFS */}
      <section className="archived-controls">
        <div className="archived-search-box">
          <IconSearch size={18} className="archived-search-icon" />
          <input
            type="text"
            placeholder="Rechercher par demandeur, intitulé, email ou référence..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="archived-clear-search"
              onClick={() => setSearch('')}
              title="Effacer"
            >
              <IconX size={16} />
            </button>
          )}
        </div>

        <div className="archived-filter-group">
          {/* SÉLECTEUR DE TYPE D'ÉLÉMENT */}
          <div className="archived-select-wrapper">
            <label htmlFor="category-select">Éléments archivés :</label>
            <select
              id="category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all_week">Tous les éléments (1 semaine +)</option>
              <option value="requests_week">Demandes traitées (1 semaine +)</option>
              <option value="documents_week">Documents archivés (1 semaine +)</option>
              <option value="all_requests">Toutes les demandes traitées</option>
              <option value="all_documents">Tous les documents archivés</option>
            </select>
          </div>

          {/* SÉLECTEUR DE DÉLAI D'ARCHIVAGE */}
          <div className="archived-select-wrapper">
            <label htmlFor="delay-select">Règle de sélection :</label>
            <select
              id="delay-select"
              value={delayFilter}
              onChange={(e) => setDelayFilter(e.target.value)}
            >
              <option value="7">Archivés après 1 semaine (auto +7j ou manuels)</option>
              <option value="auto_week">Automatique : 1 semaine (+7j post-validation/refus)</option>
              <option value="manual">Manuel : Archivés de leur propre chef</option>
              <option value="14">Archivés après 2 semaines (14 jours)</option>
              <option value="30">Archivés après 1 mois (30 jours)</option>
              <option value="0">Toutes les archives confondues</option>
            </select>
          </div>

          {/* FILTRE STATUT DEMANDE (SI APPLICABLE) */}
          {(categoryFilter === 'requests_week' || categoryFilter === 'all_requests' || categoryFilter === 'all_week') && (
            <div className="archived-select-wrapper">
              <label htmlFor="status-select">Statut de la demande :</label>
              <select
                id="status-select"
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
              >
                <option value="all">Validées et Refusées</option>
                <option value="approved">Validées uniquement</option>
                <option value="rejected">Refusées uniquement</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* TABLEAU DES ARCHIVES */}
      <section className="archived-table-container">
        <div className="archived-table-header-info">
          <span className="archived-count-badge">
            {filteredItems.length} élément{filteredItems.length > 1 ? 's' : ''} trouvé{filteredItems.length > 1 ? 's' : ''}
          </span>
          <span className="archived-active-filter-label">
            Règle active : <strong>
              {delayFilter === '7' ? 'Archivage 1 semaine post-validation/refus & manuels' :
               delayFilter === 'auto_week' ? 'Archivage automatique 1 semaine (+7 jours après décision)' :
               delayFilter === 'manual' ? 'Archivés de son propre chef par l’utilisateur' :
               delayFilter === '0' ? 'Toutes les archives confondues' : `Archivés depuis plus de ${delayFilter} jours`}
            </strong>
          </span>
        </div>

        {loading ? (
          <div className="archived-loading">
            <div className="archived-spinner" />
            <p>Chargement des archives documentaires...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="archived-empty">
            <div className="archived-empty-icon">
              <IconArchive size={40} />
            </div>
            <h3>Aucune archive trouvée</h3>
            <p>Aucune demande validée/refusée ou document ne correspond aux critères sélectionnés.</p>
          </div>
        ) : (
          <table className="archived-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Type</th>
                <th>Document / Intitulé</th>
                <th>Demandeur / Titulaire</th>
                <th>Date de décision</th>
                <th>Âge / Délai</th>
                <th>Statut</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isRequest = item.sourceType === 'request';
                return (
                  <tr key={`${item.sourceType}-${item.id}`}>
                    {/* TYPE D'ÉLÉMENT */}
                    <td>
                      <span className={`archived-type-badge ${isRequest ? 'request' : 'document'}`}>
                        {isRequest ? <IconDocument size={14} /> : <IconFolder size={14} />}
                        {isRequest ? 'Demande' : 'Document'}
                      </span>
                    </td>

                    {/* TITRE ET RÉFÉRENCE */}
                    <td>
                      <div className="archived-item-title">{item.title}</div>
                      <div className="archived-item-sub">Réf : {item.id}</div>
                    </td>

                    {/* DEMANDEUR */}
                    <td>
                      <div className="archived-user-name">{item.requesterName}</div>
                      {item.requesterEmail && (
                        <div className="archived-user-email">{item.requesterEmail}</div>
                      )}
                    </td>

                    {/* DATE DE TRAITEMENT / DÉCISION */}
                    <td>
                      <div className="archived-date">{formatDate(item.dateDecision)}</div>
                    </td>

                    {/* TEMPS ÉCOULÉ (DELAI) */}
                    <td>
                      <span className={`archived-age-badge ${item.daysElapsed >= 7 ? 'week-plus' : 'week-less'}`}>
                        <IconClock size={13} />
                        {item.daysElapsed === 0
                          ? "Aujourd'hui"
                          : item.daysElapsed === 1
                          ? 'Il y a 1 jour'
                          : `Il y a ${item.daysElapsed} jours`}
                      </span>
                    </td>

                    {/* STATUT */}
                    <td>
                      {isRequest ? (
                        item.isManuallyArchived ? (
                          <span className="archived-status-badge archived" title="Archivée manuellement par l'utilisateur">
                            <IconArchive size={14} /> {item.status === 'approved' ? 'Validée (Manuel)' : 'Refusée (Manuel)'}
                          </span>
                        ) : item.status === 'approved' ? (
                          <span className="archived-status-badge approved" title="Archivée automatiquement 1 semaine après validation">
                            <IconCheckCircle size={14} /> Validée (+7j auto)
                          </span>
                        ) : (
                          <span className="archived-status-badge rejected" title="Archivée automatiquement 1 semaine après refus">
                            <IconXCircle size={14} /> Refusée (+7j auto)
                          </span>
                        )
                      ) : (
                        <span className="archived-status-badge archived">
                          <IconArchive size={14} /> {item.isManuallyArchived ? 'Archivé (Manuel)' : 'Archivé (+7j auto)'}
                        </span>
                      )}
                    </td>

                    {/* ACTIONS (ICÔNES STYLE RÉFÉRENCE) */}
                    <td>
                      <div className="archived-row-actions">
                        {/* APERÇU */}
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handlePreview(item)}
                          title="Aperçu de l'archive"
                        >
                          <IconEye size={16} />
                        </button>

                        {/* TÉLÉCHARGER */}
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handleDownload(item)}
                          title="Télécharger l'archive"
                        >
                          <IconDownload size={16} />
                        </button>

                        {/* RESTAURER / DÉSARCHIVER */}
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => handleUnarchive(item)}
                          title="Restaurer / Désarchiver"
                        >
                          <IconArchive size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* MODAL APERÇU DE L'ARCHIVE */}
      {previewItem && (
        <div className="archived-modal-backdrop" role="presentation" onClick={() => setPreviewItem(null)}>
          <div className="archived-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="archived-modal-header">
              <div>
                <p className="archived-modal-kicker">Aperçu de l'archive documentaire</p>
                <h2>{previewItem.title}</h2>
              </div>
              <button
                type="button"
                className="archived-modal-close"
                onClick={() => setPreviewItem(null)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="archived-modal-meta">
              <div className="archived-modal-meta-row">
                <span>Type :</span>
                <strong>{previewItem.sourceType === 'request' ? 'Demande de document' : 'Document officiel'}</strong>
              </div>
              <div className="archived-modal-meta-row">
                <span>Demandeur / Titulaire :</span>
                <strong>{previewItem.requesterName} ({previewItem.requesterEmail || 'N/C'})</strong>
              </div>
              <div className="archived-modal-meta-row">
                <span>Date de validation / décision :</span>
                <strong>{formatDate(previewItem.dateDecision)}</strong>
              </div>
              <div className="archived-modal-meta-row">
                <span>Ancienneté de l'archive :</span>
                <strong>{previewItem.daysElapsed} jour(s) écoulé(s)</strong>
              </div>
              <div className="archived-modal-meta-row">
                <span>Statut au moment de l'archivage :</span>
                <strong>{previewItem.statusLabel}</strong>
              </div>
            </div>

            <div className="archived-modal-body">
              <pre className="archived-modal-preview-text">
{`======================================================================
               MAROC YNOV CAMPUS - CASABLANCA
       ARCHIVE OFFICIELLE - DIRECTION DES RESSOURCES HUMAINES
======================================================================

RÉFÉRENCE D'ARCHIVE    : ${previewItem.id}
TITRE DU DOCUMENT      : ${previewItem.title.toUpperCase()}
TYPE D'ÉLÉMENT         : ${previewItem.sourceType === 'request' ? 'DEMANDE DE DOCUMENT' : 'DOCUMENT CLASSER'}
BÉNÉFICIAIRE           : ${previewItem.requesterName}
EMAIL DU BÉNÉFICIAIRE  : ${previewItem.requesterEmail || 'Non spécifié'}
DATE DE DÉCISION       : ${formatDate(previewItem.dateDecision)}
DÉLAI DEPUIS DÉCISION  : ${previewItem.daysElapsed} jour(s)
STATUT ADMINISTRATIF   : ${previewItem.statusLabel.toUpperCase()}
RÈGLE D'ARCHIVAGE      : ARCHIVÉ AUTOMATIQUEMENT (+1 SEMAINE POST-VALIDATION/REFUS)

DOCUMENT CERTIFIÉ ET ARCHIVÉ CONFORMÉMENT AUX RÈGLES DE CONSERVATION
MAROC YNOV CAMPUS - DÉPARTEMENT RESSOURCES HUMAINES & SCOLARITÉ
======================================================================`}
              </pre>
            </div>

            <div className="archived-modal-actions">
              <button
                type="button"
                className="archived-btn-secondary"
                onClick={() => setPreviewItem(null)}
              >
                Fermer
              </button>
              <button
                type="button"
                className="archived-btn-primary"
                onClick={() => {
                  handleDownload(previewItem);
                }}
              >
                <IconDownload size={16} /> Télécharger l'archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
