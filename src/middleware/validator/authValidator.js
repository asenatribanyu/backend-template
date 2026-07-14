import Joi from "joi";
import { validate } from "./index.js";

export const registerSchema = validate(
  Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(6).max(128).required(),
    firstName: Joi.string().max(255).required(),
    lastName: Joi.string().max(255).required(),
  }),
);

export const loginSchema = validate(
  Joi.object({
    login: Joi.string().max(255).required(),
    password: Joi.string().max(128).required(),
  }),
);

export const refreshTokenSchema = validate(
  Joi.object({
    refreshToken: Joi.string().required(),
  }),
);

export const forgotPasswordSchema = validate(
  Joi.object({
    email: Joi.string().email().max(255).required(),
  }),
);

export const resetPasswordSchema = validate(
  Joi.object({
    token: Joi.string().required(),
    email: Joi.string().email().max(255).optional(),
    password: Joi.string().min(6).max(128).required(),
  }),
);
export const verifyEmailSchema = validate(
  Joi.object({
    token: Joi.string().required(),
    email: Joi.string().email().max(255).required(),
  }),
);

export const resendVerificationSchema = validate(
  Joi.object({
    email: Joi.string().email().max(255).required(),
  }),
);
