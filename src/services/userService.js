import models from "../model/index.js";
const { db, User, Role, AuditLog, Profile } = models;
import { createLogger } from "../utils/logger.js";
const logger = createLogger("UserService");
import bcrypt from "bcrypt";
import { buildAuditLog } from "./auditLog.js";
import { BCRYPT_SALT_ROUNDS } from "../config/constants.js";
import { invalidateUserPermissionCache } from "../middleware/authMiddleware.js";
import path from "path";
import fs from "fs";
import { paginate, getPaginationParams } from "../utils/pagination.js";
import AppError from "../utils/AppError.js";

const getUserById = async (userId) => {
  const user = await User.findOne({
    where: { id: userId },
    include: [
      { model: Profile, as: "Profile" },
      { model: Role, as: "Role", attributes: ["name", "scope"] },
    ],
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }
  return user;
};

const updateUser = async (userId, data, req) => {
  const t = await db.transaction();
  try {
    const { username, email, phone, password, profile } = data;

    const user = await User.findByPk(userId, {
      include: "Profile",
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      throw new AppError("User not found", 404);
    }

    const before = user.toJSON();
    const userData = {};

    if (username !== undefined) userData.username = username.toLowerCase();
    if (email !== undefined) userData.email = email.toLowerCase();
    if (phone !== undefined) userData.phone = phone;

    if (password) {
      userData.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    }

    if (Object.keys(userData).length > 0) {
      await user.update(userData, { transaction: t });
    }

    if (profile) {
      if (user.Profile) {
        await user.Profile.update(profile, { transaction: t });
      } else {
        await Profile.create({ ...profile, userId }, { transaction: t });
      }
    }

    const after = await User.findByPk(userId, {
      include: "Profile",
      transaction: t,
    });

    const auditLog = buildAuditLog({
      type: "UPDATE",
      actor: { id: userId, type: "USER" },
      action: "UPDATE_ME",
      entityType: "User",
      entityId: userId,
      before,
      after: after.toJSON(),
      req,
    });

    await AuditLog.create(auditLog, { transaction: t });
    await t.commit();

    return after;
  } catch (error) {
    if (!t.finished === "commit") {
      await t.rollback();
    }
    throw error;
  }
};

const updateAvatar = async (userId, file, baseUrl, req) => {
  if (!file) {
    throw new AppError("Avatar file is required", 400);
  }

  const avatarUrl = `storage/public/avatar/${file.filename}`;
  let profile = await Profile.findOne({ where: { userId } });

  const oldAvatarUrl = profile?.avatarUrl || null;
  const before = profile ? profile.toJSON() : null;

  if (!profile) {
    profile = await Profile.create({
      userId,
      firstName: "Unknown",
      lastName: "User",
      avatarUrl,
    });
  } else {
    await profile.update({ avatarUrl });
  }

  if (oldAvatarUrl) {
    const oldPath = path.join("storage/public/avatar", path.basename(oldAvatarUrl));
    fs.unlink(oldPath, (err) => {
      if (err) logger.warn("Failed to delete old avatar", { error: err });
    });
  }

  const after = profile.toJSON();

  const auditLog = buildAuditLog({
    type: before ? "UPDATE" : "CREATE",
    actor: { id: userId, type: "USER" },
    action: "UPLOAD_AVATAR",
    entityType: "Profile",
    entityId: profile.id,
    before,
    after,
    metadata: {
      updatedField: "avatarUrl",
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
    },
    req,
  });

  await AuditLog.create(auditLog);

  return { avatarUrl: `${baseUrl}/${avatarUrl}` };
};

const getAllUsers = async (query) => {
  const paginationParams = getPaginationParams(query);

  const { data, pagination } = await paginate(User, {
    ...paginationParams,
    sortBy: paginationParams.sortBy || "createdAt",
    order: paginationParams.order || "desc",
    attributes: { exclude: ["password"] },
    include: [
      { model: Role, as: "Role", attributes: ["id", "name"] },
      { model: Profile, as: "Profile" },
    ],
  });

  return { data, pagination };
};

const updateRole = async (userId, updaterId, roleId, req) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);

  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError("Role not found", 404);

  const before = user.toJSON();
  await user.update({ roleId });

  await AuditLog.create(
    buildAuditLog({
      type: "UPDATE",
      actor: { id: updaterId, type: "USER" },
      action: "UPDATE_USER_ROLE",
      entityType: "User",
      entityId: user.id,
      before,
      after: user.toJSON(),
      req,
    }),
  );

  await invalidateUserPermissionCache(user.id);
  return null;
};

const updateStatus = async (userId, updaterId, isBlocked, req) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);

  const before = user.toJSON();
  await user.update({ isBlocked });

  await AuditLog.create(
    buildAuditLog({
      type: "UPDATE",
      actor: { id: updaterId, type: "USER" },
      action: isBlocked ? "BLOCK_USER" : "UNBLOCK_USER",
      entityType: "User",
      entityId: user.id,
      before,
      after: user.toJSON(),
      req,
    }),
  );

  await invalidateUserPermissionCache(user.id);
  return null;
};

const removeUser = async (userId, removerId, req) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError("User not found", 404);

  const before = user.toJSON();
  await user.destroy();

  await AuditLog.create(
    buildAuditLog({
      type: "DELETE",
      actor: { id: removerId, type: "USER" },
      action: "DELETE_USER",
      entityType: "User",
      entityId: user.id,
      before,
      after: null,
      req,
    }),
  );

  await invalidateUserPermissionCache(user.id);
  return null;
};

export const userService = {
  getUserById,
  updateUser,
  updateAvatar,
  getAllUsers,
  updateRole,
  updateStatus,
  removeUser,
};
