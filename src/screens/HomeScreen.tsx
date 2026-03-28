// bac-Mobile/BlueAngelscareMobile/src/screens/HomeScreen.tsx

import React, { useCallback, useMemo, useState } from "react";
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
import { getShiftsWindow } from "../api/mobileClient";

// ===== EXISTING BACKUP SHIFT IMPORTS =====
import BackupShiftAlert from "../components/BackupShiftAlert";
import {
  getBackupShifts,
  acceptBackupShift,
  type BackupShiftItem,
} from "../services/backupShiftApi";

// ===== NEW CANCEL ALERT IMPORTS =====
import CancelShiftAlert from "../components/CancelShiftAlert";
import {
  getCancelShiftAlerts,
  dismissCancelShiftAlert,
  type CancelShiftAlertItem,
} from "../services/cancelShiftAlertApi";

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

type HomeScreenProps = NativeStackScreenProps<
  MainDrawerParamList & RootStackParamList,
  "Visits"
> &
  any;

type TabKey = "UPCOMING" | "PAST";

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDateHeader(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return "Today";

  const dt = parseYMD(ymd);
  const todayDt = parseYMD(todayYmd);

  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((dt.getTime() - todayDt.getTime()) / oneDay);

  if (diffDays === -1) return "Yesterday";
  if (diffDays === 1) return "Tomorrow";

  const weekday = dt.toLocaleDateString("en-US", { weekday: "long" });
  return weekday;
}

function formatDateRight(ymd: string): string {
  const dt = parseYMD(ymd);
  return dt.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function sortByDateTimeAsc(a: MobileShift, b: MobileShift) {
  const aKey = `${a.date} ${a.scheduleStart || "00:00"}`;
  const bKey = `${b.date} ${b.scheduleStart || "00:00"}`;
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

function sortByDateTimeDesc(a: MobileShift, b: MobileShift) {
  const aKey = `${a.date} ${a.scheduleStart || "00:00"}`;
  const bKey = `${b.date} ${b.scheduleStart || "00:00"}`;
  return aKey > bKey ? -1 : aKey < bKey ? 1 : 0;
}

function groupByDate(
  shifts: MobileShift[]
): Array<{ date: string; items: MobileShift[] }> {
  const map = new Map<string, MobileShift[]>();
  for (const s of shifts) {
    const key = s.date || "";
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }

  const dates = Array.from(map.keys()).sort();
  return dates.map((d) => ({
    date: d,
    items: (map.get(d) || []).sort(sortByDateTimeAsc),
  }));
}

function isShiftActiveOrOpen(shift: MobileShift): boolean {
  return shift.status === "IN_PROGRESS" || (!!shift.visitStart && !shift.visitEnd);
}

export default function HomeScreen({ route, navigation }: HomeScreenProps) {
  const { staffId, staffName, staffEmail } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState<MobileShift[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("UPCOMING");

  // ===== EXISTING BACKUP STATE =====
  const [backupShifts, setBackupShifts] = useState<BackupShiftItem[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);

  // ===== NEW CANCEL ALERT STATE =====
  const [cancelAlerts, setCancelAlerts] = useState<CancelShiftAlertItem[]>([]);
  const [cancelAlertsLoading, setCancelAlertsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!staffId) return;

      let isActive = true;

      async function load() {
        setLoading(true);
        setError(null);

        try {
          const todayStr = getLocalDateYYYYMMDD();
          const data = await getShiftsWindow(staffId, todayStr);
          if (isActive) setShifts(data);
        } catch (e) {
          console.error("[HomeScreen] load shifts window error:", e);
          if (isActive) {
            setError("Could not load shifts. Please try again later.");
          }
        } finally {
          if (isActive) setLoading(false);
        }
      }

      async function loadBackup() {
        try {
          setBackupLoading(true);
          const data = await getBackupShifts();
          if (isActive) {
            setBackupShifts(Array.isArray(data?.items) ? data.items : []);
          }
        } catch (e) {
          console.error("[HomeScreen] load backup shifts error:", e);
          if (isActive) {
            setBackupShifts([]);
          }
        } finally {
          if (isActive) setBackupLoading(false);
        }
      }

      async function loadCancelAlerts() {
        try {
          setCancelAlertsLoading(true);
          const data = await getCancelShiftAlerts(staffId);
          if (isActive) {
            setCancelAlerts(Array.isArray(data?.items) ? data.items : []);
          }
        } catch (e) {
          console.error("[HomeScreen] load cancel alerts error:", e);
          if (isActive) {
            setCancelAlerts([]);
          }
        } finally {
          if (isActive) setCancelAlertsLoading(false);
        }
      }

      load();
      loadBackup();
      loadCancelAlerts();

      return () => {
        isActive = false;
      };
    }, [staffId])
  );

  function openShift(shiftId: string) {
    if (!staffId) {
      Alert.alert(
        "Missing staff info",
        "Cannot open shift because staff information is missing."
      );
      return;
    }

    navigation.navigate("VisitTabs", {
      shiftId,
      staffId,
      staffName,
      staffEmail,
      initialTab: "DAILY_NOTE",
    });
  }

  function handleOpenDailyNote() {
    if (!staffId) {
      Alert.alert(
        "Missing staff info",
        "Cannot open Daily Note because staff information is missing."
      );
      return;
    }

    const todayStr = getLocalDateYYYYMMDD();
    const safe = Array.isArray(shifts) ? shifts : [];

    const activeOpenShift =
      safe
        .filter((s) => isShiftActiveOrOpen(s))
        .sort(sortByDateTimeAsc)[0] || null;

    if (activeOpenShift) {
      navigation.navigate("DailyNote", {
        shiftId: activeOpenShift.id,
        staffId,
        staffName,
        staffEmail,
      });
      return;
    }

    const upcomingSorted = safe
      .filter((s) => (s.date || "") >= todayStr)
      .sort(sortByDateTimeAsc);

    if (!upcomingSorted || upcomingSorted.length === 0) {
      Alert.alert(
        "No upcoming shifts",
        "You have no upcoming shifts scheduled. Please contact the office if you think this is a mistake."
      );
      return;
    }

    navigation.navigate("DailyNote", {
      shiftId: upcomingSorted[0].id,
      staffId,
      staffName,
      staffEmail,
    });
  }

  function handleOpenMenu() {
    navigation.openDrawer();
  }

  // ===== EXISTING BACKUP HANDLERS =====
  async function refreshBackupShifts() {
    try {
      setBackupLoading(true);
      const data = await getBackupShifts();
      setBackupShifts(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error("[HomeScreen] refresh backup shifts error:", e);
      setBackupShifts([]);
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleAcceptBackupShift(shiftId: string) {
    if (!staffId) {
      Alert.alert(
        "Missing staff info",
        "Cannot accept shift because staff information is missing."
      );
      return;
    }

    try {
      await acceptBackupShift(shiftId, staffId);

      Alert.alert("Success", "You have successfully claimed this shift.");

      await refreshBackupShifts();
    } catch (e: any) {
      console.error("[HomeScreen] accept backup shift error:", e);

      Alert.alert(
        "Unavailable",
        "This shift has already been claimed by another DSP."
      );

      await refreshBackupShifts();
    }
  }

  function handleDismissBackupShift(shiftId: string) {
    setBackupShifts((prev) => prev.filter((s) => s.id !== shiftId));
  }

  // ===== NEW CANCEL ALERT HANDLERS =====
  async function handleDismissCancelAlert(alertId: string) {
    try {
      await dismissCancelShiftAlert(alertId);
      setCancelAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e) {
      console.error("[HomeScreen] dismiss cancel alert error:", e);
      Alert.alert(
        "Error",
        "Could not dismiss this alert right now. Please try again."
      );
    }
  }

  const todayStr = useMemo(() => getLocalDateYYYYMMDD(), [shifts.length]);

  const { pastShiftsSorted, upcomingShiftsSorted } = useMemo(() => {
    const safe = Array.isArray(shifts) ? shifts : [];

    const upcoming = safe
      .filter((s) => {
        if (isShiftActiveOrOpen(s)) return true;
        return (s.date || "") >= todayStr;
      })
      .sort(sortByDateTimeAsc);

    const past = safe
      .filter((s) => {
        if (isShiftActiveOrOpen(s)) return false;
        return (s.date || "") < todayStr;
      })
      .sort(sortByDateTimeDesc);

    return { pastShiftsSorted: past, upcomingShiftsSorted: upcoming };
  }, [shifts, todayStr]);

  const activeList = tab === "UPCOMING" ? upcomingShiftsSorted : pastShiftsSorted;

  const grouped = useMemo(() => {
    if (tab === "UPCOMING") {
      return groupByDate(activeList);
    }

    const map = new Map<string, MobileShift[]>();
    for (const s of activeList) {
      const key = s.date || "";
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }

    const dates = Array.from(map.keys()).sort().reverse();
    return dates.map((d) => ({
      date: d,
      items: (map.get(d) || []).sort(sortByDateTimeAsc),
    }));
  }, [activeList, tab]);

  const nextUpcoming = upcomingShiftsSorted[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
        Quick access to <Text style={styles.highlight}>Upcoming</Text> and{" "}
        <Text style={styles.highlight}>Past</Text> shifts, plus{" "}
        <Text style={styles.highlight}>Daily Notes</Text>.
      </Text>

      {/* ===== NEW: Cancel Shift Alerts ===== */}
      {cancelAlertsLoading ? (
        <View style={styles.cancelLoadingBox}>
          <ActivityIndicator color="#ffffff" />
          <Text style={styles.cancelLoadingText}> Loading cancellation alerts…</Text>
        </View>
      ) : cancelAlerts.length > 0 ? (
        <View style={styles.cancelAlertsBox}>
          {cancelAlerts.map((item) => (
            <CancelShiftAlert
              key={item.id}
              alert={item}
              onDismiss={() => handleDismissCancelAlert(item.id)}
            />
          ))}
        </View>
      ) : null}

      {/* ===== EXISTING: Backup Shift Alerts ===== */}
      {backupLoading ? (
        <View style={styles.backupLoadingBox}>
          <ActivityIndicator color="#22c55e" />
          <Text style={styles.backupLoadingText}> Loading backup shift alerts…</Text>
        </View>
      ) : backupShifts.length > 0 ? (
        <View style={styles.backupAlertsBox}>
          {backupShifts.map((shift) => (
            <BackupShiftAlert
              key={shift.id}
              shift={shift}
              onAccept={handleAcceptBackupShift}
              onDismiss={() => handleDismissBackupShift(shift.id)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.summaryBox}>
        {loading ? (
          <View style={styles.summaryRow}>
            <ActivityIndicator color="#a5b4fc" />
            <Text style={styles.summaryText}> Loading shifts…</Text>
          </View>
        ) : error ? (
          <Text style={styles.summaryError}>{error}</Text>
        ) : (
          <>
            <View style={styles.tabsRow}>
              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  tab === "UPCOMING" ? styles.tabBtnActive : null,
                ]}
                onPress={() => setTab("UPCOMING")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "UPCOMING" ? styles.tabTextActive : null,
                  ]}
                >
                  UPCOMING
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabBtn,
                  tab === "PAST" ? styles.tabBtnActive : null,
                ]}
                onPress={() => setTab("PAST")}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === "PAST" ? styles.tabTextActive : null,
                  ]}
                >
                  PAST
                </Text>
              </TouchableOpacity>
            </View>

            {tab === "UPCOMING" ? (
              <>
                {upcomingShiftsSorted.length === 0 ? (
                  <Text style={styles.summaryText}>
                    You have no upcoming shifts in the current 3-week window.
                  </Text>
                ) : (
                  <>
                    <Text style={styles.summaryText}>
                      You have{" "}
                      <Text style={styles.summaryHighlight}>
                        {upcomingShiftsSorted.length}
                      </Text>{" "}
                      upcoming shift{upcomingShiftsSorted.length > 1 ? "s" : ""}.
                    </Text>

                    {nextUpcoming && (
                      <Text style={styles.nextShiftText}>
                        Next shift: {nextUpcoming.serviceName} •{" "}
                        {nextUpcoming.scheduleStart} – {nextUpcoming.scheduleEnd}
                      </Text>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {pastShiftsSorted.length === 0 ? (
                  <Text style={styles.summaryText}>
                    You have no past shifts in the current 3-week window.
                  </Text>
                ) : (
                  <Text style={styles.summaryText}>
                    You have{" "}
                    <Text style={styles.summaryHighlight}>
                      {pastShiftsSorted.length}
                    </Text>{" "}
                    past shift{pastShiftsSorted.length > 1 ? "s" : ""}.
                  </Text>
                )}
              </>
            )}

            <View style={styles.shiftList}>
              {grouped.map((g) => (
                <View key={g.date} style={styles.dayGroup}>
                  <View style={styles.dayHeaderRow}>
                    <Text style={styles.dayHeaderLeft}>
                      {formatDateHeader(g.date, todayStr)}
                    </Text>
                    <Text style={styles.dayHeaderRight}>
                      {formatDateRight(g.date)}
                    </Text>
                  </View>

                  {g.items.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.shiftRow}
                      onPress={() => openShift(s.id)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.shiftTitle}>
                          {s.individualName ?? "Individual"} •{" "}
                          {s.serviceName ?? "Service"}
                        </Text>
                        <Text style={styles.shiftSub}>
                          {s.scheduleStart} – {s.scheduleEnd}
                        </Text>
                        {isShiftActiveOrOpen(s) ? (
                          <Text style={styles.activeBadge}>Active / Open</Text>
                        ) : null}
                      </View>
                      <Text style={styles.shiftAction}>Open</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleOpenDailyNote}>
        <Text style={styles.primaryButtonText}>Open Daily Note</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={handleOpenMenu}>
        <Text style={styles.secondaryButtonText}>Open Menu</Text>
      </TouchableOpacity>

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

  // ===== NEW CANCEL ALERT =====
  cancelAlertsBox: {
    width: "100%",
    marginBottom: 16,
  },
  cancelLoadingBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7f1d1d",
    backgroundColor: "#991b1b",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  cancelLoadingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  // ===== EXISTING BACKUP =====
  backupAlertsBox: {
    width: "100%",
    marginBottom: 16,
  },
  backupLoadingBox: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
    backgroundColor: "#020617",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  backupLoadingText: {
    color: "#e5e7eb",
    fontSize: 14,
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
    marginTop: 6,
  },

  tabsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: "800",
    color: "#94a3b8",
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: "#93c5fd",
  },

  shiftList: {
    marginTop: 12,
    gap: 14,
  },
  dayGroup: {
    gap: 8,
  },
  dayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingHorizontal: 2,
  },
  dayHeaderLeft: {
    fontSize: 18,
    fontWeight: "800",
    color: "#e5e7eb",
  },
  dayHeaderRight: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "700",
  },

  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#0b1120",
  },
  shiftTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#e5e7eb",
  },
  shiftSub: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  activeBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "800",
    color: "#22c55e",
  },
  shiftAction: {
    color: "#93c5fd",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
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