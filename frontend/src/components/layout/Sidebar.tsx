import { Activity, Boxes, Building2, ClipboardList, LayoutDashboard, LogOut, PlusCircle, RadioTower } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import {useModule} from "../../contexts/ModuleContext";

import {MODULES,type ModuleType} from "../../types/module";
import "./Sidebar.css";

const links = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/registro", label: "Novo registro", icon: PlusCircle },
  { to: "/inventario", label: "Inventário", icon: Boxes },
  { to: "/unidades", label: "Unidades", icon: Building2 },
  { to: "/feed", label: "Meu perfil e feed", icon: Activity },
  { to: "/historico", label: "Histórico geral", icon: ClipboardList },
  
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const {selectedModule,setSelectedModule} = useModule();

  return (
    <aside className="sidebar">
      <Link to="/" className="brand">
  <span className="brand-icon">
    <RadioTower size={20} />
  </span>

  <span>
    <strong>WynHub Ativos</strong>
    <small>OPERAÇÕES DE REDE</small>
  </span>
</Link>

<div className="module-selector">

  <label>
    Área ativa
  </label>

  <select
    value={selectedModule}
    onChange={(event) =>
      setSelectedModule(
        event.target.value as ModuleType
      )
    }
  >

    {Object.entries(MODULES).map(
      ([value, module]) => (

        <option
          key={value}
          value={value}
        >
          {module.label}
        </option>

      )
    )}

  </select>

</div>

<div className="sidebar-section-label">
  ESPAÇO DE TRABALHO
</div>
      <nav className="sidebar-nav">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => isActive ? "sidebar-link active" : "sidebar-link"}>
            <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-status"><span className="status-dot" /> Dados compartilhados com a equipe</div>
      <div className="sidebar-user">
        <div className="avatar">{user?.name.slice(0, 1).toUpperCase()}</div>
        <div className="sidebar-user-info"><strong>{user?.name}</strong><span>{user?.matricula}</span></div>
        <button className="icon-button logout-button" title="Sair da conta" onClick={() => void signOut()}><LogOut size={17} /></button>
      </div>
    </aside>
  );
}
