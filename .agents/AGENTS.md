# Workspace Engineering Rules & Principles

Tất cả code mới được thêm vào hoặc refactor trong workspace này **bắt buộc phải tuân thủ nghiêm ngặt** các nguyên tắc kiến trúc và tiêu chuẩn kỹ thuật dưới đây:

---

## 1. 🔄 DRY (Don't Repeat Yourself)
- **Tái sử dụng tối đa**: Không viết lặp lại các đoạn logic, hằng số, cấu hình hoặc hàm tiện ích đã tồn tại.
- **Tập trung hóa (Centralization)**:
  - **Backend**: Mọi cấu hình tập trung tại `app.config.settings`, logging dùng `app.utils.logger.get_logger()`, client Firebase dùng singleton hoặc module tập trung.
  - **Frontend**: Tái sử dụng services, models/interfaces TypeScript, và component shared; không lặp lại code HTTP requests hay state logic.
- **Loại bỏ Magic Values**: Gom tất cả URL, tên collection, timeouts, path directories vào file cấu hình / hằng số.

---

## 2. 🏛 SOLID Principles
- **S - Single Responsibility Principle (Đơn trách nhiệm)**:
  - Mỗi class, module hoặc function chỉ giải quyết **một nhiệm vụ duy nhất**.
  - Tách bạch rõ ràng giữa: Thu thập dữ liệu (Crawler), Xử lý dữ liệu (Parser/Transformer), Lưu trữ (Local/Firestore/Storage Syncer), và Giao diện (UI).
  - Giữ mỗi module ngắn gọn, dễ đọc (khuyến nghị **dưới 250 dòng code/file**).
- **O - Open/Closed Principle (Mở rộng - Đóng sửa đổi)**:
  - Thiết kế cấu trúc sao cho khi thêm tính năng mới (ví dụ: thêm Collection bài hát mới, thêm đích đến sync mới) chỉ cần thêm cấu hình/handler mới mà không phải sửa logic cốt lõi.
- **L - Liskov Substitution Principle (Thay thế Liskov)**:
  - Các class/service kế thừa hoặc triển khai interface phải có hành vi tương thích hoàn toàn, không phá vỡ logic của tầng gọi.
- **I - Interface Segregation Principle (Phân tách Interface)**:
  - Chia nhỏ các interface/type TypeScript hoặc abstract classes, không ép component/class phải phụ thuộc vào các thuộc tính/phương thức mà nó không dùng.
- **D - Dependency Inversion Principle (Đảo ngược phụ thuộc)**:
  - Phụ thuộc vào abstraction (interfaces / base configs) thay vì phụ thuộc cứng vào implementation cụ thể.
  - Hỗ trợ truyền tham số / config linh hoạt (dependency injection hoặc parameter passing).

---

## 3. 🎯 YAGNI (You Aren't Gonna Need It)
- **Chỉ làm những gì thực sự cần**: Không tự ý thêm tính năng, abstractions phức tạp hoặc các trường dữ liệu dự phòng "để dành cho tương lai" khi chưa có yêu cầu cụ thể.
- **Tránh tối ưu hóa sớm (No Premature Optimization)**: Giữ giải pháp vừa đủ, đúng trọng tâm yêu cầu hiện tại trước khi tính đến việc tối ưu phức tạp hóa.

---

## 4. 💡 KISS (Keep It Simple, Stupid)
- **Ưu tiên sự đơn giản và rõ ràng**:
  - Viết code tường minh, dễ hiểu, dễ debug hơn là code "ngắn một cách bí hiểm" hoặc lồng ghép điều kiện quá sâu.
  - Đặt tên biến, hàm, file rõ nghĩa theo đúng ngữ cảnh tiếng Anh chuẩn (`snake_case` cho Python, `camelCase`/`kebab-case` cho TypeScript/Angular).
- **Quy trình xử lý lỗi minh bạch**: Bắt đúng exception, ghi log chi tiết (kèm context) và trả về kết quả/fallback an toàn.

---

## 5. 🔒 Bảo Mật & Tiêu Chuẩn Môi Trường
- **Tuyệt đối không commit Secret/Private Keys**: Mọi file key JSON, file chứa private key, credentials, logs và output media phải luôn nằm trong `.gitignore`.
- **Hỗ trợ Cross-Platform (Windows/Linux)**:
  - Sử dụng `os.path.join` hoặc `pathlib.Path` cho đường dẫn file.
  - Đảm bảo xử lý mã hóa UTF-8 cho toàn bộ console output và file I/O trên Windows.

---

## 6. 📝 Quy Định Phản Hồi & Tiêu Chuẩn Commit (Git Commit & Response Rules)

### A. Yêu Cầu Khi Phản Hồi (AI Response Requirement)
- **Giải thích ngắn gọn**: Luôn cung cấp tóm tắt ngắn gọn, súc tích về phần code vừa thêm hoặc sửa đổi (tập trung vào mục đích và sự thay đổi chính).
- **Gợi ý Commit Message**: Luôn đính kèm một mẫu commit message chuẩn gồm:
  - **1 dòng tiêu đề chính** (Subject line tuân thủ 5 loại type bên dưới).
  - **Các gạch đầu dòng chi tiết** (Bullet points) giải thích các thay đổi phụ nếu cần.

### B. Giới Hạn Kích Thước Code (Code Change Limit)
- **Quy mô thay đổi**: Mỗi lần commit/thay đổi code nên nằm trong khoảng **dưới 100 - 250 dòng code**.

### C. 5 Loại Commit Type Bắt Buộc (5 Conventional Commit Types)
Mọi commit message phải bắt đầu bằng 1 trong 5 tiền tố sau:

1. `feat:` – Có thêm chức năng/tính năng mới (*There is some sort of new functionality*).
2. `fix:` – Đã có lỗi xảy ra và commit này khắc phục lỗi đó (*There was a problem and that problem was fixed with this commit*).
3. `refactor:` – Code giữ nguyên chức năng nhưng được viết lại gọn gàng, sạch sẽ hơn (*The code functions the same but was rewritten to be cleaner*).
4. `chore:` – Các tác vụ phụ, cấu hình môi trường, cài đặt thư viện hoặc công việc khác (*Another task, everything else*).
5. `docs:` – Cập nhật tài liệu, comment giải thích code hoặc các file tài liệu hướng dẫn (*Documentation for the code, like comments or other documentation file*).

#### Ví dụ Mẫu Commit Message:
```text
feat: add firebase connection test script in sync_firebase

- Add sync_firebase.py to test Firestore and Cloud Storage connections
- Auto-detect service account credentials from Backend/app/config/key/
- Support UTF-8 console output and structured logging
```
