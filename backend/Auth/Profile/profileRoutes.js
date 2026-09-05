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

// Routes réservées aux administrateurs & RH
router.get("/requests", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), getPendingRequests);
router.post("/requests/:id/approve", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), approveRequest);
router.post("/requests/:id/reject", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), rejectRequest);
router.put("/admin/:uid", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), adminUpdateProfile);

export default router;
