import { adminDb } from "../firebaseAdmin.js";
import admin from "firebase-admin";

const COLLECTION_NAME = "plannings";
const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

/**
 * Récupère le planning d'un professeur
 * @param {string} teacherUid 
 */
export async function getPlanningService(teacherUid) {
  try {
    const doc = await adminDb.collection(COLLECTION_NAME).doc(teacherUid).get();
    if (!doc.exists) {
      return { success: true, plannings: [] };
    }
    return { success: true, plannings: [{ id: doc.id, ...doc.data() }] };
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

    const normalizedCourses = courses
      .map((c, index) => {
        let courseDate = c.date ? String(c.date).trim() : '';
        let courseDay = c.day ? String(c.day).trim() : '';

        if (courseDate && !courseDay) {
          try {
            const d = new Date(courseDate + 'T00:00:00');
            if (!isNaN(d.getTime())) {
              courseDay = DAYS_FR[d.getDay()] || 'Lundi';
            }
          } catch (_) {}
        }

        return {
          id: c.id || Date.now() + index,
          date: courseDate,
          day: courseDay || 'Lundi',
          start: c.start || '08:00',
          duration: Number(c.duration) || 2,
          title: String(c.title || '').trim(),
          group: String(c.group || '').trim(),
          room: String(c.room || '').trim()
        };
      })
      .sort((a, b) => {
        if (a.date && b.date) {
          const comp = a.date.localeCompare(b.date);
          if (comp !== 0) return comp;
        }
        return (a.start || '').localeCompare(b.start || '');
      });

    const now = admin.firestore.FieldValue.serverTimestamp();
    const planningData = {
      teacherUid,
      courses: normalizedCourses,
      type,
      academicYear: academicYear || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)),
      totalCourses: normalizedCourses.length,
      totalHours: normalizedCourses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0),
      updatedAt: now,
      updatedBy: userId
    };

    const docRef = adminDb.collection(COLLECTION_NAME).doc(teacherUid);
    const existingDoc = await docRef.get();

    if (!existingDoc.exists) {
      await docRef.set({
        ...planningData,
        createdAt: now
      });
      return { success: true, message: "Planning créé avec succès.", id: teacherUid };
    } else {
      await docRef.update(planningData);
      return { success: true, message: "Planning mis à jour avec succès.", id: teacherUid };
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
