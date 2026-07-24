import express from "express";
import { authenticatePartnerBoth } from "../middlewares/authenticatePartner";
import {
    calculateDeliveryFee,
    requestDelivery,
    getDelivery,
    listDeliveries,
    cancelDelivery,
} from "../controllers/delivery.controller";

const router = express.Router();

router.post("/deliveries/calculate-fee", authenticatePartnerBoth, calculateDeliveryFee);
router.post("/deliveries/request", authenticatePartnerBoth, requestDelivery);
router.get("/deliveries", authenticatePartnerBoth, listDeliveries);
router.get("/deliveries/:id", authenticatePartnerBoth, getDelivery);
router.post("/deliveries/:id/cancel", authenticatePartnerBoth, cancelDelivery);

export default router;
