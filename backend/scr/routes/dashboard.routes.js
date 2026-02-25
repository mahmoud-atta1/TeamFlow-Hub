const express = require("express");
const router = express.Router();

const {
  managerDashboard,
  teamDashboard,
  myDashboard,
} = require("../services/dashboard.service");

const { protect, allowedTo } = require("../services/auth.service");

router.use(protect);

router.get("/manager", allowedTo("manager"), managerDashboard);

router.get("/team", allowedTo("team-lead"), teamDashboard);

router.get("/me", allowedTo("developer"), myDashboard);

module.exports = router;
