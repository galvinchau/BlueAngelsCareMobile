import React, { useState } from "react";
import {
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

type ShiftStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type Shift = {
  id: string;
  date: string; // ngày làm dịch vụ

  individualId: string;
  individualName: string;

  serviceCode: string;   // COMP / HCSS / PCA...
  service: string;       // "COMP – Companion"

  startTime: string;
  endTime: string;
  location: string;
  status: ShiftStatus;

  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;
  outcomeText?: string;
};

// Tạm thời mock dữ liệu ca trực trong ngày
const mockShifts: Shift[] = [
  {
    id: "1",
    date: "2025-11-20",
    individualId: "IND001",
    individualName: "Donald Wilbur",
    serviceCode: "COMP",
    service: "COMP – Companion",
    startTime: "08:00",
    endTime: "12:00",
    location: "Home – Altoona, PA",
    status: "IN_PROGRESS",
    individualDob: "01/15/1985",
    individualMa: "MA123456",
    individualAddress: "123 Main St, Altoona, PA 16602",
    outcomeText: "Increase independence with daily living skills at home.",
  },
  {
    id: "2",
    date: "2025-11-20",
    individualId: "IND002",
    individualName: "Mary Smith",
    serviceCode: "HCSS",
    service: "HCSS – Home & Community",
    startTime: "13:00",
    endTime: "17:00",
    location: "Community – Altoona, PA",
    status: "NOT_STARTED",
    individualDob: "03/20/1990",
    individualMa: "MA654321",
    individualAddress: "456 Park Ave, Altoona, PA 16602",
    outcomeText: "Practice social skills in community settings.",
  },
  {
    id: "3",
    date: "2025-11-20",
    individualId: "IND003",
    individualName: "John Doe",
    serviceCode: "PCA",
    service: "PCA – Personal Care",
    startTime: "18:00",
    endTime: "20:00",
    location: "Home – Altoona, PA",
    status: "COMPLETED",
    individualDob: "07/04/1978",
    individualMa: "MA999888",
    individualAddress: "789 Oak St, Altoona, PA 16602",
    outcomeText: "Support with evening personal care routine.",
  },
];

export default function HomeScreen({ navigation }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    mockShifts[0]?.id ?? null
  );

  const selectedShift =
    mockShifts.find((shift) => shift.id === selectedId) ?? null;

  const handleCheckInOut = () => {
    if (!selectedShift) return;

    if (selectedShift.status === "NOT_STARTED") {
      Alert.alert(
        "Check in",
        `You checked in to ${selectedShift.individualName}.`
      );
    } else if (selectedShift.status === "IN_PROGRESS") {
      Alert.alert(
        "Check out",
        `You checked out from ${selectedShift.individualName}.`
      );
    } else {
      Alert.alert("Info", "This shift is already completed.");
    }
  };

  const handleOpenDailyNote = () => {
    if (!selectedShift) return;

    navigation.navigate("DailyNote", {
      shiftId: selectedShift.id,
      date: selectedShift.date,

      individualId: selectedShift.individualId,
      individualName: selectedShift.individualName,
      individualDob: selectedShift.individualDob,
      individualMa: selectedShift.individualMa,
      individualAddress: selectedShift.individualAddress,

      serviceCode: selectedShift.serviceCode,
      serviceName: selectedShift.service,

      scheduleStart: selectedShift.startTime,
      scheduleEnd: selectedShift.endTime,
      outcomeText: selectedShift.outcomeText,
    });
  };

  const renderShift = ({ item }: { item: Shift }) => {
    const isSelected = item.id === selectedId;

    let statusStyle = styles.statusNotStarted;
    let statusLabel = "Not started";

    if (item.status === "IN_PROGRESS") {
      statusStyle = styles.statusInProgress;
      statusLabel = "In progress";
    } else if (item.status === "COMPLETED") {
      statusStyle = styles.statusCompleted;
      statusLabel = "Completed";
    }

    return (
      <TouchableOpacity
        style={[styles.shiftCard, isSelected && styles.shiftCardSelected]}
        onPress={() => setSelectedId(item.id)}
      >
        <Text style={styles.shiftIndividual}>{item.individualName}</Text>
        <Text style={styles.shiftText}>{item.service}</Text>
        <Text style={styles.shiftText}>
          {item.startTime} – {item.endTime}
        </Text>
        <Text style={styles.shiftLocation}>{item.location}</Text>
        <Text style={[styles.status, statusStyle]}>{statusLabel}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header nhỏ phía trên */}
        <Text style={styles.appTitle}>Blue Angels Care Mobile</Text>
        <Text style={styles.subtitle}>Welcome, DSP!</Text>

        {/* Danh sách ca trực trong ngày */}
        <Text style={styles.sectionTitle}>Today&apos;s Shifts</Text>
        <FlatList
          data={mockShifts}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.shiftList}
          renderItem={renderShift}
        />

        {/* Action cho ca đang chọn */}
        {selectedShift && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCheckInOut}
            >
              <Text style={styles.primaryButtonText}>
                {selectedShift.status === "IN_PROGRESS"
                  ? "Check out"
                  : "Check in"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleOpenDailyNote}
            >
              <Text style={styles.secondaryButtonText}>Open Daily Note</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f2f4f7",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  shiftList: {
    paddingVertical: 8,
  },
  shiftCard: {
    width: 230,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  shiftCardSelected: {
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  shiftIndividual: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  shiftText: {
    fontSize: 14,
    color: "#4b5563",
  },
  shiftLocation: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
  status: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  statusNotStarted: {
    color: "#f97316",
  },
  statusInProgress: {
    color: "#2563eb",
  },
  statusCompleted: {
    color: "#16a34a",
  },
  actions: {
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
});
