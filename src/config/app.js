import dotenv from "dotenv";

dotenv.config();

export default {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV,
  jwt: process.env.JWT_SECRET,
  expireIn: process.env.JWT_EXPIRE_IN,
  refreshExpireIn: process.env.REFRESH_TOKEN_EXPIRE_IN,
  frontendUrl: process.env.FRONTEND_URL,
};
