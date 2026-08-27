import { adminAuth } from "../Firebase config/firebase.js";

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

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      displayName: decodedToken.name || userRecord.displayName,
      role: customClaims.role || "employee",
      ...customClaims
    };

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
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Accès refusé. Rôle requis : ${allowedRoles.join(", ")}.`
      });
    }

    next();
  };
}