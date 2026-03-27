// ===============================
// BACKEND URL (PRODUCTION)
// ===============================
const BASE_URL = "https://hms.blueangelscare.org";

// ===============================
// TYPES
// ===============================
export type BackupShiftItem = {
  id: string;
  weekId: string;
  individualId: string;
  individualName: string;
  individualCode?: string;
  serviceId: string;
  serviceCode?: string;
  serviceName?: string;
  scheduleDate: string;
  plannedStart: string;
  plannedEnd: string;
  awakeMonitoringRequired?: boolean;
  notes?: string | null;
  backupNote?: string | null;
  status: string;
};

type GetBackupShiftsResponse = {
  ok: boolean;
  items: BackupShiftItem[];
};

type AcceptBackupShiftResponse = {
  ok: boolean;
  shift: any;
};

// ===============================
// GET BACKUP SHIFTS
// ===============================
export async function getBackupShifts(): Promise<GetBackupShiftsResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/schedule/backup-open`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "FAILED_TO_FETCH_BACKUP_OPEN_SHIFTS"
      );
    }

    return data;
  } catch (error: any) {
    console.log("❌ getBackupShifts error:", error.message);

    throw new Error(
      error?.message || "NETWORK_ERROR_GET_BACKUP_SHIFTS"
    );
  }
}

// ===============================
// ACCEPT BACKUP SHIFT
// ===============================
export async function acceptBackupShift(
  shiftId: string,
  employeeId: string
): Promise<AcceptBackupShiftResponse> {
  try {
    const res = await fetch(`${BASE_URL}/api/schedule/backup-accept`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shiftId,
        employeeId,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.error || "FAILED_TO_ACCEPT_BACKUP_SHIFT"
      );
    }

    return data;
  } catch (error: any) {
    console.log("❌ acceptBackupShift error:", error.message);

    throw new Error(
      error?.message || "NETWORK_ERROR_ACCEPT_BACKUP_SHIFT"
    );
  }
}