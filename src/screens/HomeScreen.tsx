// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

// Tạm thời hard-code; sau này lấy từ Login
const STAFF_ID = "cmhtcungm0000jm04gf80ym4w";

/** (Hiện chưa dùng – để lại phòng khi cần format ISO -> HH:MM) */
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
  const [todayLabel, setTodayLabel] = useState("");

  const selectedShift = shifts[selectedIndex];

  /** Tính ngày hôm nay theo định dạng YYYY-MM-DD (dùng cho API) */
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
    // Label Today • Sat, Nov 22
    const d = new Date();
    const dateText = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    setTodayLabel(dateText);

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

  /** Xử lý bấm nút Check in / Check out cho shift đang chọn */
  const handleCheckInOut = async () => {
    if (!selectedShift) {
      Alert.alert("No shift", "No shift selected.");
      return;
    }

    try {
      setChecking(true);

      if (selectedShift.status === "IN_PROGRESS") {
        // ===== CHECK OUT =====
        await checkOutShift(String(selectedShift.id), STAFF_ID);
        console.log("Check-out OK for shift", selectedShift.id);

        await loadShifts();
        Alert.alert("Check out", "You have checked out successfully.");
      } else {
        if (selectedShift.status === "COMPLETED") {
          Alert.alert("Info", "This shift is already completed.");
          return;
        }

        // ===== CHECK IN =====
        await checkInShift(String(selectedShift.id), STAFF_ID);
        console.log("Check-in OK for shift", selectedShift.id);

        await loadShifts();
        Alert.alert("Check in", "You have checked in successfully.");
      }
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
        {/* App header với logo + tên app */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Image
            source={require("../../assets/adaptive-icon.png")}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              marginRight: 10,
            }}
          />
          <View>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "800",
                color: "#111827",
              }}
            >
              Blue Angels Care
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "500",
                color: "#6B7280",
              }}
            >
              Mobile DSP Companion
            </Text>
          </View>
        </View>

        {/* Welcome text */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "800",
            color: "#111827",
            marginBottom: 4,
          }}
        >
          Welcome, DSP!
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: "#6B7280",
            marginBottom: 18,
          }}
        >
          Today • {todayLabel || ""}
        </Text>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: "#111827",
            marginBottom: 10,
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
              padding: 14,
              borderRadius: 16,
              backgroundColor: "#E5E7EB",
            }}
          >
            <Text style={{ color: "#4B5563", fontSize: 14 }}>
              You have no scheduled shifts for today.
            </Text>
          </View>
        )}

        {/* Danh sách nhiều shifts – chọn bằng cách bấm card */}
        {!loading && shifts.length > 0 && (
          <View style={{ gap: 12 }}>
            {shifts.map((shift, index) => {
              const isSelected = index === selectedIndex;
              return (
                <TouchableOpacity
                  key={shift.id}
                  activeOpacity={0.9}
                  onPress={() => setSelectedIndex(index)}
                  style={{
                    borderRadius: 20,
                    borderWidth: 2,
                    borderColor: isSelected ? "#2563EB" : "#E5E7EB",
                    backgroundColor: "#FFFFFF",
                    padding: 14,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: "800",
                      color: "#111827",
                      marginBottom: 4,
                    }}
                  >
                    {shift.individualName}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: 2,
                    }}
                  >
                    {shift.serviceCode} – {shift.serviceName}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      color: "#4B5563",
                      marginBottom: 2,
                    }}
                  >
                    {shift.scheduleStart} – {shift.scheduleEnd}
                  </Text>

                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      marginBottom: 6,
                    }}
                  >
                    {shift.location || "Community"}
                  </Text>

                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: getStatusColor(shift.status),
                    }}
                  >
                    {getStatusLabel(shift.status)}
                    {isSelected ? "  • Selected" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Check in / Check out cho shift đang chọn */}
        {shifts.length > 0 && selectedShift && (
          <TouchableOpacity
            onPress={handleCheckInOut}
            disabled={checking || isCheckButtonDisabled(selectedShift.status)}
            style={{
              backgroundColor: isCheckButtonDisabled(selectedShift.status)
                ? "#9CA3AF"
                : "#2563EB",
              paddingVertical: 12,
              borderRadius: 999,
              alignItems: "center",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: "800",
              }}
            >
              {checking
                ? "Processing..."
                : getCheckButtonLabel(selectedShift.status)}
            </Text>
          </TouchableOpacity>
        )}

        {/* Open Daily Note cho shift đang chọn */}
        {shifts.length > 0 && selectedShift && (
          <TouchableOpacity
            onPress={handleOpenDailyNote}
            style={{
              backgroundColor: "#FFFFFF",
              borderWidth: 1,
              borderColor: "#111827",
              paddingVertical: 12,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#111827",
                fontSize: 16,
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
