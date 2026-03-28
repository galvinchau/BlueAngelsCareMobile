// bac-Mobile/BlueAngelscareMobile/src/components/CancelShiftAlert.tsx

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type Props = {
  alert: {
    id: string;
    title: string;
    message: string;
    note?: string | null;
    individualName?: string | null;
    serviceName?: string | null;
    shiftDateLabel?: string | null;
    shiftTimeLabel?: string | null;
  };
  onDismiss: () => void;
};

export default function CancelShiftAlert({ alert, onDismiss }: Props) {
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>
          Shift Cancelled
        </Text>
      </View>

      {/* MESSAGE */}
      <Text style={styles.message}>
        {alert.message}
      </Text>

      {/* SHIFT INFO */}
      <View style={styles.infoBox}>
        {!!alert.individualName && (
          <Text style={styles.infoText}>
            👤 {alert.individualName}
          </Text>
        )}

        {!!alert.serviceName && (
          <Text style={styles.infoText}>
            🛠 {alert.serviceName}
          </Text>
        )}

        {!!alert.shiftDateLabel && (
          <Text style={styles.infoText}>
            📅 {alert.shiftDateLabel}
          </Text>
        )}

        {!!alert.shiftTimeLabel && (
          <Text style={styles.infoText}>
            ⏰ {alert.shiftTimeLabel}
          </Text>
        )}
      </View>

      {/* NOTE */}
      {!!alert.note && (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>Note</Text>
          <Text style={styles.noteText}>
            {alert.note}
          </Text>
        </View>
      )}

      {/* BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={onDismiss}
      >
        <Text style={styles.buttonText}>
          OK
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#D32F2F", // 🔴 đỏ đậm
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  icon: {
    fontSize: 18,
    marginRight: 6,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },

  message: {
    fontSize: 13,
    color: "#fff",
    marginBottom: 10,
    lineHeight: 18,
  },

  infoBox: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },

  infoText: {
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },

  noteBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },

  noteLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D32F2F",
    marginBottom: 2,
  },

  noteText: {
    fontSize: 13,
    color: "#333",
  },

  button: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },

  buttonText: {
    color: "#D32F2F",
    fontWeight: "700",
    fontSize: 14,
  },
});