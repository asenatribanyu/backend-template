import { Router } from "express";
import { show, update, updateAvatar, getAll, updateRole, updateStatus, remove } from "../controller/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import { createUploader, processUploadedFiles } from "../middleware/uploadMiddleware.js";
import { updateUserSchema, updateRoleSchema, updateStatusSchema } from "../middleware/validator/userValidator.js";

const upload = createUploader({
  folder: "avatar",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxSize: 5 * 1024 * 1024,
});

const router = Router();

router.use(authMiddleware);

router.get("/", authorizePermission("me.show"), show);
router.put("/", authorizePermission("me.update"), updateUserSchema, update);
router.post(
  "/avatar",
  authorizePermission("me.update.avatar"),
  upload.single("avatar"),
  processUploadedFiles("avatar"),
  updateAvatar,
);

router.get("/all", authorizePermission("users.show"), getAll);
router.put("/:id/role", authorizePermission("users.update"), updateRoleSchema, updateRole);
router.put("/:id/status", authorizePermission("users.update"), updateStatusSchema, updateStatus);
router.delete("/:id", authorizePermission("users.delete"), remove);

export default router;
