import {
  ActualizarSolicitudDTO,
  CrearSolicitudDTO,
  EstadoSolicitud,
  ISolicitudRepository,
  Solicitud,
} from "../models/Solicitud";
import { AppError } from "../middlewares/errorHandler";

/**
 * Capa de logica de negocio.
 *
 * Principio SRP: esta clase solo se encarga de reglas de negocio sobre
 * solicitudes operativas. No sabe nada de HTTP (eso es del controller)
 * ni de SQL (eso es del repositorio concreto).
 *
 * Principio DIP: recibe "ISolicitudRepository" por constructor. No crea
 * su propia instancia de SolicitudPostgresService, para poder sustituirla
 * facilmente (por ejemplo, por un repositorio en memoria en pruebas)
 * sin modificar esta clase.
 */
export class SolicitudService {
  constructor(private readonly repositorio: ISolicitudRepository) {}

  async crearSolicitud(data: CrearSolicitudDTO): Promise<Solicitud> {
    return this.repositorio.create(data);
  }

  async obtenerTodas(): Promise<Solicitud[]> {
    return this.repositorio.findAll();
  }

  /**
   * Actualizacion completa (PUT). Recibe el recurso entero y delega
   * al repositorio. Si el repositorio no encuentra el id, esta capa
   * decide que eso es un 404: es una regla de negocio, no un detalle
   * de base de datos, por eso vive aqui y no en el repositorio.
   */
  async actualizarSolicitud(id: string, data: ActualizarSolicitudDTO): Promise<Solicitud> {
    const solicitudActualizada = await this.repositorio.update(id, data);

    if (!solicitudActualizada) {
      throw new AppError("Solicitud no encontrada", 404);
    }

    return solicitudActualizada;
  }

  /**
   * Actualizacion exclusiva del estado (PATCH). A proposito es un
   * metodo distinto de "actualizarSolicitud": solo recibe "estado"
   * como parametro, por lo que es imposible que, desde este metodo,
   * se modifique accidentalmente titulo, area, prioridad o costo.
   * Esto es SRP e ISP aplicados a nivel de metodo, no solo de clase.
   */
  async actualizarEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud> {
    const solicitudActualizada = await this.repositorio.updateEstado(id, estado);

    if (!solicitudActualizada) {
      throw new AppError("Solicitud no encontrada", 404);
    }

    return solicitudActualizada;
  }

  /**
   * Elimina una solicitud. Igual que en update/updateEstado, decidir
   * que un id inexistente es un 404 es responsabilidad de esta capa,
   * no del repositorio (que solo sabe si borro una fila o ninguna).
   */
  async eliminarSolicitud(id: string): Promise<void> {
    const fueEliminada = await this.repositorio.delete(id);

    if (!fueEliminada) {
      throw new AppError("Solicitud no encontrada", 404);
    }
  }
}