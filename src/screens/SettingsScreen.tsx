// src/screens/SettingsScreen.tsx
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
} from "react-native";

export default function SettingsScreen() {
  const openPrivacy = () =>
    Linking.openURL("https://blueangelscare.org/privacy").catch(() =>
      Alert.alert("Error", "Unable to open Privacy Policy.")
    );

  const openTerms = () =>
    Linking.openURL("https://blueangelscare.org/terms").catch(() =>
      Alert.alert("Error", "Unable to open Terms of Service.")
    );

  const comingSoon = (label: string) =>
    Alert.alert(label, "This feature will be available in a future update.");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Item
            title="Change Password"
            subtitle="Update your login credentials"
            onPress={() => comingSoon("Change Password")}
          />

          <Item
            title="Biometric Login"
            subtitle="Fingerprint / Face ID"
            onPress={() => comingSoon("Biometric Login")}
          />
        </View>

        {/* Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <Item
            title="Language"
            subtitle="English"
            onPress={() => comingSoon("Language")}
          />

          <Item
            title="Notifications"
            subtitle="Shift reminders & alerts"
            onPress={() => comingSoon("Notifications")}
          />
        </View>

        {/* Legal */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <Item title="Privacy Policy" onPress={openPrivacy} />
          <Item title="Terms of Service" onPress={openTerms} />
        </View>

        {/* App info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>About</Text>

          <Row label="App Name" value="Blue Angels Care Mobile" />
          <Row label="Version" value="1.0.0" />
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
      <View>
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
// Theme (BAC)
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
