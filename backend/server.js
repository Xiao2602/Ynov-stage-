import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import Auth & User Controllers
import { handleLogin, handleResetPassword, handleLogout } from "./Auth/Authentication/authController.js";
import { 
  handleCreateUser, 
  handleGetAllUsers, 
  handleLinkParentStudent, 
  handleGetLinkedChildren 
} from "./Auth/Users/userController.js";
import { handleAssignRole } from "./Auth/Roles & Permissions/roleController.js";

// Import Absence Controllers
import { 
  handleSubmitAbsence, 
  handleGetMyAbsences, 
  handleGetChildrenAbsences,
  handleGetPendingAbsences, 
  handleGetAllAbsences, 
  handleReviewAbsence, 
  handleDeleteAbsence 
} from "./Absence/Controllers/absenceController.js";

// Import Document Upload Controllers
import { handleUploadDocument } from "./Documents/Controllers/documentController.js";

// Import Notification Controllers
import { 
  handleGetMyNotifications, 
  handleMarkNotificationAsRead, 
  handleMarkAllAsRead 
} from "./Notifications/Controllers/notificationController.js";

// Import Middleware
import { authenticateToken, authorizeRoles } from "./Shared/Authentication middleware/authMiddleware.js";
import { ROLES } from "./Shared/Roles/roles.js";

// Configuration de Multer (Stockage mémoire temporaire pour upload)
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
app.use(cors());
app.use(express.json());

// Service des fichiers statiques téléversés localement (/uploads)
app.use("/uploads", express.static(join(__dirname, "uploads")));

// Routes publiques
app.post("/api/auth/login", handleLogin);
app.post("/api/auth/reset-password", handleResetPassword);
app.post("/api/auth/logout", handleLogout);

// Routes sécurisées Utilisateurs & Parents
app.get("/api/users", authenticateToken, handleGetAllUsers);
app.post("/api/users/create", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), handleCreateUser);
app.post("/api/roles/assign", authenticateToken, authorizeRoles(ROLES.ADMIN), handleAssignRole);
app.post("/api/users/link-parent-student", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH), handleLinkParentStudent);
app.get("/api/users/my-children", authenticateToken, authorizeRoles(ROLES.PARENT, ROLES.ADMIN, ROLES.RH), handleGetLinkedChildren);

// Module Absence - Routes sécurisées
app.post("/api/absences", authenticateToken, handleSubmitAbsence);
app.get("/api/absences/my", authenticateToken, handleGetMyAbsences);
app.get("/api/absences/children", authenticateToken, authorizeRoles(ROLES.PARENT, ROLES.ADMIN, ROLES.RH), handleGetChildrenAbsences);
app.get("/api/absences/pending", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER), handleGetPendingAbsences);
app.get("/api/absences", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER, ROLES.TEACHER), handleGetAllAbsences);
app.patch("/api/absences/:id/review", authenticateToken, authorizeRoles(ROLES.ADMIN, ROLES.RH, ROLES.MANAGER), handleReviewAbsence);
app.delete("/api/absences/:id", authenticateToken, handleDeleteAbsence);

// Module Documents - Téléversement de justificatifs
app.post("/api/documents/upload", authenticateToken, upload.single("file"), handleUploadDocument);

// Module Notifications In-App - Routes sécurisées
app.get("/api/notifications/my", authenticateToken, handleGetMyNotifications);
app.patch("/api/notifications/:id/read", authenticateToken, handleMarkNotificationAsRead);
app.post("/api/notifications/read-all", authenticateToken, handleMarkAllAsRead);

// Route test de vérification du serveur
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "API Backend Gestion des Absences opérationnelle." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur API REST démarré sur http://localhost:${PORT}`);
});
