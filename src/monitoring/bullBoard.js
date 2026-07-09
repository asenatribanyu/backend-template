import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { emailQueue } from "../queue/emailQueue.js";

export const setupBullBoard = (app, { authMiddleware, authorizePermission }) => {
  const serverAdapter = new ExpressAdapter();

  serverAdapter.setBasePath("/admin/queues");

  createBullBoard({
    queues: [new BullMQAdapter(emailQueue)],
    serverAdapter,
  });

  app.use("/admin/queues", authMiddleware, authorizePermission("bullBoard.access"), serverAdapter.getRouter());
};
