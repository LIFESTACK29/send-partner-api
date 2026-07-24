import { Request, Response, RequestHandler } from "express";
import Partner from "../models/Partner";
import Delivery from "../models/Delivery";
import { CatchAsync } from "../utils/catchasync.util";
import { sendPartnerWebhook } from "../utils/webhook.util";

/**
 * Handle webhooks from the platform (send-api). Triggered when a delivery's
 * status changes. Keyed off the partner-side Delivery (by platform delivery id).
 */
export const handleMainApiWebhook: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { deliveryId, status, metadata } = req.body;

        if (!deliveryId || !status) {
            res.status(400).json({ message: "deliveryId and status are required" });
            return;
        }

        // 1. Find & update the partner-side delivery by platform delivery id.
        const delivery = await Delivery.findOne({ mainApiDeliveryId: deliveryId });
        if (!delivery) {
            res.status(404).json({ message: "Delivery not found" });
            return;
        }

        delivery.status = status;
        if (metadata?.actualCost) {
            delivery.actualCost = metadata.actualCost;
        }
        await delivery.save();

        // 2. Forward to the partner's webhook for THIS delivery's mode, signed
        //    with that mode's API secret (the partner already holds it).
        const partner = await Partner.findById(delivery.partnerId).select(
            "+liveApiSecretEnc +testApiSecretEnc",
        );
        const isTest = delivery.mode === "test";
        const url = isTest ? partner?.testWebhookUrl : partner?.liveWebhookUrl;
        const secret = isTest ? partner?.testApiSecretEnc : partner?.liveApiSecretEnc;

        if (!partner || !url) {
            res.status(200).json({ success: true, message: "No webhook configured for partner" });
            return;
        }

        await sendPartnerWebhook(url, secret, {
            event: "delivery.status_updated",
            mode: delivery.mode,
            data: {
                deliveryId: delivery._id,
                externalReference: delivery.externalReference,
                status,
                mainApiDeliveryId: deliveryId,
                metadata,
            },
        });

        res.status(200).json({ success: true, message: "Webhook processed" });
    }
);
