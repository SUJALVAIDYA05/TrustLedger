import { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/AppError";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let fields: any = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if ((err as any).name === "ZodError") {
    statusCode = 422;
    message = "Validation Error";
    fields = (err as any).errors.map((e: any) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    console.error(`[422] ${req.method} ${req.originalUrl}:`, JSON.stringify(fields));
  }

  // Prevent leaking stack traces in production
  if (process.env.NODE_ENV !== "development" && statusCode === 500) {
    message = "Internal Server Error";
  } else if (statusCode === 500) {
    console.error(`[ERROR] ${err.message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(fields && { fields }),
  });
};
