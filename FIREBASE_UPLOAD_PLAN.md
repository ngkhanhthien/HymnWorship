# Plan Upload Dữ Liệu HymnWorship Lên Firebase (Firestore + Storage)

Kế hoạch từng bước tải dữ liệu bài hát, ảnh khuôn nhạc và file âm thanh lên **Firebase**, đảm bảo kiến trúc tối ưu cho trang web Angular thu thập dữ liệu dễ dàng, tuân thủ nguyên tắc **DRY**, mỗi module **không quá 250 dòng code** và có checklist tự động cập nhật.

---

## 🏛 Cấu Hình Vận Hành & Chế Độ Chạy (Execution Modes & Limits)

### 1. Giới Hạn Test Dữ Liệu (`HYMN_DETAIL_CRAWL_LIMIT`)
- Sử dụng trực tiếp cấu hình `HYMN_DETAIL_CRAWL_LIMIT` trong `app/config/settings.py` (ví dụ `3` hoặc `"all"`).
- Khi `HYMN_DETAIL_CRAWL_LIMIT = 3`, hệ thống chỉ tải 3 bài nhạc thử nghiệm mỗi collection lên Firebase để kiểm tra.
- Khi `HYMN_DETAIL_CRAWL_LIMIT = "all"`, hệ thống tải toàn bộ dữ liệu.

### 2. Các Chế Độ Chạy Trong `main.py` (`EXECUTION_MODE`)
Trong `settings.py` bổ sung biến `EXECUTION_MODE` với 3 tùy chọn:
1. `EXECUTION_MODE = "crawl_and_upload"`: **[Mặc định]** Tự động cào dữ liệu mới, lưu vào `app/output/`, sau đó upload trực tiếp lên Firebase (Storage + Firestore).
2. `EXECUTION_MODE = "crawl_only"`: Chỉ cào dữ liệu và lưu vào `app/output/`, không tải lên Firebase.
3. `EXECUTION_MODE = "upload_only"`: Không cào lại dữ liệu, đọc trực tiếp dữ liệu có sẵn trong `app/output/` để upload lên Firebase.

---

## 🏛 Kiến Trúc Dữ Liệu Firebase (Firebase Data Architecture)

### 1. Cloud Storage (Lưu trữ Media Binary)
- **Hình ảnh khuôn nhạc**: `sheet_music/{collection_code}/{hymn_id}.png`
- **File âm thanh hòa âm**: `audio/accompaniment/{collection_code}/{hymn_id}.mp3`

### 2. Firestore Database (Lưu trữ Metadata Bài Hát)
- **Collection Name**: `hymns`
- **Document ID Format**: `{collection_code}_{hymn_id}` (ví dụ: `hymns_1`, `hymns_home_church_1001`)
- **Document Schema**:
  ```json
  {
    "id": "1",
    "hymn_number": 1,
    "collection": "hymns",
    "collection_name": "Hymns",
    "title": "The Morning Breaks",
    "search_title": "the morning breaks",
    "url": "https://www.churchofjesuschrist.org/media/music/songs/...",
    "scriptures": [
      {
        "reference": "Isaiah 60:1-3",
        "url": "https://www.churchofjesuschrist.org/study/scriptures/ot/isa/60?id=p1-p3&lang=eng#p1"
      }
    ],
    "sheet_music_paths": ["sheet_music/hymns/1.png"],
    "sheet_music_urls": ["https://firebasestorage.googleapis.com/v0/b/..."],
    "audio_accompaniment_path": "audio/accompaniment/hymns/1.mp3",
    "audio_accompaniment_url": "https://firebasestorage.googleapis.com/v0/b/...",
    "created_at": "2026-07-28T21:15:00Z",
    "updated_at": "2026-07-28T21:15:00Z"
  }
  ```

---

## 📋 Checklist Tiến Độ Kế Hoạch (Auto-Updated Progress Checklist)

- [x] **Bước 1: Khởi tạo Firebase Client & Storage Bucket Core** (`Backend/app/firebase/client.py`)
  - [x] Khai báo `STORAGE_BUCKET_NAME`, `EXECUTION_MODE` trong `settings.py`.
  - [x] Khởi tạo singleton Firebase Admin, Firestore Client và Storage Bucket.
  - [x] Lệnh kiểm tra: `python Backend/app/firebase/client.py`

- [ ] **Bước 2: Xây Dựng Module Upload Media Lên Cloud Storage** (`Backend/app/firebase/upload_media.py`)
  - [ ] Đẩy ảnh khuôn nhạc (PNG) và file MP3 lên Storage dựa vào `HYMN_DETAIL_CRAWL_LIMIT`.
  - [ ] Tự động lấy public HTTPS download URL.
  - [ ] Bỏ qua file đã tồn tại trên Storage để tiết kiệm băng thông.
  - [ ] Lệnh kiểm tra: `python Backend/app/firebase/upload_media.py`

- [ ] **Bước 3: Xây Dựng Engine Upload Metadata Lên Firestore** (`Backend/app/firebase/upload_firestore.py`)
  - [ ] Đọc dữ liệu từ `app/output/`, giới hạn số bài theo `HYMN_DETAIL_CRAWL_LIMIT`.
  - [ ] Tích hợp URL từ Cloud Storage vào tài liệu bài hát.
  - [ ] Ghi dữ liệu dạng Batch (`db.batch()`) tối ưu hiệu năng.
  - [ ] Lệnh kiểm tra: `python Backend/app/firebase/upload_firestore.py`

- [ ] **Bước 4: Tích Hợp Đa Chế Độ Vào Entry Point `main.py`** (`Backend/app/main.py` & `Backend/app/firebase/main_upload.py`)
  - [ ] Cập nhật `app/main.py` đọc `EXECUTION_MODE` từ `settings.py` (`crawl_and_upload`, `crawl_only`, `upload_only`).
  - [ ] Điều phối linh hoạt cào dữ liệu và upload theo cấu hình.
  - [ ] Ghi log toàn bộ tiến trình vào `app/logs/app.log`.
  - [ ] Lệnh kiểm tra: `python app/main.py` (với các mode khác nhau)

- [ ] **Bước 5: Script Tự Động Cập Nhật Checklist Plan** (`Backend/app/firebase/update_plan.py`)
  - [ ] Tự động chuyển `[ ]` thành `[x]` trong file `FIREBASE_UPLOAD_PLAN.md` sau khi chạy thành công từng bước.
  - [ ] Lệnh kiểm tra: `python Backend/app/firebase/update_plan.py`

---

## 📏 Quy Tắc Code & Commit (DRY & Standards)

1. **Giới hạn số dòng code**: Mỗi module script tạo mới **không được vượt quá 250 dòng code**.
2. **Nguyên tắc DRY**: Tái sử dụng `client.py` và `app.utils.logger` xuyên suốt, không viết trùng lặp cấu hình Firebase.
3. **Quy chuẩn Commit**:
   - `feat:` Thêm tính năng mới
   - `fix:` Sửa lỗi
   - `refactor:` Tối ưu hóa code
   - `chore:` Công việc cấu hình/tạo file
   - `docs:` Cập nhật tài liệu
