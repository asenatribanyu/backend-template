import { Router } from "express";
import { getAll } from "../controller/auditLogController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";

const router = Router();

router.use(authMiddleware);

router.get("/", authorizePermission("auditLogs.show"), getAll);

export default router;
