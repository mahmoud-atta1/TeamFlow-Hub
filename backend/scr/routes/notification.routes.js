const express = require("express");
const router = express.Router();

const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
} = require("../services/notification.service");

const { protect } = require("../services/auth.service");

router.use(protect);

router.get("/me", getMyNotifications);

router.get("/unread-count", getUnreadCount);

router.patch("/:id/read", markAsRead);

router.patch("/read-all", markAllRead);

module.exports = router;
