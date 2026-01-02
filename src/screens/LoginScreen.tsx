// src/screens/LoginScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import * as LocalAuthentication from "expo-local-authentication";

import { requestOtp, verifyOtp, refreshLogin } from "../api/mobileAuthApi";
import {
  getRefreshToken,
  getStaffInfo,
  clearAuthStorage,
} from "../auth/authStorage";

type LoginStep = "ENTER_EMAIL" | "ENTER_OTP";

function isHttpError401_403_400(msg: string) {
  return (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("400") ||
    msg.toLowerCase().includes("unauthorized") ||
    msg.toLowerCase().includes("forbidden")
  );
}

async function biometricAvailable(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) return false;
    return true;
  } catch {
    return false;
  }
}

async function biometricAuth(): Promise<boolean> {
  const ok = await biometricAvailable();
  if (!ok) return true; // no biometric -> allow flow (or skip)
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: "Sign in with Face ID / Touch ID",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
  return !!res.success;
}

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<LoginStep>("ENTER_EMAIL");
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [bioReady, setBioReady] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const staff = await getStaffInfo();
        const token = await getRefreshToken();

        if (!alive) return;

        if (staff?.email) setEmail(staff.email);
        setHasStoredToken(!!token);

        const canBio = await biometricAvailable();
        if (!alive) return;
        setBioReady(canBio);
      } catch {
        // ignore
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function handleFaceIdSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getRefreshToken();
      if (!token) {
        setHasStoredToken(false);
        setError("No saved login found. Please sign in with OTP.");
        return;
      }

      const ok = await biometricAuth();
      if (!ok) {
        setMessage("Face ID was canceled. You can sign in with OTP.");
        return;
      }

      const data = await refreshLogin(token);

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
    } catch (e: any) {
      const msg = String(e?.message || e);

      // only clear token when server says invalid/expired
      if (isHttpError401_403_400(msg)) {
        await clearAuthStorage();
        setHasStoredToken(false);
      }

      setError(
        isHttpError401_403_400(msg)
          ? "Saved login expired. Please sign in again with OTP."
          : "Network issue. Please try again or sign in with OTP."
      );

      if (__DEV__) console.log("[LoginScreen] FaceID sign-in failed:", msg);
    } finally {
      setLoading(false);
    }
  }

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
      setError(
        String(e?.message || "") ||
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
      setError(
        String(e?.message || "") ||
          "Invalid or expired code. Please try again or request a new code."
      );
    } finally {
      setLoading(false);
    }
  }

  const isEmailStep = step === "ENTER_EMAIL";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Blue Angels Care Mobile</Text>
      <Text style={styles.subtitle}>Sign in with a 4-digit code</Text>

      {/* FaceID quick sign-in */}
      {hasStoredToken && bioReady && isEmailStep ? (
        <TouchableOpacity
          style={[styles.button, styles.faceIdBtn]}
          onPress={handleFaceIdSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in with Face ID</Text>
          )}
        </TouchableOpacity>
      ) : null}

      {hasStoredToken && !bioReady && isEmailStep ? (
        <Text style={styles.message}>
          Saved login found. Your device has no Face ID / Touch ID set up.
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
  faceIdBtn: {
    backgroundColor: "#3b82f6",
    marginTop: 0,
    marginBottom: 12,
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
