import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Activity, ArrowRight, Boxes, Building2, CircleAlert, Clock3, Plus, Radio, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { getErrorMessage } from "../services/errors";
import type { AssetPage, NetworkRecord, NetworkRecordPage } from "../types/modem";
import { formatDateTime } from "../utils/records";

export default function Dashboard() {
  const [assetSummary, setAssetSummary] = useState<AssetPage | null>(null);
  const [records, setRecords] = useState<NetworkRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([api.get<AssetPage>("/assets", { params: { limit: 1 } }), api.get<NetworkRecordPage>("/records", { params: { limit: 6 } })])
      .then(([assetResponse, recordResponse]) => {
        if (!active) return;
        setAssetSummary(assetResponse.data);
        setRecords(recordResponse.data.items);
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const inUse = assetSummary?.status_counts.EM_USO ?? 0;
  const inStock = assetSummary?.status_counts.ESTOQUE ?? 0;
  const attention = (assetSummary?.status_counts.DEFEITUOSO ?? 0) + (assetSummary?.status_counts.MANUTENCAO ?? 0);
  const units = (assetSummary?.unit_counts ?? []).slice(0, 5);
  const maxUnitCount = Math.max(...units.map(({ count }) => count), 1);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CENTRAL DE OPERAÇÕES</div>
          <h1>Visão geral</h1>
          <p>Acompanhe os equipamentos e as movimentações registradas pela equipe.</p>
        </div>
        <div className="heading-actions">
          <Link className="button button-primary" to="/registro"><Plus size={16} /> Novo registro</Link>
        </div>
      </div>

      {error && <div className="form-error page-alert"><CircleAlert size={16} />{error}</div>}
      <section className="stats-grid" aria-label="Resumo do inventário">
        <StatCard label="Ativos mapeados" value={loading ? "—" : assetSummary?.total ?? 0} note="Equipamentos cadastrados" icon={<Boxes size={16} />} />
        <StatCard label="Em operação" value={loading ? "—" : inUse} note="Alocados em unidades" icon={<Radio size={16} />} />
        <StatCard label="Disponíveis em estoque" value={loading ? "—" : inStock} note="Prontos para instalação" icon={<Building2 size={16} />} />
        <StatCard label="Manutenção / defeito" value={loading ? "—" : attention} note="Precisam de acompanhamento" icon={<Wrench size={16} />} />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h2>Movimentações recentes</h2><p>Últimos registros de atividade técnica</p></div>
            <Link className="link-button" to="/historico">Ver histórico <ArrowRight size={13} /></Link>
          </div>
          {records.length ? (
            <div className="activity-list">
              {records.slice(0, 6).map((record) => (
                <div className="activity-row" key={record.id}>
                  <div className="activity-symbol"><Activity size={16} /></div>
                  <div className="activity-main">
                    <div className="activity-title">{record.request_type} · {record.model}</div>
                    <div className="activity-subtitle">{record.serial} <span>·</span> {record.unit} <span>·</span> {record.technician_name}</div>
                  </div>
                  <div className="activity-time">{formatDateTime(record.created_at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">{loading ? "Carregando movimentações..." : "Ainda não há movimentações registradas."}</div>
          )}
        </section>

        <div className="dashboard-side">
          <section className="panel">
            <div className="panel-heading"><div><h2>Ativos por unidade</h2><p>Onde os equipamentos estão alocados</p></div></div>
            <div className="panel-body">
              {units.length ? (
                <div className="unit-list">
                  {units.map(({ unit, count }) => (
                    <div key={unit}>
                      <div className="unit-item"><span>{unit}</span><span className="unit-count">{count} {count === 1 ? "ativo" : "ativos"}</span></div>
                      <div className="unit-meter"><span style={{ width: `${(count / maxUnitCount) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : <div className="empty-state">{loading ? "Carregando unidades..." : "As unidades aparecerão após os primeiros registros."}</div>}
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading"><div><h2>Atividade da equipe</h2><p>Atendimentos lançados recentemente</p></div></div>
            <div className="panel-body">
              <div className="unit-item"><span><Clock3 size={14} /> Últimos registros</span><strong>{records.length}</strong></div>
              <div className="unit-item" style={{ marginTop: 14 }}><span><Building2 size={14} /> Unidades mapeadas</span><strong>{assetSummary?.unit_counts.length ?? 0}</strong></div>
              <Link className="button button-quiet button-full" to="/feed" style={{ marginTop: 17 }}>Abrir meu feed <ArrowRight size={14} /></Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, note, icon }: { label: string; value: number | string; note: string; icon: ReactNode }) {
  return (
    <article className="panel stat-card">
      <div className="stat-label"><span>{label}</span><span className="stat-icon">{icon}</span></div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </article>
  );
}
