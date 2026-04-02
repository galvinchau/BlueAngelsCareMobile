// App.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import {
  createDrawerNavigator,
  DrawerNavigationProp,
} from "@react-navigation/drawer";

import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import DailyNoteScreen from "./src/screens/DailyNoteScreen";
import ClientsScreen from "./src/screens/ClientsScreen";
import ClientDetailScreen from "./src/screens/ClientDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import HelpScreen from "./src/screens/HelpScreen";

// ✅ NEW: Visit Tabs screen
import VisitTabsScreen from "./src/screens/VisitTabsScreen";

// ✅ NEW: Health & Incident screen
import HealthIncidentScreen from "./src/screens/HealthIncidentScreen";

// auto-login helpers
import { getRefreshToken } from "./src/auth/authStorage";
import { refreshLogin } from "./src/api/mobileAuthApi";
import { registerPushToken as registerPushTokenApi } from "./src/api/mobileClient";

// =======================
// Expo Notifications handler
// =======================
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

  // ✅ NEW: Health & Incident
  HealthIncident:
    | {
        staffId?: string;
        staffName?: string;
        staffEmail?: string;
      }
    | undefined;

  DailyNote:
    | {
        shiftId?: string;
        staffId?: string;
        staffName?: string;
        staffEmail?: string;
      }
    | undefined;

  // ✅ NEW: Open Shift -> Tabs
  VisitTabs:
    | {
        shiftId?: string;
        shift?: any; // MobileShift (kept as any to avoid cross-import in App.tsx)
        staffId?: string;
        staffName?: string;
        staffEmail?: string;
        initialTab?: "CHECK" | "MEDICATION" | "POC" | "DAILY_NOTE";
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

// =======================
// Biometric setting key (must match SettingsScreen.tsx)
// =======================
const BIOMETRIC_ENABLED_KEY = "BAC_BIOMETRIC_LOGIN_ENABLED";

// =======================
// Push helpers
// =======================
function getExpoProjectId(): string | null {
  const fromEasConfig = (Constants as any)?.easConfig?.projectId;
  const fromExpoConfig = (Constants as any)?.expoConfig?.extra?.eas?.projectId;
  const value = String(fromEasConfig || fromExpoConfig || "").trim();
  return value || null;
}

async function registerForPushNotificationsAsync(): Promise<{
  expoPushToken: string;
  platform?: string;
  appVersion?: string;
} | null> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        sound: "default",
      });
    }

    if (!Device.isDevice) {
      console.log("[Push] Physical device required for remote push token.");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Push] Permission not granted.");
      return null;
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
      console.log("[Push] Missing Expo projectId.");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    return {
      expoPushToken: token,
      platform: Platform.OS,
      appVersion: (Constants.expoConfig as any)?.version || undefined,
    };
  } catch (e: any) {
    console.log("[Push] registerForPushNotificationsAsync failed:", String(e?.message || e));
    return null;
  }
}

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
                const parent = navigation.getParent();
                // @ts-ignore
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
  const lastRegisteredPushKeyRef = useRef<string>("");

  useEffect(() => {
    let cancelled = false;

    async function syncPushTokenForStaff() {
      if (!staffId) return;

      const tokenInfo = await registerForPushNotificationsAsync();
      if (!tokenInfo?.expoPushToken || cancelled) return;

      const registrationKey = `${staffId}:${tokenInfo.expoPushToken}`;
      if (lastRegisteredPushKeyRef.current === registrationKey) {
        return;
      }

      try {
        await registerPushTokenApi({
          staffId,
          expoPushToken: tokenInfo.expoPushToken,
          platform: tokenInfo.platform,
          appVersion: tokenInfo.appVersion,
        });

        lastRegisteredPushKeyRef.current = registrationKey;

        console.log("[Push] Token registered for staff:", staffId);
      } catch (e: any) {
        console.log(
          "[Push] Failed to register token with backend:",
          String(e?.message || e)
        );
      }
    }

    syncPushTokenForStaff();

    return () => {
      cancelled = true;
    };
  }, [staffId]);

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

      {/* Keep existing Daily Note in menu (no change) */}
      <Drawer.Screen
        name="DailyNote"
        component={DailyNoteScreen}
        options={{ title: "Daily Note" }}
        initialParams={{ staffId, staffName, staffEmail }}
      />

      {/* ✅ NEW: Tabs screen (Open Shift) */}
      <Drawer.Screen
        name="VisitTabs"
        component={VisitTabsScreen}
        options={{ title: "Visit" }}
        initialParams={{ staffId, staffName, staffEmail }}
      />

      {/* IMPORTANT: hide Drawer header for Clients, because ClientsStack manages its own header (back button). */}
      <Drawer.Screen
        name="Clients"
        component={ClientsStackNavigator}
        options={{ headerShown: false, title: "Clients" }}
      />

      {/* ✅ NEW: Health & Incident under Clients */}
      <Drawer.Screen
        name="HealthIncident"
        component={HealthIncidentScreen}
        options={{ title: "Health & Incident" }}
        initialParams={{ staffId, staffName, staffEmail }}
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
// Biometric helpers
// =======================
async function isBiometricEnabledByUser(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

async function canUseBiometric(): Promise<boolean> {
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

async function promptBiometricIfEnabled(): Promise<boolean> {
  // Only require biometric if user enabled it in Settings
  const enabled = await isBiometricEnabledByUser();
  if (!enabled) return true;

  const usable = await canUseBiometric();
  if (!usable) {
    // User enabled biometric but device cannot do it => allow login, and notify
    Alert.alert(
      "Biometric unavailable",
      "Biometric Login is enabled, but this device does not have Face ID/Touch ID set up. Please configure it in iPhone Settings or disable Biometric Login in the app Settings."
    );
    return true;
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Sign in with Face ID / Touch ID",
    cancelLabel: "Cancel",
    fallbackLabel: "Use Passcode",
    disableDeviceFallback: false,
  });

  return !!result.success;
}

// =======================
// Root App
// =======================
export default function App() {
  const [booting, setBooting] = useState(true);
  const [initialRoute, setInitialRoute] = useState<"Login" | "Main">("Login");
  const [initialParams, setInitialParams] = useState<
    RootStackParamList["Main"] | undefined
  >(undefined);

  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log(
          "[Push] Notification received:",
          notification.request.content.data
        );
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log(
          "[Push] Notification tapped:",
          response.notification.request.content.data
        );
      });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const token = await getRefreshToken();

        if (!token) {
          if (!mounted) return;
          setInitialRoute("Login");
          setInitialParams(undefined);
          return;
        }

        // ✅ Gate with FaceID ONLY if user enabled Biometric Login
        const ok = await promptBiometricIfEnabled();
        if (!ok) {
          if (!mounted) return;
          // user canceled/failed -> go to Login (do not clear token)
          setInitialRoute("Login");
          setInitialParams(undefined);
          return;
        }

        // try refresh
        const data = await refreshLogin(token);

        if (!mounted) return;
        setInitialRoute("Main");
        setInitialParams({
          staffId: data.staffId,
          staffName: data.staffName,
          staffEmail: data.email,
        });
      } catch (e: any) {
        if (!mounted) return;
        // refresh failed -> force login with OTP
        setInitialRoute("Login");
        setInitialParams(undefined);

        if (__DEV__) {
          const msg = String(e?.message || e);
          console.log("[App] bootstrap failed:", msg);
        }
      } finally {
        if (!mounted) return;
        setBooting(false);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  if (booting) {
    return (
      <View style={[styles.container, styles.boot]}>
        <ActivityIndicator size="large" />
        <Text style={styles.bootText}>Signing you in...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <RootStack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{ headerShown: false }}
        >
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen
            name="Main"
            component={MainDrawerNavigator}
            initialParams={initialParams}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  boot: {
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  bootText: {
    fontSize: 14,
    fontWeight: "700",
    opacity: 0.7,
  },

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