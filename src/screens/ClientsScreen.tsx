// src/screens/ClientsScreen.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ClientsScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clients</Text>
      <Text style={styles.text}>
        Đây là màn hình Clients (mock). Sau này sẽ có search Individuals, Start
        Unknown Visit... giống Sandata.
      </Text>
    </View>
  );
};

export default ClientsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7ff",
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
