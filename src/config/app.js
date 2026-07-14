const required = ["JWT_SECRET", "DB_HOST", "DB_NAME", "DB_USER", "DB_DIALECT", "FRONTEND_URL", "NODE_ENV"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export default {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || "DEVELOPMENT",
  jwt: process.env.JWT_SECRET,
  expireIn: process.env.JWT_EXPIRE_IN || "1d",
  refreshExpireIn: Number(process.env.REFRESH_TOKEN_EXPIRE_IN) || 7,
  frontendUrl: process.env.FRONTEND_URL,
  cors: process.env.CORS ? process.env.CORS.split(",").map((s) => s.trim()) : [],
};
