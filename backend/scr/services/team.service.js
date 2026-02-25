const asyncHandler = require("express-async-handler");

const Team = require("../models/team.model");
const User = require("../models/user.model");
const ApiError = require("../utils/apiError");

exports.createTeam = asyncHandler(async (req, res, next) => {
  const { name, teamLead } = req.body;

  const user = await User.findById(teamLead);
  if (!user || user.status !== "approved") {
    return next(new ApiError("Team lead must be approved", 400));
  }

  if (user.role !== "team-lead") {
    user.role = "team-lead";
    await user.save();
  }

  const team = await Team.create({
    name,
    managerId: req.user._id,
    teamLead,
    teamMembers: [teamLead],
  });

  res.status(201).json({
    success: true,
    data: team,
  });
});

exports.getTeams = asyncHandler(async (req, res) => {
  let filter = { isActive: true };

  if (req.user.role === "team-lead" || req.user.role === "developer") {
    filter.teamMembers = { $in: [req.user._id] };
  }

  const teams = await Team.find(filter)
    .populate("teamLead", "name email")
    .populate("teamMembers", "name email");

  res.status(200).json({
    success: true,
    results: teams.length,
    data: teams,
  });
});

exports.renameTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findByIdAndUpdate(
    req.params.id,
    { name: req.body.name },
    { new: true },
  );

  if (!team) {
    return next(new ApiError("Team not found", 404));
  }

  res.status(200).json({
    success: true,
    data: team,
  });
});

exports.addMember = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.body.teamMember);
  if (!user || user.status !== "approved") {
    return next(new ApiError("User not approved", 400));
  }

  const team = await Team.findByIdAndUpdate(
    req.params.id,
    {
      $addToSet: { teamMembers: user._id },
    },
    { new: true },
  );

  res.status(200).json({
    success: true,
    data: team,
  });
});

exports.removeMember = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ApiError("Team not found", 404));
  }

  if (team.teamLead.toString() === req.body.removeMember) {
    return next(new ApiError("Cannot remove team lead", 400));
  }

  const updated = await Team.findByIdAndUpdate(
    req.params.id,
    {
      $pull: { teamMembers: req.body.removeMember },
    },
    { new: true },
  );

  res.status(200).json({
    success: true,
    data: updated,
  });
});

exports.changeLead = asyncHandler(async (req, res, next) => {
  const newLead = await User.findById(req.body.teamLead);
  if (!newLead || newLead.status !== "approved") {
    return next(new ApiError("Lead not approved", 400));
  }

  const team = await Team.findById(req.params.id);
  if (!team) {
    return next(new ApiError("Team not found", 404));
  }

  const oldLead = team.teamLead;

  const updatedTeam = await Team.findByIdAndUpdate(
    req.params.id,
    {
      teamLead: newLead._id,
      $addToSet: { teamMembers: newLead._id },
    },
    { new: true },
  );

  await User.findByIdAndUpdate(newLead._id, { role: "team-lead" });

  res.status(200).json({
    success: true,
    data: updatedTeam,
  });
});

exports.deleteTeam = asyncHandler(async (req, res, next) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    return next(new ApiError("Team not found", 404));
  }

  team.isActive = false;
  await team.save();

  res.status(200).json({
    success: true,
    message: "Team deleted successfully",
  });
});
