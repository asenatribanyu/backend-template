import models from "../model/index.js";
const { Permission } = models;
import { clearCache } from "../utils/cache.js";
import { paginate, getPaginationParams } from "../utils/pagination.js";
import AppError from "../utils/AppError.js";

const getAllPermissions = async (query) => {
  const paginationParams = getPaginationParams(query);

  const { data, pagination } = await paginate(Permission, {
    ...paginationParams,
    sortBy: paginationParams.sortBy || "name",
    order: paginationParams.order || "asc",
  });

  return { data, pagination };
};

const createPermission = async (data) => {
  const { name } = data;

  const existing = await Permission.findOne({ where: { name } });
  if (existing) {
    throw new AppError("Permission already exists", 400);
  }

  const permission = await Permission.create({ name });

  await clearCache("cache:/api/permissions*");
  await clearCache("user:permissions:*");

  return permission;
};

const deletePermission = async (id) => {
  const permission = await Permission.findByPk(id);

  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  await permission.destroy();

  await clearCache("cache:/api/permissions*");
  await clearCache("user:permissions:*");

  return null;
};

export const permissionService = {
  getAllPermissions,
  createPermission,
  deletePermission,
};
