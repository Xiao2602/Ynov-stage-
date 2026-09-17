import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useAuth } from "../auth/AuthContext";

import {
  IconDocument,
  IconSearch,
  IconEye,
  IconPlus,
  IconDownload,
  IconTrash,
  IconArchive,
  IconForward,
  IconCheck,
  IconX,
  IconUser,
  IconUsers
} from "../components/Icons";

import {
  apiFetch,
  apiFetchBlob
} from "../api/api";

const CATEGORY_OPTIONS = [
  {
    value: "justificatif_absence",
    label: "Justificatif d'absence"
  },
  {
    value: "certificat_medical",
    label: "Certificat médical"
  },
  {
    value: "attestation_scolarite",
    label: "Attestation de scolarité"
  },
  {
    value: "releve_notes",
    label: "Relevé de notes"
  },
  {
    value: "convention_stage",
    label: "Convention de stage"
  },
  {
    value: "contrat",
    label: "Contrat"
  },
  {
    value: "administratif",
    label: "Administratif"
  },
  {
    value: "autre",
    label: "Autre"
  }
];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getRoleMeta(role) {
  const r = String(role || "").toLowerCase();
  if (r === "rh") {
    return {
      label: "Ressources Humaines",
      icon: "💼",
      badgeBg: "#e0f2fe",
      badgeColor: "#0369a1",
      avatarBg: "#bae6fd",
      avatarColor: "#0284c7"
    };
  }
  if (r === "manager") {
    return {
      label: "Manager Filière",
      icon: "👔",
      badgeBg: "#f3e8ff",
      badgeColor: "#7e22ce",
      avatarBg: "#e9d5ff",
      avatarColor: "#9333ea"
    };
  }
  if (r === "admin") {
    return {
      label: "Administration",
      icon: "🏛️",
      badgeBg: "#ffe4e6",
      badgeColor: "#be123c",
      avatarBg: "#fecdd3",
      avatarColor: "#e11d48"
    };
  }
  if (r === "teacher") {
    return {
      label: "Enseignant / Formateur",
      icon: "👨‍🏫",
      badgeBg: "#fef3c7",
      badgeColor: "#b45309",
      avatarBg: "#fde68a",
      avatarColor: "#d97706"
    };
  }
  if (r === "parent") {
    return {
      label: "Parent / Tuteur",
      icon: "👨‍👩‍👧",
      badgeBg: "#eff6ff",
      badgeColor: "#1d4ed8",
      avatarBg: "#dbeafe",
      avatarColor: "#2563eb"
    };
  }
  return {
    label: "Étudiant",
    icon: "🎓",
    badgeBg: "#ecfdf5",
    badgeColor: "#047857",
    avatarBg: "#a7f3d0",
    avatarColor: "#059669"
  };
}

function formatCategory(category) {
  const item =
    CATEGORY_OPTIONS.find(
      (option) =>
        option.value === category
    );

  return (
    item?.label ||
    category ||
    "Autre"
  );
}

function formatSize(bytes) {
  if (!bytes) {
    return "0 Ko";
  }

  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} Ko`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} Mo`;
}

function formatDate(value) {
  if (!value) {
    return "—";
  }

  let date;

  if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else if (value?.seconds || value?._seconds) {
    date = new Date((value.seconds || value._seconds) * 1000);
  } else {
    date =
      new Date(value);
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

export default function DocumentsPage() {
  const { role, user } = useAuth();

  const isStudentAccount = role === "student";
  const isParent = String(role || "").toLowerCase() === "parent";
  /*
  |--------------------------------------------------------------------------
  | DOCUMENTS
  |--------------------------------------------------------------------------
  */

  const [
    documents,
    setDocuments
  ] = useState([]);

  const [
    loading,
    setLoading
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | RECHERCHE
  |--------------------------------------------------------------------------
  */

  const [
    search,
    setSearch
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter
  ] = useState("all");

  const [
    archiveFilter,
    setArchiveFilter
  ] = useState("active");

  const [
    originFilter,
    setOriginFilter
  ] = useState("all");

  /*
  |--------------------------------------------------------------------------
  | MODAL UPLOAD
  |--------------------------------------------------------------------------
  */

  const [
    uploadOpen,
    setUploadOpen
  ] = useState(false);

  const [
    selectedFile,
    setSelectedFile
  ] = useState(null);

  const [
    selectedCategory,
    setSelectedCategory
  ] = useState("");

  const [
    uploadLoading,
    setUploadLoading
  ] = useState(false);

  const [
    uploadError,
    setUploadError
  ] = useState("");

  const [
    uploadSuccess,
    setUploadSuccess
  ] = useState("");

  const fileInputRef =
    useRef(null);

  /*
  |--------------------------------------------------------------------------
  | MESSAGE
  |--------------------------------------------------------------------------
  */

  const [
    actionMessage,
    setActionMessage
  ] = useState("");

  const [
    previewModal,
    setPreviewModal
  ] = useState({ open: false, url: null, document: null });

  const [
    deleteModal,
    setDeleteModal
  ] = useState({ open: false, document: null, loading: false });

  const [toast, setToast] = useState({ message: "", type: "info" });

  const [transferModal, setTransferModal] = useState({
    open: false,
    document: null,
    recipientUid: "",
    loading: false
  });
  const [recipients, setRecipients] = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [transferSearchQuery, setTransferSearchQuery] = useState("");
  const [transferRoleFilter, setTransferRoleFilter] = useState("all");
  const [transferClassFilter, setTransferClassFilter] = useState("all");

  /* Profil Parent : Multi-enfants */
  const [childrenList, setChildrenList] = useState([]);
  const [childrenLoading, setChildrenLoading] = useState(false);
  const [selectedChildUid, setSelectedChildUid] = useState("all");
  const [uploadTargetStudentUid, setUploadTargetStudentUid] = useState("");

  /* Pagination (côté client) */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "info" });
    }, 3500);
  }

  const availableClasses = useMemo(() => {
    const set = new Set();
    recipients.forEach((r) => {
      const cls = r.className || r.assignedClass;
      if (cls && typeof cls === 'string' && cls.trim()) {
        set.add(cls.trim());
      }
    });
    return Array.from(set).sort();
  }, [recipients]);

  const recipientCounts = useMemo(() => {
    const valid = recipients.filter(
      (r) => r.uid !== user?.uid && r.uid !== transferModal.document?.uid
    );
    const childUids = new Set(childrenList.map((c) => c.uid));

    let children = 0;
    let student = 0;
    let rh = 0;
    let manager = 0;
    let teacher = 0;
    let admin = 0;
    let parent = 0;
    let staff = 0;

    valid.forEach((r) => {
      const role = String(r.role || '').toLowerCase();
      if (childUids.has(r.uid)) children++;
      if (role === 'student') student++;
      if (role === 'rh') rh++;
      if (role === 'manager') manager++;
      if (role === 'teacher') teacher++;
      if (role === 'admin') admin++;
      if (role === 'parent') parent++;
      if (['admin', 'rh', 'manager', 'employee', 'teacher'].includes(role)) staff++;
    });

    return {
      all: valid.length,
      children,
      student,
      rh,
      manager,
      teacher,
      admin,
      parent,
      staff
    };
  }, [recipients, user, transferModal.document, childrenList]);

  const filteredRecipients = useMemo(() => {
    let list = recipients.filter(
      (r) => r.uid !== user?.uid && r.uid !== transferModal.document?.uid
    );

    if (isParent) {
      if (transferRoleFilter === 'children') {
        const childUids = new Set(childrenList.map((c) => c.uid));
        list = list.filter((r) => childUids.has(r.uid));
      } else if (transferRoleFilter === 'staff') {
        list = list.filter((r) =>
          ['admin', 'rh', 'manager', 'employee', 'teacher'].includes(
            String(r.role || '').toLowerCase()
          )
        );
      } else if (transferRoleFilter !== 'all') {
        list = list.filter(
          (r) => String(r.role || '').toLowerCase() === transferRoleFilter
        );
      }
    } else {
      if (transferRoleFilter !== 'all') {
        list = list.filter(
          (r) => String(r.role || '').toLowerCase() === transferRoleFilter
        );
      }
    }

    if (transferClassFilter !== 'all') {
      list = list.filter((r) => {
        const c = String(r.className || r.assignedClass || '').trim().toLowerCase();
        return c === transferClassFilter.toLowerCase();
      });
    }

    if (transferSearchQuery.trim()) {
      const q = transferSearchQuery.trim().toLowerCase();
      list = list.filter((r) => {
        const name = String(r.displayName || '').toLowerCase();
        const email = String(r.email || '').toLowerCase();
        const role = String(r.role || '').toLowerCase();
        const className = String(r.className || r.assignedClass || '').toLowerCase();
        const dept = String(r.department || r.service || '').toLowerCase();
        return (
          name.includes(q) ||
          email.includes(q) ||
          role.includes(q) ||
          className.includes(q) ||
          dept.includes(q)
        );
      });
    }

    return list;
  }, [recipients, user, transferModal.document, isParent, childrenList, transferRoleFilter, transferClassFilter, transferSearchQuery]);

  const selectedRecipient = useMemo(() => {
    if (!transferModal.recipientUid) return null;
    return recipients.find((r) => r.uid === transferModal.recipientUid) || null;
  }, [recipients, transferModal.recipientUid]);

  const rolePills = isParent
    ? [
        { id: 'all', label: 'Tous', icon: '🌟', count: recipientCounts.all },
        { id: 'children', label: 'Mes enfants', icon: '👨‍👦', count: recipientCounts.children },
        { id: 'staff', label: 'Scolarité & RH', icon: '🏫', count: recipientCounts.staff },
        { id: 'rh', label: 'RH', icon: '💼', count: recipientCounts.rh },
        { id: 'manager', label: 'Managers', icon: '👔', count: recipientCounts.manager },
        { id: 'teacher', label: 'Enseignants', icon: '👨‍🏫', count: recipientCounts.teacher },
        { id: 'admin', label: 'Administration', icon: '🏛️', count: recipientCounts.admin }
      ]
    : [
        { id: 'all', label: 'Tous', icon: '🌟', count: recipientCounts.all },
        { id: 'student', label: 'Étudiants', icon: '🎓', count: recipientCounts.student },
        { id: 'rh', label: 'RH', icon: '💼', count: recipientCounts.rh },
        { id: 'manager', label: 'Managers', icon: '👔', count: recipientCounts.manager },
        { id: 'teacher', label: 'Enseignants', icon: '👨‍🏫', count: recipientCounts.teacher },
        { id: 'parent', label: 'Parents', icon: '👨‍👩‍👧', count: recipientCounts.parent },
        { id: 'admin', label: 'Administration', icon: '🏛️', count: recipientCounts.admin }
      ];

  /*
  |--------------------------------------------------------------------------
  | CHARGEMENT DES ENFANTS (PROFIL PARENT)
  |--------------------------------------------------------------------------
  */
  useEffect(() => {
    if (isParent) {
      setChildrenLoading(true);
      apiFetch("/api/users/my-children")
        .then((res) => {
          if (res?.success && Array.isArray(res.children)) {
            setChildrenList(res.children);
            if (res.children.length > 0) {
              setUploadTargetStudentUid(res.children[0].uid);
            }
          }
        })
        .catch((err) => console.error("Erreur chargement enfants :", err))
        .finally(() => setChildrenLoading(false));
    }
  }, [isParent]);

  /*
  |--------------------------------------------------------------------------
  | CHARGEMENT
  |--------------------------------------------------------------------------
  */

  async function loadDocuments() {
    try {
      setLoading(true);

      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (
        categoryFilter !==
        "all"
      ) {
        params.set(
          "category",
          categoryFilter
        );
      }

      if (
        archiveFilter ===
        "active"
      ) {
        params.set(
          "archived",
          "false"
        );
      }

      if (
        archiveFilter ===
        "archived"
      ) {
        params.set(
          "archived",
          "true"
        );
      }

      if (isParent && selectedChildUid && selectedChildUid !== "all") {
        params.set("studentUid", selectedChildUid);
      }

      const query =
        params.toString();

      const result =
        await apiFetch(
          `/api/documents/my${
            query
              ? `?${query}`
              : ""
          }`
        );

      /*
       * Le backend ne retourne déjà
       * que les documents validés.
       */

      setDocuments(
        Array.isArray(
          result.documents
        )
          ? result.documents.filter((document) => {
            if (originFilter === "generated") return isGeneratedDocument(document);
            if (originFilter === "received") return isReceivedDocument(document, user?.uid);
            if (originFilter === "imported") return !isGeneratedDocument(document) && !isReceivedDocument(document, user?.uid);
            return true;
          })
          : []
      );

    } catch (error) {
      console.error(
        "Erreur documents :",
        error
      );

      setActionMessage(
        error.message ||
          "Impossible de charger les documents."
      );

    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
  }, [
    search,
    categoryFilter,
    archiveFilter,
    originFilter,
    selectedChildUid
  ]);

  // reset page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, archiveFilter, originFilter, selectedChildUid]);

  /*
  |--------------------------------------------------------------------------
  | OUVRIR MODAL
  |--------------------------------------------------------------------------
  */

  function openUploadModal() {
    setSelectedFile(null);
    setSelectedCategory("");
    setUploadError("");
    setUploadSuccess("");
    if (isParent && childrenList.length > 0) {
      setUploadTargetStudentUid(selectedChildUid !== "all" ? selectedChildUid : childrenList[0].uid);
    }
    setUploadOpen(true);

    if (fileInputRef.current) {
      fileInputRef.current.value =
        "";
    }
  }

  function closeUploadModal() {
    if (uploadLoading) {
      return;
    }

    setUploadOpen(false);
  }

  /*
  |--------------------------------------------------------------------------
  | FICHIER
  |--------------------------------------------------------------------------
  */

  function handleFileChange(
    event
  ) {
    const file =
      event.target.files?.[0];

    setUploadError("");
    setUploadSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setSelectedFile(null);

      setUploadError(
        "Le fichier dépasse la taille maximale de 5 Mo."
      );

      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg"
    ];

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setSelectedFile(null);

      setUploadError(
        "Format non autorisé. Utilisez un PDF, JPG ou JPEG."
      );

      return;
    }

    setSelectedFile(file);
  }

  /*
  |--------------------------------------------------------------------------
  | UPLOAD
  |--------------------------------------------------------------------------
  */

  async function handleUpload(
    event
  ) {
    event.preventDefault();

    setUploadError("");
    setUploadSuccess("");

    if (!selectedFile) {
      setUploadError(
        "Veuillez sélectionner un fichier."
      );

      return;
    }

    if (!selectedCategory) {
      setUploadError(
        "Veuillez sélectionner une catégorie."
      );

      return;
    }

    setUploadLoading(true);

    try {
      const formData =
        new FormData();

      /*
       * IMPORTANT :
       * Le backend utilise upload.single("document")
       */

      formData.append(
        "document",
        selectedFile
      );

      formData.append(
        "category",
        selectedCategory
      );

      if (isParent && uploadTargetStudentUid) {
        formData.append("studentUid", uploadTargetStudentUid);
      }

      const result =
        await apiFetch(
          "/api/documents/upload",
          {
            method: "POST",
            body: formData
          }
        );

      if (
        !result.success
      ) {
        throw new Error(
          result.error ||
            "Document rejeté."
        );
      }

      setUploadSuccess(
        result.message ||
          "Document validé et enregistré."
      );

      /*
       * Actualisation immédiate
       */

      await loadDocuments();

      /*
       * On laisse le message
       * visible quelques secondes.
       */

      setTimeout(() => {
        setUploadOpen(false);
        setSelectedFile(null);
        setSelectedCategory("");
        setUploadSuccess("");
      }, 1800);

    } catch (error) {
      console.error(
        "Erreur upload :",
        error
      );

      setUploadError(
        error.message ||
          "Impossible d'envoyer le document."
      );

    } finally {
      setUploadLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CONSULTER
  |--------------------------------------------------------------------------
  */

  async function handleView(document) {
    try {
      setActionMessage("Ouverture du document...");

      const viewEndpoint = document.generated && document.requestId
        ? `/api/document-requests/${document.requestId}/pdf`
        : `/api/documents/${document.id}/view`;
      const blob = await apiFetchBlob(viewEndpoint);
      const url = URL.createObjectURL(blob);

      setPreviewModal({
        open: true,
        url,
        document
      });

      setActionMessage("");
    } catch (error) {
      console.error("Erreur consultation :", error);
      setActionMessage(
        error.message || "Impossible de consulter le document."
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | TÉLÉCHARGER
  |--------------------------------------------------------------------------
  */

  async function handleDownload(document) {
    try {
      showToast(`Téléchargement de "${document.originalName}" en cours...`, "info");
      const downloadEndpoint = document.generated && document.requestId
        ? `/api/document-requests/${document.requestId}/pdf`
        : `/api/documents/${document.id}/download`;
      const blob = await apiFetchBlob(downloadEndpoint);
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.originalName || "document";
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      showToast(`"${document.originalName}" téléchargé avec succès.`, "success");
    } catch (error) {
      console.error("Erreur téléchargement :", error);
      showToast(error.message || "Impossible de télécharger le document.", "error");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ARCHIVER
  |--------------------------------------------------------------------------
  */

  async function handleArchive(document) {
    try {
      showToast("Archivage en cours...", "info");
      await apiFetch(`/api/documents/${document.id}/archive`, {
        method: "PATCH"
      });
      showToast(`"${document.originalName}" archivé avec succès.`, "success");
      await loadDocuments();
    } catch (error) {
      console.error("Erreur archivage :", error);
      showToast(error.message || "Impossible d'archiver le document.", "error");
    }
  }

  /*
  |--------------------------------------------------------------------------
  | DÉSARCHIVER
  |--------------------------------------------------------------------------
  */

  async function handleUnarchive(document) {
    try {
      showToast("Restauration en cours...", "info");
      await apiFetch(`/api/documents/${document.id}/unarchive`, {
        method: "PATCH"
      });
      showToast(`"${document.originalName}" restauré avec succès.`, "success");
      await loadDocuments();
    } catch (error) {
      console.error("Erreur restauration :", error);
      showToast(error.message || "Impossible de restaurer le document.", "error");
    }
  }

  async function openTransferModal(document) {
    setTransferModal({ open: true, document, recipientUid: "", loading: false });
    setTransferSearchQuery("");
    setTransferRoleFilter("all");
    setTransferClassFilter("all");
    if (recipients.length > 0) return;

    try {
      setRecipientsLoading(true);
      const result = await apiFetch("/api/users");
      setRecipients(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showToast(error.message || "Impossible de charger les destinataires.", "error");
    } finally {
      setRecipientsLoading(false);
    }
  }

  async function handleTransfer(event) {
    event.preventDefault();
    if (!transferModal.document || !transferModal.recipientUid) return;

    try {
      setTransferModal((previous) => ({ ...previous, loading: true }));
      await apiFetch(`/api/documents/${transferModal.document.id}/transfer`, {
        method: "PATCH",
        body: JSON.stringify({ recipientUid: transferModal.recipientUid })
      });
      showToast("Document transféré avec succès.", "success");
      setTransferModal({ open: false, document: null, recipientUid: "", loading: false });
      await loadDocuments();
    } catch (error) {
      showToast(error.message || "Impossible de transférer le document.", "error");
      setTransferModal((previous) => ({ ...previous, loading: false }));
    }
  }

  /*
  |--------------------------------------------------------------------------
  | SUPPRIMER
  |--------------------------------------------------------------------------
  */

  function promptDelete(document) {
    setDeleteModal({
      open: true,
      document,
      loading: false
    });
  }

  async function confirmDelete() {
    if (!deleteModal.document) return;
    try {
      setDeleteModal((prev) => ({ ...prev, loading: true }));
      await apiFetch(`/api/documents/${deleteModal.document.id}`, {
        method: "DELETE"
      });
      showToast(`"${deleteModal.document.originalName}" supprimé avec succès.`, "success");
      setDeleteModal({ open: false, document: null, loading: false });
      await loadDocuments();
    } catch (error) {
      console.error("Erreur suppression :", error);
      showToast(error.message || "Impossible de supprimer le document.", "error");
    }
  }



  /*
  |--------------------------------------------------------------------------
  | STATISTIQUES
  |--------------------------------------------------------------------------
  */

  // Pagination derived values
  const totalPages = Math.max(1, Math.ceil((documents.length || 0) / pageSize));

  // Ensure current page is within bounds
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const displayedDocuments = documents.slice((page - 1) * pageSize, page * pageSize);

  /*
  |--------------------------------------------------------------------------
  | RENDU
  |--------------------------------------------------------------------------
  */

  return (
    <div
      className="dashboard-scroll-area"
      style={{
        height: "100%",
        overflowY: "auto",
        paddingBottom: "40px"
      }}
    >

      {/* HEADER */}

      <div
        className="overview-header"
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "24px",
          gap: "20px"
        }}
      >
        <div>
          <h2 className="overview-title">
            Mes documents
          </h2>

          <p className="overview-subtitle">
            Consultez, envoyez et gérez vos justificatifs.
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={openUploadModal}
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <div style={{ width: "16px", height: "16px" }}>
            <IconPlus />
          </div>
          Importer un document
        </button>
      </div>

      {/* SÉLECTEUR MULTI-ENFANTS POUR LE PROFIL PARENT */}
      {isParent && childrenList.length > 0 && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          padding: "12px 16px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
          flexWrap: "wrap"
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            👨‍👦 Consulter pour :
          </span>
          <button
            type="button"
            onClick={() => setSelectedChildUid("all")}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: selectedChildUid === "all" ? "1px solid #0ea5e9" : "1px solid #e2e8f0",
              background: selectedChildUid === "all" ? "#0ea5e9" : "#f8fafc",
              color: selectedChildUid === "all" ? "#ffffff" : "#475569",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s ease-in-out"
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  border: isSelected ? "1px solid #0ea5e9" : "1px solid #e2e8f0",
                  background: isSelected ? "#0ea5e9" : "#f8fafc",
                  color: isSelected ? "#ffffff" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease-in-out"
                }}
              >
                <span>🎓 {child.displayName || child.email?.split("@")[0]}</span>
                {child.className && (
                  <span style={{
                    fontSize: "0.72rem",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: isSelected ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                    color: isSelected ? "#ffffff" : "#64748b"
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
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          padding: "12px 16px",
          background: "#fffbeb",
          border: "1px solid #fef3c7",
          borderRadius: "12px",
          color: "#b45309",
          fontSize: "0.88rem"
        }}>
          <span>👨‍👦</span>
          <span><strong>Compte Parent :</strong> Aucun profil étudiant n'est actuellement lié à votre compte. Veuillez contacter l'administration pour effectuer le rattachement.</span>
        </div>
      )}

      {/* MESSAGE */}

      {actionMessage && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: "#eff6ff",
            color: "#1d4ed8",
            border:
              "1px solid #bfdbfe"
          }}
        >
          {actionMessage}
        </div>
      )}

      {/* PANEL */}

      <div
        className="panel"
        style={{
          marginTop: "24px"
        }}
      >
        <div
          className="panel-header"
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px"
          }}
        >
          <h3 className="panel-title">
            Bibliothèque de documents
          </h3>

          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems:
                "center",
              flexWrap: "wrap"
            }}
          >
            <div
              className="search-bar"
              style={{
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                boxShadow: "none"
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px"
                }}
              >
                <IconSearch />
              </div>

              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                style={{
                  background:
                    "transparent"
                }}
              />
            </div>

            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filtrer par catégorie">
              <option value="all">Toutes les catégories</option>
              {CATEGORY_OPTIONS.map((category) => (
                <option key={category.value} value={category.value}>{category.label}</option>
              ))}
            </select>
            <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value)} aria-label="Filtrer par origine">
              <option value="all">Tous les documents</option>
              <option value="received">Documents reçus</option>
              <option value="imported">Documents importés</option>
            </select>

          </div>
        </div>

        {/* TABLE */}

        <div
          style={{
            overflowX:
              "auto"
          }}
        >
          <table
            className="data-table"
            style={{
              marginTop: "16px"
            }}
          >
            <thead>
              <tr>
                <th>
                  Document
                </th>
              
                <th>
                  Type de document
                </th>

                <th>
                  Date de réception
                </th>

                <th>
                  Statut
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "40px"
                    }}
                  >
                    Chargement des documents...
                  </td>
                </tr>
              ) : documents.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      textAlign:
                        "center",
                      padding:
                        "50px 20px",
                      color:
                        "#64748b"
                    }}
                  >
                    Aucun document validé à afficher.
                  </td>
                </tr>
              ) : (
                displayedDocuments.map(
                  (document) => (
                    <tr
                      key={
                        document.id
                      }
                    >
                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "12px"
                          }}
                        >
                          <div
                            style={{
                              width:
                                "36px",
                              height:
                                "36px",
                              borderRadius:
                                "8px",
                              background:
                                "#e0f2fe",
                              color:
                                "#0284c7",
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center"
                            }}
                          >
                            <div
                              style={{
                                width:
                                  "18px",
                                height:
                                  "18px"
                              }}
                            >
                              <IconDocument />
                            </div>
                          </div>

                          <div>
                            <div
                              style={{
                                fontWeight:
                                  "600",
                                color:
                                  "#1e293b"
                              }}
                            >
                              {
                                document.originalName
                              }
                            </div>

                            <div
                              style={{
                                fontSize:
                                  "0.78rem",
                                color:
                                  "#94a3b8"
                              }}
                            >
                              {
                                document.mimeType
                              }
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        {
                          formatCategory(
                            document.category
                          )
                        }
                      </td>

                      <td>
                        {formatDate(
                          document.receivedAt ||
                          document.importedAt ||
                          document.createdAt
                        )}
                      </td>

                      <td>
                        {(() => {
                          if (document.status === "rejected") {
                            return <span className="status-badge rejected">Refusé</span>;
                          }
                          if (document.status === "transferred" || document.transferredAt) {
                            if (document.recipientUid === user?.uid) {
                              return (
                                <span className="status-badge" style={{ background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }} title={`Transféré par ${document.transferredByName || "un utilisateur"}`}>
                                  📥 Reçu ({document.transferredByName?.split(" ")[0] || "Transféré"})
                                </span>
                              );
                            }
                            if (document.transferredBy === user?.uid) {
                              return (
                                <span className="status-badge" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" }} title={`Transféré à ${document.recipientName || "Destinataire"}`}>
                                  📤 Transféré ({document.recipientName?.split(" ")[0] || "Envoyé"})
                                </span>
                              );
                            }
                            return <span className="status-badge pending">Transféré</span>;
                          }
                          return <span className="status-badge approved">{formatStatus(document.status)}</span>;
                        })()}
                      </td>

                      <td>
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "6px"
                          }}
                        >
                          {!isStudentAccount && (
                            <button type="button" className="table-action-btn" title="Transférer" onClick={() => openTransferModal(document)}>
                              <IconForward size={18} />
                            </button>
                          )}
                          <button type="button" className="table-action-btn" title="Consulter" onClick={() => handleView(document)}>
                            <IconEye size={18} />
                          </button>
                          {document.archived ? (
                            <button type="button" className="table-action-btn" title="Désarchiver" onClick={() => handleUnarchive(document)}>
                              <IconArchive size={18} style={{ transform: "rotate(180deg)" }} />
                            </button>
                          ) : (
                            <button type="button" className="table-action-btn" title="Archiver" onClick={() => handleArchive(document)}>
                              <IconArchive size={18} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="table-action-btn"
                            title="Télécharger"
                            onClick={() => handleDownload(document)}
                          >
                            <IconDownload size={18} />
                          </button>

                          <button
                            type="button"
                            className="table-action-btn"
                            title="Supprimer"
                            style={{ color: "#ef4444" }}
                            onClick={() => promptDelete(document)}
                          >
                            <IconTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bottom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {documents.length > 0 ? `Affichage ${Math.min((page-1)*pageSize+1, documents.length)}–${Math.min(page*pageSize, documents.length)} sur ${documents.length}` : ''}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button type="button" className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Préc
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`btn-page ${p === page ? 'active' : ''}`}
                style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: p === page ? '#0ea5e9' : '#fff', color: p === page ? '#fff' : '#334155', cursor: 'pointer' }}
              >
                {p}
              </button>
            ))}

            <button type="button" className="btn-secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Suiv
            </button>
          </div>
        </div>
      </div>

      {/* ================================================================
          MODAL UPLOAD
      ================================================================= */}

      {uploadOpen && (
        <div
          className="modal-overlay"
          onClick={
            closeUploadModal
          }
        >
          <div
            className="user-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              maxWidth:
                "620px"
            }}
          >
            <div className="modal-header">
              <div>
                <p className="modal-kicker">
                  Nouveau document
                </p>

                <h3>
                  Importer un document
                </h3>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeUploadModal
                }
                disabled={
                  uploadLoading
                }
              >
                ×
              </button>
            </div>

            <form
              className="user-form"
              onSubmit={
                handleUpload
              }
            >

              {/* FICHIER */}

              <div
                className="field-group"
              >
                <label className="field-label">
                  Document
                </label>

                <input
                  ref={
                    fileInputRef
                  }
                  type="file"
                  accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
                  onChange={
                    handleFileChange
                  }
                  disabled={
                    uploadLoading
                  }
                  className="field-input"
                />

                <small
                  style={{
                    display:
                      "block",
                    marginTop:
                      "6px",
                    color:
                      "#64748b"
                  }}
                >
                  PDF, JPG ou JPEG — 5 Mo maximum.
                </small>

                {selectedFile && (
                  <div
                    style={{
                      marginTop:
                        "12px",
                      padding:
                        "12px",
                      borderRadius:
                        "10px",
                      background:
                        "#f8fafc",
                      border:
                        "1px solid #e2e8f0"
                    }}
                  >
                    <strong>
                      {
                        selectedFile.name
                      }
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "4px",
                        fontSize:
                          "0.85rem",
                        color:
                          "#64748b"
                      }}
                    >
                      {
                        selectedFile.type
                      }{" "}
                      •{" "}
                      {formatSize(
                        selectedFile.size
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CHOIX DE L'ENFANT (PROFIL PARENT) */}
              {role === "parent" && childrenList.length > 0 && (
                <div className="field-group">
                  <label className="field-label" htmlFor="upload-target-child">
                    Document pour l'enfant :
                  </label>
                  <select
                    id="upload-target-child"
                    className="field-input"
                    value={uploadTargetStudentUid}
                    onChange={(e) => setUploadTargetStudentUid(e.target.value)}
                    disabled={uploadLoading}
                    required
                  >
                    {childrenList.map((child) => (
                      <option key={child.uid} value={child.uid}>
                        {child.displayName || child.email?.split("@")[0]} {child.className ? `(${child.className})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* CATÉGORIE */}

              <div
                className="field-group"
              >
                <label className="field-label">
                  Catégorie
                </label>

                <select
                  className="field-input"
                  value={
                    selectedCategory
                  }
                  onChange={(event) =>
                    setSelectedCategory(
                      event.target
                        .value
                    )
                  }
                  disabled={
                    uploadLoading
                  }
                >
                  <option value="">
                    Sélectionnez une catégorie
                  </option>

                  {CATEGORY_OPTIONS.map(
                    (category) => (
                      <option
                        key={
                          category.value
                        }
                        value={
                          category.value
                        }
                      >
                        {
                          category.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* ERREUR */}

              {uploadError && (
                <div
                  role="alert"
                  style={{
                    padding:
                      "14px 16px",
                    borderRadius:
                      "10px",
                    background:
                      "#fef2f2",
                    border:
                      "1px solid #fecaca",
                    color:
                      "#b91c1c"
                  }}
                >
                  <strong>
                    Envoi impossible
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "4px"
                    }}
                  >
                    {
                      uploadError
                    }
                  </div>
                </div>
              )}

              {/* SUCCÈS */}

              {uploadSuccess && (
                <div
                  role="status"
                  style={{
                    padding:
                      "14px 16px",
                    borderRadius:
                      "10px",
                    background:
                      "#f0fdf4",
                    border:
                      "1px solid #bbf7d0",
                    color:
                      "#15803d"
                  }}
                >
                  <strong>
                    Document validé
                  </strong>

                  <div
                    style={{
                      marginTop:
                        "4px"
                    }}
                  >
                    {
                      uploadSuccess
                    }
                  </div>
                </div>
              )}

              {/* ACTIONS */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={
                    closeUploadModal
                  }
                  disabled={
                    uploadLoading
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    uploadLoading ||
                    !selectedFile ||
                    !selectedCategory
                  }
                >
                  {uploadLoading
                    ? "Vérification en cours..."
                    : "Confirmer l'envoi"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL APERÇU / VISUALISATION */}
      {previewModal.open && previewModal.document && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (previewModal.url) URL.revokeObjectURL(previewModal.url);
            setPreviewModal({ open: false, url: null, document: null });
          }}
          style={{ zIndex: 1000 }}
        >
          <div
            className="user-modal"
            style={{
              maxWidth: "920px",
              width: "95vw",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              padding: "20px"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p className="modal-kicker">Aperçu du document</p>
                <h2 className="modal-title" style={{ fontSize: "1.15rem", wordBreak: "break-all", margin: "2px 0" }}>
                  {previewModal.document.originalName}
                </h2>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: "var(--bg-secondary, #f1f5f9)",
                    border: "1px solid #cbd5e1"
                  }}
                  onClick={() => window.open(previewModal.url, "_blank")}
                >
                  Plein écran ↗
                </button>
                <button
                  type="button"
                  style={{
                    padding: "6px 14px",
                    fontSize: "0.85rem",
                    borderRadius: "6px",
                    cursor: "pointer",
                    background: "var(--ynov-cyan, #0ea5e9)",
                    color: "#fff",
                    border: "none"
                  }}
                  onClick={() => handleDownload(previewModal.document)}
                >
                  Télécharger 📥
                </button>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => {
                    if (previewModal.url) URL.revokeObjectURL(previewModal.url);
                    setPreviewModal({ open: false, url: null, document: null });
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: "500px",
                height: "65vh",
                background: "#f8fafc",
                borderRadius: "8px",
                overflow: "hidden",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                border: "1px solid #e2e8f0"
              }}
            >
              {previewModal.document.mimeType === "application/pdf" ||
              previewModal.document.originalName?.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={previewModal.url}
                  title={previewModal.document.originalName}
                  style={{ width: "100%", height: "100%", border: "none" }}
                />
              ) : (
                <img
                  src={previewModal.url}
                  alt={previewModal.document.originalName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain"
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION SUPPRESSION */}
      {deleteModal.open && deleteModal.document && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!deleteModal.loading) setDeleteModal({ open: false, document: null, loading: false });
          }}
          style={{ zIndex: 1050 }}
        >
          <div
            className="user-modal"
            style={{
              maxWidth: "480px",
              width: "90vw",
              padding: "24px",
              textAlign: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "#fee2e2",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px"
              }}
            >
              <IconTrash size={28} />
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#1e293b", marginBottom: "8px" }}>
              Supprimer ce document ?
            </h3>

            <p style={{ fontSize: "0.92rem", color: "#64748b", lineHeight: "1.5", marginBottom: "20px" }}>
              Voulez-vous vraiment supprimer définitivement le document{" "}
              <strong style={{ color: "#0f172a" }}>"{deleteModal.document.originalName}"</strong> ?
              Cette action est irréversible.
            </p>

            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
                disabled={deleteModal.loading}
                onClick={() => setDeleteModal({ open: false, document: null, loading: false })}
              >
                Annuler
              </button>

              <button
                type="button"
                style={{
                  padding: "8px 20px",
                  borderRadius: "6px",
                  cursor: deleteModal.loading ? "not-allowed" : "pointer",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                disabled={deleteModal.loading}
                onClick={confirmDelete}
              >
                {deleteModal.loading ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {transferModal.open && transferModal.document && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!transferModal.loading) {
              setTransferModal({ open: false, document: null, recipientUid: "", loading: false });
              setTransferSearchQuery("");
              setTransferRoleFilter("all");
              setTransferClassFilter("all");
            }
          }}
          style={{ zIndex: 1050 }}
        >
          <div
            className="user-modal"
            onClick={(event) => event.stopPropagation()}
            style={{
              maxWidth: "680px",
              width: "92vw",
              padding: "0",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.25)",
              background: "#ffffff"
            }}
          >
            {/* EN-TÊTE DU MODAL DE TRANSFERT */}
            <div
              style={{
                padding: "20px 24px",
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "#ffffff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "rgba(0, 180, 216, 0.2)",
                    border: "1px solid rgba(0, 180, 216, 0.4)",
                    display: "grid",
                    placeItems: "center",
                    color: "#00b4d8"
                  }}
                >
                  <IconForward className="icon-md" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#ffffff" }}>
                    Transférer le document
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                    Partagez l'accès à ce document avec un utilisateur ou un service
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={transferModal.loading}
                onClick={() => {
                  setTransferModal({ open: false, document: null, recipientUid: "", loading: false });
                  setTransferSearchQuery("");
                  setTransferRoleFilter("all");
                  setTransferClassFilter("all");
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "8px",
                  color: "#ffffff",
                  width: "32px",
                  height: "32px",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center"
                }}
              >
                ×
              </button>
            </div>

            {/* BANNIÈRE RÉCAPITULATIF DU DOCUMENT */}
            <div
              style={{
                padding: "12px 24px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                fontSize: "0.82rem"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <IconDocument className="icon-sm" style={{ color: "#00b4d8", flexShrink: 0 }} />
                <span
                  style={{
                    fontWeight: 700,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {transferModal.document.originalName}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                >
                  {formatCategory(transferModal.document.category)}
                </span>
              </div>
              {transferModal.document.size && (
                <span style={{ fontSize: "0.72rem", color: "#64748b", flexShrink: 0 }}>
                  {formatSize(transferModal.document.size)}
                </span>
              )}
            </div>

            {/* BARRE DE RECHERCHE ET FILTRES PRÉCIS */}
            <div style={{ padding: "16px 24px 10px", borderBottom: "1px solid #f1f5f9" }}>
              {/* Recherche textuelle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "8px 14px",
                  background: "#f8fafc",
                  border: "1.5px solid #cbd5e1",
                  borderRadius: "10px",
                  transition: "border-color 0.2s"
                }}
              >
                <IconSearch className="icon-sm" style={{ color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Rechercher par nom, prénom, email, promotion, filière..."
                  value={transferSearchQuery}
                  onChange={(e) => setTransferSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    fontSize: "0.85rem",
                    color: "#1e293b"
                  }}
                />
                {transferSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setTransferSearchQuery("")}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      padding: 0
                    }}
                    title="Effacer la recherche"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtres par Rôle / Catégorie sous forme de pilules */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginTop: "12px",
                  overflowX: "auto",
                  paddingBottom: "4px"
                }}
              >
                {rolePills.map((pill) => {
                  const isActive = transferRoleFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setTransferRoleFilter(pill.id)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        borderRadius: "999px",
                        border: isActive ? "1.5px solid #00b4d8" : "1px solid #e2e8f0",
                        background: isActive ? "rgba(0, 180, 216, 0.12)" : "#ffffff",
                        color: isActive ? "#0096c7" : "#475569",
                        fontSize: "0.75rem",
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        whiteSpace: "nowrap"
                      }}
                    >
                      <span>{pill.icon}</span>
                      <span>{pill.label}</span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          padding: "1px 6px",
                          borderRadius: "10px",
                          background: isActive ? "#00b4d8" : "#f1f5f9",
                          color: isActive ? "#ffffff" : "#64748b",
                          fontWeight: 700
                        }}
                      >
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filtre précis par classe / promotion si disponible */}
              {availableClasses.length > 0 &&
                (transferRoleFilter === "all" ||
                  transferRoleFilter === "student" ||
                  transferRoleFilter === "children") && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "10px"
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                      Filtrer par classe :
                    </span>
                    <select
                      value={transferClassFilter}
                      onChange={(e) => setTransferClassFilter(e.target.value)}
                      style={{
                        padding: "4px 28px 4px 10px",
                        fontSize: "0.75rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1"
                      }}
                    >
                      <option value="all">Toutes les classes</option>
                      {availableClasses.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
            </div>

            {/* LISTE DES DESTINATAIRES AVEC CARTES ATTRAYANTES */}
            <div
              style={{
                maxHeight: "330px",
                overflowY: "auto",
                padding: "14px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              {recipientsLoading ? (
                <div style={{ padding: "36px", textAlign: "center", color: "#64748b" }}>
                  <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
                  <p style={{ fontSize: "0.85rem" }}>Chargement des destinataires...</p>
                </div>
              ) : filteredRecipients.length === 0 ? (
                <div
                  style={{
                    padding: "32px 20px",
                    textAlign: "center",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    border: "1px dashed #cbd5e1"
                  }}
                >
                  <IconSearch className="icon-lg" style={{ color: "#94a3b8", margin: "0 auto 8px" }} />
                  <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#334155", margin: "0 0 4px" }}>
                    Aucun destinataire trouvé
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: 0 }}>
                    Essayez de modifier votre recherche ou vos filtres.
                  </p>
                  {(transferSearchQuery || transferRoleFilter !== "all" || transferClassFilter !== "all") && (
                    <button
                      type="button"
                      onClick={() => {
                        setTransferSearchQuery("");
                        setTransferRoleFilter("all");
                        setTransferClassFilter("all");
                      }}
                      style={{
                        marginTop: "10px",
                        padding: "6px 14px",
                        borderRadius: "6px",
                        background: "#e2e8f0",
                        border: "none",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#334155",
                        cursor: "pointer"
                      }}
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              ) : (
                filteredRecipients.map((recipient) => {
                  const isSelected = transferModal.recipientUid === recipient.uid;
                  const roleMeta = getRoleMeta(recipient.role);
                  return (
                    <div
                      key={recipient.uid}
                      onClick={() =>
                        setTransferModal((prev) => ({ ...prev, recipientUid: recipient.uid }))
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: isSelected ? "2px solid #00b4d8" : "1px solid #e2e8f0",
                        background: isSelected ? "rgba(0, 180, 216, 0.05)" : "#ffffff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 4px 12px rgba(0, 180, 216, 0.12)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                        {/* Avatar avec initiales */}
                        <div
                          style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "50%",
                            background: roleMeta.avatarBg,
                            color: roleMeta.avatarColor,
                            display: "grid",
                            placeItems: "center",
                            fontWeight: 800,
                            fontSize: "0.82rem",
                            flexShrink: 0
                          }}
                        >
                          {getInitials(recipient.displayName || recipient.email)}
                        </div>

                        {/* Informations Destinataire */}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: "0.86rem",
                                color: "#1e293b",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {recipient.displayName || recipient.email?.split("@")[0]}
                            </span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                padding: "2px 7px",
                                borderRadius: "999px",
                                background: roleMeta.badgeBg,
                                color: roleMeta.badgeColor,
                                fontWeight: 700,
                                flexShrink: 0
                              }}
                            >
                              {roleMeta.icon} {roleMeta.label}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginTop: "2px",
                              flexWrap: "wrap"
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.74rem",
                                color: "#64748b",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {recipient.email}
                            </span>
                            {(recipient.className || recipient.assignedClass) && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  fontWeight: 600,
                                  flexShrink: 0
                                }}
                              >
                                🎓 {recipient.className || recipient.assignedClass}
                              </span>
                            )}
                            {(recipient.department || recipient.service) && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  fontWeight: 600,
                                  flexShrink: 0
                                }}
                              >
                                🏛️ {recipient.department || recipient.service}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Indicateur de Sélection */}
                      <div
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          border: isSelected ? "2px solid #00b4d8" : "2px solid #cbd5e1",
                          background: isSelected ? "#00b4d8" : "transparent",
                          display: "grid",
                          placeItems: "center",
                          color: "#ffffff",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          flexShrink: 0,
                          marginLeft: "12px",
                          transition: "all 0.15s ease"
                        }}
                      >
                        {isSelected && "✓"}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* PIED DE MODAL AVEC DESTINATAIRE SÉLECTIONNÉ ET ACTIONS */}
            <div
              style={{
                padding: "16px 24px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap"
              }}
            >
              <div>
                {selectedRecipient ? (
                  <div style={{ fontSize: "0.8rem", color: "#334155" }}>
                    Transférer à :{" "}
                    <strong style={{ color: "#0f172a" }}>
                      {selectedRecipient.displayName || selectedRecipient.email}
                    </strong>
                    <span style={{ color: "#64748b", marginLeft: "4px" }}>
                      ({getRoleMeta(selectedRecipient.role).label})
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic" }}>
                    Aucun destinataire sélectionné
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={transferModal.loading}
                  onClick={() => {
                    setTransferModal({ open: false, document: null, recipientUid: "", loading: false });
                    setTransferSearchQuery("");
                    setTransferRoleFilter("all");
                    setTransferClassFilter("all");
                  }}
                  style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={transferModal.loading || !transferModal.recipientUid}
                  onClick={handleTransfer}
                  style={{
                    padding: "8px 18px",
                    fontSize: "0.82rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "linear-gradient(135deg, #00b4d8 0%, #0096c7 100%)",
                    border: "none",
                    color: "#ffffff",
                    borderRadius: "8px",
                    cursor: !transferModal.loading && transferModal.recipientUid ? "pointer" : "not-allowed"
                  }}
                >
                  <IconForward className="icon-sm" />
                  {transferModal.loading ? "Transfert en cours..." : "Transférer maintenant"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION TOAST FLOTTANTE */}
      {toast.message && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "8px",
            background: toast.type === "error" ? "#ef4444" : toast.type === "info" ? "#0284c7" : "#10b981",
            color: "#ffffff",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.9rem",
            fontWeight: "500",
            animation: "slideIn 0.25s ease-out"
          }}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast({ message: "", type: "info" })}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              fontSize: "1rem",
              padding: "0 4px"
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function formatStatus(status) {
  const labels = {
    transferred: "Transféré",
    validated: "Validé",
    rejected: "Refusé"
  };
  return labels[status] || "Validé";
}

function isGeneratedDocument(document) {
  return document.generated === true ||
    document.source === "generated" ||
    document.origin === "generated" ||
    String(document.id || "").startsWith("generated-") ||
    String(document.documentId || "").startsWith("generated-");
}

function isReceivedDocument(document, currentUid) {
  if (document.received === true || document.source === "received" || document.origin === "received" || document.status === "received") {
    return true;
  }
  if (currentUid && (document.recipientUid === currentUid || document.transferredTo === currentUid)) {
    return true;
  }
  return false;
}