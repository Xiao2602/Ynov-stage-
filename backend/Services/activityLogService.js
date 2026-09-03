import admin from "firebase-admin"; // ✅ Ajout de l'import
import { adminDb } from "../firebaseAdmin.js";

export async function logActivity(userId, action, details = {}, req = null) {
  try {
    console.log(`📝 logActivity: ${action} pour userId: ${userId}`);
    const ip = req?.ip || req?.connection?.remoteAddress || 'unknown';
    const userAgent = req?.headers?.['user-agent'] || 'unknown';
    const logEntry = {
      userId,
      action,
      details,
      ip,
      userAgent,
      timestamp: admin.firestore.FieldValue.serverTimestamp() // ✅ admin est défini
    };
    const docRef = await adminDb.collection("activity_logs").add(logEntry);
    console.log(`✅ Log enregistré: ${action} (ID: ${docRef.id})`);
    return docRef.id;
  } catch (error) {
    console.error("❌ Erreur logActivity:", error);
    return null;
  }
}

export async function getActivityLogs(filters = {}) {
  try {
    console.log("📋 getActivityLogs avec filtres:", filters);
    let query = adminDb.collection("activity_logs").orderBy("timestamp", "desc");
    if (filters.userId) query = query.where("userId", "==", filters.userId);
    if (filters.action) query = query.where("action", "==", filters.action);
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      query = query.where("timestamp", ">=", start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      query = query.where("timestamp", "<=", end);
    }
    const limit = filters.limit || 500;
    const snapshot = await query.limit(limit).get();
    const logs = [];
    snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));
    console.log(`✅ ${logs.length} logs récupérés`);
    return { success: true, logs };
  } catch (error) {
    console.error("❌ Erreur getActivityLogs:", error);
    return { success: false, error: error.message };
  }
}