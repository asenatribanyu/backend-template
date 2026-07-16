import models from "../model/index.js";
const { db, User, Role, Profile, AuditLog, RefreshToken, PasswordResetToken, EmailVerificationToken } = models;
import { createLogger } from "../utils/logger.js";
const logger = createLogger("AuthService");
import bcrypt from "bcrypt";
import { BCRYPT_SALT_ROUNDS } from "../config/constants.js";
import { buildAuditLog } from "./auditLog.js";
import { Op } from "sequelize";
import config from "../config/config.js";
import { parseUserAgent, getClientIp } from "../utils/parserUserAgent.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "./generateToken.js";
import { emailQueue } from "../queue/emailQueue.js";
import crypto from "crypto";
import AppError from "../utils/AppError.js";

const registerUser = async (data, req) => {
  const { username, email, password, firstName, lastName } = data;
  const t = await db.transaction();

  try {
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
      },
      transaction: t,
    });

    if (existingUser) {
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
        { transaction: t },
      );
      await t.commit();
      throw new AppError("Username or email already exists", 400);
    }

    const userRole = await Role.findOne({ where: { name: "user" }, transaction: t });
    if (!userRole) {
      await t.rollback();
      throw new AppError("User role not found", 404);
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
      actor: { id: newUser.id, type: "USER" },
      action: "REGISTER",
      entityType: "User",
      entityId: newUser.id,
      after: userData,
      metadata: { method: "email" },
      req,
    });

    await AuditLog.create(auditLog, { transaction: t });

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

    const verifyLink = `${config.app.frontendUrl}/verify-email?token=${verifyToken}&email=${encodeURIComponent(email.toLowerCase())}`;
    await emailQueue.add("verify-email", {
      to: email.toLowerCase(),
      subject: "Verify Your Account",
      template: "verify-account",
      data: { verifyLink, userName: username },
    });

    return null;
  } catch (error) {
    if (!t.finished === "commit") {
      await t.rollback();
    }
    throw error;
  }
};

const loginUser = async (data, req) => {
  const { login, password } = data;

  const user = await User.findOne({
    where: {
      [Op.or]: [{ email: login.toLowerCase() }, { username: login.toLowerCase() }],
    },
    include: [
      { model: Profile, as: "Profile" },
      { model: Role, as: "Role" },
    ],
  });

  if (!user) {
    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "LOGIN_FAILED",
        entityType: "Auth",
        metadata: { identifier: login, reason: "user_not_found" },
        req,
      }),
    );
    throw new AppError("Invalid email or password", 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "LOGIN_FAILED",
        entityType: "Auth",
        metadata: { identifier: login, reason: "invalid_password" },
        req,
      }),
    );
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isVerified) {
    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "LOGIN_FAILED",
        entityType: "Auth",
        metadata: { identifier: login, reason: "unverified_account" },
        req,
      }),
    );
    throw new AppError("Account is not verified", 403);
  }

  if (user.isBlocked) {
    await AuditLog.create(
      buildAuditLog({
        type: "EVENT",
        action: "LOGIN_FAILED",
        entityType: "Auth",
        metadata: { identifier: login, reason: "account_blocked" },
        req,
      }),
    );
    throw new AppError("Account is blocked", 403);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const hashedRefreshToken = hashToken(refreshToken);

  await user.update({ lastLoginAt: new Date() });

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
      actor: { id: user.id, type: "USER" },
      action: "LOGIN_SUCCESS",
      entityType: "Auth",
      metadata: { identifier: login, method: "email" },
      req,
    }),
  );

  logger.info(`Login successful for user: ${login}`);

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.Role.name,
      profile: user.Profile,
    },
    accessToken,
    refreshToken,
  };
};

const logoutUser = async (userId, data, req) => {
  const { refreshToken } = data;
  const hashed = hashToken(refreshToken);

  const token = await RefreshToken.findOne({
    where: { tokenHash: hashed, userId },
  });

  if (token) {
    await token.update({ revokedAt: new Date() });
  }

  await AuditLog.create(
    buildAuditLog({
      type: "EVENT",
      action: "LOGOUT",
      entityType: "Auth",
      entityId: userId,
      actor: { id: userId, type: "USER" },
      metadata: { ip: getClientIp(req), device: token?.deviceInfo || null },
      req,
    }),
  );

  return null;
};

const refreshUserToken = async (data, req) => {
  const t = await db.transaction();
  try {
    const { refreshToken } = data;
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
          metadata: { reason: "invalid_or_revoked_token" },
          req,
        }),
        { transaction: t },
      );

      if (token && token.revokedAt) {
        logger.warn(`SECURITY ALERT: Token reuse detected for user ${token.userId}. Revoking all sessions.`);
        await RefreshToken.destroy({ where: { userId: token.userId }, transaction: t });
        await t.commit();
        throw new AppError("Security alert: Token reuse detected. All sessions have been revoked.", 401);
      }
      await t.commit();
      throw new AppError("Invalid refresh token", 401);
    }

    const user = await User.findByPk(token.userId, {
      include: [
        { model: Role, as: "Role" },
        { model: Profile, as: "Profile" },
      ],
      transaction: t,
    });

    if (!user) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "REFRESH_TOKEN_FAILED",
          entityType: "Auth",
          metadata: { reason: "user_not_found" },
          req,
        }),
        { transaction: t },
      );
      await t.commit();
      throw new AppError("Invalid refresh token", 401);
    }

    if (user.isBlocked) {
      await AuditLog.create(
        buildAuditLog({
          type: "EVENT",
          action: "REFRESH_TOKEN_FAILED",
          entityType: "Auth",
          metadata: { reason: "account_blocked" },
          req,
        }),
        { transaction: t },
      );
      await token.update({ revokedAt: new Date() }, { transaction: t });
      await t.commit();
      throw new AppError("Account is blocked", 403);
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();
    const newHashed = hashToken(newRefreshToken);

    await RefreshToken.update({ revokedAt: new Date() }, { where: { id: token.id }, transaction: t });

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
        actor: { id: user.id, type: "USER" },
        metadata: { ip: getClientIp(req), device: parseUserAgent(req) },
        req,
      }),
      { transaction: t },
    );

    await t.commit();

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.Role.name,
        profile: user.Profile,
      },
      accessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    if (!t.finished === "commit") {
      await t.rollback();
    }
    throw error;
  }
};

const processForgotPassword = async (data, req) => {
  const { email } = data;
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) {
    return null; // Return successfully even if user not found for security
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashToken(resetToken);

  await PasswordResetToken.destroy({ where: { userId: user.id } });

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
      actor: { id: user.id, type: "USER" },
      metadata: { email: user.email },
      req,
    }),
  );

  const resetLink = `${config.app.frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email.toLowerCase())}`;
  await emailQueue.add("reset-password-email", {
    to: user.email,
    subject: "Reset Password",
    template: "reset-password",
    data: { resetLink, userName: user.username },
  });

  return null;
};

const processResetPassword = async (data, req) => {
  const { token, email, password } = data;

  if (!token || !password) {
    logger.warn(`Password reset failed - missing token or password for email: ${email}`);
    throw new AppError("Token and password are required", 400);
  }

  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    logger.warn(`Password reset failed - user not found for email: ${email}`);
    throw new AppError("Invalid token or expired", 400);
  }

  const hashedToken = hashToken(token);
  const resetToken = await PasswordResetToken.findOne({
    where: { userId: user.id, tokenHash: hashedToken },
  });

  if (!resetToken) {
    logger.warn(`Password reset failed - invalid token for email: ${email}`);
    throw new AppError("Invalid token or expired", 400);
  }

  if (resetToken.expiresAt < new Date()) {
    await resetToken.destroy();
    throw new AppError("Token expired", 400);
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  await user.update({ password: hashedPassword });
  await RefreshToken.destroy({ where: { userId: user.id } });

  await AuditLog.create(
    buildAuditLog({
      type: "EVENT",
      action: "PASSWORD_RESET",
      entityType: "Auth",
      entityId: user.id,
      actor: { id: user.id, type: "USER" },
      metadata: { email: user.email },
      req,
    }),
  );

  await resetToken.destroy();
  return null;
};

const verifyUserEmail = async (data, req) => {
  const { token, email } = data;
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user) throw new AppError("Invalid verification token", 400);
  if (user.isVerified) return "Account is already verified"; // Special case handled returning message

  const hashedToken = hashToken(token);
  const verificationToken = await EmailVerificationToken.findOne({
    where: { userId: user.id, tokenHash: hashedToken },
  });

  if (!verificationToken) throw new AppError("Invalid verification token", 400);
  if (verificationToken.expiresAt < new Date()) {
    await verificationToken.destroy();
    throw new AppError("Verification token expired. Please request a new one.", 400);
  }

  await user.update({ isVerified: true, isVerifiedAt: new Date() });
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

  return null;
};

const resendUserVerification = async (data, _req) => {
  const { email } = data;
  const user = await User.findOne({ where: { email: email.toLowerCase() } });

  if (!user || user.isVerified) return null;

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
    data: { verifyLink, userName: user.username },
  });

  return null;
};

export const authService = {
  registerUser,
  loginUser,
  logoutUser,
  refreshUserToken,
  processForgotPassword,
  processResetPassword,
  verifyUserEmail,
  resendUserVerification,
};
