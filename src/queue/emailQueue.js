import { Queue } from "bullmq";
import { redis } from "../libs/redis.js";
import config from "../config/config.js";

export const emailQueue = new Queue("email-queue", {
  connection: redis,
  defaultJobOptions: config.queue.defaultJobOptions,
  concurrency: config.queue.concurrency,
});
