// src/screens/HelpScreen.tsx
import React from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import Constants from "expo-constants";

const OFFICE_PHONE = "+18146002313"; // Blue Angels Care Office
const OFFICE_EMAIL = "blueangelscarellc@gmail.com";
const WEBSITE_URL = "https://blueangelscare.org";
const PRIVACY_URL = "https://blueangelscare.org/privacy";
const TERMS_URL = "https://blueangelscare.org/terms";

function getAppVersion() {
  // Expo managed: Constants.expoConfig.version
  const v =
    (Constants as any)?.expoConfig?.version ||
    (Constants as any)?.manifest?.version ||
    "1.0.0";
  return String(v);
}

function getBuildNumber() {
  // iOS buildNumber / Android versionCode (may be undefined on dev)
  const iosBuild =
    (Constants as any)?.expoConfig?.ios?.buildNumber ||
    (Constants as any)?.manifest?.ios?.buildNumber;

  const androidCode =
    (Constants as any)?.expoConfig?.android?.versionCode ||
    (Constants as any)?.manifest?.android?.versionCode;

  if (Platform.OS === "ios") return iosBuild ? String(iosBuild) : "-";
  if (Platform.OS === "android") return androidCode ? String(androidCode) : "-";
  return "-";
}

async function openUrl(url: string, failMessage: string) {
  try {
    const ok = await Linking.canOpenURL(url);
    if (!ok) throw new Error("cannot open");
    await Linking.openURL(url);
  } catch {
    Alert.alert("Error", failMessage);
  }
}

export default function HelpScreen() {
  const appVersion = getAppVersion();
  const buildNumber = getBuildNumber();

  const handleCall = () =>
    openUrl(
      `tel:${OFFICE_PHONE}`,
      "Unable to start a phone call on this device."
    );

  const handleEmail = () =>
    openUrl(
      `mailto:${OFFICE_EMAIL}`,
      "Unable to open email app. Please email the office manually."
    );

  const handleReportProblem = async () => {
    const deviceName = (Constants as any)?.deviceName || "Unknown device";
    const runtimeVersion =
      (Constants as any)?.expoConfig?.runtimeVersion ||
      (Constants as any)?.expoConfig?.sdkVersion ||
      (Constants as any)?.manifest?.sdkVersion ||
      "unknown";

    const bodyLines = [
      "Please describe the issue:",
      "- What happened?",
      "- Steps to reproduce:",
      "- Screenshot (if possible):",
      "",
      "---- Device Info ----",
      `Platform: ${Platform.OS} ${Platform.Version}`,
      `Device: ${deviceName}`,
      `App Version: ${appVersion}`,
      `Build: ${buildNumber}`,
      `Runtime: ${runtimeVersion}`,
      "",
    ];

    const subject = encodeURIComponent("BAC Mobile - Support Request");
    const body = encodeURIComponent(bodyLines.join("\n"));

    const url = `mailto:${OFFICE_EMAIL}?subject=${subject}&body=${body}`;
    await openUrl(
      url,
      "Unable to open email app for reporting. Please email the office."
    );
  };

  const openPrivacy = () =>
    openUrl(PRIVACY_URL, "Unable to open Privacy Policy.");

  const openTerms = () =>
    openUrl(TERMS_URL, "Unable to open Terms of Service.");

  const openWebsite = () => openUrl(WEBSITE_URL, "Unable to open website.");

  const comingSoon = (label: string) =>
    Alert.alert(label, "This feature will be available in a future update.");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Support */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Help & Support</Text>

          <Item
            title="Call Office"
            subtitle={OFFICE_PHONE}
            onPress={handleCall}
          />

          <Item
            title="Email Office"
            subtitle={OFFICE_EMAIL}
            onPress={handleEmail}
          />

          <Item
            title="Report a Problem"
            subtitle="Send details to help us fix it faster"
            onPress={handleReportProblem}
          />

          <Item
            title="FAQ"
            subtitle="Common questions (coming soon)"
            onPress={() => comingSoon("FAQ")}
          />
        </View>

        {/* Links */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Links</Text>

          <Item title="Website" subtitle={WEBSITE_URL} onPress={openWebsite} />
          <Item title="Privacy Policy" onPress={openPrivacy} />
          <Item title="Terms of Service" onPress={openTerms} />
        </View>

        {/* About */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>

          <Row label="App Name" value="Blue Angels Care Mobile" />
          <Row label="Version" value={appVersion} />
          <Row label="Build" value={buildNumber} />
        </View>

        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =======================
// Reusable components
// =======================

function Item({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        pressed && { backgroundColor: BAC.soft },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.itemSub}>{subtitle}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
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
// Theme (BAC) - match Settings
// =======================

const BAC = {
  bg: "#F3F6FF",
  panel: "#FFFFFF",
  border: "#D8E2FF",
  text: "#0D1B2A",
  muted: "#6B7280",
  primary: "#123B8A",
  soft: "#EFF4FF",
};

// =======================
// Styles
// =======================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BAC.bg },
  content: { padding: 16, gap: 12 },

  card: {
    backgroundColor: BAC.panel,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BAC.border,
    paddingVertical: 6,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: BAC.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: BAC.border,
  },

  itemTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: BAC.text,
  },
  itemSub: {
    marginTop: 2,
    fontSize: 13,
    color: BAC.muted,
  },

  chevron: {
    fontSize: 22,
    color: BAC.muted,
    fontWeight: "600",
  },

  row: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: BAC.border,
  },
  k: { fontSize: 12, color: BAC.muted, fontWeight: "800" },
  v: { marginTop: 2, fontSize: 15, color: BAC.text, fontWeight: "700" },
});
