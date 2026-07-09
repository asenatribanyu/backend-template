import models from "../model/index.js";
const { db, User, Role, Profile, AuditLog, RefreshToken, PasswordResetToken } = models;
import { createLogger } from "../utils/logger.js";
const logger = createLogger("AuthController");
import bcrypt from "bcrypt";
import { buildAuditLog } from "../services/auditLog.js";
import { Op } from "sequelize";
import config from "../config/config.js";
import { parseUserAgent, getClientIp } from "../utils/parserUserAgent.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../services/generateToken.js";
import { emailQueue } from "../queue/emailQueue.js";
import crypto from "crypto";

const register = async (req, res) => {
  const t = await db.transaction();
  try {
    const { username, email, password, firstName, lastName } = req.body;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
      },
    });

    if (existingUser) {
      await t.rollback();
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "REGISTER_FAILED",
          entityType: "Auth",
          metadata: {
            identifier: email,
            reason: "email_or_username_exists",
          },
          req,
        }),
      );
      return res.status(400).json({
        meta: { code: 400, message: "Username or email already exists" },
      });
    }

    const userRole = await Role.findOne({ where: { name: "user" } });
    if (!userRole) {
      await t.rollback();
      return res.status(404).json({
        meta: { code: 404, message: "User role not found" },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create(
      {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        roleId: userRole.id,
      },
      { transaction: t },
    );
    await Profile.create({ firstName, lastName, userId: newUser.id }, { transaction: t });

    const userData = newUser.toJSON();
    delete userData.password;

    const auditLog = buildAuditLog({
      type: "CREATE",
      actor: {
        id: newUser.id,
        type: "USER",
      },
      action: "REGISTER",
      entityType: "User",
      entityId: newUser.id,
      after: userData,
      metadata: {
        method: "email",
      },
      req,
    });

    await AuditLog.create(auditLog, { transaction: t });
    await t.commit();

    return res.status(201).json({
      meta: {
        code: 201,
        message: "User registered successfully",
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error("Registration failed:", { error });
    return res.status(500).json({
      meta: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
};

const login = async (req, res) => {
  try {
    const { login, password } = req.body;

    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: login }, { username: login }],
      },
      include: [
        {
          model: Profile,
          as: "Profile",
        },
        {
          model: Role,
          as: "Role",
        },
      ],
    });

    if (!user) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "LOGIN_FAILED",
          entityType: "Auth",
          metadata: {
            identifier: login,
            reason: "user_not_found",
          },
          req,
        }),
      );

      return res.status(401).json({
        meta: { code: 401, message: "Invalid email or password" },
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "LOGIN_FAILED",
          entityType: "Auth",
          metadata: {
            identifier: login,
            reason: "invalid_password",
          },
          req,
        }),
      );

      return res.status(401).json({
        meta: { code: 401, message: "Invalid email or password" },
      });
    }

    if (!user.isVerified) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "LOGIN_FAILED",
          entityType: "Auth",
          metadata: {
            identifier: login,
            reason: "unverified_account",
          },
          req,
        }),
      );

      return res.status(403).json({
        meta: { code: 403, message: "Account is not verified" },
      });
    }

    if (user.isBlocked) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "LOGIN_FAILED",
          entityType: "Auth",
          metadata: {
            identifier: login,
            reason: "account_blocked",
          },
          req,
        }),
      );

      return res.status(403).json({
        meta: { code: 403, message: "Account is blocked" },
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const hashedRefreshToken = hashToken(refreshToken);

    await RefreshToken.create({
      userId: user.id,
      tokenHash: hashedRefreshToken,
      expiresAt: new Date(Date.now() + config.app.refreshExpireIn * 24 * 60 * 60 * 1000),
      deviceInfo: parseUserAgent(req),
      ipAddress: getClientIp(req),
    });

    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        actor: {
          id: user.id,
          type: "USER",
        },
        action: "LOGIN_SUCCESS",
        entityType: "Auth",
        metadata: {
          identifier: login,
          method: "email",
        },
        req,
      }),
    );

    logger.info(`Login successful for user: ${login}`);

    return res.status(200).json({
      meta: {
        code: 200,
        message: "Login successful",
      },
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.Role.name,
          profile: user.Profile,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    logger.error("Login failed:", { error });

    return res.status(500).json({
      meta: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const { refreshToken } = req.body;

    const hashed = hashToken(refreshToken);

    const token = await RefreshToken.findOne({
      where: {
        tokenHash: hashed,
        userId,
      },
    });

    if (token) {
      await token.update({
        revokedAt: new Date(),
      });
    }

    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "LOGOUT",
        entityType: "Auth",
        entityId: userId,
        actor: {
          id: userId,
          type: "USER",
        },
        metadata: {
          ip: getClientIp(req),
          device: token?.deviceInfo || null,
        },
        req,
      }),
    );

    return res.json({
      meta: {
        code: 200,
        message: "Logout successful",
      },
    });
  } catch (error) {
    logger.error("Failed to logout:", { error });

    return res.status(500).json({
      meta: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
};

const refreshToken = async (req, res) => {
  const t = await db.transaction();

  try {
    const { refreshToken } = req.body;

    const hashed = hashToken(refreshToken);

    const token = await RefreshToken.findOne({
      where: { tokenHash: hashed },
      transaction: t,
    });

    if (!token || token.revokedAt || token.expiresAt < new Date()) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "REFRESH_TOKEN_FAILED",
          entityType: "Auth",
          metadata: {
            reason: "invalid_or_revoked_token",
          },
          req,
        }),
        { transaction: t },
      );

      await t.rollback();

      return res.status(401).json({
        meta: { code: 401, message: "Invalid refresh token" },
      });
    }

    const user = await User.findByPk(token.userId, {
      include: [
        {
          model: Role,
          as: "Role",
        },
        {
          model: Profile,
          as: "Profile",
        },
      ],
      transaction: t,
    });

    if (!user) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "REFRESH_TOKEN_FAILED",
          entityType: "Auth",
          metadata: {
            reason: "user_not_found",
          },
          req,
        }),
        { transaction: t },
      );

      await t.rollback();

      return res.status(401).json({
        meta: { code: 401, message: "Invalid refresh token" },
      });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newHashed = hashToken(newRefreshToken);

    await RefreshToken.update(
      {
        revokedAt: new Date(),
      },
      {
        where: { id: token.id },
        transaction: t,
      },
    );

    await RefreshToken.create(
      {
        userId: user.id,
        tokenHash: newHashed,
        expiresAt: new Date(Date.now() + config.app.refreshExpireIn * 24 * 60 * 60 * 1000),
        deviceInfo: parseUserAgent(req),
        ipAddress: getClientIp(req),
        replacedByToken: token.id,
      },
      { transaction: t },
    );

    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "REFRESH_TOKEN_SUCCESS",
        entityType: "Auth",
        entityId: user.id,
        actor: {
          id: user.id,
          type: "USER",
        },
        metadata: {
          ip: getClientIp(req),
          device: parseUserAgent(req),
        },
        req,
      }),
      { transaction: t },
    );

    await t.commit();

    return res.status(200).json({
      meta: {
        code: 200,
        message: "Refresh token successful",
      },
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.Role.name,
          profile: user.Profile,
        },
        accessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    await t.rollback();
    logger.error("Refresh token failed:", { error });

    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(200).json({
        meta: {
          code: 200,
          message: "If email exists, reset link has been sent",
        },
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = hashToken(resetToken);

    await PasswordResetToken.destroy({
      where: { userId: user.id },
    });

    await PasswordResetToken.create({
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15),
    });

    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "FORGOT_PASSWORD_REQUESTED",
        entityType: "Auth",
        entityId: user.id,
        actor: {
          id: user.id,
          type: "USER",
        },
        metadata: {
          email: user.email,
        },
        req,
      }),
    );

    const resetLink = `${config.app.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await emailQueue.add("reset-password-email", {
      to: user.email,
      subject: "Reset Password",
      template: "reset-password",
      data: {
        resetLink,
        userName: user.username,
      },
    });

    return res.status(200).json({
      meta: {
        code: 200,
        message: "If email exists, reset link has been sent",
      },
    });
  } catch (error) {
    logger.error("Forgot password failed:", { error });

    return res.status(500).json({
      meta: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !password) {
      logger.warn(`Password reset failed - missing token or password for email: ${email}`);
      return res.status(400).json({
        meta: {
          code: 400,
          message: "Token and password are required",
        },
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      logger.warn(`Password reset failed - user not found for email: ${email}`);
      return res.status(400).json({
        meta: {
          code: 400,
          message: "Invalid token or expired",
        },
      });
    }

    const hashedToken = hashToken(token);

    const resetToken = await PasswordResetToken.findOne({
      where: {
        userId: user.id,
        tokenHash: hashedToken,
      },
    });

    if (!resetToken) {
      logger.warn(`Password reset failed - invalid token for email: ${email}`);
      return res.status(400).json({
        meta: {
          code: 400,
          message: "Invalid token or expired",
        },
      });
    }

    if (resetToken.expiresAt < new Date()) {
      await resetToken.destroy();
      return res.status(400).json({
        meta: {
          code: 400,
          message: "Token expired",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await user.update({
      password: hashedPassword,
    });

    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "PASSWORD_RESET",
        entityType: "Auth",
        entityId: user.id,
        actor: {
          id: user.id,
          type: "USER",
        },
        metadata: {
          email: user.email,
        },
        req,
      }),
    );
    await resetToken.destroy();

    return res.status(200).json({
      meta: {
        code: 200,
        message: "Password has been reset successfully",
      },
    });
  } catch (error) {
    logger.error("Reset password failed:", { error });

    return res.status(500).json({
      meta: {
        code: 500,
        message: "Internal Server Error",
      },
    });
  }
};

export { register, login, logout, refreshToken, forgotPassword, resetPassword };
