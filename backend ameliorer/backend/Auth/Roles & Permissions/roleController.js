import { assignUserRoleService } from "./roleService.js";

/**
 * Controller pour assigner un rôle (POST /api/roles/assign)
 */
export async function handleAssignRole(req, res) {
  const { uid, role } = req.body;

  if (!uid || !role) {
    return res.status(400).json({ success: false, error: "Veuillez fournir l'UID de l’utilisateur et le rôle." });
  }

  const result = await assignUserRoleService(uid, role);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}
