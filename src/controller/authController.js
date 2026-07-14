import models from "../model/index.js";
const { db, User, Role, Profile, AuditLog, RefreshToken, PasswordResetToken, EmailVerificationToken } = models;
import { createLogger } from "../utils/logger.js";
const logger = createLogger("AuthController");
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config/constants.js";
import { buildAuditLog } from "../services/auditLog.js";
import { Op } from "sequelize";
import config from "../config/config.js";
import { parseUserAgent, getClientIp } from "../utils/parserUserAgent.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../services/generateToken.js";
import { emailQueue } from "../queue/emailQueue.js";
import crypto from "crypto";
import { sendSuccess, sendError } from "../utils/response.js";

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
      return sendError(res, "Username or email already exists", 400);
    }

    const userRole = await Role.findOne({ where: { name: "user" } });
    if (!userRole) {
      await t.rollback();
      return sendError(res, "User role not found", 404);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

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

    // Generate email verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const hashedVerifyToken = hashToken(verifyToken);

    await EmailVerificationToken.create(
      {
        userId: newUser.id,
        tokenHash: hashedVerifyToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      },
      { transaction: t },
    );

    await t.commit();

    // Send verification email (after commit — non-blocking)
    const verifyLink = `${config.app.frontendUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    await emailQueue.add("verify-email", {
      to: email.toLowerCase(),
      subject: "Verify Your Account",
      template: "verify-account",
      data: {
        verifyLink,
        userName: username,
      },
    });

    return sendSuccess(res, null, "User registered successfully. Please check your email to verify your account.", 201);
  } catch (error) {
    await t.rollback();
    logger.error("Registration failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
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

      return sendError(res, "Invalid email or password", 401);
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

      return sendError(res, "Invalid email or password", 401);
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

      return sendError(res, "Account is not verified", 403);
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

      return sendError(res, "Account is blocked", 403);
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

    return sendSuccess(
      res,
      {
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
      "Login successful",
      200,
    );
  } catch (error) {
    logger.error("Login failed:", { error });

    return sendError(res, "Internal Server Error", 500, error);
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

    return sendSuccess(res, null, "Logout successful", 200);
  } catch (error) {
    logger.error("Failed to logout:", { error });

    return sendError(res, "Internal Server Error", 500, error);
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

      return sendError(res, "Invalid refresh token", 401);
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

      return sendError(res, "Invalid refresh token", 401);
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

    return sendSuccess(
      res,
      {
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
      "Refresh token successful",
      200,
    );
  } catch (error) {
    await t.rollback();
    logger.error("Refresh token failed:", { error });

    return sendError(res, "Internal Server Error", 500, error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
      return sendSuccess(res, null, "If email exists, reset link has been sent", 200);
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

    return sendSuccess(res, null, "If email exists, reset link has been sent", 200);
  } catch (error) {
    logger.error("Forgot password failed:", { error });

    return sendError(res, "Internal Server Error", 500, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, email, password } = req.body;

    if (!token || !password) {
      logger.warn(`Password reset failed - missing token or password for email: ${email}`);
      return sendError(res, "Token and password are required", 400);
    }

    const user = await User.findOne({ where: { email } });

    if (!user) {
      logger.warn(`Password reset failed - user not found for email: ${email}`);
      return sendError(res, "Invalid token or expired", 400);
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
      return sendError(res, "Invalid token or expired", 400);
    }

    if (resetToken.expiresAt < new Date()) {
      await resetToken.destroy();
      return sendError(res, "Token expired", 400);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

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

    return sendSuccess(res, null, "Password has been reset successfully", 200);
  } catch (error) {
    logger.error("Reset password failed:", { error });

    return sendError(res, "Internal Server Error", 500, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token, email } = req.body;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user) {
      return sendError(res, "Invalid verification token", 400);
    }

    if (user.isVerified) {
      return sendSuccess(res, null, "Account is already verified", 200);
    }

    const hashedToken = hashToken(token);

    const verificationToken = await EmailVerificationToken.findOne({
      where: {
        userId: user.id,
        tokenHash: hashedToken,
      },
    });

    if (!verificationToken) {
      return sendError(res, "Invalid verification token", 400);
    }

    if (verificationToken.expiresAt < new Date()) {
      await verificationToken.destroy();
      return sendError(res, "Verification token expired. Please request a new one.", 400);
    }

    await user.update({
      isVerified: true,
      isVerifiedAt: new Date(),
    });

    await verificationToken.destroy();

    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        actor: { id: user.id, type: "USER" },
        action: "EMAIL_VERIFIED",
        entityType: "Auth",
        entityId: user.id,
        metadata: { email: user.email },
        req,
      }),
    );

    return sendSuccess(res, null, "Email verified successfully", 200);
  } catch (error) {
    logger.error("Email verification failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });

    if (!user || user.isVerified) {
      return sendSuccess(res, null, "If the email exists and is not verified, a verification link has been sent.", 200);
    }

    await EmailVerificationToken.destroy({ where: { userId: user.id } });

    const verifyToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = hashToken(verifyToken);

    await EmailVerificationToken.create({
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    });

    const verifyLink = `${config.app.frontendUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;

    await emailQueue.add("verify-email", {
      to: user.email,
      subject: "Verify Your Account",
      template: "verify-account",
      data: {
        verifyLink,
        userName: user.username,
      },
    });

    return sendSuccess(res, null, "If the email exists and is not verified, a verification link has been sent.", 200);
  } catch (error) {
    logger.error("Resend verification failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyEmail, resendVerification };
