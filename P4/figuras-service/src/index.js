import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";

import { resolvers } from "./resolvers.js";
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

app.listen(PORT, () => {
  console.log(`figuras-service escuchando en puerto ${PORT}`);
  console.log(`GraphQL disponible en /graphql`);
});
