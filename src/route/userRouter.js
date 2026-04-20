import { Router } from "express";
import { show, update, updateAvatar } from "../controller/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import { createUploader } from "../middleware/uploadMiddleware.js";
import { updateUserSchema } from "../middleware/validator/userValidator.js";

const upload = createUploader({
  folder: "avatar",
  allowedMimeTypes: ["image/jpeg", "image/png"],
});

const router = Router();

router.use(authMiddleware);

router.get("/:id", authorizePermission("user.show"), show);
router.put(
  "/:id",
  authorizePermission("user.update"),
  updateUserSchema,
  update,
);
router.post(
  "/avatar",
  authorizePermission("user.update.avatar"),
  upload.single("avatar"),
  updateAvatar,
);

export default router;
