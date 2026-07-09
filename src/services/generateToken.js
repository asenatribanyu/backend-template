import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/config.js";

export function generateAccessToken(user) {
  return jwt.sign({ id: user.id, role: user.Role.name }, config.app.jwt, {
    expiresIn: config.app.expireIn,
  });
}

export function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function verifyToken(token) {
  return jwt.verify(token, config.app.jwt);
}
