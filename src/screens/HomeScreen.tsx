// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";
import type { MobileShift } from "../types/mobileApi";
import {
  getTodayShifts,
  checkInShift,
  checkOutShift,
} from "../api/mobileClient";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const STAFF_ID = "STAFF_DEMO";

/** Đổi ISO time từ backend -> HH:MM local (24h) */
const formatTimeHM = (iso: string | undefined | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
};

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const [shifts, setShifts] = useState<MobileShift[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const selectedShift = shifts[selectedIndex];

  /** Tính ngày hôm nay theo định dạng YYYY-MM-DD */
  const getTodayDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  /** Load today's shifts từ API */
  const loadShifts = async () => {
    try {
      setLoading(true);
      const today = getTodayDate();
      const data = await getTodayShifts(STAFF_ID, today);
      setShifts(data || []);
      setSelectedIndex(0);
    } catch (err: any) {
      console.error("Load shifts error:", err);
      Alert.alert("Error", "Failed to load today shifts from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  /** Label hiển thị theo status backend */
  const getStatusLabel = (status: MobileShift["status"]) => {
    switch (status) {
      case "IN_PROGRESS":
        return "In progress";
      case "COMPLETED":
        return "Completed";
      default:
        return "Not started";
    }
  };

  /** Màu chữ status */
  const getStatusColor = (status: MobileShift["status"]) => {
    switch (status) {
      case "IN_PROGRESS":
        return "#2563EB"; // blue
      case "COMPLETED":
        return "#16A34A"; // green
      default:
        return "#EA580C"; // orange
    }
  };

  /** Text trên button Check in / Check out */
  const getCheckButtonLabel = (status: MobileShift["status"]) => {
    if (status === "IN_PROGRESS") return "Check out";
    if (status === "COMPLETED") return "Completed";
    return "Check in";
  };

  const isCheckButtonDisabled = (status: MobileShift["status"]) =>
    status === "COMPLETED";

  /** Xử lý bấm nút Check in / Check out */
  const handleCheckInOut = async () => {
    if (!selectedShift) {
      Alert.alert("No shift", "No shift selected.");
      return;
    }

    try {
      setChecking(true);

      if (selectedShift.status === "IN_PROGRESS") {
        // ===== CHECK OUT =====
        const res = await checkOutShift(String(selectedShift.id), STAFF_ID);
        console.log("Check-out OK for shift", selectedShift.id, res);

        const visitEndLocal = formatTimeHM(res.time);

        // Cập nhật local state để UI & DailyNote dùng được ngay
        setShifts((prev) =>
          prev.map((s) =>
            s.id === selectedShift.id
              ? {
                  ...s,
                  status: "COMPLETED",
                  visitEnd: visitEndLocal,
                }
              : s
          )
        );

        Alert.alert("Check out", "You have checked out successfully.");
      } else {
        // NOT_STARTED (cho check in), COMPLETED thì chặn
        if (selectedShift.status === "COMPLETED") {
          Alert.alert("Info", "This shift is already completed.");
          return;
        }

        // ===== CHECK IN =====
        const res = await checkInShift(String(selectedShift.id), STAFF_ID);
        console.log("Check-in OK for shift", selectedShift.id, res);

        const visitStartLocal = formatTimeHM(res.time);

        setShifts((prev) =>
          prev.map((s) =>
            s.id === selectedShift.id
              ? {
                  ...s,
                  status: "IN_PROGRESS",
                  visitStart: visitStartLocal,
                }
              : s
          )
        );

        Alert.alert("Check in", "You have checked in successfully.");
      }

      // Sau khi update local, vẫn reload lại từ backend cho chắc
      await loadShifts();
    } catch (err: any) {
      console.error("Check in/out error:", err);
      Alert.alert("Error", "Failed to perform check in/out.");
    } finally {
      setChecking(false);
    }
  };

  /** Mở màn Daily Note cho ca đang chọn */
  const handleOpenDailyNote = () => {
    if (!selectedShift) {
      Alert.alert("No shift", "No shift selected.");
      return;
    }

    navigation.navigate("DailyNote", {
      shiftId: String(selectedShift.id),
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
      // NEW: truyền visitStart / visitEnd cho DailyNote auto-fill
      visitStart: selectedShift.visitStart ?? "",
      visitEnd: selectedShift.visitEnd ?? "",
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F4F6" }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
      >
        {/* Header */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            textAlign: "center",
            marginBottom: 16,
            color: "#111827",
          }}
        >
          Blue Angels Care
        </Text>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: "#111827",
            marginBottom: 4,
          }}
        >
          Blue Angels Care Mobile
        </Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#4B5563",
            marginBottom: 20,
          }}
        >
          Welcome, DSP!
        </Text>

        <Text
          style={{
            fontSize: 20,
            fontWeight: "800",
            color: "#111827",
            marginBottom: 12,
          }}
        >
          Today&apos;s Shifts
        </Text>

        {loading && (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        )}

        {!loading && shifts.length === 0 && (
          <View
            style={{
              padding: 16,
              borderRadius: 16,
              backgroundColor: "#E5E7EB",
            }}
          >
            <Text style={{ color: "#4B5563" }}>
              You have no scheduled shifts for today.
            </Text>
          </View>
        )}

        {!loading && shifts.length > 0 && selectedShift && (
          <TouchableOpacity
            activeOpacity={0.9}
            style={{
              borderRadius: 24,
              borderWidth: 2,
              borderColor: "#2563EB",
              backgroundColor: "#FFFFFF",
              padding: 16,
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              {selectedShift.individualName}
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#111827",
                marginBottom: 4,
              }}
            >
              {selectedShift.serviceCode} – {selectedShift.serviceName}
            </Text>

            <Text
              style={{
                fontSize: 18,
                color: "#4B5563",
                marginBottom: 4,
              }}
            >
              {selectedShift.scheduleStart} – {selectedShift.scheduleEnd}
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#6B7280",
                marginBottom: 8,
              }}
            >
              {selectedShift.location}
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: getStatusColor(selectedShift.status),
              }}
            >
              {getStatusLabel(selectedShift.status)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Check in / Check out button */}
        {shifts.length > 0 && selectedShift && (
          <TouchableOpacity
            onPress={handleCheckInOut}
            disabled={checking || isCheckButtonDisabled(selectedShift.status)}
            style={{
              backgroundColor: isCheckButtonDisabled(selectedShift.status)
                ? "#9CA3AF"
                : "#2563EB",
              paddingVertical: 14,
              borderRadius: 999,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              {checking
                ? "Processing..."
                : getCheckButtonLabel(selectedShift.status)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Open Daily Note */}
        {shifts.length > 0 && selectedShift && (
          <TouchableOpacity
            onPress={handleOpenDailyNote}
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#111827",
              paddingVertical: 14,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#111827",
                fontSize: 18,
                fontWeight: "800",
              }}
            >
              Open Daily Note
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

export default HomeScreen;
export { HomeScreen };
