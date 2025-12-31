// src/api/mobileAuthApi.ts
import { BACKEND_BASE_URL } from "../config";
import {
  saveRefreshToken,
  saveStaffInfo,
  clearAuthStorage,
} from "../auth/authStorage";

export type VerifyOtpResponse = {
  staffId: string;
  staffName: string;
  email: string;
  refreshToken: string; // 90 days token (server)
};

export type RequestOtpResponse = {
  message: string; // "OTP sent"
};

async function readErrorText(res: Response) {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

function httpError(status: number, text: string) {
  const msg = text?.trim() || "Request failed";
  return new Error(`HTTP ${status}: ${msg}`);
}

/**
 * Request OTP (send 4-digit code to email)
 */
export async function requestOtp(email: string): Promise<RequestOtpResponse> {
  const res = await fetch(`${BACKEND_BASE_URL}/mobile/auth/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const msg = await readErrorText(res);
    throw httpError(res.status, msg);
  }

  return res.json();
}

/**
 * Verify OTP (returns staff + refreshToken)
 */
export async function verifyOtp(
  email: string,
  code: string
): Promise<VerifyOtpResponse> {
  const res = await fetch(`${BACKEND_BASE_URL}/mobile/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code }),
  });

  if (!res.ok) {
    const msg = await readErrorText(res);
    throw httpError(res.status, msg);
  }

  const data = (await res.json()) as VerifyOtpResponse;

  // 🔐 Save refresh token + staff info
  if (data.refreshToken) {
    await saveRefreshToken(data.refreshToken);
  }
  await saveStaffInfo({
    staffId: data.staffId,
    staffName: data.staffName,
    email: data.email,
  });

  return data;
}

/**
 * Refresh login (auto login)
 */
export async function refreshLogin(refreshToken: string) {
  const res = await fetch(`${BACKEND_BASE_URL}/mobile/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    const msg = await readErrorText(res);
    throw httpError(res.status, msg);
  }

  const data = (await res.json()) as VerifyOtpResponse;

  // token rotation
  if (data.refreshToken) {
    await saveRefreshToken(data.refreshToken);
  }
  await saveStaffInfo({
    staffId: data.staffId,
    staffName: data.staffName,
    email: data.email,
  });

  return data;
}

/**
 * Logout
 */
export async function logout(refreshToken: string) {
  try {
    await fetch(`${BACKEND_BASE_URL}/mobile/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } finally {
    await clearAuthStorage();
  }
}
