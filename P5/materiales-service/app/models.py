from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class TipoFilamento(str, Enum):
    PLA = "PLA"
    PETG = "PETG"
    ABS = "ABS"
    ASA = "ASA"
    TPU = "TPU"
    NYLON = "NYLON"


class Material(SQLModel, table=True):
    """
    Representa un rollo/lote de filamento de impresión 3D.
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    tipo: TipoFilamento
    color: str
    gramos_restantes: float = Field(ge=0)
    gramos_totales: float = Field(ge=0)
    precio_por_gramo: float = Field(ge=0)
    proveedor: Optional[str] = None
    diametro_mm: float = Field(default=1.75)
