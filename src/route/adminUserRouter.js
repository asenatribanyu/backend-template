import { Router } from "express";
import { getAll, updateRole, updateStatus, remove } from "../controller/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import { updateRoleSchema, updateStatusSchema } from "../middleware/validator/userValidator.js";

const router = Router();

router.use(authMiddleware);

router.get("/", authorizePermission("users.show"), getAll);
router.put("/:id/role", authorizePermission("users.update"), updateRoleSchema, updateRole);
router.put("/:id/status", authorizePermission("users.update"), updateStatusSchema, updateStatus);
router.delete("/:id", authorizePermission("users.delete"), remove);

export default router;
