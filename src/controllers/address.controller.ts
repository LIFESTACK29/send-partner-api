import { Request, Response, RequestHandler } from "express";
import Address from "../models/Address";
import { CatchAsync } from "../utils/catchasync.util";

export const createAddress: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const { label, name, phoneNumber, email, address, city, state, country, postalCode, latitude, longitude } = req.body;

        const newAddress = await Address.create({
            partnerId: partner._id,
            label,
            name,
            phoneNumber,
            email,
            address,
            city,
            state,
            country: country || "Nigeria",
            postalCode,
            latitude,
            longitude,
            mode: req.mode,
        });
        
        res.status(201).json({ success: true, data: newAddress });
    }
);

export const getAddresses: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const addresses = await Address.find({ partnerId: partner._id, isActive: true, mode: req.mode }).sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, data: addresses });
    }
);

export const getAddressById: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const address = await Address.findOne({ _id: req.params.id, partnerId: partner._id, mode: req.mode });
        
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        
        res.status(200).json({ success: true, data: address });
    }
);

export const updateAddress: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const { label, name, phoneNumber, email, address, city, state, country, postalCode, latitude, longitude, isActive } = req.body;

        const updatedAddress = await Address.findOneAndUpdate(
            { _id: req.params.id, partnerId: partner._id, mode: req.mode },
            { label, name, phoneNumber, email, address, city, state, country, postalCode, latitude, longitude, isActive },
            { new: true }
        );
        
        if (!updatedAddress) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        
        res.status(200).json({ success: true, data: updatedAddress });
    }
);

export const deleteAddress: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        
        const address = await Address.findOneAndUpdate(
            { _id: req.params.id, partnerId: partner._id, mode: req.mode },
            { isActive: false },
            { new: true }
        );
        
        if (!address) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }
        
        res.status(200).json({ success: true, message: "Address deactivated" });
    }
);