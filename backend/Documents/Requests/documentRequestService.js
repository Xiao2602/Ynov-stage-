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
const META_DIR = path.resolve(process.cwd(), "storage-local", "meta");


async function ensureRequestsDirectory() {
  await fs.mkdir(REQUESTS_DIR, { recursive: true });
}

function generateRequestId() {
  const year = new Date().getFullYear();
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `DOC-REQ-${year}-${randomSuffix}`;
}

export async function getStudentProfile(uid) {
  if (!uid || !adminDb) return null;
  try {
    const doc = await adminDb.collection("users").doc(uid).get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (e) {}
  return null;
}

export async function enrichRequestsWithStudentProfile(requests) {
  if (!requests || !requests.length || !adminDb) return requests;
  const missingUids = [...new Set(
    requests
      .filter(r => (
        !r.dateOfBirth || !r.placeOfBirth || !r.className || !r.studentName ||
        r.dateOfBirth === "" || r.placeOfBirth === "" || r.className === "" || r.studentName === ""
      ) && (r.uid || r.requestedBy))
      .map(r => r.uid || r.requestedBy)
  )];

  if (missingUids.length === 0) return requests;

  const userMap = new Map();
  await Promise.all(
    missingUids.map(async (uid) => {
      try {
        const uDoc = await adminDb.collection("users").doc(uid).get();
        if (uDoc.exists) userMap.set(uid, uDoc.data());
      } catch (e) {}
    })
  );

  return requests.map(r => {
    const uid = r.uid || r.requestedBy;
    const u = userMap.get(uid);
    if (!u) return r;
    const profileAcademicYear = u.academicYear || u.schoolYear || r.academicYear || "";
    return {
      ...r,
      requesterName: r.requesterName || u.displayName || u.email?.split("@")[0] || "Étudiant",
      studentName: (r.studentName && r.studentName !== "") ? r.studentName : (u.displayName || u.email?.split("@")[0] || "Étudiant"),
      studentEmail: (r.studentEmail && r.studentEmail !== "") ? r.studentEmail : (u.email || ""),
      dateOfBirth: (r.dateOfBirth && r.dateOfBirth !== "") ? r.dateOfBirth : (u.dateOfBirth || ""),
      placeOfBirth: (r.placeOfBirth && r.placeOfBirth !== "") ? r.placeOfBirth : (u.placeOfBirth || ""),
      className: (r.className && r.className !== "") ? r.className : (u.className || u.assignedClass || ""),
      department: (r.department && r.department !== "") ? r.department : (u.department || ""),
      genre: (r.genre && r.genre !== "") ? r.genre : (u.genre || u.gender || ""),
      academicYear: profileAcademicYear
    };
  });
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

  // Récupérer le profil étudiant pour enrichir les informations
  const studentProfile = await getStudentProfile(targetUid);
  const studentName = studentProfile?.displayName || user.displayName || user.email?.split("@")[0] || "Étudiant";
  const studentEmail = studentProfile?.email || user.email || "";
  const dateOfBirth = studentProfile?.dateOfBirth || user.dateOfBirth || "";
  const placeOfBirth = studentProfile?.placeOfBirth || user.placeOfBirth || "";
  const className = studentProfile?.className || studentProfile?.assignedClass || user.className || "";
  const department = studentProfile?.department || user.department || "";
  const genre = studentProfile?.genre || studentProfile?.gender || user.genre || user.gender || "";
  const academicYear = studentProfile?.academicYear || studentProfile?.schoolYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

  const requestId = generateRequestId();
  const nowIso = new Date().toISOString();

  const requestData = {
    id: requestId,
    uid: targetUid,
    requestedBy: user.uid,
    requesterName: user.displayName || user.email?.split("@")[0] || "Étudiant",
    requesterEmail: user.email || "",
    requesterRole: user.role || ROLES.STUDENT,
    studentName,
    studentEmail,
    dateOfBirth,
    placeOfBirth,
    className,
    department,
    genre,
    academicYear,
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

  // 1. Notification de confirmation pour l'étudiant / parent
  try {
    await createNotificationService({
      userId: user.uid,
      title: "Demande de document enregistrée",
      message: `Votre demande (${type}) a bien été transmise aux services RH / Managers sous la référence ${requestId}.`,
      type: "document_request",
      relatedId: requestId
    });
  } catch (e) {}

  // 2. Notification ciblée pour les RH et Managers (l'Admin n'est pas notifié directement car son rôle est la supervision globale)
  if (adminDb) {
    try {
      const usersSnapshot = await Promise.race([
        adminDb.collection("users").get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1500))
      ]);

      if (usersSnapshot?.docs) {
        const rhUsers = [];
        const managerUsers = [];

        usersSnapshot.docs.forEach((doc) => {
          const uData = doc.data();
          const uRole = uData.role;
          const uDept = String(uData.department || "").toLowerCase().trim();

          // RH : rôle RH ou employé du département RH / Administration
          if (uRole === ROLES.RH || (uRole === ROLES.EMPLOYEE && (uDept.includes("rh") || uDept.includes("ressources humaines") || uDept.includes("administration")))) {
            rhUsers.push({ uid: doc.id, ...uData });
          }

          // Manager : rôle Manager
          if (uRole === ROLES.MANAGER) {
            managerUsers.push({ uid: doc.id, ...uData });
          }
        });

        const isUrgent = urgency === "urgent";

        // Notifications aux agents RH (quel que soit le niveau de demande)
        for (const rh of rhUsers) {
          createNotificationService({
            userId: rh.uid,
            title: isUrgent ? `🚨 [URGENT] Demande de document : ${type}` : `📄 Demande de document : ${type}`,
            message: `${isUrgent ? '[URGENT] ' : ''}${studentName} (${className || department || 'Étudiant'}) a soumis une demande de document : ${type} (${requestId}).`,
            type: "document_request_pending",
            relatedId: requestId
          }).catch(() => {});
        }

        // Notifications aux Managers (priorité à la filière de l'étudiant, sinon tous les managers)
        const studentDeptLower = String(department || "").toLowerCase();
        const studentClassLower = String(className || "").toLowerCase();
        const matchingManagers = managerUsers.filter(m => {
          const mDept = String(m.department || "").toLowerCase();
          return mDept && (studentDeptLower.includes(mDept) || studentClassLower.includes(mDept) || mDept.includes(studentDeptLower));
        });

        const targetManagers = matchingManagers.length > 0 ? matchingManagers : managerUsers;

        for (const mgr of targetManagers) {
          createNotificationService({
            userId: mgr.uid,
            title: isUrgent ? `🚨 [URGENT] Demande de document — Filière ${department || 'Générale'}` : `Demande de document — Filière ${department || 'Générale'}`,
            message: `${isUrgent ? '[URGENT] ' : ''}${studentName} (${className || department || 'Étudiant'}) a demandé : ${type} (${requestId}).`,
            type: "document_request_pending",
            relatedId: requestId
          }).catch(() => {});
        }
      }
    } catch (err) {}
  }

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
  const enrichedPagedRequests = await enrichRequestsWithStudentProfile(pagedRequests);

  return {
    success: true,
    data: enrichedPagedRequests,
    requests: enrichedPagedRequests,
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

  const [enrichedItem] = await enrichRequestsWithStudentProfile([item]);
  item = enrichedItem || item;

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
          const firestoreItem = { id: doc.id, ...doc.data() };
          const localItem = requestMap.get(doc.id);
          const localUpdatedAt = new Date(localItem?.updatedAt || 0).getTime();
          const firestoreUpdatedAt = new Date(firestoreItem.updatedAt || 0).getTime();
          if (!localItem || firestoreUpdatedAt >= localUpdatedAt) {
            requestMap.set(doc.id, firestoreItem);
          }
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

  // Filtre Département / Filière
  if (filters.department && filters.department !== "all") {
    const targetDept = filters.department.toLowerCase().trim();
    requests = requests.filter(r =>
      String(r.department || "").toLowerCase().includes(targetDept) ||
      String(r.className || "").toLowerCase().includes(targetDept)
    );
  }

  // Filtre Classe / Promotion
  if (filters.className && filters.className !== "all") {
    const targetClass = filters.className.toLowerCase().trim();
    requests = requests.filter(r =>
      String(r.className || "").toLowerCase().includes(targetClass)
    );
  }

  // Calcul enrichi pour l'archivage automatique (1 semaine après validation ou refus)
  const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  requests = requests.map(r => {
    const decisionDate = r.approvedAt || r.rejectedAt || ((r.status === "approved" || r.status === "rejected") ? r.updatedAt : null);
    const decisionTime = decisionDate ? new Date(decisionDate).getTime() : null;
    const isAutoArchived = Boolean(decisionTime && (Date.now() - decisionTime >= ONE_WEEK_MS));
    const daysSinceDecision = decisionTime ? Math.floor((Date.now() - decisionTime) / (24 * 60 * 60 * 1000)) : null;

    return {
      ...r,
      isAutoArchived,
      daysSinceDecision,
      archived: Boolean(r.archived || isAutoArchived)
    };
  });

  // Filtre Archivé
  if (filters.archived !== undefined && filters.archived !== null && filters.archived !== "" && filters.archived !== "all") {
    const wantArchived = filters.archived === true || filters.archived === "true";
    requests = requests.filter(r => Boolean(r.archived) === wantArchived);
  }

  // Tri antichronologique
  requests.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = requests.length;
  let page = Math.max(1, parseInt(filters.page) || 1);
  let limit = Math.max(1, parseInt(filters.limit) || 20);
  const startIndex = (page - 1) * limit;
  const pagedRequests = requests.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(total / limit) || 1;
  const enrichedPagedRequests = await enrichRequestsWithStudentProfile(pagedRequests);

  return {
    success: true,
    data: enrichedPagedRequests,
    requests: enrichedPagedRequests,
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
  item.assignedToName = assignedToName || user.displayName || (user.role === ROLES.MANAGER ? "Manager Filière" : user.role === ROLES.ADMIN ? "Superviseur Admin" : "Agent RH");
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
  item.generated = true;
  item.source = String(documentId || "").startsWith("generated-") ? "generated" : "imported";
  item.generatedAt = nowIso;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      documentId: item.documentId,
      documentUrl: item.documentUrl,
      generated: true,
      source: item.source,
      generatedAt: item.generatedAt,
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Document associé à la demande.",
    data: item
  };
}

export async function transferGeneratedDocumentService(requestId, { message }, user) {
  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const nowIso = new Date().toISOString();
  const item = result.data;

  // Si aucun document n'est encore associé, créer un ID généré fictif
  if (!item.generated && !item.documentId && !item.documentUrl) {
    item.documentId = `generated-${requestId}`;
    item.generated = true;
    item.source = "generated";
    item.generatedAt = nowIso;
  }

  item.status = DOCUMENT_REQUEST_STATUSES.APPROVED;
  item.statusLabel = "Disponible";
  item.approvedAt = nowIso;
  item.approvedBy = user.uid;
  item.approvedByName = user.displayName || "Administration";
  item.transferredAt = nowIso;
  item.transferredBy = user.uid;
  item.transferredTo = item.uid;
  item.transferredToName = item.studentName || item.requesterName || item.requesterEmail || 'Étudiant';
  item.transferMessage = message || '';
  item.updatedAt = nowIso;

  await fs.writeFile(path.join(REQUESTS_DIR, `${requestId}.json`), JSON.stringify(item, null, 2));

  // Synchroniser le META file du document physique si c'est un vrai UUID importé
  // (ni un ID généré "generated-xxx", ni un ancien ID fictif "imported-xxx")
  const docId = item.documentId || "";
  const isGeneratedId = docId.startsWith("generated-");
  const isFakeImportId = docId.startsWith("imported-");

  if (docId && !isGeneratedId && !isFakeImportId) {
    // Vrai UUID d'un document physique uploadé → synchroniser son META file
    const metaFilePath = path.join(META_DIR, `${docId}.json`);
    if (existsSync(metaFilePath)) {
      try {
        const metaDoc = JSON.parse(await fs.readFile(metaFilePath, "utf8"));
        metaDoc.status = "validated";
        metaDoc.recipientUid = item.uid;
        metaDoc.transferredAt = nowIso;
        metaDoc.transferredBy = user.uid;
        metaDoc.updatedAt = nowIso;
        await fs.writeFile(metaFilePath, JSON.stringify(metaDoc, null, 2));

        // Synchroniser aussi Firestore pour ce document physique
        if (adminDb) {
          adminDb.collection("documents").doc(docId).set({
            status: "validated",
            recipientUid: item.uid,
            transferredAt: nowIso,
            transferredBy: user.uid,
            updatedAt: nowIso
          }, { merge: true }).catch(() => {});
        }
      } catch (e) {}
    }
  }

  if (adminDb) {
    await adminDb.collection('document_requests').doc(requestId).set({
      status: DOCUMENT_REQUEST_STATUSES.APPROVED,
      statusLabel: "Disponible",
      documentId: item.documentId,
      generated: true,
      source: item.source || "generated",
      generatedAt: item.generatedAt || nowIso,
      approvedAt: nowIso,
      approvedBy: user.uid,
      approvedByName: item.approvedByName,
      transferredAt: nowIso,
      transferredBy: user.uid,
      transferredTo: item.transferredTo,
      transferredToName: item.transferredToName,
      transferMessage: item.transferMessage,
      updatedAt: nowIso
    }, { merge: true }).catch(() => {});
  }

  return { success: true, message: 'Document transféré avec succès.', data: item };
}

export async function deleteDocumentRequestService(requestId, user) {
  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  await fs.rm(path.join(REQUESTS_DIR, `${requestId}.json`), { force: true });
  if (adminDb) {
    await adminDb.collection('document_requests').doc(requestId).delete().catch(() => {});
  }

  return { success: true, message: 'Document supprimé avec succès.' };
}

/**
 * 10. ARCHIVER UNE DEMANDE DE DOCUMENT (MANUELLEMENT)
 */
export async function archiveDocumentRequestService(requestId, user) {
  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;

  // Vérifier que la demande est bien traitée (approved ou rejected) avant d'archiver
  const isStaffRole = [ROLES.ADMIN, ROLES.RH, ROLES.MANAGER].includes(user.role);
  const isOwner = item.uid === user.uid || item.requestedBy === user.uid;

  // L'utilisateur peut archiver uniquement ses propres demandes traitées
  if (!isStaffRole && !isOwner) {
    return { success: false, error: "Vous ne pouvez archiver que vos propres demandes." };
  }

  // Une demande ne peut être archivée que si son statut est validé ou refusé
  if (item.status !== "approved" && item.status !== "rejected") {
    return { success: false, error: "Vous ne pouvez archiver une demande de document que lorsqu'elle est validée ou refusée." };
  }

  const nowIso = new Date().toISOString();

  item.archived = true;
  item.archivedAt = nowIso;
  item.archivedBy = user.uid;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      archived: true,
      archivedAt: nowIso,
      archivedBy: user.uid,
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Demande archivée avec succès.",
    data: item
  };
}

/**
 * 11. DÉSARCHIVER UNE DEMANDE DE DOCUMENT
 */
export async function unarchiveDocumentRequestService(requestId, user) {
  const result = await getDocumentRequestByIdService(requestId, user);
  if (!result.success) return result;

  const item = result.data;
  const nowIso = new Date().toISOString();

  item.archived = false;
  item.archivedAt = null;
  item.archivedBy = null;
  item.updatedAt = nowIso;

  const filePath = path.join(REQUESTS_DIR, `${requestId}.json`);
  await fs.writeFile(filePath, JSON.stringify(item, null, 2));

  if (adminDb) {
    adminDb.collection("document_requests").doc(requestId).update({
      archived: false,
      archivedAt: null,
      archivedBy: null,
      updatedAt: nowIso
    }).catch(() => {});
  }

  return {
    success: true,
    message: "Demande restaurée / désarchivée avec succès.",
    data: item
  };
}
