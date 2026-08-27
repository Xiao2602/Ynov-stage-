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

/**
 * Service pour changer le mot de passe de l'utilisateur connecté
 * Utilise Firebase Admin SDK pour mettre à jour le mot de passe côté serveur
 * 
 * @param {string} uid - UID de l'utilisateur connecté
 * @param {string} currentPassword - Mot de passe actuel (pour vérification)
 * @param {string} newPassword - Nouveau mot de passe
 */
export async function changePasswordService(uid, email, currentPassword, newPassword) {
  try {
    // 1. Vérifier le mot de passe actuel en tentant une connexion
    await signInWithEmailAndPassword(auth, email, currentPassword);

    // 2. Valider le nouveau mot de passe
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Le nouveau mot de passe doit contenir au moins 6 caractères." };
    }

    if (currentPassword === newPassword) {
      return { success: false, error: "Le nouveau mot de passe doit être différent de l'ancien." };
    }

    // 3. Mettre à jour via Firebase Admin SDK
    const { adminAuth } = await import("../../firebaseAdmin.js");
    await adminAuth.updateUser(uid, { password: newPassword });

    return { success: true, message: "Mot de passe modifié avec succès." };
  } catch (error) {
    if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
      return { success: false, error: "Le mot de passe actuel est incorrect." };
    }
    return { success: false, error: "Erreur lors du changement de mot de passe : " + error.message };
  }
}

