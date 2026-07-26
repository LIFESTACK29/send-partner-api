import express, { Request, Response, NextFunction } from "express";
import Partner from "../models/Partner";
import { emitToPartner } from "../config/socket";
import { CatchAsync } from "../utils/catchasync.util";

const router = express.Router();

/**
 * Server-to-server endpoint the platform (send-api) calls to push realtime
 * events to a partner's dashboard. Guarded by the shared PARTNER_ADMIN_SECRET.
 */
const authenticateInternal = (req: Request, res: Response, next: NextFunction) => {
    const secret = req.headers["x-admin-secret"];
    if (!secret || secret !== process.env.PARTNER_ADMIN_SECRET) {
        return res.status(401).json({ success: false, message: "Unauthorized internal request" });
    }
    next();
};

/**
 * The platform finished provisioning a partner's funding account (DVA). Resolve
 * the platform partner id to our local partner and push it to their dashboard.
 * Body: { mainApiPartnerId, wallet: { accountNumber, bankName, accountName, balanceInNaira } }
 */
router.post(
    "/internal/wallet-updated",
    authenticateInternal,
    CatchAsync(async (req: Request, res: Response) => {
        const { mainApiPartnerId, wallet } = req.body;
        if (!mainApiPartnerId) {
            return res.status(400).json({ success: false, message: "mainApiPartnerId is required" });
        }

        const partner = await Partner.findOne({ mainApiPartnerId }).select("_id");
        if (partner) {
            emitToPartner(partner._id.toString(), "wallet_account_ready", wallet ?? {});
        }

        // Always 200 — this is best-effort realtime; the caller must not retry-storm.
        res.status(200).json({ success: true });
    }),
);

export default router;
