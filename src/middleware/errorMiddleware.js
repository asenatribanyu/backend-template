import { createLogger } from "../utils/logger.js";
const logger = createLogger("ErrorHandler");

export const errorHandler = (err, req, res, next) => {
  logger.error("Unhandled Exception:", { error: err, path: req.originalUrl });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    return res.status(400).json({
      meta: {
        code: 400,
        message: "Validation Error",
      },
      data: err.errors?.map((e) => ({ field: e.path, message: e.message })) || [],
    });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({
      meta: {
        code: 400,
        message: `Upload Error: ${err.message}`,
      },
    });
  }

  res.status(statusCode).json({
    meta: {
      code: statusCode,
      message,
    },
    ...(process.env.NODE_ENV === "DEVELOPMENT" && { stack: err.stack }),
  });
};
