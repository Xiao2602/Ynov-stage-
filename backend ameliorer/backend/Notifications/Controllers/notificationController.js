import {
  getMyNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService
} from "../Services/notificationService.js";

/**
 * Controller pour récupérer les notifications de l'utilisateur connecté (GET /api/notifications/my)
 */
export async function handleGetMyNotifications(req, res) {
  const result = await getMyNotificationsService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(500).json(result);
  }
}

/**
 * Controller pour marquer une notification comme lue (PATCH /api/notifications/:id/read)
 */
export async function handleMarkNotificationAsRead(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID de la notification manquant." });
  }

  const result = await markNotificationAsReadService(id, req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * Controller pour marquer toutes les notifications comme lues (POST /api/notifications/read-all)
 */
export async function handleMarkAllAsRead(req, res) {
  const result = await markAllNotificationsAsReadService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}
