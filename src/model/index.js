import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import db from "../database/database.js";
import { createLogger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = {};

const logger = createLogger("Models");

const files = fs.readdirSync(__dirname).filter((file) => file !== "index.js" && file.endsWith(".js"));

for (const file of files) {
  try {
    logger.info(`Loading model: ${file}`);

    const modulePath = path.join(__dirname, file);
    const modelModule = await import(pathToFileURL(modulePath));

    if (typeof modelModule.default !== "function") {
      throw new Error(`${file} must export a function`);
    }

    const model = modelModule.default(db);

    if (!model) {
      throw new Error(`${file} returned undefined`);
    }

    if (!model.name) {
      throw new Error(`${file} model missing name`);
    }

    models[model.name] = model;

    logger.info(`Loaded: ${model.name}`);
  } catch (err) {
    logger.error(`ERROR IN FILE: ${file}`, { error: err });
    process.exit(1);
  }
}

Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

export default {
  ...models,
  db,
};
