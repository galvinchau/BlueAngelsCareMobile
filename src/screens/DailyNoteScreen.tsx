// src/screens/DailyNoteScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  getTodayShifts,
  checkInShift,
  checkOutShift,
} from "../api/mobileClient";
import type { MobileShift } from "../types/mobileApi";

type DailyNoteScreenProps = {
  navigation: any;
  route: {
    params?: {
      shiftId?: string;
      staffId?: string;
      staffName?: string;
      staffEmail?: string;
      // optional: có thể truyền cả shift từ HomeScreen trong tương lai
      shift?: MobileShift;
    };
  };
};

function formatDateYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeFromIso(iso?: string | null): string {
  if (!iso) return "--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "--:--";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

const DailyNoteScreen: React.FC<DailyNoteScreenProps> = ({
  navigation,
  route,
}) => {
  const params = route?.params || {};
  const shiftId = params.shiftId;
  const staffId = params.staffId;
  const staffName = params.staffName;
  const staffEmail = params.staffEmail;

  const [shift, setShift] = useState<MobileShift | null>(params.shift ?? null);
  const [loading, setLoading] = useState<boolean>(!params.shift);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const todayYmd = formatDateYMD(new Date());

  const hasCheckedIn = !!shift?.visitStart;
  const hasCheckedOut = !!shift?.visitEnd;

  // ===========================
  // Load shift detail (nếu chưa có)
  // ===========================
  useEffect(() => {
    async function loadShift() {
      if (!shiftId || !staffId) {
        setError("Missing shiftId or staffId. Please go back and try again.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setMessage(null);

        const todaysShifts = await getTodayShifts(staffId, todayYmd);
        const found = todaysShifts.find((s) => s.id === shiftId) ?? null;

        if (!found) {
          setError(
            "Could not find this shift in today's list. Please contact the office."
          );
        }

        setShift(found);
      } catch (e) {
        console.error("[DailyNoteScreen] loadShift error:", e);
        setError("Failed to load shift information. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (!shift && shiftId && staffId) {
      loadShift();
    }
  }, [shift, shiftId, staffId, todayYmd]);

  // ===========================
  // Check In
  // ===========================
  async function handleCheckIn() {
    if (!shift || !staffId) return;

    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res: any = await checkInShift(shift.id, staffId);

      // backend có thể trả về shift mới trong res.shift
      const updated: MobileShift = res?.shift
        ? {
            ...shift,
            ...res.shift,
          }
        : {
            ...shift,
            visitStart: new Date().toISOString(),
            status: "IN_PROGRESS",
          };

      setShift(updated);
      setMessage("Checked in successfully.");
    } catch (e) {
      console.error("[DailyNoteScreen] handleCheckIn error:", e);
      setError("Failed to check in. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // ===========================
  // Check Out
  // ===========================
  async function handleCheckOut() {
    if (!shift || !staffId) return;

    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res: any = await checkOutShift(shift.id, staffId);

      const updated: MobileShift = res?.shift
        ? {
            ...shift,
            ...res.shift,
          }
        : {
            ...shift,
            visitEnd: new Date().toISOString(),
            status: "COMPLETED",
          };

      setShift(updated);
      setMessage("Checked out successfully.");
    } catch (e) {
      console.error("[DailyNoteScreen] handleCheckOut error:", e);
      setError("Failed to check out. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  // ===========================
  // UI
  // ===========================
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Loading shift...</Text>
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Daily Note</Text>
        <Text style={styles.errorText}>
          No shift data found. Please go back to Visits and try again.
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Back to Visits</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.pageTitle}>Daily Note</Text>
      <Text style={styles.pageSubtitle}>
        {shift.individualName || "Individual"} • {shift.serviceName}
      </Text>

      {/* Shift summary card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shift Details</Text>

        <Text style={styles.label}>DSP</Text>
        <Text style={styles.value}>{staffName || "Current DSP"}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{staffEmail || "-"}</Text>

        <Text style={styles.label}>Individual</Text>
        <Text style={styles.value}>{shift.individualName || "-"}</Text>

        <Text style={styles.label}>Service</Text>
        <Text style={styles.value}>{shift.serviceName}</Text>

        <Text style={styles.label}>Schedule</Text>
        <Text style={styles.value}>
          {shift.scheduleStart} – {shift.scheduleEnd} ({shift.location})
        </Text>

        <Text style={styles.label}>Check-in</Text>
        <Text style={styles.value}>
          {hasCheckedIn ? formatTimeFromIso(shift.visitStart) : "Not yet"}
        </Text>

        <Text style={styles.label}>Check-out</Text>
        <Text style={styles.value}>
          {hasCheckedOut ? formatTimeFromIso(shift.visitEnd) : "Not yet"}
        </Text>

        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>
          {shift.status === "COMPLETED"
            ? "Completed"
            : shift.status === "IN_PROGRESS"
            ? "In progress"
            : "Not started"}
        </Text>
      </View>

      {/* Actions */}
      {error ? <Text style={styles.errorMessage}>{error}</Text> : null}
      {message ? <Text style={styles.infoMessage}>{message}</Text> : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            hasCheckedIn || actionLoading ? styles.disabledButton : null,
          ]}
          disabled={hasCheckedIn || actionLoading}
          onPress={handleCheckIn}
        >
          {actionLoading && !hasCheckedIn ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.primaryButtonText}>Check In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            !hasCheckedIn || hasCheckedOut || actionLoading
              ? styles.disabledButton
              : null,
          ]}
          disabled={!hasCheckedIn || hasCheckedOut || actionLoading}
          onPress={handleCheckOut}
        >
          {actionLoading && hasCheckedIn && !hasCheckedOut ? (
            <ActivityIndicator color="#e5e7eb" />
          ) : (
            <Text style={styles.secondaryButtonText}>Check Out</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backLinkText}>Back to Visits</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default DailyNoteScreen;

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#020617",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#020617",
  },
  centerContainer: {
    flex: 1,
    backgroundColor: "#020617",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#e5e7eb",
    fontSize: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginBottom: 4,
    textAlign: "center",
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#9ca3af",
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 6,
  },
  value: {
    fontSize: 15,
    color: "#e5e7eb",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  secondaryButtonText: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  errorText: {
    color: "#fecaca",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#22c55e",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  backButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorMessage: {
    color: "#fecaca",
    marginBottom: 8,
    fontSize: 14,
  },
  infoMessage: {
    color: "#a5b4fc",
    marginBottom: 8,
    fontSize: 14,
  },
  backLink: {
    marginTop: 8,
    alignItems: "center",
  },
  backLinkText: {
    color: "#93c5fd",
    fontSize: 14,
  },
});
