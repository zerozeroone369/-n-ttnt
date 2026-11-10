# Tiệm Nhà Nhỏ — Shopee Bridge (Chrome Extension)

Extension giúp Web Admin (**n-ttnt.vercel.app** hoặc `http://localhost:5173`) cào dữ liệu sản phẩm thật từ Shopee trực tiếp trên trình duyệt Chrome cá nhân của chủ shop (dùng chính **IP mạng nhà** và **phiên đăng nhập Shopee thật**, không qua IP Datacenter nên tránh bị Akamai `90309999` / `REQS002`).

## Hướng dẫn cài đặt (30 giây)

1. Mở trình duyệt **Google Chrome** (hoặc Edge), truy cập `chrome://extensions/`.
2. Bật công tắc **Developer mode** (*Chế độ dành cho nhà phát triển*) ở góc trên bên phải.
3. Nhấn nút **Load unpacked** (*Tải tiện ích đã giải nén*) và chọn thư mục `chrome-extension` (hoặc thư mục vừa giải nén từ `tiem-nha-nho-shopee-bridge.zip`).
4. Mở `https://shopee.vn/` và đăng nhập tài khoản Shopee bình thường.
5. Quay lại Web Admin -> tab **🛒 Cào Shopee**, bấm nút **⚡ Cào qua Chrome Extension**.

## Bảo mật
- Extension không yêu cầu quyền `"cookies"`, không đọc và không gửi chuỗi cookie raw của bạn lên bất kỳ server nào.
- Chỉ hoạt động trên `https://n-ttnt.vercel.app`, `http://localhost`, `http://127.0.0.1` và `https://shopee.vn`.
