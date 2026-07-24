import { Request, Response, NextFunction } from "express";
import Partner from "../models/Partner";
import crypto from "crypto";
import jwt from "jsonwebtoken";

declare global {
    namespace Express {
        interface Request {
            partner?: any;
        }
    }
}

/**
 * API Key Authentication (for external API calls)
 */
export const authenticatePartnerApiKey = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Unauthorized - no API key provided" });
        }
        const apiKey = authHeader.split(" ")[1];

        const hashedApiKey = crypto.createHash("sha256").update(apiKey).digest("hex");

        // Look the key up in both live and test columns to identify it
        const partner = await Partner.findOne({
            $or: [{ liveApiKey: hashedApiKey }, { testApiKey: hashedApiKey }],
            isActive: true,
        });

        if (!partner) {
            return res.status(401).json({ success: false, message: "Unauthorized - invalid API key" });
        }

        // The key must match the mode of the URL it was sent to:
        // a live key on the test URL (or a test key on the live URL) is rejected.
        const keyMode = partner.liveApiKey === hashedApiKey ? "live" : "test";
        if (keyMode !== req.mode) {
            return res.status(401).json({
                success: false,
                message: `Unauthorized - ${keyMode} API key cannot be used on the ${req.mode} endpoint`,
            });
        }

        req.partner = partner;
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};

/**
 * Combined auth for routes served to BOTH the dashboard (JWT session) and
 * developers (API key). A developer sends only `Authorization: Bearer <key>` —
 * the key is recognised by its `pub_live_` / `pub_test_` prefix. The legacy
 * `x-partner-key` header is still honoured for backward compatibility.
 */
export const authenticatePartnerBoth = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    const looksLikeApiKey =
        token.startsWith("pub_live_") || token.startsWith("pub_test_");

    if (looksLikeApiKey || req.headers["x-partner-key"]) {
        return authenticatePartnerApiKey(req, res, next);
    }
    return authenticatePartnerDashboard(req, res, next);
};

/**
 * Dashboard Authentication (JWT based for web portal)
 */
export const authenticatePartnerDashboard = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ success: false, message: "Unauthorized - no token provided" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;

        const partner = await Partner.findOne({ _id: decoded.partnerId, isActive: true });
        if (!partner) {
            return res.status(401).json({ success: false, message: "Unauthorized - invalid session" });
        }

        req.partner = partner;
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: "Unauthorized - invalid or expired token" });
    }
};
