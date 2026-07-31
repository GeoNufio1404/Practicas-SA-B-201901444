import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { pool } from "./config/database";
import { SolicitudPostgresService } from "./services/solicitud.postgres.service";
import { SolicitudService } from "./services/solicitud.service";
import { SolicitudController } from "./controllers/solicitud.controller";
import { crearSolicitudRoutes } from "./routes/solicitud.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", entorno: env.NODE_ENV });
});

/**
 * Composition root: aqui, y solo aqui, se decide que implementacion
 * concreta usa cada capa. Si mañana cambiamos PostgreSQL por otro
 * motor, o queremos un repositorio en memoria para pruebas, este es
 * el unico archivo que cambia; nadie mas en el proyecto conoce esta
 * decision.
 */
const solicitudRepository = new SolicitudPostgresService(pool);
const solicitudService = new SolicitudService(solicitudRepository);
const solicitudController = new SolicitudController(solicitudService);

app.use("/api/solicitudes", crearSolicitudRoutes(solicitudController));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Servidor escuchando en el puerto ${env.PORT}`);
});