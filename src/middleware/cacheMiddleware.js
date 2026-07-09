import { redis } from "../libs/redis.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("CacheMiddleware");

export const cacheMiddleware = (ttlSeconds = 3600) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      const cachedResponse = await redis.get(key);

      if (cachedResponse) {
        res.setHeader("X-Cache", "HIT");
        return res.json(JSON.parse(cachedResponse));
      }

      res.setHeader("X-Cache", "MISS");

      // Intercept the original res.json
      const originalJson = res.json;

      res.json = function (body) {
        // Only cache successful responses (HTTP 2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.setex(key, ttlSeconds, JSON.stringify(body)).catch((err) => {
            logger.error("Failed to set cache:", { error: err, key });
          });
        }
        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      // Graceful degradation: if Redis fails, just proceed without caching
      logger.error("Cache middleware error:", { error, key });
      next();
    }
  };
};
