import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IPartner extends Document {
    businessName: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    password?: string;
    referralCode?: string;
    mainApiPartnerId?: string; // Linked Partner id in the platform (main-api)
    liveApiKey: string; // sha256 hash — used for request lookup
    liveApiSecret: string; // bcrypt hash (legacy) — not used for reveal
    testApiKey: string; // sha256 hash — used for request lookup
    testApiSecret: string; // bcrypt hash (legacy) — not used for reveal
    // Reversibly-encrypted copies so the dashboard can display / reveal them.
    liveApiKeyEnc?: string;
    liveApiSecretEnc?: string;
    testApiKeyEnc?: string;
    testApiSecretEnc?: string;
    // Live secret may only be revealed once; timestamp is set on first reveal.
    liveSecretRevealedAt?: Date | null;
    keysGeneratedAt?: Date | null;
    // Per-mode webhook URLs. Requests are signed with the matching API secret
    // (liveApiSecretEnc / testApiSecretEnc) — no separate webhook secret.
    liveWebhookUrl?: string;
    testWebhookUrl?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const PartnerSchema: Schema = new Schema(
    {
        businessName: { type: String, required: true },
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phoneNumber: { type: String, required: true },
        password: { type: String, required: true, select: false },
        referralCode: { type: String },
        mainApiPartnerId: { type: String },
        liveApiKey: { type: String, required: true, unique: true },
        liveApiSecret: { type: String, required: true },
        testApiKey: { type: String, required: true, unique: true },
        testApiSecret: { type: String, required: true },
        liveApiKeyEnc: { type: String, select: false },
        liveApiSecretEnc: { type: String, select: false },
        testApiKeyEnc: { type: String, select: false },
        testApiSecretEnc: { type: String, select: false },
        liveSecretRevealedAt: { type: Date, default: null },
        keysGeneratedAt: { type: Date, default: null },
        liveWebhookUrl: { type: String },
        testWebhookUrl: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Hash password before saving
PartnerSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password as string, salt);
    next();
});

// Compare password method
PartnerSchema.methods.comparePassword = async function (
    candidatePassword: string,
): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IPartner>("Partner", PartnerSchema);
