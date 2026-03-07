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
import AsyncStorage from "@react-native-async-storage/async-storage";

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

type DailyNoteDraft = {
  todayPlan: string;
  whatWeWorkedOn: string;
  opportunities: string;
  mileage: string;
  isCanceled: boolean;
  cancelReason: string;
  varianceReason: string;
  meals: {
    breakfast: MealInfo;
    lunch: MealInfo;
    dinner: MealInfo;
  };
};

const TZ = "America/New_York";
const DAILY_NOTE_DRAFT_PREFIX = "bac_daily_note_draft";

function createEmptyMeals() {
  return {
    breakfast: { time: "", had: "", offered: "" },
    lunch: { time: "", had: "", offered: "" },
    dinner: { time: "", had: "", offered: "" },
  };
}

function buildDraftKey(staffId?: string, shiftId?: string) {
  return `${DAILY_NOTE_DRAFT_PREFIX}:${staffId || "unknown"}:${
    shiftId || "unknown"
  }`;
}

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
 * Format Date -> HH:mm in America/New_York
 */
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

/**
 * Display visit time safely:
 * - If value is HH:mm => display as-is (DO NOT treat as UTC)
 * - If value is ISO string => convert to America/New_York HH:mm
 */
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

function parseHHmmToMinutes(v?: string | null | undefined): number | null {
  if (!v) return null;
  const s = String(v).trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

/**
 * abs diff in minutes with wrap-around (handle overnight safely)
 * ex: 23:55 vs 00:05 => 10 minutes
 */
function absDiffMinutesWrap(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 * 60 - diff);
}

/**
 * ✅ Friendly error message (English) for staff
 * - hides "400", JSON, raw errors
 * - maps Office Time Keeping conflict to a clear message
 */
function extractFriendlyErrorMessage(err: any): string {
  if (!err) {
    return "Unable to complete this action. Please try again.";
  }

  const raw = String(err?.message || err);

  try {
    const jsonMatch = raw.match(/\{.*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (parsed?.message) {
        const msg = String(parsed.message);

        if (
          msg.includes("Office Time Keeping") ||
          msg.toLowerCase().includes("time keeping")
        ) {
          return (
            "You are currently checked in for Office Time Keeping.\n\n" +
            "Please check out of Office Time Keeping first to avoid overlapping work hours."
          );
        }

        return msg;
      }
    }
  } catch {
    // ignore parse errors
  }

  if (raw.toLowerCase().includes("time keeping")) {
    return (
      "You are currently checked in for Office Time Keeping.\n\n" +
      "Please check out of Office Time Keeping first to avoid overlapping work hours."
    );
  }

  return "Unable to check in. Please try again or contact the office.";
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

  const [mileage, setMileage] = useState("");
  const [isCanceled, setIsCanceled] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // ✅ variance reason (single field for IN/OUT 15+ minutes early/late)
  const [varianceReason, setVarianceReason] = useState("");

  const [meals, setMeals] = useState<{
    breakfast: MealInfo;
    lunch: MealInfo;
    dinner: MealInfo;
  }>(createEmptyMeals());

  const [submitLoading, setSubmitLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);

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

  const dspSignatureRef = useRef<any>(null);
  const individualSignatureRef = useRef<any>(null);
  const loadedDraftKeyRef = useRef<string | null>(null);

  const staffId = params.staffId;
  const staffName = params.staffName ?? "";
  const staffEmail = params.staffEmail ?? "";
  const routeShiftId = params.shiftId ?? (params.shift as any)?.id;

  const draftKey = useMemo(() => {
    return buildDraftKey(staffId, shift?.id ?? routeShiftId);
  }, [staffId, shift?.id, routeShiftId]);

  const headerTitle = useMemo(() => {
    if (!shift) return "Daily Note";
    return `${shift.individualName ?? "Daily Note"}`;
  }, [shift]);

  const headerSubtitle = useMemo(() => {
    if (!shift) return "";
    return `${shift.serviceName ?? ""}`;
  }, [shift]);

  function resetFormValues() {
    setTodayPlan("");
    setWhatWeWorkedOn("");
    setOpportunities("");
    setMileage("");
    setIsCanceled(false);
    setCancelReason("");
    setVarianceReason("");
    setMeals(createEmptyMeals());
    setDspSignature(null);
    setIndividualSignature(null);
    setDspSignatureError(null);
    setIndividualSignatureError(null);

    try {
      dspSignatureRef.current?.clearSignature?.();
    } catch {}

    try {
      individualSignatureRef.current?.clearSignature?.();
    } catch {}
  }

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
      const todayStr = getLocalDateYYYYMMDD();
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

  useEffect(() => {
    reloadShiftFromServer("screen_open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, routeShiftId]);

  // ------------------------------------------------------------
  // Load draft once per shift/staff key
  // ------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      if (!draftKey) return;
      if (loadedDraftKeyRef.current === draftKey) return;

      try {
        const raw = await AsyncStorage.getItem(draftKey);
        if (cancelled) return;

        if (raw) {
          const parsed = JSON.parse(raw) as Partial<DailyNoteDraft>;

          setTodayPlan(parsed.todayPlan ?? "");
          setWhatWeWorkedOn(parsed.whatWeWorkedOn ?? "");
          setOpportunities(parsed.opportunities ?? "");
          setMileage(parsed.mileage ?? "");
          setIsCanceled(Boolean(parsed.isCanceled));
          setCancelReason(parsed.cancelReason ?? "");
          setVarianceReason(parsed.varianceReason ?? "");
          setMeals(parsed.meals ?? createEmptyMeals());

          Alert.alert("Draft Loaded", "Your saved draft has been restored.");
        }

        loadedDraftKeyRef.current = draftKey;
      } catch (err) {
        console.error("[DailyNoteScreen] load draft error:", err);
        loadedDraftKeyRef.current = draftKey;
      }
    }

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [draftKey]);

  // ------------------------------------------------------------
  // Cancel mode behavior: lock fields + clear variance reason
  // ------------------------------------------------------------
  useEffect(() => {
    if (isCanceled) {
      setVarianceReason("");
    }
  }, [isCanceled]);

  // ------------------------------------------------------------
  //  Compute variance requirement (>= 15 minutes early/late)
  // ------------------------------------------------------------
  const needsVarianceReason = useMemo(() => {
    if (!shift) return false;
    if (isCanceled) return false;

    const schedStartMin = parseHHmmToMinutes(shift.scheduleStart);
    const schedEndMin = parseHHmmToMinutes(shift.scheduleEnd);

    const visitStartHHmm = shift.visitStart
      ? formatVisitTimeForDisplay(shift.date, shift.visitStart)
      : null;
    const visitEndHHmm = shift.visitEnd
      ? formatVisitTimeForDisplay(shift.date, shift.visitEnd)
      : null;

    const visitStartMin = parseHHmmToMinutes(visitStartHHmm || undefined);
    const visitEndMin = parseHHmmToMinutes(visitEndHHmm || undefined);

    if (
      schedStartMin === null ||
      schedEndMin === null ||
      visitStartMin === null ||
      visitEndMin === null
    ) {
      return false;
    }

    const diffIn = absDiffMinutesWrap(visitStartMin, schedStartMin);
    const diffOut = absDiffMinutesWrap(visitEndMin, schedEndMin);

    return diffIn >= 15 || diffOut >= 15;
  }, [shift, isCanceled]);

  // ------------------------------------------------------------
  //  Check-in / Check-out handlers
  // ------------------------------------------------------------
  async function handleCheckIn() {
    if (!shift || !staffId) {
      Alert.alert("Daily Note", "Missing shift or staff information.");
      return;
    }
    if (isCanceled) {
      Alert.alert("Daily Note", "This shift is marked as cancelled.");
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

      const friendly = extractFriendlyErrorMessage(e);
      setErrorMessage(friendly);
      Alert.alert("Unable to Check In", friendly);
    } finally {
      setCheckinLoading(false);
    }
  }

  async function handleCheckOut() {
    if (!shift || !staffId) {
      Alert.alert("Daily Note", "Missing shift or staff information.");
      return;
    }
    if (isCanceled) {
      Alert.alert("Daily Note", "This shift is marked as cancelled.");
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

      const friendly = extractFriendlyErrorMessage(e);
      setErrorMessage(friendly);
      Alert.alert("Unable to Check Out", friendly);
    } finally {
      setCheckoutLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Draft handlers
  // ------------------------------------------------------------
  async function handleSaveDraft() {
    if (!staffId || !(shift?.id ?? routeShiftId)) {
      Alert.alert("Save Draft", "Missing shift or staff information.");
      return;
    }

    setDraftLoading(true);

    try {
      const draft: DailyNoteDraft = {
        todayPlan,
        whatWeWorkedOn,
        opportunities,
        mileage,
        isCanceled,
        cancelReason,
        varianceReason,
        meals,
      };

      await AsyncStorage.setItem(draftKey, JSON.stringify(draft));

      Alert.alert("Save Draft", "Draft saved successfully.");
    } catch (err) {
      console.error("[DailyNoteScreen] save draft error:", err);
      Alert.alert("Save Draft", "Failed to save draft. Please try again.");
    } finally {
      setDraftLoading(false);
    }
  }

  async function handleClearDraft() {
    Alert.alert(
      "Clear Daily Note",
      "Are you sure you want to clear all current Daily Note fields?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              resetFormValues();
              await AsyncStorage.removeItem(draftKey);
              Alert.alert("Clear Daily Note", "Daily Note has been cleared.");
            } catch (err) {
              console.error("[DailyNoteScreen] clear draft error:", err);
              Alert.alert(
                "Clear Daily Note",
                "Failed to clear the Daily Note. Please try again."
              );
            }
          },
        },
      ]
    );
  }

  // ------------------------------------------------------------
  //  Submit Daily Note (gọi backend)
  // ------------------------------------------------------------
  async function handleSubmitDailyNote() {
    if (!shift || !staffId) {
      Alert.alert("Daily Note", "Missing shift or staff information.");
      return;
    }

    if (!isCanceled) {
      if (!shift.visitStart || !shift.visitEnd) {
        Alert.alert(
          "Daily Note",
          "Please check in and check out before submitting the Daily Note."
        );
        return;
      }
    }

    if (isCanceled && !cancelReason.trim()) {
      Alert.alert("Daily Note", "Please enter a cancel reason.");
      return;
    }

    if (!isCanceled && needsVarianceReason && !varianceReason.trim()) {
      Alert.alert(
        "Daily Note",
        "Please explain why check-in/check-out time differs by 15 minutes or more."
      );
      return;
    }

    if (!isCanceled) {
      if (
        !todayPlan.trim() &&
        !whatWeWorkedOn.trim() &&
        !opportunities.trim()
      ) {
        Alert.alert(
          "Daily Note",
          "Please enter at least one service note (today's plan / what you worked on / opportunities)."
        );
        return;
      }
    }

    setSubmitLoading(true);
    setDspSignatureError(null);
    setIndividualSignatureError(null);

    const payload: MobileDailyNotePayload & { varianceReason?: string } = {
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

      visitStart: shift.visitStart ?? undefined,
      visitEnd: shift.visitEnd ?? undefined,

      mileage: mileage ? Number(mileage) : undefined,
      isCanceled,
      cancelReason: isCanceled ? cancelReason.trim() : undefined,

      varianceReason:
        !isCanceled && needsVarianceReason ? varianceReason.trim() : undefined,

      todayPlan: !isCanceled ? todayPlan.trim() || undefined : undefined,
      whatWeWorkedOn: !isCanceled
        ? whatWeWorkedOn.trim() || undefined
        : undefined,
      opportunities: !isCanceled ? opportunities.trim() || undefined : undefined,

      meals: !isCanceled
        ? {
            breakfast: { ...meals.breakfast },
            lunch: { ...meals.lunch },
            dinner: { ...meals.dinner },
          }
        : undefined,

      dspSignature: dspSignature || undefined,
      individualSignature: individualSignature || undefined,
    };

    console.log("[DailyNoteScreen] submit payload:", payload);

    try {
      const res = await submitDailyNote(payload as any);
      console.log("[DailyNoteScreen] submitDailyNote result:", res);

      try {
        await AsyncStorage.removeItem(draftKey);
      } catch (err) {
        console.error("[DailyNoteScreen] remove draft after submit error:", err);
      }

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

  const canCheckIn =
    !!shift && shift.status === "NOT_STARTED" && !loadingShift && !isCanceled;
  const canCheckOut =
    !!shift && shift.status !== "COMPLETED" && !loadingShift && !isCanceled;

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

  const disabledSectionStyle = isCanceled ? { opacity: 0.45 } : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.pageTitle}>Daily Note</Text>
        {headerTitle ? (
          <Text style={styles.pageSubtitle}>
            {headerTitle}
            {headerSubtitle ? ` • ${headerSubtitle}` : ""}
          </Text>
        ) : null}

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
            editable={!isCanceled}
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

          {!isCanceled && needsVarianceReason && (
            <>
              <Text style={styles.fieldLabel}>
                Reason (15+ minutes early/late)
              </Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={varianceReason}
                onChangeText={setVarianceReason}
                placeholder="Explain why check-in/check-out differs by 15 minutes or more."
                placeholderTextColor="#6b7280"
              />
            </>
          )}
        </View>

        <View style={[styles.card, disabledSectionStyle]}>
          <Text style={styles.sectionTitle}>Service Notes</Text>

          <Text style={styles.fieldLabel}>What opportunities offer?</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={todayPlan}
            onChangeText={setTodayPlan}
            placeholder="What was the plan for today based on the ISP outcome?"
            placeholderTextColor="#6b7280"
            editable={!isCanceled}
          />

          <Text style={styles.fieldLabel}>What we worked on</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={whatWeWorkedOn}
            onChangeText={setWhatWeWorkedOn}
            placeholder="Describe the supports provided and what the individual worked on."
            placeholderTextColor="#6b7280"
            editable={!isCanceled}
          />

          <Text style={styles.fieldLabel}>Opportunities & community</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={opportunities}
            onChangeText={setOpportunities}
            placeholder="What opportunities were offered? How did you support community participation?"
            placeholderTextColor="#6b7280"
            editable={!isCanceled}
          />
        </View>

        <View style={[styles.card, disabledSectionStyle]}>
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
                editable={!isCanceled}
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
                editable={!isCanceled}
              />

              <Text style={styles.fieldLabel}>What was offered?</Text>
              <TextInput
                style={styles.textAreaSmall}
                multiline
                value={meals[mealKey].offered}
                onChangeText={(val) => updateMeal(mealKey, "offered", val)}
                placeholder="Options that were offered."
                placeholderTextColor="#6b7280"
                editable={!isCanceled}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Signatures</Text>

          <Text style={styles.fieldLabel}>DSP Signature (optional)</Text>
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

          <Text style={styles.fieldLabel}>Individual Signature (optional)</Text>
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

        {/* Draft actions */}
        <View style={styles.draftActionsRow}>
          <TouchableOpacity
            style={[
              styles.draftButton,
              draftLoading ? styles.buttonDisabled : null,
            ]}
            onPress={handleSaveDraft}
            disabled={draftLoading}
          >
            {draftLoading ? (
              <ActivityIndicator color="#022c22" />
            ) : (
              <Text style={styles.draftButtonText}>Save Draft</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearDraft}
            disabled={draftLoading}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

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
  draftActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  draftButton: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  draftButtonText: {
    color: "#022c22",
    fontSize: 16,
    fontWeight: "700",
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  clearButtonText: {
    color: "#e5e7eb",
    fontSize: 16,
    fontWeight: "700",
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