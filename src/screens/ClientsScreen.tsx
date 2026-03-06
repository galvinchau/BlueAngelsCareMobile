// src/screens/ClientsScreen.tsx
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ClientsStackParamList, MainDrawerParamList } from "../../App";
import {
  searchIndividuals,
  type MobileIndividualLite,
} from "../api/mobileClient";

// NEW: for unknown-visit API
import { BACKEND_BASE_URL } from "../config";
import { getStaffInfo } from "../auth/authStorage";

type Props = NativeStackScreenProps<ClientsStackParamList, "ClientsList">;

const MOCK_INDIVIDUALS: MobileIndividualLite[] = [
  {
    id: "mock_001",
    fullName: "John Smith",
    maNumber: "MA-1000123",
    address1: "202 Campbell Ave",
    address2: "Altoona, PA 16602",
    phone: "(814) 555-1001",
  },
  {
    id: "mock_002",
    fullName: "Mary Johnson",
    maNumber: "MA-1000456",
    address1: "101 E Plank Rd",
    address2: "Altoona, PA 16602",
    phone: "(814) 555-1002",
  },
  {
    id: "mock_003",
    fullName: "David Brown",
    maNumber: "MA-1000789",
    address1: "Woodlawn Ter",
    address2: "Hollidaysburg, PA 16648",
    phone: "(814) 555-1003",
  },
  {
    id: "mock_004",
    fullName: "Donald Brown",
    maNumber: "MA-1000999",
    address1: "Somewhere St",
    address2: "Altoona, PA 16602",
    phone: "(814) 555-1004",
  },
];

function normalizeText(s: string): string {
  return (s || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function nameMatches(fullName: string, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;

  const n = normalizeText(fullName);
  if (!n) return false;

  if (n.includes(q)) return true;

  const qTokens = q.split(" ").filter(Boolean);
  const nTokens = n.split(" ").filter(Boolean);

  if (qTokens.length === 1) {
    const t = qTokens[0];
    return nTokens.some((nt) => nt.startsWith(t) || nt.includes(t));
  }

  return qTokens.every((qt) =>
    nTokens.some((nt) => nt.startsWith(qt) || nt.includes(qt))
  );
}

function clientMatches(item: MobileIndividualLite, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;

  const id = normalizeText(item.id || "");
  const ma = normalizeText(item.maNumber || "");
  const phone = normalizeText(item.phone || "");
  const addr1 = normalizeText(item.address1 || "");
  const addr2 = normalizeText(item.address2 || "");

  if (id.includes(q)) return true;
  if (ma.includes(q)) return true;
  if (phone.includes(q)) return true;
  if (addr1.includes(q)) return true;
  if (addr2.includes(q)) return true;

  if (nameMatches(item.fullName, q)) return true;

  return false;
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

function buildAddressLine(ind?: MobileIndividualLite | null): string {
  if (!ind) return "";
  const parts = [ind.address1, ind.address2].filter(Boolean);
  return parts.join(", ");
}

async function openMapsForAddress(addressText: string) {
  const addr = (addressText || "").trim();
  if (!addr) {
    Alert.alert("Directions", "Address is not available.");
    return;
  }

  const encoded = encodeURIComponent(addr);
  const appleMapsUrl = `http://maps.apple.com/?q=${encoded}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  try {
    const canApple = await Linking.canOpenURL(appleMapsUrl);
    if (canApple) {
      await Linking.openURL(appleMapsUrl);
      return;
    }
  } catch {
    // ignore
  }

  try {
    await Linking.openURL(googleMapsUrl);
  } catch {
    Alert.alert("Directions", "Unable to open Maps on this device.");
  }
}

export default function ClientsScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [items, setItems] = useState<MobileIndividualLite[]>([]);
  const [searched, setSearched] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [unknownOpen, setUnknownOpen] = useState(false);

  const canSearch = useMemo(() => query.trim().length > 0, [query]);

  const runSearch = async () => {
    const q = query.trim();
    setSearched(true);
    setNotice(null);

    if (!q) {
      setItems([]);
      setUsingMock(false);
      return;
    }

    setLoading(true);
    try {
      const res = await searchIndividuals(q);
      setItems(res || []);
      setUsingMock(false);
      if ((res || []).length === 0) setNotice("No matching clients found.");
    } catch {
      setNotice(
        "Server search is not available right now. Showing offline mode."
      );
      setUsingMock(true);
      const filtered = MOCK_INDIVIDUALS.filter((x) => clientMatches(x, q));
      setItems(filtered);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = (item: MobileIndividualLite) => {
    navigation.navigate("ClientDetail", { individual: item });
  };

  /**
   * After creating unknown visit -> go to Drawer DailyNote with shiftId
   */
  const handleUnknownVisitCreated = async (shiftId: string) => {
    try {
      const parent = navigation.getParent(); // Drawer
      const staff = await getStaffInfo();

      // @ts-ignore - Drawer route exists in App.tsx
      parent?.navigate?.("DailyNote", {
        shiftId,
        staffId: staff?.staffId,
        staffName: staff?.staffName,
        staffEmail: staff?.email,
      } as MainDrawerParamList["DailyNote"]);
    } catch (e) {
      console.log("[ClientsScreen] handleUnknownVisitCreated nav error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topPanel}>
            <Text style={styles.sectionTitle}>Clients</Text>

            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={BAC.muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={runSearch}
            />

            <Text style={styles.helperText}>
              Search by Client ID, Medicaid ID, or Name (First/Last)
            </Text>

            <Pressable
              onPress={runSearch}
              disabled={!canSearch || loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (!canSearch || loading) && styles.primaryBtnDisabled,
                pressed && !loading && canSearch ? { opacity: 0.92 } : null,
              ]}
            >
              {loading ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryBtnText}>Searching...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Search</Text>
              )}
            </Pressable>

            {notice ? (
              <Text
                style={[styles.notice, usingMock ? styles.noticeWarn : null]}
              >
                {notice}
              </Text>
            ) : null}

            {usingMock ? (
              <Text style={styles.offlineTag}>Offline mode (mock data)</Text>
            ) : null}
          </View>

          <View style={styles.resultsWrap}>
            {searched && !loading ? (
              items.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.emptySub}>Try a different keyword.</Text>
                </View>
              ) : (
                <View style={styles.listWrap}>
                  {items.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => openDetail(item)}
                      style={({ pressed }) => [
                        styles.resultCard,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      <View style={styles.resultHeader}>
                        <Text style={styles.resultName} numberOfLines={1}>
                          {item.fullName}
                        </Text>
                        {item.maNumber ? (
                          <Text style={styles.pill}>{item.maNumber}</Text>
                        ) : null}
                      </View>

                      {!!item.address1 && (
                        <Text style={styles.resultLine}>{item.address1}</Text>
                      )}
                      {!!item.address2 && (
                        <Text style={styles.resultLine}>{item.address2}</Text>
                      )}
                      {!!item.phone && (
                        <Text style={styles.resultSub}>{item.phone}</Text>
                      )}

                      <Text style={styles.tapHint}>Tap to open</Text>
                    </Pressable>
                  ))}
                </View>
              )
            ) : (
              <View style={styles.preSearchWrap}>
                <Text style={styles.preSearchMuted}>
                  Enter a keyword and tap Search.
                </Text>
              </View>
            )}
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Missing client information?</Text>
            <Text style={styles.footerSub}>
              Start an unknown visit and enter the details manually.
            </Text>

            <Pressable
              onPress={() => setUnknownOpen(true)}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.92 },
              ]}
            >
              <Text style={styles.primaryBtnText}>Start Unknown Visit</Text>
            </Pressable>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>

        <UnknownVisitModal
          visible={unknownOpen}
          onClose={() => setUnknownOpen(false)}
          onCreated={handleUnknownVisitCreated}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =======================
// Unknown Visit Modal
// (New flow: input loose -> Search -> pick individual -> auto location -> tap address -> maps)
// =======================
function UnknownVisitModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (shiftId: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [medicaidId, setMedicaidId] = useState("");

  const [serviceCode, setServiceCode] = useState<"W1726" | "HCSS" | "PCA">(
    "W1726"
  );

  const [picked, setPicked] = useState<MobileIndividualLite | null>(null);
  const [location, setLocation] = useState("");

  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestErr, setSuggestErr] = useState<string | null>(null);
  const [suggestItems, setSuggestItems] = useState<MobileIndividualLite[]>([]);

  const [groupCode, setGroupCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const SERVICE_OPTIONS: Array<"W1726" | "HCSS" | "PCA"> = [
    "W1726",
    "HCSS",
    "PCA",
  ];

  const canSearch =
    firstName.trim().length > 0 ||
    lastName.trim().length > 0 ||
    medicaidId.trim().length > 0;

  const canStart = !!picked && !submitting;

  const resetAll = () => {
    setFirstName("");
    setLastName("");
    setMedicaidId("");
    setServiceCode("W1726");
    setPicked(null);
    setLocation("");
    setSuggestErr(null);
    setSuggestItems([]);
    setGroupCode("");
  };

  const runSuggestSearch = async () => {
    if (!canSearch || suggestLoading) return;

    setSuggestLoading(true);
    setSuggestErr(null);
    setSuggestItems([]);
    setPicked(null);
    setLocation("");

    try {
      // Loose query: combine what user typed
      const q = [firstName.trim(), lastName.trim(), medicaidId.trim()]
        .filter(Boolean)
        .join(" ");

      const res = await searchIndividuals(q);
      const list = (res || []).slice(0, 8); // limit
      setSuggestItems(list);

      if (list.length === 0) {
        setSuggestErr("No matching clients found. Try a different keyword.");
      }
    } catch (e: any) {
      setSuggestErr(
        "Server search is not available right now. Please try again."
      );
      setSuggestItems([]);
    } finally {
      setSuggestLoading(false);
    }
  };

  const chooseIndividual = (ind: MobileIndividualLite) => {
    setPicked(ind);

    // auto-fill medicaid and location
    if (ind.maNumber) setMedicaidId(ind.maNumber);
    const addr = buildAddressLine(ind);
    setLocation(addr);
  };

  /**
   * Create AD-HOC shift on backend then navigate to DailyNote
   * Expected backend response: { shiftId: string }
   */
  const startVisit = async () => {
    if (!canStart) {
      Alert.alert(
        "Select a client",
        "Please search and select the correct client first."
      );
      return;
    }

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

        // from picked individual
        firstName: (picked?.fullName || "").split(" ").filter(Boolean)[0] || "",
        lastName:
          (picked?.fullName || "")
            .split(" ")
            .filter(Boolean)
            .slice(1)
            .join(" ") || "",

        // keep medicaid (optional)
        medicaidId: medicaidId.trim() || null,

        // NEW
        serviceCode,
        location: location.trim() || null,

        clientTime: new Date().toISOString(),
      };

      const url = `${BACKEND_BASE_URL}/mobile/visits/unknown/start`;

      Alert.alert(
        "DEBUG Unknown Visit",
        `serviceCode = ${serviceCode}\nurl = ${url}`
      );
      return;
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

      // close & reset
      onClose();
      resetAll();

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
                resetAll();
              }}
              style={styles.modalCloseBtn}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.modalHint}>
            Enter any of the fields below, then tap Search to find the client.
          </Text>

          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First Name (optional)"
            placeholderTextColor={BAC.muted}
            style={styles.modalInput}
          />
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last Name (optional)"
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

          {/* Search button */}
          <Pressable
            onPress={runSuggestSearch}
            disabled={!canSearch || suggestLoading || submitting}
            style={[
              styles.secondaryBtn,
              (!canSearch || suggestLoading || submitting) &&
              styles.secondaryBtnDisabled,
            ]}
          >
            {suggestLoading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator />
                <Text style={styles.secondaryBtnText}>Searching...</Text>
              </View>
            ) : (
              <Text style={styles.secondaryBtnText}>Search</Text>
            )}
          </Pressable>

          {suggestErr ? (
            <Text style={styles.suggestErr}>{suggestErr}</Text>
          ) : null}

          {/* Suggest list */}
          {suggestItems.length > 0 ? (
            <View style={styles.suggestWrap}>
              <Text style={styles.modalLabel}>Select the correct client</Text>

              <View style={{ marginTop: 8, gap: 8 }}>
                {suggestItems.map((x) => {
                  const active = picked?.id === x.id;
                  const addr = buildAddressLine(x);
                  return (
                    <Pressable
                      key={x.id}
                      onPress={() => chooseIndividual(x)}
                      style={({ pressed }) => [
                        styles.suggestItem,
                        active ? styles.suggestItemActive : null,
                        pressed ? { opacity: 0.92 } : null,
                      ]}
                    >
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestName} numberOfLines={1}>
                            {x.fullName}
                          </Text>
                          {!!x.maNumber && (
                            <Text style={styles.suggestMeta}>{x.maNumber}</Text>
                          )}
                          {!!addr && (
                            <Text style={styles.suggestAddr} numberOfLines={2}>
                              {addr}
                            </Text>
                          )}
                        </View>

                        {active ? (
                          <View style={styles.checkPill}>
                            <Text style={styles.checkPillText}>Selected</Text>
                          </View>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Type Service */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>Type Service</Text>
            <View style={styles.chipsRow}>
              {SERVICE_OPTIONS.map((code) => {
                const active = serviceCode === code;
                return (
                  <Pressable
                    key={code}
                    onPress={() => setServiceCode(code)}
                    disabled={submitting}
                    style={({ pressed }) => [
                      styles.chip,
                      active ? styles.chipActive : null,
                      pressed && !submitting ? { opacity: 0.9 } : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        active ? styles.chipTextActive : null,
                      ]}
                    >
                      {code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Location (auto from picked) */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.modalLabel}>Location</Text>

            {location ? (
              <Pressable
                onPress={() => openMapsForAddress(location)}
                style={({ pressed }) => [
                  styles.locationCard,
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <Text style={styles.locationText}>{location}</Text>
                <Text style={styles.locationHint}>Tap to open Maps</Text>
              </Pressable>
            ) : (
              <Text style={styles.mutedSmall}>
                Select a client to auto-fill address.
              </Text>
            )}
          </View>

          {/* Start visit */}
          <Pressable
            onPress={startVisit}
            disabled={!canStart}
            style={[
              styles.primaryBtn,
              !canStart ? styles.primaryBtnDisabled : null,
            ]}
          >
            {submitting ? (
              <View style={styles.btnRow}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryBtnText}>Starting...</Text>
              </View>
            ) : (
              <Text style={styles.primaryBtnText}>Start Visit</Text>
            )}
          </Pressable>

          <Pressable
            onPress={startGroupVisit}
            disabled={submitting}
            style={[styles.secondaryBtn]}
          >
            <Text style={styles.secondaryBtnText}>Start Group Visit</Text>
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
            style={[styles.secondaryBtn]}
          >
            <Text style={styles.secondaryBtnText}>Join Group Visit</Text>
          </Pressable>

          <View style={{ height: 6 }} />
        </View>
      </View>
    </Modal>
  );
}

// =======================
// BAC Theme Colors
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
};

// =======================
// Styles
// =======================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BAC.bg },
  content: { paddingBottom: 18 },

  topPanel: {
    backgroundColor: BAC.panel,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: BAC.border,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: BAC.text,
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: BAC.text,
  },
  helperText: { marginTop: 8, fontSize: 12, color: BAC.muted },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: BAC.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { backgroundColor: BAC.primarySoft },
  primaryBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 10 },

  secondaryBtn: {
    marginTop: 10,
    backgroundColor: BAC.soft,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: BAC.border,
  },
  secondaryBtnDisabled: { opacity: 0.5 },
  secondaryBtnText: { color: BAC.primary, fontWeight: "900", fontSize: 15 },

  notice: { marginTop: 10, fontSize: 12, color: BAC.text },
  noticeWarn: { color: BAC.warn },
  offlineTag: {
    marginTop: 6,
    fontSize: 12,
    color: BAC.warn,
    fontWeight: "800",
  },

  resultsWrap: { paddingHorizontal: 16, paddingTop: 12 },
  listWrap: { gap: 12 },

  preSearchWrap: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  preSearchMuted: { fontSize: 13, color: BAC.muted, textAlign: "center" },

  emptyWrap: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "900", color: BAC.text },
  emptySub: { fontSize: 13, color: BAC.muted, textAlign: "center" },

  resultCard: {
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    marginBottom: 8,
  },
  resultName: { fontSize: 16, fontWeight: "900", color: BAC.text, flex: 1 },
  pill: {
    fontSize: 12,
    fontWeight: "900",
    color: BAC.text,
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  resultLine: { fontSize: 14, color: BAC.text, marginTop: 2 },
  resultSub: { fontSize: 13, color: "#334155", marginTop: 6 },
  tapHint: { marginTop: 10, fontSize: 12, color: BAC.muted },

  footerCard: {
    marginTop: 14,
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BAC.border,
    padding: 14,
  },
  footerTitle: { fontSize: 14, fontWeight: "900", color: BAC.text },
  footerSub: { marginTop: 4, fontSize: 12, color: BAC.muted },

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

  modalLabel: { fontSize: 12, fontWeight: "900", color: BAC.text },

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

  suggestErr: {
    marginTop: 10,
    fontSize: 12,
    color: BAC.warn,
    fontWeight: "800",
  },

  suggestWrap: { marginTop: 12 },
  suggestItem: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 12,
    padding: 12,
  },
  suggestItemActive: { borderColor: BAC.primary },
  suggestName: { fontSize: 14, fontWeight: "900", color: BAC.text },
  suggestMeta: {
    marginTop: 4,
    fontSize: 12,
    color: BAC.muted,
    fontWeight: "800",
  },
  suggestAddr: { marginTop: 4, fontSize: 12, color: BAC.text },

  checkPill: {
    alignSelf: "flex-start",
    backgroundColor: BAC.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  checkPillText: { color: "#fff", fontWeight: "900", fontSize: 11 },

  chipsRow: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
  },
  chipActive: {
    backgroundColor: BAC.primary,
    borderColor: BAC.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "900",
    color: BAC.primary,
  },
  chipTextActive: { color: "#fff" },

  locationCard: {
    marginTop: 8,
    backgroundColor: BAC.soft,
    borderWidth: 1,
    borderColor: BAC.border,
    borderRadius: 12,
    padding: 12,
  },
  locationText: { fontSize: 13, fontWeight: "900", color: BAC.text },
  locationHint: {
    marginTop: 4,
    fontSize: 12,
    color: BAC.muted,
    fontWeight: "800",
  },
  mutedSmall: { marginTop: 8, fontSize: 12, color: BAC.muted },

  divider: {
    marginTop: 12,
    marginBottom: 4,
    height: 1,
    backgroundColor: "#e6eaf5",
  },
});
