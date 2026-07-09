import { redis } from "../libs/redis.js";
import { createLogger } from "./logger.js";

const logger = createLogger("CacheUtils");

export const clearCache = (pattern) => {
  return new Promise((resolve, reject) => {
    try {
      const stream = redis.scanStream({
        match: pattern,
        count: 100,
      });

      const keys = [];

      stream.on("data", (resultKeys) => {
        for (let i = 0; i < resultKeys.length; i++) {
          keys.push(resultKeys[i]);
        }
      });

      stream.on("end", async () => {
        if (keys.length > 0) {
          try {
            await redis.del(...keys);
            logger.info(`Cleared ${keys.length} cache keys matching pattern: ${pattern}`);
          } catch (delError) {
            logger.error("Failed to delete cache keys:", { error: delError, pattern });
          }
        }
        resolve(keys.length);
      });

      stream.on("error", (err) => {
        logger.error("Error scanning cache keys:", { error: err, pattern });
        reject(err);
      });
    } catch (error) {
      logger.error("Failed to initiate cache clear:", { error, pattern });
      resolve(0); // Gracefully resolve even if failed so main process doesn't crash
    }
  });
};
