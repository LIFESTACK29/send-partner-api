import crypto from "crypto";

/**
 * Reversible encryption for partner API credentials (keys + secrets) so the
 * dashboard can display / reveal them to their owner.
 *
 * We use AES-256-GCM (authenticated encryption). The stored value is
 *   iv(hex) : authTag(hex) : ciphertext(hex)
 * The api KEY is ALSO stored separately as a one-way sha256 hash for request
 * lookup (see authenticatePartner). This encrypted copy is only for display.
 *
 * The encryption key comes from API_ENCRYPTION_KEY: a 64-char hex string
 * (32 bytes). Generate one with:  openssl rand -hex 32
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit nonce, recommended for GCM

const getKey = (): Buffer => {
    const raw = process.env.API_ENCRYPTION_KEY;
    if (!raw) {
        throw new Error(
            "API_ENCRYPTION_KEY is not set. Generate one with `openssl rand -hex 32`.",
        );
    }
    const key = Buffer.from(raw, "hex");
    if (key.length !== 32) {
        throw new Error(
            "API_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).",
        );
    }
    return key;
};

/** Encrypt a plaintext secret for at-rest storage. */
export const encryptSecret = (plaintext: string): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

/** Decrypt a value produced by encryptSecret. */
export const decryptSecret = (payload: string): string => {
    const [ivHex, authTagHex, dataHex] = payload.split(":");
    if (!ivHex || !authTagHex || !dataHex) {
        throw new Error("Malformed encrypted payload.");
    }
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        getKey(),
        Buffer.from(ivHex, "hex"),
    );
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(dataHex, "hex")),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
};

/** Mask a credential for display, e.g. "sk_live_a1b2…d4e5". */
export const maskSecret = (value: string, visible = 4): string => {
    if (value.length <= visible * 2) return "••••••••";
    return `${value.slice(0, visible)}${"•".repeat(8)}${value.slice(-visible)}`;
};
