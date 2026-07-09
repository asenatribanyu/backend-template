import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { authorizePermission } from "../middleware/permissionMiddleware.js";
import models from "../model/index.js";
import { createLogger } from "../utils/logger.js";
import { createRoleSchema, updateRoleSchema } from "../middleware/validator/roleValidator.js";

const logger = createLogger("RoleRouter");
const { Role, Permission, RolePermission } = models;

const router = Router();

router.use(authMiddleware);

// GET /api/roles — List all roles
router.get("/", authorizePermission("role.show"), async (req, res) => {
  try {
    const roles = await Role.findAll({
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    return res.json({
      meta: { code: 200, message: "Success" },
      data: roles,
    });
  } catch (error) {
    logger.error("Failed to list roles", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

// GET /api/roles/:id — Get single role
router.get("/:id", authorizePermission("role.show"), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    if (!role) {
      return res.status(404).json({
        meta: { code: 404, message: "Role not found" },
      });
    }

    return res.json({
      meta: { code: 200, message: "Success" },
      data: role,
    });
  } catch (error) {
    logger.error("Failed to get role", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

// POST /api/roles — Create role
router.post("/", authorizePermission("role.create"), createRoleSchema, async (req, res) => {
  try {
    const { name, scope, permissionIds } = req.body;

    const role = await Role.create({ name, scope: scope || "own" });

    if (permissionIds?.length) {
      const records = permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId,
      }));
      await RolePermission.bulkCreate(records);
    }

    const result = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    return res.status(201).json({
      meta: { code: 201, message: "Role created" },
      data: result,
    });
  } catch (error) {
    logger.error("Failed to create role", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

// PUT /api/roles/:id — Update role
router.put("/:id", authorizePermission("role.update"), updateRoleSchema, async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({
        meta: { code: 404, message: "Role not found" },
      });
    }

    const { name, scope, permissionIds } = req.body;

    if (name !== undefined) role.name = name;
    if (scope !== undefined) role.scope = scope;
    await role.save();

    if (permissionIds !== undefined) {
      await RolePermission.destroy({ where: { roleId: role.id } });

      if (permissionIds.length) {
        const records = permissionIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }));
        await RolePermission.bulkCreate(records);
      }
    }

    const result = await Role.findByPk(role.id, {
      include: [
        {
          model: Permission,
          attributes: ["id", "name"],
          through: { attributes: [] },
        },
      ],
    });

    return res.json({
      meta: { code: 200, message: "Role updated" },
      data: result,
    });
  } catch (error) {
    logger.error("Failed to update role", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

// DELETE /api/roles/:id — Delete role
router.delete("/:id", authorizePermission("role.delete"), async (req, res) => {
  try {
    const role = await Role.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({
        meta: { code: 404, message: "Role not found" },
      });
    }

    await role.destroy();

    return res.json({
      meta: { code: 200, message: "Role deleted" },
    });
  } catch (error) {
    logger.error("Failed to delete role", { error });
    return res.status(500).json({
      meta: { code: 500, message: "Internal Server Error" },
    });
  }
});

export default router;
