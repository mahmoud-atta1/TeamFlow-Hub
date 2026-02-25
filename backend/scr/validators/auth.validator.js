const joi = require("joi");
const validatorMiddleware = require("../middlewares/validatorMiddleware");

const signupSchema = joi.object({
  name: joi.string().min(3).max(32).required().messages({
    "string.min": "Name must be at least 3 characters",
    "any.required": "Name is required",
  }),

  email: joi.string().email().required().messages({
    "string.email": "Invalid email format",
    "any.required": "Email is required",
  }),

  password: joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
});

const loginSchema = joi.object({
  email: joi.string().email().required().messages({
    "string.email": "Please enter a valid email",
    "any.required": "Email is required",
  }),

  password: joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

exports.signupValidator = validatorMiddleware({
  body: signupSchema,
});

exports.loginValidator = validatorMiddleware({
  body: loginSchema,
});
