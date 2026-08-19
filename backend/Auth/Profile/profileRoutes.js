import express from "express";
import {
  requestProfileUpdate,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  adminUpdateProfile
} from "./profileController.js";
import { authenticateToken, authorizeRoles } from "../../Shared/Authentication middleware/authMiddleware.js";
import { ROLES } from "../../Shared/Roles/roles.js";

const router = express.Router();

// Routes accessibles à tous les utilisateurs connectés
router.post("/request", authenticateToken, requestProfileUpdate);

// Routes réservées aux administrateurs
router.get("/requests", authenticateToken, authorizeRoles(ROLES.ADMIN), getPendingRequests);
router.post("/requests/:id/approve", authenticateToken, authorizeRoles(ROLES.ADMIN), approveRequest);
router.post("/requests/:id/reject", authenticateToken, authorizeRoles(ROLES.ADMIN), rejectRequest);
router.put("/admin/:uid", authenticateToken, authorizeRoles(ROLES.ADMIN), adminUpdateProfile);

export default router;
