# 🚀 HƯỚNG DẪN DEPLOY WEBSITE LÊN INTERNET ĐỂ GỬI THẦY CHẤM BÀI

---

## 💡 1. "Deploy App" Của Thầy Giáo Có Nghĩa Là Gì?

Khi thầy giáo yêu cầu **"Deploy app"**, thầy muốn bạn:
- Đưa mã nguồn trang web từ máy tính cá nhân (`localhost:5000` hoặc `localhost:5173`) lên một **máy chủ trực tuyến (Cloud Hosting)**.
- Khi hoàn thành, trang web sẽ có một **đường link công khai trên Internet** (ví dụ: `https://tiem-nha-nho.onrender.com`).
- Thầy và bất kỳ ai chỉ cần **bấm vào link đó trên máy tính hoặc điện thoại** là có thể sử dụng được toàn bộ các tính năng:
  - Xem danh mục sản phẩm thời trang & decor
  - Thử tính năng **Cào sản phẩm Shopee siêu tốc**
  - Trò chuyện với **Trợ lý Bán hàng AI Gemini**
  - Đặt hàng & thanh toán quét mã **VietQR**
  - Cài đặt PWA lên màn hình chính điện thoại

---

## 🎯 2. Tính Năng "Quét Mã QR" Trên Website Hoạt Động Thế Nào?

Trên thanh Header của website, bạn sẽ thấy nút **"📱 Cài App"**. Khi bấm vào:
1. **Mã QR Tự Động Tạo Theo Link Thật**: Mã QR tự động lấy theo địa chỉ website thực tế (`window.location.origin`).
2. **Quét Là Mở Ngay Trên Điện Thoại**:
   - Khi thầy giáo mở trang web trên laptop, thầy lấy điện thoại quét mã QR trên màn hình $\rightarrow$ Website sẽ tự động mở ngay trên điện thoại của thầy!
   - Thầy có thể bấm *"Thêm vào Màn hình chính"* để website hoạt động toàn màn hình độc lập như một app tải về từ Store mà không cần thông qua CH Play.
3. **Nút "Chép Link"**: Có sẵn nút copy URL để bạn gửi trực tiếp qua Zalo / Email / Classroom cho thầy.

---

## 🛠️ 3. Cách Deploy Lên Internet Miễn Phí (Khuyên Dùng Render.com)

Dự án này là **Fullstack** (Frontend React Vite + Backend Node.js Express). Nền tảng miễn phí, ổn định và phù hợp nhất là **Render.com**.

### Bước 1: Đưa Code Lên GitHub
1. Mở trình duyệt vào [https://github.com](https://github.com) và đăng nhập (nếu chưa có thì tạo tài khoản miễn phí).
2. Nhấn nút **"New repository"** $\rightarrow$ Đặt tên (ví dụ: `tiem-nha-nho-ecommerce-ai`) $\rightarrow$ Chọn **Public** $\rightarrow$ Bấm **Create repository**.
3. Tải và đẩy toàn bộ thư mục dự án này lên repository đó (hoặc dùng GitHub Desktop / Git bash).

### Bước 2: Tạo Web Service Trên Render.com
1. Vào [https://render.com](https://render.com) $\rightarrow$ Đăng nhập bằng tài khoản GitHub của bạn.
2. Nhấn nút **"New +"** ở góc trên $\rightarrow$ Chọn **"Web Service"**.
3. Chọn repository GitHub `tiem-nha-nho-ecommerce-ai` bạn vừa tạo.
4. Điền các thông tin đơn giản sau:
   - **Name**: `tiem-nha-nho` (hoặc tên bạn thích)
   - **Region**: `Singapore` (để truy cập nhanh nhất tại Việt Nam)
   - **Branch**: `main` (hoặc `master`)
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```
   - **Instance Type**: Chọn gói **Free** (0$/tháng).
5. Cuộn xuống phần **Environment Variables** (Biến môi trường) $\rightarrow$ Thêm:
   - `NODE_ENV` = `production`
   - `GEMINI_API_KEY` = *(Điền khóa Gemini của bạn nếu có, hoặc để trống hệ thống sẽ tự động dùng AI Fallback Engine)*.
6. Nhấn nút **"Deploy Web Service"**!

### Bước 3: Nhận Đường Link Gửi Thầy
- Chờ khoảng 1 - 2 phút để Render tự động tải code, cài thư viện và build trang web.
- Khi hoàn tất, Render sẽ hiển thị dòng chữ màu xanh **"Live"** và cung cấp đường link:
  `https://tiem-nha-nho.onrender.com`
- **Bạn copy đường link này và gửi cho thầy giáo là hoàn thành xuất sắc nhiệm vụ!** 🎉

---

## ⚡ 4. Cách Tạo Link Online Tức Thì Trong 30 Giây (Dùng Ngrok)

Nếu bạn cần **gửi link cho thầy xem ngay lập tức trong hôm nay** mà chưa kịp tạo tài khoản GitHub:

1. Bật hệ thống bằng cách nhấp đúp tệp [`CHAY_UNG_DUNG.bat`](file:///c:/Users/Administrator/Downloads/TIEM_NHA_NHO_ECOMMERCE_AI/CHAY_UNG_DUNG.bat).
2. Tải công cụ miễn phí **Ngrok** tại [https://ngrok.com](https://ngrok.com).
3. Mở cửa sổ dòng lệnh và gõ:
   ```bash
   ngrok http 5000
   ```
4. Ngrok sẽ sinh ra một đường link công khai dạng:
   `https://xxxx-xx-xx.ngrok-free.app`
5. Gửi link đó cho thầy giáo $\rightarrow$ Thầy bấm vào từ bất kỳ đâu đều vào được trang web đang chạy trên máy bạn!

