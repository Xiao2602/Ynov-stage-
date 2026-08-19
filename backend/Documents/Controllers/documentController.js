import fs from "fs/promises";

import {
  uploadDocumentService,
  getMyDocumentsService,
  getDocumentService,
  deleteDocumentService,
  archiveDocumentService,
  unarchiveDocumentService
} from "../Services/documentService.js";

/*
|--------------------------------------------------------------------------
| UPLOAD
|--------------------------------------------------------------------------
*/

export async function handleUploadDocument(
  req,
  res
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error:
          "Aucun fichier n'a été envoyé."
      });
    }

    const result =
      await uploadDocumentService({
        user: req.user,
        file: req.file,
        body: req.body
      });

    if (!result.success) {
      return res.status(400).json(
        result
      );
    }

    return res.status(201).json(
      result
    );

  } catch (error) {
    console.error(
      "Erreur upload :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Erreur interne lors de l'envoi du document."
    });
  }
}

/*
|--------------------------------------------------------------------------
| MES DOCUMENTS
|--------------------------------------------------------------------------
*/

export async function handleGetMyDocuments(
  req,
  res
) {
  try {
    const result =
      await getMyDocumentsService(
        req.user.uid,
        {
          search:
            req.query.search,

          status:
            req.query.status,

          category:
            req.query.category,

          archived:
            req.query.archived,

          from:
            req.query.from,

          to:
            req.query.to
        }
      );

    return res.status(200).json(
      result
    );

  } catch (error) {
    console.error(
      "Erreur récupération documents :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Impossible de récupérer vos documents."
    });
  }
}

/*
|--------------------------------------------------------------------------
| INFORMATIONS DOCUMENT
|--------------------------------------------------------------------------
*/

export async function handleGetDocument(
  req,
  res
) {
  try {
    const result =
      await getDocumentService({
        documentId:
          req.params.id,
        user:
          req.user
      });

    if (!result.success) {
      return res.status(404).json(
        result
      );
    }

    /*
     * Ne pas retourner storagePath
     */

    const {
      storagePath,
      ...safeDocument
    } = result.document;

    return res.status(200).json({
      success: true,
      document:
        safeDocument
    });

  } catch (error) {
    console.error(
      "Erreur document :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Impossible de récupérer le document."
    });
  }
}

/*
|--------------------------------------------------------------------------
| CONSULTATION / TÉLÉCHARGEMENT
|--------------------------------------------------------------------------
*/

export async function handleViewDocument(
  req,
  res
) {
  try {
    const result =
      await getDocumentService({
        documentId:
          req.params.id,
        user:
          req.user
      });

    if (!result.success) {
      return res.status(404).json(
        result
      );
    }

    const document =
      result.document;

    if (!document.storagePath) {
      return res.status(404).json({
        success: false,
        error:
          "Fichier physique introuvable."
      });
    }

    /*
     * Vérification existence
     */

    try {
      await fs.access(
        document.storagePath
      );
    } catch {
      return res.status(404).json({
        success: false,
        error:
          "Fichier physique introuvable."
      });
    }

    /*
     * Headers de consultation
     */

    res.setHeader(
      "Content-Type",
      document.mimeType ||
        "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(
        document.originalName
      )}"`
    );

    /*
     * Cache désactivé pour les documents
     */

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    return res.sendFile(
      document.storagePath
    );

  } catch (error) {
    console.error(
      "Erreur consultation document :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Impossible de consulter le document."
    });
  }
}

/*
|--------------------------------------------------------------------------
| ARCHIVER
|--------------------------------------------------------------------------
*/

export async function handleArchiveDocument(
  req,
  res
) {
  try {
    const result =
      await archiveDocumentService({
        documentId:
          req.params.id,
        user:
          req.user
      });

    return res.status(
      result.success ? 200 : 400
    ).json(result);

  } catch (error) {
    console.error(
      "Erreur archivage :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Impossible d'archiver le document."
    });
  }
}

/*
|--------------------------------------------------------------------------
| DÉSARCHIVER
|--------------------------------------------------------------------------
*/

export async function handleUnarchiveDocument(
  req,
  res
) {
  try {
    const result =
      await unarchiveDocumentService({
        documentId:
          req.params.id,
        user:
          req.user
      });

    return res.status(
      result.success ? 200 : 400
    ).json(result);

  } catch (error) {
    console.error(
      "Erreur restauration :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Impossible de restaurer le document."
    });
  }
}

/*
|--------------------------------------------------------------------------
| SUPPRESSION
|--------------------------------------------------------------------------
*/

export async function handleDeleteDocument(
  req,
  res
) {
  try {
    const result =
      await deleteDocumentService({
        documentId:
          req.params.id,
        user:
          req.user
      });

    return res.status(
      result.success ? 200 : 400
    ).json(result);

  } catch (error) {
    console.error(
      "Erreur suppression :",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "Impossible de supprimer le document."
    });
  }
}