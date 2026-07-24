import { Request, Response, RequestHandler } from "express";
import Rate from "../models/Rate";
import Address from "../models/Address";
import { CatchAsync } from "../utils/catchasync.util";
import { getSendApiService } from "../services/sendApiService";

// How long a quote is honoured before it must be re-fetched.
const RATE_TTL_MINUTES = 30;

const toLocation = (address: any) => ({
    address: address.address,
    city: address.city,
    state: address.state,
    country: address.country,
    latitude: address.latitude,
    longitude: address.longitude,
});

/**
 * Live rate quote. The partner provides saved pickup/dropoff address ids; the
 * platform computes the fee (never partner-set). Returns a `rateId` the partner
 * references when creating the delivery, plus the amount and an expiry.
 */
export const createRate: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const { pickupAddressId, dropOffAddressId } = req.body;

        if (!pickupAddressId || !dropOffAddressId) {
            return res.status(400).json({
                success: false,
                message: "pickupAddressId and dropOffAddressId are required",
            });
        }

        const [pickup, dropoff] = await Promise.all([
            Address.findOne({ _id: pickupAddressId, partnerId: partner._id, mode: req.mode }),
            Address.findOne({ _id: dropOffAddressId, partnerId: partner._id, mode: req.mode }),
        ]);

        if (!pickup) {
            return res.status(404).json({ success: false, message: "Pickup address not found" });
        }
        if (!dropoff) {
            return res.status(404).json({ success: false, message: "Dropoff address not found" });
        }

        if (
            pickup.latitude == null ||
            pickup.longitude == null ||
            dropoff.latitude == null ||
            dropoff.longitude == null
        ) {
            return res.status(400).json({
                success: false,
                message: "Both addresses must have coordinates to quote a rate",
            });
        }

        // Compute the fee on the platform — the single source of truth.
        const sendApiService = getSendApiService(req.mode === "test");
        const feeResult = await sendApiService.calculateDeliveryFee({
            pickupLocation: { address: pickup.address, lat: pickup.latitude, lng: pickup.longitude },
            dropoffLocation: { address: dropoff.address, lat: dropoff.latitude, lng: dropoff.longitude },
        });

        const amount = feeResult.fee;
        const distance = feeResult.distance;
        const expiresAt = new Date(Date.now() + RATE_TTL_MINUTES * 60 * 1000);

        const rate = await Rate.create({
            partnerId: partner._id,
            pickupAddress: toLocation(pickup),
            dropOffAddress: toLocation(dropoff),
            pickupAddressId,
            dropOffAddressId,
            amount,
            currency: "NGN",
            distance,
            expiresAt,
            mode: req.mode,
        });

        res.status(201).json({
            success: true,
            message: "Rate quote generated",
            data: {
                rateId: rate._id,
                amount,
                currency: "NGN",
                distance,
                expiresAt,
            },
        });
    }
);

export const getRates: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const rates = await Rate.find({ partnerId: partner._id, isActive: true, mode: req.mode })
            .sort({ createdAt: -1 })
            .populate("pickupAddressId dropOffAddressId");

        res.status(200).json({ success: true, data: rates });
    }
);

export const getRateById: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const rate = await Rate.findOne({ _id: req.params.id, partnerId: partner._id, mode: req.mode })
            .populate("pickupAddressId dropOffAddressId");

        if (!rate) {
            return res.status(404).json({ success: false, message: "Rate not found" });
        }

        res.status(200).json({ success: true, data: rate });
    }
);

export const deactivateRate: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const rate = await Rate.findOneAndUpdate(
            { _id: req.params.id, partnerId: partner._id, mode: req.mode },
            { isActive: false },
            { new: true }
        );

        if (!rate) {
            return res.status(404).json({ success: false, message: "Rate not found" });
        }

        res.status(200).json({ success: true, message: "Rate deactivated" });
    }
);