import { Router } from "express";
import { SolicitudController } from "../controllers/solicitud.controller";
import { validateParams, validateRequest } from "../middlewares/validateRequest";
import {
  actualizarEstadoSchema,
  actualizarSolicitudSchema,
  crearSolicitudSchema,
  idParamSchema,
} from "../validators/solicitud.validator";

/**
 * Las rutas reciben el controller ya construido (inyectado) en vez
 * de instanciarlo aqui. Asi este archivo solo se preocupa de mapear
 * verbo + path -> metodo del controller, sin conocer como se armo
 * esa cadena de dependencias (eso vive en server.ts).
 */
export function crearSolicitudRoutes(controller: SolicitudController): Router {
  const router = Router();

  router.post("/", validateRequest(crearSolicitudSchema), controller.crear);
  router.get("/", controller.listar);

  router.put(
    "/:id",
    validateParams(idParamSchema),
    validateRequest(actualizarSolicitudSchema),
    controller.actualizar
  );

  router.patch(
    "/:id/estado",
    validateParams(idParamSchema),
    validateRequest(actualizarEstadoSchema),
    controller.actualizarEstado
  );

  router.delete("/:id", validateParams(idParamSchema), controller.eliminar);

  return router;
}