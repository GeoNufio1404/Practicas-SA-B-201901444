import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";

import { consume, publish } from "./broker.js";
import { procesarImpresion, resolvers } from "./resolvers.js";
import { typeDefs } from "./schema.js";

const PORT = process.env.PORT || 8002;

const app = express();
app.use(cors());

const apollo = new ApolloServer({ typeDefs, resolvers });
await apollo.start();

app.use("/graphql", bodyParser.json(), expressMiddleware(apollo));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "figuras-service" });
});

// Consumidor del flujo asincrono: procesa la reserva de material que
// ordenes-service encolo y publica el resultado en "ordenes.procesadas".
// Ack solo se hace (dentro de broker.js) despues de que este handler
// termine sin lanzar excepcion.
consume("ordenes.creadas", async ({ ordenId, figuraId, cantidad }) => {
  const resultado = await procesarImpresion(figuraId, cantidad);

  await publish("ordenes.procesadas", {
    ordenId,
    ok: resultado.ok,
    gramosDescontados: resultado.gramosDescontados,
    gramosRestantesMaterial: resultado.gramosRestantesMaterial,
    mensaje: resultado.mensaje,
  });

  console.log(`[figuras] orden ${ordenId} procesada (ok=${resultado.ok})`);
}).catch((err) => console.error("[figuras] no se pudo iniciar el consumidor:", err.message));

app.listen(PORT, () => {
  console.log(`figuras-service escuchando en puerto ${PORT}`);
  console.log(`GraphQL disponible en /graphql`);
});
