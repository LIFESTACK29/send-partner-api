import express from "express";
import { authenticatePartnerDashboard } from "../middlewares/authenticatePartner";
import {
    registerPartner,
    loginPartner,
    getPartner,
    getPartnerTransactions,
    getWebhook,
    getWebhooks,
    updateWebhook,
    deleteWebhook,
    getApiKeys,
    revealLiveSecret,
    regenerateApiKeys,
    provisionWalletAccount
} from "../controllers/partner.controller";
import { getDashboardStats } from "../controllers/stats.controller";

const router = express.Router();

router.post("/partners/register", registerPartner);
router.post("/partners/login", loginPartner);
router.get("/partners/me", authenticatePartnerDashboard, getPartner);
router.get("/partners/transactions", authenticatePartnerDashboard, getPartnerTransactions);
router.post("/partners/wallet/provision-account", authenticatePartnerDashboard, provisionWalletAccount);
router.get("/partners/stats", authenticatePartnerDashboard, getDashboardStats);

// Webhooks (dashboard/JWT only)
router.get("/partners/webhooks", authenticatePartnerDashboard, getWebhooks);
router.get("/partners/webhook", authenticatePartnerDashboard, getWebhook);
router.patch("/partners/webhook", authenticatePartnerDashboard, updateWebhook);
router.delete("/partners/webhook", authenticatePartnerDashboard, deleteWebhook);

// API key management (dashboard/JWT only — never the API-key middleware)
router.get("/partners/api-keys", authenticatePartnerDashboard, getApiKeys);
router.post("/partners/api-keys/reveal-live-secret", authenticatePartnerDashboard, revealLiveSecret);
router.post("/partners/api-keys/regenerate", authenticatePartnerDashboard, regenerateApiKeys);

export default router;
