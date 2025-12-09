// src/screens/HomeScreen.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { MainDrawerParamList, RootStackParamList } from "../../App";
import type { MobileShift } from "../types/mobileApi";
import { getTodayShifts } from "../api/mobileClient";

type HomeScreenProps = NativeStackScreenProps<
  MainDrawerParamList & RootStackParamList,
  "Visits"
> &
  any;

export default function HomeScreen({ route, navigation }: HomeScreenProps) {
  const { staffId, staffName, staffEmail } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<MobileShift[]>([]);
  const [error, setError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Load today's shifts mỗi lần màn hình được focus
  useFocusEffect(
    useCallback(() => {
      if (!staffId) {
        // Nếu vì lý do gì đó không có staffId thì không call API
        return;
      }

      let isActive = true;

      async function load() {
        setLoading(true);
        setError(null);

        try {
          const data = await getTodayShifts(staffId, todayStr);
          if (isActive) {
            setShifts(data);
          }
        } catch (e) {
          console.error("[HomeScreen] load shifts error:", e);
          if (isActive) {
            setError("Could not load today's shifts. Please try again later.");
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        isActive = false;
      };
    }, [staffId, todayStr])
  );

  function handleOpenDailyNote() {
    if (!staffId) {
      Alert.alert(
        "Missing staff info",
        "Cannot open Daily Note because staff information is missing."
      );
      return;
    }

    if (!shifts || shifts.length === 0) {
      Alert.alert(
        "No shifts for today",
        "You have no shifts scheduled for today. Please contact the office if you think this is a mistake."
      );
      return;
    }

    const firstShift = shifts[0];

    navigation.navigate("DailyNote", {
      shiftId: firstShift.id,
      staffId,
      staffName,
      staffEmail,
    });
  }

  function handleOpenMenu() {
    navigation.openDrawer();
  }

  const nextShift = shifts[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Logo + title */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/bac-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.appTitle}>Blue Angels Care</Text>
      <Text style={styles.appSubtitle}>Mobile</Text>

      {staffName ? (
        <Text style={styles.welcomeText}>Welcome, {staffName}!</Text>
      ) : null}

      <Text style={styles.description}>
        Quick access to{" "}
        <Text style={styles.highlight}>today&apos;s shifts</Text> and{" "}
        <Text style={styles.highlight}>Daily Notes</Text> for DSPs.
      </Text>

      {/* Shift summary */}
      <View style={styles.summaryBox}>
        {loading ? (
          <View style={styles.summaryRow}>
            <ActivityIndicator color="#a5b4fc" />
            <Text style={styles.summaryText}>
              {" "}
              Loading today&apos;s shifts…
            </Text>
          </View>
        ) : error ? (
          <Text style={styles.summaryError}>{error}</Text>
        ) : shifts.length === 0 ? (
          <Text style={styles.summaryText}>
            You have no scheduled shifts for today ({todayStr}).
          </Text>
        ) : (
          <>
            <Text style={styles.summaryText}>
              You have{" "}
              <Text style={styles.summaryHighlight}>{shifts.length}</Text> shift
              {shifts.length > 1 ? "s" : ""} today.
            </Text>
            {nextShift && (
              <Text style={styles.nextShiftText}>
                Next shift: {nextShift.serviceName} • {nextShift.scheduleStart}{" "}
                – {nextShift.scheduleEnd}
              </Text>
            )}
          </>
        )}
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleOpenDailyNote}
      >
        <Text style={styles.primaryButtonText}>Open Daily Note</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenMenu}>
        <Text style={styles.secondaryButtonText}>Open Menu</Text>
      </TouchableOpacity>

      {/* Tips box */}
      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>Tips</Text>
        <Text style={styles.tipsText}>
          • Use the side menu to switch between Visits, Daily Note, Clients,
          Settings and Help & Support.
        </Text>
        <Text style={styles.tipsText}>
          • If you have trouble logging in, contact the Blue Angels Care office.
        </Text>
      </View>

      <Text style={styles.footerText}>
        Blue Angels Care • Mobile EVV & Daily Note
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  content: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  logoContainer: {
    width: 180,
    height: 180,
    borderRadius: 40,
    overflow: "hidden",
    marginBottom: 24,
    backgroundColor: "#0b1120",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f9fafb",
    textAlign: "center",
  },
  appSubtitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#22c55e",
    marginBottom: 16,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: "#e5e7eb",
    marginBottom: 4,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  highlight: {
    fontWeight: "700",
    color: "#e5e7eb",
  },
  summaryBox: {
    width: "100%",
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryText: {
    fontSize: 14,
    color: "#e5e7eb",
  },
  summaryHighlight: {
    fontWeight: "700",
    color: "#22c55e",
  },
  summaryError: {
    fontSize: 14,
    color: "#fecaca",
  },
  nextShiftText: {
    fontSize: 14,
    color: "#a5b4fc",
    marginTop: 4,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#022c22",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginBottom: 20,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  tipsBox: {
    width: "100%",
    backgroundColor: "#020617",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 16,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    color: "#d1d5db",
    marginBottom: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
});
