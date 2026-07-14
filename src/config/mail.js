export default {
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  user: process.env.MAIL_USER,
  password: process.env.MAIL_PASSWORD,
  secure: process.env.MAIL_SECURE?.toLowerCase() === "true",
  from: process.env.MAIL_FROM,
};
