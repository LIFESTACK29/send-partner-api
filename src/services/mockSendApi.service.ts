import crypto from "crypto";
import { realSendApiService } from "./sendApiService";

const MOCK_DELIVERY_IDS: string[] = [];

export const mockSendApiService = {
  // Deliveries (Mock) — matches the real service contract: { fee, distance }.
  calculateDeliveryFee: async (data: any) => {
    return {
      fee: Math.floor(Math.random() * 5000) + 1000,
      distance: Number((Math.random() * 20).toFixed(2)),
      currency: "NGN",
    };
  },

  requestDelivery: async (data: any, file?: any) => {
    const deliveryId = crypto.randomBytes(12).toString("hex");
    MOCK_DELIVERY_IDS.push(deliveryId);
    return {
      success: true,
      data: {
        _id: deliveryId,
        status: "PENDING",
        itemImage: file ? `mock-image-${Date.now()}.png` : "",
        pickupAddress: data.pickupAddress,
        dropOffAddress: data.dropOffAddress,
        createdAt: new Date().toISOString(),
      },
    };
  },

  getDelivery: async (deliveryId: string) => {
    if (!MOCK_DELIVERY_IDS.includes(deliveryId)) {
      return {
        success: false,
        message: "Delivery not found",
      };
    }
    return {
      success: true,
      data: {
        _id: deliveryId,
        status: "IN_PROGRESS",
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    };
  },

  cancelDelivery: async (deliveryId: string) => {
    if (!MOCK_DELIVERY_IDS.includes(deliveryId)) {
      return {
        success: false,
        message: "Delivery not found",
      };
    }
    return {
      success: true,
      data: {
        _id: deliveryId,
        status: "CANCELLED",
      },
    };
  },

  // Partner linked account (real — registration only happens on live).
  createLinkedPartner: async (data: any) => {
    return realSendApiService.createLinkedPartner(data);
  },

  cancelPartnerDelivery: async (deliveryId: string, partnerId: string) => {
    return {
      success: true,
      message: "Mock partner delivery cancelled",
      data: { deliveryId, status: "CANCELLED", refunded: 0 },
    };
  },

  // Partner delivery (mocked — no real delivery/wallet movement on sandbox).
  createPartnerDelivery: async (data: any) => {
    const deliveryId = crypto.randomBytes(12).toString("hex");
    MOCK_DELIVERY_IDS.push(deliveryId);
    return {
      success: true,
      message: "Mock partner delivery created",
      data: {
        deliveryId,
        trackingId: `RS-MOCK-${Math.floor(1000 + Math.random() * 9000)}`,
        status: data.scheduledFor ? "SCHEDULED" : "PENDING",
        scheduledFor: data.scheduledFor || null,
      },
    };
  },

  // Wallet (ALL MOCKED - no real changes!). Must return the SAME (unwrapped)
  // shape the real getWalletStatus resolves to, so the dashboard reads it identically.
  getWalletStatus: async (partnerId: string) => {
    return {
      balance: 10000000, // kobo — always ₦100k on sandbox for testing
      balanceInNaira: 100000,
      currency: "NGN",
      accountNumber: null,
      bankName: null,
      accountName: null,
    };
  },

  getPartnerTransactions: async (partnerId: string) => {
    return [];
  },

};
