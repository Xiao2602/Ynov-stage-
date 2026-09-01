import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import admin from "firebase-admin";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Firebase Web SDK Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBGayNeSizS2ro5SnRGvfXxZh9Qj55v00k",
  authDomain: "backend-91067.firebaseapp.com",
  projectId: "backend-91067",
  storageBucket: "backend-91067.firebasestorage.app",
  messagingSenderId: "887032571174",
  appId: "1:887032571174:web:a58dde14fb1c8ad3d54de7",
  measurementId: "G-EQZRYW1DNH"
};

// Client SDK Initialization
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Admin SDK Initialization
function findServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && existsSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)) {
    return process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  }
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  const candidatePaths = [
    join(__dirname, "../../../firebase-service-account.json"),
    join(__dirname, "../../firebase-service-account.json"),
    join(__dirname, "../firebase-service-account.json"),
    join(__dirname, "./firebase-service-account.json"),
    join(__dirname, "../../../backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
    join(__dirname, "../../backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
    join(process.cwd(), "firebase-service-account.json"),
    join(process.cwd(), "backend/firebase-service-account.json"),
    join(process.cwd(), "backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
  ];

  for (const candidate of candidatePaths) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  const dirsToScan = [
    join(__dirname, "../../.."),
    join(__dirname, "../.."),
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
      console.log(`✅ [firebase] Fichier de service account trouvé : ${serviceAccountPath}`);
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (err) {
      console.warn("⚠️ [firebase] Erreur initialisation cert:", err.message);
      admin.initializeApp({ projectId: firebaseConfig.projectId });
    }
  } else {
    console.warn("⚠️ [firebase] Aucun fichier de service account trouvé. Initialisation fallback avec projectId.");
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
