import dotenv from "dotenv";

dotenv.config();

export default {
  path: process.env.REDIS_PATH,
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};
