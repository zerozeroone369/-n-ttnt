export const STORE_INFO = {
  name: "Tiệm Nhà Nhỏ - Boutique & Living",
  tagline: "Mua sắm thông minh — Hàng chính hãng, giá tốt, giao nhanh toàn quốc",
  address: "Số 48 Ngõ 12 Đặng Thai Mai, Tây Hồ, Hà Nội",
  phone: "0982 123 456",
  zalo: "0982123456",
  email: "cskh@tiemnhanho.vn",
  operatingHours: "08:30 - 21:30 hàng ngày",
  freeshipThreshold: 450000,
  standardShippingFee: 30000,
  expressShippingFee: 45000,
  returnPolicyDays: 7,
  returnPolicyDetails: "Hỗ trợ 1 đổi 1 trong vòng 7 ngày nếu có lỗi từ nhà sản xuất hoặc sản phẩm không đúng mô tả.",
  bankAccount: { bankName: "MB Bank", accountNumber: "0982123456", accountName: "NGUYEN THI ANH - TIEM NHA NHO" }
};

export const CATEGORIES = [
  { id: "all",     name: "Tất cả sản phẩm",       icon: "Sparkles" },
  { id: "fashion", name: "Thời trang & Phụ kiện",   icon: "Shirt" },
  { id: "tech",    name: "Điện tử & Công nghệ",     icon: "Smartphone" },
  { id: "decor",   name: "Thể thao & Du lịch",      icon: "Home" },
  { id: "coffee",  name: "Đặc sản & Thực phẩm",     icon: "Coffee" },
];

export const INITIAL_PRODUCTS = [
  {
    "id": "sp-001",
    "name": "Áo sát nách Sleeveless tanktop thể thao Active Essentials thấm hút tốt vải thoáng mát Coolmate",
    "category": "fashion",
    "price": 81340,
    "originalPrice": 119618,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 184,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-001.jpg",
      "/products/sp-001_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo sát nách Sleeveless tanktop thể thao Active Essentials thấm hút tốt vải thoáng mát Coolmate",
    "desc": "Áo sát nách Sleeveless tanktop thể thao Active Essentials thấm hút tốt vải thoáng mát Coolmate. Sản phẩm chính hãng chất lượng cao. Đã bán 50,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-002",
    "name": "TẤT LƯỜI NAM - NỮ HÀNG XỊN (Có đệm gót sillicon)",
    "category": "fashion",
    "price": 14000,
    "originalPrice": 19000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 292,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-002.jpg",
      "/products/sp-002_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "TẤT LƯỜI NAM - NỮ HÀNG XỊN (Có đệm gót sillicon)",
    "desc": "TẤT LƯỜI NAM - NỮ HÀNG XỊN (Có đệm gót sillicon). Sản phẩm chính hãng chất lượng cao. Đã bán 80,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-003",
    "name": "Quần đùi nam SEVEN chất kate (có túi)",
    "category": "fashion",
    "price": 53636,
    "originalPrice": 99326,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 134,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-003.jpg",
      "/products/sp-003_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần đùi nam SEVEN chất kate (có túi)",
    "desc": "Quần đùi nam SEVEN chất kate (có túi). Sản phẩm chính hãng chất lượng cao. Đã bán 50,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-004",
    "name": "Quần đùi nam thun cotton phom ngắn thoải mái SEVEN BOXER (BIG SIZE)",
    "category": "fashion",
    "price": 39009,
    "originalPrice": 60014,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 147,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-004.jpg",
      "/products/sp-004_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần đùi nam thun cotton phom ngắn thoải mái SEVEN BOXER (BIG SIZE)",
    "desc": "Quần đùi nam thun cotton phom ngắn thoải mái SEVEN BOXER (BIG SIZE). Sản phẩm chính hãng chất lượng cao. Đã bán 200,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-005",
    "name": "Quần Đùi Nam Nữ Thun Cotton AmericanStyle Đập Tan Nóng Bức Mặc Nhà, Mặc Làm Quần Ngủ Có Bigsize",
    "category": "fashion",
    "price": 47000,
    "originalPrice": 61842,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 156,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-005.jpg",
      "/products/sp-005_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần Đùi Nam Nữ Thun Cotton AmericanStyle Đập Tan Nóng Bức Mặc Nhà, Mặc Làm Quần Ngủ Có Bigsize",
    "desc": "Quần Đùi Nam Nữ Thun Cotton AmericanStyle Đập Tan Nóng Bức Mặc Nhà, Mặc Làm Quần Ngủ Có Bigsize. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-006",
    "name": "Quần Sịp Đùi Boxer Nam (22-100kg) cao cấp mẫu cún thun lạnh, Sịp Nam Menswear co dãn 4 chiều lịch lãm T13",
    "category": "fashion",
    "price": 27999,
    "originalPrice": 39999,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 151,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-006.jpg",
      "/products/sp-006_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần Sịp Đùi Boxer Nam (22-100kg) cao cấp mẫu cún thun lạnh, Sịp Nam Menswear co dãn 4 chiều lịch lã",
    "desc": "Quần Sịp Đùi Boxer Nam (22-100kg) cao cấp mẫu cún thun lạnh, Sịp Nam Menswear co dãn 4 chiều lịch lãm T13. Sản phẩm chính hãng chất lượng cao. Đã bán 80,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-007",
    "name": "Áo Polo Nam SMART CLASSIC POLO TORANO thoáng khí thoải mái vải cotton trơn Nam Tính, Sang Trọng, Thanh Lịch ESTP038",
    "category": "fashion",
    "price": 234000,
    "originalPrice": 403448,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 65,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-007.jpg",
      "/products/sp-007_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo Polo Nam SMART CLASSIC POLO TORANO thoáng khí thoải mái vải cotton trơn Nam Tính, Sang Trọng, Tha",
    "desc": "Áo Polo Nam SMART CLASSIC POLO TORANO thoáng khí thoải mái vải cotton trơn Nam Tính, Sang Trọng, Thanh Lịch ESTP038. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-008",
    "name": "Quần dài nam Daily Pants sợi Sorona, nhuộm Cleandye siêu nhẹ chống nhăn chống tia UV - Coolmate",
    "category": "fashion",
    "price": 229000,
    "originalPrice": 297403,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 46,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-008.jpg",
      "/products/sp-008_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần dài nam Daily Pants sợi Sorona, nhuộm Cleandye siêu nhẹ chống nhăn chống tia UV - Coolmate",
    "desc": "Quần dài nam Daily Pants sợi Sorona, nhuộm Cleandye siêu nhẹ chống nhăn chống tia UV - Coolmate. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-009",
    "name": "Áo Polo thể thao nam ProMax-S1, Áo thể thao đa năng Gym Chạy bộ Pickleball Tennis thoáng khí Coolmate",
    "category": "fashion",
    "price": 165100,
    "originalPrice": 239275,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 86,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-009.jpg",
      "/products/sp-009_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo Polo thể thao nam ProMax-S1, Áo thể thao đa năng Gym Chạy bộ Pickleball Tennis thoáng khí Coolmat",
    "desc": "Áo Polo thể thao nam ProMax-S1, Áo thể thao đa năng Gym Chạy bộ Pickleball Tennis thoáng khí Coolmate. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-010",
    "name": "Áo polo nam TORANO COLLAR POLO Chất vải Waffle hiệu ứng tinh tế, thoáng khí, thoải mái, thanh lịch, sang trọng FSTP003",
    "category": "fashion",
    "price": 280000,
    "originalPrice": 482759,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 140,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-010.jpg",
      "/products/sp-010_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo polo nam TORANO COLLAR POLO Chất vải Waffle hiệu ứng tinh tế, thoáng khí, thoải mái, thanh lịch, ",
    "desc": "Áo polo nam TORANO COLLAR POLO Chất vải Waffle hiệu ứng tinh tế, thoáng khí, thoải mái, thanh lịch, sang trọng FSTP003. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-011",
    "name": "[HOT] Tất chân nam cổ ngắn basic đa dụng HUBTAT, vớ nam cổ dài vải chất liệu cotton khử mùi - VNX-SOCKS",
    "category": "fashion",
    "price": 15000,
    "originalPrice": 20000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 268,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-011.jpg",
      "/products/sp-011_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[HOT] Tất chân nam cổ ngắn basic đa dụng HUBTAT, vớ nam cổ dài vải chất liệu cotton khử mùi - VNX-SO",
    "desc": "[HOT] Tất chân nam cổ ngắn basic đa dụng HUBTAT, vớ nam cổ dài vải chất liệu cotton khử mùi - VNX-SOCKS. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-012",
    "name": "Quần lót nam ICON Demin cao cấp chất thun lạnh đẹp quần sịp nam đùi mềm mại co dãn",
    "category": "fashion",
    "price": 29000,
    "originalPrice": 38158,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 201,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-012.jpg",
      "/products/sp-012_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần lót nam ICON Demin cao cấp chất thun lạnh đẹp quần sịp nam đùi mềm mại co dãn",
    "desc": "Quần lót nam ICON Demin cao cấp chất thun lạnh đẹp quần sịp nam đùi mềm mại co dãn. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-013",
    "name": "Quần short nam COOL AIR SHORTS TORANO thể thao vải gió, thoải mái, chuẩn phom, siêu nhẹ DSBW600",
    "category": "fashion",
    "price": 174000,
    "originalPrice": 248571,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 91,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-013.jpg",
      "/products/sp-013_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần short nam COOL AIR SHORTS TORANO thể thao vải gió, thoải mái, chuẩn phom, siêu nhẹ DSBW600",
    "desc": "Quần short nam COOL AIR SHORTS TORANO thể thao vải gió, thoải mái, chuẩn phom, siêu nhẹ DSBW600. Sản phẩm chính hãng chất lượng cao. Đã bán 60,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-014",
    "name": "Áo 3 lỗ nam Cotton trắng trơn mặc lót trong sơ mi trung niên LEDATEX đông xuân cao cấp LOTNAM",
    "category": "fashion",
    "price": 38000,
    "originalPrice": 45238,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 174,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-014.jpg",
      "/products/sp-014_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo 3 lỗ nam Cotton trắng trơn mặc lót trong sơ mi trung niên LEDATEX đông xuân cao cấp LOTNAM",
    "desc": "Áo 3 lỗ nam Cotton trắng trơn mặc lót trong sơ mi trung niên LEDATEX đông xuân cao cấp LOTNAM. Sản phẩm chính hãng chất lượng cao. Đã bán 70,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-015",
    "name": "Tất nam thể thao dày dặn gân ma sát MATELIFE hàng cao cấp MTLSPORT68 êm ái khử mùi hôi cực tốt",
    "category": "fashion",
    "price": 19000,
    "originalPrice": 35185,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 247,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-015.jpg",
      "/products/sp-015_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất nam thể thao dày dặn gân ma sát MATELIFE hàng cao cấp MTLSPORT68 êm ái khử mùi hôi cực tốt",
    "desc": "Tất nam thể thao dày dặn gân ma sát MATELIFE hàng cao cấp MTLSPORT68 êm ái khử mùi hôi cực tốt. Sản phẩm chính hãng chất lượng cao. Đã bán 70,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-016",
    "name": "Quần lót nam🔥Giá Cực Sốc🔥Full size 35kg-99kg cao cấp mềm mại co giãn 4 chiều, quần sịp nam đùi chéo",
    "category": "fashion",
    "price": 10000,
    "originalPrice": 15000,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 138,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-016.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần lót nam🔥Giá Cực Sốc🔥Full size 35kg-99kg cao cấp mềm mại co giãn 4 chiều, quần sịp nam đùi ché",
    "desc": "Quần lót nam🔥Giá Cực Sốc🔥Full size 35kg-99kg cao cấp mềm mại co giãn 4 chiều, quần sịp nam đùi chéo. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-017",
    "name": "Tất chạy bộ Feetures cổ ngắn. Vớ thể thao cổ phễu cho nam nữ chơi Pick Tennis hàng dệt kim 83% cotton 3 size M L XL",
    "category": "fashion",
    "price": 26500,
    "originalPrice": 40152,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 79,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-017.jpg",
      "/products/sp-017_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất chạy bộ Feetures cổ ngắn. Vớ thể thao cổ phễu cho nam nữ chơi Pick Tennis hàng dệt kim 83% cotto",
    "desc": "Tất chạy bộ Feetures cổ ngắn. Vớ thể thao cổ phễu cho nam nữ chơi Pick Tennis hàng dệt kim 83% cotton 3 size M L XL. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-018",
    "name": "Tất cầu lông Yonex cổ trung, Vớ yonex thể thao phiên bản kỷ niệm 75th, 3 sợi dày dặn chất liệu cotton chống trơn trượt",
    "category": "fashion",
    "price": 21500,
    "originalPrice": 37719,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 285,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-018.jpg",
      "/products/sp-018_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất cầu lông Yonex cổ trung, Vớ yonex thể thao phiên bản kỷ niệm 75th, 3 sợi dày dặn chất liệu cotto",
    "desc": "Tất cầu lông Yonex cổ trung, Vớ yonex thể thao phiên bản kỷ niệm 75th, 3 sợi dày dặn chất liệu cotton chống trơn trượt. Sản phẩm chính hãng chất lượng cao. Đã bán 60,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-019",
    "name": "Tất đá bóng chống trơn Combo 2-3 vớ đá banh dệt kim chính hãng Winner 247sport_hn, tất chống trơn cao su non chống trượt",
    "category": "fashion",
    "price": 104700,
    "originalPrice": 145417,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 54,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-019.jpg",
      "/products/sp-019_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất đá bóng chống trơn Combo 2-3 vớ đá banh dệt kim chính hãng Winner 247sport_hn, tất chống trơn ca",
    "desc": "Tất đá bóng chống trơn Combo 2-3 vớ đá banh dệt kim chính hãng Winner 247sport_hn, tất chống trơn cao su non chống trượt. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-020",
    "name": "Bộ Quần Áo Nam WINFIT MotionLine Cổ Tròn Cộc Tay Phối Kẻ Viền Tay, Đồ Thể Thao Nam Form Dáng Basic WBN002",
    "category": "fashion",
    "price": 219000,
    "originalPrice": 398182,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 25,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-020.jpg",
      "/products/sp-020_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Bộ Quần Áo Nam WINFIT MotionLine Cổ Tròn Cộc Tay Phối Kẻ Viền Tay, Đồ Thể Thao Nam Form Dáng Basic W",
    "desc": "Bộ Quần Áo Nam WINFIT MotionLine Cổ Tròn Cộc Tay Phối Kẻ Viền Tay, Đồ Thể Thao Nam Form Dáng Basic WBN002. Sản phẩm chính hãng chất lượng cao. Đã bán 60,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-021",
    "name": "Thắt lưng Nylon thoáng khí cho nam - Khóa khóa khóa có thể điều chỉnh thông thường / ngoài trời / xe máy",
    "category": "fashion",
    "price": 55000,
    "originalPrice": 80882,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 101,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-021.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Thắt lưng Nylon thoáng khí cho nam - Khóa khóa khóa có thể điều chỉnh thông thường / ngoài trời / xe",
    "desc": "Thắt lưng Nylon thoáng khí cho nam - Khóa khóa khóa có thể điều chỉnh thông thường / ngoài trời / xe máy. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-022",
    "name": "Quần short nam KAKI GIÓ cạp chun pha cúc trẻ trung",
    "category": "fashion",
    "price": 84085,
    "originalPrice": 129362,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 140,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-022.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần short nam KAKI GIÓ cạp chun pha cúc trẻ trung",
    "desc": "Quần short nam KAKI GIÓ cạp chun pha cúc trẻ trung. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-023",
    "name": "Tất vớ lười nam GOMTAT chất liệu cotton mềm mại, thoáng mát, đệm ngăn tuột gót - TAT-LUOI-02",
    "category": "fashion",
    "price": 13900,
    "originalPrice": 23167,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 282,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-023.jpg",
      "/products/sp-023_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất vớ lười nam GOMTAT chất liệu cotton mềm mại, thoáng mát, đệm ngăn tuột gót - TAT-LUOI-02",
    "desc": "Tất vớ lười nam GOMTAT chất liệu cotton mềm mại, thoáng mát, đệm ngăn tuột gót - TAT-LUOI-02. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-024",
    "name": "Áo Chống Nắng Nam Thông Hơi Túi Khoá",
    "category": "fashion",
    "price": 89000,
    "originalPrice": 100000,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 166,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-024.jpg",
      "/products/sp-024_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo Chống Nắng Nam Thông Hơi Túi Khoá",
    "desc": "Áo Chống Nắng Nam Thông Hơi Túi Khoá. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-025",
    "name": "Bộ Quần Áo Nam WINFIT cổ tròn tay ngắn ComfortLite, thoáng khí, thấm hút mồ hôi, Form thoải mái năng động WBN001",
    "category": "fashion",
    "price": 219000,
    "originalPrice": 398182,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 167,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-025.jpg",
      "/products/sp-025_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Bộ Quần Áo Nam WINFIT cổ tròn tay ngắn ComfortLite, thoáng khí, thấm hút mồ hôi, Form thoải mái năng",
    "desc": "Bộ Quần Áo Nam WINFIT cổ tròn tay ngắn ComfortLite, thoáng khí, thấm hút mồ hôi, Form thoải mái năng động WBN001. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-026",
    "name": "Tất, Vớ nam ARISTINO Bizsock cổ trung mềm thoáng khí kháng khuẩn khử mùi tốt - BZS004",
    "category": "fashion",
    "price": 21600,
    "originalPrice": 30000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 248,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-026.jpg",
      "/products/sp-026_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất, Vớ nam ARISTINO Bizsock cổ trung mềm thoáng khí kháng khuẩn khử mùi tốt - BZS004",
    "desc": "Tất, Vớ nam ARISTINO Bizsock cổ trung mềm thoáng khí kháng khuẩn khử mùi tốt - BZS004. Sản phẩm chính hãng chất lượng cao. Đã bán 70,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-027",
    "name": "Quần Short Đũi Nam Dây Dút siêu mát - Quần đũi ngố nam đi phố đi biển",
    "category": "fashion",
    "price": 97020,
    "originalPrice": 149262,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 190,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-027.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần Short Đũi Nam Dây Dút siêu mát - Quần đũi ngố nam đi phố đi biển",
    "desc": "Quần Short Đũi Nam Dây Dút siêu mát - Quần đũi ngố nam đi phố đi biển. Sản phẩm chính hãng chất lượng cao. Đã bán 70,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-028",
    "name": "Quần đùi nam,quần ngủ thun co giãn mềm mịn cao cấp",
    "category": "fashion",
    "price": 39995,
    "originalPrice": 78422,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 99,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-028.jpg",
      "/products/sp-028_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần đùi nam,quần ngủ thun co giãn mềm mịn cao cấp",
    "desc": "Quần đùi nam,quần ngủ thun co giãn mềm mịn cao cấp. Sản phẩm chính hãng chất lượng cao. Đã bán 80,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-029",
    "name": "Quần đùi thun Seven boxer nam mặc ngủ cực mát",
    "category": "fashion",
    "price": 46500,
    "originalPrice": 78814,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 151,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-029.jpg",
      "/products/sp-029_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần đùi thun Seven boxer nam mặc ngủ cực mát",
    "desc": "Quần đùi thun Seven boxer nam mặc ngủ cực mát. Sản phẩm chính hãng chất lượng cao. Đã bán 90,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-030",
    "name": "🔥 SỐC 🔥 Thắt Lưng Nam Mặt Xoay Khóa Tự Động Cao Cấp,Dây Nịt Nam Thắt Lưng Da Mặt Xoay Khóa Kim Loại",
    "category": "fashion",
    "price": 29302,
    "originalPrice": 49664,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 99,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-030.jpg",
      "/products/sp-030_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "🔥 SỐC 🔥 Thắt Lưng Nam Mặt Xoay Khóa Tự Động Cao Cấp,Dây Nịt Nam Thắt Lưng Da Mặt Xoay Khóa Kim Loạ",
    "desc": "🔥 SỐC 🔥 Thắt Lưng Nam Mặt Xoay Khóa Tự Động Cao Cấp,Dây Nịt Nam Thắt Lưng Da Mặt Xoay Khóa Kim Loại. Sản phẩm chính hãng chất lượng cao. Đã bán 60,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-031",
    "name": "Áo Sweater Frozen Shark Nỉ Nỉ Bông Cotton 100% Unisex Local Brand",
    "category": "fashion",
    "price": 108000,
    "originalPrice": 180000,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 42,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-031.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo Sweater Frozen Shark Nỉ Nỉ Bông Cotton 100% Unisex Local Brand",
    "desc": "Áo Sweater Frozen Shark Nỉ Nỉ Bông Cotton 100% Unisex Local Brand. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-032",
    "name": "Tất đá bóng vớ thể thao Feetures nam nữ loại cổ ngắn lửng, hàng dệt kim chất liệu cotton cao cấp dày dặn free size",
    "category": "fashion",
    "price": 135000,
    "originalPrice": 201493,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 154,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-032.jpg",
      "/products/sp-032_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tất đá bóng vớ thể thao Feetures nam nữ loại cổ ngắn lửng, hàng dệt kim chất liệu cotton cao cấp dày",
    "desc": "Tất đá bóng vớ thể thao Feetures nam nữ loại cổ ngắn lửng, hàng dệt kim chất liệu cotton cao cấp dày dặn free size. Sản phẩm chính hãng chất lượng cao. Đã bán 80,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-033",
    "name": "Hộp 5 Quần Lót Nam Chéo Thông Hơi Xuất Nhật",
    "category": "fashion",
    "price": 108000,
    "originalPrice": 120000,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 264,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-033.jpg",
      "/products/sp-033_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Hộp 5 Quần Lót Nam Chéo Thông Hơi Xuất Nhật",
    "desc": "Hộp 5 Quần Lót Nam Chéo Thông Hơi Xuất Nhật. Sản phẩm chính hãng chất lượng cao. Đã bán 70,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-034",
    "name": "[Giảm giá 45%] - Áo thun nam POLO trơn vải cá sấu cotton cao cấp ngắn tay tông màu cực sang trọng lịch lãm",
    "category": "fashion",
    "price": 179000,
    "originalPrice": 198889,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 113,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-034.jpg",
      "/products/sp-034_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[Giảm giá 45%] - Áo thun nam POLO trơn vải cá sấu cotton cao cấp ngắn tay tông màu cực sang trọng lị",
    "desc": "[Giảm giá 45%] - Áo thun nam POLO trơn vải cá sấu cotton cao cấp ngắn tay tông màu cực sang trọng lịch lãm. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-035",
    "name": "Quần lót nam , quần sịp tam giác họa tiết Lyning cao cấp chất thun lạnh kháng khuẩn co giãn 4 chiều",
    "category": "fashion",
    "price": 30000,
    "originalPrice": 50000,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 242,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-035.jpg",
      "/products/sp-035_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần lót nam , quần sịp tam giác họa tiết Lyning cao cấp chất thun lạnh kháng khuẩn co giãn 4 chiều",
    "desc": "Quần lót nam , quần sịp tam giác họa tiết Lyning cao cấp chất thun lạnh kháng khuẩn co giãn 4 chiều. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-036",
    "name": "[ COMBO 5C] Quần Lót Nam Boxer Thun Lạnh Kháng Khuẩn Thoáng Khí Co Giãn 4 Chiều Set 5 Màu BO01",
    "category": "fashion",
    "price": 117223,
    "originalPrice": 174960,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 55,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-036.jpg",
      "/products/sp-036_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[ COMBO 5C] Quần Lót Nam Boxer Thun Lạnh Kháng Khuẩn Thoáng Khí Co Giãn 4 Chiều Set 5 Màu BO01",
    "desc": "[ COMBO 5C] Quần Lót Nam Boxer Thun Lạnh Kháng Khuẩn Thoáng Khí Co Giãn 4 Chiều Set 5 Màu BO01. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-037",
    "name": "Quần đùi nam Guzado mẫu short vải thun lạnh SIÊU CO GIÃN,thoáng mát vận động thoải mái GSR02-GASR25S002",
    "category": "fashion",
    "price": 155000,
    "originalPrice": 258333,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 189,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-037.jpg",
      "/products/sp-037_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần đùi nam Guzado mẫu short vải thun lạnh SIÊU CO GIÃN,thoáng mát vận động thoải mái GSR02-GASR25S",
    "desc": "Quần đùi nam Guzado mẫu short vải thun lạnh SIÊU CO GIÃN,thoáng mát vận động thoải mái GSR02-GASR25S002. Sản phẩm chính hãng chất lượng cao. Đã bán 80,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-038",
    "name": "Áo Len Cổ Lọ Nam Nữ Unisex SUKIYA Chất Sợi Len Lông Thỏ mềm mại kiểu dáng Hàn Quốc Nhiều Màu AL14",
    "category": "fashion",
    "price": 161864,
    "originalPrice": 199832,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 150,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-038.jpg",
      "/products/sp-038_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Áo Len Cổ Lọ Nam Nữ Unisex SUKIYA Chất Sợi Len Lông Thỏ mềm mại kiểu dáng Hàn Quốc Nhiều Màu AL14",
    "desc": "Áo Len Cổ Lọ Nam Nữ Unisex SUKIYA Chất Sợi Len Lông Thỏ mềm mại kiểu dáng Hàn Quốc Nhiều Màu AL14. Sản phẩm chính hãng chất lượng cao. Đã bán 60,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-039",
    "name": "Quần Sip Nam tam giác Mipass sư tử Menswear, Quần Lót Nam cao cấp vải thun lạnh in họa tiết T14",
    "category": "fashion",
    "price": 120000,
    "originalPrice": 156000,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 261,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-039.jpg",
      "/products/sp-039_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quần Sip Nam tam giác Mipass sư tử Menswear, Quần Lót Nam cao cấp vải thun lạnh in họa tiết T14",
    "desc": "Quần Sip Nam tam giác Mipass sư tử Menswear, Quần Lót Nam cao cấp vải thun lạnh in họa tiết T14. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-040",
    "name": "[BÁN CHẠY] Tất lười nam nữ có đệm cao su chống tuột gót HUBTAT, chất liệu cotton mềm mại, thoáng mát - KOL-LUOI-02-1DOI",
    "category": "fashion",
    "price": 13900,
    "originalPrice": 18900,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 266,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-040.jpg",
      "/products/sp-040_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[BÁN CHẠY] Tất lười nam nữ có đệm cao su chống tuột gót HUBTAT, chất liệu cotton mềm mại, thoáng mát",
    "desc": "[BÁN CHẠY] Tất lười nam nữ có đệm cao su chống tuột gót HUBTAT, chất liệu cotton mềm mại, thoáng mát - KOL-LUOI-02-1DOI. Sản phẩm chính hãng chất lượng cao. Đã bán 80,000 sản phẩm.",
    "specs": {
      "Chất liệu": "Cotton cao cấp",
      "Xuất xứ": "Việt Nam"
    },
    "tags": [
      "thời trang nam",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-041",
    "name": "Tai Nghe Bluetooth Có Dây Và Mic 7/7plus/8/8plus/x/xs/11/12/13/14/pro/max/plus/promax - Awifi Case H5-2",
    "category": "tech",
    "price": 55142,
    "originalPrice": 90397,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 171,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-041.jpg",
      "/products/sp-041_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai Nghe Bluetooth Có Dây Và Mic 7/7plus/8/8plus/x/xs/11/12/13/14/pro/max/plus/promax - Awifi Case H",
    "desc": "Tai Nghe Bluetooth Có Dây Và Mic 7/7plus/8/8plus/x/xs/11/12/13/14/pro/max/plus/promax - Awifi Case H5-2. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-042",
    "name": "[CHÍNH HÃNG] Điều Khiển TV SAMSUNG SMART TẶNG PIN Remote TV SAMSUNG Có MICRO GIỌNG NÓI",
    "category": "tech",
    "price": 129000,
    "originalPrice": 238889,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 142,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-042.jpg",
      "/products/sp-042_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[CHÍNH HÃNG] Điều Khiển TV SAMSUNG SMART TẶNG PIN Remote TV SAMSUNG Có MICRO GIỌNG NÓI",
    "desc": "[CHÍNH HÃNG] Điều Khiển TV SAMSUNG SMART TẶNG PIN Remote TV SAMSUNG Có MICRO GIỌNG NÓI. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-043",
    "name": "Găng tay chơi game MEMO chống mồi hôi ngón tay bao tay cảm ứng 2 ngón chơi Liên Quân mobile FF PUBG ROS trên điện thoại",
    "category": "tech",
    "price": 31200,
    "originalPrice": 69333,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 154,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-043.jpg",
      "/products/sp-043_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Găng tay chơi game MEMO chống mồi hôi ngón tay bao tay cảm ứng 2 ngón chơi Liên Quân mobile FF PUBG ",
    "desc": "Găng tay chơi game MEMO chống mồi hôi ngón tay bao tay cảm ứng 2 ngón chơi Liên Quân mobile FF PUBG ROS trên điện thoại. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-044",
    "name": "Bao Tay Chơi Game ff, Pubg, Liên Quân Cao Cấp Găng tay Chống Mồ Hôi, Siêu Nhạy, Co Giãn Cực Tốt Bằng Sợi Bạc",
    "category": "tech",
    "price": 9999,
    "originalPrice": 14999,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 132,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-044.jpg",
      "/products/sp-044_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Bao Tay Chơi Game ff, Pubg, Liên Quân Cao Cấp Găng tay Chống Mồ Hôi, Siêu Nhạy, Co Giãn Cực Tốt Bằng",
    "desc": "Bao Tay Chơi Game ff, Pubg, Liên Quân Cao Cấp Găng tay Chống Mồ Hôi, Siêu Nhạy, Co Giãn Cực Tốt Bằng Sợi Bạc. Sản phẩm chính hãng chất lượng cao. Đã bán 70,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-045",
    "name": "Tws Tai Nghe Chụp Tai bluetooth 5.2 Âm Thanh hifi Kiểu Dáng Thể Thao",
    "category": "tech",
    "price": 66404,
    "originalPrice": 100612,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 56,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-045.jpg",
      "/products/sp-045_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tws Tai Nghe Chụp Tai bluetooth 5.2 Âm Thanh hifi Kiểu Dáng Thể Thao",
    "desc": "Tws Tai Nghe Chụp Tai bluetooth 5.2 Âm Thanh hifi Kiểu Dáng Thể Thao. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-046",
    "name": "Tai Nghe In Ear Chống Rối Super Bass",
    "category": "tech",
    "price": 23900,
    "originalPrice": 28900,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 27,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-046.jpg",
      "/products/sp-046_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai Nghe In Ear Chống Rối Super Bass",
    "desc": "Tai Nghe In Ear Chống Rối Super Bass. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-047",
    "name": "Set Bọc Núm Silicone Cần Analog tay cầm PS4/PS5/XBOX/Flydigi VADER/APEX//Pro Controller Bảo vệ Cover Analog",
    "category": "tech",
    "price": 9000,
    "originalPrice": 14063,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 176,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-047.jpg",
      "/products/sp-047_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Set Bọc Núm Silicone Cần Analog tay cầm PS4/PS5/XBOX/Flydigi VADER/APEX//Pro Controller Bảo vệ",
    "desc": "Set Bọc Núm Silicone Cần Analog tay cầm PS4/PS5/XBOX/Flydigi VADER/APEX//Pro Controller Bảo vệ Cover Analog. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-048",
    "name": "Loa Bluetooth Mini ROBOT RB120 Bass Mạnh công suất 5W LED RGB Kháng Nước IPX4 BH 12 THÁNG",
    "category": "tech",
    "price": 207000,
    "originalPrice": 328571,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 195,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-048.jpg",
      "/products/sp-048_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Loa Bluetooth Mini ROBOT RB120 Bass Mạnh công suất 5W LED RGB Kháng Nước IPX4 BH 12 THÁNG",
    "desc": "Loa Bluetooth Mini ROBOT RB120 Bass Mạnh công suất 5W LED RGB Kháng Nước IPX4 BH 12 THÁNG. Sản phẩm chính hãng chất lượng cao. Đã bán 40,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-049",
    "name": "Bao Tay Chơi Game ff, Pubg, Liên Quân.... Găng tay chơi game cao cấp chống mồ hôi tay chống trượt co dãn cực tốt",
    "category": "tech",
    "price": 20000,
    "originalPrice": 26000,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 126,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-049.jpg",
      "/products/sp-049_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Bao Tay Chơi Game ff, Pubg, Liên Quân.... Găng tay chơi game cao cấp chống mồ hôi tay chống trượt co",
    "desc": "Bao Tay Chơi Game ff, Pubg, Liên Quân.... Găng tay chơi game cao cấp chống mồ hôi tay chống trượt co dãn cực tốt. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-050",
    "name": "Hộp đựng bao ngón tay cất giữ bao ngon tay tiện dụng",
    "category": "tech",
    "price": 10000,
    "originalPrice": 15000,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 152,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-050.jpg",
      "/products/sp-050_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Hộp đựng bao ngón tay cất giữ bao ngon tay tiện dụng",
    "desc": "Hộp đựng bao ngón tay cất giữ bao ngon tay tiện dụng. Sản phẩm chính hãng chất lượng cao. Đã bán 50,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-051",
    "name": "[20/10/2/1cái]Găng tay trò chơi PUBG, FF, Găng tay Liên minh huyền thoại, Găng tay chống mồ hôi, Siêu nhạy cảm, Độ đàn h",
    "category": "tech",
    "price": 9000,
    "originalPrice": 27273,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 95,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-051.jpg",
      "/products/sp-051_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[20/10/2/1cái]Găng tay trò chơi PUBG, FF, Găng tay Liên minh huyền thoại, Găng tay chống mồ hôi, Siê",
    "desc": "[20/10/2/1cái]Găng tay trò chơi PUBG, FF, Găng tay Liên minh huyền thoại, Găng tay chống mồ hôi, Siêu nhạy cảm, Độ đàn hồi tốt, Sản phẩm chính hãng. Sản phẩm chính hãng chất lượng cao. Đã bán 50,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-052",
    "name": "Remote điều khiển tivi Samsung Smart (Mới) BN59-01303A  BN59-01199G 01268D 01247A SAMSUNG HÀNG CHÍNH HÃNG",
    "category": "tech",
    "price": 9000,
    "originalPrice": 90000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 194,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-052.jpg",
      "/products/sp-052_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Remote điều khiển tivi Samsung Smart (Mới) BN59-01303A  BN59-01199G 01268D 01247A SAMSUNG HÀNG CHÍ",
    "desc": "Remote điều khiển tivi Samsung Smart (Mới) BN59-01303A  BN59-01199G 01268D 01247A SAMSUNG HÀNG CHÍNH HÃNG. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-053",
    "name": "Găng tay chơi game Pubg, ff, Liên Quân, Bao tay chống mồ hôi sợi bạc cao cấp, siêu nhạy, co giãn tốt hàng chính hãng",
    "category": "tech",
    "price": 9999,
    "originalPrice": 14999,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 42,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-053.jpg",
      "/products/sp-053_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Găng tay chơi game Pubg, ff, Liên Quân, Bao tay chống mồ hôi sợi bạc cao cấp, siêu nhạy, co giãn tốt",
    "desc": "Găng tay chơi game Pubg, ff, Liên Quân, Bao tay chống mồ hôi sợi bạc cao cấp, siêu nhạy, co giãn tốt hàng chính hãng. Sản phẩm chính hãng chất lượng cao. Đã bán 40,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-054",
    "name": "Điều khiển Dùng Cho Tivi SONY Smart Internet-Model TX300P Hàng Chất Lượng Cao",
    "category": "tech",
    "price": 39920,
    "originalPrice": 49900,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 76,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-054.jpg",
      "/products/sp-054_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Điều khiển Dùng Cho Tivi SONY Smart Internet-Model TX300P Hàng Chất Lượng Cao",
    "desc": "Điều khiển Dùng Cho Tivi SONY Smart Internet-Model TX300P Hàng Chất Lượng Cao. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-055",
    "name": "🔥Unico A🔥Tai Nghe Gaming/bass mạnh Có Dây Nhét Tai Chơi Game Chống Ồn Có Mic In Ear Cho PC IPPlus và các dòng điện tho",
    "category": "tech",
    "price": 22800,
    "originalPrice": 30000,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 67,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-055.jpg",
      "/products/sp-055_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "🔥Unico A🔥Tai Nghe Gaming/bass mạnh Có Dây Nhét Tai Chơi Game Chống Ồn Có Mic In Ear Cho PC IPPlus ",
    "desc": "🔥Unico A🔥Tai Nghe Gaming/bass mạnh Có Dây Nhét Tai Chơi Game Chống Ồn Có Mic In Ear Cho PC IPPlus và các dòng điện thoại. Sản phẩm chính hãng chất lượng cao. Đã bán 90,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-056",
    "name": "Tai Nghe Nhét Tai Baseus H19 Âm Thanh Nổi 6D Và Mic Cho Điện Thoại Xiaomi Có Dây 3.5mm",
    "category": "tech",
    "price": 151976,
    "originalPrice": 165191,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 73,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-056.jpg",
      "/products/sp-056_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai Nghe Nhét Tai Baseus H19 Âm Thanh Nổi 6D Và Mic Cho Điện Thoại Xiaomi Có Dây 3.5mm",
    "desc": "Tai Nghe Nhét Tai Baseus H19 Âm Thanh Nổi 6D Và Mic Cho Điện Thoại Xiaomi Có Dây 3.5mm. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-057",
    "name": "Bao tay chơi game ff Pubg Liên Quân siêu nhạy sợi bạc SHEZI - găng tay chơi game cao cấp - Minado",
    "category": "tech",
    "price": 9000,
    "originalPrice": 25000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 189,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-057.jpg",
      "/products/sp-057_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Bao tay chơi game ff Pubg Liên Quân siêu nhạy sợi bạc SHEZI - găng tay chơi game cao cấp - Minado",
    "desc": "Bao tay chơi game ff Pubg Liên Quân siêu nhạy sợi bạc SHEZI - găng tay chơi game cao cấp - Minado. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-058",
    "name": "10 cái Chân cao su giảm chấn có long đen kim loại đúc liền dùng cho chân đế loa, máy...",
    "category": "tech",
    "price": 18000,
    "originalPrice": 23400,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 118,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-058.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "10 cái Chân cao su giảm chấn có long đen kim loại đúc liền dùng cho chân đế loa, máy...",
    "desc": "10 cái Chân cao su giảm chấn có long đen kim loại đúc liền dùng cho chân đế loa, máy.... Sản phẩm chính hãng chất lượng cao. Đã bán 60,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-059",
    "name": "Tai Nghe Bluetooth Realfit F3 Tai Nghe Thể Thao Khử Tiếng Ồn -38db 360° Âm Thanh Không Gian Bass Tốt",
    "category": "tech",
    "price": 205020,
    "originalPrice": 488143,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 26,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-059.jpg",
      "/products/sp-059_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai Nghe Bluetooth Realfit F3 Tai Nghe Thể Thao Khử Tiếng Ồn -38db 360° Âm Thanh Không Gian Bass Tốt",
    "desc": "Tai Nghe Bluetooth Realfit F3 Tai Nghe Thể Thao Khử Tiếng Ồn -38db 360° Âm Thanh Không Gian Bass Tốt. Sản phẩm chính hãng chất lượng cao. Đã bán 90,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-060",
    "name": "Tai nghe bluetooth không dây NEW Pro 6 TWS có micro hỗ trợ tập thể thao thích hợp cho",
    "category": "tech",
    "price": 63596,
    "originalPrice": 94919,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 37,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-060.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai nghe bluetooth không dây NEW Pro 6 TWS có micro hỗ trợ tập thể thao thích hợp cho",
    "desc": "Tai nghe bluetooth không dây NEW Pro 6 TWS có micro hỗ trợ tập thể thao thích hợp cho. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-061",
    "name": "Tai nghe U19 Nhiều màu giắc cắm 3.5mm có míc dành cho mọi điện thoại Android/iOs 6s 6plus/Samsung",
    "category": "tech",
    "price": 24800,
    "originalPrice": 40000,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 48,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-061.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai nghe U19 Nhiều màu giắc cắm 3.5mm có míc dành cho mọi điện thoại Android/iOs 6s 6plus/Samsung",
    "desc": "Tai nghe U19 Nhiều màu giắc cắm 3.5mm có míc dành cho mọi điện thoại Android/iOs 6s 6plus/Samsung. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-062",
    "name": "Điều khiển từ xa thay thế cho tất cả các TV Samsung LED QLED UHD SUHD HDR Khung LCD",
    "category": "tech",
    "price": 71500,
    "originalPrice": 76500,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 106,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-062.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Điều khiển từ xa thay thế cho tất cả các TV Samsung LED QLED UHD SUHD HDR Khung LCD",
    "desc": "Điều khiển từ xa thay thế cho tất cả các TV Samsung LED QLED UHD SUHD HDR Khung LCD. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-063",
    "name": "Dây HDMI 1.5m zin bóc máy",
    "category": "tech",
    "price": 17000,
    "originalPrice": 22100,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 24,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-063.jpg",
      "/products/sp-063_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Dây HDMI 1.5m zin bóc máy",
    "desc": "Dây HDMI 1.5m zin bóc máy. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-064",
    "name": "💕Dy💕Set đôi bao tay Chống Mồ Hôi Khi Chơi Game",
    "category": "tech",
    "price": 9178,
    "originalPrice": 14178,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 199,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-064.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "💕Dy💕Set đôi bao tay Chống Mồ Hôi Khi Chơi Game",
    "desc": "💕Dy💕Set đôi bao tay Chống Mồ Hôi Khi Chơi Game. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-065",
    "name": "Điều khiển từ xa đa năng cho TV Samsung BN59 Cong QLED 4K UHD TV thông minh Điều khiển từ xa hồng ngoại",
    "category": "tech",
    "price": 68682,
    "originalPrice": 73852,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 92,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-065.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Điều khiển từ xa đa năng cho TV Samsung BN59 Cong QLED 4K UHD TV thông minh Điều khiển từ xa hồng ng",
    "desc": "Điều khiển từ xa đa năng cho TV Samsung BN59 Cong QLED 4K UHD TV thông minh Điều khiển từ xa hồng ngoại. Sản phẩm chính hãng chất lượng cao. Đã bán 90,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-066",
    "name": "Triết Áp Đơn 3 chân 1K 2K 5K 10K 20K 50K 100K 500K 1M chất lượng cao, biến trở Volum",
    "category": "tech",
    "price": 11954,
    "originalPrice": 16954,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 130,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-066.jpg",
      "/products/sp-066_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Triết Áp Đơn 3 chân 1K 2K 5K 10K 20K 50K 100K 500K 1M chất lượng cao, biến trở Volum",
    "desc": "Triết Áp Đơn 3 chân 1K 2K 5K 10K 20K 50K 100K 500K 1M chất lượng cao, biến trở Volum. Sản phẩm chính hãng chất lượng cao. Đã bán 50,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-067",
    "name": "[HÀNG XUẤT MALAYSIA] Remote Điều khiển TV SONY Smart sử dụng tất cả Tivi SONY thay thế được cả dòng có giọng nói",
    "category": "tech",
    "price": 28000,
    "originalPrice": 80000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 197,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-067.jpg",
      "/products/sp-067_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[HÀNG XUẤT MALAYSIA] Remote Điều khiển TV SONY Smart sử dụng tất cả Tivi SONY thay thế được cả dòng ",
    "desc": "[HÀNG XUẤT MALAYSIA] Remote Điều khiển TV SONY Smart sử dụng tất cả Tivi SONY thay thế được cả dòng có giọng nói. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-068",
    "name": "Tai Nghe A.K.G Có Dây Jack Type-C &amp; 3.5mm, Hỗ Trợ Android, PC, Laptop – Màu Đen",
    "category": "tech",
    "price": 119000,
    "originalPrice": 238000,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 82,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-068.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai Nghe A.K.G Có Dây Jack Type-C &amp; 3.5mm, Hỗ Trợ Android, PC, Laptop – Màu Đen",
    "desc": "Tai Nghe A.K.G Có Dây Jack Type-C &amp; 3.5mm, Hỗ Trợ Android, PC, Laptop – Màu Đen. Sản phẩm chính hãng chất lượng cao. Đã bán 40,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-069",
    "name": "Remote Điều Khiển Dùng Cho Tivi LG Smart Ngắn",
    "category": "tech",
    "price": 27440,
    "originalPrice": 32440,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 189,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-069.jpg",
      "/products/sp-069_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Remote Điều Khiển Dùng Cho Tivi LG Smart Ngắn",
    "desc": "Remote Điều Khiển Dùng Cho Tivi LG Smart Ngắn. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-070",
    "name": "Đèn Led Hậu Nháy AUDI Xe Máy ( Ko Lắp Xe Điện ) Nháy Đuổi Chớp Đuổi Hậu Led Chớp Nháy Hậu Nháy 7 Mầu Hậu Bi Led S25",
    "category": "tech",
    "price": 35000,
    "originalPrice": 54688,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 156,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-070.jpg",
      "/products/sp-070_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Đèn Led Hậu Nháy AUDI Xe Máy ( Ko Lắp Xe Điện ) Nháy Đuổi Chớp Đuổi Hậu Led Chớp Nháy Hậu Nháy 7 Mầu",
    "desc": "Đèn Led Hậu Nháy AUDI Xe Máy ( Ko Lắp Xe Điện ) Nháy Đuổi Chớp Đuổi Hậu Led Chớp Nháy Hậu Nháy 7 Mầu Hậu Bi Led S25. Sản phẩm chính hãng chất lượng cao. Đã bán 40,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-071",
    "name": "Chân đế cao su ROHS siêu rẻ nhiều kích thước cho loa, tủ, kệ, bàn, đồ gỗ diy (Giá 4 cái)",
    "category": "tech",
    "price": 10800,
    "originalPrice": 15882,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 145,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-071.jpg",
      "/products/sp-071_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Chân đế cao su ROHS siêu rẻ nhiều kích thước cho loa, tủ, kệ, bàn, đồ gỗ diy (Giá 4 cái)",
    "desc": "Chân đế cao su ROHS siêu rẻ nhiều kích thước cho loa, tủ, kệ, bàn, đồ gỗ diy (Giá 4 cái). Sản phẩm chính hãng chất lượng cao. Đã bán 70,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-072",
    "name": "Tai Nghe Nhét Tai Đa Năng 320 Âm Thanh Cực Êm Có Mic Nhiều Màu Hot Trend - Hazo",
    "category": "tech",
    "price": 21900,
    "originalPrice": 26900,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 84,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-072.jpg",
      "/products/sp-072_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai Nghe Nhét Tai Đa Năng 320 Âm Thanh Cực Êm Có Mic Nhiều Màu Hot Trend - Hazo",
    "desc": "Tai Nghe Nhét Tai Đa Năng 320 Âm Thanh Cực Êm Có Mic Nhiều Màu Hot Trend - Hazo. Sản phẩm chính hãng chất lượng cao. Đã bán 60,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-073",
    "name": "Tai nghe nhét tai có dây Xinran chống ồn dành cho điện thoại thông minh",
    "category": "tech",
    "price": 41800,
    "originalPrice": 48605,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 18,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-073.jpg",
      "/products/sp-073_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai nghe nhét tai có dây Xinran chống ồn dành cho điện thoại thông minh",
    "desc": "Tai nghe nhét tai có dây Xinran chống ồn dành cho điện thoại thông minh. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-074",
    "name": "Điều khiển từ xa máy chiếu HY300PRO cho T01A HY320 HY320 MINI Allwinner H713 Thay thế",
    "category": "tech",
    "price": 83800,
    "originalPrice": 108831,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 96,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-074.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Điều khiển từ xa máy chiếu HY300PRO cho T01A HY320 HY320 MINI Allwinner H713 Thay thế",
    "desc": "Điều khiển từ xa máy chiếu HY300PRO cho T01A HY320 HY320 MINI Allwinner H713 Thay thế. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-075",
    "name": "BASEUS Tai Nghe Bass BS2 Lite Bluetooth 6.0 Chống Nước IPX4 30h Tăng cường âm trầm",
    "category": "tech",
    "price": 465520,
    "originalPrice": 655662,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 189,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-075.jpg",
      "/products/sp-075_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "BASEUS Tai Nghe Bass BS2 Lite Bluetooth 6.0 Chống Nước IPX4 30h Tăng cường âm trầm",
    "desc": "BASEUS Tai Nghe Bass BS2 Lite Bluetooth 6.0 Chống Nước IPX4 30h Tăng cường âm trầm. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-076",
    "name": "Tai nghe XINRAN Có dây khử tiếng ồn Eerphones Micro trong tai Tai nghe điều khiển âm lượng Điện thoại Android Giảm tiếng",
    "category": "tech",
    "price": 44000,
    "originalPrice": 57200,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 201,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-076.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Tai nghe XINRAN Có dây khử tiếng ồn Eerphones Micro trong tai Tai nghe điều khiển âm lượng Điện thoạ",
    "desc": "Tai nghe XINRAN Có dây khử tiếng ồn Eerphones Micro trong tai Tai nghe điều khiển âm lượng Điện thoại Android Giảm tiếng ồn. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-077",
    "name": "GOOJODOQ J201 IPX5 chống nước, giảm tiếng ồn, tai nghe không dây,tai nghe Bluetooth 5.3 tích hợp micro, âm thanh tốt.",
    "category": "tech",
    "price": 146449,
    "originalPrice": 200615,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 19,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-077.jpg",
      "/products/sp-077_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "GOOJODOQ J201 IPX5 chống nước, giảm tiếng ồn, tai nghe không dây,tai nghe Bluetooth 5.3 tích hợp mic",
    "desc": "GOOJODOQ J201 IPX5 chống nước, giảm tiếng ồn, tai nghe không dây,tai nghe Bluetooth 5.3 tích hợp micro, âm thanh tốt.. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-078",
    "name": "Điều khiển từ xa bằng giọng nói thay thế cho TV thông minh Samsung 2018-2023 Crystal QLED cong",
    "category": "tech",
    "price": 113300,
    "originalPrice": 147290,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 152,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-078.jpg",
      "/products/sp-078_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Điều khiển từ xa bằng giọng nói thay thế cho TV thông minh Samsung 2018-2023 Crystal QLED cong",
    "desc": "Điều khiển từ xa bằng giọng nói thay thế cho TV thông minh Samsung 2018-2023 Crystal QLED cong. Sản phẩm chính hãng chất lượng cao. Đã bán 500,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-079",
    "name": "Điều Khiển Từ Xa Đa Năng BN59-01199F Cho Samsung Tất Cả LCD LED HDTV 3D Smart TV UN32J4500AFXZA",
    "category": "tech",
    "price": 66000,
    "originalPrice": 71000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 114,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-079.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Điều Khiển Từ Xa Đa Năng BN59-01199F Cho Samsung Tất Cả LCD LED HDTV 3D Smart TV UN32J4500AFXZA",
    "desc": "Điều Khiển Từ Xa Đa Năng BN59-01199F Cho Samsung Tất Cả LCD LED HDTV 3D Smart TV UN32J4500AFXZA. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-080",
    "name": "Remote Cửa Cuốn Mã Gạt 8 Số 433Mhz-Inox",
    "category": "tech",
    "price": 69000,
    "originalPrice": 79310,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 86,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-080.jpg",
      "/products/sp-080_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Remote Cửa Cuốn Mã Gạt 8 Số 433Mhz-Inox",
    "desc": "Remote Cửa Cuốn Mã Gạt 8 Số 433Mhz-Inox. Sản phẩm chính hãng chất lượng cao. Đã bán 30,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "tech",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-081",
    "name": "SET 10 Chai nhựa xịt phun sương 5ml/ 10ml/ 15ml/ 20ml/ 25ml/ 30ml/ 50ml/ 80ml/ 100ml/ 200ml - Lọ pet chiết mỹ phẩm, cồn",
    "category": "decor",
    "price": 40000,
    "originalPrice": 52000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 43,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-081.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "SET 10 Chai nhựa xịt phun sương 5ml/ 10ml/ 15ml/ 20ml/ 25ml/ 30ml/ 50ml/ 80ml/ 100ml/ 200ml - Lọ pet",
    "desc": "SET 10 Chai nhựa xịt phun sương 5ml/ 10ml/ 15ml/ 20ml/ 25ml/ 30ml/ 50ml/ 80ml/ 100ml/ 200ml - Lọ pet chiết mỹ phẩm, cồn. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-082",
    "name": "Băng keo thể thao quấn cổ chân cổ tay Combo Mini 3-6-12 cuộn băng cuốn ngón cổ chân tự dính thể thao",
    "category": "decor",
    "price": 59000,
    "originalPrice": 100000,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 62,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-082.jpg",
      "/products/sp-082_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Băng keo thể thao quấn cổ chân cổ tay Combo Mini 3-6-12 cuộn băng cuốn ngón cổ chân tự dính thể t",
    "desc": "Băng keo thể thao quấn cổ chân cổ tay Combo Mini 3-6-12 cuộn băng cuốn ngón cổ chân tự dính thể thao. Sản phẩm chính hãng chất lượng cao. Đã bán 1,000,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-083",
    "name": "[Combo 5 Túi] Túi Vải Đựng Giày Dép Dây Rút Chống Bẩn Du Lịch Size Lớn Với Họa Tiết Thiết Kế Đẹp Mắt",
    "category": "decor",
    "price": 35000,
    "originalPrice": 45500,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 139,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-083.jpg",
      "/products/sp-083_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[Combo 5 Túi] Túi Vải Đựng Giày Dép Dây Rút Chống Bẩn Du Lịch Size Lớn Với Họa Tiết Thiết Kế Đẹp Mắt",
    "desc": "[Combo 5 Túi] Túi Vải Đựng Giày Dép Dây Rút Chống Bẩn Du Lịch Size Lớn Với Họa Tiết Thiết Kế Đẹp Mắt. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-084",
    "name": "Băng keo quấn cổ chân thể thao cao su non bảo vệ cổ chân tự dính đá bóng chống chấn thương",
    "category": "decor",
    "price": 29400,
    "originalPrice": 60000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 155,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-084.jpg",
      "/products/sp-084_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Băng keo quấn cổ chân thể thao cao su non bảo vệ cổ chân tự dính đá bóng chống chấn thương",
    "desc": "Băng keo quấn cổ chân thể thao cao su non bảo vệ cổ chân tự dính đá bóng chống chấn thương. Sản phẩm chính hãng chất lượng cao. Đã bán 800,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-085",
    "name": "Hủ đựng kem 200g : lòng kem 200g + hủ 250g . đủ màu . hủ bóng đẹp",
    "category": "decor",
    "price": 44550,
    "originalPrice": 49550,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 151,
    "isFeatured": true,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-085.jpg",
      "/products/sp-085_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Hủ đựng kem 200g : lòng kem 200g + hủ 250g . đủ màu . hủ bóng đẹp",
    "desc": "Hủ đựng kem 200g : lòng kem 200g + hủ 250g . đủ màu . hủ bóng đẹp. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-086",
    "name": "10 CÁI--Túi Dây Rút Lưới Đựng Trang Sức Qùa Tặng Hoa Khô Bánh Kẹo Nhiều Màu--10 CÁI--",
    "category": "decor",
    "price": 15000,
    "originalPrice": 20000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 25,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-086.jpg",
      "/products/sp-086_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "10 CÁI--Túi Dây Rút Lưới Đựng Trang Sức Qùa Tặng Hoa Khô Bánh Kẹo Nhiều Màu--10 CÁI--",
    "desc": "10 CÁI--Túi Dây Rút Lưới Đựng Trang Sức Qùa Tặng Hoa Khô Bánh Kẹo Nhiều Màu--10 CÁI--. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-087",
    "name": "Băng keo thể thao hộp 24 &amp; 30 cuốn cổ chân cổ tay cao su non vải hỗ trợ thi đấu và tập luyện",
    "category": "decor",
    "price": 149000,
    "originalPrice": 201351,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 18,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-087.jpg",
      "/products/sp-087_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Băng keo thể thao hộp 24 &amp; 30 cuốn cổ chân cổ tay cao su non vải hỗ trợ thi đấu và tập luyện",
    "desc": "Băng keo thể thao hộp 24 &amp; 30 cuốn cổ chân cổ tay cao su non vải hỗ trợ thi đấu và tập luyện. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-088",
    "name": "(Bản5CM)Băng keo thể thao, Băng quấn thể thao cao su non, Băng Vải chống chấn thương, hỗ trợ thi đấu và tập luyện",
    "category": "decor",
    "price": 9400,
    "originalPrice": 14400,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 167,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-088.jpg",
      "/products/sp-088_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "(Bản5CM)Băng keo thể thao, Băng quấn thể thao cao su non, Băng Vải chống chấn thương, hỗ trợ thi đấu",
    "desc": "(Bản5CM)Băng keo thể thao, Băng quấn thể thao cao su non, Băng Vải chống chấn thương, hỗ trợ thi đấu và tập luyện. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-089",
    "name": "Ô dù che mưa che nắng Sumio dù 12 nan 10 8 nan 2 lớp mở tự động gấp gọn cầm tay đi du lịch cỡ to",
    "category": "decor",
    "price": 77000,
    "originalPrice": 110000,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 36,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": true,
    "images": [
      "/products/sp-089.jpg",
      "/products/sp-089_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Ô dù che mưa che nắng Sumio dù 12 nan 10 8 nan 2 lớp mở tự động gấp gọn cầm tay đi du lịch cỡ to",
    "desc": "Ô dù che mưa che nắng Sumio dù 12 nan 10 8 nan 2 lớp mở tự động gấp gọn cầm tay đi du lịch cỡ to. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-090",
    "name": "Chai lọ hút chân không - (Set 3 và 1)Chai nhựa xịt giọt, xịt sương 5ml 30ml 50ml 100ml - LỌ chiết mỹ phẩm Nước Hoa",
    "category": "decor",
    "price": 28000,
    "originalPrice": 35897,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 104,
    "isFeatured": false,
    "isNew": true,
    "isFlashSale": false,
    "images": [
      "/products/sp-090.jpg",
      "/products/sp-090_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Chai lọ hút chân không - (Set 3 và 1)Chai nhựa xịt giọt, xịt sương 5ml 30ml 50ml 100ml - LỌ chiết mỹ",
    "desc": "Chai lọ hút chân không - (Set 3 và 1)Chai nhựa xịt giọt, xịt sương 5ml 30ml 50ml 100ml - LỌ chiết mỹ phẩm Nước Hoa. Sản phẩm chính hãng chất lượng cao. Đã bán 500,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-091",
    "name": "Túi đựng giày dép du lịch vải có dây rút chống bẩn Size Lớn P0407",
    "category": "decor",
    "price": 10000,
    "originalPrice": 15000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 31,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-091.jpg",
      "/products/sp-091_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Túi đựng giày dép du lịch vải có dây rút chống bẩn Size Lớn P0407",
    "desc": "Túi đựng giày dép du lịch vải có dây rút chống bẩn Size Lớn P0407. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-092",
    "name": "COMBO 10 Lọ chiết serum thuỷ tinh, lọ đựng tinh chất 5ml/10ml kèm nút bóp",
    "category": "decor",
    "price": 36000,
    "originalPrice": 41000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 198,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-092.jpg",
      "/products/sp-092_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "COMBO 10 Lọ chiết serum thuỷ tinh, lọ đựng tinh chất 5ml/10ml kèm nút bóp",
    "desc": "COMBO 10 Lọ chiết serum thuỷ tinh, lọ đựng tinh chất 5ml/10ml kèm nút bóp. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-093",
    "name": "SET 10 ĐỦ SIZE Hủ nhựa trong suốt, nắp đen 2gr/ 3gr/ 5gr/ 10gr/ 20gr/ 30gr/ 50gr/ 100gr -Lọ đựng mỹ phẩm kem- Hủ nhỏ spa",
    "category": "decor",
    "price": 14400,
    "originalPrice": 19400,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 163,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-093.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "SET 10 ĐỦ SIZE Hủ nhựa trong suốt, nắp đen 2gr/ 3gr/ 5gr/ 10gr/ 20gr/ 30gr/ 50gr/ 100gr -Lọ đựng mỹ ",
    "desc": "SET 10 ĐỦ SIZE Hủ nhựa trong suốt, nắp đen 2gr/ 3gr/ 5gr/ 10gr/ 20gr/ 30gr/ 50gr/ 100gr -Lọ đựng mỹ phẩm kem- Hủ nhỏ spa. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-094",
    "name": "Bộ 5 Túi zip lụa mờ đựng quần áo, mỹ phẩm, giày dép, vớ du lịch / Túi bảo quản quần áo vật dụng",
    "category": "decor",
    "price": 18000,
    "originalPrice": 23400,
    "rating": 5,
    "reviewsCount": 9999,
    "stock": 75,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-094.jpg",
      "/products/sp-094_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Bộ 5 Túi zip lụa mờ đựng quần áo, mỹ phẩm, giày dép, vớ du lịch / Túi bảo quản quần áo vật dụng",
    "desc": "Bộ 5 Túi zip lụa mờ đựng quần áo, mỹ phẩm, giày dép, vớ du lịch / Túi bảo quản quần áo vật dụng. Sản phẩm chính hãng chất lượng cao. Đã bán 400,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-095",
    "name": "[COMBO] Lọ Chiết Serum 5ml/10ml Nút Nhọn - Chai Chiết Tinh Dầu 3 Nút (Nắp Nhôm + Cao Su + Nhọn) - Dụng Cụ Spa",
    "category": "decor",
    "price": 30200,
    "originalPrice": 47937,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 56,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-095.jpg",
      "/products/sp-095_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[COMBO] Lọ Chiết Serum 5ml/10ml Nút Nhọn - Chai Chiết Tinh Dầu 3 Nút (Nắp Nhôm + Cao Su + Nhọn) - Dụ",
    "desc": "[COMBO] Lọ Chiết Serum 5ml/10ml Nút Nhọn - Chai Chiết Tinh Dầu 3 Nút (Nắp Nhôm + Cao Su + Nhọn) - Dụng Cụ Spa. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-096",
    "name": "[COMBO 3 CÁI] Chai Lọ Chiết Nước Hoa Thủy Tinh Hình Trụ 3ml-30ml | Vỏ Đựng Dầu Thơm, Tinh Dầu Mini",
    "category": "decor",
    "price": 42840,
    "originalPrice": 55692,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 116,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-096.jpg",
      "/products/sp-096_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[COMBO 3 CÁI] Chai Lọ Chiết Nước Hoa Thủy Tinh Hình Trụ 3ml-30ml | Vỏ Đựng Dầu Thơm, Tinh Dầu Mini",
    "desc": "[COMBO 3 CÁI] Chai Lọ Chiết Nước Hoa Thủy Tinh Hình Trụ 3ml-30ml | Vỏ Đựng Dầu Thơm, Tinh Dầu Mini. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-097",
    "name": "Khóa lure, khóa link 2,8cm chữ U chống xoắn - Thắng Fishing",
    "category": "decor",
    "price": 12999,
    "originalPrice": 19998,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 202,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-097.jpg",
      "/products/sp-097_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Khóa lure, khóa link 2,8cm chữ U chống xoắn - Thắng Fishing",
    "desc": "Khóa lure, khóa link 2,8cm chữ U chống xoắn - Thắng Fishing. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-098",
    "name": "Cuốn cán vợt Tennis, cầu lông , pickleball V.S/ YN cao cấp, chính hãng (1 CÁI)",
    "category": "decor",
    "price": 9500,
    "originalPrice": 14500,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 129,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-098.jpg",
      "/products/sp-098_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Cuốn cán vợt Tennis, cầu lông , pickleball V.S/ YN cao cấp, chính hãng (1 CÁI)",
    "desc": "Cuốn cán vợt Tennis, cầu lông , pickleball V.S/ YN cao cấp, chính hãng (1 CÁI). Sản phẩm chính hãng chất lượng cao. Đã bán 500,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-099",
    "name": "HỦ NHỰA NÂU(1 và SET 3) 500gr / 300g / 250g / 200g / 100g ( SEAL LÓT TỰ DÍNH )  - Hủ Nâu nắp Đen đựng kem, Chiết Mỹ phẩm",
    "category": "decor",
    "price": 9000,
    "originalPrice": 14000,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 41,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-099.jpg",
      "/products/sp-099_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "HỦ NHỰA NÂU(1 và SET 3) 500gr / 300g / 250g / 200g / 100g ( SEAL LÓT TỰ DÍNH )  - Hủ Nâu nắp Đen đựn",
    "desc": "HỦ NHỰA NÂU(1 và SET 3) 500gr / 300g / 250g / 200g / 100g ( SEAL LÓT TỰ DÍNH )  - Hủ Nâu nắp Đen đựng kem, Chiết Mỹ phẩm. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-100",
    "name": "Ô dù che mưa đi nắng TA Store mở tự động gấp nhỏ gọn cầm tay 2 chiều cỡ lớn",
    "category": "decor",
    "price": 62000,
    "originalPrice": 124000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 150,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-100.jpg",
      "/products/sp-100_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Ô dù che mưa đi nắng TA Store mở tự động gấp nhỏ gọn cầm tay 2 chiều cỡ lớn",
    "desc": "Ô dù che mưa đi nắng TA Store mở tự động gấp nhỏ gọn cầm tay 2 chiều cỡ lớn. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-101",
    "name": "Dây nhảy thể dục tốc độ giảm cân đốt mỡ bụng lõi thép có tạ 2.9m tập thể lực gym tại nhà fashion86",
    "category": "decor",
    "price": 44150,
    "originalPrice": 74831,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 91,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-101.jpg",
      "/products/sp-101_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Dây nhảy thể dục tốc độ giảm cân đốt mỡ bụng lõi thép có tạ 2.9m tập thể lực gym tại nhà fashion86",
    "desc": "Dây nhảy thể dục tốc độ giảm cân đốt mỡ bụng lõi thép có tạ 2.9m tập thể lực gym tại nhà fashion86. Sản phẩm chính hãng chất lượng cao. Đã bán 400,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-102",
    "name": "Băng Keo Thể Thao Nano Quấn Cơ Đá Bóng Tránh Chấn Thương Bảo Vệ Cổ Tay Chân Đầu Gối Tenis Cầu Lông",
    "category": "decor",
    "price": 19700,
    "originalPrice": 35179,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 132,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-102.jpg",
      "/products/sp-102_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Băng Keo Thể Thao Nano Quấn Cơ Đá Bóng Tránh Chấn Thương Bảo Vệ Cổ Tay Chân Đầu Gối Tenis Cầu Lông",
    "desc": "Băng Keo Thể Thao Nano Quấn Cơ Đá Bóng Tránh Chấn Thương Bảo Vệ Cổ Tay Chân Đầu Gối Tenis Cầu Lông. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-103",
    "name": "ICON Dù Gấp Tự Động 2 Chiều8 24 Xương UV Sunscreen Automatic Umbrella Retractable Folding Umbrella",
    "category": "decor",
    "price": 54268,
    "originalPrice": 90447,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 86,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-103.jpg",
      "/products/sp-103_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "ICON Dù Gấp Tự Động 2 Chiều8 24 Xương UV Sunscreen Automatic Umbrella Retractable Folding Umbrella",
    "desc": "ICON Dù Gấp Tự Động 2 Chiều8 24 Xương UV Sunscreen Automatic Umbrella Retractable Folding Umbrella. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-104",
    "name": "Dây Kháng Lực Dây Mini Band Aolikes Tập Mông Tập Chân Tập Tay Bóng Đá",
    "category": "decor",
    "price": 125000,
    "originalPrice": 150602,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 128,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-104.jpg",
      "/products/sp-104_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Dây Kháng Lực Dây Mini Band Aolikes Tập Mông Tập Chân Tập Tay Bóng Đá",
    "desc": "Dây Kháng Lực Dây Mini Band Aolikes Tập Mông Tập Chân Tập Tay Bóng Đá. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-105",
    "name": "Lọ Chiết Nước Hoa Trụ Vuông Dài 5ml 10ml 🍁 Chai Lọ Chiết Nước Hoa Thủy Tinh Đựng Dầu Thơm Tiện Dụng",
    "category": "decor",
    "price": 9000,
    "originalPrice": 15000,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 200,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-105.jpg",
      "/products/sp-105_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Lọ Chiết Nước Hoa Trụ Vuông Dài 5ml 10ml 🍁 Chai Lọ Chiết Nước Hoa Thủy Tinh Đựng Dầu Thơm Tiện Dụng",
    "desc": "Lọ Chiết Nước Hoa Trụ Vuông Dài 5ml 10ml 🍁 Chai Lọ Chiết Nước Hoa Thủy Tinh Đựng Dầu Thơm Tiện Dụng. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-106",
    "name": "5ml 10ml 15ml 20ml 30ml 50ml 100ml Tuýp/Lọ/Chai Nhựa Chiết Mỹ Phẩm Đựng Dầu Gội Sửa Tắm Sữa Rửa Mặt",
    "category": "decor",
    "price": 29400,
    "originalPrice": 34400,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 29,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-106.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "5ml 10ml 15ml 20ml 30ml 50ml 100ml Tuýp/Lọ/Chai Nhựa Chiết Mỹ Phẩm Đựng Dầu Gội Sửa Tắm Sữa Rửa Mặt",
    "desc": "5ml 10ml 15ml 20ml 30ml 50ml 100ml Tuýp/Lọ/Chai Nhựa Chiết Mỹ Phẩm Đựng Dầu Gội Sửa Tắm Sữa Rửa Mặt. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-107",
    "name": "Hũ chiết kem, 3g, 5g, 10g, mỹ phẩm, dưỡng, hũ nhựa tròn, vuông, kim cương",
    "category": "decor",
    "price": 87683,
    "originalPrice": 113988,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 23,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-107.jpg",
      "/products/sp-107_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Hũ chiết kem, 3g, 5g, 10g, mỹ phẩm, dưỡng, hũ nhựa tròn, vuông, kim cương",
    "desc": "Hũ chiết kem, 3g, 5g, 10g, mỹ phẩm, dưỡng, hũ nhựa tròn, vuông, kim cương. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-108",
    "name": "Quấn cán vợt cầu lông , Pickleball DIYI Chính hãng , cao cấp , siêu êm siêu bám tay , thấm mồ hôi cực tốt , giá hấp dẫn",
    "category": "decor",
    "price": 9000,
    "originalPrice": 18000,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 132,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-108.jpg",
      "/products/sp-108_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quấn cán vợt cầu lông , Pickleball DIYI Chính hãng , cao cấp , siêu êm siêu bám tay , thấm mồ hôi cự",
    "desc": "Quấn cán vợt cầu lông , Pickleball DIYI Chính hãng , cao cấp , siêu êm siêu bám tay , thấm mồ hôi cực tốt , giá hấp dẫn. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-109",
    "name": "Dây miniband Aolikes kháng lực tập gym chân mông tay đùi cao su đàn hồi nam nữ",
    "category": "decor",
    "price": 150000,
    "originalPrice": 230769,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 184,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-109.jpg",
      "/products/sp-109_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Dây miniband Aolikes kháng lực tập gym chân mông tay đùi cao su đàn hồi nam nữ",
    "desc": "Dây miniband Aolikes kháng lực tập gym chân mông tay đùi cao su đàn hồi nam nữ. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-110",
    "name": "Quấn cán vợt cầu lông WHiZZ nội địa trung mềm mại bám tay , thấm mồ hôi",
    "category": "decor",
    "price": 9000,
    "originalPrice": 18750,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 98,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-110.jpg",
      "/products/sp-110_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Quấn cán vợt cầu lông WHiZZ nội địa trung mềm mại bám tay , thấm mồ hôi",
    "desc": "Quấn cán vợt cầu lông WHiZZ nội địa trung mềm mại bám tay , thấm mồ hôi. Sản phẩm chính hãng chất lượng cao. Đã bán 400,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-111",
    "name": "Băng keo thể thao, băng quấn cổ chân giày đá bóng quấn cổ tay cao su non tự dính đá bóng y tế chống chấn thương",
    "category": "decor",
    "price": 120000,
    "originalPrice": 150000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 123,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-111.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Băng keo thể thao, băng quấn cổ chân giày đá bóng quấn cổ tay cao su non tự dính đá bóng y tế chống ",
    "desc": "Băng keo thể thao, băng quấn cổ chân giày đá bóng quấn cổ tay cao su non tự dính đá bóng y tế chống chấn thương. Sản phẩm chính hãng chất lượng cao. Đã bán 800,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-112",
    "name": "Túi Đựng Giày Dép Dây Rút(C243) Bảo Quản Khỏi Bụi Bẩn, Côn Trùng, Chống Thấm Nước (Màu Trắng)",
    "category": "decor",
    "price": 16050,
    "originalPrice": 22929,
    "rating": 4.5,
    "reviewsCount": 9999,
    "stock": 192,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-112.jpg",
      "/products/sp-112_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Túi Đựng Giày Dép Dây Rút(C243) Bảo Quản Khỏi Bụi Bẩn, Côn Trùng, Chống Thấm Nước (Màu Trắng)",
    "desc": "Túi Đựng Giày Dép Dây Rút(C243) Bảo Quản Khỏi Bụi Bẩn, Côn Trùng, Chống Thấm Nước (Màu Trắng). Sản phẩm chính hãng chất lượng cao. Đã bán 300,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-113",
    "name": "[COMBO 10 CÁI] Chai Lọ Chiết Serum Mỏng 1ml-5ml | Lọ Thủy Tinh Mini Đựng Tinh Dầu, Nước Hoa, Tinh Chất, Vỏ Chiết Mỹ Phẩm",
    "category": "decor",
    "price": 56260,
    "originalPrice": 73138,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 198,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": true,
    "images": [
      "/products/sp-113.jpg",
      "/products/sp-113_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "[COMBO 10 CÁI] Chai Lọ Chiết Serum Mỏng 1ml-5ml | Lọ Thủy Tinh Mini Đựng Tinh Dầu, Nước Hoa, Tinh Ch",
    "desc": "[COMBO 10 CÁI] Chai Lọ Chiết Serum Mỏng 1ml-5ml | Lọ Thủy Tinh Mini Đựng Tinh Dầu, Nước Hoa, Tinh Chất, Vỏ Chiết Mỹ Phẩm. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-114",
    "name": "(SỈ 10) Chai Nhựa Xịt Phun Sương 5ml/10ml/15ml/30ml/50ml/100ml/250ml Chiết Nước Hoa/Toner/Travel",
    "category": "decor",
    "price": 35000,
    "originalPrice": 42169,
    "rating": 4.6,
    "reviewsCount": 9999,
    "stock": 21,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-114.jpg",
      "/products/sp-114_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "(SỈ 10) Chai Nhựa Xịt Phun Sương 5ml/10ml/15ml/30ml/50ml/100ml/250ml Chiết Nước Hoa/Toner/Travel",
    "desc": "(SỈ 10) Chai Nhựa Xịt Phun Sương 5ml/10ml/15ml/30ml/50ml/100ml/250ml Chiết Nước Hoa/Toner/Travel. Sản phẩm chính hãng chất lượng cao. Đã bán 500,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-115",
    "name": "Túi chiết mỹ phẩm du lịch đựng dầu gội, dầu xã, sữa tắm tiện lợi có thể tái sử dụng",
    "category": "decor",
    "price": 9000,
    "originalPrice": 14000,
    "rating": 4.9,
    "reviewsCount": 9999,
    "stock": 19,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-115.jpg",
      "/products/sp-115_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Túi chiết mỹ phẩm du lịch đựng dầu gội, dầu xã, sữa tắm tiện lợi có thể tái sử dụng",
    "desc": "Túi chiết mỹ phẩm du lịch đựng dầu gội, dầu xã, sữa tắm tiện lợi có thể tái sử dụng. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-116",
    "name": "Lọ đựng serum thủy tinh trong nắp bóp trắng 5ml/10ml/15ml/20ml/30ml/50ml/100ml [Giá sỉ/lẻ]",
    "category": "decor",
    "price": 9000,
    "originalPrice": 14000,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 160,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-116.jpg",
      "/products/sp-116_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Lọ đựng serum thủy tinh trong nắp bóp trắng 5ml/10ml/15ml/20ml/30ml/50ml/100ml [Giá sỉ/lẻ]",
    "desc": "Lọ đựng serum thủy tinh trong nắp bóp trắng 5ml/10ml/15ml/20ml/30ml/50ml/100ml [Giá sỉ/lẻ]. Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-117",
    "name": "Chai nhựa xịt phun sương trắng 30ml/50ml/100ml nhựa PET cứng [Giá Sỉ/Lẻ]",
    "category": "decor",
    "price": 26000,
    "originalPrice": 33800,
    "rating": 4.8,
    "reviewsCount": 9999,
    "stock": 104,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-117.jpg",
      "/products/sp-117_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Chai nhựa xịt phun sương trắng 30ml/50ml/100ml nhựa PET cứng [Giá Sỉ/Lẻ]",
    "desc": "Chai nhựa xịt phun sương trắng 30ml/50ml/100ml nhựa PET cứng [Giá Sỉ/Lẻ]. Sản phẩm chính hãng chất lượng cao. Đã bán 100,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-118",
    "name": "10 Hủ pét (nhôm Vàng + bạc + hồng) + nắp nhựa đủ màu",
    "category": "decor",
    "price": 55000,
    "originalPrice": 61111,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 168,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-118.jpg",
      "/products/sp-118_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "10 Hủ pét (nhôm Vàng + bạc + hồng) + nắp nhựa đủ màu",
    "desc": "10 Hủ pét (nhôm Vàng + bạc + hồng) + nắp nhựa đủ màu. Sản phẩm chính hãng chất lượng cao. Đã bán 300,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-119",
    "name": "Ô dù chất lượng cao 8-Rib - Mở / Đóng một chạm, Thiết kế có thể gập lại nhỏ gọn dành cho nam và nữ, Đen hải quân",
    "category": "decor",
    "price": 120225,
    "originalPrice": 136619,
    "rating": 4.7,
    "reviewsCount": 9999,
    "stock": 113,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-119.jpg",
      "/products/sp-119_2.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "Ô dù chất lượng cao 8-Rib - Mở / Đóng một chạm, Thiết kế có thể gập lại nhỏ gọn dành cho nam và nữ, ",
    "desc": "Ô dù chất lượng cao 8-Rib - Mở / Đóng một chạm, Thiết kế có thể gập lại nhỏ gọn dành cho nam và nữ, Đen hải quân. Sản phẩm chính hãng chất lượng cao. Đã bán 900,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  },
  {
    "id": "sp-120",
    "name": "🍓GINGER SHOTS🍎 Chai thủy tinh TRONG nắp vặn ĐEN 5ml 10ml 15ml 20ml 30ml 50ml 100ml - Lọ đựng chiết GINGER SHOTS, serum",
    "category": "decor",
    "price": 9000,
    "originalPrice": 14000,
    "rating": 4.4,
    "reviewsCount": 9999,
    "stock": 72,
    "isFeatured": false,
    "isNew": false,
    "isFlashSale": false,
    "images": [
      "/products/sp-120.jpg"
    ],
    "variants": {
      "colors": [
        "Đen",
        "Trắng",
        "Xanh Navy"
      ],
      "sizes": [
        "S",
        "M",
        "L",
        "XL"
      ]
    },
    "shortDesc": "🍓GINGER SHOTS🍎 Chai thủy tinh TRONG nắp vặn ĐEN 5ml 10ml 15ml 20ml 30ml 50ml 100ml - Lọ đựng chiết",
    "desc": "🍓GINGER SHOTS🍎 Chai thủy tinh TRONG nắp vặn ĐEN 5ml 10ml 15ml 20ml 30ml 50ml 100ml - Lọ đựng chiết GINGER SHOTS, serum... Sản phẩm chính hãng chất lượng cao. Đã bán 200,000+ sản phẩm.",
    "specs": {
      "Xuất xứ": "Việt Nam",
      "Tình trạng": "Mới 100%"
    },
    "tags": [
      "decor",
      "shopee",
      "chính hãng"
    ],
    "reviews": []
  }
];

export const INITIAL_COUPONS = [
  { id:"c-1", code:"TIEMMOI", discountPercent:0, discountAmount:20000, minOrderValue:100000, description:"Giảm 20.000đ cho đơn từ 100.000đ", isActive:true },
  { id:"c-2", code:"GIAM10", discountPercent:10, discountAmount:0, minOrderValue:200000, description:"Giảm 10% cho đơn từ 200.000đ", isActive:true },
  { id:"c-3", code:"FREESHIP", discountPercent:0, discountAmount:30000, minOrderValue:0, description:"Miễn phí vận chuyển (tối đa 30.000đ)", isActive:true },
  { id:"c-4", code:"VIP50", discountPercent:0, discountAmount:50000, minOrderValue:400000, description:"Giảm 50.000đ cho đơn từ 400.000đ", isActive:true }
];

export const INITIAL_ORDERS = [
  {
    id:"ORD-9281", createdAt:"2026-09-02T14:30:00.000Z",
    customer:{name:"Trần Minh Hoàng",phone:"0912 345 678",address:"15 Lê Duẩn, Q.1, TP.HCM",notes:"Giao giờ hành chính"},
    items:[
      {productId:"sp-03",name:"Nến Thơm Tinh Dầu Sáp Đậu Nành Hũ Gốm",price:185000,quantity:2,variant:"Trầm Hương & Gỗ Đàn",image:"https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=80"},
      {productId:"sp-04",name:"Ly Gốm Men Lam Bát Tràng",price:95000,quantity:2,variant:"Men Lam Xanh",image:"https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80"}
    ],
    subtotal:560000,shippingFee:0,discount:50000,couponCode:"VIP50",total:510000,
    paymentMethod:"vietqr",paymentStatus:"paid",orderStatus:"shipping",
    trackingCarrier:"GHTK",trackingCode:"GHTK-98218732"
  },
  {
    id:"ORD-7412", createdAt:"2026-09-03T09:15:00.000Z",
    customer:{name:"Nguyễn Thu Hà",phone:"0978 889 990",address:"Vinhomes Ocean Park, Gia Lâm, Hà Nội",notes:"Để bảo vệ sảnh"},
    items:[
      {productId:"sp-01",name:"Áo Sơ Mi Linen Cổ Tàu Form Rộng",price:280000,quantity:1,variant:"Trắng Be / Size M",image:"https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80"}
    ],
    subtotal:280000,shippingFee:30000,discount:20000,couponCode:"TIEMMOI",total:290000,
    paymentMethod:"cod",paymentStatus:"pending",orderStatus:"processing",
    trackingCarrier:"Viettel Post",trackingCode:"VP-482019"
  }
];

export const INITIAL_CHAT_MESSAGES = [
  {
    id:"msg-1", sender:"bot",
    text:"Chào bạn thân mến! Em là **Trợ lý AI của Tiệm Nhà Nhỏ** 🌿\n\nEm có thể hỗ trợ bạn:\n- 🎁 **Tư vấn & gợi ý sản phẩm** theo ngân sách hoặc sở thích\n- 📦 **Tra cứu đơn hàng** đang giao\n- 🏷️ **Cung cấp mã giảm giá & chính sách** freeship, đổi trả\n- 💬 **Kết nối trực tiếp chủ shop qua Zalo / Hotline**\n\nBạn đang muốn tìm món đồ gì hôm nay ạ?",
    products:[], vouchers:[], timestamp:new Date().toISOString()
  }
];
