import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./config/config.js";
import route from "./route/index.js";
import { createLogger } from "./utils/logger.js";
const logger = createLogger("Server");
import db from "./database/database.js";
import "./model/index.js";
import { setupBullBoard } from "./monitoring/bullBoard.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { authorizePermission } from "./middleware/permissionMiddleware.js";
import cookieParser from "cookie-parser";
import path from "path";
import { runMigrations } from "./database/migrator.js";
import "./job/job.js";
import { globalLimiter } from "./middleware/rateLimitMiddleware.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import { morganMiddleware } from "./middleware/morganMiddleware.js";
import { redis } from "./libs/redis.js";

const mode = config.app.env;

const app = express();
const PORT = config.app.port;

app.use(morganMiddleware);
app.use(globalLimiter);

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);
app.use(
  cors({
    origin: config.app.cors,
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.set("trust proxy", true);

setupBullBoard(app, {
  authMiddleware,
  authorizePermission,
});

app.use("/storage/public", express.static(path.resolve("storage/public")));
app.use("/api", route);

app.use(errorHandler);

app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.originalUrl}`);
  return res.status(404).json({
    meta: {
      code: 404,
      message: "Not Found: The requested endpoint does not exist",
    },
  });
});

const startServer = async () => {
  try {
    await db.authenticate();
    logger.info("Database connected");

    if (mode === "DEVELOPMENT") {
      await db.sync({ alter: true });
      logger.info("Database synced");
    } else {
      // Production: run umzug migrations
      await runMigrations();
      logger.info("Migrations executed");
    }

    const server = app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });

    const gracefulShutdown = () => {
      logger.info("Received kill signal, shutting down gracefully");
      server.close(async () => {
        logger.info("Closed out remaining connections");
        try {
          await db.close();
          logger.info("Database connection closed");
          await redis.quit();
          logger.info("Redis connection closed");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", { error });
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("Could not close connections in time, forcefully shutting down");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (err) {
    logger.error("Failed to start server:", { error: err });
  }
};

startServer();
