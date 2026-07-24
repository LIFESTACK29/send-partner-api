import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      mode: "live" | "test";
    }
  }
}

export const modeMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const forced = (process.env.PARTNER_MODE || "").toLowerCase();
  if (forced === "test" || forced === "live") {
    req.mode = forced;
    next();
    return;
  }

  const explicit = (req.get("x-partner-mode") || "").toLowerCase();
  if (explicit === "test" || explicit === "live") {
    req.mode = explicit;
    next();
    return;
  }

  const host = req.get("host");
  if (host && (host.includes("sandbox") || host.includes("test"))) {
    req.mode = "test";
    next();
    return;
  }

  req.mode = "live";
  next();
};
