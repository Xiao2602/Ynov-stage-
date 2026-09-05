import {
  loginService,
  resetPasswordService,
  logoutService
} from "./authService.js";

import {
  sendCustomPasswordResetEmail
} from "./customEmailService.js";

import {
  adminAuth,
  adminDb
} from "../../Shared/Firebase config/firebase.js";

import { logActivity } from "../../Services/activityLogService.js";
import { setupTwoFactor } from "../../Services/twoFactorService.js";

export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Veuillez fournir un email et un mot de passe." });
    }

    const result = await loginService(email, password);
    if (result.success) {
      const userRecord = await adminAuth.getUserByEmail(email);
      if (!userRecord) {
        return res.status(404).json({ success: false, error: "Utilisateur non trouvé." });
      }

      const userDoc = await adminDb.collection("users").doc(userRecord.uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      const role = userData.role || userRecord.customClaims?.role || 'employee';
      const isStudent = role === 'student';

      if (!isStudent) {
        const twoFactorEnabled = userData.twoFactorEnabled || false;

        if (twoFactorEnabled) {
          // Générer un ID temporaire
          const tempId = `temp_${Date.now()}_${userRecord.uid}`;
          
          // Stocker le secret temporairement
          await adminDb.collection("temp_2fa").doc(tempId).set({
            userId: userRecord.uid,
            secret: userData.twoFactorSecret,
            createdAt: new Date().toISOString()
          });

          // Supprimer après 5 minutes
          setTimeout(async () => {
            try {
              await adminDb.collection("temp_2fa").doc(tempId).delete();
            } catch (e) {
              console.warn("Erreur lors de la suppression du document temporaire 2FA:", e);
            }
          }, 5 * 60 * 1000);

          return res.status(200).json({
            success: true,
            requiresTwoFactor: true,
            tempUserId: tempId,
            message: "Veuillez entrer votre code d'authentification."
          });
        } else {
          // Pas de 2FA activée → connexion normale avec log
          await logActivity(userRecord.uid, 'login', { email }, req);
          return res.status(200).json(result);
        }
      }

      // Étudiant → pas de 2FA
      await logActivity(userRecord.uid, 'login', { email }, req);
      return res.status(200).json(result);
    }

    return res.status(401).json(result);
  } catch (error) {
    console.error("Erreur login :", error);
    return res.status(500).json({ success: false, error: "Erreur interne lors de la connexion." });
  }
}


export async function handleResetPassword(req, res) {
  try {
    const { email, smtpConfig } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Veuillez fournir une adresse email."
      });
    }

    const result = await sendCustomPasswordResetEmail(email, smtpConfig);

    if (result.success) {
      // Log de demande de réinitialisation
      const userRecord = await adminAuth.getUserByEmail(email);
      if (userRecord) {
        await logActivity(userRecord.uid, 'reset_password', { email }, req);
      }
      return res.status(200).json(result);
    }

    return res.status(400).json(result);
  } catch (error) {
    console.error("Erreur reset password :", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la réinitialisation."
    });
  }
}

export async function handleLogout(req, res) {
  const result = await logoutService();
  if (req.user) {
    await logActivity(req.user.uid, 'logout', {}, req);
  }
  return res.status(200).json(result);
}

export async function handleChangePassword(req, res) {
  try {
    const { newPassword } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Utilisateur non authentifié."
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: "Veuillez fournir un nouveau mot de passe."
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Le nouveau mot de passe doit contenir au moins 8 caractères."
      });
    }

    await adminAuth.updateUser(req.user.uid, {
      password: newPassword
    });

    await adminAuth.setCustomUserClaims(req.user.uid, {
      ...req.user,
      role: req.user.role
    });

    await logActivity(req.user.uid, 'change_password', {}, req);

    return res.status(200).json({
      success: true,
      message: "Mot de passe modifié avec succès."
    });
  } catch (error) {
    console.error("Erreur changement mot de passe :", error);
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }
}

export async function handleGetMe(req, res) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Utilisateur non authentifié."
      });
    }

    if (!user.uid) {
      console.error("❌ user.uid manquant dans req.user :", user);
      return res.status(500).json({
        success: false,
        error: "Données utilisateur incomplètes (uid manquant)."
      });
    }

    const userDoc = await adminDb.collection("users").doc(user.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    const effectiveRole = user.role || userData.role || "employee";

    let children = [];
    if (effectiveRole === "parent" && Array.isArray(userData.childrenUids) && userData.childrenUids.length > 0) {
      for (const childUid of userData.childrenUids) {
        try {
          const cDoc = await adminDb.collection("users").doc(childUid).get();
          if (cDoc.exists) {
            const cData = cDoc.data();
            children.push({
              uid: childUid,
              displayName: cData.displayName || "Étudiant",
              email: cData.email || "",
              className: cData.className || cData.department || "Classe non définie",
              department: cData.department || ""
            });
          }
        } catch (cErr) {
          console.warn(`Erreur récupération enfant ${childUid}:`, cErr.message);
        }
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userData.displayName,
        role: effectiveRole,
        department: user.department || userData.department || "",
        mustChangePassword: userData.mustChangePassword || false,
        twoFactorEnabled: userData.twoFactorEnabled || false,
        ...userData,
        children
      }
    });
  } catch (error) {
    console.error("Erreur /me :", error);
    return res.status(500).json({
      success: false,
      error: "Erreur interne lors de la récupération du profil."
    });
  }
}

export async function handleAcceptConsent(req, res) {
  const version = String(req.body?.version || '').slice(0, 30);
  if (!version) return res.status(400).json({ success: false, error: 'Version de consentement requise.' });
  await adminDb.collection('users').doc(req.user.uid).set({ consentVersion: version, consentAcceptedAt: new Date().toISOString() }, { merge: true });
  return res.json({ success: true });
}

/**
 * POST /api/auth/verify-2fa
 * Étape 2 : vérifier le code 2FA et finaliser la connexion
 */
export async function handleVerify2FA(req, res) {
  try {
    const { tempToken, token } = req.body;
    if (!tempToken || !token) {
      return res.status(400).json({ success: false, error: "Token temporaire et code requis." });
    }

    // Récupérer le token temporaire
    const tempDoc = await adminDb.collection("temp_tokens").doc(tempToken).get();
    if (!tempDoc.exists) {
      return res.status(401).json({ success: false, error: "Token temporaire invalide ou expiré." });
    }
    const tempData = tempDoc.data();
    const userId = tempData.userId;

    // Vérifier l'expiration
    if (new Date() > tempData.expiresAt.toDate()) {
      await adminDb.collection("temp_tokens").doc(tempToken).delete();
      return res.status(401).json({ success: false, error: "Token temporaire expiré." });
    }

    // Récupérer l'utilisateur
    const userDoc = await adminDb.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
    }
    const userData = userDoc.data();
    const secret = userData.twoFactorSecret;
    if (!secret) {
      return res.status(400).json({ success: false, error: "La 2FA n'est pas activée pour cet utilisateur." });
    }

    // Vérifier le code
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (!verified) {
      await logActivity(userId, 'login_2fa_failed', { token }, req);
      return res.status(401).json({ success: false, error: "Code 2FA invalide." });
    }

    // Supprimer le token temporaire
    await adminDb.collection("temp_tokens").doc(tempToken).delete();

    // Générer un token Firebase (ou retourner le token existant)
    // Reconnecter l'utilisateur avec le token Firebase
    const customToken = await adminAuth.createCustomToken(userId);
    await logActivity(userId, 'login', { email: userData.email }, req);

    return res.status(200).json({
      success: true,
      token: customToken,
      user: {
        uid: userId,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role
      }
    });
  } catch (error) {
    console.error("Erreur verification 2FA :", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
