import { loginService, resetPasswordService, logoutService, changePasswordService } from "./authService.js";
import { sendCustomPasswordResetEmail } from "./customEmailService.js";

/**
 * Controller pour gérer le Login (POST /api/auth/login)
 */
export async function handleLogin(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Veuillez fournir un email et un mot de passe." });
  }

  const result = await loginService(email, password);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(401).json(result);
  }
}

/**
 * Controller pour Réinitialiser le Mot de passe (POST /api/auth/reset-password)
 * Génère le beau template HTML personnalisé et le lien de réinitialisation Firebase.
 */
export async function handleResetPassword(req, res) {
  const { email, smtpConfig } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: "Veuillez fournir une adresse email." });
  }

  const result = await sendCustomPasswordResetEmail(email, smtpConfig);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour la Déconnexion (POST /api/auth/logout)
 */
export async function handleLogout(req, res) {
  const result = await logoutService();
  return res.status(200).json(result);
}

/**
 * Controller pour changer le mot de passe de l'utilisateur connecté (PATCH /api/auth/change-password)
 */
export async function handleChangePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false, 
      error: "Veuillez fournir le mot de passe actuel (currentPassword) et le nouveau mot de passe (newPassword)." 
    });
  }

  const result = await changePasswordService(req.user.uid, req.user.email, currentPassword, newPassword);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

