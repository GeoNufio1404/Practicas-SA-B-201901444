export const typeDefs = `#graphql
  type Dimensiones {
    altoMm: Float
    anchoMm: Float
    profundoMm: Float
  }

  type Figura {
    id: ID!
    nombre: String!
    materialId: Int!
    gramosRequeridos: Float!
    piezas: Int!
    dimensiones: Dimensiones
    tiempoImpresionHoras: Float
    precio: Float!
  }

  input DimensionesInput {
    altoMm: Float
    anchoMm: Float
    profundoMm: Float
  }

  input CrearFiguraInput {
    nombre: String!
    materialId: Int!
    gramosRequeridos: Float!
    piezas: Int = 1
    dimensiones: DimensionesInput
    tiempoImpresionHoras: Float
    precio: Float!
  }

  type ResultadoImpresion {
    figura: Figura!
    gramosDescontados: Float!
    gramosRestantesMaterial: Float
    mensaje: String!
  }

  type Query {
    figuras: [Figura!]!
    figura(id: ID!): Figura
    figurasPorMaterial(materialId: Int!): [Figura!]!
  }

  type Mutation {
    crearFigura(datos: CrearFiguraInput!): Figura!
    eliminarFigura(id: ID!): Boolean!
    """
    Simula imprimir N copias de una figura: calcula el gramaje total
    y llama a materiales-service para descontarlo del inventario.
    """
    imprimirFigura(id: ID!, cantidad: Int = 1): ResultadoImpresion!
  }
`;
