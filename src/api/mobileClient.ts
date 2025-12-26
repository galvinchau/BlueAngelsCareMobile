// src/api/mobileClient.ts
import type {
  MobileShift,
  MobileLoginResult,
  MobileDailyNotePayload,
} from "../types/mobileApi";

const BACKEND_BASE_URL = "https://blueangelscareapi.onrender.com";

/**
 * ❌ DO NOT USE toISOString()
 * ✅ USE LOCAL TIME STRING (HH:mm)
 */
function getLocalTimeHHmm(): string {
  const d = new Date();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

async function readBodySafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

/**
 * OTP login
 */
export async function requestLoginOtp(email: string): Promise<void> {
  const url = `${BACKEND_BASE_URL}/mobile/auth/request-otp`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `requestLoginOtp failed (${res.status}): ${body || res.statusText}`
    );
  }
}

/**
 * Verify OTP
 */
export async function verifyLoginOtp(
  email: string,
  code: string
): Promise<MobileLoginResult> {
  const url = `${BACKEND_BASE_URL}/mobile/auth/verify-otp`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim(),
      code: code.trim(),
    }),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `verifyLoginOtp failed (${res.status}): ${body || res.statusText}`
    );
  }
  return res.json();
}

/**
 * Get today shifts
 */
export async function getTodayShifts(
  staffId: string,
  date: string
): Promise<MobileShift[]> {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/today?staffId=${encodeURIComponent(
    staffId
  )}&date=${encodeURIComponent(date)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `getTodayShifts failed (${res.status}): ${body || res.statusText}`
    );
  }

  const data = await res.json();
  return data?.shifts ?? [];
}

/**
 * ✅ CHECK IN – SEND LOCAL TIME
 */
export async function checkInShift(shiftId: string, staffId: string) {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/${shiftId}/check-in`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId,
      clientTime: getLocalTimeHHmm(),
    }),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `checkInShift failed (${res.status}): ${body || res.statusText}`
    );
  }
  return res.json();
}

/**
 * ✅ CHECK OUT – SEND LOCAL TIME
 */
export async function checkOutShift(shiftId: string, staffId: string) {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/${shiftId}/check-out`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId,
      clientTime: getLocalTimeHHmm(),
    }),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `checkOutShift failed (${res.status}): ${body || res.statusText}`
    );
  }
  return res.json();
}

/**
 * Submit Daily Note
 */
export async function submitDailyNote(
  payload: MobileDailyNotePayload
): Promise<{ ok?: boolean; status?: string; id?: string }> {
  const url = `${BACKEND_BASE_URL}/mobile/daily-notes`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `submitDailyNote failed (${res.status}): ${body || res.statusText}`
    );
  }

  return res.json();
}
