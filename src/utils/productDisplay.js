export function isProductDraft(product) {
  return Boolean(product && (product.status === 'draft' || product.isDraft === true));
}

export function isProductPublished(product) {
  return Boolean(product && !isProductDraft(product));
}

export function getProductRecencyMs(product) {
  if (!product) return 0;

  const publishedMs = Date.parse(product.publishedAt || '');
  if (Number.isFinite(publishedMs) && publishedMs > 0) {
    return publishedMs;
  }

  const createdMs = Date.parse(product.createdAt || '');
  if (Number.isFinite(createdMs) && createdMs > 0) {
    return createdMs;
  }

  // Fallback for legacy timestamped IDs such as sp-1794434149861-10
  const idMatch = String(product.id || '').match(/^sp-(\d{13})(?:-|$)/);
  if (idMatch) {
    const parsedIdMs = Number(idMatch[1]);
    if (Number.isFinite(parsedIdMs) && parsedIdMs > 0) {
      return parsedIdMs;
    }
  }

  return 0;
}

export function sortStorefrontProducts(products = [], sortBy = 'newest') {
  return [...products].sort((a, b) => {
    if (sortBy === 'priceAsc') return (Number(a.price) || 0) - (Number(b.price) || 0);
    if (sortBy === 'priceDesc') return (Number(b.price) || 0) - (Number(a.price) || 0);
    if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0);

    if (sortBy === 'featured') {
      const featDiff = (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      if (featDiff !== 0) return featDiff;
      return getProductRecencyMs(b) - getProductRecencyMs(a);
    }

    // Default ('newest'): newly published/added items first, then curated featured items
    const recencyDiff = getProductRecencyMs(b) - getProductRecencyMs(a);
    if (recencyDiff !== 0) return recencyDiff;
    return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
  });
}
