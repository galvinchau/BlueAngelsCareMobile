import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainDrawerParamList } from "../../App";
import { useHeaderHeight } from "@react-navigation/elements";

type Props = NativeStackScreenProps<MainDrawerParamList, "HealthIncident">;

const INCIDENT_TYPES = [
  "Physical Abuse",
  "Mental Abuse",
  "Neglect",
  "Exploitation",
  "Self-Neglect",
  "Extortion",
  "Misuse/Theft of Funds",
  "Unpaid Labor",
  "Passive Neglect",
  "Right Violation",
  "Sexual Abuse",
  "Suicide Attempt",
  "Death",
  "Missing/Theft of Medication",
  "Misapplication/Unauthorized Use of Restraint (Injury)",
  "Misapplication/Unauthorized Use of Restraint (No Injury)",
] as const;

type IncidentType = (typeof INCIDENT_TYPES)[number];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMMDDYYYY(d = new Date()) {
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

function formatHHMMA(d = new Date()) {
  const hh = d.getHours();
  const mm = d.getMinutes();
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${pad2(h12)}:${pad2(mm)} ${ampm}`;
}

function mmddyyyyToIsoDate(mmddyyyy: string): string | null {
  const s = String(mmddyyyy || "").trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (!m) return null;

  const mm = Number(m[1]);
  const dd = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy))
    return null;

  if (mm < 1 || mm > 12) return null;
  if (dd < 1 || dd > 31) return null;
  if (yyyy < 1900 || yyyy > 2100) return null;

  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
}

function getApiBaseUrl(): string | null {
  const anyEnv: any = process?.env ?? {};
  const url =
    anyEnv.EXPO_PUBLIC_API_URL ||
    anyEnv.EXPO_PUBLIC_BAC_API_BASE_URL ||
    null;

  if (!url) return null;
  return String(url).trim().replace(/\/+$/, "");
}

async function postJson(url: string, body: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      text ||
      `HTTP ${res.status} ${res.statusText}`;
    throw new Error(String(msg));
  }

  return json ?? { status: "OK" };
}

function safeStatusUpper(v: any): string {
  const s = String(v ?? "").trim();
  return s ? s.toUpperCase() : "SUBMITTED";
}

function toMMDDYYYYFromAnyDate(value: any, fallbackMMDDYYYY: string): string {
  try {
    const s = String(value ?? "").trim();
    if (!s) return fallbackMMDDYYYY;

    const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m1) return `${m1[2]}/${m1[3]}/${m1[1]}`;

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return formatMMDDYYYY(d);
    }

    return fallbackMMDDYYYY;
  } catch {
    return fallbackMMDDYYYY;
  }
}

function buildWitnessesText(args: {
  witness1Name: string;
  witness1Contact: string;
  witness2Name: string;
  witness2Contact: string;
}) {
  const lines: string[] = [];

  const w1n = String(args.witness1Name || "").trim();
  const w1c = String(args.witness1Contact || "").trim();
  if (w1n || w1c) {
    lines.push([w1n || "Witness 1", w1c ? `(${w1c})` : ""].filter(Boolean).join(" "));
  }

  const w2n = String(args.witness2Name || "").trim();
  const w2c = String(args.witness2Contact || "").trim();
  if (w2n || w2c) {
    lines.push([w2n || "Witness 2", w2c ? `(${w2c})` : ""].filter(Boolean).join(" "));
  }

  return lines.join("\n");
}

export default function HealthIncidentScreen({ navigation, route }: Props) {
  const headerHeight = useHeaderHeight();

  const params = route?.params ?? {};
  const staffId = params.staffId ?? "";
  const staffName = params.staffName ?? "";
  const staffEmail = params.staffEmail ?? "";

  const now = useMemo(() => new Date(), []);

  const [reportDate, setReportDate] = useState(formatMMDDYYYY(now));
  const [reportTime, setReportTime] = useState(formatHHMMA(now));

  const [reportedByName, setReportedByName] = useState(staffName);
  const [reportedByPosition, setReportedByPosition] = useState("");
  const [reportedByContact, setReportedByContact] = useState(staffEmail);

  const [incidentLocation, setIncidentLocation] = useState("");

  const [incidentDate, setIncidentDate] = useState(formatMMDDYYYY(now));
  const [incidentTime, setIncidentTime] = useState(formatHHMMA(now));

  const [individualName, setIndividualName] = useState("");
  const [individualDob, setIndividualDob] = useState("");

  const [accusedNames, setAccusedNames] = useState("");

  const [selectedTypes, setSelectedTypes] = useState<Record<string, boolean>>(
    {}
  );

  const selectedTypeList = useMemo(() => {
    return INCIDENT_TYPES.filter((t) => !!selectedTypes[t]);
  }, [selectedTypes]);

  const [description, setDescription] = useState("");
  const [witness1Name, setWitness1Name] = useState("");
  const [witness1Contact, setWitness1Contact] = useState("");
  const [witness2Name, setWitness2Name] = useState("");
  const [witness2Contact, setWitness2Contact] = useState("");

  const [additionalNotes, setAdditionalNotes] = useState("");
  const [attachments, setAttachments] = useState("");

  const [saving, setSaving] = useState(false);

  function toggleType(t: IncidentType) {
    setSelectedTypes((prev) => ({ ...prev, [t]: !prev[t] }));
  }

  function validateBasic(): string | null {
    if (!staffId.trim()) return "Missing staffId. Please login again.";
    if (!reportedByName.trim()) return "Please enter Reported By (Name).";
    if (!incidentDate.trim()) return "Please enter Date of Incident.";
    if (!incidentTime.trim()) return "Please enter Time of Incident.";
    if (!individualName.trim()) return "Please enter Involved Individual Name.";
    if (selectedTypeList.length === 0)
      return "Please select at least one Type of Incident.";
    if (!description.trim()) return "Please enter Detailed Description.";

    const api = getApiBaseUrl();
    if (!api) return "Missing EXPO_PUBLIC_API_URL in app env.";

    const iso = mmddyyyyToIsoDate(incidentDate);
    if (!iso) return "Incident Date must be MM/DD/YYYY.";

    return null;
  }

  async function handleSaveSubmit() {
    const msg = validateBasic();
    if (msg) {
      Alert.alert("Health & Incident", msg);
      return;
    }

    const api = getApiBaseUrl()!;
    const isoDate = mmddyyyyToIsoDate(incidentDate)!;

    const incidentTypeJoined = selectedTypeList.join(", ");
    const witnessesText = buildWitnessesText({
      witness1Name,
      witness1Contact,
      witness2Name,
      witness2Contact,
    });

    const body = {
      staffId: staffId.trim(),
      staffName: reportedByName.trim() || staffName || null,
      staffEmail: reportedByContact.trim() || staffEmail || null,

      individualName: individualName.trim() || null,
      individualId: null,

      shiftId: null,

      date: isoDate,
      status: "SUBMITTED",

      payload: {
        reportDate,
        reportTime,

        reportedByName,
        reportedByPosition,
        reportedByContact,

        location: incidentLocation,
        incidentLocation,

        incidentDate,
        incidentTime,

        individualName,
        individualDob,

        accusedNames,

        incidentTypes: selectedTypeList,
        incidentType: incidentTypeJoined,
        typeOfIncident: incidentTypeJoined,
        incident_type: incidentTypeJoined,

        description,
        details: description,
        incidentDescription: description,

        witness1Name,
        witness1Contact,
        witness2Name,
        witness2Contact,
        witnesses: witnessesText,

        additionalNotes,
        attachments,
      },
    };

    setSaving(true);
    try {
      const url = `${api}/mobile/health-incident`;
      const result = await postJson(url, body);

      const reportId = String(result?.id || "").trim() || "OK";
      const status = safeStatusUpper(result?.status);
      const dateText = toMMDDYYYYFromAnyDate(result?.date, incidentDate);

      Alert.alert(
        "Health & Incident",
        `Health & Incident Submitted Successfully\nDate: ${dateText}\nStatus: ${status}\nReport ID: ${reportId}`
      );
    } catch (e: any) {
      const err = String(e?.message || e);
      Alert.alert("Health & Incident", `Save failed.\n${err}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="always"
      >
        <Text style={styles.pageTitle}>Health & Incident</Text>
        <Text style={styles.pageSubtitle}>Incident Report Form</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Report Info</Text>

          <Text style={styles.fieldLabel}>Report Date (MM/DD/YYYY)</Text>
          <TextInput
            style={styles.input}
            value={reportDate}
            onChangeText={setReportDate}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Time of Report (HH:MM AM/PM)</Text>
          <TextInput
            style={styles.input}
            value={reportTime}
            onChangeText={setReportTime}
            placeholder="HH:MM AM/PM"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reported By</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={reportedByName}
            onChangeText={setReportedByName}
            placeholder="Full name"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Position</Text>
          <TextInput
            style={styles.input}
            value={reportedByPosition}
            onChangeText={setReportedByPosition}
            placeholder="Position"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Contact Information</Text>
          <TextInput
            style={styles.input}
            value={reportedByContact}
            onChangeText={setReportedByContact}
            placeholder="Phone / Email"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Location of Incident</Text>
          <TextInput
            style={styles.input}
            value={incidentLocation}
            onChangeText={setIncidentLocation}
            placeholder="Location"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Incident Date/Time</Text>

          <Text style={styles.fieldLabel}>Date of Incident</Text>
          <TextInput
            style={styles.input}
            value={incidentDate}
            onChangeText={setIncidentDate}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Time of Incident</Text>
          <TextInput
            style={styles.input}
            value={incidentTime}
            onChangeText={setIncidentTime}
            placeholder="HH:MM AM/PM"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Involved Individual(s)</Text>

          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            value={individualName}
            onChangeText={setIndividualName}
            placeholder="Individual name"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={individualDob}
            onChangeText={setIndividualDob}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>
            Accused Staff/Individual(s) - Names
          </Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={accusedNames}
            onChangeText={setAccusedNames}
            placeholder="Names (if any)"
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Type of Incident</Text>
          <Text style={styles.helperText}>(Check all that apply)</Text>

          <View style={styles.checkboxWrap}>
            {INCIDENT_TYPES.map((t) => {
              const on = !!selectedTypes[t];
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.checkboxRow, on && styles.checkboxRowOn]}
                  onPress={() => toggleType(t)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkboxBox, on && styles.checkboxBoxOn]}>
                    <Text style={styles.checkboxTick}>{on ? "✓" : ""}</Text>
                  </View>
                  <Text style={styles.checkboxLabel}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detailed Description</Text>
          <TextInput
            style={[styles.textArea, { minHeight: 140 }]}
            multiline
            value={description}
            onChangeText={setDescription}
            placeholder="Provide a clear and concise description of what happened..."
            placeholderTextColor="#6b7280"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Witnesses</Text>

          <Text style={styles.fieldLabel}>Name 1</Text>
          <TextInput
            style={styles.input}
            value={witness1Name}
            onChangeText={setWitness1Name}
            placeholder="Witness name"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />
          <Text style={styles.fieldLabel}>Contact Information 1</Text>
          <TextInput
            style={styles.input}
            value={witness1Contact}
            onChangeText={setWitness1Contact}
            placeholder="Phone / Email"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Name 2</Text>
          <TextInput
            style={styles.input}
            value={witness2Name}
            onChangeText={setWitness2Name}
            placeholder="Witness name"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />
          <Text style={styles.fieldLabel}>Contact Information 2</Text>
          <TextInput
            style={styles.input}
            value={witness2Contact}
            onChangeText={setWitness2Contact}
            placeholder="Phone / Email"
            placeholderTextColor="#6b7280"
            returnKeyType="next"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={additionalNotes}
            onChangeText={setAdditionalNotes}
            placeholder="Include any other relevant information..."
            placeholderTextColor="#6b7280"
          />

          <Text style={styles.fieldLabel}>Attachments</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={attachments}
            onChangeText={setAttachments}
            placeholder="List attachments (if any)"
            placeholderTextColor="#6b7280"
          />
        </View>

        {/* ✅ Removed Supervisor section for DSP */}

        <TouchableOpacity
          style={[styles.primaryButton, saving && { opacity: 0.6 }]}
          onPress={handleSaveSubmit}
          disabled={saving}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Visits")}
        >
          <Text style={styles.secondaryButtonText}>Back to Visits</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#020617" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  pageTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#e5e7eb",
    textAlign: "center",
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 14,
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
    marginBottom: 6,
  },
  helperText: { color: "#9ca3af", fontSize: 12, marginBottom: 8 },

  fieldLabel: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 8,
    marginBottom: 4,
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

  checkboxWrap: { marginTop: 4 },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 8,
    backgroundColor: "#020617",
  },
  checkboxRowOn: {
    borderColor: "#334155",
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#64748b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#020617",
  },
  checkboxBoxOn: {
    borderColor: "#22c55e",
    backgroundColor: "#052e16",
  },
  checkboxTick: { color: "#22c55e", fontSize: 14, fontWeight: "900" },
  checkboxLabel: { color: "#e5e7eb", flex: 1, fontSize: 14 },

  primaryButton: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 4,
  },
  primaryButtonText: { color: "#022c22", fontSize: 17, fontWeight: "700" },

  secondaryButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#4b5563",
  },
  secondaryButtonText: { color: "#e5e7eb", fontSize: 16, fontWeight: "600" },
});