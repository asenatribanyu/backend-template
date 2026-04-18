import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import db from "../database/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const models = {};

const files = fs.readdirSync(__dirname).filter((file) => file !== "index.js" && file.endsWith(".js"));

for (const file of files) {
  try {
    console.log(`📦 Loading model: ${file}`);

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

    console.log(`✔ Loaded: ${model.name}`);
  } catch (err) {
    console.error(`❌ ERROR IN FILE: ${file}`);
    console.error(err);
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
