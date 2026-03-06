// src/screens/VisitTabsScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Location from "expo-location";

import type { MainDrawerParamList } from "../../App";
import type { MobileShift } from "../types/mobileApi";
import { getTodayShifts } from "../api/mobileClient";
import DailyNoteScreen from "./DailyNoteScreen";
import { BACKEND_BASE_URL } from "../config";

// =======================
// Route params
// =======================
type VisitTabsRouteParams = {
  shiftId?: string;
  shift?: MobileShift;
  staffId?: string;
  staffName?: string;
  staffEmail?: string;
  initialTab?: "CHECK" | "MEDICATION" | "POC" | "DAILY_NOTE";
};

type Props = NativeStackScreenProps<MainDrawerParamList, "VisitTabs"> & {
  route: { params?: VisitTabsRouteParams };
};

type TabKey = "CHECK" | "MEDICATION" | "POC" | "DAILY_NOTE";

// =======================
// Helpers
// =======================
function getLocalDateYYYYMMDD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isHHmm(v?: string | null) {
  if (!v) return false;
  return /^(\d{1,2}):(\d{2})$/.test(String(v).trim());
}

function formatVisitTime(value?: string | null): string {
  if (!value) return "—";
  const v = String(value).trim();
  if (isHHmm(v)) {
    const [h, m] = v.split(":");
    return `${String(Number(h)).padStart(2, "0")}:${m}`;
  }
  if (v.includes("T")) {
    const dt = new Date(v);
    if (!Number.isNaN(dt.getTime())) {
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }
  }
  return v;
}

/**
 * ❌ DO NOT USE toISOString() for client time display
 * ✅ Send local HH:mm
 */
function getLocalTimeHHmm(): string {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Build ISO local datetime for backend validation:
 * YYYY-MM-DDTHH:mm:00
 */
function buildLocalIsoDateTime(dateYYYYMMDD: string, timeHHmm: string): string {
  return `${dateYYYYMMDD}T${timeHHmm}:00`;
}

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

async function fetchJsonOrThrow(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const msg = await readApiErrorMessage(res);
    throw new Error(msg);
  }
  return res.json();
}

// =======================
// Medication types (mobile-only)
// =======================
type MobileMedOrder = {
  id: string;
  medicationName: string;
  doseValue?: number | null;
  doseUnit?: string | null;
  route?: string | null;
  frequencyText?: string | null;
  isPrn?: boolean | null;
};

type MobileMarLog = {
  id: string;
  orderId: string;
  status:
    | "GIVEN"
    | "REFUSED"
    | "HELD"
    | "NOT_AVAILABLE"
    | "NOT_ADMINISTERED"
    | "OTHER";
  adminTime?: string | null; // HH:mm
  note?: string | null;
  createdAt?: string | null;
};

// =======================
// POC types (mobile-only)
// =======================
type PocDuty = {
  id: string; // pocDutyId
  category?: string | null;
  taskNo?: number | null;
  duty: string;
  instruction?: string | null;
  sortOrder?: number | null;
};

type PocTaskStatus =
  | "INDEPENDENT"
  | "VERBAL_PROMPT"
  | "PHYSICAL_ASSIST"
  | "REFUSED";

type PocDailyItem = {
  pocDutyId: string;
  completionStatus: PocTaskStatus | null;
  note?: string | null;
  completedAt?: string | null; // HH:mm
};

type PocDailyLogResponse = {
  id?: string;
  status?: "DRAFT" | "SUBMITTED";
  items?: PocDailyItem[];
  submittedAt?: string | null;
};

// =======================
// Screen
// =======================
export default function VisitTabsScreen({ navigation, route }: Props) {
  const params = route?.params ?? {};
  const staffId = params.staffId;
  const staffName = params.staffName ?? "";
  const staffEmail = params.staffEmail ?? "";

  const shiftId = params.shiftId ?? (params.shift as any)?.id;
  const initialTab: TabKey = (params.initialTab as TabKey) || "CHECK";

  const [tab, setTab] = useState<TabKey>(initialTab);

  // shift
  const [shift, setShift] = useState<MobileShift | null>(null);
  const [loadingShift, setLoadingShift] = useState(false);

  // check in/out loading
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // GPS states
  const [useGps, setUseGps] = useState(true);
  const [gpsReason, setGpsReason] = useState("");
  const [gpsStatus, setGpsStatus] = useState<
    "IDLE" | "PERMISSION_DENIED" | "FETCHING" | "OK" | "FAILED"
  >("IDLE");
  const [gpsText, setGpsText] = useState<string>("—");
  const [gpsCoords, setGpsCoords] = useState<{
    lat: number;
    lng: number;
    accuracy?: number;
  } | null>(null);

  // Medication state
  const [medLoading, setMedLoading] = useState(false);
  const [medErr, setMedErr] = useState<string | null>(null);
  const [medOrders, setMedOrders] = useState<MobileMedOrder[]>([]);
  const [medLogs, setMedLogs] = useState<Record<string, MobileMarLog[]>>({});

  // Medication record modal
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [medSelected, setMedSelected] = useState<MobileMedOrder | null>(null);
  const [medStatus, setMedStatus] = useState<MobileMarLog["status"]>("GIVEN");
  const [medTime, setMedTime] = useState<string>(getLocalTimeHHmm());
  const [medNote, setMedNote] = useState<string>("");

  // POC state
  const [pocLoading, setPocLoading] = useState(false);
  const [pocErr, setPocErr] = useState<string | null>(null);
  const [pocDuties, setPocDuties] = useState<PocDuty[]>([]);
  const [pocDaily, setPocDaily] = useState<PocDailyLogResponse>({
    status: "DRAFT",
    items: [],
  });
  const [pocSaving, setPocSaving] = useState(false);

  const headerTitle = useMemo(() => {
    const name = shift?.individualName || "Visit";
    const svc = shift?.serviceName ? ` • ${shift.serviceName}` : "";
    return `${name}${svc}`;
  }, [shift]);

  const canCheckIn = !!shift && shift.status === "NOT_STARTED";
  const canCheckOut = !!shift && shift.status !== "COMPLETED";

  const shiftDate = useMemo(() => {
    // prefer shift.date; fallback local date
    return shift?.date || getLocalDateYYYYMMDD();
  }, [shift?.date]);

  const reloadShiftFromServer = useCallback(
    async (reason: string) => {
      if (!staffId) return;
      setLoadingShift(true);

      try {
        const todayStr = getLocalDateYYYYMMDD();
        const items = await getTodayShifts(staffId, todayStr);

        let found: MobileShift | null = null;
        if (shiftId) {
          found = (items.find((s) => s.id === shiftId) as MobileShift) ?? null;
        }
        if (!found && items.length === 1) found = items[0] as MobileShift;

        setShift(found || null);

        if (!found) {
          if (__DEV__)
            console.log("[VisitTabs] shift not found. reason=", reason);
        }
      } catch (e: any) {
        if (__DEV__)
          console.log("[VisitTabs] reload error:", String(e?.message || e));
        setShift(null);
      } finally {
        setLoadingShift(false);
      }
    },
    [staffId, shiftId]
  );

  useFocusEffect(
    useCallback(() => {
      reloadShiftFromServer("focus");
    }, [reloadShiftFromServer])
  );

  useEffect(() => {
    setTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =======================
  // GPS fetch helper
  // =======================
  const fetchGps = useCallback(async () => {
    setGpsStatus("FETCHING");
    setGpsText("Getting location...");
    setGpsCoords(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setGpsStatus("PERMISSION_DENIED");
        setGpsText("Permission denied");
        return { ok: false as const, reason: "permission_denied" as const };
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const lat = loc?.coords?.latitude;
      const lng = loc?.coords?.longitude;
      const acc = loc?.coords?.accuracy;

      if (typeof lat === "number" && typeof lng === "number") {
        setGpsStatus("OK");
        setGpsCoords({
          lat,
          lng,
          accuracy: typeof acc === "number" ? acc : undefined,
        });
        setGpsText(
          `Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}${
            typeof acc === "number" ? ` (±${Math.round(acc)}m)` : ""
          }`
        );
        return { ok: true as const };
      }

      setGpsStatus("FAILED");
      setGpsText("GPS failed");
      return { ok: false as const, reason: "gps_failed" as const };
    } catch (e) {
      setGpsStatus("FAILED");
      setGpsText("GPS failed");
      return { ok: false as const, reason: "gps_failed" as const };
    }
  }, []);

  // Validate GPS gating rule (DSP can bypass but must provide reason)
  const ensureGpsOrReason = useCallback(
    async (actionLabel: "Check In" | "Check Out") => {
      // DSP chooses NO GPS -> require reason
      if (!useGps) {
        if (!gpsReason.trim()) {
          Alert.alert(actionLabel, "Please enter a reason if GPS is not used.");
          return { ok: false as const };
        }
        return { ok: true as const, mode: "NO_GPS" as const };
      }

      // useGps = true -> try to fetch
      const res = await fetchGps();
      if (res.ok) return { ok: true as const, mode: "GPS" as const };

      // GPS fail -> allow bypass but require reason
      Alert.alert(
        "GPS unavailable",
        "GPS could not be obtained. You may continue, but a reason is required."
      );
      if (!gpsReason.trim()) return { ok: false as const };

      return { ok: true as const, mode: "NO_GPS" as const };
    },
    [fetchGps, gpsReason, useGps]
  );

  // =======================
  // Check In/Out (send GPS mode + reason + coords)
  // NOTE: Backend must accept these fields. Mobile prepares them now.
  // =======================
  async function postCheck(action: "check-in" | "check-out") {
    if (!shift || !staffId) {
      Alert.alert(
        action === "check-in" ? "Check In" : "Check Out",
        "Missing shift or staff information."
      );
      return;
    }

    const gate = await ensureGpsOrReason(
      action === "check-in" ? "Check In" : "Check Out"
    );
    if (!gate.ok) return;

    const isNoGps = gate.mode === "NO_GPS" || !useGps;
    const payload: any = {
      staffId,
      clientTime: getLocalTimeHHmm(),
      gpsMode: isNoGps ? "NO_GPS" : "GPS",
    };

    if (isNoGps) {
      payload.noGpsReason = gpsReason.trim();
    } else if (gpsCoords) {
      payload.gps = gpsCoords; // { lat, lng, accuracy? }
    }

    const url = `${BACKEND_BASE_URL}/mobile/shifts/${encodeURIComponent(
      shift.id
    )}/${action}`;

    if (action === "check-in") setCheckinLoading(true);
    else setCheckoutLoading(true);

    try {
      await fetchJsonOrThrow(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await reloadShiftFromServer(`after_${action}`);
      Alert.alert(
        action === "check-in" ? "Check In" : "Check Out",
        action === "check-in"
          ? "Checked in successfully."
          : "Checked out successfully."
      );
    } catch (e: any) {
      const msg = String(e?.message || e || "Request failed");
      Alert.alert(action === "check-in" ? "Check In" : "Check Out", msg);
      if (__DEV__) console.log("[VisitTabs] check error:", msg);
    } finally {
      if (action === "check-in") setCheckinLoading(false);
      else setCheckoutLoading(false);
    }
  }

  async function handleCheckIn() {
    return postCheck("check-in");
  }

  async function handleCheckOut() {
    return postCheck("check-out");
  }

  // =======================
  // Medication (native)
  // Endpoints (backend to implement/confirm):
  //  - GET  /mobile/medications/orders?shiftId=...
  //  - GET  /mobile/medications/mar?shiftId=...&date=YYYY-MM-DD
  //  - POST /mobile/medications/mar
  // =======================
  const loadMedication = useCallback(async () => {
    if (!shiftId || !staffId) return;

    setMedLoading(true);
    setMedErr(null);

    try {
      const ordersUrl = `${BACKEND_BASE_URL}/mobile/medications/orders?shiftId=${encodeURIComponent(
        shiftId
      )}`;
      const ordersData = await fetchJsonOrThrow(ordersUrl);
      const orders: MobileMedOrder[] = Array.isArray(ordersData?.orders)
        ? ordersData.orders
        : Array.isArray(ordersData)
        ? ordersData
        : [];
      setMedOrders(orders);

      const marUrl = `${BACKEND_BASE_URL}/mobile/medications/mar?shiftId=${encodeURIComponent(
        shiftId
      )}&date=${encodeURIComponent(shiftDate)}`;
      const marData = await fetchJsonOrThrow(marUrl);
      const logsRaw: MobileMarLog[] = Array.isArray(marData?.logs)
        ? marData.logs
        : Array.isArray(marData)
        ? marData
        : [];

      // group by orderId
      const grouped: Record<string, MobileMarLog[]> = {};
      for (const x of logsRaw) {
        const key = String((x as any)?.orderId || "");
        if (!key) continue;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(x);
      }

      // sort newest first per order
      Object.keys(grouped).forEach((k) => {
        grouped[k] = grouped[k].slice().sort((a, b) => {
          const ta = new Date(a.createdAt || 0).getTime();
          const tb = new Date(b.createdAt || 0).getTime();
          return tb - ta;
        });
      });

      setMedLogs(grouped);
    } catch (e: any) {
      const msg = String(e?.message || e || "Failed to load medication");
      setMedErr(msg);
      setMedOrders([]);
      setMedLogs({});
      if (__DEV__) console.log("[VisitTabs] loadMedication error:", msg);
    } finally {
      setMedLoading(false);
    }
  }, [shiftDate, shiftId, staffId]);

  const openMedRecord = (order: MobileMedOrder) => {
    setMedSelected(order);
    setMedStatus("GIVEN");
    setMedTime(getLocalTimeHHmm());
    setMedNote("");
    setMedModalOpen(true);
  };

  const requireMedNote = useMemo(() => {
    return medStatus === "REFUSED" || medStatus === "HELD";
  }, [medStatus]);

  const submitMedRecord = async () => {
    if (!shiftId || !staffId || !shift) {
      Alert.alert("Medication", "Missing shift or staff information.");
      return;
    }
    if (!medSelected?.id) {
      Alert.alert("Medication", "Please select a medication order.");
      return;
    }
    if (!isHHmm(medTime)) {
      Alert.alert("Medication", "Please enter time in HH:mm (e.g., 07:15).");
      return;
    }
    if (requireMedNote && !medNote.trim()) {
      Alert.alert("Medication", "Note is required for this status.");
      return;
    }

    // ✅ Some backends validate scheduledDateTime as ISO datetime.
    const scheduledDateTime = buildLocalIsoDateTime(shiftDate, medTime);

    const payload = {
      shiftId,
      staffId,
      individualId: shift.individualId,
      orderId: medSelected.id,
      status: medStatus,
      adminTime: medTime,
      scheduledDateTime, // ✅ FIX: provide ISO datetime
      note: medNote.trim() || null,
      staffName: staffName || null,
      staffEmail: staffEmail || null,
      date: shiftDate,
      source: "mobile",
    };

    try {
      const url = `${BACKEND_BASE_URL}/mobile/medications/mar`;
      await fetchJsonOrThrow(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setMedModalOpen(false);
      setMedSelected(null);

      await loadMedication();
      Alert.alert("Medication", "Saved.");
    } catch (e: any) {
      const msg = String(e?.message || e || "Save failed");
      Alert.alert("Medication", msg);
    }
  };

  // =======================
  // POC (native)
  // Endpoints (backend to implement/confirm):
  //  - GET  /mobile/poc/duties?shiftId=...
  //  - GET  /mobile/poc/daily-log?shiftId=...&date=YYYY-MM-DD
  //  - POST /mobile/poc/daily-log   (save/submit)
  // =======================
  const loadPoc = useCallback(async () => {
    if (!shiftId || !staffId) return;

    setPocLoading(true);
    setPocErr(null);

    try {
      const dutiesUrl = `${BACKEND_BASE_URL}/mobile/poc/duties?shiftId=${encodeURIComponent(
        shiftId
      )}`;
      const dutiesData = await fetchJsonOrThrow(dutiesUrl);
      const duties: PocDuty[] = Array.isArray(dutiesData?.duties)
        ? dutiesData.duties
        : Array.isArray(dutiesData)
        ? dutiesData
        : [];
      setPocDuties(duties);

      const dailyUrl = `${BACKEND_BASE_URL}/mobile/poc/daily-log?shiftId=${encodeURIComponent(
        shiftId
      )}&date=${encodeURIComponent(shiftDate)}`;
      const dailyData = await fetchJsonOrThrow(dailyUrl);

      const resp: PocDailyLogResponse = {
        id: dailyData?.id,
        status: dailyData?.status || "DRAFT",
        items: Array.isArray(dailyData?.items) ? dailyData.items : [],
        submittedAt: dailyData?.submittedAt || null,
      };

      // ensure every duty has an item placeholder
      const byDuty: Record<string, PocDailyItem> = {};
      (resp.items || []).forEach((it) => {
        if (it?.pocDutyId) byDuty[String(it.pocDutyId)] = it;
      });

      const merged: PocDailyItem[] = duties.map((d) => {
        const ex = byDuty[String(d.id)];
        return (
          ex || {
            pocDutyId: String(d.id),
            completionStatus: null,
            note: "",
            completedAt: null,
          }
        );
      });

      setPocDaily({
        id: resp.id,
        status: resp.status,
        items: merged,
        submittedAt: resp.submittedAt,
      });
    } catch (e: any) {
      const msg = String(e?.message || e || "Failed to load POC");
      setPocErr(msg);
      setPocDuties([]);
      setPocDaily({ status: "DRAFT", items: [] });
      if (__DEV__) console.log("[VisitTabs] loadPoc error:", msg);
    } finally {
      setPocLoading(false);
    }
  }, [shiftDate, shiftId, staffId]);

  const updatePocItem = (pocDutyId: string, patch: Partial<PocDailyItem>) => {
    setPocDaily((prev) => {
      const items = (prev.items || []).map((it) => {
        if (String(it.pocDutyId) !== String(pocDutyId)) return it;
        const next: PocDailyItem = {
          ...it,
          ...patch,
        };
        // auto timestamp when setting status (if not provided)
        if (
          patch.completionStatus &&
          (!next.completedAt || !isHHmm(next.completedAt))
        ) {
          next.completedAt = getLocalTimeHHmm();
        }
        return next;
      });
      return { ...prev, items };
    });
  };

  const savePoc = async (mode: "DRAFT" | "SUBMITTED") => {
    if (!shiftId || !staffId || !shift) {
      Alert.alert("POC", "Missing shift or staff information.");
      return;
    }
    if (pocDaily.status === "SUBMITTED") {
      Alert.alert("POC", "This POC daily log is already submitted.");
      return;
    }

    // If submit, require at least 1 completed task before submit.
    if (mode === "SUBMITTED") {
      const hasAny = (pocDaily.items || []).some((x) => !!x.completionStatus);
      if (!hasAny) {
        Alert.alert("POC", "Please complete at least one task before submit.");
        return;
      }
    }

    setPocSaving(true);
    try {
      const url = `${BACKEND_BASE_URL}/mobile/poc/daily-log`;
      const payload = {
        shiftId,
        staffId,
        staffName: staffName || null,
        staffEmail: staffEmail || null,
        individualId: shift.individualId,
        date: shiftDate,
        status: mode,
        items: (pocDaily.items || []).map((x) => ({
          pocDutyId: x.pocDutyId,
          completionStatus: x.completionStatus,
          note: x.note?.trim() || null,
          completedAt:
            x.completedAt && isHHmm(x.completedAt) ? x.completedAt : null,
        })),
        source: "mobile",
      };

      await fetchJsonOrThrow(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await loadPoc();
      Alert.alert("POC", mode === "SUBMITTED" ? "Submitted." : "Saved.");
    } catch (e: any) {
      const msg = String(e?.message || e || "Save failed");
      Alert.alert("POC", msg);
    } finally {
      setPocSaving(false);
    }
  };

  // =======================
  // Auto-load tab data when tab is focused
  // =======================
  useEffect(() => {
    if (tab === "MEDICATION") loadMedication();
    if (tab === "POC") loadPoc();
  }, [loadMedication, loadPoc, tab]);

  // ---------- UI blocks ----------
  const TabButton = ({ k, label }: { k: TabKey; label: string }) => {
    const active = tab === k;
    return (
      <Pressable
        onPress={() => setTab(k)}
        style={({ pressed }) => [
          styles.tabBtn,
          active ? styles.tabBtnActive : null,
          pressed && { opacity: 0.9 },
        ]}
      >
        <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const POCStatusButton = ({
    label,
    value,
    active,
    disabled,
    onPress,
  }: {
    label: string;
    value: PocTaskStatus;
    active: boolean;
    disabled?: boolean;
    onPress: () => void;
  }) => {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.pocPill,
          active ? styles.pocPillActive : null,
          disabled ? { opacity: 0.45 } : null,
          pressed && !disabled ? { opacity: 0.9 } : null,
        ]}
      >
        <Text
          style={[
            styles.pocPillText,
            active ? styles.pocPillTextActive : null,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  // =======================
  // Render
  // =======================
  return (
    <View style={styles.screen}>
      {/* Top header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.navigate("Visits")}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {shift
              ? `${shift.date} • ${shift.scheduleStart}–${shift.scheduleEnd}`
              : "Loading..."}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TabButton k="CHECK" label="Check In/Out" />
        <TabButton k="MEDICATION" label="Medication" />
        <TabButton k="POC" label="POC" />
        <TabButton k="DAILY_NOTE" label="Daily Note" />
      </View>

      {/* Body */}
      {tab === "CHECK" ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Shift Details</Text>

            <Row label="DSP" value={staffName || "—"} />
            <Row label="Email" value={staffEmail || "—"} />
            <Row label="Individual" value={shift?.individualName ?? "—"} />
            <Row label="Service" value={shift?.serviceName ?? "—"} />
            <Row
              label="Schedule"
              value={
                shift
                  ? `${shift.scheduleStart} – ${shift.scheduleEnd} (${shift.location})`
                  : "—"
              }
            />
            <Row label="Check-in" value={formatVisitTime(shift?.visitStart)} />
            <Row label="Check-out" value={formatVisitTime(shift?.visitEnd)} />
            <Row
              label="Status"
              value={loadingShift ? "Loading..." : shift?.status ?? "—"}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>GPS</Text>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Use GPS</Text>
              <Switch
                value={useGps}
                onValueChange={setUseGps}
                thumbColor={useGps ? "#22c55e" : "#f9fafb"}
                trackColor={{ false: "#4b5563", true: "#16a34a" }}
              />
            </View>

            <Text style={styles.mutedText}>
              Status:{" "}
              <Text style={{ fontWeight: "900", color: "#e5e7eb" }}>
                {gpsStatus}
              </Text>
            </Text>
            <Text style={styles.mutedText}>Location: {gpsText}</Text>

            <Pressable
              onPress={fetchGps}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.secondaryBtnText}>Test GPS</Text>
            </Pressable>

            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
              Reason (required if GPS not used / unavailable)
            </Text>
            <TextInput
              value={gpsReason}
              onChangeText={setGpsReason}
              placeholder="Explain why GPS is not used (no signal, indoor, etc.)"
              placeholderTextColor="#6b7280"
              style={styles.textArea}
              multiline
            />
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleCheckIn}
              disabled={!canCheckIn || checkinLoading}
              style={[
                styles.primaryBtn,
                !canCheckIn || checkinLoading ? styles.btnDisabled : null,
              ]}
            >
              {checkinLoading ? (
                <ActivityIndicator color="#022c22" />
              ) : (
                <Text style={styles.primaryBtnText}>Check In</Text>
              )}
            </Pressable>

            <Pressable
              onPress={handleCheckOut}
              disabled={!canCheckOut || checkoutLoading}
              style={[
                styles.outBtn,
                !canCheckOut || checkoutLoading ? styles.btnDisabled : null,
              ]}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#e5e7eb" />
              ) : (
                <Text style={styles.outBtnText}>Check Out</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.footerHint}>Backend API: {BACKEND_BASE_URL}</Text>
        </ScrollView>
      ) : tab === "MEDICATION" ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>Medication</Text>
              <Pressable
                onPress={loadMedication}
                style={({ pressed }) => [
                  styles.miniBtn,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.miniBtnText}>Refresh</Text>
              </Pressable>
            </View>

            <Text style={styles.mutedText}>
              Record medication administration here on Mobile (DSP).
            </Text>

            {medLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : medErr ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.warnText}>{medErr}</Text>
                <Text style={styles.mutedText}>
                  Backend needs endpoints: /mobile/medications/orders + /mar
                </Text>
              </View>
            ) : medOrders.length === 0 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.mutedText}>No medication orders found.</Text>
              </View>
            ) : (
              <View style={{ marginTop: 12, gap: 10 }}>
                {medOrders.map((o) => {
                  const logs = medLogs[String(o.id)] || [];
                  const last = logs[0];

                  return (
                    <View key={o.id} style={styles.listCard}>
                      <Text style={styles.listTitle}>{o.medicationName}</Text>

                      <Text style={styles.listSub}>
                        {[
                          o.doseValue != null ? String(o.doseValue) : null,
                          o.doseUnit || null,
                          o.route ? `• ${o.route}` : null,
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      </Text>

                      {!!o.frequencyText && (
                        <Text style={styles.listMuted}>{o.frequencyText}</Text>
                      )}

                      <View style={styles.listMetaRow}>
                        <Text style={styles.listMetaK}>Last:</Text>
                        <Text style={styles.listMetaV}>
                          {last
                            ? `${last.status} @ ${last.adminTime || "—"}`
                            : "—"}
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => openMedRecord(o)}
                        style={({ pressed }) => [
                          styles.primaryBtn,
                          { marginTop: 10 },
                          pressed && { opacity: 0.9 },
                        ]}
                      >
                        <Text style={styles.primaryBtnText}>Record</Text>
                      </Pressable>

                      {logs.length > 0 ? (
                        <View style={{ marginTop: 10 }}>
                          <Text style={styles.listMetaK}>History</Text>
                          {logs.slice(0, 3).map((x) => (
                            <Text key={x.id} style={styles.listMuted}>
                              • {x.status} @ {x.adminTime || "—"}
                              {x.note ? ` — ${x.note}` : ""}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* ✅ Medication Record Modal (Scrollable + Keyboard-safe) */}
          <Modal
            visible={medModalOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setMedModalOpen(false)}
          >
            <View style={styles.modalBackdrop}>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={{ width: "100%" }}
              >
                <View style={styles.modalSheet}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Record Medication</Text>
                    <Pressable
                      onPress={() => setMedModalOpen(false)}
                      style={styles.modalCloseBtn}
                    >
                      <Text style={styles.modalCloseText}>✕</Text>
                    </Pressable>
                  </View>

                  <ScrollView
                    style={{ maxHeight: "75%" }}
                    contentContainerStyle={{ paddingBottom: 18 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <Text style={styles.modalHint}>
                      {medSelected?.medicationName || "Medication"}
                    </Text>

                    <Text style={styles.fieldLabel}>Status</Text>
                    <View style={styles.pillsRow}>
                      {(
                        [
                          ["GIVEN", "Given"],
                          ["REFUSED", "Refused"],
                          ["HELD", "Held"],
                          ["NOT_AVAILABLE", "Not Available"],
                        ] as const
                      ).map(([v, label]) => {
                        const active = medStatus === v;
                        return (
                          <Pressable
                            key={v}
                            onPress={() => setMedStatus(v)}
                            style={({ pressed }) => [
                              styles.pocPill,
                              active ? styles.pocPillActive : null,
                              pressed && { opacity: 0.9 },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pocPillText,
                                active ? styles.pocPillTextActive : null,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                      Time (HH:mm)
                    </Text>
                    <TextInput
                      value={medTime}
                      onChangeText={setMedTime}
                      placeholder="07:15"
                      placeholderTextColor="#6b7280"
                      style={styles.input}
                    />

                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                      Note {requireMedNote ? "(required)" : "(optional)"}
                    </Text>
                    <TextInput
                      value={medNote}
                      onChangeText={setMedNote}
                      placeholder="Type note..."
                      placeholderTextColor="#6b7280"
                      style={styles.textArea}
                      multiline
                    />

                    <Pressable
                      onPress={submitMedRecord}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        { marginTop: 12 },
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>Save</Text>
                    </Pressable>

                    <View style={{ height: 12 }} />
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </View>
          </Modal>
        </ScrollView>
      ) : tab === "POC" ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.sectionTitle}>POC</Text>
              <Pressable
                onPress={loadPoc}
                style={({ pressed }) => [
                  styles.miniBtn,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.miniBtnText}>Refresh</Text>
              </Pressable>
            </View>

            <Text style={styles.mutedText}>
              Complete POC tasks here on Mobile (DSP). Each update has a timestamp.
            </Text>

            {pocLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : pocErr ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.warnText}>{pocErr}</Text>
                <Text style={styles.mutedText}>
                  Backend needs endpoints: /mobile/poc/duties + /daily-log
                </Text>
              </View>
            ) : pocDuties.length === 0 ? (
              <View style={{ marginTop: 10 }}>
                <Text style={styles.mutedText}>No POC duties found.</Text>
              </View>
            ) : (
              <View style={{ marginTop: 12, gap: 10 }}>
                <View style={styles.badgeRow}>
                  <Text style={styles.badgeText}>
                    Status: {pocDaily.status || "DRAFT"}
                  </Text>
                  {!!pocDaily.submittedAt && (
                    <Text style={styles.badgeText}>
                      Submitted: {formatVisitTime(pocDaily.submittedAt)}
                    </Text>
                  )}
                </View>

                {pocDuties
                  .slice()
                  .sort((a, b) => {
                    const aa = a.sortOrder ?? 0;
                    const bb = b.sortOrder ?? 0;
                    if (aa !== bb) return aa - bb;
                    const ta = a.taskNo ?? 0;
                    const tb = b.taskNo ?? 0;
                    return ta - tb;
                  })
                  .map((d) => {
                    const item =
                      (pocDaily.items || []).find(
                        (x) => String(x.pocDutyId) === String(d.id)
                      ) || null;

                    const locked = pocDaily.status === "SUBMITTED";

                    return (
                      <View key={d.id} style={styles.listCard}>
                        <Text style={styles.listTitle}>
                          {d.taskNo != null ? `#${d.taskNo} ` : ""}
                          {d.duty}
                        </Text>

                        {!!d.instruction && (
                          <Text style={styles.listMuted}>{d.instruction}</Text>
                        )}

                        {!!d.category && (
                          <Text style={styles.listSub}>{d.category}</Text>
                        )}

                        <View style={styles.pillsRow}>
                          <POCStatusButton
                            label="Ind"
                            value="INDEPENDENT"
                            active={item?.completionStatus === "INDEPENDENT"}
                            disabled={locked}
                            onPress={() =>
                              updatePocItem(String(d.id), {
                                completionStatus: "INDEPENDENT",
                              })
                            }
                          />
                          <POCStatusButton
                            label="Verbal"
                            value="VERBAL_PROMPT"
                            active={item?.completionStatus === "VERBAL_PROMPT"}
                            disabled={locked}
                            onPress={() =>
                              updatePocItem(String(d.id), {
                                completionStatus: "VERBAL_PROMPT",
                              })
                            }
                          />
                          <POCStatusButton
                            label="Assist"
                            value="PHYSICAL_ASSIST"
                            active={item?.completionStatus === "PHYSICAL_ASSIST"}
                            disabled={locked}
                            onPress={() =>
                              updatePocItem(String(d.id), {
                                completionStatus: "PHYSICAL_ASSIST",
                              })
                            }
                          />
                          <POCStatusButton
                            label="Refused"
                            value="REFUSED"
                            active={item?.completionStatus === "REFUSED"}
                            disabled={locked}
                            onPress={() =>
                              updatePocItem(String(d.id), {
                                completionStatus: "REFUSED",
                              })
                            }
                          />
                        </View>

                        <View style={styles.listMetaRow}>
                          <Text style={styles.listMetaK}>Time:</Text>
                          <Text style={styles.listMetaV}>
                            {item?.completedAt || "—"}
                          </Text>
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: 10 }]}>
                          Note
                        </Text>
                        <TextInput
                          value={item?.note || ""}
                          onChangeText={(t) =>
                            updatePocItem(String(d.id), { note: t })
                          }
                          placeholder="Optional note..."
                          placeholderTextColor="#6b7280"
                          style={styles.textArea}
                          multiline
                          editable={!locked}
                        />
                      </View>
                    );
                  })}

                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => savePoc("DRAFT")}
                    disabled={pocSaving || pocDaily.status === "SUBMITTED"}
                    style={[
                      styles.outBtn,
                      pocSaving || pocDaily.status === "SUBMITTED"
                        ? styles.btnDisabled
                        : null,
                    ]}
                  >
                    {pocSaving ? (
                      <ActivityIndicator color="#e5e7eb" />
                    ) : (
                      <Text style={styles.outBtnText}>Save</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={() => savePoc("SUBMITTED")}
                    disabled={pocSaving || pocDaily.status === "SUBMITTED"}
                    style={[
                      styles.primaryBtn,
                      pocSaving || pocDaily.status === "SUBMITTED"
                        ? styles.btnDisabled
                        : null,
                    ]}
                  >
                    {pocSaving ? (
                      <ActivityIndicator color="#022c22" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Submit</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      ) : (
        <DailyNoteScreen
          // @ts-ignore
          navigation={navigation}
          // @ts-ignore
          route={{
            key: "DailyNoteTab",
            name: "DailyNote",
            params: {
              shiftId,
              staffId,
              staffName,
              staffEmail,
            },
          }}
        />
      )}
    </View>
  );
}

// =======================
// Small components
// =======================
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.k}>{label}</Text>
      <Text style={styles.v}>{value}</Text>
    </View>
  );
}

// =======================
// Styles
// =======================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },

  topBar: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  backBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  backText: { color: "#93c5fd", fontWeight: "900", fontSize: 14 },
  title: { color: "#e5e7eb", fontSize: 16, fontWeight: "900" },
  subtitle: { color: "#9ca3af", fontSize: 12, fontWeight: "700", marginTop: 2 },

  tabsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#111827",
  },
  tabBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#020617",
  },
  tabBtnActive: {
    backgroundColor: "#0b1120",
    borderColor: "#93c5fd",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#94a3b8",
  },
  tabTextActive: {
    color: "#93c5fd",
  },

  body: { flex: 1 },
  bodyContent: { padding: 12, paddingBottom: 24 },

  card: {
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#e5e7eb",
    marginBottom: 8,
  },

  row: { marginTop: 8 },
  k: { fontSize: 12, color: "#9ca3af", fontWeight: "800" },
  v: { marginTop: 2, fontSize: 14, color: "#e5e7eb", fontWeight: "700" },

  fieldLabel: { fontSize: 13, color: "#9ca3af", fontWeight: "800" },
  mutedText: { marginTop: 6, fontSize: 13, color: "#9ca3af", fontWeight: "700" },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },

  input: {
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#374151",
    backgroundColor: "#020617",
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "700",
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

  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },

  primaryBtn: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryBtnText: { color: "#022c22", fontSize: 16, fontWeight: "900" },

  outBtn: {
    flex: 1,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  outBtnText: { color: "#e5e7eb", fontSize: 16, fontWeight: "900" },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1f2937",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#93c5fd", fontWeight: "900", fontSize: 14 },

  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#0b1120",
  },
  miniBtnText: { color: "#93c5fd", fontWeight: "900", fontSize: 12 },

  btnDisabled: { opacity: 0.5 },

  footerHint: {
    marginTop: 12,
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },

  // list cards
  listCard: {
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 14,
    padding: 12,
  },
  listTitle: { color: "#e5e7eb", fontWeight: "900", fontSize: 14 },
  listSub: { color: "#cbd5e1", fontWeight: "800", fontSize: 12, marginTop: 6 },
  listMuted: { color: "#9ca3af", fontWeight: "700", fontSize: 12, marginTop: 6 },
  listMetaRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  listMetaK: { color: "#9ca3af", fontWeight: "900", fontSize: 12 },
  listMetaV: { color: "#e5e7eb", fontWeight: "800", fontSize: 12 },

  // loading
  loadingRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 13, color: "#9ca3af", fontWeight: "700" },
  warnText: { color: "#f59e0b", fontWeight: "900", fontSize: 13 },

  // pills
  pillsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  pocPill: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#020617",
  },
  pocPillActive: {
    borderColor: "#93c5fd",
    backgroundColor: "#0b1120",
  },
  pocPillText: { color: "#94a3b8", fontWeight: "900", fontSize: 12 },
  pocPillTextActive: { color: "#93c5fd" },

  // badges
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  badgeText: { color: "#9ca3af", fontWeight: "900", fontSize: 12 },

  // modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#0b1120",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: "#1f2937",
    maxHeight: "90%", // ✅ important for iOS scroll
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 16, fontWeight: "900", color: "#e5e7eb" },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalCloseText: { fontSize: 16, fontWeight: "900", color: "#e5e7eb" },
  modalHint: { marginBottom: 10, fontSize: 12, color: "#9ca3af" },
});