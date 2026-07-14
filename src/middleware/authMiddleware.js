import jwt from "jsonwebtoken";
import models from "../model/index.js";
import config from "../config/config.js";
import { createLogger } from "../utils/logger.js";
import { sendError } from "../utils/response.js";
import { redis } from "../libs/redis.js";
const logger = createLogger("AuthMiddleware");

const { User, Role, Permission } = models;

const PERMISSION_CACHE_TTL = 300; // 5 minutes

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Unauthorized access attempt - no token", {
        path: req.originalUrl,
        ip: req.ip,
      });

      return sendError(res, "Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, config.app.jwt);
    } catch (err) {
      logger.warn("Invalid/expired token", {
        error: err,
        ip: req.ip,
        path: req.originalUrl,
      });

      return sendError(res, "Invalid or expired token", 401);
    }

    // Try Redis cache first
    const cacheKey = `user:permissions:${decoded.id}`;
    const cached = await redis.get(cacheKey).catch(() => null);

    if (cached) {
      req.user = JSON.parse(cached);
      return next();
    }

    // Cache miss — query DB
    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          include: [
            {
              model: Permission,
              attributes: ["name"],
              through: { attributes: [] },
            },
          ],
        },
      ],
    });

    if (!user) {
      logger.warn("User not found for valid token", { userId: decoded.id });
      return sendError(res, "Unauthorized", 401);
    }

    if (user.isBlocked) {
      logger.warn("Blocked user attempted to access API", { userId: decoded.id });
      return sendError(res, "Account is blocked", 403);
    }

    const permissions = user.Role?.Permissions?.map((p) => p.name) || [];

    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.Role?.name,
      scope: user.Role?.scope,
      permissions,
    };

    // Cache in Redis
    await redis.setex(cacheKey, PERMISSION_CACHE_TTL, JSON.stringify(userData)).catch((err) => {
      logger.warn("Failed to cache user permissions", { error: err });
    });

    req.user = userData;
    next();
  } catch (error) {
    logger.error("Auth middleware error", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

/**
 * Invalidate cached permissions for a user.
 * Call this when roles/permissions change.
 */
export const invalidateUserPermissionCache = async (userId) => {
  const key = `user:permissions:${userId}`;
  await redis.del(key).catch(() => {});
};
