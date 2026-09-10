import {
  createDocumentRequestService,
  getMyDocumentRequestsService,
  getDocumentRequestByIdService,
  cancelDocumentRequestService,
  getDocumentRequestsQueueService,
  assignDocumentRequestService,
  approveDocumentRequestService,
  rejectDocumentRequestService,
  attachDocumentToRequestService,
  transferGeneratedDocumentService,
  deleteDocumentRequestService,
  archiveDocumentRequestService,
  unarchiveDocumentRequestService
} from "./documentRequestService.js";
import { generateOfficialDocumentPdf } from "./documentPdfService.js";

/**
 * POST /api/document-requests
 * Créer une demande
 */
export async function handleCreateDocumentRequest(req, res) {
  try {
    const result = await createDocumentRequestService({
      user: req.user,
      body: req.body
    });
    return res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleCreateDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la création de la demande." });
  }
}

/**
 * GET /api/document-requests/my
 * Lister ses demandes
 */
export async function handleGetMyDocumentRequests(req, res) {
  try {
    const filters = {
      status: req.query.status,
      type: req.query.type,
      search: req.query.search,
      from: req.query.from,
      to: req.query.to,
      studentUid: req.query.studentUid,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await getMyDocumentRequestsService(req.user.uid, filters, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleGetMyDocumentRequests :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération des demandes." });
  }
}

/**
 * GET /api/document-requests/queue
 * Consulter la file administrative
 */
export async function handleGetDocumentRequestsQueue(req, res) {
  try {
    const filters = {
      status: req.query.status,
      assignedTo: req.query.assignedTo,
      type: req.query.type,
      search: req.query.search,
      department: req.query.department,
      className: req.query.className,
      from: req.query.from,
      to: req.query.to,
      archived: req.query.archived,
      page: req.query.page,
      limit: req.query.limit
    };

    const result = await getDocumentRequestsQueueService(filters, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleGetDocumentRequestsQueue :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la consultation de la file d'attente." });
  }
}

/**
 * GET /api/document-requests/:id
 * Consulter le détail d'une demande
 */
export async function handleGetDocumentRequestById(req, res) {
  try {
    const result = await getDocumentRequestByIdService(req.params.id, req.user);
    if (!result.success) {
      const statusCode = result.error?.includes("refusé") ? 403 : 404;
      return res.status(statusCode).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("Erreur handleGetDocumentRequestById :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la récupération de la demande." });
  }
}

/**
 * PATCH /api/document-requests/:id/cancel
 * Annuler une demande
 */
export async function handleCancelDocumentRequest(req, res) {
  try {
    const result = await cancelDocumentRequestService(req.params.id, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleCancelDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'annulation de la demande." });
  }
}

/**
 * PATCH /api/document-requests/:id/assign
 * Affecter une demande
 */
export async function handleAssignDocumentRequest(req, res) {
  try {
    const result = await assignDocumentRequestService(req.params.id, req.body, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleAssignDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'affectation de la demande." });
  }
}

/**
 * PATCH /api/document-requests/:id/approve
 * Approuver une demande
 */
export async function handleApproveDocumentRequest(req, res) {
  try {
    const result = await approveDocumentRequestService(req.params.id, req.body, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleApproveDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'approbation de la demande." });
  }
}

/**
 * PATCH /api/document-requests/:id/reject
 * Refuser une demande avec motif
 */
export async function handleRejectDocumentRequest(req, res) {
  try {
    const result = await rejectDocumentRequestService(req.params.id, req.body, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleRejectDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors du refus de la demande." });
  }
}

/**
 * PATCH /api/document-requests/:id/attach-document
 * Associer un document
 */
export async function handleAttachDocument(req, res) {
  try {
    const result = await attachDocumentToRequestService(req.params.id, req.body, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleAttachDocument :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'association du document." });
  }
}

export async function handleTransferGeneratedDocument(req, res) {
  try {
    const result = await transferGeneratedDocumentService(req.params.id, req.body || {}, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Erreur handleTransferGeneratedDocument :', error);
    return res.status(500).json({ success: false, error: 'Erreur lors du transfert du document.' });
  }
}

export async function handleDeleteDocumentRequest(req, res) {
  try {
    const result = await deleteDocumentRequestService(req.params.id, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error('Erreur handleDeleteDocumentRequest :', error);
    return res.status(500).json({ success: false, error: 'Erreur lors de la suppression du document.' });
  }
}

/**
 * PATCH /api/document-requests/:id/archive
 * Archiver manuellement une demande de document
 */
export async function handleArchiveDocumentRequest(req, res) {
  try {
    const result = await archiveDocumentRequestService(req.params.id, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleArchiveDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de l'archivage de la demande." });
  }
}

/**
 * PATCH /api/document-requests/:id/unarchive
 * Désarchiver / restaurer une demande de document
 */
export async function handleUnarchiveDocumentRequest(req, res) {
  try {
    const result = await unarchiveDocumentRequestService(req.params.id, req.user);
    return res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    console.error("Erreur handleUnarchiveDocumentRequest :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors du désarchivage de la demande." });
  }
}

/**
 * GET /api/document-requests/:id/pdf
 * Télécharger le document officiel généré au format PDF natif
 */
export async function handleDownloadDocumentRequestPdf(req, res) {
  try {
    const result = await getDocumentRequestByIdService(req.params.id, req.user);
    if (!result.success) {
      const statusCode = result.error?.includes("refusé") ? 403 : 404;
      return res.status(statusCode).json(result);
    }

    const item = result.data;
    const isStaff = ["admin", "rh", "manager", "employee"].includes(req.user?.role);
    if (!isStaff && !item.transferredAt) {
      return res.status(403).json({
        success: false,
        error: "Ce document n'est pas encore transféré au demandeur."
      });
    }
    const pdfBuffer = await generateOfficialDocumentPdf(item);

    const docType = (item.type || item.documentType || "Document").replace(/\s+/g, "_");
    const filename = `${docType}_${item.id}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    console.error("Erreur handleDownloadDocumentRequestPdf :", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la génération du PDF." });
  }
}
