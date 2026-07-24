import express from "express";
import partnersRoute from "./partners.route";
import deliveriesRoute from "./deliveries.route";
import addressesRoute from "./addresses.route";
import ratesRoute from "./rates.route";
import webhooksRoute from "./webhooks.route";
import adminRoute from "./admin.route";

const router = express.Router();

// All routes are served under /api/v1 (matches the main API's prefix).
router.use("/api/v1", partnersRoute);
router.use("/api/v1", deliveriesRoute);
router.use("/api/v1", addressesRoute);
router.use("/api/v1", ratesRoute);
router.use("/api/v1", webhooksRoute);
router.use("/api/v1", adminRoute);

export default router;
