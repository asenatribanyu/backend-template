import { createLogger } from "../utils/logger.js";
const logger = createLogger("UserController");
import { sendSuccess, sendError } from "../utils/response.js";
import { userService } from "../services/userService.js";

const show = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return sendSuccess(res, user, "User found", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to show user", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const update = async (req, res) => {
  try {
    const result = await userService.updateUser(req.user.id, req.body, req);
    return sendSuccess(res, result, "Updated successfully", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to update user", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const updateAvatar = async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const result = await userService.updateAvatar(req.user.id, req.file, baseUrl, req);
    return sendSuccess(res, result, "Avatar updated successfully", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to upload avatar", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const getAll = async (req, res) => {
  try {
    const { data, pagination } = await userService.getAllUsers(req.query);
    return sendSuccess(res, data, "Success", 200, pagination);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to list users", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const updateRole = async (req, res) => {
  try {
    await userService.updateRole(req.params.id, req.user.id, req.body.roleId, req);
    return sendSuccess(res, null, "User role updated successfully", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to update user role", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const updateStatus = async (req, res) => {
  try {
    await userService.updateStatus(req.params.id, req.user.id, req.body.isBlocked, req);
    return sendSuccess(res, null, `User ${req.body.isBlocked ? "blocked" : "unblocked"} successfully`, 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to update user status", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const remove = async (req, res) => {
  try {
    await userService.removeUser(req.params.id, req.user.id, req);
    return sendSuccess(res, null, "User deleted successfully", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to delete user", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { show, update, updateAvatar, getAll, updateRole, updateStatus, remove };
