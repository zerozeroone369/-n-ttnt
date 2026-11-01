import { STORE_INFO } from '../data/initialData.js';
import { StorageService } from './storage.js';

/**
 * Format price in Vietnamese Dong
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const isProductInStock = (product) => product && Number(product.stock) > 0;

export const getInStockProducts = (products = []) => products.filter(isProductInStock);

export const getOrdersForUser = (orders = [], currentUser) => {
  if (currentUser?.role === 'admin' || currentUser?.role === 'staff') return orders;
  if (!currentUser) return [];

  const userEmail = currentUser.email?.toLowerCase();
  return orders.filter(order =>
    order.customerId === currentUser.id ||
    (userEmail && order.customer?.email?.toLowerCase() === userEmail) ||
    (currentUser.phone && order.customer?.phone === currentUser.phone)
  );
};

const isOrderLookupQuery = (text, normalized) =>
  /ORD-\d{4}/i.test(text) ||
  normalized.includes('don hang') ||
  normalized.includes('don gan nhat') ||
  normalized.includes('don cua toi') ||
  normalized.includes('tra cuu don') ||
  normalized.includes('kiem tra don') ||
  normalized.includes('tinh trang don');

const productSearchText = (product) => removeVietnameseTones(
  `${product.name || ''} ${product.category || ''} ${product.shortDesc || ''} ${product.desc || ''} ${(product.tags || []).join(' ')}`
);

const productIdentityText = (product) => removeVietnameseTones(
  `${product.name || ''} ${product.category || ''} ${(product.tags || []).join(' ')}`
);

const findInStockProductsByTerms = (products, terms, limit = 4) => {
  const normalizedTerms = terms.map(removeVietnameseTones);
  return getInStockProducts(products)
    .filter(product => normalizedTerms.some(term => productContainsTerm(product, term)))
    .slice(0, limit);
};

const formatProductLine = (product) => {
  const price = formatCurrency(product.price);
  const origPrice = product.originalPrice && product.originalPrice > product.price
    ? ` ~~${formatCurrency(product.originalPrice)}~~` : '';
  const discount = product.originalPrice && product.originalPrice > product.price
    ? ` (-${Math.round((1 - product.price / product.originalPrice) * 100)}%)`  : '';
  return `• **${product.name}** — ${price}${origPrice}${discount} | Còn ${Number(product.stock)} sản phẩm`;
};

const formatProductSpecs = (product) => Object.entries(product?.specs || {})
  .map(([label, value]) => `• **${label}:** ${value}`)
  .join('\n');

const SEARCH_STOP_WORDS = new Set([
  'toi', 'minh', 'muon', 'tim', 'san', 'pham', 'co', 'nao', 'cho', 'ban',
  'mot', 'mon', 'do', 'hang', 'can', 'dang', 'giup', 'tu', 'van'
]);

const productContainsTerm = (product, term) => {
  const normalizedTerm = removeVietnameseTones(term);
  const normalizedProduct = productIdentityText(product);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(' ')) return normalizedProduct.includes(normalizedTerm);
  return normalizedProduct.split(/\s+/).includes(normalizedTerm);
};

/**
 * Normalize Vietnamese text (remove accents and lowercase)
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Safety Guardrail: Only filter truly harmful or illegal content
 */
function isOutOfDomain(text, lower, normalized) {
  const harmfulPatterns = [
    /\b(?:che tao vu khi|bom tu che|thuoc no|ma tuy|chat gay nghien|tu tu|xam hai|khung bo)\b/i
  ];

  for (const regex of harmfulPatterns) {
    if (regex.test(normalized)) {
      return true;
    }
  }

  // Allow all open conversation, lifestyle advice, styling, gifting, decor, general topics!
  return false;
}

/**
 * Parse budget from text
 */
function extractBudget(text, normalized) {
  const kMatch = normalized.match(/(?:duoi|tam|khoang|<|nho hon|tam muc|duoi gia)\s*(\d+)\s*(?:k|nghin|ngan)/i);
  if (kMatch) return parseInt(kMatch[1], 10) * 1000;

  const kOnlyMatch = normalized.match(/(?:gia|ngan sach|tam|khoang)\s*(\d+)\s*k\b/i);
  if (kOnlyMatch) return parseInt(kOnlyMatch[1], 10) * 1000;

  const numMatch = normalized.match(/(?:duoi|tam|khoang|<)\s*(\d{1,3}(?:\.\d{3})+|\d{4,9})/i);
  if (numMatch) return parseInt(numMatch[1].replace(/\./g, ''), 10);

  const trieuMatch = normalized.match(/(?:duoi|tam|khoang|<)\s*(\d+(?:\.\d+)?)\s*(?:trieu|tr)/i);
  if (trieuMatch) return parseFloat(trieuMatch[1]) * 1000000;

  return null;
}

function extractBudgetRange(text, normalized) {
  const rangeMatch = normalized.match(/(?:tu|từ)\s*(\d+)\s*(?:k|nghin|ngan)\s*(?:den|toi)\s*(\d+)\s*(?:k|nghin|ngan)/i);
  if (rangeMatch) {
    return {
      min: parseInt(rangeMatch[1], 10) * 1000,
      max: parseInt(rangeMatch[2], 10) * 1000
    };
  }

  const max = extractBudget(text, normalized);
  return max === null ? null : { min: 0, max };
}

/**
 * Detect Height & Weight for Clothing Sizing
 */
function extractBodyMeasurements(text, normalized) {
  let height = null;
  let weight = null;

  const hMatch1 = normalized.match(/(\d)\s*m\s*(\d{1,2})/i);
  if (hMatch1) {
    const m = parseInt(hMatch1[1], 10);
    const cmStr = hMatch1[2].padEnd(2, '0');
    height = m * 100 + parseInt(cmStr, 10);
  } else {
    const hMatch2 = normalized.match(/cao\s*(\d{2,3})\s*(?:cm)?/i);
    if (hMatch2) {
      const hVal = parseInt(hMatch2[1], 10);
      if (hVal >= 140 && hVal <= 210) height = hVal;
    }
  }

  const wMatch = normalized.match(/(\d{2,3})\s*(?:kg|ki|ky)\b/i) || normalized.match(/nang\s*(\d{2,3})/i);
  if (wMatch) {
    const wVal = parseInt(wMatch[1], 10);
    if (wVal >= 35 && wVal <= 140) weight = wVal;
  }

  return { height, weight };
}

// ============================================================================
// PILLAR 1: NEED ANALYSIS & CUSTOMER PROFILING (Khảo sát nhu cầu 4 bước)
// ============================================================================
export const NEED_ANALYSIS_STEPS = [
  {
    id: 'purpose',
    stepNumber: 1,
    title: '1. Bạn đang tìm kiếm món đồ cho mục đích gì?',
    subtitle: 'Chọn mục đích chính để Tiệm định hướng dòng sản phẩm phù hợp',
    options: [
      { id: 'self', label: 'Mua cho bản thân 🌿', desc: 'Sử dụng hằng ngày, thư giãn tinh thần' },
      { id: 'gift', label: 'Quà tặng người thương / bạn bè 🎁', desc: 'Sinh nhật, kỷ niệm, ngày lễ đặc biệt' },
      { id: 'decor', label: 'Trang trí không gian sống 🏡', desc: 'Phòng ngủ, bàn làm việc, tân gia' },
      { id: 'fashion', label: 'Thời trang & Phụ kiện cá nhân 👕', desc: 'Áo linen thoáng mát, túi tote, ví da' },
      { id: 'coffee', label: 'Thưởng trà & Cà phê sáng ☕', desc: 'Cà phê đặc sản, ly gốm Bát Tràng' }
    ]
  },
  {
    id: 'recipient',
    stepNumber: 2,
    title: '2. Món đồ này dự định dành tặng cho ai?',
    subtitle: 'Gu thẩm mỹ sẽ được tinh chỉnh chuẩn xác theo từng đối tượng',
    options: [
      { id: 'myself', label: 'Dành cho chính mình ✨', desc: 'Tự thưởng món quà yêu thương bản thân' },
      { id: 'female', label: 'Bạn gái / Vợ / Chị em gái 🌸', desc: 'Tinh tế, hương thơm thư giãn, dịu dàng' },
      { id: 'male', label: 'Bạn trai / Chồng / Nam giới 🕶️', desc: 'Đĩnh đạc, mộc mạc, bền bỉ theo thời gian' },
      { id: 'parents', label: 'Bố mẹ / Người lớn tuổi 🍵', desc: 'Ấm cúng, an yên, đồ gốm và sức khỏe' },
      { id: 'colleague', label: 'Đồng nghiệp / Sếp / Đối tác 🤝', desc: 'Trang nhã, lịch sự, đóng hộp sang trọng' }
    ]
  },
  {
    id: 'budget',
    stepNumber: 3,
    title: '3. Khoảng ngân sách dự kiến của bạn?',
    subtitle: 'Tiệm có đầy đủ các lựa chọn từ món nhỏ xinh đến set quà cao cấp',
    options: [
      { id: 'under200', label: 'Dưới 200.000đ', max: 200000, desc: 'Ly gốm men lam, khay gỗ sồi, hạt điều rang củi' },
      { id: '200to500', label: '200.000đ - 500.000đ', min: 200000, max: 500000, desc: 'Nến thơm tinh dầu, sơ mi linen, ví da bò sáp, cà phê' },
      { id: '500to1m', label: '500.000đ - 1.000.000đ', min: 500000, max: 1000000, desc: 'Đèn bàn gỗ Bắc Âu, loa bluetooth, bàn phím retro' },
      { id: 'over1m', label: 'Trên 1.000.000đ', min: 1000000, desc: 'Combo quà tặng thủ công trọn bộ đặc biệt' }
    ]
  },
  {
    id: 'style',
    stepNumber: 4,
    title: '4. Phong cách thẩm mỹ yêu thích?',
    subtitle: 'Tạo cảm xúc đồng điệu và bất ngờ nhất khi mở hộp',
    options: [
      { id: 'rustic', label: 'Mộc mạc & Tối giản (Rustic/Vintage) 🪵', desc: 'Gỗ sồi, gốm men hỏa biến, tone màu ấm tự nhiên' },
      { id: 'elegant', label: 'Thanh lịch & Tinh tế 🌿', desc: 'Chất vải linen bột, form suông nhẹ, tối giản hiện đại' },
      { id: 'cozy', label: 'Ấm cúng & Thư giãn tâm hồn 🕯️', desc: 'Hương thơm hoa cỏ, ánh sáng vàng dịu êm ái' },
      { id: 'modern', label: 'Hiện đại & Tiện ích công nghệ ⌨️', desc: 'Bàn phím cơ, loa gỗ, phụ kiện góc làm việc' }
    ]
  }
];

export const NeedAnalysisEngine = {
  analyze(answers, products) {
    const { purpose, recipient, budget, style } = answers;

    // 1. Determine Customer Persona Title & Description
    let personaTitle = "Người Yêu Sự Tinh Tế & Phong Cách Sống Chậm";
    let personaDesc = "Bạn trân trọng những giá trị thủ công bền bỉ, yêu thích không gian sống an yên và tìm kiếm những món đồ có câu chuyện riêng biệt.";

    if (purpose === 'gift') {
      if (recipient === 'female') {
        personaTitle = "Nhà Trao Gửi Yêu Thương Tinh Tế (Quà Tặng Phái Đẹp)";
        personaDesc = "Ưu tiên hàng đầu của bạn là mang đến sự bất ngờ, cảm giác được nâng niu và hương thơm thư giãn ngọt ngào cho người phụ nữ bạn trân quý.";
      } else if (recipient === 'male') {
        personaTitle = "Gu Chọn Quà Đĩnh Đạc & Thực Tế (Quà Cho Phái Mạnh)";
        personaDesc = "Bạn chú trọng chất lượng nguyên bản, độ bền theo năm tháng và phong cách tối giản nam tính, tiện dụng trong công việc hằng ngày.";
      } else if (recipient === 'parents') {
        personaTitle = "Món Quà Hiếu Nghĩa & Ấm Áp Gia Đình";
        personaDesc = "Bạn hướng đến những món đồ mộc mạc, an toàn cho sức khỏe và gợi nhắc không khí sum vầy, an yên bên tách trà ấm.";
      } else {
        personaTitle = "Bộ Quà Doanh Nghiệp & Đối Tác Sang Trọng";
        personaDesc = "Bạn tìm kiếm sự chỉn chu, lịch thiệp với tính ứng dụng cao, đóng gói trang nhã thể hiện uy tín và sự tôn trọng.";
      }
    } else if (purpose === 'decor') {
      personaTitle = "Kiến Tạo Không Gian Sống Chữa Lành (Cozy Living)";
      personaDesc = "Bạn mong muốn biến ngôi nhà thành tổ ấm bình yên sau ngày dài mệt mỏi với ánh sáng vàng dịu, mùi hương gỗ thông và đồ thủ công mộc mạc.";
    } else if (purpose === 'fashion') {
      personaTitle = "Tín Đồ Thời Trang Bền Vững & Tối Giản (Minimal Fashion)";
      personaDesc = "Bạn yêu thích chất liệu thuần tự nhiên như sợi linen thoáng mát, da bò sáp mộc mạc tôn lên nét thanh lịch không phô trương.";
    }

    // 2. Score and curate products
    const scoredProducts = getInStockProducts(products).map(p => {
      let score = 82;
      let reasons = [];

      // Budget match
      if (budget === 'under200') {
        if (p.price <= 200000) {
          score += 10;
          reasons.push(`Giá ${formatCurrency(p.price)} vừa vặn mức ngân sách tiết kiệm`);
        } else {
          score -= 15;
        }
      } else if (budget === '200to500') {
        if (p.price >= 180000 && p.price <= 500000) {
          score += 12;
          reasons.push(`Mức giá ${formatCurrency(p.price)} cân đối ngân sách 200k - 500k`);
        }
      } else if (budget === '500to1m') {
        if (p.price >= 450000 && p.price <= 1000000) {
          score += 14;
          reasons.push(`Thuộc phân khúc cao cấp xứng tầm ngân sách`);
        }
      }

      // Purpose & Recipient affinity
      const productText = productSearchText(p);
      if (purpose === 'gift' && (recipient === 'female' || recipient === 'colleague')) {
        if (p.category === 'decor' || productText.includes('qua tang') || productText.includes('tote')) {
          score += 12;
          reasons.push("Được hơn 95% khách nữ yêu thích nhờ hương thơm & tính thẩm mỹ cao");
        }
      } else if (purpose === 'gift' && recipient === 'male') {
        if (p.category === 'tech' || p.category === 'coffee' || productText.includes('nam') || productText.includes('da bo')) {
          score += 12;
          reasons.push("Chất da sáp/công nghệ phong cách nam tính, bền bỉ theo thời gian");
        }
      } else if (purpose === 'decor' || style === 'cozy') {
        if (p.category === 'decor' || productText.includes('thu gian')) {
          score += 10;
          reasons.push("Ánh sáng & mùi hương giúp thanh lọc không khí, tạo cảm giác thư giãn");
        }
      } else if (purpose === 'fashion' || style === 'elegant') {
        if (p.category === 'fashion') {
          score += 10;
          reasons.push("Chất vải tự nhiên và da bò thật, form dáng tối giản thanh lịch");
        }
      } else if (purpose === 'coffee') {
        if (p.category === 'coffee' || productText.includes('gom')) {
          score += 12;
          reasons.push("Chuẩn vị cà phê Cầu Đất nguyên bản kết hợp ly gốm Bát Tràng");
        }
      }

      // Clamp score
      const finalScore = Math.min(99, Math.max(88, score));
      const reasonText = reasons.length > 0 
        ? reasons.join(' • ') 
        : `Phù hợp với tiêu chí ${p.name.toLowerCase()} và phong cách của bạn`;

      return {
        ...p,
        matchScore: finalScore,
        matchReason: reasonText
      };
    });

    // Sort by match score descending
    scoredProducts.sort((a, b) => b.matchScore - a.matchScore);
    const topCurated = scoredProducts.slice(0, 3);

    return {
      personaTitle,
      personaDesc,
      curatedProducts: topCurated
    };
  }
};

// ============================================================================
// PILLAR 2: IN-CHAT ORDERING ASSISTANT (Hỗ trợ đặt hàng trực tiếp trong Chat)
// ============================================================================
export const OrderingAssistantEngine = {
  /**
   * Parse natural language for order creation intent
   */
  parseOrderIntent(text, products) {
    const lower = text.toLowerCase();
    const normalized = removeVietnameseTones(text);

    const orderKeywords = ["dat hang", "dat mua", "mua hang", "cho minh dat", "lay cho minh", "mua giup", "ship cho", "mua ngay", "dat ngay", "order"];
    const hasOrderTrigger = orderKeywords.some(k => normalized.includes(k));

    if (!hasOrderTrigger && !normalized.startsWith("mua") && !normalized.startsWith("dat")) {
      return null;
    }

    // Try matching product
    let targetProduct = null;
    for (const p of getInStockProducts(products)) {
      const pNorm = removeVietnameseTones(p.name);
      if (normalized.includes(pNorm) || (p.tags && p.tags.some(t => normalized.includes(removeVietnameseTones(t))))) {
        targetProduct = p;
        break;
      }
    }

    if (!targetProduct) {
      // Check common categories
      if (normalized.includes("ao") || normalized.includes("linen")) targetProduct = findInStockProductsByTerms(products, ['ao', 'linen'], 1)[0];
      else if (normalized.includes("nen")) targetProduct = findInStockProductsByTerms(products, ['nen'], 1)[0];
      else if (normalized.includes("vi da") || normalized.includes("vi nam")) targetProduct = findInStockProductsByTerms(products, ['vi da', 'bop'], 1)[0];
      else if (normalized.includes("ly") || normalized.includes("coc")) targetProduct = findInStockProductsByTerms(products, ['ly', 'coc', 'gom'], 1)[0];
      else if (normalized.includes("ca phe")) targetProduct = findInStockProductsByTerms(products, ['ca phe', 'coffee'], 1)[0];
      else if (normalized.includes("ban phim")) targetProduct = findInStockProductsByTerms(products, ['ban phim', 'keyboard'], 1)[0];
      else if (normalized.includes("den")) targetProduct = findInStockProductsByTerms(products, ['den'], 1)[0];
    }

    if (!targetProduct) {
      return null;
    }

    // Parse quantity
    let quantity = 1;
    const qtyMatch = normalized.match(/(?:so luong|sl|lay|mua)\s*(\d+)/) || normalized.match(/(\d+)\s*(?:cai|chiec|hu|hop|chiec|bo)/);
    if (qtyMatch) {
      quantity = Math.max(1, parseInt(qtyMatch[1], 10));
    }

    // Parse variant (size / color)
    let variant = 'Mặc định';
    if (targetProduct.variants) {
      if (targetProduct.variants.sizes) {
        const sizeMatch = normalized.match(/\b(size\s*[smlx]{1,2}|s|m|l|xl)\b/i);
        if (sizeMatch) {
          const rawSize = sizeMatch[0].replace(/size\s*/i, '').toUpperCase();
          if (targetProduct.variants.sizes.includes(rawSize)) {
            variant = `Size ${rawSize}`;
          }
        }
      }
      if (variant === 'Mặc định' && targetProduct.variants.colors && targetProduct.variants.colors.length > 0) {
        variant = targetProduct.variants.colors[0];
      }
    }

    // Parse phone number if provided
    let phone = '';
    const phoneMatch = text.match(/(?:0|\+84)(?:3|5|7|8|9)\d{8}\b/);
    if (phoneMatch) phone = phoneMatch[0];

    // Build Order Draft
    return this.buildOrderDraft(targetProduct, variant, Math.min(quantity, Number(targetProduct.stock)), { phone });
  },

  /**
   * Build structured in-chat draft order
   */
  buildOrderDraft(product, variant = 'Mặc định', quantity = 1, customer = {}, coupon = null) {
    if (!isProductInStock(product)) return null;
    quantity = Math.min(Math.max(1, Number(quantity) || 1), Number(product.stock));
    const unitPrice = product.price;
    const subtotal = unitPrice * quantity;
    const isFreeship = subtotal >= STORE_INFO.freeshipThreshold;
    const shippingFee = isFreeship ? 0 : STORE_INFO.standardShippingFee;

    let discount = 0;
    if (coupon) {
      if (coupon.type === 'percent') {
        discount = Math.round((subtotal * coupon.discountPercent) / 100);
      } else if (coupon.discountAmount) {
        discount = coupon.discountAmount;
      }
    }

    const total = Math.max(0, subtotal - discount + shippingFee);

    return {
      isDraft: true,
      items: [
        {
          id: product.id,
          name: product.name,
          price: unitPrice,
          image: product.images[0],
          variant,
          quantity
        }
      ],
      subtotal,
      shippingFee,
      discount,
      total,
      appliedCoupon: coupon,
      customer: {
        name: customer.name || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || 'Hà Nội'
      },
      paymentMethod: 'cod' // or 'vietqr'
    };
  }
};

// ============================================================================
// PILLAR 3: CUSTOMER CARE & POST-SALES SUPPORT (Chăm sóc khách hàng & Hậu mãi)
// ============================================================================
export const CustomerCareEngine = {
  /**
   * Handle after-sales and customer service queries
   */
  handleQuery(text, normalized, orders, products) {
    // 1. Order Tracking by ID or phone
    const orderCodeMatch = text.match(/ORD-\d{4}/i);
    const isTracking = orderCodeMatch || normalized.includes("tra cuu don") || normalized.includes("kiem tra don") || normalized.includes("don hang cua toi") || normalized.includes("tinh trang don");

    if (isTracking) {
      let targetOrder = null;
      if (orderCodeMatch) {
        const id = orderCodeMatch[0].toUpperCase();
        targetOrder = orders.find(o => o.id.toUpperCase() === id);
      } else {
        targetOrder = orders[0];
      }

      if (targetOrder) {
        return {
          actionType: 'order_tracking',
          order: targetOrder,
          text: `📦 **Tra Cứu Tiến Độ Đơn Hàng ${targetOrder.id}:**\n\n` +
                `• **Trạng thái:** **${AIChatEngine.getStatusLabel(targetOrder.orderStatus)}**\n` +
                `• **Người nhận:** ${targetOrder.customer.name} - ${targetOrder.customer.phone}\n` +
                `• **Địa chỉ giao:** ${targetOrder.customer.address}, ${targetOrder.customer.city}\n` +
                `• **Đơn vị vận chuyển:** ${targetOrder.trackingCarrier} (Mã vận đơn: \`${targetOrder.trackingCode}\`)\n` +
                `• **Tổng thanh toán:** ${formatCurrency(targetOrder.total)} (${targetOrder.paymentStatus === 'paid' ? '✅ Đã thanh toán' : '💵 Thu hộ COD khi nhận hàng'})\n\n` +
                `Tiệm đã đính kèm thẻ tiến trình vận chuyển chi tiết bên dưới để bạn tiện theo dõi nhé! 👇`
        };
      }
    }

    // 2. Warranty, Returns & Complaints (Đổi trả 1 đổi 1 & Xử lý khiếu nại)
    const isWarranty = /\b(?:doi tra|bao hanh|hu hong|be vo|nut vo|bi vo|vo|nut me|loi san pham|hang loi|khong vua|kem chat luong|that vong|khieu nai)\b/i.test(normalized);
    if (isWarranty) {
      return {
        actionType: 'warranty_claim',
        canRequestExchange: true,
        text: `🛡️ **Chính Sách Chăm Sóc & Đổi Trả 1 Đổi 1 Tận Nhà (Cam Kết Uy Tín):**\n\n` +
              `Tiệm Nhà Nhỏ chân thành xin lỗi nếu trải nghiệm sản phẩm chưa làm bạn hài lòng 100%. Tiệm cam kết bảo vệ quyền lợi tối đa cho bạn:\n\n` +
              `1. 🔄 **Chính Sách 1 Đổi 1 Tận Nhà Trong 7 Ngày:**\n` +
              `   • Nếu sản phẩm bị vỡ hỏng do vận chuyển, lỗi đường may, nến lõm tim hoặc mặc không vừa size.\n` +
              `   • **Quy trình cực kỳ tiện lợi:** Shipper của Tiệm sẽ mang món hàng mới nguyên seal đến tận nhà giao cho bạn, đồng thời nhận lại món cũ. **Bạn không mất phí ship và không phải ra bưu cục!**\n\n` +
              `2. ⚡ **Cách Gửi Yêu Cầu Đổi Hàng Nhanh Nhất:**\n` +
              `   • Bấm vào nút **"Gửi Yêu Cầu Đổi Trả 1-Click"** hoặc nhắn Zalo trực tiếp số hotline \`${STORE_INFO.phone}\`.\n` +
              `   • Đính kèm 1 tấm ảnh hoặc video ngắn, nhân viên CSKH của Tiệm sẽ hỗ trợ bạn trong vòng 5 phút!`
      };
    }

    // 3. Craft Care Guides (Cẩm nang chăm sóc đồ thủ công)
    const isCareGuide = normalized.includes("bao quan") || normalized.includes("cach dung") || normalized.includes("cach giat") || normalized.includes("dot nen") || normalized.includes("duong da") || normalized.includes("ve sinh");
    if (isCareGuide) {
      return {
        actionType: 'care_guide',
        text: `🌿 **Cẩm Nang Chăm Sóc & Bảo Dưỡng Đồ Thủ Công Tiệm Nhà Nhỏ:**\n\n` +
              `Đồ thủ công sống cùng người dùng theo năm tháng. Dưới đây là những lưu ý quan trọng để giữ món đồ luôn bền đẹp như mới:\n\n` +
              `• 🕯️ **Nến thơm sáp đậu nành:** Đốt lần đầu 1.5 - 2 tiếng đến khi sáp tan đều sát mép hũ để chống lõm tim. Tỉa bấc gỗ 3-5mm trước mỗi lần thắp.\n` +
              `• 👕 **Áo sơ mi linen cổ tàu:** Giặt tay hoặc túi giặt nước mát, phơi trong bóng râm, ủi bằng bàn ủi hơi nước khi áo còn ẩm nhẹ để giữ thớ vải mộc.\n` +
              `• 👛 **Ví da bò sáp Crazy Horse:** Tránh ngâm nước. Khi bị trầy xước nhẹ, chỉ cần dùng đầu ngón tay xoa tròn hoặc thoa sáp dưỡng chuyên dụng là vết xước tự biến mất.\n` +
              `• 🍵 **Ly gốm men lam Bát Tràng:** Nung 1.300°C an toàn lò vi sóng & máy rửa bát. Tránh va đập góc cạnh nhọn.`
      };
    }

    return null;
  }
};

/**
 * Supercharged GPT-3 Caliber AI Sales & Business Advisory Engine
 */
export const AIChatEngine = {
  /**
   * Process a user message and return assistant reply
   */
  async processMessage(userMessage, currentProducts, currentOrders, currentUser) {
    const text = userMessage.trim();
    const lower = text.toLowerCase();
    const normalized = removeVietnameseTones(text);
    const settings = StorageService.getSettings();
    const accessibleOrders = getOrdersForUser(currentOrders, currentUser);
    const orderCodeMatch = text.match(/ORD-\d{4}/i);

    if (isOrderLookupQuery(text, normalized) && !currentUser) {
      return {
        text: 'Dạ bạn vui lòng đăng nhập để tra cứu đơn hàng cá nhân của mình ạ.',
        products: [],
        vouchers: []
      };
    }

    if (orderCodeMatch && currentUser?.role === 'customer') {
      const requestedId = orderCodeMatch[0].toUpperCase();
      const belongsToUser = accessibleOrders.some(order => order.id.toUpperCase() === requestedId);
      const existsInSystem = currentOrders.some(order => order.id.toUpperCase() === requestedId);
      if (existsInSystem && !belongsToUser) {
        return {
          text: 'Mình không thể cung cấp thông tin của đơn hàng này.',
          products: [],
          vouchers: []
        };
      }
    }

    // =========================================================================
    // 1. SAFETY FILTER (Chỉ từ chối nội dung độc hại / vi phạm an toàn)
    // =========================================================================
    if (isOutOfDomain(text, lower, normalized)) {
      return {
        text: `Dạ em xin phép không thể hỗ trợ nội dung này để đảm bảo tiêu chuẩn an toàn ạ! 🌿\n\n` +
              `Em luôn sẵn lòng trò chuyện, tư vấn phong cách sống, thời trang, mẹo vặt, decor và mua sắm cùng bạn nhé! ✨`,
        products: [],
        vouchers: []
      };
    }

    // 2. ƯU TIÊN GỌI GEMINI AI TOÀN DIỆN (Trò chuyện đa năng, tư vấn cuộc sống & kết nối sản phẩm)
    if (settings?.aiProvider !== 'local') {
      try {
        const result = await this.callBackendChat(text, currentProducts, accessibleOrders);
        if (result?.text && !result.text.includes('Persona maintained') && !result.text.includes('systemInstruction')) {
          return result;
        }
      } catch (err) {
        console.warn('[AI] Backend /api/chat chưa sẵn sàng, dùng Universal Local Engine:', err.message);
      }
    }

    // 3. Fallback: Universal Local Semantic Engine (Hoạt động thông minh cả khi offline)
    return this.processLocally(text, lower, normalized, currentProducts, accessibleOrders);
  },

  /**
   * Local Smart Engine with GPT-3 Reasoning, Business Advisory & Commerce Handling
   */
  processLocally(text, lower, normalized, products, orders) {
    // =========================================================================
    // PRIORITY 1: IN-CHAT ORDERING ASSISTANT (Ý định đặt hàng trực tiếp trong Chat)
    // =========================================================================
    const orderDraft = OrderingAssistantEngine.parseOrderIntent(text, products);
    if (orderDraft) {
      const targetItem = orderDraft.items[0];
      return {
        text: `⚡ **Dạ em đã chuẩn bị sẵn thẻ đơn hàng theo yêu cầu của bạn nè!**\n\n` +
              `• **Sản phẩm:** **${targetItem.name}** (${targetItem.variant})\n` +
              `• **Số lượng:** ${targetItem.quantity} món\n` +
              `• **Tạm tính:** ${formatCurrency(orderDraft.subtotal)}${orderDraft.shippingFee === 0 ? ' • 🎉 *Miễn phí vận chuyển*' : ` • Phí ship: ${formatCurrency(orderDraft.shippingFee)}`}\n\n` +
              `Bạn có thể tùy chỉnh số lượng, áp mã giảm giá và bấm nút **"Xác Nhận Đặt Hàng Ngay"** trên thẻ bên dưới để em gửi đơn sang bộ phận đóng gói nhé! 👇`,
        actionType: 'order_draft',
        draftOrder: orderDraft,
        products: getInStockProducts(products).filter(p => p.id === targetItem.id),
        vouchers: StorageService.getCoupons().filter(c => c.isActive !== false)
      };
    }

    // =========================================================================
    // PRIORITY 2: CUSTOMER CARE & SUPPORT (Chăm sóc sau bán, tra cứu, bảo hành)
    // =========================================================================
    const careResult = CustomerCareEngine.handleQuery(text, normalized, orders, products);
    if (careResult) {
      return {
        ...careResult,
        products: careResult.products || [],
        vouchers: careResult.vouchers || [],
        actionContact: true
      };
    }

    // =========================================================================
    // MODULE A: B2B, WHOLESALE & BUSINESS INQUIRIES (Kinh doanh bán sỉ & Doanh nghiệp)
    // =========================================================================
    const isBusinessQuery = 
      normalized.includes("ban si") ||
      normalized.includes("mua si") ||
      normalized.includes("chiet khau") ||
      normalized.includes("so luong lon") ||
      normalized.includes("doanh nghiep") ||
      normalized.includes("hop tac") ||
      normalized.includes("xuat hoa don") ||
      normalized.includes("hoa don vat") ||
      normalized.includes("dai ly") ||
      normalized.includes("ky gui") ||
      normalized.includes("nguon goc san pham") ||
      normalized.includes("xuat xu o dau");

    if (isBusinessQuery) {
      // A1. Wholesale, Corporate Gifts, Volume Discounts
      if (normalized.includes("ban si") || normalized.includes("mua si") || normalized.includes("so luong lon") || normalized.includes("chiet khau") || normalized.includes("doanh nghiep") || normalized.includes("hoa don")) {
        return {
          text: `💼 **Chính Sách Bán Sỉ & Quà Tặng Doanh Nghiệp (B2B) - Tiệm Nhà Nhỏ:**\n\n` +
                `Chào bạn, Tiệm Nhà Nhỏ rất hân hạnh được đồng hành cùng các đối tác doanh nghiệp, sự kiện và đại lý phân phối đồ thủ công tinh tế. Chính sách kinh doanh số lượng lớn của tiệm như sau:\n\n` +
                `1. 🏷️ **Bậc Chiết Khấu Số Lượng:**\n` +
                `   • **Từ 10 - 29 sản phẩm:** Chiết khấu ngay **12% - 15%** trên tổng giá trị.\n` +
                `   • **Từ 30 - 99 sản phẩm:** Chiết khấu **20% - 25%** + Miễn phí vận chuyển toàn quốc.\n` +
                `   • **Từ 100 sản phẩm trở lên:** Mức giá sỉ xưởng ưu đãi độc quyền (lên tới **30% - 35%**) cùng hợp đồng kinh tế theo đợt.\n\n` +
                `2. 🎁 **Dịch Vụ Cá Nhân Hóa Doanh Nghiệp:**\n` +
                `   • Khắc logo laser lên hũ nến gỗ, khay gỗ sồi hoặc phin cà phê nhôm.\n` +
                `   • Thiết kế hộp quà Kraft thắt nơ, đính kèm thiệp thông điệp tri ân đối tác sang trọng.\n\n` +
                `3. 📑 **Chứng Từ & Hóa Đơn:**\n` +
                `   • Hỗ trợ xuất **Hóa đơn điện tử VAT**, hợp đồng mua bán và biên bản bàn giao đầy đủ cho pháp nhân doanh nghiệp.\n\n` +
                `📞 Để nhận **Bảng báo giá sỉ chi tiết** trong vòng 15 phút, bạn có thể bấm **Gọi Hotline** hoặc nhắn **Zalo** bộ phận kinh doanh bên dưới nhé! 👇`,
          products: getInStockProducts(products).filter(p => ['decor', 'coffee', 'fashion'].includes(p.category)).slice(0, 4),
          vouchers: [],
          actionContact: true
        };
      }

      // A2. Craft Origin & Supplier Partnership
      if (normalized.includes("nguon goc") || normalized.includes("xuat xu") || normalized.includes("hop tac") || normalized.includes("ky gui")) {
        return {
          text: `🌿 **Nguồn Gốc Sản Phẩm & Định Hướng Kinh Doanh Bền Vững:**\n\n` +
                `Tiệm Nhà Nhỏ hoạt động với sứ mệnh bảo tồn và phát triển nghề thủ công truyền thống Việt Nam kết hợp phong cách sống tối giản hiện đại:\n\n` +
                `• 🏺 **Đồ gốm men lam:** Được sản xuất thủ công từ làng nghề Bát Tràng (Hà Nội), nung nhiệt độ cao 1.300°C khử chì an toàn tuyệt đối.\n` +
                `• ☕ **Cà phê đặc sản:** Tuyển chọn 100% hạt Arabica chín mọng vùng Cầu Đất - Trạm Hành (Đà Lạt) ở độ cao 1.650m, chế biến ướt và rang mộc mẻ nhỏ.\n` +
                `• 🕯️ **Nến thơm hữu cơ:** Sản xuất theo mẻ giới hạn tại xưởng boutique Hà Nội, sử dụng 100% sáp đậu nành tự nhiên và tinh dầu thực vật nguyên chất.\n` +
                `• 👛 **Đồ da thủ công:** Sử dụng da bò sáp Crazy Horse nguyên tấm nhập khẩu, từng mũi kim được đục và khâu tay tỉ mỉ.\n\n` +
                `🤝 **Hợp tác phân phối / Ký gửi:** Nếu bạn là nghệ nhân hoặc xưởng sản xuất thủ công mong muốn hợp tác đưa sản phẩm vào hệ sinh thái của Tiệm, vui lòng liên hệ qua Hotline \`${STORE_INFO.phone}\` hoặc email \`${STORE_INFO.email}\` nhé!`,
          products: [],
          vouchers: [],
          actionContact: true
        };
      }
    }

    // =========================================================================
    // MODULE B: ORDER INTELLIGENCE & SHIPMENT FULFILLMENT (Vận hành đơn hàng)
    // =========================================================================
    const orderMatch = text.match(/ORD-\d{4}/i);
    const isOrderQuery = 
      orderMatch ||
      normalized.includes("don hang") || 
      normalized.includes("don cua toi") || 
      normalized.includes("don toi vua dat") ||
      normalized.includes("don vua mua") ||
      normalized.includes("tra cuu don") || 
      normalized.includes("kiem tra don") || 
      normalized.includes("tinh trang don") ||
      normalized.includes("don hang o dau") ||
      normalized.includes("bao gio giao") ||
      normalized.includes("khi nao nhan duoc") ||
      normalized.includes("thoi gian giao hang") ||
      normalized.includes("huy don") ||
      normalized.includes("doi dia chi") ||
      normalized.includes("dong kiem") ||
      normalized.includes("xem hang truoc");

    if (isOrderQuery) {
      if (orderMatch) {
        const orderId = orderMatch[0].toUpperCase();
        const found = orders.find(o => o.id.toUpperCase() === orderId);
        if (found) {
          return this.formatOrderDetailResponse(found, normalized);
        } else {
          return {
            text: `Dạ em đã kiểm tra trên hệ thống quản lý đơn hàng nhưng hiện tại **chưa tìm thấy mã đơn ${orderId}** ạ.\n\n` +
                  `💡 **Hướng xử lý nhanh:**\n` +
                  `• Bạn có thể bấm nút **"Đơn của tôi"** ở thanh tiêu đề trên cùng để xem danh sách toàn bộ các đơn bạn đã đặt.\n` +
                  `• Hoặc bạn gửi số điện thoại đặt hàng để em nhờ bộ phận điều vận kiểm tra thủ công cho bạn ngay nhé!`,
            products: [],
            vouchers: [],
            actionContact: true
          };
        }
      }

      if (normalized.includes("huy don") || normalized.includes("cancel don")) {
        const activeOrder = orders.find(o => o.orderStatus === 'pending' || o.orderStatus === 'processing') || orders[0];
        if (activeOrder) {
          return {
            text: `Dạ về yêu cầu **hủy đơn hàng ${activeOrder.id}**:\n\n` +
                  `• **Trạng thái hiện tại:** **${this.getStatusLabel(activeOrder.orderStatus)}**.\n` +
                  `• ✅ **Chính sách hủy đơn:** Đơn hàng chưa xuất kho bàn giao cho bưu tá, tiệm **hỗ trợ hủy miễn phí 100%** và hoàn lại toàn bộ số tiền đã thanh toán (nếu chuyển khoản trước).\n\n` +
                  `⚡ Để nhân viên kho dừng đóng gói và hoàn tất thủ tục hủy trong vòng 2 phút, bạn bấm ngay nút **Gọi Hotline** hoặc **Nhắn Zalo** bên dưới giúp em nhé! 👇`,
            products: [],
            vouchers: [],
            actionContact: true
          };
        }
      }

      if (normalized.includes("doi dia chi") || normalized.includes("doi so dien thoai") || normalized.includes("sua dia chi")) {
        const activeOrder = orders[0];
        return {
          text: `Dạ Tiệm hoàn toàn hỗ trợ bạn **thay đổi địa chỉ hoặc số điện thoại người nhận** miễn phí trước khi đơn hàng xuất kho giao cho shipper ạ!\n\n` +
                (activeOrder ? `• Đơn hàng gần nhất: **${activeOrder.id}** (Địa chỉ hiện tại: ${activeOrder.customer.address}, ${activeOrder.customer.city})\n\n` : '') +
                `Bạn vui lòng nhắn lại thông tin mới (Ví dụ: *"Đổi địa chỉ đơn ${activeOrder?.id || 'ORD-XXXX'} thành: Số 18 Phan Đình Phùng, Ba Đình..."*) hoặc nhắn Zalo bên dưới để shipper giao chuẩn xác tận tay bạn nhé! 👇`,
          products: [],
          vouchers: [],
          actionContact: true
        };
      }

      if (orders.length > 0) {
        const relevantOrder = orders.find(o => o.orderStatus === 'shipping' || o.orderStatus === 'processing') || orders[0];
        return this.formatOrderDetailResponse(relevantOrder, normalized);
      } else {
        return {
          text: `Dạ em kiểm tra trên hệ thống thì hiện tại **bạn chưa có đơn hàng nào trên thiết bị này** ạ.\n\n` +
                `Nếu bạn vừa đặt mua trên máy khác, bạn có thể gửi cho em **Mã đơn hàng** (ví dụ: \`ORD-9281\`) hoặc số điện thoại nhận hàng để em tra cứu hành trình trực tiếp cho bạn nhé! 🌿`,
          products: getInStockProducts(products).filter(p => p.isFeatured).slice(0, 2),
          vouchers: []
        };
      }
    }

    // =========================================================================
    // MODULE C: PRODUCT SIZING & FIT CONSULTANT (Tư vấn Size & Form dáng chuẩn)
    // =========================================================================
    const { height, weight } = extractBodyMeasurements(text, normalized);
    const isSizingQuery = 
      (height || weight) || 
      normalized.includes("size") || 
      normalized.includes("mac vua khong") || 
      normalized.includes("form ao") || 
      normalized.includes("chon size") ||
      normalized.includes("chieu cao") ||
      normalized.includes("can nang");

    if (isSizingQuery && (height || weight || normalized.includes("ao") || normalized.includes("linen"))) {
      const availableProducts = getInStockProducts(products);
      const shirtProduct = findInStockProductsByTerms(products, ['ao', 'linen'], 1)[0] || availableProducts.find(p => p.category === 'fashion');
      let recommendedSize = "M";
      let sizeAdvice = "";

      if (weight) {
        if (weight < 53) {
          recommendedSize = "S";
          sizeAdvice = `Dựa trên thông số cân nặng **${weight}kg**${height ? ` và chiều cao **${height}cm**` : ''}, **Size S** sẽ vừa vặn, tôn dáng thanh lịch và gọn gàng nhất cho bạn.`;
        } else if (weight <= 63) {
          recommendedSize = "M";
          sizeAdvice = `Dựa trên thông số cân nặng **${weight}kg**${height ? ` và chiều cao **${height}cm**` : ''}, **Size M** là lựa chọn hoàn hảo, form suông nhẹ che khuyết điểm rất tốt.`;
        } else if (weight <= 73) {
          recommendedSize = "L";
          sizeAdvice = `Dựa trên thông số cân nặng **${weight}kg**${height ? ` và chiều cao **${height}cm**` : ''}, **Size L** là chuẩn dáng, phần vai áo cử động thoải mái và không bị gò bó.`;
        } else {
          recommendedSize = "XL";
          sizeAdvice = `Dựa trên thông số cân nặng **${weight}kg**${height ? ` và chiều cao **${height}cm**` : ''}, **Size XL** sẽ mang lại sự thông thoáng, thoải mái tối đa suốt cả ngày.`;
        }
      } else {
        sizeAdvice = `Dạ áo sơ mi linen cổ tàu của tiệm được cắt may theo form loose-fit hiện đại. Bảng quy chuẩn chọn size của tiệm như sau:\n` +
                     `• **Size S:** 45 - 53kg (Chiều cao dưới 1m62)\n` +
                     `• **Size M:** 54 - 63kg (Chiều cao 1m60 - 1m70)\n` +
                     `• **Size L:** 64 - 73kg (Chiều cao 1m68 - 1m76)\n` +
                     `• **Size XL:** 74 - 83kg (Chiều cao 1m74 - 1m82)\n\n` +
                     `Bạn chỉ cần cho em biết chiều cao và cân nặng, em sẽ tư vấn size chuẩn xác nhất cho bạn nha!`;
      }

      return {
        text: `👕 **Tư Vấn Chọn Size Áo Sơ Mi Linen Cổ Tàu Chuẩn Dáng:**\n\n` +
              `${sizeAdvice}\n\n` +
              `🌿 **Đặc tính sợi vải:** Sợi linen bột 100% dệt thưa tự nhiên, đã qua công nghệ xử lý giặt nhiệt chống co rút. Áo thấm hút mồ hôi cực nhanh, rất thích hợp mặc đi làm công sở, dạo phố hoặc đi du lịch ngày hè. Bạn có thể bấm vào thẻ sản phẩm bên dưới để chọn màu nhé! 👇`,
        products: shirtProduct ? [shirtProduct] : [],
        vouchers: []
      };
    }

    // =========================================================================
    // MODULE D: PRODUCT USAGE & CARE GUIDES (Cẩm nang sử dụng & Bảo quản đồ thủ công)
    // =========================================================================
    if (normalized.includes("bao quan") || normalized.includes("cach dung") || normalized.includes("cach giat") || normalized.includes("cach thap") || normalized.includes("cach dot") || normalized.includes("dot nen") || normalized.includes("thap nen") || normalized.includes("ve sinh") || normalized.includes("lom tim")) {
      if (normalized.includes("da") || normalized.includes("vi da")) {
        const leatherProduct = findInStockProductsByTerms(products, ['vi da', 'da bo', 'crazy horse'], 1)[0];
        return {
          text: `👛 **Cẩm Nang Sử Dụng & Bảo Quản ${leatherProduct?.name || 'sản phẩm đồ da'}:**\n\n` +
                `1. 💧 **Tránh nước và độ ẩm cao:** Nếu ví bị ướt, hãy dùng khăn mềm thấm khô tự nhiên nơi thoáng gió, không sấy nhiệt cao.\n` +
                `2. ✨ **Xử lý vết trầy xước:** Da bò sáp có đặc tính tự phục hồi. Bạn chỉ cần dùng lòng bàn tay xoa nhẹ hoặc thoa một lớp kem dưỡng da mỏng, vết xước sẽ mờ dần và bóng đẹp hơn.\n` +
                `3. 🌿 **Càng dùng càng đẹp:** Qua thời gian sử dụng, chất da sẽ đanh dẻo, lên màu sáp bóng sậm đậm chất cổ điển!`,
          products: findInStockProductsByTerms(products, ['vi da', 'da bo', 'crazy horse'], 1),
          vouchers: []
        };
      }

      if (normalized.includes("nen") || normalized.includes("dot nen")) {
        const candleProduct = findInStockProductsByTerms(products, ['nen', 'sap dau nanh'], 1)[0];
        return {
          text: `🕯️ **Bí Quyết Sử Dụng ${candleProduct?.name || 'nến thơm'} Không Bị Lõm Tim (Tunneling):**\n\n` +
                `1. ⏱️ **Lần đốt đầu tiên quan trọng nhất:** Hãy thắp nến liên tục từ 1.5 - 2 giờ cho đến khi lớp sáp trên bề mặt tan chảy đều sát thành hũ, tránh hiện tượng lõm tim.\n` +
                `2. ✂️ **Cắt bấc gỗ định kỳ:** Trước mỗi lần thắp, hãy tỉa bấc gỗ còn khoảng 3 - 5mm để ngọn lửa cháy êm, đều và không tạo tàn đen.\n` +
                `3. 🚪 **Không gian sử dụng:** Thích hợp nhất cho phòng ngủ, bàn làm việc hoặc phòng tắm từ 15 - 25m². Không nên đặt nến trước gió quạt trực tiếp.`,
          products: findInStockProductsByTerms(products, ['nen', 'sap dau nanh'], 1),
          vouchers: []
        };
      }

      if (normalized.includes("ao") || normalized.includes("linen")) {
        const linenProduct = findInStockProductsByTerms(products, ['ao', 'linen'], 1)[0];
        return {
          text: `👕 **Cách Giặt & Bảo Quản ${linenProduct?.name || 'áo linen'}:**\n\n` +
                `1. 🧺 **Giặt nhẹ nhàng:** Khuyên dùng giặt tay hoặc giặt máy ở chế độ giặt nhẹ (Delicate) với nước mát, dùng túi giặt để bảo vệ thớ vải tự nhiên.\n` +
                `2. ☀️ **Phơi trong bóng râm:** Giũ phẳng áo trước khi phơi trên móc bản to, phơi nơi thoáng gió tránh ánh nắng gắt trực tiếp làm xơ sợi vải.\n` +
                `3. 👔 **Ủi khi còn ẩm:** Vải linen ủi đẹp nhất bằng bàn ủi hơi nước khi áo còn hơi ẩm nhẹ, giữ lại nếp nhăn tự nhiên đặc trưng cực kỳ sang trọng!`,
          products: findInStockProductsByTerms(products, ['ao', 'linen'], 1),
          vouchers: []
        };
      }
    }

    // =========================================================================
    // MODULE E: GIFT & OCCASION ADVISOR (Tư vấn quà tặng tinh tế)
    // =========================================================================
    const isGiftAdvisor = 
      normalized.includes("qua") || 
      normalized.includes("tang") || 
      normalized.includes("sinh nhat") || 
      normalized.includes("ky niem") ||
      normalized.includes("tan gia") ||
      normalized.includes("goi y");

    if (isGiftAdvisor) {
      // ── Phát hiện sản phẩm cụ thể được đề cập trong câu hỏi ──
      const specificProductKeywords = [
        { keys: ['ao the thao', 'ao thun', 'ao polo', 'ao sat nach', 'ao khoac', 'ao len', 'ao sweater'], label: 'Áo thể thao / áo thun' },
        { keys: ['quan dui', 'quan short', 'quan kaki', 'quan the thao', 'quan dai'], label: 'Quần' },
        { keys: ['tai nghe', 'headphone', 'earphone'], label: 'Tai nghe' },
        { keys: ['gang tay game', 'bao tay game', 'gaming'], label: 'Phụ kiện gaming' },
        { keys: ['dieu khien', 'remote'], label: 'Điều khiển' },
        { keys: ['tat', 'vo chan'], label: 'Tất / vớ' },
        { keys: ['that lung', 'day lung', 'thang lung'], label: 'Thắt lưng' },
        { keys: ['du', 'o du'], label: 'Ô dù' },
        { keys: ['bang keo the thao', 'bang quan'], label: 'Băng keo thể thao' },
      ];

      // Tìm xem user đề cập sản phẩm cụ thể nào
      let specificKeywords = null;
      let specificLabel = null;
      for (const group of specificProductKeywords) {
        if (group.keys.some(k => normalized.includes(k))) {
          specificKeywords = group.keys;
          specificLabel = group.label;
          break;
        }
      }

      // Helper: lấy sản phẩm theo từ khóa cụ thể → category → featured
      const pickGiftItems = (categoryList, fallbackKeywords, limit = 4) => {
        // Ưu tiên 1: sản phẩm khớp từ khóa cụ thể trong câu hỏi
        if (specificKeywords) {
          const specific = findInStockProductsByTerms(products, specificKeywords, limit);
          if (specific.length >= 1) return specific.slice(0, limit);
        }
        // Ưu tiên 2: từ khóa fallback theo đối tượng tặng
        const byKeyword = findInStockProductsByTerms(products, fallbackKeywords, limit);
        if (byKeyword.length >= 2) return byKeyword.slice(0, limit);
        // Ưu tiên 3: theo category
        const byCat = getInStockProducts(products).filter(p => categoryList.includes(p.category)).slice(0, limit);
        if (byCat.length > 0) return byCat;
        // Ưu tiên 4: nổi bật nhất
        return getInStockProducts(products).filter(p => p.isFeatured).slice(0, limit);
      };

      const occasion = normalized.includes("sinh nhat") ? "sinh nhật" : normalized.includes("ky niem") ? "kỷ niệm" : "đặc biệt";
      const specificNote = specificLabel ? `**${specificLabel}**` : 'quà tặng';

      // Quà cho nữ
      if (normalized.includes("ban gai") || normalized.includes("nguoi yeu nu") || normalized.includes("cho me") || normalized.includes("chi gai") || normalized.includes("em gai") || normalized.includes("phu nu") || normalized.includes("con gai")) {
        const giftItems = pickGiftItems(['decor', 'fashion'], ['tui', 'du', 'chai lo', 'bang keo', 'day nhay'], 4);
        return {
          text: `🎁 **Gợi Ý ${specificNote} Dịp ${occasion} Cho Bạn Gái / Người Yêu:**\n\n` +
                `${giftItems.map(formatProductLine).join('\n')}\n\n` +
                `✨ Tiệm hỗ trợ đóng hộp quà và viết thiệp miễn phí! Bạn cần tư vấn thêm ngân sách hay size không ạ? 👇`,
          products: giftItems,
          vouchers: []
        };
      }

      // Quà cho nam
      if (normalized.includes("ban trai") || normalized.includes("nguoi yeu nam") || normalized.includes("cho bo") || normalized.includes("chong") || normalized.includes("anh trai") || normalized.includes("em trai") || normalized.includes("dan ong")) {
        const giftItems = pickGiftItems(['fashion', 'tech'], ['ao the thao', 'quan', 'tai nghe', 'that lung', 'ao thun'], 4);
        return {
          text: `🎁 **Gợi Ý ${specificNote} Dịp ${occasion} Cho Bạn Trai / Người Yêu Nam:**\n\n` +
                `${giftItems.map(formatProductLine).join('\n')}\n\n` +
                `💡 Bạn có muốn tư vấn thêm về **size áo** (cho em biết chiều cao, cân nặng) hoặc **ngân sách cụ thể** để em lọc chính xác hơn không ạ? 👇`,
          products: giftItems,
          vouchers: []
        };
      }

      // Quà tân gia
      if (normalized.includes("tan gia") || normalized.includes("nha moi")) {
        const decorItems = pickGiftItems(['decor'], ['chai', 'lo', 'tui', 'du'], 4);
        return {
          text: `🏡 **Gợi Ý Quà Mừng Tân Gia:**\n\n` +
                `${decorItems.map(formatProductLine).join('\n')}`,
          products: decorItems,
          vouchers: []
        };
      }

      // Quà chung — hỏi thêm thông tin
      const giftItems = pickGiftItems(['fashion', 'tech', 'decor'], ['ao', 'tai nghe', 'that lung'], 4);
      return {
        text: `🎁 **Gợi Ý ${specificNote} Dịp ${occasion} Được Yêu Thích Nhất:**\n\n` +
              `${giftItems.map(formatProductLine).join('\n')}\n\n` +
              `💬 Bạn cho em biết thêm **quà tặng cho ai** (bạn trai, bạn gái, bố mẹ...) và **ngân sách dự kiến** để em gợi ý chính xác hơn nhé!`,
        products: giftItems,
        vouchers: []
      };
    }

    // =========================================================================
    // MODULE F: DEEP PRODUCT SPECS & FAQ (Giải đáp kỹ thuật chi tiết)
    // =========================================================================
    if (normalized.includes("nen") && (normalized.includes("an toan") || normalized.includes("sap gi") || normalized.includes("mui") || normalized.includes("doc hai") || normalized.includes("thanh phan"))) {
      const candleProduct = findInStockProductsByTerms(products, ['nen', 'sap dau nanh'], 1)[0];
      return {
        text: `🕯️ **Thông Số Kỹ Thuật & Độ An Toàn Của ${candleProduct?.name || 'nến thơm'}:**\n\n` +
              `${formatProductSpecs(candleProduct) || candleProduct?.desc || 'Tiệm chưa có thông số chi tiết cho sản phẩm này.'}`,
          products: findInStockProductsByTerms(products, ['nen', 'sap dau nanh'], 1),
        vouchers: []
      };
    }

    if (normalized.includes("ly") || normalized.includes("coc") || normalized.includes("gom")) {
      if (normalized.includes("lo vi song") || normalized.includes("may rua") || normalized.includes("chi") || normalized.includes("ben khong")) {
        const cupProduct = findInStockProductsByTerms(products, ['ly', 'coc', 'gom'], 1)[0];
        return {
          text: `🍵 **Thông Số Kỹ Thuật Của ${cupProduct?.name || 'ly gốm'}:**\n\n` +
                `${formatProductSpecs(cupProduct) || cupProduct?.desc || 'Tiệm chưa có thông số chi tiết cho sản phẩm này.'}`,
          products: findInStockProductsByTerms(products, ['ly', 'coc', 'gom'], 1),
          vouchers: []
        };
      }
    }

    if (normalized.includes("ban phim") && (normalized.includes("mac") || normalized.includes("pin") || normalized.includes("switch") || normalized.includes("ket noi"))) {
      const keyboardProduct = findInStockProductsByTerms(products, ['ban phim', 'keyboard'], 1)[0];
      return {
        text: `⌨️ **Chi Tiết Công Nghệ ${keyboardProduct?.name || 'bàn phím'}:**\n\n` +
              `${formatProductSpecs(keyboardProduct) || keyboardProduct?.desc || 'Tiệm chưa có thông số chi tiết cho sản phẩm này.'}`,
          products: findInStockProductsByTerms(products, ['ban phim', 'keyboard'], 1),
          vouchers: []
      };
    }

    // =========================================================================
    // MODULE G: VOUCHER & DISCOUNT PROMPTS
    // =========================================================================
    if (normalized.includes("ma giam") || normalized.includes("khuyen mai") || normalized.includes("voucher") || normalized.includes("coupon") || normalized.includes("uu dai") || normalized.includes("giam gia")) {
      const coupons = StorageService.getCoupons().filter(c => c.isActive !== false);
      const couponList = coupons.map(c => `• **\`${c.code}\`**: ${c.description}`).join("\n");
      return {
        text: `🎟️ **Các Chương Trình Ưu Đãi & Voucher Đang Áp Dụng Tại Tiệm:**\n\n` +
              `${couponList}\n\n` +
              `✨ **Mẹo áp dụng tức thì:** Bạn chỉ cần bấm vào nút **"Áp dụng ngay"** ở các thẻ mã bên dưới, hệ thống sẽ tự động trừ thẳng vào giỏ hàng cho bạn mà không cần nhập tay nhé! 👇`,
        products: [],
        vouchers: coupons
      };
    }

    // =========================================================================
    // MODULE H: STORE POLICIES (Freeship, Giao hàng, Đổi trả, Địa chỉ)
    // =========================================================================
    if (normalized.includes("phi ship") || normalized.includes("van chuyen") || normalized.includes("giao hang") || normalized.includes("freeship")) {
      return {
        text: `🚚 **Chính Sách Vận Chuyển & Giao Hàng Toàn Quốc:**\n\n` +
              `• 🎉 **Miễn phí vận chuyển (Freeship):** Tự động áp dụng cho mọi đơn hàng từ **${formatCurrency(STORE_INFO.freeshipThreshold)}** trở lên.\n` +
              `• 📦 **Giao tiêu chuẩn:** ${formatCurrency(STORE_INFO.standardShippingFee)} (Thời gian nhận hàng 2 - 3 ngày qua GHTK / Viettel Post).\n` +
              `• ⚡ **Hỏa tốc nội thành:** ${formatCurrency(STORE_INFO.expressShippingFee)} (Nhận hàng trong 2 - 4 tiếng tại Hà Nội).\n` +
              `• 👁️ **Chính sách đồng kiểm:** Khách hàng được mở hộp kiểm tra đúng mẫu mã, màu sắc trước khi thanh toán tiền mặt cho shipper.`,
        products: [],
        vouchers: []
      };
    }

    const isWarrantyQuery = /\b(?:doi tra|bao hanh|hu hong|be vo|nut vo|loi san pham|hang loi)\b/i.test(normalized);
    if (isWarrantyQuery) {
      return {
        text: `🛡️ **Chính Sách Bảo Hành & Đổi Trả Uy Tín Tại Tiệm:**\n\n` +
              `• 🔄 **1 đổi 1 trong 7 ngày:** Áp dụng miễn phí 100% nếu sản phẩm có lỗi xưởng sản xuất, vỡ do vận chuyển hoặc không vừa size.\n` +
              `• 🛡️ **Bảo hành công nghệ:** 6 - 12 tháng với các thiết bị đèn, bàn phím cơ, loa bluetooth.\n` +
              `• 📞 **Thủ tục đơn giản:** Bạn chỉ cần quay video ngắn lúc mở hộp gửi qua Zalo \`${STORE_INFO.zalo}\`, tiệm sẽ gửi sản phẩm mới tinh đổi tận nhà cho bạn!`,
        products: [],
        vouchers: [],
        actionContact: true
      };
    }

    if (normalized.includes("dia chi") || normalized.includes("o dau") || normalized.includes("cua hang") || normalized.includes("gio mo cua")) {
      return {
        text: `📍 **Thông Tin Cửa Hàng & Ghé Thăm ${STORE_INFO.name}:**\n\n` +
              `• Địa chỉ: **${STORE_INFO.address}**\n` +
              `• Khung giờ mở cửa: **${STORE_INFO.operatingHours}** (Mở cửa tất cả các ngày trong tuần)\n` +
              `• Hotline hỗ trợ: \`${STORE_INFO.phone}\`\n` +
              `• Zalo tư vấn trực tiếp: \`${STORE_INFO.zalo}\`\n\n` +
              `Tiệm luôn có trà hoa cúc ấm thơm và không gian mộc mạc đón chào bạn ghé trải nghiệm trực tiếp các sản phẩm nhé!`,
        products: [],
        vouchers: []
      };
    }

    if (normalized.includes("thanh toan") || normalized.includes("chuyen khoan") || normalized.includes("vietqr") || normalized.includes("cod")) {
      return {
        text: `💳 **Các Phương Thức Thanh Toán Linh Hoạt & An Toàn:**\n\n` +
              `1. 💵 **Thanh toán COD:** Nhận hàng, kiểm tra ưng ý mới trả tiền mặt cho shipper.\n` +
              `2. 📱 **Quét mã VietQR tự động:** Hệ thống tạo sẵn mã QR ngân hàng MB Bank với đúng số tiền và cú pháp đơn hàng, xác nhận giao dịch tức thì.\n` +
              `3. 👛 **Ví điện tử:** MoMo, ZaloPay tiện lợi.`,
        products: [],
        vouchers: []
      };
    }

    if (normalized === "hi" || normalized === "hello" || normalized === "xin chao" || normalized === "chao ban" || normalized === "chao shop" || normalized === "alo") {
      return {
        text: `Dạ em chào bạn! Em là **Trợ lý AI Bán hàng & Tư vấn Kinh doanh của ${STORE_INFO.name}** 🌿\n\n` +
              `Em có thể hỗ trợ bạn:\n` +
              `• 🛍️ **Tư vấn sản phẩm & Chọn size:** Vải linen, nến thơm, ly gốm Bát Tràng, quà tặng theo ngân sách\n` +
              `• 💼 **Chính sách bán sỉ & B2B:** Đơn hàng lớn, quà tặng công ty, chiết khấu và hóa đơn VAT\n` +
              `• 📦 **Tra cứu đơn hàng:** Kiểm tra tiến độ vận chuyển, đổi địa chỉ nhận hoặc hỗ trợ hủy đơn\n` +
              `• 🎟️ **Mã giảm giá:** Gửi tặng voucher ưu đãi đang có hiệu lực hôm nay\n\n` +
              `Bạn đang quan tâm đến sản phẩm hay vấn đề kinh doanh nào của tiệm ạ?`,
          products: getInStockProducts(products).filter(p => p.isFeatured).slice(0, 3),
        vouchers: []
      };
    }

    // =========================================================================
    // MODULE I: PRODUCT SEARCH & RECOMMENDATION (Tìm kiếm ngữ nghĩa thông minh)
    // =========================================================================
    const budgetRange = extractBudgetRange(text, normalized);
    let matchedProducts = [];

    const keywordGroups = [
      // Fashion - thời trang
      { keys: ["ao", "so mi", "linen", "quan ao", "thoi trang", "ao thun", "polo", "sweater", "ao khoac"], cat: "fashion" },
      { keys: ["quan", "quan dai", "quan short", "quan dui", "quan kaki", "quan the thao"], cat: "fashion" },
      { keys: ["tat", "vo", "tat luoi", "tat chan", "vớ"], cat: "fashion" },
      { keys: ["quan lot", "quan sip", "boxer", "do lot"], cat: "fashion" },
      { keys: ["that lung", "thang lung", "day lung"], cat: "fashion" },
      { keys: ["tui", "tote", "canvas", "tui vai", "tui dung giay"], cat: "fashion" },
      { keys: ["vi da", "da bo", "vi nam", "bop", "crazy horse"], cat: "fashion" },
      // Tech - phụ kiện công nghệ
      { keys: ["tai nghe", "headphone", "earphone", "bluetooth", "am thanh", "loa"], cat: "tech" },
      { keys: ["gang tay game", "bao tay", "gaming", "choi game", "lien quan", "pubg", "ff"], cat: "tech" },
      { keys: ["dieu khien", "remote", "samsung", "lg", "sony", "tivi"], cat: "tech" },
      { keys: ["ban phim", "ban phim co", "keyboard", "retro"], cat: "tech" },
      { keys: ["den", "den ban", "den hoc", "den ngu", "chieu sang"], cat: "tech" },
      // Decor - đồ dùng / thể thao / du lịch
      { keys: ["bang keo", "bang quan", "the thao", "co chan", "co tay"], cat: "decor" },
      { keys: ["du", "o du", "che mua", "che nang"], cat: "decor" },
      { keys: ["chai", "lo", "hu", "binh", "lo chiet", "chai xịt", "chai nhua"], cat: "decor" },
      { keys: ["tui dung giay", "tui zip", "tui vai", "dung do"], cat: "decor" },
      { keys: ["day nhay", "day khang luc", "miniband", "tap gym"], cat: "decor" },
      { keys: ["nen", "nen thom", "tinh dau", "sap dau nanh"], cat: "decor" },
      { keys: ["ly", "coc", "gom", "bat trang", "tach"], cat: "decor" },
      { keys: ["ca phe", "coffee", "arabica", "phin"], cat: "decor" },
    ];

    matchedProducts = getInStockProducts(products).filter(p => {
      const pNorm = productIdentityText(p);
      const productWords = new Set(pNorm.split(/\s+/).filter(Boolean));

      if (budgetRange && (p.price < budgetRange.min || p.price > budgetRange.max)) return false;

      const matchesGroup = keywordGroups.some(group => {
        return group.keys.some(k => normalized.includes(k) && productContainsTerm(p, k));
      });

      if (matchesGroup) return true;

      const words = normalized
        .split(/\s+/)
        .filter(word => word.length > 2 && !SEARCH_STOP_WORDS.has(word));
      return words.some(w => productWords.has(w));
    });

    if (budgetRange && matchedProducts.length === 0) {
      matchedProducts = getInStockProducts(products).filter(product =>
        product.price >= budgetRange.min && product.price <= budgetRange.max
      );
    }

    matchedProducts.sort((a, b) => b.rating - a.rating);
    const topRecs = matchedProducts.slice(0, 3);

    if (topRecs.length > 0) {
      let replyIntro = `Dạ em đã tìm thấy những sản phẩm thủ công rất phù hợp với nhu cầu của bạn nè:\n`;
      if (budgetRange) {
        const budgetLabel = budgetRange.min > 0
          ? `từ ${formatCurrency(budgetRange.min)} đến ${formatCurrency(budgetRange.max)}`
          : `dưới ${formatCurrency(budgetRange.max)}`;
        replyIntro = `Dạ với mức ngân sách **${budgetLabel}**, Tiệm gợi ý những sản phẩm chất lượng cao và tinh tế này cho bạn:\n`;
      }

      return {
        text: `${replyIntro}\nBạn có thể bấm **Xem chi tiết** hoặc bấm **Thêm vào giỏ** ngay trên thẻ sản phẩm bên dưới nhé! 👇`,
        products: topRecs,
        vouchers: []
      };
    }

    // =========================================================================
    // UNIVERSAL LIFESTYLE, ADVISORY & OPEN CONVERSATION ENGINE
    // Trò chuyện, tư vấn đa năng ngoài phạm vi cửa hàng nhưng khéo léo kết nối sản phẩm
    // =========================================================================

    // 1. Tư vấn Phối đồ & Phong cách (Fashion Styling / Mix & Match / OOTD)
    if (/phoi do|mac gi|outfit|phong cach|di lam|di choi|di hen ho|di tiec|hen ho|streetwear|vintage|minimalist|layering|tone mau|quan jean|ao thun|ao polo|so mi/.test(normalized)) {
      const fashionItems = getInStockProducts(products).filter(p => p.category === 'fashion' || (p.tags && p.tags.includes('fashion'))).slice(0, 3);
      return {
        text: `✨ **Gợi ý phối đồ chuẩn gu & tinh tế cho bạn nè:**\n\n` +
              `• 👔 **Đi làm / Công sở thanh lịch:** Kết hợp áo polo hoặc sơ mi dáng suông cùng quần tây hoặc kaki tông màu trung tính (kem, be, đen, navy). Vừa chỉn chu, chuyên nghiệp mà lại cực kỳ thoải mái cả ngày dài.\n` +
              `• 🌿 **Đi chơi / Dạo phố cuối tuần:** Áo thun cotton form rộng mix cùng quần jean ống suông hoặc quần short, mang kèm sneaker trắng. Đơn giản, trẻ trung và tôn dáng!\n` +
              `• 💡 **Quy tắc phối màu:** Luôn giữ tổng thể trang phục không quá 3 màu chính. Sử dụng quy tắc tương phản sáng - tối (áo sáng + quần tối hoặc ngược lại) sẽ giúp bạn trông thon gọn và có gu hơn rất nhiều.\n\n` +
              `Tại Tiệm Nhà Nhỏ đang có sẵn những mẫu trang phục chất lượng cao rất hợp với phong cách trên, em gửi bạn tham khảo nha! 👇`,
        products: fashionItems.length > 0 ? fashionItems : getInStockProducts(products).slice(0, 3),
        vouchers: []
      };
    }

    // 2. Không gian sống, Decor & Thư giãn (Home Decor / Aromatherapy / Sleep)
    if (/decor|trang tri|phong ngu|ban lam viec|goc lam viec|khong gian|thu gian|nen thom|tinh dau|ngu ngon|mui huong|phong thuy|am cung/.test(normalized)) {
      const decorItems = getInStockProducts(products).filter(p => p.category === 'decor' || (p.tags && p.tags.includes('decor'))).slice(0, 3);
      return {
        text: `🏡 **Mẹo bài trí không gian & thư giãn tâm hồn cực chill:**\n\n` +
              `• 🕯️ **Ánh sáng & Liệu pháp hương thơm (Aromatherapy):** Sử dụng đèn ánh sáng vàng dịu mắt và thắp một hũ nến thơm (hương gỗ tuyết tùng, hoa oải hương hoặc cam ngọt). Mùi hương tự nhiên sẽ giúp xoa dịu thần kinh, giảm stress sau ngày dài và giúp bạn dễ dàng chìm vào giấc ngủ sâu.\n` +
              `• 🌿 **Góc bàn làm việc tạo cảm hứng:** Giữ mặt bàn tối giản theo quy tắc "Less is more". Đặt thêm một chiếc đèn bàn thẩm mỹ và một vật phẩm decor nhỏ xinh sẽ kích thích tối đa năng lượng sáng tạo.\n` +
              `• 🛋️ **Màu sắc chữa lành:** Sử dụng các tông màu ấm áp như màu be, nâu gỗ, trắng kem để không gian luôn mang lại cảm giác bình yên mỗi khi trở về nhà.\n\n` +
              `Em gợi ý cho bạn những món đồ decor và nến thơm tinh tuyển tại Tiệm giúp góc nhỏ thêm ấm áp nè: 👇`,
        products: decorItems.length > 0 ? decorItems : getInStockProducts(products).slice(0, 3),
        vouchers: []
      };
    }

    // 3. Cà phê, Trà & Nghệ thuật Thưởng thức (Coffee & Tea Art)
    if (/ca phe|coffee|phin|pour over|cold brew|pha ca phe|uong gi|buoi sang|tinh tao|tra|am tra/.test(normalized)) {
      const coffeeItems = getInStockProducts(products).filter(p => p.category === 'coffee' || (p.tags && p.tags.includes('coffee'))).slice(0, 3);
      return {
        text: `☕ **Bí quyết pha và thưởng thức đồ uống chuẩn gu:**\n\n` +
              `• 💧 **Pha phin truyền thống:** Dùng nước sôi tầm 90–94°C (không nên dùng nước vừa sôi 100°C sẽ làm cháy bột cà phê). Rót 20ml nước ủ trong 1-2 phút cho bột nở đều rồi mới châm tiếp 45ml nước để chiết xuất trọn vẹn hương vị.\n` +
              `• 🧊 **Cold Brew sảng khoái:** Ngâm bột cà phê rang mộc xay thô với nước lạnh theo tỉ lệ 1:10 trong ngăn mát tủ lạnh từ 16–24 tiếng. Vị cà phê êm mượt, ít chua, ngọt hậu và cực kỳ thanh mát.\n` +
              `• ✨ **Bảo quản:** Giữ hạt/bột trong hũ kín khí, để nơi khô ráo, tránh ánh nắng trực tiếp để hạt luôn giữ được lớp dầu thơm tự nhiên.\n\n` +
              `Nếu bạn đang tìm hạt cà phê rang mộc nguyên chất hoặc ly cốc thưởng trà, em gợi ý ngay những món ngon nhất tiệm nè: 👇`,
        products: coffeeItems.length > 0 ? coffeeItems : getInStockProducts(products).slice(0, 3),
        vouchers: []
      };
    }

    // 4. Tư vấn Quà tặng & Lời chúc ý nghĩa (Gifting & Celebrations)
    if (/tang qua|qua tang|sinh nhat|ky niem|tan gia|ban gai|ban trai|nguoi yeu|me|bo|dong nghiep|loi chuc|y nghia/.test(normalized)) {
      const giftItems = getInStockProducts(products).filter(p => p.isFeatured || p.rating >= 4.8).slice(0, 3);
      return {
        text: `🎁 **Gợi ý quà tặng tinh tế & trọn vẹn yêu thương:**\n\n` +
              `• 🎀 **Tặng người yêu / bạn gái:** Những món quà mang tính cảm xúc và chăm sóc như nến thơm cao cấp, túi xách thời trang hoặc phụ kiện tinh tế luôn chiếm trọn cảm tình.\n` +
              `• 👔 **Tặng bạn nam / đồng nghiệp:** Áo polo form chuẩn, ví da hoặc phụ kiện công nghệ thanh lịch là lựa chọn vừa thiết thực vừa sang trọng.\n` +
              `• 🏡 **Quà mừng tân gia / người thân:** Đồ gốm thủ công, đèn decor hoặc hộp quà trà - cà phê thượng hạng mang lời chúc ấm no, bình an.\n` +
              `• 💌 **Mẹo nhỏ:** Một tấm thiệp viết tay chân thành sẽ biến món quà trở nên vô giá và ghi dấu ấn sâu đậm trong lòng người nhận.\n\n` +
              `Em gửi bạn vài set quà bán chạy và được yêu thích nhất của Tiệm để bạn tham khảo nhé: 👇`,
        products: giftItems,
        vouchers: []
      };
    }

    // 5. Đời sống, Cảm xúc, Mẹo vặt & Thời tiết (Lifestyle, Wellness & Everyday Wisdom)
    if (/stress|met moi|ap luc|buon|vui|tam su|lam viec|hoc tap|troi mua|troi lanh|thoi tiet|cuoc song|suc khoe|tho|ke chuyen|cau do/.test(normalized)) {
      const comfortingItems = getInStockProducts(products).slice(0, 3);
      return {
        text: `🌿 **Một chút năng lượng tích cực và ấm áp gửi đến bạn:**\n\n` +
              `Cuộc sống đôi khi bận rộn và nhiều áp lực, nhưng bạn nhớ dành chút thời gian để chăm sóc bản thân nhé! Đôi khi chỉ cần:\n` +
              `• Tạm gác màn hình điện thoại 15 phút, hít thở thật sâu.\n` +
              `• Uống một ngụm nước ấm hoặc ly trà thơm dịu.\n` +
              `• Bật một bản nhạc không lời nhẹ nhàng và thả lỏng đôi vai.\n\n` +
              `*"Sau cơn mưa trời lại sáng, và mỗi ngày mới đều là một cơ hội để bắt đầu những điều tốt đẹp."*\n\n` +
              `Tiệm Nhà Nhỏ luôn ở đây đồng hành cùng bạn mỗi ngày. Bạn có cần em hỗ trợ thêm điều gì về không gian sống hay sản phẩm để thư giãn không nè? 😊`,
        products: comfortingItems,
        vouchers: []
      };
    }

    // 6. Câu hỏi kiến thức chung hoặc trò chuyện mở rộng (General Open Conversation)
    const generalProducts = getInStockProducts(products).filter(p => p.isFeatured || p.isNew).slice(0, 3);
    return {
      text: `Dạ chào bạn! Em là **Trợ lý AI Toàn Diện của Tiệm Nhà Nhỏ** nè! ✨\n\n` +
            `Em rất vui được trò chuyện và chia sẻ cùng bạn. Dù là câu hỏi về **phong cách sống, mẹo phối đồ, trang trí phòng ốc, cách chọn quà tặng** hay bất kỳ thắc mắc nào trong cuộc sống và mua sắm, em đều luôn sẵn lòng giải đáp và đồng hành cùng bạn.\n\n` +
            `Bạn có thể chia sẻ cụ thể hơn điều bạn đang quan tâm hoặc tham khảo ngay những sản phẩm nổi bật đang được yêu thích nhất tại Tiệm bên dưới nha! 👇`,
      products: generalProducts,
      vouchers: []
    };
  },

  /**
   * Format full order status details
   */
  formatOrderDetailResponse(order, normalized) {
    const statusMap = {
      pending: "⏳ Chờ shop xác nhận",
      processing: "📦 Đang đóng gói & chuẩn bị hàng (bọc chống sốc hộp carton)",
      shipping: "🚚 Đang trên đường giao cho bạn",
      delivered: "✅ Đã giao hàng thành công",
      cancelled: "❌ Đã hủy đơn hàng"
    };

    const statusText = statusMap[order.orderStatus] || order.orderStatus;
    const itemsSummary = order.items.map(it => `• **${it.name}** (${it.variant}) x${it.quantity} - ${formatCurrency(it.price * it.quantity)}`).join("\n");

    let etaText = "Dự kiến nhận hàng trong 2 - 3 ngày tới.";
    if (order.orderStatus === 'shipping') {
      etaText = "Dự kiến nhận hàng trong 24 - 48 giờ tới.";
    } else if (order.orderStatus === 'delivered') {
      etaText = "Đơn hàng đã được giao thành công đến bạn.";
    }

    return {
      text: `Dạ thông tin chi tiết đơn hàng **${order.id}** của bạn đây ạ:\n\n` +
            `• 📦 **Trạng thái hiện tại:** ${statusText}\n` +
            `• ⏱️ **Tiến độ dự kiến:** ${etaText}\n` +
            `• 👤 **Người nhận:** ${order.customer.name} - 📞 \`${order.customer.phone}\`\n` +
            `• 📍 **Địa chỉ nhận:** ${order.customer.address}, ${order.customer.city}\n` +
            `• 🚚 **Đơn vị giao nhận:** ${order.trackingCarrier || 'GHTK'}` + (order.trackingCode ? ` (Mã vận đơn: \`${order.trackingCode}\`)` : '') + `\n` +
            `• 💰 **Tổng thanh toán:** ${formatCurrency(order.total)} (${order.paymentStatus === 'paid' ? '✅ Đã thanh toán chuyển khoản' : '💵 Thu tiền mặt COD khi nhận'})\n\n` +
            `**Danh sách sản phẩm trong đơn:**\n${itemsSummary}\n\n` +
            `💡 Bạn có thể bấm nút **"Đơn của tôi"** ở thanh tiêu đề trên cùng để xem bản đồ hành trình 5 bước trực quan nhé! Nếu cần thay đổi thông tin hay giờ giao, cứ nhắn em hỗ trợ ngay nha! 🌿`,
      products: [],
      vouchers: [],
      actionContact: true
    };
  },

  /**
   * Helper: Human friendly status label
   */
  getStatusLabel(status) {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'processing': return 'Đang đóng gói';
      case 'shipping': return 'Đang giao hàng';
      case 'delivered': return 'Đã giao thành công';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  },

  /**
   * callBackendChat — Gọi /api/chat trên server (Gemini key ẩn hoàn toàn)
   * Server nhận message + danh sách sản phẩm/đơn hàng → gọi Gemini → trả về text + recommendedIds
   */
  async callBackendChat(message, products, orders) {
    // STORE_INFO đã được import static ở đầu file

    const payload = {
      message,
      // Chỉ gửi các trường cần thiết để giảm payload size
      products: getInStockProducts(products).map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        originalPrice: p.originalPrice,
        stock: p.stock,
        shortDesc: p.shortDesc,
        tags: p.tags
      })),
      orders: orders.slice(0, 5).map(o => ({
        id: o.id,
        customer: { name: o.customer?.name, phone: o.customer?.phone },
        orderStatus: o.orderStatus,
        total: o.total,
        trackingCarrier: o.trackingCarrier,
        trackingCode: o.trackingCode
      })),
      storeInfo: {
        name: STORE_INFO.name,
        address: STORE_INFO.address,
        phone: STORE_INFO.phone,
        operatingHours: STORE_INFO.operatingHours,
        freeshipThreshold: STORE_INFO.freeshipThreshold,
        standardShippingFee: STORE_INFO.standardShippingFee,
        expressShippingFee: STORE_INFO.expressShippingFee
      }
    };

    // 1. Thử gọi backend /api/chat trước (nếu đang chạy có server Node.js)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const { text, recommendedIds = [] } = data;

        const productIndex = {};
        getInStockProducts(products).forEach(p => { productIndex[p.id] = p; });
        const matchedProducts = recommendedIds
          .map(id => productIndex[id])
          .filter(Boolean)
          .slice(0, 4);

        const finalProducts = matchedProducts.length > 0
          ? matchedProducts
          : getInStockProducts(products)
              .filter(p => removeVietnameseTones(text).includes(removeVietnameseTones(p.name.substring(0, 12))))
              .slice(0, 3);

        return { text, products: finalProducts, vouchers: [] };
      }
    } catch (err) {
      console.warn('[AI] Backend /api/chat không phản hồi, kích hoạt gọi Gemini trực tiếp:', err.message);
    }

    // 2. Dự phòng gọi Gemini trực tiếp từ trình duyệt (nếu người dùng cấu hình key trong cài đặt hoặc env)
    const effectiveKey = StorageService.getSettings()?.apiKey || import.meta.env?.VITE_GEMINI_API_KEY || '';
    if (effectiveKey) {
      return await this.callGeminiAPI(message, effectiveKey, products, orders);
    }

    throw new Error('Không có kết nối Gemini');
  },

  /**
   * Gemini 3.5 Flash Lite API Integration (Toàn diện, đa năng, hiểu biết sâu rộng)
   */
  async callGeminiAPI(prompt, apiKey, products, orders) {
    const inStock = getInStockProducts(products);
    const productIndex = {};
    inStock.forEach(p => { productIndex[p.id] = p; });

    const byCategory = {};
    inStock.forEach(p => {
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    });

    const catLabels = {
      fashion: '👕 Thời Trang & Phụ Kiện',
      decor: '🏡 Decor & Nến Thơm & Gốm Sứ',
      coffee: '☕ Cà Phê & Thực Phẩm Đặc Sản',
      tech: '⌨️ Phụ Kiện Công Nghệ Gỗ'
    };

    const catalogLines = Object.entries(byCategory).map(([cat, items]) => {
      const label = catLabels[cat] || cat;
      const rows = items.map(p =>
        `  • [${p.id}] ${p.name} | ${formatCurrency(p.price)}${p.originalPrice && p.originalPrice > p.price ? ` (gốc ${formatCurrency(p.originalPrice)})` : ''} | Còn ${p.stock} | ${p.shortDesc}`
      ).join('\n');
      return `${label} (${items.length} sản phẩm):\n${rows}`;
    }).join('\n\n');

    const recentOrders = orders.slice(0, 5);
    const ordersSummary = recentOrders.length > 0
      ? recentOrders.map(o =>
          `  • ${o.id} | ${o.customer.name} (${o.customer.phone}) | ${this.getStatusLabel(o.orderStatus)} | ${formatCurrency(o.total)} | ${o.trackingCarrier || 'GHTK'} - ${o.trackingCode || 'chưa có mã'}`
        ).join('\n')
      : '  (Chưa có đơn hàng)';

    const systemInstruction = `Bạn là **Trợ Lý AI Toàn Diện & Cố Vấn Phong Cách Sống** của **"${STORE_INFO.name}"** — boutique thủ công tinh tế tại Hà Nội.

🌟 NĂNG LỰC TOÀN DIỆN & PHONG CÁCH:
1. 💡 **Trò chuyện & Tư vấn Đa Lĩnh Vực:** Bạn sẵn lòng trò chuyện, tư vấn về mọi chủ đề cuộc sống: phong cách sống, nghệ thuật phối đồ (mix & match), trang trí không gian sống, kiến thức phong thủy, mẹo vặt gia đình, thưởng thức cà phê, văn hóa, công việc, tâm lý chọn quà, thơ ca, hoặc tâm sự chia sẻ như một người bạn tri kỷ.
2. 🛍️ **Cố vấn Sản phẩm & Bán hàng:** Luôn am hiểu kho hàng của Tiệm: chất liệu, kích thước/bảng size, xuất xứ, tính năng và cách bảo quản.
3. 🔗 **Khéo léo Kết nối:** Đưa ra lời khuyên hữu ích, sâu sắc và chân thành trước, sau đó KHÉO LÉO gợi ý 1-2 món đồ liên quan tại Tiệm Nhà Nhỏ để khách tham khảo.
4. 💬 **Giọng điệu:** Lịch thiệp, ấm áp, thông thái, xưng "em" và gọi khách là "bạn" hoặc "anh/chị". Dùng emoji nhẹ nhàng.

📦 DANH MỤC SẢN PHẨM HIỆN CÓ CỦA TIỆM (${inStock.length} sản phẩm):
${catalogLines}

📋 ĐƠN HÀNG GẦN ĐÂY:
${ordersSummary}

🏪 THÔNG TIN TIỆM:
  • Địa chỉ: ${STORE_INFO.address}
  • Hotline / Zalo: ${STORE_INFO.phone}
  • Giờ mở cửa: ${STORE_INFO.operatingHours}
  • Freeship từ: ${formatCurrency(STORE_INFO.freeshipThreshold)}
  • Ship tiêu chuẩn: ${formatCurrency(STORE_INFO.standardShippingFee)} (2-3 ngày)
  • Ship hỏa tốc: ${formatCurrency(STORE_INFO.expressShippingFee)} (2-4h nội thành)
  • Đổi trả: 1 đổi 1 trong 7 ngày, đồng kiểm trước khi nhận

📐 BẢNG SIZE ÁO & QUẦN:
  • S: dưới 1m62, 45–53kg | M: 1m60–1m70, 54–63kg | L: 1m68–1m76, 64–73kg | XL: 1m74–1m82, 74–83kg | XXL: >1m80, >83kg

💼 CHÍNH SÁCH BÁN SỈ & DOANH NGHIỆP:
  • 10–29 món: giảm 12–15% | 30–99 món: giảm 20–25% + freeship | ≥100 món: giảm 30–35% + hợp đồng
  • Hỗ trợ xuất hóa đơn VAT, khắc logo, đóng hộp quà doanh nghiệp

📌 KHI GỢI Ý SẢN PHẨM: Đặt tag [RECOMMENDED_IDS: sp-xx, sp-yy, ...] ở CUỐI câu trả lời (tối đa 4 ID từ danh mục trên). Nếu câu hỏi hoàn toàn thuần túy kiến thức không có sản phẩm liên quan, không cần đặt tag này.`;

    const GEMINI_MODEL = 'gemini-3.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
    
    const requestBody = {
      system_instruction: {
        parts: [{ text: systemInstruction }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.75,
        maxOutputTokens: 1200
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
      ]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => response.statusText);
      throw new Error(`Gemini API ${response.status}: ${errBody}`);
    }

    const data = await response.json();

    // Handle blocked / empty response
    const candidate = data.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY') {
      return {
        text: 'Dạ em xin lỗi, em không thể xử lý yêu cầu này. Bạn vui lòng thử lại với câu hỏi khác nhé! 🌿',
        products: [],
        vouchers: []
      };
    }

    let text = candidate.content?.parts?.[0]?.text || "";

    // ── 5. Extract recommended product IDs and render cards ──
    const idMatch = text.match(/\[RECOMMENDED_IDS:\s*([^\]]+)\]/i);
    let matchedProducts = [];
    if (idMatch) {
      const ids = idMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      matchedProducts = ids
        .map(id => productIndex[id])
        .filter(Boolean)
        .slice(0, 4);
      // Remove the tag from displayed text
      text = text.replace(/\[RECOMMENDED_IDS:[^\]]+\]/i, '').trim();
    }

    // Fallback: nếu Gemini quên gắn tag nhưng đề cập tên sản phẩm, thử match
    if (matchedProducts.length === 0) {
      const normalizedText = removeVietnameseTones(text);
      matchedProducts = inStock
        .filter(p => normalizedText.includes(removeVietnameseTones(p.name.substring(0, 15))))
        .slice(0, 3);
    }

    return {
      text,
      products: matchedProducts,
      vouchers: []
    };
  },

  /**
   * Test Gemini qua backend /api/chat/status (không lộ key ra browser)
   * Trả về { ok, model, message }
   */
  async testGeminiKey(_unusedKey) {
    try {
      // 1. Kiểm tra server có cấu hình key chưa
      const statusRes = await fetch('/api/chat/status');
      if (!statusRes.ok) {
        return { ok: false, message: 'Không kết nối được với server. Hãy đảm bảo server đang chạy tại http://localhost:5000.' };
      }
      const status = await statusRes.json();

      if (!status.configured) {
        return {
          ok: false,
          message: 'Server chưa có GEMINI_API_KEY. Hãy mở file .env, điền key rồi khởi động lại server.'
        };
      }

      // 2. Gửi tin nhắn thử để xác nhận Gemini hoạt động
      const testRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Xin chào, bạn là ai?',
          products: [],
          orders: [],
          storeInfo: {}
        })
      });

      if (!testRes.ok) {
        const err = await testRes.json().catch(() => ({}));
        return { ok: false, message: err.error || `Lỗi server ${testRes.status}` };
      }

      const data = await testRes.json();
      const preview = (data.text || '').substring(0, 80);
      return {
        ok: true,
        model: `gemini-2.5-flash (key: ${status.keyMasked})`,
        message: `✅ Kết nối thành công! Server phản hồi: "${preview}..."`
      };
    } catch (e) {
      return { ok: false, message: `Lỗi mạng: ${e.message}` };
    }
  }
};
