const ApiError = require("../utils/apiError");

const validator = (schema) => {
  return async (req, res, next) => {
    const validationOptions = { abortEarly: false };

    try {
      if (schema.body) {
        await schema.body.validate(req.body, validationOptions);
      }

      if (schema.params) {
        await schema.params.validate(req.params, validationOptions);
      }

      if (schema.query) {
        await schema.query.validate(req.query, validationOptions);
      }

      next();
    } catch (err) {
      const errors = err.details.map((val) => val.message).join(", ");
      next(new ApiError(errors, 400));
    }
  };
};

module.exports = validator;
