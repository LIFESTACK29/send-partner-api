import axios from "axios";
import crypto from "crypto";
import { decryptSecret } from "./crypto.util";

/**
 * POST a signed payload to a partner's webhook URL for the relevant mode.
 * `encryptedSecret` is the AES-encrypted signing secret stored on the partner;
 * we decrypt it here so the HMAC uses the same plaintext the partner holds.
 */
export const sendPartnerWebhook = async (
    url: string | undefined,
    encryptedSecret: string | undefined,
    payload: any,
) => {
    if (!url) return;

    const timestamp = Date.now();
    const body = JSON.stringify(payload);

    let signature = "";
    if (encryptedSecret) {
        const secret = decryptSecret(encryptedSecret);
        signature = crypto
            .createHmac("sha256", secret)
            .update(`${timestamp}.${body}`)
            .digest("hex");
    }

    try {
        await axios.post(url, body, {
            headers: {
                "Content-Type": "application/json",
                "X-Partner-Signature": signature,
                "X-Partner-Timestamp": timestamp.toString(),
            },
            timeout: 5000, // 5 seconds timeout
        });
    } catch (error) {
        console.error(`Failed to send webhook to ${url}:`, error);
        // We could implement a retry mechanism here or log to a database
    }
};
