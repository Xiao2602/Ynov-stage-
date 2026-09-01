import admin from "firebase-admin";
import { adminAuth, adminDb } from "../../Shared/Firebase config/firebase.js";
import { sendWelcomeEmail } from "../../Services/emailService.js"; // ✅ AJOUT

/**
 * Service pour la création d'utilisateurs par Admin / RH (avec support du rôle Parent et liaison Étudiant)
 */
export async function createUserService({
  email,
  password,
  displayName,
  role = "employee",
  department = "",
  className = "",
  assignedClass = "",
  assignedClasses = [],
  phone = ""
}) {
  try {
    const cleanEmail = email?.trim().toLowerCase();
    const cleanDisplayName = displayName?.trim();

    if (!cleanEmail) {
      return { success: false, error: "L'adresse email est obligatoire." };
    }
    if (!cleanEmail.endsWith("@ynov.com")) {
      return { success: false, error: "L'adresse email doit appartenir au domaine @ynov.com." };
    }
    if (!cleanDisplayName) {
      return { success: false, error: "Le nom complet est obligatoire." };
    }
    if (!password) {
      return { success: false, error: "Le mot de passe initial est obligatoire." };
    }
    if (password.length < 6) {
      return { success: false, error: "Le mot de passe doit contenir au moins 6 caractères." };
    }

    // Création Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: cleanEmail,
      password,
      displayName: cleanDisplayName,
      disabled: false
    });

    // Attribution du rôle
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    let finalAssignedClasses = Array.isArray(assignedClasses) ? [...assignedClasses] : [];
    if (assignedClass && !finalAssignedClasses.includes(assignedClass)) {
      finalAssignedClasses.push(assignedClass);
    }

    // Préparer les données Firestore
    const userData = {
      uid: userRecord.uid,
      email: cleanEmail,
      displayName: cleanDisplayName,
      role,
      phone: phone || "",
      department: department || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    // Ajouter les champs spécifiques selon le rôle
    if (role === 'student' && className) {
      userData.className = className;
      userData.department = className; // pour compatibilité
    }
    if (role === 'teacher') {
      if (finalAssignedClasses.length > 0) {
        userData.assignedClasses = finalAssignedClasses;
        userData.assignedClass = finalAssignedClasses[0];
        userData.department = finalAssignedClasses[0];
      } else if (assignedClass) {
        userData.assignedClass = assignedClass;
        userData.assignedClasses = [assignedClass];
        userData.department = assignedClass;
      }
    }

    await adminDb.collection("users").doc(userRecord.uid).set(userData);

    // ✅ ENVOI DE L'EMAIL DE BIENVENUE (non bloquant)
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    sendWelcomeEmail({
      email: cleanEmail,
      displayName: cleanDisplayName,
      password: password,
      role: role,
      loginUrl
    }).then(result => {
      if (!result.success) {
        console.warn('⚠️ Email de bienvenue non envoyé pour', cleanEmail, ':', result.error);
      }
    }).catch(err => {
      console.warn('⚠️ Erreur lors de l\'envoi de l\'email pour', cleanEmail, ':', err);
    });

    return {
      success: true,
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role,
        department: department || '',
        className: className || '',
        assignedClasses: assignedClasses || []
      }
    };
  } catch (error) {
    console.error("Erreur création utilisateur :", error);
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
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      users.push({
        uid: doc.id,
        id: doc.id,
        ...data,
        uid: data.uid || doc.id
      });
    });
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Mise à jour de son propre profil utilisateur
 */
export async function updateMyProfileService(uid, updateData) {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return { success: false, error: "Utilisateur non trouvé." };
    }

    const allowedFields = ["displayName", "phone", "department", "photoURL", "avatarUrl", "bio"];
    const sanitizedData = {};
    for (const key of Object.keys(updateData)) {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        sanitizedData[key] = updateData[key];
      }
    }

    sanitizedData.updatedAt = new Date().toISOString();

    await userRef.update(sanitizedData);

    if (sanitizedData.displayName) {
      try {
        await adminAuth.updateUser(uid, { displayName: sanitizedData.displayName });
      } catch (authErr) {
        console.warn("Mise à jour displayName Firebase Auth non bloquante:", authErr.message);
      }
    }

    const updatedDoc = await userRef.get();
    return { success: true, data: updatedDoc.data() };
  } catch (error) {
    return { success: false, error: "Erreur mise à jour profil : " + error.message };
  }
}

/**
 * Enregistrement de l'avatar utilisateur
 */
export async function uploadAvatarService(uid, avatarUrl) {
  try {
    const userRef = adminDb.collection("users").doc(uid);
    await userRef.update({
      photoURL: avatarUrl,
      avatarUrl: avatarUrl,
      updatedAt: new Date().toISOString()
    });

    try {
      await adminAuth.updateUser(uid, { photoURL: avatarUrl });
    } catch (authErr) {
      console.warn("Mise à jour photoURL Firebase Auth non bloquante:", authErr.message);
    }

    return { success: true, avatarUrl };
  } catch (error) {
    return { success: false, error: "Erreur enregistrement avatar : " + error.message };
  }
}