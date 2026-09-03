import { apiFetch } from "./api";

/*
|--------------------------------------------------------------------------
| CATÉGORIES
|--------------------------------------------------------------------------
*/

export const DOCUMENT_CATEGORIES = [
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

/*
|--------------------------------------------------------------------------
| UPLOAD
|--------------------------------------------------------------------------
*/

export async function uploadDocument(
  file,
  metadata = {}
) {
  if (!file) {
    throw new Error(
      "Aucun fichier sélectionné."
    );
  }

  const formData =
    new FormData();

  formData.append(
    "document",
    file
  );

  if (metadata.category) {
    formData.append(
      "category",
      metadata.category
    );
  }

  return apiFetch(
    "/api/documents/upload",
    {
      method: "POST",
      body: formData
    }
  );
}

/*
|--------------------------------------------------------------------------
| MES DOCUMENTS
|--------------------------------------------------------------------------
*/

export async function getMyDocuments(
  filters = {}
) {
  const params =
    new URLSearchParams();

  if (
    filters.search
  ) {
    params.set(
      "search",
      filters.search
    );
  }

  if (
    filters.status &&
    filters.status !== "all"
  ) {
    params.set(
      "status",
      filters.status
    );
  }

  if (
    filters.category &&
    filters.category !== "all"
  ) {
    params.set(
      "category",
      filters.category
    );
  }

  if (
    filters.archived
  ) {
    params.set(
      "archived",
      filters.archived
    );
  }

  if (filters.from) {
    params.set(
      "from",
      filters.from
    );
  }

  if (filters.to) {
    params.set(
      "to",
      filters.to
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

  return result.data || [];
}

/*
|--------------------------------------------------------------------------
| DOCUMENT
|--------------------------------------------------------------------------
*/

export async function getDocument(
  documentId
) {
  return apiFetch(
    `/api/documents/${documentId}`
  );
}

/*
|--------------------------------------------------------------------------
| ARCHIVER
|--------------------------------------------------------------------------
*/

export async function archiveDocument(
  documentId
) {
  return apiFetch(
    `/api/documents/${documentId}/archive`,
    {
      method: "PATCH"
    }
  );
}

/*
|--------------------------------------------------------------------------
| DÉSARCHIVER
|--------------------------------------------------------------------------
*/

export async function unarchiveDocument(
  documentId
) {
  return apiFetch(
    `/api/documents/${documentId}/unarchive`,
    {
      method: "PATCH"
    }
  );
}

/*
|--------------------------------------------------------------------------
| SUPPRESSION
|--------------------------------------------------------------------------
*/

export async function deleteDocument(
  documentId
) {
  return apiFetch(
    `/api/documents/${documentId}`,
    {
      method: "DELETE"
    }
  );
}