import {
    BrowserRouter,
    Routes,
    Route
} from "react-router-dom";

import Dashboard from "../pages/Dashboard";
import Modems from "../pages/Modems";
import Estoque from "../pages/Estoque";
import Unidades from "../pages/Unidades";
import Historico from "../pages/Historico";

export default function AppRoutes() {

    return (
        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Dashboard />}
                />

                <Route
                    path="/modems"
                    element={<Modems />}
                />

                <Route
                    path="/estoque"
                    element={<Estoque />}
                />

                <Route
                    path="/unidades"
                    element={<Unidades />}
                />

                <Route
                    path="/historico"
                    element={<Historico />}
                />

            </Routes>

        </BrowserRouter>
    );

}