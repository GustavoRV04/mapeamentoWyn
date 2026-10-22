import { useEffect, useState } from "react";
import { Activity, CircleAlert, Clipboard, FileImage, Search } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import NetworkPhoto from "../components/NetworkPhoto";
import { api } from "../services/api";
import { getErrorMessage } from "../services/errors";
import type { NetworkRecord, NetworkRecordPage, RequestType } from "../types/modem";
import { buildTeamsMessage, formatDateTime } from "../utils/records";

const types: RequestType[] = ["Instalação", "Substituição", "Recolhimento", "Preventiva", "Manutenção", "Transferência"];
const pageSize = 20;

export default function Historico({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<NetworkRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [typeCounts, setTypeCounts] = useState<NetworkRecordPage["type_counts"]>({});
  const [search, setSearch] = useState("");
  const [requestType, setRequestType] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

  useEffect(() => {
    let active = true;
    api.get<NetworkRecordPage>("/records", { params: { q: search, request_type: requestType, mine, limit: pageSize, offset: page * pageSize } })
      .then(({ data }) => {
        if (!active) return;
        setRecords(data.items);
        setTotal(data.total);
        setTypeCounts(data.type_counts);
      })
      .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mine, page, requestType, search]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  async function copyRecord(record: NetworkRecord) {
    try {
      await navigator.clipboard.writeText(buildTeamsMessage(record));
      setCopyNotice(`Mensagem do registro #${record.id} copiada.`);
      window.setTimeout(() => setCopyNotice(""), 2500);
    } catch {
      setCopyNotice("Não foi possível copiar. Verifique a permissão de acesso à área de transferência.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">{mine ? "ESPAÇO PESSOAL" : "CONSULTA OPERACIONAL"}</div><h1>{mine ? "Meu perfil e atividades" : "Histórico de atendimentos"}</h1><p>{mine ? `Registros atribuídos a ${user?.name}.` : "Consulte os atendimentos registrados por toda a equipe."}</p></div>
      </div>

      {mine && (
        <section className="panel profile-summary">
          <div className="profile-identity">
            <div className="profile-avatar">{user?.name.slice(0, 1).toUpperCase()}</div>
            <div><div className="eyebrow">PERFIL DO TÉCNICO</div><h2>{user?.name}</h2><p>{user?.matricula}</p></div>
          </div>
          <div className="profile-metrics">
            <div><strong>{total}</strong><span>Atendimentos</span></div>
            <div><strong>{typeCounts["Instalação"] ?? 0}</strong><span>Instalações</span></div>
            <div><strong>{typeCounts["Substituição"] ?? 0}</strong><span>Substituições</span></div>
          </div>
        </section>
      )}

      <section className="panel history-panel">
        <div className="toolbar">
          <div className="search-field"><Search size={15} /><input value={search} onChange={(event) => { setLoading(true); setError(""); setPage(0); setSearch(event.target.value); }} placeholder="Buscar série, modelo, técnico ou unidade..." aria-label="Buscar registros" /></div>
          <select className="filter-select" value={requestType} onChange={(event) => { setLoading(true); setError(""); setPage(0); setRequestType(event.target.value); }} aria-label="Filtrar tipo de atendimento">
            <option value="">Todos os atendimentos</option>
            {types.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        {error && <div className="form-error table-message"><CircleAlert size={16} />{error}</div>}
        {copyNotice && <div className="form-success table-message">{copyNotice}</div>}
        {mine ? (
          <div className="feed-list history-feed">
            {records.map((record) => <FeedCard key={record.id} record={record} onCopy={() => void copyRecord(record)} />)}
            {!records.length && <div className="empty-state">{loading ? "Carregando atividades..." : "Você ainda não tem registros com esses filtros."}</div>}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data / hora</th><th>Atendimento</th><th>Equipamento</th><th>Unidade</th><th>Técnico</th><th>Evidências</th></tr></thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDateTime(record.created_at)}</td>
                    <td><span className="type-pill">{record.request_type}</span></td>
                    <td><span className="serial-cell">{record.serial}</span><span className="table-secondary">{record.model}</span></td>
                    <td>{record.unit}</td>
                    <td>{record.technician_name}</td>
                    <td>{record.photo_ids.length ? <span className="photo-count"><FileImage size={13} /> {record.photo_ids.length}</span> : "—"}</td>
                  </tr>
                ))}
                {!records.length && <tr><td colSpan={6} className="empty-state">{loading ? "Carregando histórico..." : "Nenhum registro encontrado."}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>{total ? `Exibindo ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total} registro(s)` : "0 registro(s)"}</span>
          <div className="pager">
            <button className="button" type="button" onClick={() => { setLoading(true); setPage((current) => current - 1); }} disabled={page === 0}>Anterior</button>
            <span>{page + 1} / {pageCount}</span>
            <button className="button" type="button" onClick={() => { setLoading(true); setPage((current) => current + 1); }} disabled={page + 1 >= pageCount}>Próxima</button>
          </div>
        </div>
      </section>
    </>
  );
}

function FeedCard({ record, onCopy }: { record: NetworkRecord; onCopy: () => void }) {
  return (
    <article className="panel feed-card">
      <div className="feed-top">
        <div className="feed-author">
          <div className="avatar">{record.technician_name.slice(0, 1).toUpperCase()}</div>
          <div><strong>{record.technician_name}</strong><span>{formatDateTime(record.created_at)} · {record.unit}</span></div>
        </div>
        <span className="type-pill"><Activity size={12} /> {record.request_type}</span>
      </div>
      <div className="feed-details">
        <Detail label="Modelo" value={record.model} />
        <Detail label="Número de série" value={record.serial} />
        <Detail label="MAC address" value={record.mac_address || "Não informado"} />
        {record.retired_serial && <Detail label="Equipamento retirado" value={`${record.retired_model} · ${record.retired_serial}`} />}
      </div>
      {record.diagnostic && <p className="feed-notes"><strong>Diagnóstico:</strong> {record.diagnostic}</p>}
      {record.notes && <p className="feed-notes"><strong>Observações:</strong> {record.notes}</p>}
      {!!record.photo_ids.length && <div className="feed-photos">{record.photo_ids.map((photoId) => <NetworkPhoto key={photoId} recordId={record.id} photoId={photoId} />)}</div>}
      <div className="feed-card-footer">
        <span>{record.photo_ids.length ? <><FileImage size={13} /> {record.photo_ids.length} evidência(s)</> : "Sem fotos anexadas"}</span>
        <button className="button button-quiet" type="button" onClick={onCopy}><Clipboard size={14} /> Copiar mensagem</button>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><div className="feed-detail-label">{label}</div><div className="feed-detail-value" title={value}>{value}</div></div>;
}
