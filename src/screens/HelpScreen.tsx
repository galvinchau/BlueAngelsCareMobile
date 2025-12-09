// src/screens/HelpScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const HelpScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Help</Text>
      <Text style={styles.text}>
        Đây là màn hình Help (mock). Sau này sẽ có FAQ, hotline, hướng dẫn.
      </Text>
    </View>
  );
};

export default HelpScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff7f4",
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
