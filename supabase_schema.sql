-- ==============================================================================
-- HỆ THỐNG QUẢN LÝ CHẤM CÔNG & PHÂN TÍCH NHÂN SỰ (WORKFORCE ATTENDANCE & ANALYTICS)
-- CƠ SỞ DỮ LIỆU CHUẨN SUPABASE POSTGRESQL (CHẠY TRỰC TIẾP TRONG SUPABASE SQL EDITOR)
-- ==============================================================================

-- Kích hoạt tiện ích mở rộng UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CÁC KIỂU DỮ LIỆU LIỆT KÊ (ENUMS)
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'TERMINATED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'LEAVE', 'EARLY_LEAVE', 'OVERTIME', 'INCOMPLETE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'LATE', 'LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'SHIFT_ASSIGNED', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'ASSIGN', 'CHECKIN', 'CHECKOUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. BẢNG TÀI KHOẢN NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. BẢNG PHÒNG BAN (DEPARTMENTS)
CREATE TABLE IF NOT EXISTS "departments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(150) UNIQUE NOT NULL,
    "description" TEXT,
    "manager_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. BẢNG CHỨC VỤ (POSITIONS)
CREATE TABLE IF NOT EXISTS "positions" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. BẢNG NHÂN VIÊN (EMPLOYEES)
CREATE TABLE IF NOT EXISTS "employees" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "employee_code" VARCHAR(50) UNIQUE NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(20),
    "date_of_birth" DATE,
    "gender" "Gender",
    "avatar_url" TEXT,
    "department_id" UUID REFERENCES "departments"("id") ON DELETE SET NULL,
    "position_id" UUID REFERENCES "positions"("id") ON DELETE SET NULL,
    "hire_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cập nhật khóa ngoại manager_id của departments tham chiếu đến employees
DO $$ BEGIN
    ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_manager"
    FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. BẢNG CA LÀM VIỆC (SHIFTS)
CREATE TABLE IF NOT EXISTS "shifts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "start_time" VARCHAR(10) NOT NULL, -- Định dạng HH:mm, ví dụ 08:00
    "end_time" VARCHAR(10) NOT NULL,   -- Định dạng HH:mm, ví dụ 17:00
    "break_start" VARCHAR(10),        -- Nghỉ trưa từ, ví dụ 12:00
    "break_end" VARCHAR(10),          -- Nghỉ trưa đến, ví dụ 13:00
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 10, -- Ân hạn đi trễ (phút)
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. BẢNG PHÂN CA NHÂN VIÊN (EMPLOYEE_SHIFTS)
CREATE TABLE IF NOT EXISTS "employee_shifts" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "shift_id" UUID NOT NULL REFERENCES "shifts"("id") ON DELETE RESTRICT,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BẢNG ĐỊA ĐIỂM / VĂN PHÒNG CHẤM CÔNG GEOFENCE (LOCATIONS)
CREATE TABLE IF NOT EXISTS "locations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "latitude" NUMERIC(10, 8) NOT NULL,
    "longitude" NUMERIC(11, 8) NOT NULL,
    "allowed_radius_meters" INTEGER NOT NULL DEFAULT 100, -- Bán kính cho phép (mét)
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. BẢNG PHÂN BỔ ĐỊA ĐIỂM NHÂN VIÊN (EMPLOYEE_LOCATIONS)
CREATE TABLE IF NOT EXISTS "employee_locations" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "location_id" UUID NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
    "effective_from" DATE NOT NULL DEFAULT CURRENT_DATE,
    "effective_to" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. BẢNG CHẤM CÔNG (ATTENDANCE)
CREATE TABLE IF NOT EXISTS "attendance" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE RESTRICT,
    "shift_id" UUID NOT NULL REFERENCES "shifts"("id") ON DELETE RESTRICT,
    "location_id" UUID NOT NULL REFERENCES "locations"("id") ON DELETE RESTRICT,
    "work_date" DATE NOT NULL,
    "check_in" TIMESTAMPTZ,
    "check_out" TIMESTAMPTZ,
    "check_in_latitude" NUMERIC(10, 8),
    "check_in_longitude" NUMERIC(11, 8),
    "check_in_accuracy" NUMERIC(10, 2),
    "check_out_latitude" NUMERIC(10, 8),
    "check_out_longitude" NUMERIC(11, 8),
    "check_out_accuracy" NUMERIC(10, 2),
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "early_leave_minutes" INTEGER NOT NULL DEFAULT 0,
    "working_hours" NUMERIC(5, 2) NOT NULL DEFAULT 0,
    "overtime_hours" NUMERIC(5, 2) NOT NULL DEFAULT 0,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "unique_employee_work_date" UNIQUE ("employee_id", "work_date")
);

-- 11. BẢNG LOẠI NGHỈ PHÉP (LEAVE_TYPES)
CREATE TABLE IF NOT EXISTS "leave_types" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) UNIQUE NOT NULL,
    "default_days_per_year" INTEGER NOT NULL DEFAULT 12,
    "is_paid" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. BẢNG QUỸ PHÉP NĂM CỦA NHÂN VIÊN (LEAVE_BALANCES)
CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "leave_type_id" UUID NOT NULL REFERENCES "leave_types"("id") ON DELETE RESTRICT,
    "year" INTEGER NOT NULL,
    "total_days" INTEGER NOT NULL DEFAULT 12,
    "used_days" NUMERIC(5, 1) NOT NULL DEFAULT 0,
    "pending_days" NUMERIC(5, 1) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "unique_employee_leave_type_year" UNIQUE ("employee_id", "leave_type_id", "year")
);

-- 13. BẢNG ĐƠN XIN NGHỈ PHÉP (LEAVE_REQUESTS)
CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "employee_id" UUID NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
    "leave_type_id" UUID NOT NULL REFERENCES "leave_types"("id") ON DELETE RESTRICT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "total_days" NUMERIC(5, 1) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "rejection_reason" TEXT,
    "reviewed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. BẢNG THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. BẢNG NHẬT KÝ KIỂM TOÁN (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "action" "AuditAction" NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(100),
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. BẢNG TOKEN LÀM MỚI (REFRESH_TOKENS)
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "token" VARCHAR(500) UNIQUE NOT NULL,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. CÁC CHỈ MỤC TỐI ƯU HIỆU NĂNG (INDEXES)
CREATE INDEX IF NOT EXISTS "idx_employees_department" ON "employees"("department_id");
CREATE INDEX IF NOT EXISTS "idx_employees_status" ON "employees"("status");
CREATE INDEX IF NOT EXISTS "idx_attendance_employee_date" ON "attendance"("employee_id", "work_date");
CREATE INDEX IF NOT EXISTS "idx_attendance_date" ON "attendance"("work_date");
CREATE INDEX IF NOT EXISTS "idx_attendance_status" ON "attendance"("status");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_employee" ON "leave_requests"("employee_id");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_status" ON "leave_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_read" ON "notifications"("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "audit_logs"("created_at");

-- ==============================================================================
-- HOÀN TẤT THIẾT KẾ CƠ SỞ DỮ LIỆU SUPABASE
-- ==============================================================================
