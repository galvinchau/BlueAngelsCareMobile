// src/api/mobileClient.ts
import {
  CheckInOutResponse,
  MobileDailyNotePayload,
  MobileShift,
} from "../types/mobileApi";

/**
 * Base URL cho backend NestJS (chạy trên PC của anh).
 * - NHỚ: dùng http:// (không phải https://)
 * - Mỗi khi đổi máy / đổi mạng, IP có thể thay đổi → cần sửa lại cho đúng.
 */
const API_BASE = "http://192.168.0.141:3000";

// Export thêm cho đúng với tài liệu hướng dẫn (nếu sau này có dùng tới)
export const API_BASE_URL = API_BASE;

export async function getTodayShifts(
  staffId: string,
  date: string
): Promise<MobileShift[]> {
  const url = `${API_BASE}/mobile/shifts/today?staffId=${encodeURIComponent(
    staffId
  )}&date=${encodeURIComponent(date)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load shifts");
  }

  const data = await res.json();
  return data.shifts ?? [];
}

export async function submitDailyNote(
  payload: MobileDailyNotePayload
): Promise<{ status: string; id: string }> {
  const res = await fetch(`${API_BASE}/mobile/daily-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error("Failed to submit daily note");
  }

  return res.json();
}

export async function checkInShift(
  shiftId: string,
  staffId: string
): Promise<CheckInOutResponse> {
  const res = await fetch(
    `${API_BASE}/mobile/shifts/${encodeURIComponent(shiftId)}/check-in`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to check in");
  }

  return res.json();
}

export async function checkOutShift(
  shiftId: string,
  staffId: string
): Promise<CheckInOutResponse> {
  const res = await fetch(
    `${API_BASE}/mobile/shifts/${encodeURIComponent(shiftId)}/check-out`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId }),
    }
  );

  if (!res.ok) {
    throw new Error("Failed to check out");
  }

  return res.json();
}
