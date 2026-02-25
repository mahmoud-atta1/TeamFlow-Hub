const joi = require("joi");
const validator = require("../middlewares/validatorMiddleware");


const idSchema = joi.string().hex().length(24).required();

const createTeamSchema = joi.object({
  name: joi.string().min(3).required(),
  teamLead: idSchema,
});

const renameTeamSchema = joi.object({
  name: joi.string().min(3).required(),
});

const addMemberSchema = joi.object({
  teamMember: idSchema,
});

const removeMemberSchema = joi.object({
  removeMember: idSchema,
});

const changeLeadSchema = joi.object({
  teamLead: idSchema,
});


exports.createTeamValidator = validator({
  body: createTeamSchema,
});

exports.renameTeamValidator = validator({
  params: joi.object({ id: idSchema }),
  body: renameTeamSchema,
});

exports.addMemberValidator = validator({
  params: joi.object({ id: idSchema }),
  body: addMemberSchema,
});

exports.removeMemberValidator = validator({
  params: joi.object({ id: idSchema }),
  body: removeMemberSchema,
});

exports.changeLeadValidator = validator({
  params: joi.object({ id: idSchema }),
  body: changeLeadSchema,
});

exports.deleteTeamValidator = validator({
  params: joi.object({ id: idSchema }),
});