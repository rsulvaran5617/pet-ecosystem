"use client";

import type { ClinicalEntryType, ClinicalTimelineEncounter } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserClinicalAccessApiClient } from "../../core/services/supabase-browser";

const entryLabels: Record<ClinicalEntryType, string> = { diagnosis: "Diagnostico", vaccine: "Vacuna", recommendation: "Indicacion", treatment: "Tratamiento", finding: "Hallazgo" };
const encounterLabels = { consultation: "Consulta", vaccination: "Vacunacion", follow_up: "Seguimiento", emergency: "Urgencia", other: "Atencion" } as const;
const date = (value: string) => new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function ClinicalTimelinePanel({ petId }: { petId: string }) {
  const [items, setItems] = useState<ClinicalTimelineEncounter[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => { let active = true; setState("loading"); void getBrowserClinicalAccessApiClient().listPetClinicalTimeline(petId).then((rows) => { if (active) { setItems(rows); setState("ready"); } }).catch(() => { if (active) setState("error"); }); return () => { active = false; }; }, [petId]);
  async function openDocument(id: string) { try { window.open(await getBrowserClinicalAccessApiClient().getClinicalDocumentAccess(id), "_blank", "noopener,noreferrer"); } catch { setState("error"); } }
  return <article style={{ borderRadius: "8px", border: "1px solid rgba(15,118,110,.2)", background: "#fff", padding: "14px", display: "grid", gap: "10px" }}>
    <div><h3 style={{ margin: 0, fontSize: "15px" }}>Historial profesional</h3><p style={{ margin: "4px 0 0", color: "#57534e", fontSize: "10px" }}>Atenciones incorporadas con tu autorizacion.</p></div>
    {state === "loading" ? <p>Cargando historial...</p> : null}{state === "error" ? <p style={{ color: "#991b1b" }}>No pudimos consultar el historial profesional.</p> : null}{state === "ready" && !items.length ? <p style={{ color: "#57534e", fontSize: "10px" }}>Todavia no hay atenciones profesionales.</p> : null}
    {items.map((item) => <div key={item.id} style={{ border: "1px solid #dbe7e4", borderRadius: "8px", overflow: "hidden" }}><button onClick={() => setOpenId(openId === item.id ? null : item.id)} style={{ width: "100%", border: 0, padding: "12px", background: openId === item.id ? "#f0fdfa" : "#fff", textAlign: "left", cursor: "pointer" }} type="button"><strong>{encounterLabels[item.encounterType]} · {date(item.attendedAt)}</strong><span style={{ display: "block", marginTop: "4px", color: "#52615e" }}>{item.professionalName}{item.organizationName ? ` · ${item.organizationName}` : ""}</span><span style={{ display: "block", marginTop: "4px" }}>{item.summary}</span></button>{openId === item.id ? <div style={{ borderTop: "1px solid #dbe7e4", padding: "12px", display: "grid", gap: "10px" }}>{item.entries.map((entry) => <div key={entry.id}><strong>{entryLabels[entry.type]} · {entry.correctsEntryId ? "Rectificacion" : "Registro original"}</strong><p style={{ margin: "4px 0" }}>{entry.title}</p>{entry.details ? <p style={{ margin: 0, color: "#52615e" }}>{entry.details}</p> : null}{entry.correctionReason ? <small>Motivo: {entry.correctionReason}</small> : null}</div>)}<div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>{item.documents.map((document) => <button key={document.id} onClick={() => void openDocument(document.id)} type="button">Abrir {document.title}</button>)}</div><small>Autorizacion utilizada: {item.authorization.approvedScopes.length} permiso(s). Incorporada {date(item.finalizedAt)}.</small></div> : null}</div>)}
  </article>;
}
