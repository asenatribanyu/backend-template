import morgan from "morgan";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("HTTP");

const stream = {
  write: (message) => logger.info(message.trim()),
};

const skip = () => {
  const env = process.env.NODE_ENV || "DEVELOPMENT";
  return env !== "DEVELOPMENT";
};

export const morganMiddleware = morgan(":method :url :status :res[content-length] - :response-time ms", {
  stream,
  skip,
});
