const globalError = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  const statusCode = error.statusCode || 500;
  const status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    return res.status(statusCode).json({
      success: false,
      message: error.message,
      error: {
        name: err.name,
        isOperational: err.isOperational,
      },
      stack: err.stack,
    });
  }

  return res.status(statusCode).json({
    success: false,
    status,
    message: error.message || "Something went wrong",
  });
};
module.exports = globalError;
