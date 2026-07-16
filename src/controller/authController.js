import { createLogger } from "../utils/logger.js";
const logger = createLogger("AuthController");
import { sendSuccess, sendError } from "../utils/response.js";
import { authService } from "../services/authService.js";

const register = async (req, res) => {
  try {
    await authService.registerUser(req.body, req);
    return sendSuccess(res, null, "User registered successfully. Please check your email to verify your account.", 201);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Registration failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const login = async (req, res) => {
  try {
    const result = await authService.loginUser(req.body, req);
    return sendSuccess(res, result, "Login successful", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Login failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const logout = async (req, res) => {
  try {
    await authService.logoutUser(req.user.id, req.body, req);
    return sendSuccess(res, null, "Logout successful", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Failed to logout:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const refreshToken = async (req, res) => {
  try {
    const result = await authService.refreshUserToken(req.body, req);
    return sendSuccess(res, result, "Refresh token successful", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Refresh token failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    await authService.processForgotPassword(req.body, req);
    return sendSuccess(res, null, "If email exists, reset link has been sent", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Forgot password failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const resetPassword = async (req, res) => {
  try {
    await authService.processResetPassword(req.body, req);
    return sendSuccess(res, null, "Password has been reset successfully", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Reset password failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const result = await authService.verifyUserEmail(req.body, req);
    return sendSuccess(res, null, result || "Email verified successfully", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Email verification failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

const resendVerification = async (req, res) => {
  try {
    await authService.resendUserVerification(req.body, req);
    return sendSuccess(res, null, "If the email exists and is not verified, a verification link has been sent.", 200);
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error.message, error.statusCode);
    }
    logger.error("Resend verification failed:", { error });
    return sendError(res, "Internal Server Error", 500, error);
  }
};

export { register, login, logout, refreshToken, forgotPassword, resetPassword, verifyEmail, resendVerification };
