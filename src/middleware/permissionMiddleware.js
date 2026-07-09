import { createLogger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";
const logger = createLogger("PermissionMiddleware");

export const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, "Unauthorized", 401);
    }

    const userPermissions = req.user.permissions || [];

    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      logger.warn("Permission denied", {
        userId: req.user.id,
        requiredPermission,
        userPermissions,
        path: req.originalUrl,
      });

      return sendError(res, "Forbidden - missing permission", 403);
    }

    next();
  };
};
