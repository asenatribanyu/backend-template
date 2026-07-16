import models from "../model/index.js";
const { Role, Permission, RolePermission } = models;
import { clearCache } from "../utils/cache.js";
import { paginate, getPaginationParams } from "../utils/pagination.js";
import AppError from "../utils/AppError.js";

const getAllRoles = async (query) => {
  const paginationParams = getPaginationParams(query);

  const { data, pagination } = await paginate(Role, {
    ...paginationParams,
    sortBy: paginationParams.sortBy || "name",
    order: paginationParams.order || "asc",
    include: [
      {
        model: Permission,
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    ],
  });

  return { data, pagination };
};

const getRoleById = async (id) => {
  const role = await Role.findByPk(id, {
    include: [
      {
        model: Permission,
        attributes: ["id", "name"],
        through: { attributes: [] },
      },
    ],
  });

  if (!role) {
    throw new AppError("Role not found", 404);
  }

  return role;
};

const createRole = async (data) => {
  const { name, scope, permissionIds } = data;

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

  return result;
};

const updateRole = async (id, data) => {
  const role = await Role.findByPk(id);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  const { name, scope, permissionIds } = data;

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
  await clearCache("user:permissions:*");

  return result;
};

const deleteRole = async (id) => {
  const role = await Role.findByPk(id);

  if (!role) {
    throw new AppError("Role not found", 404);
  }

  await role.destroy();

  await clearCache("cache:/api/roles*");
  await clearCache("user:permissions:*");

  return null;
};

export const roleService = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
