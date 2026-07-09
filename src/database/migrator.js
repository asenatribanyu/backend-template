import { Umzug, SequelizeStorage } from "umzug";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import db from "./database.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("Migrator");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, "migrations");

const umzug = new Umzug({
  migrations: {
    glob: path.join(migrationsDir, "*.js").replace(/\\/g, "/"),
    resolve: ({ name, path: migrationPath }) => {
      return {
        name,
        up: async () => {
          const migration = await import(pathToFileURL(migrationPath));
          return migration.default.up(db.getQueryInterface(), db.constructor);
        },
        down: async () => {
          const migration = await import(pathToFileURL(migrationPath));
          return migration.default.down(db.getQueryInterface(), db.constructor);
        },
      };
    },
  },
  context: db.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize: db }),
  logger: logger,
});

/**
 * Run all pending migrations
 */
export async function runMigrations() {
  const pending = await umzug.pending();

  if (pending.length === 0) {
    logger.info("✔ No pending migrations.");
    return;
  }

  logger.info(`📦 Running ${pending.length} pending migration(s)...`);
  await umzug.up();
  logger.info("✔ All migrations executed successfully.");
}

/**
 * Undo the last migration
 */
export async function undoMigration() {
  const executed = await umzug.executed();

  if (executed.length === 0) {
    logger.info("✔ No migrations to undo.");
    return;
  }

  logger.info(`⏪ Undoing last migration: ${executed[executed.length - 1].name}`);
  await umzug.down();
  logger.info("✔ Migration undone.");
}

// CLI runner — allows `node src/database/migrator.js up|down`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2];

  if (command === "up") {
    runMigrations()
      .then(() => process.exit(0))
      .catch((err) => {
        logger.error("❌ Migration failed:", { error: err });
        process.exit(1);
      });
  } else if (command === "down") {
    undoMigration()
      .then(() => process.exit(0))
      .catch((err) => {
        logger.error("❌ Undo migration failed:", { error: err });
        process.exit(1);
      });
  }
}

export default umzug;
