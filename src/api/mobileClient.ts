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
const BACKEND_BASE_URL = "https://blueangelscareapi.onrender.com";

/** Helper: log lỗi từ response */
async function logAndThrow(res: Response, context: string): Promise<never> {
  const text = await res.text();
  console.error(`[mobileClient] ${context} failed:`, res.status, text);
  throw new Error(`${context} failed: ${res.status}`);
}

/**
 * Helper: local ISO string WITH timezone offset (e.g. 2025-12-19T10:38:00-05:00)
 * This avoids UTC ("Z") times that can cause a +5 hour shift if the backend doesn't convert.
 */
function getLocalIsoWithOffset(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());

  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());

  // getTimezoneOffset() returns minutes behind UTC (e.g. New York winter = 300)
  const tzMinutes = -d.getTimezoneOffset(); // now minutes ahead of UTC
  const sign = tzMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(tzMinutes);
  const tzh = pad(Math.floor(abs / 60));
  const tzm = pad(abs % 60);

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${sign}${tzh}:${tzm}`;
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
    clientTime: getLocalIsoWithOffset(),
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
    clientTime: getLocalIsoWithOffset(),
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
    clientTime: getLocalIsoWithOffset(),
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
