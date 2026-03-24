// src/screens/VisitCheckInOutScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import type { MobileShift } from "../types/mobileApi";
import {
  checkInShift,
  checkOutShift,
  getShiftsWindow,
} from "../api/mobileClient";

type Props = {
  navigation: any;
  route: {
    params?: {
      shiftId?: string;
      shift?: MobileShift;
      staffId?: string;
      staffName?: string;
      staffEmail?: string;
    };
  };
};

function getLocalDateYYYYMMDD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TZ = "America/New_York";

function formatHHmmInTZ(d: Date, timeZone = TZ): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(d);

    const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
    const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
    return `${hh}:${mm}`;
  } catch {
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function formatVisitTimeForDisplay(
  _dateStr: string | undefined,
  value: string | null | undefined
): string {
  if (!value) return "—";

  const v = String(value).trim();

  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  if (m) {
    const hh = String(Number(m[1])).padStart(2, "0");
    const mm = String(Number(m[2])).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (v.includes("T")) {
    const dt = new Date(v);
    if (!Number.isNaN(dt.getTime())) return formatHHmmInTZ(dt, TZ);
  }

  return v;
}

type CoordsLite = {
  lat: number;
  lng: number;
  accuracy?: number | null;
  timestamp?: number;
};

async function tryGetLocationWithExpo(timeoutMs = 12000): Promise<CoordsLite> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Location = require("expo-location");

  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm?.status !== "granted") {
    throw new Error("Location permission not granted");
  }

  const getLocPromise = Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("GPS timeout")), timeoutMs)
  );

  const loc = (await Promise.race([getLocPromise, timeoutPromise])) as any;

  const lat = Number(loc?.coords?.latitude);
  const lng = Number(loc?.coords?.longitude);
  const accuracy = loc?.coords?.accuracy ?? null;
  const timestamp = loc?.timestamp ?? Date.now();

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("GPS coordinates unavailable");
  }

  return { lat, lng, accuracy, timestamp };
}

function statusLabel(s?: MobileShift["status"]) {
  if (s === "IN_PROGRESS") return "IN_PROGRESS";
  if (s === "COMPLETED") return "COMPLETED";
  return "NOT_STARTED";
}

export default function VisitCheckInOutScreen({ navigation, route }: Props) {
  const params = route?.params || {};
  const staffId = params.staffId;
  const staffName = params.staffName || "";
  const staffEmail = params.staffEmail || "";

  const routeShiftId = params.shiftId ?? params.shift?.id;
  const [shift, setShift] = useState<MobileShift | null>(params.shift ?? null);
  const initialShiftRef = useRef<MobileShift | null>(params.shift ?? null);

  const [loadingShift, setLoadingShift] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [useGps, setUseGps] = useState(true);
  const [gps, setGps] = useState<CoordsLite | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsReason, setGpsReason] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);

  const ACCURACY_BAD_METERS = 200;

  const canCheckIn =
    !!shift && shift.status === "NOT_STARTED" && !loadingShift;

  const canCheckOut =
    !!shift && shift.status !== "COMPLETED" && !loadingShift;

  async function refreshShift(reason: string) {
    if (!staffId || !routeShiftId) return;

    const baseDate =
      shift?.date ?? initialShiftRef.current?.date ?? getLocalDateYYYYMMDD();

    console.log(
      "[VisitCheckInOut] refreshShift start:",
      reason,
      "routeShiftId=",
      routeShiftId,
      "baseDate=",
      baseDate
    );

    setLoadingShift(true);
    try {
      const window = await getShiftsWindow(staffId, baseDate);
      const found = window.find((x) => x.id === routeShiftId) || null;

      if (found) {
        setShift(found);
      } else {
        console.log(
          "[VisitCheckInOut] refreshShift: target shift not found, keeping current shift state"
        );
      }
    } catch (e: any) {
      console.log("[VisitCheckInOut] refreshShift error:", e?.message || e);
    } finally {
      setLoadingShift(false);
    }
  }

  useEffect(() => {
    if (params.shift) {
      setShift(params.shift);
      initialShiftRef.current = params.shift;
      return;
    }

    refreshShift("screen_open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, routeShiftId]);

  async function handleRefreshGPS(): Promise<CoordsLite | null> {
    setGpsLoading(true);
    setGpsError(null);

    try {
      const coords = await tryGetLocationWithExpo(12000);
      setGps(coords);

      if ((coords.accuracy ?? 0) > ACCURACY_BAD_METERS) {
        setGpsError(
          `Low GPS accuracy (${Math.round(
            coords.accuracy || 0
          )}m). You may proceed without GPS (Reason required).`
        );
      }

      return coords;
    } catch (e: any) {
      const msg = String(e?.message || e);
      setGps(null);
      setGpsError(msg);
      return null;
    } finally {
      setGpsLoading(false);
    }
  }

  async function ensureGpsOrReasonBeforeProceed(): Promise<CoordsLite | null> {
    if (!useGps) {
      if (!gpsReason.trim()) {
        Alert.alert(
          "GPS Reason required",
          "Please enter a reason for not using GPS."
        );
        return null;
      }
      return null;
    }

    let currentGps = gps;

    if (!currentGps) {
      try {
        currentGps = await handleRefreshGPS();
      } catch {
        currentGps = null;
      }
    }

    if (currentGps) {
      if ((currentGps.accuracy ?? 0) > ACCURACY_BAD_METERS) {
        return await new Promise((resolve) => {
          Alert.alert(
            "Low GPS accuracy",
            `GPS accuracy is low (${Math.round(
              currentGps?.accuracy || 0
            )}m).\n\nDo you want to proceed without GPS? (Reason required)`,
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(null),
              },
              {
                text: "Proceed",
                style: "default",
                onPress: () => {
                  if (!gpsReason.trim()) {
                    Alert.alert(
                      "GPS Reason required",
                      "Please enter a reason to proceed without GPS."
                    );
                    resolve(null);
                    return;
                  }
                  resolve(null);
                },
              },
            ]
          );
        });
      }

      return currentGps;
    }

    return await new Promise((resolve) => {
      Alert.alert(
        "GPS not available",
        "GPS is not available on this device or there is no signal.\n\nDo you want to proceed without GPS? (Reason required)",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
          {
            text: "Proceed",
            style: "default",
            onPress: () => {
              if (!gpsReason.trim()) {
                Alert.alert(
                  "GPS Reason required",
                  "Please enter a reason to proceed without GPS."
                );
                resolve(null);
                return;
              }
              resolve(null);
            },
          },
        ]
      );
    });
  }

  async function onCheckIn() {
    if (!shift || !staffId) {
      Alert.alert("Visit", "Missing shift or staff information.");
      return;
    }

    const coords = await ensureGpsOrReasonBeforeProceed();
    if (useGps && !coords) return;
    if (!useGps && !gpsReason.trim()) return;

    setCheckinLoading(true);
    try {
      await checkInShift(
        shift.id,
        staffId,
        coords?.lat,
        coords?.lng
      );
      await refreshShift("after_check_in");
      Alert.alert("Check In", "Checked in successfully.");
    } catch (e: any) {
      Alert.alert("Unable to Check In", String(e?.message || e));
    } finally {
      setCheckinLoading(false);
    }
  }

  async function onCheckOut() {
    if (!shift || !staffId) {
      Alert.alert("Visit", "Missing shift or staff information.");
      return;
    }

    const coords = await ensureGpsOrReasonBeforeProceed();
    if (useGps && !coords) return;
    if (!useGps && !gpsReason.trim()) return;

    setCheckoutLoading(true);
    try {
      await checkOutShift(
        shift.id,
        staffId,
        coords?.lat,
        coords?.lng
      );
      await refreshShift("after_check_out");
      Alert.alert("Check Out", "Checked out successfully.");
    } catch (e: any) {
      Alert.alert("Unable to Check Out", String(e?.message || e));
    } finally {
      setCheckoutLoading(false);
    }
  }

  const title = useMemo(() => {
    if (!shift) return "Check In/Out";
    return `${shift.individualName} • ${shift.serviceName}`;
  }, [shift]);

  const visitDisplay = useMemo(() => {
    if (!shift?.visitStart && !shift?.visitEnd) return "—";

    const start = formatVisitTimeForDisplay(shift?.date, shift?.visitStart);
    const end = formatVisitTimeForDisplay(shift?.date, shift?.visitEnd);

    if (start !== "—" && end !== "—") return `${start} – ${end}`;
    if (start !== "—") return `${start} – —`;
    if (end !== "—") return `— – ${end}`;
    return "—";
  }, [shift]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Shift Detail</Text>

        <Row label="DSP" value={staffName || "—"} />
        <Row label="Email" value={staffEmail || "—"} />
        <Row label="Date" value={shift?.date || "—"} />
        <Row
          label="Schedule"
          value={
            shift
              ? `${shift.scheduleStart} – ${shift.scheduleEnd} (${shift.location})`
              : "—"
          }
        />
        <Row
          label="Status"
          value={loadingShift ? "Loading..." : statusLabel(shift?.status)}
        />
        <Row label="Visit" value={visitDisplay} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>GPS</Text>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Use GPS</Text>
          <Switch
            value={useGps}
            onValueChange={(v) => setUseGps(v)}
            thumbColor={useGps ? "#22c55e" : "#f9fafb"}
            trackColor={{ false: "#4b5563", true: "#16a34a" }}
          />
        </View>

        {useGps ? (
          <>
            <TouchableOpacity
              style={[
                styles.btnSecondary,
                gpsLoading ? styles.btnDisabled : null,
              ]}
              onPress={handleRefreshGPS}
              disabled={gpsLoading}
            >
              {gpsLoading ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.btnSecondaryText}>Get GPS now</Text>
              )}
            </TouchableOpacity>

            <View style={{ marginTop: 10 }}>
              <Text style={styles.small}>
                Lat:{" "}
                <Text style={styles.value}>
                  {gps ? gps.lat.toFixed(6) : "—"}
                </Text>
              </Text>
              <Text style={styles.small}>
                Lng:{" "}
                <Text style={styles.value}>
                  {gps ? gps.lng.toFixed(6) : "—"}
                </Text>
              </Text>
              <Text style={styles.small}>
                Accuracy:{" "}
                <Text style={styles.value}>
                  {gps?.accuracy != null ? `${Math.round(gps.accuracy)}m` : "—"}
                </Text>
              </Text>
            </View>

            {gpsError ? <Text style={styles.warn}>{gpsError}</Text> : null}

            {(gpsError || !gps) ? (
              <>
                <Text style={styles.label}>Reason (GPS not available)</Text>
                <TextInput
                  value={gpsReason}
                  onChangeText={setGpsReason}
                  placeholder="Explain why GPS is not used / not available."
                  placeholderTextColor="#6b7280"
                  style={styles.textArea}
                  multiline
                />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.label}>Reason (GPS not used)</Text>
            <TextInput
              value={gpsReason}
              onChangeText={setGpsReason}
              placeholder="Explain why GPS is not used."
              placeholderTextColor="#6b7280"
              style={styles.textArea}
              multiline
            />
          </>
        )}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            !canCheckIn || checkinLoading ? styles.btnDisabled : null,
          ]}
          onPress={onCheckIn}
          disabled={!canCheckIn || checkinLoading}
        >
          {checkinLoading ? (
            <ActivityIndicator color="#022c22" />
          ) : (
            <Text style={styles.btnPrimaryText}>Check In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.btnDark,
            !canCheckOut || checkoutLoading ? styles.btnDisabled : null,
          ]}
          onPress={onCheckOut}
          disabled={!canCheckOut || checkoutLoading}
        >
          {checkoutLoading ? (
            <ActivityIndicator color="#e5e7eb" />
          ) : (
            <Text style={styles.btnDarkText}>Check Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.linkBack}
        onPress={() => navigation.navigate("Visits")}
      >
        <Text style={styles.linkBackText}>Back to Visits</Text>
      </TouchableOpacity>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginTop: 8 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 16, paddingBottom: 24 },

  title: {
    fontSize: 18,
    fontWeight: "900",
    color: "#e5e7eb",
    textAlign: "center",
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 16,
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#e5e7eb" },
  label: { marginTop: 8, fontSize: 12, color: "#9ca3af", fontWeight: "800" },
  value: { marginTop: 2, fontSize: 14, color: "#e5e7eb", fontWeight: "700" },

  small: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  warn: { marginTop: 10, color: "#fecaca", fontWeight: "700" },

  switchRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  textArea: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#020617",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e5e7eb",
    minHeight: 70,
    textAlignVertical: "top",
  },

  btnSecondary: {
    marginTop: 10,
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnSecondaryText: { color: "#93c5fd", fontWeight: "900" },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#022c22", fontSize: 16, fontWeight: "900" },
  btnDark: {
    flex: 1,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#4b5563",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  btnDarkText: { color: "#e5e7eb", fontSize: 16, fontWeight: "900" },

  btnDisabled: { opacity: 0.5 },

  linkBack: { marginTop: 16, alignItems: "center" },
  linkBackText: { color: "#93c5fd", fontSize: 15, fontWeight: "700" },
});