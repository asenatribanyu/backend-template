import nodemailer from "nodemailer";
import config from "../config/index.js";
import { compileTemplate } from "./template.service.js";

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure,
  auth: {
    user: config.mail.user,
    pass: config.mail.password,
  },
});

export const sendEmail = async ({ to, subject, template, data }) => {
  const html = compileTemplate(template, data);

  await transporter.sendMail({
    from: config.mail.from,
    to,
    subject,
    html,
  });
};
