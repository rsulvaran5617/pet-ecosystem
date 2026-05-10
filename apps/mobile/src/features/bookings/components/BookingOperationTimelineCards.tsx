import { formatDateTimeLabel } from "@pet/config";
import type { BookingCheckIn, BookingCheckOut, BookingEvidence, BookingOperationNote, BookingReportCard } from "@pet/types";
import { Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

const timelineItemStyle = {
  flexDirection: "row" as const,
  gap: 10,
  paddingVertical: 6
};

const timelineDotStyle = {
  alignItems: "center" as const,
  justifyContent: "center" as const,
  width: 28,
  height: 28,
  borderRadius: 14,
  marginLeft: -31,
  marginTop: 15,
  borderWidth: 2,
  borderColor: "#ffffff"
};

const contentStyle = {
  flex: 1,
  gap: 4,
  backgroundColor: "#ffffff",
  borderColor: "rgba(28,25,23,0.08)",
  borderRadius: 10,
  borderWidth: 1,
  paddingHorizontal: 10,
  paddingVertical: 8,
  shadowColor: "#0f172a",
  shadowOpacity: 0.05,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
  elevation: 1
};

const labelStyle = {
  fontSize: 10,
  fontWeight: "900" as const,
  color: "#0f766e",
  textTransform: "uppercase" as const
};

const titleStyle = {
  fontSize: 13,
  fontWeight: "900" as const,
  color: "#1c1917"
};

const detailStyle = {
  fontSize: 11,
  color: "#57534e",
  lineHeight: 16
};

const timeStyle = {
  fontSize: 11,
  color: "#a8a29e"
};

function CheckIcon({ color = "#ffffff", size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M20 6 9 17l-5-5" fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
    </Svg>
  );
}

function DocumentIcon({ color = "#ffffff", size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M7 3h7l5 5v13H7z" fill="none" stroke={color} strokeLinejoin="round" strokeWidth={2.4} />
      <Path d="M14 3v5h5M9 13h6M9 17h5" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2.4} />
    </Svg>
  );
}

function NoteIcon({ color = "#ffffff", size = 15 }: { color?: string; size?: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx={12} cy={12} fill="none" r={8} stroke={color} strokeWidth={2.4} />
      <Path d="M8 10h8M8 14h5" fill="none" stroke={color} strokeLinecap="round" strokeWidth={2.4} />
    </Svg>
  );
}

export function BookingCheckInCard({ checkIn }: { checkIn: BookingCheckIn | null }) {
  if (!checkIn) {
    return null;
  }

  return (
    <View style={timelineItemStyle}>
      <View style={{ ...timelineDotStyle, backgroundColor: "#0f766e" }}>
        <CheckIcon />
      </View>
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
      <View style={{ ...timelineDotStyle, backgroundColor: "#0f766e" }}>
        <CheckIcon />
      </View>
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
      <View style={{ ...timelineDotStyle, backgroundColor: "#0f766e" }}>
        <CheckIcon />
      </View>
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
      <View style={{ ...timelineDotStyle, backgroundColor: "#64748b" }}>
        <DocumentIcon />
      </View>
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
      <View style={{ ...timelineDotStyle, backgroundColor: "#64748b" }}>
        <NoteIcon />
      </View>
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
