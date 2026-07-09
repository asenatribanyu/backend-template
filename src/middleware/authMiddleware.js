import jwt from "jsonwebtoken";
import models from "../model/index.js";
import config from "../config/config.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("AuthMiddleware");

const { User, Role, Permission } = models;

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      logger.warn("Unauthorized access attempt - no token", {
        path: req.originalUrl,
        ip: req.ip,
      });

      return res.status(401).json({
        meta: {
          code: 401,
          message: "Unauthorized",
        },
      });
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

      return res.status(401).json({
        meta: {
          code: 401,
          message: "Invalid or expired token",
        },
      });
    }

    const user = await User.findByPk(decoded.id, {
      include: [
        {
          model: Role,
          include: [
            {
              model: Permission,
              attributes: ["name"],
              through: {
                attributes: [],
              },
            },
          ],
        },
      ],
    });

    if (!user) {
      logger.warn("User not found for valid token", {
        userId: decoded.id,
      });

      return res.status(401).json({
        meta: {
          code: 401,
          message: "Unauthorized",
        },
      });
    }

    const permissions = user.Role?.Permissions?.map((p) => p.name) || [];

    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.Role?.name,
      scope: user.Role?.scope,
      permissions,
    };

    next();
  } catch (error) {
    logger.error("Auth middleware error", { error });

    return res.status(500).json({
      meta: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
};
