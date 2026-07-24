import express from "express";
import { authenticatePartnerApiKey, authenticatePartnerDashboard } from "../middlewares/authenticatePartner";
import {
    createRate,
    getRates,
    getRateById,
    deactivateRate,
} from "../controllers/rate.controller";

const router = express.Router();

const authenticatePartnerBoth = (req: any, res: any, next: any) => {
    if (req.headers["x-partner-key"]) {
        return authenticatePartnerApiKey(req, res, next);
    }
    return authenticatePartnerDashboard(req, res, next);
};

router.post("/rates", authenticatePartnerBoth, createRate);
router.get("/rates", authenticatePartnerBoth, getRates);
router.get("/rates/:id", authenticatePartnerBoth, getRateById);
router.delete("/rates/:id", authenticatePartnerBoth, deactivateRate);

export default router;