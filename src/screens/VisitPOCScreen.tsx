// src/screens/VisitPOCScreen.tsx
import React, { useMemo } from "react";
import { StyleSheet, Text, View, TouchableOpacity, Linking } from "react-native";
import { WebView } from "react-native-webview";

import type { MobileShift } from "../types/mobileApi";
import { WEB_BASE_URL } from "../config";

type Props = {
  navigation: any;
  route: {
    params?: {
      shiftId?: string;
      shift?: MobileShift;
      staffId?: string;
    };
  };
};

export default function VisitPOCScreen({ route }: Props) {
  const params = route?.params || {};
  const shift = params.shift;

  const url = useMemo(() => {
    if (!WEB_BASE_URL) return "";
    const base = WEB_BASE_URL.replace(/\/$/, "");
    const individualId = encodeURIComponent(String(shift?.individualId || ""));
    return `${base}/dashboard?tab=poc&individualId=${individualId}`;
  }, [shift]);

  if (!WEB_BASE_URL) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>POC</Text>
        <Text style={styles.text}>
          WEB_BASE_URL is not configured.
        </Text>
        <Text style={styles.text}>
          Please set EXPO_PUBLIC_BAC_WEB_BASE_URL for the mobile app build.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>POC</Text>
        <TouchableOpacity
          onPress={() => {
            if (url) Linking.openURL(url).catch(() => {});
          }}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>

      <WebView source={{ uri: url }} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#020617" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "#020617" },
  title: { fontSize: 18, fontWeight: "900", color: "#e5e7eb", marginBottom: 10 },
  text: { color: "#9ca3af", textAlign: "center", marginTop: 6 },

  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    backgroundColor: "#020617",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: { color: "#e5e7eb", fontWeight: "900" },
  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#0b1120",
  },
  linkText: { color: "#93c5fd", fontWeight: "900", fontSize: 12 },
});