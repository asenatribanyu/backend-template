import Joi from "joi";
import { validate } from "./index.js";

export const createRoleSchema = validate(
  Joi.object({
    name: Joi.string().required(),
    scope: Joi.string().valid("all", "own").optional(),
    permissionIds: Joi.array().items(Joi.string().uuid()).optional(),
  }),
);

export const updateRoleSchema = validate(
  Joi.object({
    name: Joi.string().optional(),
    scope: Joi.string().valid("all", "own").optional(),
    permissionIds: Joi.array().items(Joi.string().uuid()).optional(),
  }),
);
