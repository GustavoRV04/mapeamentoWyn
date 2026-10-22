import { useEffect, useMemo, useState } from "react";
import { Building2, CircleAlert, MapPin, Search } from "lucide-react";
import { api } from "../services/api";
import { getErrorMessage } from "../services/errors";
import type { AssetPage } from "../types/modem";

export default function Unidades() {
  const [unitSummary, setUnitSummary] = useState<AssetPage["unit_counts"]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get<AssetPage>("/assets", { params: { limit: 1 } })
      .then(({ data }) => { if (active) setUnitSummary(data.unit_counts); })
      .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const units = useMemo(() => unitSummary
    .filter(({ unit }) => unit.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))), [search, unitSummary]);

  return (
    <>
      <div className="page-heading">
        <div><div className="eyebrow">LOCAIS DE OPERAÇÃO</div><h1>Unidades</h1><p>Visão dos ativos alocados em cada unidade e local de atendimento.</p></div>
      </div>
      {error && <div className="form-error page-alert"><CircleAlert size={16} />{error}</div>}
      <section className="panel">
        <div className="toolbar">
          <div className="search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar unidade..." aria-label="Buscar unidade" /></div>
          <span className="unit-count">{units.length} local(is) com ativos</span>
        </div>
        {units.length ? (
          <div className="units-grid units-panel-grid">
            {units.map(({ unit, count }) => {
            return (
              <article className="panel unit-card" key={unit}>
                <div className="unit-card-title"><MapPin size={17} />{unit}</div>
                <div className="unit-card-count">{count}</div>
                <div className="unit-card-caption">ativos nesta unidade</div>
                <div className="unit-summary"><span><Building2 size={13} /> Local com ativos cadastrados</span></div>
              </article>
            );
            })}
          </div>
        ) : (
          <div className="empty-state">{loading ? "Carregando unidades..." : error ? "Não foi possível carregar as unidades." : "As unidades cadastradas nos atendimentos aparecerão aqui."}</div>
        )}
      </section>
    </>
  );
}
