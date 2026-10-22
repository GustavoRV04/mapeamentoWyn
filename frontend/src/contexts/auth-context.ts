import { createContext } from "react";
import type { User } from "../types/modem";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string;
  signIn: (matricula: string, password: string) => Promise<void>;
  signUp: (name: string, matricula: string, password: string, inviteCode: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
