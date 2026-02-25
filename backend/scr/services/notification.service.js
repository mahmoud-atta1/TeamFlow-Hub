const asyncHandler = require("express-async-handler");
const Notification = require("../models/notification.model");
const ApiError = require("../utils/apiError");

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    userId: req.user._id,
  }).sort("-createdAt");

  res.status(200).json({
    success: true,
    results: notifications.length,
    data: notifications,
  });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    userId: req.user._id,
    isRead: false,
  });

  res.status(200).json({
    success: true,
    data: { count },
  });
});

exports.markAsRead = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!notification) {
    return next(new ApiError("Notification not found", 404));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
  });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true },
  );

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});
