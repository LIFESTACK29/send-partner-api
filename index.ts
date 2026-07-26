import "./src/config/env";

import { createServer } from "http";
import app from "./src/app";
import connectDB from "./src/config/db";
import { initSocket } from "./src/config/socket";

const PORT: number = parseInt(process.env.PORT || "5000", 10);

const startServer = async () => {
    try {
        await connectDB();

        const server = createServer(app);
        initSocket(server); // realtime dashboard events (partner-<id> rooms)
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Send Partner API running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Failed to start Send Partner API:", error);
        process.exit(1);
    }
};

startServer();
