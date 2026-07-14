import bcrypt from "bcrypt";
import models from "../model/index.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("BasicAuth");
const { User, Role } = models;

export const adminBasicAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const b64auth = (authHeader.match(/^Basic\s+(.*)$/i) || [])[1] || "";

    if (b64auth) {
      const [email, password] = Buffer.from(b64auth, "base64").toString().split(":");

      if (email && password) {
        const user = await User.findOne({
          where: { email: email.toLowerCase() },
          include: [{ model: Role, as: "Role" }],
        });

        if (user && user.Role?.name === "ADMIN") {
          const isValid = await bcrypt.compare(password, user.password);
          if (isValid) {
            return next();
          }
        }
      }
    }
  } catch (error) {
    logger.error("Basic Auth processing error", { error });
  }

  // Reject with WWW-Authenticate header to trigger browser popup
  res.set("WWW-Authenticate", 'Basic realm="Admin Dashboard"');
  return res.status(401).send("Authentication required.");
};
