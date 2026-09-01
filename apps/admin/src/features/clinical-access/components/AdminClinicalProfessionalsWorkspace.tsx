"use client";

import type { AdminClinicalProfessionalSummary } from "@pet/types";
import { useEffect, useState } from "react";

import { getAdminClinicalAccessApiClient } from "../../core/services/supabase-admin";

const card = { borderRadius: "16px", border: "1px solid rgba(15,23,42,.1)", background: "#fff", padding: "18px", display: "grid", gap: "12px" } as const;
const input = { borderRadius: "8px", border: "1px solid rgba(15,23,42,.18)", padding: "10px 12px", fontSize: "13px" } as const;

function typeLabel(value: AdminClinicalProfessionalSummary["professionalType"]) {
  if (value === "veterinarian") return "Veterinario";
  if (value === "veterinary_technician") return "Tecnico veterinario";
  return "Otro profesional de salud animal";
}

export function AdminClinicalProfessionalsWorkspace() {
  const [profiles, setProfiles] = useState<AdminClinicalProfessionalSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;

  async function refresh() {
    setIsLoading(true);
    try {
      const rows = await getAdminClinicalAccessApiClient().listClinicalProfessionalsForAdmin();
      setProfiles(rows);
      setSelectedId((current) => rows.some((row) => row.id === current) ? current : rows[0]?.id ?? null);
    } catch {
      setMessage("No fue posible consultar la cola profesional.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  async function decide(decision: "verified" | "rejected" | "suspended") {
    if (!selected) return;
    if ((decision === "rejected" || decision === "suspended") && !reason.trim()) {
      setMessage("Indica una justificacion antes de continuar.");
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      await getAdminClinicalAccessApiClient().reviewClinicalProfessionalProfile(selected.id, decision, reason, expiresAt ? new Date(`${expiresAt}T23:59:59-05:00`).toISOString() : null);
      setReason("");
      setExpiresAt("");
      setMessage(decision === "verified" ? "Identidad verificada." : decision === "rejected" ? "Solicitud rechazada." : "Verificacion suspendida.");
      await refresh();
    } catch {
      setMessage("No fue posible registrar la decision.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: "16px" }}>
      <div style={card}><span style={{ color: "#0f766e", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>Salud animal</span><h2 style={{ margin: 0 }}>Verificacion profesional</h2><p style={{ margin: 0, color: "#52615e" }}>Revision de identidad de plataforma. No concede escritura clinica ni sustituye a la autoridad competente.</p></div>
      {message ? <div style={{ ...card, color: "#0f5f59" }}>{message}</div> : null}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,.75fr) minmax(0,1.25fr)", gap: "16px" }}>
        <div style={card}>
          <strong>{profiles.length} perfil(es)</strong>
          {isLoading ? <p>Cargando...</p> : profiles.length ? profiles.map((profile) => <button key={profile.id} onClick={() => { setSelectedId(profile.id); setReason(""); }} type="button" style={{ ...input, textAlign: "left", background: selectedId === profile.id ? "#ecfdf5" : "#fff", cursor: "pointer" }}><strong>{profile.professionalName}</strong><span style={{ display: "block", marginTop: "4px", color: "#52615e" }}>{profile.verificationStatus === "pending" ? "Pendiente" : "Verificada"} · {typeLabel(profile.professionalType)}</span></button>) : <p style={{ color: "#52615e" }}>No hay identidades esperando revision.</p>}
        </div>
        <div style={card}>
          {selected ? <>
            <div><span style={{ color: "#52615e", fontSize: "12px" }}>Identidad declarada</span><h3 style={{ margin: "5px 0" }}>{selected.professionalName}</h3><p style={{ margin: 0 }}>{typeLabel(selected.professionalType)}</p></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "10px" }}>
              <div style={input}><small>Referencia de licencia</small><strong style={{ display: "block", marginTop: "5px" }}>{selected.licenseReference}</strong></div>
              <div style={input}><small>Jurisdiccion</small><strong style={{ display: "block", marginTop: "5px" }}>{selected.jurisdiction}, {selected.countryCode}</strong></div>
              <div style={input}><small>Organizacion</small><strong style={{ display: "block", marginTop: "5px" }}>{selected.organizationName ?? "Sin vinculacion"}</strong></div>
            </div>
            <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>Vigencia opcional de la verificacion<input onChange={(event) => setExpiresAt(event.target.value)} style={input} type="date" value={expiresAt} /></label>
            <label style={{ display: "grid", gap: "6px", fontSize: "13px" }}>Justificacion para rechazo o suspension<textarea onChange={(event) => setReason(event.target.value)} rows={4} style={input} value={reason} /></label>
            <div style={{ display: "flex", gap: "9px", flexWrap: "wrap" }}>
              {selected.verificationStatus === "pending" ? <><button disabled={isSubmitting} onClick={() => void decide("verified")} type="button">Verificar identidad</button><button disabled={isSubmitting} onClick={() => void decide("rejected")} type="button">Rechazar</button></> : <button disabled={isSubmitting} onClick={() => void decide("suspended")} type="button">Suspender verificacion</button>}
            </div>
          </> : <p style={{ color: "#52615e" }}>Selecciona un perfil para revisar sus datos declarados.</p>}
        </div>
      </div>
    </section>
  );
}
