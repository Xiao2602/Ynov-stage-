import { getPlanningService, upsertPlanningService, deletePlanningService } from "../../Services/planningService.js";
import { logActivity } from "../../Services/activityLogService.js";

/**
 * GET /api/plannings/:teacherUid
 * Récupère le planning d’un professeur (admin/personnel ou prof lui-même)
 */
export async function handleGetPlanning(req, res) {
  try {
    const { teacherUid } = req.params;
    if (!teacherUid) {
      return res.status(400).json({ success: false, error: "teacherUid requis." });
    }

    // Vérification des droits : admin/personnel peuvent tout voir, prof ne voit que son planning
    const isAdmin = ['admin', 'employee'].includes(req.user.role);
    if (!isAdmin && req.user.uid !== teacherUid) {
      return res.status(403).json({ success: false, error: "Accès non autorisé." });
    }

    const result = await getPlanningService(teacherUid);
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error("Erreur handleGetPlanning:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/plannings
 * Crée ou met à jour un planning (admin/personnel)
 */
export async function handleUpsertPlanning(req, res) {
  try {
    const { teacherUid, courses, type, academicYear } = req.body;
    if (!teacherUid || !courses) {
      return res.status(400).json({ success: false, error: "teacherUid et courses requis." });
    }

    const result = await upsertPlanningService({ teacherUid, courses, type, academicYear }, req.user.uid);
    if (result.success) {
      await logActivity(req.user.uid, 'upsert_planning', { teacherUid, coursesCount: courses.length }, req);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("Erreur handleUpsertPlanning:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/plannings/:id
 * Supprime un planning (admin/personnel)
 */
export async function handleDeletePlanning(req, res) {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: "ID requis." });
    }
    const result = await deletePlanningService(id);
    if (result.success) {
      await logActivity(req.user.uid, 'delete_planning', { planningId: id }, req);
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error("Erreur handleDeletePlanning:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}