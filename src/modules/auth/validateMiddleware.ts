import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../../utils/appError";

export const validate = (schema: ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errorMessage = result.error.issues.map(e => e.message).join(", ");
            return next(new AppError(errorMessage, 400));
        }

        req.body = result.data;
        next();
    }
}