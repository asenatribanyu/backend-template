import models from "../model/index.js";
const { User, Role, AuditLog, Profile } = models;
import logger from "../utils/logger.js";
import bcrypt from "bcrypt";
import { buildAuditLog } from "../services/auditLog.js";

const show = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findOne({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({
        meta: {
          code: 404,
          message: "User not found",
        },
      });
    }
    return res.status(200).json({
      meta: {
        code: 200,
        message: "User found",
      },
      data: user,
    });
  } catch (error) {
    logger.error("Failed to show user", error);
    return res
      .status(500)
      .json({ meta: { code: 500, message: "Internal Server Errorr" } });
  }
};

const update = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const userId = req.user.id;

    const { username, email, phone, password, profile } = req.body;

    const user = await User.findByPk(userId, {
      include: "Profile",
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({
        meta: { code: 404, message: "User not found" },
      });
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

    await t.commit();

    const after = await User.findByPk(userId, {
      include: "Profile",
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

    await AuditLog.create(auditLog);

    return res.status(200).json({
      meta: { code: 200, message: "Updated successfully" },
      data: after,
    });
  } catch (error) {
    await t.rollback();

    logger.error("Failed to update user", error);

    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        meta: { code: 400, message: "Avatar file is required" },
      });
    }

    const avatarUrl = `storage/upload/${req.file.filename}`;

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
      const oldPath = path.join("storage/upload", path.basename(oldAvatarUrl));

      fs.unlink(oldPath, (err) => {
        if (err) {
          logger.warn("Failed to delete old avatar", err);
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

    return res.status(200).json({
      meta: { code: 200, message: "Avatar updated successfully" },
      data: {
        avatarUrl,
      },
    });
  } catch (error) {
    logger.error("Failed to upload avatar", error);

    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
};

export { show, update, updateAvatar };
