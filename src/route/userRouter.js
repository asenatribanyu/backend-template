import { Router } from "express";
import { show, update, updateAvatar } from "../controller/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import { createUploader, processUploadedFiles } from "../middleware/uploadMiddleware.js";
import { updateUserSchema } from "../middleware/validator/userValidator.js";

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

export default router;
