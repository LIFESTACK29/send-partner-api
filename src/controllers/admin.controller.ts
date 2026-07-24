import { Request, Response, RequestHandler } from "express";
import Partner from "../models/Partner";
import Delivery from "../models/Delivery";
import { CatchAsync } from "../utils/catchasync.util";

/**
 * List all partners (for the platform admin).
 * @route GET /api/v1/admin/partners
 */
export const listPartners: RequestHandler = CatchAsync(
    async (_req: Request, res: Response) => {
        const partners = await Partner.find()
            .select("businessName firstName lastName email phoneNumber isActive createdAt")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: "Partners retrieved successfully",
            data: partners,
        });
    },
);

/**
 * List a partner's deliveries (for the platform admin).
 * @route GET /api/v1/admin/partners/:partnerId/deliveries
 */
export const listPartnerDeliveries: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { partnerId } = req.params;

        const deliveries = await Delivery.find({ partnerId }).sort({
            createdAt: -1,
        });

        res.status(200).json({
            success: true,
            message: "Partner deliveries retrieved successfully",
            data: deliveries,
        });
    },
);
