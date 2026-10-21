export interface Modem {
    id: number;

    serial: string;

    imei: string;

    chip: string;

    designacao: string;

    operadora: string;

    modelo: string;

    unidade: string;

    status:
        | "EM_USO"
        | "ESTOQUE"
        | "TRANSITO"
        | "DEFEITUOSO";
}