import { UAParser } from "ua-parser-js";

export const parseUserAgent = (req) => {
  const parser = new UAParser(req.headers["user-agent"] || "");
  const ua = parser.getResult();

  const normalize = (val) => val?.toLowerCase() || null;

  return {
    browser: {
      name: normalize(ua.browser.name),
      version: ua.browser.version || null,
    },
    os: {
      name: normalize(ua.os.name),
      version: ua.os.version || null,
    },
    device: {
      model: ua.device.model || null,
      type: ua.device.type || "desktop",
      vendor: ua.device.vendor || null,
    },
    engine: {
      name: normalize(ua.engine.name),
      version: ua.engine.version || null,
    },
    isMobile: ua.device.type === "mobile",
    raw: req.headers["user-agent"] || null,
    parsedAt: new Date(),
  };
};

export const getClientIp = (req) => {
  return req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
};
