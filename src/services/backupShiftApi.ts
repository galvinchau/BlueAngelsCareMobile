const BASE_URL = "http://YOUR_BACKEND_URL";

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

export async function getBackupShifts(): Promise<GetBackupShiftsResponse> {
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
}

export async function acceptBackupShift(
  shiftId: string,
  employeeId: string
): Promise<AcceptBackupShiftResponse> {
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
    throw new Error(data?.error || "FAILED_TO_ACCEPT_BACKUP_SHIFT");
  }

  return data;
}