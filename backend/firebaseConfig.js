import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut 
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Configuration Firebase Client
const firebaseConfig = {
  apiKey: "AIzaSyBGayNeSizS2ro5SnRGvfXxZh9Qj55v00k",
  authDomain: "backend-91067.firebaseapp.com",
  projectId: "backend-91067",
  storageBucket: "backend-91067.firebasestorage.app",
  messagingSenderId: "887032571174",
  appId: "1:887032571174:web:a58dde14fb1c8ad3d54de7",
  measurementId: "G-EQZRYW1DNH"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * Connexion d'un utilisateur (Login)
 * @param {string} email 
 * @param {string} password 
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Réinitialisation du mot de passe par email (Reset Password)
 * @param {string} email 
 */
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Email de réinitialisation envoyé avec succès." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Déconnexion de l'utilisateur
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
