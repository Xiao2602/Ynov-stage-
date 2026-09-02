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

    // 2. Déclenchement de la notification In-App pour l'étudiant// Dans submitAbsenceService, après avoir créé l'absence

    // 1. Notification pour l'étudiant (comme avant)
    createNotificationService({
      userId: user.uid,
      title: "Demande d'absence enregistrée",
      message: `Votre demande d'absence (${type}) a bien été enregistrée et est en attente de révision par l'administration RH.`,
      type: "absence_submission",
      relatedId: docRef.id
    }).catch(err => {
      console.warn("Avertissement : La notification In-App n'a pas pu être créée :", err.message);
    });

    // 2. Notification pour TOUS les admins et RH
    try {
      // Récupérer tous les utilisateurs avec rôle admin ou rh
      const usersSnapshot = await adminDb.collection("users").get();
      const adminRhUsers = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (['admin', 'rh'].includes(userData.role)) {
          adminRhUsers.push(userData.uid);
        }
      });

      // Créer une notification pour chaque admin/RH
      const notificationPromises = adminRhUsers.map(adminId => {
        return createNotificationService({
          userId: adminId,
          title: "Nouvelle demande d'absence à traiter",
          message: `${user.displayName || user.email} a soumis une demande d'absence (${type}).`,
          type: "absence_pending_review",
          relatedId: docRef.id
        });
      });

      await Promise.all(notificationPromises);
      console.log(`✅ Notifications envoyées à ${adminRhUsers.length} administrateurs/RH`);
    } catch (error) {
      console.warn("⚠️ Erreur lors de l'envoi des notifications aux admins:", error.message);
    }

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
      .orderBy("createdAt", "desc")
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
    snapshot.forEach(doc => absences.push({ id: doc.id, ...doc.data() }));

    let filtered = absences;
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(a => new Date(a.startDate) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      filtered = filtered.filter(a => new Date(a.endDate) <= end);
    }

    // Générer le PDF avec pdfkit de manière asynchrone via Promise
    const buffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const buffers = [];

      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // 1. En-tête officiel Ynov
      doc.rect(0, 0, 842, 60).fill('#0f172a');
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
         .text("YNOV CAMPUS — RAPPORT OFFICIEL DES ABSENCES", 35, 18);
      
      doc.fontSize(9).font('Helvetica')
         .text(`Généré le ${new Date().toLocaleString('fr-FR')} • Total : ${filtered.length} demande(s)`, 35, 38);

      // 2. Configuration des colonnes (Largeur totale = 780 pt)
      const startY = 80;
      const rowHeight = 22;
      const cols = [
        { header: "#", width: 25, align: 'center' },
        { header: "Étudiant", width: 115, align: 'left' },
        { header: "Email / Classe", width: 135, align: 'left' },
        { header: "Type", width: 65, align: 'center' },
        { header: "Objet / Motif", width: 155, align: 'left' },
        { header: "Date Début", width: 75, align: 'center' },
        { header: "Date Fin", width: 75, align: 'center' },
        { header: "Statut", width: 65, align: 'center' },
        { header: "Décision par", width: 70, align: 'left' }
      ];

      let currentY = startY;

      // 3. En-tête du tableau
      const drawTableHeader = (yPos) => {
        doc.rect(30, yPos, 780, rowHeight).fill('#1e293b');
        let xOffset = 30;
        doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
        cols.forEach(col => {
          doc.text(col.header, xOffset + 3, yPos + 7, { width: col.width - 6, align: col.align });
          xOffset += col.width;
        });
      };

      drawTableHeader(currentY);
      currentY += rowHeight;

      // 4. Lignes du tableau
      filtered.forEach((a, idx) => {
        if (currentY > 530) {
          doc.addPage();
          currentY = 40;
          drawTableHeader(currentY);
          currentY += rowHeight;
        }

        // Alternance de couleur (Zebra striping)
        if (idx % 2 === 0) {
          doc.rect(30, currentY, 780, rowHeight).fill('#f8fafc');
        } else {
          doc.rect(30, currentY, 780, rowHeight).fill('#ffffff');
        }

        // Bordure de ligne
        doc.rect(30, currentY, 780, rowHeight).strokeColor('#e2e8f0').lineWidth(0.5).stroke();

        const typeLabel = a.type === 'late' ? 'Retard' : a.type === 'unjustified' ? 'Injustifiée' : a.type || 'Absence';
        const statusLabel = a.status === 'approved' ? 'Validée' : a.status === 'rejected' ? 'Rejetée' : 'En attente';

        const rowValues = [
          String(idx + 1),
          a.displayName || a.studentName || '—',
          a.userEmail || a.department || '—',
          typeLabel,
          a.reason || a.courseName || '—',
          a.startDate ? String(a.startDate).slice(0, 10) : '—',
          a.endDate ? String(a.endDate).slice(0, 10) : '—',
          statusLabel,
          a.reviewerName || '—'
        ];

        let colX = 30;
        rowValues.forEach((val, cIdx) => {
          const col = cols[cIdx];
          if (cIdx === 7) {
            if (a.status === 'approved') doc.fillColor('#16a34a');
            else if (a.status === 'rejected') doc.fillColor('#dc2626');
            else doc.fillColor('#d97706');
            doc.font('Helvetica-Bold');
          } else {
            doc.fillColor('#1e293b').font('Helvetica');
          }
          doc.fontSize(7.5).text(val, colX + 3, currentY + 6, {
            width: col.width - 6,
            align: col.align,
            lineBreak: false,
            ellipsis: true
          });
          colX += col.width;
        });

        currentY += rowHeight;
      });

      doc.end();
    });

    return {
      success: true,
      buffer,
      filename: `absences_${new Date().toISOString().slice(0, 10)}.pdf`
    };
  } catch (error) {
    console.error("❌ Erreur exportAbsencesToPdfService:", error);
    return { success: false, error: "Erreur lors de l'export PDF : " + error.message };
  }
}

/**
 * 🔥 Déclarer une absence pour un étudiant (par un professeur)
 * @param {Object} teacherUser - Professeur (req.user)
 * @param {Object} data - { studentId, startDate, endDate, reason, courseName }
 */

/**
 * Justifier une absence (déposer un justificatif)
 * @param {string} absenceId - ID de l'absence
 * @param {string} userId - UID de l'étudiant
 * @param {string} justificationUrl - URL du justificatif
 * @param {string} reason - Motif de l'absence (optionnel)
 */
export async function justifyAbsenceService(absenceId, userId, justificationUrl, reason = '') {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(absenceId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Absence introuvable." };
    }

    const absence = doc.data();

    // Vérifier que l'absence appartient bien à l'étudiant
    if (absence.userId !== userId) {
      return { success: false, error: "Vous n'êtes pas autorisé à justifier cette absence." };
    }

    // Vérifier que l'absence est dans un état justifiable (to_justify ou pending)
    if (absence.status !== ABSENCE_STATUS.TO_JUSTIFY && absence.status !== ABSENCE_STATUS.PENDING) {
      return { success: false, error: "Cette absence ne peut pas être justifiée (statut actuel: " + absence.status + ")." };
    }

    const updateData = {
      justificationUrl: justificationUrl,
      reason: reason || absence.reason,
      status: ABSENCE_STATUS.PENDING, // repasse en attente de validation RH
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.update(updateData);

    // Notification à l'étudiant
    createNotificationService({
      userId: userId,
      title: "Justificatif déposé avec succès",
      message: "Votre justificatif a été enregistré. Il sera examiné par l'administration RH.",
      type: "justification_submitted",
      relatedId: absenceId
    }).catch(err => console.warn("Notification échouée:", err.message));

    // Notification aux admins/RH
    try {
      const usersSnapshot = await adminDb.collection("users").get();
      const adminRhUsers = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (['admin', 'rh'].includes(userData.role)) {
          adminRhUsers.push(userData.uid);
        }
      });
      const notificationPromises = adminRhUsers.map(adminId => {
        return createNotificationService({
          userId: adminId,
          title: "Nouveau justificatif déposé",
          message: `Un étudiant a déposé un justificatif pour une absence.`,
          type: "justification_pending_review",
          relatedId: absenceId
        });
      });
      await Promise.all(notificationPromises);
    } catch (error) {
      console.warn("⚠️ Erreur notifications admins:", error.message);
    }

    return {
      success: true,
      message: "Justificatif déposé avec succès. En attente de validation.",
      absenceId
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la justification : " + error.message };
  }
}

/**
 * Déclarer une absence pour un étudiant (par un professeur)
 * @param {Object} teacherUser - Professeur (req.user)
 * @param {Object} data - { studentId, startDate, endDate, reason, courseName, type }
 */
export async function teacherDeclareAbsenceService(teacherUser, { 
  studentId, 
  startDate, 
  endDate, 
  reason, 
  courseName,
  type = 'unjustified',  // 🔥 nouveau paramètre
  isLate = false         // 🔥 nouveau paramètre
}) {
  try {
    const studentDoc = await adminDb.collection("users").doc(studentId).get();
    if (!studentDoc.exists) {
      return { success: false, error: "Étudiant introuvable." };
    }
    const studentData = studentDoc.data();

    const docRef = adminDb.collection(COLLECTION_NAME).doc();
    // Dans teacherDeclareAbsenceService (ligne où vous créez newAbsence)
    const newAbsence = {
      id: docRef.id,
      userId: studentId,
      userEmail: studentData.email || "",
      displayName: studentData.displayName || "Étudiant",
      role: studentData.role || "student",
      department: studentData.department || "",
      type: type, // "unjustified" ou "late"
      startDate,
      endDate,
      reason: reason || (isLate ? "Retard en cours - " + courseName : "Absence en cours - " + courseName),
      justificationUrl: "",
      status: ABSENCE_STATUS.TO_JUSTIFY,
      declaredBy: teacherUser.uid,
      declaredByName: teacherUser.displayName || teacherUser.email || "Professeur",
      courseName: courseName || "Cours non spécifié",
      justificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      reviewedBy: null,
      reviewNotes: null,
      isLate: isLate === true, // 🔥 IMPORTANT
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(newAbsence);

    // Notification à l'étudiant
    const message = type === "late" 
      ? `Le professeur ${teacherUser.displayName} vous a déclaré en retard pour le cours "${courseName || 'non spécifié'}" le ${startDate}. Vous avez 48h pour justifier ce retard.`
      : `Le professeur ${teacherUser.displayName} vous a déclaré absent pour le cours "${courseName || 'non spécifié'}" le ${startDate}. Vous avez 48h pour justifier cette absence.`;

    createNotificationService({
      userId: studentId,
      title: type === "late" ? "Retard déclaré par votre professeur" : "Absence déclarée par votre professeur",
      message: message,
      type: type === "late" ? "teacher_late_declaration" : "teacher_absence_declaration",
      relatedId: docRef.id
    }).catch(err => console.warn("Notification étudiant échouée:", err.message));

    // Notification aux admins/RH/Personnel
    try {
      const usersSnapshot = await adminDb.collection("users").get();
      const adminUsers = [];
      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (['admin', 'rh', 'employee'].includes(userData.role)) {
          adminUsers.push(userData.uid);
        }
      });

      const notificationPromises = adminUsers.map(adminId => {
        return createNotificationService({
          userId: adminId,
          title: type === "late" ? "Nouveau retard déclaré par un professeur" : "Nouvelle absence déclarée par un professeur",
          message: `L'étudiant ${studentData.displayName} a été déclaré ${type === "late" ? "en retard" : "absent"} par le professeur ${teacherUser.displayName}.`,
          type: type === "late" ? "teacher_late_declaration_admin" : "teacher_absence_declaration_admin",
          relatedId: docRef.id
        });
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.warn("⚠️ Erreur notifications admins:", error.message);
    }

    return {
      success: true,
      message: isLate ? "Retard déclaré pour l'étudiant." : "Absence déclarée pour l'étudiant.",
      absence: {
        ...newAbsence,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la déclaration : " + error.message };
  }
}

/**
 * 🔥 Récupérer le nombre de retards non justifiés pour un étudiant
 * @param {string} userId - UID de l'étudiant
 */
export async function getLateCountService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .where("type", "==", "late")
      .where("status", "in", [ABSENCE_STATUS.TO_JUSTIFY_LATE, ABSENCE_STATUS.PENDING])
      .get();

    let count = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      // Ne compter que les retards qui ne sont pas encore transformés en absence
      if (!data.transformedToAbsence) {
        count++;
      }
    });

    return { success: true, count };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * 🔥 Transformer 2 retards non justifiés en 1 absence
 * @param {string} userId - UID de l'étudiant
 */
export async function transformLatesToAbsenceService(userId) {
  try {
    // Récupérer les retards non justifiés
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .where("type", "==", "late")
      .where("status", "in", [ABSENCE_STATUS.TO_JUSTIFY_LATE, ABSENCE_STATUS.PENDING])
      .where("transformedToAbsence", "==", false)
      .orderBy("createdAt", "asc")
      .get();

    const lates = [];
    snapshot.forEach(doc => lates.push({ id: doc.id, ...doc.data() }));

    if (lates.length < 2) {
      return { success: true, message: `Pas assez de retards (${lates.length}/2) pour créer une absence.` };
    }

    // Prendre les 2 premiers retards
    const firstLate = lates[0];
    const secondLate = lates[1];

    // Créer une absence à partir des retards
    const docRef = adminDb.collection(COLLECTION_NAME).doc();
    const newAbsence = {
      id: docRef.id,
      userId: userId,
      userEmail: firstLate.userEmail || "",
      displayName: firstLate.displayName || "Étudiant",
      role: firstLate.role || "student",
      department: firstLate.department || "",
      type: "unjustified",
      startDate: firstLate.startDate,
      endDate: secondLate.endDate || firstLate.endDate,
      reason: `Absence générée automatiquement suite à ${lates.length} retards non justifiés.`,
      justificationUrl: "",
      status: ABSENCE_STATUS.TO_JUSTIFY,
      declaredBy: "system",
      declaredByName: "Système (automatique)",
      courseName: firstLate.courseName || "Cours non spécifié",
      justificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      reviewedBy: null,
      reviewNotes: null,
      transformedFromLates: [firstLate.id, secondLate.id],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(newAbsence);

    // Marquer les retards comme transformés
    const batch = adminDb.batch();
    lates.forEach(late => {
      const ref = adminDb.collection(COLLECTION_NAME).doc(late.id);
      batch.update(ref, { transformedToAbsence: true });
    });
    await batch.commit();

    // Notification à l'étudiant
    createNotificationService({
      userId: userId,
      title: "Absence générée automatiquement",
      message: `Vos ${lates.length} retards non justifiés ont été transformés en une absence. Vous avez 48h pour la justifier.`,
      type: "lates_transformed_to_absence",
      relatedId: docRef.id
    }).catch(err => console.warn("Notification échouée:", err.message));

    return {
      success: true,
      message: `${lates.length} retards transformés en 1 absence.`,
      absenceId: docRef.id
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la transformation des retards : " + error.message };
  }
}

export async function archiveAbsencesService(year) {
  try {
    const snapshot = await adminDb.collection("absences").get();
    if (snapshot.empty) {
      return { success: true, message: "Aucune absence à archiver.", archived: 0 };
    }

    let yearStart, yearEnd;
    if (year.includes('-')) {
      const parts = year.split('-');
      yearStart = parseInt(parts[0]);
      yearEnd = parseInt(parts[1]);
    } else {
      yearStart = parseInt(year);
      yearEnd = yearStart;
    }

    if (isNaN(yearStart) || isNaN(yearEnd)) {
      return { success: false, error: "Format d'année invalide." };
    }

    const absencesToArchive = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      let dateValue = data.startDate || data.createdAt;
      if (!dateValue) return;

      let docYear;
      if (dateValue.toDate && typeof dateValue.toDate === 'function') {
        docYear = dateValue.toDate().getFullYear();
      } else if (typeof dateValue === 'string') {
        docYear = new Date(dateValue).getFullYear();
      } else if (typeof dateValue === 'number') {
        docYear = new Date(dateValue).getFullYear();
      } else if (dateValue.seconds !== undefined) {
        docYear = new Date(dateValue.seconds * 1000).getFullYear();
      } else {
        return;
      }

      if (!isNaN(docYear) && docYear >= yearStart && docYear <= yearEnd) {
        absencesToArchive.push({ id: doc.id, ...data });
      }
    });

    if (absencesToArchive.length === 0) {
      return { success: true, message: `Aucune absence à archiver pour l'année ${year}.`, archived: 0 };
    }

    const batch = adminDb.batch();
    absencesToArchive.forEach(absence => {
      const archiveRef = adminDb.collection("archived_absences").doc(absence.id);
      batch.set(archiveRef, { ...absence, archivedAt: admin.firestore.FieldValue.serverTimestamp() });
      batch.delete(adminDb.collection("absences").doc(absence.id));
    });
    await batch.commit();

    return { 
      success: true, 
      message: `${absencesToArchive.length} absence(s) archivée(s) pour l'année ${year}.`, 
      archived: absencesToArchive.length 
    };
  } catch (error) {
    console.error("Erreur archiveAbsencesService:", error);
    return { success: false, error: "Erreur lors de l'archivage : " + error.message };
  }
}