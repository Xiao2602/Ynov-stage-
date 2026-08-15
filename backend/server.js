import "dotenv/config";

import express from "express";
import cors from "cors";

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

import {
  handleLogin,
  handleResetPassword,
  handleLogout
} from "./Auth/Authentication/authController.js";

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

import {
  handleCreateUser,
  handleGetAllUsers
} from "./Auth/Users/userController.js";

/*
|--------------------------------------------------------------------------
| ROLES
|--------------------------------------------------------------------------
*/

import {
  handleAssignRole
} from "./Auth/Roles & Permissions/roleController.js";

/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
|--------------------------------------------------------------------------
*/

import {
  authenticateToken,
  authorizeRoles
} from "./Shared/Authentication middleware/authMiddleware.js";

import {
  ROLES
} from "./Shared/Roles/roles.js";

/*
|--------------------------------------------------------------------------
| DOCUMENTS
|--------------------------------------------------------------------------
*/

import documentRoutes
  from "./Documents/documentRoutes.js";

/*
|--------------------------------------------------------------------------
| APPLICATION
|--------------------------------------------------------------------------
*/

const app =
  express();

/*
|--------------------------------------------------------------------------
| GLOBAL MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(
  cors()
);

app.use(
  express.json()
);

/*
|--------------------------------------------------------------------------
| AUTH PUBLIC
|--------------------------------------------------------------------------
*/

app.post(
  "/api/auth/login",
  handleLogin
);

app.post(
  "/api/auth/reset-password",
  handleResetPassword
);

app.post(
  "/api/auth/logout",
  handleLogout
);

/*
|--------------------------------------------------------------------------
| AUTH CURRENT USER
|--------------------------------------------------------------------------
*/

app.get(
  "/api/auth/me",

  authenticateToken,

  (req, res) => {

    res.status(200).json({
      success: true,

      user: {
        uid:
          req.user.uid,

        email:
          req.user.email ||
          null,

        emailVerified:
          req.user.email_verified ||
          false,

        role:
          req.user.role ||
          null
      }
    });
  }
);

/*
|--------------------------------------------------------------------------
| USERS
|--------------------------------------------------------------------------
*/

app.get(
  "/api/users",

  authenticateToken,

  handleGetAllUsers
);

app.post(
  "/api/users/create",

  authenticateToken,

  authorizeRoles(
    ROLES.ADMIN,
    ROLES.RH
  ),

  handleCreateUser
);

/*
|--------------------------------------------------------------------------
| ROLES
|--------------------------------------------------------------------------
*/

app.post(
  "/api/roles/assign",

  authenticateToken,

  authorizeRoles(
    ROLES.ADMIN
  ),

  handleAssignRole
);

/*
|--------------------------------------------------------------------------
| DOCUMENTS
|--------------------------------------------------------------------------
|
| Toutes les routes :
|
| /api/documents/upload
| /api/documents/my
| /api/documents/:id
|
|--------------------------------------------------------------------------
*/

app.use(
  "/api/documents",
  documentRoutes
);

/*
|--------------------------------------------------------------------------
| HEALTH
|--------------------------------------------------------------------------
*/

app.get(
  "/api/health",

  (req, res) => {

    res.status(200).json({
      success: true,

      message:
        "API Backend Gestion des Absences opérationnelle."
    });
  }
);

/*
|--------------------------------------------------------------------------
| 404
|--------------------------------------------------------------------------
*/

app.use(
  (req, res) => {

    res.status(404).json({
      success: false,

      error:
        `Route ${req.method} ${req.originalUrl} introuvable.`
    });
  }
);

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use(
  (error, req, res, next) => {

    console.error(
      "Erreur Express :",
      error
    );

    if (
      error.code ===
      "LIMIT_FILE_SIZE"
    ) {

      return res.status(400).json({
        success: false,
        error:
          "Fichier trop volumineux. Taille maximale : 5 Mo."
      });
    }

    if (
      error instanceof
      Error
    ) {

      return res.status(400).json({
        success: false,
        error:
          error.message
      });
    }

    return res.status(500).json({
      success: false,
      error:
        "Erreur interne du serveur."
    });
  }
);

/*
|--------------------------------------------------------------------------
| SERVER
|--------------------------------------------------------------------------
*/

const PORT =
  process.env.PORT ||
  5000;

app.listen(
  PORT,

  () => {

    console.log(
      `🚀 Serveur API REST démarré sur http://localhost:${PORT}`
    );

    console.log(
      "📁 Stockage des documents : stockage local"
    );

    console.log(
      "🔥 Firestore : Firebase réel"
    );
  }
);