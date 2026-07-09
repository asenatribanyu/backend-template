import { createLogger } from "../utils/logger.js";
const logger = createLogger("PermissionMiddleware");

export const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        meta: { code: 401, message: "Unauthorized" },
      });
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

      return res.status(403).json({
        meta: {
          code: 403,
          message: "Forbidden - missing permission",
        },
      });
    }

    next();
  };
};
