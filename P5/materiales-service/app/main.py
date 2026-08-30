from contextlib import asynccontextmanager

from fastapi import FastAPI
from strawberry.fastapi import GraphQLRouter

from .database import init_db
from .schema import schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="materiales-service",
    description="Microservicio de gestión de filamento para impresión 3D",
    lifespan=lifespan,
)

graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


@app.get("/health")
def health():
    """Endpoint REST simple para verificación del gateway / Compose healthcheck."""
    return {"status": "ok", "service": "materiales-service"}
