import { colorTokens } from "@pet/ui";
import type {
  PetAdoptionApplication,
  PetAdoptionApplicationStatus,
  PetAdoptionApplicationStatusHistory,
  PetAdoptionListing,
  PetTransferRecord,
  Uuid
} from "@pet/types";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { StatusChip } from "../../core/components/StatusChip";
import { getMobileFosterApiClient } from "../../core/services/supabase-mobile";

type ApplicationFilterStatus = "all" | PetAdoptionApplicationStatus;
type ApplicationSortOrder = "newest" | "oldest";

type Props = {
  applications: PetAdoptionApplication[];
  disabled?: boolean;
  listings: PetAdoptionListing[];
  onRefresh: () => Promise<void> | void;
  onStartTransfer: (applicationId: Uuid) => Promise<void> | void;
  selectedPetId?: Uuid | null;
  transfers: PetTransferRecord[];
};

const statusLabels: Record<PetAdoptionApplicationStatus, string> = {
  approved: "Aprobadas",
  converted_to_transfer: "En transferencia",
  in_review: "En revision",
  interview: "Entrevista",
  rejected: "Rechazadas",
  submitted: "Nuevas",
  withdrawn: "Retiradas"
};

const detailStatusLabels: Record<PetAdoptionApplicationStatus, string> = {
  approved: "Aprobada",
  converted_to_transfer: "En transferencia",
  in_review: "En revision",
  interview: "Entrevista",
  rejected: "Rechazada",
  submitted: "Nueva",
  withdrawn: "Retirada"
};

const statusOrder: PetAdoptionApplicationStatus[] = [
  "submitted",
  "in_review",
  "interview",
  "approved",
  "rejected",
  "withdrawn",
  "converted_to_transfer"
];

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return "Sin fecha";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getStatusTone(status: PetAdoptionApplicationStatus) {
  if (status === "approved" || status === "converted_to_transfer") {
    return "active" as const;
  }

  if (status === "submitted" || status === "in_review" || status === "interview") {
    return "pending" as const;
  }

  return "neutral" as const;
}

function getTransferLabel(transfer: PetTransferRecord | undefined) {
  if (!transfer) {
    return null;
  }

  if (transfer.status === "accepted") {
    return "Transferida";
  }

  if (transfer.status === "pending") {
    return "Transferencia pendiente";
  }

  return `Transferencia ${transfer.status}`;
}

function isApprovedApplicationPendingTransfer(application: PetAdoptionApplication, transfers: PetTransferRecord[]) {
  return application.status === "approved" && !transfers.some((transfer) => transfer.adoptionApplicationId === application.id);
}

export function AdoptionApplicationsInbox({
  applications,
  disabled = false,
  listings,
  onRefresh,
  onStartTransfer,
  selectedPetId,
  transfers
}: Props) {
  const [selectedApplicationId, setSelectedApplicationId] = useState<Uuid | null>(null);
  const [detailApplication, setDetailApplication] = useState<PetAdoptionApplication | null>(null);
  const [history, setHistory] = useState<PetAdoptionApplicationStatusHistory[]>([]);
  const [filterStatus, setFilterStatus] = useState<ApplicationFilterStatus>("all");
  const [filterPetId, setFilterPetId] = useState<"all" | Uuid>(selectedPetId ?? "all");
  const [sortOrder, setSortOrder] = useState<ApplicationSortOrder>("newest");
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFilterPetId(selectedPetId ?? "all");
  }, [selectedPetId]);

  const counts = useMemo(() => {
    const nextCounts = statusOrder.reduce(
      (accumulator, status) => ({
        ...accumulator,
        [status]: applications.filter((application) => application.status === status).length
      }),
      {} as Record<PetAdoptionApplicationStatus, number>
    );

    return { ...nextCounts, all: applications.length };
  }, [applications]);
  const approvedPendingTransferCount = useMemo(
    () => applications.filter((application) => isApprovedApplicationPendingTransfer(application, transfers)).length,
    [applications, transfers]
  );

  const petOptions = useMemo(() => {
    const options = new Map<Uuid, string>();

    listings.forEach((listing) => {
      options.set(listing.petId, listing.petName);
    });
    applications.forEach((application) => {
      options.set(application.petId, application.petName);
    });

    return Array.from(options.entries()).map(([id, name]) => ({ id, name }));
  }, [applications, listings]);

  const listingTitles = useMemo(() => {
    const titles = new Map<Uuid, string>();

    listings.forEach((listing) => titles.set(listing.id, listing.title));

    return titles;
  }, [listings]);

  const filteredApplications = useMemo(() => {
    return applications
      .filter((application) => filterStatus === "all" || application.status === filterStatus)
      .filter((application) => filterPetId === "all" || application.petId === filterPetId)
      .sort((first, second) => {
        const firstTime = new Date(first.submittedAt || first.createdAt).getTime();
        const secondTime = new Date(second.submittedAt || second.createdAt).getTime();

        return sortOrder === "newest" ? secondTime - firstTime : firstTime - secondTime;
      });
  }, [applications, filterPetId, filterStatus, sortOrder]);

  const selectedApplication = detailApplication ?? applications.find((application) => application.id === selectedApplicationId) ?? null;
  const selectedTransfer = selectedApplication
    ? transfers.find((transfer) => transfer.adoptionApplicationId === selectedApplication.id)
    : undefined;

  const openApplicationDetail = async (application: PetAdoptionApplication) => {
    setSelectedApplicationId(application.id);
    setDetailApplication(application);
    setHistory([]);
    setMessage(null);
    setRejectNote("");
    setIsDetailLoading(true);

    try {
      const [detail, statusHistory] = await Promise.all([
        getMobileFosterApiClient().getPetAdoptionApplicationDetail(application.id),
        getMobileFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id)
      ]);

      setDetailApplication(detail ?? application);
      setHistory(statusHistory);
    } catch {
      setMessage("No se pudo cargar el detalle. Intenta nuevamente.");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const updateStatus = async (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => {
    if (disabled || isUpdating) {
      return;
    }

    if (status === "rejected" && !notes?.trim()) {
      setMessage("Agrega una nota breve antes de rechazar la solicitud.");
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      const updated = await getMobileFosterApiClient().updatePetAdoptionApplicationStatus({
        applicationId: application.id,
        notes: notes?.trim() || null,
        status
      });
      const nextHistory = await getMobileFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id);

      setSelectedApplicationId(updated.id);
      setDetailApplication(updated);
      setHistory(nextHistory);
      setRejectNote("");
      await onRefresh();
      setMessage("Estado actualizado.");
    } catch {
      setMessage("No se pudo actualizar la solicitud. Intenta nuevamente.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartTransfer = async (application: PetAdoptionApplication) => {
    if (disabled || isUpdating) {
      return;
    }

    setIsUpdating(true);
    setMessage(null);

    try {
      await onStartTransfer(application.id);
      await onRefresh();
      const nextHistory = await getMobileFosterApiClient().listPetAdoptionApplicationStatusHistory(application.id);
      const detail = await getMobileFosterApiClient().getPetAdoptionApplicationDetail(application.id);

      setDetailApplication(detail ?? application);
      setHistory(nextHistory);
      setMessage("Transferencia iniciada. La familia receptora debe aceptarla.");
    } catch {
      setMessage("No se pudo iniciar la transferencia. Verifica que la solicitud siga aprobada.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.eyebrow}>FAMILIA PROTECTORA</Text>
          <Text style={styles.title}>Solicitudes de adopcion</Text>
          <Text style={styles.subtitle}>Gestiona entrevistas, aprobaciones y transferencias sin mover la mascota automaticamente.</Text>
        </View>
        <View style={styles.totalBadge}>
          <Text style={styles.totalNumber}>{applications.length}</Text>
          <Text style={styles.totalLabel}>recibidas</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.metricsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setFilterStatus("approved")}
          style={[styles.metricCard, approvedPendingTransferCount ? styles.metricCardWarning : null]}
        >
          <Text style={styles.metricNumber}>{approvedPendingTransferCount}</Text>
          <Text style={styles.metricLabel}>Pendientes de transferencia</Text>
        </Pressable>
        {statusOrder.map((status) => (
          <Pressable
            accessibilityRole="button"
            key={status}
            onPress={() => setFilterStatus(status)}
            style={[styles.metricCard, filterStatus === status ? styles.metricCardActive : null]}
          >
            <Text style={styles.metricNumber}>{counts[status]}</Text>
            <Text style={styles.metricLabel}>{statusLabels[status]}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.filterPanel}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip active={filterStatus === "all"} label={`Todas (${counts.all})`} onPress={() => setFilterStatus("all")} />
          <FilterChip active={sortOrder === "newest"} label="Recientes" onPress={() => setSortOrder("newest")} />
          <FilterChip active={sortOrder === "oldest"} label="Antiguas" onPress={() => setSortOrder("oldest")} />
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <FilterChip active={filterPetId === "all"} label="Todas las mascotas" onPress={() => setFilterPetId("all")} />
          {petOptions.map((pet) => (
            <FilterChip key={pet.id} active={filterPetId === pet.id} label={pet.name} onPress={() => setFilterPetId(pet.id)} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.grid}>
        <View style={styles.listColumn}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>Bandeja</Text>
            <StatusChip label={`${filteredApplications.length} visibles`} tone="neutral" />
          </View>

          {filteredApplications.length ? (
            filteredApplications.map((application) => {
              const linkedTransfer = transfers.find((transfer) => transfer.adoptionApplicationId === application.id);
              const transferLabel = getTransferLabel(linkedTransfer);
              const isSelected = selectedApplicationId === application.id;

              return (
                <Pressable
                  accessibilityLabel={`Ver solicitud de ${application.applicantName} para ${application.petName}`}
                  accessibilityRole="button"
                  key={application.id}
                  onPress={() => void openApplicationDetail(application)}
                  style={[styles.applicationCard, isSelected ? styles.applicationCardActive : null]}
                >
                  <View style={styles.applicationHeader}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{application.petName.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={styles.applicationTitle}>
                        {application.petName}
                      </Text>
                      <Text numberOfLines={1} style={styles.applicationMeta}>
                        {application.applicantName} - {formatShortDate(application.submittedAt)}
                      </Text>
                    </View>
                    <StatusChip label={detailStatusLabels[application.status]} tone={getStatusTone(application.status)} />
                  </View>
                  <Text numberOfLines={2} style={styles.applicationSnippet}>
                    {application.motivation || "Sin motivacion registrada."}
                  </Text>
                  <View style={styles.applicationFooter}>
                    <Text numberOfLines={1} style={styles.applicationListing}>
                      {listingTitles.get(application.listingId) ?? application.listingTitle}
                    </Text>
                    {transferLabel ? <Text style={styles.transferLabel}>{transferLabel}</Text> : null}
                  </View>
                </Pressable>
              );
            })
          ) : (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Sin solicitudes en este filtro</Text>
              <Text style={styles.emptyText}>Prueba otro estado o revisa otra mascota publicada.</Text>
            </View>
          )}
        </View>

        <View style={styles.detailColumn}>
          {selectedApplication ? (
            <ApplicationDetail
              application={selectedApplication}
              disabled={disabled || isUpdating}
              history={history}
              isDetailLoading={isDetailLoading}
              isUpdating={isUpdating}
              message={message}
              onRejectNoteChange={setRejectNote}
              onStartTransfer={handleStartTransfer}
              onUpdateStatus={updateStatus}
              rejectNote={rejectNote}
              transfer={selectedTransfer}
            />
          ) : (
            <View style={styles.emptyDetail}>
              <Text style={styles.emptyTitle}>Selecciona una solicitud</Text>
              <Text style={styles.emptyText}>Aqui veras el perfil de la familia interesada, su motivacion y el historial de revision.</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.filterChip, active ? styles.filterChipActive : null]}>
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

function ApplicationDetail({
  application,
  disabled,
  history,
  isDetailLoading,
  isUpdating,
  message,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  application: PetAdoptionApplication;
  disabled: boolean;
  history: PetAdoptionApplicationStatusHistory[];
  isDetailLoading: boolean;
  isUpdating: boolean;
  message: string | null;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  transfer: PetTransferRecord | undefined;
}) {
  const transferLabel = getTransferLabel(transfer);
  const isApprovedWithoutTransfer = application.status === "approved" && !transfer;

  return (
    <View style={styles.detailCard}>
      <View style={styles.detailHeader}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.detailTitle}>{application.applicantName}</Text>
          <Text style={styles.detailMeta}>{application.applicantEmail}</Text>
          {application.applicantPhone ? <Text style={styles.detailMeta}>{application.applicantPhone}</Text> : null}
        </View>
        <StatusChip label={detailStatusLabels[application.status]} tone={getStatusTone(application.status)} />
      </View>

      {isDetailLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.detailMeta}>Cargando detalle...</Text>
        </View>
      ) : null}

      <View style={styles.infoGrid}>
        <InfoBlock label="Mascota" value={application.petName} />
        <InfoBlock label="Vivienda" value={application.housingType} />
        <InfoBlock label="Ninos" value={formatBoolean(application.hasChildren)} />
        <InfoBlock label="Otras mascotas" value={formatBoolean(application.hasOtherPets)} />
      </View>

      <DetailSection label="Motivacion" value={application.motivation} />
      <DetailSection label="Experiencia con mascotas" value={application.petExperience} />
      <DetailSection label="Disponibilidad / notas" value={application.availabilityNotes || "Sin notas adicionales."} />

      {transferLabel ? (
        <View style={styles.transferBox}>
          <Text style={styles.transferBoxTitle}>{transferLabel}</Text>
          <Text style={styles.transferBoxText}>
            La adopcion se completa solo cuando la familia receptora acepta la transferencia privada.
          </Text>
        </View>
      ) : null}
      {isApprovedWithoutTransfer ? (
        <View style={styles.pendingTransferBox}>
          <Text style={styles.pendingTransferTitle}>Solicitud aprobada, transferencia pendiente</Text>
          <Text style={styles.pendingTransferText}>
            Inicia la transferencia privada para que {application.petName} pueda pasar al hogar receptor. Aprobar la solicitud no mueve la custodia.
          </Text>
        </View>
      ) : null}

      {message ? <Text style={styles.feedbackText}>{message}</Text> : null}

      <ApplicationActions
        application={application}
        disabled={disabled}
        isUpdating={isUpdating}
        onRejectNoteChange={onRejectNoteChange}
        onStartTransfer={onStartTransfer}
        onUpdateStatus={onUpdateStatus}
        rejectNote={rejectNote}
        transfer={transfer}
      />

      <View style={styles.historyBox}>
        <Text style={styles.historyTitle}>Historial</Text>
        {history.length ? (
          history.map((entry) => (
            <View key={entry.id} style={styles.historyItem}>
              <Text style={styles.historyStatus}>
                {entry.fromStatus ? `${detailStatusLabels[entry.fromStatus]} -> ` : ""}
                {detailStatusLabels[entry.toStatus]}
              </Text>
              <Text style={styles.historyMeta}>
                {formatShortDate(entry.createdAt)}
                {entry.changedByEmail ? ` - ${entry.changedByEmail}` : ""}
              </Text>
              {entry.changeNotes ? <Text style={styles.historyNote}>{entry.changeNotes}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Sin cambios registrados todavia.</Text>
        )}
      </View>
    </View>
  );
}

function ApplicationActions({
  application,
  disabled,
  isUpdating,
  onRejectNoteChange,
  onStartTransfer,
  onUpdateStatus,
  rejectNote,
  transfer
}: {
  application: PetAdoptionApplication;
  disabled: boolean;
  isUpdating: boolean;
  onRejectNoteChange: (value: string) => void;
  onStartTransfer: (application: PetAdoptionApplication) => Promise<void>;
  onUpdateStatus: (
    application: PetAdoptionApplication,
    status: Exclude<PetAdoptionApplicationStatus, "submitted" | "converted_to_transfer">,
    notes?: string | null
  ) => Promise<void>;
  rejectNote: string;
  transfer: PetTransferRecord | undefined;
}) {
  const actionDisabled = disabled || isUpdating;

  if (application.status === "rejected" || application.status === "withdrawn" || application.status === "converted_to_transfer") {
    return <Text style={styles.readOnlyText}>Solicitud en modo consulta. No requiere acciones.</Text>;
  }

  return (
    <View style={styles.actionsBox}>
      {application.status === "submitted" ? (
        <PrimaryAction disabled={actionDisabled} label="Marcar en revision" onPress={() => onUpdateStatus(application, "in_review")} />
      ) : null}
      {application.status === "in_review" ? (
        <PrimaryAction disabled={actionDisabled} label="Pasar a entrevista" onPress={() => onUpdateStatus(application, "interview")} />
      ) : null}
      {application.status === "interview" ? (
        <PrimaryAction disabled={actionDisabled} label="Aprobar solicitud" onPress={() => onUpdateStatus(application, "approved")} />
      ) : null}
      {application.status === "approved" ? (
        transfer ? (
          <Text style={styles.readOnlyText}>La transferencia ya fue iniciada para esta solicitud.</Text>
        ) : (
          <PrimaryAction disabled={actionDisabled} label={`Iniciar transferencia de ${application.petName}`} onPress={() => onStartTransfer(application)} />
        )
      ) : null}
      {application.status !== "approved" ? (
        <View style={styles.rejectBox}>
          <TextInput
            editable={!actionDisabled}
            multiline
            onChangeText={onRejectNoteChange}
            placeholder="Nota obligatoria para rechazar"
            placeholderTextColor={colorTokens.muted}
            style={styles.rejectInput}
            value={rejectNote}
          />
          <SecondaryAction
            disabled={actionDisabled || !rejectNote.trim()}
            label="Rechazar"
            onPress={() => onUpdateStatus(application, "rejected", rejectNote)}
          />
        </View>
      ) : null}
    </View>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoBlock}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function DetailSection({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailSection}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.detailText}>{value}</Text>
    </View>
  );
}

function PrimaryAction({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.primaryAction, disabled ? styles.disabled : null]}>
      <Text style={styles.primaryActionText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryAction({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.secondaryAction, disabled ? styles.disabled : null]}>
      <Text style={styles.secondaryActionText}>{label}</Text>
    </Pressable>
  );
}

function formatBoolean(value: boolean | null) {
  if (value === true) {
    return "Si";
  }

  if (value === false) {
    return "No";
  }

  return "No indicado";
}

const styles = StyleSheet.create({
  actionsBox: {
    gap: 8
  },
  applicationCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(15,118,110,0.13)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    padding: 10
  },
  applicationCardActive: {
    backgroundColor: "rgba(236,253,245,0.92)",
    borderColor: "rgba(15,118,110,0.44)"
  },
  applicationFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  applicationHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  applicationListing: {
    color: "#0f766e",
    flex: 1,
    fontSize: 10,
    fontWeight: "900"
  },
  applicationMeta: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700"
  },
  applicationSnippet: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16
  },
  applicationTitle: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900"
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(20,184,166,0.12)",
    borderRadius: 14,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  avatarText: {
    color: "#0f766e",
    fontSize: 13,
    fontWeight: "900"
  },
  chipRow: {
    gap: 7,
    paddingRight: 6
  },
  columnHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  columnTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900"
  },
  container: {
    backgroundColor: "rgba(240,253,250,0.82)",
    borderColor: "rgba(15,118,110,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(15,118,110,0.13)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  detailColumn: {
    gap: 8
  },
  detailHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  detailMeta: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700"
  },
  detailSection: {
    gap: 3
  },
  detailText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16
  },
  detailTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900"
  },
  disabled: {
    opacity: 0.55
  },
  emptyBox: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 16,
    gap: 5,
    padding: 12
  },
  emptyDetail: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderColor: "rgba(15,118,110,0.12)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    padding: 12
  },
  emptyText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900"
  },
  eyebrow: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0
  },
  feedbackText: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16
  },
  filterChip: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15,118,110,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  filterChipActive: {
    backgroundColor: "rgba(20,184,166,0.13)",
    borderColor: "rgba(15,118,110,0.34)"
  },
  filterChipText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900"
  },
  filterChipTextActive: {
    color: "#0f766e"
  },
  filterPanel: {
    gap: 7
  },
  grid: {
    gap: 10
  },
  headerRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  historyBox: {
    borderTopColor: "rgba(15,118,110,0.12)",
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 9
  },
  historyItem: {
    backgroundColor: "rgba(248,250,252,0.9)",
    borderRadius: 12,
    gap: 3,
    padding: 9
  },
  historyMeta: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700"
  },
  historyNote: {
    color: "#334155",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15
  },
  historyStatus: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "900"
  },
  historyTitle: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "900"
  },
  infoBlock: {
    backgroundColor: "rgba(240,253,250,0.72)",
    borderRadius: 13,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 3,
    padding: 9
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  infoValue: {
    color: "#0f172a",
    fontSize: 11,
    fontWeight: "900"
  },
  listColumn: {
    gap: 8
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  metricCard: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(15,118,110,0.14)",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 102,
    paddingHorizontal: 10,
    paddingVertical: 9
  },
  metricCardActive: {
    backgroundColor: "rgba(20,184,166,0.13)",
    borderColor: "rgba(15,118,110,0.38)"
  },
  metricCardWarning: {
    backgroundColor: "rgba(255,247,237,0.96)",
    borderColor: "rgba(234,88,12,0.26)"
  },
  metricLabel: {
    color: "#0f766e",
    fontSize: 10,
    fontWeight: "900"
  },
  metricNumber: {
    color: "#0f766e",
    fontSize: 18,
    fontWeight: "900"
  },
  metricsRow: {
    gap: 8,
    paddingRight: 8
  },
  primaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#0f766e",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900"
  },
  pendingTransferBox: {
    backgroundColor: "rgba(255,247,237,0.95)",
    borderColor: "rgba(234,88,12,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
    padding: 10
  },
  pendingTransferText: {
    color: "#9a3412",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15
  },
  pendingTransferTitle: {
    color: "#c2410c",
    fontSize: 11,
    fontWeight: "900"
  },
  readOnlyText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16
  },
  rejectBox: {
    gap: 7
  },
  rejectInput: {
    backgroundColor: "#ffffff",
    borderColor: "rgba(15,118,110,0.18)",
    borderRadius: 14,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 11,
    minHeight: 64,
    paddingHorizontal: 10,
    paddingVertical: 8,
    textAlignVertical: "top"
  },
  secondaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(254,242,242,0.92)",
    borderColor: "rgba(185,28,28,0.22)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 8
  },
  secondaryActionText: {
    color: "#991b1b",
    fontSize: 11,
    fontWeight: "900"
  },
  subtitle: {
    color: "#115e59",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16
  },
  title: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900"
  },
  totalBadge: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "rgba(15,118,110,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  totalLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900"
  },
  totalNumber: {
    color: "#0f766e",
    fontSize: 17,
    fontWeight: "900"
  },
  transferBox: {
    backgroundColor: "rgba(236,253,245,0.9)",
    borderColor: "rgba(15,118,110,0.14)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 3,
    padding: 10
  },
  transferBoxText: {
    color: "#115e59",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15
  },
  transferBoxTitle: {
    color: "#0f766e",
    fontSize: 11,
    fontWeight: "900"
  },
  transferLabel: {
    color: "#0f766e",
    fontSize: 9,
    fontWeight: "900"
  }
});
