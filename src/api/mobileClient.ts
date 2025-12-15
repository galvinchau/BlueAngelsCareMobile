// src/api/mobileClient.ts
import type {
  MobileShift,
  MobileLoginResult,
  MobileDailyNotePayload,
} from "../types/mobileApi";

/**
 * Backend NestJS (bac-api)
 *  - Local PC: IPv4 từ ipconfig (ví dụ 192.168.12.211)
 *  - Nest port: 3000
 */
const BACKEND_BASE_URL = "http://192.168.12.211:3000";

/** Helper: log lỗi từ response */
async function logAndThrow(res: Response, context: string): Promise<never> {
  const text = await res.text();
  console.error(`[mobileClient] ${context} failed:`, res.status, text);
  throw new Error(`${context} failed: ${res.status}`);
}

/**
 * Gửi OTP login (4 số) tới email DSP
 */
export async function requestLoginOtp(email: string): Promise<void> {
  const url = `${BACKEND_BASE_URL}/mobile/auth/request-otp`;

  const body = { email: email.trim() };

  console.log("[mobileClient] POST requestLoginOtp:", url, body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await logAndThrow(res, "POST /mobile/auth/request-otp");
  }

  console.log("[mobileClient] requestLoginOtp OK");
}

/**
 * Xác thực OTP login
 */
export async function verifyLoginOtp(
  email: string,
  code: string
): Promise<MobileLoginResult> {
  const url = `${BACKEND_BASE_URL}/mobile/auth/verify-otp`;

  const body = {
    email: email.trim(),
    code: code.trim(),
    clientTime: new Date().toISOString(),
  };

  console.log("[mobileClient] POST verifyLoginOtp:", url, body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await logAndThrow(res, "POST /mobile/auth/verify-otp");
  }

  const data = (await res.json()) as MobileLoginResult;
  console.log("[mobileClient] verifyLoginOtp response:", data);

  return data;
}

/**
 * Today’s shifts
 */
export async function getTodayShifts(
  staffId: string,
  date: string
): Promise<MobileShift[]> {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/today?staffId=${encodeURIComponent(
    staffId
  )}&date=${encodeURIComponent(date)}`;

  console.log("[mobileClient] GET Today shifts:", url);

  const res = await fetch(url);
  if (!res.ok) {
    await logAndThrow(res, "GET /mobile/shifts/today");
  }

  const data = await res.json();
  console.log("[mobileClient] Today shifts response:", data);

  return data?.shifts ?? [];
}

/**
 * Check in
 */
export async function checkInShift(shiftId: string, staffId: string) {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/${encodeURIComponent(
    shiftId
  )}/check-in`;

  const body = {
    staffId,
    clientTime: new Date().toISOString(),
  };

  console.log("[mobileClient] POST Check-in:", url, JSON.stringify(body));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await logAndThrow(res, "POST /check-in");
  }

  const data = await res.json();
  console.log("[mobileClient] Check-in response:", data);

  return data;
}

/**
 * Check out
 */
export async function checkOutShift(shiftId: string, staffId: string) {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/${encodeURIComponent(
    shiftId
  )}/check-out`;

  const body = {
    staffId,
    clientTime: new Date().toISOString(),
  };

  console.log("[mobileClient] POST Check-out:", url, JSON.stringify(body));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await logAndThrow(res, "POST /check-out");
  }

  const data = await res.json();
  console.log("[mobileClient] Check-out response:", data);

  return data;
}

/**
 * Submit Daily Note (gọi NestJS /mobile/daily-notes)
 *  - payload được build ở DailyNoteScreen.tsx
 */
export async function submitDailyNote(
  payload: MobileDailyNotePayload
): Promise<{ ok: boolean; dailyNoteId?: string; shift?: MobileShift }> {
  const url = `${BACKEND_BASE_URL}/mobile/daily-notes`;

  console.log(
    "[mobileClient] POST submitDailyNote:",
    url,
    JSON.stringify(payload)
  );

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await logAndThrow(res, "POST /mobile/daily-notes");
  }

  const data = await res.json();
  console.log("[mobileClient] submitDailyNote response:", data);

  return data;
}
