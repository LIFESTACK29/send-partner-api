import mongoose, { Schema, Document } from "mongoose";

export interface IDelivery extends Document {
    partnerId: mongoose.Types.ObjectId;
    externalReference?: string;
    mainApiDeliveryId: string;
    rateId?: string;
    pickupAddressId?: mongoose.Types.ObjectId;
    dropOffAddressId?: mongoose.Types.ObjectId;
    pickupAddress?: {
        address: string;
        city?: string;
        state?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    dropOffAddress?: {
        address: string;
        city?: string;
        state?: string;
        country?: string;
        latitude?: number;
        longitude?: number;
    };
    itemDescription?: string;
    itemImage?: string;
    itemWeight?: number;
    estimatedCost?: number;
    actualCost?: number;
    status: string;
    mode: "live" | "test";
    scheduledFor?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const DeliverySchema: Schema = new Schema(
    {
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
        externalReference: { type: String },
        mainApiDeliveryId: { type: String, required: true },
        rateId: { type: String },
        pickupAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
        dropOffAddressId: { type: mongoose.Schema.Types.ObjectId, ref: "Address" },
        pickupAddress: {
            address: { type: String },
            city: { type: String },
            state: { type: String },
            country: { type: String },
            latitude: { type: Number },
            longitude: { type: Number },
        },
        dropOffAddress: {
            address: { type: String },
            city: { type: String },
            state: { type: String },
            country: { type: String },
            latitude: { type: Number },
            longitude: { type: Number },
        },
        itemDescription: { type: String },
        itemImage: { type: String },
        itemWeight: { type: Number },
        estimatedCost: { type: Number },
        actualCost: { type: Number },
        status: { type: String, default: "PENDING" },
        mode: { type: String, enum: ["live", "test"], required: true },
        scheduledFor: { type: Date },
    },
    { timestamps: true }
);

export default mongoose.model<IDelivery>("Delivery", DeliverySchema);