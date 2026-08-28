/**
 * Validateur pour les demandes de documents administratifs
 */

export const ALLOWED_DOCUMENT_TYPES = [
  "Attestation de scolarité",
  "Certificat de scolarité",
  "Relevé de notes",
  "Convention de stage",
  "Attestation de réussite",
  "Autre document administratif"
];

export const DOCUMENT_REQUEST_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled"
};

export const ALLOWED_URGENCIES = [
  "normal",
  "urgent",
  "tres_urgent"
];

/**
 * Validation de la création d'une demande de document
 */
export function validateCreateDocumentRequest(body) {
  if (!body) {
    return { valid: false, error: "Le corps de la requête est vide." };
  }

  const type = body.documentType || body.type;
  if (!type || typeof type !== "string" || !type.trim()) {
    return { valid: false, error: "Le type de document est obligatoire." };
  }

  const message = body.message;
  if (message && (typeof message !== "string" || message.trim().length < 3)) {
    return { valid: false, error: "Le message doit comporter au moins 3 caractères s'il est fourni." };
  }

  const urgency = body.urgency || "normal";
  if (!ALLOWED_URGENCIES.includes(urgency)) {
    return { valid: false, error: `Niveau d'urgence invalide. Valeurs acceptées : ${ALLOWED_URGENCIES.join(", ")}.` };
  }

  return {
    valid: true,
    data: {
      type: type.trim(),
      message: message ? message.trim() : "",
      urgency,
      studentUid: body.studentUid ? String(body.studentUid).trim() : null
    }
  };
}

/**
 * Validation de l'affectation d'une demande
 */
export function validateAssignDocumentRequest(body) {
  if (!body || (!body.assignedTo && !body.assignedToUid)) {
    return { valid: false, error: "L'identifiant de l'agent affecté (assignedTo) est obligatoire." };
  }

  const assignedTo = body.assignedTo || body.assignedToUid;
  const assignedToName = body.assignedToName || "";

  return {
    valid: true,
    data: {
      assignedTo: String(assignedTo).trim(),
      assignedToName: String(assignedToName).trim()
    }
  };
}

/**
 * Validation du refus d'une demande
 */
export function validateRejectDocumentRequest(body) {
  const reason = body?.reason || body?.rejectionReason;
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return { valid: false, error: "Le motif du refus est obligatoire et doit contenir au moins 3 caractères." };
  }

  return {
    valid: true,
    data: {
      reason: reason.trim()
    }
  };
}

/**
 * Validation de l'approbation d'une demande
 */
export function validateApproveDocumentRequest(body) {
  const documentId = body?.documentId ? String(body.documentId).trim() : null;
  const documentUrl = body?.documentUrl ? String(body.documentUrl).trim() : null;
  const note = body?.note ? String(body.note).trim() : "";

  return {
    valid: true,
    data: {
      documentId,
      documentUrl,
      note
    }
  };
}
