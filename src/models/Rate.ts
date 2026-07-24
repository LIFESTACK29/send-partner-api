import mongoose, { Schema, Document } from "mongoose";

export interface IRate extends Document {
    partnerId: mongoose.Types.ObjectId;
    pickupAddress: {
        address: string;
        city?: string;
        state?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    dropOffAddress: {
        address: string;
        city?: string;
        state?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    pickupAddressId?: mongoose.Types.ObjectId;
    dropOffAddressId?: mongoose.Types.ObjectId;
    amount: number;
    currency?: string;
    estimatedDuration?: string;
    distance?: number;
    vehicleType?: string;
    isActive: boolean;
    expiresAt: Date;
    mode: "live" | "test";
    createdAt: Date;
    updatedAt: Date;
}

const RateSchema: Schema = new Schema(
    {
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
        pickupAddress: {
            address: { type: String, required: true },
            city: { type: String },
            state: { type: String },
            country: { type: String, default: "Nigeria" },
            latitude: { type: Number },
            longitude: { type: Number },
        },
        dropOffAddress: {
            address: { type: String, required: true },
            city: { type: String },
            state: { type: String },
            country: { type: String, default: "Nigeria" },
            latitude: { type: Number },
            longitude: { type: Number },
        },
        pickupAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
        dropOffAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
        amount: { type: Number, required: true },
        currency: { type: String, default: "NGN" },
        estimatedDuration: { type: String },
        distance: { type: Number },
        vehicleType: { type: String },
        isActive: { type: Boolean, default: true },
        expiresAt: { type: Date, required: true },
        mode: { type: String, enum: ["live", "test"], required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IRate>("Rate", RateSchema);