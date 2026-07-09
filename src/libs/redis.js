import { Redis } from "ioredis";
import config from "../config/config.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("Redis");

export const redis = new Redis({
  ...config.redis,
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

redis.on("error", (err) => {
  logger.error("Redis connection error:", { error: err });
});
