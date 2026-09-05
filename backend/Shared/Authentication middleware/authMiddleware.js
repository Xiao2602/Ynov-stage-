import { adminAuth, adminDb } from "../Firebase config/firebase.js";

export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Token d'authentification manquant ou mal formé."
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Token d'authentification manquant."
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        error: "Token invalide ou expiré."
      });
    }

    const userRecord = await adminAuth.getUser(decodedToken.uid);
    const customClaims = userRecord.customClaims || {};
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    // Une session Firebase créée après le mot de passe ne suffit pas pour un
    // compte protégé par 2FA. La validation doit appartenir à cette connexion.
    if (userData.twoFactorEnabled) {
      const verifiedAt = userData.twoFactorVerifiedAt?.toDate?.() || new Date(userData.twoFactorVerifiedAt || 0);
      const authenticatedAt = new Date((decodedToken.auth_time || 0) * 1000);
      if (!verifiedAt || Number.isNaN(verifiedAt.getTime()) || verifiedAt < authenticatedAt) {
        return res.status(403).json({
          success: false,
          code: "TWO_FACTOR_REQUIRED",
          error: "Validation 2FA requise pour cette session."
        });
      }
    }

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || userRecord.displayName,
      role: customClaims.role || userData.role || "employee",
      ...customClaims
    };

    // Ce contrôle est côté serveur : un appel API direct ne peut pas contourner
    // l'acceptation des conditions lors de la première connexion.
    const consentFreePaths = new Set(['/api/auth/me', '/api/auth/consent', '/api/auth/change-password']);
    const requestPath = (req.originalUrl || req.path || '').split('?')[0];
    if (!userData.consentVersion && !consentFreePaths.has(requestPath)) {
      return res.status(403).json({ success: false, code: 'CONSENT_REQUIRED', error: 'Acceptation des conditions requise.' });
    }

    next();
  } catch (error) {
    console.error("Erreur d'authentification :", error.message);
    return res.status(401).json({
      success: false,
      error: "Authentification échouée : " + error.message
    });
  }
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Utilisateur non authentifié."
      });
    }

    const userRole = req.user.role;
    if (!allowedRoles.includes(userRole) && userRole !== "super_admin") {
      return res.status(403).json({
        success: false,
        error: `Accès refusé. Rôle requis : ${allowedRoles.join(", ")}.`
      });
    }

    next();
  };
}
