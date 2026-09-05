import admin from "firebase-admin";
import { adminDb } from "../../firebaseAdmin.js";

const COLLECTION_NAME = "notifications";

/**
 * Créer une notification In-App
 */
export async function createNotificationService({ userId, title, message, type, relatedId }) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc();
    await docRef.set({
      id: docRef.id,
      userId,
      title,
      message,
      type,
      relatedId: relatedId || null,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Erreur création notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Récupérer les notifications de l'utilisateur
 */
export async function getMyNotificationsService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .get();

    const notifications = [];
    snapshot.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    return { success: true, count: notifications.length, notifications };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des notifications : " + error.message };
  }
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationAsReadService(notificationId, userId) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Notification introuvable." };
    }

    const data = doc.data();
    if (data.userId !== userId) {
      return { success: false, error: "Vous n'êtes pas autorisé." };
    }

    await docRef.update({ read: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, message: "Notification marquée comme lue." };
  } catch (error) {
    return { success: false, error: "Erreur : " + error.message };
  }
}

/**
 * Marquer toutes les notifications comme lues
 */
export async function markAllNotificationsAsReadService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .where("read", "==", false)
      .get();

    const batch = adminDb.batch();
    let count = 0;
    snapshot.forEach(doc => {
      batch.update(doc.ref, { read: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      count++;
    });

    if (count === 0) {
      return { success: true, message: "Aucune notification non lue.", count: 0 };
    }

    await batch.commit();
    return { success: true, message: `${count} notification(s) marquée(s) comme lues.`, count };
  } catch (error) {
    return { success: false, error: "Erreur : " + error.message };
  }
}

/**
 * Supprimer une notification
 */
export async function deleteNotificationService(notificationId, userId) {
  try {
    const docRef = adminDb.collection(COLLECTION_NAME).doc(notificationId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return { success: false, error: "Notification introuvable." };
    }

    const data = doc.data();
    if (data.userId !== userId) {
      return { success: false, error: "Vous n'êtes pas autorisé à supprimer cette notification." };
    }

    await docRef.delete();
    return { success: true, message: "Notification supprimée avec succès." };
  } catch (error) {
    return { success: false, error: "Erreur lors de la suppression : " + error.message };
  }
}

/**
 * Supprimer toutes les notifications lues d'un utilisateur
 */
export async function deleteReadNotificationsService(userId) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("userId", "==", userId)
      .where("read", "==", true)
      .get();

    const batch = adminDb.batch();
    let count = 0;
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });

    if (count === 0) {
      return { success: true, message: "Aucune notification lue à supprimer.", count: 0 };
    }

    await batch.commit();
    return { success: true, message: `${count} notification(s) supprimée(s).`, count };
  } catch (error) {
    return { success: false, error: "Erreur lors de la suppression : " + error.message };
  }
}