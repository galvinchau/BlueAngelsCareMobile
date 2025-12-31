// App.tsx
import React from "react";
import { StyleSheet, View, Pressable, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  createDrawerNavigator,
  DrawerNavigationProp,
} from "@react-navigation/drawer";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import DailyNoteScreen from "./src/screens/DailyNoteScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import ClientDetailScreen from "./src/screens/ClientDetailScreen";
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

// =======================
// Clients Stack types
// =======================
export type ClientsStackParamList = {
  ClientsList: undefined;
  ClientDetail: {
    individual: {
      id: string;
      fullName: string;
      maNumber?: string | null;
      address1?: string | null;
      address2?: string | null;
      phone?: string | null;
    };
  };
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Drawer = createDrawerNavigator<MainDrawerParamList>();
const ClientsStack = createNativeStackNavigator<ClientsStackParamList>();

type MainDrawerNavProps = NativeStackScreenProps<RootStackParamList, "Main">;

// Hamburger button
function DrawerHamburger({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => [
        styles.hamburgerBtn,
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={styles.hamburgerText}>☰</Text>
    </Pressable>
  );
}

// =======================
// Clients Stack inside Drawer
// =======================
function ClientsStackNavigator() {
  return (
    <ClientsStack.Navigator>
      <ClientsStack.Screen
        name="ClientsList"
        component={ClientsScreen}
        options={({ navigation }) => ({
          title: "Clients",
          headerTitleAlign: "center",
          headerLeft: () => (
            <DrawerHamburger
              onPress={() => {
                // parent of ClientsStack is Drawer
                const parent = navigation.getParent();
                // @ts-ignore - toggleDrawer exists on drawer navigation
                parent?.toggleDrawer?.();
              }}
            />
          ),
        })}
      />

      <ClientsStack.Screen
        name="ClientDetail"
        component={ClientDetailScreen}
        options={{
          title: "Client",
          headerTitleAlign: "center",
        }}
      />
    </ClientsStack.Navigator>
  );
}

// =======================
// Drawer after login
// =======================
function MainDrawerNavigator({ route }: MainDrawerNavProps) {
  const { staffId, staffName, staffEmail } = route.params || {};

  return (
    <Drawer.Navigator
      initialRouteName="Visits"
      screenOptions={({ navigation }) => ({
        headerTitleAlign: "center",
        headerLeft: () => (
          <DrawerHamburger
            onPress={() =>
              (
                navigation as unknown as DrawerNavigationProp<MainDrawerParamList>
              ).toggleDrawer()
            }
          />
        ),
      })}
    >
      <Drawer.Screen
        name="Visits"
        component={HomeScreen}
        options={{ title: "Visits" }}
        initialParams={{ staffId, staffName, staffEmail }}
      />

      <Drawer.Screen
        name="DailyNote"
        component={DailyNoteScreen}
        options={{ title: "Daily Note" }}
        initialParams={{ staffId, staffName, staffEmail }}
      />

      {/* IMPORTANT: hide Drawer header for Clients, because ClientsStack manages its own header (back button). */}
      <Drawer.Screen
        name="Clients"
        component={ClientsStackNavigator}
        options={{ headerShown: false, title: "Clients" }}
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
        <RootStack.Navigator
          initialRouteName="Login"
          screenOptions={{ headerShown: false }}
        >
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Main" component={MainDrawerNavigator} />
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hamburgerBtn: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF4FF",
    borderWidth: 1,
    borderColor: "#D8E2FF",
  },
  hamburgerText: {
    fontSize: 20,
    fontWeight: "900",
    color: "#123B8A",
  },
});
