// src/screens/SettingsScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Switch,
  ActivityIndicator,
} from "react-native";
import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

import { clearAuthStorage } from "../auth/authStorage";

const BIOMETRIC_ENABLED_KEY = "BAC_BIOMETRIC_LOGIN_ENABLED";

type AuthTypeLabel = "Face ID" | "Touch ID" | "Biometric";

export default function SettingsScreen() {
  const [bioSupported, setBioSupported] = useState<boolean | null>(null);
  const [bioEnrolled, setBioEnrolled] = useState<boolean | null>(null);
  const [bioTypeLabel, setBioTypeLabel] = useState<AuthTypeLabel>("Biometric");

  const [bioEnabled, setBioEnabled] = useState<boolean>(false);
  const [bioLoading, setBioLoading] = useState<boolean>(true);
  const [bioToggling, setBioToggling] = useState<boolean>(false);

  const bioReady = useMemo(() => {
    return bioSupported === true && bioEnrolled === true;
  }, [bioSupported, bioEnrolled]);

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

  async function loadBiometricState() {
    setBioLoading(true);
    try {
      // device capability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = hasHardware
        ? await LocalAuthentication.isEnrolledAsync()
        : false;

      setBioSupported(hasHardware);
      setBioEnrolled(isEnrolled);

      // detect type label (best-effort)
      try {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        // iOS: 1=FINGERPRINT, 2=FACIAL_RECOGNITION (enum varies by platform)
        // Expo exports constants too, but this is fine.
        const hasFace = types.includes(
          // @ts-ignore
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );
        const hasTouch = types.includes(
          // @ts-ignore
          LocalAuthentication.AuthenticationType.FINGERPRINT
        );

        if (hasFace) setBioTypeLabel("Face ID");
        else if (hasTouch) setBioTypeLabel("Touch ID");
        else setBioTypeLabel("Biometric");
      } catch {
        setBioTypeLabel("Biometric");
      }

      // load saved preference
      const raw = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setBioEnabled(raw === "1");
    } finally {
      setBioLoading(false);
    }
  }

  useEffect(() => {
    loadBiometricState();
  }, []);

  async function setBiometricEnabled(value: boolean) {
    if (value) {
      // Must be supported + enrolled
      if (!bioReady) {
        Alert.alert(
          "Biometric not available",
          bioSupported === false
            ? "This device does not support biometric authentication."
            : "Please set up Face ID / Touch ID in iPhone Settings first."
        );
        return;
      }

      // Confirm once before enabling
      setBioToggling(true);
      try {
        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: "Enable biometric login",
          cancelLabel: "Cancel",
          fallbackLabel: "Use Passcode",
          disableDeviceFallback: false,
        });

        if (!res.success) {
          Alert.alert("Cancelled", "Biometric login was not enabled.");
          return;
        }

        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "1");
        setBioEnabled(true);

        Alert.alert(
          "Enabled",
          `${bioTypeLabel} login is now enabled on this device.`
        );
      } catch (e) {
        Alert.alert("Error", "Unable to enable biometric login.");
      } finally {
        setBioToggling(false);
      }
    } else {
      setBioToggling(true);
      try {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "0");
        setBioEnabled(false);
      } finally {
        setBioToggling(false);
      }
    }
  }

  async function testBiometricNow() {
    if (!bioReady) {
      Alert.alert(
        "Not ready",
        "Please make sure Face ID / Touch ID is set up on this phone."
      );
      return;
    }

    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: "Test biometric login",
        cancelLabel: "Cancel",
        fallbackLabel: "Use Passcode",
        disableDeviceFallback: false,
      });

      if (res.success) {
        Alert.alert("Success", "Biometric authentication worked.");
      } else {
        Alert.alert("Failed", "Biometric authentication did not succeed.");
      }
    } catch {
      Alert.alert("Error", "Biometric test failed.");
    }
  }

  function handleChangePassword() {
    Alert.alert(
      "Change Password",
      "This app currently uses Email OTP (4-digit code). There is no password to change.\n\nYou can reset saved login to force OTP next time.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Saved Login",
          style: "destructive",
          onPress: async () => {
            await clearAuthStorage();
            Alert.alert(
              "Done",
              "Saved login has been cleared. Next time you will login with OTP again."
            );
          },
        },
      ]
    );
  }

  function openBiometricDetail() {
    const status =
      bioSupported === false
        ? "Not supported on this device"
        : bioEnrolled === false
        ? "Not set up yet (enroll in iPhone Settings)"
        : bioEnabled
        ? "Enabled"
        : "Disabled";

    Alert.alert(
      "Biometric Login",
      `Type: ${bioTypeLabel}\nStatus: ${status}\n\nTip: If you want the app to ask Face ID automatically at launch, we will enable that in the next step (App boot).`,
      [
        { text: "OK" },
        {
          text: "Test Now",
          onPress: testBiometricNow,
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>

          <Item
            title="Change Password"
            subtitle="Update your login credentials"
            onPress={handleChangePassword}
          />

          <Pressable
            onPress={openBiometricDetail}
            style={({ pressed }) => [
              styles.item,
              pressed && { backgroundColor: BAC.soft },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Biometric Login</Text>
              <Text style={styles.itemSub}>
                {bioLoading ? "Checking..." : `${bioTypeLabel} / Passcode`}
              </Text>
            </View>

            {bioLoading ? (
              <ActivityIndicator />
            ) : (
              <Switch
                value={bioEnabled}
                onValueChange={(v) => setBiometricEnabled(v)}
                disabled={bioToggling || !bioReady}
              />
            )}
          </Pressable>

          {!bioLoading && !bioReady ? (
            <Text style={styles.hint}>
              {bioSupported === false
                ? "This device does not support biometric authentication."
                : "To enable Biometrics, set up Face ID / Touch ID in iPhone Settings first."}
            </Text>
          ) : null}
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
      <View style={{ flex: 1 }}>
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

  hint: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
});
