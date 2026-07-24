import express from "express";
import { authenticatePartnerBoth } from "../middlewares/authenticatePartner";
import {
    createRate,
    getRates,
    getRateById,
    deactivateRate,
} from "../controllers/rate.controller";

const router = express.Router();

router.post("/rates", authenticatePartnerBoth, createRate);
router.get("/rates", authenticatePartnerBoth, getRates);
router.get("/rates/:id", authenticatePartnerBoth, getRateById);
router.delete("/rates/:id", authenticatePartnerBoth, deactivateRate);

export default router;