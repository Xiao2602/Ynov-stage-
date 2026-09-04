import { assignUserRoleService } from "./roleService.js";

/**
 * Controller pour assigner ou modifier un rôle.
 *
 * POST /api/roles/assign
 */
export async function handleAssignRole(req, res) {
  try {
    const { uid, role } = req.body;

    // --------------------------------------------------
    // Validation des paramètres
    // --------------------------------------------------

    if (!uid || !role) {
      return res.status(400).json({
        success: false,
        error: "Veuillez fournir l'UID de l'utilisateur et le rôle."
      });
    }

    // --------------------------------------------------
    // Appel du service
    // --------------------------------------------------

    const result = await assignUserRoleService(uid, role);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("Erreur controller attribution rôle :", error);

    return res.status(500).json({
      success: false,
      error: "Erreur interne du serveur."
    });
  }
}