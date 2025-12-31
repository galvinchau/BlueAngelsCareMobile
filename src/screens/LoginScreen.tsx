// src/screens/LoginScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { requestOtp, verifyOtp, refreshLogin } from "../api/mobileAuthApi";
import {
  getRefreshToken,
  getStaffInfo,
  clearAuthStorage,
} from "../auth/authStorage";

type LoginStep = "ENTER_EMAIL" | "ENTER_OTP";

function isHttpError401_403_400(msg: string) {
  return (
    msg.includes("HTTP 401") ||
    msg.includes("HTTP 403") ||
    msg.includes("HTTP 400")
  );
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<LoginStep>("ENTER_EMAIL");
  const [loading, setLoading] = useState(false);

  // Auto-login boot
  const [booting, setBooting] = useState(true);
  const [autoLoginError, setAutoLoginError] = useState<string | null>(null);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function tryAutoLogin() {
    setAutoLoginError(null);

    const token = await getRefreshToken();
    const staff = await getStaffInfo();

    console.log("[LoginScreen] SecureStore token exists?", !!token);
    console.log("[LoginScreen] SecureStore staff:", staff);

    // Prefill email (nice UX)
    if (staff?.email) setEmail(staff.email);

    if (!token) return false;

    try {
      const data = await refreshLogin(token);
      console.log("[LoginScreen] refreshLogin OK:", data);

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            params: {
              staffId: data.staffId,
              staffName: data.staffName,
              staffEmail: data.email,
            },
          },
        ],
      });

      return true;
    } catch (e: any) {
      const msg = String(e?.message || e);
      console.error("[LoginScreen] refreshLogin FAILED:", msg);

      // ✅ Only clear token when server says invalid/expired
      // ❌ If network error, DO NOT clear token
      if (isHttpError401_403_400(msg)) {
        console.log("[LoginScreen] token invalid -> clearing storage");
        await clearAuthStorage();
      } else {
        console.log("[LoginScreen] network/unknown -> keep token, allow retry");
      }

      setAutoLoginError(msg);
      return false;
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await tryAutoLogin();
      } finally {
        if (alive) setBooting(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSendOtp() {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await requestOtp(trimmed);
      setStep("ENTER_OTP");
      setMessage(
        "We sent a 4-digit code to your email. Please check your inbox (and spam folder)."
      );
    } catch (e: any) {
      console.error("[LoginScreen] handleSendOtp error:", e?.message || e);
      setError(
        e?.message ||
          "Failed to send code. Please check your email or contact the office."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = otpCode.trim();

    if (!trimmedEmail || !trimmedCode) {
      setError("Please enter both email and the 4-digit code.");
      return;
    }

    if (trimmedCode.length < 4) {
      setError("The code must be 4 digits.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const result = await verifyOtp(trimmedEmail, trimmedCode);

      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            params: {
              staffId: result.staffId,
              staffName: result.staffName,
              staffEmail: result.email || trimmedEmail,
            },
          },
        ],
      });
    } catch (e: any) {
      console.error("[LoginScreen] handleVerifyOtp error:", e?.message || e);
      setError(
        e?.message ||
          "Invalid or expired code. Please try again or request a new code."
      );
    } finally {
      setLoading(false);
    }
  }

  const isEmailStep = step === "ENTER_EMAIL";

  // Boot screen
  if (booting) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Blue Angels Care Mobile</Text>
        <Text style={styles.subtitle}>Signing you in...</Text>
        <ActivityIndicator color="#fff" />

        {autoLoginError ? (
          <>
            <Text style={[styles.error, { marginTop: 12 }]}>
              Auto login failed: {autoLoginError}
            </Text>

            <TouchableOpacity
              style={[styles.button, { marginTop: 14 }]}
              onPress={async () => {
                setBooting(true);
                try {
                  await tryAutoLogin();
                } finally {
                  setBooting(false);
                }
              }}
            >
              <Text style={styles.buttonText}>Retry Auto Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => setBooting(false)}
            >
              <Text style={styles.linkText}>Continue to Login</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Blue Angels Care Mobile</Text>
      <Text style={styles.subtitle}>Sign in with a 4-digit code</Text>

      {autoLoginError ? (
        <Text style={styles.message}>
          Auto login failed earlier. You can login again with OTP.
        </Text>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="Work email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {isEmailStep ? null : (
        <TextInput
          style={styles.input}
          placeholder="4-digit code"
          value={otpCode}
          onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ""))}
          keyboardType="number-pad"
          maxLength={4}
        />
      )}

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={isEmailStep ? handleSendOtp : handleVerifyOtp}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {isEmailStep ? "Send Code" : "Verify & Sign In"}
          </Text>
        )}
      </TouchableOpacity>

      {!isEmailStep && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => {
            setStep("ENTER_EMAIL");
            setOtpCode("");
            setMessage(null);
            setError(null);
          }}
          disabled={loading}
        >
          <Text style={styles.linkText}>Change email / Resend code</Text>
        </TouchableOpacity>
      )}

      {/* Optional debug hint */}
      {__DEV__ ? (
        <Text style={[styles.message, { marginTop: 10, opacity: 0.8 }]}>
          Dev: check console logs for SecureStore token + refresh status
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#e5e7eb",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    width: "90%",
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#4b5563",
    backgroundColor: "#020617",
    color: "#e5e7eb",
    borderRadius: 8,
  },
  message: {
    width: "90%",
    color: "#a5b4fc",
    marginBottom: 8,
    fontSize: 14,
  },
  error: {
    width: "90%",
    color: "#fecaca",
    marginBottom: 8,
    fontSize: 14,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: "90%",
    alignItems: "center",
  },
  buttonText: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "bold",
  },
  linkButton: {
    marginTop: 12,
  },
  linkText: {
    color: "#93c5fd",
    fontSize: 14,
  },
});
