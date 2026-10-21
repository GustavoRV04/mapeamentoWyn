import "./Sidebar.css";
import { Link } from "react-router-dom";

export default function Sidebar() {

    return (

        <aside className="sidebar">

            <h2 className="sidebar-title">
                Gestão de Modems
            </h2>

            <nav className="sidebar-nav">

                <Link to="/">
                    Dashboard
                </Link>

                <Link to="/modems">
                    Modems
                </Link>

                <Link to="/estoque">
                    Estoque
                </Link>

                <Link to="/unidades">
                    Unidades
                </Link>

                <Link to="/historico">
                    Histórico
                </Link>

            </nav>

        </aside>

    );

}