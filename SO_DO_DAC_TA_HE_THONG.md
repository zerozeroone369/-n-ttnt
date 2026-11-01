# SƠ ĐỒ ĐẶC TẢ HỆ THỐNG (TỆP ĐỘC LẬP)
## Dự Án: Tiệm Nhà Nhỏ - E-Commerce Mini Shop AI
*Tệp tài liệu kỹ thuật riêng biệt - Không đính kèm vào mã nguồn Web*

---

## 1. Sơ Đồ Kiến Trúc Hệ Thống Tổng Thể (3-Tier Layered Architecture)

```mermaid
graph TB
    subgraph ClientLayer["1. TẦNG GIAO DIỆN NGƯỜI DÙNG (PRESENTATION LAYER)"]
        subgraph Storefront["Giao Diện Mua Sắm (Storefront)"]
            UI_Header["Header & Tìm Kiếm<br/>(Giỏ hàng, Wishlist, Đơn của tôi)"]
            UI_Banner["Hero Banner & Flash Sale<br/>(Đồng hồ đếm ngược)"]
            UI_Catalog["Danh Mục & Bộ Lọc Giá<br/>(Phân loại, Tìm kiếm, Sắp xếp)"]
            UI_Detail["Chi Tiết & Đánh Giá<br/>(Chọn màu/size, Đánh giá 5 sao)"]
            UI_Cart["Giỏ Hàng (CartDrawer)<br/>(Freeship progress, Áp voucher)"]
            UI_Checkout["Thanh Toán (Checkout)<br/>(COD, VietQR tự động, MoMo)"]
            UI_CustomerOrders["Đơn Hàng Của Tôi<br/>(Bản đồ 5 bước Stepper)"]
            UI_Wishlist["Danh Sách Yêu Thích (Wishlist)"]
        end

        subgraph AdminPanel["Bảng Quản Trị Chủ Shop (Admin Dashboard)"]
            Adm_Stats["Thống Kê Doanh Thu & Đơn"]
            Adm_Orders["Quản Lý Trạng Thái Đơn Hàng"]
            Adm_Prods["Quản Lý Sản Phẩm & Tồn Kho"]
            Adm_Coupons["Quản Lý Mã Khuyến Mãi"]
            Adm_Print["In Phiếu Đóng Gói (Packing Slip)"]
        end

        subgraph ChatWidget["Trợ Lý Bán Hàng & CSKH AI"]
            Bot_UI["Cửa Sổ Chatbot Tương Tác 24/7"]
            Bot_Config["Cài Đặt AI Engine (Local / Gemini)"]
        end
    end

    subgraph LogicLayer["2. TẦNG NGHIỆP VỤ & DỊCH VỤ (BUSINESS SERVICE LAYER)"]
        ChatEngine["AIChatEngine<br/>• Bộ lọc Guardrail phạm vi câu hỏi<br/>• Nhận diện ý định & Ngữ nghĩa tiếng Việt<br/>• Tư vấn Size, Quà tặng & Tri thức sản phẩm<br/>• Tra cứu & Xử lý đơn hàng thông minh"]
        StorageEngine["StorageService<br/>• Đồng bộ Products, Orders, Coupons<br/>• Quản lý Cart, Wishlist, Reviews, Chat<br/>• Lưu trữ bền vững LocalStorage"]
        OrderProcessor["Bộ Xử Lý Đơn Hàng & Khuyến Mãi<br/>• Tính Freeship (Ngưỡng 450.000đ)<br/>• Khấu trừ mã giảm giá (% hoặc VNĐ)<br/>• Tạo mã đơn ORD-XXXX"]
    end

    subgraph DataLayer["3. TẦNG LƯU TRỮ DỮ LIỆU (PERSISTENCE LAYER)"]
        LocalDB[("LocalStorage Engine<br/>• boutique_products_v2<br/>• boutique_orders_v2<br/>• boutique_coupons_v2<br/>• boutique_cart_v2<br/>• boutique_wishlist_v2<br/>• boutique_chat_v2<br/>• boutique_settings_v2")]
    end

    subgraph ExtLayer["4. DỊCH VỤ TÍCH HỢP BÊN NGOÀI (EXTERNAL SERVICES)"]
        GeminiAPI["Google Gemini 1.5 Flash API<br/>(LLM tạo phản hồi tự nhiên)"]
        VietQRAPI["VietQR Banking API<br/>(Sinh mã thanh toán MB Bank)"]
        UnsplashAPI["Unsplash Image CDN<br/>(Kho ảnh thủ công chất lượng cao)"]
    end

    ChatWidget --> ChatEngine
    Storefront --> OrderProcessor
    Storefront --> StorageEngine
    AdminPanel --> StorageEngine
    ChatEngine --> StorageEngine
    OrderProcessor --> StorageEngine
    StorageEngine <--> LocalDB

    ChatEngine -.->|"Cấu hình API Key"| GeminiAPI
    UI_Checkout -.->|"Tạo mã QR"| VietQRAPI
    UI_Catalog -.->|"Tải ảnh"| UnsplashAPI
```

---

## 2. Sơ Đồ Luồng Xử Lý AI & Cơ Chế Guardrail (Kiểm Soát Phạm Vi)

```mermaid
flowchart TD
    Start(["Khách hàng gửi tin nhắn"]) --> Normalize["Tiền xử lý văn bản<br/>• Viết thường & Bỏ dấu tiếng Việt (NFD)<br/>• Chuẩn hóa từ viết tắt, số đo, mã đơn"]
    
    Normalize --> Guardrail{"Kiểm tra Guardrail<br/>Câu hỏi có liên quan đến cửa hàng?"}

    %% Out-of-domain branch
    Guardrail -- "KHÔNG LIÊN QUAN<br/>(Code, Toán học, Thời tiết, Chính trị,<br/>Tin tức, Y tế, Chuyện phiếm...)" --> Refusal["🛑 TỪ CHỐI LỊCH SỰ (GUARDRAIL DEFLECTION)<br/>• Thông báo câu hỏi nằm ngoài phạm vi hỗ trợ<br/>• Nêu rõ 3 mảng chuyên trách:<br/>  1. Tư vấn sản phẩm, chọn size & quà tặng<br/>  2. Tra cứu & xử lý tiến độ đơn hàng<br/>  3. Giải đáp chính sách đổi trả, ship, voucher<br/>• Mời quay lại chủ đề của Tiệm"]

    Refusal --> SendReply(["Gửi phản hồi cho khách hàng"])

    %% In-domain branch
    Guardrail -- "HỢP LỆ (IN-DOMAIN)<br/>(Sản phẩm, Đơn hàng, Chính sách, Chào hỏi)" --> EngineSwitch{"Kiểm tra AI Engine đang dùng"}

    EngineSwitch -- "Chế độ Gemini (Có API Key)" --> CallGemini["Gửi đến Google Gemini 1.5 Flash API<br/>• Kèm System Prompt có Guardrail nghiêm ngặt<br/>• Bơm danh mục sản phẩm & đơn gần nhất<br/>• Trích xuất [RECOMMENDED_IDS]"]

    EngineSwitch -- "Mặc định: Local Smart Engine" --> IntentRouter{"Phân Loại Ý Định (Intent Router)"}

    %% Intent Handlers
    IntentRouter -- "Ý định: Đơn Hàng" --> OrderHandler["Xử lý Đơn Hàng:<br/>• Tra theo mã ORD-XXXX hoặc bóc đơn gần nhất<br/>• Báo trạng thái, ngày giao dự kiến, tiền COD, shipper<br/>• Tiếp nhận hủy đơn / đổi địa chỉ<br/>• Gửi nút mở bản đồ 5 bước tiến trình"]

    IntentRouter -- "Ý định: Tư vấn Size" --> SizingHandler["Xử lý Tư vấn Size Áo:<br/>• Bóc tách Chiều cao (cm) & Cân nặng (kg)<br/>• So khớp bảng size: S, M, L, XL<br/>• Giải thích form loose-fit vải linen thoáng mát<br/>• Đính kèm thẻ sản phẩm Áo Sơ Mi Linen"]

    IntentRouter -- "Ý định: Tư vấn Quà Tặng" --> GiftHandler["Xử lý Quà Tặng:<br/>• Lọc theo người nhận: Bạn gái, bạn trai, tân gia...<br/>• Lọc theo ngân sách (dưới 200k, 300k, 500k)<br/>• Gợi ý nến thơm, ly gốm, ví da, cà phê<br/>• Đính kèm thẻ sản phẩm có nút thêm giỏ"]

    IntentRouter -- "Ý định: Hỏi Kỹ Thuật" --> FAQHandler["Tra cứu Tri thức Sản phẩm (FAQ):<br/>• Nến thơm: 100% sáp đậu nành, bấc gỗ, 48h<br/>• Ly gốm: Nung 1300°C, an toàn lò vi sóng<br/>• Bàn phím: Kết nối MacOS/Windows qua 3 chế độ<br/>• Ví da: Da bò Crazy Horse khâu tay"]

    IntentRouter -- "Ý định: Khuyến Mãi" --> VoucherHandler["Xử lý Mã Giảm Giá:<br/>• Lấy danh sách voucher đang kích hoạt<br/>• Hiển thị thẻ voucher kèm nút [Áp dụng ngay]"]

    IntentRouter -- "Ý định: Gặp Người Thật" --> ContactHandler["Xử lý Hỗ Trợ Trực Tiếp:<br/>• Hiển thị nút Gọi Hotline tiệm<br/>• Hiển thị nút Mở Zalo shop 24/7"]

    CallGemini --> FormatOutput["Định dạng tin nhắn tương tác cao<br/>• Định dạng Markdown, in đậm, code block<br/>• Thẻ sản phẩm có nút Xem & Thêm giỏ<br/>• Thẻ voucher có nút Áp dụng vào giỏ<br/>• Nút Hotline, Zalo & Bản đồ đơn hàng"]

    OrderHandler --> FormatOutput
    SizingHandler --> FormatOutput
    GiftHandler --> FormatOutput
    FAQHandler --> FormatOutput
    VoucherHandler --> FormatOutput
    ContactHandler --> FormatOutput

    FormatOutput --> SendReply
```

---

## 3. Sơ Đồ Vòng Đời Đơn Hàng & Mua Sắm (E-Commerce Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách Hàng
    participant UI as Giao Diện Storefront
    participant Bot as Trợ Lý Chatbot AI
    participant Engine as Bộ Xử Lý Đơn Hàng
    participant Storage as LocalStorage
    actor Admin as Chủ Cửa Hàng

    Customer->>UI: Xem danh mục, chọn sản phẩm, chọn màu/size
    opt Tương tác qua Chatbot AI
        Customer->>Bot: "Tư vấn quà tặng bạn gái dưới 300k"
        Bot-->>Customer: Trả lời kèm thẻ Nến Thơm sáp đậu nành (260k)
        Customer->>Bot: Bấm "Thêm vào giỏ" trên thẻ tin nhắn
        Bot->>Storage: Cập nhật giỏ hàng (+1 Nến thơm)
    end
    Customer->>UI: Mở Giỏ Hàng Trượt (CartDrawer)
    Customer->>UI: Bấm áp dụng mã giảm giá "GIAM10"
    UI->>Customer: Khấu trừ 10%, hiển thị tiến trình Freeship
    Customer->>UI: Bấm "Tiến hành Đặt Hàng"
    Customer->>UI: Nhập thông tin người nhận, chọn phương thức VietQR hoặc COD
    UI->>Engine: Gửi thông tin thanh toán & giỏ hàng
    Engine->>Storage: Khởi tạo đơn ORD-XXXX (Trạng thái: Pending)
    Engine->>UI: Bắn pháo hoa Confetti + Hiển thị mã VietQR & Hóa đơn

    Admin->>UI: Bật chế độ "Quản Trị Shop"
    UI->>Storage: Đọc danh sách đơn hàng mới
    Storage-->>UI: Hiển thị đơn ORD-XXXX mới đặt
    Admin->>UI: Chuyển trạng thái sang "Đang đóng gói" (Processing)
    UI->>Storage: Cập nhật orderStatus = 'processing'
    Admin->>UI: Bấm "In Phiếu Giao Hàng"
    UI-->>Admin: Hiển thị phiếu in chuẩn khổ A5 dán ngoài kiện hàng

    par Khách tra cứu qua giao diện
        Customer->>UI: Bấm "Đơn của tôi" trên Header
        UI-->>Customer: Hiển thị Stepper 5 bước hành trình vận chuyển
    and Khách hỏi qua Chatbot
        Customer->>Bot: "Đơn hàng của tôi đến đâu rồi?"
        Bot->>Storage: Đọc đơn ORD-XXXX gần nhất
        Bot-->>Customer: Báo "Đang đóng gói chuẩn bị hàng", kèm nút mở bản đồ vận chuyển
    end
```

---

## 4. Sơ Đồ Phân Rã Chức Năng (Functional Decomposition)

```mermaid
mindmap
  root((Hệ Thống Tiệm Nhà Nhỏ))
    Khách Hàng (Customer)
      Khám phá sản phẩm
        Bộ lọc Danh mục & Khoảng giá
        Bộ lọc Deal Flash Sale (Đếm ngược)
        Tìm kiếm thời gian thực
        Sắp xếp theo Giá, Nổi bật, Đánh giá
      Tương tác sản phẩm
        Xem nhanh & Xem chi tiết Modal
        Chọn Màu sắc & Kích thước
        Thả tim lưu vào Danh sách yêu thích (Wishlist)
        Xem nhận xét & Gửi đánh giá 1-5 sao
      Mua sắm & Thanh toán
        Giỏ hàng trượt (CartDrawer)
        Thanh tiến trình đạt điều kiện Freeship
        Áp dụng Voucher giảm giá
        Thanh toán COD tiền mặt
        Thanh toán chuyển khoản VietQR tự động
        Thanh toán ví MoMo / ZaloPay
      Theo dõi đơn hàng
        Mục "Đơn của tôi" trên Header
        Bản đồ 5 bước tiến trình Stepper
        Tra cứu mã vận đơn bưu cục
    Trợ Lý AI Chatbot (GPT-3 Business Assistant)
      Bảo vệ phạm vi (Strict Guardrail)
        Từ chối dứt khoát câu hỏi ngoài lề (Toán, Code, Thời tiết, Chính trị...)
        Nhắc nhở chỉ phục vụ kinh doanh & sản phẩm của tiệm
      Tư vấn kinh doanh & Bán sỉ (B2B)
        Chính sách mua số lượng lớn & chiết khấu bậc thang (12% - 35%)
        Quà tặng doanh nghiệp khắc logo laser theo yêu cầu
        Hợp đồng thương mại & xuất hóa đơn VAT
        Hợp tác cung ứng sản phẩm thủ công làng nghề
      Tư vấn sản phẩm chuyên sâu
        Tư vấn chọn Size áo theo chiều cao, cân nặng (form loose-fit)
        Gợi ý quà tặng theo người nhận & ngân sách
        Giải đáp tri thức kỹ thuật sản phẩm (FAQ Bát Tràng, 100% sáp đậu nành)
        Cẩm nang sử dụng & bảo quản đồ da, thắp nến không lõm tim, giặt linen
        Thẻ sản phẩm tương tác kèm nút Thêm giỏ
      Chăm sóc khách hàng
        Tự động tra cứu đơn hàng gần nhất
        Xử lý yêu cầu Hủy đơn / Đổi địa chỉ
        Cung cấp mã giảm giá có nút Áp dụng ngay
        Cung cấp nút gọi Hotline & mở Zalo tiệm
      Tùy biến AI Engine
        AI Cục Bộ (Local Smart NLP)
        Kết nối Google Gemini 1.5 Flash API
    Chủ Cửa Hàng (Admin)
      Báo cáo tổng quan
        Tổng doanh thu & Tổng số đơn
        Cảnh báo hàng sắp hết kho (<= 15 món)
      Quản lý đơn hàng
        Lọc đơn theo tiến trình
        Cập nhật trạng thái vận chuyển
        In Phiếu Đóng Gói / Giao Hàng (A5/in nhiệt)
      Quản lý sản phẩm & Voucher
        Thêm mới, sửa giá, sửa tồn kho
        Tạo mã khuyến mãi mới (% hoặc tiền mặt)
        Bật/Tắt kích hoạt voucher
      Cài đặt hệ thống
        Cấu hình khóa Gemini API Key
        Khôi phục dữ liệu gốc (Reset Database)
```

---

## 5. Sơ Đồ Mô Hình Dữ Liệu Thực Thể (ERD)

```mermaid
erDiagram
    PRODUCT ||--o{ REVIEW : "has many"
    PRODUCT ||--o{ ORDER_ITEM : "ordered as"
    PRODUCT ||--o{ CART_ITEM : "added to"
    PRODUCT ||--o{ WISHLIST_ITEM : "saved in"
    ORDER ||--|{ ORDER_ITEM : "contains"
    COUPON ||--o{ ORDER : "applied to"

    PRODUCT {
        string id PK "sp-01, sp-02..."
        string name "Tên sản phẩm"
        string category "fashion | decor | coffee | tech"
        int price "Giá bán hiện tại (VND)"
        int originalPrice "Giá niêm yết cũ"
        float rating "Điểm sao trung bình (1.0 - 5.0)"
        int reviewsCount "Số lượng nhận xét"
        int stock "Số lượng tồn kho"
        boolean isFeatured "Nổi bật"
        boolean isNew "Hàng mới về"
        boolean isFlashSale "Đang Flash Sale"
        string_array images "Danh sách link ảnh"
        json variants "Màu sắc & Kích thước"
        string shortDesc "Mô tả ngắn"
        string desc "Mô tả chi tiết"
        json specs "Bảng thông số kỹ thuật"
        string_array tags "Từ khóa cho AI nhận diện"
    }

    REVIEW {
        string id PK "rev-1, rev-2..."
        string author "Tên người mua"
        int rating "Số sao (1 - 5)"
        string date "Ngày gửi (YYYY-MM-DD)"
        string comment "Nội dung nhận xét"
        boolean verified "Huy hiệu đã mua hàng"
    }

    ORDER {
        string id PK "ORD-XXXX"
        string createdAt "Thời gian tạo ISO"
        json customer "Họ tên, SĐT, Địa chỉ, Tỉnh thành"
        int subtotal "Tiền hàng tạm tính"
        int discount "Tiền chiết khấu"
        string couponCode "Mã voucher đã áp"
        int shippingFee "Phí ship"
        string shippingMethod "standard | express"
        int total "Tổng thanh toán"
        string paymentMethod "cod | vietqr | momo"
        string paymentStatus "pending | paid"
        string orderStatus "pending | processing | shipping | delivered | cancelled"
        string trackingCarrier "GHTK | Viettel Post"
        string trackingCode "Mã vận đơn"
    }

    ORDER_ITEM {
        string productId FK
        string name "Tên sản phẩm"
        int price "Đơn giá mua"
        int quantity "Số lượng"
        string variant "Phân loại đã chọn"
        string image "Ảnh thumbnail"
    }

    COUPON {
        string id PK "c-1, c-2..."
        string code "TIEMMOI, GIAM10, VIP50..."
        int discountPercent "% Giảm giá"
        int discountAmount "Số tiền giảm cố định"
        int minOrderValue "Đơn hàng tối thiểu"
        string description "Mô tả khuyến mãi"
        boolean isActive "Trạng thái kích hoạt"
    }

    CART_ITEM {
        string id FK "Product ID"
        string name "Tên sản phẩm"
        int price "Đơn giá"
        string variant "Phân loại màu/size"
        int quantity "Số lượng"
        string image "Link ảnh"
    }

    WISHLIST_ITEM {
        string productId FK "Product ID yêu thích"
    }
```
