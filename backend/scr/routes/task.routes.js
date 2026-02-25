const express = require("express");
const router = express.Router();

const {
  createTask,
  createSubTask,
  changeStatus,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
} = require("../services/task.service");

const { protect, allowedTo } = require("../services/auth.service");

const {
  createTaskValidator,
  createSubTaskValidator,
  changeStatusValidator,
  getTaskValidator,
  updateTaskValidator,
  deleteTaskValidator,
} = require("../validators/task.validator");

router.use(protect);

router.post("/", allowedTo("manager"), createTaskValidator, createTask);

router.post(
  "/sub-task",
  allowedTo("team-lead"),
  createSubTaskValidator,
  createSubTask,
);

router.get("/", allowedTo("manager", "team-lead", "developer"), getTasks);

router.patch(
  "/:id/status",
  allowedTo("team-lead", "developer"),
  changeStatusValidator,
  changeStatus,
);

router.get(
  "/:id",
  allowedTo("manager", "team-lead", "developer"),
  getTaskValidator,
  getTask,
);

router.patch(
  "/:id",
  allowedTo("manager", "team-lead"),
  updateTaskValidator,
  updateTask,
);

router.delete(
  "/:id",
  allowedTo("manager", "team-lead"),
  deleteTaskValidator,
  deleteTask,
);

module.exports = router;
