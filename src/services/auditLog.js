import { createLogger } from "../utils/logger.js";
const logger = createLogger("AuditLog");

const IGNORE_FIELDS = ["password", "updatedAt", "createdAt"];

/**
 * compare before vs after
 */
function getChangedFields(before, after) {
  try {
    if (!before || !after) return [];

    const changed = [];

    const keys = Object.keys(after).filter((key) => !IGNORE_FIELDS.includes(key));

    for (const key of keys) {
      if (JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key])) {
        changed.push(key);
      }
    }

    return changed;
  } catch (error) {
    throw new Error("Error comparing before and after data for audit log", { cause: error });
  }
}

function pickFields(obj, fields) {
  try {
    if (!obj || !fields?.length) return null;

    const result = {};

    for (const field of fields) {
      result[field] = obj?.[field];
    }

    return result;
  } catch (error) {
    throw new Error("Error picking fields for audit log", { cause: error });
  }
}

function buildMessage({ type, entityType, changedFields, action }) {
  try {
    if (type === "CREATE") {
      return `${entityType} created`;
    }

    if (type === "UPDATE") {
      return `${entityType} updated${changedFields?.length ? ` (${changedFields.join(", ")})` : ""}`;
    }

    if (type === "DELETE") {
      return `${entityType} deleted`;
    }

    if (type === "EVENT") {
      return action
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase());
    }

    return action;
  } catch (error) {
    throw new Error("Error building audit log message", { cause: error });
  }
}

function buildAuditLog({
  type,

  actor,
  action,
  entityType,
  entityId,

  before = null,
  after = null,

  req,
  metadata = null,
}) {
  try {
    let changedFields = [];

    if (type === "UPDATE") {
      changedFields = getChangedFields(before, after);
    }

    if (type === "CREATE") {
      changedFields = Object.keys(after || {});
    }

    if (type === "DELETE") {
      changedFields = Object.keys(before || {});
    }

    const safeChangedFields = changedFields || [];

    const beforeData = type === "UPDATE" || type === "DELETE" ? pickFields(before, safeChangedFields) : null;

    const afterData = type === "UPDATE" || type === "CREATE" ? pickFields(after, safeChangedFields) : null;

    const message = buildMessage({
      type,
      entityType,
      changedFields: safeChangedFields,
      action,
    });

    return {
      type,

      actorId: actor?.id || null,
      actorType: actor?.type || "GUEST",

      action: action?.slice(0, 255),
      entityType: entityType?.slice(0, 255),
      entityId,

      changedFields: safeChangedFields.length ? safeChangedFields : null,

      beforeData,
      afterData,

      metadata,

      message: message?.slice(0, 255),

      ipAddress: req?.ip?.slice(0, 255) || null,
      userAgent: req?.headers?.["user-agent"]?.slice(0, 255) || null,
    };
  } catch (error) {
    logger.error("Error building audit log entry:", { error: error });
    throw error;
  }
}

export { buildAuditLog };
