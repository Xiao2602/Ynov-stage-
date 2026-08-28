import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

import { adminDb } from "../../firebaseAdmin.js";
import { ROLES } from "../../Shared/Roles/roles.js";
import { createNotificationService } from "../../Notifications/Services/notificationService.js";
import { getUserChildrenUids } from "../Services/documentService.js";
import {
  DOCUMENT_REQUEST_STATUSES,
  validateCreateDocumentRequest,
  validateAssignDocumentRequest,
  validateRejectDocumentRequest,
  validateApproveDocumentRequest
} from "./documentRequestValidator.js";

const REQUESTS_DIR = path.resolve(process.cwd(), "storage-local", "document_requests");

async function ensureRequestsDirectory() {
  await fs.mkdir(REQUESTS_DIR, { recursive: true });
}

function generateRequestId() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `DOC-REQ-${year}-${randomSuffix}`;
}

/**
 * 1. CRÉER UNE DEMANDE DE DOCUMENT
 */
export async function createDocumentRequestService({ user, body }) {
  await ensureRequestsDirectory();

  if (!user?.uid) {
    return { success: false, error: "Utilisateur non authentifié." };
  }

  const validation = validateCreateDocumentRequest(body);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { type, message, urgency, studentUid } = validation.data;

  // Si parent et studentUid fourni, vérifier le lien
  let targetUid = user.uid;
  if (user.role === ROLES.PARENT && studentUid) {
    const childrenUids = await getUserChildrenUids(user);
    if (childrenUids.includes(studentUid)) {
      targetUid = studentUid;
    }
  }

  const requestId = generateRequestId();
  const nowIso = new Date().toISOString();

  const requestData = {
    id: requestId,
    uid: targetUid,
    requestedBy: user.uid,
    requesterName: user.displayName || user.email?.split("@")[0] || "Étudiant",
    requesterEmail: user.email || "",
    requesterRole: user.role || ROLES.STUDENT,
    type: type,
    documentType: type,
    message: message || `Demande de ${type}`,
    urgency: urgency,
    status: DOCUMENT_REQUEST_STATUSES.PENDING,
    statusLabel: "En attente",
    assignedTo: null,
    assignedToName: null,
    documentId: null,
    documentUrl: null,
    rejectionReason: null,
    approvalNote: null,
    approvedAt: null,
    rejectedAt: null,
    cancelledAt: null,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // Sauvegarde locale
  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(requestData, null, 2));

  // Sauvegarde Firestore
  if (adminDb) {
    Promise.race([
      adminDb.collection("document_requests").doc(requestId).set(requestData),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
    ]).catch(() => {});
  }

  // Création d'une notification pour l'utilisateur
  try {
    await createNotificationService({
      userId: user.uid,
      title: "Demande de document enregistrée",
      message: `Votre demande (${type}) a bien été transmise sous la référence ${requestId}.`,
      type: "document_request",
      relatedId: requestId
    });
  } catch (e) {}

  return {
    success: true,
    message: "Demande de document créée avec succès.",
    data: requestData,
    request: requestData
  };
}

/**
 * 2. LISTER SES DEMANDES (AVEC DROITS PARENT / FILTRES / PAGINATION)
 */
export async function getMyDocumentRequestsService(uid, filters = {}, user = null) {
  if (!uid) {
    return { success: false, error: "Utilisateur non authentifié." };
  }

  await ensureRequestsDirectory();

  const currentUser = user || { uid, role: ROLES.STUDENT };
  let allowedOwnerUids = [uid];

  if (currentUser.role === ROLES.PARENT) {
    const childrenUids = await getUserChildrenUids(currentUser);
    if (filters.studentUid && childrenUids.includes(filters.studentUid)) {
      allowedOwnerUids = [filters.studentUid];
    } else if (childrenUids.length > 0) {
      allowedOwnerUids = [...childrenUids, uid];
    }
  }

  const requestMap = new Map();

  // 1. Scan storage-local/document_requests/
  try {
    const files = await fs.readdir(REQUESTS_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(REQUESTS_DIR, file), "utf8");
          const item = JSON.parse(content);
          if (allowedOwnerUids.includes(item.uid) || allowedOwnerUids.includes(item.requestedBy)) {
            requestMap.set(item.id, item);
          }
        } catch (e) {}
      }
    }
  } catch (e) {}

  // 2. Firestore
  if (adminDb) {
    try {
      const fetchPromise = adminDb.collection("document_requests")
        .where("uid", "in", allowedOwnerUids.slice(0, 10))
        .get();

      const snapshot = await Promise.race([
        fetchPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
      ]);
      if (snapshot?.docs) {
        for (const doc of snapshot.docs) {
          requestMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      }
    } catch (e) {}
  }

  let requests = Array.from(requestMap.values());

  // Filtre Statut
  if (filters.status && filters.status !== "all") {
    requests = requests.filter(r => r.status === filters.status);
  }

  // Filtre Type
  if (filters.type && filters.type !== "all") {
    requests = requests.filter(r => r.type === filters.type || r.documentType === filters.type);
  }

  // Filtre Recherche
  if (filters.search) {
    const search = filters.search.toLowerCase().trim();
    requests = requests.filter(r =>
      String(r.id || "").toLowerCase().includes(search) ||
      String(r.type || "").toLowerCase().includes(search) ||
      String(r.message || "").toLowerCase().includes(search) ||
      String(r.status || "").toLowerCase().includes(search)
    );
  }

  // Filtre Dates (from / to)
  if (filters.from) {
    const fromDate = new Date(filters.from);
    if (!isNaN(fromDate.getTime())) {
      requests = requests.filter(r => new Date(r.createdAt || 0) >= fromDate);
    }
  }
  if (filters.to) {
    const toDate = new Date(filters.to);
    if (!isNaN(toDate.getTime())) {
      if (!filters.to.includes("T") && !filters.to.includes(":")) {
        toDate.setHours(23, 59, 59, 999);
      }
      requests = requests.filter(r => new Date(r.createdAt || 0) <= toDate);
    }
  }

  // Tri antichronologique
  requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = requests.length;
  let pagedRequests = requests;
  let page = 1;
  let limit = total || 20;

  if (filters.page || filters.limit) {
    page = Math.max(1, parseInt(filters.page) || 1);
    limit = Math.max(1, parseInt(filters.limit) || 20);
    const startIndex = (page - 1) * limit;
    pagedRequests = requests.slice(startIndex, startIndex + limit);
  }

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    success: true,
    data: pagedRequests,
    requests: pagedRequests,
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

/**
 * 3. CONSULTER LE DÉTAIL D'UNE DEMANDE
 */
export async function getDocumentRequestByIdService(requestId, user) {
  await ensureRequestsDirectory();

  let item = null;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  if (existsSync(filePath)) {
    try {
      const content = await fs.readFile(filePath, "utf8");
      item = JSON.parse(content);
    } catch (e) {}
  }

  if (!item && adminDb) {
    try {
      const doc = await adminDb.collection("document_requests").doc(requestId).get();
      if (doc.exists) {
        item = { id: doc.id, ...doc.data() };
      }
    } catch (e) {}
  }

  if (!item) {
    return { success: false, error: "Demande de document introuvable." };
  }

  // Contrôle des droits
  const isOwner = item.uid === user.uid || item.requestedBy === user.uid;
  const isAdminOrRh = user.role === ROLES.ADMIN || user.role === ROLES.RH || user.role === ROLES.MANAGER;
  let isParentOfOwner = false;

  if (user.role === ROLES.PARENT) {
    const childrenUids = await getUserChildrenUids(user);
    if (childrenUids.includes(item.uid)) isParentOfOwner = true;
  }

  if (!isOwner && !isAdminOrRh && !isParentOfOwner) {
    return { success: false, error: "Accès refusé à cette demande." };
  }

  return {
    success: true,
    data: item,
    request: item
  };
}

/**
 * 4. ANNULER UNE DEMANDE
 */
export async function cancelDocumentRequestService(requestId, user) {
  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;

  if (item.status === DOCUMENT_REQUEST_STATUSES.APPROVED) {
    return { success: false, error: "Impossible d'annuler une demande déjà approuvée." };
  }

  if (item.status === DOCUMENT_REQUEST_STATUSES.CANCELLED) {
    return { success: true, message: "La demande est déjà annulée." };
  }

  const nowIso = new Date().toISOString();
  item.status = DOCUMENT_REQUEST_STATUSES.CANCELLED;
  item.statusLabel = "Annulée";
  item.cancelledAt = nowIso;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      status: DOCUMENT_REQUEST_STATUSES.CANCELLED,
      statusLabel: "Annulée",
      cancelledAt: nowIso,
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Demande annulée avec succès.",
    data: item
  };
}

/**
 * 5. CONSULTER LA FILE ADMINISTRATIVE (QUEUE)
 */
export async function getDocumentRequestsQueueService(filters = {}, user) {
  await ensureRequestsDirectory();

  const requestMap = new Map();

  // 1. Scan storage-local/document_requests/
  try {
    const files = await fs.readdir(REQUESTS_DIR);
    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(path.join(REQUESTS_DIR, file), "utf8");
          const item = JSON.parse(content);
          requestMap.set(item.id, item);
        } catch (e) {}
      }
    }
  } catch (e) {}

  // 2. Firestore
  if (adminDb) {
    try {
      const snapshot = await adminDb.collection("document_requests").get();
      if (snapshot?.docs) {
        for (const doc of snapshot.docs) {
          requestMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      }
    } catch (e) {}
  }

  let requests = Array.from(requestMap.values());

  // Filtre statut (par défaut file d'attente = pending + in_progress si non spécifié)
  if (filters.status && filters.status !== "all") {
    requests = requests.filter(r => r.status === filters.status);
  }

  // Filtre assigné
  if (filters.assignedTo) {
    if (filters.assignedTo === "unassigned") {
      requests = requests.filter(r => !r.assignedTo);
    } else {
      requests = requests.filter(r => r.assignedTo === filters.assignedTo);
    }
  }

  // Filtre Type
  if (filters.type && filters.type !== "all") {
    requests = requests.filter(r => r.type === filters.type || r.documentType === filters.type);
  }

  // Filtre Recherche
  if (filters.search) {
    const search = filters.search.toLowerCase().trim();
    requests = requests.filter(r =>
      String(r.id || "").toLowerCase().includes(search) ||
      String(r.requesterName || "").toLowerCase().includes(search) ||
      String(r.requesterEmail || "").toLowerCase().includes(search) ||
      String(r.type || "").toLowerCase().includes(search) ||
      String(r.status || "").toLowerCase().includes(search)
    );
  }

  // Tri antichronologique
  requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = requests.length;
  let page = Math.max(1, parseInt(filters.page) || 1);
  let limit = Math.max(1, parseInt(filters.limit) || 20);
  const startIndex = (page - 1) * limit;
  const pagedRequests = requests.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    success: true,
    data: pagedRequests,
    requests: pagedRequests,
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

/**
 * 6. AFFECTER UNE DEMANDE
 */
export async function assignDocumentRequestService(requestId, body, user) {
  const validation = validateAssignDocumentRequest(body);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;
  const { assignedTo, assignedToName } = validation.data;
  const nowIso = new Date().toISOString();

  item.assignedTo = assignedTo;
  item.assignedToName = assignedToName || user.displayName || "Agent RH";
  item.status = DOCUMENT_REQUEST_STATUSES.IN_PROGRESS;
  item.statusLabel = "En cours";
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      assignedTo: item.assignedTo,
      assignedToName: item.assignedToName,
      status: DOCUMENT_REQUEST_STATUSES.IN_PROGRESS,
      statusLabel: "En cours",
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    message: `Demande affectée à ${item.assignedToName}.`,
    data: item
  };
}

/**
 * 7. APPROUVER UNE DEMANDE (AVEC DOCUMENT ASSOCIÉ)
 */
export async function approveDocumentRequestService(requestId, body, user) {
  const validation = validateApproveDocumentRequest(body);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;
  const { documentId, documentUrl, note } = validation.data;
  const nowIso = new Date().toISOString();

  item.status = DOCUMENT_REQUEST_STATUSES.APPROVED;
  item.statusLabel = "Disponible";
  item.documentId = documentId || item.documentId;
  item.documentUrl = documentUrl || item.documentUrl;
  item.approvalNote = note || "Votre document est disponible.";
  item.approvedBy = user.uid;
  item.approvedByName = user.displayName || "Administration";
  item.approvedAt = nowIso;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      status: DOCUMENT_REQUEST_STATUSES.APPROVED,
      statusLabel: "Disponible",
      documentId: item.documentId,
      documentUrl: item.documentUrl,
      approvalNote: item.approvalNote,
      approvedBy: item.approvedBy,
      approvedByName: item.approvedByName,
      approvedAt: nowIso,
      updatedAt: nowIso
    }).catch(() => {});
  }

  // Notifier l'étudiant / demandeur
  try {
    await createNotificationService({
      userId: item.uid,
      title: "Document disponible",
      message: `Votre demande (${item.type}) a été approuvée. Votre document est prêt.`,
      type: "document_approved",
      relatedId: item.documentId || requestId
    });
  } catch (e) {}

  return {
    success: true,
    message: "Demande approuvée avec succès.",
    data: item
  };
}

/**
 * 8. REFUSER UNE DEMANDE (AVEC MOTIF OBLIGATOIRE)
 */
export async function rejectDocumentRequestService(requestId, body, user) {
  const validation = validateRejectDocumentRequest(body);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;
  const { reason } = validation.data;
  const nowIso = new Date().toISOString();

  item.status = DOCUMENT_REQUEST_STATUSES.REJECTED;
  item.statusLabel = "Refusée";
  item.rejectionReason = reason;
  item.rejectedBy = user.uid;
  item.rejectedByName = user.displayName || "Administration";
  item.rejectedAt = nowIso;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      status: DOCUMENT_REQUEST_STATUSES.REJECTED,
      statusLabel: "Refusée",
      rejectionReason: reason,
      rejectedBy: item.rejectedBy,
      rejectedByName: item.rejectedByName,
      rejectedAt: nowIso,
      updatedAt: nowIso
    }).catch(() => {});
  }

  // Notifier le demandeur avec le motif
  try {
    await createNotificationService({
      userId: item.uid,
      title: "Demande de document refusée",
      message: `Votre demande (${item.type}) a été refusée. Motif : ${reason}`,
      type: "document_rejected",
      relatedId: requestId
    });
  } catch (e) {}

  return {
    success: true,
    message: "Demande refusée.",
    data: item
  };
}

/**
 * 9. ASSOCIER UN DOCUMENT À UNE DEMANDE
 */
export async function attachDocumentToRequestService(requestId, { documentId, documentUrl }, user) {
  if (!documentId && !documentUrl) {
    return { success: false, error: "Veuillez fournir un documentId ou documentUrl." };
  }

  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;
  const nowIso = new Date().toISOString();

  if (documentId) item.documentId = documentId;
  if (documentUrl) item.documentUrl = documentUrl;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      documentId: item.documentId,
      documentUrl: item.documentUrl,
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Document associé à la demande.",
    data: item
  };
}
