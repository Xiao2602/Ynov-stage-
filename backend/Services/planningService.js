import { adminDb } from "../firebaseAdmin.js";

const COLLECTION_NAME = "plannings";

/**
 * Récupère le planning d’un professeur
 * @param {string} teacherUid 
 */
export async function getPlanningService(teacherUid) {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("teacherUid", "==", teacherUid)
      .get();
    const plannings = [];
    snapshot.forEach(doc => plannings.push({ id: doc.id, ...doc.data() }));
    return { success: true, plannings };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Crée ou met à jour un planning
 * @param {Object} data - { teacherUid, courses, type, academicYear }
 * @param {string} userId - UID de l'utilisateur qui crée/modifie
 */
export async function upsertPlanningService(data, userId) {
  try {
    const { teacherUid, courses, type = "annual", academicYear } = data;
    if (!teacherUid || !courses || !Array.isArray(courses)) {
      return { success: false, error: "teacherUid et courses (tableau) sont requis." };
    }

    // Vérifier que le professeur existe
    const teacherDoc = await adminDb.collection("users").doc(teacherUid).get();
    if (!teacherDoc.exists) {
      return { success: false, error: "Professeur introuvable." };
    }

    // Vérifier si un planning existe déjà pour ce prof
    const snapshot = await adminDb.collection(COLLECTION_NAME)
      .where("teacherUid", "==", teacherUid)
      .get();

    const now = admin.firestore.FieldValue.serverTimestamp();
    const planningData = {
      teacherUid,
      courses,
      type,
      academicYear: academicYear || new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
      updatedAt: now,
      updatedBy: userId
    };

    if (snapshot.empty) {
      // Créer un nouveau planning
      const docRef = await adminDb.collection(COLLECTION_NAME).add({
        ...planningData,
        createdAt: now
      });
      return { success: true, message: "Planning créé.", id: docRef.id };
    } else {
      // Mettre à jour l'existant
      const docRef = snapshot.docs[0].ref;
      await docRef.update(planningData);
      return { success: true, message: "Planning mis à jour.", id: docRef.id };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Supprime un planning
 * @param {string} planningId 
 */
export async function deletePlanningService(planningId) {
  try {
    await adminDb.collection(COLLECTION_NAME).doc(planningId).delete();
    return { success: true, message: "Planning supprimé." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}