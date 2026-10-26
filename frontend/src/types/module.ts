export const MODULES = {

    MODEM: {
        label: "Modem 4G",

        dashboard: {
            total: "Modems cadastrados",
            active: "Em uso",
            stock: "Em estoque",
            attention: "Defeito"
        }
    },

    FORTIGATE: {
        label: "Fortigate",

        dashboard: {
            total: "Fortigates cadastrados",
            active: "Instalados",
            stock: "Reserva",
            attention: "Defeito"
        }
    },

    STARLINK: {
        label: "Starlink",

        dashboard: {
            total: "Starlinks cadastradas",
            active: "Em uso",
            stock: "Reserva",
            attention: "Pendência"
        }
    },

    LOTERICA: {
        label: "Lotéricas",

        dashboard: {
            total: "Lotéricas",
            active: "Portas ocupadas",
            stock: "Portas livres",
            attention: "Pendências"
        }
    }

} as const;

export type ModuleType =
    keyof typeof MODULES;