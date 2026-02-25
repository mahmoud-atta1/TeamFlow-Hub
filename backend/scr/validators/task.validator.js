const joi = require("joi");
const validator = require("../middlewares/validatorMiddleware");

const idSchema = joi.string().hex().length(24).required();

const createTaskSchema = joi.object({
  title: joi.string().min(3).required(),
  description: joi.string().allow(""),
  priority: joi.string().valid("low", "medium", "high"),
  assignedTo: idSchema.required(),
  teamId: idSchema,
});

const createSubTaskSchema = joi.object({
  title: joi.string().min(3).required(),
  description: joi.string().allow(""),
  priority: joi.string().valid("low", "medium", "high"),
  assignedTo: idSchema,
  teamId: idSchema,
  parentTaskId: idSchema.required(),
});

const changeStatusSchema = joi.object({
  status: joi.string().valid("todo", "in-progress", "done").required(),
});

const updateTaskSchema = joi
  .object({
    title: joi.string().min(3),
    description: joi.string().allow(""),
    priority: joi.string().valid("low", "medium", "high"),
  })
  .min(1);

exports.createTaskValidator = validator({
  body: createTaskSchema,
});

exports.createSubTaskValidator = validator({
  body: createSubTaskSchema,
});

exports.changeStatusValidator = validator({
  params: joi.object({ id: idSchema }),
  body: changeStatusSchema,
});

exports.getTaskValidator = validator({
  params: joi.object({ id: idSchema }),
});

exports.updateTaskValidator = validator({
  params: joi.object({ id: idSchema }),
  body: updateTaskSchema,
});

exports.deleteTaskValidator = validator({
  params: joi.object({ id: idSchema }),
});
