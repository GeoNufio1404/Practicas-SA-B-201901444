import { z } from "zod";

/**
 * Valida el cuerpo de la peticion para crear una solicitud operativa.
 * Se valida aqui, antes de llegar al service, para que la logica de
 * negocio nunca reciba datos con forma incorrecta.
 */
export const crearSolicitudSchema = z.object({
  titulo: z
    .string({ required_error: "titulo es obligatorio" })
    .trim()
    .min(3, "titulo debe tener al menos 3 caracteres")
    .max(150, "titulo no puede superar 150 caracteres"),

  area_solicitante: z
    .string({ required_error: "area_solicitante es obligatorio" })
    .trim()
    .min(2, "area_solicitante debe tener al menos 2 caracteres")
    .max(100, "area_solicitante no puede superar 100 caracteres"),

  prioridad: z
    .number({ required_error: "prioridad es obligatoria" })
    .int("prioridad debe ser un numero entero")
    .min(1, "prioridad debe estar entre 1 y 5")
    .max(5, "prioridad debe estar entre 1 y 5"),

  costo_estimado: z
    .number({ required_error: "costo_estimado es obligatorio" })
    .nonnegative("costo_estimado no puede ser negativo"),

  estado: z.enum(["registrada", "en_proceso", "finalizada"]).optional(),
});

export type CrearSolicitudInput = z.infer<typeof crearSolicitudSchema>;