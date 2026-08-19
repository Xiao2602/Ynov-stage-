import {
  loginService,
  resetPasswordService,
  logoutService
} from "./authService.js";

import {
  sendCustomPasswordResetEmail
} from "./customEmailService.js";

import {
  adminAuth
} from "../../Shared/Firebase config/firebase.js";


/**
 * POST /api/auth/login
 */
export async function handleLogin(req, res) {

  try {

    const {
      email,
      password
    } = req.body;


    if (!email || !password) {

      return res.status(400).json({
        success: false,
        error:
          "Veuillez fournir un email et un mot de passe."
      });

    }


    const result =
      await loginService(
        email,
        password
      );


    if (result.success) {

      return res.status(200).json(result);

    }


    return res.status(401).json(result);

  } catch (error) {

    console.error(
      "Erreur login :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erreur interne lors de la connexion."
    });

  }
}


/**
 * POST /api/auth/reset-password
 */
export async function handleResetPassword(
  req,
  res
) {

  try {

    const {
      email,
      smtpConfig
    } = req.body;


    if (!email) {

      return res.status(400).json({
        success: false,
        error:
          "Veuillez fournir une adresse email."
      });

    }


    const result =
      await sendCustomPasswordResetEmail(
        email,
        smtpConfig
      );


    if (result.success) {

      return res.status(200).json(result);

    }


    return res.status(400).json(result);

  } catch (error) {

    console.error(
      "Erreur reset password :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erreur lors de la réinitialisation."
    });

  }
}


/**
 * POST /api/auth/logout
 */
export async function handleLogout(
  req,
  res
) {

  const result =
    await logoutService();

  return res.status(200).json(result);
}


/**
 * POST /api/auth/change-password
 *
 * Cette route sera utilisée lorsque nous
 * finaliserons le changement de mot de passe.
 */
export async function handleChangePassword(
  req,
  res
) {

  try {

    const {
      newPassword
    } = req.body;


    if (!req.user) {

      return res.status(401).json({
        success: false,
        error:
          "Utilisateur non authentifié."
      });

    }


    if (!newPassword) {

      return res.status(400).json({
        success: false,
        error:
          "Veuillez fournir un nouveau mot de passe."
      });

    }


    if (newPassword.length < 8) {

      return res.status(400).json({
        success: false,
        error:
          "Le nouveau mot de passe doit contenir au moins 8 caractères."
      });

    }


    await adminAuth.updateUser(
      req.user.uid,
      {
        password: newPassword
      }
    );


    await adminAuth.setCustomUserClaims(
      req.user.uid,
      {
        ...req.user,
        role: req.user.role
      }
    );


    return res.status(200).json({
      success: true,
      message:
        "Mot de passe modifié avec succès."
    });

  } catch (error) {

    console.error(
      "Erreur changement mot de passe :",
      error
    );

    return res.status(400).json({
      success: false,
      error: error.message
    });

  }
}