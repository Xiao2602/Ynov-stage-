import { Router } from "express";
import {
  authenticateToken,
  authorizeRoles
} from "../../Shared/Authentication middleware/authMiddleware.js";
import { ROLES } from "../../Shared/Roles/roles.js";
import {
  handleCreateDocumentRequest,
  handleGetMyDocumentRequests,
  handleGetDocumentRequestsQueue,
  handleGetDocumentRequestById,
  handleCancelDocumentRequest,
  handleAssignDocumentRequest,
  handleApproveDocumentRequest,
  handleRejectDocumentRequest,
  handleAttachDocument,
  handleTransferGeneratedDocument,
  handleDeleteDocumentRequest,
  handleArchiveDocumentRequest,
  handleUnarchiveDocumentRequest,
  handleDownloadDocumentRequestPdf
} from "./documentRequestController.js";

const router = Router();

// Toutes les routes nécessitent l'authentification
router.use(authenticateToken);

/*
|--------------------------------------------------------------------------
| ROUTES ÉTUDIANT / DEMANDEUR / PARENT
|--------------------------------------------------------------------------
*/

// POST /api/document-requests - Créer une demande
router.post("/", handleCreateDocumentRequest);

// GET /api/document-requests/my - Lister ses demandes
router.get("/my", handleGetMyDocumentRequests);

// GET /api/document-requests/queue - File d'attente administrative (Admin / RH / Manager / Employé)
router.get(
  "/queue",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleGetDocumentRequestsQueue
);

// GET /api/document-requests/:id - Consulter le détail d'une demande
router.get("/:id", handleGetDocumentRequestById);

// GET /api/document-requests/:id/pdf - Télécharger le document en PDF
router.get("/:id/pdf", handleDownloadDocumentRequestPdf);

// PATCH /api/document-requests/:id/cancel - Annuler une demande
router.patch("/:id/cancel", handleCancelDocumentRequest);

/*
|--------------------------------------------------------------------------
| ROUTES GESTION ADMINISTRATIVE (ADMIN / RH / MANAGER / EMPLOYÉ)
|--------------------------------------------------------------------------
*/

// PATCH /api/document-requests/:id/assign - Affecter une demande
router.patch(
  "/:id/assign",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleAssignDocumentRequest
);

// PATCH /api/document-requests/:id/approve - Approuver une demande
router.patch(
  "/:id/approve",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleApproveDocumentRequest
);

// PATCH /api/document-requests/:id/reject - Refuser une demande
router.patch(
  "/:id/reject",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleRejectDocumentRequest
);

// PATCH /api/document-requests/:id/attach-document - Associer un document
router.patch(
  "/:id/attach-document",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleAttachDocument
);

router.patch(
  "/:id/transfer",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleTransferGeneratedDocument
);

router.delete(
  "/:id",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleDeleteDocumentRequest
);

// PATCH /api/document-requests/:id/archive - Archiver une demande (propriétaire ou staff)
router.patch(
  "/:id/archive",
  handleArchiveDocumentRequest
);

// PATCH /api/document-requests/:id/unarchive - Restaurer / désarchiver une demande
router.patch(
  "/:id/unarchive",
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.EMPLOYEE),
  handleUnarchiveDocumentRequest
);

export default router;
