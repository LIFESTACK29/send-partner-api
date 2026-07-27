import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";

declare global {
  namespace Express {
    interface Request {
      mode: "live" | "test";
    }
  }
}

/**
 * Resolves the live/test mode for a request and makes it observable:
 *  - sets an `x-resolved-mode` RESPONSE header (see it in the browser Network tab),
 *  - logs per request when LOG_MODE=1 (so you can watch it in the server logs).
 *
 * Priority: PARTNER_MODE env (forced on the live/sandbox services) →
 *           x-partner-mode header (the dashboard toggle) → hostname → default live.
 */
export const modeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const forced = (process.env.PARTNER_MODE || "").toLowerCase();
  const explicit = (req.get("x-partner-mode") || "").toLowerCase();
  const host = req.get("host") || "";

  let mode: "live" | "test" = "live";
  let source = "default";

  if (forced === "test" || forced === "live") {
    mode = forced;
    source = "env:PARTNER_MODE";
  } else if (explicit === "test" || explicit === "live") {
    mode = explicit;
    source = "header:x-partner-mode";
  } else if (host.includes("sandbox") || host.includes("test")) {
    mode = "test";
    source = "host";
  }

  req.mode = mode;
  res.setHeader("x-resolved-mode", mode);

  if (process.env.LOG_MODE === "1") {
    logger.info("[mode]", {
      method: req.method,
      path: req.originalUrl,
      mode,
      source,
      sentHeader: explicit || null,
    });
  }

  next();
};
