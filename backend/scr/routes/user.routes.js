const express = require("express");
const router = express.Router();

const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  changePassword,
} = require("../services/user.service");

const { protect, allowedTo } = require("../services/auth.service");

const {
  getUsersValidator,
  getUserValidator,
  updateUserValidator,
  deleteUserValidator,
  updateMeValidator,
  changePasswordValidator,
} = require("../validators/user.validator");

const {
  uploadUserImage,
  resizeUserImage,
} = require("../middlewares/uploadImageMiddleware");

router.use(protect);

//@ profile Routes
router.get("/profile", getMe);
router.patch(
  "/update-profile",
  uploadUserImage,
  resizeUserImage,
  updateMeValidator,
  updateMe,
);
router.patch("/change-password", changePasswordValidator, changePassword);

//@ Manager Routes
router.get("/", allowedTo("manager", "team-lead"), getUsersValidator, getUsers);
router.get(
  "/:id",
  allowedTo("manager", "team-lead"),
  getUserValidator,
  getUser,
);
router.patch("/:id", allowedTo("manager"), updateUserValidator, updateUser);
router.delete("/:id", allowedTo("manager"), deleteUserValidator, deleteUser);

module.exports = router;
