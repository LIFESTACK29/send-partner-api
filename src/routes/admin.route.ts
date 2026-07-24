import express from "express";
import { authenticateAdminRequest } from "../middlewares/authenticateAdmin";
import {
    listPartners,
    listPartnerDeliveries,
} from "../controllers/admin.controller";

const router = express.Router();

// Server-to-server: called by the platform admin backend (x-admin-secret).
router.get("/admin/partners", authenticateAdminRequest, listPartners);
router.get(
    "/admin/partners/:partnerId/deliveries",
    authenticateAdminRequest,
    listPartnerDeliveries,
);

export default router;
