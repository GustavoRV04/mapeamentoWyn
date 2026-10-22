import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import { Activity, ArrowRight, CircleAlert, LockKeyhole, RadioTower } from "lucide-react";
import { useAuth } from "../contexts/useAuth";

export default function AuthPage({ register = false }: { register?: boolean }) {
  const { user, loading, error, signIn, signUp, clearError } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="auth-loading"><Activity className="spin" /> Carregando...</div>;
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setSubmitting(true);
    try {
      if (register) await signUp(name, matricula, password, inviteCode);
      else await signIn(matricula, password);
      navigate("/", { replace: true });
    } catch {
      return;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand-mark"><RadioTower size={21} /></div>
        <div className="eyebrow">WynHub · OPERAÇÕES DE REDE</div>
        <h1>{register ? "Criar acesso" : "Bem-vindo de volta"}</h1>
        <p className="muted">{register ? "Entre com o convite da sua equipe para criar seu perfil." : "Acesse os registros e ativos da sua equipe."}</p>
        <form onSubmit={handleSubmit} className="auth-form">
          {register && (
            <label>Nome Completo
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required minLength={11} maxLength={120} />
            </label>
          )}
          {register && (
            <label>Matrícula
              <input type="text" placeholder="p002314" value={matricula} onChange={(event) => setMatricula(event.target.value.toLowerCase())} required/> <span className="field-hint"> Ex.: p627651 ou c101690 </span>
            </label>
            )}
          {register && (
            <label>Código de convite
              <input value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} required />
            </label>
          )}
          <label>Senha
            <input type="password" autoComplete={register ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={register ? 10 : undefined} />
            {register && <span className="field-hint">Use pelo menos 10 caracteres.</span>}
          </label>
          {error && <div className="form-error"><CircleAlert size={16} /> {error}</div>}
          <button className="button button-primary button-full" type="submit" disabled={submitting}>
            {submitting ? "Aguarde..." : register ? "Criar minha conta" : "Entrar"}
            {!submitting && <ArrowRight size={17} />}
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Já possui uma conta?" : "Ainda não tem acesso?"}{" "}
          <Link to={register ? "/login" : "/cadastro"}>{register ? "Entrar" : "Cadastre-se com convite"}</Link>
        </p>
        <div className="auth-security"><LockKeyhole size={14} /> Acesso da equipe protegido por convite</div>
      </section>
    </main>
  );
}
