import { PrismaClient, UserRole, EmployeeStatus, EmploymentType, Gender, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { subDays, format, addMinutes, setHours, setMinutes } from 'date-fns';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 10;

async function hash(pwd: string) {
  return bcrypt.hash(pwd, BCRYPT_ROUNDS);
}

async function main() {
  console.log('🌱 Starting deterministic database seeding...');

  // Clear existing data in reverse order of foreign keys
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

  console.log('🧹 Cleaned existing records.');

  // 1. Create Departments
  const deptIT = await prisma.department.create({
    data: { name: 'Information Technology', description: 'Software engineering, DevOps, and IT support' },
  });
  const deptHR = await prisma.department.create({
    data: { name: 'Human Resources', description: 'Talent acquisition, employee relations, and culture' },
  });
  const deptFinance = await prisma.department.create({
    data: { name: 'Finance & Accounting', description: 'Budgeting, payroll, and fiscal management' },
  });
  const deptMarketing = await prisma.department.create({
    data: { name: 'Marketing & Sales', description: 'Brand marketing, customer acquisition, and growth' },
  });

  // 2. Create Positions
  const posAdmin = await prisma.position.create({ data: { name: 'System Administrator', description: 'IT systems & security' } });
  const posITManager = await prisma.position.create({ data: { name: 'IT Department Manager', description: 'Technical leadership' } });
  const posHRManager = await prisma.position.create({ data: { name: 'HR Department Manager', description: 'HR leadership' } });
  const posDev = await prisma.position.create({ data: { name: 'Full Stack Engineer', description: 'Software development' } });
  const posQA = await prisma.position.create({ data: { name: 'QA Engineer', description: 'Testing and quality' } });
  const posHR = await prisma.position.create({ data: { name: 'HR Specialist', description: 'Operations and recruitment' } });
  const posAccountant = await prisma.position.create({ data: { name: 'Senior Accountant', description: 'Financial ledger' } });

  // 3. Create Shifts
  const shiftStandard = await prisma.shift.create({
    data: {
      name: 'Standard Morning Shift',
      startTime: '08:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      gracePeriodMinutes: 10,
    },
  });
  const shiftAfternoon = await prisma.shift.create({
    data: {
      name: 'Afternoon Shift',
      startTime: '13:00',
      endTime: '21:00',
      breakStart: '17:00',
      breakEnd: '18:00',
      gracePeriodMinutes: 10,
    },
  });
  const shiftFlexible = await prisma.shift.create({
    data: {
      name: 'Flexible Day Shift',
      startTime: '09:00',
      endTime: '18:00',
      breakStart: '12:30',
      breakEnd: '13:30',
      gracePeriodMinutes: 15,
    },
  });

  // 4. Create Locations (Workplaces)
  const locHCMC = await prisma.location.create({
    data: {
      name: 'Ho Chi Minh City HQ',
      address: '72 Le Thanh Ton, District 1, Ho Chi Minh City',
      latitude: 10.776889,
      longitude: 106.700806,
      allowedRadiusMeters: 150,
    },
  });
  const locDaNang = await prisma.location.create({
    data: {
      name: 'Da Nang Tech Hub',
      address: '15 Quang Trung, Hai Chau, Da Nang',
      latitude: 16.054407,
      longitude: 108.202167,
      allowedRadiusMeters: 100,
    },
  });
  const locHanoi = await prisma.location.create({
    data: {
      name: 'Hanoi Branch',
      address: '54 Lieu Giai, Ba Dinh, Hanoi',
      latitude: 21.028511,
      longitude: 105.854444,
      allowedRadiusMeters: 120,
    },
  });

  // 5. Create Leave Types
  const leaveAnnual = await prisma.leaveType.create({
    data: { name: 'Annual Leave', defaultDaysPerYear: 12, isPaid: true },
  });
  const leaveSick = await prisma.leaveType.create({
    data: { name: 'Sick Leave', defaultDaysPerYear: 5, isPaid: true },
  });
  const leavePersonal = await prisma.leaveType.create({
    data: { name: 'Personal Leave', defaultDaysPerYear: 3, isPaid: true },
  });
  const leaveUnpaid = await prisma.leaveType.create({
    data: { name: 'Unpaid Leave', defaultDaysPerYear: 0, isPaid: false },
  });

  // 6. Create Users & Employees
  const adminPassword = await hash('Admin@123');
  const managerPassword = await hash('Manager@123');
  const employeePassword = await hash('Employee@123');

  // Admin
  const adminUser = await prisma.user.create({
    data: { email: 'admin@company.com', passwordHash: adminPassword, role: UserRole.ADMIN },
  });
  const adminEmp = await prisma.employee.create({
    data: {
      userId: adminUser.id,
      employeeCode: 'EMP0001',
      fullName: 'System Administrator',
      phone: '0901234567',
      gender: Gender.MALE,
      hireDate: new Date('2023-01-01'),
      departmentId: deptIT.id,
      positionId: posAdmin.id,
      status: EmployeeStatus.ACTIVE,
    },
  });

  // Manager IT
  const managerITUser = await prisma.user.create({
    data: { email: 'manager.it@company.com', passwordHash: managerPassword, role: UserRole.MANAGER },
  });
  const managerITEmp = await prisma.employee.create({
    data: {
      userId: managerITUser.id,
      employeeCode: 'EMP0002',
      fullName: 'Tran Van Minh (IT Manager)',
      phone: '0902345678',
      gender: Gender.MALE,
      hireDate: new Date('2023-02-15'),
      departmentId: deptIT.id,
      positionId: posITManager.id,
      status: EmployeeStatus.ACTIVE,
    },
  });
  await prisma.department.update({ where: { id: deptIT.id }, data: { managerId: managerITEmp.id } });

  // Manager HR
  const managerHRUser = await prisma.user.create({
    data: { email: 'manager.hr@company.com', passwordHash: managerPassword, role: UserRole.MANAGER },
  });
  const managerHREmp = await prisma.employee.create({
    data: {
      userId: managerHRUser.id,
      employeeCode: 'EMP0003',
      fullName: 'Nguyen Thi Mai (HR Manager)',
      phone: '0903456789',
      gender: Gender.FEMALE,
      hireDate: new Date('2023-03-01'),
      departmentId: deptHR.id,
      positionId: posHRManager.id,
      status: EmployeeStatus.ACTIVE,
    },
  });
  await prisma.department.update({ where: { id: deptHR.id }, data: { managerId: managerHREmp.id } });

  // Standard Employees
  const employeeData = [
    { email: 'emp001@company.com', name: 'Le Hoang Nam', code: 'EMP0004', dept: deptIT.id, pos: posDev.id, gender: Gender.MALE, loc: locHCMC.id },
    { email: 'emp002@company.com', name: 'Pham Thu Huong', code: 'EMP0005', dept: deptIT.id, pos: posQA.id, gender: Gender.FEMALE, loc: locHCMC.id },
    { email: 'emp003@company.com', name: 'Vu Quoc Bao', code: 'EMP0006', dept: deptHR.id, pos: posHR.id, gender: Gender.MALE, loc: locHCMC.id },
    { email: 'emp004@company.com', name: 'Do Thi Lan', code: 'EMP0007', dept: deptFinance.id, pos: posAccountant.id, gender: Gender.FEMALE, loc: locDaNang.id },
    { email: 'emp005@company.com', name: 'Nguyen Thanh Son', code: 'EMP0008', dept: deptIT.id, pos: posDev.id, gender: Gender.MALE, loc: locHCMC.id },
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
        phone: '090' + Math.floor(1000000 + Math.random() * 9000000),
        gender: emp.gender,
        hireDate: new Date('2023-06-01'),
        departmentId: emp.dept,
        positionId: emp.pos,
        status: EmployeeStatus.ACTIVE,
      },
    });
    allEmployees.push(createdEmp);
  }

  // 7. Assign Shifts and Locations to all employees
  const effectiveFrom = new Date('2023-01-01');
  for (const emp of allEmployees) {
    await prisma.employeeShift.create({
      data: {
        employeeId: emp.id,
        shiftId: shiftStandard.id,
        effectiveFrom,
        isActive: true,
      },
    });
    await prisma.employeeLocation.create({
      data: {
        employeeId: emp.id,
        locationId: emp.departmentId === deptFinance.id ? locDaNang.id : locHCMC.id,
        effectiveFrom,
        isActive: true,
      },
    });

    // Leave Balances for 2024
    await prisma.leaveBalance.createMany({
      data: [
        { employeeId: emp.id, leaveTypeId: leaveAnnual.id, year: 2024, totalDays: 12, usedDays: 2, pendingDays: 0 },
        { employeeId: emp.id, leaveTypeId: leaveSick.id, year: 2024, totalDays: 5, usedDays: 1, pendingDays: 0 },
        { employeeId: emp.id, leaveTypeId: leavePersonal.id, year: 2024, totalDays: 3, usedDays: 0, pendingDays: 0 },
      ],
    });
  }

  // 8. Generate Realistic Deterministic Attendance Data for Past 45 Days
  console.log('📊 Generating 45-day historical attendance records...');
  const baseLat = 10.776889;
  const baseLng = 106.700806;

  for (let dayOffset = 45; dayOffset >= 1; dayOffset--) {
    const workDate = subDays(new Date(), dayOffset);
    const dayOfWeek = workDate.getDay();

    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    for (let empIndex = 0; empIndex < allEmployees.length; empIndex++) {
      const emp = allEmployees[empIndex];
      const deterministicSeed = (dayOffset * 7 + empIndex * 13) % 100;

      // Deterministic patterns:
      // ~78% On time
      // ~10% Late
      // ~4% Early Leave
      // ~4% Overtime
      // ~2% Leave
      // ~2% Absent

      if (deterministicSeed < 2) {
        // ABSENT
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
            notes: 'Unexcused absence',
          },
        });
      } else if (deterministicSeed < 4) {
        // LEAVE
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
            notes: 'Approved annual leave',
          },
        });
      } else if (deterministicSeed < 14) {
        // LATE (check-in between 08:15 and 08:35)
        const lateMins = 15 + ((deterministicSeed * 3) % 20);
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
            checkInAccuracy: 12.5,
            checkOutLatitude: baseLat,
            checkOutLongitude: baseLng,
            checkOutAccuracy: 10.0,
            lateMinutes: lateMins - 10, // minus grace period
            workingHours: 7.75,
            status: AttendanceStatus.LATE,
          },
        });
      } else if (deterministicSeed < 18) {
        // EARLY LEAVE (leaves at 16:15)
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
      } else if (deterministicSeed < 24) {
        // OVERTIME (leaves at 18:30)
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
        // ON TIME (07:50 - 08:05 check-in, 17:00 - 17:10 check-out)
        const checkInOffset = (deterministicSeed % 15) - 10; // -10m to +5m
        let checkInTime = setHours(workDate, 8);
        checkInTime = addMinutes(checkInTime, checkInOffset);

        const checkOutOffset = deterministicSeed % 15;
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

  // 9. Leave Requests
  await prisma.leaveRequest.create({
    data: {
      employeeId: allEmployees[3].id, // emp001
      leaveTypeId: leaveAnnual.id,
      startDate: subDays(new Date(), 10),
      endDate: subDays(new Date(), 9),
      totalDays: 2,
      reason: 'Family trip vacation',
      status: 'APPROVED',
      reviewedBy: adminUser.id,
      reviewedAt: subDays(new Date(), 11),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: allEmployees[4].id, // emp002
      leaveTypeId: leaveSick.id,
      startDate: subDays(new Date(), 5),
      endDate: subDays(new Date(), 5),
      totalDays: 1,
      reason: 'Doctor appointment with fever',
      status: 'APPROVED',
      reviewedBy: managerITUser.id,
      reviewedAt: subDays(new Date(), 6),
    },
  });

  await prisma.leaveRequest.create({
    data: {
      employeeId: allEmployees[5].id, // emp003
      leaveTypeId: leavePersonal.id,
      startDate: new Date(),
      endDate: addMinutes(new Date(), 1440 * 2),
      totalDays: 2,
      reason: 'Personal urgent matters',
      status: 'PENDING',
    },
  });

  // 10. Notifications
  for (const emp of allEmployees) {
    await prisma.notification.create({
      data: {
        userId: emp.userId,
        title: 'Welcome to Workforce Attendance & Analytics',
        message: 'Your account is ready. Review your assigned shift and workplace location.',
        type: 'SYSTEM',
        isRead: true,
      },
    });
  }

  // 11. Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      action: 'CREATE',
      entity: 'System',
      description: 'System initialization and deterministic database seeding completed',
    },
  });

  console.log('✅ Deterministic seed completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Default Credentials:');
  console.log('Admin:       admin@company.com      | Admin@123');
  console.log('Manager IT:  manager.it@company.com | Manager@123');
  console.log('Manager HR:  manager.hr@company.com | Manager@123');
  console.log('Employee:    emp001@company.com     | Employee@123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
