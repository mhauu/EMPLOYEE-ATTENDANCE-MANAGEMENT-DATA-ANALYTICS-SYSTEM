export type UserRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'LEAVE'
  | 'EARLY_LEAVE'
  | 'OVERTIME'
  | 'INCOMPLETE';
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  employeeId?: string;
  fullName?: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    department?: { id: string; name: string };
    position?: { id: string; name: string };
  };
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  phone?: string;
  hireDate: string;
  gender?: string;
  status: EmployeeStatus;
  departmentId?: string;
  positionId?: string;
  department?: { id: string; name: string };
  position?: { id: string; name: string };
  user?: { email: string; role: UserRole; lastLoginAt?: string };
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  gracePeriodMinutes: number;
}

export interface Workplace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  allowedRadiusMeters: number;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  managerId?: string;
  _count?: { employees: number };
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  _count?: { employees: number };
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  workDate: string;
  checkIn?: string;
  checkOut?: string;
  checkInAccuracy?: number;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workingHours: number;
  overtimeHours: number;
  status: AttendanceStatus;
  notes?: string;
  employee?: {
    fullName: string;
    employeeCode: string;
    department?: { name: string };
  };
  shift?: { name: string; startTime: string; endTime: string };
  location?: { name: string };
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveRequestStatus;
  rejectionReason?: string;
  leaveType: { name: string; isPaid: boolean };
  employee?: {
    fullName: string;
    employeeCode: string;
    department?: { name: string };
  };
}

export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  leaveType: { name: string; isPaid: boolean };
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
