import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs";
import { requestContext } from "../middleware/requestIdMiddleware.js";

const logDir = "logs";

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, colorize, errors, splat, json } = winston.format;

const safeStringify = (obj) => {
  const cache = new WeakSet();

  return JSON.stringify(
    obj,
    (key, value) => {
      if (typeof value === "object" && value !== null) {
        if (cache.has(value)) {
          return "[Circular]";
        }
        cache.add(value);
      }
      return value;
    },
    2,
  );
};

// Format khusus untuk console (development)
const injectRequestId = winston.format((info) => {
  const store = requestContext.getStore();
  if (store && store.requestId) {
    info.requestId = store.requestId;
  }
  return info;
});

const consoleFormat = printf((info) => {
  const { level, message, label, timestamp, stack, error, requestId, ...meta } = info;

  const reqIdStr = requestId ? ` [ReqID: ${requestId}]` : "";
  let log = `[${timestamp}] ${level} [${label || "App"}]${reqIdStr}: ${message}`;

  if (error) {
    log += `\nError: ${error.message || error}`;
    if (error.stack) log += `\n${error.stack}`;
  } else if (stack) {
    log += `\n${stack}`;
  }

  // sequelize validation errors
  if (meta[0]?.errors || error?.errors) {
    const errs = meta[0]?.errors || error?.errors;
    log += `\nErrors:\n${safeStringify(errs)}`;
  }

  // parent/original sql error
  if (meta[0]?.parent || error?.parent) {
    const parent = meta[0]?.parent || error?.parent;
    log += `\nParent:\n${safeStringify(parent)}`;
  }

  if (meta[0]?.original || error?.original) {
    const original = meta[0]?.original || error?.original;
    log += `\nOriginal:\n${safeStringify(original)}`;
  }

  // Remove symbol keys and common winston properties to check if any other metadata exists
  const metaKeys = Object.keys(meta).filter((k) => k !== "0");
  if (metaKeys.length) {
    const cleanMeta = {};
    for (const key of metaKeys) {
      cleanMeta[key] = meta[key];
    }
    if (Object.keys(cleanMeta).length) {
      log += `\nMeta:\n${safeStringify(cleanMeta)}`;
    }
  } else if (meta[0] && !meta[0].errors && !meta[0].parent && !meta[0].original) {
    log += `\nMeta:\n${safeStringify(meta[0])}`;
  }

  return log;
});

const isDevelopment = process.env.NODE_ENV === "DEVELOPMENT";

const fileFormat = combine(
  injectRequestId(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  splat(),
  json(),
);

const devFormat = combine(
  injectRequestId(),
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  splat(),
  consoleFormat,
);

const combinedTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: "Combined-%DATE%.log",
  datePattern: "YYYY-WW",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "12w",
  format: fileFormat,
});

const errorTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: "Error-%DATE%.log",
  level: "error",
  datePattern: "YYYY-WW",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "12w",
  format: fileFormat,
});

const defaultLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  transports: [
    new winston.transports.Console({
      format: isDevelopment ? devFormat : fileFormat,
    }),
    combinedTransport,
    errorTransport,
  ],
});

/**
 * Factory function to create a child logger with a module label.
 * @param {string} moduleName - The name of the module/file
 * @returns {winston.Logger} - Child logger instance
 */
export const createLogger = (moduleName) => {
  return defaultLogger.child({ label: moduleName });
};

// Default export for backward compatibility
export default defaultLogger;
