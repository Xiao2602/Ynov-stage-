import { 
  createUserService, 
  getAllUsersService,
  linkParentToStudentService,
  getLinkedChildrenService
} from "./userService.js";

/**
 * Controller pour créer un utilisateur (POST /api/users/create)
 */
export async function handleCreateUser(req, res) {
  const { email, password, displayName, role, department, childrenUids } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ 
      success: false, 
      error: "Veuillez fournir au minimum un email, un mot de passe et un nom (displayName)." 
    });
  }

  const result = await createUserService({ email, password, displayName, role, department, childrenUids });
  if (result.success) {
    return res.status(201).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour lier un compte Parent à un Étudiant (POST /api/users/link-parent-student)
 */
export async function handleLinkParentStudent(req, res) {
  const { parentUid, studentUid } = req.body;

  if (!parentUid || !studentUid) {
    return res.status(400).json({ success: false, error: "Veuillez fournir parentUid et studentUid." });
  }

  const result = await linkParentToStudentService(parentUid, studentUid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour obtenir les enfants d'un Parent (GET /api/users/my-children)
 */
export async function handleGetLinkedChildren(req, res) {
  const result = await getLinkedChildrenService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour obtenir tous les utilisateurs (GET /api/users)
 */
export async function handleGetAllUsers(req, res) {
  const result = await getAllUsersService();
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}
