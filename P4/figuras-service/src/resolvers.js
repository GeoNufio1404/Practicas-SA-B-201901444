import { db, rowToFigura } from "./db.js";

const MATERIALES_SERVICE_URL =
  process.env.MATERIALES_SERVICE_URL || "http://localhost:8001/graphql";

async function consumirGramosEnMateriales(materialId, gramos) {
  const query = `
    mutation ConsumirGramos($materialId: Int!, $gramos: Float!) {
      consumirGramos(datos: { materialId: $materialId, gramos: $gramos }) {
        id
        gramosRestantes
      }
    }
  `;

  const response = await fetch(MATERIALES_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { materialId, gramos } }),
  });

  if (!response.ok) {
    throw new Error(`materiales-service respondió ${response.status}`);
  }

  const json = await response.json();

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }

  return json.data.consumirGramos;
}

export const resolvers = {
  Query: {
    figuras: () => {
      const rows = db.prepare("SELECT * FROM figuras").all();
      return rows.map(rowToFigura);
    },
    figura: (_parent, { id }) => {
      const row = db.prepare("SELECT * FROM figuras WHERE id = ?").get(id);
      return rowToFigura(row);
    },
    figurasPorMaterial: (_parent, { materialId }) => {
      const rows = db
        .prepare("SELECT * FROM figuras WHERE material_id = ?")
        .all(materialId);
      return rows.map(rowToFigura);
    },
  },
  Mutation: {
    crearFigura: (_parent, { datos }) => {
      const stmt = db.prepare(`
        INSERT INTO figuras
          (nombre, material_id, gramos_requeridos, piezas, alto_mm, ancho_mm, profundo_mm, tiempo_impresion_horas, precio)
        VALUES (@nombre, @materialId, @gramosRequeridos, @piezas, @altoMm, @anchoMm, @profundoMm, @tiempoImpresionHoras, @precio)
      `);

      const info = stmt.run({
        nombre: datos.nombre,
        materialId: datos.materialId,
        gramosRequeridos: datos.gramosRequeridos,
        piezas: datos.piezas ?? 1,
        altoMm: datos.dimensiones?.altoMm ?? null,
        anchoMm: datos.dimensiones?.anchoMm ?? null,
        profundoMm: datos.dimensiones?.profundoMm ?? null,
        tiempoImpresionHoras: datos.tiempoImpresionHoras ?? null,
        precio: datos.precio,
      });

      const row = db
        .prepare("SELECT * FROM figuras WHERE id = ?")
        .get(info.lastInsertRowid);
      return rowToFigura(row);
    },

    eliminarFigura: (_parent, { id }) => {
      const info = db.prepare("DELETE FROM figuras WHERE id = ?").run(id);
      return info.changes > 0;
    },

    imprimirFigura: async (_parent, { id, cantidad }) => {
      const row = db.prepare("SELECT * FROM figuras WHERE id = ?").get(id);
      if (!row) {
        throw new Error(`Figura ${id} no existe`);
      }

      const figura = rowToFigura(row);
      const gramosTotales = figura.gramosRequeridos * (cantidad ?? 1);

      try {
        const materialActualizado = await consumirGramosEnMateriales(
          figura.materialId,
          gramosTotales
        );

        return {
          figura,
          gramosDescontados: gramosTotales,
          gramosRestantesMaterial: materialActualizado.gramosRestantes,
          mensaje: `Se descontaron ${gramosTotales}g del material ${figura.materialId} en materiales-service`,
        };
      } catch (err) {
        // No tumbamos la mutación completa: devolvemos el detalle del fallo
        // para que quede claro en el diagrama de arquitectura que esta
        // llamada es entre servicios y puede fallar independientemente.
        return {
          figura,
          gramosDescontados: 0,
          gramosRestantesMaterial: null,
          mensaje: `No se pudo contactar materiales-service: ${err.message}`,
        };
      }
    },
  },
};
