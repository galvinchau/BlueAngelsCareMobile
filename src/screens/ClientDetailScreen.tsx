// src/screens/ClientDetailScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ClientsStackParamList } from "../../App";
import type { MobileShift } from "../types/mobileApi";
import { getIndividualTodayShifts } from "../api/mobileClient";

// ✅ Add: Unknown-visit API deps (same as ClientsScreen)
import { BACKEND_BASE_URL } from "../config";
import { getStaffInfo } from "../auth/authStorage";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientDetail">;

function getLocalDateYYYYMMDD(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function statusLabel(s: MobileShift["status"]) {
  if (s === "IN_PROGRESS") return "In progress";
  if (s === "COMPLETED") return "Completed";
  return "Not started";
}

function statusPillStyle(s: MobileShift["status"]) {
  if (s === "IN_PROGRESS") return styles.pillIn;
  if (s === "COMPLETED") return styles.pillDone;
  return styles.pillNot;
}

/**
 * Extract a human-friendly error message from fetch Response body.
 * Supports NestJS default error format:
 * { statusCode, message, error }
 */
async function readApiErrorMessage(res: Response): Promise<string> {
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    raw = "";
  }

  try {
    const data = raw ? JSON.parse(raw) : null;
    const msg = data?.message;

    if (Array.isArray(msg)) return msg.join("\n");
    if (typeof msg === "string" && msg.trim()) return msg.trim();

    if (typeof data?.error === "string" && data.error.trim())
      return data.error.trim();
    if (typeof data?.statusCode === "number") return `HTTP ${data.statusCode}`;
  } catch {
    // ignore
  }

  if (raw && raw.trim()) return raw.trim();
  return `HTTP ${res.status}`;
}

export default function ClientDetailScreen({ route, navigation }: Props) {
  const { individual } = route.params;
  const [unknownOpen, setUnknownOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<MobileShift[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const addressText = useMemo(() => {
    const parts = [individual.address1, individual.address2].filter(Boolean);
    return parts.join(", ");
  }, [individual.address1, individual.address2]);

  const openDirections = async () => {
    if (!addressText) {
      Alert.alert("Directions", "Address is not available for this client.");
      return;
    }

    const encoded = encodeURIComponent(addressText);
    const appleMapsUrl = `http://maps.apple.com/?q=${encoded}`;
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

    try {
      const canApple = await Linking.canOpenURL(appleMapsUrl);
      if (canApple) {
        await Linking.openURL(appleMapsUrl);
        return;
      }
    } catch {
      // ignore and fallback
    }

    try {
      await Linking.openURL(googleMapsUrl);
    } catch {
      Alert.alert("Directions", "Unable to open Maps on this device.");
    }
  };

  const loadTodayShifts = async () => {
    setLoading(true);
    setLoadErr(null);

    try {
      const date = getLocalDateYYYYMMDD();
      const items = await getIndividualTodayShifts({
        individualId: individual.id,
        date,
      });
      setShifts(items || []);
    } catch (e: any) {
      setLoadErr(String(e?.message || e || "Failed to load shifts"));
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [individual.id]);

  /**
   * ✅ Tap shift -> open Daily Note tab (Drawer route)
   * Works even if ClientDetail is inside a nested Stack.
   */
  const goToDailyNote = (shiftId: string) => {
    const params: any = { shiftId };

    // if staffId existed in route params (optional future), pass along
    const maybeStaffId = (route.params as any)?.staffId;
    const maybeStaffName = (route.params as any)?.staffName;
    const maybeStaffEmail = (route.params as any)?.staffEmail;
    if (maybeStaffId) params.staffId = maybeStaffId;
    if (maybeStaffName) params.staffName = maybeStaffName;
    if (maybeStaffEmail) params.staffEmail = maybeStaffEmail;

    // Try to navigate via parent (Drawer)
    try {
      const parentNav: any = (navigation as any).getParent?.();
      if (parentNav?.navigate) {
        parentNav.navigate("DailyNote", params);
        return;
      }
    } catch {
      // ignore
    }

    // Fallback: direct navigate (may work depending on setup)
    try {
      (navigation as any).navigate("DailyNote", params);
    } catch {
      Alert.alert(
        "Daily Note",
        "Unable to open Daily Note screen from here. Please open Daily Note from the menu."
      );
    }
  };

  /**
   * ✅ After created Unknown Visit shift -> open DailyNote
   */
  const handleUnknownVisitCreated = (shiftId: string) => {
    setUnknownOpen(false);
    goToDailyNote(shiftId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Client Info */}
        <View style={styles.card}>
          <Text style={styles.name}>{individual.fullName}</Text>

          {!!individual.maNumber && (
            <Row label="Medicaid ID" value={individual.maNumber} />
          )}
          {!!individual.phone && <Row label="Phone" value={individual.phone} />}

          {addressText ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionLabel}>Address</Text>
              {!!individual.address1 && (
                <Text style={styles.addr}>{individual.address1}</Text>
              )}
              {!!individual.address2 && (
                <Text style={styles.addr}>{individual.address2}</Text>
              )}
            </View>
          ) : null}
        </View>

        {/* Today’s Shifts */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today’s Shifts</Text>

            <Pressable
              onPress={loadTodayShifts}
              style={({ pressed }) => [
                styles.linkBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.linkText}>Refresh</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>Loading shifts...</Text>
            </View>
          ) : loadErr ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.warnText}>{loadErr}</Text>
              <Text style={styles.muted}>
                Please try Refresh or check server deployment.
              </Text>
            </View>
          ) : shifts.length === 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.muted}>No shifts found for today.</Text>
            </View>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              {shifts.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => goToDailyNote(s.id)}
                  style={({ pressed }) => [
                    styles.shiftCard,
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={styles.shiftTop}>
                    <Text style={styles.shiftTime}>
                      {s.scheduleStart} - {s.scheduleEnd}
                    </Text>

                    <View style={[styles.pill, statusPillStyle(s.status)]}>
                      <Text style={styles.pillText}>
                        {statusLabel(s.status)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.shiftService}>
                    {s.serviceName} ({s.serviceCode})
                  </Text>

                  <View style={styles.shiftMetaRow}>
                    <Text style={styles.shiftMetaK}>Visit:</Text>
                    <Text style={styles.shiftMetaV}>
                      {s.visitStart && s.visitEnd
                        ? `${s.visitStart} - ${s.visitEnd}`
                        : "—"}
                    </Text>
                  </View>

                  {!!s.location && (
                    <View style={styles.shiftMetaRow}>
                      <Text style={styles.shiftMetaK}>Location:</Text>
                      <Text style={styles.shiftMetaV}>{s.location}</Text>
                    </View>
                  )}

                  <Text style={styles.tapHint}>Tap to open Daily Note</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <Pressable
            onPress={() => setUnknownOpen(true)}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.btnText}>Start Unknown Visit</Text>
          </Pressable>

          <Pressable
            onPress={openDirections}
            style={({ pressed }) => [
              styles.btnSecondary,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.btnSecondaryText}>Directions</Text>
          </Pressable>
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Unknown Visit Modal */}
      <UnknownVisitModal
        visible={unknownOpen}
        onClose={() => setUnknownOpen(false)}
        presetFullName={individual.fullName}
        presetMedicaidId={individual.maNumber || ""}
        onCreated={handleUnknownVisitCreated}
      />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

// =======================
// Unknown Visit Modal (REAL backend call)
// =======================
function UnknownVisitModal({
  visible,
  onClose,
  presetFullName,
  presetMedicaidId,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  presetFullName?: string;
  presetMedicaidId?: string;
  onCreated: (shiftId: string) => void;
}) {
  const initial = useMemo(() => {
    const full = (presetFullName || "").trim();
    const parts = full.split(" ").filter(Boolean);
    if (parts.length <= 1) return { first: full, last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  }, [presetFullName]);

  const [firstName, setFirstName] = useState(initial.first);
  const [lastName, setLastName] = useState(initial.last);
  const [medicaidId, setMedicaidId] = useState(presetMedicaidId || "");
  const [clientId, setClientId] = useState("");
  const [groupCode, setGroupCode] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // When modal opens for a different individual, refresh defaults
    setFirstName(initial.first);
    setLastName(initial.last);
    setMedicaidId(presetMedicaidId || "");
    // keep clientId/groupCode empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.first, initial.last, presetMedicaidId, visible]);

  const canStart = firstName.trim().length > 0 && lastName.trim().length > 0;

  const startVisit = async () => {
    if (!canStart || submitting) return;

    const staff = await getStaffInfo();
    if (!staff?.staffId) {
      Alert.alert("Login required", "Missing staff info. Please log in again.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        staffId: staff.staffId,
        staffName: staff.staffName,
        staffEmail: staff.email,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        medicaidId: medicaidId.trim() || null,
        clientId: clientId.trim() || null,

        // defaults
        serviceCode: "COMP",
        clientTime: new Date().toISOString(),
      };

      const url = `${BACKEND_BASE_URL}/mobile/visits/unknown/start`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await readApiErrorMessage(res);
        throw new Error(msg);
      }

      const data = await res.json();
      if (!data?.shiftId) throw new Error("Server response missing shiftId");

      onClose();
      onCreated(String(data.shiftId));
    } catch (e: any) {
      const msg = String(e?.message || e);
      Alert.alert("Start Unknown Visit failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const startGroupVisit = () =>
    Alert.alert("Start Group Visit", "Coming soon.");

  const joinGroupVisit = () => {
    if (!groupCode.trim()) {
      Alert.alert("Join Group Visit", "Please enter group visit code.");
      return;
    }
    Alert.alert("Join Group Visit", `Code: ${groupCode.trim()}\nComing soon.`);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Start Unknown Visit</Text>
            <Pressable
              onPress={() => {
                if (submitting) return;
                onClose();
              }}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalHint}>
            Please enter the client's name to continue.
          </Text>

          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First Name"
            placeholderTextColor={BAC.muted}
            style={styles.modalInput}
          />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last Name"
            placeholderTextColor={BAC.muted}
            style={styles.modalInput}
          />
          <TextInput
            value={medicaidId}
            onChangeText={setMedicaidId}
            placeholder="Medicaid ID (optional)"
            placeholderTextColor={BAC.muted}
            style={styles.modalInput}
          />
          <TextInput
            value={clientId}
            onChangeText={setClientId}
            placeholder="Client ID (optional)"
            placeholderTextColor={BAC.muted}
            style={styles.modalInput}
          />

          <Pressable
            onPress={startVisit}
            disabled={!canStart || submitting}
            style={[
              styles.btn,
              !canStart || submitting ? styles.btnDisabled : null,
            ]}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.btnText}>Starting...</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>Start Visit</Text>
            )}
          </Pressable>

          <Pressable
            onPress={startGroupVisit}
            disabled={submitting}
            style={[styles.btnSecondary]}
          >
            <Text style={styles.btnSecondaryText}>Start Group Visit</Text>
          </Pressable>

          <View style={styles.divider} />

          <TextInput
            value={groupCode}
            onChangeText={setGroupCode}
            placeholder="Enter Group Visit Code"
            placeholderTextColor={BAC.muted}
            style={styles.modalInput}
          />

          <Pressable
            onPress={joinGroupVisit}
            disabled={submitting}
            style={[styles.btnSecondary]}
          >
            <Text style={styles.btnSecondaryText}>Join Group Visit</Text>
          </Pressable>

          <View style={{ height: 6 }} />
        </View>
      </View>
    </Modal>
  );
}

// =======================
// Theme
// =======================
const BAC = {
  bg: "#F3F6FF",
  panel: "#FFFFFF",
  border: "#D8E2FF",
  text: "#0D1B2A",
  muted: "#6B7280",
  primary: "#123B8A",
  primarySoft: "#9DB5E8",
  warn: "#9A5B00",
  soft: "#EFF4FF",

  greenBg: "#EAF7EF",
  yellowBg: "#FFF4DB",
  grayBg: "#EEF2FF",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BAC.bg },
  content: { padding: 16, gap: 12 },

  card: {
    backgroundColor: BAC.panel,
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 14,
    padding: 14,
  },

  name: { fontSize: 20, fontWeight: "900", color: BAC.text },

  row: { marginTop: 10 },
  k: { fontSize: 12, color: BAC.muted, fontWeight: "800" },
  v: { marginTop: 2, fontSize: 15, color: BAC.text, fontWeight: "700" },

  sectionLabel: { fontSize: 12, color: BAC.muted, fontWeight: "800" },
  addr: { marginTop: 4, fontSize: 14, color: BAC.text },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: BAC.text },
  muted: { marginTop: 6, fontSize: 13, color: BAC.muted },

  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
  },
  linkText: { color: BAC.primary, fontWeight: "900", fontSize: 12 },

  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, color: BAC.muted, fontWeight: "700" },

  warnText: { color: BAC.warn, fontWeight: "800", fontSize: 13 },

  shiftCard: {
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 12,
    padding: 12,
  },
  shiftTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  shiftTime: { fontSize: 14, fontWeight: "900", color: BAC.text },
  shiftService: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "800",
    color: BAC.text,
  },
  shiftMetaRow: { marginTop: 6, flexDirection: "row", gap: 6 },
  shiftMetaK: { fontSize: 12, color: BAC.muted, fontWeight: "900" },
  shiftMetaV: { fontSize: 12, color: BAC.text, fontWeight: "700" },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  pillText: { fontSize: 11, fontWeight: "900", color: BAC.text },
  pillIn: { backgroundColor: BAC.yellowBg },
  pillDone: { backgroundColor: BAC.greenBg },
  pillNot: { backgroundColor: BAC.grayBg },

  tapHint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "800",
    color: BAC.muted,
  },

  btn: {
    marginTop: 12,
    backgroundColor: BAC.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnDisabled: { backgroundColor: BAC.primarySoft },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 15 },

  btnSecondary: {
    marginTop: 10,
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnSecondaryText: { color: BAC.primary, fontWeight: "900", fontSize: 15 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#e6eaf5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: BAC.text },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BAC.soft,
  },
  modalCloseText: { fontSize: 16, fontWeight: "900", color: BAC.text },
  modalHint: { marginBottom: 10, fontSize: 12, color: BAC.muted },
  modalInput: {
    marginTop: 10,
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: BAC.text,
  },
  divider: {
    marginTop: 12,
    marginBottom: 4,
    height: 1,
    backgroundColor: "#e6eaf5",
  },
});
