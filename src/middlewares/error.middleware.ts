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
