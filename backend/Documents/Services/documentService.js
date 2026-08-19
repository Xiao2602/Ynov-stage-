import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

import { adminDb } from "../../firebaseAdmin.js";

import {
  validateDocument,
  validateDocumentCategory
} from "../Validators/documentValidator.js";

/*
|--------------------------------------------------------------------------
| STOCKAGE LOCAL
|--------------------------------------------------------------------------
*/

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  "storage-local"
);

const QUARANTINE_DIR = path.join(
  STORAGE_ROOT,
  "quarantine"
);

const JUSTIFICATIFS_DIR = path.join(
  STORAGE_ROOT,
  "justificatifs"
);

const ARCHIVE_DIR = path.join(
  STORAGE_ROOT,
  "archives"
);

/*
|--------------------------------------------------------------------------
| CATÉGORIES
|--------------------------------------------------------------------------
*/

export const DOCUMENT_CATEGORIES = {
  JUSTIFICATIF_ABSENCE:
    "justificatif_absence",

  CERTIFICAT_MEDICAL:
    "certificat_medical",

  ATTESTATION_SCOLARITE:
    "attestation_scolarite",

  RELEVE_NOTES:
    "releve_notes",

  CONVENTION_STAGE:
    "convention_stage",

  CONTRAT:
    "contrat",

  ADMINISTRATIF:
    "administratif",

  AUTRE:
    "autre"
};

/*
|--------------------------------------------------------------------------
| INITIALISATION
|--------------------------------------------------------------------------
*/

async function ensureStorageDirectories() {
  await fs.mkdir(
    QUARANTINE_DIR,
    { recursive: true }
  );

  await fs.mkdir(
    JUSTIFICATIFS_DIR,
    { recursive: true }
  );

  await fs.mkdir(
    ARCHIVE_DIR,
    { recursive: true }
  );
}

/*
|--------------------------------------------------------------------------
| NETTOYAGE NOM
|--------------------------------------------------------------------------
*/

function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

/*
|--------------------------------------------------------------------------
| UPLOAD
|--------------------------------------------------------------------------
*/

export async function uploadDocumentService({
  user,
  file,
  body
}) {
  await ensureStorageDirectories();

  if (!user?.uid) {
    return {
      success: false,
      error: "Utilisateur non authentifié."
    };
  }

  if (!file?.buffer) {
    return {
      success: false,
      error: "Aucun fichier reçu."
    };
  }

  /*
   * Catégorie
   */

  const category =
    body?.category?.trim();

  const categoryValidation =
    validateDocumentCategory(category);

  if (!categoryValidation.valid) {
    return {
      success: false,
      error: categoryValidation.reason
    };
  }

  /*
   * ID document
   */

  const documentId =
    crypto.randomUUID();

  const safeFilename =
    sanitizeFilename(file.originalname);

  const quarantineFilename =
    `${documentId}-${safeFilename}`;

  const quarantinePath =
    path.join(
      QUARANTINE_DIR,
      quarantineFilename
    );

  /*
   * 1. QUARANTAINE
   */

  await fs.writeFile(
    quarantinePath,
    file.buffer
  );

  try {
    /*
     * 2. VALIDATION
     */

    const validation =
      await validateDocument({
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype
      });

    /*
     * 3. REJET
     *
     * Le fichier est supprimé.
     * Aucun document Firestore n'est créé.
     */

    if (!validation.valid) {
      await fs.rm(
        quarantinePath,
        { force: true }
      );

      return {
        success: false,
        rejected: true,
        error: validation.reason
      };
    }

    /*
     * 4. NOM FINAL
     */

    const finalFilename =
      `${documentId}-${safeFilename}`;

    const finalPath =
      path.join(
        JUSTIFICATIFS_DIR,
        finalFilename
      );

    /*
     * 5. SORTIE DE QUARANTAINE
     */

    await fs.rename(
      quarantinePath,
      finalPath
    );

    /*
     * 6. HASH SHA-256
     */

    const hash =
      crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");

    /*
     * 7. FIRESTORE
     */

    const documentData = {
      id: documentId,

      uid: user.uid,

      originalName:
        file.originalname,

      filename:
        finalFilename,

      mimeType:
        validation.detectedMime,

      size:
        validation.size,

      category,

      status:
        "validated",

      archived:
        false,

      storageArea:
        "justificatifs",

      storagePath:
        finalPath,

      sha256:
        hash,

      createdAt:
        new Date(),

      updatedAt:
        new Date()
    };

    await adminDb
      .collection("documents")
      .doc(documentId)
      .set(documentData);

    return {
      success: true,

      message:
        "Document validé et enregistré avec succès.",

      document: {
        id: documentId,
        name: file.originalname,
        category,
        status: "validated",
        archived: false,
        mimeType:
          validation.detectedMime,
        size: validation.size
      }
    };

  } catch (error) {

    /*
     * En cas d'erreur inattendue :
     * suppression du fichier en quarantaine.
     */

    await fs.rm(
      quarantinePath,
      { force: true }
    ).catch(() => {});

    console.error(
      "Erreur uploadDocumentService :",
      error
    );

    return {
      success: false,
      error:
        "Impossible de traiter le document."
    };
  }
}

/*
|--------------------------------------------------------------------------
| MES DOCUMENTS
|--------------------------------------------------------------------------
*/

export async function getMyDocumentsService(
  uid,
  filters = {}
) {
  if (!uid) {
    return {
      success: false,
      error: "Utilisateur non authentifié."
    };
  }

  const profileSnapshot = await adminDb
    .collection("users")
    .doc(uid)
    .get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  let ownerUids = [uid];

  if (profile.role === "parent" && Array.isArray(profile.children)) {
    const childrenByName = new Map(
      profile.children
        .filter((child) => child?.name)
        .map((child) => [child.name.trim().toLowerCase(), child])
    );
    const usersSnapshot = await adminDb.collection("users").get();
    ownerUids = usersSnapshot.docs
      .map((doc) => doc.data())
      .filter((student) => childrenByName.has((student.displayName || "").trim().toLowerCase()))
      .map((student) => student.uid)
      .filter(Boolean);
  }

  const documentsSnapshot = await adminDb.collection("documents").get();

  let documents =
    documentsSnapshot.docs
      .filter((doc) => ownerUids.includes(doc.data().uid))
      .map(
      (doc) => ({
        id: doc.id,
        ...doc.data()
      })
      );

  /*
   * IMPORTANT :
   * seuls les documents validés sont visibles.
   */

  documents =
    documents.filter(
      (doc) =>
        doc.status === "validated"
    );

  /*
   * Archives
   */

  if (
    filters.archived !== undefined
  ) {
    const archived =
      filters.archived === true ||
      filters.archived === "true";

    documents =
      documents.filter(
        (doc) =>
          Boolean(doc.archived) === archived
      );
  }

  /*
   * Catégorie
   */

  if (filters.category) {
    documents =
      documents.filter(
        (doc) =>
          doc.category ===
          filters.category
      );
  }

  /*
   * Recherche
   */

  if (filters.search) {
    const search =
      filters.search
        .toLowerCase()
        .trim();

    documents =
      documents.filter(
        (doc) =>
          String(
            doc.originalName || ""
          )
            .toLowerCase()
            .includes(search) ||

          String(
            doc.category || ""
          )
            .toLowerCase()
            .includes(search)
      );
  }

  /*
   * Statut
   */

  if (filters.status) {
    documents =
      documents.filter(
        (doc) =>
          doc.status ===
          filters.status
      );
  }

  /*
   * Tri
   */

  documents.sort(
    (a, b) => {
      const dateA =
        a.createdAt?.toDate
          ? a.createdAt.toDate()
          : new Date(a.createdAt || 0);

      const dateB =
        b.createdAt?.toDate
          ? b.createdAt.toDate()
          : new Date(b.createdAt || 0);

      return (
        dateB.getTime() -
        dateA.getTime()
      );
    }
  );

  /*
   * Ne jamais envoyer le chemin local
   * au frontend.
   */

  documents =
    documents.map(
      ({
        storagePath,
        ...document
      }) => document
    );

  return {
    success: true,
    documents
  };
}

/*
|--------------------------------------------------------------------------
| RÉCUPÉRER UN DOCUMENT
|--------------------------------------------------------------------------
*/

export async function getDocumentService({
  documentId,
  user
}) {
  const snapshot =
    await adminDb
      .collection("documents")
      .doc(documentId)
      .get();

  if (!snapshot.exists) {
    return {
      success: false,
      error:
        "Document introuvable."
    };
  }

  const document = {
    id: snapshot.id,
    ...snapshot.data()
  };

  /*
   * Sécurité propriétaire
   */

  if (
    document.uid !== user.uid
  ) {
    return {
      success: false,
      error:
        "Accès refusé."
    };
  }

  /*
   * Seuls les validés sont accessibles.
   */

  if (
    document.status !==
    "validated"
  ) {
    return {
      success: false,
      error:
        "Ce document n'est pas disponible."
    };
  }

  return {
    success: true,
    document
  };
}

/*
|--------------------------------------------------------------------------
| ARCHIVER
|--------------------------------------------------------------------------
*/

export async function archiveDocumentService({
  documentId,
  user
}) {
  const result =
    await getDocumentService({
      documentId,
      user
    });

  if (!result.success) {
    return result;
  }

  const document =
    result.document;

  if (document.archived) {
    return {
      success: true,
      message:
        "Le document est déjà archivé."
    };
  }

  await ensureStorageDirectories();

  const oldPath =
    document.storagePath;

  const newPath =
    path.join(
      ARCHIVE_DIR,
      document.filename
    );

  await fs.rename(
    oldPath,
    newPath
  );

  await adminDb
    .collection("documents")
    .doc(documentId)
    .update({
      archived: true,
      storageArea: "archives",
      storagePath: newPath,
      updatedAt: new Date()
    });

  return {
    success: true,
    message:
      "Document archivé avec succès."
  };
}

/*
|--------------------------------------------------------------------------
| DÉSARCHIVER
|--------------------------------------------------------------------------
*/

export async function unarchiveDocumentService({
  documentId,
  user
}) {
  const snapshot =
    await adminDb
      .collection("documents")
      .doc(documentId)
      .get();

  if (!snapshot.exists) {
    return {
      success: false,
      error:
        "Document introuvable."
    };
  }

  const document = {
    id: snapshot.id,
    ...snapshot.data()
  };

  if (
    document.uid !== user.uid
  ) {
    return {
      success: false,
      error:
        "Accès refusé."
    };
  }

  if (!document.archived) {
    return {
      success: true,
      message:
        "Le document n'est pas archivé."
    };
  }

  await ensureStorageDirectories();

  const oldPath =
    document.storagePath;

  const newPath =
    path.join(
      JUSTIFICATIFS_DIR,
      document.filename
    );

  await fs.rename(
    oldPath,
    newPath
  );

  await adminDb
    .collection("documents")
    .doc(documentId)
    .update({
      archived: false,
      storageArea:
        "justificatifs",
      storagePath: newPath,
      updatedAt: new Date()
    });

  return {
    success: true,
    message:
      "Document restauré avec succès."
  };
}

/*
|--------------------------------------------------------------------------
| SUPPRESSION
|--------------------------------------------------------------------------
*/

export async function deleteDocumentService({
  documentId,
  user
}) {
  const snapshot =
    await adminDb
      .collection("documents")
      .doc(documentId)
      .get();

  if (!snapshot.exists) {
    return {
      success: false,
      error:
        "Document introuvable."
    };
  }

  const document = {
    id: snapshot.id,
    ...snapshot.data()
  };

  if (
    document.uid !== user.uid
  ) {
    return {
      success: false,
      error:
        "Accès refusé."
    };
  }

  /*
   * Suppression fichier
   */

  if (document.storagePath) {
    await fs.rm(
      document.storagePath,
      { force: true }
    );
  }

  /*
   * Suppression Firestore
   */

  await adminDb
    .collection("documents")
    .doc(documentId)
    .delete();

  return {
    success: true,
    message:
      "Document supprimé avec succès."
  };
}