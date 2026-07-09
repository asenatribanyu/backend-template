import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import models from "../model/index.js";
import { createLogger } from "../utils/logger.js";
import { createPermissionSchema } from "../middleware/validator/permissionValidator.js";

const logger = createLogger("PermissionRouter");
const { Permission } = models;

const router = Router();

router.use(authMiddleware);

// GET /api/permissions — List all permissions
router.get("/", authorizePermission("permission.show"), async (req, res) => {
  try {
    const permissions = await Permission.findAll({
      order: [["name", "ASC"]],
    });

    return res.json({
      meta: { code: 200, message: "Success" },
      data: permissions,
    });
  } catch (error) {
    logger.error("Failed to list permissions", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

// POST /api/permissions — Create permission
router.post("/", authorizePermission("permission.create"), createPermissionSchema, async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await Permission.findOne({ where: { name } });
    if (existing) {
      return res.status(400).json({
        meta: { code: 400, message: "Permission already exists" },
      });
    }

    const permission = await Permission.create({ name });

    return res.status(201).json({
      meta: { code: 201, message: "Permission created" },
      data: permission,
    });
  } catch (error) {
    logger.error("Failed to create permission", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

// DELETE /api/permissions/:id — Delete permission
router.delete("/:id", authorizePermission("permission.delete"), async (req, res) => {
  try {
    const permission = await Permission.findByPk(req.params.id);

    if (!permission) {
      return res.status(404).json({
        meta: { code: 404, message: "Permission not found" },
      });
    }

    await permission.destroy();

    return res.json({
      meta: { code: 200, message: "Permission deleted" },
    });
  } catch (error) {
    logger.error("Failed to delete permission", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

export default router;
