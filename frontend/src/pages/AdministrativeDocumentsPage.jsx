import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  IconDocument,
  IconSearch,
  IconCheck,
  IconX,
  IconEye,
  IconArchive,
  IconSparkles,
  IconDownload,
  IconUpload,
  IconForward,
  IconTrash
} from '../components/Icons';
import { apiFetch, apiFetchBlob } from '../api/api';
import {
  isHtmlDocument,
  buildOfficialDocumentHTML,
  buildGenericDocument,
  printHtmlDocument
} from '../utils/documentTemplates';
import './AdministrativeDocumentsPage.css';

export default function AdministrativeDocumentsPage({ initialTab = 'requests', generatedOnly = false, hideGeneratedTab = false }) {
  const { user, backendUser, role } = useAuth();
  const isAdmin = role === 'admin';
  const isRh = role === 'rh';
  const isManager = role === 'manager';

  const [searchParams] = useSearchParams();
  const querySearch = searchParams.get('search') || searchParams.get('id') || '';

  /* ---- ÉTAT ---- */
  const [requests, setRequests]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState(querySearch);
  const [typeFilter, setTypeFilter]       = useState('all');
  const [statusFilter, setStatusFilter]   = useState('all');
  const [archiveFilter, setArchiveFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [activeTab, setActiveTab]           = useState(generatedOnly ? 'generated' : initialTab);

  // Modals

  const [refusalRequest, setRefusalRequest]   = useState(null);
  const [refusalMessage, setRefusalMessage]   = useState('');
  const [approvalRequest, setApprovalRequest] = useState(null);
  const [approvalNote, setApprovalNote]       = useState('');
  const [previewDoc, setPreviewDoc]           = useState(null);   // { docType, studentName, content, request }
  const [transferRequest, setTransferRequest] = useState(null);
  const [transferMessage, setTransferMessage] = useState('');

  useEffect(() => {
    setActiveTab(generatedOnly ? 'generated' : initialTab);
  }, [generatedOnly, initialTab]);

  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('id') || '';
    if (q) setSearch(q);
  }, [searchParams]);

  // Si le compte connecté est un manager d'une filière pédagogique spécifique, pré-sélectionner sa filière
  // (Les RH et Admins traitent/supervisent l'ensemble des filières et gardent 'all' par défaut)
  useEffect(() => {
    if (isManager && backendUser?.department) {
      const dept = backendUser.department.trim();
      const lower = dept.toLowerCase();
      if (dept && !['direction', 'administration', 'rh', 'ressources humaines', 'global', 'famille'].includes(lower)) {
        setDepartmentFilter(dept);
      }
    }
  }, [isManager, backendUser]);

  // Documents générés localement (cache temporaire par requestId)
  const [generatedDocs, setGeneratedDocs] = useState({});

  // Input fichier caché pour import
  const fileInputRef = useRef(null);
  const [activeImportRequest, setActiveImportRequest] = useState(null);

  const [toast, setToast] = useState({ message: '', type: 'info' });

  /* ---- HELPERS ---- */
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3500);
  }, []);

  /* ---- CHARGEMENT ---- */
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/document-requests/queue?limit=500');
      if (res && res.success) {
        setRequests(res.data || res.requests || []);
      }
    } catch (err) {
      console.error("Erreur chargement file d'attente :", err);
      showToast("Impossible de charger la file d'attente.", 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadQueue(); }, []);

  /* ---- FILTRES ---- */
  const typeOptions = useMemo(
    () => [...new Set(requests.map((r) => r.type || r.documentType || 'Autre'))].sort(),
    [requests]
  );

  const departmentOptions = useMemo(() => {
    const standard = ['Informatique', '3D / Animation', 'Création & Design', 'Marketing & Communication', 'Audiovisuel'];
    const fromRequests = requests.map((r) => r.department || r.className).filter(Boolean);
    return [...new Set([...standard, ...fromRequests])].sort();
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      const typeStr   = request.type || request.documentType || '';
      const nameStr   = request.studentName || request.requesterName || request.student || '';
      const idStr     = request.id || '';
      const statusStr = request.status || '';
      const deptStr   = request.department || '';
      const classStr  = request.className || '';

      const matchesSearch  = `${nameStr} ${typeStr} ${idStr} ${deptStr} ${classStr}`.toLowerCase().includes(query);
      const matchesType    = typeFilter === 'all' || typeStr === typeFilter;
      const matchesStatus  = statusFilter === 'all' || statusStr === statusFilter;
      const matchesDept    = departmentFilter === 'all' ||
        deptStr.toLowerCase().includes(departmentFilter.toLowerCase()) ||
        classStr.toLowerCase().includes(departmentFilter.toLowerCase());
      const matchesArchive = archiveFilter === 'all'
        ? true
        : archiveFilter === 'archived'
          ? Boolean(request.archived)
          : !request.archived;
      return matchesSearch && matchesType && matchesStatus && matchesDept && matchesArchive;
    });
  }, [requests, search, statusFilter, typeFilter, archiveFilter, departmentFilter]);

  const generatedRequests = useMemo(() => requests.filter((request) => (
    request.generated === true ||
    request.source === 'generated' ||
    String(request.documentId || '').startsWith('generated-') ||
    generatedDocs[request.id]
  )), [requests, generatedDocs]);

  /* ---- ACTIONS PRISE EN CHARGE ---- */
  const handleAssign = async (requestId) => {
    try {
      const defaultLabel = isManager ? 'Manager Filière' : isAdmin ? 'Superviseur Admin' : 'Agent RH';
      const agentName = user?.displayName || backendUser?.displayName || user?.email?.split('@')[0] || defaultLabel;
      const res = await apiFetch(`/api/document-requests/${requestId}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedTo: user.uid, assignedToName: agentName })
      });
      if (res && res.success) {
        showToast('Demande prise en charge.', 'success');
        await loadQueue();
      } else {
        showToast(res?.error || "Erreur lors de l'affectation.", 'error');
      }
    } catch (err) { showToast(err.message || "Erreur d'affectation.", 'error'); }
  };

  /* ---- VALIDATION ---- */
  const handleApprove = async () => {
    if (!approvalRequest) return;
    try {
      const res = await apiFetch(`/api/document-requests/${approvalRequest.id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ note: approvalNote || 'Votre document a été validé et est prêt.' })
      });
      if (res && res.success) {
        showToast('Demande approuvée avec succès !', 'success');
        setApprovalRequest(null);
        setApprovalNote('');
        await loadQueue();
      } else {
        showToast(res?.error || "Erreur lors de l'approbation.", 'error');
      }
    } catch (err) { showToast(err.message || 'Erreur lors de la validation.', 'error'); }
  };

  /* ---- REFUS ---- */
  const openRefusalDialog = (request) => {
    setRefusalRequest(request);
    setRefusalMessage(
      `Bonjour ${request.requesterName || "l'étudiant"},\n\nAprès examen de votre demande concernant le document « ${request.type || request.documentType} » (${request.id}), nous vous informons que celle-ci ne peut pas être validée en l'état.\n\nMotif : Les justificatifs fournis sont incomplets ou non conformes.\n\nCordialement,\nLe service administratif`
    );
  };

  const confirmRefusal = async () => {
    if (!refusalRequest) return;
    try {
      const res = await apiFetch(`/api/document-requests/${refusalRequest.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: refusalMessage.trim() })
      });
      if (res && res.success) {
        showToast('Demande refusée et demandeur notifié.', 'info');
        setRefusalRequest(null);
        setRefusalMessage('');
        await loadQueue();
      } else {
        showToast(res?.error || 'Erreur lors du refus.', 'error');
      }
    } catch (err) { showToast(err.message || 'Erreur lors du refus.', 'error'); }
  };

  /* ---- GÉNÉRER ---- */
  const handleGenerate = async (request) => {
    const docType     = request.type || request.documentType || 'Attestation';
    const studentName = request.studentName || request.requesterName || 'Étudiant';
    const isHtml      = isHtmlDocument(request);
    const content     = isHtml ? buildOfficialDocumentHTML(request) : buildGenericDocument(request);

    // Sauvegarder localement
    setGeneratedDocs((prev) => ({ ...prev, [request.id]: { docType, studentName, content, request, isHtml } }));

    // Tenter d'associer un documentId fictif au backend
    try {
      await apiFetch(`/api/document-requests/${request.id}/attach-document`, {
        method: 'PATCH',
        body: JSON.stringify({ documentId: `generated-${request.id}`, documentUrl: null })
      });
      await loadQueue();
    } catch (_) { /* ignore */ }

    showToast(`Document « ${docType} » généré avec succès !`, 'success');
  };

  /* ---- PRÉVISUALISER ---- */
  const handlePreview = (request) => {
    const cached = generatedDocs[request.id];
    if (cached) {
      setPreviewDoc(cached);
      return;
    }
    const docType     = request.type || request.documentType || 'Attestation';
    const studentName = request.studentName || request.requesterName || 'Étudiant';
    const isHtml      = isHtmlDocument(request);
    const content     = isHtml ? buildOfficialDocumentHTML(request) : buildGenericDocument(request);
    setPreviewDoc({ docType, studentName, content, request, isHtml });
  };

  /* ---- TÉLÉCHARGER ---- */
  const handleDownload = async (request) => {
    const docType  = request.type || request.documentType || 'Document';
    const isHtml   = isHtmlDocument(request);

    try {
      showToast('Génération du PDF en cours...', 'info');
      const blob = await apiFetchBlob(`/api/document-requests/${request.id}/pdf`);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${docType.replace(/\s+/g, '_')}_${request.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast('Document PDF téléchargé avec succès.', 'success');
    } catch (err) {
      console.error('Erreur téléchargement PDF :', err);
      // Fallback si la requête échoue
      const cached   = generatedDocs[request.id];
      const content  = cached?.content ?? (isHtml ? buildOfficialDocumentHTML(request) : buildGenericDocument(request));
      const ext      = isHtml ? 'html' : 'txt';
      const blob     = new Blob([content], { type: isHtml ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = `${docType.replace(/\s+/g, '_')}_${request.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 8000);
      showToast('Document téléchargé.', 'info');
    }
  };

  /* ---- IMPORTER ---- */
  const triggerImport = (request) => {
    setActiveImportRequest(request);
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeImportRequest) return;
    e.target.value = '';

    const request = activeImportRequest;
    const docType = request.type || request.documentType || 'Document';

    try {
      showToast(`Importation de « ${file.name} » en cours...`, 'info');

      // 1. Upload réel du fichier vers le backend
      const formData = new FormData();
      formData.append('document', file);
      formData.append('category', 'administratif');
      formData.append('requestId', request.id);

      const uploadRes = await apiFetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes?.success) {
        throw new Error(uploadRes?.error || "Échec de l'upload du fichier.");
      }

      const realDocumentId = uploadRes.document?.id;
      if (!realDocumentId) throw new Error("ID du document non retourné par le serveur.");

      // 2. Associer le vrai documentId (UUID) à la demande
      await apiFetch(`/api/document-requests/${request.id}/attach-document`, {
        method: 'PATCH',
        body: JSON.stringify({ documentId: realDocumentId, documentUrl: null })
      });

      setGeneratedDocs((prev) => ({
        ...prev,
        [request.id]: {
          docType,
          studentName: request.requesterName,
          content: `[Fichier importé : ${file.name}]`,
          request,
          importedFileName: file.name,
          realDocumentId
        }
      }));

      await loadQueue();
      showToast(`Fichier « ${file.name} » importé avec succès pour « ${docType} ».`, 'success');
    } catch (err) {
      showToast(err.message || "Erreur lors de l'importation.", 'error');
    }
    setActiveImportRequest(null);
  };

  /* ---- TRANSFÉRER ---- */
  const openTransferModal = (request) => {
    const docType = request.type || request.documentType || 'Document';
    setTransferRequest(request);
    setTransferMessage(
      `Bonjour ${request.requesterName || 'étudiant'},\n\nVotre document officiel « ${docType} » est maintenant disponible.\nCordialement, le service administratif YNOV.`
    );
  };

  const confirmTransferToStudent = async () => {
    if (!transferRequest) return;
    const docType = transferRequest.type || transferRequest.documentType || 'Document';
    try {
      const res = await apiFetch(`/api/document-requests/${transferRequest.id}/transfer`, {
        method: 'PATCH',
        body: JSON.stringify({ message: transferMessage })
      });
      if (!res?.success) throw new Error(res?.error || 'Impossible de transférer le document.');
      showToast(`Document « ${docType} » transféré avec succès à ${transferRequest.requesterName} !`, 'success');
      await loadQueue();
    } catch (err) {
      showToast(err.message || 'Impossible de transférer le document.', 'error');
    } finally {
      setTransferRequest(null);
      setTransferMessage('');
    }
  };

  /* ---- ARCHIVER ---- */
  const handleArchive = async (requestId) => {
    try {
      const res = await apiFetch(`/api/document-requests/${requestId}/archive`, { method: 'PATCH' });
      if (res && res.success) {
        showToast('Demande de document archivée avec succès.', 'success');
        await loadQueue();
      } else {
        showToast(res?.error || "Impossible d'archiver la demande.", 'error');
      }
    } catch (err) { showToast(err.message || "Erreur lors de l'archivage.", 'error'); }
  };

  const handleUnarchive = async (requestId) => {
    try {
      const res = await apiFetch(`/api/document-requests/${requestId}/unarchive`, { method: 'PATCH' });
      if (res && res.success) {
        showToast('Demande restaurée avec succès.', 'success');
        await loadQueue();
      } else {
        showToast(res?.error || 'Impossible de restaurer la demande.', 'error');
      }
    } catch (err) { showToast(err.message || 'Erreur lors de la restauration.', 'error'); }
  };

  /* ---- BADGE STATUT ---- */
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':   return <span className="document-request-status ready">Validé</span>;
      case 'in_progress':return <span className="document-request-status review" style={{ background: '#e0f2fe', color: '#0369a1' }}>En cours</span>;
      case 'rejected':   return <span className="document-request-status" style={{ background: '#fee2e2', color: '#b91c1c' }}>Refusé</span>;
      case 'cancelled':  return <span className="document-request-status" style={{ background: '#f1f5f9', color: '#64748b' }}>Annulé</span>;
      default:           return <span className="document-request-status review">En attente</span>;
    }
  };

  /* ================================================================
     RENDU
     ================================================================ */
  const headerKicker = isAdmin
    ? 'Supervision & Audit Documentaire'
    : isManager
      ? `Pédagogie & Filière · ${backendUser?.department || 'Manager'}`
      : 'Ressources Humaines & Secrétariat';

  const headerTitle = activeTab === 'generated'
    ? 'Documents générés'
    : isAdmin
      ? 'Supervision des demandes de documents'
      : isManager
        ? `Demandes de documents — ${backendUser?.department || 'Ma filière'}`
        : 'Demandes à traiter (RH)';

  const headerDesc = activeTab === 'generated'
    ? 'Consultez les documents générés et leur état de transmission.'
    : isAdmin
      ? 'Vue globale de supervision — Contrôle et audit des flux documentaires traités par les RH et Managers de filière.'
      : isManager
        ? 'File d\'attente pédagogique — Validation et émission des documents pour les étudiants de votre filière.'
        : 'File d\'attente opérationnelle — Traitement, génération et transmission des attestations et documents administratifs.';

  return (
    <section className="administrative-page">
      <header className="administrative-header">
        <div>
          <p className="administrative-kicker">{headerKicker}</p>
          <h1>{headerTitle}</h1>
          <p>{headerDesc}</p>
        </div>
        <div className="administrative-summary">
          <strong>{activeTab === 'generated' ? generatedRequests.length : filteredRequests.length}</strong>
          <span>{activeTab === 'generated' ? 'document(s) généré(s)' : `demande${filteredRequests.length > 1 ? 's' : ''} affichée${filteredRequests.length > 1 ? 's' : ''}`}</span>
        </div>
      </header>

      {/* BANDEAU DE SUPERVISION ADMIN */}
      {isAdmin && activeTab === 'requests' && (
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '20px',
          color: '#ffffff',
          border: '1px solid #334155',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                  Tableau de Supervision Documentaire
                </h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  Rôle superviseur : Les demandes sont traitées opérationnellement par les RH et Managers de filière.
                </p>
              </div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(6, 182, 212, 0.3)'
            }}>
              Mode Superviseur Global
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Total demandes</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>{requests.length}</div>
            </div>
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', color: '#fde047' }}>En attente d'agent</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fde047', marginTop: '2px' }}>{requests.filter(r => !r.assignedTo && r.status === 'pending').length}</div>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', color: '#7dd3fc' }}>En cours RH / Manager</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#7dd3fc', marginTop: '2px' }}>{requests.filter(r => r.status === 'in_progress').length}</div>
            </div>
            <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div style={{ fontSize: '0.72rem', color: '#86efac' }}>Validées &amp; Prêtes</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#86efac', marginTop: '2px' }}>{requests.filter(r => r.status === 'approved').length}</div>
            </div>
          </div>
        </div>
      )}

      {!generatedOnly && !hideGeneratedTab && <div className="administrative-tabs" role="tablist" aria-label="Vues documentaires">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'requests'}
          className={activeTab === 'requests' ? 'administrative-tab active' : 'administrative-tab'}
          onClick={() => setActiveTab('requests')}
        >
          {isAdmin ? 'Supervision des demandes' : 'Demandes à traiter'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'generated'}
          className={activeTab === 'generated' ? 'administrative-tab active' : 'administrative-tab'}
          onClick={() => setActiveTab('generated')}
        >
          Documents générés <span className="administrative-tab-count">{generatedRequests.length}</span>
        </button>
      </div>}

      {/* TOOLBAR */}
      {activeTab === 'requests' && <div className="administrative-toolbar">
        <label className="administrative-search">
          <IconSearch />
          <input
            type="search"
            placeholder="Rechercher un demandeur ou document"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} aria-label="Filtrer par filière / département">
          <option value="all">Toutes les filières / départements</option>
          {departmentOptions.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
        </select>

        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filtrer par type de document">
          <option value="all">Tous les types de document</option>
          {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filtrer les demandes">
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="in_progress">En cours</option>
          <option value="approved">Validé</option>
          <option value="rejected">Refusé</option>
          <option value="cancelled">Annulé</option>
        </select>

        <select value={archiveFilter} onChange={(e) => setArchiveFilter(e.target.value)} aria-label="Filtrer par état d'archivage">
          <option value="all">Toutes (actives &amp; archivées)</option>
          <option value="active">Actives uniquement</option>
          <option value="archived">Archivées uniquement</option>
        </select>
      </div>}

      {/* LISTE */}
      {activeTab === 'requests' && <div className="administrative-list">
        {loading ? (
          <p style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Chargement de la file d'attente...</p>
        ) : filteredRequests.map((request) => {
          const submittedStr = request.createdAt
            ? new Date(request.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—';

          const isGenerated = Boolean(
            generatedDocs[request.id] ||
            request.documentId ||
            request.documentUrl ||
            request.status === 'approved'
          );

          return (
            <article className="document-request-card" key={request.id}>
              <div className="document-request-main">
                <div className="document-request-icon">
                  <IconDocument />
                </div>
                <div>
                  <p className="document-request-id">{request.id}</p>
                  <h2>{request.type || request.documentType}</h2>
                  <p className="document-request-student" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    <strong>{request.studentName || request.requesterName}</strong>
                    {request.requesterEmail && <span style={{ color: '#64748b', fontSize: '0.74rem' }}>({request.requesterEmail})</span>}
                    {(request.department || request.className) && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        fontSize: '0.68rem',
                        fontWeight: 700
                      }}>
                        🎓 {request.department ? `${request.department} ` : ''}{request.className ? `· ${request.className}` : ''}
                      </span>
                    )}
                  </p>
                  <p className="document-request-dates">
                    Reçu le {submittedStr}
                    {request.urgency === 'urgent' && (
                      <span style={{ color: '#ef4444', fontWeight: 'bold', marginLeft: '8px' }}>• URGENT</span>
                    )}
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
                {/* BADGES STATUT + ARCHIVÉ */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {getStatusBadge(request.status)}
                  {request.archived && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      fontSize: '0.64rem', fontWeight: '700', padding: '2px 7px',
                      borderRadius: '4px', background: '#ede9fe', color: '#6d28d9',
                      border: '1px solid #ddd6fe'
                    }}>
                      <IconArchive size={11} /> Archivée
                    </span>
                  )}
                </div>

                {/* BOUTONS D'ACTION */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'nowrap' }}>

                  {/* REFUSER (rouge) — seulement si non traité */}
                  {request.status !== 'approved' && request.status !== 'rejected' && request.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="table-action-btn"
                      style={{ color: '#ef4444' }}
                      onClick={() => openRefusalDialog(request)}
                      title="Refuser la demande"
                    >
                      <IconX />
                    </button>
                  )}

                  {/* GÉNÉRER (cyan YNOV) */}
                  <button
                    type="button"
                    className="table-action-btn"
                    style={isGenerated ? { color: 'var(--ynov-cyan, #00b4d8)', borderColor: 'var(--ynov-cyan, #00b4d8)' } : {}}
                    onClick={() => handleGenerate(request)}
                    title={isGenerated ? 'Régénérer le document officiel' : 'Générer le document officiel'}
                  >
                    <IconSparkles />
                  </button>

                  {/* VOIR / TÉLÉCHARGER / IMPORTER / TRANSFÉRER — si document généré */}
                  {isGenerated && (
                    <>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => handlePreview(request)}
                        title="Voir / Prévisualiser le document généré"
                      >
                        <IconEye />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => handleDownload(request)}
                        title="Télécharger le document généré"
                      >
                        <IconDownload />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => triggerImport(request)}
                        title="Importer / Remplacer par un document signé"
                      >
                        <IconUpload />
                      </button>

                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => openTransferModal(request)}
                        title={`Transférer le document à ${request.requesterName}`}
                      >
                        <IconForward />
                      </button>
                    </>
                  )}

                  {/* ARCHIVER / DÉSARCHIVER — uniquement si validé ou refusé */}
                  {(request.status === 'approved' || request.status === 'rejected') && (
                    !request.archived ? (
                      <button
                        type="button"
                        className="table-action-btn"
                        style={{ color: '#6366f1' }}
                        onClick={() => handleArchive(request.id)}
                        title="Archiver cette demande"
                      >
                        <IconArchive />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="table-action-btn"
                        style={{ color: '#8b5cf6' }}
                        onClick={() => handleUnarchive(request.id)}
                        title="Restaurer / Désarchiver cette demande"
                      >
                        <IconArchive style={{ transform: 'rotate(180deg)' }} />
                      </button>
                    )
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {!loading && filteredRequests.length === 0 && (
          <p className="administrative-empty">Aucune demande ne correspond à vos filtres.</p>
        )}
      </div>}

      {activeTab === 'generated' && (
        <div className="generated-documents-panel">
          <div className="generated-documents-heading">
            <div>
              <h2>Documents générés</h2>
              <p>{generatedRequests.length} document{generatedRequests.length > 1 ? 's' : ''} généré{generatedRequests.length > 1 ? 's' : ''}</p>
            </div>
            <span className="generated-documents-total">{generatedRequests.length}</span>
          </div>
          {generatedRequests.length === 0 ? (
            <p className="administrative-empty">Aucun document généré pour le moment.</p>
          ) : (
            <div className="generated-documents-table-wrap">
              <table className="generated-documents-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Destinataire</th>
                    <th>Date de génération</th>
                    <th>Transfert</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {generatedRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.type || request.documentType || 'Document administratif'}</strong>
                        <small>{request.id}</small>
                      </td>
                      <td>{request.transferredToName || request.requesterName || request.studentName || request.requesterEmail || '—'}</td>
                      <td>{request.generatedAt || request.updatedAt || request.approvedAt || request.createdAt ? new Date(request.generatedAt || request.updatedAt || request.approvedAt || request.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td>
                        <span className={request.transferredAt ? 'generated-status transferred' : 'generated-status not-transferred'}>
                          {request.transferredAt ? 'Transféré' : 'Non transféré'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button type="button" className="table-action-btn" title="Voir le document" onClick={() => handlePreview(request)}>
                            <IconEye size={17} />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn"
                            title={`Transférer le document à ${request.requesterName || request.studentName || 'l\'étudiant'}`}
                            onClick={() => openTransferModal(request)}
                          >
                            <IconForward size={17} />
                          </button>
                          <button type="button" className="table-action-btn" title="Archiver le document" onClick={() => handleArchive(request.id)}>
                            <IconArchive size={17} />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn"
                            title="Supprimer le document"
                            style={{ color: '#ef4444' }}
                            onClick={async () => {
                              if (!window.confirm(`Supprimer définitivement « ${request.type || request.documentType || 'ce document'} » ?`)) return;
                              try {
                                const result = await apiFetch(`/api/document-requests/${request.id}`, { method: 'DELETE' });
                                if (!result?.success) throw new Error(result?.error || 'Impossible de supprimer le document.');
                                showToast('Document supprimé avec succès.', 'success');
                                await loadQueue();
                              } catch (error) {
                                showToast(error.message || 'Impossible de supprimer le document.', 'error');
                              }
                            }}
                          >
                            <IconTrash size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* INPUT FICHIER CACHÉ (import) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileSelected}
        style={{ display: 'none' }}
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
      />

      {/* MODAL VALIDATION */}
      {approvalRequest && (
        <div className="refusal-modal-backdrop" role="presentation">
          <section className="refusal-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <div className="refusal-modal-header">
              <div>
                <p className="administrative-kicker">Validation de la demande</p>
                <h2 id="approval-title">Approuver « {approvalRequest.type || approvalRequest.documentType} »</h2>
              </div>
              <button type="button" className="refusal-close" onClick={() => setApprovalRequest(null)} aria-label="Fermer">×</button>
            </div>
            <p className="refusal-modal-intro">
              Vous pouvez ajouter une note d'accompagnement qui sera transmise à l'étudiant ({approvalRequest.requesterName}).
            </p>
            <textarea
              className="refusal-message"
              placeholder="Ex: Votre attestation a été générée et est disponible."
              value={approvalNote}
              onChange={(e) => setApprovalNote(e.target.value)}
              rows="6"
            />
            <div className="refusal-modal-actions">
              <button type="button" className="document-action" onClick={() => setApprovalRequest(null)}>Annuler</button>
              <button type="button" className="document-action approve" onClick={handleApprove}>
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
              <button type="button" className="refusal-close" onClick={() => setRefusalRequest(null)} aria-label="Fermer">×</button>
            </div>
            <p className="refusal-modal-intro">Le motif du refus est obligatoire et sera notifié directement au demandeur.</p>
            <textarea
              className="refusal-message"
              value={refusalMessage}
              onChange={(e) => setRefusalMessage(e.target.value)}
              rows="10"
              aria-label="Message de refus"
            />
            <div className="refusal-modal-actions">
              <button type="button" className="document-action" onClick={() => setRefusalRequest(null)}>Annuler</button>
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

      {/* MODAL PRÉVISUALISATION */}
      {previewDoc && (
        <div className="refusal-modal-backdrop" role="presentation" onClick={() => setPreviewDoc(null)}>
          <section
            className="refusal-modal"
            style={{ width: 'min(860px, 96%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="refusal-modal-header">
              <div>
                <p className="administrative-kicker">Aperçu du document officiel</p>
                <h2 style={{ fontSize: '1.2rem', color: '#1e293b' }}>
                  {previewDoc.docType} — {previewDoc.studentName}
                </h2>
              </div>
              <button type="button" className="refusal-close" onClick={() => setPreviewDoc(null)} aria-label="Fermer">×</button>
            </div>

            {/* RENDU HTML pour Attestation de réussite, texte brut sinon */}
            {previewDoc.isHtml ? (
              <iframe
                srcDoc={previewDoc.content}
                title="Aperçu du document"
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
            ) : (
              <div style={{
                margin: '16px 0', padding: '16px', borderRadius: '8px',
                background: '#0f172a', color: '#f8fafc', fontFamily: 'monospace',
                fontSize: '0.82rem', lineHeight: 1.45, whiteSpace: 'pre-wrap',
                maxHeight: '400px', overflowY: 'auto', flex: 1
              }}>
                {previewDoc.content}
              </div>
            )}

            <div className="refusal-modal-actions">
              <button type="button" className="document-action" onClick={() => setPreviewDoc(null)}>Fermer</button>
              {previewDoc.isHtml && (
                <button
                  type="button"
                  className="document-action"
                  style={{ background: '#059669', borderColor: '#059669', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => printHtmlDocument(previewDoc.content)}
                  title="Imprimer ou enregistrer au format PDF"
                >
                  <IconSparkles size={15} /> Imprimer / PDF
                </button>
              )}
              <button
                type="button"
                className="document-action"
                style={{ background: '#0284c7', borderColor: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => handleDownload(previewDoc.request)}
              >
                <IconDownload size={15} /> Télécharger (PDF)
              </button>
              <button
                type="button"
                className="document-action"
                style={{ background: '#4f46e5', borderColor: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { const req = previewDoc.request; setPreviewDoc(null); openTransferModal(req); }}
              >
                <IconForward size={15} /> Transférer à l'étudiant
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL TRANSFERT */}
      {transferRequest && (
        <div className="refusal-modal-backdrop" role="presentation" onClick={() => setTransferRequest(null)}>
          <section
            className="refusal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transfer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="refusal-modal-header">
              <div>
                <p className="administrative-kicker">Transmission du document à l'utilisateur</p>
                <h2 id="transfer-title">Transférer le document à {transferRequest.requesterName}</h2>
              </div>
              <button type="button" className="refusal-close" onClick={() => setTransferRequest(null)} aria-label="Fermer">×</button>
            </div>
            <p className="refusal-modal-intro">
              Le document officiel « <strong>{transferRequest.type || transferRequest.documentType}</strong> » sera
              directement transféré et mis à disposition dans l'espace personnel de l'étudiant{' '}
              <strong>{transferRequest.requesterName}</strong> ({transferRequest.requesterEmail}).
            </p>
            <div style={{ margin: '14px 0' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Message d'accompagnement transmis à l'étudiant :
              </label>
              <textarea
                className="refusal-message"
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                rows={5}
                style={{ minHeight: '120px' }}
              />
            </div>
            <div className="refusal-modal-actions">
              <button type="button" className="document-action" onClick={() => setTransferRequest(null)}>Annuler</button>
              <button
                type="button"
                className="document-action"
                style={{ background: '#4f46e5', borderColor: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={confirmTransferToStudent}
              >
                <IconForward size={15} /> Transférer à l'étudiant
              </button>
            </div>
          </section>
        </div>
      )}

      {/* TOAST */}
      {toast.message && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          padding: '12px 20px', borderRadius: '8px',
          background: toast.type === 'error' ? '#ef4444' : toast.type === 'info' ? '#0284c7' : '#10b981',
          color: '#ffffff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '0.9rem', fontWeight: '500'
        }}>
          <span>{toast.message}</span>
        </div>
      )}
    </section>
  );
}
