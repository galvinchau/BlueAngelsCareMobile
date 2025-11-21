import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import { DailyNoteScreen } from "./src/screens/DailyNoteScreen";

/**
 * Root stack routes for the app
 * - Login: màn hình đăng nhập
 * - Home: màn hình Today’s Shifts
 * - DailyNote: màn hình Daily Note cho 1 ca cụ thể
 */
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  DailyNote: {
    shiftId: string;
    date: string;

    individualId: string;
    individualName: string;
    individualDob?: string;
    individualMa?: string;
    individualAddress?: string;

    serviceCode: string;
    serviceName: string;

    scheduleStart: string; // e.g. "08:00"
    scheduleEnd: string;   // e.g. "12:00"
    outcomeText?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Blue Angels Care" }}
        />
        <Stack.Screen
          name="DailyNote"
          component={DailyNoteScreen}
          options={{ title: "Daily Note" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
