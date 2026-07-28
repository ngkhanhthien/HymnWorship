import os
import sys
import firebase_admin
from firebase_admin import credentials
import google.auth.transport.requests

# Cấu hình mã hóa UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Đường dẫn tới file service account key trong thư mục app/config/key
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
APP_DIR = os.path.dirname(BASE_DIR)
KEY_DIR = os.path.join(APP_DIR, "config", "key")
json_files = [f for f in os.listdir(KEY_DIR) if f.endswith(".json")] if os.path.exists(KEY_DIR) else []
if json_files:
    KEY_PATH = os.path.join(KEY_DIR, json_files[0])
else:
    KEY_PATH = os.path.join(KEY_DIR, "qt-hymns-firebase-adminsdk-fbsvc-87009ca3d4.json")

def test_firebase_connection():
    try:
        # Khởi tạo Firebase Admin SDK với Service Account Certificate
        cred = credentials.Certificate(KEY_PATH)
        app = firebase_admin.initialize_app(cred)
        
        # Kiểm tra tính hợp lệ của key bằng cách yêu cầu Token từ Google OAuth2 server
        google_cred = cred.get_credential()
        request = google.auth.transport.requests.Request()
        google_cred.refresh(request)
        
        if google_cred.token:
            print("Test kết nối thành công: 200")
            print(f"Project ID: {app.project_id}")
            return True
        else:
            print("Lỗi kết nối Firebase: Không lấy được token")
            return False
    except Exception as e:
        print(f"Lỗi kết nối Firebase: {e}")
        return False

if __name__ == "__main__":
    test_firebase_connection()
