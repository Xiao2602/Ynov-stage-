import admin from "firebase-admin";
import { adminAuth, adminDb } from "../../Shared/Firebase config/firebase.js";

/**
 * Service pour la création d'utilisateurs par Admin / RH (avec support du rôle Parent et liaison Étudiant)
 */
export async function createUserService({ email, password, displayName, role = "employee", department = "", childrenUids = [] }) {
  try {
    // 1. Créer le compte Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      disabled: false
    });

    // 2. Assigner le rôle (Custom User Claims)
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // 3. Enregistrer dans la collection Firestore `users`
    const userData = {
      uid: userRecord.uid,
      email,
      displayName,
      role,
      department,
      childrenUids: Array.isArray(childrenUids) ? childrenUids : [],
      parentUids: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await adminDb.collection("users").doc(userRecord.uid).set(userData);

    // 4. Si des étudiants sont liés lors de la création du parent, mettre à jour le document des étudiants
    if (role === "parent" && Array.isArray(childrenUids) && childrenUids.length > 0) {
      for (const studentUid of childrenUids) {
        const studentRef = adminDb.collection("users").doc(studentUid);
        const studentDoc = await studentRef.get();
        if (studentDoc.exists) {
          await studentRef.update({
            parentUids: admin.firestore.FieldValue.arrayUnion(userRecord.uid),
            updatedAt: new Date().toISOString()
          });
        }
      }
    }

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        department,
        childrenUids: userData.childrenUids
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Lier un compte Parent à un compte Étudiant dans Firestore
 * 
 * @param {string} parentUid 
 * @param {string} studentUid 
 */
export async function linkParentToStudentService(parentUid, studentUid) {
  try {
    const parentRef = adminDb.collection("users").doc(parentUid);
    const studentRef = adminDb.collection("users").doc(studentUid);

    const [parentDoc, studentDoc] = await Promise.all([parentRef.get(), studentRef.get()]);

    if (!parentDoc.exists) {
      return { success: false, error: "Compte Parent introuvable." };
    }
    if (!studentDoc.exists) {
      return { success: false, error: "Compte Étudiant introuvable." };
    }

    // Mise à jour du Parent (ajout de l'UID étudiant)
    await parentRef.update({
      childrenUids: admin.firestore.FieldValue.arrayUnion(studentUid),
      updatedAt: new Date().toISOString()
    });

    // Mise à jour de l'Étudiant (ajout de l'UID parent)
    await studentRef.update({
      parentUids: admin.firestore.FieldValue.arrayUnion(parentUid),
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      message: "Parent et Étudiant liés avec succès.",
      parentUid,
      studentUid
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la liaison Parent-Étudiant : " + error.message };
  }
}

/**
 * Récupérer la liste des enfants (étudiants) liés à un parent
 * 
 * @param {string} parentUid 
 */
export async function getLinkedChildrenService(parentUid) {
  try {
    const parentDoc = await adminDb.collection("users").doc(parentUid).get();
    if (!parentDoc.exists) {
      return { success: false, error: "Compte Parent introuvable." };
    }

    const parentData = parentDoc.data();
    const childrenUids = parentData.childrenUids || [];

    if (childrenUids.length === 0) {
      return { success: true, count: 0, children: [] };
    }

    const childrenSnapshots = await Promise.all(
      childrenUids.map(uid => adminDb.collection("users").doc(uid).get())
    );

    const children = childrenSnapshots
      .filter(snap => snap.exists)
      .map(snap => snap.data());

    return { success: true, count: children.length, children };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération des enfants liés : " + error.message };
  }
}

/**
 * Obtenir la liste de tous les utilisateurs (pour l'admin / RH)
 */
export async function getAllUsersService() {
  try {
    const snapshot = await adminDb.collection("users").get();
    const users = [];
    snapshot.forEach(doc => users.push(doc.data()));
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
