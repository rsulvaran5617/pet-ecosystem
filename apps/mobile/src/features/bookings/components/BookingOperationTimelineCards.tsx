import { formatDateTimeLabel } from "@pet/config";
import type { BookingCheckIn, BookingCheckOut, BookingEvidence, BookingOperationNote, BookingReportCard } from "@pet/types";
import { Text, View } from "react-native";

const timelineItemStyle = {
  flexDirection: "row" as const,
  gap: 12,
  paddingVertical: 12
};

const timelineDotStyle = {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginTop: 6
};

const contentStyle = {
  flex: 1,
  gap: 4
};

const labelStyle = {
  fontSize: 12,
  fontWeight: "600" as const,
  color: "#64748b",
  textTransform: "uppercase" as const
};

const titleStyle = {
  fontSize: 14,
  fontWeight: "700" as const,
  color: "#1c1917"
};

const detailStyle = {
  fontSize: 13,
  color: "#57534e",
  lineHeight: 18
};

const timeStyle = {
  fontSize: 12,
  color: "#a8a29e"
};

export function BookingCheckInCard({ checkIn }: { checkIn: BookingCheckIn | null }) {
  if (!checkIn) {
    return null;
  }

  return (
    <View style={timelineItemStyle}>
      <View style={{ ...timelineDotStyle, backgroundColor: "#0f766e" }} />
      <View style={contentStyle}>
        <Text style={labelStyle}>Llegada</Text>
        <Text style={titleStyle}>Check-in registrado</Text>
        {checkIn.locationLabel && (
          <Text style={detailStyle}>{checkIn.locationLabel}</Text>
        )}
        {checkIn.locationLatitude !== null && checkIn.locationLongitude !== null && (
          <Text style={detailStyle}>
            Ubicacion: {checkIn.locationLatitude.toFixed(4)}, {checkIn.locationLongitude.toFixed(4)}
          </Text>
        )}
        <Text style={timeStyle}>{formatDateTimeLabel(checkIn.createdAt)}</Text>
      </View>
    </View>
  );
}

export function BookingCheckOutCard({ checkOut }: { checkOut: BookingCheckOut | null }) {
  if (!checkOut) {
    return null;
  }

  return (
    <View style={timelineItemStyle}>
      <View style={{ ...timelineDotStyle, backgroundColor: "#ea580c" }} />
      <View style={contentStyle}>
        <Text style={labelStyle}>Salida</Text>
        <Text style={titleStyle}>Check-out registrado</Text>
        <Text style={timeStyle}>{formatDateTimeLabel(checkOut.createdAt)}</Text>
      </View>
    </View>
  );
}

export function BookingEvidenceCard({ evidences }: { evidences: BookingEvidence[] }) {
  if (evidences.length === 0) {
    return null;
  }

  return (
    <View style={timelineItemStyle}>
      <View style={{ ...timelineDotStyle, backgroundColor: "#7c2d12" }} />
      <View style={contentStyle}>
        <Text style={labelStyle}>Evidencia documental</Text>
        <Text style={titleStyle}>Documento registrado</Text>
        {evidences.map((evidence, idx) => (
          <View key={evidence.id} style={{ marginTop: idx === 0 ? 8 : 4 }}>
            <Text style={detailStyle}>
              - {evidence.fileName} ({(evidence.fileSizeBytes / 1024 / 1024).toFixed(2)} MB)
            </Text>
            <Text style={timeStyle}>{formatDateTimeLabel(evidence.createdAt)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function BookingReportCardComponent({ reportCard }: { reportCard: BookingReportCard | null }) {
  if (!reportCard) {
    return null;
  }

  return (
    <View style={timelineItemStyle}>
      <View style={{ ...timelineDotStyle, backgroundColor: "#1e40af" }} />
      <View style={contentStyle}>
        <Text style={labelStyle}>Reporte</Text>
        <Text style={titleStyle}>Reporte completado</Text>
        <Text style={detailStyle}>{reportCard.reportText}</Text>
        <Text style={timeStyle}>{formatDateTimeLabel(reportCard.createdAt)}</Text>
      </View>
    </View>
  );
}

export function BookingOperationNotesCard({ notes }: { notes: BookingOperationNote[] }) {
  if (notes.length === 0) {
    return null;
  }

  return (
    <View style={timelineItemStyle}>
      <View style={{ ...timelineDotStyle, backgroundColor: "#6b21a8" }} />
      <View style={contentStyle}>
        <Text style={labelStyle}>Notas</Text>
        <Text style={titleStyle}>{notes.length} nota(s)</Text>
        {notes.map((note, idx) => (
          <View key={note.id} style={{ marginTop: idx === 0 ? 8 : 4 }}>
            <Text style={detailStyle}>{note.noteText}</Text>
            <Text style={timeStyle}>{formatDateTimeLabel(note.createdAt)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
