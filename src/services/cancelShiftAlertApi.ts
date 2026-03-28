// bac-Mobile/BlueAngelscareMobile/src/services/cancelShiftAlertApi.ts

// ===============================
// BACKEND URL (PRODUCTION)
// ===============================
const BASE_URL = "https://hms.blueangelscare.org";

// ===============================
// TYPES
// ===============================
export type CancelShiftAlertItem = {
  id: string;
  type: "SHIFT_CANCELLED";

  title: string;
  message: string;

  note?: string | null;

  individualName?: string | null;
  serviceName?: string | null;
  shiftDateLabel?: string | null;
  shiftTimeLabel?: string | null;

  createdAt: string;
  shiftId?: string | null;
};

type GetCancelAlertsResponse = {
  ok: boolean;
  items: CancelShiftAlertItem[];
};

type DismissAlertResponse = {
  ok: boolean;
  item?: {
    id: string;
    isRead: boolean;
    readAt: string;
  };
  alreadyDismissed?: boolean;
};

// ===============================
// GET CANCEL SHIFT ALERTS
// ===============================
export async function getCancelShiftAlerts(
  employeeId: string
): Promise<GetCancelAlertsResponse> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/mobile-alerts?employeeId=${employeeId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "FAILED_TO_FETCH_CANCEL_ALERTS"
      );
    }

    return data;
  } catch (error: any) {
    console.log("❌ getCancelShiftAlerts error:", error.message);

    throw new Error(
      error?.message || "NETWORK_ERROR_GET_CANCEL_ALERTS"
    );
  }
}

// ===============================
// DISMISS ALERT
// ===============================
export async function dismissCancelShiftAlert(
  alertId: string
): Promise<DismissAlertResponse> {
  try {
    const res = await fetch(
      `${BASE_URL}/api/mobile-alerts/dismiss`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          alertId,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "FAILED_TO_DISMISS_ALERT"
      );
    }

    return data;
  } catch (error: any) {
    console.log("❌ dismissCancelShiftAlert error:", error.message);

    throw new Error(
      error?.message || "NETWORK_ERROR_DISMISS_ALERT"
    );
  }
}