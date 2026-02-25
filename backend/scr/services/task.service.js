const asyncHandler = require("express-async-handler");

const Team = require("../models/team.model");
const User = require("../models/user.model");
const Task = require("../models/task.model");
const ApiError = require("../utils/apiError");
const createNotification = require("../utils/createNotification");

const emitToUser = (userId, event, data) => {
  if (!global.io || !userId) return;
  global.io.to(userId.toString()).emit(event, data);
};

exports.createTask = asyncHandler(async (req, res, next) => {
  const { title, description, priority, assignedTo, teamId } = req.body;

  const team = await Team.findById(teamId);
  if (!team) {
    return next(new ApiError("Team not found", 404));
  }

  const task = await Task.create({
    title,
    description,
    priority,
    createdBy: req.user._id,
    assignedTo,
    teamId,
  });

  await createNotification({
    userId: team.teamLead,
    type: "newTask",
    referenceId: task._id,
  });

  //  Realtime
  emitToUser(team.teamLead, "taskCreated", {
    _id: task._id,
    title: task.title,
    priority: task.priority,
  });

  if (assignedTo && String(assignedTo) !== String(team.teamLead)) {
    await createNotification({
      userId: assignedTo,
      type: "taskAssigned",
      referenceId: task._id,
    });

    emitToUser(assignedTo, "taskAssigned", {
      _id: task._id,
      title: task.title,
      priority: task.priority,
    });
  }

  res.status(201).json({
    success: true,
    data: task,
  });
});

exports.createSubTask = asyncHandler(async (req, res, next) => {
  const { title, description, priority, assignedTo, teamId, parentTaskId } =
    req.body;

  const team = await Team.findById(teamId);
  if (!team) {
    return next(new ApiError("Team not found", 404));
  }

  if (!team.teamLead.equals(req.user._id)) {
    return next(new ApiError("Not allowed on this team", 403));
  }

  const parent = await Task.findById(parentTaskId);
  if (!parent) {
    return next(new ApiError("Parent task not found", 404));
  }

  if (parent.teamId.toString() !== teamId) {
    return next(new ApiError("Parent task not in this team", 400));
  }

  const user = await User.findById(assignedTo);
  if (!user || user.status !== "approved") {
    return next(new ApiError("User not approved", 400));
  }

  if (user.role === "manager") {
    return next(new ApiError("Cannot assign task to manager", 400));
  }

  if (!team.teamMembers.some((id) => id.equals(user._id))) {
    return next(new ApiError("User not in this team", 400));
  }

  const task = await Task.create({
    title,
    description,
    priority,
    createdBy: req.user._id,
    assignedTo,
    teamId,
    parentTaskId,
  });

  await createNotification({
    userId: assignedTo,
    type: "taskAssigned",
    referenceId: task._id,
  });

  emitToUser(assignedTo, "taskAssigned", {
    _id: task._id,
    title: task.title,
    priority: task.priority,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
});

exports.changeStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  const task = await Task.findById(req.params.id);
  if (!task || !task.isActive) {
    return next(new ApiError("Task not found", 404));
  }

  if (
    req.user.role === "developer" &&
    task.assignedTo?.toString() !== req.user._id.toString()
  ) {
    return next(new ApiError("Not allowed to update this task", 403));
  }

  if (task.status === "todo" && status !== "in-progress") {
    return next(new ApiError("Invalid status change", 400));
  }

  if (task.status === "in-progress" && status !== "done") {
    return next(new ApiError("Invalid status change", 400));
  }

  if (task.status === "done") {
    return next(new ApiError("Task already finished", 400));
  }

  task.status = status;
  await task.save();

  if (status === "done") {
    await createNotification({
      userId: task.createdBy,
      type: "taskCompleted",
      referenceId: task._id,
    });

    emitToUser(task.createdBy, "taskCompleted", {
      _id: task._id,
      title: task.title,
    });
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

exports.getTasks = asyncHandler(async (req, res) => {
  let filter = { isActive: true };

  if (req.user.role === "team-lead") {
    const teams = await Team.find({ teamLead: req.user._id });
    const teamIds = teams.map((t) => t._id);
    filter.teamId = { $in: teamIds };
  }

  if (req.user.role === "developer") {
    filter.assignedTo = req.user._id;
  }

  const tasks = await Task.find(filter)
    .populate("assignedTo", "name email role")
    .populate("createdBy", "name role")
    .populate("teamId", "name");

  res.status(200).json({
    success: true,
    results: tasks.length,
    data: tasks,
  });
});

exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findOne({
    _id: req.params.id,
    isActive: true,
  })
    .populate("assignedTo", "name role")
    .populate("teamId", "name");

  if (!task) {
    return next(new ApiError("Task not found", 404));
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

exports.updateTask = asyncHandler(async (req, res, next) => {
  const { title, description, priority } = req.body;

  const task = await Task.findOne({
    _id: req.params.id,
    isActive: true,
  });

  if (!task) {
    return next(new ApiError("Task not found", 404));
  }

  if (title) task.title = title;
  if (description) task.description = description;
  if (priority) task.priority = priority;

  await task.save();

  res.status(200).json({
    success: true,
    data: task,
  });
});

exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task || !task.isActive) {
    return next(new ApiError("Task not found", 404));
  }

  task.isActive = false;
  await task.save();

  res.status(200).json({
    success: true,
    message: "Task deleted successfully",
  });
});
