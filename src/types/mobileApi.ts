// src/types/mobileApi.ts

export type MobileShiftStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

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
}

export interface MobileDailyNotePayload {
  shiftId: string;
  staffId: string;
  individualId: string;

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

  meals?: {
    breakfast?: { time?: string; had?: string; offered?: string };
    lunch?: { time?: string; had?: string; offered?: string };
    dinner?: { time?: string; had?: string; offered?: string };
  };

  healthNotes?: string;
  incidentNotes?: string;

  staffName?: string;
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
  shift: MobileShift;
  timesheet?: TimesheetEntry;
}
// ==== Auth / Login types ====

export interface MobileLoginResult {
  token: string; // JWT hoặc access token từ API
  staffId: string; // id của DSP (staff)
  staffName: string; // tên DSP để hiển thị trên màn hình
}
// src/types/mobileApi.ts

// ... giữ nguyên các type ở trên ...

export interface MobileLoginResult {
  staffId: string;
  staffName: string;
  accessToken?: string;
}
