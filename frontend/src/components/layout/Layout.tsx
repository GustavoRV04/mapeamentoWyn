import { useEffect, useState } from "react";
import { Search, Signal, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../../services/api";
import Sidebar from "./Sidebar";
import "./Layout.css";

export default function Layout({ children }: { children: ReactNode }) {
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    api.get("/")
      .then(() => { if (active) setApiOnline(true); })
      .catch(() => { if (active) setApiOnline(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-search"><Search size={16} /><span>Gestão de ativos e atendimentos</span></div>
          <div className="topbar-right">
            <span className={`network-indicator ${apiOnline === false ? "offline" : ""}`}>
              {apiOnline === false ? <WifiOff size={15} /> : <Signal size={15} />}
              {apiOnline === null ? "Verificando API" : apiOnline ? "API conectada" : "API indisponível"}
            </span>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="app-footer">WynHub Ativos <span>·</span> Controle operacional de ativos de rede</footer>
      </div>
    </div>
  );
}
