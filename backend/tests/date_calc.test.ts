import { describe, it, expect } from 'vitest';
import {
  calculateLateMinutes,
  calculateEarlyLeaveMinutes,
  calculateOvertimeHours,
  calculateWorkingHours,
} from '../src/utils/date.utils';

describe('Attendance Calculation Business Logic', () => {
  const workDate = new Date('2024-05-15T00:00:00Z');
  const shiftStart = '08:00';
  const shiftEnd = '17:00';
  const gracePeriod = 10; // 10 minutes

  describe('Grace Period & Late Calculation', () => {
    it('should return 0 late minutes when checked in before shift start (07:55)', () => {
      const checkIn = new Date(workDate);
      checkIn.setHours(7, 55, 0, 0);

      const late = calculateLateMinutes(checkIn, shiftStart, gracePeriod, workDate);
      expect(late).toBe(0);
    });

    it('should return 0 late minutes when checked in within grace period (08:05)', () => {
      const checkIn = new Date(workDate);
      checkIn.setHours(8, 5, 0, 0);

      const late = calculateLateMinutes(checkIn, shiftStart, gracePeriod, workDate);
      expect(late).toBe(0);
    });

    it('should return 0 late minutes when checked in exactly at grace period limit (08:10)', () => {
      const checkIn = new Date(workDate);
      checkIn.setHours(8, 10, 0, 0);

      const late = calculateLateMinutes(checkIn, shiftStart, gracePeriod, workDate);
      expect(late).toBe(0);
    });

    it('should calculate correct late minutes when checked in after grace period (08:15 => 5m late)', () => {
      const checkIn = new Date(workDate);
      checkIn.setHours(8, 15, 0, 0);

      const late = calculateLateMinutes(checkIn, shiftStart, gracePeriod, workDate);
      expect(late).toBe(5);
    });

    it('should calculate 20m late when checked in at 08:30 with 10m grace', () => {
      const checkIn = new Date(workDate);
      checkIn.setHours(8, 30, 0, 0);

      const late = calculateLateMinutes(checkIn, shiftStart, gracePeriod, workDate);
      expect(late).toBe(20);
    });
  });

  describe('Early Leave Calculation', () => {
    it('should return 0 early leave minutes when leaving at or after shift end (17:00)', () => {
      const checkOut = new Date(workDate);
      checkOut.setHours(17, 0, 0, 0);

      const early = calculateEarlyLeaveMinutes(checkOut, shiftEnd, workDate);
      expect(early).toBe(0);
    });

    it('should calculate 45 minutes early leave when leaving at 16:15', () => {
      const checkOut = new Date(workDate);
      checkOut.setHours(16, 15, 0, 0);

      const early = calculateEarlyLeaveMinutes(checkOut, shiftEnd, workDate);
      expect(early).toBe(45);
    });
  });

  describe('Overtime Calculation', () => {
    it('should return 0 overtime when checked out at 17:00', () => {
      const checkOut = new Date(workDate);
      checkOut.setHours(17, 0, 0, 0);

      const ot = calculateOvertimeHours(checkOut, shiftEnd, workDate);
      expect(ot).toBe(0);
    });

    it('should calculate 1.5 hours overtime when checked out at 18:30', () => {
      const checkOut = new Date(workDate);
      checkOut.setHours(18, 30, 0, 0);

      const ot = calculateOvertimeHours(checkOut, shiftEnd, workDate);
      expect(ot).toBe(1.5);
    });
  });

  describe('Working Hours Calculation', () => {
    it('should subtract 1-hour lunch break (12:00-13:00) from 9-hour total span (08:00-17:00)', () => {
      const checkIn = new Date(workDate);
      checkIn.setHours(8, 0, 0, 0);

      const checkOut = new Date(workDate);
      checkOut.setHours(17, 0, 0, 0);

      const hours = calculateWorkingHours(checkIn, checkOut, '12:00', '13:00', workDate);
      expect(hours).toBe(8.0);
    });
  });
});
