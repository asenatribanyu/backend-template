import { createLogger } from "../utils/logger.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { auditLogService } from "../services/auditLogService.js";

const logger = createLogger("AuditLogController");

const getAll = async (req, res) => {
  try {
    const { data, pagination } = await auditLogService.getAllAuditLogs(req.query);
    return sendSuccess(res, data, "Success", 200, pagination);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to list audit logs", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { getAll };
