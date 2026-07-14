import models from "../model/index.js";
import { createLogger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { paginate, getPaginationParams } from "../utils/pagination.js";

const logger = createLogger("AuditLogController");
const { AuditLog } = models;

const getAll = async (req, res) => {
  try {
    const paginationParams = getPaginationParams(req.query);
    const { type, action, entityType } = req.query;

    const where = {};
    if (type) where.type = type;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;

    const { data, pagination } = await paginate(AuditLog, {
      ...paginationParams,
      sortBy: paginationParams.sortBy || "createdAt",
      order: paginationParams.order || "desc",
      where,
    });

    return sendSuccess(res, data, "Success", 200, pagination);
  } catch (error) {
    logger.error("Failed to list audit logs", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { getAll };
