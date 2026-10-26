import { useEffect, useState } from "react";
import { Boxes, CircleAlert, Download, Search } from "lucide-react";
import { api } from "../services/api";
import { getErrorMessage } from "../services/errors";
import type { Asset, AssetPage } from "../types/modem";
import { useModule } from "../contexts/ModuleContext";
import { MODULES } from "../types/module";
import { formatDateTime } from "../utils/records";

const statusLabels: Record<Asset["status"], string> = {
  EM_USO: "Em operação",
  ESTOQUE: "Em estoque",
  DEFEITUOSO: "Com defeito",
  MANUTENCAO: "Em manutenção",
};
const pageSize = 25;

export default function Estoque() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<AssetPage["status_counts"]>({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const { selectedModule } = useModule();

  const moduleConfig = MODULES[selectedModule as keyof typeof MODULES];

  useEffect(() => {
    let active = true;
    api.get<AssetPage>("/assets", { params: { q: search, status, limit: pageSize, offset: page * pageSize } })
      .then(({ data }) => {
        if (!active) return;
        setAssets(data.items);
        setTotal(data.total);
        setStatusCounts(data.status_counts);
      })
      .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, search, status]);

  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const response = await api.get<Blob>("/assets/export", { params: { q: search, status }, responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "inventario-ativos.csv";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setExporting(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">CONSULTA E CONTROLE</div><h1>{moduleConfig.inventory.title}</h1><p>Consulte a localização e a situação atual dos equipamentos registrados.</p></div>
        <button className="button" type="button" onClick={() => void exportCsv()} disabled={!total || exporting}><Download size={15} />{exporting ? "Gerando..." : "Exportar CSV"}</button>
      </div>
      <section className="stats-grid inventory-stats">
        <InventoryStat label="Ativos encontrados" value={total} />
        <InventoryStat label="Em operação" value={statusCounts.EM_USO ?? 0} />
        <InventoryStat label="Disponíveis" value={statusCounts.ESTOQUE ?? 0} />
        <InventoryStat label="Com pendência" value={(statusCounts.DEFEITUOSO ?? 0) + (statusCounts.MANUTENCAO ?? 0)} />
      </section>
      <section className="panel">
        <div className="toolbar">
          <div className="search-field"><Search size={15} /><input value={search} onChange={(event) => { setLoading(true); setError(""); setPage(0); setSearch(event.target.value); }} placeholder="Buscar série, MAC, modelo ou unidade..." aria-label="Buscar ativos" /></div>
          <select className="filter-select" value={status} onChange={(event) => { setLoading(true); setError(""); setPage(0); setStatus(event.target.value); }} aria-label="Filtrar por situação">
            <option value="">Todas as situações</option>
            <option value="EM_USO">Em operação</option>
            <option value="ESTOQUE">Em estoque</option>
            <option value="DEFEITUOSO">Com defeito</option>
            <option value="MANUTENCAO">Em manutenção</option>
          </select>
        </div>
        {error && <div className="form-error table-message"><CircleAlert size={16} />{error}</div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>Número de série</th><th>Modelo</th><th>MAC address</th><th>Unidade atual</th><th>Situação</th><th>Atualização</th></tr></thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.serial}>
                  <td className="serial-cell">{asset.serial}</td>
                  <td>{asset.model}</td>
                  <td className="mono-cell">{asset.mac_address || "—"}</td>
                  <td>{asset.unit}</td>
                  <td><span className={`status-pill status-${asset.status}`}>{statusLabels[asset.status]}</span></td>
                  <td>{formatDateTime(asset.updated_at)}</td>
                </tr>
              ))}
              {!assets.length && <tr><td colSpan={6} className="empty-state">{loading ? "Carregando inventário..." : error ? "Não foi possível carregar os ativos." : "Nenhum ativo encontrado. Registre uma movimentação para começar."}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="table-footer">
          <span>{total ? `Exibindo ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total} ativos` : "0 ativos"}</span>
          <div className="pager">
            <button className="button" type="button" onClick={() => { setLoading(true); setPage((current) => current - 1); }} disabled={page === 0}>Anterior</button>
            <span>{page + 1} / {pageCount}</span>
            <button className="button" type="button" onClick={() => { setLoading(true); setPage((current) => current + 1); }} disabled={page + 1 >= pageCount}>Próxima</button>
          </div>
          <span><Boxes size={13} /> Situação pela última movimentação</span>
        </div>
      </section>
    </>
  );
}

function InventoryStat({ label, value }: { label: string; value: number }) {
  return <article className="panel stat-card"><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">Visão atual do inventário</div></article>;
}
