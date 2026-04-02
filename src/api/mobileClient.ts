// src/api/mobileClient.ts
import type {
  MobileShift,
  MobileLoginResult,
  MobileDailyNotePayload,
  CheckInOutResponse,
  RegisterPushTokenPayload,
  RegisterPushTokenResponse,
  DeactivatePushTokenPayload,
  DeactivatePushTokenResponse,
  SendTestPushResponse,
} from "../types/mobileApi";

import { BACKEND_BASE_URL } from "../config";

/**
 * Mobile Individual (lite) for Clients search
 */
export type MobileIndividualLite = {
  id: string;
  fullName: string;
  maNumber?: string | null;
  address1?: string | null;
  address2?: string | null;
  phone?: string | null;
};

export type AwakeMonitoringResponse = {
  enabled: boolean;
  status: string | null;
  intervalMinutes: number | null;
  graceMinutes: number | null;
  lastConfirmedAt: string | null;
  nextDueAt: string | null;
  deadlineAt: string | null;
  autoCheckedOutAt: string | null;
  autoCheckoutReason: string | null;
};

export type AwakeConfirmResponse = {
  status: "OK";
  visitId: string;
  staffId: string;
  confirmedAt: string;
  awakeMonitoring: AwakeMonitoringResponse;
};

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

async function fetchJsonOrThrow(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(`${url} failed (${res.status}): ${body || res.statusText}`);
  }
  return res.json();
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
 * Get today shifts (by staff)
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
 * ✅ NEW: Get 3-week window shifts (Prev week + Current week + Next week)
 * GET /mobile/shifts/window?staffId=...&date=YYYY-MM-DD
 */
export async function getShiftsWindow(
  staffId: string,
  date: string
): Promise<MobileShift[]> {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/window?staffId=${encodeURIComponent(
    staffId
  )}&date=${encodeURIComponent(date)}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `getShiftsWindow failed (${res.status}): ${body || res.statusText}`
    );
  }

  const data = await res.json();
  return data?.shifts ?? [];
}

/**
 * ✅ NEW: Get today's shifts (by individual) for Client Detail
 * GET /mobile/individuals/:id/shifts/today?date=YYYY-MM-DD&staffId=optional
 */
export async function getIndividualTodayShifts(params: {
  individualId: string;
  date: string;
  staffId?: string;
}): Promise<MobileShift[]> {
  const { individualId, date, staffId } = params;

  const qs = new URLSearchParams();
  qs.set("date", date);
  if (staffId) qs.set("staffId", staffId);

  const url = `${BACKEND_BASE_URL}/mobile/individuals/${encodeURIComponent(
    individualId
  )}/shifts/today?${qs.toString()}`;

  const data = await fetchJsonOrThrow(url);
  return data?.shifts ?? [];
}

/**
 * ✅ CHECK IN – SEND LOCAL TIME + GPS + AWAKE MONITORING OPTION
 */
export async function checkInShift(
  shiftId: string,
  staffId: string,
  gpsLatitude?: number,
  gpsLongitude?: number,
  awakeMonitoringEnabled?: boolean
): Promise<CheckInOutResponse> {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/${shiftId}/check-in`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId,
      clientTime: getLocalTimeHHmm(),
      gpsLatitude:
        typeof gpsLatitude === "number" && Number.isFinite(gpsLatitude)
          ? gpsLatitude
          : undefined,
      gpsLongitude:
        typeof gpsLongitude === "number" && Number.isFinite(gpsLongitude)
          ? gpsLongitude
          : undefined,
      awakeMonitoringEnabled: awakeMonitoringEnabled === true,
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
 * ✅ CHECK OUT – SEND LOCAL TIME + GPS
 */
export async function checkOutShift(
  shiftId: string,
  staffId: string,
  gpsLatitude?: number,
  gpsLongitude?: number
): Promise<CheckInOutResponse> {
  const url = `${BACKEND_BASE_URL}/mobile/shifts/${shiftId}/check-out`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId,
      clientTime: getLocalTimeHHmm(),
      gpsLatitude:
        typeof gpsLatitude === "number" && Number.isFinite(gpsLatitude)
          ? gpsLatitude
          : undefined,
      gpsLongitude:
        typeof gpsLongitude === "number" && Number.isFinite(gpsLongitude)
          ? gpsLongitude
          : undefined,
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
 * ✅ AWAKE CONFIRM
 * POST /mobile/visits/:visitId/awake-confirm
 */
export async function confirmAwake(
  visitId: string,
  staffId: string
): Promise<AwakeConfirmResponse> {
  const url = `${BACKEND_BASE_URL}/mobile/visits/${encodeURIComponent(
    visitId
  )}/awake-confirm`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      staffId,
    }),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `confirmAwake failed (${res.status}): ${body || res.statusText}`
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

/**
 * Clients: Search Individuals
 */
export async function searchIndividuals(
  query: string
): Promise<MobileIndividualLite[]> {
  const q = (query || "").trim();

  const candidates: string[] = [
    `${BACKEND_BASE_URL}/mobile/individuals/search?search=${encodeURIComponent(
      q
    )}`,
    `${BACKEND_BASE_URL}/mobile/individuals?search=${encodeURIComponent(q)}`,
    `${BACKEND_BASE_URL}/mobile/individuals?query=${encodeURIComponent(q)}`,
    `${BACKEND_BASE_URL}/individuals?search=${encodeURIComponent(q)}`,
    `${BACKEND_BASE_URL}/individuals?query=${encodeURIComponent(q)}`,
  ];

  let lastErr: any = null;

  for (const url of candidates) {
    try {
      const data = await fetchJsonOrThrow(url);

      const raw = Array.isArray(data)
        ? data
        : Array.isArray(data?.individuals)
        ? data.individuals
        : Array.isArray(data?.items)
        ? data.items
        : [];

      const normalized: MobileIndividualLite[] = raw
        .map((x: any) => {
          const id = String(x?.id ?? x?.individualId ?? "");
          const fullName =
            String(
              x?.fullName ?? x?.name ?? x?.individualName ?? x?.full_name ?? ""
            ) || "";

          if (!id || !fullName) return null;

          return {
            id,
            fullName,
            maNumber:
              x?.maNumber ?? x?.ma ?? x?.ma_number ?? x?.medicaidNumber ?? null,
            address1: x?.address1 ?? x?.addressLine1 ?? null,
            address2: x?.address2 ?? x?.addressLine2 ?? null,
            phone: x?.phone ?? x?.phoneNumber ?? null,
          } as MobileIndividualLite;
        })
        .filter(Boolean) as MobileIndividualLite[];

      return normalized;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error("searchIndividuals failed: no endpoint matched");
}

// =======================
// 🔔 PUSH NOTIFICATIONS
// =======================

/**
 * Register Expo push token on backend
 */
export async function registerPushToken(
  payload: RegisterPushTokenPayload
): Promise<RegisterPushTokenResponse> {
  const url = `${BACKEND_BASE_URL}/mobile/push/register-token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `registerPushToken failed (${res.status}): ${body || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Deactivate Expo push token
 */
export async function deactivatePushToken(
  payload: DeactivatePushTokenPayload
): Promise<DeactivatePushTokenResponse> {
  const url = `${BACKEND_BASE_URL}/mobile/push/deactivate-token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `deactivatePushToken failed (${res.status}): ${body || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Send test push (for debugging)
 */
export async function sendTestPush(
  staffId: string
): Promise<SendTestPushResponse> {
  const url = `${BACKEND_BASE_URL}/mobile/push/test`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId }),
  });

  if (!res.ok) {
    const body = await readBodySafe(res);
    throw new Error(
      `sendTestPush failed (${res.status}): ${body || res.statusText}`
    );
  }

  return res.json();
}