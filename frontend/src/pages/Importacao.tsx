import { useState } from "react";

import { api } from "../services/api";

export default function Importacao() {

    const [arquivo, setArquivo] =
        useState<File | null>(null);

    async function enviar() {

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

        console.log(
            resposta.data
        );

        alert(
            JSON.stringify(
                resposta.data,
                null,
                2
            )
        );
    }

    return (

        <div>

            <h1>
                Importação Excel
            </h1>

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

            <button
                onClick={enviar}
            >
                Importar
            </button>

        </div>

    );

}