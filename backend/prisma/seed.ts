import { PrismaClient, UserRole, EmployeeStatus, EmploymentType, Gender, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, format, addMinutes, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function hash(pwd: string) {
  return bcrypt.hash(pwd, BCRYPT_ROUNDS);
}

async function main() {
  console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu thuần Việt cho Supabase / PostgreSQL...');

  // Xóa sạch dữ liệu cũ theo đúng thứ tự ràng buộc khóa ngoại
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.employeeLocation.deleteMany();
  await prisma.employeeShift.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.position.deleteMany();
  await prisma.department.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.location.deleteMany();

  console.log('🧹 Đã dọn dẹp các bảng dữ liệu cũ.');

  // 1. Tạo các Phòng ban
  const deptIT = await prisma.department.create({
    data: { name: 'Phòng Công nghệ Thông tin', description: 'Phát triển phần mềm, vận hành hạ tầng DevOps và an toàn thông tin' },
  });
  const deptHR = await prisma.department.create({
    data: { name: 'Phòng Nhân sự & Đào tạo', description: 'Quản trị nhân tài, chế độ phúc lợi, văn hóa và đào tạo doanh nghiệp' },
  });
  const deptFinance = await prisma.department.create({
    data: { name: 'Phòng Tài chính - Kế toán', description: 'Quản lý ngân sách, kiểm toán, chi tiêu và hạch toán bảng lương' },
  });
  const deptMarketing = await prisma.department.create({
    data: { name: 'Phòng Kinh doanh & Tiếp thị', description: 'Phát triển thị trường, quan hệ đối tác và xây dựng thương hiệu' },
  });

  // 2. Tạo Chức vụ
  const posAdmin = await prisma.position.create({ data: { name: 'Quản trị Hệ thống', description: 'Phụ trách toàn bộ hệ thống máy chủ' } });
  const posITManager = await prisma.position.create({ data: { name: 'Trưởng phòng Công nghệ Thông tin', description: 'Lãnh đạo kỹ thuật' } });
  const posHRManager = await prisma.position.create({ data: { name: 'Trưởng phòng Nhân sự', description: 'Quản lý nhân sự' } });
  const posDev = await prisma.position.create({ data: { name: 'Kỹ sư Phần mềm Full-Stack', description: 'Lập trình viên' } });
  const posQA = await prisma.position.create({ data: { name: 'Kỹ sư Kiểm thử Chất lượng (QA)', description: 'Kiểm thử phần mềm' } });
  const posHR = await prisma.position.create({ data: { name: 'Chuyên viên Nhân sự & Tuyển dụng', description: 'Nghiệp vụ nhân sự' } });
  const posAccountant = await prisma.position.create({ data: { name: 'Kế toán viên Tổng hợp', description: 'Hạch toán sổ sách' } });

  // 3. Tạo Ca làm việc (Shifts)
  const shiftStandard = await prisma.shift.create({
    data: {
      name: 'Ca Hành Chính Chuẩn',
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      gracePeriodMinutes: 15, // Cho phép ân hạn đi trễ 15 phút
    },
  });
  const shiftAfternoon = await prisma.shift.create({
    data: {
      name: 'Ca Chiều & Tối',
      startTime: '13:00',
      endTime: '21:00',
      breakStart: '17:00',
      breakEnd: '18:00',
      gracePeriodMinutes: 10,
    },
  });
  const shiftFlexible = await prisma.shift.create({
    data: {
      name: 'Ca Làm Việc Linh Hoạt',
      startTime: '09:00',
      endTime: '18:00',
      breakStart: '12:30',
      breakEnd: '13:30',
      gracePeriodMinutes: 15,
    },
  });

  // 4. Tạo Văn phòng / Địa điểm chấm công GPS Geofence
  const locHCMC = await prisma.location.create({
    data: {
      name: 'Trụ sở chính TP. Hồ Chí Minh',
      address: 'Tòa nhà Vincom Center, 72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM',
      latitude: 10.776889,
      longitude: 106.700806,
      allowedRadiusMeters: 150, // Bán kính cho phép 150 mét
    },
  });
  const locDaNang = await prisma.location.create({
    data: {
      name: 'Chi nhánh Đà Nẵng',
      address: 'Khu Công viên Phần mềm, 15 Quang Trung, Hải Châu, Đà Nẵng',
      latitude: 16.054407,
      longitude: 108.202167,
      allowedRadiusMeters: 100,
    },
  });
  const locHanoi = await prisma.location.create({
    data: {
      name: 'Chi nhánh Hà Nội',
      address: 'Tòa nhà Lotte Center, 54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội',
      latitude: 21.028511,
      longitude: 105.854444,
      allowedRadiusMeters: 120,
    },
  });

  // 5. Tạo Các loại nghỉ phép
  const leaveAnnual = await prisma.leaveType.create({
    data: { name: 'Nghỉ phép năm', defaultDaysPerYear: 12, isPaid: true },
  });
  const leaveSick = await prisma.leaveType.create({
    data: { name: 'Nghỉ ốm hưởng BHXH', defaultDaysPerYear: 5, isPaid: true },
  });
  const leavePersonal = await prisma.leaveType.create({
    data: { name: 'Nghỉ việc riêng hưởng nguyên lương', defaultDaysPerYear: 3, isPaid: true },
  });
  const leaveUnpaid = await prisma.leaveType.create({
    data: { name: 'Nghỉ không hưởng lương', defaultDaysPerYear: 0, isPaid: false },
  });

  // 6. Tạo Tài khoản Người dùng & Hồ sơ Nhân viên thuần Việt
  const adminPassword = await hash('Admin@123');
  const managerPassword = await hash('Manager@123');
  const employeePassword = await hash('Employee@123');

  // Quản trị viên (ADMIN)
  const adminUser = await prisma.user.create({
    data: { email: 'admin@company.com', passwordHash: adminPassword, role: UserRole.ADMIN },
  });
  const adminEmp = await prisma.employee.create({
    data: {
      userId: adminUser.id,
      employeeCode: 'NV0001',
      fullName: 'Trần Quản Trị',
      phone: '0901234567',
      gender: Gender.MALE,
      hireDate: new Date('2023-01-01'),
      departmentId: deptIT.id,
      positionId: posAdmin.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  // Trưởng phòng IT (MANAGER)
  const managerITUser = await prisma.user.create({
    data: { email: 'manager.it@company.com', passwordHash: managerPassword, role: UserRole.MANAGER },
  });
  const managerITEmp = await prisma.employee.create({
    data: {
      userId: managerITUser.id,
      employeeCode: 'NV0002',
      fullName: 'Nguyễn Văn Minh (Trưởng phòng IT)',
      phone: '0902345678',
      gender: Gender.MALE,
      hireDate: new Date('2023-02-15'),
      departmentId: deptIT.id,
      positionId: posITManager.id,
      status: EmployeeStatus.ACTIVE,
    },
  });
  await prisma.department.update({ where: { id: deptIT.id }, data: { managerId: managerITEmp.id } });

  // Trưởng phòng HR (MANAGER)
  const managerHRUser = await prisma.user.create({
    data: { email: 'manager.hr@company.com', passwordHash: managerPassword, role: UserRole.MANAGER },
  });
  const managerHREmp = await prisma.employee.create({
    data: {
      userId: managerHRUser.id,
      employeeCode: 'NV0003',
      fullName: 'Trần Thị Thu Mai (Trưởng phòng Nhân sự)',
      phone: '0903456789',
      gender: Gender.FEMALE,
      hireDate: new Date('2023-03-01'),
      departmentId: deptHR.id,
      positionId: posHRManager.id,
      status: EmployeeStatus.ACTIVE,
    },
  });
  await prisma.department.update({ where: { id: deptHR.id }, data: { managerId: managerHREmp.id } });

  // Danh sách Nhân viên tiêu chuẩn thuần Việt
  const employeeData = [
    { email: 'emp001@company.com', name: 'Lê Hoàng Nam', code: 'NV0004', dept: deptIT.id, pos: posDev.id, gender: Gender.MALE, loc: locHCMC.id },
    { email: 'emp002@company.com', name: 'Phạm Thu Hương', code: 'NV0005', dept: deptIT.id, pos: posQA.id, gender: Gender.FEMALE, loc: locHCMC.id },
    { email: 'emp003@company.com', name: 'Vũ Quốc Bảo', code: 'NV0006', dept: deptHR.id, pos: posHR.id, gender: Gender.MALE, loc: locHCMC.id },
    { email: 'emp004@company.com', name: 'Đỗ Thị Lan', code: 'NV0007', dept: deptFinance.id, pos: posAccountant.id, gender: Gender.FEMALE, loc: locDaNang.id },
    { email: 'emp005@company.com', name: 'Nguyễn Thanh Sơn', code: 'NV0008', dept: deptIT.id, pos: posDev.id, gender: Gender.MALE, loc: locHCMC.id },
  ];

  const allEmployees = [adminEmp, managerITEmp, managerHREmp];

  for (const emp of employeeData) {
    const user = await prisma.user.create({
      data: { email: emp.email, passwordHash: employeePassword, role: UserRole.EMPLOYEE },
    });
    const createdEmp = await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode: emp.code,
        fullName: emp.name,
        phone: '09' + Math.floor(10000000 + Math.random() * 90000000),
        gender: emp.gender,
        hireDate: new Date('2023-06-01'),
        departmentId: emp.dept,
        positionId: emp.pos,
        status: EmployeeStatus.ACTIVE,
      },
    });
    allEmployees.push(createdEmp);
  }

  // 7. Gán Ca làm việc, Văn phòng và Quỹ phép năm cho toàn bộ nhân viên
  const effectiveFrom = new Date('2023-01-01');
  const currentYear = new Date().getFullYear();

  for (const emp of allEmployees) {
    // Phân ca
    await prisma.employeeShift.create({
      data: {
        employeeId: emp.id,
        shiftId: shiftStandard.id,
        effectiveFrom,
        isActive: true,
      },
    });

    // Phân bổ địa điểm văn phòng
    await prisma.employeeLocation.create({
      data: {
        employeeId: emp.id,
        locationId: emp.departmentId === deptFinance.id ? locDaNang.id : locHCMC.id,
        effectiveFrom,
        isActive: true,
      },
    });

    // Quỹ phép năm
    await prisma.leaveBalance.createMany({
      data: [
        { employeeId: emp.id, leaveTypeId: leaveAnnual.id, year: currentYear, totalDays: 12, usedDays: 2, pendingDays: 0 },
        { employeeId: emp.id, leaveTypeId: leaveSick.id, year: currentYear, totalDays: 5, usedDays: 1, pendingDays: 0 },
        { employeeId: emp.id, leaveTypeId: leavePersonal.id, year: currentYear, totalDays: 3, usedDays: 0, pendingDays: 0 },
      ],
    });
  }

  // 8. Tạo dữ liệu lịch sử chấm công 45 ngày làm việc vừa qua với tính biến thiên chân thực
  console.log('📊 Đang tạo 45 ngày lịch sử chấm công thực tế...');
  const baseLat = 10.776889;
  const baseLng = 106.700806;

  for (let dayOffset = 45; dayOffset >= 1; dayOffset--) {
    const workDate = subDays(new Date(), dayOffset);
    const dayOfWeek = workDate.getDay();

    // Bỏ qua Thứ Bảy (6) và Chủ Nhật (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let empIndex = 0; empIndex < allEmployees.length; empIndex++) {
      const emp = allEmployees[empIndex];
      const seed = (dayOffset * 7 + empIndex * 13) % 100;

      // Phân bổ thực tế:
      // ~78% Đúng giờ
      // ~10% Đi trễ
      // ~4% Về sớm
      // ~4% Tăng ca
      // ~2% Nghỉ phép có duyệt
      // ~2% Vắng không phép

      if (seed < 2) {
        // VẮNG KHÔNG PHÉP
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shiftStandard.id,
            locationId: locHCMC.id,
            workDate,
            status: AttendanceStatus.ABSENT,
            lateMinutes: 0,
            workingHours: 0,
            overtimeHours: 0,
            notes: 'Vắng mặt không có lý do',
          },
        });
      } else if (seed < 4) {
        // NGHỈ PHÉP CÓ DUYỆT
        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shiftStandard.id,
            locationId: locHCMC.id,
            workDate,
            status: AttendanceStatus.LEAVE,
            lateMinutes: 0,
            workingHours: 0,
            overtimeHours: 0,
            notes: 'Nghỉ phép năm đã được phê duyệt',
          },
        });
      } else if (seed < 14) {
        // ĐI TRỄ (Check-in từ 08:20 đến 08:40)
        const lateMins = 20 + ((seed * 2) % 20);
        let checkInTime = setHours(workDate, 8);
        checkInTime = setMinutes(checkInTime, lateMins);

        let checkOutTime = setHours(workDate, 17);
        checkOutTime = setMinutes(checkOutTime, 5);

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shiftStandard.id,
            locationId: locHCMC.id,
            workDate,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            checkInLatitude: baseLat + 0.0001,
            checkInLongitude: baseLng + 0.0001,
            checkInAccuracy: 12.0,
            checkOutLatitude: baseLat,
            checkOutLongitude: baseLng,
            checkOutAccuracy: 10.0,
            lateMinutes: lateMins - 15, // Trừ 15 phút ân hạn
            workingHours: 7.75,
            status: AttendanceStatus.LATE,
          },
        });
      } else if (seed < 18) {
        // VỀ SỚM (Về lúc 16:15)
        let checkInTime = setHours(workDate, 7);
        checkInTime = setMinutes(checkInTime, 55);

        let checkOutTime = setHours(workDate, 16);
        checkOutTime = setMinutes(checkOutTime, 15);

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shiftStandard.id,
            locationId: locHCMC.id,
            workDate,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            checkInLatitude: baseLat,
            checkInLongitude: baseLng,
            checkInAccuracy: 8.0,
            checkOutLatitude: baseLat,
            checkOutLongitude: baseLng,
            checkOutAccuracy: 8.0,
            earlyLeaveMinutes: 45,
            workingHours: 7.33,
            status: AttendanceStatus.EARLY_LEAVE,
          },
        });
      } else if (seed < 24) {
        // TĂNG CA (Về lúc 18:30)
        let checkInTime = setHours(workDate, 7);
        checkInTime = setMinutes(checkInTime, 50);

        let checkOutTime = setHours(workDate, 18);
        checkOutTime = setMinutes(checkOutTime, 30);

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shiftStandard.id,
            locationId: locHCMC.id,
            workDate,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            checkInLatitude: baseLat,
            checkInLongitude: baseLng,
            checkInAccuracy: 15.0,
            checkOutLatitude: baseLat,
            checkOutLongitude: baseLng,
            checkOutAccuracy: 12.0,
            overtimeHours: 1.5,
            workingHours: 9.67,
            status: AttendanceStatus.OVERTIME,
          },
        });
      } else {
        // ĐÚNG GIỜ (Check-in 07:50 - 08:05, Check-out 17:00 - 17:10)
        const checkInOffset = (seed % 15) - 10;
        let checkInTime = setHours(workDate, 8);
        checkInTime = addMinutes(checkInTime, checkInOffset);

        const checkOutOffset = seed % 15;
        let checkOutTime = setHours(workDate, 17);
        checkOutTime = addMinutes(checkOutTime, checkOutOffset);

        await prisma.attendance.create({
          data: {
            employeeId: emp.id,
            shiftId: shiftStandard.id,
            locationId: locHCMC.id,
            workDate,
            checkIn: checkInTime,
            checkOut: checkOutTime,
            checkInLatitude: baseLat,
            checkInLongitude: baseLng,
            checkInAccuracy: 10.0,
            checkOutLatitude: baseLat,
            checkOutLongitude: baseLng,
            checkOutAccuracy: 10.0,
            workingHours: 8.0,
            status: AttendanceStatus.PRESENT,
          },
        });
      }
    }
  }

  // 9. Tạo Đơn xin nghỉ phép mẫu
  await prisma.leaveRequest.create({
    data: {
      employeeId: allEmployees[3].id, // NV0004 Lê Hoàng Nam
      leaveTypeId: leaveAnnual.id,
      startDate: subDays(new Date(), 10),
      endDate: subDays(new Date(), 9),
      totalDays: 2,
      reason: 'Về quê thăm gia đình',
      status: 'APPROVED',
      reviewedBy: adminUser.id,
      reviewedAt: subDays(new Date(), 11),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: allEmployees[4].id, // NV0005 Phạm Thu Hương
      leaveTypeId: leaveSick.id,
      startDate: subDays(new Date(), 5),
      endDate: subDays(new Date(), 5),
      totalDays: 1,
      reason: 'Bị sốt cảm cúm, đi khám bệnh viện',
      status: 'APPROVED',
      reviewedBy: managerITUser.id,
      reviewedAt: subDays(new Date(), 6),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: allEmployees[5].id, // NV0006 Vũ Quốc Bảo
      leaveTypeId: leavePersonal.id,
      startDate: new Date(),
      endDate: addMinutes(new Date(), 1440 * 2),
      totalDays: 2,
      reason: 'Giải quyết công việc gia đình đột xuất',
      status: 'PENDING',
    },
  });

  // 10. Tạo Thông báo hệ thống Tiếng Việt
  for (const emp of allEmployees) {
    await prisma.notification.create({
      data: {
        userId: emp.userId,
        title: 'Chào mừng bạn đến với Hệ thống Chấm công & Phân tích Nhân sự',
        message: 'Tài khoản của bạn đã được kích hoạt thành công. Vui lòng kiểm tra ca làm việc và văn phòng chấm công được phân công.',
        type: 'SYSTEM',
        isRead: true,
      },
    });
  }

  // 11. Tạo Nhật ký kiểm toán mẫu (Audit Log)
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'CREATE',
      entity: 'Hệ thống',
      description: 'Khởi tạo hệ thống và cấu hình dữ liệu mẫu chuẩn hóa doanh nghiệp thành công',
    },
  });

  console.log('✅ Khởi tạo dữ liệu mẫu hoàn tất thành công!');
  console.log('====================================================');
  console.log('Danh sách tài khoản kiểm thử:');
  console.log('1. Quản trị viên:    admin@company.com      | Admin@123');
  console.log('2. Trưởng phòng IT:  manager.it@company.com | Manager@123');
  console.log('3. Trưởng phòng HR:  manager.hr@company.com | Manager@123');
  console.log('4. Nhân viên 1:      emp001@company.com     | Employee@123 (Văn phòng TP.HCM)');
  console.log('5. Nhân viên 4:      emp004@company.com     | Employee@123 (Chi nhánh Đà Nẵng)');
  console.log('====================================================');
}

main()
  .catch((e) => {
    console.error('Lỗi khởi tạo dữ liệu mẫu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
