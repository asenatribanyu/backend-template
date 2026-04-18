import UAParser from "ua-parser-js";

export const parseUserAgent = (req) => {
  const parser = new UAParser(req.headers["user-agent"] || "");

  const uaResult = parser.getResult();

  return {
    browser: {
      name: uaResult.browser.name || null,
      version: uaResult.browser.version || null,
    },
    os: {
      name: uaResult.os.name || null,
      version: uaResult.os.version || null,
    },
    device: {
      model: uaResult.device.model || null,
      type: uaResult.device.type || "desktop", // fallback
      vendor: uaResult.device.vendor || null,
    },
    engine: {
      name: uaResult.engine.name || null,
      version: uaResult.engine.version || null,
    },
    raw: req.headers["user-agent"] || null,
  };
};
