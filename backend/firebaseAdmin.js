import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Recherche de la clé de compte de service Firebase Admin SDK
const possiblePaths = [
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
  join(__dirname, "../backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
  join(__dirname, "../firebase-service-account.json"),
  join(__dirname, "./firebase-service-account.json"),
  join(process.cwd(), "backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
  join(process.cwd(), "firebase-service-account.json")
].filter(Boolean);

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("❌ Erreur de parsing de FIREBASE_SERVICE_ACCOUNT JSON :", err.message);
  }
}

if (!serviceAccount) {
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        serviceAccount = JSON.parse(readFileSync(path, "utf8"));
        console.log(`✅ Clé Firebase Admin chargée depuis : ${path}`);
        break;
      } catch (err) {
        console.error(`❌ Erreur lors de la lecture de la clé Firebase (${path}) :`, err.message);
      }
    }
  }
}

let adminAuthInstance = null;
let adminDbInstance = null;

if (!admin.apps.length) {
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      adminAuthInstance = admin.auth();
      adminDbInstance = admin.firestore();
    } catch (err) {
      console.error("❌ Erreur d'initialisation de Firebase Admin :", err.message);
    }
  } else {
    console.warn(
      "\n⚠️ ATTENTION : Fichier de clé Firebase Admin (firebase-service-account.json) introuvable." +
      "\nℹ️ Le serveur démarrera, mais les actions nécessitant Firebase Admin échoueront jusqu'à ce que le fichier soit ajouté.\n"
    );
    try {
      admin.initializeApp({
        projectId: "backend-91067"
      });
      adminAuthInstance = admin.auth();
      adminDbInstance = admin.firestore();
    } catch (e) {
      // Ignorer si pas d'applicationDefault
    }
  }
} else {
  adminAuthInstance = admin.auth();
  adminDbInstance = admin.firestore();
}

export const adminAuth = adminAuthInstance;
export const adminDb = adminDbInstance;


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
      dataTermsAccepted: false,
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
