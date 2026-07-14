import { Router } from "express";
import {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} from "../controller/authController.js";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
} from "../middleware/validator/authValidator.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

import { authLimiter } from "../middleware/rateLimitMiddleware.js";

const router = Router();

router.post("/register", authLimiter, registerSchema, register);
router.post("/login", authLimiter, loginSchema, login);
router.post("/logout", authMiddleware, logout);
router.post("/refresh-token", refreshTokenSchema, refreshToken);
router.post("/forgot-password", authLimiter, forgotPasswordSchema, forgotPassword);
router.post("/reset-password", authLimiter, resetPasswordSchema, resetPassword);
router.post("/verify-email", verifyEmailSchema, verifyEmail);
router.post("/resend-verification", authLimiter, resendVerificationSchema, resendVerification);

export default router;
