import logger from "../../utils/logger.js";

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
        message: err.message,
      }));

      logger.warn("Validation error", {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        body: req.body,
        errors: formattedErrors,
      });

      return res.status(400).json({
        meta: {
          code: 400,
          message: "Validation error",
        },
        errors: formattedErrors,
      });
    }

    next();
  };
};
