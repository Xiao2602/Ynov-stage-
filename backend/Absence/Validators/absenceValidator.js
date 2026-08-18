/**
 * Validator pour les demandes d'absence
 */

export const ABSENCE_TYPES = ["medical", "personal", "authorized_leave", "unjustified", "other"];
export const ABSENCE_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected"
};

/**
 * Valide les données lors de la soumission d'une demande d'absence
 * 
 * @param {Object} data 
 * @returns {{ valid: boolean, error?: string }}
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
 * 
 * @param {Object} data 
 * @returns {{ valid: boolean, error?: string }}
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
