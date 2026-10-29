import { useState } from "react";
import { Upload } from "lucide-react";

import { api } from "../services/api";


interface ResultadoImportacao {

    arquivo: string;

    linhas: number;

    colunas: string[];

}
export default function Importacao() {

    const [arquivo, setArquivo] =
        useState<File | null>(null);

    const [resultado, setResultado] =
        useState<ResultadoImportacao | null>(
            null
        );

    async function importar() {

        if (!arquivo) return;

        const formData =
            new FormData();

        formData.append(
            "arquivo",
            arquivo
        );

        const resposta =
            await api.post(
                "/import/excel",
                formData
            );

        setResultado(
            resposta.data
        );
    }

    return (

        <div>

            <div className="page-heading">

                <div>

                    <div className="eyebrow">
                        IMPORTAÇÃO
                    </div>

                    <h1>
                        Importar Planilha
                    </h1>

                    <p>
                        Faça upload de uma planilha
                        para validar as colunas.
                    </p>

                </div>

            </div>

            <section className="panel">

                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) =>
                        setArquivo(
                            event.target.files?.[0]
                            || null
                        )
                    }
                />

                <br />
                <br />

                <button
                    className="button button-primary"
                    onClick={importar}
                >

                    <Upload size={15} />

                    Importar

                </button>

            </section>

            {resultado && (

                <section
                    className="panel"
                    style={{ marginTop: "20px" }}
                >

                    <h2>
                        Resultado
                    </h2>

                    <p>

                        Arquivo:

                        {" "}

                        <strong>
                            {resultado.arquivo}
                        </strong>

                    </p>

                    <p>

                        Linhas:

                        {" "}

                        <strong>
                            {resultado.linhas}
                        </strong>

                    </p>

                    <h3>
                        Colunas encontradas
                    </h3>

                    <ul>

                        {resultado.colunas.map(
                            (coluna: string) => (

                                <li key={coluna}>
                                    {coluna}
                                </li>

                            )
                        )}

                    </ul>

                </section>

            )}

        </div>

    );

}