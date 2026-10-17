import React from 'react';
import { AttendanceStatus, LeaveRequestStatus } from '../types';

interface StatusBadgeProps {
  status: AttendanceStatus | LeaveRequestStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  const getStyle = () => {
    switch (status) {
      case 'PRESENT':
      case 'APPROVED':
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'LATE':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'EARLY_LEAVE':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'OVERTIME':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'LEAVE':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ABSENT':
      case 'REJECTED':
      case 'TERMINATED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'CANCELLED':
      case 'INACTIVE':
      case 'INCOMPLETE':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'PRESENT': return 'Đúng giờ';
      case 'LATE': return 'Đi trễ';
      case 'EARLY_LEAVE': return 'Về sớm';
      case 'OVERTIME': return 'Tăng ca (OT)';
      case 'LEAVE': return 'Nghỉ phép';
      case 'ABSENT': return 'Vắng mặt';
      case 'INCOMPLETE': return 'Chưa hoàn thành';
      case 'ACTIVE': return 'Đang làm việc';
      case 'INACTIVE': return 'Tạm nghỉ';
      case 'TERMINATED': return 'Đã nghỉ việc';
      case 'PENDING': return 'Chờ phê duyệt';
      case 'APPROVED': return 'Đã duyệt';
      case 'REJECTED': return 'Từ chối';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${getStyle()} ${sizeClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {getLabel()}
    </span>
  );
};
