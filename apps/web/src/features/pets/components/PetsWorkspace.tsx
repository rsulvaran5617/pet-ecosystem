"use client";

import { petDocumentTypeLabels, petDocumentTypeOrder, petSexLabels } from "@pet/config";
import type { PetDocumentType, PetSex, UpdatePetInput } from "@pet/types";
import { useMemo, useState } from "react";

import { CoreSection } from "../../core/components/CoreSection";
import { StatusPill } from "../../core/components/StatusPill";
import { getBrowserPetsApiClient } from "../../core/services/supabase-browser";
import { usePetHealthSummary } from "../../health/hooks/usePetHealthSummary";
import { usePetsWorkspace } from "../hooks/usePetsWorkspace";

const fieldLabelStyle = {
  fontSize: "12px",
  textTransform: "uppercase" as const,
  color: "#78716c"
};

const controlStyle = {
  borderRadius: "14px",
  border: "1px solid rgba(28, 25, 23, 0.14)",
  padding: "12px 14px",
  fontSize: "15px",
  background: "#fffdf8"
};

const emptyPetForm: UpdatePetInput = {
  name: "",
  species: "",
  breed: "",
  sex: "unknown",
  birthDate: "",
  notes: ""
};

type DocumentFormState = {
  title: string;
  documentType: PetDocumentType;
  file: File | null;
};

const emptyDocumentForm: DocumentFormState = {
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
        padding: "12px 18px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1
      }}
    >
      {children}
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
    <label style={{ display: "grid", gap: "6px" }}>
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
    <label style={{ display: "grid", gap: "6px" }}>
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
    <label style={{ display: "grid", gap: "6px" }}>
      <span style={fieldLabelStyle}>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        style={{ ...controlStyle, resize: "vertical" as const }}
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
  const [petForm, setPetForm] = useState(emptyPetForm);
  const [documentForm, setDocumentForm] = useState(emptyDocumentForm);

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
  const { summary: selectedPetHealthSummary, isLoading: isHealthSummaryLoading } = usePetHealthSummary(
    selectedPetDetail?.pet.id ?? null,
    enabled
  );

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
      >
        {isLoading ? (
          <p style={{ margin: 0, color: "#57534e" }}>Cargando hogares, mascotas y documentos desde Supabase...</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 300px) minmax(280px, 360px) minmax(0, 1fr)",
              gap: "18px"
            }}
          >
            <div style={{ display: "grid", gap: "12px", alignContent: "start" }}>
              <h3 style={{ margin: 0 }}>Hogares</h3>
              {householdSnapshot?.households.length ? (
                householdSnapshot.households.map((household) => {
                  const isActive = household.id === selectedHouseholdId;

                  return (
                    <button
                      key={household.id}
                      onClick={() => void selectHousehold(household.id)}
                      style={{
                        borderRadius: "18px",
                        border: isActive ? "1px solid rgba(15, 118, 110, 0.28)" : "1px solid rgba(28, 25, 23, 0.1)",
                        padding: "16px",
                        textAlign: "left",
                        background: isActive ? "rgba(15, 118, 110, 0.08)" : "rgba(247, 242, 231, 0.72)",
                        display: "grid",
                        gap: "10px",
                        cursor: "pointer"
                      }}
                      type="button"
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <strong>{household.name}</strong>
                        <StatusPill
                          label={household.myPermissions.includes("edit") ? "editable" : "solo lectura"}
                          tone={household.myPermissions.includes("edit") ? "active" : "neutral"}
                        />
                      </div>
                      <span style={{ color: "#57534e" }}>{household.memberCount} integrante(s)</span>
                    </button>
                  );
                })
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>Primero crea un hogar para empezar a registrar mascotas.</p>
              )}
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "14px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>{editingPetId ? "Editar mascota" : "Crear mascota"}</h3>
                  {selectedHousehold ? (
                    <StatusPill
                      label={canEditSelectedHousehold ? "hogar editable" : "hogar solo lectura"}
                      tone={canEditSelectedHousehold ? "active" : "neutral"}
                    />
                  ) : null}
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
                          notes: petForm.notes?.trim() || null
                        } satisfies UpdatePetInput;

                        if (editingPetId) {
                          void runAction(
                            () => getBrowserPetsApiClient().updatePet(editingPetId, payload),
                            "Mascota actualizada.",
                            false
                          ).then(async (pet) => {
                            setEditingPetId(null);
                            setPetForm(emptyPetForm);
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
                          setPetForm(emptyPetForm);
                          await refresh();
                          await selectPet(pet.id);
                        });
                      }}
                      style={{ display: "grid", gap: "12px" }}
                    >
                      <Field label="Nombre de la mascota" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, name: value }))} value={petForm.name ?? ""} />
                      <Field
                        label="Especie"
                        onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, species: value }))}
                        placeholder="Dog"
                        value={petForm.species ?? ""}
                      />
                      <Field label="Breed" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, breed: value }))} value={petForm.breed ?? ""} />
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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
                      <TextArea label="Notas" onChange={(value) => setPetForm((currentForm) => ({ ...currentForm, notes: value }))} value={petForm.notes ?? ""} />
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <Button disabled={isSubmitting} type="submit">
                          {editingPetId ? "Guardar mascota" : "Crear mascota"}
                        </Button>
                        {editingPetId ? (
                          <Button
                            disabled={isSubmitting}
                            onClick={() => {
                              setEditingPetId(null);
                              setPetForm(emptyPetForm);
                            }}
                            tone="secondary"
                          >
                            Cancelar edicion
                          </Button>
                        ) : null}
                      </div>
                    </form>
                  ) : (
                    <p style={{ margin: 0, color: "#57534e" }}>
                      Puedes revisar las mascotas de este hogar, pero solo integrantes con `edit` o `admin` pueden modificarlas.
                    </p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona un hogar para crear o editar mascotas.</p>
                )}
              </article>

              <article
                style={{
                  borderRadius: "22px",
                  padding: "20px",
                  background: "rgba(247, 242, 231, 0.72)",
                  display: "grid",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Mascotas</h3>
                  {selectedHousehold ? <StatusPill label={`${pets.length} mascota(s)`} tone="neutral" /> : null}
                </div>
                {selectedHousehold ? (
                  pets.length ? (
                    pets.map((pet) => (
                      <article
                        key={pet.id}
                        style={{
                          borderRadius: "18px",
                          padding: "14px 16px",
                          background: pet.id === selectedPetId ? "rgba(15, 118, 110, 0.08)" : "rgba(255,255,255,0.72)",
                          border: pet.id === selectedPetId ? "1px solid rgba(15, 118, 110, 0.28)" : "1px solid rgba(28, 25, 23, 0.08)",
                          display: "grid",
                          gap: "8px"
                        }}
                      >
                        <button
                          onClick={() => void selectPet(pet.id)}
                          style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer", display: "grid", gap: "8px" }}
                          type="button"
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                            <strong>{pet.name}</strong>
                            <StatusPill label={`${pet.documentCount} documento(s)`} tone="neutral" />
                          </div>
                          <span style={{ color: "#57534e" }}>
                            {pet.species}
                            {pet.breed ? ` Â· ${pet.breed}` : ""}
                          </span>
                        </button>
                        {canEditSelectedHousehold ? (
                          <div style={{ display: "flex", justifyContent: "flex-end" }}>
                            <Button
                              disabled={isSubmitting}
                              onClick={() => {
                                setEditingPetId(pet.id);
                                setPetForm({
                                  name: pet.name,
                                  species: pet.species,
                                  breed: pet.breed ?? "",
                                  sex: pet.sex,
                                  birthDate: pet.birthDate ?? "",
                                  notes: pet.notes ?? ""
                                });
                              }}
                              tone="secondary"
                            >
                              Editar
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    ))
                  ) : (
                    <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay mascotas en este hogar.</p>
                  )
                ) : (
                  <p style={{ margin: 0, color: "#57534e" }}>Selecciona un hogar para listar sus mascotas.</p>
                )}
              </article>
            </div>

            <div style={{ display: "grid", gap: "18px", alignContent: "start" }}>
              {selectedPetDetail ? (
                <>
                  <article
                    style={{
                      borderRadius: "22px",
                      padding: "20px",
                      background: "rgba(247, 242, 231, 0.72)",
                      display: "grid",
                      gap: "12px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>{selectedPetDetail.pet.name}</h3>
                      <StatusPill label={selectedPetDetail.pet.species} tone="active" />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Breed</span>
                        <strong>{selectedPetDetail.pet.breed ?? "No registrada"}</strong>
                      </div>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Sex</span>
                        <strong>{petSexLabels[selectedPetDetail.pet.sex]}</strong>
                      </div>
                      <div style={{ display: "grid", gap: "4px" }}>
                        <span style={fieldLabelStyle}>Fecha de nacimiento</span>
                        <strong>{selectedPetDetail.pet.birthDate ?? "No registrada"}</strong>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: "4px" }}>
                      <span style={fieldLabelStyle}>Notas</span>
                      <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
                        {selectedPetDetail.pet.notes ?? "Todavia no hay notas para esta mascota."}
                      </p>
                    </div>
                    <div style={{ display: "grid", gap: "8px" }}>
                      <span style={fieldLabelStyle}>Resumen de salud</span>
                      {isHealthSummaryLoading ? (
                        <p style={{ margin: 0, color: "#57534e" }}>Cargando resumen de salud...</p>
                      ) : selectedPetHealthSummary ? (
                        <div style={{ display: "grid", gap: "8px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                            <strong>{selectedPetHealthSummary.vaccineCount} vacuna(s)</strong>
                            <strong>{selectedPetHealthSummary.allergyCount} alergia(s)</strong>
                            <strong>{selectedPetHealthSummary.conditionCount} condicion(es)</strong>
                            <strong>{selectedPetHealthSummary.criticalConditionCount} criticas</strong>
                          </div>
                          <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
                            Ultima vacuna: {selectedPetHealthSummary.latestVaccineDate ?? "No registrada"}.
                            {" "}Proxima fecha: {selectedPetHealthSummary.nextVaccineDueDate ?? "No registrada"}.
                          </p>
                          <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
                            Alertas: {selectedPetHealthSummary.criticalConditionNames.join(", ") || "Sin condiciones criticas"}.
                          </p>
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay un resumen de salud.</p>
                      )}
                    </div>
                  </article>

                  <article
                    style={{
                      borderRadius: "22px",
                      padding: "20px",
                      background: "rgba(247, 242, 231, 0.72)",
                      display: "grid",
                      gap: "14px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                      <h3 style={{ margin: 0 }}>Documentos</h3>
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

                              if (!selectedFile) {
                                throw new Error("Elige un archivo antes de cargarlo.");
                              }

                              const fileBytes = await selectedFile.arrayBuffer();

                              return getBrowserPetsApiClient().uploadPetDocument(selectedPetDetail.pet.id, {
                                title: documentForm.title.trim() || selectedFile.name,
                                documentType: documentForm.documentType,
                                fileName: selectedFile.name,
                                mimeType: selectedFile.type || null,
                                fileBytes
                              });
                            },
                            "Documento cargado.",
                            false
                          ).then(async () => {
                            setDocumentForm(emptyDocumentForm);
                            await refresh();
                            await selectPet(selectedPetDetail.pet.id);
                          });
                        }}
                        style={{ display: "grid", gap: "12px" }}
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
                        <label style={{ display: "grid", gap: "6px" }}>
                          <span style={fieldLabelStyle}>Archivo</span>
                          <input
                            onChange={(event) =>
                              setDocumentForm((currentForm) => ({
                                ...currentForm,
                                file: event.target.files?.[0] ?? null
                              }))
                            }
                            style={{ ...controlStyle, padding: "10px 14px" }}
                            type="file"
                          />
                        </label>
                        <Button disabled={isSubmitting} type="submit">
                          Cargar documento
                        </Button>
                      </form>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>
                        La carga de documentos usa la misma validacion de permisos del hogar que la edicion de mascotas.
                      </p>
                    )}

                    {documentGroups.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {documentGroups.map((group) => (
                          <section key={group.documentType} style={{ display: "grid", gap: "10px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                              <strong>{petDocumentTypeLabels[group.documentType]}</strong>
                              <StatusPill label={`${group.documents.length} documento(s)`} tone="neutral" />
                            </div>
                            {group.documents.map((document) => (
                              <article
                                key={document.id}
                                style={{
                                  borderRadius: "18px",
                                  padding: "14px 16px",
                                  background: "rgba(255,255,255,0.72)",
                                  display: "grid",
                                  gap: "8px"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                                  <strong>{document.title}</strong>
                                  <StatusPill label={formatFileSize(document.fileSizeBytes)} tone="neutral" />
                                </div>
                                <span style={{ color: "#57534e" }}>{document.fileName}</span>
                                <span style={{ color: "#57534e" }}>{document.mimeType ?? "Tipo de archivo desconocido"}</span>
                              </article>
                            ))}
                          </section>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: "#57534e" }}>Todavia no hay documentos cargados para esta mascota.</p>
                    )}
                  </article>
                </>
              ) : (
                <p style={{ margin: 0, color: "#57534e" }}>
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



