// src/api/mobileClient.ts
// Client for BAC NestJS API (real DB)

import type { MobileShift, MobileDailyNotePayload } from "../types/mobileApi";

// ⚠️ ĐÂY LÀ IP CỦA MÁY ANH (ipconfig -> IPv4 Address)
const API_BASE_URL = "http://10.0.0.83:3000";

// Helper: check HTTP status + parse JSON
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[mobileClient] HTTP error", res.status, text);
    throw new Error(`API error ${res.status}`);
  }
  return (await res.json()) as T;
}

/**
 * Get today's shifts for a staff from real BAC-API
 * GET /mobile/shifts/today?staffId=...&date=YYYY-MM-DD
 */
export async function getTodayShifts(
  staffId: string,
  date: string
): Promise<MobileShift[]> {
  const url = `${API_BASE_URL}/mobile/shifts/today?staffId=${encodeURIComponent(
    staffId
  )}&date=${date}`;

  console.log("[mobileClient] GET Today shifts:", url);

  const data = await handleResponse<{ shifts: MobileShift[] }>(
    await fetch(url)
  );

  return data.shifts ?? [];
}

/**
 * Check-in: create real Visit in DB
 * POST /mobile/shifts/:shiftId/check-in
 * Body: { staffId, clientTime? }
 */
export async function checkInShift(
  shiftId: string,
  staffId: string,
  clientTime?: string
): Promise<void> {
  const url = `${API_BASE_URL}/mobile/shifts/${shiftId}/check-in`;

  const body = {
    staffId,
    clientTime: clientTime ?? new Date().toISOString(),
  };

  console.log("[mobileClient] POST Check-in:", url, body);

  await handleResponse<unknown>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

/**
 * Check-out: close real Visit in DB
 * POST /mobile/shifts/:shiftId/check-out
 * Body: { staffId, clientTime? }
 */
export async function checkOutShift(
  shiftId: string,
  staffId: string,
  clientTime?: string
): Promise<void> {
  const url = `${API_BASE_URL}/mobile/shifts/${shiftId}/check-out`;

  const body = {
    staffId,
    clientTime: clientTime ?? new Date().toISOString(),
  };

  console.log("[mobileClient] POST Check-out:", url, body);

  await handleResponse<unknown>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

/**
 * Daily Note: tạm thời vẫn gọi API backend luôn
 * (sau mình sẽ chỉnh chuẩn endpoint nếu cần)
 */
export async function submitDailyNote(
  payload: MobileDailyNotePayload
): Promise<{ status: string; id: string }> {
  const url = `${API_BASE_URL}/mobile/daily-notes`;

  console.log("[mobileClient] POST Daily Note:", url, payload);

  return await handleResponse<{ status: string; id: string }>(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
}
