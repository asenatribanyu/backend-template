import Joi from "joi";
import { validate } from "./validate.js";

export const registerSchema = validate(
  Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
  }),
);

export const loginSchema = validate(
  Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
);

export const refreshTokenSchema = validate(
  Joi.object({
    refreshToken: Joi.string().required(),
  }),
);

export const forgotPasswordSchema = validate(
  Joi.object({
    email: Joi.string().email().required(),
  }),
);

export const resetPasswordSchema = validate(
  Joi.object({
    token: Joi.string().required(),
    email: Joi.string().email().optional(),
    password: Joi.string().min(6).required(),
  }),
);
