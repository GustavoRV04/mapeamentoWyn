import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "../services/api";
import { getErrorMessage } from "../services/errors";
import type { AuthResponse, User } from "../types/modem";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem("wyn-session")));
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("wyn-session");
    if (!token) return;
    api.get<User>("/auth/me")
      .then(({ data }) => setUser(data))
      .catch((requestError: unknown) => {
        localStorage.removeItem("wyn-session");
        setError(getErrorMessage(requestError));
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback((data: AuthResponse) => {
    localStorage.setItem("wyn-session", data.token);
    setUser(data.user);
    setError("");
  }, []);

  const signIn = useCallback(async (matricula: string, password: string) => {
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", { matricula, password });
      saveSession(data);
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      throw new Error(message, { cause: requestError });
    }
  }, [saveSession]);

  const signUp = useCallback(async (name: string, matricula: string, password: string, inviteCode: string) => {
    try {
      const { data } = await api.post<AuthResponse>("/auth/register", {
        name,
        matricula,
        password,
        invite_code: inviteCode,
      });
      saveSession(data);
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
      throw new Error(message, { cause: requestError });
    }
  }, [saveSession]);

  const signOut = useCallback(async () => {
    try {
      await api.delete("/auth/session");
      setError("");
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      localStorage.removeItem("wyn-session");
      setUser(null);
    }
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return (
    <AuthContext.Provider value={{ user, loading, error, signIn, signUp, signOut, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}
