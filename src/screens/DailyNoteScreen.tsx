// src/screens/DailyNoteScreen.tsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import SignatureCanvas from "react-native-signature-canvas";

import type { MainDrawerParamList } from "../../App";
import type { MobileShift, MobileDailyNotePayload } from "../types/mobileApi";
import {
  checkInShift,
  checkOutShift,
  getTodayShifts,
  submitDailyNote,
} from "../api/mobileClient";

type DailyNoteScreenRouteParams = {
  shiftId?: string;
  shift?: MobileShift;
  staffId?: string;
  staffName?: string;
  staffEmail?: string;
};

type Props = NativeStackScreenProps<MainDrawerParamList, "DailyNote"> & {
  route: {
    params?: DailyNoteScreenRouteParams;
  };
};

type MealInfo = {
  time: string;
  had: string;
  offered: string;
};

/**
 * Return YYYY-MM-DD based on device local time (Pennsylvania)
 * (Avoid UTC date shift when using toISOString().slice(0,10))
 */
function getLocalDateYYYYMMDD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Convert server HH:mm (assumed UTC) to local HH:mm for display
 * Example: phone 12:45 (PA) but server returns 17:45 => show 12:45
 *
 * - If value looks like ISO (contains 'T') we just return as-is.
 * - If value is HH:mm, we treat it as UTC time for the given dateStr, then convert to device local.
 */
function formatVisitTimeForDisplay(
  dateStr: string | undefined,
  value: string | null | undefined
): string {
  if (!value) return "—";

  const v = String(value);

  // If backend already sends ISO or something complex, don't touch it
  if (v.includes("T")) return v;

  // If not HH:mm, don't touch
  const m = /^(\d{2}):(\d{2})$/.exec(v);
  if (!m) return v;

  // Need date to convert; if missing, just return v
  if (!dateStr) return v;

  // Treat as UTC: YYYY-MM-DDTHH:mm:00Z
  const isoUtc = `${dateStr}T${v}:00Z`;
  const dt = new Date(isoUtc);
  if (Number.isNaN(dt.getTime())) return v;

  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const DailyNoteScreen: React.FC<Props> = ({ navigation, route }) => {
  const params = route?.params ?? {};

  // ------------------------------------------------------------
  // Shift + staff info
  // ------------------------------------------------------------
  const [shift, setShift] = useState<MobileShift | null>(null);
  const [loadingShift, setLoadingShift] = useState<boolean>(false);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // ----- Daily note form states -----
  const [todayPlan, setTodayPlan] = useState("");
  const [whatWeWorkedOn, setWhatWeWorkedOn] = useState("");
  const [opportunities, setOpportunities] = useState("");

  const [healthNotes, setHealthNotes] = useState("");
  const [incidentNotes, setIncidentNotes] = useState("");

  const [mileage, setMileage] = useState("");
  const [isCanceled, setIsCanceled] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [meals, setMeals] = useState<{
    breakfast: MealInfo;
    lunch: MealInfo;
    dinner: MealInfo;
  }>({
    breakfast: { time: "", had: "", offered: "" },
    lunch: { time: "", had: "", offered: "" },
    dinner: { time: "", had: "", offered: "" },
  });

  const [submitLoading, setSubmitLoading] = useState(false);

  // ----- Signatures -----
  const [dspSignature, setDspSignature] = useState<string | null>(null);
  const [individualSignature, setIndividualSignature] = useState<string | null>(
    null
  );

  const [dspSignatureError, setDspSignatureError] = useState<string | null>(
    null
  );
  const [individualSignatureError, setIndividualSignatureError] = useState<
    string | null
  >(null);

  // refs cho canvas chữ ký
  const dspSignatureRef = useRef<any>(null);
  const individualSignatureRef = useRef<any>(null);

  const staffId = params.staffId;
  const staffName = params.staffName ?? "";
  const staffEmail = params.staffEmail ?? "";
  const routeShiftId = params.shiftId ?? (params.shift as any)?.id;

  const headerTitle = useMemo(() => {
    if (!shift) return "Daily Note";
    return `${shift.individualName ?? "Daily Note"}`;
  }, [shift]);

  const headerSubtitle = useMemo(() => {
    if (!shift) return "";
    return `${shift.serviceName ?? ""}`;
  }, [shift]);

  // ------------------------------------------------------------
  // Helper: reload shift từ server
  // ------------------------------------------------------------
  async function reloadShiftFromServer(reason: string) {
    if (!staffId) {
      console.log(
        "[DailyNoteScreen] reloadShiftFromServer skipped - missing staffId"
      );
      return;
    }

    console.log(
      "[DailyNoteScreen] reloadShiftFromServer start. Reason:",
      reason,
      "routeShiftId=",
      routeShiftId
    );

    setLoadingShift(true);
    setErrorMessage(null);

    try {
      // IMPORTANT: local date (PA), not UTC
      const todayStr = getLocalDateYYYYMMDD(); // yyyy-mm-dd (local)
      const shifts = await getTodayShifts(staffId, todayStr);

      console.log(
        "[DailyNoteScreen] reloadShiftFromServer got shifts:",
        JSON.stringify(shifts)
      );

      let targetId: string | undefined = routeShiftId ?? shift?.id ?? undefined;

      let found: MobileShift | null = null;

      if (targetId) {
        found = (shifts.find((s) => s.id === targetId) as MobileShift) ?? null;
      }

      if (!found && shifts.length === 1) {
        found = shifts[0] as MobileShift;
      }

      if (!found) {
        setShift(null);
        setErrorMessage(
          "No matching shift found for today. Please check your schedule."
        );
      } else {
        setShift(found);
      }
    } catch (e) {
      console.error("[DailyNoteScreen] reloadShiftFromServer error:", e);
      setErrorMessage(
        "Failed to load today’s shift. Please pull to refresh or contact the office."
      );
    } finally {
      setLoadingShift(false);
    }
  }

  // khi mở màn hình: load shift
  useEffect(() => {
    reloadShiftFromServer("screen_open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, routeShiftId]);

  // ------------------------------------------------------------
  //  Check-in / Check-out handlers
  // ------------------------------------------------------------
  async function handleCheckIn() {
    if (!shift || !staffId) {
      Alert.alert("Daily Note", "Missing shift or staff information.");
      return;
    }
    setCheckinLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res: any = await checkInShift(shift.id, staffId);
      console.log("[DailyNoteScreen] check-in raw response:", res);

      await reloadShiftFromServer("after_check_in");
      setStatusMessage("Checked in successfully.");
    } catch (e) {
      console.error("[DailyNoteScreen] handleCheckIn error:", e);
      setErrorMessage("Failed to check in. Please try again.");
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!shift || !staffId) {
      Alert.alert("Daily Note", "Missing shift or staff information.");
      return;
    }
    setCheckoutLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res: any = await checkOutShift(shift.id, staffId);
      console.log("[DailyNoteScreen] check-out raw response:", res);

      await reloadShiftFromServer("after_check_out");
      setStatusMessage("Checked out successfully.");
    } catch (e) {
      console.error("[DailyNoteScreen] handleCheckOut error:", e);
      setErrorMessage("Failed to check out. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  // ------------------------------------------------------------
  //  Submit Daily Note (gọi backend)
  // ------------------------------------------------------------
  async function handleSubmitDailyNote() {
    if (!shift || !staffId) {
      Alert.alert("Daily Note", "Missing shift or staff information.");
      return;
    }

    if (!shift.visitStart || !shift.visitEnd) {
      Alert.alert(
        "Daily Note",
        "Please check in and check out before submitting the Daily Note."
      );
      return;
    }

    if (isCanceled && !cancelReason.trim()) {
      Alert.alert("Daily Note", "Please enter a cancel reason.");
      return;
    }

    if (!todayPlan.trim() && !whatWeWorkedOn.trim() && !opportunities.trim()) {
      Alert.alert(
        "Daily Note",
        "Please enter at least one service note (today's plan / what you worked on / opportunities)."
      );
      return;
    }

    if (!dspSignature) {
      setDspSignatureError("DSP signature is required.");
      Alert.alert("Daily Note", "Please capture the DSP signature.");
      return;
    }

    if (!individualSignature) {
      setIndividualSignatureError("Individual signature is required.");
      Alert.alert("Daily Note", "Please capture the Individual signature.");
      return;
    }

    setSubmitLoading(true);
    setDspSignatureError(null);
    setIndividualSignatureError(null);

    const payload: MobileDailyNotePayload = {
      shiftId: shift.id,
      staffId,
      staffName,
      staffEmail,

      individualId: shift.individualId,
      individualName: shift.individualName,
      individualDob: shift.individualDob,
      individualMa: shift.individualMa,
      individualAddress: shift.individualAddress,

      date: shift.date,
      serviceCode: shift.serviceCode,
      serviceName: shift.serviceName,
      scheduleStart: shift.scheduleStart,
      scheduleEnd: shift.scheduleEnd,

      // keep raw values (backend expects what it returned)
      visitStart: shift.visitStart ?? undefined,
      visitEnd: shift.visitEnd ?? undefined,

      mileage: mileage ? Number(mileage) : undefined,
      isCanceled,
      cancelReason: isCanceled ? cancelReason.trim() : undefined,

      todayPlan: todayPlan.trim() || undefined,
      whatWeWorkedOn: whatWeWorkedOn.trim() || undefined,
      opportunities: opportunities.trim() || undefined,

      healthNotes: healthNotes.trim() || undefined,
      incidentNotes: incidentNotes.trim() || undefined,

      meals: {
        breakfast: { ...meals.breakfast },
        lunch: { ...meals.lunch },
        dinner: { ...meals.dinner },
      },

      dspSignature: dspSignature,
      individualSignature: individualSignature,
    };

    console.log("[DailyNoteScreen] submit payload:", payload);

    try {
      const res = await submitDailyNote(payload);
      console.log("[DailyNoteScreen] submitDailyNote result:", res);

      Alert.alert(
        "Daily Note",
        "Daily Note submitted successfully.",
        [
          {
            text: "OK",
            onPress: () => {
              navigation.navigate("Visits");
            },
          },
        ],
        { cancelable: false }
      );
    } catch (e) {
      console.error("[DailyNoteScreen] handleSubmitDailyNote error:", e);
      Alert.alert(
        "Daily Note",
        "Failed to submit Daily Note. Please try again or contact the office."
      );
    } finally {
      setSubmitLoading(false);
    }
  }

  function updateMeal(
    mealKey: keyof typeof meals,
    field: keyof MealInfo,
    value: string
  ) {
    setMeals((prev) => ({
      ...prev,
      [mealKey]: {
        ...prev[mealKey],
        [field]: value,
      },
    }));
  }

  const canCheckIn = !!shift && shift.status === "NOT_STARTED" && !loadingShift;
  const canCheckOut = !!shift && shift.status !== "COMPLETED" && !loadingShift;

  const signatureWebStyle = `
    .m-signature-pad--footer { display: none; margin: 0px; }
    .m-signature-pad { box-shadow: none; border: none; }
    body,html {
      width: 100%;
      height: 100%;
      margin: 0;
      background-color: transparent;
    }
    canvas {
      background-color: #e5e7eb;
      border-radius: 12px;
    }
  `;

  // ------------------------------------------------------------
  //  Render
  // ------------------------------------------------------------
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Text style={styles.pageTitle}>Daily Note</Text>
        {headerTitle ? (
          <Text style={styles.pageSubtitle}>
            {headerTitle}
            {headerSubtitle ? ` • ${headerSubtitle}` : ""}
          </Text>
        ) : null}

        {/* Shift Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Shift Details</Text>

          <View style={styles.row}>
            <Text style={styles.label}>DSP</Text>
            <Text style={styles.value}>{staffName || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{staffEmail || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Individual</Text>
            <Text style={styles.value}>{shift?.individualName ?? "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Service</Text>
            <Text style={styles.value}>{shift?.serviceName ?? "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Schedule</Text>
            <Text style={styles.value}>
              {shift
                ? `${shift.scheduleStart} – ${shift.scheduleEnd} (${shift.location})`
                : "—"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Check-in</Text>
            <Text style={styles.value}>
              {formatVisitTimeForDisplay(shift?.date, shift?.visitStart)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Check-out</Text>
            <Text style={styles.value}>
              {formatVisitTimeForDisplay(shift?.date, shift?.visitEnd)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text style={styles.value}>
              {loadingShift ? "Loading..." : shift?.status ?? "—"}
            </Text>
          </View>
        </View>

        {/* Check-in / Check-out buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !canCheckIn || checkinLoading ? styles.buttonDisabled : null,
            ]}
            onPress={handleCheckIn}
            disabled={!canCheckIn || checkinLoading}
          >
            {checkinLoading ? (
              <ActivityIndicator color="#022c22" />
            ) : (
              <Text style={styles.primaryButtonText}>Check In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              !canCheckOut || checkoutLoading ? styles.buttonDisabled : null,
            ]}
            onPress={handleCheckOut}
            disabled={!canCheckOut || checkoutLoading}
          >
            {checkoutLoading ? (
              <ActivityIndicator color="#e5e7eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>Check Out</Text>
            )}
          </TouchableOpacity>
        </View>

        {statusMessage ? (
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        ) : null}
        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}

        {/* Service Notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Service Notes</Text>

          <Text style={styles.fieldLabel}>Today&apos;s plan</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={todayPlan}
            onChangeText={setTodayPlan}
            placeholder="What was the plan for today based on the ISP outcome?"
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.fieldLabel}>What we worked on</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={whatWeWorkedOn}
            onChangeText={setWhatWeWorkedOn}
            placeholder="Describe the supports provided and what the individual worked on."
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.fieldLabel}>Opportunities & community</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={opportunities}
            onChangeText={setOpportunities}
            placeholder="What opportunities were offered? How did you support community participation?"
            placeholderTextColor="#6b7280"
          />
        </View>

        {/* Health & incident notes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Health & Incident</Text>

          <Text style={styles.fieldLabel}>Health / behavior notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={healthNotes}
            onChangeText={setHealthNotes}
            placeholder="Any changes in health, mood, or behavior today?"
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.fieldLabel}>Incident notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={incidentNotes}
            onChangeText={setIncidentNotes}
            placeholder="Describe any incidents, restraints, or unusual events (if any)."
            placeholderTextColor="#6b7280"
          />
        </View>

        {/* Mileage + Cancel */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Mileage & Cancel</Text>

          <Text style={styles.fieldLabel}>Mileage (miles)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={mileage}
            onChangeText={setMileage}
            placeholder="0"
            placeholderTextColor="#6b7280"
          />

          <View style={styles.switchRow}>
            <Text style={styles.fieldLabel}>Cancel shift</Text>
            <Switch
              value={isCanceled}
              onValueChange={setIsCanceled}
              thumbColor={isCanceled ? "#22c55e" : "#f9fafb"}
              trackColor={{ false: "#4b5563", true: "#16a34a" }}
            />
          </View>

          {isCanceled && (
            <>
              <Text style={styles.fieldLabel}>Cancel reason</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Explain why this shift was cancelled."
                placeholderTextColor="#6b7280"
              />
            </>
          )}
        </View>

        {/* Meals */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meals</Text>

          {(["breakfast", "lunch", "dinner"] as const).map((mealKey) => (
            <View key={mealKey} style={styles.mealBlock}>
              <Text style={styles.mealTitle}>
                {mealKey === "breakfast"
                  ? "Breakfast"
                  : mealKey === "lunch"
                  ? "Lunch"
                  : "Dinner"}
              </Text>

              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                style={styles.input}
                value={meals[mealKey].time}
                onChangeText={(val) => updateMeal(mealKey, "time", val)}
                placeholder="e.g. 08:00"
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.fieldLabel}>
                What did the individual have?
              </Text>
              <TextInput
                style={styles.textAreaSmall}
                multiline
                value={meals[mealKey].had}
                onChangeText={(val) => updateMeal(mealKey, "had", val)}
                placeholder="Food / drink actually consumed."
                placeholderTextColor="#6b7280"
              />

              <Text style={styles.fieldLabel}>What was offered?</Text>
              <TextInput
                style={styles.textAreaSmall}
                multiline
                value={meals[mealKey].offered}
                onChangeText={(val) => updateMeal(mealKey, "offered", val)}
                placeholder="Options that were offered."
                placeholderTextColor="#6b7280"
              />
            </View>
          ))}
        </View>

        {/* Signatures */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Signatures</Text>

          {/* DSP signature */}
          <Text style={styles.fieldLabel}>DSP Signature</Text>
          <View style={styles.signatureBox}>
            <SignatureCanvas
              ref={dspSignatureRef}
              onOK={(sig) => {
                setDspSignature(sig);
                setDspSignatureError(null);
              }}
              onEnd={() => {
                setDspSignatureError(null);
                dspSignatureRef.current?.readSignature();
              }}
              webStyle={signatureWebStyle}
              backgroundColor="transparent"
            />
          </View>
          {dspSignatureError ? (
            <Text style={styles.errorMessage}>{dspSignatureError}</Text>
          ) : null}

          {/* Individual signature */}
          <Text style={styles.fieldLabel}>Individual Signature</Text>
          <View style={styles.signatureBox}>
            <SignatureCanvas
              ref={individualSignatureRef}
              onOK={(sig) => {
                setIndividualSignature(sig);
                setIndividualSignatureError(null);
              }}
              onEnd={() => {
                setIndividualSignatureError(null);
                individualSignatureRef.current?.readSignature();
              }}
              webStyle={signatureWebStyle}
              backgroundColor="transparent"
            />
          </View>
          {individualSignatureError ? (
            <Text style={styles.errorMessage}>{individualSignatureError}</Text>
          ) : null}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            submitLoading ? styles.buttonDisabled : null,
          ]}
          onPress={handleSubmitDailyNote}
          disabled={submitLoading}
        >
          {submitLoading ? (
            <ActivityIndicator color="#022c22" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Daily Note</Text>
          )}
        </TouchableOpacity>

        {/* Back link */}
        <TouchableOpacity
          onPress={() => navigation.navigate("Visits")}
          style={styles.backLinkContainer}
        >
          <Text style={styles.backLinkText}>Back to Visits</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default DailyNoteScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#020617",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#e5e7eb",
    textAlign: "center",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  row: {
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: "#e5e7eb",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#022c22",
    fontSize: 16,
    fontWeight: "700",
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
  buttonDisabled: {
    opacity: 0.5,
  },
  statusMessage: {
    color: "#a5b4fc",
    marginBottom: 8,
    fontSize: 14,
  },
  errorMessage: {
    color: "#fecaca",
    marginBottom: 8,
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 8,
    marginBottom: 4,
  },
  textArea: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#020617",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e5e7eb",
    minHeight: 80,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#020617",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e5e7eb",
    minHeight: 60,
    textAlignVertical: "top",
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#020617",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#e5e7eb",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  mealBlock: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
  },
  signatureBox: {
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#e5e7eb",
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 4,
  },
  submitButtonText: {
    color: "#022c22",
    fontSize: 17,
    fontWeight: "700",
  },
  backLinkContainer: {
    marginTop: 16,
    alignItems: "center",
  },
  backLinkText: {
    color: "#93c5fd",
    fontSize: 15,
    fontWeight: "500",
  },
});
