// App.tsx
import React from "react";
import { StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import DailyNoteScreen from "./src/screens/DailyNoteScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import HelpScreen from "./src/screens/HelpScreen";

// =======================
// Root Stack types
// =======================

export type RootStackParamList = {
  Login: undefined;
  Main:
    | {
        staffId: string;
        staffName?: string;
        staffEmail?: string;
      }
    | undefined;
};

// =======================
// Drawer types
// =======================

export type MainDrawerParamList = {
  Visits:
    | {
        staffId?: string;
        staffName?: string;
        staffEmail?: string;
      }
    | undefined;
  Clients: undefined;
  DailyNote:
    | {
        shiftId?: string;
        staffId?: string;
        staffName?: string;
        staffEmail?: string;
      }
    | undefined;
  Settings: undefined;
  Help: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<MainDrawerParamList>();

type MainDrawerNavProps = NativeStackScreenProps<RootStackParamList, "Main">;

// =======================
// Drawer after login
// =======================

function MainDrawerNavigator({ route }: MainDrawerNavProps) {
  // params được gửi từ LoginScreen → navigation.reset(...)
  const { staffId, staffName, staffEmail } = route.params || {};

  return (
    <Drawer.Navigator
      initialRouteName="Visits"
      screenOptions={{
        headerTitleAlign: "center",
      }}
    >
      <Drawer.Screen
        name="Visits"
        component={HomeScreen}
        options={{ title: "Visits" }}
        // truyền staff info xuống HomeScreen qua route.params
        initialParams={{ staffId, staffName, staffEmail }}
      />

      <Drawer.Screen
        name="DailyNote"
        component={DailyNoteScreen}
        options={{ title: "Daily Note" }}
        // Daily Note cũng nhận được staff info (sau này dùng cho check-in/out)
        initialParams={{ staffId, staffName, staffEmail }}
      />

      <Drawer.Screen
        name="Clients"
        component={ClientsScreen}
        options={{ title: "Clients" }}
      />

      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: "Settings" }}
      />

      <Drawer.Screen
        name="Help"
        component={HelpScreen}
        options={{ title: "Help & Support" }}
      />
    </Drawer.Navigator>
  );
}

// =======================
// Root App
// =======================

export default function App() {
  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          {/* Login đầu tiên (OTP 4 số) */}
          <Stack.Screen name="Login" component={LoginScreen} />

          {/* Sau khi Login xong → Main (chứa Drawer) */}
          <Stack.Screen name="Main" component={MainDrawerNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
