import app from "./app.js";
import db from "./db.js";
import mail from "./mail.js";
import redis from "./redis.js";
import queue from "./queue.js";

const config = {
  app,
  db,
  mail,
  redis,
  queue,
};

export default config;
