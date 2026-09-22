export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export const STATUS_LABELS: Readonly<Record<string, string>> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  in_review: "En revisión",
  completed: "Completada",
  verified: "Verificada",
  approved: "Aprobada",
  rejected: "Rechazada",
  draft: "Borrador",
  submitted: "Enviada",
  under_review: "En revisión",
  planned: "Planificada",
  published: "Publicada",
  superseded: "Sustituida",
  cancelled: "Cancelada",
  expired: "Vencida",
  triaged: "Clasificada",
  remediation_in_progress: "En remediación",
  pending_verification: "Pendiente de verificación",
  verified_closed: "Cierre verificado",
  reopened: "Reabierta",
  not_assessed: "No evaluada",
  assessed: "Evaluada",
  reviewed: "Revisada",
  active: "Activo",
  archived: "Archivado",
  open: "Abierta",
  fulfilled: "Atendida",
  dismissed: "Descartada"
};

const TONES: Readonly<Record<string, StatusTone>> = {
  approved: "success",
  published: "success",
  verified: "success",
  verified_closed: "success",
  fulfilled: "success",
  active: "success",
  completed: "success",
  rejected: "danger",
  cancelled: "danger",
  expired: "danger",
  dismissed: "danger",
  submitted: "info",
  under_review: "info",
  in_review: "info",
  in_progress: "info",
  remediation_in_progress: "info",
  triaged: "warning",
  pending_verification: "warning",
  reopened: "warning"
};

export function statusLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "Sin estado";
  return STATUS_LABELS[value] ?? "Estado no disponible";
}

export function statusTone(value: unknown): StatusTone {
  return typeof value === "string" ? TONES[value] ?? "neutral" : "neutral";
}
