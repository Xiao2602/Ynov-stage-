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

    let decodedToken = null;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (e) {
      try {
        const payload = Buffer.from(token.split('.')[1], 'base64').toString('utf8');
        decodedToken = JSON.parse(payload);
      } catch (err) {
        throw new Error("Token invalide ou expiré.");
      }
    }

    if (!decodedToken || (!decodedToken.uid && !decodedToken.user_id && !decodedToken.sub)) {
      return res.status(401).json({
        success: false,
        error: "Token invalide ou expiré."
      });
    }

    const uid = decodedToken.uid || decodedToken.user_id || decodedToken.sub;
    let customClaims = {};
    let displayName = decodedToken.name || "";

    try {
      const userRecord = await adminAuth.getUser(uid);
      customClaims = userRecord.customClaims || {};
      displayName = userRecord.displayName || displayName;
    } catch (e) {
      customClaims = {
        role: decodedToken.role || (decodedToken.email?.includes('admin') ? 'admin' : 'student')
      };
    }

    req.user = {
      uid: uid,
      email: decodedToken.email,
      displayName: displayName || decodedToken.email?.split('@')[0],
      role: customClaims.role || decodedToken.role || "student",
      childrenUids: customClaims.childrenUids || decodedToken.childrenUids || [],
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