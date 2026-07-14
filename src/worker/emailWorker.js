import "dotenv/config.js";

import { Worker } from "bullmq";
import { redis } from "../libs/redis.js";
import { sendEmail } from "../services/mailer.js";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("EmailWorker");

logger.info("Email worker started...");

export const emailWorker = new Worker(
  "email-queue",
  async (job) => {
    const { to, subject, template, data } = job.data;

    logger.info(`Processing email job ${job.id} to ${to}`);

    try {
      await sendEmail({
        to,
        subject,
        template,
        data,
      });

      logger.info(`Email sent to ${to}`);
    } catch (err) {
      logger.error(`Failed email job ${job.id}`, { error: err });
      throw err;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  },
);

emailWorker.on("completed", (job) => {
  logger.info(`Job ${job.id} completed`);
});

emailWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed:`, { error: err });
});
