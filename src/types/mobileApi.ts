// bac-Mobile/BlueAngelscareMobile/src/types/mobileApi.ts

export type MobileShiftStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_COMPLETED"
  | "CANCELLED"
  | "BACKUP_PLAN";

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

  // Office-controlled Awake Monitoring
  awakeMonitoringRequired?: boolean;

  // Legacy / runtime compatibility
  awakeMonitoringEnabled?: boolean;

  // Runtime info trả về sau check-in / confirm
  awakeMonitoring?: AwakeMonitoringInfo | null;
}

export interface MobileDailyNotePayload {
  shiftId: string;
  staffId: string;
  individualId: string;

  staffName?: string;
  staffEmail?: string;

  date: string;
  individualName: string;
  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;

  serviceCode: string;
  serviceName: string;
  scheduleStart: string;
  scheduleEnd: string;
  outcomeText?: string;

  visitStart?: string;
  visitEnd?: string;

  todayPlan?: string;
  whatWeWorkedOn?: string;
  opportunities?: string;
  notes?: string;

  mileage?: number;
  isCanceled?: boolean;
  cancelReason?: string;

  meals?: {
    breakfast?: { time?: string; had?: string; offered?: string };
    lunch?: { time?: string; had?: string; offered?: string };
    dinner?: { time?: string; had?: string; offered?: string };
  };

  healthNotes?: string;
  incidentNotes?: string;

  dspSignature?: string | null;
  individualSignature?: string | null;

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
export interface MobileLoginResult {
  staffId: string;
  staffName: string;
  email?: string;
  token?: string;
  accessToken?: string;
}

// ==== Push notification types ====
export type RegisterPushTokenPayload = {
  staffId: string;
  expoPushToken: string;
  platform?: string;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
};

export type RegisterPushTokenResponse = {
  status: "OK";
  id: string;
  expoPushToken: string;
  isActive: boolean;
};

export type DeactivatePushTokenPayload = {
  staffId: string;
  expoPushToken: string;
};

export type DeactivatePushTokenResponse = {
  status: "OK";
  updated: number;
};

export type SendTestPushResponse = {
  sent: number;
  tokens: string[];
  response?: any;
};