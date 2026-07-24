import mongoose, { Schema, Document } from "mongoose";

export interface IAddress extends Document {
    partnerId: mongoose.Types.ObjectId;
    label: string;
    // Contact at this location (who the rider calls / the address belongs to).
    name?: string;
    phoneNumber?: string;
    email?: string;
    address: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    isActive: boolean;
    mode: "live" | "test";
    createdAt: Date;
    updatedAt: Date;
}

const AddressSchema: Schema = new Schema(
    {
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", required: true },
        label: { type: String, required: true },
        name: { type: String },
        phoneNumber: { type: String },
        email: { type: String },
        address: { type: String, required: true },
        city: { type: String },
        state: { type: String },
        country: { type: String, default: "Nigeria" },
        postalCode: { type: String },
        latitude: { type: Number },
        longitude: { type: Number },
        isActive: { type: Boolean, default: true },
        mode: { type: String, enum: ["live", "test"], required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IAddress>("Address", AddressSchema);