// src/config.ts

export const BACKEND_BASE_URL =
  process.env.EXPO_PUBLIC_BAC_API_BASE_URL || "http://localhost:3333";

/**
 * Web (BAC-HMS) base URL for in-app WebView tabs (Medication / POC).
 * Example (production): https://<your-vercel-domain>
 * For local dev: http://localhost:3000
 */
export const WEB_BASE_URL = process.env.EXPO_PUBLIC_BAC_WEB_BASE_URL || "";