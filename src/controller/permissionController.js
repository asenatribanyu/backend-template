import { createLogger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { permissionService } from "../services/permissionService.js";

const logger = createLogger("PermissionController");

const getAll = async (req, res) => {
  try {
    const { data, pagination } = await permissionService.getAllPermissions(req.query);
    return sendSuccess(res, data, "Success", 200, pagination);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to list permissions", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const create = async (req, res) => {
  try {
    const result = await permissionService.createPermission(req.body);
    return sendSuccess(res, result, "Permission created", 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to create permission", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const remove = async (req, res) => {
  try {
    await permissionService.deletePermission(req.params.id);
    return sendSuccess(res, null, "Permission deleted", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to delete permission", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { getAll, create, remove };
