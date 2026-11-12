# 🛍️ TIỆM NHÀ NHỎ - E-COMMERCE MINI SHOP AI 

> Nền tảng thương mại điện tử chuyên biệt cho mô hình kinh doanh nhỏ (tự động/thủ công), tích hợp **Trợ Lý AI Chatbot chuẩn GPT-3.0** chuyên trách tư vấn kinh doanh, bán sỉ B2B, cẩm nang bảo quản đồ thủ công và thực thi cơ chế **Strict Guardrail** (tuyệt đối từ chối các câu hỏi ngoại lai).

---

## 📁 Cấu Trúc Thư Mục Mã Nguồn

```
TIEM_NHA_NHO_ECOMMERCE_AI/
├── 📄 index.html                      # Tệp HTML khởi chạy chính
├── 📄 package.json                    # Cấu hình dự án, scripts & dependencies
├── 📄 vite.config.js                  # Cấu hình Vite build tool
├── 📄 tailwind.config.js              # Cấu hình giao diện Tailwind CSS
├── 📄 postcss.config.js               # Cấu hình PostCSS
├── 📄 so-do-dac-ta-he-thong.html      # Tệp sơ đồ đặc tả hệ thống trực quan (Mở bằng trình duyệt)
├── 📄 SO_DO_DAC_TA_HE_THONG.md        # Tệp sơ đồ đặc tả hệ thống chuẩn Mermaid
├── 📄 README.md                       # Hướng dẫn cài đặt & vận hành chi tiết
│
└── 📁 src/                            # Toàn bộ mã nguồn ứng dụng
    ├── 📄 App.jsx                     # Component gốc điều phối toàn bộ State & UI
    ├── 📄 main.jsx                    # Điểm khởi động React 18
    ├── 📄 index.css                   # Định nghĩa style toàn cục & animation
    │
    ├── 📁 components/                 # Các thành phần giao diện
    │   ├── Header.jsx                 # Thanh điều hướng, tìm kiếm, giỏ, wishlist, đơn của tôi
    │   ├── Banner.jsx                 # Hero banner & Đồng hồ đếm ngược Flash Sale
    │   ├── ProductList.jsx            # Lưới sản phẩm, lọc danh mục, lọc giá & Flash Sale
    │   ├── ProductCard.jsx            # Thẻ sản phẩm kèm nút thả tim, nhãn sale, giá
    │   ├── ProductModal.jsx           # Modal chi tiết, thư viện ảnh & đánh giá nhận xét 5 sao
    │   ├── CartDrawer.jsx             # Giỏ hàng trượt, tiến trình Freeship & áp Voucher
    │   ├── CheckoutModal.jsx          # Đặt hàng, VietQR tự động, COD & hiệu ứng Confetti
    │   ├── CustomerOrdersModal.jsx    # Lịch sử đơn của tôi & Bản đồ 5 bước tiến trình Stepper
    │   ├── WishlistDrawer.jsx         # Ngăn kéo xem & chuyển danh sách yêu thích vào giỏ
    │   ├── InvoicePrintModal.jsx      # In phiếu đóng gói & giao hàng (Packing Slip chuẩn A5)
    │   ├── Chatbot.jsx                # Trợ lý AI Chatbot GPT-3.0 (Quick chips, thẻ tương tác)
    │   └── AdminDashboard.jsx         # Bảng quản trị: Báo cáo, sửa hàng, đổi trạng thái đơn, voucher
    │
    ├── 📁 services/                   # Tầng xử lý nghiệp vụ & dữ liệu
    │   ├── storage.js                 # Quản lý bền vững LocalStorage Engine (7 collections)
    │   └── aiChatEngine.js            # Bộ máy AI GPT-3.0 (B2B, Sizing, Care Guide, Strict Guardrail)
    │
    └── 📁 data/                       # Dữ liệu mẫu khởi tạo
        └── initialData.js             # Dữ liệu ban đầu: Sản phẩm, đơn hàng, voucher, cửa hàng
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu Cầu Môi Trường
- **Node.js:** Phiên bản 18.0 trở lên.
- **Trình duyệt:** Chrome, Edge, Firefox, Cốc Cốc.

### 2. Cách Khởi Động Nhanh Nhất (Dành cho Windows)
Chỉ cần nhấp đúp (Double-click) vào tệp:
👉 **`CHAY_UNG_DUNG.bat`**
Tệp sẽ tự động khởi động song song cả Backend REST API Database Server (Port 5000) và Giao diện Web (Port 5173).

---

### 3. Khởi Chạy Bằng Dòng Lệnh Trong VS Code

#### Bước 1: Khắc phục lỗi bảo mật script PowerShell (nếu gặp lỗi `Execution Policies`)
Trong Terminal của VS Code, nếu gõ `npm` bị chặn, hãy chạy 1 trong 2 cách:
```powershell
# Cách A: Cho phép chạy script trong phiên làm việc hiện tại
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Cách B: Dùng trực tiếp lệnh npm.cmd
npm.cmd install
```

#### Bước 2: Cài đặt thư viện
```bash
npm.cmd install
```

#### Bước 3: Mở 2 Terminal riêng biệt trong VS Code

- **Terminal 1 (Backend Database & API Server):**
```bash
npm.cmd run server
# hoặc: node server/index.js
# Máy chủ lắng nghe tại: http://localhost:5000
```

- **Terminal 2 (Giao diện Web Frontend):**
```bash
npm.cmd run dev
# Giao diện Web: http://localhost:5173
```

---

## 🔐 Tài Khoản Thử Nghiệm & Phân Quyền (RBAC)

Hệ thống đã tích hợp sẵn cơ chế xác thực bảo mật chuẩn (Mã hóa mật khẩu PBKDF2 + SHA-256 + Salt, Cấp Session Token, RBAC):

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn trong hệ thống |
| :--- | :--- | :--- | :--- |
| 👑 **Chủ Shop (Admin)** | `admin@tiemnhanho.vn` | `admin123` | Toàn quyền: Xem doanh thu, quản lý sản phẩm, mã giảm giá, cấu hình AI, xem toàn bộ **Nhật Ký Xử Lý (Audit Trail)**. |
| 🛠️ **Nhân Viên (Staff)** | `staff@tiemnhanho.vn` | `staff123` | Chỉ xử lý & đóng gói đơn hàng, cập nhật vận chuyển, in phiếu giao hàng. Không xem được doanh thu hay sửa cài đặt shop. Mọi thao tác đều được hệ thống tự động ghi nhật ký. |
| 👤 **Khách Hàng (Customer)** | `khachhang@gmail.com` | `khach123` | Mua sắm, tích hợp mã giảm giá, theo dõi tiến trình đơn hàng cá nhân, viết đánh giá. |

*(Trên giao diện đăng nhập còn có sẵn 3 nút "1-Click Đăng nhập nhanh" để thử nghiệm ngay lập tức).*

---

## 🗄️ Cấu Trúc Cơ Sở Dữ Liệu & Nhật Ký Kiểm Toán (Audit Logs)

- Dữ liệu được lưu trữ bền vững tại:
  `server/data/ecommerce_db.json`
- Cơ chế ghi tệp nguyên tử (Atomic file write với `fs.writeFileSync` + `.tmp`) chống mất dữ liệu khi mất điện hoặc tắt máy đột ngột.
- Toàn bộ hoạt động đăng nhập, đổi trạng thái đơn hàng của nhân viên đều được ghi vết (Audit Logging) với:
  - Thời gian chính xác (ISO Timestamp).
  - Tên & vai trò người xử lý (`admin` / `staff`).
  - Hành động thực hiện (`ORDER_STATUS_UPDATE`, `LOGIN`,...).
  - Mã đơn hàng & chi tiết thay đổi.

---

## ✨ Tính Năng Nổi Bật Đã Tích Hợp

1. 🤖 **Trợ Lý AI Chatbot:**
   - **Tư vấn kinh doanh & Bán sỉ (B2B):** Chiết khấu 3 bậc (12% - 35%), quà tặng doanh nghiệp khắc logo laser, xuất hóa đơn VAT.
   - **Cẩm nang bảo quản & sử dụng:** Hướng dẫn đốt nến không lõm tim, bảo dưỡng ví da bò sáp, giặt ủi áo sơ mi linen.
   - **Tư vấn size & Quà tặng:** Bóc tách chiều cao, cân nặng để chọn size S/M/L/XL chuẩn form dáng.
   - **Tra cứu đơn hàng tự động:** Báo tiến độ vận chuyển, shipper, tiền thu hộ COD.
   - **Cơ chế Strict Guardrail:** Tuyệt đối từ chối các câu hỏi ngoại lai (lập trình, giải toán, thời tiết, chính trị thế giới).

2. 🛒 **Trải Nghiệm Mua Sắm Hoàn Hảo:**
   - Đồng hồ đếm ngược **Flash Sale** thời gian thực.
   - Giỏ hàng trượt với thanh theo dõi **Miễn phí vận chuyển (Freeship từ 450k)**.
   - Thanh toán quét mã **VietQR tự động** ngân hàng MB Bank hoặc trả tiền mặt COD.
   - Danh sách yêu thích (**Wishlist**) 1-click chuyển toàn bộ vào giỏ hàng.
   - Đánh giá sản phẩm thực tế kèm chấm điểm sao từ khách mua.
   - Theo dõi tiến trình vận chuyển **5 bước Stepper** trực quan tại "Đơn của tôi".

3. 💼 **Bảng Quản Trị & Phân Quyền Nhân Viên:**
   - **Chủ Shop:** Quản lý doanh thu, danh mục, voucher, xem nhật ký xử lý của nhân viên.
   - **Nhân viên kho:** Giao diện tối ưu cho xử lý đơn hàng, đổi trạng thái và in phiếu đóng hàng A5.
   - **Nhật Ký Xử Lý (Audit Logs):** Bảng kiểm toán hoạt động minh bạch, tra cứu ai đã xử lý đơn nào vào lúc nào.
