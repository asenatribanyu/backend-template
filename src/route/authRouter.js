import { Router } from "express";
import { register, login, logout, refreshToken, forgotPassword, resetPassword } from "../controller/authController.js";
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from "../middleware/validator/authValidator.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = Router();

router.post("/register", authLimiter, registerSchema, register);
router.post("/login", authLimiter, loginSchema, login);
router.post("/logout", authMiddleware, logout);
router.post("/refresh-token", refreshTokenSchema, refreshToken);
router.post("/forgot-password", authLimiter, forgotPasswordSchema, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordSchema, resetPassword);

export default router;
