import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "BAC_MOBILE_REFRESH_TOKEN";
const STAFF_INFO_KEY = "BAC_MOBILE_STAFF_INFO";

export type StoredStaffInfo = {
  staffId: string;
  staffName: string;
  email: string;
};

/**
 * Save refresh token (3 months)
 */
export async function saveRefreshToken(token: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

/**
 * Get refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Remove refresh token (logout)
 */
export async function clearRefreshToken() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

/**
 * Save staff info
 */
export async function saveStaffInfo(info: StoredStaffInfo) {
  await SecureStore.setItemAsync(STAFF_INFO_KEY, JSON.stringify(info));
}

/**
 * Get staff info
 */
export async function getStaffInfo(): Promise<StoredStaffInfo | null> {
  const raw = await SecureStore.getItemAsync(STAFF_INFO_KEY);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Clear all auth data
 */
export async function clearAuthStorage() {
  await clearRefreshToken();
  await SecureStore.deleteItemAsync(STAFF_INFO_KEY);
}
