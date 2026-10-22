import type { NetworkRecord } from "../types/modem";

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildTeamsMessage(record: Pick<NetworkRecord, "request_type" | "serial" | "model" | "mac_address" | "unit" | "retired_serial" | "retired_model" | "diagnostic" | "notes" | "technician_name" | "created_at">): string {
  const lines = [
    "📡 REGISTRO DE ATIVIDADE TÉCNICA — NOC / TELECOM",
    `👷 Técnico: ${record.technician_name}`,
    `📍 Unidade: ${record.unit}`,
    `🔧 Tipo de demanda: ${record.request_type}`,
    "",
    "📦 EQUIPAMENTO",
    `• Modelo: ${record.model}`,
    `• Número de série: ${record.serial}`,
  ];
  if (record.mac_address) lines.push(`• MAC: ${record.mac_address}`);
  if (record.retired_serial) {
    lines.push("", "🔁 EQUIPAMENTO RETIRADO", `• Modelo: ${record.retired_model || "Não informado"}`, `• Número de série: ${record.retired_serial}`);
  }
  if (record.diagnostic) lines.push("", `🛠 Diagnóstico: ${record.diagnostic}`);
  if (record.notes) lines.push("", `📝 Observações: ${record.notes}`);
  lines.push("", `🕒 Data e hora: ${formatDateTime(record.created_at)}`);
  return lines.join("\n");
}
