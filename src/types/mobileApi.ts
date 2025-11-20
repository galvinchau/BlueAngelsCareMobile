// src/types/mobileApi.ts

/** DSP user info sau khi login */
export interface MobileUser {
  id: string; // StaffID trong BAC-HMS
  email: string;
  fullName: string;
  role: "DSP";
}

/** Một ca trực (shift) hiển thị trên Today’s Shifts */
export type MobileShiftStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface MobileShift {
  id: string; // ScheduleRowID hoặc Timesheet ID
  date: string; // YYYY-MM-DD
  individualId: string;
  individualName: string;
  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;

  serviceCode: string; // COMP / HCSS / PCA...
  serviceName: string; // "COMP – Companion"
  location: string; // "Home", "Community", ...
  scheduleStart: string; // "08:00"
  scheduleEnd: string; // "12:00"

  status: MobileShiftStatus;
  // Giờ thực tế (nếu đã check in/out)
  visitStart?: string | null;
  visitEnd?: string | null;

  outcomeText?: string; // ISP Outcome tóm tắt
}

/** Payload cho Daily Note gửi lên backend */
export interface MobileDailyNotePayload {
  shiftId: string;
  staffId: string;
  individualId: string;

  date: string; // ngày dịch vụ

  // auto-fill
  individualName: string;
  individualDob?: string;
  individualMa?: string;
  individualAddress?: string;
  serviceCode: string;
  serviceName: string;
  scheduleStart: string;
  scheduleEnd: string;
  outcomeText?: string;

  // visit thực tế
  visitStart: string;
  visitEnd: string;

  // nội dung trong ca
  todayPlan: string;
  whatWeWorkedOn: string;
  opportunities: string;
  notes: string;

  meals: {
    breakfast: { time?: string; had?: string; offered?: string };
    lunch: { time?: string; had?: string; offered?: string };
    dinner: { time?: string; had?: string; offered?: string };
  };

  healthNotes?: string;
  incidentNotes?: string;

  staffName: string;
  certifyText: string;
}
