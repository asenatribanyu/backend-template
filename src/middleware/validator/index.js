import { createLogger } from "../../utils/logger.js";
import { sendError } from "../../utils/response.js";
const logger = createLogger("Validator");

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join("."),
        message: err.message.replace(/"/g, ""),
      }));

      logger.warn("Validation error", {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        errors: formattedErrors,
      });

      return sendError(res, "Validation error", 400, null, formattedErrors);
    }

    next();
  };
};
