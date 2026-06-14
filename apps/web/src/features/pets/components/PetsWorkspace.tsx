"use client";

import { petDocumentTypeLabels, petDocumentTypeOrder, petSexLabels } from "@pet/config";
import type { PetDocumentType, PetHealthDashboard, PetSex, UpdatePetInput } from "@pet/types";
import { getPetDocumentValidityStatus } from "@pet/types";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { getBrowserPetsApiClient } from "../../core/services/supabase-browser";
import { usePetHealthSummary } from "../../health/hooks/usePetHealthSummary";
import { usePetsWorkspace } from "../hooks/usePetsWorkspace";

const fieldLabelStyle: CSSProperties = {
  fontSize: "8px",
  textTransform: "uppercase",
  color: "#78716c",
  letterSpacing: "0.04em"
};

const controlStyle: CSSProperties = {
  borderRadius: "10px",
  border: "1px solid rgba(28, 25, 23, 0.14)",
  padding: "7px 9px",
  fontSize: "9px",
  background: "#fffdf8"
};

const compactCardStyle: CSSProperties = {
  borderRadius: "14px",
  padding: "12px",
  background: "rgba(247, 242, 231, 0.72)",
  display: "grid",
  gap: "8px"
};

const emptyPetForm: UpdatePetInput = {
  name: "",
  species: "",
  breed: "",
  sex: "unknown",
  birthDate: "",
  isSterilized: null,
  notes: ""
};

type SterilizedFormValue = "unknown" | "yes" | "no";

function toSterilizedFormValue(value: boolean | null | undefined): SterilizedFormValue {
  if (value === true) {
    return "yes";
  }

  if (value === false) {
    return "no";
  }

  return "unknown";
}

function fromSterilizedFormValue(value: SterilizedFormValue) {
  if (value === "yes") {
    return true;
  }

  if (value === "no") {
    return false;
  }

  return null;
}

function formatSterilizedLabel(value: boolean | null) {
  if (value === true) {
    return "Esterilizada";
  }

  if (value === false) {
    return "No esterilizada";
  }

  return "No registrada";
}

function formatShortDate(date: string | null) {
  if (!date) {
    return "No registrada";
  }

  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, "0");
  const day = `${today.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDaysUntilDate(date: string) {
  const today = new Date(`${getTodayDateKey()}T00:00:00`);
  const targetDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }

  return Math.ceil((targetDate.getTime() - today.getTime()) / 86_400_000);
}

function getVaccineSummaryStatus(summary: PetHealthDashboard | null | undefined) {
  if (!summary || summary.vaccineCount === 0) {
    return {
      detail: "Sin vacunas registradas.",
      value: "Sin registro"
    };
  }

  if (!summary.nextVaccineDueDate) {
    return {
      detail: summary.latestVaccineDate
        ? `Ultima vacuna: ${formatShortDate(summary.latestVaccineDate)}. Falta proxima dosis.`
        : "Falta proxima dosis.",
      value: "Revisar"
    };
  }

  const daysUntilDue = getDaysUntilDate(summary.nextVaccineDueDate);

  if (daysUntilDue === null) {
    return {
      detail: `Proxima fecha: ${summary.nextVaccineDueDate}.`,
      value: "Revisar"
    };
  }

  if (daysUntilDue < 0) {
    return {
      detail: `Vencio: ${formatShortDate(summary.nextVaccineDueDate)}.`,
      value: "Vencida"
    };
  }

  if (daysUntilDue <= 30) {
    return {
      detail: `Proxima: ${formatShortDate(summary.nextVaccineDueDate)}.`,
      value: "Por vencer"
    };
  }

  return {
    detail: `Proxima: ${formatShortDate(summary.nextVaccineDueDate)}.`,
    value: "Al dia"
  };
}

function getDocumentValidityBadge(document: { expirationWarningDays: number; expiresAt: string | null; hasExpiration: boolean }) {
  const validity = getPetDocumentValidityStatus(document);

  if (validity.status === "no_expiration") {
    return { label: "Sin vencimiento", tone: "neutral" as const };
  }

  if (validity.status === "missing_expiration_date") {
    return { label: "Fecha pendiente", tone: "pending" as const };
  }

  if (validity.status === "expired") {
    return { label: document.expiresAt ? `Vencido ${formatShortDate(document.expiresAt)}` : "Vencido", tone: "pending" as const };
  }

  if (validity.status === "expiring_soon") {
    return { label: validity.daysUntilExpiration === 0 ? "Vence hoy" : `Vence en ${validity.daysUntilExpiration} dias`, tone: "pending" as const };
  }

  return { label: document.expiresAt ? `Vigente hasta ${formatShortDate(document.expiresAt)}` : "Vigente", tone: "active" as const };
}

function getDocumentAttentionText(document: { expirationWarningDays: number; expiresAt: string | null; hasExpiration: boolean; title: string }) {
  const validity = getPetDocumentValidityStatus(document);

  if (validity.status === "expired") {
    return `${document.title} vencio el ${formatShortDate(document.expiresAt)}.`;
  }

  if (validity.status === "expiring_soon") {
    return validity.daysUntilExpiration === 0
      ? `${document.title} vence hoy.`
      : `${document.title} vence en ${validity.daysUntilExpiration} dias.`;
  }

  if (validity.status === "missing_expiration_date") {
    return `${document.title} tiene vencimiento sin fecha registrada.`;
  }

  return null;
}

type DocumentFormState = {
  expirationWarningDays: number;
  expiresAt: string;
  hasExpiration: boolean;
  issuedAt: string;
  title: string;
  documentType: PetDocumentType;
  file: File | null;
};

const emptyDocumentForm: DocumentFormState = {
  expirationWarningDays: 30,
  expiresAt: "",
  hasExpiration: false,
  issuedAt: "",
  title: "",
  documentType: "other",
  file: null
};

function Button({
  children,
  disabled,
  onClick,
  tone = "primary",
  type = "button"
}: {
  children: string;
  disabled?: boolean;
  onClick?: () => void;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      type={type}
      style={{
        borderRadius: "999px",
        border: tone === "primary" ? "none" : "1px solid rgba(28, 25, 23, 0.14)",
        background: tone === "primary" ? "#0f766e" : "rgba(255,255,255,0.82)",
        color: tone === "primary" ? "#f8fafc" : "#1c1917",
        padding: "6px 10px",
        fontSize: "9px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
    </button>
  );
}

function IconButton({
  ariaLabel,
  disabled,
  onClick
}: {
  ariaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      style={{
        alignItems: "center",
        background: "rgba(15, 118, 110, 0.12)",
        border: "1px solid rgba(15, 118, 110, 0.18)",
        borderRadius: "999px",
        color: "#0f766e",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        height: "28px",
        justifyContent: "center",
        opacity: disabled ? 0.58 : 1,
        width: "28px"
      }}
      title={ariaLabel}
      type="button"
    >
      <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
        <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="m14 7 3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    </button>
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "text";
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "5px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <input onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={controlStyle} type={type} value={value} />
    </label>
  );
}

function SelectField<TValue extends string>({
  label,
  onChange,
  options,
  value
}: {
  label: string;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  value: TValue;
}) {
  return (
    <label style={{ display: "grid", gap: "5px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <select onChange={(event) => onChange(event.target.value as TValue)} style={controlStyle} value={value}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: "5px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        style={{ ...controlStyle, resize: "vertical" }}
        value={value}
      />
    </label>
  );
}

function Notice({ message, tone }: { message: string; tone: "error" | "info" }) {
  const palette =
    tone === "error"
      ? { background: "rgba(127,29,29,0.08)", border: "rgba(127,29,29,0.18)", color: "#991b1b" }
      : { background: "rgba(15,118,110,0.1)", border: "rgba(15,118,110,0.2)", color: "#0f766e" };

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${palette.border}`,
        background: palette.background,
        color: palette.color,
        padding: "14px 16px",
        fontWeight: 600
      }}
    >
      {message}
    </div>
  );
}

function formatFileSize(fileSizeBytes: number | null) {
  if (!fileSizeBytes) {
    return "Tamano desconocido";
  }

  if (fileSizeBytes < 1024) {
    return `${fileSizeBytes} B`;
  }

  if (fileSizeBytes < 1024 * 1024) {
    return `${(fileSizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PetsWorkspace({ enabled }: { enabled: boolean }) {
  const {
    householdSnapshot,
    pets,
    selectedHouseholdId,
    selectedPetId,
    selectedPetDetail,
    errorMessage,
    infoMessage,
    isLoading,
    isSubmitting,
    clearMessages,
    selectHousehold,
    selectPet,
    refresh,
    runAction
  } = usePetsWorkspace(enabled);
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [isPetEditorOpen, setIsPetEditorOpen] = useState(false);
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);

  const selectedHousehold = householdSnapshot?.households.find((household) => household.id === selectedHouseholdId) ?? null;
  const canEditSelectedHousehold =
    selectedHousehold?.myPermissions.includes("edit") || selectedHousehold?.myPermissions.includes("admin") || false;
  const documentGroups = useMemo(
    () =>
      petDocumentTypeOrder
        .map((documentType) => ({
          documentType,
          documents: selectedPetDetail?.documents.filter((document) => document.documentType === documentType) ?? []
        }))
        .filter((group) => group.documents.length > 0),
    [selectedPetDetail]
  );
  const documentAttentionItems = (selectedPetDetail?.documents ?? [])
    .map((document) => ({
      document,
      text: getDocumentAttentionText(document),
      validity: getPetDocumentValidityStatus(document)
    }))
    .filter((item) => item.text)
    .sort((left, right) => {
      const priority = {
        expired: 0,
        expiring_soon: 1,
        missing_expiration_date: 2,
        no_expiration: 3,
        valid: 4
      } as const;

      return priority[left.validity.status] - priority[right.validity.status];
    });
  const { summary: selectedPetHealthSummary, isLoading: isHealthSummaryLoading } = usePetHealthSummary(
    selectedPetDetail?.pet.id ?? null,
    enabled
  );
  const selectedVaccineSummaryStatus = getVaccineSummaryStatus(selectedPetHealthSummary);

  const closeDocumentForm = () => {
    setDocumentForm(emptyDocumentForm);
    setEditingDocumentId(null);
  };

  const openDocumentValidityEditor = (document: NonNullable<typeof selectedPetDetail>["documents"][number]) => {
    setEditingDocumentId(document.id);
    setDocumentForm({
      documentType: document.documentType,
      expirationWarningDays: document.expirationWarningDays,
      expiresAt: document.expiresAt ?? "",
      file: null,
      hasExpiration: document.hasExpiration,
      issuedAt: document.issuedAt ?? "",
      title: document.title
    });
  };

  const loadPetForm = (pet: typeof pets[number]) => {
    setEditingPetId(pet.id);
    setIsPetEditorOpen(true);
    setPetForm({
      name: pet.name,
      species: pet.species,
      breed: pet.breed ?? "",
      sex: pet.sex,
      birthDate: pet.birthDate ?? "",
      isSterilized: pet.isSterilized,
      notes: pet.notes ?? ""
    });
  };

  const resetPetForm = () => {
    setEditingPetId(null);
    setIsPetEditorOpen(false);
    setPetForm(emptyPetForm);
  };

  const openCreatePetForm = () => {
    setEditingPetId(null);
    setPetForm(emptyPetForm);
    setIsPetEditorOpen(true);
  };

  if (!enabled) {
    return null;
  }

  return (
    <div style={{ display: "grid", gap: "24px" }}>
      {errorMessage ? <Notice message={errorMessage} tone="error" /> : null}
      {!errorMessage && infoMessage ? <Notice message={infoMessage} tone="info" /> : null}

      <CoreSection
        eyebrow="EP-03 / Mascotas"
        title="Mascotas del hogar y documentos basicos"
        description="Las mascotas heredan el acceso del hogar. Este alcance cubre listado, creacion, edicion, ficha resumida y carga basica de documentos."
        density="compact"
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando hogares, mascotas y documentos desde Supabase...</p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            <article style={compactCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "13px" }}>Hogares</h3>
                {selectedHousehold ? (
                  <StatusPill label={canEditSelectedHousehold ? "editable" : "solo lectura"} tone={canEditSelectedHousehold ? "active" : "neutral"} />
                ) : null}
              </div>
              {householdSnapshot?.households.length ? (
                <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
                  {householdSnapshot.households.map((household) => {
                    const isActive = household.id === selectedHouseholdId;

                    return (
                      <button
                        key={household.id}
                        onClick={() => void selectHousehold(household.id)}
                        style={{
                          minWidth: "180px",
                          borderRadius: "14px",
                          border: isActive ? "1px solid rgba(15, 118, 110, 0.32)" : "1px solid rgba(28, 25, 23, 0.08)",
                          padding: "10px 12px",
                          textAlign: "left",
                          background: isActive ? "rgba(15, 118, 110, 0.1)" : "rgba(255,255,255,0.72)",
                          display: "grid",
                          gap: "5px",
                          cursor: "pointer"
                        }}
                        type="button"
                      >
                        <strong style={{ fontSize: "9px" }}>{household.name}</strong>
                        <span style={{ color: "#57534e", fontSize: "8px" }}>{household.memberCount} integrante(s)</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>Primero crea un hogar para empezar a registrar mascotas.</p>
              )}
            </article>

            <article style={compactCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "13px" }}>Mascotas</h3>
                  <p style={{ margin: "2px 0 0", color: "#57534e", fontSize: "9px" }}>
                    Selecciona una mascota para revisar su ficha. Usa el lapiz para editar sus datos maestros.
                  </p>
                </div>
                <div style={{ alignItems: "center", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {selectedHousehold ? <StatusPill label={`${pets.length} mascota(s)`} tone="neutral" /> : null}
                  {selectedHouseholdId && canEditSelectedHousehold ? (
                    <Button disabled={isSubmitting} onClick={openCreatePetForm} tone="secondary">
                      + Mascota
                    </Button>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "6px", scrollSnapType: "x proximity" }}>
                {selectedHousehold ? (
                  pets.length ? (
                    pets.map((pet) => {
                      const isSelected = pet.id === selectedPetId;

                      return (
                      <article
                        key={pet.id}
                        style={{
                          minWidth: "170px",
                          scrollSnapAlign: "start",
                          borderRadius: "14px",
                          padding: "10px",
                          background: isSelected ? "rgba(15, 118, 110, 0.08)" : "rgba(255,255,255,0.72)",
                          border: isSelected ? "1px solid rgba(15, 118, 110, 0.28)" : "1px solid rgba(28, 25, 23, 0.08)",
                          display: "grid",
                          gap: "8px",
                          textAlign: "left"
                        }}
                      >
                        <button
                          onClick={() => void selectPet(pet.id)}
                          style={{
                            alignItems: "center",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            display: "grid",
                            gap: "8px",
                            gridTemplateColumns: "32px 1fr",
                            padding: 0,
                            textAlign: "left",
                            width: "100%"
                          }}
                          type="button"
                        >
                          <span
                            style={{
                              width: "32px",
                              height: "32px",
                              borderRadius: "12px",
                              background: isSelected ? "#0f766e" : "rgba(15,118,110,0.12)",
                              color: isSelected ? "#ffffff" : "#0f766e",
                              display: "grid",
                              placeItems: "center",
                              fontSize: "11px",
                              fontWeight: 800
                            }}
                          >
                            {pet.name.slice(0, 2).toUpperCase()}
                          </span>
                          <span style={{ display: "grid", gap: "4px", minWidth: 0 }}>
                            <strong style={{ fontSize: "10px" }}>{pet.name}</strong>
                            <span style={{ color: "#57534e", fontSize: "8px" }}>
                              {pet.species}
                              {pet.breed ? ` - ${pet.breed}` : ""}
                            </span>
                            <span style={{ color: "#0f766e", fontSize: "8px", fontWeight: 800 }}>
                              {pet.documentCount} documento(s)
                            </span>
                          </span>
                        </button>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <IconButton
                            ariaLabel={`Editar datos maestros de ${pet.name}`}
                            disabled={!canEditSelectedHousehold || isSubmitting}
                            onClick={() => {
                              void selectPet(pet.id);
                              loadPetForm(pet);
                            }}
                          />
                        </div>
                      </article>
                      );
                    })
                  ) : (
                    <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay mascotas en este hogar.</p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona un hogar para listar sus mascotas.</p>
                )}
              </div>
            </article>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isPetEditorOpen ? "minmax(300px, 0.85fr) minmax(360px, 1.15fr)" : "minmax(0, 1fr)",
                gap: "12px",
                alignItems: "start"
              }}
            >
              {isPetEditorOpen ? (
              <article style={compactCardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "12px" }}>{editingPetId ? "Editar datos maestros" : "Crear mascota"}</h3>
                    <p style={{ margin: "2px 0 0", color: "#57534e", fontSize: "8px" }}>
                      {editingPetId ? "Actualiza la ficha de la mascota seleccionada." : "Agrega una mascota al hogar activo."}
                    </p>
                  </div>
                  <Button disabled={isSubmitting} onClick={resetPetForm} tone="secondary">
                    Cerrar
                  </Button>
                </div>
                {selectedHouseholdId ? (
                  canEditSelectedHousehold ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        clearMessages();

                        const payload = {
                          name: petForm.name.trim(),
                          species: petForm.species.trim(),
                          breed: petForm.breed?.trim() || null,
                          sex: petForm.sex ?? "unknown",
                          birthDate: petForm.birthDate || null,
                          isSterilized: petForm.isSterilized ?? null,
                          notes: petForm.notes?.trim() || null
                        } satisfies UpdatePetInput;

                        if (editingPetId) {
                          void runAction(
                            () => getBrowserPetsApiClient().updatePet(editingPetId, payload),
                            "Mascota actualizada.",
                            false
                          ).then(async (pet) => {
                            resetPetForm();
                            await refresh();
                            await selectPet(pet.id);
                          });
                          return;
                        }

                        void runAction(
                          () =>
                            getBrowserPetsApiClient().createPet({
                              householdId: selectedHouseholdId,
                              ...payload
                            }),
                          "Mascota creada.",
                          false
                        ).then(async (pet) => {
                          resetPetForm();
                          await refresh();
                          await selectPet(pet.id);
                        });
                      }}
                      style={{ display: "grid", gap: "7px" }}
                    >
                      <Field label="Nombre de la mascota" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, name: value }))} value={petForm.name ?? ""} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <Field
                          label="Especie"
                          onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, species: value }))}
                          placeholder="Dog"
                          value={petForm.species ?? ""}
                        />
                        <Field label="Breed" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, breed: value }))} value={petForm.breed ?? ""} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                        <SelectField<PetSex>
                          label="Sex"
                          onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, sex: value }))}
                          options={[
                            { label: petSexLabels.unknown, value: "unknown" },
                            { label: petSexLabels.female, value: "female" },
                            { label: petSexLabels.male, value: "male" }
                          ]}
                          value={petForm.sex ?? "unknown"}
                        />
                        <Field
                          label="Fecha de nacimiento"
                          onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, birthDate: value }))}
                          type="date"
                          value={petForm.birthDate ?? ""}
                        />
                      </div>
                      <SelectField<SterilizedFormValue>
                        label="Esterilizacion"
                        onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, isSterilized: fromSterilizedFormValue(value) }))}
                        options={[
                          { label: "Sin indicar", value: "unknown" },
                          { label: "Esterilizada", value: "yes" },
                          { label: "No esterilizada", value: "no" }
                        ]}
                        value={toSterilizedFormValue(petForm.isSterilized)}
                      />
                      <TextArea label="Notas" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, notes: value }))} value={petForm.notes ?? ""} />
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Button disabled={isSubmitting} type="submit">
                          {editingPetId ? "Guardar" : "Crear mascota"}
                        </Button>
                        {editingPetId ? (
                          <Button disabled={isSubmitting} onClick={resetPetForm} tone="secondary">
                            Cancelar
                          </Button>
                        ) : null}
                      </div>
                    </form>
                  ) : (
                    <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>
                      Puedes revisar las mascotas de este hogar, pero solo integrantes con `edit` o `admin` pueden modificarlas.
                    </p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>Selecciona un hogar para crear o editar mascotas.</p>
                )}
              </article>
              ) : null}

              {selectedPetDetail ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
                  <article style={compactCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "12px" }}>{selectedPetDetail.pet.name}</h3>
                      <StatusPill label={selectedPetDetail.pet.species} tone="active" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "6px" }}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Breed</span>
                        <strong style={{ fontSize: "9px" }}>{selectedPetDetail.pet.breed ?? "No registrada"}</strong>
                      </div>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Sex</span>
                        <strong style={{ fontSize: "9px" }}>{petSexLabels[selectedPetDetail.pet.sex]}</strong>
                      </div>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Fecha de nacimiento</span>
                        <strong style={{ fontSize: "9px" }}>{selectedPetDetail.pet.birthDate ?? "No registrada"}</strong>
                      </div>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Esterilizacion</span>
                        <strong style={{ fontSize: "9px" }}>{formatSterilizedLabel(selectedPetDetail.pet.isSterilized)}</strong>
                      </div>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Documentos</span>
                        <strong style={{ fontSize: "9px" }}>{selectedPetDetail.documents.length} total</strong>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <span style={fieldLabelStyle}>Notas</span>
                      <p style={{ margin: 0, color: "#57534e", lineHeight: 1.35, fontSize: "9px" }}>
                        {selectedPetDetail.pet.notes ?? "Todavia no hay notas para esta mascota."}
                      </p>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      <span style={fieldLabelStyle}>Resumen de salud</span>
                      {isHealthSummaryLoading ? (
                        <p style={{ margin: 0, color: "#57534e", fontSize: "9px" }}>Cargando resumen de salud...</p>
                      ) : selectedPetHealthSummary ? (
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                            <strong style={{ fontSize: "9px" }}>Vacunas: {selectedVaccineSummaryStatus.value}</strong>
                            <strong style={{ fontSize: "9px" }}>{selectedPetHealthSummary.allergyCount} alergia(s)</strong>
                            <strong style={{ fontSize: "9px" }}>{selectedPetHealthSummary.conditionCount} condicion(es)</strong>
                            <strong style={{ fontSize: "9px" }}>{selectedPetHealthSummary.criticalConditionCount} criticas</strong>
                          </div>
                          <p style={{ margin: 0, color: "#57534e", lineHeight: 1.35, fontSize: "9px" }}>
                            {selectedVaccineSummaryStatus.detail}
                          </p>
                          <p style={{ margin: 0, color: "#57534e", lineHeight: 1.35, fontSize: "9px" }}>
                            Alertas: {selectedPetHealthSummary.criticalConditionNames.join(", ") || "Sin condiciones criticas"}.
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "#57534e", fontSize: "9px" }}>Todavia no hay un resumen de salud.</p>
                      )}
                    </div>
                  </article>

                  <article style={compactCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                      <h3 style={{ margin: 0, fontSize: "12px" }}>Documentos</h3>
                      <StatusPill label={`${selectedPetDetail.documents.length} total`} tone="neutral" />
                    </div>
                    {canEditSelectedHousehold ? (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault();
                          clearMessages();
                          void runAction(
                            async () => {
                              const selectedFile = documentForm.file;

                              if (!documentForm.title.trim()) {
                                throw new Error("Indica un titulo para el documento.");
                              }

                              if (documentForm.hasExpiration && !documentForm.expiresAt) {
                                throw new Error("Indica la fecha de vencimiento del documento.");
                              }

                              if (documentForm.issuedAt && documentForm.expiresAt && documentForm.expiresAt < documentForm.issuedAt) {
                                throw new Error("La fecha de vencimiento no puede ser anterior a la fecha de emision.");
                              }

                              if (editingDocumentId) {
                                return getBrowserPetsApiClient().updatePetDocument(editingDocumentId, {
                                  documentType: documentForm.documentType,
                                  expirationWarningDays: documentForm.expirationWarningDays,
                                  expiresAt: documentForm.hasExpiration ? documentForm.expiresAt : null,
                                  hasExpiration: documentForm.hasExpiration,
                                  issuedAt: documentForm.issuedAt || null,
                                  title: documentForm.title.trim()
                                });
                              }

                              if (!selectedFile) {
                                throw new Error("Elige un archivo antes de cargarlo.");
                              }

                              const fileBytes = await selectedFile.arrayBuffer();

                              return getBrowserPetsApiClient().uploadPetDocument(selectedPetDetail.pet.id, {
                                title: documentForm.title.trim() || selectedFile.name,
                                documentType: documentForm.documentType,
                                expirationWarningDays: documentForm.expirationWarningDays,
                                expiresAt: documentForm.hasExpiration ? documentForm.expiresAt : null,
                                fileName: selectedFile.name,
                                hasExpiration: documentForm.hasExpiration,
                                issuedAt: documentForm.issuedAt || null,
                                mimeType: selectedFile.type || null,
                                fileBytes
                              });
                            },
                            editingDocumentId ? "Vigencia actualizada." : "Documento cargado.",
                            false
                          ).then(async () => {
                            closeDocumentForm();
                            await refresh();
                            await selectPet(selectedPetDetail.pet.id);
                          });
                        }}
                        style={{ display: "grid", gap: "8px" }}
                      >
                        <Field
                          label="Titulo del documento"
                          onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, title: value }))}
                          value={documentForm.title}
                        />
                        <SelectField<PetDocumentType>
                          label="Tipo de documento"
                          onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, documentType: value }))}
                          options={petDocumentTypeOrder.map((documentType) => ({
                            label: petDocumentTypeLabels[documentType],
                            value: documentType
                          }))}
                          value={documentForm.documentType}
                        />
                        <div style={{ borderRadius: "14px", background: "#fffdf8", border: "1px solid rgba(28,25,23,0.08)", padding: "10px", display: "grid", gap: "8px" }}>
                          <strong style={{ fontSize: "10px" }}>Vigencia del documento</strong>
                          <SelectField<"no" | "yes">
                            label="Tiene vencimiento"
                            onChange={(value) =>
                              setDocumentForm((currentForm) => ({
                                ...currentForm,
                                expiresAt: value === "yes" ? currentForm.expiresAt : "",
                                hasExpiration: value === "yes"
                              }))
                            }
                            options={[
                              { label: "Sin vencimiento", value: "no" },
                              { label: "Tiene vencimiento", value: "yes" }
                            ]}
                            value={documentForm.hasExpiration ? "yes" : "no"}
                          />
                          <Field
                            label="Fecha de emision"
                            onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, issuedAt: value }))}
                            type="date"
                            value={documentForm.issuedAt}
                          />
                          {documentForm.hasExpiration ? (
                            <>
                              <Field
                                label="Fecha de vencimiento"
                                onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, expiresAt: value }))}
                                type="date"
                                value={documentForm.expiresAt}
                              />
                              <SelectField<string>
                                label="Avisarme antes de vencer"
                                onChange={(value) => setDocumentForm((currentForm) => ({ ...currentForm, expirationWarningDays: Number(value) }))}
                                options={[7, 15, 30, 60, 90].map((days) => ({ label: `${days} dias`, value: `${days}` }))}
                                value={`${documentForm.expirationWarningDays}`}
                              />
                            </>
                          ) : null}
                        </div>
                        {!editingDocumentId ? (
                          <label style={{ display: "grid", gap: "5px" }}>
                            <span style={fieldLabelStyle}>Archivo</span>
                            <input
                              onChange={(event) =>
                                setDocumentForm((currentForm) => ({
                                  ...currentForm,
                                  file: event.target.files?.[0] ?? null
                                }))
                              }
                              style={{ ...controlStyle, padding: "8px 10px" }}
                              type="file"
                            />
                          </label>
                        ) : null}
                        <Button disabled={isSubmitting} type="submit">
                          {editingDocumentId ? "Guardar vigencia" : "Cargar documento"}
                        </Button>
                        {editingDocumentId ? (
                          <Button disabled={isSubmitting} onClick={closeDocumentForm} tone="secondary">
                            Cancelar edicion
                          </Button>
                        ) : null}
                      </form>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>
                        La carga de documentos usa la misma validacion de permisos del hogar que la edicion de mascotas.
                      </p>
                    )}

                    <div
                      style={{
                        background: documentAttentionItems.length ? "rgba(255,247,237,0.9)" : "rgba(240,253,250,0.9)",
                        border: "1px solid rgba(15,118,110,0.12)",
                        borderRadius: "14px",
                        display: "grid",
                        gap: "6px",
                        padding: "10px"
                      }}
                    >
                      <strong style={{ fontSize: "10px" }}>Documentos que requieren atencion</strong>
                      {documentAttentionItems.length ? (
                        documentAttentionItems.slice(0, 4).map((item) => (
                          <p key={item.document.id} style={{ margin: 0, color: "#7c2d12", fontSize: "9px", lineHeight: 1.35 }}>
                            {selectedPetDetail.pet.name} - {item.text}
                          </p>
                        ))
                      ) : (
                        <p style={{ margin: 0, color: "#0f766e", fontSize: "9px", fontWeight: 800 }}>Todos los documentos estan al dia.</p>
                      )}
                    </div>

                    {documentGroups.length ? (
                      <div style={{ display: "grid", gap: "6px" }}>
                        {documentGroups.map((group) => (
                          <section key={group.documentType} style={{ display: "grid", gap: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                              <strong style={{ fontSize: "9px" }}>{petDocumentTypeLabels[group.documentType]}</strong>
                              <StatusPill label={`${group.documents.length} documento(s)`} tone="neutral" />
                            </div>
                            {group.documents.map((document) => {
                              const validityBadge = getDocumentValidityBadge(document);

                              return (
                                <article
                                  key={document.id}
                                  style={{
                                    borderRadius: "14px",
                                    padding: "8px 10px",
                                    background: "rgba(255,255,255,0.72)",
                                    display: "grid",
                                    gap: "5px"
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "center" }}>
                                    <strong style={{ fontSize: "9px" }}>{document.title}</strong>
                                    <StatusPill label={validityBadge.label} tone={validityBadge.tone} />
                                  </div>
                                  <span style={{ color: "#0f766e", fontSize: "8px", fontWeight: 800 }}>
                                    {document.hasExpiration ? `Aviso ${document.expirationWarningDays} dias antes` : "No genera alerta"}
                                  </span>
                                  <span style={{ color: "#57534e", fontSize: "8px" }}>{document.fileName}</span>
                                  <span style={{ color: "#57534e", fontSize: "8px" }}>{formatFileSize(document.fileSizeBytes)} - {document.mimeType ?? "Tipo de archivo desconocido"}</span>
                                  {canEditSelectedHousehold ? (
                                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                      <Button onClick={() => openDocumentValidityEditor(document)} tone="secondary">
                                        Editar vigencia
                                      </Button>
                                    </div>
                                  ) : null}
                                </article>
                              );
                            })}
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>
                        Todavia no hay documentos cargados para esta mascota.
                      </p>
                    )}
                  </article>
                </div>
              ) : (
                <p style={{ margin: 0, color: "#57534e", fontSize: "10px" }}>
                  Selecciona una mascota para revisar su ficha resumida y sus documentos basicos.
                </p>
              )}
            </div>
          </div>
        )}
      </CoreSection>
    </div>
  );
}
