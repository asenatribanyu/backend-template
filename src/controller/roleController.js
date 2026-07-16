import { createLogger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { roleService } from "../services/roleService.js";

const logger = createLogger("RoleController");

const getAll = async (req, res) => {
  try {
    const { data, pagination } = await roleService.getAllRoles(req.query);
    return sendSuccess(res, data, "Success", 200, pagination);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to list roles", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const getById = async (req, res) => {
  try {
    const role = await roleService.getRoleById(req.params.id);
    return sendSuccess(res, role, "Success", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to get role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const create = async (req, res) => {
  try {
    const result = await roleService.createRole(req.body);
    return sendSuccess(res, result, "Role created", 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to create role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const update = async (req, res) => {
  try {
    const result = await roleService.updateRole(req.params.id, req.body);
    return sendSuccess(res, result, "Role updated", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to update role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const remove = async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id);
    return sendSuccess(res, null, "Role deleted", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to delete role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { getAll, getById, create, update, remove };
