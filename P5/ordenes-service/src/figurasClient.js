const FIGURAS_SERVICE_URL =
  process.env.FIGURAS_SERVICE_URL || "http://localhost:8002/graphql";

async function graphqlRequest(query, variables) {
  const response = await fetch(FIGURAS_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`figuras-service respondió ${response.status}`);
  }

  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0].message);
  }
  return json.data;
}

// Unica llamada sincrona que queda: es una lectura (precio de la figura),
// necesaria para calcular precio_total al crear la orden. La reserva de
// material ("imprimir") ya no se dispara desde aqui, se publica en la
// cola "ordenes.creadas" (ver broker.js e index.js).
export async function obtenerFigura(figuraId) {
  const query = `
    query Figura($id: ID!) {
      figura(id: $id) {
        id
        nombre
        precio
        gramosRequeridos
        materialId
      }
    }
  `;
  const data = await graphqlRequest(query, { id: figuraId });
  return data.figura;
}
