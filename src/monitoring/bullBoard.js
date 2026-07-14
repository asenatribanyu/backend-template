import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { emailQueue } from "../queue/emailQueue.js";

import { adminBasicAuth } from "../middleware/basicAuthMiddleware.js";

export const setupBullBoard = (app) => {
  const serverAdapter = new ExpressAdapter();

  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use("/admin/queues", adminBasicAuth, serverAdapter.getRouter());
};
