from typing import List, Optional

import strawberry
from sqlmodel import Session, select

from .database import engine
from .models import Material, TipoFilamento

# Strawberry necesita su propio enum decorado (reutiliza los mismos valores)
TipoFilamentoGQL = strawberry.enum(TipoFilamento)


@strawberry.type
class MaterialType:
    id: int
    tipo: TipoFilamentoGQL
    color: str
    gramos_restantes: float
    gramos_totales: float
    precio_por_gramo: float
    proveedor: Optional[str]
    diametro_mm: float

    @staticmethod
    def from_db(m: Material) -> "MaterialType":
        return MaterialType(
            id=m.id,
            tipo=m.tipo,
            color=m.color,
            gramos_restantes=m.gramos_restantes,
            gramos_totales=m.gramos_totales,
            precio_por_gramo=m.precio_por_gramo,
            proveedor=m.proveedor,
            diametro_mm=m.diametro_mm,
        )


@strawberry.input
class CrearMaterialInput:
    tipo: TipoFilamentoGQL
    color: str
    gramos_totales: float
    precio_por_gramo: float
    proveedor: Optional[str] = None
    diametro_mm: float = 1.75


@strawberry.input
class ConsumirGramosInput:
    material_id: int
    gramos: float


@strawberry.type
class Query:
    @strawberry.field
    def materiales(self) -> List[MaterialType]:
        with Session(engine) as session:
            resultados = session.exec(select(Material)).all()
            return [MaterialType.from_db(m) for m in resultados]

    @strawberry.field
    def material(self, id: int) -> Optional[MaterialType]:
        with Session(engine) as session:
            m = session.get(Material, id)
            return MaterialType.from_db(m) if m else None

    @strawberry.field
    def materiales_por_tipo(self, tipo: TipoFilamentoGQL) -> List[MaterialType]:
        with Session(engine) as session:
            resultados = session.exec(
                select(Material).where(Material.tipo == tipo)
            ).all()
            return [MaterialType.from_db(m) for m in resultados]


@strawberry.type
class Mutation:
    @strawberry.mutation
    def crear_material(self, datos: CrearMaterialInput) -> MaterialType:
        with Session(engine) as session:
            nuevo = Material(
                tipo=datos.tipo,
                color=datos.color,
                gramos_totales=datos.gramos_totales,
                gramos_restantes=datos.gramos_totales,
                precio_por_gramo=datos.precio_por_gramo,
                proveedor=datos.proveedor,
                diametro_mm=datos.diametro_mm,
            )
            session.add(nuevo)
            session.commit()
            session.refresh(nuevo)
            return MaterialType.from_db(nuevo)

    @strawberry.mutation
    def consumir_gramos(self, datos: ConsumirGramosInput) -> MaterialType:
        """
        Descuenta gramos de un material (por ejemplo, al imprimir una figura).
        Usado normalmente por figuras-service a través del gateway.
        """
        with Session(engine) as session:
            material = session.get(Material, datos.material_id)
            if not material:
                raise ValueError(f"Material {datos.material_id} no existe")
            if material.gramos_restantes < datos.gramos:
                raise ValueError("No hay suficiente filamento restante")
            material.gramos_restantes -= datos.gramos
            session.add(material)
            session.commit()
            session.refresh(material)
            return MaterialType.from_db(material)

    @strawberry.mutation
    def eliminar_material(self, id: int) -> bool:
        with Session(engine) as session:
            material = session.get(Material, id)
            if not material:
                return False
            session.delete(material)
            session.commit()
            return True


schema = strawberry.Schema(query=Query, mutation=Mutation)
