import express from "express";
import helmet from "helmet";
import cors from "cors";
import indexRoute from "./routes/index.route";
import errorMiddleware from "./middlewares/error.middleware";
import { modeMiddleware } from "./middlewares/mode.middleware";

const app = express();

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : true;
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Detect mode from URL/host
app.use(modeMiddleware);

// Routes
app.use("/", indexRoute);

// Health check
app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorMiddleware);

export default app;
