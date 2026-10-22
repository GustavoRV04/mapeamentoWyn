import axios from "axios";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      const messages = detail.flatMap((issue: unknown) => {
        if (!issue || typeof issue !== "object") return [];
        const message = "msg" in issue ? issue.msg : undefined;
        return typeof message === "string" ? [message] : [];
      });
      if (messages.length) return messages.join(" ");
    }
    if (!error.response) return "Não foi possível conectar ao servidor. Verifique se a API está em execução.";
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
