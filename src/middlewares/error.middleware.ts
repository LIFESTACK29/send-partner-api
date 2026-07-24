import { Request, Response, NextFunction } from "express";
import axios from "axios";
import logger from "../config/logger";

interface AppError extends Error {
    statusCode?: number;
}

const errorMiddleware = (
    err: AppError,
    req: Request,
    res: Response,
    _next: NextFunction,
) => {
    const statusCode = err.statusCode || 500;

    // Log the FULL error server-side (never sent to the client). If the failure
    // came from an outbound call (e.g. to send-api), include the upstream URL,
    // status and response body — that is usually the real cause.
    const logDetail: Record<string, unknown> = {
        method: req.method,
        path: req.originalUrl,
        statusCode,
        message: err.message,
        stack: err.stack,
    };
    if (axios.isAxiosError(err)) {
        logDetail.upstream = {
            method: err.config?.method,
            url: err.config?.url,
            baseURL: err.config?.baseURL,
            code: err.code,
            status: err.response?.status,
            data: err.response?.data,
        };
    }
    logger.error("Request failed", logDetail);

    // Never leak internal details for server errors
    const clientMessage =
        statusCode < 500
            ? err.message || "An error occurred"
            : "Internal server error";

    res.status(statusCode).json({
        success: false,
        message: clientMessage,
    });
};

export default errorMiddleware;
