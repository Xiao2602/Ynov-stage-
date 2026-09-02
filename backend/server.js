import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { adminDb } from "./firebaseAdmin.js";
import admin from "firebase-admin";
import { getActivityLogs, logActivity } from "./Services/activityLogService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================
// IMPORTS AUTHENTIFICATION
// ============================================================

import {
  handleLogin,
  handleResetPassword,
  handleLogout,
  handleChangePassword,
  handleGetMe,
  handleVerify2FA
} from "./Auth/Authentication/authController.js";

import {
  handleGetPlanning,
  handleUpsertPlanning,
  handleDeletePlanning
} from "./Auth/Planning/planningController.js";

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
// IMPORTS ROLES & PROFILE
// ============================================================

import {
  handleAssignRole
} from "./Auth/Roles & Permissions/roleController.js";

import profileRoutes from "./Auth/Profile/profileRoutes.js";

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
  handleTransformLates,
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
app.post("/api/auth/change-password", authenticateToken, handleChangePassword);
app.post("/api/auth/logout", handleLogout);
app.get("/api/auth/me", authenticateToken, handleGetMe);


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
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleCreateUser
);

app.post(
  "/api/users/link-parent-student",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleLinkParentStudent
);

app.get(
  "/api/users/my-children",
  authenticateToken,
  authorizeRoles(ROLES.PARENT, ROLES.ADMIN, ROLES.EMPLOYEE),
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
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleGetUser
);

app.patch(
  "/api/users/:uid",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleUpdateUser
);

app.patch(
  "/api/users/:uid/suspend",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
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
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleAssignTeacherClass
);

// Transformer les retards en absence
app.post(
  "/api/absences/transform-lates",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleTransformLates
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
// PROFILE
// ============================================================

app.use("/api/profile", profileRoutes);

// ============================================================
// ABSENCES
// ============================================================

app.post("/api/absences", authenticateToken, handleSubmitAbsence);
app.get("/api/absences/my", authenticateToken, handleGetMyAbsences);
app.get(
  "/api/absences/children",
  authenticateToken,
  authorizeRoles(ROLES.PARENT, ROLES.ADMIN, ROLES.EMPLOYEE),
  handleGetChildrenAbsences
);
app.get(
  "/api/absences/pending",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.MANAGER),
  handleGetPendingAbsences
);
app.get(
  "/api/absences",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.TEACHER),
  handleGetAllAbsences
);
app.patch(
  "/api/absences/:id/review",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.MANAGER),
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
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleGetArchivedAbsences
);



// ============================================================
// ASSIGNATION DE PLANNING (Personnel / Admin)
// ============================================================


function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = String(timeStr).split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

function validatePlanningConflicts(courses) {
  if (!Array.isArray(courses) || courses.length <= 1) {
    return { valid: true };
  }
  const groups = {};
  courses.forEach((c) => {
    const key = (c.date && String(c.date).trim() !== '') 
      ? `date:${String(c.date).trim()}` 
      : `day:${String(c.day || 'Lundi').trim()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  const MIN_INTERVAL_HOURS = 3;
  for (const [, groupCourses] of Object.entries(groups)) {
    groupCourses.sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
    for (let i = 0; i < groupCourses.length - 1; i++) {
      const c1 = groupCourses[i];
      const c2 = groupCourses[i + 1];
      const start1 = parseTimeToMinutes(c1.start || '08:00');
      const dur1Hours = Math.max(Number(c1.duration) || MIN_INTERVAL_HOURS, MIN_INTERVAL_HOURS);
      const end1 = start1 + dur1Hours * 60;
      const start2 = parseTimeToMinutes(c2.start || '08:00');
      if (start2 < end1) {
        const dateLabel = c1.date || c1.day || 'date non précisée';
        const diffHours = ((start2 - start1) / 60).toFixed(1).replace('.0', '');
        return {
          valid: false,
          error: `Conflit d'horaire pour le professeur : Le cours "${c1.title || 'Sans titre'}" (${c1.start}) et "${c2.title || 'Sans titre'}" (${c2.start}) sont programmés le ${dateLabel} avec seulement ${diffHours}h d'intervalle. Un intervalle minimum de ${MIN_INTERVAL_HOURS}h est obligatoire entre chaque séance pour permettre la fin normale du premier cours.`
        };
      }
    }
  }
  return { valid: true };
}

app.post(
  "/api/plannings/assign",
  authenticateToken,
  authorizeRoles(ROLES.EMPLOYEE, ROLES.ADMIN),
  async (req, res) => {
    console.log("📥 [POST] /api/plannings/assign");
    try {
      const { teacherUid, courses, academicYear } = req.body;
      if (!teacherUid || !courses || !Array.isArray(courses) || courses.length === 0) {
        return res.status(400).json({ success: false, error: "Données invalides : liste de cours requise." });
      }

      // Vérifier que le professeur existe
      const teacherDoc = await adminDb.collection("users").doc(teacherUid).get();
      if (!teacherDoc.exists) {
        return res.status(404).json({ success: false, error: "Professeur introuvable." });
      }

      const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

      // Normaliser et trier chronologiquement les cours
      const normalizedCourses = courses
        .map((c, index) => {
          let courseDate = c.date ? String(c.date).trim() : '';
          let courseDay = c.day ? String(c.day).trim() : '';

          // Si la date est présente mais pas le jour, calculer le jour
          if (courseDate && !courseDay) {
            try {
              const d = new Date(courseDate + 'T00:00:00');
              if (!isNaN(d.getTime())) {
                courseDay = DAYS_FR[d.getDay()] || 'Lundi';
              }
            } catch (_) {}
          }

          return {
            id: c.id || Date.now() + index,
            date: courseDate,
            day: courseDay || 'Lundi',
            start: c.start || '08:00',
            duration: Number(c.duration) || 2,
            title: String(c.title || '').trim(),
            group: String(c.group || '').trim(),
            room: String(c.room || '').trim()
          };
        })
        .sort((a, b) => {
          if (a.date && b.date) {
            const comp = a.date.localeCompare(b.date);
            if (comp !== 0) return comp;
          }
          return (a.start || '').localeCompare(b.start || '');
        });

      // Sauvegarder le planning complet de l'année
      const planningRef = adminDb.collection("plannings").doc(teacherUid);
      await planningRef.set({
        teacherUid,
        courses: normalizedCourses,
        academicYear: academicYear || (new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)),
        totalCourses: normalizedCourses.length,
        totalHours: normalizedCourses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: req.user.uid
      });

      await logActivity(req.user.uid, 'assign_planning', { teacherUid, courseCount: courses.length }, req);

      return res.status(200).json({ success: true, message: "Planning assigné avec succès." });
    } catch (error) {
      console.error("❌ Erreur assignation planning:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ============================================================
// PLANNING ÉTUDIANT (Agrégation des cours de la promotion de l'étudiant)
// ============================================================
app.get(
  "/api/plannings/student/my",
  authenticateToken,
  async (req, res) => {
    console.log("📥 [GET] /api/plannings/student/my for user:", req.user.uid);
    try {
      // 1. Récupérer le document de l'étudiant
      const studentDoc = await adminDb.collection("users").doc(req.user.uid).get();
      if (!studentDoc.exists) {
        return res.status(404).json({ success: false, error: "Profil utilisateur introuvable." });
      }
      const studentData = studentDoc.data();
      const studentClass = String(studentData.className || studentData.department || '').trim();

      if (!studentClass) {
        return res.status(200).json({
          success: true,
          studentClass: '',
          courses: [],
          message: "Aucune classe assignée à votre profil étudiant."
        });
      }

      // 2. Récupérer tous les plannings des professeurs
      const planningsSnapshot = await adminDb.collection("plannings").get();

      // Récupérer les profils des professeurs
      const teacherUids = [];
      planningsSnapshot.forEach((doc) => {
        if (doc.id) teacherUids.push(doc.id);
      });

      const teachersMap = {};
      if (teacherUids.length > 0) {
        for (let i = 0; i < teacherUids.length; i += 30) {
          const batch = teacherUids.slice(i, i + 30);
          const uSnap = await adminDb.collection("users").where(admin.firestore.FieldPath.documentId(), 'in', batch).get();
          uSnap.forEach((uDoc) => {
            const uData = uDoc.data();
            teachersMap[uDoc.id] = uData.displayName || uData.email || 'Professeur';
          });
        }
      }

      const matchedCourses = [];
      const studentClassNorm = studentClass.toLowerCase().replace(/\s+/g, ' ');

      planningsSnapshot.forEach((pDoc) => {
        const pData = pDoc.data();
        const teacherName = teachersMap[pDoc.id] || teachersMap[pData.teacherUid] || 'Professeur';
        const rawCourses = Array.isArray(pData.courses) ? pData.courses : [];

        rawCourses.forEach((c) => {
          const groupNorm = String(c.group || '').toLowerCase().replace(/\s+/g, ' ').trim();
          
          const isMatch = groupNorm === studentClassNorm ||
            (groupNorm && studentClassNorm.includes(groupNorm)) ||
            (studentClassNorm && groupNorm.includes(studentClassNorm));

          if (isMatch) {
            matchedCourses.push({
              ...c,
              teacherUid: pDoc.id,
              teacherName
            });
          }
        });
      });

      // Trier chronologiquement
      matchedCourses.sort((a, b) => {
        if (a.date && b.date) {
          const comp = a.date.localeCompare(b.date);
          if (comp !== 0) return comp;
        }
        return (a.start || '').localeCompare(b.start || '');
      });

      return res.status(200).json({
        success: true,
        studentClass,
        courses: matchedCourses,
        totalCourses: matchedCourses.length,
        totalHours: matchedCourses.reduce((acc, c) => acc + (Number(c.duration) || 2), 0)
      });
    } catch (error) {
      console.error("❌ Erreur planning étudiant:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);

app.get(
  "/api/plannings/:teacherUid",
  authenticateToken,
  async (req, res) => {
    console.log("📥 [GET] /api/plannings/" + req.params.teacherUid);
    try {
      const { teacherUid } = req.params;
      const doc = await adminDb.collection("plannings").doc(teacherUid).get();
      if (!doc.exists) {
        return res.status(200).json({ success: true, planning: null });
      }
      return res.status(200).json({ success: true, planning: { id: doc.id, ...doc.data() } });
    } catch (error) {
      console.error("❌ Erreur récupération planning:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }
);



// ============================================================
// STATISTIQUES
// ============================================================

app.get(
  "/api/absences/statistics",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleGetStatistics
);

// ============================================================
// EXPORTS
// ============================================================

app.all("/api/absences/export/excel",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
  handleExportExcel
);

app.all("/api/absences/export/pdf",
  authenticateToken,
  authorizeRoles(ROLES.ADMIN, ROLES.EMPLOYEE),
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