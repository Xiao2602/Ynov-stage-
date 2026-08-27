import admin from "firebase-admin";
import { adminDb } from "../../firebaseAdmin.js";
import { ABSENCE_STATUS } from "../Validators/absenceValidator.js";
import { sendNewAbsenceAlertToHR, sendAbsenceStatusEmail } from "../../Auth/Authentication/customEmailService.js";
import { createNotificationService } from "../../Notifications/Services/notificationService.js";

const COLLECTION_NAME = "absences";

/**
 * Créer une demande d'absence dans Firestore et déclencher l'alerte email RH + la notification In-App
 * 
 * @param {Object} user - Contenu du jeton JWT décodé (req.user)
 * @param {Object} absenceData - Données de l'absence (type, startDate, endDate, reason, justificationUrl)
 */
export async function submitAbsenceService(user, { type, startDate, endDate, reason, justificationUrl = "" }) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc();
    const newAbsence = {
      id: docRef.id,
      userId: user.uid,
      userEmail: user.email || "",
      displayName: user.displayName || user.name || user.email || "Utilisateur",
      role: user.role || "student",
      department: user.department || "",
      type,
      startDate,
      endDate,
      reason,
      justificationUrl,
      status: ABSENCE_STATUS.PENDING,
      reviewedBy: null,
      reviewNotes: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(newAbsence);

    // 1. Déclenchement de l'alerte email RH (asynchrone)
    sendNewAbsenceAlertToHR(newAbsence).catch(err => {
      console.warn("Avertissement : L'email d'alerte RH n'a pas pu être envoyé :", err.message);
    });

    // 2. Déclenchement de la notification In-App pour l'étudiant
    createNotificationService({
      userId: user.uid,
      title: "Demande d'absence enregistrée",
      message: `Votre demande d'absence (${type}) a bien été enregistrée et est en attente de révision par l'administration RH.`,
      type: "absence_submission",
      relatedId: docRef.id
    }).catch(err => {
      console.warn("Avertissement : La notification In-App n'a pas pu être créée :", err.message);
    });

    return {
      success: true,
      message: "Demande d'absence soumise avec succès.",
      absence: {
        ...newAbsence,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la création de la demande : " + error.message };
  }
}

/**
 * Obtenir les demandes d'absence de l'utilisateur connecté
 * 
 * @param {string} userId - UID de l'utilisateur
 */
export async function getMyAbsencesService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .get();

    const absences = [];
    snapshot.forEach(doc => {
      absences.push(doc.data());
    });

    return { success: true, count: absences.length, absences };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des absences : " + error.message };
  }
}

/**
 * Obtenir les demandes d'absence des enfants (étudiants) liés à un parent
 * 
 * @param {string} parentUid - UID du parent
 */
export async function getChildrenAbsencesService(parentUid) {
  try {
    const parentDoc = await adminDb.collection("users").doc(parentUid).get();
    if (!parentDoc.exists) {
      return { success: false, error: "Compte Parent introuvable." };
    }

    const childrenUids = parentDoc.data().childrenUids || [];
    if (childrenUids.length === 0) {
      return { success: true, count: 0, absences: [] };
    }

    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "in", childrenUids)
      .get();

    const absences = [];
    snapshot.forEach(doc => {
      absences.push(doc.data());
    });

    return { success: true, count: absences.length, absences };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des absences des enfants : " + error.message };
  }
}

/**
 * Obtenir les demandes d'absence en attente de validation (Pending)
 */
export async function getPendingAbsencesService() {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("status", "==", ABSENCE_STATUS.PENDING)
      .get();

    const absences = [];
    snapshot.forEach(doc => {
      absences.push(doc.data());
    });

    return { success: true, count: absences.length, absences };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des demandes en attente : " + error.message };
  }
}

/**
 * Obtenir toutes les demandes d'absence (pour Admin / RH / Manager / Enseignant)
 */
export async function getAllAbsencesService(filters = {}) {
  try {
    let query = adminDb.collection(COLLECTION_NAME);

    if (filters.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters.department) {
      query = query.where("department", "==", filters.department);
    }
    if (filters.type) {
      query = query.where("type", "==", filters.type);
    }

    const snapshot = await query.get();
    const absences = [];
    snapshot.forEach(doc => {
      absences.push(doc.data());
    });

    return { success: true, count: absences.length, absences };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération de toutes les absences : " + error.message };
  }
}

/**
 * Réviser une demande d'absence (Approuver ou Rejeter) et notifier l'utilisateur par email + Notification In-App
 * 
 * @param {string} absenceId - ID du document d'absence
 * @param {Object} reviewerUser - Utilisateur modérateur (Admin / RH / Manager)
 * @param {Object} reviewData - { status, reviewNotes }
 */
export async function reviewAbsenceService(absenceId, reviewerUser, { status, reviewNotes = "" }) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(absenceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Demande d'absence introuvable." };
    }

    const currentAbsence = doc.data();

    const updateData = {
      status,
      reviewedBy: reviewerUser.uid,
      reviewerName: reviewerUser.displayName || reviewerUser.email || "Modérateur",
      reviewNotes: reviewNotes || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.update(updateData);

    // 1. Déclenchement de l'email de décision à l'étudiant / employé (asynchrone)
    if (currentAbsence.userEmail) {
      sendAbsenceStatusEmail(currentAbsence.userEmail, currentAbsence.displayName, status, reviewNotes).catch(err => {
        console.warn("Avertissement : L'email de décision n'a pas pu être envoyé :", err.message);
      });
    }

    // 2. Déclenchement de la notification In-App à l'étudiant / employé
    const isApproved = status === "approved";
    createNotificationService({
      userId: currentAbsence.userId,
      title: isApproved ? "Demande d'absence approuvée" : "Demande d'absence refusée",
      message: isApproved 
        ? `Votre demande d'absence a été approuvée par l'administration RH.${reviewNotes ? ' Remarque: ' + reviewNotes : ''}`
        : `Votre demande d'absence a été refusée par l'administration RH.${reviewNotes ? ' Motif: ' + reviewNotes : ''}`,
      type: isApproved ? "absence_approved" : "absence_rejected",
      relatedId: absenceId
    }).catch(err => {
      console.warn("Avertissement : La notification In-App n'a pas pu être créée :", err.message);
    });

    return {
      success: true,
      message: `Demande d'absence mise à jour vers le statut '${status}'.`,
      absenceId
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la révision de la demande : " + error.message };
  }
}

/**
 * Supprimer une demande d'absence (si elle est encore en attente et appartient à l'utilisateur)
 * 
 * @param {string} absenceId 
 * @param {string} userId 
 */
export async function deleteAbsenceService(absenceId, userId) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(absenceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Demande d'absence introuvable." };
    }

    const absence = doc.data();

    if (absence.userId !== userId) {
      return { success: false, error: "Vous n'êtes pas autorisé à supprimer cette demande." };
    }

    if (absence.status !== ABSENCE_STATUS.PENDING) {
      return { success: false, error: "Seules les demandes en attente (pending) peuvent être supprimées." };
    }

    await docRef.delete();

    return { success: true, message: "Demande d'absence supprimée avec succès." };
  } catch (error) {
    return { success: false, error: "Erreur lors de la suppression de la demande : " + error.message };
  }

}

/**
 * Récupérer les statistiques globales pour le tableau de bord
 * (Admin / RH)
 */
export async function getStatisticsService() {
  try {
    const snapshot = await adminDb.collection("absences").get();
    const absences = [];
    snapshot.forEach(doc => absences.push(doc.data()));

    const total = absences.length;
    const pending = absences.filter(a => a.status === ABSENCE_STATUS.PENDING).length;
    const approved = absences.filter(a => a.status === ABSENCE_STATUS.APPROVED).length;
    const rejected = absences.filter(a => a.status === ABSENCE_STATUS.REJECTED).length;

    // Répartition par type d'absence
    const byType = {};
    absences.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1;
    });

    // Répartition par département
    const byDepartment = {};
    absences.forEach(a => {
      const dept = a.department || "Non défini";
      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
    });

    // Répartition par statut (pour les graphiques)
    const byStatus = { pending, approved, rejected };

    return {
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        byType,
        byDepartment,
        byStatus
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur lors du calcul des statistiques : " + error.message };
  }
}

import XLSX from "xlsx";
import PDFDocument from "pdfkit";

/**
 * Exporter les absences en Excel (.xlsx)
 * @param {Object} filters - { status, department, type, startDate, endDate }
 */
export async function exportAbsencesToExcelService(filters = {}) {
  try {
    let query = adminDb.collection("absences");
    
    if (filters.status) query = query.where("status", "==", filters.status);
    if (filters.department) query = query.where("department", "==", filters.department);
    if (filters.type) query = query.where("type", "==", filters.type);

    const snapshot = await query.get();
    const absences = [];
    snapshot.forEach(doc => absences.push(doc.data()));

    // Filtrer par dates si fournies (client-side pour plus de flexibilité)
    let filtered = absences;
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(a => new Date(a.startDate) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      filtered = filtered.filter(a => new Date(a.endDate) <= end);
    }

    // Formater les données pour Excel
    const rows = filtered.map(a => ({
      "ID": a.id || "",
      "Utilisateur": a.displayName || "",
      "Email": a.userEmail || "",
      "Département": a.department || "",
      "Type": a.type || "",
      "Date début": a.startDate || "",
      "Date fin": a.endDate || "",
      "Motif": a.reason || "",
      "Statut": a.status || "",
      "Validé par": a.reviewerName || "",
      "Remarques": a.reviewNotes || "",
      "Date création": a.createdAt?.toDate?.().toLocaleDateString() || ""
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Absences");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return { success: true, buffer, filename: `absences_${new Date().toISOString().slice(0,10)}.xlsx` };
  } catch (error) {
    return { success: false, error: "Erreur lors de l'export Excel : " + error.message };
  }
}

/**
 * Exporter les absences en PDF
 * @param {Object} filters - { status, department, type, startDate, endDate }
 */
export async function exportAbsencesToPdfService(filters = {}) {
  try {
    let query = adminDb.collection("absences");
    
    if (filters.status) query = query.where("status", "==", filters.status);
    if (filters.department) query = query.where("department", "==", filters.department);
    if (filters.type) query = query.where("type", "==", filters.type);

    const snapshot = await query.get();
    const absences = [];
    snapshot.forEach(doc => absences.push(doc.data()));

    let filtered = absences;
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(a => new Date(a.startDate) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      filtered = filtered.filter(a => new Date(a.endDate) <= end);
    }

    // Générer le PDF avec pdfkit
    const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
    const buffers = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    doc.fontSize(18).text("Rapport des Absences", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`Généré le : ${new Date().toLocaleDateString()}`, { align: "center" });
    doc.moveDown();

    // En-têtes du tableau
    const headers = ["#", "Nom", "Email", "Type", "Début", "Fin", "Statut", "Validé par"];
    const rows = filtered.map((a, i) => [
      i+1,
      a.displayName || "",
      a.userEmail || "",
      a.type || "",
      a.startDate || "",
      a.endDate || "",
      a.status || "",
      a.reviewerName || ""
    ]);

    // Dessiner le tableau
    const tableTop = 120;
    const rowHeight = 20;
    const colWidths = [30, 80, 100, 70, 70, 70, 70, 80];
    let y = tableTop;

    // Dessiner les en-têtes
    let x = 30;
    doc.fontSize(8).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: colWidths[i], align: "left" });
      x += colWidths[i];
    });

    y += rowHeight;
    doc.font("Helvetica");

    // Dessiner les lignes
    rows.forEach((row, idx) => {
      x = 30;
      if (y > 550) {
        doc.addPage();
        y = 30;
      }
      row.forEach((cell, i) => {
        doc.text(String(cell), x, y, { width: colWidths[i], align: "left" });
        x += colWidths[i];
      });
      y += rowHeight;
    });

    doc.end();
    const buffer = Buffer.concat(buffers);

    return { success: true, buffer, filename: `absences_${new Date().toISOString().slice(0,10)}.pdf` };
  } catch (error) {
    return { success: false, error: "Erreur lors de l'export PDF : " + error.message };
  }
}
