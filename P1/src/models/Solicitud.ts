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
 * Datos necesarios para reemplazar por completo una solicitud existente.
 * A diferencia de CrearSolicitudDTO, "estado" es obligatorio porque
 * PUT reemplaza el recurso entero.
 */
export interface ActualizarSolicitudDTO {
  titulo: string;
  area_solicitante: string;
  prioridad: number;
  costo_estimado: number;
  estado: EstadoSolicitud;
}

/**
 * Contrato de acceso a datos para solicitudes operativas.
 *
 * Principio DIP: "SolicitudService" (capa de negocio) depende de esta
 * interfaz, nunca de una implementacion concreta como PostgreSQL.
 *
 * Principio ISP: la interfaz se construyo de forma incremental, un
 * metodo a la vez, a medida que cada endpoint lo necesito realmente,
 * en vez de declarar de entrada metodos que nadie iba a implementar
 * ni consumir todavia.
 *
 * Los metodos que pueden no encontrar el registro (update, updateEstado,
 * delete) devuelven "null"/"false" en vez de lanzar un error: decidir
 * que hacer ante un "no encontrado" es responsabilidad de la capa de
 * negocio (SolicitudService), no del repositorio.
 */
export interface ISolicitudRepository {
  create(data: CrearSolicitudDTO): Promise<Solicitud>;
  findAll(): Promise<Solicitud[]>;
  update(id: string, data: ActualizarSolicitudDTO): Promise<Solicitud | null>;
  updateEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud | null>;
  delete(id: string): Promise<boolean>;
}