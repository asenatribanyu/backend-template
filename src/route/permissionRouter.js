import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import { createPermissionSchema } from "../middleware/validator/permissionValidator.js";
import { getAll, create, remove } from "../controller/permissionController.js";

const router = Router();

router.use(authMiddleware);

// GET /api/permissions — List all permissions (Cached for 1 hour)
router.get("/", authorizePermission("permission.show"), cacheMiddleware(3600), getAll);

// POST /api/permissions — Create permission
router.post("/", authorizePermission("permission.create"), createPermissionSchema, create);

// DELETE /api/permissions/:id — Delete permission
router.delete("/:id", authorizePermission("permission.delete"), remove);

export default router;
