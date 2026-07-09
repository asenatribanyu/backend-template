import models from "../model/index.js";
const { db, User, Role, AuditLog, Profile } = models;
import { createLogger } from "../utils/logger.js";
const logger = createLogger("UserController");
import bcrypt from "bcrypt";
import { buildAuditLog } from "../services/auditLog.js";
import path from "path";
import fs from "fs";
import { sendSuccess, sendError } from "../utils/response.js";

const show = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Profile,
          as: "Profile",
        },
        {
          model: Role,
          as: "Role",
          attributes: ["name", "scope"],
        },
      ],
      attributes: { exclude: ["password"] },
    });
    if (!user) {
      return sendError(res, "User not found", 404);
    }
    return sendSuccess(res, user, "User found", 200);
  } catch (error) {
    logger.error("Failed to show user", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const update = async (req, res) => {
  const t = await db.transaction();

  try {
    const userId = req.user.id;

    const { username, email, phone, password, profile } = req.body;

    const user = await User.findByPk(userId, {
      include: "Profile",
      transaction: t,
    });

    if (!user) {
      if (!t.finished) await t.rollback();
      return sendError(res, "User not found", 404);
    }

    const before = user.toJSON();

    const userData = {};

    if (username !== undefined) userData.username = username;
    if (email !== undefined) userData.email = email;
    if (phone !== undefined) userData.phone = phone;

    if (password) {
      userData.password = await bcrypt.hash(password, 10);
    }

    if (Object.keys(userData).length > 0) {
      await user.update(userData, { transaction: t });
    }

    if (profile) {
      if (user.Profile) {
        await user.Profile.update(profile, { transaction: t });
      } else {
        await Profile.create(
          {
            ...profile,
            userId,
          },
          { transaction: t },
        );
      }
    }

    const after = await User.findByPk(userId, {
      include: "Profile",
      transaction: t,
    });

    const auditLog = buildAuditLog({
      type: "UPDATE",
      actor: {
        id: userId,
        type: "USER",
      },
      action: "UPDATE_ME",
      entityType: "User",
      entityId: userId,
      before,
      after: after.toJSON(),
      req,
    });

    await AuditLog.create(auditLog, { transaction: t });

    await t.commit();

    return sendSuccess(res, after, "Updated successfully", 200);
  } catch (error) {
    if (!t.finished) await t.rollback();

    logger.error("Failed to update user", { error });

    return sendError(res, "Internal Server Error", 500, error);
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return sendError(res, "Avatar file is required", 400);
    }

    const avatarUrl = `storage/avatar/${req.file.filename}`;

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
      const oldPath = path.join("storage/avatar", path.basename(oldAvatarUrl));

      fs.unlink(oldPath, (err) => {
        if (err) {
          logger.warn("Failed to delete old avatar", { error: err });
        }
      });
    }

    const after = profile.toJSON();

    const auditLog = buildAuditLog({
      type: before ? "UPDATE" : "CREATE",
      actor: {
        id: userId,
        type: "USER",
      },
      action: "UPLOAD_AVATAR",
      entityType: "Profile",
      entityId: profile.id,
      before,
      after,
      metadata: {
        updatedField: "avatarUrl",
        fileName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      },
      req,
    });

    await AuditLog.create(auditLog);

    return sendSuccess(
      res,
      { avatarUrl: `${req.protocol}://${req.get("host")}/${avatarUrl}` },
      "Avatar updated successfully",
      200,
    );
  } catch (error) {
    logger.error("Failed to upload avatar", { error });

    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { show, update, updateAvatar };
