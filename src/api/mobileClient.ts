// src/api/mobileClient.ts
import type { MobileShift } from "../types/mobileApi";

/**
 * Địa chỉ backend NestJS (bac-api)
 *  - Local PC: dùng IP v4 lấy từ ipconfig (ví dụ 10.0.0.83)
 *  - PORT mặc định của Nest: 3000
 */
const BACKEND_BASE_URL = "http://10.0.0.83:3000";

/** Helper: log lỗi từ response */
async function logAndThrow(res: Response, context: string): Promise<never> {
  const text = await res.text();
  console.error(`[mobileClient] ${context} failed:`, res.status, text);
  throw new Error(`${context} failed`);
}

/**
 * Lấy Today’s shifts thật từ bac-api
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
 * Check in shift – trả lại JSON từ backend
 *  { status, mode, shiftId, staffId, time, timesheetId }
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

  // 🔴 QUAN TRỌNG: phải return data để HomeScreen dùng
  return data;
}

/**
 * Check out shift – trả lại JSON từ backend
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
