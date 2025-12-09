// src/screens/SettingsScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const SettingsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.text}>
        Đây là màn hình Settings (mock): Language, Change Password,
        Fingerprint...
      </Text>
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4fff7",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
  },
});
