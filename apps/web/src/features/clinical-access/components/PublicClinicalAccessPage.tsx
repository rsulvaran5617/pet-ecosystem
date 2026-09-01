"use client";

import type { PublicPetClinicalAccess } from "@pet/types";
import { useEffect, useState } from "react";

import { getBrowserClinicalAccessApiClient } from "../../core/services/supabase-browser";
import styles from "./PublicClinicalAccessPage.module.css";

function formatDate(value: string | null) {
  if (!value) return "No indicada";
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeZone: "America/Panama" }).format(new Date(`${value.slice(0, 10)}T12:00:00-05:00`));
}

function formatExpiration(value: string) {
  return new Intl.DateTimeFormat("es-PA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Panama" }).format(new Date(value));
}

function Empty({ children }: { children: string }) {
  return <p className={styles.empty}>{children}</p>;
}

export function PublicClinicalAccessPage({ token }: { token: string }) {
  const [record, setRecord] = useState<PublicPetClinicalAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    void getBrowserClinicalAccessApiClient().getPublicPetClinicalAccess(token)
      .then((result) => { if (active) setRecord(result); })
      .catch(() => { if (active) setHasError(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [token]);

  if (isLoading) return <main className={styles.shell}><section className={styles.state}><p>Cargando expediente autorizado...</p></section></main>;
  if (hasError || !record) return <main className={styles.shell}><section className={styles.state}><span className={styles.eyebrow}>Acceso cerrado</span><h1>Este enlace no esta disponible</h1><p>Puede haber vencido o haber sido revocado por la familia. Solicita un nuevo codigo QR al responsable de la mascota.</p></section></main>;

  const criticalConditions = record.conditions.filter((condition) => condition.isCritical && condition.status === "active");
  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Pet Ecosystem · Consulta temporal</span><h1>Expediente de {record.pet.name}</h1><p>{record.pet.species}{record.pet.breed ? ` · ${record.pet.breed}` : ""}</p></div>
        <div className={styles.access}><strong>Solo lectura</strong><span>Vence {formatExpiration(record.grant.expiresAt)}</span></div>
      </header>

      <section className={styles.identity} aria-label="Identificacion de la mascota">
        <div><span>Sexo</span><strong>{record.pet.sex || "No indicado"}</strong></div>
        <div><span>Fecha de nacimiento</span><strong>{formatDate(record.pet.birthDate)}</strong></div>
      </section>

      {criticalConditions.length ? <section className={styles.alert}><span>Atencion clinica</span><h2>Condiciones criticas activas</h2>{criticalConditions.map((condition) => <article key={`${condition.name}-${condition.diagnosedOn ?? "active"}`}><strong>{condition.name}</strong>{condition.notes ? <p>{condition.notes}</p> : null}</article>)}</section> : null}

      <div className={styles.grid}>
        <section className={styles.section}><div className={styles.sectionTitle}><h2>Alergias</h2><span>{record.allergies.length}</span></div>{record.allergies.length ? record.allergies.map((allergy) => <article className={styles.item} key={allergy.allergen}><strong>{allergy.allergen}</strong>{allergy.reaction ? <p>Reaccion: {allergy.reaction}</p> : null}{allergy.notes ? <p>{allergy.notes}</p> : null}</article>) : <Empty>Sin alergias registradas.</Empty>}</section>
        <section className={styles.section}><div className={styles.sectionTitle}><h2>Vacunas</h2><span>{record.vaccines.length}</span></div>{record.vaccines.length ? record.vaccines.map((vaccine) => <article className={styles.item} key={`${vaccine.name}-${vaccine.administeredOn}`}><strong>{vaccine.name}</strong><p>Aplicada: {formatDate(vaccine.administeredOn)}</p><p>Proxima dosis: {formatDate(vaccine.nextDueOn)}</p>{vaccine.notes ? <p>{vaccine.notes}</p> : null}</article>) : <Empty>Sin vacunas registradas.</Empty>}</section>
        <section className={styles.section}><div className={styles.sectionTitle}><h2>Condiciones</h2><span>{record.conditions.length}</span></div>{record.conditions.length ? record.conditions.map((condition) => <article className={styles.item} key={`${condition.name}-${condition.diagnosedOn ?? "current"}`}><strong>{condition.name}</strong><p>Estado: {condition.status === "active" ? "Activa" : condition.status === "resolved" ? "Resuelta" : "En seguimiento"}</p><p>Diagnostico: {formatDate(condition.diagnosedOn)}</p>{condition.notes ? <p>{condition.notes}</p> : null}</article>) : <Empty>Sin condiciones registradas.</Empty>}</section>
        <section className={styles.section}><div className={styles.sectionTitle}><h2>Documentos registrados</h2><span>{record.documents.length}</span></div><p className={styles.helper}>Por privacidad, este acceso muestra referencias y vigencias, no archivos.</p>{record.documents.length ? record.documents.map((document) => <article className={styles.item} key={`${document.title}-${document.issuedAt ?? "document"}`}><strong>{document.title}</strong><p>Tipo: {document.documentType.replaceAll("_", " ")}</p><p>Vigencia: {formatDate(document.expiresAt)}</p></article>) : <Empty>Sin documentos registrados.</Empty>}</section>
      </div>
      <footer className={styles.footer}>La familia autorizo esta consulta por tiempo limitado. Esta vista no permite modificar el expediente ni acredita identidad profesional.</footer>
    </main>
  );
}
