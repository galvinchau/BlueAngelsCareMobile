import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

type BackupShiftAlertProps = {
  shift: {
    id: string;
    individualName?: string;
    individualCode?: string;
    serviceCode?: string;
    serviceName?: string;
    plannedStart: string;
    plannedEnd: string;
    awakeMonitoringRequired?: boolean;
    notes?: string | null;
    backupNote?: string | null;
  };
  onAccept: (shiftId: string) => Promise<void>;
  onDismiss: () => void;
};

export default function BackupShiftAlert({
  shift,
  onAccept,
  onDismiss,
}: BackupShiftAlertProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    try {
      setLoading(true);
      await onAccept(shift.id);
    } catch (error) {
      console.log("Accept backup shift error:", error);
    } finally {
      setLoading(false);
    }
  };

  const dateText = new Date(shift.plannedStart).toLocaleDateString();
  const startText = new Date(shift.plannedStart).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endText = new Date(shift.plannedEnd).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.wrapper}>
      {/* Card 1: shift info */}
      <View style={styles.card}>
        <Text style={styles.title}>
          BAC is looking for a DSP for the following shift
        </Text>

        <Text style={styles.line}>
          Individual: {shift.individualName || "-"}
        </Text>

        {!!shift.individualCode && (
          <Text style={styles.line}>Code: {shift.individualCode}</Text>
        )}

        <Text style={styles.line}>
          Service: {shift.serviceCode ? `${shift.serviceCode} — ` : ""}
          {shift.serviceName || "-"}
        </Text>

        <Text style={styles.line}>Date: {dateText}</Text>

        <Text style={styles.line}>
          Time: {startText} - {endText}
        </Text>

        {shift.awakeMonitoringRequired ? (
          <Text style={styles.awakeText}>Awake Monitoring Required</Text>
        ) : null}

        {!!shift.notes && (
          <Text style={styles.noteText}>Notes: {shift.notes}</Text>
        )}

        {!!shift.backupNote && (
          <Text style={styles.noteText}>Backup note: {shift.backupNote}</Text>
        )}
      </View>

      {/* Card 2: actions */}
      <View style={styles.card}>
        <Text style={styles.actionTitle}>
          Would you like to take this shift?
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={onDismiss}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Not now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleAccept}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? "Processing..." : "Select"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 10,
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  title: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },

  line: {
    fontSize: 13,
    color: "#111827",
    marginBottom: 4,
  },

  awakeText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#dc2626",
  },

  noteText: {
    marginTop: 6,
    fontSize: 12,
    color: "#4b5563",
    fontStyle: "italic",
  },

  actionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 10,
  },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    backgroundColor: "#16a34a",
  },

  secondaryButton: {
    backgroundColor: "#e5e7eb",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  secondaryButtonText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
});