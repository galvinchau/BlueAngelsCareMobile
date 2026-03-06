// src/screens/VisitMedicationScreen.tsx
import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  Platform,
} from "react-native";
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

export default function VisitMedicationScreen({ route }: Props) {
  const params = route?.params || {};
  const shift = params.shift;

  const url = useMemo(() => {
    if (!WEB_BASE_URL) return "";
    const base = WEB_BASE_URL.replace(/\/$/, "");
    const individualId = encodeURIComponent(String(shift?.individualId || ""));
    return `${base}/dashboard?tab=medication&individualId=${individualId}`;
  }, [shift]);

  // ✅ Inject CSS to fix iOS WebView "modal cannot scroll"
  const injectedJS = useMemo(() => {
    // NOTE: Keep selectors broad because the web modal could be Radix / Vaul / custom.
    const css = `
      html, body { height: 100% !important; }
      body { -webkit-overflow-scrolling: touch !important; }

      /* Common dialog/drawer roots */
      [role="dialog"],
      [data-radix-dialog-content],
      [data-state="open"][data-radix-dialog-content],
      [data-vaul-drawer],
      [data-vaul-drawer-container],
      [data-vaul-drawer-content] {
        max-height: 85vh !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        touch-action: pan-y !important;
      }

      /* Common class fallbacks (in case custom classes are used) */
      .vaul-drawer-content,
      .drawer-content,
      .dialog-content,
      .sheet-content,
      .modal-content {
        max-height: 85vh !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        touch-action: pan-y !important;
      }
    `;

    // Inject style into head
    const js = `
      (function () {
        try {
          var style = document.createElement('style');
          style.type = 'text/css';
          style.appendChild(document.createTextNode(${JSON.stringify(css)}));
          document.head.appendChild(style);

          // Extra iOS help: allow inner scrolling to work smoothly
          document.body.style.webkitOverflowScrolling = 'touch';

        } catch (e) {}
      })();
      true;
    `;
    return js;
  }, []);

  if (!WEB_BASE_URL) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Medication</Text>
        <Text style={styles.text}>WEB_BASE_URL is not configured.</Text>
        <Text style={styles.text}>
          Please set EXPO_PUBLIC_BAC_WEB_BASE_URL for the mobile app build.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Medication</Text>
        <TouchableOpacity
          onPress={() => {
            if (url) Linking.openURL(url).catch(() => {});
          }}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>Open in Browser</Text>
        </TouchableOpacity>
      </View>

      <WebView
        source={{ uri: url }}
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScript={injectedJS}
        // ✅ ensure WebView itself can scroll
        scrollEnabled={true}
        // Android nested scroll
        nestedScrollEnabled={true}
        // iOS behavior tuning
        bounces={false}
        contentInsetAdjustmentBehavior="never"
        // keyboard QoL (doesn't hurt)
        keyboardDisplayRequiresUserAction={Platform.OS === "ios" ? false : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#020617" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#020617",
  },
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