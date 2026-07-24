import express from "express";
import { handleMainApiWebhook } from "../controllers/webhook.controller";
import { authenticateMainApiWebhook } from "../middlewares/authenticateMainApiWebhook";

const router = express.Router();

router.post("/webhooks/main-api", authenticateMainApiWebhook, handleMainApiWebhook);

export default router;
