import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Clipboard, FileImage, MessageSquareText, RadioTower, Save, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "../contexts/useAuth";
import { api } from "../services/api";
import { getErrorMessage } from "../services/errors";
import type { NetworkRecord, RequestType } from "../types/modem";
import { buildTeamsMessage } from "../utils/records";

const requestTypes: RequestType[] = ["Instalação", "Substituição", "Recolhimento", "Preventiva", "Manutenção", "Transferência"];

interface FormFields {
  request_type: RequestType;
  serial: string;
  model: string;
  mac_address: string;
  unit: string;
  retired_serial: string;
  retired_model: string;
  diagnostic: string;
  notes: string;
}

const emptyForm: FormFields = {
  request_type: "Instalação",
  serial: "",
  model: "",
  mac_address: "",
  unit: "",
  retired_serial: "",
  retired_model: "",
  diagnostic: "",
  notes: "",
};

export default function Modems() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormFields>(emptyForm);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<NetworkRecord | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const message = useMemo(() => buildTeamsMessage({
    ...form,
    technician_name: user?.name ?? "Técnico",
    created_at: new Date().toISOString(),
  }), [form, user?.name]);

  function updateField<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "request_type" && value !== "Substituição" && value !== "Recolhimento") {
        next.retired_serial = "";
        next.retired_model = "";
      }
      return next;
    });
    setSaved(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const data = new FormData();
      data.append("payload", JSON.stringify(form));
      photos.forEach((photo) => data.append("photos", photo));
      const response = await api.post<NetworkRecord>("/records", data);
      setSaved(response.data);
      setCopied(false);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(saved ? buildTeamsMessage(saved) : message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar a mensagem. Verifique a permissão de acesso à área de transferência.");
    }
  }

  function clearForm() {
    setForm(emptyForm);
    setPhotos([]);
    setPhotoInputKey((current) => current + 1);
    setSaved(null);
    setError("");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">OPERAÇÕES DE CAMPO</div>
          <h1>Novo registro</h1>
          <p>Registre a movimentação, atualize o inventário e gere a mensagem para o Teams.</p>
        </div>
        <div className="heading-actions"><button type="button" className="button button-quiet" onClick={clearForm}>Limpar formulário</button></div>
      </div>

      <div className="record-layout">
        <form className="panel" onSubmit={handleSubmit}>
          <section className="form-section">
            <div className="section-title"><RadioTower size={16} /> Tipo de atendimento</div>
            <div className="request-type-grid">
              {requestTypes.map((type) => (
                <button key={type} type="button" className={`request-type ${form.request_type === type ? "selected" : ""}`} onClick={() => updateField("request_type", type)}>
                  {type}
                </button>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div className="section-title"><ShieldCheck size={16} /> Identificação do equipamento</div>
            <div className="form-grid">
              <label>Número de série *
                <input value={form.serial} onChange={(event) => updateField("serial", event.target.value)} placeholder="Ex.: HWTC8392012" required maxLength={120} />
              </label>
              <label>Modelo *
                <input value={form.model} onChange={(event) => updateField("model", event.target.value)} placeholder="Ex.: Huawei HG8245W5" required maxLength={160} />
              </label>
              <label>Endereço MAC
                <input value={form.mac_address} onChange={(event) => updateField("mac_address", event.target.value)} placeholder="00:1A:2B:3C:4D:5E" maxLength={32} />
              </label>
              <label>Unidade / local *
                <input value={form.unit} onChange={(event) => updateField("unit", event.target.value)} placeholder="Ex.: Filial Campinas - TI" required maxLength={160} />
              </label>
              {form.request_type === "Substituição" && (
                <>
                  <label>Série do equipamento retirado *
                    <input value={form.retired_serial} onChange={(event) => updateField("retired_serial", event.target.value)} required maxLength={120} />
                  </label>
                  <label>Modelo retirado
                    <input value={form.retired_model} onChange={(event) => updateField("retired_model", event.target.value)} maxLength={160} />
                  </label>
                </>
              )}
              {form.request_type === "Recolhimento" && (
                <>
                  <label>Série recolhida
                    <input value={form.retired_serial} onChange={(event) => updateField("retired_serial", event.target.value)} maxLength={120} placeholder="Se diferente do equipamento acima" />
                  </label>
                  <label>Modelo recolhido
                    <input value={form.retired_model} onChange={(event) => updateField("retired_model", event.target.value)} maxLength={160} />
                  </label>
                </>
              )}
              {(form.request_type === "Manutenção" || form.request_type === "Recolhimento") && (
                <label className="span-two">Diagnóstico / motivo
                  <textarea value={form.diagnostic} onChange={(event) => updateField("diagnostic", event.target.value)} placeholder="Descreva o defeito ou motivo do recolhimento..." maxLength={2000} />
                </label>
              )}
            </div>
          </section>

          <section className="form-section">
            <div className="section-title"><FileImage size={16} /> Evidências e observações</div>
            <div className="form-grid">
              <div className="span-two photo-field">
                <span className="form-label">Fotos do atendimento</span>
                <label className="photo-picker">
                  <input key={photoInputKey} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    if (selected.length > 5) {
                      setError("Selecione no máximo cinco fotos por registro.");
                      setPhotos([]);
                      setPhotoInputKey((current) => current + 1);
                    } else {
                      setError("");
                      setPhotos(selected);
                    }
                  }} />
                  <span><FileImage size={18} />{photos.length ? `${photos.length} foto(s) selecionada(s)` : "Selecionar fotos (JPEG, PNG ou WebP · até 5 fotos de 5 MB)"}</span>
                </label>
                {photos.length > 0 && <span className="field-hint">{photos.map((photo) => photo.name).join(" · ")}</span>}
              </div>
              <label className="span-two">Observações gerais
                <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Adicione informações úteis para consulta futura..." maxLength={4000} />
              </label>
            </div>
          </section>

          {error && <div className="form-error form-message"><span>{error}</span></div>}
          {saved && <div className="form-success form-message"><ShieldCheck size={16} /> Registro #{saved.id} salvo. O inventário e o histórico já foram atualizados.</div>}
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={saving}><Save size={16} />{saving ? "Salvando..." : "Salvar registro"}</button>
            {saved && <span className="field-hint">Persistido no banco de dados</span>}
          </div>
        </form>

        <aside className="panel preview-card">
          <div className="panel-heading">
            <div><h2><MessageSquareText size={16} /> Mensagem para Teams</h2><p>Prévia padronizada · revise antes de enviar</p></div>
          </div>
          <div className="message-actions">
            <div className="message-preview">{saved ? buildTeamsMessage(saved) : message}</div>
            <button type="button" className="button button-primary button-full" onClick={() => void copyMessage()}><Clipboard size={16} />{copied ? "Mensagem copiada" : "Copiar mensagem"}</button>
            <p className="message-note"><Send size={13} /> A mensagem é copiada para você colar no canal da equipe. O envio ao Teams não é automático.</p>
          </div>
        </aside>
      </div>
    </>
  );
}
