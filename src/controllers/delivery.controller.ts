import { Request, Response, RequestHandler } from "express";
import Delivery from "../models/Delivery";
import Rate from "../models/Rate";
import Address from "../models/Address";
import { getSendApiService } from "../services/sendApiService";
import { CatchAsync } from "../utils/catchasync.util";

// ─── Calculate Delivery Fee ─────────────────────────────────────────────────────

export const calculateDeliveryFee: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const sendApiService = getSendApiService(req.mode === "test");
        const response = await sendApiService.calculateDeliveryFee(req.body);
        res.status(200).json(response);
    }
);

// ─── Request Delivery ─────────────────────────────────────────────────────────

export const requestDelivery: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const {
            externalReference,
            rateId,
            pickupAddressId,
            dropOffAddressId,
            pickupContact,
            dropoffContact,
            packageType,
            itemDescription,
            itemWeight,
            scheduledFor,
        } = req.body;
        const sendApiService = getSendApiService(req.mode === "test");

        // 1. Load the rate quote (must belong to this partner, be active & unexpired).
        const rate = await Rate.findOne({ _id: rateId, partnerId: partner._id, isActive: true, mode: req.mode });
        if (!rate) {
            return res.status(404).json({ success: false, message: "Rate not found" });
        }
        if (rate.expiresAt && rate.expiresAt.getTime() < Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Rate quote has expired. Please request a new rate.",
            });
        }

        // 2. Resolve pickup/dropoff addresses (default to the rate's addresses).
        const [pickup, dropoff] = await Promise.all([
            Address.findOne({ _id: pickupAddressId || rate.pickupAddressId, partnerId: partner._id, mode: req.mode }),
            Address.findOne({ _id: dropOffAddressId || rate.dropOffAddressId, partnerId: partner._id, mode: req.mode }),
        ]);
        if (!pickup || !dropoff) {
            return res.status(404).json({ success: false, message: "Pickup or dropoff address not found" });
        }
        if (
            pickup.latitude == null ||
            pickup.longitude == null ||
            dropoff.latitude == null ||
            dropoff.longitude == null
        ) {
            return res.status(400).json({ success: false, message: "Both addresses must have coordinates" });
        }

        // 3. Re-validate the amount: recompute for these addresses and compare to
        //    the rate. Guards against a wrong/reused rateId.
        const feeResult = await sendApiService.calculateDeliveryFee({
            pickupLocation: { address: pickup.address, lat: pickup.latitude, lng: pickup.longitude },
            dropoffLocation: { address: dropoff.address, lat: dropoff.latitude, lng: dropoff.longitude },
        });
        if (Math.round(feeResult.fee) !== Math.round(rate.amount)) {
            return res.status(400).json({
                success: false,
                message: "The rate does not match these addresses (amount mismatch). Please request a new rate.",
            });
        }

        // 4. Contacts the rider will call at pickup/dropoff (never the partner).
        if (
            !pickupContact?.fullName ||
            !pickupContact?.phoneNumber ||
            !dropoffContact?.fullName ||
            !dropoffContact?.phoneNumber
        ) {
            return res.status(400).json({
                success: false,
                message: "Pickup and dropoff contacts (fullName + phoneNumber) are required",
            });
        }

        // 5. Create the delivery on the platform — it deducts the partner wallet
        //    atomically and schedules/broadcasts to riders.
        let platformDelivery: any;
        try {
            const platformResponse = await sendApiService.createPartnerDelivery({
                partnerId: partner.mainApiPartnerId,
                fee: rate.amount,
                distance: rate.distance,
                pickupLocation: { address: pickup.address, lat: pickup.latitude, lng: pickup.longitude, shortName: pickup.label },
                dropoffLocation: { address: dropoff.address, lat: dropoff.latitude, lng: dropoff.longitude, shortName: dropoff.label },
                pickupContact,
                dropoffContact,
                packageType: packageType || "PARCEL",
                deliveryNote: itemDescription,
                scheduledFor,
            });
            platformDelivery = platformResponse.data;
        } catch (error: any) {
            const status = error?.response?.status || 400;
            const message = error?.response?.data?.message || "Failed to create delivery";
            return res.status(status).json({ success: false, message });
        }

        // 6. Store the partner-side delivery record linked to the platform delivery.
        const delivery = await Delivery.create({
            partnerId: partner._id,
            externalReference,
            mainApiDeliveryId: platformDelivery.deliveryId,
            rateId,
            pickupAddressId: pickupAddressId || rate.pickupAddressId,
            dropOffAddressId: dropOffAddressId || rate.dropOffAddressId,
            pickupAddress: rate.pickupAddress,
            dropOffAddress: rate.dropOffAddress,
            itemDescription,
            itemWeight,
            estimatedCost: rate.amount,
            status: platformDelivery.status || "SCHEDULED",
            mode: req.mode,
            scheduledFor: platformDelivery.scheduledFor || scheduledFor,
        });

        res.status(201).json({
            success: true,
            message: "Delivery created",
            data: {
                deliveryId: delivery._id,
                mainApiDeliveryId: platformDelivery.deliveryId,
                trackingId: platformDelivery.trackingId,
                status: platformDelivery.status,
                scheduledFor: platformDelivery.scheduledFor,
            },
        });
    }
);

// ─── Get Delivery Details ─────────────────────────────────────────────────────

export const getDelivery: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const partner = (req as any).partner;
        const sendApiService = getSendApiService(req.mode === "test");

        // Verify delivery belongs to partner
        const delivery = await Delivery.findOne({
            _id: id,
            partnerId: partner._id,
            mode: req.mode,
        }).populate("pickupAddressId dropOffAddressId rateId");

        if (!delivery) {
            res.status(404).json({
                success: false,
                message: "Delivery not found",
            });
            return;
        }

        // Get latest from main send-api
        const deliveryResponse = await sendApiService.getDelivery(delivery.mainApiDeliveryId as string);
        
        // Update local delivery status
        delivery.status = deliveryResponse.data.status || delivery.status;
        await delivery.save();
        
        res.status(200).json({ success: true, data: { delivery, mainApiDelivery: deliveryResponse.data } });
    }
);

// ─── List Partner's Deliveries ─────────────────────────────────────────────────

export const listDeliveries: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;

        // Optional ?limit for widgets like the dashboard's "recent deliveries".
        const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? ""), 10) || 0, 0), 100);

        let query = Delivery.find({
            partnerId: partner._id,
            mode: req.mode,
        })
            .sort({ createdAt: -1 })
            .populate("pickupAddressId dropOffAddressId rateId");

        if (limit > 0) query = query.limit(limit);

        const deliveries = await query;

        res.status(200).json({
            success: true,
            data: deliveries,
        });
    }
);

// ─── Cancel Delivery ─────────────────────────────────────────────────────

export const cancelDelivery: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        const partner = (req as any).partner;
        const sendApiService = getSendApiService(req.mode === "test");

        // Verify delivery belongs to partner
        const delivery = await Delivery.findOne({
            _id: id,
            partnerId: partner._id,
            mode: req.mode,
        });

        if (!delivery) {
            return res.status(404).json({
                success: false,
                message: "Delivery not found",
            });
        }

        // Cancel on the platform — it cancels (pre-pickup) and refunds the
        // partner wallet atomically.
        let platformResult;
        try {
            platformResult = await sendApiService.cancelPartnerDelivery(
                delivery.mainApiDeliveryId as string,
                partner.mainApiPartnerId,
            );
        } catch (error: any) {
            const status = error?.response?.status || 400;
            const message = error?.response?.data?.message || "Failed to cancel delivery";
            return res.status(status).json({ success: false, message });
        }

        delivery.status = "CANCELLED";
        await delivery.save();

        res.status(200).json({
            success: true,
            message: platformResult.message || "Delivery cancelled",
            data: platformResult.data,
        });
    }
);
