import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

import { adminDb } from "../../firebaseAdmin.js";
import { ROLES } from "../../Shared/Roles/roles.js";

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

const META_DIR = path.join(
  STORAGE_ROOT,
  "meta"
);

const LEGACY_UPLOADS_DIR = path.join(
  process.cwd(),
  "uploads",
  "justifications"
);

/*
|--------------------------------------------------------------------------
| CATÉGORIES
|--------------------------------------------------------------------------
*/

export const DOCUMENT_CATEGORIES = {
  JUSTIFICATIF_ABSENCE: "justificatif_absence",
  CERTIFICAT_MEDICAL: "certificat_medical",
  ATTESTATION_SCOLARITE: "attestation_scolarite",
  RELEVE_NOTES: "releve_notes",
  CONVENTION_STAGE: "convention_stage",
  CONTRAT: "contrat",
  ADMINISTRATIF: "administratif",
  AUTRE: "autre"
};

/*
|--------------------------------------------------------------------------
| INITIALISATION
|--------------------------------------------------------------------------
*/

async function ensureStorageDirectories() {
  await fs.mkdir(QUARANTINE_DIR, { recursive: true });
  await fs.mkdir(JUSTIFICATIFS_DIR, { recursive: true });
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
  await fs.mkdir(META_DIR, { recursive: true });
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
| DROITS D'ACCÈS (PARENT / ÉTUDIANT / ADMIN / RH)
|--------------------------------------------------------------------------
*/

export async function getUserChildrenUids(user) {
  if (!user || user.role !== ROLES.PARENT) return [];
  if (Array.isArray(user.childrenUids) && user.childrenUids.length > 0) {
    return user.childrenUids;
  }

  if (adminDb) {
    try {
      const parentDoc = await adminDb.collection("users").doc(user.uid).get();
      if (parentDoc.exists) {
        const data = parentDoc.data();
        if (Array.isArray(data.childrenUids)) return data.childrenUids;
        if (Array.isArray(data.children)) {
          return data.children.map(c => c.uid || c.id).filter(Boolean);
        }
      }
    } catch (e) {}
  }

  return [];
}

export async function canUserAccessDocument(user, document) {
  if (!user || !document) return false;
  if (user.role === ROLES.ADMIN || user.role === ROLES.RH) return true;
  if (document.uid === user.uid) return true;

  if (user.role === ROLES.PARENT) {
    const childrenUids = await getUserChildrenUids(user);
    if (childrenUids.includes(document.uid)) return true;
  }

  return false;
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

  const category = (body?.category || "justificatif_absence").trim();
  const categoryValidation = validateDocumentCategory(category);

  if (!categoryValidation.valid) {
    return {
      success: false,
      error: categoryValidation.reason
    };
  }

  const documentId = crypto.randomUUID();
  const safeFilename = sanitizeFilename(file.originalname);
  const quarantineFilename = `${documentId}-${safeFilename}`;
  const quarantinePath = path.join(QUARANTINE_DIR, quarantineFilename);

  // 1. Quarantaine
  await fs.writeFile(quarantinePath, file.buffer);

  try {
    // 2. Validation
    const validation = await validateDocument({
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    // 3. Rejet si invalide
    if (!validation.valid) {
      await fs.rm(quarantinePath, { force: true });
      return {
        success: false,
        rejected: true,
        error: validation.reason
      };
    }

    // 4. Sortie de quarantaine vers stockage définitif
    const finalFilename = `${documentId}-${safeFilename}`;
    const finalPath = path.join(JUSTIFICATIFS_DIR, finalFilename);

    await fs.rename(quarantinePath, finalPath);

    // 5. Calcul Hash SHA-256
    const hash = crypto
      .createHash("sha256")
      .update(file.buffer)
      .digest("hex");

    // 6. Métadonnées du document
    const nowIso = new Date().toISOString();
    const targetUid = (user.role === ROLES.PARENT && body.studentUid) ? body.studentUid : user.uid;

    const documentData = {
      id: documentId,
      uid: targetUid,
      uploadedBy: user.uid,
      originalName: file.originalname,
      filename: finalFilename,
      mimeType: validation.detectedMime,
      size: validation.size,
      category,
      status: "validated",
      archived: false,
      storageArea: "justificatifs",
      storagePath: finalPath,
      sha256: hash,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Sauvegarde locale de métadonnées
    const metaPath = path.join(META_DIR, `${documentId}.json`);
    await fs.writeFile(metaPath, JSON.stringify(documentData, null, 2));

    // Enregistrement Firestore si disponible
    if (adminDb) {
      Promise.race([
        adminDb.collection("documents").doc(documentId).set(documentData),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
      ]).catch(() => {});
    }

    return {
      success: true,
      message: "Document validé et enregistré avec succès.",
      document: {
        id: documentId,
        name: file.originalname,
        originalName: file.originalname,
        category,
        status: "validated",
        archived: false,
        mimeType: validation.detectedMime,
        size: validation.size,
        createdAt: nowIso
      }
    };
  } catch (error) {
    await fs.rm(quarantinePath, { force: true }).catch(() => {});
    console.error("Erreur uploadDocumentService :", error);
    return {
      success: false,
      error: "Impossible de traiter le document."
    };
  }
}

/*
|--------------------------------------------------------------------------
| MES DOCUMENTS (AVEC DROITS PARENT / FILTRES / PAGINATION)
|--------------------------------------------------------------------------
*/

export async function getMyDocumentsService(
  uid,
  filters = {},
  user = null
) {
  if (!uid) {
    return {
      success: false,
      error: "Utilisateur non authentifié."
    };
  }

  await ensureStorageDirectories();

  const currentUser = user || { uid, role: ROLES.STUDENT };
  let allowedOwnerUids = [uid];

  // Gestion des droits Parent
  if (currentUser.role === ROLES.PARENT) {
    const childrenUids = await getUserChildrenUids(currentUser);
    if (filters.studentUid && childrenUids.includes(filters.studentUid)) {
      allowedOwnerUids = [filters.studentUid];
    } else if (childrenUids.length > 0) {
      allowedOwnerUids = [...childrenUids, uid];
    }
  } else if ((currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.RH) && filters.studentUid) {
    allowedOwnerUids = [filters.studentUid];
  }

  const docMap = new Map();

  // 1. Scan storage-local/meta/*.json
  try {
    const metaFiles = await fs.readdir(META_DIR);
    for (const file of metaFiles) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(META_DIR, file), "utf8");
          const parsed = JSON.parse(content);
          if (allowedOwnerUids.includes(parsed.uid)) {
            docMap.set(parsed.id, parsed);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  // 2. Scan uploads/justifications/ pour chaque UID autorisé
  for (const ownerUid of allowedOwnerUids) {
    const legacyUserDir = path.join(LEGACY_UPLOADS_DIR, ownerUid);
    if (existsSync(legacyUserDir)) {
      try {
        const files = await fs.readdir(legacyUserDir);
        for (const f of files) {
          if (f.startsWith(".") || f.includes(".json")) continue;
          const parts = f.split("_");
          const docId = parts[0]?.split("-")[0] || f;
          const originalName = parts.slice(1).join("_") || f;
          const fullPath = path.join(legacyUserDir, f);
          const stat = await fs.stat(fullPath);

          if (!docMap.has(docId)) {
            const item = {
              id: docId,
              uid: ownerUid,
              originalName: originalName,
              filename: f,
              mimeType: f.endsWith(".pdf") ? "application/pdf" : (f.endsWith(".png") ? "image/png" : "image/jpeg"),
              size: stat.size,
              category: originalName.toLowerCase().includes("certificat") ? "certificat_medical" : "justificatif_absence",
              status: "validated",
              archived: false,
              storageArea: "justificatifs",
              storagePath: fullPath,
              createdAt: stat.birthtime?.toISOString() || new Date().toISOString(),
              updatedAt: stat.mtime?.toISOString() || new Date().toISOString()
            };
            docMap.set(docId, item);
          }
        }
      } catch (e) {}
    }
  }

  // 3. Scan storage-local/justificatifs/
  if (existsSync(JUSTIFICATIFS_DIR)) {
    try {
      const files = await fs.readdir(JUSTIFICATIFS_DIR);
      for (const f of files) {
        if (f.startsWith(".")) continue;
        const docId = f.substring(0, 36);
        const originalName = f.length > 37 ? f.substring(37) : f;
        const fullPath = path.join(JUSTIFICATIFS_DIR, f);
        const stat = await fs.stat(fullPath);

        if (!docMap.has(docId)) {
          docMap.set(docId, {
            id: docId,
            uid: uid,
            originalName: originalName,
            filename: f,
            mimeType: f.endsWith(".pdf") ? "application/pdf" : (f.endsWith(".png") ? "image/png" : "image/jpeg"),
            size: stat.size,
            category: "justificatif_absence",
            status: "validated",
            archived: false,
            storageArea: "justificatifs",
            storagePath: fullPath,
            createdAt: stat.birthtime?.toISOString() || new Date().toISOString(),
            updatedAt: stat.mtime?.toISOString() || new Date().toISOString()
          });
        }
      }
    } catch (e) {}
  }

  // 4. Firestore
  if (adminDb) {
    try {
      const fetchPromise = (currentUser.role === ROLES.ADMIN || currentUser.role === ROLES.RH) && !filters.studentUid
        ? adminDb.collection("documents").get()
        : adminDb.collection("documents").where("uid", "in", allowedOwnerUids.slice(0, 10)).get();

      const snapshot = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
      ]);
      if (snapshot?.docs) {
        for (const doc of snapshot.docs) {
          docMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      }
    } catch (e) {}
  }

  let documents = Array.from(docMap.values());

  // Seuls les documents validés sont visibles
  documents = documents.filter((doc) => doc.status === "validated");

  // Filtre Archivé
  if (filters.archived !== undefined && filters.archived !== null && filters.archived !== "" && filters.archived !== "all") {
    const archived = filters.archived === true || filters.archived === "true";
    documents = documents.filter((doc) => Boolean(doc.archived) === archived);
  }

  // Filtre Catégorie
  if (filters.category && filters.category !== "all") {
    documents = documents.filter((doc) => doc.category === filters.category);
  }

  // Filtre Statut
  if (filters.status && filters.status !== "all") {
    documents = documents.filter((doc) => doc.status === filters.status);
  }

  // Filtre Recherche
  if (filters.search) {
    const search = filters.search.toLowerCase().trim();
    documents = documents.filter((doc) =>
      String(doc.originalName || "").toLowerCase().includes(search) ||
      String(doc.category || "").toLowerCase().includes(search)
    );
  }

  // Filtre Date (from / to)
  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!isNaN(fromDate.getTime())) {
      documents = documents.filter((doc) => {
        const docDate = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt || 0);
        return docDate >= fromDate;
      });
    }
  }

  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!isNaN(toDate.getTime())) {
      if (!filters.to.includes("T") && !filters.to.includes(":")) {
        toDate.setHours(23, 59, 59, 999);
      }
      documents = documents.filter((doc) => {
        const docDate = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date(doc.createdAt || 0);
        return docDate <= toDate;
      });
    }
  }

  // Tri antichronologique
  documents.sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const total = documents.length;

  // Pagination
  let pagedDocuments = documents;
  let page = 1;
  let limit = total || 20;

  if (filters.page || filters.limit) {
    page = Math.max(1, parseInt(filters.page) || 1);
    limit = Math.max(1, parseInt(filters.limit) || 20);
    const startIndex = (page - 1) * limit;
    pagedDocuments = documents.slice(startIndex, startIndex + limit);
  }

  const totalPages = Math.ceil(total / limit) || 1;

  // Suppression du chemin physique avant renvoi au frontend
  const safeDocs = pagedDocuments.map(({ storagePath, ...doc }) => doc);

  return {
    success: true,
    data: safeDocs,
    documents: safeDocs,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
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
  await ensureStorageDirectories();

  let document = null;

  // 1. Meta file
  const metaPath = path.join(META_DIR, `${documentId}.json`);
  if (existsSync(metaPath)) {
    try {
      const content = await fs.readFile(metaPath, "utf8");
      document = JSON.parse(content);
    } catch (e) {}
  }

  // 2. Scan legacy uploads
  if (!document) {
    const childrenUids = await getUserChildrenUids(user);
    const checkUids = [user.uid, ...childrenUids];

    for (const uid of checkUids) {
      const legacyUserDir = path.join(LEGACY_UPLOADS_DIR, uid);
      if (existsSync(legacyUserDir)) {
        try {
          const files = await fs.readdir(legacyUserDir);
          const match = files.find(f => f.startsWith(documentId) || f === documentId);
          if (match) {
            const fullPath = path.join(legacyUserDir, match);
            const stat = await fs.stat(fullPath);
            const parts = match.split("_");
            const originalName = parts.slice(1).join("_") || match;
            document = {
              id: documentId,
              uid: uid,
              originalName: originalName,
              filename: match,
              mimeType: match.endsWith(".pdf") ? "application/pdf" : (match.endsWith(".png") ? "image/png" : "image/jpeg"),
              size: stat.size,
              category: "justificatif_absence",
              status: "validated",
              archived: false,
              storageArea: "justificatifs",
              storagePath: fullPath,
              createdAt: stat.birthtime?.toISOString() || new Date().toISOString(),
              updatedAt: stat.mtime?.toISOString() || new Date().toISOString()
            };
            break;
          }
        } catch (e) {}
      }
    }
  }

  // 3. Scan storage-local/justificatifs
  if (!document && existsSync(JUSTIFICATIFS_DIR)) {
    try {
      const files = await fs.readdir(JUSTIFICATIFS_DIR);
      const match = files.find(f => f.startsWith(documentId));
      if (match) {
        const fullPath = path.join(JUSTIFICATIFS_DIR, match);
        const stat = await fs.stat(fullPath);
        document = {
          id: documentId,
          uid: user.uid,
          originalName: match.length > 37 ? match.substring(37) : match,
          filename: match,
          mimeType: match.endsWith(".pdf") ? "application/pdf" : (match.endsWith(".png") ? "image/png" : "image/jpeg"),
          size: stat.size,
          category: "justificatif_absence",
          status: "validated",
          archived: false,
          storageArea: "justificatifs",
          storagePath: fullPath,
          createdAt: stat.birthtime?.toISOString() || new Date().toISOString(),
          updatedAt: stat.mtime?.toISOString() || new Date().toISOString()
        };
      }
    } catch (e) {}
  }

  // 4. Firestore
  if (!document && adminDb) {
    try {
      const fetchPromise = adminDb.collection("documents").doc(documentId).get();
      const snapshot = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
      ]);
      if (snapshot.exists) {
        document = { id: snapshot.id, ...snapshot.data() };
      }
    } catch (e) {}
  }

  if (!document) {
    return { success: false, error: "Document introuvable." };
  }

  // Vérification de sécurité Parent / Étudiant / Admin
  const hasAccess = await canUserAccessDocument(user, document);
  if (!hasAccess) {
    return { success: false, error: "Accès refusé." };
  }

  if (document.status !== "validated") {
    return { success: false, error: "Ce document n'est pas disponible." };
  }

  return {
    success: true,
    data: document,
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
  const result = await getDocumentService({ documentId, user });
  if (!result.success) return result;

  const document = result.document;
  if (document.archived) {
    return { success: true, message: "Le document est déjà archivé." };
  }

  await ensureStorageDirectories();
  const oldPath = document.storagePath;
  const newPath = path.join(ARCHIVE_DIR, document.filename);

  if (existsSync(oldPath)) {
    await fs.rename(oldPath, newPath).catch(() => {});
  }

  document.archived = true;
  document.storageArea = "archives";
  document.storagePath = newPath;
  document.updatedAt = new Date().toISOString();

  const metaPath = path.join(META_DIR, `${documentId}.json`);
  await fs.writeFile(metaPath, JSON.stringify(document, null, 2));

  if (adminDb) {
    adminDb.collection("documents").doc(documentId).update({
      archived: true,
      storageArea: "archives",
      storagePath: newPath,
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Document archivé avec succès."
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
  const result = await getDocumentService({ documentId, user });
  if (!result.success) return result;

  const document = result.document;
  if (!document.archived) {
    return { success: true, message: "Le document n'est pas archivé." };
  }

  await ensureStorageDirectories();
  const oldPath = document.storagePath;
  const newPath = path.join(JUSTIFICATIFS_DIR, document.filename);

  if (existsSync(oldPath)) {
    await fs.rename(oldPath, newPath).catch(() => {});
  }

  document.archived = false;
  document.storageArea = "justificatifs";
  document.storagePath = newPath;
  document.updatedAt = new Date().toISOString();

  const metaPath = path.join(META_DIR, `${documentId}.json`);
  await fs.writeFile(metaPath, JSON.stringify(document, null, 2));

  if (adminDb) {
    adminDb.collection("documents").doc(documentId).update({
      archived: false,
      storageArea: "justificatifs",
      storagePath: newPath,
      updatedAt: new Date().toISOString()
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Document restauré avec succès."
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
  const result = await getDocumentService({ documentId, user });
  if (!result.success) return result;

  const document = result.document;

  if (document.storagePath && existsSync(document.storagePath)) {
    await fs.rm(document.storagePath, { force: true }).catch(() => {});
  }

  const metaPath = path.join(META_DIR, `${documentId}.json`);
  if (existsSync(metaPath)) {
    await fs.rm(metaPath, { force: true }).catch(() => {});
  }

  if (adminDb) {
    adminDb.collection("documents").doc(documentId).delete().catch(() => {});
  }

  return {
    success: true,
    message: "Document supprimé avec succès."
  };
}