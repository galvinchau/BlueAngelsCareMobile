import React, { useEffect, useState } from "react";
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

/** ============================
 *  Types
 *  ============================ */

type ShiftStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

type TodayShift = {
  id: string;
  date: string;

  individualId: string;
  individualName: string;
  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;

  serviceCode: string;
  serviceName: string;

  location: string;

  scheduleStart: string; // "08:00"
  scheduleEnd: string; // "12:00"

  visitStart?: string | null;
  visitEnd?: string | null;

  status: ShiftStatus;
  outcomeText?: string;
};

type TodayShiftsApiResponse = {
  shifts: Array<{
    id: string;
    date: string;

    individualId: string;
    individualName: string;
    individualDob?: string;
    individualMA?: string;
    individualAddress?: string;

    serviceCode: string;
    serviceName: string;

    location?: string;

    scheduleStart: string;
    scheduleEnd: string;

    visitStart?: string | null;
    visitEnd?: string | null;

    status: ShiftStatus;
    outcomeText?: string;
  }>;
};

/** ============================
 *  Config (tạm thời)
 *  ============================ */

// ⚠ IP của máy đang chạy NestJS (bac-api)
// Ở nhà hiện tại: 192.168.0.141
// Sau này nếu chạy ở máy khác chỉ cần sửa IP này.
const API_BASE = "http://192.168.0.141:3000";

export default function HomeScreen({ navigation }: Props) {
  const [shifts, setShifts] = useState<TodayShift[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** ============================
   *  Load Today’s Shifts from API
   *  ============================ */
  const loadTodayShifts = async () => {
    try {
      setLoading(true);
      setError(null);

      const staffId = "STAFF_DEMO"; // TODO: sau này lấy từ login

      // Lấy ngày hôm nay theo format YYYY-MM-DD
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      const date = `${yyyy}-${mm}-${dd}`;

      const url = `${API_BASE}/mobile/shifts/today?staffId=${encodeURIComponent(
        staffId
      )}&date=${date}`;

      console.log("[Home] Fetching today's shifts:", url);

      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error(
          "[Home] Error response",
          res.status,
          res.statusText,
          text
        );
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as TodayShiftsApiResponse;

      const mapped: TodayShift[] = (data.shifts || []).map((s) => ({
        id: s.id,
        date: s.date,

        individualId: s.individualId,
        individualName: s.individualName,
        individualDob: s.individualDob,
        individualMa: s.individualMA,
        individualAddress: s.individualAddress,

        serviceCode: s.serviceCode,
        serviceName: s.serviceName,

        location: s.location || "Home / Community",

        scheduleStart: s.scheduleStart,
        scheduleEnd: s.scheduleEnd,

        visitStart: s.visitStart,
        visitEnd: s.visitEnd,

        status: s.status,
        outcomeText: s.outcomeText,
      }));

      setShifts(mapped);

      // Nếu chưa có shift được chọn thì chọn cái đầu tiên
      if (!selectedId && mapped.length > 0) {
        setSelectedId(mapped[0].id);
      }

      console.log("[Home] Loaded shifts:", mapped.length);
    } catch (err: any) {
      console.error("[Home] Failed to load shifts:", err);
      setError(err?.message || "Failed to load today's shifts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTodayShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedShift =
    shifts.find((shift) => shift.id === selectedId) ?? null;

  /** ============================
   *  Actions
   *  ============================ */

  const handleCheckInOut = () => {
    if (!selectedShift) return;

    if (selectedShift.status === "NOT_STARTED") {
      Alert.alert(
        "Check in",
        `You checked in to ${selectedShift.individualName}. (frontend only)`
      );

      // Tạm thời chỉ cập nhật UI, chưa gọi API check-in
      setShifts((prev) =>
        prev.map((s) =>
          s.id === selectedShift.id ? { ...s, status: "IN_PROGRESS" } : s
        )
      );
    } else if (selectedShift.status === "IN_PROGRESS") {
      Alert.alert(
        "Check out",
        `You checked out from ${selectedShift.individualName}. (frontend only)`
      );

      setShifts((prev) =>
        prev.map((s) =>
          s.id === selectedShift.id ? { ...s, status: "COMPLETED" } : s
        )
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
      serviceName: selectedShift.serviceName,

      scheduleStart: selectedShift.scheduleStart,
      scheduleEnd: selectedShift.scheduleEnd,

      outcomeText: selectedShift.outcomeText,
    });
  };

  /** ============================
   *  Render shift card
   *  ============================ */

  const renderShift = ({ item }: { item: TodayShift }) => {
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
        <Text style={styles.shiftText}>{item.serviceName}</Text>
        <Text style={styles.shiftText}>
          {item.scheduleStart} – {item.scheduleEnd}
        </Text>
        <Text style={styles.shiftLocation}>{item.location}</Text>
        <Text style={[styles.status, statusStyle]}>{statusLabel}</Text>
      </TouchableOpacity>
    );
  };

  /** ============================
   *  Render
   *  ============================ */

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header nhỏ phía trên */}
        <Text style={styles.appTitle}>Blue Angels Care Mobile</Text>
        <Text style={styles.subtitle}>Welcome, DSP!</Text>

        {/* Danh sách ca trực trong ngày */}
        <Text style={styles.sectionTitle}>Today&apos;s Shifts</Text>

        {loading && (
          <Text style={styles.infoText}>Loading today&apos;s shifts...</Text>
        )}

        {!loading && error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {!loading && !error && shifts.length === 0 && (
          <Text style={styles.infoText}>
            No shifts scheduled for today.
          </Text>
        )}

        <FlatList
          data={shifts}
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
                  : selectedShift.status === "COMPLETED"
                  ? "Completed"
                  : "Check in"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleOpenDailyNote}
            >
              <Text style={styles.secondaryButtonText}>
                Open Daily Note
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

/** ============================
 *  Styles
 *  ============================ */

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
  infoText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#b91c1c",
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
