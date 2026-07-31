export type EstadoSolicitud = "registrada" | "en_proceso" | "finalizada";

/**
 * Entidad de dominio: representa una solicitud operativa tal como
 * se guarda y se devuelve al cliente.
 */
export interface Solicitud {
  id: string;
  titulo: string;
  area_solicitante: string;
  prioridad: number;
  costo_estimado: number;
  estado: EstadoSolicitud;
  creado_en: string;
}

/**
 * Datos necesarios para crear una nueva solicitud.
 * "estado" es opcional porque la base de datos le asigna "registrada"
 * por defecto si no se envia.
 */
export interface CrearSolicitudDTO {
  titulo: string;
  area_solicitante: string;
  prioridad: number;
  costo_estimado: number;
  estado?: EstadoSolicitud;
}

/**
 * Contrato de acceso a datos para solicitudes operativas.
 *
 * Principio DIP: "SolicitudService" (capa de negocio) depende de esta
 * interfaz, nunca de una implementacion concreta como PostgreSQL.
 *
 * Principio ISP: la interfaz solo declara los metodos que realmente
 * se usan en este momento del desarrollo. Se ira ampliando (update,
 * delete, updateEstado) a medida que se construya cada endpoint,
 * en vez de declarar de una vez metodos que todavia nadie implementa
 * ni consume.
 */
export interface ISolicitudRepository {
  create(data: CrearSolicitudDTO): Promise<Solicitud>;
  findAll(): Promise<Solicitud[]>;
}