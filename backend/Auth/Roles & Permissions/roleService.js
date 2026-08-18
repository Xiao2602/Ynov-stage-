import { adminAuth } from "../../Shared/Firebase config/firebase.js";

/**
 * Attribuer ou modifier le rôle d'un utilisateur
 */
export async function assignUserRoleService(uid, role) {
  try {
    await adminAuth.setCustomUserClaims(uid, { role });
    return { success: true, message: `Rôle '${role}' attribué à l'utilisateur ${uid} avec succès.` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
