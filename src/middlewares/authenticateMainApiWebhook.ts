import { Request, Response, NextFunction } from "express";

export const authenticateMainApiWebhook = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const secret = req.headers["x-main-api-secret"] as string;
    
    if (!secret || secret !== process.env.MAIN_API_WEBHOOK_SECRET) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    
    next();
};