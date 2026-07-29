# Plan Upload Dữ Liệu HymnWorship Lên Firebase (Firestore + Storage)

Kế hoạch từng bước tải dữ liệu bài hát, ảnh khuôn nhạc và file âm thanh lên **Firebase**, đảm bảo kiến trúc tối ưu cho trang web Angular thu thập dữ liệu dễ dàng, tuân thủ nguyên tắc **DRY**, mỗi module **không quá 250 dòng code** và có checklist tự động cập nhật.

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
  - [x] Khai báo `STORAGE_BUCKET_NAME` trong `settings.py`.
  - [x] Khởi tạo singleton Firebase Admin, Firestore Client và Storage Bucket.
  - [x] Lệnh kiểm tra: `python Backend/app/firebase/client.py`

- [ ] **Bước 2: Xây Dựng Module Upload Media Lên Cloud Storage** (`Backend/app/firebase/upload_media.py`)
  - [ ] Đẩy ảnh khuôn nhạc (PNG) và file MP3 lên Storage.
  - [ ] Tự động lấy public HTTPS download URL.
  - [ ] Bỏ qua file đã tồn tại trên Storage để tiết kiệm băng thông.
  - [ ] Lệnh kiểm tra: `python Backend/app/firebase/upload_media.py --test`

- [ ] **Bước 3: Xây Dựng Engine Upload Metadata Lên Firestore** (`Backend/app/firebase/upload_firestore.py`)
  - [ ] Đọc các file JSON trong `app/output/`.
  - [ ] Liên kết URL từ Cloud Storage vào tài liệu bài hát.
  - [ ] Ghi dữ liệu dạng Batch (`db.batch()`) tối ưu hiệu năng.
  - [ ] Lệnh kiểm tra: `python Backend/app/firebase/upload_firestore.py --limit 1`

- [ ] **Bước 4: Xây Dựng Script Chạy Pipeline Tổng Thể** (`Backend/app/firebase/main_upload.py`)
  - [ ] Tổng hợp toàn bộ quy trình upload với tham số `--dry-run`, `--limit`.
  - [ ] Ghi log chi tiết vào `app/logs/app.log`.
  - [ ] Lệnh kiểm tra: `python Backend/app/firebase/main_upload.py --limit 3`

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
