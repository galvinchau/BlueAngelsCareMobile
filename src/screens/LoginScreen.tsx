// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { requestLoginOtp, verifyLoginOtp } from "../api/mobileClient";

type LoginStep = "ENTER_EMAIL" | "ENTER_OTP";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<LoginStep>("ENTER_EMAIL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp() {
    const trimmed = email.trim();

    if (!trimmed) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      await requestLoginOtp(trimmed);
      setStep("ENTER_OTP");
      setMessage(
        "We sent a 4-digit code to your email. Please check your inbox (and spam folder)."
      );
    } catch (e) {
      console.error("[LoginScreen] handleSendOtp error:", e);
      setError(
        "Failed to send code. Please check your email or contact the office."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    const trimmedEmail = email.trim();
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
      const result = await verifyLoginOtp(trimmedEmail, trimmedCode);

      // TODO: nếu sau này dùng JWT, có thể lưu result.accessToken vào AsyncStorage ở đây.

      // 👉 Điều hướng vào Drawer "Main" và truyền staffId + staffName
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            params: {
              staffId: result.staffId,
              staffName: result.staffName,
              staffEmail: trimmedEmail,
            },
          },
        ],
      });
    } catch (e) {
      console.error("[LoginScreen] handleVerifyOtp error:", e);
      setError(
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
