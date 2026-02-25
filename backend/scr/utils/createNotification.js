const Notification = require("../models/notification.model");

const createNotification = async ({ userId, type, referenceId }) => {
  const notification = await Notification.create({
    userId,
    type,
    referenceId,
  });

  if (global.io) {
    const room = userId.toString();
    global.io.to(room).emit("newNotification", notification);
    global.io.to(room).emit("dashboardUpdate");
  }

  return notification;
};

module.exports = createNotification;
