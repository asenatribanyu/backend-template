import Joi from "joi";
import { validate } from "./index.js";

export const updateUserSchema = validate(
  Joi.object({
    username: Joi.string(),
    email: Joi.string().email(),
    phone: Joi.string(),
    password: Joi.string().min(6),

    profile: Joi.object({
      firstName: Joi.string(),
      lastName: Joi.string(),
      dateOfBirth: Joi.date(),
      gender: Joi.string().valid("male", "female"),
      address: Joi.string(),
      position: Joi.string(),
      occupation: Joi.string(),
      bio: Joi.string(),
    }),
  }),
);
