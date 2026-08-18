import admin from "firebase-admin";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Chargement de la clé de compte de service Firebase Admin SDK
const serviceAccountPath = join(__dirname, "../backend-91067-firebase-adminsdk-fbsvc-23f38cb5da.json");
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

/**
 * Création d'un utilisateur par un administrateur / RH (SANS inscription publique)
 * Attribue également les informations de profil et le rôle dans Firestore.
 * 
 * @param {Object} userData 
 * @param {string} userData.email - Email de l'utilisateur
 * @param {string} userData.password - Mot de passe initial généré par l'admin
 * @param {string} userData.displayName - Nom complet
 * @param {string} userData.role - Rôle ('admin', 'rh', 'manager', 'employee', 'student', 'teacher')
 * @param {string} [userData.department] - Département (optionnel)
 */
export async function createUserByAdmin({ email, password, displayName, role = 'employee', department = '' }) {
  try {
    // 1. Création du compte utilisateur dans Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      disabled: false
    });

    // 2. Définition des Custom Claims pour les permissions et la sécurité par rôle
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    // 3. Stockage du profil dans Firestore (collection `users`)
    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      department,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        role
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
