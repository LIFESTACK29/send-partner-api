import express from "express";
import { 
    authenticatePartnerApiKey, 
    authenticatePartnerDashboard 
} from "../middlewares/authenticatePartner";
import {
    calculateDeliveryFee,
    requestDelivery,
    getDelivery,
    listDeliveries,
    cancelDelivery,
} from "../controllers/delivery.controller";

const router = express.Router();

// Helper to allow both API Key and Dashboard auth
const authenticatePartnerBoth = (req: any, res: any, next: any) => {
    if (req.headers["x-partner-key"]) {
        return authenticatePartnerApiKey(req, res, next);
    }
    return authenticatePartnerDashboard(req, res, next);
};

router.post("/deliveries/calculate-fee", authenticatePartnerBoth, calculateDeliveryFee);
router.post("/deliveries/request", authenticatePartnerBoth, requestDelivery);
router.get("/deliveries", authenticatePartnerBoth, listDeliveries);
router.get("/deliveries/:id", authenticatePartnerBoth, getDelivery);
router.post("/deliveries/:id/cancel", authenticatePartnerBoth, cancelDelivery);

export default router;
