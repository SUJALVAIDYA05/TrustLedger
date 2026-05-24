import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export const validateBody = (schema: AnyZodObject) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        console.error(`[VALIDATION ERROR] ${req.method} ${req.originalUrl}:`, error.errors);
        next(error);
      } else {
        next(new Error("Unknown validation error"));
      }
    }
  };
};
