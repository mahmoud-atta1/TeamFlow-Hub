const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const User = require("../models/user.model");
const ApiError = require("../utils/apiError");

exports.signup = asyncHandler(async (req, res, next) => {
  const { name, email, password } = req.body;

  const existUser = await User.findOne({ email });
  if (existUser) {
    return next(new ApiError("Email already exists", 409));
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
  });

  user.password = undefined;
  res.status(201).json({
    success: true,
    message: "Account created and waiting for approval",
    data: user,
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new ApiError("Invalid email or password", 401));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new ApiError("Invalid email or password", 401));
  }

  if (user.status === "pending") {
    return next(new ApiError("Account waiting for approval", 403));
  }

  if (user.status === "rejected") {
    return next(new ApiError("Account has been rejected", 403));
  }

  const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  user.password = undefined;

  res.status(200).json({
    success: true,
    accessToken,
    data: user,
  });
});

exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
});

exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new ApiError("You are not logged in! Please login to get access.", 401),
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new ApiError("Invalid or expired token", 401));
  }

  const currentUser = await User.findById(decoded.userId);

  if (!currentUser) {
    return next(
      new ApiError(
        "The user belonging to this token does no longer exist.",
        401,
      ),
    );
  }

  if (currentUser.passwordChangedAt) {
    const passChangedTimestamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10,
    );

    if (passChangedTimestamp > decoded.iat) {
      return next(
        new ApiError(
          "User recently changed password. Please login again.",
          401,
        ),
      );
    }
  }

  if (currentUser.status !== "approved") {
    return next(new ApiError("Account not approved", 403));
  }

  req.user = currentUser;
  next();
});

exports.allowedTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not allowed to access this route", 403),
      );
    }

    next();
  };
};
