import dotenv from "dotenv";

dotenv.config();

const PLACEHOLDER_SECRET = "your_partner_secret_here";

function validateEnv(): void {
    const missing: string[] = [];
    const required = [
        "MONGO_URI",
        "JWT_SECRET",
        "SEND_API_BASE_URL",
        "SEND_API_PARTNER_SECRET",
        "API_ENCRYPTION_KEY",
    ];

    for (const key of required) {
        if (!process.env[key]) missing.push(key);
    }

    if (missing.length > 0) {
        throw new Error(
            `FATAL: Missing required environment variables: ${missing.join(", ")}\n` +
            "Copy .env.example to .env and fill in real values.",
        );
    }

    // API_ENCRYPTION_KEY must be 32 bytes (64 hex chars) for AES-256-GCM.
    const encKey = process.env.API_ENCRYPTION_KEY as string;
    if (!/^[0-9a-fA-F]{64}$/.test(encKey)) {
        throw new Error(
            "FATAL: API_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).\n" +
            "Generate one with:\n" +
            '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
        );
    }

    const secret = process.env.SEND_API_PARTNER_SECRET as string;
    if (secret === PLACEHOLDER_SECRET) {
        throw new Error(
            "FATAL: SEND_API_PARTNER_SECRET is still the default placeholder.\n" +
            "Generate a secure secret with:\n" +
            '  node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
        );
    }
}

validateEnv();
