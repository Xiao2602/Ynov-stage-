import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { adminDb } from "./firebaseAdmin.js";
import { getActivityLogs } from "./Services/activityLogService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// IMPORTS AUTHENTIFICATION
// ============================================================

import {
  handleLogin,
  handleResetPassword,
  handleLogout,
  handleGetMe,
  handleVerify2FA,
  handleAcceptDataTerms
} from "./Auth/Authentication/authController.js";

// ============================================================
// IMPORTS 2FA
// ============================================================

import {
  handleTwoFactorSetup,
  handleTwoFactorEnable,
  handleTwoFactorDisable,
  handleTwoFactorVerifyLogin
} from "./Auth/Authentication/twoFactorController.js";

// ============================================================
// IMPORTS UTILISATEURS
// ============================================================

import {
  handleCreateUser,
  handleGetAllUsers,
  handleLinkParentStudent,
  handleGetLinkedChildren,
  handleGetMyStudents,
  handleGetMyCourses,
  handleAssignTeacherClass,
  handleSuspendUser,
  handleDeleteUser,
  handleUpdateUser,
  handleGetUser
} from "./Auth/Users/userController.js";

// ============================================================
// IMPORTS ROLES
// ============================================================

import {
  handleAssignRole
} from "./Auth/Roles & Permissions/roleController.js";

// ============================================================
// IMPORTS ABSENCES
// ============================================================

import {
  handleSubmitAbsence,
  handleGetMyAbsences,
  handleGetChildrenAbsences,
  handleGetPendingAbsences,
  handleGetAllAbsences,
  handleReviewAbsence,
  handleDeleteAbsence,
  handleGetStatistics,
  handleExportExcel,
  handleExportPdf,
  handleTeacherDeclareAbsence,
  handleJustifyAbsence,
  handleGetAbsencesByCourse,
  handleArchiveAbsences,
  handleGetArchivedAbsences
} from "./Absence/Controllers/absenceController.js";

// ============================================================
// IMPORT DOCUMENTS
// ============================================================

import {
  handleUploadDocument
} from "./Documents/Controllers/documentController.js";

// ============================================================
// IMPORT NOTIFICATIONS
// ============================================================

import {
  handleGetMyNotifications,
  handleMarkNotificationAsRead,
  handleMarkAllAsRead,
  handleDeleteNotification,
  handleDeleteReadNotifications
} from "./Notifications/Controllers/notificationController.js";

// ============================================================
// IMPORT MIDDLEWARE
// ============================================================

import {
  authenticateToken,
  authorizeRoles
} from "./Shared/Authentication middleware/authMiddleware.js";

import { ROLES } from "./Shared/Roles/roles.js";

// ============================================================
// CONFIGURATION MULTER
// ============================================================

const upload = multer({
  storage: multer.memoryStorage()
});

// ============================================================
// APPLICATION EXPRESS
// ============================================================

const app = express();

// CORS
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
}));
app.options('*', cors());

app.use(express.json());
app.use("/uploads", express.static(join(__dirname, "uploads")));

// ============================================================
// AUTHENTIFICATION
// ============================================================

app.post("/api/auth/login", handleLogin);
app.post("/api/auth/reset-password", handleResetPassword);
app.post("/api/auth/logout", handleLogout);
app.get("/api/auth/me", authenticateToken, handleGetMe);
app.post("/api/auth/accept-data-terms", authenticateToken, handleAcceptDataTerms);

// 🔥 2FA Routes
app.get("/api/auth/2fa/setup", authenticateToken, handleTwoFactorSetup);
app.post("/api/auth/2fa/enable", authenticateToken, handleTwoFactorEnable);
app.post("/api/auth/2fa/disable", authenticateToken, handleTwoFactorDisable);
app.post("/api/auth/verify-2fa", handleVerify2FA);
app.post("/api/auth/2fa/verify-login", handleTwoFactorVerifyLogin);

// ============================================================
// UTILISATEURS
// ============================================================

app.get("/api/users", authenticateToken, handleGetAllUsers);

app.post(
  "/api/users/create",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleCreateUser
);

app.post(
  "/api/users/link-parent-student",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleLinkParentStudent
);

app.get(
  "/api/users/my-children",
  authenticateToken,
  authorizeRoles(ROLES.PARENT, ROLES.ADMIN, ROLES.RH),
  handleGetLinkedChildren
);

// --- Routes professeur ---
app.get(
  "/api/users/my-students",
  authenticateToken,
  authorizeRoles(ROLES.TEACHER),
  handleGetMyStudents
);

app.get(
  "/api/users/my-courses",
  authenticateToken,
  authorizeRoles(ROLES.TEACHER),
  handleGetMyCourses
);

// --- Routes admin pour gestion complète des utilisateurs ---
app.get(
  "/api/users/:uid",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleGetUser
);

app.patch(
  "/api/users/:uid",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleUpdateUser
);

app.patch(
  "/api/users/:uid/suspend",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleSuspendUser
);

app.delete(
  "/api/users/:uid",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  handleDeleteUser
);

// --- Assignation de classes à un professeur (admin) ---
app.post(
  "/api/users/assign-teacher",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleAssignTeacherClass
);

// ============================================================
// ROLES
// ============================================================

app.post(
  "/api/roles/assign",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  handleAssignRole
);

// ============================================================
// ABSENCES
// ============================================================

app.post("/api/absences", authenticateToken, handleSubmitAbsence);
app.get("/api/absences/my", authenticateToken, handleGetMyAbsences);
app.get(
  "/api/absences/children",
  authenticateToken,
  authorizeRoles(ROLES.PARENT, ROLES.ADMIN, ROLES.RH),
  handleGetChildrenAbsences
);
app.get(
  "/api/absences/pending",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER),
  handleGetPendingAbsences
);
app.get(
  "/api/absences",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.TEACHER),
  handleGetAllAbsences
);
app.patch(
  "/api/absences/:id/review",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER),
  handleReviewAbsence
);
app.delete("/api/absences/:id", authenticateToken, handleDeleteAbsence);

// --- Professeur déclare une absence pour un étudiant ---
app.post(
  "/api/absences/teacher/declare",
  authenticateToken,
  authorizeRoles(ROLES.TEACHER),
  handleTeacherDeclareAbsence
);

// --- Professeur consulte les absences par classe/cours ---
app.get(
  "/api/absences/by-course",
  authenticateToken,
  authorizeRoles(ROLES.TEACHER),
  handleGetAbsencesByCourse
);

// --- Étudiant justifie une absence ---
app.post(
  "/api/absences/:id/justify",
  authenticateToken,
  handleJustifyAbsence
);

// --- Archivage (admin) ---
app.post(
  "/api/absences/archive",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  handleArchiveAbsences
);

app.get(
  "/api/absences/archived",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleGetArchivedAbsences
);

// ============================================================
// STATISTIQUES
// ============================================================

app.get(
  "/api/absences/statistics",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleGetStatistics
);

// ============================================================
// EXPORTS
// ============================================================

app.get(
  "/api/absences/export/excel",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleExportExcel
);

app.get(
  "/api/absences/export/pdf",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.RH),
  handleExportPdf
);

// ============================================================
// DOCUMENTS
// ============================================================

app.post(
  "/api/documents/upload",
  authenticateToken,
  upload.single("file"),
  handleUploadDocument
);

// ============================================================
// NOTIFICATIONS
// ============================================================

app.get("/api/notifications/my", authenticateToken, handleGetMyNotifications);
app.patch("/api/notifications/:id/read", authenticateToken, handleMarkNotificationAsRead);
app.post("/api/notifications/read-all", authenticateToken, handleMarkAllAsRead);
app.delete("/api/notifications/:id", authenticateToken, handleDeleteNotification);
app.delete("/api/notifications/read", authenticateToken, handleDeleteReadNotifications);

// ============================================================
// ACTIVITY LOGS (admin seulement)
// ============================================================

app.get(
  "/api/activity-logs",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  async (req, res) => {
    try {
      const { userId, action, startDate, endDate, limit } = req.query;
      const result = await getActivityLogs({ userId, action, startDate, endDate, limit: parseInt(limit) || 500 });
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error("Erreur route activity-logs:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "API opérationnelle." });
});

// ============================================================
// 404 & GESTION DES ERREURS
// ============================================================

app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.originalUrl} introuvable.` });
});

app.use((err, req, res, next) => {
  console.error("Erreur Express :", err);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, error: "Fichier trop volumineux (max 5 Mo)." });
  }
  return res.status(500).json({ success: false, error: err.message || "Erreur interne." });
});

// ============================================================
// DÉMARRAGE
// ============================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur API REST démarré sur http://localhost:${PORT}`);
});