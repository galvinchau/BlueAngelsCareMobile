// src/types/mobileApi.ts

export type MobileShiftStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface AwakeMonitoringInfo {
  enabled: boolean;
  status: string | null;
  intervalMinutes: number | null;
  graceMinutes: number | null;
  lastConfirmedAt: string | null;
  nextDueAt: string | null;
  deadlineAt: string | null;
  autoCheckedOutAt: string | null;
  autoCheckoutReason: string | null;
}

export interface MobileShift {
  id: string;
  date: string;
  staffId: string;
  individualId: string;
  individualName: string;
  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;
  serviceCode: string;
  serviceName: string;
  scheduleStart: string;
  scheduleEnd: string;
  location: string;
  status: MobileShiftStatus;
  visitStart?: string | null;
  visitEnd?: string | null;
  outcomeText?: string;

  // ✅ Phase 1 - Awake Monitoring
  awakeMonitoringEnabled?: boolean;
  awakeMonitoring?: AwakeMonitoringInfo | null;
}

export interface MobileDailyNotePayload {
  // IDs
  shiftId: string;
  staffId: string;
  individualId: string;

  // Staff info
  staffName?: string;
  staffEmail?: string;

  // Individual info
  date: string;
  individualName: string;
  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;

  // Service info
  serviceCode: string;
  serviceName: string;
  scheduleStart: string;
  scheduleEnd: string;
  outcomeText?: string;

  // Visit info
  visitStart?: string;
  visitEnd?: string;

  // Service notes
  todayPlan?: string;
  whatWeWorkedOn?: string;
  opportunities?: string;
  notes?: string;

  // Mileage & cancel
  mileage?: number;
  isCanceled?: boolean;
  cancelReason?: string;

  // Meals
  meals?: {
    breakfast?: { time?: string; had?: string; offered?: string };
    lunch?: { time?: string; had?: string; offered?: string };
    dinner?: { time?: string; had?: string; offered?: string };
  };

  // Health / incident
  healthNotes?: string;
  incidentNotes?: string;

  // Signatures (base64)
  dspSignature?: string | null;
  individualSignature?: string | null;

  // Extra fields nếu cần cho template / DB
  staffNameForCertifyText?: string;
  certifyText?: string;
}

export interface TimesheetEntry {
  id: string;
  staffId: string;
  shiftId: string;
  individualId: string;
  serviceCode: string;
  date: string;
  visitStart: string;
  visitEnd: string;
  minutes: number;
  units: number;
}

export interface CheckInOutResponse {
  shift?: MobileShift;
  timesheet?: TimesheetEntry;

  status?: "OK";
  mode?: "IN" | "OUT";
  shiftId?: string;
  staffId?: string;
  time?: string;
  timesheetId?: string;

  awakeMonitoring?: AwakeMonitoringInfo | null;
}

// ==== Auth / Login types ====
// Gộp về một interface duy nhất cho tiện dùng
export interface MobileLoginResult {
  staffId: string;
  staffName: string;
  token?: string;
  accessToken?: string;
}