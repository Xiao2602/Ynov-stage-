import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
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
// Dans backend/Shared/Firebase config/firebase.js
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// Admin SDK Initialization
// Chercher le fichier de service account à plusieurs endroits possibles
const possiblePaths = [
  // À la racine du projet parent (là où se trouve le fichier)
  join(__dirname, "../../../backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
  // Dans le dossier courant
  join(__dirname, "backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
  // Dans le dossier backend ameliorer (si copié)
  join(__dirname, "../../backend-91067-firebase-adminsdk-fbsvc-48572794b4.json"),
];

let serviceAccountPath = null;
for (const p of possiblePaths) {
  if (existsSync(p)) {
    serviceAccountPath = p;
    break;
  }
}

if (serviceAccountPath) {
  console.log(`✅ Fichier de service account trouvé : ${serviceAccountPath}`);
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} else {
  console.warn("⚠️ Aucun fichier de service account trouvé. Tentative avec les credentials par défaut (peut échouer en local).");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
}

