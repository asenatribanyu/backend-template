import { Router } from "express";
import { register, login, logout, refreshToken, forgotPassword, resetPassword } from "../controller/authController.js";
import { registerSchema, loginSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from "../middleware/validator/authValidator.js";

const router = Router();

router.post("/register", registerSchema, register);
router.post("/login", loginSchema, login);
router.post("/logout", logout);
router.post("/refresh-token", refreshTokenSchema, refreshToken);
router.post("/forgot-password", forgotPasswordSchema, forgotPassword);
router.post("/reset-password", resetPasswordSchema, resetPassword);

export default router;
