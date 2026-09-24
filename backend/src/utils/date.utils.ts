import {
  format,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  differenceInMinutes,
} from 'date-fns';

/**
 * Parse shift time string ("HH:MM") into a Date object on a given date.
 * All times are treated as local time.
 */
export function parseShiftTime(timeStr: string, date: Date): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Calculate late minutes given a check-in time and shift start + grace period.
 * Returns 0 if on time.
 */
export function calculateLateMinutes(
  checkIn: Date,
  shiftStart: string,
  gracePeriodMinutes: number,
  workDate: Date
): number {
  const shiftStartTime = parseShiftTime(shiftStart, workDate);
  const deadlineTime = new Date(
    shiftStartTime.getTime() + gracePeriodMinutes * 60 * 1000
  );
  const diff = differenceInMinutes(checkIn, deadlineTime);
  return Math.max(0, diff);
}

/**
 * Calculate early leave minutes: how many minutes before shift end employee left.
 * Returns 0 if they stayed until the end.
 */
export function calculateEarlyLeaveMinutes(
  checkOut: Date,
  shiftEnd: string,
  workDate: Date
): number {
  const shiftEndTime = parseShiftTime(shiftEnd, workDate);
  const diff = differenceInMinutes(shiftEndTime, checkOut);
  return Math.max(0, diff);
}

/**
 * Calculate overtime hours: extra time beyond shift end.
 * Returns 0 if checked out before shift end.
 */
export function calculateOvertimeHours(
  checkOut: Date,
  shiftEnd: string,
  workDate: Date
): number {
  const shiftEndTime = parseShiftTime(shiftEnd, workDate);
  const diffMinutes = differenceInMinutes(checkOut, shiftEndTime);
  return Math.max(0, diffMinutes / 60);
}

/**
 * Calculate actual working hours, subtracting break duration.
 * Returns hours as decimal.
 */
export function calculateWorkingHours(
  checkIn: Date,
  checkOut: Date,
  breakStart?: string | null,
  breakEnd?: string | null,
  workDate?: Date
): number {
  const totalMinutes = differenceInMinutes(checkOut, checkIn);

  let breakMinutes = 0;
  if (breakStart && breakEnd && workDate) {
    const bStart = parseShiftTime(breakStart, workDate);
    const bEnd = parseShiftTime(breakEnd, workDate);
    breakMinutes = Math.max(0, differenceInMinutes(bEnd, bStart));
  }

  const workMinutes = Math.max(0, totalMinutes - breakMinutes);
  return Math.round((workMinutes / 60) * 100) / 100;
}

export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function getMonthRange(
  year: number,
  month: number
): { start: Date; end: Date } {
  const date = new Date(year, month - 1, 1);
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateTime(date: Date): string {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}
