import React, {
  useEffect,
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
  IconForward
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
            if (originFilter === "received") return isReceivedDocument(document);
            if (originFilter === "imported") return !isGeneratedDocument(document);
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
                        <span className={`status-badge ${document.status === "rejected" ? "rejected" : document.status === "transferred" ? "pending" : "approved"}`}>
                          {formatStatus(document.status)}
                        </span>
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
            if (!transferModal.loading) setTransferModal({ open: false, document: null, recipientUid: "", loading: false });
          }}
          style={{ zIndex: 1050 }}
        >
          <div
            className="user-modal"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: "520px", width: "90vw", padding: "24px" }}
          >
            <div className="modal-header">
              <div>
                <p className="modal-kicker">Partage du document</p>
                <h3>Transférer le document</h3>
              </div>
              <button
                type="button"
                className="modal-close"
                disabled={transferModal.loading}
                onClick={() => setTransferModal({ open: false, document: null, recipientUid: "", loading: false })}
              >
                ×
              </button>
            </div>

            <form className="user-form" onSubmit={handleTransfer}>
              <p style={{ color: "#64748b", marginTop: 0 }}>
                Sélectionnez la personne qui recevra « {transferModal.document.originalName} ».
              </p>
              <div className="field-group">
                <label className="field-label" htmlFor="document-recipient">Destinataire</label>
                <select
                  id="document-recipient"
                  className="field-input"
                  value={transferModal.recipientUid}
                  onChange={(event) => setTransferModal((previous) => ({ ...previous, recipientUid: event.target.value }))}
                  disabled={recipientsLoading || transferModal.loading}
                  required
                >
                  <option value="">
                    {recipientsLoading ? "Chargement..." : "Choisir un destinataire"}
                  </option>
                  {recipients
                    .filter((recipient) => recipient.uid !== user?.uid && recipient.uid !== transferModal.document.uid)
                    .map((recipient) => (
                      <option key={recipient.uid} value={recipient.uid}>
                        {recipient.displayName || recipient.email || recipient.uid} {recipient.role ? `(${recipient.role})` : ""}
                      </option>
                    ))}
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={transferModal.loading}
                  onClick={() => setTransferModal({ open: false, document: null, recipientUid: "", loading: false })}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-primary" disabled={transferModal.loading || !transferModal.recipientUid}>
                  {transferModal.loading ? "Transfert..." : "Transférer"}
                </button>
              </div>
            </form>
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

function isReceivedDocument(document) {
  return document.received === true ||
    document.source === "received" ||
    document.origin === "received" ||
    document.status === "received" ||
    Boolean(document.recipientUid);
}