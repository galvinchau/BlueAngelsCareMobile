// src/api/mobileClient.ts
// Real HTTP client for Blue Angels Care Mobile -> NestJS API

import type { MobileDailyNotePayload } from "../types/mobileApi";

// ⚠ IMPORTANT:
// - Dùng IP của máy đang chạy NestJS (xem trong Expo: exp://<IP>:8081)
// - Hiện tại ở nhà: 192.168.0.141
// - Sau này sang máy cơ quan, chỉ cần sửa lại IP ở đây.
const API_BASE = "http://192.168.0.141:3000";

export interface SubmitDailyNoteResponse {
  status: string;
  id: string;
}

/**
 * Call backend: POST /mobile/daily-notes
 * Body: MobileDailyNotePayload
 */
export async function submitDailyNote(
  payload: MobileDailyNotePayload
): Promise<SubmitDailyNoteResponse> {
  const url = `${API_BASE}/mobile/daily-notes`;
  console.log("[MobileAPI] submitDailyNote ->", url);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "[MobileAPI] submitDailyNote HTTP error",
      res.status,
      res.statusText,
      text
    );
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as SubmitDailyNoteResponse;
  console.log("[MobileAPI] submitDailyNote response:", data);
  return data;
}
