import Joi from "joi";
import { validate } from "./index.js";

export const createPermissionSchema = validate(
  Joi.object({
    name: Joi.string().required(),
  }),
);
