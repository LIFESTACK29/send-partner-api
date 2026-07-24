import express from "express";
import { authenticatePartnerApiKey, authenticatePartnerDashboard } from "../middlewares/authenticatePartner";
import {
    createAddress,
    getAddresses,
    getAddressById,
    updateAddress,
    deleteAddress,
} from "../controllers/address.controller";

const router = express.Router();

const authenticatePartnerBoth = (req: any, res: any, next: any) => {
    if (req.headers["x-partner-key"]) {
        return authenticatePartnerApiKey(req, res, next);
    }
    return authenticatePartnerDashboard(req, res, next);
};

router.post("/addresses", authenticatePartnerBoth, createAddress);
router.get("/addresses", authenticatePartnerBoth, getAddresses);
router.get("/addresses/:id", authenticatePartnerBoth, getAddressById);
router.patch("/addresses/:id", authenticatePartnerBoth, updateAddress);
router.delete("/addresses/:id", authenticatePartnerBoth, deleteAddress);

export default router;