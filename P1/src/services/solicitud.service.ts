import { CrearSolicitudDTO, ISolicitudRepository, Solicitud } from "../models/Solicitud";

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
}