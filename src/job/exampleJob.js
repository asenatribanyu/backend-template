import cron from "node-cron";
import { createLogger } from "../utils/logger.js";
const logger = createLogger("ExampleJob");

/**
 * Example cron job — runs every day at midnight.
 * Replace this with your actual cron job logic.
 *
 * Cron expression reference:
 *   ┌────────────── second (optional)
 *   │ ┌──────────── minute
 *   │ │ ┌────────── hour
 *   │ │ │ ┌──────── day of month
 *   │ │ │ │ ┌────── month
 *   │ │ │ │ │ ┌──── day of week
 *   │ │ │ │ │ │
 *   * * * * * *
 */
export const startExampleJob = () => {
  cron.schedule("0 0 * * *", async () => {
    logger.info("Running example cron job...");

    try {
      // Your job logic here
      logger.info("Example cron job completed.");
    } catch (error) {
      logger.error("Example cron job failed:", { error });
    }
  });

  logger.info("Example cron job scheduled (daily at midnight).");
};
