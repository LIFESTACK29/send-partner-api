import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      mode: "live" | "test";
    }
  }
}

export const modeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 1. Explicit override from the dashboard (the mode toggle). Safe for API-key
  //    callers too: authenticatePartnerApiKey still rejects a key used against a
  //    mode it doesn't belong to, so this header can't cross a key into test/live.
  const explicit = (req.get("x-partner-mode") || "").toLowerCase();
  if (explicit === "test" || explicit === "live") {
    req.mode = explicit;
    next();
    return;
  }

  // 2. Host-based: a sandbox/test host implies test mode.
  const host = req.get("host");
  if (host && (host.includes("sandbox") || host.includes("test"))) {
    req.mode = "test";
    next();
    return;
  }

  // 3. Default to live mode.
  req.mode = "live";
  next();
};
