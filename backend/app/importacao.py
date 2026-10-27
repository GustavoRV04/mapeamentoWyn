import pandas as pd

from fastapi import APIRouter
from fastapi import UploadFile
from fastapi import File
from fastapi import HTTPException

router = APIRouter(
    prefix="/import",
    tags=["Importação"]
)


@router.post("/excel")
async def importar_excel(
    arquivo: UploadFile = File(...)
):

    try:

        if not arquivo.filename.endswith(
            (".xlsx", ".xls")
        ):

            raise HTTPException(
                status_code=400,
                detail="Envie um arquivo Excel."
            )

        df = pd.read_excel(
            arquivo.file
        )

        return {

            "arquivo":
                arquivo.filename,

            "linhas":
                len(df),

            "colunas":
                list(df.columns)

        }

    except Exception as erro:

        raise HTTPException(
            status_code=500,
            detail=str(erro)
        )