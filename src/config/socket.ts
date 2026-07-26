import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

let io: SocketIOServer | null = null;

/**
 * Socket.io for the partner dashboard. Partners authenticate with the SAME JWT
 * they use for REST calls (payload { partnerId }, signed with JWT_SECRET). On
 * connect they join a private `partner-<partnerId>` room so the server can push
 * events (e.g. their funding account becoming ready) straight to their dashboard.
 */
export const initSocket = (server: HttpServer): SocketIOServer => {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS
                ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
                : true,
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // Auth: partner JWT from handshake.auth.token or Authorization header.
    io.use((socket, next) => {
        const authHeader = socket.handshake.headers?.authorization as
            | string
            | undefined;
        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : (socket.handshake.auth?.token as string | undefined);

        if (!token) return next(new Error("Auth error: token missing"));
        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET as string,
            ) as { partnerId?: string };
            if (!decoded.partnerId) return next(new Error("Auth error: not a partner token"));
            socket.data.partnerId = decoded.partnerId;
            next();
        } catch {
            next(new Error("Auth error: invalid token"));
        }
    });

    io.on("connection", (socket: Socket) => {
        const partnerId = socket.data.partnerId as string | undefined;
        if (!partnerId) return;
        socket.join(`partner-${partnerId}`);
    });

    return io;
};

/** Emit an event to a single partner's dashboard room. No-op if socket is down. */
export const emitToPartner = (
    partnerId: string,
    event: string,
    data: unknown,
): void => {
    if (io) io.to(`partner-${partnerId}`).emit(event, data);
};

export const getIO = (): SocketIOServer => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};
