import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

interface ValidationOptions {
  source?: "body" | "query" | "params";
}

export const validate = <T>(schema: ZodSchema<T>, options?: ValidationOptions) => {
  const source = options?.source ?? "body";

  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(result.error);
      return;
    }

    req[source] = result.data as Request[typeof source];
    next();
  };
};
