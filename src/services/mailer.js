import config from "../config/config.js";
import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure,
  auth: {
    user: config.mail.user,
    pass: config.mail.password,
  },
});

export async function sendEmail(to, subject, html) {
  try {
    await transporter.sendMail({
      from: config.mail.user,
      to,
      subject,
      html,
    });
    logger.info("Email sent successfully");
  } catch (error) {
    logger.error("Failed to send email:", error);
  }
}
