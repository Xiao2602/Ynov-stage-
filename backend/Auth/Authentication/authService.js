import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { auth } from "../../Shared/Firebase config/firebase.js";

/**
 * Service pour l'authentification (Login, Reset Password, Logout)
 */
export async function loginService(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    return {
      success: true,
      data: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        token: token
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function resetPasswordService(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Email de réinitialisation de mot de passe envoyé." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function logoutService() {
  try {
    await signOut(auth);
    return { success: true, message: "Déconnexion réussie." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
