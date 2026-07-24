import { Request, Response, RequestHandler } from "express";
import Delivery from "../models/Delivery";
import { CatchAsync } from "../utils/catchasync.util";

/**
 * Dashboard shipment stats for the authenticated partner, in the current mode
 * (live for the dashboard). Aggregates the partner-side Delivery collection —
 * whose status is kept current by platform webhooks — into the four cards.
 *
 * Platform statuses: SCHEDULED | PENDING | ACCEPTED | ONGOING | DELIVERED | CANCELLED
 */
export const getDashboardStats: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;

        const rows = await Delivery.aggregate<{ _id: string; count: number }>([
            { $match: { partnerId: partner._id, mode: req.mode } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const byStatus: Record<string, number> = {};
        let total = 0;
        for (const row of rows) {
            byStatus[row._id] = row.count;
            total += row.count;
        }

        const inTransit = (byStatus.ACCEPTED || 0) + (byStatus.ONGOING || 0);
        const delivered = byStatus.DELIVERED || 0;
        const cancelled = byStatus.CANCELLED || 0;
        const pending = (byStatus.PENDING || 0) + (byStatus.SCHEDULED || 0);

        res.status(200).json({
            success: true,
            message: "Dashboard stats retrieved",
            data: { total, inTransit, delivered, cancelled, pending, byStatus },
        });
    }
);
