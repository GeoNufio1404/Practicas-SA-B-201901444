import { NextFunction, Request, Response } from "express";

/**
 * Error controlado de la aplicacion, con codigo HTTP asociado.
 * Permite diferenciar errores esperados (400, 404) de errores
 * inesperados (500) sin filtrar detalles internos al cliente.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  console.error("Error no controlado:", err);
  res.status(500).json({ error: "Error interno del servidor" });
}