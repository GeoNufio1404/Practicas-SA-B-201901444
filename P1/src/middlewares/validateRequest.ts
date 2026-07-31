import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "./errorHandler";

/**
 * Middleware generico de validacion. Recibe cualquier esquema zod
 * y lo aplica sobre req.body, reemplazando el body por los datos
 * ya parseados y tipados si la validacion es exitosa.
 *
 * Es generico a proposito: sirve para el POST de hoy y para PUT/PATCH
 * mas adelante, sin duplicar logica de validacion en cada controller.
 */
export function validateRequest(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const mensaje = result.error.errors
        .map((e) => e.message)
        .join(", ");
      next(new AppError(mensaje, 400));
      return;
    }

    req.body = result.data;
    next();
  };
}