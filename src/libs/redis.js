import { Redis } from "ioredis";
import config from "../config/config.js";
import logger from "../utils/logger.js";

export const redis = new Redis({
  ...config.redis,
});

redis.on("connect", () => {
  logger.info("Connected to Redis");
});

redis.on("error", (err) => {
  logger.error("Redis connection error:", err);
});
