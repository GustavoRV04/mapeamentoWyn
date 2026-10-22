import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function NetworkPhoto({ recordId, photoId }: { recordId: number; photoId: number }) {
  const [source, setSource] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    api.get<Blob>(`/records/${recordId}/photos/${photoId}`, { responseType: "blob" })
      .then(({ data }) => {
        objectUrl = URL.createObjectURL(data);
        if (active) setSource(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId, recordId]);

  if (failed) return <span className="photo-unavailable">Foto indisponível</span>;
  if (!source) return <span className="photo-loading">Carregando foto...</span>;
  return <img src={source} alt="Foto de evidência do atendimento" loading="lazy" />;
}
