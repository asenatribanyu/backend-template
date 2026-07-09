import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import { cacheMiddleware } from "../middleware/cacheMiddleware.js";
import { createRoleSchema, updateRoleSchema } from "../middleware/validator/roleValidator.js";
import { getAll, getById, create, update, remove } from "../controller/roleController.js";

const router = Router();

router.use(authMiddleware);

// GET /api/roles — List all roles (Cached for 1 hour)
router.get("/", authorizePermission("role.show"), cacheMiddleware(3600), getAll);

// GET /api/roles/:id — Get single role (Cached for 1 hour)
router.get("/:id", authorizePermission("role.show"), cacheMiddleware(3600), getById);

// POST /api/roles — Create role
router.post("/", authorizePermission("role.create"), createRoleSchema, create);

// PUT /api/roles/:id — Update role
router.put("/:id", authorizePermission("role.update"), updateRoleSchema, update);

// DELETE /api/roles/:id — Delete role
router.delete("/:id", authorizePermission("role.delete"), remove);

export default router;
