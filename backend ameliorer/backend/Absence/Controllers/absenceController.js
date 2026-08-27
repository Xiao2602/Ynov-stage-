import { 
  validateSubmitAbsence, 
  validateReviewAbsence 
} from "../Validators/absenceValidator.js";
import {
  submitAbsenceService,
  getMyAbsencesService,
  getChildrenAbsencesService,
  getPendingAbsencesService,
  getAllAbsencesService,
  reviewAbsenceService,
  deleteAbsenceService
} from "../Services/absenceService.js";


import { 
  exportAbsencesToExcelService,
  exportAbsencesToPdfService 
} from "../Services/absenceService.js";

/**
 * Controller pour soumettre une demande d'absence (POST /api/absences)
 */
export async function handleSubmitAbsence(req, res) {
  const validation = validateSubmitAbsence(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const result = await submitAbsenceService(req.user, req.body);
  if (result.success) {
    return res.status(201).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour obtenir les absences de l'utilisateur connecté (GET /api/absences/my)
 */
export async function handleGetMyAbsences(req, res) {
  const result = await getMyAbsencesService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour obtenir les absences des enfants d'un Parent (GET /api/absences/children)
 */
export async function handleGetChildrenAbsences(req, res) {
  const result = await getChildrenAbsencesService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour obtenir toutes les demandes d'absence en attente (GET /api/absences/pending)
 */
export async function handleGetPendingAbsences(req, res) {
  const result = await getPendingAbsencesService();
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour filtrer ou afficher toutes les absences (GET /api/absences)
 */
export async function handleGetAllAbsences(req, res) {
  const result = await getAllAbsencesService(req.query);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour approuver ou rejeter une demande d'absence (PATCH /api/absences/:id/review)
 */
export async function handleReviewAbsence(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID de la demande d'absence manquant." });
  }

  const validation = validateReviewAbsence(req.body);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const result = await reviewAbsenceService(id, req.user, req.body);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour supprimer une demande d'absence en attente (DELETE /api/absences/:id)
 */
export async function handleDeleteAbsence(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID de la demande d'absence manquant." });
  }

  const result = await deleteAbsenceService(id, req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour obtenir les statistiques (GET /api/absences/statistics)
 */
export async function handleGetStatistics(req, res) {
  const result = await getStatisticsService();
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour exporter en Excel (GET /api/absences/export/excel)
 */
export async function handleExportExcel(req, res) {
  const result = await exportAbsencesToExcelService(req.query);
  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  return res.send(result.buffer);
}

/**
 * Controller pour exporter en PDF (GET /api/absences/export/pdf)
 */
export async function handleExportPdf(req, res) {
  const result = await exportAbsencesToPdfService(req.query);
  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
  return res.send(result.buffer);
}
