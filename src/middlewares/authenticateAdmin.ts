import { Request, Response, NextFunction } from "express";

/**
 * Guards admin endpoints that the platform's admin backend calls server-to-server.
 */
export const authenticateAdminRequest = (
    req: Request,
    res: Response,
    next: NextFunction,
): void => {
    const secret = req.headers["x-admin-secret"];
    if (!secret || secret !== process.env.PARTNER_ADMIN_SECRET) {
        res.status(401).json({ success: false, message: "Unauthorized admin request" });
        return;
    }
    next();
};
