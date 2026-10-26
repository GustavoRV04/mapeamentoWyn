export const MODULES = {

    MODEM: {
        label: "Modem 4G",

        dashboard: {
            total: "Modems cadastrados",
            active: "Em uso",
            stock: "Em estoque",
            attention: "Defeito"
        },

    inventory: {

        title: "Inventário Modem 4G ",

        columns: [
            "CGC da instalação",
            "REQ",
            "Nome da unidade",
            "Série",
            "Chip",
            "IMEI",
            "Designação",
            "Status"
        ]

    }
    },

    FORTIGATE: {
        label: "Fortigate",

        dashboard: {
            total: "Fortigates cadastrados",
            active: "Instalados",
            stock: "Reserva",
            attention: "Defeito"
        },

    inventory: {

        title: "Inventário Fortigate",

        columns: [
            "CGC da instalação",
            "REQ",
            "Nome da unidade",
            "Série",
            "ip",
            "Status"
        ]

    }
    },

    STARLINK: {
        label: "Starlink",

        dashboard: {
            total: "Starlinks cadastradas",
            active: "Em uso",
            stock: "Reserva",
            attention: "Pendência"
        },

    inventory: {

        title: "Inventário Starlink",

        columns: [
            "CGC da instalação",
            "REQ",
            "Nome da unidade",
            "Série",
            "Status"
        ]

    }

    },

    LOTERICA: {

    label: "Lotéricas",

    dashboard: {
        total: "Lotéricas",
        active: "Portas ocupadas",
        stock: "Portas livres",
        attention: "Pendências"
    },

    inventory: {

        title: "Inventário de Lotéricas",

        columns: [
            "Código UL",
            "REQ",
            "Nome",
            "Série ar1220",
            "Portas Ocupadas",
            "Status"
        ]

    }

}

} as const;

export type ModuleType =
    keyof typeof MODULES;