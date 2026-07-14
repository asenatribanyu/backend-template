import models from "../model/index.js";
import { createLogger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { clearCache } from "../utils/cache.js";
import { invalidateUserPermissionCache } from "../middleware/authMiddleware.js";

const logger = createLogger("RoleController");
const { Role, Permission, RolePermission } = models;

const getAll = async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    return sendSuccess(res, roles, "Success", 200);
  } catch (error) {
    logger.error("Failed to list roles", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const getById = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return sendError(res, "Role not found", 404);
    }

    return sendSuccess(res, role, "Success", 200);
  } catch (error) {
    logger.error("Failed to get role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const create = async (req, res) => {
  try {
    const { name, scope, permissionIds } = req.body;

    const role = await Role.create({ name, scope: scope || "own" });

    if (permissionIds?.length) {
      const records = permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));
      await RolePermission.bulkCreate(records);
    }

    const result = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    await clearCache("cache:/api/roles*");

    return sendSuccess(res, result, "Role created", 201);
  } catch (error) {
    logger.error("Failed to create role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const update = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return sendError(res, "Role not found", 404);
    }

    const { name, scope, permissionIds } = req.body;

    if (name !== undefined) role.name = name;
    if (scope !== undefined) role.scope = scope;
    await role.save();

    if (permissionIds !== undefined) {
      await RolePermission.destroy({ where: { roleId: role.id } });

      if (permissionIds.length) {
        const records = permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }));
        await RolePermission.bulkCreate(records);
      }
    }

    const result = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    await clearCache("cache:/api/roles*");

    // Invalidate permission cache for all users with this role
    const usersWithRole = await models.User.findAll({ where: { roleId: role.id }, attributes: ["id"] });
    for (const u of usersWithRole) {
      await invalidateUserPermissionCache(u.id);
    }

    return sendSuccess(res, result, "Role updated", 200);
  } catch (error) {
    logger.error("Failed to update role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const remove = async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return sendError(res, "Role not found", 404);
    }

    await role.destroy();

    await clearCache("cache:/api/roles*");

    // Invalidate permission cache for all users with this role
    const usersWithRole = await models.User.findAll({ where: { roleId: role.id }, attributes: ["id"] });
    for (const u of usersWithRole) {
      await invalidateUserPermissionCache(u.id);
    }

    return sendSuccess(res, null, "Role deleted", 200);
  } catch (error) {
    logger.error("Failed to delete role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { getAll, getById, create, update, remove };
