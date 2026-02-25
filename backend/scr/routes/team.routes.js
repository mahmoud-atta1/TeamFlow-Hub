const express = require("express");
const router = express.Router();

const {
  createTeam,
  getTeams,
  renameTeam,
  addMember,
  removeMember,
  changeLead,
  deleteTeam,
} = require("../services/team.service");

const { protect, allowedTo } = require("../services/auth.service");

const {
  createTeamValidator,
  renameTeamValidator,
  addMemberValidator,
  removeMemberValidator,
  changeLeadValidator,
  deleteTeamValidator,
} = require("../validators/team.validator");

router.use(protect);

router.post("/", allowedTo("manager"), createTeamValidator, createTeam);
router.patch("/:id", allowedTo("manager"), renameTeamValidator, renameTeam);

router.patch(
  "/:id/add-member",
  allowedTo("manager", "team-lead"),
  addMemberValidator,
  addMember,
);

router.patch(
  "/:id/remove-member",
  allowedTo("manager", "team-lead"),
  removeMemberValidator,
  removeMember,
);

router.patch(
  "/:id/change-lead",
  allowedTo("manager"),
  changeLeadValidator,
  changeLead,
);

router.delete("/:id", allowedTo("manager"), deleteTeamValidator, deleteTeam);
router.get("/", getTeams);

module.exports = router;
