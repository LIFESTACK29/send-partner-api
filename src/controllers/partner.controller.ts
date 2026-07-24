import { Request, Response, RequestHandler } from "express";
import Partner from "../models/Partner";
import { getSendApiService } from "../services/sendApiService";
import { CatchAsync } from "../utils/catchasync.util";
import { encryptSecret, decryptSecret } from "../utils/crypto.util";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ─── Helper Functions ───────────────────────────────────────────────────────────

const sha256 = (value: string): string =>
    crypto.createHash("sha256").update(value).digest("hex");

/**
 * Generate a fresh set of live + test API keys/secrets. Returns the plaintext
 * (to hand back to the partner) alongside the storage fields: keys are stored
 * as a sha256 hash for lookup AND an encrypted copy for later display; secrets
 * are stored as a bcrypt hash (legacy) AND an encrypted copy for reveal.
 */
const buildKeySet = async () => {
    const liveApiKey = `pub_live_${crypto.randomBytes(24).toString("hex")}`;
    const liveApiSecret = `sk_live_${crypto.randomBytes(24).toString("hex")}`;
    const testApiKey = `pub_test_${crypto.randomBytes(24).toString("hex")}`;
    const testApiSecret = `sk_test_${crypto.randomBytes(24).toString("hex")}`;

    const fields = {
        liveApiKey: sha256(liveApiKey),
        liveApiSecret: await bcrypt.hash(liveApiSecret, 12),
        testApiKey: sha256(testApiKey),
        testApiSecret: await bcrypt.hash(testApiSecret, 12),
        liveApiKeyEnc: encryptSecret(liveApiKey),
        liveApiSecretEnc: encryptSecret(liveApiSecret),
        testApiKeyEnc: encryptSecret(testApiKey),
        testApiSecretEnc: encryptSecret(testApiSecret),
        keysGeneratedAt: new Date(),
        liveSecretRevealedAt: null,
    };

    return { plain: { liveApiKey, liveApiSecret, testApiKey, testApiSecret }, fields };
};

const signPartnerToken = (partnerId: string): string => {
    return jwt.sign(
        { partnerId },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );
};

// ─── Register Partner ───────────────────────────────────────────────

export const registerPartner: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { businessName, firstName, lastName, email, phoneNumber, password, referralCode } = req.body;
        const sendApiService = getSendApiService(false); // Registration always uses live mode

        if (!businessName || !firstName || !lastName || !email || !phoneNumber || !password) {
            res.status(400).json({
                success: false,
                message: "Business name, first name, last name, email, phone number, and password are required",
            });
            return;
        }

        // Check if partner already exists
        const existingPartner = await Partner.findOne({ email });
        if (existingPartner) {
            res.status(400).json({
                success: false,
                message: "Partner with this email already exists",
            });
            return;
        }

        // Generate both live + test API keys/secrets (hashed for lookup + auth,
        // encrypted for later display/reveal in the dashboard).
        const { fields: keyFields } = await buildKeySet();

        // 1. Create the partner in the Partner DB first (source of truth for identity).
        const partner = await Partner.create({
            businessName,
            firstName,
            lastName,
            email,
            phoneNumber,
            password,
            referralCode,
            mainApiPartnerId: "", // filled in after linking below
            ...keyFields,
        });

        // 2. Create the linked Partner + wallet on the platform (replaces the
        //    old shadow-user + createWallet). Store the returned platform id.
        const linkResponse = await sendApiService.createLinkedPartner({
            partnerRef: partner._id.toString(),
            businessName,
            firstName,
            lastName,
            email,
            phoneNumber,
        });

        partner.mainApiPartnerId = linkResponse.data.partnerId;
        await partner.save();

        // Keys are not returned here — the partner views/reveals them from the
        // dashboard (Settings → API Keys), where the live secret is password-gated.
        res.status(201).json({
            success: true,
            message: "Partner registered successfully",
            data: {
                id: partner._id,
                businessName: partner.businessName,
                firstName: partner.firstName,
                lastName: partner.lastName,
            },
        });
    }
);

// ─── Login Partner ─────────────────────────────────────────────────────────────

export const loginPartner: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
            return;
        }

        const partner = await Partner.findOne({ email }).select("+password");
        if (!partner) {
            res.status(400).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        const isMatch = await partner.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
            return;
        }

        const token = signPartnerToken(partner._id.toString());

        res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                token,
                id: partner._id,
                firstName: partner.firstName,
                lastName: partner.lastName,
                email: partner.email,
            },
        });
    }
);

// ─── Get Partner Details ───────────────────────────────────────────────────────

export const getPartner: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const sendApiService = getSendApiService(req.mode === "test");

        // Fetch wallet status from Main API
        const walletStatus = await sendApiService.getWalletStatus(partner.mainApiPartnerId);

        res.status(200).json({
            success: true,
            message: "Partner details retrieved successfully",
            data: {
                id: partner._id,
                businessName: partner.businessName,
                firstName: partner.firstName,
                lastName: partner.lastName,
                email: partner.email,
                phoneNumber: partner.phoneNumber,
                isActive: partner.isActive,
                wallet: walletStatus,
            },
        });
    }
);

// ─── API Keys: view ─────────────────────────────────────────────────────────────

/**
 * Returns the partner's API keys for display in the dashboard.
 * - live + test API keys and the test secret are shown in full (owner is JWT-authed).
 * - the LIVE secret is never returned here; it is revealed once, gated by
 *   password, via revealLiveSecret below.
 */
export const getApiKeys: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partnerId = (req as any).partner._id;

        const partner = await Partner.findById(partnerId).select(
            "+liveApiKeyEnc +testApiKeyEnc +testApiSecretEnc",
        );

        if (!partner || !partner.liveApiKeyEnc) {
            // Old accounts (pre-encryption) have no displayable keys yet.
            res.status(200).json({
                success: true,
                message: "No API keys available yet",
                data: {
                    generated: false,
                    keysGeneratedAt: null,
                    liveApiKey: null,
                    testApiKey: null,
                    testApiSecret: null,
                    liveSecretRevealed: false,
                },
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "API keys retrieved successfully",
            data: {
                generated: true,
                keysGeneratedAt: partner.keysGeneratedAt,
                liveApiKey: decryptSecret(partner.liveApiKeyEnc),
                testApiKey: partner.testApiKeyEnc
                    ? decryptSecret(partner.testApiKeyEnc)
                    : null,
                testApiSecret: partner.testApiSecretEnc
                    ? decryptSecret(partner.testApiSecretEnc)
                    : null,
                liveSecretRevealed: !!partner.liveSecretRevealedAt,
            },
        });
    }
);

// ─── API Keys: reveal live secret (password-gated, once) ─────────────────────────

export const revealLiveSecret: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { password } = req.body;
        const partnerId = (req as any).partner._id;

        if (!password) {
            res.status(400).json({
                success: false,
                message: "Password is required to reveal your live secret",
            });
            return;
        }

        const partner = await Partner.findById(partnerId).select(
            "+password +liveApiSecretEnc",
        );

        if (!partner) {
            res.status(404).json({ success: false, message: "Partner not found" });
            return;
        }

        const isMatch = await partner.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: "Incorrect password" });
            return;
        }

        if (!partner.liveApiSecretEnc) {
            res.status(400).json({
                success: false,
                message: "No API keys generated yet. Generate your keys first.",
            });
            return;
        }

        if (partner.liveSecretRevealedAt) {
            res.status(403).json({
                success: false,
                message:
                    "Your live secret has already been revealed. Regenerate your keys to obtain a new one.",
            });
            return;
        }

        const liveApiSecret = decryptSecret(partner.liveApiSecretEnc);
        partner.liveSecretRevealedAt = new Date();
        await partner.save();

        res.status(200).json({
            success: true,
            message: "Live secret revealed. Store it safely — it won't be shown again.",
            data: { liveApiSecret },
        });
    }
);

// ─── API Keys: regenerate (password-gated) ───────────────────────────────────────

export const regenerateApiKeys: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { password } = req.body;
        const partnerId = (req as any).partner._id;

        if (!password) {
            res.status(400).json({
                success: false,
                message: "Password is required to regenerate your API keys",
            });
            return;
        }

        const partner = await Partner.findById(partnerId).select("+password");
        if (!partner) {
            res.status(404).json({ success: false, message: "Partner not found" });
            return;
        }

        const isMatch = await partner.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: "Incorrect password" });
            return;
        }

        const { plain, fields } = await buildKeySet();
        Object.assign(partner, fields);
        await partner.save();

        // Old credentials are now void. Return the new public keys + test secret;
        // the live secret still has to be revealed once via the password gate.
        res.status(200).json({
            success: true,
            message:
                "API keys regenerated. Your previous keys no longer work. Reveal your live secret to finish setup.",
            data: {
                generated: true,
                keysGeneratedAt: fields.keysGeneratedAt,
                liveApiKey: plain.liveApiKey,
                testApiKey: plain.testApiKey,
                testApiSecret: plain.testApiSecret,
                liveSecretRevealed: false,
            },
        });
    }
);

// The URL field for a mode. Webhooks are signed with that mode's API secret, so
// there is no separate webhook secret to manage.
const webhookUrlField = (mode: "live" | "test") =>
    mode === "test" ? "testWebhookUrl" : "liveWebhookUrl";

/**
 * The mode a webhook mutation targets. Taken EXPLICITLY from the request body/query
 * so the dashboard can edit either mode's webhook without flipping the global mode
 * toggle. Falls back to req.mode when not provided.
 */
const resolveWebhookMode = (req: Request): "live" | "test" => {
    const explicit = String(req.body?.mode ?? req.query?.mode ?? "").toLowerCase();
    if (explicit === "test" || explicit === "live") return explicit;
    return req.mode;
};

// ─── Webhooks: view BOTH modes at once ──────────────────────────────────────────

export const getWebhooks: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        res.status(200).json({
            success: true,
            message: "Webhook settings retrieved",
            data: {
                live: { webhookUrl: partner.liveWebhookUrl || null },
                test: { webhookUrl: partner.testWebhookUrl || null },
            },
        });
    }
);

// ─── Webhooks: view (single mode — kept for API-key callers) ────────────────────

export const getWebhook: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        res.status(200).json({
            success: true,
            message: "Webhook settings retrieved",
            data: {
                mode: req.mode,
                webhookUrl: partner[webhookUrlField(req.mode)] || null,
            },
        });
    }
);

// ─── Webhooks: set / update URL (explicit mode) ─────────────────────────────────

export const updateWebhook: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const { webhookUrl } = req.body;
        const partner = (req as any).partner;
        const mode = resolveWebhookMode(req);
        const urlField = webhookUrlField(mode);

        if (!webhookUrl) {
            res.status(400).json({
                success: false,
                message: "Webhook URL is required",
            });
            return;
        }

        // Only accept a valid http(s) URL.
        try {
            const parsed = new URL(webhookUrl);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
                throw new Error("bad protocol");
            }
        } catch {
            res.status(400).json({
                success: false,
                message: "Please provide a valid http(s) webhook URL",
            });
            return;
        }

        partner[urlField] = webhookUrl;
        await partner.save();

        res.status(200).json({
            success: true,
            message: `${mode === "test" ? "Test" : "Live"} webhook saved successfully`,
            data: { mode, webhookUrl: partner[urlField] },
        });
    }
);

// ─── Webhooks: remove (explicit mode) ───────────────────────────────────────────

export const deleteWebhook: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const mode = resolveWebhookMode(req);

        partner[webhookUrlField(mode)] = undefined;
        await partner.save();

        res.status(200).json({
            success: true,
            message: "Webhook removed",
            data: { mode, webhookUrl: null },
        });
    }
);

// ─── Get Partner Transactions ───────────────────────────────────────────────────────

export const getPartnerTransactions: RequestHandler = CatchAsync(
    async (req: Request, res: Response) => {
        const partner = (req as any).partner;
        const sendApiService = getSendApiService(req.mode === "test");

        // The partner wallet + its transactions live on the platform.
        const transactions = await sendApiService.getPartnerTransactions(
            partner.mainApiPartnerId,
        );

        res.status(200).json({
            success: true,
            message: "Transactions retrieved successfully",
            data: transactions,
        });
    }
);
