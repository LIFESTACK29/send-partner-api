import express from "express";
import { authenticatePartnerBoth } from "../middlewares/authenticatePartner";
import {
    createAddress,
    getAddresses,
    getAddressById,
    updateAddress,
    deleteAddress,
} from "../controllers/address.controller";

const router = express.Router();

router.post("/addresses", authenticatePartnerBoth, createAddress);
router.get("/addresses", authenticatePartnerBoth, getAddresses);
router.get("/addresses/:id", authenticatePartnerBoth, getAddressById);
router.patch("/addresses/:id", authenticatePartnerBoth, updateAddress);
router.delete("/addresses/:id", authenticatePartnerBoth, deleteAddress);

export default router;