import fs from "fs";
import path from "path";
import handlebars from "handlebars";

export const compileTemplate = (templateName, data) => {
  const filePath = path.join(process.cwd(), "src/templates", `${templateName}.hbs`);

  const source = fs.readFileSync(filePath, "utf-8");
  const template = handlebars.compile(source);

  return template(data);
};
