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

export async function dispararImpresion(figuraId, cantidad) {
  const mutation = `
    mutation Imprimir($id: ID!, $cantidad: Int!) {
      imprimirFigura(id: $id, cantidad: $cantidad) {
        gramosDescontados
        gramosRestantesMaterial
        mensaje
      }
    }
  `;
  const data = await graphqlRequest(mutation, { id: figuraId, cantidad });
  return data.imprimirFigura;
}
