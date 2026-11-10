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
 * Score how well a product matches a search keyword:
 * 3 = exact normalized phrase match
 * 2 = all words in keyword appear in item text
 * 1 = key non-stopword core term(s) match
 * 0 = no match
 */
export function scoreProductMatch(item, rawKeyword) {
  const normKw = normalizeText(rawKeyword);
  if (!normKw) return 0;

  const itemNormText = normalizeText(
    `${item?.name || ''} ${item?.category || ''} ${item?.keyword || ''} ${item?.shortDesc || ''}`
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

  // Tier 3: Core non-stopword terms match (requires at least one meaningful domain term)
  const majorWords = kwWords.filter(w => !STOP_WORDS.has(w));
  if (majorWords.length > 0 && majorWords.some(matchesWord)) {
    return 1;
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

