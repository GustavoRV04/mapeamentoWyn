export interface User {
  id: number;
  name: string;
  matricula: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type RequestType =
  | "Instalação"
  | "Substituição"
  | "Recolhimento"
  | "Preventiva"
  | "Manutenção"
  | "Transferência";

export interface NetworkRecord {
  id: number;
  request_type: RequestType;
  serial: string;
  model: string;
  mac_address: string;
  unit: string;
  retired_serial: string;
  retired_model: string;
  diagnostic: string;
  notes: string;
  created_at: string;
  technician_id: number;
  technician_name: string;
  photo_ids: number[];
}

export interface NetworkRecordPage {
  items: NetworkRecord[];
  total: number;
  type_counts: Partial<Record<RequestType, number>>;
}

export interface Asset {
  serial: string;
  model: string;
  mac_address: string;
  unit: string;
  status: "EM_USO" | "ESTOQUE" | "DEFEITUOSO" | "MANUTENCAO";
  updated_at: string;
}

export interface AssetPage {
  items: Asset[];
  total: number;
  status_counts: Partial<Record<Asset["status"], number>>;
  unit_counts: { unit: string; count: number }[];
}
