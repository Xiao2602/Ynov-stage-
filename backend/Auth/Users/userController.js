import {
  createUserService,
  getAllUsersService
} from "./userService.js";


/**
 * POST /api/users/create
 *
 * Création d'un utilisateur par Admin / RH.
 */
export async function handleCreateUser(req, res) {
  try {
    const {
      email,
      password,
      displayName,
      role,
      department
    } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({
        success: false,
        error:
          "Veuillez fournir un email, un mot de passe et un nom."
      });
    }

    const result = await createUserService({
      email,
      password,
      displayName,
      role,
      department
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(201).json(result);

  } catch (error) {
    console.error(
      "Erreur controller création utilisateur :",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Erreur interne lors de la création du compte."
    });
  }
}


/**
 * GET /api/users
 *
 * Récupération de tous les utilisateurs.
 */
export async function handleGetAllUsers(req, res) {
  try {
    const result = await getAllUsersService();

    if (!result.success) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error(
      "Erreur controller récupération utilisateurs :",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Impossible de récupérer les utilisateurs."
    });
  }
}