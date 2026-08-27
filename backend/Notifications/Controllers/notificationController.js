import {
  getMyNotificationsService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,          // ← ajout
  deleteReadNotificationsService      // ← ajout
} from "../Services/notificationService.js";

/**
 * GET /api/notifications/my
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
 * PATCH /api/notifications/:id/read
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
 * POST /api/notifications/read-all
 */
export async function handleMarkAllAsRead(req, res) {
  const result = await markAllNotificationsAsReadService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * DELETE /api/notifications/:id
 */
export async function handleDeleteNotification(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ success: false, error: "ID de notification manquant." });
  }

  const result = await deleteNotificationService(id, req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}

/**
 * DELETE /api/notifications/read
 */
export async function handleDeleteReadNotifications(req, res) {
  const result = await deleteReadNotificationsService(req.user.uid);
  if (result.success) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json(result);
  }
}