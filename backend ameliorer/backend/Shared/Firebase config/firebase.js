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

// Admin SDK Initialization
const serviceAccountPath = join(__dirname, "../../../backend-91067-firebase-adminsdk-fbsvc-23f38cb5da.json");

if (existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} else {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
