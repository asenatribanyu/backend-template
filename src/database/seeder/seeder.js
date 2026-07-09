import db from "../database.js";
import "../../model/index.js";
import { v7 as uuidv7 } from "uuid";
import bcrypt from "bcrypt";
import { createRequire } from "module";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("Seeder");

const require = createRequire(import.meta.url);
const permissionsData = require("./permissions.json");

const seed = async () => {
  const t = await db.transaction();

  try {
    logger.info("🌱 Starting seeder...");

    // 1. Seed Permissions
    logger.info("📦 Seeding permissions...");
    const permissionRecords = [];

    for (const perm of permissionsData.permissions) {
      const [record] = await db.models.Permission.findOrCreate({
        where: { name: perm.name },
        defaults: { id: uuidv7(), name: perm.name },
        transaction: t,
      });
      permissionRecords.push(record);
    }

    logger.info(`✔ ${permissionRecords.length} permissions seeded.`);

    // 2. Seed Roles
    logger.info("📦 Seeding roles...");

    const [adminRole] = await db.models.Role.findOrCreate({
      where: { name: "admin" },
      defaults: { id: uuidv7(), name: "admin", scope: "all" },
      transaction: t,
    });

    const [userRole] = await db.models.Role.findOrCreate({
      where: { name: "user" },
      defaults: { id: uuidv7(), name: "user", scope: "own" },
      transaction: t,
    });

    logger.info("✔ Roles seeded.");

    // 3. Assign all permissions to admin
    logger.info("📦 Assigning permissions to admin role...");

    for (const perm of permissionRecords) {
      await db.models.RolePermission.findOrCreate({
        where: { roleId: adminRole.id, permissionId: perm.id },
        defaults: { roleId: adminRole.id, permissionId: perm.id },
        transaction: t,
      });
    }

    // Assign basic permissions to user role
    const userPermissions = ["me.show", "me.update", "me.update.avatar"];
    const userPermRecords = permissionRecords.filter((p) =>
      userPermissions.includes(p.name),
    );

    for (const perm of userPermRecords) {
      await db.models.RolePermission.findOrCreate({
        where: { roleId: userRole.id, permissionId: perm.id },
        defaults: { roleId: userRole.id, permissionId: perm.id },
        transaction: t,
      });
    }

    logger.info("✔ Role-Permission assignments done.");

    // 4. Seed admin user
    logger.info("📦 Seeding admin user...");

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const [adminUser] = await db.models.User.findOrCreate({
      where: { username: "admin" },
      defaults: {
        id: uuidv7(),
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        roleId: adminRole.id,
        isVerified: true,
        isVerifiedAt: new Date(),
      },
      transaction: t,
    });

    await db.models.Profile.findOrCreate({
      where: { userId: adminUser.id },
      defaults: {
        id: uuidv7(),
        firstName: "Admin",
        lastName: "User",
        userId: adminUser.id,
      },
      transaction: t,
    });

    logger.info("✔ Admin user seeded.");

    await t.commit();
    logger.info("🎉 Seeder completed successfully!");
    process.exit(0);
  } catch (error) {
    await t.rollback();
    logger.error("❌ Seeder failed:", { error });
    process.exit(1);
  }
};

seed();
