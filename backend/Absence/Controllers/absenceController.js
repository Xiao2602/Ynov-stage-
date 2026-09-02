import { adminDb } from "../../firebaseAdmin.js";
import { logActivity } from "../../Services/activityLogService.js";

import { 
  validateSubmitAbsence, 
  validateReviewAbsence,
  validateTeacherDeclareAbsence
} from "../Validators/absenceValidator.js";
import {
  submitAbsenceService,
  getMyAbsencesService,
  getChildrenAbsencesService,
  getPendingAbsencesService,
  getAllAbsencesService,
  reviewAbsenceService,
  deleteAbsenceService,
  getStatisticsService,
  exportAbsencesToExcelService,
  exportAbsencesToPdfService,
  teacherDeclareAbsenceService,
  justifyAbsenceService,
  archiveAbsencesService,
  transformLatesToAbsenceService
} from "../Services/absenceService.js";

export async function handleSubmitAbsence(req, res) {
  try {
    const validation = validateSubmitAbsence(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    const result = await submitAbsenceService(req.user, req.body);
    if (result.success) {
      await logActivity(req.user.uid, 'submit_absence', { absenceId: result.absence.id, type: req.body.type, startDate: req.body.startDate, endDate: req.body.endDate }, req);
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleSubmitAbsence:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetMyAbsences(req, res) {
  try {
    const result = await getMyAbsencesService(req.user.uid);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleGetMyAbsences:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetChildrenAbsences(req, res) {
  try {
    const result = await getChildrenAbsencesService(req.user.uid);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleGetChildrenAbsences:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetPendingAbsences(req, res) {
  try {
    const result = await getPendingAbsencesService();
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleGetPendingAbsences:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetAllAbsences(req, res) {
  try {
    const result = await getAllAbsencesService(req.query);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleGetAllAbsences:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleReviewAbsence(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID manquant." });
  }
  const validation = validateReviewAbsence(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  try {
    const result = await reviewAbsenceService(id, req.user, req.body);
    if (result.success) {
      await logActivity(req.user.uid, 'review_absence', { absenceId: id, status: req.body.status, reviewNotes: req.body.reviewNotes }, req);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleReviewAbsence:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleDeleteAbsence(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID manquant." });
  }
  try {
    const result = await deleteAbsenceService(id, req.user.uid);
    if (result.success) {
      await logActivity(req.user.uid, 'delete_absence', { absenceId: id }, req);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleDeleteAbsence:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetStatistics(req, res) {
  try {
    const result = await getStatisticsService();
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur stats controller:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleExportExcel(req, res) {
  try {
    const customAbsences = req.body?.absences || null;
    const result = await exportAbsencesToExcelService(req.query, customAbsences);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  } catch (error) {
    console.error("❌ Erreur export Excel:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleExportPdf(req, res) {
  try {
    const customAbsences = req.body?.absences || null;
    const result = await exportAbsencesToPdfService(req.query, customAbsences);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  } catch (error) {
    console.error("❌ Erreur export PDF:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleJustifyAbsence(req, res) {
  const { id } = req.params;
  const { justificationUrl, reason } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID de l'absence manquant." });
  }
  if (!justificationUrl) {
    return res.status(400).json({ success: false, error: "L'URL du justificatif est obligatoire." });
  }
  try {
    const result = await justifyAbsenceService(id, req.user.uid, justificationUrl, reason);
    if (result.success) {
      await logActivity(req.user.uid, 'justify_absence', { absenceId: id }, req);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleJustifyAbsence:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/absences/teacher/declare - Déclarer une absence pour un étudiant (professeur)
 */
export async function handleTeacherDeclareAbsence(req, res) {
  console.log("📥 [handleTeacherDeclareAbsence] Requête reçue");
  console.log("👤 Professeur:", req.user?.uid);
  console.log("📦 Body:", req.body);

  try {
    const validation = validateTeacherDeclareAbsence(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    // 🔥 Ajout du type "late" si le professeur a coché "Retard"
    const isLate = req.body.isLate === true || req.body.isLate === 'true';
    const absenceType = isLate ? 'late' : 'unjustified';
    
    const result = await teacherDeclareAbsenceService(req.user, { 
      ...req.body, 
      type: absenceType,
      isLate 
    });

    if (result.success) {
      await logActivity(req.user.uid, 'teacher_declare_absence', { 
        studentId: req.body.studentId, 
        courseName: req.body.courseName, 
        startDate: req.body.startDate, 
        endDate: req.body.endDate,
        isLate 
      }, req);
      return res.status(201).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleTeacherDeclareAbsence:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/absences/transform-lates - Transformer les retards en absence (automatique ou manuel)
 */
export async function handleTransformLates(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "userId requis." });
    }
    const result = await transformLatesToAbsenceService(userId);
    if (result.success) {
      await logActivity(req.user.uid, 'transform_lates', { userId }, req);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("❌ Erreur handleTransformLates:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetAbsencesByCourse(req, res) {
  try {
    const { className, courseName, startDate, endDate, date } = req.query;
    const targetDate = date ? String(date).slice(0, 10) : (startDate && startDate === endDate ? String(startDate).slice(0, 10) : null);
    const teacherUid = req.user.uid;
    const teacherDoc = await adminDb.collection("users").doc(teacherUid).get();
    if (!teacherDoc.exists) {
      return res.status(404).json({ success: false, error: "Professeur introuvable." });
    }
    const teacherData = teacherDoc.data();
    const assignedClasses = teacherData.assignedClasses || [];

    // Récupérer les étudiants
    const studentsSnapshot = await adminDb.collection("users").where("role", "==", "student").get();

    const studentMap = {};
    const studentUids = new Set();

    studentsSnapshot.forEach(doc => {
      const studentData = doc.data();
      const studentClass = String(studentData.className || studentData.department || "").trim();

      const classMatch = assignedClasses.length === 0 || assignedClasses.some(cls => {
        const cNorm = String(cls).toLowerCase().trim();
        const sNorm = studentClass.toLowerCase().trim();
        return sNorm.includes(cNorm) || cNorm.includes(sNorm);
      });

      if (classMatch) {
        if (!className || className === 'all' || studentClass.toLowerCase() === className.toLowerCase() || studentClass.toLowerCase().includes(className.toLowerCase())) {
          studentUids.add(doc.id);
          studentMap[doc.id] = {
            displayName: studentData.displayName || "Étudiant",
            email: studentData.email || "",
            className: studentClass || "Classe non définie"
          };
        }
      }
    });

    if (studentUids.size === 0) {
      return res.status(200).json({ success: true, count: 0, absences: [] });
    }

    const absencesSnapshot = await adminDb.collection("absences").get();
    const matchedAbsences = [];

    absencesSnapshot.forEach(doc => {
      const a = doc.data();
      const absId = doc.id;
      const uid = a.userId;

      if (!studentUids.has(uid) && a.declaredBy !== teacherUid) {
        return;
      }

      if (courseName && a.courseName && a.courseName !== courseName) {
        return;
      }

      const aStart = String(a.startDate || '').slice(0, 10);
      const aEnd = String(a.endDate || aStart).slice(0, 10);

      if (targetDate) {
        if (aStart && targetDate < aStart) return;
        if (aEnd && targetDate > aEnd) return;
        if (!aStart && !aEnd) return;
      } else {
        if (startDate) {
          const s = String(startDate).slice(0, 10);
          if (aEnd && aEnd < s) return;
        }
        if (endDate) {
          const e = String(endDate).slice(0, 10);
          if (aStart && aStart > e) return;
        }
      }

      const sInfo = studentMap[uid] || {};
      matchedAbsences.push({
        id: absId,
        ...a,
        displayName: a.displayName || sInfo.displayName || "Étudiant",
        userEmail: a.userEmail || sInfo.email || "",
        className: a.className || a.department || sInfo.className || "Classe non définie"
      });
    });

    matchedAbsences.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

    return res.status(200).json({ success: true, count: matchedAbsences.length, absences: matchedAbsences });
  } catch (error) {
    console.error("Erreur handleGetAbsencesByCourse:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleArchiveAbsences(req, res) {
  const { year } = req.body;
  if (!year) {
    return res.status(400).json({ success: false, error: "L'année scolaire est requise." });
  }
  try {
    const result = await archiveAbsencesService(year);
    if (result.success) {
      await logActivity(req.user.uid, 'archive_absences', { year, count: result.archived }, req);
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("Erreur handleArchiveAbsences:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetArchivedAbsences(req, res) {
  try {
    const snapshot = await adminDb.collection("archived_absences").orderBy("archivedAt", "desc").get();
    const absences = [];
    snapshot.forEach(doc => absences.push({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ success: true, count: absences.length, absences });
  } catch (error) {
    console.error("Erreur handleGetArchivedAbsences:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}