import express from "express";
import multer from "multer";

import {
  handleUploadDocument,
  handleGetMyDocuments,
  handleGetDocument,
  handleViewDocument,
  handleDeleteDocument,
  handleArchiveDocument,
  handleUnarchiveDocument
} from "./Controllers/documentController.js";

import {
  authenticateToken
} from "../Shared/Authentication middleware/authMiddleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| MULTER
|--------------------------------------------------------------------------
*/

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        5 * 1024 * 1024
    },

    fileFilter: (
      req,
      file,
      cb
    ) => {
      const allowed = [
        "application/pdf",
        "image/jpeg"
      ];

      if (
        !allowed.includes(
          file.mimetype
        )
      ) {
        return cb(
          new Error(
            "Format déclaré non autorisé. Formats acceptés : PDF, JPG et JPEG."
          )
        );
      }

      cb(null, true);
    }
  });

/*
|--------------------------------------------------------------------------
| UPLOAD
|--------------------------------------------------------------------------
*/

router.post(
  "/upload",
  authenticateToken,
  upload.single("document"),
  handleUploadDocument
);

/*
|--------------------------------------------------------------------------
| MES DOCUMENTS
|--------------------------------------------------------------------------
*/

router.get(
  "/my",
  authenticateToken,
  handleGetMyDocuments
);

/*
|--------------------------------------------------------------------------
| CONSULTATION
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/view",
  authenticateToken,
  handleViewDocument
);

/*
|--------------------------------------------------------------------------
| INFORMATIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  authenticateToken,
  handleGetDocument
);

/*
|--------------------------------------------------------------------------
| ARCHIVAGE
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/archive",
  authenticateToken,
  handleArchiveDocument
);

/*
|--------------------------------------------------------------------------
| RESTAURATION
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/unarchive",
  authenticateToken,
  handleUnarchiveDocument
);

/*
|--------------------------------------------------------------------------
| SUPPRESSION
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticateToken,
  handleDeleteDocument
);

/*
|--------------------------------------------------------------------------
| GESTION ERREURS MULTER
|--------------------------------------------------------------------------
*/

router.use(
  (error, req, res, next) => {
    if (
      error instanceof multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Fichier trop volumineux. Maximum : 5 Mo."
        });
      }

      return res.status(400).json({
        success: false,
        error:
          error.message
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        error:
          error.message
      });
    }

    next();
  }
);

export default router;