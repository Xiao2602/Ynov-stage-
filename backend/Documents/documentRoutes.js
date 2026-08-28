import express from "express";
import multer from "multer";

import {
  handleUploadDocument,
  handleGetMyDocuments,
  handleGetDocument,
  handleViewDocument,
  handleDownloadDocument,
  handleDeleteDocument,
  handleArchiveDocument,
  handleUnarchiveDocument
} from "./Controllers/documentController.js";

import {
  authenticateToken
} from "../Shared/Authentication middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| MULTER CONFIGURATION (Mémoire, max 5 Mo)
|--------------------------------------------------------------------------
*/

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Mo
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png"
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error("Format déclaré non autorisé. Formats acceptés : PDF, JPG, JPEG et PNG.")
      );
    }

    cb(null, true);
  }
});

/*
|--------------------------------------------------------------------------
| UPLOAD (Accepte "document" ou "file")
|--------------------------------------------------------------------------
*/

router.post(
  "/upload",
  authenticateToken,
  (req, res, next) => {
    upload.fields([
      { name: "document", maxCount: 1 },
      { name: "file", maxCount: 1 }
    ])(req, res, (err) => {
      if (err) return next(err);
      if (!req.file && req.files) {
        req.file = req.files.document?.[0] || req.files.file?.[0] || Object.values(req.files)[0]?.[0];
      }
      next();
    });
  },
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
| CONSULTATION (INLINE STREAM)
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/view",
  authenticateToken,
  handleViewDocument
);

/*
|--------------------------------------------------------------------------
| TÉLÉCHARGEMENT (ATTACHMENT STREAM)
|--------------------------------------------------------------------------
*/

router.get(
  "/:id/download",
  authenticateToken,
  handleDownloadDocument
);

/*
|--------------------------------------------------------------------------
| INFORMATIONS DU DOCUMENT
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
| DÉSARCHIVAGE / RESTAURATION
|--------------------------------------------------------------------------
*/

router.patch(
  "/:id/unarchive",
  authenticateToken,
  handleUnarchiveDocument
);

/*
|--------------------------------------------------------------------------
| SUPPRESSION DÉFINITIVE
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  authenticateToken,
  handleDeleteDocument
);

/*
|--------------------------------------------------------------------------
| GESTIONNAIRE D'ERREURS MULTER
|--------------------------------------------------------------------------
*/

router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "Fichier trop volumineux. La taille maximale autorisée est de 5 Mo."
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next();
});

export default router;