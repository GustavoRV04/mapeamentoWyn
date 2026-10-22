import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext";
import { useAuth } from "../contexts/useAuth";
import Layout from "../components/layout/Layout";
import AuthPage from "../pages/AuthPage";
import Dashboard from "../pages/Dashboard";
import Estoque from "../pages/Estoque";
import Historico from "../pages/Historico";
import Modems from "../pages/Modems";
import Unidades from "../pages/Unidades";

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Carregando sua sessão...</div>;
  return user ? <Layout><Outlet /></Layout> : <Navigate to="/login" replace />;
}

function AppRouteTree() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/cadastro" element={<AuthPage register />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/registro" element={<Modems />} />
          <Route path="/inventario" element={<Estoque />} />
          <Route path="/unidades" element={<Unidades />} />
          <Route path="/feed" element={<Historico mine />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/modems" element={<Navigate to="/registro" replace />} />
          <Route path="/estoque" element={<Navigate to="/inventario" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function AppRoutes() {
  return <AuthProvider><AppRouteTree /></AuthProvider>;
}
