import axios from "axios";
import FormData from "form-data";
import { mockSendApiService } from "./mockSendApi.service";

const SEND_API_BASE_URL = process.env.SEND_API_BASE_URL || "http://localhost:4000/api/v1";
const SEND_API_PARTNER_SECRET = process.env.SEND_API_PARTNER_SECRET || "";

const sendApiClient = axios.create({
    baseURL: SEND_API_BASE_URL,
    headers: {
        "x-partner-secret": SEND_API_PARTNER_SECRET,
        "Content-Type": "application/json",
    },
});

export const realSendApiService = {
    // Deliveries
    calculateDeliveryFee: async (data: any) => {
        // Partner-secret fee endpoint (the public /deliveries/calculate-fee is
        // behind user auth). Returns { success, message, data: { fee, distance } }.
        const response = await sendApiClient.post("/partners/calculate-fee", data);
        return response.data?.data ?? response.data;
    },

    requestDelivery: async (data: any, file?: any) => {
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        if (file) {
            formData.append("itemImage", file);
        }
        const response = await sendApiClient.post("/deliveries/request", formData);
        return response.data;
    },

    getDelivery: async (deliveryId: string) => {
        const response = await sendApiClient.get(`/deliveries/${deliveryId}`);
        return response.data;
    },

    cancelDelivery: async (deliveryId: string) => {
        const response = await sendApiClient.post(`/deliveries/${deliveryId}/cancel`);
        return response.data;
    },

    // Partner linked account: creates the platform-side Partner + wallet.
    // Replaces the old shadow-user + createWallet pair.
    createLinkedPartner: async (data: {
        partnerRef: string;
        businessName: string;
        firstName: string;
        lastName: string;
        email: string;
        phoneNumber: string;
    }) => {
        const response = await sendApiClient.post("/partners/link", data);
        return response.data; // { success, message, data: { partnerId, walletId } }
    },

    // Create a partner-origin delivery on the platform (deducts the partner
    // wallet atomically). Replaces requestPartnerDelivery + deductFromWallet.
    createPartnerDelivery: async (data: {
        partnerId: string;
        fee: number;
        distance?: number;
        pickupLocation: any;
        dropoffLocation: any;
        pickupContact: any;
        dropoffContact: any;
        packageType: string;
        deliveryNote?: string;
        scheduledFor?: string;
    }) => {
        const response = await sendApiClient.post("/partners/deliveries", data);
        return response.data; // { success, message, data: { deliveryId, trackingId, status, scheduledFor } }
    },

    // Cancel a partner delivery on the platform (refunds the partner wallet).
    cancelPartnerDelivery: async (deliveryId: string, partnerId: string) => {
        const response = await sendApiClient.post(
            `/partners/deliveries/${deliveryId}/cancel`,
            { partnerId },
        );
        return response.data; // { success, message, data: { deliveryId, status, refunded } }
    },

    // Wallet status for a linked partner.
    getWalletStatus: async (partnerId: string) => {
        const response = await sendApiClient.get(`/partners/${partnerId}/wallet`);
        return response.data?.data ?? response.data;
    },

    // Provision a Paystack funding account (DVA) for a linked partner's wallet.
    // Idempotent on the platform side. Returns { success, message, data }.
    provisionPartnerAccount: async (partnerId: string) => {
        const response = await sendApiClient.post(
            `/partners/${partnerId}/wallet/provision-account`,
        );
        return response.data;
    },

    // Wallet transactions for a linked partner.
    getPartnerTransactions: async (partnerId: string) => {
        const response = await sendApiClient.get(`/partners/${partnerId}/transactions`);
        return response.data?.data ?? response.data;
    },
};

export const getSendApiService = (isSandbox: boolean = false) => {
    if (isSandbox) {
        return mockSendApiService;
    }
    return realSendApiService;
};

// Keep the original export for backward compatibility
export const sendApiService = realSendApiService;
