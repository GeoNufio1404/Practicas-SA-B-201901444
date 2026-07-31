import { Pool } from "pg";
import {
  ActualizarSolicitudDTO,
  CrearSolicitudDTO,
  EstadoSolicitud,
  ISolicitudRepository,
  Solicitud,
} from "../models/Solicitud";

/**
 * Implementacion concreta de ISolicitudRepository usando PostgreSQL.
 *
 * Principio DIP en accion: esta clase depende de "Pool" (abstraccion
 * del driver pg), y a su vez es inyectada -no instanciada internamente-
 * en SolicitudService. Nadie en esta clase decide como se usa el dato,
 * solo como se persiste.
 *
 * Seguridad: se usan consultas parametrizadas ($1, $2, ...) en todo
 * momento. Nunca se concatenan valores directamente en el string SQL,
 * lo que previene inyeccion SQL.
 */
export class SolicitudPostgresService implements ISolicitudRepository {
  constructor(private readonly pool: Pool) {}

  async create(data: CrearSolicitudDTO): Promise<Solicitud> {
    const query = `
      INSERT INTO solicitudes (titulo, area_solicitante, prioridad, costo_estimado, estado)
      VALUES ($1, $2, $3, $4, COALESCE($5, 'registrada'))
      RETURNING id, titulo, area_solicitante, prioridad, costo_estimado, estado, creado_en;
    `;

    const valores = [
      data.titulo,
      data.area_solicitante,
      data.prioridad,
      data.costo_estimado,
      data.estado ?? null,
    ];

    const resultado = await this.pool.query(query, valores);
    return resultado.rows[0] as Solicitud;
  }

  async findAll(): Promise<Solicitud[]> {
    const query = `
      SELECT id, titulo, area_solicitante, prioridad, costo_estimado, estado, creado_en
      FROM solicitudes
      ORDER BY creado_en DESC;
    `;

    const resultado = await this.pool.query(query);
    return resultado.rows as Solicitud[];
  }

  async update(id: string, data: ActualizarSolicitudDTO): Promise<Solicitud | null> {
    const query = `
      UPDATE solicitudes
      SET titulo = $1,
          area_solicitante = $2,
          prioridad = $3,
          costo_estimado = $4,
          estado = $5
      WHERE id = $6
      RETURNING id, titulo, area_solicitante, prioridad, costo_estimado, estado, creado_en;
    `;

    const valores = [
      data.titulo,
      data.area_solicitante,
      data.prioridad,
      data.costo_estimado,
      data.estado,
      id,
    ];

    const resultado = await this.pool.query(query, valores);
    return (resultado.rows[0] as Solicitud) ?? null;
  }

  async updateEstado(id: string, estado: EstadoSolicitud): Promise<Solicitud | null> {
    const query = `
      UPDATE solicitudes
      SET estado = $1
      WHERE id = $2
      RETURNING id, titulo, area_solicitante, prioridad, costo_estimado, estado, creado_en;
    `;

    const resultado = await this.pool.query(query, [estado, id]);
    return (resultado.rows[0] as Solicitud) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    const query = `DELETE FROM solicitudes WHERE id = $1;`;
    const resultado = await this.pool.query(query, [id]);

    // rowCount indica cuantas filas afecto el DELETE.
    // Si es 0, el id no existia; si es 1, se elimino correctamente.
    return (resultado.rowCount ?? 0) > 0;
  }
}