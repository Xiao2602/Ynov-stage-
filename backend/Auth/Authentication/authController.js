import {
  loginService,
  logoutService
} from "./authService.js";


import {
  adminAuth,
  adminDb
} from "../../Shared/Firebase config/firebase.js";

import { logActivity } from "../../Services/activityLogService.js";
import { serializeUser } from "../../Shared/Serializers/userSerializer.js";

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
      const role = userData.role || userRecord.customClaims?.role;
      if (!role) return res.status(403).json({ success: false, error: 'Aucun rôle valide n’est attribué à ce compte.' });
      const isStudent = role === 'student';

      if (!isStudent) {
        const twoFactorEnabled = userData.twoFactorEnabled || false;

        if (twoFactorEnabled) {
          // Générer un ID temporaire
          const tempId = `temp_${Date.now()}_${userRecord.uid}`;
          
          // Stocker le secret temporairement
          await adminDb.collection("temp_2fa").doc(tempId).set({
            userId: userRecord.uid,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            attempts: 0
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
    if (!userDoc.exists) return res.status(403).json({ success: false, error: 'Profil utilisateur introuvable.' });
    const userData = userDoc.data();
    const effectiveRole = user.role || userData.role;
    if (!effectiveRole) return res.status(403).json({ success: false, error: 'Aucun rôle valide n’est attribué à ce compte.' });

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

    const today = new Date().toISOString().slice(0, 10);
    const supervisionSnapshot = await adminDb.collection('temporarySupervisions').where('supervisorUid', '==', user.uid).get();
    const activeTemporaryClasses = supervisionSnapshot.docs.map((doc) => doc.data())
      .filter((item) => item.active !== false && item.startDate <= today && item.endDate >= today)
      .map((item) => item.className);

    return res.status(200).json({
      success: true,
      user: { ...serializeUser({ ...userData, uid: user.uid, email: user.email, displayName: user.displayName || userData.displayName, role: effectiveRole, department: user.department || userData.department || "" }, user.uid), activeTemporaryClasses, children }
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
  const userRef = adminDb.collection('users').doc(req.user.uid);
  if (!(await userRef.get()).exists) return res.status(403).json({ success: false, error: 'Profil utilisateur introuvable.' });
  await userRef.update({ consentVersion: version, consentAcceptedAt: new Date().toISOString() });
  return res.json({ success: true });
}
