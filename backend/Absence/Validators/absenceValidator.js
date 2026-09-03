/**
 * Validator pour les demandes d'absence
 */

export const ABSENCE_TYPES = ["medical", "personal", "authorized_leave", "unjustified", "other", "late"];

export const ABSENCE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  TO_JUSTIFY: "to_justify",
  TO_JUSTIFY_LATE: "to_justify_late" // 🔥 NOUVEAU : statut pour les retards à justifier
};

/**
 * Valide les données lors de la soumission d'une demande d'absence (étudiant)
 */
export function validateSubmitAbsence({ type, startDate, endDate, reason }) {
  if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
    return { valid: false, error: "Le motif (reason) de l'absence est obligatoire." };
  }

  if (!type || !ABSENCE_TYPES.includes(type)) {
    return { 
      valid: false, 
      error: `Type d'absence invalide. Valeurs autorisées: ${ABSENCE_TYPES.join(", ")}` 
    };
  }

  if (!startDate || !endDate) {
    return { valid: false, error: "Veuillez fournir une date de début (startDate) et une date de fin (endDate)." };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: "Les dates fournies (startDate / endDate) sont invalides." };
  }

  if (start > end) {
    return { valid: false, error: "La date de début ne peut pas être postérieure à la date de fin." };
  }

  return { valid: true };
}

/**
 * Valide les données lors de la révision d'une demande d'absence (Approbation / Rejet)
 */
export function validateReviewAbsence({ status }) {
  if (!status || ![ABSENCE_STATUS.APPROVED, ABSENCE_STATUS.REJECTED].includes(status)) {
    return { 
      valid: false, 
      error: `Statut de révision invalide. Doit être '${ABSENCE_STATUS.APPROVED}' ou '${ABSENCE_STATUS.REJECTED}'.` 
    };
  }

  return { valid: true };
}

/**
 * Valide les données pour la déclaration d'absence par un professeur
 */
export function validateTeacherDeclareAbsence({ studentId, startDate, endDate, reason, courseName, type }) {
  if (!studentId) {
    return { valid: false, error: "L'ID de l'étudiant est obligatoire." };
  }

  if (!startDate || !endDate) {
    return { valid: false, error: "Veuillez fournir une date de début et une date de fin." };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: "Les dates fournies sont invalides." };
  }

  if (start > end) {
    return { valid: false, error: "La date de début ne peut pas être postérieure à la date de fin." };
  }

  if (!reason || reason.trim().length === 0) {
    return { valid: false, error: "Le motif de l'absence est obligatoire." };
  }

  // 🔥 Valider le type si fourni
  if (type && !ABSENCE_TYPES.includes(type)) {
    return { 
      valid: false, 
      error: `Type d'absence invalide. Valeurs autorisées: ${ABSENCE_TYPES.join(", ")}` 
    };
  }

  return { valid: true };
}