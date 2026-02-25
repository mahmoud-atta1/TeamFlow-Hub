const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const ApiError = require("../utils/apiError");

exports.getUsers = asyncHandler(async (req, res) => {
  let filter = {};

  if (req.user.role === "team-lead") {
    filter.status = "approved";
    filter.role = { $ne: "manager" };
  }

  if (req.query.status && req.user.role === "manager") {
    filter.status = req.query.status;
  }

  const users = await User.find(filter).select("-password");

  res.status(200).json({
    success: true,
    results: users.length,
    data: users,
  });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  }).select("-password");

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.updateMe = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.user._id, req.body, {
    new: true,
  }).select("-password");

  res.status(200).json({
    success: true,
    data: user,
  });
});

exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new ApiError("User not found", 404));
  }

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return next(new ApiError("Wrong current password", 400));
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = Date.now();
  await user.save();

  const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  res.status(200).json({
    success: true,
    message: "Password updated successfully",
    accessToken,
  });
});
