import winston from "winston";
import "winston-daily-rotate-file";
import fs from "fs";

const logDir = "logs";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, colorize, errors, splat } = winston.format;

const fileFormat = printf(({ level, message, timestamp, stack }) => {
  return stack ? `[${timestamp}] ${level}: ${message}\n${stack}` : `[${timestamp}] ${level}: ${message}`;
});

const consoleFormat = combine(
  colorize(),
  timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  errors({ stack: true }),
  splat(),
  printf(({ level, message, timestamp, stack }) => {
    return stack ? `[${timestamp}] ${level}: ${message}\n${stack}` : `[${timestamp}] ${level}: ${message}`;
  }),
);

const fileCommonFormat = combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), splat(), fileFormat);

const combinedTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: "Combined-%DATE%.log",
  datePattern: "YYYY-WW",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "12w",
  format: fileCommonFormat,
});

const errorTransport = new winston.transports.DailyRotateFile({
  dirname: logDir,
  filename: "Error-%DATE%.log",
  level: "error",
  datePattern: "YYYY-WW",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "12w",
  format: fileCommonFormat,
});

const logger = winston.createLogger({
  level: "info",
  transports: [new winston.transports.Console({ format: consoleFormat }), combinedTransport, errorTransport],
});

export default logger;
