import { createLogger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";
const logger = createLogger("ErrorHandler");

export const errorHandler = (err, req, res, _next) => {
  logger.error("Unhandled Exception:", { error: err, path: req.originalUrl });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  if (err.name === "SequelizeValidationError" || err.name === "SequelizeUniqueConstraintError") {
    const errors = err.errors?.map((e) => ({ field: e.path, message: e.message })) || [];
    return sendError(res, "Validation Error", 400, null, errors);
  }

  if (err.name === "SequelizeForeignKeyConstraintError") {
    return sendError(
      res,
      "Cannot proceed because the resource is currently in use or depends on another resource",
      400,
    );
  }

  if (err.name === "MulterError") {
    return sendError(res, `Upload Error: ${err.message}`, 400);
  }

  return sendError(res, message, statusCode, err);
};
