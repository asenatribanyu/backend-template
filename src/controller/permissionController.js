import models from "../model/index.js";
import { createLogger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { clearCache } from "../utils/cache.js";
import { paginate, getPaginationParams } from "../utils/pagination.js";

const logger = createLogger("PermissionController");
const { Permission } = models;

const getAll = async (req, res) => {
  try {
    const paginationParams = getPaginationParams(req.query);

    const { data, pagination } = await paginate(Permission, {
      ...paginationParams,
      sortBy: paginationParams.sortBy || "name",
      order: paginationParams.order || "asc",
    });

    return sendSuccess(res, data, "Success", 200, pagination);
  } catch (error) {
    logger.error("Failed to list permissions", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const create = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await Permission.findOne({ where: { name } });
    if (existing) {
      return sendError(res, "Permission already exists", 400);
    }

    const permission = await Permission.create({ name });

    await clearCache("cache:/api/permissions*");

    return sendSuccess(res, permission, "Permission created", 201);
  } catch (error) {
    logger.error("Failed to create permission", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const remove = async (req, res) => {
  try {
    const permission = await Permission.findByPk(req.params.id);

    if (!permission) {
      return sendError(res, "Permission not found", 404);
    }

    await permission.destroy();

    await clearCache("cache:/api/permissions*");

    return sendSuccess(res, null, "Permission deleted", 200);
  } catch (error) {
    logger.error("Failed to delete permission", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { getAll, create, remove };
