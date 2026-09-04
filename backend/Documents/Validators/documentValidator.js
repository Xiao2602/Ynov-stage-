import path from "path";
import { fileTypeFromBuffer } from "file-type";

export const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo

export const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png"
];

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png"
];

/*
|--------------------------------------------------------------------------
| NOM DU FICHIER
|--------------------------------------------------------------------------
*/

export function validateFilename(filename) {
  if (!filename) {
    return {
      valid: false,
      reason: "Nom de fichier manquant."
    };
  }

  if (
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return {
      valid: false,
      reason: "Nom de fichier invalide."
    };
  }

  if (filename.includes("..")) {
    return {
      valid: false,
      reason: "Nom de fichier interdit."
    };
  }

  for (const char of filename) {
    if (char.charCodeAt(0) < 32) {
      return {
        valid: false,
        reason: "Nom de fichier contenant des caractères interdits."
      };
    }
  }

  const extension = path.extname(filename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      reason: "Extension interdite. Extensions autorisées : PDF, JPG, JPEG et PNG."
    };
  }

  return {
    valid: true,
    extension
  };
}

/*
|--------------------------------------------------------------------------
| TAILLE
|--------------------------------------------------------------------------
*/

export function validateSize(buffer) {
  if (!buffer || buffer.length === 0) {
    return {
      valid: false,
      reason: "Le fichier est vide."
    };
  }

  if (buffer.length > MAX_SIZE) {
    return {
      valid: false,
      reason: "Taille excessive : maximum 5 Mo."
    };
  }

  return {
    valid: true
  };
}

/*
|--------------------------------------------------------------------------
| PDF
|--------------------------------------------------------------------------
*/

export function validatePdfStructure(buffer) {
  const text = buffer.toString("latin1");

  if (!text.startsWith("%PDF-")) {
    return {
      valid: false,
      reason: "Signature PDF invalide."
    };
  }

  if (!text.includes("%%EOF")) {
    return {
      valid: false,
      reason: "Le fichier PDF semble incomplet ou corrompu."
    };
  }

  const headerMatch = text.match(/^%PDF-(\d+)\.(\d+)/);

  if (!headerMatch) {
    return {
      valid: false,
      reason: "Version PDF invalide."
    };
  }

  const major = Number(headerMatch[1]);
  const minor = Number(headerMatch[2]);

  if (major > 2 || (major === 2 && minor > 0)) {
    return {
      valid: false,
      reason: "Version PDF non supportée."
    };
  }

  return {
    valid: true
  };
}

/*
|--------------------------------------------------------------------------
| JPEG
|--------------------------------------------------------------------------
*/

export function validateJpegStructure(buffer) {
  if (
    buffer.length < 3 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer[2] !== 0xff
  ) {
    return {
      valid: false,
      reason: "Signature JPEG invalide."
    };
  }

  return {
    valid: true
  };
}

/*
|--------------------------------------------------------------------------
| PNG
|--------------------------------------------------------------------------
*/

export function validatePngStructure(buffer) {
  if (
    buffer.length < 8 ||
    buffer[0] !== 0x89 ||
    buffer[1] !== 0x50 ||
    buffer[2] !== 0x4e ||
    buffer[3] !== 0x47 ||
    buffer[4] !== 0x0d ||
    buffer[5] !== 0x0a ||
    buffer[6] !== 0x1a ||
    buffer[7] !== 0x0a
  ) {
    return {
      valid: false,
      reason: "Signature PNG invalide."
    };
  }

  return {
    valid: true
  };
}

/*
|--------------------------------------------------------------------------
| VALIDATION COMPLÈTE
|--------------------------------------------------------------------------
*/

export async function validateDocument({
  buffer,
  originalname,
  mimetype
}) {
  const filenameResult = validateFilename(originalname);
  if (!filenameResult.valid) {
    return filenameResult;
  }

  const sizeResult = validateSize(buffer);
  if (!sizeResult.valid) {
    return sizeResult;
  }

  let detectedType;
  try {
    detectedType = await fileTypeFromBuffer(buffer);
  } catch (error) {
    console.error("Erreur file-type :", error);
    return {
      valid: false,
      reason: "Impossible de déterminer le type réel du fichier."
    };
  }

  const detectedMime = detectedType?.mime || null;

  if (!detectedMime || !ALLOWED_MIME.includes(detectedMime)) {
    return {
      valid: false,
      reason: `Type de fichier non autorisé. Type détecté : ${detectedMime || "inconnu"}`
    };
  }

  if (mimetype && mimetype !== detectedMime) {
    return {
      valid: false,
      reason: `Le type déclaré (${mimetype}) ne correspond pas au type réel (${detectedMime}).`
    };
  }

  const extension = filenameResult.extension;

  if (detectedMime === "application/pdf" && extension !== ".pdf") {
    return {
      valid: false,
      reason: "L'extension du fichier ne correspond pas à son contenu."
    };
  }

  if (
    detectedMime === "image/jpeg" &&
    ![".jpg", ".jpeg"].includes(extension)
  ) {
    return {
      valid: false,
      reason: "L'extension du fichier ne correspond pas à son contenu."
    };
  }

  if (
    detectedMime === "image/png" &&
    extension !== ".png"
  ) {
    return {
      valid: false,
      reason: "L'extension du fichier ne correspond pas à son contenu."
    };
  }

  if (detectedMime === "application/pdf") {
    const pdfResult = validatePdfStructure(buffer);
    if (!pdfResult.valid) {
      return pdfResult;
    }
  }

  if (detectedMime === "image/jpeg") {
    const jpegResult = validateJpegStructure(buffer);
    if (!jpegResult.valid) {
      return jpegResult;
    }
  }

  if (detectedMime === "image/png") {
    const pngResult = validatePngStructure(buffer);
    if (!pngResult.valid) {
      return pngResult;
    }
  }

  return {
    valid: true,
    detectedMime,
    extension,
    size: buffer.length
  };
}

/*
|--------------------------------------------------------------------------
| CATÉGORIES
|--------------------------------------------------------------------------
*/

export const DOCUMENT_CATEGORIES = [
  "justificatif_absence",
  "certificat_medical",
  "attestation_scolarite",
  "releve_notes",
  "convention_stage",
  "contrat",
  "administratif",
  "autre"
];

/*
|--------------------------------------------------------------------------
| VALIDATION CATÉGORIE
|--------------------------------------------------------------------------
*/

export function validateDocumentCategory(category) {
  if (!category) {
    return {
      valid: false,
      reason: "La catégorie du document est obligatoire."
    };
  }

  if (!DOCUMENT_CATEGORIES.includes(category)) {
    return {
      valid: false,
      reason: "Catégorie de document invalide."
    };
  }

  return {
    valid: true,
    category
  };
}
