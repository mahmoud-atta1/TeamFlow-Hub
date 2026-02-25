const asyncHandler = require("express-async-handler");

const Team = require("../models/team.model");
const Task = require("../models/task.model");
const Notification = require("../models/notification.model");

exports.managerDashboard = asyncHandler(async (req, res) => {
  const [teamsCount, totalTasks, doneTasks, unreadNotifications] =
    await Promise.all([
      Team.countDocuments({
        managerId: req.user._id,
        isActive: true,
      }),

      Task.countDocuments({
        isActive: true,
      }),

      Task.countDocuments({
        status: "done",
        isActive: true,
      }),

      Notification.countDocuments({
        userId: req.user._id,
        isRead: false,
      }),
    ]);

  res.status(200).json({
    success: true,
    data: {
      teamsCount,
      totalTasks,
      doneTasks,
      unreadNotifications,
    },
  });
});

exports.teamDashboard = asyncHandler(async (req, res) => {
  const teams = await Team.find({
    teamLead: req.user._id,
    isActive: true,
  }).select("_id");

  const teamIds = teams.map((t) => t._id);

  const [totalTasks, doneTasks, unreadNotifications] = await Promise.all([
    Task.countDocuments({
      teamId: { $in: teamIds },
      isActive: true,
    }),

    Task.countDocuments({
      teamId: { $in: teamIds },
      status: "done",
      isActive: true,
    }),

    Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      teamsCount: teams.length,
      totalTasks,
      doneTasks,
      unreadNotifications,
    },
  });
});

exports.myDashboard = asyncHandler(async (req, res) => {
  const [totalTasks, done, unreadNotifications] = await Promise.all([
    Task.countDocuments({
      assignedTo: req.user._id,
      isActive: true,
    }),

    Task.countDocuments({
      assignedTo: req.user._id,
      status: "done",
      isActive: true,
    }),

    Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    }),
  ]);

  const pending = totalTasks - done;

  res.status(200).json({
    success: true,
    data: {
      totalTasks,
      done,
      pending,
      unreadNotifications,
    },
  });
});
