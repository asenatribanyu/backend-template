import { v7 as uuidv7 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";

export const requestContext = new AsyncLocalStorage();

export const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers["x-request-id"] || uuidv7();
  res.setHeader("X-Request-Id", requestId);

  requestContext.run({ requestId }, () => {
    next();
  });
};
