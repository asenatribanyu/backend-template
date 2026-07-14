import Joi from "joi";
import { validate } from "./index.js";

export const updateUserSchema = validate(
  Joi.object({
    username: Joi.string().max(30),
    email: Joi.string().email().max(255),
    phone: Joi.string().max(255),
    password: Joi.string().min(6).max(128),

    profile: Joi.object({
      firstName: Joi.string().max(255),
      lastName: Joi.string().max(255),
      dateOfBirth: Joi.date(),
      gender: Joi.string().valid("male", "female"),
      address: Joi.string().max(255),
      position: Joi.string().max(255),
      occupation: Joi.string().max(255),
      bio: Joi.string().max(5000),
    }),
  }),
);

export const updateRoleSchema = validate(
  Joi.object({
    roleId: Joi.number().required(),
  }),
);

export const updateStatusSchema = validate(
  Joi.object({
    isBlocked: Joi.boolean().required(),
  }),
);
