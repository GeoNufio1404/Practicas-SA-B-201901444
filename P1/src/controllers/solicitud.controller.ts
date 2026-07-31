import { NextFunction, Request, Response } from "express";
import { SolicitudService } from "../services/solicitud.service";

/**
 * Principio SRP: este controller solo sabe traducir HTTP <-> service.
 * No valida reglas de negocio ni construye SQL; eso ya paso en la
 * capa de validacion y en el service respectivamente.
 */
export class SolicitudController {
  constructor(private readonly service: SolicitudService) {}

  crear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nuevaSolicitud = await this.service.crearSolicitud(req.body);
      res.status(201).json(nuevaSolicitud);
    } catch (error) {
      next(error);
    }
  };

  listar = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const solicitudes = await this.service.obtenerTodas();
      res.status(200).json(solicitudes);
    } catch (error) {
      next(error);
    }
  };
}