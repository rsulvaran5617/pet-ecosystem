"use client";

import type { SharedPetClinicalDocuments } from "@pet/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserClinicalAccessApiClient, getBrowserSupabaseClient } from "../../core/services/supabase-browser";
import { ReadOnlyPdfViewer } from "./ReadOnlyPdfViewer";
import styles from "./PublicClinicalAccessPage.module.css";

export function SharedClinicalDocuments({ token }: { token: string }) {
  const [record, setRecord] = useState<SharedPetClinicalDocuments | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; title: string; mime: string; file: Blob } | null>(null);
  const [sessionVersion, setSessionVersion] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const urlRef = useRef<string | null>(null);
  const generation = useRef(0);
  const closePreview = useCallback(() => {
    generation.current += 1;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPreview(null);
    setBusy(null);
  }, []);

  useEffect(() => {
    const { data } = getBrowserSupabaseClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "SIGNED_IN" || event === "USER_UPDATED") {
        closePreview(); setRecord(null); setSessionVersion((value) => value + 1);
      }
    });
    return () => data.subscription.unsubscribe();
  }, [closePreview]);

  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const result = await getBrowserClinicalAccessApiClient().listSharedPetClinicalDocuments(token);
        if (active) { setRecord(result); setMessage(""); }
      } catch {
        if (active) {
          setRecord(null); closePreview();
          let guidance = "No pudimos comprobar el acceso. Revisa tu conexion y la vigencia del QR; consulta tu estado en Acceso profesional.";
          try {
            const identity = await getBrowserClinicalAccessApiClient().getMyClinicalProfessionalContext();
            const status = identity?.profile?.verificationStatus;
            guidance = status === "expired"
              ? "Tu verificacion profesional vencio. Solicita su renovacion en Acceso profesional; despues necesitaras una nueva aprobacion del responsable."
              : status === "pending" ? "Tu identidad profesional esta pendiente de revision por administracion. Despues podras solicitar la aprobacion del responsable."
              : status === "suspended" ? "Tu verificacion profesional esta suspendida. Contacta a administracion para revisar tu estado."
              : status === "verified" ? "Tu sesion esta iniciada. Comprueba la vigencia del QR y solicita una aprobacion vigente del responsable en Acceso profesional."
              : "Para abrir archivos, inicia sesion y completa la verificacion de tu identidad en Acceso profesional.";
          } catch { /* Keep the connection/QR guidance when identity cannot be checked. */ }
          if (active) setMessage(guidance);
        }
      } finally { pending = false; if (active) setLoading(false); }
    };
    setLoading(true);
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 8000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      active = false; window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      closePreview();
    };
  }, [token, sessionVersion, refreshVersion, closePreview]);

  useEffect(() => {
    if (!record) return;
    const expire = () => {
      closePreview(); setRecord(null); setMessage("El permiso temporal vencio. Solicita un nuevo acceso al responsable.");
    };
    const remaining = new Date(record.expiresAt).getTime() - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) { expire(); return; }
    const timer = window.setTimeout(expire, remaining);
    return () => window.clearTimeout(timer);
  }, [record, closePreview]);

  async function open(documentId: string, title: string) {
    closePreview();
    const attempt = generation.current;
    setBusy(documentId); setMessage("");
    try {
      const blob = await getBrowserClinicalAccessApiClient().downloadSharedPetClinicalDocument(token, documentId);
      if (attempt !== generation.current) return;
      const url = blob.type.startsWith("image/") ? URL.createObjectURL(blob) : "";
      urlRef.current = url || null;
      setPreview({ url, title, mime: blob.type, file: blob });
    } catch {
      if (attempt === generation.current) setMessage("No fue posible abrir el archivo. Vuelve a consultar la lista y comprueba que el permiso siga vigente.");
    } finally { if (attempt === generation.current) setBusy(null); }
  }

  return <section className={styles.section} aria-label="Archivos compartidos del expediente">
    <div className={styles.sectionTitle}><h2>Documentos del expediente</h2><button type="button" className={styles.secondaryButton} onClick={() => setRefreshVersion((value) => value + 1)}>Volver a consultar</button></div>
    <p className={styles.helper}>Solo lectura. Puedes consultar las fotos, cartillas y soportes de la familia durante tu autorizacion temporal; no puedes modificarlos.</p>
    {loading ? <p role="status">Comprobando acceso a los archivos...</p> : null}
    {message ? <div><p role="status" className={styles.panelMessage}>{message}</p><a className={styles.textLink} href="#professional-access">Ir al acceso profesional: sesion y permisos</a></div> : null}
    {record?.documents.length === 0 ? <p>No hay archivos cargados en el expediente.</p> : null}
    {record?.documents.map((document) => <article className={styles.item} key={document.id}>
      <strong>{document.title}</strong><p>{document.documentType.replaceAll("_", " ")}</p>
      <button type="button" className={styles.secondaryButton} disabled={busy !== null} onClick={() => { void open(document.id, document.title); }}>{busy === document.id ? "Abriendo..." : "Ver documento / foto"}</button>
    </article>)}
    {preview ? <div className={styles.documentPreview} role="region" aria-label={`Vista de ${preview.title}`}>
      <h3>{preview.title}</h3>
      <button type="button" className={styles.secondaryButton} onClick={closePreview}>Cerrar archivo</button>
      {preview.mime.startsWith("image/") ?
        // Private in-memory image: do not pass it through the Next image cache.
        <img src={preview.url} alt={preview.title} /> : preview.mime === "application/pdf" ?
        <ReadOnlyPdfViewer file={preview.file} title={preview.title} /> : <p>Este formato no tiene vista disponible. Solicita al responsable una imagen o un PDF legible.</p>}
    </div> : null}
  </section>;
}
