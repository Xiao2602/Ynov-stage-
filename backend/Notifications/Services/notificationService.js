import admin from "firebase-admin";
import { adminDb } from "../../firebaseAdmin.js";

const COLLECTION_NAME = "notifications";

/**
 * Créer une notification In-App dans la collection Firestore 'notifications'
 * 
 * @param {Object} data 
 * @param {string} data.userId - UID du destinataire
 * @param {string} data.title - Titre de la notification
 * @param {string} data.message - Contenu du message
 * @param {string} [data.type="system"] - Type ('absence_submission', 'absence_approved', 'absence_rejected', 'system')
 * @param {string} [data.relatedId=""] - ID lié (ex: absenceId)
 */
export async function createNotificationService({ userId, title, message, type = "system", relatedId = "" }) {
  try {
    if (!userId || !title || !message) {
      return { success: false, error: "Veuillez fournir un destinataire (userId), un titre et un message." };
    }

    const docRef = adminDb.collection(COLLECTION_NAME).doc();
    const notification = {
      id: docRef.id,
      userId,
      title,
      message,
      type,
      relatedId,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await docRef.set(notification);

    return {
      success: true,
      message: "Notification créée avec succès.",
      notification: {
        ...notification,
        createdAt: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la création de la notification : " + error.message };
  }
}

/**
 * Obtenir toutes les notifications de l'utilisateur connecté
 * 
 * @param {string} userId - UID de l'utilisateur
 */
export async function getMyNotificationsService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push(doc.data());
    });

    // Compter les notifications non lues
    const unreadCount = notifications.filter(n => !n.read).length;

    return {
      success: true,
      count: notifications.length,
      unreadCount,
      notifications
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des notifications : " + error.message };
  }
}

/**
 * Marquer une notification spécifique comme lue
 * 
 * @param {string} notificationId 
 * @param {string} userId 
 */
export async function markNotificationAsReadService(notificationId, userId) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Notification introuvable." };
    }

    const notifData = doc.data();

    if (notifData.userId !== userId) {
      return { success: false, error: "Vous n'êtes pas autorisé à modifier cette notification." };
    }

    await docRef.update({ read: true });

    return { success: true, message: "Notification marquée comme lue.", notificationId };
  } catch (error) {
    return { success: false, error: "Erreur lors de la mise à jour de la notification : " + error.message };
  }
}

/**
 * Marquer toutes les notifications de l'utilisateur comme lues
 * 
 * @param {string} userId 
 */
export async function markAllNotificationsAsReadService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    const batch = adminDb.batch();

    snapshot.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();

    return { success: true, message: "Toutes les notifications ont été marquées comme lues.", updatedCount: snapshot.size };
  } catch (error) {
    return { success: false, error: "Erreur lors de la mise à jour des notifications : " + error.message };
  }
}
