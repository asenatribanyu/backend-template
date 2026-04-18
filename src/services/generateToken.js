import jwt from "jsonwebtoken";
import crypto from "crypto";
import config from "../config/config.js";

export async function generateAccessToken(user) {
  return jwt.sign({ id: user.id, role: user.Role }, config.app.jwt, {
    expiresIn: config.app.expireIn,
  });
}

export async function generateRefreshToken() {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  return refreshToken;
}

export async function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function verifyToken(token) {
  return jwt.verify(token, config.app.jwt);
}
