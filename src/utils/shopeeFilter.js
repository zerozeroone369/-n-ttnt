/**
 * Shared pure utility for accurate multi-tier Shopee catalog filtering & fair keyword quota allocation.
 * Works identically in Node backend (server/index.js) and browser frontend (AdminDashboard.jsx).
 */

const STOP_WORDS = new Set([
  'cho', 'va', 'cua', 'cac', 'loai', 'mau', 'decor', 'phong', 'ngu',
  'hang', 'san', 'pham', 'gia', 're', 'dep', 'cao', 'cap'
]);

export function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function tokenizeNormalized(normStr) {
  return normStr.split(/[^a-z0-9]+/).filter(Boolean);
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholePhrase(normText, normPhrase) {
  if (!normText || !normPhrase) return false;
  const pattern = new RegExp(`(?:^|[^a-z0-9])${escapeRegExp(normPhrase)}(?:$|[^a-z0-9])`);
  return pattern.test(normText);
}

/**
 * Parse a specific Shopee Product Detail URL (`.../product/<shopId>/<itemId>` or `...-<slug>-i.<shopId>.<itemId>`).
 * Returns null if input is a plain keyword or non-Shopee URL.
 */
export function parseShopeeProductUrl(input) {
  const cleaned = String(input || '').trim().replace(/^[<"']+|[>"']+$/g, '');
  if (!cleaned) return null;

  let candidate = cleaned;
  if (/^(?:www\.)?shopee\.vn\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (!/^https?:\/\//i.test(candidate) || /\s/.test(candidate)) return null;

  let u;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();
  if (host !== 'shopee.vn' && !host.endsWith('.shopee.vn')) return null;

  const m = u.pathname.match(/(?:-i\.(\d+)\.(\d+)|^\/product\/(\d+)\/(\d+))\/?$/i) ||
    u.pathname.match(/(?:-i\.(\d+)\.(\d+)|^\/product\/(\d+)\/(\d+))/i);
  if (!m) return null;

  const shopId = m[1] || m[3] || '';
  const itemId = m[2] || m[4] || '';
  if (!shopId || !itemId) return null;

  return {
    isUrl: true,
    shopId,
    itemId,
    canonicalUrl: `https://shopee.vn/product/${shopId}/${itemId}`,
    targetUrl: `https://shopee.vn${u.pathname}`
  };
}

/**
 * Parse a Shopee search page URL (`https://shopee.vn/search?keyword=...`).
 * Returns null if not a valid shopee.vn search URL.
 */
export function parseShopeeSearchUrl(input) {
  const cleaned = String(input || '').trim().replace(/^[<"']+|[>"']+$/g, '');
  if (!cleaned || /\s/.test(cleaned)) return null;

  let candidate = cleaned;
  if (/^(?:www\.)?shopee\.vn\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (!/^https?:\/\//i.test(candidate)) return null;

  let u;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();
  if (host !== 'shopee.vn' && !host.endsWith('.shopee.vn')) return null;
  if (u.pathname !== '/search' && !u.pathname.startsWith('/search/')) return null;

  const keyword = (u.searchParams.get('keyword') || '').trim();
  return {
    isUrl: true,
    keyword,
    targetUrl: `https://shopee.vn${u.pathname}${u.search}`
  };
}

/**
 * Parse a Shopee category/collection URL (e.g. `https://shopee.vn/Thoi-Trang-Nam-cat.11035567`).
 * Returns null if not a valid shopee.vn category URL.
 */
export function parseShopeeCategoryUrl(input) {
  const cleaned = String(input || '').trim().replace(/^[<"']+|[>"']+$/g, '');
  if (!cleaned || /\s/.test(cleaned)) return null;

  let candidate = cleaned;
  if (/^(?:www\.)?shopee\.vn\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (!/^https?:\/\//i.test(candidate)) return null;

  let u;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }

  const host = u.hostname.toLowerCase();
  if (host !== 'shopee.vn' && !host.endsWith('.shopee.vn')) return null;

  const catMatch = u.pathname.match(/-cat\.(\d+(?:\.\d+)*)\/?$/i);
  if (!catMatch) return null;

  const categoryId = catMatch[1];
  let decodedSlug = u.pathname.replace(/-cat\.[\d.]+\/?$/i, '').replace(/^\/+/, '');
  try {
    decodedSlug = decodeURIComponent(decodedSlug);
  } catch {
    // keep raw slug
  }

  return {
    isUrl: true,
    categoryId,
    slug: decodedSlug.replace(/-/g, ' ').trim(),
    targetUrl: `https://shopee.vn${u.pathname}${u.search}`
  };
}

/**
 * Split user input into keywords and/or direct Shopee URLs without breaking commas inside URL slugs.
 */
export function splitScrapeInputs(rawText) {
  const out = [];
  for (const rawLine of String(rawText || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const segments = line.split(',');
    const merged = [];
    for (const seg of segments) {
      const part = seg.trim();
      if (!part) continue;
      const prev = merged[merged.length - 1];
      if (
        prev &&
        /^https?:\/\/[^\s]*shopee\.vn\//i.test(prev) &&
        !parseShopeeProductUrl(prev) &&
        !parseShopeeCategoryUrl(prev) &&
        !/^https?:\/\//i.test(part)
      ) {
        merged[merged.length - 1] = `${prev},${part}`;
      } else {
        merged.push(part);
      }
    }
    out.push(...merged);
  }
  return out;
}

/**
 * Score how well a product matches a search keyword or Shopee product URL:
 * 3 = exact normalized phrase match OR exact Shopee itemId match for product URL
 * 2 = all words in keyword appear in item text
 * 1 = key non-stopword core term(s) match
 * 0 = no match
 */
export function scoreProductMatch(item, rawKeyword) {
  const productUrlInfo = parseShopeeProductUrl(rawKeyword);
  if (productUrlInfo) {
    const itemShopeeId = String(item?.shopee_id || '').trim();
    const itemSourceUrl = String(item?.source_url || '').trim();
    if (
      (itemShopeeId && itemShopeeId === productUrlInfo.itemId) ||
      (itemSourceUrl && itemSourceUrl.includes(productUrlInfo.itemId))
    ) {
      return 3;
    }
    return 0;
  }

  const categoryUrlInfo = parseShopeeCategoryUrl(rawKeyword);
  if (categoryUrlInfo) {
    const sid = String(item?.shopee_id || '').trim();
    const price = Number(item?.price || 0);
    const nameStr = String(item?.name || '').trim();
    if (!/^\d+$/.test(sid) || price <= 0 || nameStr.length < 3) return 0;
    const normSlug = normalizeText(categoryUrlInfo.slug);
    const normName = normalizeText(nameStr);
    if (normSlug && containsWholePhrase(normName, normSlug)) return 3;
    return 2;
  }

  const searchUrlInfo = parseShopeeSearchUrl(rawKeyword);
  const effectiveKeyword = searchUrlInfo ? searchUrlInfo.keyword : rawKeyword;

  const normKw = normalizeText(effectiveKeyword);
  if (!normKw) return 0;

  // Match strictly against real product identity text (NEVER auto-stamped item.keyword / guessed item.category)
  const itemTags = Array.isArray(item?.tags) ? item.tags.join(' ') : '';
  const itemNormText = normalizeText(
    `${item?.name || ''} ${item?.shortDesc || ''} ${itemTags}`
  );
  if (!itemNormText) return 0;

  const itemWordSet = new Set(tokenizeNormalized(itemNormText));

  // Tier 1: Exact normalized phrase with boundary safety
  if (containsWholePhrase(itemNormText, normKw)) {
    return 3;
  }

  const kwWords = tokenizeNormalized(normKw).filter(w => w.length > 1 || /^\d+$/.test(w));
  if (kwWords.length === 0) return 0;

  const matchesWord = (w) => {
    if (itemWordSet.has(w)) return true;
    // Allow substring only for longer stems (>= 4 chars) to avoid "ao" matching "bao"
    return w.length >= 4 && itemNormText.includes(w);
  };

  // Tier 2: Every meaningful token appears
  if (kwWords.every(matchesWord)) {
    return 2;
  }

  // Tier 3: For multi-word queries, require at least min(2, majorWords.length) core domain tokens
  // so searching "áo khoác" does not accept unrelated "áo thun" / "mini pc"
  const majorWords = kwWords.filter(w => !STOP_WORDS.has(w));
  if (majorWords.length > 0) {
    const matchedMajorCount = majorWords.filter(matchesWord).length;
    if (matchedMajorCount >= Math.min(2, majorWords.length)) {
      return 1;
    }
  }

  return 0;
}

/**
 * Strictly filter items by keywords with balanced quota allocation across all keywords.
 * NEVER injects unrelated non-matching items when matches are fewer than `limit`.
 */
export function filterShopeeCatalog(allItems, keywords, limit = 20) {
  if (!Array.isArray(allItems) || allItems.length === 0) return [];
  const cap = Math.max(1, Number(limit) || 20);

  const cleanKeywords = Array.isArray(keywords)
    ? keywords.map(k => String(k).trim()).filter(Boolean)
    : [];

  if (cleanKeywords.length === 0) {
    return allItems.slice(0, cap);
  }

  const getItemId = (item, fallbackIdx) =>
    String(item?.shopee_id || item?.id || item?.name || fallbackIdx);

  // Build scored candidate lists per keyword (preserve relative order per score tier)
  const candidatesPerKw = cleanKeywords.map((rawKw) => {
    const scored = [];
    allItems.forEach((item, idx) => {
      const score = scoreProductMatch(item, rawKw);
      if (score > 0) {
        scored.push({
          item,
          id: getItemId(item, idx),
          score,
          idx
        });
      }
    });
    scored.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
    return { rawKw, scored, cursor: 0 };
  });

  const selected = [];
  const seenIds = new Set();

  // Pass 1: Guaranteed fair quota slice for every keyword
  const n = candidatesPerKw.length;
  const baseQuota = Math.floor(cap / n);
  const remainder = cap % n;

  for (let i = 0; i < n; i++) {
    if (selected.length >= cap) break;
    const targetForKw = baseQuota > 0 ? baseQuota + (i < remainder ? 1 : 0) : 1;
    const bucket = candidatesPerKw[i];
    let pickedForKw = 0;

    while (bucket.cursor < bucket.scored.length && pickedForKw < targetForKw && selected.length < cap) {
      const cand = bucket.scored[bucket.cursor++];
      if (seenIds.has(cand.id)) continue;
      seenIds.add(cand.id);
      selected.push({
        ...cand.item,
        keyword: cand.item.keyword || bucket.rawKw
      });
      pickedForKw++;
    }
  }

  // Pass 2: Redistribute unused quota round-robin strictly among MATCHING candidates only
  let addedInPass = true;
  while (selected.length < cap && addedInPass) {
    addedInPass = false;
    for (let i = 0; i < n && selected.length < cap; i++) {
      const bucket = candidatesPerKw[i];
      while (bucket.cursor < bucket.scored.length) {
        const cand = bucket.scored[bucket.cursor++];
        if (seenIds.has(cand.id)) continue;
        seenIds.add(cand.id);
        selected.push({
          ...cand.item,
          keyword: cand.item.keyword || bucket.rawKw
        });
        addedInPass = true;
        break;
      }
    }
  }

  return selected.slice(0, cap);
}

