import { adminAuth } from "../Firebase config/firebase.js";

/**
 * Middleware pour vérifier le jeton JWT Bearer dans Postman
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "Jeton de sécurité manquant ou invalide. (Bearer token requis)" });
  }

  const token = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, error: "Jeton non valide ou expiré: " + error.message });
  }
}

/**
 * Middleware de contrôle d'accès basé sur les rôles (RBAC)
 */
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: "Accès refusé. Vous n'avez pas les privilèges nécessaires." 
      });
    }
    next();
  };
}
