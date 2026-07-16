import models from "../model/index.js";
const { AuditLog } = models;
import { paginate, getPaginationParams } from "../utils/pagination.js";

const getAllAuditLogs = async (query) => {
  const paginationParams = getPaginationParams(query);
  const { type, action, entityType } = query;

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

  return { data, pagination };
};

export const auditLogService = {
  getAllAuditLogs,
};
