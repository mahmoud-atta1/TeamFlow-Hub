const express = require("express");
const router = express.Router();

const { signup, login, logout ,protect } = require("../services/auth.service");
const {
  signupValidator,
  loginValidator,
} = require("../validators/auth.validator");

router.post("/register", signupValidator, signup);
router.post("/login", loginValidator, login);
router.post("/logout", protect, logout);

module.exports = router;
