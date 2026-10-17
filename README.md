# HỆ THỐNG QUẢN LÝ CHẤM CÔNG & PHÂN TÍCH NHÂN SỰ
> **Đồ án Phần Mềm Đại Học (Capstone Project)**  
> *Hệ thống điểm danh Geofencing GPS chính xác cao, tự động hóa quy trình chấm công và phân tích dữ liệu vận hành doanh nghiệp.*

---

## 📌 1. Giới Thiệu Tổng Quan & Ý Tưởng Cốt Lõi
Hệ thống được thiết kế hướng tới các doanh nghiệp hiện đại với các ưu điểm vượt trội:
- **KHÔNG sử dụng mã QR**: Loại bỏ hoàn toàn lỗ hổng chia sẻ ảnh chụp QR để chấm công hộ.
- **Xác thực Geofencing GPS 1 chạm**: Nhân viên chỉ cần nhấn `VÀO CA (GPS)`. Trình duyệt lấy tọa độ thực tế và gửi về máy chủ.
- **Ràng buộc nghiệp vụ kiểm soát nghiêm ngặt trên Backend (Server-Authoritative)**:
  - Máy chủ sử dụng **Công thức khoảng cách Haversine** để tính khoảng cách đại vòng cung so với tọa độ văn phòng được phân công.
  - Tự động từ chối nếu nhân viên đứng ngoài bán kính cho phép (ví dụ: cách văn phòng 235m trong khi quy định tối đa là 100m).
  - Tự động trừ thời gian nghỉ trưa theo ca (ví dụ: 12:00 - 13:00) để tính thời gian làm việc thực tế trung thực.
  - Tự động tính số phút đi trễ có xét thời gian ân hạn (Grace Period: 15 phút), giờ về sớm và giờ làm thêm (Overtime).
- **Quy trình Quản lý Nghỉ phép khép kín**:
  - Tự động kiểm tra số ngày phép còn lại trong quỹ phép năm trước khi cho phép nộp đơn.
  - Chặn đơn xin nghỉ trùng khoảng ngày đã xin.
  - Khi Trưởng phòng phê duyệt đơn, hệ thống tự động trừ quỹ phép và **tự động sinh bản ghi điểm danh trạng thái Nghỉ phép** cho các ngày làm việc tương ứng để nhân viên không bị tính vắng mặt.
- **Đường ống Phân tích Dữ liệu Vận hành (Data Analytics Pipeline)**:
  - Tổng hợp tự động các chỉ số KPI: Tỷ lệ chuyên cần %, Tỷ lệ đi trễ %, Thời gian làm việc TB, Tổng giờ tăng ca.
  - Biểu đồ trực quan Recharts (Đường xu hướng theo ngày, Cột so sánh phòng ban, Tròn phân bổ trạng thái).
  - Tự động sinh nhận định thông minh (Insights) thuần Việt dựa trên quy luật thực tế.
  - Xuất báo cáo đa định dạng: **Excel (.xlsx)** và **CSV chuẩn UTF-8 có BOM** (mở trực tiếp trong Excel không bao giờ bị lỗi font tiếng Việt).

---

## 🛠️ 2. Công Nghệ Sử Dụng (Tech Stack)

### Giao diện Người dùng (Frontend)
- **Framework**: React 18 + Vite + TypeScript (100% Tiếng Việt)
- **Styling**: Tailwind CSS + Thiết kế semantic badges trực quan
- **State Management**: Zustand
- **Routing**: React Router v6 với Role-Based Access Control (RBAC)
- **Biểu đồ thống kê**: Recharts (LineChart, BarChart, PieChart)
- **Icons**: Lucide React
- **Thời gian**: date-fns (hỗ trợ Tiếng Việt)
- **HTTP Client**: Axios (tự động đính kèm JWT Bearer và điều hướng khi hết hạn phiên)

### Máy chủ Dịch vụ (Backend)
- **Nền tảng**: Node.js 22 LTS + Express.js + TypeScript
- **Cơ sở dữ liệu & ORM**: Supabase (PostgreSQL) + Prisma ORM
- **Mã hóa & Bảo mật**: bcrypt (cost factor 12) + JWT (Access Token & Refresh Token lưu DB)
- **Xác thực dữ liệu đầu vào**: Zod
- **Xử lý Báo cáo**: xlsx (SpreadsheetML) + RFC 4180 CSV UTF-8 BOM
- **Kiểm thử Unit Test**: Vitest (kiểm thử công thức Haversine và logic tính toán thời gian)

---

## 🗄️ 3. Thiết Kế Cơ Sở Dữ Liệu & Hướng Dẫn Supabase

Hệ thống được thiết kế hoàn toàn tương thích với **Supabase Managed PostgreSQL**:

```mermaid
erDiagram
    users ||--o| employees : "sở hữu hồ sơ"
    users ||--o{ notifications : "nhận"
    users ||--o{ audit_logs : "ghi nhận thao tác"
    employees }o--|| departments : "thuộc về"
    employees }o--|| positions : "đảm nhiệm"
    employees ||--o{ employee_shifts : "phân công ca"
    employee_shifts }o--|| shifts : "tham chiếu ca"
    employees ||--o{ employee_locations : "phân bổ văn phòng"
    employee_locations }o--|| locations : "tham chiếu tọa độ"
    employees ||--o{ attendance : "chấm công"
    attendance }o--|| shifts : "theo ca"
    attendance }o--|| locations : "tại văn phòng"
    employees ||--o{ leave_requests : "nộp đơn nghỉ"
    leave_requests }o--|| leave_types : "loại nghỉ"
    employees ||--o{ leave_balances : "quỹ phép năm"
    leave_balances }o--|| leave_types : "cho loại phép"
```

### 🚀 Hướng dẫn kết nối Supabase (2 Cách đơn giản):

#### Cách 1: Chạy trực tiếp file SQL trên Supabase (Khuyên dùng - Nhanh nhất)
1. Đăng nhập vào trang quản trị Supabase Dashboard (`https://supabase.com/dashboard`).
2. Vào dự án của bạn $\rightarrow$ Chọn mục **SQL Editor** ở thanh menu bên trái.
3. Mở file [`supabase_schema.sql`](file:///d:/HK1-NAM4/EMPLOYEE%20ATTENDANCE%20MANAGEMENT%20&%20DATA%20ANALYTICS%20SYSTEM/supabase_schema.sql) trong thư mục gốc dự án, sao chép toàn bộ nội dung và dán vào SQL Editor của Supabase.
4. Nhấn nút **Run** (Chạy). Toàn bộ bảng, kiểu dữ liệu Enum, khóa chính, khóa ngoại và chỉ mục tối ưu sẽ được khởi tạo hoàn tất chỉ trong 3 giây.

#### Cách 2: Kết nối qua Prisma ORM
1. Lấy chuỗi kết nối từ Supabase: Vào **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection String**.
   - Chọn chế độ **URI** (hoặc **Session / Transaction Pooler**).
2. Cập nhật vào file `.env` ở thư mục `backend/.env` và file `.env` ở thư mục gốc:
```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```
3. Chạy lệnh đồng bộ Prisma:
```bash
cd backend
npx prisma db push
```

---

## 📍 4. Thuật Toán Geofencing & Công Thức Haversine

Hệ thống **không tin tưởng dữ liệu vị trí do client tự tính**. Thiết bị chỉ gửi `{ latitude, longitude, accuracy }`.

Backend tính toán khoảng cách đại vòng cung trên bề mặt hình cầu Trái Đất theo công thức:

$$\Delta\text{lat} = \text{lat}_2 - \text{lat}_1, \quad \Delta\text{lon} = \text{lon}_2 - \text{lon}_1$$
$$a = \sin^2\left(\frac{\Delta\text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta\text{lon}}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R \cdot c \quad (R = 6,371,000 \text{ mét})$$

- Nếu $d \le \text{bán\_kính\_cho\_phép}$: **Chấp nhận chấm công**.
- Nếu $d > \text{bán\_kính\_cho\_phép}$: **Từ chối chấm công** và phản hồi chi tiết: *"Vị trí của bạn hiện cách văn phòng d mét (Bán kính cho phép tối đa là R mét)"*.

---

## 🔐 5. Danh Sách Tài Khoản Kiểm Thử (Demo Accounts)

Trên màn hình đăng nhập đã tích hợp sẵn **các nút 1-Click điền nhanh**:

| Vai trò | Email đăng nhập | Mật khẩu | Phạm vi quyền hạn |
|---|---|---|---|
| **Quản trị viên (Admin)** | `admin@company.com` | `Admin@123` | Toàn quyền quản trị hệ thống, ca làm, địa điểm, xem audit logs |
| **Trưởng phòng IT** | `manager.it@company.com` | `Manager@123` | Quản lý nhân sự và xét duyệt đơn phòng Công nghệ Thông tin |
| **Trưởng phòng Nhân sự** | `manager.hr@company.com` | `Manager@123` | Quản lý nhân sự và xét duyệt đơn phòng Nhân sự & Đào tạo |
| **Nhân viên 1 (Lê H. Nam)** | `emp001@company.com` | `Employee@123` | Chấm công GPS VP TP.HCM (72 Lê Thánh Tôn, Q.1) |
| **Nhân viên 4 (Đỗ T. Lan)** | `emp004@company.com` | `Employee@123` | Chấm công GPS CN Đà Nẵng (15 Quang Trung, Hải Châu) |

---

## 💻 6. Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án

### Khởi chạy Backend:
```bash
cd backend
npm install
npx prisma generate
npm run seed
npm run dev
```
*Backend lắng nghe tại: `http://localhost:5000` (API: `http://localhost:5000/api`).*

### Khởi chạy Frontend:
```bash
cd frontend
npm install
npm run dev
```
*Frontend chạy tại: `http://localhost:5173`.*

---

## 🎓 7. Kịch Bản Trình Diễn Báo Cáo Đồ Án (Demo Walkthrough)

1. **Bước 1: Đăng nhập Quản trị viên (`admin@company.com`)**:
   - Trình bày Bảng điều khiển tổng quan doanh nghiệp: số lượng nhân sự có mặt, đi trễ, vắng mặt, giờ làm trung bình.
   - Giới thiệu mục **Địa điểm GPS**: xem tọa độ văn phòng TP.HCM (bán kính 150m), Hà Nội, Đà Nẵng.
   - Giới thiệu mục **Ca làm việc**: xem Ca Hành Chính Chuẩn (08:00 - 17:00, ân hạn 15 phút, trừ nghỉ trưa 1h).
2. **Bước 2: Đăng nhập Nhân viên (`emp001@company.com`)**:
   - Thể hiện nút bấm lớn **VÀO CA (GPS)**.
   - Bấm nút: Trình duyệt xin quyền vị trí, backend đối chiếu bán kính văn phòng và xác nhận chấm công.
   - Xem đồng hồ làm việc thời gian thực bắt đầu đếm trực tiếp (`00 giờ 01 phút 15 giây`).
   - Vào mục **Đơn nghỉ phép**: Thể hiện quỹ ngày phép còn lại (10 ngày phép năm). Nộp 1 đơn xin nghỉ 2 ngày.
3. **Bước 3: Đăng nhập Trưởng phòng IT (`manager.it@company.com`)**:
   - Vào **Đơn nghỉ phép**: Thấy đơn của Nhân viên 1 đang ở trạng thái `Chờ phê duyệt`.
   - Nhấn nút **Phê duyệt**: Đơn chuyển sang `Đã duyệt`. Hệ thống tự động trừ ngày phép và sinh lịch chấm công ngày phép.
4. **Bước 4: Trình bày Phân tích & Xuất Báo cáo**:
   - Vào **Phân tích số liệu**: Xem biểu đồ Recharts đường xu hướng, biểu đồ cột phòng ban, biểu đồ tròn phân bổ và mục **Nhận định vận hành tự động**.
   - Vào **Báo cáo & Xuất file**: Chọn loại báo cáo, nhấn **Xuất file Excel (.xlsx)** và **Xuất file CSV**. Mở file kiểm tra tiêu đề tiếng Việt chuẩn có dấu, không lỗi font.
   - Vào **Nhật ký kiểm toán**: Thể hiện bảng theo dõi toàn bộ các hành động vừa thực hiện trong buổi demo.