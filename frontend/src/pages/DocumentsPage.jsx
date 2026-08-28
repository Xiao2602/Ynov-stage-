import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  IconDocument,
  IconSearch,
  IconFileCheck,
  IconFolder,
  IconEye,
  IconPlus,
  IconDownload,
  IconTrash,
  IconArchive
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

  if (
    value?.seconds
  ) {
    date =
      new Date(
        value.seconds * 1000
      );
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

  function showToast(message, type = "success") {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "info" });
    }, 3500);
  }



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
          ? result.documents
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
    archiveFilter
  ]);

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

      const blob = await apiFetchBlob(`/api/documents/${document.id}/view`);
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
      const blob = await apiFetchBlob(`/api/documents/${document.id}/download`);
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

  const totalDocuments =
    documents.length;

  const archivedCount =
    documents.filter(
      (document) =>
        document.archived
    ).length;

  const activeCount =
    documents.filter(
      (document) =>
        !document.archived
    ).length;

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
          onClick={
            openUploadModal
          }
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: "8px"
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px"
            }}
          >
            <IconPlus />
          </div>

          Importer un document
        </button>
      </div>

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

      {/* STATS */}

      <div
        className="stats-grid"
        style={{
          gridTemplateColumns:
            "repeat(3, 1fr)"
        }}
      >
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">
              Documents validés
            </span>

            <div
              className="stat-icon-wrapper"
              style={{
                width: "32px",
                height: "32px",
                color:
                  "var(--ynov-teal)"
              }}
            >
              <IconFileCheck />
            </div>
          </div>

          <div className="stat-value-container">
            <span className="stat-value">
              {totalDocuments}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">
              Documents actifs
            </span>

            <div
              className="stat-icon-wrapper"
              style={{
                width: "32px",
                height: "32px",
                color:
                  "var(--ynov-gray-500)"
              }}
            >
              <IconFolder />
            </div>
          </div>

          <div className="stat-value-container">
            <span className="stat-value">
              {activeCount}
            </span>
          </div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-title">
              Archives
            </span>

            <div
              className="stat-icon-wrapper"
              style={{
                width: "32px",
                height: "32px",
                color:
                  "var(--status-pending)"
              }}
            >
              <IconDocument />
            </div>
          </div>

          <div className="stat-value-container">
            <span className="stat-value">
              {archivedCount}
            </span>
          </div>
        </div>
      </div>

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

            <select
              value={
                categoryFilter
              }
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
              style={{
                padding:
                  "8px 12px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #e2e8f0",
                background: "#fff",
                color:
                  "#334155",
                fontSize:
                  "0.85rem",
                outline: "none",
                cursor:
                  "pointer"
              }}
            >
              <option value="all">
                Toutes les catégories
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
                    {category.label}
                  </option>
                )
              )}
            </select>

            <select
              value={
                archiveFilter
              }
              onChange={(event) =>
                setArchiveFilter(
                  event.target.value
                )
              }
              style={{
                padding:
                  "8px 12px",
                borderRadius:
                  "8px",
                border:
                  "1px solid #e2e8f0",
                background: "#fff",
                color:
                  "#334155",
                fontSize:
                  "0.85rem",
                outline: "none",
                cursor:
                  "pointer"
              }}
            >
              <option value="active">
                Documents actifs
              </option>

              <option value="archived">
                Documents archivés
              </option>

              <option value="all">
                Tous les documents
              </option>
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
                  Catégorie
                </th>

                <th>
                  Taille
                </th>

                <th>
                  Date
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
                documents.map(
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

                      <td
                        style={{
                          color:
                            "#64748b"
                        }}
                      >
                        {formatSize(
                          document.size
                        )}
                      </td>

                      <td>
                        {formatDate(
                          document.createdAt
                        )}
                      </td>

                      <td>
                        <span className="status-badge approved">
                          Validé
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
                          <button
                            type="button"
                            className="table-action-btn"
                            title="Consulter"
                            onClick={() => handleView(document)}
                          >
                            <IconEye size={18} />
                          </button>

                          <button
                            type="button"
                            className="table-action-btn"
                            title="Télécharger"
                            onClick={() => handleDownload(document)}
                          >
                            <IconDownload size={18} />
                          </button>

                          {document.archived ? (
                            <button
                              type="button"
                              className="table-action-btn"
                              title="Désarchiver"
                              onClick={() => handleUnarchive(document)}
                            >
                              <IconArchive size={18} style={{ transform: "rotate(180deg)" }} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="table-action-btn"
                              title="Archiver"
                              onClick={() => handleArchive(document)}
                            >
                              <IconArchive size={18} />
                            </button>
                          )}

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