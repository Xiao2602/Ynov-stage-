import admin from "firebase-admin";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findServiceAccount() {
  // 1. Check environment variables
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    return process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  // 2. Direct paths to test
  const candidatePaths = [
    join(__dirname, "../firebase-service-account.json"),
    join(__dirname, "./firebase-service-account.json"),
    join(__dirname, "../../firebase-service-account.json"),
    join(__dirname, "../backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
    join(__dirname, "./backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
    join(process.cwd(), "firebase-service-account.json"),
    join(process.cwd(), "backend/firebase-service-account.json"),
    join(process.cwd(), "backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. Scan directories for wildcard *-firebase-adminsdk-*.json
  const dirsToScan = [
    join(__dirname, ".."),
    __dirname,
    process.cwd()
  ];

  for (const dir of dirsToScan) {
    try {
      if (existsSync(dir)) {
        const files = readdirSync(dir);
        const match = files.find(f => f.includes("firebase-adminsdk") && f.endsWith(".json"));
        if (match) {
          return join(dir, match);
        }
      }
    } catch {
      // ignore read errors
    }
  }

  return null;
}

if (!admin.apps.length) {
  const serviceAccountPath = findServiceAccount();
  if (serviceAccountPath) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log(`✅ [firebaseAdmin] Initialisé avec le compte de service : ${serviceAccountPath}`);
    } catch (err) {
      console.warn(`⚠️ [firebaseAdmin] Échec lecture ${serviceAccountPath}:`, err.message);
      admin.initializeApp({ projectId: "backend-91067" });
    }
  } else {
    console.warn("⚠️ [firebaseAdmin] Aucun fichier de service account trouvé. Initialisation fallback avec projectId.");
    admin.initializeApp({ projectId: "backend-91067" });
  }
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
