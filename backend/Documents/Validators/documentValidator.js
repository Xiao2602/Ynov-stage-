/**
 * Validator pour le téléchargement de documents (Justificatifs d'absence)
 */

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp"
];

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 Mo

/**
 * Valide le fichier téléchargé via Multer
 * 
 * @param {Object} file - Objet req.file généré par Multer
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUploadedFile(file) {
  if (!file) {
    return { valid: false, error: "Aucun fichier n'a été fourni. Veuillez sélectionner un justificatif." };
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Format de fichier '${file.mimetype}' non autorisé. Formats acceptés : PDF, PNG, JPEG, WEBP.` 
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: "Le fichier dépasse la taille maximale autorisée de 5 Mo." };
  }

  return { valid: true };
}
