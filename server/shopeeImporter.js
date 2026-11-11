export function importShopeeProductsBatch(
  dbInstance,
  { products = [], publish = false, defaultStock = 0 } = {}
) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      success: false,
      error: 'Không có danh sách sản phẩm hợp lệ để nhập.',
      imported: 0,
      publishedExisting: 0,
      publish: Boolean(publish),
      skippedDuplicates: 0,
      products: []
    };
  }

  const shouldPublish = Boolean(publish);
  const parsedDefault = parseInt(defaultStock, 10);
  const publishStock = shouldPublish
    ? Math.min(99999, Math.max(1, Number.isFinite(parsedDefault) ? parsedDefault : 10))
    : 0;

  const existingProducts = dbInstance.get('products') || [];
  const seenShopeeIds = new Set();
  const seenLowerNames = new Set();
  const insertedProducts = [];
  const promotedProducts = [];
  let skippedDuplicates = 0;
  const nowIso = new Date().toISOString();
  const batchBaseTs = Date.now();

  products.forEach((product, index) => {
    const rawName = String(product?.name || '').trim();
    if (!rawName) return;

    const shopeeId = String(product?.shopee_id || '').trim();
    const lowerName = rawName.toLowerCase();

    if ((shopeeId && seenShopeeIds.has(shopeeId)) || seenLowerNames.has(lowerName)) {
      skippedDuplicates++;
      return;
    }

    const existingMatch = existingProducts.find((p) =>
      (shopeeId && p.specs?.['Mã Shopee'] === shopeeId) ||
      String(p.name || '').trim().toLowerCase() === lowerName
    );

    if (shopeeId) seenShopeeIds.add(shopeeId);
    seenLowerNames.add(lowerName);

    if (existingMatch) {
      const existingIsDraft = existingMatch.status === 'draft' || existingMatch.isDraft === true;
      if (shouldPublish && existingIsDraft) {
        const updatedDraft = dbInstance.update(
          'products',
          (p) => p.id === existingMatch.id,
          (prev) => ({
            ...prev,
            status: 'active',
            isDraft: false,
            isNew: true,
            stock: Number(prev.stock) > 0 ? Number(prev.stock) : publishStock,
            publishedAt: nowIso,
            updatedAt: nowIso,
            specs: {
              ...(prev.specs || {}),
              'Trạng thái kiểm duyệt': 'Đã duyệt — Đang mở bán trên trang chủ'
            }
          })
        );
        if (updatedDraft) {
          promotedProducts.push(updatedDraft);
          return;
        }
      }
      skippedDuplicates++;
      return;
    }

    const rawPositiveStock = Number(product?.stock) || 0;
    const initialStock = shouldPublish
      ? (rawPositiveStock > 0 ? Math.min(99999, rawPositiveStock) : publishStock)
      : Math.min(99999, Math.max(0, rawPositiveStock));

    const mappedProduct = {
      id: `sp-${batchBaseTs}-${index}`,
      name: rawName,
      category: product.category || 'decor',
      price: Number(product.price) || 0,
      originalPrice: product.orig ? Number(product.orig) : null,
      stock: initialStock,
      rating: product.rating ? Number(product.rating) : 5.0,
      reviewsCount: Number(product.reviews) || 0,
      soldCount: Number(product.sold) || 0,
      isFeatured: false,
      isNew: true,
      isFlashSale: false,
      isDraft: !shouldPublish,
      status: shouldPublish ? 'active' : 'draft',
      publishedAt: shouldPublish ? nowIso : null,
      images: (Array.isArray(product.images) && product.images.length > 0)
        ? product.images
        : ['/placeholder.svg'],
      variants: { colors: ['Mặc định'], sizes: ['Tiêu chuẩn'] },
      shortDesc: product.shortDesc || `Sản phẩm Shopee - ${rawName.substring(0, 60)}`,
      desc: product.desc || rawName,
      specs: {
        'Nguồn gốc': 'Shopee',
        'Mã Shopee': shopeeId,
        'URL gốc': product.source_url || '',
        'Từ khóa': product.keyword || '',
        'Trạng thái kiểm duyệt': shouldPublish
          ? 'Đã duyệt — Đang mở bán trên trang chủ'
          : 'Bản nháp - Cần nhập số lượng kho thực tế trước khi mở bán'
      },
      tags: [
        product.category || 'decor',
        'shopee',
        ...(/^https?:\/\//i.test(String(product.keyword || '').trim())
          ? []
          : String(product.keyword || '').split(/\s+/).filter((w) => w.length > 2))
      ],
      reviews: []
    };

    const inserted = dbInstance.insert('products', mappedProduct);
    insertedProducts.push(inserted);
  });

  return {
    success: true,
    imported: insertedProducts.length,
    publishedExisting: promotedProducts.length,
    publish: shouldPublish,
    skippedDuplicates,
    products: [...insertedProducts, ...promotedProducts]
  };
}

export function publishDraftProductsBatch(
  dbInstance,
  { productIds = [], defaultStock = 10 } = {}
) {
  const parsedDefault = parseInt(defaultStock, 10);
  const stockAssigned = Math.min(
    99999,
    Math.max(1, Number.isFinite(parsedDefault) ? parsedDefault : 10)
  );
  const idSet = Array.isArray(productIds) && productIds.length > 0
    ? new Set(productIds.map((id) => String(id)))
    : null;
  const nowIso = new Date().toISOString();

  const { updatedCount, updatedItems } = dbInstance.updateMany(
    'products',
    (p) => (p.status === 'draft' || p.isDraft === true) && (!idSet || idSet.has(String(p.id))),
    (prev) => ({
      ...prev,
      status: 'active',
      isDraft: false,
      isNew: true,
      stock: Number(prev.stock) > 0 ? Number(prev.stock) : stockAssigned,
      publishedAt: nowIso,
      updatedAt: nowIso,
      specs: {
        ...(prev.specs || {}),
        'Trạng thái kiểm duyệt': 'Đã duyệt — Đang mở bán trên trang chủ'
      }
    })
  );

  return {
    success: true,
    publishedCount: updatedCount,
    stockAssigned,
    products: updatedItems
  };
}
