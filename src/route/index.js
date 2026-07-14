import { Router } from "express";
import authRouter from "./authRouter.js";
import userRouter from "./userRouter.js";
import roleRouter from "./roleRouter.js";
import permissionRouter from "./permissionRouter.js";
import auditLogRouter from "./auditLogRouter.js";
import db from "../database/database.js";
import { redis } from "../libs/redis.js";

const router = Router();

router.get("/", (req, res) => {
  return res.json({
    meta: {
      code: 200,
      message: "Success",
    },
  });
});

router.get("/health", async (req, res) => {
  try {
    await db.authenticate();
    await redis.ping();

    return res.status(200).json({
      meta: { code: 200, message: "OK" },
      data: {
        database: "connected",
        redis: "connected",
        uptime: process.uptime(),
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    return res.status(503).json({
      meta: { code: 503, message: "Service Unavailable" },
      data: {
        error: error.message,
      },
    });
  }
});

router.use("/auth", authRouter);
router.use("/me", userRouter);
router.use("/roles", roleRouter);
router.use("/permissions", permissionRouter);
router.use("/users", userRouter); // Additional route pointing to userRouter for admin
router.use("/audit-logs", auditLogRouter);

export default router;
