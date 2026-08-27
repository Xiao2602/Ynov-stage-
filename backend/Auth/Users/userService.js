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

/**
 * Récupérer le profil de l'utilisateur connecté depuis Firestore
 * 
 * @param {string} uid - UID de l'utilisateur connecté
 */
export async function getMyProfileService(uid) {
  try {
    const doc = await adminDb.collection("users").doc(uid).get();
    if (!doc.exists) {
      return { success: false, error: "Profil utilisateur introuvable." };
    }
    return { success: true, data: doc.data() };
  } catch (error) {
    return { success: false, error: "Erreur lors de la récupération du profil : " + error.message };
  }
}

/**
 * Mettre à jour le profil de l'utilisateur connecté (champs modifiables uniquement)
 * Champs modifiables : displayName, department, phone
 * Champs non modifiables : email, role, uid
 * 
 * @param {string} uid - UID de l'utilisateur connecté
 * @param {Object} updates - Champs à mettre à jour
 */
export async function updateMyProfileService(uid, updates) {
  try {
    const docRef = adminDb.collection("users").doc(uid);
    const doc = await docRef.get();
    if (!doc.exists) {
      return { success: false, error: "Profil utilisateur introuvable." };
    }

    // Filtrer uniquement les champs modifiables
    const allowedFields = ["displayName", "department", "phone", "photoURL", "avatarUrl"];
    const safeUpdates = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        safeUpdates[key] = updates[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return { success: false, error: "Aucun champ modifiable fourni. Champs autorisés : displayName, department, phone, photoURL, avatarUrl." };
    }

    safeUpdates.updatedAt = new Date().toISOString();
    await docRef.update(safeUpdates);

    // Mettre à jour Firebase Authentication (displayName / photoURL)
    const authUpdates = {};
    if (safeUpdates.displayName) authUpdates.displayName = safeUpdates.displayName;
    if (safeUpdates.photoURL || safeUpdates.avatarUrl) authUpdates.photoURL = safeUpdates.photoURL || safeUpdates.avatarUrl;

    if (Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(uid, authUpdates);
    }

    const updatedDoc = await docRef.get();
    return {
      success: true,
      message: "Profil mis à jour avec succès.",
      data: updatedDoc.data()
    };
  } catch (error) {
    return { success: false, error: "Erreur lors de la mise à jour du profil : " + error.message };
  }
}

/**
 * Service pour téléverser la photo de profil (avatar) sur le disque local
 * et mettre à jour l'URL photoURL dans Firestore et Firebase Auth.
 * 
 * @param {Object} file - Fichier image Multer (buffer, originalname, mimetype, size)
 * @param {string} uid - UID de l'utilisateur connecté
 */
export async function uploadAvatarService(file, uid) {
  try {
    const { writeFileSync, mkdirSync, existsSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const timestamp = Date.now();
    const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const userAvatarsFolder = join(__dirname, "../../uploads/avatars", uid);

    if (!existsSync(userAvatarsFolder)) {
      mkdirSync(userAvatarsFolder, { recursive: true });
    }

    const savedFileName = `avatar-${timestamp}_${cleanFileName}`;
    const localFilePath = join(userAvatarsFolder, savedFileName);

    // 1. Écriture de l'image sur le disque local
    writeFileSync(localFilePath, file.buffer);

    // 2. Génération de l'URL HTTP publique
    const relativePath = `/uploads/avatars/${uid}/${savedFileName}`;
    const port = process.env.PORT || 5000;
    const publicUrl = `http://localhost:${port}${relativePath}`;

    // 3. Mise à jour dans Firestore et Firebase Auth
    await adminDb.collection("users").doc(uid).update({
      photoURL: publicUrl,
      avatarUrl: publicUrl,
      updatedAt: new Date().toISOString()
    });

    await adminAuth.updateUser(uid, { photoURL: publicUrl });

    const updatedDoc = await adminDb.collection("users").doc(uid).get();

    return {
      success: true,
      message: "Photo de profil mise à jour avec succès.",
      photoURL: publicUrl,
      avatarUrl: publicUrl,
      data: updatedDoc.data()
    };
  } catch (error) {
    return { success: false, error: "Erreur lors du téléversement de la photo de profil : " + error.message };
  }
}

