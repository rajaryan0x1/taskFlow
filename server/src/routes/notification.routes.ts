import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

export default router;
