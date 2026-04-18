import express from "express";
import cors from "cors";
import helmet from "helmet";
import config from "./config/config.js";
import route from "./route/index.js";
import logger from "./utils/logger.js";
import db from "./database/database.js";
import "./model/index.js";
import { setupBullBoard } from "./monitoring/bullBoard.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import { authorizePermission } from "./middleware/permissionMiddleware.js";
// import "./job/job.js";

const mode = config.app.env;

const app = express();
const PORT = config.app.port;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", true);

setupBullBoard(app, {
  authMiddleware,
  authorizePermission,
});

app.use("/api", route);

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
    if (mode === "DEVELOPMENT") {
      await db.sync({ alter: true });
      logger.info("Database synced");
    }

    app.listen(PORT, () => {
      logger.info(`Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
  }
};

startServer();
