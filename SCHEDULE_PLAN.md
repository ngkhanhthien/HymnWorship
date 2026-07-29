# Plan Xây Dựng Tính Năng Lên Lịch 10 Ngày Bài Thánh Ca (10-Day Hymn Scheduler)

Kế hoạch triển khai từng bước tính năng tự động và thủ công chọn ngẫu nhiên 3 bài thánh ca/ngày cho 10 ngày tiếp theo, lưu trữ trên `localStorage` trình duyệt và tuân thủ tuyệt đối nguyên tắc **DRY**, mỗi lần commit **không quá 250 dòng code**.

---

## 🏛 Kiến Trúc Tổng Thể & Luồng Dữ Liệu

1. **Nguồn Dữ Liệu (`HymnDataService`):**
   - Đọc cài đặt từ `SettingsService.dataSource()`.
   - Chế độ `local`: Đọc file `public/assets/hymns/hymns.json`.
   - Chế độ `firebase`: Đọc từ Firestore Database.

2. **Core Logic Lên Lịch (`ScheduleService`):**
   - Thuật toán random chọn 3 bài hát/ngày cho 10 ngày liên tiếp.
   - Lưu kết quả vào `localStorage` với key `hymnworship_10day_plan`.
   - **Tự động (Auto):** Tự chạy khi ứng dụng khởi chạy, tự sinh lịch mới nếu lịch cũ trống hoặc đã hết hạn 10 ngày.
   - **Thủ công (Manual):** Cung cấp hàm `generateNewPlan()` khi người dùng bấm nút trên giao diện.

---

## 📋 Checklist Tiến Độ Thực Hiện (Progress Checklist)

- [ ] **Bước 1: Khởi Tạo Data Models & Đồng Bộ Asset Local** (`src/app/core/models/schedule.ts`)
  - [ ] Định nghĩa interface `DaySchedule` và `TenDayPlan`.
  - [ ] Tạo file dữ liệu mẫu `Frontend/public/assets/hymns/hymns.json`.
  - [ ] Lệnh kiểm tra: `npm run build`
  - [ ] Commit gợi ý: `feat: add schedule data model and static hymn asset configuration`

- [ ] **Bước 2: Xây Dựng Service Trừu Tượng Hóa Dữ Liệu** (`src/app/core/services/hymn-data.service.ts`)
  - [ ] Đăng ký `provideHttpClient()` trong `app.config.ts`.
  - [ ] Tạo `HymnDataService` tự động chuyển đổi nguồn dữ liệu giữa Local và Firebase.
  - [ ] Lệnh kiểm tra: `npm run build`
  - [ ] Commit gợi ý: `feat: create HymnDataService for local and remote data abstraction`

- [ ] **Bước 3: Xây Dựng Utility Random & Core Scheduler Service** (`src/app/core/services/schedule.service.ts`)
  - [ ] Viết `src/app/core/utils/random.util.ts` chọn ngẫu nhiên bài hát.
  - [ ] Xây dựng `ScheduleService` tính toán lịch 10 ngày, lưu/đọc `localStorage`.
  - [ ] Viết hàm tự động kiểm tra hết hạn và hàm tạo lại lịch thủ công.
  - [ ] Lệnh kiểm tra: `npm run build`
  - [ ] Commit gợi ý: `feat: implement ScheduleService for 10-day hymn planning and localStorage persistence`

- [ ] **Bước 4: Tích Hợp Auto-Trigger & Giao Diện Nút Bấm** (`src/app/app.ts` & UI)
  - [ ] Tự động kích hoạt kiểm tra lịch khi mở app.
  - [ ] Gắn sự kiện nút bấm "Tạo lại lịch 10 ngày" trên giao diện.
  - [ ] Lệnh kiểm tra: `npm run build`
  - [ ] Commit gợi ý: `feat: integrate auto-scheduling trigger and manual reschedule UI button`

---

## 📏 Quy Tắc Code & Commit (DRY & Standards)

1. **Giới hạn số dòng code**: Mỗi bước tạo/sửa code **không quá 250 dòng code**.
2. **Nguyên tắc DRY**: Mọi logic chọn dữ liệu và lưu storage được tập trung 1 nơi duy nhất trong Service.
3. **Tuân thủ 5 quy chuẩn Commit**:
   - `feat:` Thêm tính năng mới
   - `fix:` Sửa lỗi
   - `refactor:` Tối ưu hóa code
   - `chore:` Công việc cấu hình/tạo file
   - `docs:` Cập nhật tài liệu
