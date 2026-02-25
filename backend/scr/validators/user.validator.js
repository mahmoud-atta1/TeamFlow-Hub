const joi = require("joi");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

const getUsersSchema = joi.object({
  status: joi.string().valid("pending", "approved", "rejected"),
});

const userIdSchema = joi.object({
  id: joi.string().hex().length(24).required().messages({
    "string.length": "Invalid user id",
    "any.required": "User id is required",
  }),
});

const updateUserSchema = joi.object({
  name: joi.string().min(3).max(32),
  email: joi.string().email(),
  role: joi.string().valid("manager", "team-lead", "developer"),
  status: joi.string().valid("pending", "approved", "rejected"),
  profileImg: joi.string(),
  isActive: joi.boolean(),
});

const updateMeSchema = joi.object({
  name: joi.string().min(3).max(32),
  profileImg: joi.string(),
});

const changePasswordSchema = joi.object({
  currentPassword: joi.string().required().messages({
    "any.required": "Current password is required",
  }),

  newPassword: joi.string().min(6).required().messages({
    "string.min": "New password must be at least 6 characters",
    "any.required": "New password is required",
  }),

  passwordConfirm: joi.valid(joi.ref("newPassword")).required().messages({
    "any.only": "Password confirmation does not match",
    "any.required": "Password confirmation is required",
  }),
});

exports.getUsersValidator = validatorMiddleware({
  query: getUsersSchema,
});

exports.getUserValidator = validatorMiddleware({
  params: userIdSchema,
});

exports.updateUserValidator = validatorMiddleware({
  params: userIdSchema,
  body: updateUserSchema,
});

exports.deleteUserValidator = validatorMiddleware({
  params: userIdSchema,
});

exports.updateMeValidator = validatorMiddleware({
  body: updateMeSchema,
});

exports.changePasswordValidator = validatorMiddleware({
  body: changePasswordSchema,
});
