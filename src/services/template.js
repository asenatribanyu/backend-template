import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";

const templateCache = new Map();

export const compileTemplate = async (templateName, data) => {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName)(data);
  }

  const filePath = path.join(process.cwd(), "src/template", `${templateName}.hbs`);
  const source = await fs.readFile(filePath, "utf-8");
  const template = handlebars.compile(source);

  templateCache.set(templateName, template);

  return template(data);
};
