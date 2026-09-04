import {
  createDocumentRequestService,
  getMyDocumentRequestsService,
  getDocumentRequestByIdService,
  cancelDocumentRequestService,
  getDocumentRequestsQueueService,
  assignDocumentRequestService,
  approveDocumentRequestService,
  rejectDocumentRequestService,
  attachDocumentToRequestService
} from "./documentRequestService.js";

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
