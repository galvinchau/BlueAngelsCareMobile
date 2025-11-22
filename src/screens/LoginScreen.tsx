// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState<string>(""); // luôn rỗng khi mở app → hiện placeholder
  const [password, setPassword] = useState<string>("");
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  const handleSignIn = () => {
    // Sau này gắn API thật + lấy staffId rồi chuyển sang Home
    navigation.replace("Home");
  };

  const handleResetPassword = () => {
    // Chỗ này tạm thời chỉ log; sau này làm màn Reset riêng
    console.log("Reset password requested for:", email || "(no email)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {/* Logo + App title */}
          <View style={styles.logoSection}>
            <Image
              // Đường dẫn đúng với cấu trúc: /assets/bac-logo.png
              source={require("../../assets/bac-logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appTitle}>Blue Angels Care</Text>
            <Text style={styles.appSubtitle}>Mobile DSP Connect</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="#C7D2FE"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />

            {/* Password */}
            <Text style={[styles.label, { marginTop: 12 }]}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#C7D2FE"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            {/* Remember Me */}
            <View style={styles.rememberRow}>
              <View style={styles.rememberLeft}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: "#1E3A8A", true: "#FACC15" }}
                  thumbColor="#FFFFFF"
                />
                <Text style={styles.rememberLabel}>Remember Me</Text>
              </View>
            </View>

            {/* Sign In button */}
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </TouchableOpacity>

            {/* Reset Password */}
            <TouchableOpacity onPress={handleResetPassword}>
              <Text style={styles.resetText}>Reset Password</Text>
            </TouchableOpacity>

            {/* Face ID placeholder + version */}
            <View style={styles.faceIdContainer}>
              <View style={styles.faceIdIcon}>
                <Text style={styles.faceIdIconText}>😊</Text>
              </View>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const PRIMARY_BLUE = "#2447D5";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_BLUE,
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    justifyContent: "flex-start",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: 8,
    borderRadius: 24,
  },
  appTitle: {
    fontSize: 22, // nhỏ hơn để nằm trên 1 dòng
    lineHeight: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  appSubtitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "500",
    color: "#DBEAFE",
    textAlign: "center",
  },
  form: {
    marginTop: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#E5E7EB",
    marginBottom: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1D4ED8",
    backgroundColor: "#1E3A8A",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#FFFFFF",
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    marginBottom: 10,
  },
  rememberLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rememberLabel: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
    color: "#F9FAFB",
  },
  signInButton: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 11,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  signInText: {
    fontSize: 16, // giảm nhẹ
    fontWeight: "700",
    color: PRIMARY_BLUE,
  },
  resetText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  faceIdContainer: {
    marginTop: 24,
    alignItems: "center",
  },
  faceIdIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  faceIdIconText: {
    fontSize: 26,
  },
  versionText: {
    fontSize: 13,
    color: "#E5E7EB",
  },
});

export default LoginScreen;
export { LoginScreen };
