/**
 * Shopee Product Scraper - Native Node.js Option B Engine (Third-Party Scraping APIs)
 *
 * - Runs natively inside Node 20+ (Render / Docker / local) with ZERO third-party npm/pip packages.
 * - Uses Scraping APIs (ZenRows, ScraperAPI, Crawlbase) to execute real browser JS, bypass Akamai,
 *   and rotate Vietnam residential proxies.
 * - Supports automatic escalation:
 *     1) ZenRows js_render + premium_proxy (VN) + json_response + valid scroll_y js_instructions
 *     2) Retry with antibot=true (plus optional custom_headers Cookie if Shopee redirects to login)
 *     3) Fallback to Shopee search_items v4 API via ZenRows antibot+proxy
 * - Strict Zero Hallucination: only accepts verified Shopee items with real itemId, price > 0,
 *   stock = 0, status = 'draft', and preserves real Shopee CDN URL fallback in images[1].
 * - Security: never logs apikey/api_key/token/Cookie values in logs or progress output.
 */

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { extractCoreAuthCookieHeader, normalizeShopeeCookieHeader } from '../src/utils/shopeeCookie.js';
import {
  normalizeText,
  parseShopeeCategoryUrl,
  parseShopeeProductUrl,
  parseShopeeSearchUrl,
  scoreProductMatch
} from '../src/utils/shopeeFilter.js';

export const SUPPORTED_PROVIDERS = ['zenrows', 'zenrows_direct', 'scraperapi', 'crawlbase'];
const AUTO_PROVIDER_CHAIN = ['zenrows', 'scraperapi', 'crawlbase'];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const SECRET_QUERY_RE = /((?:apikey|api_key|token)=)[^&\s'"]+/gi;
const COOKIE_LINE_RE = /((?:cookie|x-csrftoken)\s*:\s*)[^\r\n]+/gi;
const SHOPEE_HREF_RE = /(?:-i\.(\d+)\.(\d+)|\/product\/(\d+)\/(\d+))/i;
const SHOPEE_HREF_GLOBAL_RE = /(?:-i\.(\d+)\.(\d+)|\/product\/(\d+)\/(\d+))/g;

export class ProviderFatalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderFatalError';
  }
}

export function sanitizeErrorText(text) {
  return String(text || '')
    .replace(SECRET_QUERY_RE, '$1***')
    .replace(COOKIE_LINE_RE, '$1***');
}

function redactUrlForLogs(rawUrl) {
  try {
    const u = new URL(String(rawUrl || ''));
    return `${u.pathname}${u.search ? '?...' : ''}`;
  } catch {
    return sanitizeErrorText(String(rawUrl || '').slice(0, 120));
  }
}

export function resolveScrapingProvider(preferred = null, env = process.env) {
  const choice = String(preferred || env?.SCRAPING_PROVIDER || 'auto').trim().toLowerCase();
  const zenrowsKey = String(env?.ZENROWS_API_KEY || '').trim();
  const keys = {
    zenrows: zenrowsKey,
    zenrows_direct: zenrowsKey,
    scraperapi: String(env?.SCRAPERAPI_KEY || '').trim(),
    crawlbase: String(env?.CRAWLBASE_TOKEN || env?.CRAWLBASE_API_KEY || '').trim()
  };
  const genericKey = String(env?.SCRAPING_API_KEY || '').trim();

  if (SUPPORTED_PROVIDERS.includes(choice)) {
    const key = keys[choice] || genericKey || null;
    return [choice, key];
  }

  for (const prov of AUTO_PROVIDER_CHAIN) {
    if (keys[prov]) return [prov, keys[prov]];
  }
  return [null, null];
}

export function resolveConfiguredProviders(preferred = null, env = process.env) {
  const choice = String(preferred || env?.SCRAPING_PROVIDER || 'auto').trim().toLowerCase();
  const zenrowsKey = String(env?.ZENROWS_API_KEY || '').trim();
  const keys = {
    zenrows: zenrowsKey,
    zenrows_direct: zenrowsKey,
    scraperapi: String(env?.SCRAPERAPI_KEY || '').trim(),
    crawlbase: String(env?.CRAWLBASE_TOKEN || env?.CRAWLBASE_API_KEY || '').trim()
  };
  const genericKey = String(env?.SCRAPING_API_KEY || '').trim();

  if (SUPPORTED_PROVIDERS.includes(choice)) {
    const key = keys[choice] || genericKey || null;
    return key ? [[choice, key]] : [];
  }

  const configured = [];
  for (const prov of AUTO_PROVIDER_CHAIN) {
    if (keys[prov]) configured.push([prov, keys[prov]]);
  }
  return configured;
}

export function loadShopeeCookieHeader(cookieFilePath = '', env = process.env) {
  let rawCookie = '';
  if (cookieFilePath && fs.existsSync(cookieFilePath)) {
    try {
      rawCookie = fs.readFileSync(cookieFilePath, 'utf8');
    } catch {
      rawCookie = '';
    }
  }
  if (!rawCookie && env?.SHOPEE_COOKIE) {
    rawCookie = String(env.SHOPEE_COOKIE);
  }
  if (!rawCookie.trim()) {
    return { hasCookie: false, hasAuthToken: false, cookieCount: 0, normalizedHeader: '' };
  }
  const parsed = normalizeShopeeCookieHeader(rawCookie);
  if (!parsed.ok) {
    return { hasCookie: false, hasAuthToken: false, cookieCount: 0, normalizedHeader: '' };
  }
  return {
    hasCookie: parsed.cookieCount > 0,
    hasAuthToken: parsed.hasAuthToken,
    cookieCount: parsed.cookieCount,
    normalizedHeader: parsed.normalizedHeader
  };
}

export function resolveTargetForInput(kw) {
  const productUrl = parseShopeeProductUrl(kw);
  if (productUrl) {
    return {
      kind: 'product',
      ...productUrl,
      fallbackUrl: productUrl.canonicalUrl
    };
  }
  const searchUrlObj = parseShopeeSearchUrl(kw);
  if (searchUrlObj) {
    return {
      kind: 'search',
      targetUrl: searchUrlObj.targetUrl,
      fallbackUrl: searchUrlObj.targetUrl,
      keywordText: searchUrlObj.keyword
    };
  }
  const categoryUrlObj = parseShopeeCategoryUrl(kw);
  if (categoryUrlObj) {
    const sep = categoryUrlObj.targetUrl.includes('?') ? '&' : '?';
    return {
      kind: 'category',
      targetUrl: categoryUrlObj.targetUrl,
      fallbackUrl: `${categoryUrlObj.targetUrl}${sep}page=0&sortBy=pop`,
      categoryId: categoryUrlObj.categoryId
    };
  }
  const searchUrl = `https://shopee.vn/search?keyword=${encodeURIComponent(kw)}`;
  return {
    kind: 'keyword',
    targetUrl: searchUrl,
    fallbackUrl: `${searchUrl}&page=0&sortBy=relevancy`
  };
}

export function guessCategory(keyword, productName = '') {
  const kw = normalizeText(`${keyword || ''} ${productName || ''}`);
  if (
    ['ao', 'quan', 'vay', 'giay', 'tui', 'vi', 'dong ho', 'sneaker', 'thoi trang', 'hoodie', 'bomber', 'jacket', 'tat', 'polo', 'kinh', 'dam', 'so mi', 'jean', 'kaki', 'short'].some(
      (x) => kw.includes(x)
    )
  ) {
    return 'fashion';
  }
  if (['nen', 'decor', 'den', 'gom', 'trang tri', 'phong ngu'].some((x) => kw.includes(x))) {
    return 'decor';
  }
  if (['ca phe', 'tra', 'mat ong', 'hat', 'coffee', 'tea'].some((x) => kw.includes(x))) {
    return 'coffee';
  }
  if (['tai nghe', 'ban phim', 'chuot', 'sac', 'loa', 'bluetooth', 'cong nghe'].some((x) => kw.includes(x))) {
    return 'tech';
  }
  return 'fashion';
}

export function parseSoldCount(soldVal) {
  if (typeof soldVal === 'number' && Number.isFinite(soldVal)) {
    return Math.max(0, Math.trunc(soldVal));
  }
  if (!soldVal || typeof soldVal !== 'string') return 0;
  const clean = soldVal.toLowerCase().replace(/đã bán/g, '').replace(/sold/g, '').trim();
  const mk = clean.match(/([\d.,]+)\s*k\+?/);
  if (mk) {
    const val = parseFloat(mk[1].replace(',', '.'));
    if (Number.isFinite(val)) return Math.trunc(val * 1000);
  }
  const digits = clean.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function parseVndPrice(text) {
  if (typeof text === 'number' && Number.isFinite(text)) {
    const val = text >= 100_000_000 ? Math.trunc(text / 100000) : Math.trunc(text);
    return val >= 1000 && val <= 500_000_000 ? val : 0;
  }
  if (!text || typeof text !== 'string') return 0;
  const head = text.split(/[-–~]/, 1)[0];
  let matches = head.match(/\d+(?:[.,]\d{3})+/g) || [];
  if (matches.length === 0) {
    matches = head.match(/\d{4,9}/g) || [];
  }
  for (const m of matches) {
    const digits = m.replace(/[^\d]/g, '');
    if (!digits) continue;
    const val = parseInt(digits, 10);
    if (val >= 1000 && val <= 500_000_000) return val;
  }
  return 0;
}

export function extractImageRef(src) {
  const clean = String(src || '').trim();
  if (!clean) return ['', ''];
  const normalized = clean.startsWith('//') ? `https:${clean}` : clean;
  const m = normalized.match(/susercontent\.com\/file\/([^/?@#\s]+)/);
  if (m) {
    const imgId = m[1].split('@', 1)[0];
    return [imgId, `https://down-vn.img.susercontent.com/file/${imgId}`];
  }
  return ['', /^https?:\/\//i.test(normalized) ? normalized : ''];
}

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    });
}

function stripTags(html) {
  return decodeHtmlEntities(String(html || '').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeShopeeNumericVnd(rawVal, isAlreadyVnd = false) {
  const n = Number(rawVal);
  if (!Number.isFinite(n) || n <= 0) return 0;
  const vnd = isAlreadyVnd ? Math.trunc(n) : Math.trunc(n / 100000);
  return vnd >= 1000 && vnd <= 500_000_000 ? vnd : 0;
}

function pickPriceCandidateInfo(val) {
  if (val === null || val === undefined) return { num: 0, isNumeric: false };
  if (typeof val === 'number') return { num: Number.isFinite(val) && val > 0 ? val : 0, isNumeric: true };
  if (typeof val === 'string') return { num: parseVndPrice(val), isNumeric: false };
  if (typeof val === 'object') {
    const keys = [
      'single_value',
      'singleValue',
      'range_min',
      'rangeMin',
      'min_price',
      'minPrice',
      'min',
      'price',
      'value',
      'current_price',
      'currentPrice',
      'final_price',
      'finalPrice',
      'lowPrice',
      'range_max',
      'rangeMax'
    ];
    for (const k of keys) {
      const c = val[k];
      if (typeof c === 'number' && Number.isFinite(c) && c > 0) return { num: c, isNumeric: true };
      if (typeof c === 'string') {
        const parsed = parseVndPrice(c);
        if (parsed > 0) return { num: parsed, isNumeric: false };
      }
    }
  }
  return { num: 0, isNumeric: false };
}

function pickFirstValidPriceVnd(candidates) {
  for (const cand of candidates) {
    const info = pickPriceCandidateInfo(cand);
    const vnd = normalizeShopeeNumericVnd(info.num, !info.isNumeric);
    if (vnd >= 1000) return vnd;
  }
  return 0;
}

function pickImageStringFromEntry(entry) {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry === 'object') {
    return String(entry.image_id || entry.imageId || entry.id || entry.hash || entry.url || entry.src || entry.image || '').trim();
  }
  return '';
}

export function parseShopeeItem(rawItem, kw) {
  if (!rawItem || typeof rawItem !== 'object') return null;
  const card = rawItem.item_card && typeof rawItem.item_card === 'object' ? rawItem.item_card : rawItem;
  const asset =
    card.item_card_displayed_asset ||
    rawItem.item_card_displayed_asset ||
    card.displayed_asset_info ||
    {};
  const ib = card.item_basic || card.item_data || rawItem.item_basic || rawItem.item_data || card;

  const rawName =
    asset.name ||
    asset.title ||
    ib.name ||
    ib.title ||
    ib.item_name ||
    ib.itemName ||
    card.name ||
    card.title ||
    card.item_name ||
    card.itemName ||
    rawItem.name ||
    rawItem.title ||
    rawItem.item_name ||
    rawItem.itemName ||
    '';
  const name = String(rawName).trim();
  if (!name || name.length < 3) return null;

  const modelsArr = Array.isArray(ib.models)
    ? ib.models
    : Array.isArray(rawItem.models)
      ? rawItem.models
      : Array.isArray(card.models)
        ? card.models
        : [];
  const price =
    rawItem.__directVndPrice >= 1000
      ? rawItem.__directVndPrice
      : pickFirstValidPriceVnd([
          asset?.display_price?.price,
          asset?.display_price,
          ib?.item_card_display_price?.price,
          card?.item_card_display_price?.price,
          rawItem?.item_card_display_price?.price,
          ib?.display_price?.price,
          ib?.price_info,
          rawItem?.price_info,
          ib.price,
          ib.price_min,
          ib.priceMin,
          ib.min_price,
          ib.minPrice,
          ib.current_price,
          ib.currentPrice,
          card.price,
          card.price_min,
          card.priceMin,
          rawItem.price,
          rawItem.price_min,
          rawItem.priceMin,
          ...modelsArr.flatMap((m) => [m?.price, m?.price_info, m?.priceInfo, m?.extinfo?.price, m])
        ]);
  if (!price || price < 1000) return null;

  let orig =
    (rawItem.__directVndOrig >= 1000 ? rawItem.__directVndOrig : 0) ||
    pickFirstValidPriceVnd([
      asset?.display_price?.strikethrough_price,
      ib?.item_card_display_price?.strikethrough_price,
      card?.item_card_display_price?.strikethrough_price,
      ib?.display_price?.strikethrough_price,
      ib.price_before_discount,
      ib.priceBeforeDiscount,
      ib.price_max_before_discount,
      card.price_before_discount,
      card.priceBeforeDiscount,
      rawItem.price_before_discount,
      rawItem.priceBeforeDiscount,
      ...modelsArr.flatMap((m) => [m?.price_before_discount, m?.priceBeforeDiscount])
    ]) ||
    null;
  if (!orig || orig <= price) orig = null;

  let rating = null;
  if (asset?.rating && asset.rating.rating_text) {
    const parsedRating = parseFloat(asset.rating.rating_text);
    rating = Number.isFinite(parsedRating) ? Math.round(parsedRating * 10) / 10 : 4.9;
  } else if (ib?.item_rating?.rating_star) {
    const parsedRating = parseFloat(ib.item_rating.rating_star);
    if (Number.isFinite(parsedRating) && parsedRating > 0) {
      rating = Math.round(parsedRating * 10) / 10;
    }
  }

  let sold = 0;
  if (asset?.sold_count?.text) {
    sold = parseSoldCount(asset.sold_count.text);
  } else if (ib?.item_card_display_sold_count?.historical_sold || ib?.item_card_display_sold_count?.sold) {
    sold = parseSoldCount(ib.item_card_display_sold_count.historical_sold || ib.item_card_display_sold_count.sold);
  } else if (ib.historical_sold || ib.sold) {
    sold = parseSoldCount(ib.historical_sold || ib.sold);
  }

  const rawImgArr = Array.isArray(asset.images) && asset.images.length
    ? asset.images
    : Array.isArray(ib.images) && ib.images.length
      ? ib.images
      : Array.isArray(card.images) && card.images.length
        ? card.images
        : Array.isArray(rawItem.images) && rawItem.images.length
          ? rawItem.images
          : Array.isArray(ib.tier_variations?.[0]?.images)
            ? ib.tier_variations[0].images
            : [];
  const allImages = rawImgArr.map(pickImageStringFromEntry).filter(Boolean);
  const rawPrimaryImg = pickImageStringFromEntry(asset.image || ib.image || card.image || rawItem.image || allImages[0] || '');
  const [imageId, cdnUrl] = rawPrimaryImg.startsWith('http') || rawPrimaryImg.startsWith('//')
    ? extractImageRef(rawPrimaryImg)
    : [rawPrimaryImg, rawPrimaryImg ? `https://down-vn.img.susercontent.com/file/${rawPrimaryImg}` : ''];

  const itemId = String(
    rawItem.itemid ||
      rawItem.item_id ||
      rawItem.itemId ||
      card.itemid ||
      card.item_id ||
      card.itemId ||
      ib.itemid ||
      ib.item_id ||
      ib.itemId ||
      asset.itemid ||
      asset.item_id ||
      asset.itemId ||
      ''
  ).trim();
  const shopId = String(
    rawItem.shopid ||
      rawItem.shop_id ||
      rawItem.shopId ||
      card.shopid ||
      card.shop_id ||
      card.shopId ||
      ib.shopid ||
      ib.shop_id ||
      ib.shopId ||
      asset.shopid ||
      asset.shop_id ||
      asset.shopId ||
      ''
  ).trim();
  if (!itemId || !/^\d+$/.test(itemId)) return null;

  const sourceUrl = shopId
    ? `https://shopee.vn/product/${shopId}/${itemId}`
    : `https://shopee.vn/search?keyword=${encodeURIComponent(kw)}`;

  const cleanDesc = String(rawItem.shortDesc || ib.shortDesc || ib.description || '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    shopee_id: itemId,
    shop_id: shopId,
    name: name.slice(0, 150),
    price,
    orig,
    rating: rating || 4.9,
    reviews: sold > 0 ? Math.max(50, Math.trunc(sold * 0.12)) : 20,
    sold,
    stock: 0,
    stock_needs_review: true,
    images: cdnUrl ? [cdnUrl] : [],
    image_id: imageId,
    image_url: cdnUrl,
    all_image_ids: allImages.slice(0, 3),
    ...(cleanDesc ? { shortDesc: cleanDesc.slice(0, 140), desc: cleanDesc.slice(0, 1500) } : {}),
    category: guessCategory(kw, name),
    keyword: kw,
    source: 'shopee',
    source_url: sourceUrl,
    crawled_at: new Date().toISOString(),
    status: 'draft',
    is_verified: true
  };
}

function stripTagBlocks(html, tagNames) {
  let current = String(html || '');
  if (!current) return '';
  for (const tag of tagNames) {
    const low = current.toLowerCase();
    const openToken = `<${tag}`;
    const closeToken = `</${tag}>`;
    if (!low.includes(openToken)) continue;
    const parts = [];
    let cursor = 0;
    while (cursor < current.length) {
      const start = low.indexOf(openToken, cursor);
      if (start === -1) {
        parts.push(current.slice(cursor));
        break;
      }
      const nextCh = low[start + openToken.length] || '';
      if (nextCh && !/[\s/>]/.test(nextCh)) {
        parts.push(current.slice(cursor, start + openToken.length));
        cursor = start + openToken.length;
        continue;
      }
      parts.push(current.slice(cursor, start));
      const openEnd = low.indexOf('>', start + openToken.length);
      if (openEnd === -1) {
        cursor = current.length;
        break;
      }
      const closeStart = low.indexOf(closeToken, openEnd + 1);
      if (closeStart === -1) {
        // Unclosed block tag: skip tag itself so rest of document isn't swallowed or backtracked
        cursor = openEnd + 1;
      } else {
        cursor = closeStart + closeToken.length;
      }
    }
    current = parts.join(' ');
  }
  return current;
}

function extractMetaPropertyContent(html, propName) {
  const target = String(propName || '').toLowerCase();
  const metaRe = /<meta\b([^>]*)>/gi;
  let m;
  while ((m = metaRe.exec(html)) !== null) {
    const attrs = m[1];
    const propMatch = attrs.match(/\b(?:property|name)=["']([^"']+)["']/i);
    if (!propMatch || propMatch[1].toLowerCase() !== target) continue;
    const contentMatch = attrs.match(/\bcontent=(["'])([^"']*)\1/i);
    if (contentMatch) return decodeHtmlEntities(contentMatch[2]);
  }
  return '';
}

export function extractVisibleBodySnippet(html, maxChars = 220, { skipHeaderNav = true } = {}) {
  if (!html || typeof html !== 'string') return '';
  const low = html.toLowerCase();
  const bodyOpen = low.indexOf('<body');
  let region = html;
  if (bodyOpen !== -1) {
    const bodyStart = low.indexOf('>', bodyOpen);
    const bodyEnd = low.lastIndexOf('</body>');
    if (bodyStart !== -1) {
      region = bodyEnd > bodyStart ? html.slice(bodyStart + 1, bodyEnd) : html.slice(bodyStart + 1);
    }
  }
  if (skipHeaderNav) {
    const mainCleaned = stripTagBlocks(region, ['header', 'nav', 'footer', 'script', 'style', 'noscript', 'svg']);
    const mainText = sanitizeErrorText(stripTags(mainCleaned)).replace(/^(?:bỏ qua nội dung chính|skip to main content)\s*/i, '').trim();
    if (mainText) return mainText.slice(0, maxChars);
  }
  const cleaned = stripTagBlocks(region, ['script', 'style', 'noscript', 'svg']);
  const text = stripTags(cleaned);
  return sanitizeErrorText(text).slice(0, maxChars);
}

export function isLoginRedirectHtml(html, finalUrl = '') {
  if (!html || typeof html !== 'string') return false;
  const lowUrl = String(finalUrl || '').toLowerCase();
  if (lowUrl.includes('/buyer/login') || lowUrl.includes('shopee.vn/buyer/login')) {
    return true;
  }
  if (lowUrl.includes('/verify/') || lowUrl.includes('shopee.vn/verify')) {
    return false;
  }
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && /(đăng nhập|login)/i.test(titleMatch[1])) {
    return true;
  }
  const linkMetaRe = /<(?:link|meta)\b([^>]*)>/gi;
  let lm;
  while ((lm = linkMetaRe.exec(html)) !== null) {
    const attrs = lm[1];
    if (
      (/(?:rel=["']canonical["']|property=["']og:url["'])/i.test(attrs)) &&
      /\/buyer\/login/i.test(attrs)
    ) {
      return true;
    }
  }
  const visibleLow = extractVisibleBodySnippet(html, 4000, { skipHeaderNav: false }).toLowerCase();
  if (visibleLow.includes('đã bán') || /data-sqe=["']item["']/i.test(html)) {
    return false;
  }
  if (
    visibleLow.includes('xác minh bảo mật') ||
    visibleLow.includes('hệ thống phát hiện truy cập bất thường') ||
    visibleLow.includes('truy cập của bạn tạm thời bị hạn chế')
  ) {
    return false;
  }
  if (
    visibleLow.includes('đăng nhập bằng mã qr') ||
    visibleLow.includes('quét mã qr để đăng nhập') ||
    visibleLow.includes('có vẻ như bạn chưa đăng nhập') ||
    visibleLow.includes('looks like you’re not logged in') ||
    visibleLow.includes("looks like you're not logged in") ||
    (visibleLow.includes('login required') && visibleLow.includes('log in to continue')) ||
    (visibleLow.includes('cần đăng nhập') && visibleLow.includes('đăng nhập để tiếp tục')) ||
    (visibleLow.includes('đăng nhập') &&
      (visibleLow.includes('mật khẩu') || visibleLow.includes('số điện thoại/email') || visibleLow.includes('tên đăng nhập')))
  ) {
    return true;
  }
  return false;
}

export function isAntibotChallengeHtml(html, finalUrl = '') {
  if (!html || typeof html !== 'string') return false;
  const lowUrl = String(finalUrl || '').toLowerCase();
  if (lowUrl.includes('/verify/') || lowUrl.includes('shopee.vn/verify')) {
    return true;
  }
  const visibleLow = extractVisibleBodySnippet(html, 4000, { skipHeaderNav: false }).toLowerCase();
  if (visibleLow.includes('đã bán') || /data-sqe=["']item["']/i.test(html)) {
    return false;
  }
  const bodyMarkers = [
    'xác minh bảo mật',
    'hệ thống phát hiện truy cập bất thường',
    'truy cập của bạn tạm thời bị hạn chế',
    'are you a robot',
    'enable javascript and cookies',
    'just a moment...',
    'access denied'
  ];
  if (bodyMarkers.some((m) => visibleLow.includes(m))) return true;
  const low = html.toLowerCase();
  const rawMarkers = [
    '"error":90309999',
    '"redirect_to_error_page":true',
    '/verify/traffic',
    'captcha-delivery'
  ];
  return rawMarkers.some((m) => low.includes(m));
}

export function isProductNotFoundHtml(html, finalUrl = '') {
  if (!html || typeof html !== 'string') return false;
  const lowUrl = String(finalUrl || '').toLowerCase();
  if (lowUrl.includes('/buyer/login') || lowUrl.includes('/verify/')) {
    return false;
  }
  if (isAntibotChallengeHtml(html, finalUrl)) return false;
  const visibleLow = extractVisibleBodySnippet(html, 2500, { skipHeaderNav: true }).toLowerCase();
  return (
    visibleLow.includes('sản phẩm này không tồn tại') ||
    visibleLow.includes('không tìm thấy sản phẩm') ||
    visibleLow.includes('product does not exist') ||
    visibleLow.includes("item doesn't exist")
  );
}

function extractPdpItemFromObject(root, kw, seenIds, outItems) {
  if (!root || typeof root !== 'object') return;
  const dp = root.data && typeof root.data === 'object' ? root.data : root;
  const it =
    dp.item && typeof dp.item === 'object'
      ? dp.item
      : dp.item_basic && typeof dp.item_basic === 'object'
        ? dp.item_basic
        : dp.item_id || dp.itemid || dp.itemId
          ? dp
          : null;

  if (it && (it.item_id || it.itemid || it.itemId)) {
    const pPrice = dp.product_price || dp.productPrice || root.product_price || root.productPrice || {};
    const pImages = dp.product_images || dp.productImages || root.product_images || root.productImages || {};
    const pReview = dp.product_review || dp.productReview || root.product_review || root.productReview || {};
    const modelsList = Array.isArray(it.models) ? it.models : Array.isArray(dp.models) ? dp.models : [];
    const priceBreakdown = dp.price_breakdown || dp.priceBreakdown || {};
    const exclusivePrice = dp.exclusive_price || dp.exclusivePrice || {};
    const flashSale = dp.flash_sale || dp.flashSale || {};
    const deepDiscount = dp.deep_discount || dp.deepDiscount || {};
    const flashPreview = dp.flash_sale_preview || dp.flashSalePreview || {};
    const priceVal = pickFirstValidPriceVnd([
      it.price,
      it.price_min,
      it.priceMin,
      it.min_price,
      it.minPrice,
      it.current_price,
      it.currentPrice,
      it.price_info,
      it.priceInfo,
      it.price_range,
      pPrice?.price,
      pPrice?.final_price,
      pPrice?.finalPrice,
      pPrice?.price_range,
      pPrice?.discount_price,
      pPrice,
      dp.price_info,
      dp.price,
      priceBreakdown?.final_price,
      priceBreakdown?.finalPrice,
      priceBreakdown?.price,
      priceBreakdown?.current_price,
      priceBreakdown,
      exclusivePrice?.price,
      exclusivePrice,
      flashSale?.price,
      flashSale?.price_min,
      flashSale,
      deepDiscount?.promotion?.price,
      deepDiscount?.price,
      deepDiscount,
      flashPreview?.price,
      flashPreview,
      ...modelsList.flatMap((m) => [m?.price, m?.price_info, m?.priceInfo, m?.extinfo?.price, m])
    ]);
    const origVal = pickFirstValidPriceVnd([
      it.price_before_discount,
      it.priceBeforeDiscount,
      it.price_max_before_discount,
      pPrice?.price_before_discount,
      pPrice?.priceBeforeDiscount,
      pPrice?.origin_price,
      priceBreakdown?.original_price,
      priceBreakdown?.price_before_discount,
      flashSale?.price_before_discount,
      deepDiscount?.promotion?.price_before_discount,
      ...modelsList.flatMap((m) => [m?.price_before_discount, m?.priceBeforeDiscount])
    ]);
    const tierImgs = Array.isArray(it.tier_variations?.[0]?.images)
      ? it.tier_variations[0].images
      : Array.isArray(it.tierVariations?.[0]?.images)
        ? it.tierVariations[0].images
        : [];
    const imgListRaw = Array.isArray(it.images) && it.images.length > 0
      ? it.images
      : Array.isArray(pImages?.images) && pImages.images.length > 0
        ? pImages.images
        : Array.isArray(pImages?.preselected_images) && pImages.preselected_images.length > 0
          ? pImages.preselected_images
          : Array.isArray(dp.images) && dp.images.length > 0
            ? dp.images
            : tierImgs;
    const imgList = imgListRaw.map(pickImageStringFromEntry).filter(Boolean);
    const shopFallback =
      it.shop_id ||
      it.shopid ||
      it.shopId ||
      dp.shop_detailed?.shopid ||
      dp.shop_detailed?.shop_id ||
      dp.shopDetailed?.shopId ||
      dp.shop?.shopid ||
      dp.shop?.shop_id ||
      dp.shop?.shopId ||
      dp.shopid ||
      dp.shop_id ||
      dp.shopId ||
      '';
    const pdpTitle =
      it.name ||
      it.title ||
      dp.title ||
      dp.name ||
      dp.product_meta?.title ||
      dp.seo?.title ||
      '';
    const merged = {
      ...it,
      shopid: shopFallback,
      name: pdpTitle,
      __directVndPrice: priceVal,
      __directVndOrig: origVal,
      images: imgList,
      image: pickImageStringFromEntry(it.image) || imgList[0] || '',
      historical_sold:
        it.historical_sold || it.historicalSold || it.sold || pReview?.historical_sold || pReview?.sold || dp.item_sold || dp.historical_sold || 0,
      item_rating:
        it.item_rating || (pReview?.rating_star ? { rating_star: pReview.rating_star } : undefined)
    };
    const parsed = parseShopeeItem(merged, kw);
    const directProd = parseShopeeProductUrl(kw);
    if (parsed && !seenIds.has(parsed.shopee_id) && (!directProd || scoreProductMatch(parsed, kw) > 0)) {
      seenIds.add(parsed.shopee_id);
      outItems.push(parsed);
      return;
    }
  }

  if (dp.itemid || dp.item_id || dp.itemId) {
    const parsedDirect = parseShopeeItem(dp, kw);
    const directProd = parseShopeeProductUrl(kw);
    if (parsedDirect && !seenIds.has(parsedDirect.shopee_id) && (!directProd || scoreProductMatch(parsedDirect, kw) > 0)) {
      seenIds.add(parsedDirect.shopee_id);
      outItems.push(parsedDirect);
    }
  }
}

function collectShopeeItemsFromObject(root, kw, seenIds, outItems, maxItems, maxDepth = 16) {
  if (!root || typeof root !== 'object' || outItems.length >= maxItems) return;

  const directProd = parseShopeeProductUrl(kw);
  const acceptItem = (cand) => {
    if (!cand || seenIds.has(cand.shopee_id)) return false;
    if (directProd && scoreProductMatch(cand, kw) <= 0) return false;
    seenIds.add(cand.shopee_id);
    outItems.push(cand);
    return true;
  };

  extractPdpItemFromObject(root, kw, seenIds, outItems);
  if (outItems.length >= maxItems) return;
  if (directProd && outItems.some((it) => scoreProductMatch(it, kw) > 0)) {
    return;
  }

  const queue = [{ node: root, depth: 0 }];
  const visited = new Set();

  while (queue.length > 0 && outItems.length < maxItems) {
    const { node, depth } = queue.shift();
    if (!node || typeof node !== 'object' || visited.has(node)) continue;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const el of node) {
        if (outItems.length >= maxItems) break;
        if (el && typeof el === 'object' && !Array.isArray(el)) {
          if (acceptItem(parseShopeeItem(el, kw))) {
            if (directProd) return;
            continue;
          }
          if (depth < maxDepth) queue.push({ node: el, depth: depth + 1 });
        } else if (Array.isArray(el) && depth < maxDepth) {
          queue.push({ node: el, depth: depth + 1 });
        }
      }
    } else {
      if (node.item || node.item_basic || node.product_price || node.productPrice) {
        extractPdpItemFromObject(node, kw, seenIds, outItems);
        if (directProd && outItems.some((it) => scoreProductMatch(it, kw) > 0)) return;
      }
      if (node.itemid || node.item_id || node.itemId || node.item_card || node.item_data) {
        if (acceptItem(parseShopeeItem(node, kw)) && directProd) return;
      }
      if (depth < maxDepth) {
        for (const val of Object.values(node)) {
          if (val && typeof val === 'object') {
            queue.push({ node: val, depth: depth + 1 });
          }
        }
      }
    }
  }
}

function findMatchingDelimiterEnd(str, startIdx, openCh, closeCh, maxScan = 2_000_000) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const scanLimit = Math.min(str.length, startIdx + maxScan);
  for (let i = startIdx; i < scanLimit; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === openCh) {
      depth++;
    } else if (ch === closeCh) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findEnclosingBraceStarts(str, targetIdx, maxLookback = 120_000, maxAncestors = 4) {
  const starts = [];
  let depth = 0;
  let inString = false;
  const stopAt = Math.max(0, targetIdx - maxLookback);
  for (let i = targetIdx - 1; i >= stopAt && starts.length < maxAncestors; i--) {
    const ch = str[i];
    if (ch === '"') {
      let bs = 0;
      for (let k = i - 1; k >= stopAt && str[k] === '\\'; k--) bs++;
      if (bs % 2 === 0) inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '}') {
      depth++;
    } else if (ch === '{') {
      if (depth === 0) {
        starts.push(i);
      } else {
        depth--;
      }
    }
  }
  return starts;
}

function tryJsonParseSafe(sliceStr) {
  try {
    return JSON.parse(sliceStr);
  } catch {
    if (sliceStr.includes('undefined')) {
      try {
        return JSON.parse(sliceStr.replace(/:\s*undefined\b/g, ':null'));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseBalancedObjectsAroundMatch(html, matchIdx, kw, seenIds, items, maxItems, { preferParent = true } = {}) {
  const rawStarts = findEnclosingBraceStarts(html, matchIdx, 120_000, 4);
  if (rawStarts.length === 0) return false;
  const ordered = preferParent && rawStarts.length > 1
    ? [rawStarts[1], rawStarts[0], ...rawStarts.slice(2)]
    : rawStarts;

  for (const startIdx of ordered) {
    if (items.length >= maxItems) break;
    const endIdx = findMatchingDelimiterEnd(html, startIdx, '{', '}', 350_000);
    if (endIdx === -1 || endIdx < matchIdx) continue;
    const parsedObj = tryJsonParseSafe(html.slice(startIdx, endIdx + 1));
    if (parsedObj && typeof parsedObj === 'object') {
      const before = items.length;
      collectShopeeItemsFromObject(parsedObj, kw, seenIds, items, maxItems);
      if (items.length > before) return true;
    }
  }
  return false;
}

export function extractEmbeddedJsonItems(html, kw, maxItems = 40) {
  const items = [];
  const seenIds = new Set();
  if (!html || typeof html !== 'string') return items;

  const directProduct = parseShopeeProductUrl(kw);
  const hasTargetMatch = () =>
    directProduct ? items.some((it) => scoreProductMatch(it, kw) > 0) : items.length > 0;

  // Priority Pass -1: Direct MFE initialState & application/json <script> blocks
  const mfeScriptRe = /<script\b[^>]*type=["'](?:text\/mfe-initial-data|application\/json)["'][^>]*>([\s\S]*?)<\/script>/gi;
  let ms;
  while ((ms = mfeScriptRe.exec(html)) !== null) {
    const rawBody = ms[1].trim();
    if (!rawBody || rawBody.length < 20) continue;
    const parsedScript = tryJsonParseSafe(rawBody);
    if (!parsedScript || typeof parsedScript !== 'object') continue;
    const rootNode = parsedScript.initialState && typeof parsedScript.initialState === 'object'
      ? parsedScript.initialState
      : parsedScript;
    if (rootNode.DOMAIN_PDP && typeof rootNode.DOMAIN_PDP === 'object') {
      collectShopeeItemsFromObject(rootNode.DOMAIN_PDP, kw, seenIds, items, maxItems, 18);
    }
    if (!hasTargetMatch()) {
      collectShopeeItemsFromObject(rootNode, kw, seenIds, items, maxItems, 18);
    }
    if (hasTargetMatch()) {
      return (directProduct ? items.filter((it) => scoreProductMatch(it, kw) > 0) : items).slice(0, maxItems);
    }
  }

  // Priority Pass 0: Target exact direct product ID inside hydrated JSON (scan all matches w/ price/title hint)
  if (directProduct?.itemId) {
    const escapedId = directProduct.itemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directRe = new RegExp(`"(?:itemid|item_id|itemId)"\\s*:\\s*"?${escapedId}"?(?!\\d)`, 'gi');
    const hintRe = /"(?:price|price_min|min_price|product_price|productPrice|name|title|images|models)"\s*:/i;
    let dm;
    let totalSeen = 0;
    let parsedTries = 0;
    while ((dm = directRe.exec(html)) !== null && totalSeen < 500 && parsedTries < 80) {
      totalSeen++;
      const win = html.slice(Math.max(0, dm.index - 600), Math.min(html.length, dm.index + 1800));
      if (totalSeen > 20 && !hintRe.test(win)) continue;
      parsedTries++;
      parseBalancedObjectsAroundMatch(html, dm.index, kw, seenIds, items, maxItems, { preferParent: true });
      if (hasTargetMatch()) {
        const matchedWithImg = items.find((it) => scoreProductMatch(it, kw) > 0 && it.image_url);
        if (matchedWithImg) break;
      }
    }

    // Check serialized JSON inside JS strings (\"item_id\":...)
    if (!hasTargetMatch()) {
      const escapedMatchRe = new RegExp(`\\\\"(?:itemid|item_id|itemId)\\\\"\\s*:\\s*(?:\\\\")?${escapedId}(?!\\d)`, 'gi');
      let em;
      let eTries = 0;
      while ((em = escapedMatchRe.exec(html)) !== null && eTries < 15 && !hasTargetMatch()) {
        eTries++;
        const slice = html.slice(Math.max(0, em.index - 45_000), Math.min(html.length, em.index + 45_000));
        const unescaped = slice.replace(/\\"/g, '"').replace(/\\\//g, '/').replace(/\\\\/g, '\\');
        const subRe = new RegExp(`"(?:itemid|item_id|itemId)"\\s*:\\s*"?${escapedId}"?(?!\\d)`, 'gi');
        let sm;
        while ((sm = subRe.exec(unescaped)) !== null && !hasTargetMatch()) {
          parseBalancedObjectsAroundMatch(unescaped, sm.index, kw, seenIds, items, maxItems, { preferParent: true });
        }
      }
    }

    if (hasTargetMatch()) {
      return items.filter((it) => scoreProductMatch(it, kw) > 0).slice(0, maxItems);
    }
  }

  // Pass 1: Embedded arrays of item cards
  const markerRe =
    /"(?:items|item|item_list|item_lists|units|sections|feeds|item_cards|cards|products|recommend_items|top_product_list)"\s*:\s*\[/g;
  let m;
  while ((m = markerRe.exec(html)) !== null && items.length < maxItems) {
    const startIdx = m.index + m[0].length - 1;
    const endIdx = findMatchingDelimiterEnd(html, startIdx, '[', ']');
    if (endIdx === -1) continue;
    try {
      const parsedArr = JSON.parse(html.slice(startIdx, endIdx + 1));
      if (Array.isArray(parsedArr)) {
        collectShopeeItemsFromObject(parsedArr, kw, seenIds, items, maxItems);
      }
    } catch {
      // Ignore partial script fragment
    }
  }

  // Pass 2: Hydrated PDP / item objects (runs whenever no target item found yet)
  if (!hasTargetMatch()) {
    const objMarkerRe = /"(?:data|pdp_info|item_info|item|item_basic|item_data|product|product_info)"\s*:\s*\{/g;
    let om;
    while ((om = objMarkerRe.exec(html)) !== null && (directProduct ? !hasTargetMatch() : items.length < maxItems)) {
      const startIdx = om.index + om[0].length - 1;
      const preview = html.slice(startIdx, startIdx + 4000);
      if (!/"(?:itemid|item_id|product_price)"\s*:/.test(preview)) continue;
      const endIdx = findMatchingDelimiterEnd(html, startIdx, '{', '}', 900_000);
      if (endIdx === -1) continue;
      try {
        const parsedObj = JSON.parse(html.slice(startIdx, endIdx + 1));
        if (parsedObj && typeof parsedObj === 'object') {
          collectShopeeItemsFromObject(parsedObj, kw, seenIds, items, maxItems);
        }
      } catch {
        // Ignore partial script fragment
      }
    }
  }

  // Pass 3: Generic backtracking around any "itemid"/"item_id" keys if Pass 0-2 still missed
  if (!hasTargetMatch()) {
    const genericIdRe = /"(?:itemid|item_id)"\s*:\s*"?\d+"?/gi;
    let gm;
    let scanCount = 0;
    while ((gm = genericIdRe.exec(html)) !== null && scanCount < 60 && items.length < maxItems) {
      scanCount++;
      parseBalancedObjectsAroundMatch(html, gm.index, kw, seenIds, items, maxItems, { preferParent: true });
      if (directProduct && hasTargetMatch()) break;
    }
  }

  return (directProduct ? items.filter((it) => scoreProductMatch(it, kw) > 0) : items).slice(0, maxItems);
}

function safeDecodeHref(href) {
  const raw = String(href || '').trim();
  if (!raw || !raw.includes('%')) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function normalizeEvalPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const rawItems = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.its) ? raw.its : [];
  const items = rawItems.map((it) => {
    if (!it || typeof it !== 'object') return it;
    return {
      href: it.href ?? it.h ?? '',
      itemId: it.itemId ?? it.i ?? '',
      shopId: it.shopId ?? it.p ?? '',
      name: it.name ?? it.n ?? '',
      txt: it.txt ?? it.t ?? '',
      del: it.del ?? it.d ?? '',
      priceTxt: it.priceTxt ?? it.pt ?? '',
      img: it.img ?? it.g ?? '',
      fim: it.fim ?? it.fi ?? '',
      fbPrice: it.fbPrice ?? it.fp ?? 0,
      fbOrig: it.fbOrig ?? it.fo ?? 0,
      fbSold: it.fbSold ?? it.fs ?? 0
    };
  });
  return {
    url: raw.url ?? raw.u ?? '',
    title: raw.title ?? raw.tt ?? '',
    ready: raw.ready ?? raw.rd ?? '',
    err: raw.err,
    sqeCount: raw.sqeCount ?? raw.sq ?? 0,
    capCount: raw.capCount ?? raw.cc ?? 0,
    cap: Array.isArray(raw.cap) ? raw.cap : Array.isArray(raw.cp) ? raw.cp : [],
    sampleCard: raw.sampleCard ?? raw.sc ?? '',
    items,
    pdp: raw.pdp ?? null,
    mainText: raw.mainText ?? raw.mt ?? ''
  };
}

export function extractEvalPayloadFromHtml(html) {
  if (!html || typeof html !== 'string') return null;
  const headProbe = html.slice(0, Math.min(html.length, 4096));
  for (const quote of ['"', "'"]) {
    const marker = `data-sr-eval=${quote}`;
    const attrIdx = headProbe.indexOf(marker);
    if (attrIdx !== -1) {
      const valStart = attrIdx + marker.length;
      const valEnd = html.indexOf(quote, valStart);
      if (valEnd !== -1 && valEnd - valStart <= 2_500_000) {
        try {
          return normalizeEvalPayload(JSON.parse(decodeHtmlEntities(html.slice(valStart, valEnd).trim())));
        } catch {
          // Fall through to legacy <script id="__sr_eval"> fallback
        }
      }
    }
  }
  const idx = html.indexOf('id="__sr_eval"');
  const altIdx = idx === -1 ? html.indexOf("id='__sr_eval'") : idx;
  if (altIdx === -1) return null;
  const openEnd = html.indexOf('>', altIdx);
  const closeStart = openEnd !== -1 ? html.indexOf('</script>', openEnd + 1) : -1;
  if (openEnd === -1 || closeStart === -1) return null;
  try {
    return normalizeEvalPayload(JSON.parse(decodeHtmlEntities(html.slice(openEnd + 1, closeStart).trim())));
  } catch {
    return null;
  }
}

function parseEvalPayloadToItems(evalData, kw, maxItems = 40) {
  if (!evalData || typeof evalData !== 'object') return [];
  const results = [];
  const seenIds = new Set();
  const directProduct = parseShopeeProductUrl(kw);

  const tryAppendEvalPdpItem = () => {
    const pdp = evalData.pdp;
    if (!pdp || !pdp.itemId) return;
    const pdpItemId = String(pdp.itemId).trim();
    if (!pdpItemId || !/^\d+$/.test(pdpItemId) || seenIds.has(pdpItemId)) return;

    let rawTitle = String(pdp.h1 || pdp.ogTitle || evalData.title || '')
      .replace(/\s*\|\s*Shopee.*$/i, '')
      .replace(/^Mua ngay\s+/i, '')
      .trim();
    if (
      rawTitle.length < 4 ||
      /^shopee việt nam$/i.test(rawTitle) ||
      /(đăng nhập|sản phẩm này không tồn tại|không tìm thấy sản phẩm)/i.test(rawTitle)
    ) {
      return;
    }

    const price =
      (pdp.metaPrice ? parseVndPrice(pdp.metaPrice) : 0) ||
      (pdp.pdpPrice ? parseVndPrice(pdp.pdpPrice) : 0) ||
      (pdp.fbPrice ? parseVndPrice(pdp.fbPrice) : 0) ||
      extractCardPrices(evalData.mainText || '').price;
    if (!price || price < 1000) return;

    let orig = pdp.pdpOrig ? parseVndPrice(pdp.pdpOrig) : 0;
    if (!orig || orig <= price) orig = null;

    const rawPdpImg = String(pdp.pdpImg || pdp.ogImg || '').trim();
    const [imageId, cdnUrl] =
      rawPdpImg && !rawPdpImg.startsWith('http') && !rawPdpImg.startsWith('//') && /^[a-z0-9_-]{6,80}$/i.test(rawPdpImg)
        ? [rawPdpImg, `https://down-vn.img.susercontent.com/file/${rawPdpImg}`]
        : extractImageRef(rawPdpImg);
    const sold = parseSoldCount(pdp.sold || '');

    seenIds.add(pdpItemId);
    results.push({
      shopee_id: pdpItemId,
      shop_id: String(pdp.shopId || ''),
      name: rawTitle.slice(0, 150),
      price,
      orig,
      rating: 4.9,
      reviews: sold > 0 ? Math.max(50, Math.trunc(sold * 0.12)) : 20,
      sold,
      stock: 0,
      stock_needs_review: true,
      images: cdnUrl ? [cdnUrl] : [],
      image_id: imageId,
      image_url: cdnUrl,
      all_image_ids: imageId ? [imageId] : [],
      category: guessCategory(kw, rawTitle),
      keyword: kw,
      source: 'shopee',
      source_url: pdp.shopId ? `https://shopee.vn/product/${pdp.shopId}/${pdpItemId}` : kw,
      crawled_at: new Date().toISOString(),
      status: 'draft',
      is_verified: true
    });
  };

  if (Array.isArray(evalData.cap)) {
    for (const capEntry of evalData.cap) {
      if (results.length >= maxItems) break;
      const capObj = capEntry && typeof capEntry === 'object' && capEntry.d ? capEntry.d : capEntry;
      if (capObj && typeof capObj === 'object') {
        collectShopeeItemsFromObject(capObj, kw, seenIds, results, maxItems);
      }
    }
  }

  if (directProduct) {
    tryAppendEvalPdpItem();
  }

  if (Array.isArray(evalData.items) && (!directProduct || results.length === 0)) {
    for (const card of evalData.items) {
      if (results.length >= maxItems) break;
      if (!card || typeof card !== 'object') continue;
      let shopId = String(card.shopId || '').trim();
      let itemId = String(card.itemId || '').trim();
      const hrefStr = safeDecodeHref(decodeHtmlEntities(card.href || ''));
      if ((!itemId || !/^\d+$/.test(itemId)) && hrefStr) {
        const hm = hrefStr.match(SHOPEE_HREF_RE);
        if (hm) {
          shopId = shopId || hm[1] || hm[3] || '';
          itemId = hm[2] || hm[4] || '';
        }
      }
      if (!itemId || !/^\d+$/.test(itemId) || seenIds.has(itemId)) continue;

      const name = String(card.name || '').replace(/\s+/g, ' ').trim();
      const txt = String(card.txt || '');
      const inferredName =
        name.length >= 4
          ? name
          : txt
              .split(/(?:₫|\b\d{1,3}\.\d{3}\b|Đã bán)/i)[0]
              .replace(/\s+/g, ' ')
              .trim();
      if (!inferredName || inferredName.length < 4) continue;

      const priceInputHtml =
        (card.del ? `<del>${String(card.del)}</del> ` : '') +
        (card.priceTxt ? `<span data-sqe="price">${String(card.priceTxt)}</span> ` : '') +
        txt;
      let { price, orig } = extractCardPrices(priceInputHtml);
      if ((!price || price < 1000) && card.fbPrice) {
        price = parseVndPrice(card.fbPrice);
      }
      if (!price || price < 1000) continue;

      if ((!orig || orig <= price) && card.fbOrig) {
        const fbOrigVal = parseVndPrice(card.fbOrig);
        orig = fbOrigVal > price ? fbOrigVal : null;
      }

      const soldM =
        txt.match(/đã bán\s*([\d.,]+\s*k?\+?)/i) || txt.match(/([\d.,]+\s*k?\+?)\s*đã bán/i);
      const sold = soldM ? parseSoldCount(soldM[1]) : parseSoldCount(card.fbSold || 0);

      const rawImgRef = String(card.img || card.fim || '').trim();
      const [imageId, cdnUrl] =
        rawImgRef && !rawImgRef.startsWith('http') && !rawImgRef.startsWith('//') && /^[a-z0-9_-]{6,80}$/i.test(rawImgRef)
          ? [rawImgRef, `https://down-vn.img.susercontent.com/file/${rawImgRef}`]
          : extractImageRef(rawImgRef);

      seenIds.add(itemId);
      results.push({
        shopee_id: itemId,
        shop_id: shopId,
        name: inferredName.slice(0, 150),
        price,
        orig,
        rating: 4.9,
        reviews: sold > 0 ? Math.max(50, Math.trunc(sold * 0.12)) : 20,
        sold,
        stock: 0,
        stock_needs_review: true,
        images: cdnUrl ? [cdnUrl] : [],
        image_id: imageId,
        image_url: cdnUrl,
        all_image_ids: imageId ? [imageId] : [],
        category: guessCategory(kw, inferredName),
        keyword: kw,
        source: 'shopee',
        source_url: shopId
          ? `https://shopee.vn/product/${shopId}/${itemId}`
          : hrefStr.startsWith('/')
            ? `https://shopee.vn${hrefStr}`
            : `https://shopee.vn/search?keyword=${encodeURIComponent(kw)}`,
        crawled_at: new Date().toISOString(),
        status: 'draft',
        is_verified: true
      });
    }
  }

  if (results.length === 0) {
    tryAppendEvalPdpItem();
  }

  if (directProduct) {
    return results.filter((it) => scoreProductMatch(it, kw) > 0);
  }

  return results;
}

function extractFirstSqeCardSample(html) {
  const s = String(html || '');
  const sqeMatch = s.match(/data-sqe=["']item["']/i);
  if (!sqeMatch) return '';
  const idx = sqeMatch.index;
  const openStart = Math.max(0, s.lastIndexOf('<', idx));
  const rawSlice = s.slice(openStart, openStart + 2800);
  const compact = sanitizeErrorText(rawSlice.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\s+/g, ' ').trim());
  return compact.slice(0, 360);
}

function findCardFragmentAroundAnchor(html, anchorStart, anchorEnd) {
  const anchorHtml = html.slice(anchorStart, anchorEnd);
  if (/<img\b/i.test(anchorHtml) && /(?:₫|data-sqe="price"|[\d.,]{4,})/.test(anchorHtml)) {
    return anchorHtml;
  }
  // Walk back up to 2500 chars to nearest <li data-sqe="item"> or <li ...> or <div data-sqe="item">
  const lookbackStart = Math.max(0, anchorStart - 2500);
  const before = html.slice(lookbackStart, anchorStart);
  const liMatchIdx = Math.max(
    before.lastIndexOf('<li'),
    before.lastIndexOf('data-sqe="item"'),
    before.lastIndexOf("data-sqe='item'")
  );
  const start = liMatchIdx >= 0 ? lookbackStart + liMatchIdx : Math.max(0, anchorStart - 400);
  const after = html.slice(anchorEnd, Math.min(html.length, anchorEnd + 2500));
  const closeLi = after.indexOf('</li>');
  const end = closeLi >= 0 ? anchorEnd + closeLi + 5 : Math.min(html.length, anchorEnd + 600);
  return html.slice(start, end);
}

function extractCardName(cardHtml) {
  const sqeName = cardHtml.match(/<[^>]*data-sqe=["']name["'][^>]*>([\s\S]*?)<\/[^>]+>/i) ||
    cardHtml.match(/<div[^>]*data-sqe=["']title["'][^>]*>([\s\S]*?)<\/div>/i);
  if (sqeName) {
    const clean = stripTags(sqeName[1]);
    if (clean.length >= 3) return clean;
  }

  const lineClampMatch = cardHtml.match(/class=["'][^"']*line-clamp-2[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|span|p)>/i);
  if (lineClampMatch) {
    const clean = stripTags(lineClampMatch[1]);
    if (clean.length >= 4 && !/^[₫đ\d\s.,kK+\-%]+$/.test(clean)) return clean;
  }

  const altMatch = cardHtml.match(/<img[^>]+alt=["']([^"']{4,})["']/i);
  if (altMatch) {
    const alt = decodeHtmlEntities(altMatch[1]).trim();
    if (alt.length >= 4 && !/^(shopee|icon|badge|overlay|flag)/i.test(alt)) return alt;
  }

  const chunks = decodeHtmlEntities(cardHtml.replace(/<del[\s\S]*?<\/del>/gi, ' '))
    .replace(/<[^>]+>/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(
      (s) =>
        s.length >= 8 &&
        !/^[₫đ\d\s.,kK+\-%]+$/.test(s) &&
        !/^(yêu thích\+?|mall|rẻ vô địch|đang bán chạy|giảm|voucher|miễn phí|đã bán)/i.test(s)
    );
  return chunks[0] || '';
}

function extractCardPrices(cardHtml) {
  const delMatch = cardHtml.match(/<del[^>]*>([\s\S]*?)<\/del>/i);
  let orig = delMatch ? parseVndPrice(stripTags(delMatch[1])) : 0;

  let price = 0;
  const sqePrice = cardHtml.match(/<[^>]*data-sqe=["']price["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
  if (sqePrice) {
    price = parseVndPrice(stripTags(sqePrice[1]));
  }

  const withoutDel = cardHtml.replace(/<del[\s\S]*?<\/del>/gi, ' ');
  const plain = stripTags(withoutDel);

  if (price <= 0) {
    const priceTokens = plain.match(/(?:₫\s*[\d.,]+|[\d.,]+\s*[₫đ])/g) || [];
    for (const tok of priceTokens) {
      const cand = parseVndPrice(tok);
      if (cand > 0 && cand !== orig) {
        price = cand;
        break;
      }
      if (cand > 0 && price <= 0) {
        price = cand;
      }
    }
  }

  // Fallback for icons/CSS pseudo-elements where ₫ isn't in text nodes: look for dotted VND values (e.g. 58.000, 1.290.000)
  if (price <= 0) {
    const withoutNoise = plain
      .replace(/đã bán\s*[\d.,kK+]+/gi, ' ')
      .replace(/[\d.,]+\s*%/g, ' ');
    const dotNumbers = withoutNoise.match(/\b\d{1,3}(?:\.\d{3}){1,2}\b/g) || [];
    for (const tok of dotNumbers) {
      const cand = parseVndPrice(tok);
      if (cand >= 1000 && cand !== orig) {
        price = cand;
        break;
      }
    }
  }

  if (orig <= price) orig = null;
  return { price, orig };
}

function extractCardImage(cardHtml) {
  const imgMatches = [...cardHtml.matchAll(/<img\b([^>]+)>/gi)];
  for (const m of imgMatches) {
    const attrs = m[1];
    const srcM =
      attrs.match(/\bsrc=["']([^"']+)["']/i) ||
      attrs.match(/\bdata-src=["']([^"']+)["']/i) ||
      attrs.match(/\bsrcset=["']([^"'\s,]+)/i);
    if (!srcM) continue;
    const raw = decodeHtmlEntities(srcM[1]);
    if (!raw || raw.startsWith('data:')) continue;
    // Prefer actual product CDN images over tiny badge/overlay icons
    if (raw.includes('susercontent.com/file/') || raw.includes('cf.shopee.vn/file/')) {
      return extractImageRef(raw);
    }
  }
  // Secondary pass for non-susercontent http images
  for (const m of imgMatches) {
    const attrs = m[1];
    const srcM = attrs.match(/\bsrc=["'](https?:\/\/[^"']+)["']/i);
    if (srcM) return extractImageRef(decodeHtmlEntities(srcM[1]));
  }
  return ['', ''];
}

export function inspectHtmlDomStats(html) {
  const s = String(html || '');
  const hrefMatches = (s.match(SHOPEE_HREF_GLOBAL_RE) || []).length;
  const sqeItems = (s.match(/data-sqe=["']item["']/gi) || []).length;
  const cdnImgs = (s.match(/susercontent\.com\/file\//gi) || []).length;
  return { hrefMatches, sqeItems, cdnImgs };
}

function extractJsonLdProducts(html, kw, fallbackIds = null) {
  const results = [];
  const seenIds = new Set();
  const ldRe = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = ldRe.exec(String(html || ''))) !== null) {
    let parsed;
    try {
      const cleanedLd = decodeHtmlEntities(m[1].trim())
        .replace(/^\s*(?:\/\*<!\[CDATA\[\*\/|\/\/<!\[CDATA\[|<!--)\s*/i, '')
        .replace(/\s*(?:\/\*\]\]>\*\/|\/\/\]\]>|-->)\s*$/i, '');
      parsed = JSON.parse(cleanedLd);
    } catch {
      continue;
    }
    const queue = Array.isArray(parsed) ? [...parsed] : [parsed];
    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== 'object') continue;
      if (Array.isArray(node['@graph'])) {
        queue.push(...node['@graph']);
      }
      if (node.mainEntity && typeof node.mainEntity === 'object') {
        queue.push(node.mainEntity);
      }
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
      if (!types.some((t) => String(t || '').toLowerCase() === 'product')) continue;

      const name = stripTags(node.name || '');
      if (!name || name.length < 3) continue;

      const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
      const offerSpec = Array.isArray(offer?.priceSpecification) ? offer.priceSpecification[0] : offer?.priceSpecification;
      const price = parseVndPrice(offer?.price ?? offer?.lowPrice ?? offer?.highPrice ?? offerSpec?.price ?? 0);
      if (!price || price < 1000) continue;

      const urlStr = String(node.url || offer?.url || '');
      const urlMatch = urlStr.match(SHOPEE_HREF_RE);
      const shopId = (urlMatch && (urlMatch[1] || urlMatch[3])) || fallbackIds?.shopId || '';
      const itemId = (urlMatch && (urlMatch[2] || urlMatch[4])) || String(node.productID || node.sku || '').match(/^\d+$/)?.[0] || fallbackIds?.itemId || '';
      if (!itemId || seenIds.has(itemId)) continue;

      const rawImg = Array.isArray(node.image) ? node.image[0] : node.image;
      const [imageId, cdnUrl] = extractImageRef(typeof rawImg === 'string' ? rawImg : rawImg?.url || '');
      const ratingVal = Number(node.aggregateRating?.ratingValue || 4.9);
      const reviewCount = Number(node.aggregateRating?.reviewCount || node.aggregateRating?.ratingCount || 20);
      const cleanDesc = stripTags(node.description || '');

      seenIds.add(itemId);
      results.push({
        shopee_id: itemId,
        shop_id: shopId,
        name: name.slice(0, 150),
        price,
        orig: null,
        rating: Number.isFinite(ratingVal) && ratingVal > 0 ? Math.round(ratingVal * 10) / 10 : 4.9,
        reviews: Number.isFinite(reviewCount) && reviewCount > 0 ? Math.trunc(reviewCount) : 20,
        sold: 0,
        stock: 0,
        stock_needs_review: true,
        images: cdnUrl ? [cdnUrl] : [],
        image_id: imageId,
        image_url: cdnUrl,
        all_image_ids: imageId ? [imageId] : [],
        ...(cleanDesc ? { shortDesc: cleanDesc.slice(0, 140), desc: cleanDesc.slice(0, 1500) } : {}),
        category: guessCategory(kw, name),
        keyword: kw,
        source: 'shopee',
        source_url: shopId ? `https://shopee.vn/product/${shopId}/${itemId}` : `https://shopee.vn/search?keyword=${encodeURIComponent(kw)}`,
        crawled_at: new Date().toISOString(),
        status: 'draft',
        is_verified: true
      });
    }
  }
  return results;
}

export function inspectMfeInitialDataPdp(html) {
  if (!html || typeof html !== 'string' || !html.includes('mfe-initial-data')) {
    return null;
  }
  const mfeMatch = html.match(/<script\b[^>]*type=["']text\/mfe-initial-data["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!mfeMatch) return null;
  const mfeObj = tryJsonParseSafe(mfeMatch[1].trim());
  const initState = mfeObj?.initialState || mfeObj;
  if (!initState || typeof initState !== 'object') return null;

  const dp = initState.DOMAIN_PDP;
  const cMap = dp?.data?.PDP_BFF_DATA?.cachedMap || dp?.data?.cachedMap;
  const firstEntry = cMap && typeof cMap === 'object' ? Object.values(cMap)[0] : null;
  const itemSlice = initState.item && typeof initState.item === 'object' ? initState.item : null;

  let priceRedacted = false;
  if (firstEntry && typeof firstEntry === 'object' && firstEntry.item && typeof firstEntry.item === 'object') {
    const it = firstEntry.item;
    const remFields = firstEntry.removed_fields ?? firstEntry.removedFields;
    const noMainPrice =
      (it.price === null || it.price === undefined) &&
      (it.price_min === null || it.price_min === undefined) &&
      (firstEntry.product_price === null || firstEntry.product_price === undefined) &&
      (firstEntry.productPrice === null || firstEntry.productPrice === undefined);
    const hasRemovedMarker =
      Array.isArray(remFields) &&
      (remFields.length === 0 || remFields.some((f) => /price|flash_sale|deep_discount|exclusive_price/i.test(String(f || ''))));
    if (noMainPrice && (hasRemovedMarker || firstEntry.detail_level !== undefined || firstEntry.detailLevel !== undefined)) {
      priceRedacted = true;
    }
  }

  return { initState, dp, firstEntry, itemSlice, priceRedacted };
}

function extractPdpHtmlDiag(html, directProduct = null) {
  if (!html || typeof html !== 'string') return '';
  const ldMatches = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const ldInfo = ldMatches.slice(0, 3).map((m) => {
    try {
      const obj = JSON.parse(decodeHtmlEntities(m[1].trim()));
      const node = Array.isArray(obj) ? obj[0] : obj?.['@graph']?.[0] || obj;
      const offer = Array.isArray(node?.offers) ? node.offers[0] : node?.offers;
      return `${node?.['@type'] || '?'}(p=${offer?.price ?? offer?.lowPrice ?? '-'})`;
    } catch {
      return 'badjson';
    }
  });
  const metaP =
    extractMetaPropertyContent(html, 'product:price:amount') ||
    extractMetaPropertyContent(html, 'og:price:amount') ||
    (html.match(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i)?.[1] || '');
  const ogImg = extractMetaPropertyContent(html, 'og:image') ? 'y' : 'n';
  const embIds = (html.match(/"(?:itemid|item_id)"\s*:/gi) || []).length;
  const domains = [...new Set(html.match(/"DOMAIN_[A-Z0-9_]+"/g) || [])]
    .map((d) => d.replace(/"/g, ''))
    .slice(0, 10);
  let extra = domains.length ? `,domains=[${domains.join('|')}]` : '';
  if (directProduct?.itemId) {
    const idRe = new RegExp(directProduct.itemId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    let m;
    let totalCnt = 0;
    let pricedCnt = 0;
    let bestCtx = '';
    while ((m = idRe.exec(html)) !== null && totalCnt < 600) {
      totalCnt++;
      const win = html.slice(Math.max(0, m.index - 200), m.index + 500);
      if (/"(?:price|price_min|product_price|productPrice|title|name|image)"\s*:/i.test(win)) {
        pricedCnt++;
        if (!bestCtx) {
          bestCtx = sanitizeErrorText(win.replace(/\s+/g, ' '));
        }
      }
    }
    const mainClean = stripTags(stripTagBlocks(html, ['header', 'nav', 'footer', 'script', 'style', 'svg', 'noscript']));
    const domPriceHits = (mainClean.match(/(?:₫\s*[\d.,]+|[\d.,]+\s*[₫đ]|\b\d{1,3}(?:\.\d{3}){1,2}\b)/g) || []).slice(0, 4);
    extra += `,tId=${totalCnt}(wP=${pricedCnt}),domP=[${domPriceHits.join('|')}]`;
    const mfeInfo = inspectMfeInitialDataPdp(html);
    if (mfeInfo) {
      const { initState, dp, firstEntry, itemSlice } = mfeInfo;
      extra += `,mfeKeys=[${Object.keys(initState).slice(0, 10).join('|')}]`;
      if (firstEntry && typeof firstEntry === 'object') {
        extra += `,ceKeys=[${Object.keys(firstEntry).join('|')}]`;
        const ceItem = firstEntry.item && typeof firstEntry.item === 'object' ? firstEntry.item : {};
        const ceItemPriceKeys = Object.entries(ceItem)
          .filter(([k]) => /(?:price|model|tier|img|sold|rating|hidden)/i.test(k))
          .slice(0, 12)
          .map(([k, v]) => `${k}:${Array.isArray(v) ? `arr[${v.length}]` : typeof v === 'object' && v !== null ? `{${Object.keys(v).slice(0, 4).join(',')}}` : v}`);
        extra += `,ceIt=[${ceItemPriceKeys.join(',')}]`;
        extra += `,ceP=${sanitizeErrorText(JSON.stringify(firstEntry.product_price ?? firstEntry.productPrice ?? null)).slice(0, 200)}`;
        extra += `,dl=${firstEntry.detail_level ?? firstEntry.detailLevel ?? '-'}`;
        extra += `,rem=${sanitizeErrorText(JSON.stringify(firstEntry.removed_fields ?? firstEntry.removedFields ?? null)).slice(0, 180)}`;
        extra += `,m0=${sanitizeErrorText(JSON.stringify(ceItem.models?.[0] ?? null)).slice(0, 180)}`;
        extra += `,pSub=${sanitizeErrorText(JSON.stringify({ fs: firstEntry.flash_sale ?? null, fsp: firstEntry.flash_sale_preview ?? null, dd: firstEntry.deep_discount ?? null, ep: firstEntry.exclusive_price ?? null, pb: firstEntry.price_breakdown ?? null })).slice(0, 220)}`;
      } else {
        const dpStr = dp ? sanitizeErrorText(JSON.stringify(dp)).slice(0, 260) : '';
        if (dpStr) extra += `,dp=${dpStr}`;
      }
      if (itemSlice && typeof itemSlice === 'object') {
        extra += `,itSliceKeys=[${Object.keys(itemSlice).slice(0, 8).join('|')}]`;
        extra += `,itIt=${sanitizeErrorText(JSON.stringify(itemSlice?.items ?? null)).slice(0, 200)}`;
      }
    } else if (bestCtx) {
      extra += `,ctx="${bestCtx.slice(0, 160)}"`;
    }
  }
  return `pdpDiag(ld=${ldMatches.length}${ldInfo.length ? `[${ldInfo.join(',')}]` : ''},mPrice=${metaP || '-'},ogImg=${ogImg},embIds=${embIds}${extra})`;
}

function extractPdpMetaFallback(html, directProduct, kw) {
  if (!directProduct || !html) return [];
  const mainHtml = stripTagBlocks(html, ['header', 'nav', 'footer', 'script', 'style', 'svg', 'noscript']);
  const h1Match = mainHtml.match(/<h1\b[^>]*>([\s\S]{0,1000}?)<\/h1>/i);
  const ogTitle = extractMetaPropertyContent(html, 'og:title');
  const docTitle = extractHtmlTitle(html);

  const cleanPdpTitle = (s) =>
    stripTags(s || '')
      .replace(/\s*\|\s*Shopee.*$/i, '')
      .replace(/^Mua ngay\s+/i, '')
      .trim();
  const isValidPdpTitle = (t) => Boolean(t && t.length >= 5 && !/^shopee(?: việt nam)?$/i.test(t) && !/đăng nhập/i.test(t));

  let rawTitle = cleanPdpTitle(h1Match && h1Match[1]);
  if (!isValidPdpTitle(rawTitle)) rawTitle = cleanPdpTitle(ogTitle);
  if (!isValidPdpTitle(rawTitle)) rawTitle = cleanPdpTitle(docTitle);
  if (!isValidPdpTitle(rawTitle)) {
    return [];
  }

  const metaPrice =
    extractMetaPropertyContent(html, 'product:price:amount') ||
    extractMetaPropertyContent(html, 'og:price:amount') ||
    (html.match(/<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i)?.[1] || '');
  let price = metaPrice ? parseVndPrice(metaPrice) : 0;
  if (!price) {
    price = extractCardPrices(mainHtml).price;
  }
  if (!price || price < 1000) return [];

  const ogImg = extractMetaPropertyContent(html, 'og:image');
  let [imageId, cdnUrl] = ogImg ? extractImageRef(ogImg) : ['', ''];
  if (!cdnUrl) {
    [imageId, cdnUrl] = extractCardImage(mainHtml);
  }

  return [
    {
      shopee_id: directProduct.itemId,
      shop_id: directProduct.shopId,
      name: rawTitle.slice(0, 150),
      price,
      orig: null,
      rating: 4.9,
      reviews: 20,
      sold: 0,
      stock: 0,
      stock_needs_review: true,
      images: cdnUrl ? [cdnUrl] : [],
      image_id: imageId,
      image_url: cdnUrl,
      all_image_ids: imageId ? [imageId] : [],
      category: guessCategory(kw, rawTitle),
      keyword: kw,
      source: 'shopee',
      source_url: directProduct.canonicalUrl,
      crawled_at: new Date().toISOString(),
      status: 'draft',
      is_verified: true
    }
  ];
}

export function parseShopeeHtml(html, kw, maxItems = 40, finalUrl = '') {
  if (!html || typeof html !== 'string') {
    return { items: [], blocked: false, loginRequired: false, notFound: false, domStats: { hrefMatches: 0, sqeItems: 0, cdnImgs: 0 } };
  }

  const directProduct = parseShopeeProductUrl(kw);
  const evalData = extractEvalPayloadFromHtml(html);
  const resolvedFinalUrl = finalUrl || String(evalData?.url || '');
  const domStats = inspectHtmlDomStats(html);
  if (evalData && typeof evalData.sqeCount === 'number' && evalData.sqeCount > domStats.sqeItems) {
    domStats.sqeItems = evalData.sqeCount;
  }

  if (evalData) {
    const rawEvalItems = parseEvalPayloadToItems(evalData, kw, maxItems);
    const evalItems = directProduct ? rawEvalItems.filter((it) => scoreProductMatch(it, kw) > 0) : rawEvalItems;
    if (evalItems.length > 0) {
      return { items: evalItems, blocked: false, loginRequired: false, notFound: false, domStats, evalData, itemSources: ['DOM_EVAL'] };
    }
  }

  const rawEmbedded = extractEmbeddedJsonItems(html, kw, maxItems);
  const embedded = directProduct ? rawEmbedded.filter((it) => scoreProductMatch(it, kw) > 0) : rawEmbedded;
  if (embedded.length > 0) {
    return { items: embedded, blocked: false, loginRequired: false, notFound: false, domStats, evalData, itemSources: ['EMBEDDED_JSON'] };
  }

  const rawJsonLd = extractJsonLdProducts(html, kw, directProduct);
  const jsonLdItems = directProduct ? rawJsonLd.filter((it) => scoreProductMatch(it, kw) > 0) : rawJsonLd;
  if (jsonLdItems.length > 0) {
    return { items: jsonLdItems.slice(0, maxItems), blocked: false, loginRequired: false, notFound: false, domStats, evalData, itemSources: ['JSON_LD'] };
  }

  if (directProduct) {
    const blockedPdp = isAntibotChallengeHtml(html, resolvedFinalUrl);
    const loginPdp = isLoginRedirectHtml(html, resolvedFinalUrl);
    if (!blockedPdp && !loginPdp) {
      const pdpFallback = extractPdpMetaFallback(html, directProduct, kw);
      if (pdpFallback.length > 0) {
        return { items: pdpFallback, blocked: false, loginRequired: false, notFound: false, domStats, evalData, itemSources: ['PDP_META'] };
      }
    }
  }

  const parsed = [];
  const seenIds = new Set();
  // Exclude header/nav/footer chrome so mini-cart popovers or user menu links are never harvested
  const mainHtml = stripTagBlocks(html, ['header', 'nav', 'footer', 'script', 'style', 'svg', 'noscript']);
  const mainLow = mainHtml.toLowerCase();
  const anchorOpenRe = /<a\b([^>]*)>/gi;
  let match;

  while ((match = anchorOpenRe.exec(mainHtml)) !== null && parsed.length < maxItems) {
    const hrefAttrMatch = match[1].match(/\bhref=(["'])([^"']+)\1/i);
    if (!hrefAttrMatch) continue;
    const href = safeDecodeHref(decodeHtmlEntities(hrefAttrMatch[2]));
    const hrefM = href.match(SHOPEE_HREF_RE);
    if (!hrefM) continue;

    const shopId = hrefM[1] || hrefM[3] || '';
    const itemId = hrefM[2] || hrefM[4] || '';
    if (!itemId || seenIds.has(itemId)) continue;

    const openEndIdx = match.index + match[0].length;
    const closeAnchorIdx = mainLow.indexOf('</a>', openEndIdx);
    const anchorEndIdx =
      closeAnchorIdx !== -1 && closeAnchorIdx - openEndIdx <= 3000
        ? closeAnchorIdx + 4
        : Math.min(mainHtml.length, openEndIdx + 1200);
    const fragment = findCardFragmentAroundAnchor(mainHtml, match.index, anchorEndIdx);
    const name = extractCardName(fragment);
    if (!name || name.length < 3) continue;

    const { price, orig } = extractCardPrices(fragment);
    if (!price || price <= 0) continue;

    const soldElM = fragment.match(/<[^>]*data-sqe=["']sold["'][^>]*>([\s\S]*?)<\/[^>]+>/i);
    let sold = soldElM ? parseSoldCount(stripTags(soldElM[1])) : 0;
    if (!sold) {
      const plain = stripTags(fragment);
      const soldTextM =
        plain.match(/đã bán\s*([\d.,]+\s*k?\+?)/i) ||
        plain.match(/([\d.,]+\s*k?\+?)\s*đã bán/i);
      if (soldTextM) sold = parseSoldCount(soldTextM[1]);
    }

    const [imageId, fallbackCdn] = extractCardImage(fragment);
    const sourceUrl = shopId
      ? `https://shopee.vn/product/${shopId}/${itemId}`
      : href.startsWith('/')
        ? `https://shopee.vn${href}`
        : href;

    seenIds.add(itemId);
    parsed.push({
      shopee_id: itemId,
      shop_id: shopId,
      name: name.slice(0, 150),
      price,
      orig,
      rating: 4.9,
      reviews: sold > 0 ? Math.max(50, Math.trunc(sold * 0.12)) : 20,
      sold,
      stock: 0,
      stock_needs_review: true,
      images: fallbackCdn ? [fallbackCdn] : [],
      image_id: imageId,
      image_url: fallbackCdn,
      all_image_ids: imageId ? [imageId] : [],
      category: guessCategory(kw, name),
      keyword: kw,
      source: 'shopee',
      source_url: sourceUrl,
      crawled_at: new Date().toISOString(),
      status: 'draft',
      is_verified: true
    });
  }

  const filteredParsed = directProduct ? parsed.filter((it) => scoreProductMatch(it, kw) > 0) : parsed;

  if (filteredParsed.length === 0) {
    const blocked = isAntibotChallengeHtml(html, resolvedFinalUrl);
    const loginRequired = isLoginRedirectHtml(html, resolvedFinalUrl);
    const notFound = !blocked && !loginRequired && isProductNotFoundHtml(html, resolvedFinalUrl);
    const mfeInfo = directProduct ? inspectMfeInitialDataPdp(html) : null;
    const priceRedactedNoAuth = Boolean(directProduct && !blocked && !loginRequired && !notFound && mfeInfo?.priceRedacted);
    return {
      items: [],
      blocked,
      loginRequired,
      notFound,
      priceRedactedNoAuth,
      domStats,
      evalData,
      sampleCard: evalData?.sampleCard || (domStats.sqeItems > 0 ? extractFirstSqeCardSample(mainHtml || html) : ''),
      itemSources: []
    };
  }

  return { items: filteredParsed, blocked: false, loginRequired: false, notFound: false, domStats, evalData, itemSources: ['DOM'] };
}

export function extractHtmlTitle(html) {
  const m = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]).slice(0, 100) : '';
}

const EXCLUDED_NON_CATALOG_XHR_RE =
  /(\/subcart|\/cart\/|\/cart\b|checkout|\/account\/|\/user\/|\/buyer\/|\/login|notification|\/chat\/|voucher|wallet|\/coin|\/order|event_batch|\/metrics|stm-sg-live|\/vi\.col\d+|\/tracking|\/log\b|recently_viewed|get_payment_info|mini_cart)/i;
const NOISY_LOG_XHR_RE =
  /(\/account\/subaccount|get_payment_info|web_experiments|track_config|experiment\/config|event_batch|\/metrics|\/webchat\/|app-auth|\/subcart|\/cart\/mini)/i;
const PRIMARY_PDP_XHR_RE = /(\/pdp\/get_pc|\/pdp\/get_rw|\/item\/get|\/pdp\/)/i;
const PRIMARY_SEARCH_XHR_RE =
  /(search_items|global_search|search_page|recommend_search|recommend_v2|\/search\/|search\?|get_category_tree|\/pdp\/get_pc|\/pdp\/get_rw|\/item\/get|\/_t_|\/json\b)/i;

export function parseZenrowsJsonPayload(payload, kw, maxItems = 40) {
  if (!payload || typeof payload !== 'object') {
    return {
      items: [],
      blocked: false,
      loginRequired: false,
      xhrSummary: [],
      itemSources: [],
      finalUrl: '',
      bodySnippet: '',
      sampleCard: '',
      domStats: { hrefMatches: 0, sqeItems: 0, cdnImgs: 0 }
    };
  }

  const directProduct = parseShopeeProductUrl(kw);
  const internalCap = Math.max(Number(maxItems) || 40, 80);
  const pdpXhrItems = [];
  const pdpSeenIds = new Set();
  const primarySearchItems = [];
  const primarySeenIds = new Set();
  const secondaryXhrItems = [];
  const secondarySeenIds = new Set();
  const pdpSources = [];
  const primarySources = [];
  const secondarySources = [];
  let xhrBlocked = false;
  let xhrLoginRequired = false;
  const catalogXhrSummary = [];
  const interestingXhrSummary = [];
  const fallbackXhrSummary = [];
  const seenSummaryLabels = new Set();
  let finalUrl = String(payload.url || payload.final_url || '');

  const xhrEntries = Array.isArray(payload.xhr) ? payload.xhr : [];
  for (const entry of xhrEntries) {
    if (!entry || typeof entry !== 'object') continue;
    const rawUrl = String(entry.url || '');
    const lowUrl = rawUrl.toLowerCase();
    const method = String(entry.method || 'GET').toUpperCase();
    const status = entry.status_code ?? entry.status ?? entry.statusCode ?? null;
    const isNoiseTranslation =
      lowUrl.includes('stm-sg-live') ||
      /\/vi\.col\d+/i.test(lowUrl) ||
      lowUrl.includes('event_batch') ||
      lowUrl.includes('/metrics');

    const isExcluded = EXCLUDED_NON_CATALOG_XHR_RE.test(lowUrl);
    let bodyJson = null;
    const bodyRaw = entry.body;
    const bodyLen = typeof bodyRaw === 'string' ? bodyRaw.length : 0;

    if (!isExcluded || bodyLen < 16384) {
      if (bodyRaw && typeof bodyRaw === 'object') {
        bodyJson = bodyRaw;
      } else if (typeof bodyRaw === 'string' && bodyRaw.trim()) {
        try {
          bodyJson = JSON.parse(bodyRaw);
        } catch {
          bodyJson = null;
        }
      }
    }

    if (method !== 'OPTIONS' && !isNoiseTranslation) {
      const errTag = bodyJson?.error && bodyJson.error !== 0 ? ` err=${bodyJson.error}` : '';
      let keysTag;
      if (bodyJson && typeof bodyJson === 'object') {
        if (Array.isArray(bodyJson)) {
          keysTag = ` arr[${bodyJson.length}]`;
        } else {
          const allKeys = Object.keys(bodyJson);
          const namedKeys = allKeys.filter((k) => !/^\d+$/.test(k)).slice(0, 4);
          keysTag = namedKeys.length ? ` keys=${namedKeys.join('|')}` : ` idx[${allKeys.length}]`;
        }
      } else {
        keysTag = bodyRaw && typeof bodyRaw === 'object' ? ` ${method} [obj]` : ` ${method} ${bodyLen}B`;
      }
      const summaryLabel = `${redactUrlForLogs(rawUrl)}(${status ?? '?'}${errTag}${keysTag})`;
      if (!seenSummaryLabels.has(summaryLabel)) {
        seenSummaryLabels.add(summaryLabel);
        if (PRIMARY_SEARCH_XHR_RE.test(lowUrl) && catalogXhrSummary.length < 12) {
          catalogXhrSummary.push(summaryLabel);
        } else if (!NOISY_LOG_XHR_RE.test(lowUrl) && interestingXhrSummary.length < 10) {
          interestingXhrSummary.push(summaryLabel);
        } else if (fallbackXhrSummary.length < 6) {
          fallbackXhrSummary.push(summaryLabel);
        }
      }
    }

    if (status === 401 || lowUrl.includes('/buyer/login')) {
      xhrLoginRequired = true;
    }

    if (isExcluded) {
      continue;
    }

    if (!bodyJson || typeof bodyJson !== 'object') continue;

    if (bodyJson.error && bodyJson.error !== 0) {
      xhrBlocked = true;
    }

    if (directProduct && pdpXhrItems.some((it) => scoreProductMatch(it, kw) > 0)) {
      continue;
    }

    if (PRIMARY_PDP_XHR_RE.test(lowUrl)) {
      const before = pdpXhrItems.length;
      collectShopeeItemsFromObject(bodyJson, kw, pdpSeenIds, pdpXhrItems, internalCap);
      if (pdpXhrItems.length > before) {
        pdpSources.push(redactUrlForLogs(rawUrl));
      }
    } else if (PRIMARY_SEARCH_XHR_RE.test(lowUrl)) {
      const before = primarySearchItems.length;
      collectShopeeItemsFromObject(bodyJson, kw, primarySeenIds, primarySearchItems, internalCap);
      if (primarySearchItems.length > before) {
        primarySources.push(redactUrlForLogs(rawUrl));
      }
    } else {
      const before = secondaryXhrItems.length;
      collectShopeeItemsFromObject(bodyJson, kw, secondarySeenIds, secondaryXhrItems, internalCap);
      if (secondaryXhrItems.length > before) {
        secondarySources.push(redactUrlForLogs(rawUrl));
      }
    }
  }

  const xhrSummary = [...catalogXhrSummary, ...interestingXhrSummary];
  if (xhrSummary.length === 0 && fallbackXhrSummary.length > 0) {
    xhrSummary.push(...fallbackXhrSummary);
  }

  const rawHtml = String(payload.html || '');
  if (directProduct) {
    const exactPool = [...pdpXhrItems, ...primarySearchItems, ...secondaryXhrItems].filter(
      (it) => scoreProductMatch(it, kw) > 0
    );
    if (exactPool.length > 0) {
      const mergedSrc = [...new Set([...pdpSources, ...primarySources, ...secondarySources])];
      return {
        items: exactPool.slice(0, maxItems),
        blocked: false,
        loginRequired: false,
        notFound: false,
        xhrSummary,
        itemSources: mergedSrc,
        finalUrl,
        bodySnippet: '',
        sampleCard: '',
        domStats: inspectHtmlDomStats(rawHtml)
      };
    }
  }

  const mergedPrimary = [...pdpXhrItems, ...primarySearchItems];
  if (!directProduct && mergedPrimary.length > 0) {
    return {
      items: mergedPrimary.slice(0, internalCap),
      blocked: false,
      loginRequired: false,
      notFound: false,
      xhrSummary,
      itemSources: [...new Set([...pdpSources, ...primarySources])],
      finalUrl,
      bodySnippet: '',
      sampleCard: '',
      domStats: inspectHtmlDomStats(rawHtml)
    };
  }

  const htmlRes = parseShopeeHtml(rawHtml, kw, internalCap, finalUrl);
  if (!finalUrl && htmlRes.evalData?.url) {
    finalUrl = String(htmlRes.evalData.url);
  }
  if (htmlRes.items.length > 0) {
    return {
      items: htmlRes.items,
      blocked: false,
      loginRequired: false,
      notFound: false,
      xhrSummary,
      itemSources: htmlRes.itemSources || ['DOM'],
      finalUrl,
      bodySnippet: '',
      sampleCard: '',
      evalData: htmlRes.evalData,
      domStats: htmlRes.domStats
    };
  }

  const bodyDiagText =
    sanitizeErrorText(String(htmlRes.evalData?.mainText || '')) || extractVisibleBodySnippet(rawHtml, 480);

  if (!directProduct && secondaryXhrItems.length > 0) {
    return {
      items: secondaryXhrItems.slice(0, internalCap),
      blocked: false,
      loginRequired: false,
      notFound: false,
      xhrSummary,
      itemSources: secondarySources,
      finalUrl,
      bodySnippet: bodyDiagText.slice(0, 480),
      sampleCard: htmlRes.sampleCard || '',
      evalData: htmlRes.evalData,
      domStats: htmlRes.domStats
    };
  }

  return {
    items: [],
    blocked: Boolean(xhrBlocked || htmlRes.blocked),
    loginRequired: Boolean(xhrLoginRequired || htmlRes.loginRequired),
    notFound: Boolean(htmlRes.notFound),
    priceRedactedNoAuth: Boolean(htmlRes.priceRedactedNoAuth),
    xhrSummary,
    itemSources: [],
    finalUrl,
    bodySnippet: bodyDiagText.slice(0, 480),
    sampleCard: htmlRes.sampleCard || '',
    evalData: htmlRes.evalData,
    domStats: htmlRes.domStats
  };
}

export function allocateProductsFairly(capturedByKw, keywords, totalLimit) {
  if (!totalLimit || totalLimit <= 0 || !Array.isArray(keywords)) return [];
  const cleanKws = keywords.map((k) => String(k || '').trim()).filter(Boolean);
  const n = cleanKws.length;
  if (n === 0) return [];

  const baseQuota = Math.floor(totalLimit / n);
  const remainder = totalLimit % n;
  const cursors = Object.fromEntries(cleanKws.map((kw) => [kw, 0]));
  const seenIds = new Set();
  const selected = [];

  for (let idx = 0; idx < cleanKws.length; idx++) {
    if (selected.length >= totalLimit) break;
    const kw = cleanKws[idx];
    const targetForKw = baseQuota > 0 ? baseQuota + (idx < remainder ? 1 : 0) : 1;
    const items = capturedByKw[kw] || [];
    let picked = 0;
    while (cursors[kw] < items.length && picked < targetForKw && selected.length < totalLimit) {
      const candidate = items[cursors[kw]++];
      const sid = String(candidate?.shopee_id || '');
      if (sid && seenIds.has(sid)) continue;
      if (sid) seenIds.add(sid);
      selected.push(candidate);
      picked++;
    }
  }

  let addedInRound = true;
  while (selected.length < totalLimit && addedInRound) {
    addedInRound = false;
    for (const kw of cleanKws) {
      if (selected.length >= totalLimit) break;
      const items = capturedByKw[kw] || [];
      while (cursors[kw] < items.length) {
        const candidate = items[cursors[kw]++];
        const sid = String(candidate?.shopee_id || '');
        if (sid && seenIds.has(sid)) continue;
        if (sid) seenIds.add(sid);
        selected.push(candidate);
        addedInRound = true;
        break;
      }
    }
  }

  return selected.slice(0, totalLimit);
}

function detectImageExtension(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  // WebP: RIFF....WEBP
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png';
  }
  return null;
}

export async function downloadImage(imageId, pid, fallbackUrl = '', imgDir = 'public/products/shopee_live', fetchImpl = fetch) {
  const cdnUrl = imageId ? `https://down-vn.img.susercontent.com/file/${imageId}` : (fallbackUrl || '');
  if (!cdnUrl) return ['/placeholder.svg'];

  const targetDir = path.resolve(imgDir);
  await fsPromises.mkdir(targetDir, { recursive: true });

  for (const ext of ['webp', 'jpg', 'png']) {
    const existing = path.join(targetDir, `${pid}.${ext}`);
    try {
      const st = await fsPromises.stat(existing);
      if (st.size > 500) {
        return [`/products/shopee_live/${pid}.${ext}`, cdnUrl];
      }
    } catch {
      // ignore missing file
    }
  }

  try {
    const res = await fetchImpl(cdnUrl, {
      method: 'GET',
      headers: {
        Referer: 'https://shopee.vn/',
        'User-Agent': UA
      },
      signal: AbortSignal.timeout(15000)
    });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      const ext = detectImageExtension(buf);
      if (ext && buf.length > 500) {
        const dest = path.join(targetDir, `${pid}.${ext}`);
        await fsPromises.writeFile(dest, buf);
        return [`/products/shopee_live/${pid}.${ext}`, cdnUrl];
      }
    }
  } catch {
    // fallback safely to real CDN URL
  }

  return [cdnUrl];
}

// ---------------------------------------------------------------------------
// Scraping API Provider Adapters
// ---------------------------------------------------------------------------

async function fetchWithExplicitTimeout(url, options = {}, timeoutMs = 90000, fetchImpl = fetch) {
  const controller = new AbortController();
  let timedOut = false;
  const timerId = setTimeout(() => {
    timedOut = true;
    const timeoutErr = new Error(`Request timeout after ${Math.round(timeoutMs / 1000)}s`);
    timeoutErr.name = 'TimeoutError';
    controller.abort(timeoutErr);
  }, timeoutMs);

  try {
    const res = await fetchImpl(url, {
      ...options,
      signal: controller.signal
    });
    const text = await res.text();
    return { res, text, timedOut: false };
  } catch (err) {
    if (timedOut || err?.name === 'AbortError' || err?.name === 'TimeoutError') {
      return { res: null, text: '', timedOut: true, timeoutMs };
    }
    throw err;
  } finally {
    clearTimeout(timerId);
  }
}

async function callZenrowsOnce({ apiKey, paramsObj, extraHeaders = {}, timeoutMs = 90000, fetchImpl = fetch }) {
  const qs = new URLSearchParams({
    apikey: apiKey,
    ...paramsObj
  });
  const url = `https://api.zenrows.com/v1/?${qs.toString()}`;
  const out = await fetchWithExplicitTimeout(
    url,
    {
      method: 'GET',
      headers: extraHeaders
    },
    timeoutMs,
    fetchImpl
  );

  if (out.timedOut || !out.res) {
    return { status: 0, text: '', jsonBody: null, timedOut: true, timeoutMs };
  }

  const status = out.res.status;
  const ctype = (out.res.headers?.get?.('content-type') || '').toLowerCase();
  let rawText = out.text;
  out.text = '';
  let jsonBody = null;
  if (ctype.includes('application/json') || rawText.trimStart().startsWith('{')) {
    try {
      jsonBody = JSON.parse(rawText);
      // Release multi-MB raw JSON string so V8 can reclaim memory under 512MB RAM cap
      rawText = '';
    } catch {
      jsonBody = null;
    }
  }
  return { status, text: rawText, jsonBody, timedOut: false };
}

function handleZenrowsFatalStatus(status, jsonBody, rawText = '', { allowTarget403 = false } = {}) {
  if (status === 401) {
    throw new ProviderFatalError(`ZenRows từ chối API Key (HTTP ${status}). Vui lòng kiểm tra ZENROWS_API_KEY.`);
  }
  if (status === 403) {
    const code = String(jsonBody?.code || '').toUpperCase();
    const lowBody = String(rawText || jsonBody?.title || jsonBody?.detail || '').toLowerCase();
    const looksLikeTargetBlock =
      allowTarget403 &&
      !code.startsWith('AUTH') &&
      (Boolean(jsonBody?.error) || !lowBody.includes('zenrows') && (lowBody.includes('shopee') || lowBody.includes('access denied') || lowBody.includes('captcha') || lowBody.includes('cloudflare') || lowBody === ''));
    if (!looksLikeTargetBlock) {
      throw new ProviderFatalError(`ZenRows từ chối API Key (HTTP ${status}). Vui lòng kiểm tra ZENROWS_API_KEY.`);
    }
    return { target403: true };
  }
  if (status === 402) {
    throw new ProviderFatalError('Tài khoản ZenRows đã hết credit hoặc hạn mức miễn phí (HTTP 402).');
  }
  if (status === 429) {
    throw new ProviderFatalError('ZenRows đang giới hạn tốc độ / số kết nối đồng thời (HTTP 429). Vui lòng thử lại sau ít phút.');
  }
  if (status === 400 && jsonBody?.code === 'REQS001') {
    throw new ProviderFatalError('ZenRows không cho phép truy cập domain mục tiêu (REQS001).');
  }
  return { target403: false };
}

function buildZenrowsNetworkSpyBody() {
  return (
    "try{const W=window;if(!W.__s){W.__s=1;const C=W.__c=[]," +
    "M=/search_i|global_s|recommend|pdp\\/|item\\/get/i," +
    "P=t=>{try{let d,a;if(C.length<3&&t.length>40&&t.length<12e5)d=JSON.parse(t),a=d.data?.items||d.items,C.push(a&&t.length>18e4?{data:{items:a.slice(0,35)}}:d);}catch{}}," +
    "F=W.fetch;if(F)W.fetch=function(...a){const u=a[0]?.url||a[0]+'';" +
    "return F.apply(this,a).then(r=>{try{M.test(u)&&r.clone().text().then(P,()=>{});}catch{}return r;});};" +
    "const X=XMLHttpRequest.prototype,O=X.open,S=X.send;" +
    "X.open=function(m,u){this.__u=u;return O.apply(this,arguments);};" +
    "X.send=function(){try{M.test(this.__u||'')&&this.addEventListener('load',()=>P(this.responseText));}catch{}return S.apply(this,arguments);};}}catch{}"
  );
}

function buildZenrowsNetworkSpyScript() {
  return `(()=>{${buildZenrowsNetworkSpyBody()}})()`;
}

function buildZenrowsDomEvalScript({ includePdp = false } = {}) {
  if (includePdp) {
    return (
      "(()=>{const D=document,L=location,SA=v=>D.documentElement.setAttribute('data-sr-eval',JSON.stringify(v)),T=s=>(''+(s||'')).replace(/\\s+/g,' ').trim();try{" +
      "const Q=(e,s)=>e?.querySelector(s),QA=s=>[...D.querySelectorAll(s)],A=(e,k)=>e?.getAttribute(k)||''," +
      "R=/(?:-i\\.(\\d+)\\.(\\d+)|\\/product\\/(\\d+)\\/(\\d+))/i,M=p=>Q(D,`meta[property='${p}']`)?.content||''," +
      "IU=x=>x.currentSrc||x.src||A(x,'data-src')||A(x,'data-lazy-src')||A(x,'srcset').split(/[\\s,]/)[0]," +
      "C=window.__c||[],cp=C.slice(0,3)," +
      "pm=L.pathname.match(R),mt=T((Q(D,'main,[role=main]')||D.body)?.innerText)," +
      "mp=M('product:price:amount')||M('og:price:amount')||A(Q(D,'meta[itemprop=price]'),'content')," +
      "pp=mt.match(/(?:₫\\s*[\\d.,]+|[\\d.,]+\\s*[₫đ])/)?.[0]||mt.match(/\\b\\d{1,3}(?:\\.\\d{3}){1,2}\\b/)?.[0]||'';" +
      "SA({u:L.href,tt:D.title,rd:D.readyState,sq:0,cc:C.length,cp,its:[]," +
      "pdp:pm?{shopId:pm[1]||pm[3]||'',itemId:pm[2]||pm[4]||'',h1:Q(D,'main h1,h1')?.innerText?.trim()||'',metaPrice:mp,pdpPrice:pp,pdpOrig:Q(D,'main del,[class*=line-]')?.innerText?.trim()||'',pdpImg:QA('main img,picture img').map(IU).find(u=>/susercontent\\.com\\/file\\//i.test(u))||M('og:image'),ogImg:M('og:image'),ogTitle:M('og:title'),sold:mt.match(/[\\d.,]+k?\\+?\\s*đã bán|đã bán\\s*[\\d.,]+k?\\+?/i)?.[0]||''}:null," +
      "mt:mt.slice(0,750)});}catch(e){try{SA({u:L.href,rd:D.readyState,err:(''+e).slice(0,120)});}catch{}}})()"
    );
  }
  return (
    "(()=>{const D=document,L=location,SA=v=>D.documentElement.setAttribute('data-sr-eval',JSON.stringify(v)),T=s=>(''+(s||'')).replace(/\\s+/g,' ').trim();try{" +
    "const Q=(e,s)=>e?.querySelector(s),QA=(s,e=D)=>[...e.querySelectorAll(s)],A=(e,k)=>e?.getAttribute(k)||'',IT=(e,s)=>T(Q(e,s)?.innerText),G=v=>/^\\d{4,20}$/.test(v)?''+v:''," +
    "U=a=>[...new Set(a.filter(Boolean))],R=/(?:-i\\.(\\d+)\\.(\\d+)|\\/product\\/(\\d+)\\/(\\d+))/i,M=/susercontent|shopee/i,Z='__react'," +
    "K='item,item_basic,item_data,data'.split(',')," +
    "S=(o,d,s)=>{if(!o||typeof o!='object'||d>3||s.has(o))return;s.add(o);" +
    "const i=G(o.itemid||o.item_id||o.itemId||o.id),p=G(o.shopid||o.shop_id||o.shopId),h=o.href||o.to||o.url||'',H=R.test(h);" +
    "if((i&&(p||H))||H){const a=o.item_card_displayed_asset||o.item_data||o.item_basic||o,dp=a.display_price||a.item_card_display_price||a;" +
    "return{i,p,h,n:o.name||a.name||o.title,im:a.image||a.images?.[0]||o.image||o.images?.[0]," +
    "pr:dp.price||o.price||o.price_min,or:dp.strikethrough_price||a.price_before_discount||o.price_before_discount," +
    "sd:a.historical_sold||a.sold||a.sold_count?.text};}" +
    "for(const k of[...K,...Object.keys(o).slice(0,10)])if(o[k]&&!/^(_|return|child|sib|state)/.test(k)){const r=S(o[k],d+1,s);if(r)return r;}}," +
    "F=e=>{for(const n of[e,e.closest('a'),Q(e,'a'),e.firstElementChild,e.parentElement])if(n){const ks=Object.keys(n);" +
    "for(const k of ks)if(k.startsWith(Z+'P')){const r=S(n[k],0,new Set());if(r)return r;}" +
    "const fk=ks.find(k=>k.startsWith(Z+'F')||k.startsWith(Z+'I'));" +
    "if(fk)for(let c=n[fk],t=0;c&&t<9;t++,c=c.return){const r=S(c.memoizedProps,0,new Set());if(r)return r;}}}," +
    "IU=x=>x.currentSrc||x.src||A(x,'data-src')||A(x,'data-lazy-src')||A(x,'srcset').split(/[\\s,]/)[0]," +
    "BG=e=>(A(e,'style')+A(Q(e,'[style*=susercontent]'),'style')).match(/https?:\\/\\/[\\w.-]*susercontent[\\w./?=&@-]+/i)?.[0]||''," +
    "P=e=>{const a=e.closest('a[href]')||Q(e,'a[href]'),h=a?A(a,'href')||a.href:'',m=h.match(R);" +
    "return m?{i:m[2]||m[4]||'',p:m[1]||m[3]||'',h}:{i:G(A(e,'data-itemid')||A(e,'data-item-id')),p:G(A(e,'data-shopid')||A(e,'data-shop-id')),h};};" +
    "let cs=QA('[data-sqe=item],.shopee-search-item-result__item');if(!cs.length)cs=U(QA(`a[href*='-i.'],a[href*='/product/']`).map(a=>a.closest('li')||a));" +
    "if(!cs.length)cs=U(QA('main img').map(y=>M.test(IU(y))&&(y.closest('li,a')||y.parentElement)));" +
    "const its=[];let sc='';cs.slice(0,35).forEach((e,x)=>{const d=P(e),ims=QA('img',e),im=ims.find(y=>M.test(IU(y)))||ims.find(y=>/^https?:/i.test(IU(y))),iu=(im&&IU(im))||BG(e)," +
    "f=((!d.i||!iu)&&F(e))||{},fi=d.i||f.i||'',t=T(e.innerText).slice(0,220);" +
    "if(!x)sc='id='+(fi||'-')+' '+e.tagName;" +
    "its.push({h:d.h||f.h,i:fi,p:d.p||f.p,n:T(f.n||IT(e,'[data-sqe=name],[class*=clamp]')||(im&&im.alt)),t,d:IT(e,'del,[class*=line-]'),pt:IT(e,'[data-sqe=price]'),g:iu,fi:f.im,fp:f.pr,fo:f.or,fs:f.sd});});" +
    "const C=window.__c||[],cp=C.slice(0,3),mt=IT(D,'main')||T(D.body?.innerText);" +
    "SA({u:L.href,tt:D.title,rd:D.readyState,sq:cs.length,cc:C.length,cp,sc,its,mt:mt.slice(0,320)});" +
    "}catch(e){try{SA({u:L.href,rd:D.readyState,err:(''+e).slice(0,120)});}catch{}}})()"
  );
}

function buildZenrowsSearchSubmitScript(searchKw) {
  const kwJson = JSON.stringify(String(searchKw || ''));
  return (
    "(()=>{const D=document,L=location,Q=s=>D.querySelector(s),kw=" +
    kwJson +
    ",U='/search?keyword='+encodeURIComponent(kw);try{" +
    buildZenrowsNetworkSpyBody() +
    "Q('.shopee-popup__close-btn')?.click();" +
    "const i=Q('.shopee-searchbar-input__input,form input,input[type=search]');" +
    "if(i){const sv=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set," +
    "E=(n,o)=>i.dispatchEvent(new(o?KeyboardEvent:Event)(n,{bubbles:!0,...o}));" +
    "i.focus();sv?sv.call(i,kw):i.value=kw;E('input');E('change');" +
    "const b=Q('.shopee-searchbar__search-button,form button');" +
    "setTimeout(()=>{b?b.click():E('keydown',{key:'Enter',keyCode:13});},150);" +
    "setTimeout(()=>L.pathname=='/'&&L.assign(U),1200);}" +
    "else L.assign(U);}catch{L.assign(U);}})()"
  );
}

function extractCookieValue(cookieHeader, targetName) {
  const target = String(targetName || '').trim().toLowerCase();
  if (!cookieHeader || !target) return '';
  for (const seg of String(cookieHeader).split(';')) {
    const eq = seg.indexOf('=');
    if (eq <= 0) continue;
    const name = seg.slice(0, eq).trim().toLowerCase();
    if (name === target) {
      return seg.slice(eq + 1).trim();
    }
  }
  return '';
}

function hasRedactedPdpPriceInJson(root) {
  if (!root || typeof root !== 'object') return false;
  const dp = root.data && typeof root.data === 'object' ? root.data : root;
  const it = dp.item && typeof dp.item === 'object' ? dp.item : dp;
  const hasRemoved =
    Array.isArray(dp.removed_fields) ||
    Array.isArray(dp.removedFields) ||
    dp.detail_level !== undefined ||
    dp.detailLevel !== undefined;
  const noPrice =
    (it?.price === null || it?.price === undefined) &&
    (it?.price_min === null || it?.price_min === undefined) &&
    (dp?.product_price === null || dp?.product_price === undefined) &&
    (dp?.productPrice === null || dp?.productPrice === undefined);
  return Boolean(hasRemoved && noPrice);
}

export function buildShopeeDirectApiUrl(targetInfo, kw, maxItems = 20) {
  const apiCap = Math.min(60, Math.max(20, Number(maxItems) || 20));
  if (targetInfo?.kind === 'product' && targetInfo.shopId && targetInfo.itemId) {
    return `https://shopee.vn/api/v4/pdp/get_pc?item_id=${encodeURIComponent(targetInfo.itemId)}&shop_id=${encodeURIComponent(targetInfo.shopId)}`;
  }
  if (targetInfo?.kind === 'category' && targetInfo.categoryId) {
    const leafCatId = String(targetInfo.categoryId).split('.').filter(Boolean).pop();
    if (leafCatId) {
      return `https://shopee.vn/api/v4/search/search_items?by=pop&limit=${apiCap}&match_id=${encodeURIComponent(leafCatId)}&newest=0&order=desc&page_type=search`;
    }
  }
  const searchTerm = targetInfo?.kind === 'search' ? targetInfo.keywordText : kw;
  if (searchTerm && !/^https?:\/\//i.test(searchTerm)) {
    return `https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(searchTerm)}&limit=${apiCap}&newest=0&order=desc&page_type=search`;
  }
  return '';
}

function buildShopeeItemFallbackApiUrl(targetInfo) {
  if (targetInfo?.kind === 'product' && targetInfo.shopId && targetInfo.itemId) {
    return `https://shopee.vn/api/v4/item/get?itemid=${encodeURIComponent(targetInfo.itemId)}&shopid=${encodeURIComponent(targetInfo.shopId)}`;
  }
  return '';
}

export async function fetchViaZenrows(kw, apiKey, maxItems, options = {}) {
  const {
    fetchImpl = fetch,
    env = process.env,
    cookieHeader = '',
    onProgress = () => {},
    directApiFirst = true,
    directApiOnly: directApiOnlyOpt = false
  } = options;
  const directApiOnly = Boolean(directApiOnlyOpt || String(env?.ZENROWS_DIRECT_API_ONLY || '').trim() === '1');

  const log = (msg) => onProgress(`${sanitizeErrorText(msg)}\n`);
  const targetInfo = resolveTargetForInput(kw);
  const isDirectProduct = targetInfo.kind === 'product';
  const searchKwText = targetInfo.keywordText || kw;
  const coreCookie = cookieHeader ? extractCoreAuthCookieHeader(cookieHeader) : '';
  const domEvalScript = buildZenrowsDomEvalScript({ includePdp: isDirectProduct });
  const networkSpyScript = buildZenrowsNetworkSpyScript();
  const jsInstructionsPrimary = JSON.stringify(
    isDirectProduct
      ? [{ evaluate: networkSpyScript }, { wait: 4500 }, { scroll_y: 450 }, { wait: 1500 }, { scroll_y: 1000 }, { wait: 2000 }, { evaluate: domEvalScript }]
      : [{ evaluate: networkSpyScript }, { wait: 5000 }, { scroll_y: 800 }, { wait: 2000 }, { scroll_y: 1650 }, { wait: 2500 }, { evaluate: domEvalScript }]
  );
  const waitSelector = isDirectProduct
    ? 'meta[property="product:price:amount"], script[type="application/ld+json"], .product-briefing, [data-sqe="price"]'
    : '.shopee-search-item-result__item, [data-sqe="item"], a[href*="-i."], a[href*="/product/"]';

  let anyBlocked = false;
  let anyLoginRequired = false;
  let anyNotFound = false;
  let anyTimeout = false;
  let anyPriceRedacted = false;

  const inspectAndParse = (attemptLabel, resp, { allowTarget403 = false } = {}) => {
    if (resp.timedOut) {
      anyTimeout = true;
      const secs = Math.round((resp.timeoutMs || 90000) / 1000);
      log(`    [!] [${attemptLabel}] Quá thời gian chờ (${secs}s)${directApiOnly ? '.' : ' — đang chuyển phương án dự phòng...'}`);
      return { items: [], blocked: false, loginRequired: false, notFound: false, priceRedactedNoAuth: false, timedOut: true, code: 'TIMEOUT', httpStatus: 0, xhrCount: 0, htmlLen: 0 };
    }

    const fatalCheck = handleZenrowsFatalStatus(resp.status, resp.jsonBody, resp.text, { allowTarget403 });
    if (fatalCheck.target403) {
      anyBlocked = true;
      log(`    [!] [${attemptLabel}] Shopee trả HTTP 403 trên API trực tiếp${directApiOnly ? '.' : ' — leo thang sang trình duyệt antibot...'}`);
      return { items: [], blocked: true, loginRequired: false, notFound: false, priceRedactedNoAuth: false, timedOut: false, code: '403', httpStatus: 403, xhrCount: 0, htmlLen: 0 };
    }

    if (resp.status === 422) {
      anyBlocked = true;
      const errCode = resp.jsonBody?.code ? ` (${resp.jsonBody.code})` : '';
      log(`    [!] [${attemptLabel}] ZenRows trả HTTP 422${errCode}: mục tiêu tạm chặn hoặc chưa render xong.`);
      return { items: [], blocked: true, loginRequired: false, notFound: false, priceRedactedNoAuth: false, timedOut: false, code: resp.jsonBody?.code || '422', httpStatus: 422, xhrCount: 0, htmlLen: 0 };
    }

    if (resp.status === 400) {
      const code = resp.jsonBody?.code || 'HTTP_400';
      const title = sanitizeErrorText(resp.jsonBody?.title || resp.jsonBody?.detail || resp.text.slice(0, 160));
      log(`    [!] [${attemptLabel}] ZenRows HTTP 400 (${code}): ${title}`);
      return { items: [], blocked: code === 'REQS002', loginRequired: false, notFound: false, priceRedactedNoAuth: false, timedOut: false, code, httpStatus: 400, xhrCount: 0, htmlLen: 0 };
    }

    if (resp.status !== 200) {
      log(`    [!] [${attemptLabel}] ZenRows HTTP ${resp.status} cho '${kw}'.`);
      return { items: [], blocked: false, loginRequired: false, notFound: false, priceRedactedNoAuth: false, timedOut: false, code: String(resp.status), httpStatus: resp.status, xhrCount: 0, htmlLen: 0 };
    }

    const keepMatchingOnly = (itemsList, sourceList = []) => {
      const raw = Array.isArray(itemsList) ? itemsList : [];
      const matched = raw.filter((item) => scoreProductMatch(item, kw) > 0);
      if (raw.length > 0 && matched.length === 0) {
        const sampleNames = raw.slice(0, 2).map((x) => String(x?.name || '').slice(0, 35)).join(' | ');
        log(
          `    [!] [${attemptLabel}] Bỏ qua ${raw.length} item lệch chủ đề/giỏ hàng không khớp '${kw}'` +
            ` (nguồn=${sourceList.join(', ') || 'DOM'}; vd="${sanitizeErrorText(sampleNames)}")`
        );
      } else if (matched.length > 0 && sourceList.length > 0) {
        log(`    [i] [${attemptLabel}] Khớp ${matched.length}/${raw.length} item cho '${kw}' từ: ${sourceList.slice(0, 4).join(', ')}`);
      }
      return { matched, rawCount: raw.length };
    };

    if (resp.jsonBody && (Array.isArray(resp.jsonBody.xhr) || typeof resp.jsonBody.html === 'string')) {
      const htmlLen = String(resp.jsonBody.html || '').length;
      const title = extractHtmlTitle(resp.jsonBody.html || '');
      const xhrLen = Array.isArray(resp.jsonBody.xhr) ? resp.jsonBody.xhr.length : 0;
      const instrRpt = resp.jsonBody.js_instructions_report;
      const instrTag = instrRpt
        ? ` · instr=${instrRpt.instructions_succeeded ?? '?'}/${instrRpt.instructions_executed ?? '?'}`
        : '';
      const parsed = parseZenrowsJsonPayload(resp.jsonBody, kw, maxItems);
      if (parsed.blocked) anyBlocked = true;
      if (parsed.loginRequired) anyLoginRequired = true;
      if (parsed.notFound) anyNotFound = true;
      if (parsed.priceRedactedNoAuth) anyPriceRedacted = true;

      const { matched } = keepMatchingOnly(parsed.items, parsed.itemSources || []);
      if (matched.length === 0) {
        const ds = parsed.domStats || { hrefMatches: 0, sqeItems: 0, cdnImgs: 0 };
        const ev = parsed.evalData;
        const evalTag = ev
          ? ` · eval(${ev.ready || '?'},cap=${ev.capCount || 0}${ev.err ? `,err=${sanitizeErrorText(ev.err)}` : ''})`
          : '';
        const directTarget = parseShopeeProductUrl(kw);
        const pdpDiagTag = htmlLen > 50000 ? ` · ${extractPdpHtmlDiag(resp.jsonBody.html || '', directTarget)}` : '';
        log(
          `    [i] [${attemptLabel}] HTTP 200 · url=${parsed.finalUrl ? redactUrlForLogs(parsed.finalUrl) : '?'} · HTML=${htmlLen}B · title="${title || 'n/a'}"` +
            `${instrTag}${evalTag} · dom(href=${ds.hrefMatches},sqe=${ds.sqeItems},img=${ds.cdnImgs}) · xhr=${xhrLen}` +
            `${parsed.xhrSummary.length ? ` [${parsed.xhrSummary.slice(0, 18).join(', ')}]` : ''}` +
            `${pdpDiagTag}` +
            `${parsed.sampleCard ? ` · card="${parsed.sampleCard}"` : ''}` +
            `${parsed.bodySnippet ? ` · body="${parsed.bodySnippet}"` : ''}` +
            `${parsed.loginRequired ? ' · PHÁT HIỆN LOGIN WALL (/buyer/login)' : ''}` +
            `${parsed.blocked ? ' · PHÁT HIỆN ANTI-BOT' : ''}` +
            `${parsed.priceRedactedNoAuth ? ' · PHÁT HIỆN ẨN GIÁ KHI CHƯA COOKIE' : ''}` +
            `${parsed.notFound ? ' · PHÁT HIỆN SẢN PHẨM KHÔNG TỒN TẠI' : ''}`
        );
      }
      return { ...parsed, items: matched, timedOut: false, code: '200', httpStatus: 200, xhrCount: xhrLen, htmlLen };
    }

    if (resp.jsonBody && typeof resp.jsonBody === 'object') {
      const items = [];
      collectShopeeItemsFromObject(resp.jsonBody, kw, new Set(), items, maxItems);
      const jsonErr = resp.jsonBody.error;
      const hasErr = jsonErr !== undefined && jsonErr !== null && Number(jsonErr) !== 0;
      const isLoginErr = Number(jsonErr) === 19 || Number(jsonErr) === 10002;
      const errMsg = resp.jsonBody.error_msg ? ` (${sanitizeErrorText(String(resp.jsonBody.error_msg).slice(0, 80))})` : '';
      if (hasErr) {
        if (isLoginErr) anyLoginRequired = true;
        else anyBlocked = true;
        log(`    [!] [${attemptLabel}] Shopee JSON error=${jsonErr}${errMsg}`);
      }
      const { matched } = keepMatchingOnly(items, ['DIRECT_API_JSON']);
      const redactedJson = isDirectProduct && matched.length === 0 && !hasErr && hasRedactedPdpPriceInJson(resp.jsonBody);
      if (redactedJson) {
        anyPriceRedacted = true;
      }
      if (!hasErr && matched.length === 0) {
        log(
          `    [i] [${attemptLabel}] HTTP 200 JSON 0 items (keys=${Object.keys(resp.jsonBody).slice(0, 6).join('|')})` +
            `${redactedJson ? ' · PHÁT HIỆN ẨN GIÁ KHI CHƯA COOKIE' : ''}`
        );
      }
      return {
        items: matched,
        blocked: hasErr && !isLoginErr,
        loginRequired: isLoginErr,
        notFound: false,
        priceRedactedNoAuth: redactedJson,
        timedOut: false,
        code: hasErr ? `ERR_${jsonErr}` : '200',
        httpStatus: 200,
        xhrCount: 0,
        htmlLen: 0
      };
    }

    const htmlRes = parseShopeeHtml(resp.text, kw, maxItems, targetInfo.targetUrl);
    if (htmlRes.blocked) anyBlocked = true;
    if (htmlRes.loginRequired) anyLoginRequired = true;
    if (htmlRes.notFound) anyNotFound = true;
    if (htmlRes.priceRedactedNoAuth) anyPriceRedacted = true;
    const { matched } = keepMatchingOnly(htmlRes.items, htmlRes.itemSources || ['HTML']);
    if (matched.length === 0) {
      const title = extractHtmlTitle(resp.text);
      const snippet = extractVisibleBodySnippet(resp.text, 550);
      const ds = htmlRes.domStats || { hrefMatches: 0, sqeItems: 0, cdnImgs: 0 };
      const directTarget = parseShopeeProductUrl(kw);
      const pdpDiagTag = resp.text.length > 50000 ? ` · ${extractPdpHtmlDiag(resp.text, directTarget)}` : '';
      log(
        `    [i] [${attemptLabel}] HTTP 200 HTML=${resp.text.length}B · title="${title || 'n/a'}" · dom(href=${ds.hrefMatches},sqe=${ds.sqeItems},img=${ds.cdnImgs})` +
          `${pdpDiagTag}` +
          `${htmlRes.sampleCard ? ` · card="${htmlRes.sampleCard}"` : ''}` +
          `${snippet ? ` · body="${snippet}"` : ''}` +
          `${htmlRes.loginRequired ? ' · PHÁT HIỆN LOGIN WALL' : ''}` +
          `${htmlRes.blocked ? ' · PHÁT HIỆN ANTI-BOT' : ''}` +
          `${htmlRes.priceRedactedNoAuth ? ' · PHÁT HIỆN ẨN GIÁ KHI CHƯA COOKIE' : ''}` +
          `${htmlRes.notFound ? ' · PHÁT HIỆN SẢN PHẨM KHÔNG TỒN TẠI' : ''}`
      );
    }
    return { ...htmlRes, items: matched, timedOut: false, code: '200', httpStatus: 200, xhrCount: 0, htmlLen: resp.text.length };
  };

  // Attempt 0 (Fast Direct Internal JSON API — tắt js_render=false để nhận JSON thuần 1-2s)
  const directApiUrl = (directApiFirst || directApiOnly) ? buildShopeeDirectApiUrl(targetInfo, kw, maxItems) : '';
  if (directApiUrl) {
    const directCookie = coreCookie || cookieHeader;
    const csrfToken = extractCookieValue(cookieHeader, 'csrftoken') || extractCookieValue(directCookie, 'csrftoken');
    const directHeaders = {
      'User-Agent': UA,
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8',
      Referer: targetInfo.targetUrl,
      'X-Shopee-Language': 'vi',
      'X-Api-Source': 'pc',
      'X-Requested-With': 'XMLHttpRequest',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...(directCookie ? { Cookie: directCookie } : {})
    };
    log(
      `    [*] Thu ZenRows DirectAPI (js_render=false · bo render HTML${directCookie ? ' + Cookie/UA' : ' + UA chuan'}) cho '${kw}'...`
    );
    const r0 = await callZenrowsOnce({
      apiKey,
      paramsObj: {
        url: directApiUrl,
        premium_proxy: 'true',
        proxy_country: 'vn',
        js_render: 'false',
        custom_headers: 'true'
      },
      extraHeaders: directHeaders,
      timeoutMs: 25000,
      fetchImpl
    });
    const p0 = inspectAndParse('ZenRows DirectAPI', r0, { allowTarget403: true });
    if (p0.items.length > 0) {
      return {
        items: p0.items.slice(0, maxItems),
        blocked: false,
        loginRequired: false,
        notFound: false,
        priceRedactedNoAuth: false,
        timedOut: false,
        directApiUsed: true
      };
    }

    const fallbackItemUrl =
      isDirectProduct && !p0.timedOut && p0.httpStatus === 200 && p0.code !== 'REQS002' && !p0.loginRequired
        ? buildShopeeItemFallbackApiUrl(targetInfo)
        : '';
    if (fallbackItemUrl) {
      const r0b = await callZenrowsOnce({
        apiKey,
        paramsObj: {
          url: fallbackItemUrl,
          premium_proxy: 'true',
          proxy_country: 'vn',
          js_render: 'false',
          custom_headers: 'true'
        },
        extraHeaders: directHeaders,
        timeoutMs: 25000,
        fetchImpl
      });
      const p0b = inspectAndParse('ZenRows DirectAPI item/get', r0b, { allowTarget403: true });
      if (p0b.items.length > 0) {
        return {
          items: p0b.items.slice(0, maxItems),
          blocked: false,
          loginRequired: false,
          notFound: false,
          priceRedactedNoAuth: false,
          timedOut: false,
          directApiUsed: true
        };
      }
    }

    const hitReqs002 = p0.code === 'REQS002';
    if (directApiOnly) {
      return {
        items: [],
        blocked: Boolean(anyBlocked || hitReqs002),
        loginRequired: anyLoginRequired,
        notFound: anyNotFound,
        priceRedactedNoAuth: anyPriceRedacted,
        timedOut: anyTimeout,
        directApiOnly: true,
        directReqs002: hitReqs002
      };
    }
    log(`    [*] DirectAPI chua lay duoc san pham — leo thang ZenRows #1 Antibot (js_render=true)...`);
  } else if (directApiOnly) {
    return {
      items: [],
      blocked: false,
      loginRequired: false,
      notFound: false,
      priceRedactedNoAuth: false,
      timedOut: false,
      directApiOnly: true,
      directReqs002: false
    };
  }

  // Attempt 1 (Direct Stealth Browser): antibot=true + fresh VN residential proxy (no sticky session reuse) + network spy + CSP-safe data-sr-eval DOM/Fiber extractor
  const r1 = await callZenrowsOnce({
    apiKey,
    paramsObj: {
      url: targetInfo.targetUrl,
      js_render: 'true',
      premium_proxy: 'true',
      proxy_country: 'vn',
      antibot: 'true',
      json_response: 'true',
      window_width: '1366',
      window_height: '900',
      ...(cookieHeader ? { custom_headers: 'true' } : {}),
      js_instructions: jsInstructionsPrimary
    },
    extraHeaders: cookieHeader ? { Cookie: cookieHeader } : {},
    timeoutMs: 105000,
    fetchImpl
  });
  const p1 = inspectAndParse('ZenRows #1 Antibot', r1);
  if (p1.items.length > 0) {
    return { items: p1.items.slice(0, maxItems), blocked: false, loginRequired: false, notFound: false, timedOut: false };
  }
  if (p1.notFound) {
    return { items: [], blocked: false, loginRequired: false, notFound: true, timedOut: false };
  }

  // Attempt 2: Fresh residential IP (never reuse poisoned session_id from #1!) -> Interactive Homepage Search / CoreCookie / block_resources=none
  const useModeAutoOnAttempt2 = !cookieHeader && p1.loginRequired;
  const shouldUseCoreCookieOn2 =
    Boolean(cookieHeader) &&
    Boolean(coreCookie) &&
    coreCookie !== cookieHeader;
  const attempt2Cookie = shouldUseCoreCookieOn2
    ? coreCookie
    : Boolean(cookieHeader) && !p1.loginRequired
      ? cookieHeader
      : '';
  const shouldUseWaitForOn2 =
    !p1.timedOut &&
    !p1.loginRequired &&
    p1.httpStatus !== 400 &&
    (p1.httpStatus === 422 || (!p1.blocked && (p1.htmlLen || 0) < 50000));
  const shouldUseHomeSearchOn2 =
    !useModeAutoOnAttempt2 &&
    !p1.timedOut &&
    !isDirectProduct &&
    targetInfo.kind !== 'category' &&
    !p1.loginRequired &&
    (p1.domStats?.sqeItems || 0) === 0 &&
    (p1.items?.length || 0) === 0;

  let attempt2Label = 'ZenRows #2 FullWait';
  let attempt2Params;
  if (useModeAutoOnAttempt2) {
    attempt2Label = 'ZenRows #2 Auto';
    attempt2Params = {
      url: targetInfo.fallbackUrl,
      mode: 'auto',
      proxy_country: 'vn',
      json_response: 'true',
      wait: '8000'
    };
    log(`    [*] Thu ZenRows #2 (mode=auto · IP sach moi) cho '${kw}'...`);
  } else if (shouldUseHomeSearchOn2) {
    attempt2Label = 'ZenRows #2 HomeSearch';
    const homeSearchInstructions = JSON.stringify([
      { wait: 3500 },
      { evaluate: buildZenrowsSearchSubmitScript(searchKwText) },
      { wait: 7500 },
      { scroll_y: 800 },
      { wait: 2000 },
      { scroll_y: 1650 },
      { wait: 2500 },
      { evaluate: domEvalScript }
    ]);
    log(
      `    [*] Leo thang ZenRows #2 HomeSearch (IP sach moi · trang chu -> tim '${searchKwText}'` +
        `${shouldUseCoreCookieOn2 ? ' + CoreCookie' : attempt2Cookie ? ' + Cookie Shopee' : ''})...`
    );
    attempt2Params = {
      url: 'https://shopee.vn/',
      js_render: 'true',
      premium_proxy: 'true',
      proxy_country: 'vn',
      antibot: 'true',
      json_response: 'true',
      window_width: '1366',
      window_height: '900',
      ...(attempt2Cookie ? { custom_headers: 'true' } : {}),
      js_instructions: homeSearchInstructions
    };
  } else {
    attempt2Label = shouldUseCoreCookieOn2 ? 'ZenRows #2 CoreWait' : 'ZenRows #2 FullWait';
    const boundedInstructions = JSON.stringify([
      { evaluate: networkSpyScript },
      { wait: 6500 },
      { scroll_y: 800 },
      { wait: 2500 },
      { scroll_y: 1650 },
      { wait: 2500 },
      { evaluate: domEvalScript }
    ]);
    log(
      `    [*] Leo thang ZenRows #2 (IP sach moi · antibot=true + block_resources=none + ${shouldUseWaitForOn2 ? 'wait_for' : 'scroll+eval'}` +
        `${shouldUseCoreCookieOn2 ? ' + CoreCookie' : attempt2Cookie ? ' + Cookie Shopee' : ''}) cho '${kw}'...`
    );
    attempt2Params = {
      url: targetInfo.kind === 'category' && shouldUseCoreCookieOn2 ? targetInfo.targetUrl : targetInfo.fallbackUrl,
      js_render: 'true',
      premium_proxy: 'true',
      proxy_country: 'vn',
      antibot: 'true',
      json_response: 'true',
      block_resources: 'none',
      window_width: '1366',
      window_height: '900',
      ...(shouldUseWaitForOn2 ? { wait_for: waitSelector } : { js_instructions: boundedInstructions }),
      ...(attempt2Cookie ? { custom_headers: 'true' } : {})
    };
  }

  const r2 = await callZenrowsOnce({
    apiKey,
    paramsObj: attempt2Params,
    extraHeaders: !useModeAutoOnAttempt2 && attempt2Cookie ? { Cookie: attempt2Cookie } : {},
    timeoutMs: 95000,
    fetchImpl
  });
  const p2 = inspectAndParse(attempt2Label, r2);
  if (p2.items.length > 0) {
    return { items: p2.items.slice(0, maxItems), blocked: false, loginRequired: false, notFound: false, timedOut: false };
  }
  if (p2.notFound) {
    return { items: [], blocked: anyBlocked, loginRequired: anyLoginRequired, notFound: !anyBlocked, timedOut: false };
  }

  // Attempt 3: Clean-session Adaptive mode=auto rescue on a fresh IP (never skip due to /verify/ blocks)
  const skipAttempt3 =
    useModeAutoOnAttempt2 ||
    (p1.timedOut && p2.timedOut) ||
    (!cookieHeader && p1.loginRequired && p2.loginRequired) ||
    (!cookieHeader && isDirectProduct && p1.priceRedactedNoAuth);
  if (!skipAttempt3) {
    const attempt3Label = isDirectProduct ? 'ZenRows #3 CleanHTML' : 'ZenRows #3 AutoClean';
    log(
      `    [*] Thu ${attempt3Label} (mode=auto · IP sach moi${isDirectProduct ? ' + LightHTML' : ''}, khong gui cookie cu) cho '${kw}'...`
    );
    const attempt3Params = {
      url: targetInfo.fallbackUrl,
      mode: 'auto',
      proxy_country: 'vn',
      wait: '8000',
      ...(isDirectProduct ? {} : { json_response: 'true' })
    };
    const r3 = await callZenrowsOnce({
      apiKey,
      paramsObj: attempt3Params,
      extraHeaders: {},
      timeoutMs: 95000,
      fetchImpl
    });
    const p3 = inspectAndParse(attempt3Label, r3);
    if (p3.items.length > 0) {
      return { items: p3.items.slice(0, maxItems), blocked: false, loginRequired: false, notFound: false, priceRedactedNoAuth: false, timedOut: false };
    }
    if (p3.notFound) {
      return { items: [], blocked: anyBlocked, loginRequired: anyLoginRequired, notFound: !anyBlocked, priceRedactedNoAuth: anyPriceRedacted, timedOut: false };
    }
  }

  return {
    items: [],
    blocked: anyBlocked,
    loginRequired: anyLoginRequired,
    notFound: anyNotFound,
    priceRedactedNoAuth: anyPriceRedacted,
    timedOut: anyTimeout
  };
}

export async function fetchViaScraperApi(kw, apiKey, maxItems, options = {}) {
  const { fetchImpl = fetch, env = process.env, cookieHeader = '', onProgress = () => {} } = options;
  const log = (msg) => onProgress(`${sanitizeErrorText(msg)}\n`);
  const targetInfo = resolveTargetForInput(kw);
  const useUltra = String(env?.SCRAPERAPI_ULTRA_PREMIUM ?? 'true').trim().toLowerCase() !== 'false';
  const coreCookie = cookieHeader ? extractCoreAuthCookieHeader(cookieHeader) : '';
  const tierCookie = coreCookie || cookieHeader;

  const tiers = [
    ...(useUltra
      ? [
          {
            label: 'ScraperAPI #1 UltraVN',
            params: { render: 'true', country_code: 'vn', ultra_premium: 'true' },
            cookie: tierCookie
          }
        ]
      : []),
    {
      label: 'ScraperAPI #2 PremiumVN',
      params: { render: 'true', country_code: 'vn', premium: 'true' },
      cookie: tierCookie
    },
    {
      label: 'ScraperAPI #3 PremiumGlobal',
      params: { render: 'true', premium: 'true' },
      cookie: tierCookie
    },
    {
      label: 'ScraperAPI #4 StandardClean',
      params: { render: 'true' },
      cookie: ''
    }
  ];

  let anyBlocked = false;
  let anyLoginRequired = false;
  let anyTimeout = false;
  let anyPriceRedacted = false;
  let totalTiers = 0;
  let http403Count = 0;
  let last403Snippet = '';

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    // Avoid burning extra StandardClean call if an earlier tier already got HTTP 200 without Cookie
    if (tier.label === 'ScraperAPI #4 StandardClean' && !tierCookie && http403Count === 0) {
      continue;
    }

    totalTiers++;
    log(`    [*] [${tier.label}] Goi ScraperAPI${tier.cookie ? ' (+ CoreCookie)' : ''} cho '${kw}'...`);
    const qs = new URLSearchParams({
      api_key: apiKey,
      url: i === 0 ? targetInfo.targetUrl : targetInfo.fallbackUrl,
      ...tier.params,
      ...(tier.cookie ? { keep_headers: 'true' } : {})
    });

    const out = await fetchWithExplicitTimeout(
      `https://api.scraperapi.com?${qs.toString()}`,
      {
        method: 'GET',
        headers: tier.cookie ? { Cookie: tier.cookie } : {}
      },
      85000,
      fetchImpl
    );

    if (out.timedOut || !out.res) {
      anyTimeout = true;
      log(`    [!] [${tier.label}] Quá thời gian chờ (85s) cho '${kw}'.`);
      continue;
    }

    const { res, text } = out;
    if (res.status === 401) {
      throw new ProviderFatalError('ScraperAPI từ chối API Key (HTTP 401). Vui lòng kiểm tra SCRAPERAPI_KEY.');
    }
    if (res.status === 429) {
      throw new ProviderFatalError('ScraperAPI vượt giới hạn request đồng thời / credit (HTTP 429).');
    }

    if (res.status === 403) {
      http403Count++;
      const snippet = sanitizeErrorText(String(text || '').replace(/\s+/g, ' ').trim().slice(0, 180));
      last403Snippet = snippet;
      const lowBody = snippet.toLowerCase();
      if (
        lowBody.includes('invalid api key') ||
        lowBody.includes('api key is invalid') ||
        lowBody.includes('credits exhausted') ||
        lowBody.includes('account suspended')
      ) {
        throw new ProviderFatalError(`ScraperAPI từ chối API Key (HTTP 403): ${snippet}`);
      }
      anyBlocked = true;
      log(`    [!] [${tier.label}] HTTP 403 (${snippet || 'gói chưa hỗ trợ ultra_premium / country_code=vn'}) — thử bậc thấp hơn...`);
      continue;
    }

    if (res.status !== 200) {
      if (res.status >= 500) anyBlocked = true;
      log(`    [!] [${tier.label}] HTTP ${res.status} cho '${kw}'.`);
      continue;
    }

    const parsed = parseShopeeHtml(text, kw, maxItems, targetInfo.targetUrl);
    if (parsed.blocked) anyBlocked = true;
    if (parsed.loginRequired) anyLoginRequired = true;
    if (parsed.priceRedactedNoAuth) anyPriceRedacted = true;
    const matched = parsed.items.filter((it) => scoreProductMatch(it, kw) > 0);
    if (matched.length > 0) {
      log(`    [i] [${tier.label}] Khớp ${matched.length}/${parsed.items.length} item cho '${kw}'.`);
      return { ...parsed, items: matched, timedOut: false };
    }
    if (parsed.notFound) {
      log(`    [!] [${tier.label}] Phát hiện sản phẩm Shopee không tồn tại hoặc đã bị xóa.`);
      return { items: [], blocked: false, loginRequired: false, notFound: true, priceRedactedNoAuth: false, timedOut: false };
    }

    const title = extractHtmlTitle(text);
    const bodySnippet = extractVisibleBodySnippet(text, 160);
    const ds = parsed.domStats || { hrefMatches: 0, sqeItems: 0, cdnImgs: 0 };
    log(
      `    [i] [${tier.label}] HTTP 200 HTML=${text.length}B · title="${title || 'n/a'}" · ` +
        `dom(href=${ds.hrefMatches},sqe=${ds.sqeItems},img=${ds.cdnImgs})` +
        `${bodySnippet ? ` · body="${bodySnippet}"` : ''}` +
        `${parsed.loginRequired ? ' · PHÁT HIỆN LOGIN WALL' : ''}` +
        `${parsed.blocked ? ' · PHÁT HIỆN ANTI-BOT' : ''}` +
        `${parsed.priceRedactedNoAuth ? ' · PHÁT HIỆN ẨN GIÁ KHI CHƯA COOKIE' : ''}`
    );

    // If a tier with country_code=vn succeeded cleanly (HTTP 200) without cookie and hit login/block only, don't retry Global unnecessarily
    if (!tier.cookie && !parsed.blocked && !parsed.loginRequired && ds.hrefMatches === 0 && text.length > 50000) {
      break;
    }
  }

  if (totalTiers > 0 && http403Count === totalTiers) {
    throw new ProviderFatalError(
      `ScraperAPI từ chối API Key hoặc gói hiện tại ở tất cả chế độ (HTTP 403${last403Snippet ? `: ${last403Snippet}` : ''}).`
    );
  }

  return { items: [], blocked: anyBlocked, loginRequired: anyLoginRequired, notFound: false, priceRedactedNoAuth: anyPriceRedacted, timedOut: anyTimeout };
}

export async function fetchViaCrawlbase(kw, token, maxItems, options = {}) {
  const { fetchImpl = fetch, cookieHeader = '', onProgress = () => {} } = options;
  const log = (msg) => onProgress(`${sanitizeErrorText(msg)}\n`);
  const targetInfo = resolveTargetForInput(kw);
  const coreCookie = cookieHeader ? extractCoreAuthCookieHeader(cookieHeader) : '';
  const activeCookie = coreCookie || cookieHeader;

  const crawlTiers = [
    ...(activeCookie
      ? [
          {
            label: 'Crawlbase JS+Cookie',
            isJsTier: true,
            params: {
              url: targetInfo.targetUrl,
              format: 'json',
              page_wait: '8000',
              ajax_wait: 'true',
              scroll: 'true',
              scroll_interval: '15',
              cookies: activeCookie
            }
          }
        ]
      : []),
    {
      label: 'Crawlbase JS Clean',
      isJsTier: true,
      params: {
        url: targetInfo.targetUrl,
        format: 'json',
        page_wait: '8000',
        ajax_wait: 'true',
        scroll: 'true',
        scroll_interval: '15'
      }
    },
    {
      label: 'Crawlbase TCP Clean',
      isJsTier: false,
      params: {
        url: targetInfo.targetUrl,
        format: 'json'
      }
    }
  ];

  let anyBlocked = false;
  let anyLoginRequired = false;
  let anyTimeout = false;
  let anyPriceRedacted = false;

  for (let idx = 0; idx < crawlTiers.length; idx++) {
    const tier = crawlTiers[idx];
    const qs = new URLSearchParams({ token, ...tier.params });
    const out = await fetchWithExplicitTimeout(
      `https://api.crawlbase.com/?${qs.toString()}`,
      { method: 'GET' },
      95000,
      fetchImpl
    );

    if (out.timedOut || !out.res) {
      anyTimeout = true;
      log(`    [!] [${tier.label}] Quá thời gian chờ (95s) cho '${kw}'.`);
      continue;
    }

    const { res, text } = out;
    if (res.status === 401 || res.status === 403) {
      throw new ProviderFatalError(
        `Crawlbase từ chối Token (HTTP ${res.status}). Hãy dùng JavaScript Token trong CRAWLBASE_TOKEN.`
      );
    }
    if (res.status === 402) {
      throw new ProviderFatalError('Tài khoản Crawlbase đã hết credit (HTTP 402).');
    }
    if (res.status === 429) {
      throw new ProviderFatalError('Crawlbase đang giới hạn tốc độ gọi API (HTTP 429).');
    }

    if (res.status === 400) {
      const errSnippet = sanitizeErrorText(String(text || '').replace(/\s+/g, ' ').trim().slice(0, 180));
      log(`    [!] [${tier.label}] Crawlbase HTTP 400${errSnippet ? ` (${errSnippet})` : ''} cho '${kw}'.`);
      continue;
    }

    if (res.status !== 200) {
      log(`    [!] [${tier.label}] Crawlbase HTTP ${res.status} cho '${kw}'.`);
      continue;
    }

    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      const htmlParsed = parseShopeeHtml(text, kw, maxItems, targetInfo.targetUrl);
      if (htmlParsed.blocked) anyBlocked = true;
      if (htmlParsed.loginRequired) anyLoginRequired = true;
      if (htmlParsed.priceRedactedNoAuth) anyPriceRedacted = true;
      const matchedHtml = htmlParsed.items.filter((it) => scoreProductMatch(it, kw) > 0);
      if (matchedHtml.length > 0) {
        return { ...htmlParsed, items: matchedHtml, timedOut: false };
      }
      if (tier.label === 'Crawlbase JS+Cookie') continue;
      break;
    }

    const origStatus = Number(data?.original_status || 200);
    if (origStatus === 403 || origStatus === 429) {
      anyBlocked = true;
      log(`    [!] [${tier.label}] Shopee trả original_status=${origStatus} cho '${kw}'.`);
      if (tier.label === 'Crawlbase JS+Cookie') continue;
      break;
    }

    const bodyHtml = String(data?.body || '');
    const bodyParsed = parseShopeeHtml(bodyHtml, kw, maxItems, data?.url || targetInfo.targetUrl);
    if (bodyParsed.blocked) anyBlocked = true;
    if (bodyParsed.loginRequired) anyLoginRequired = true;
    if (bodyParsed.priceRedactedNoAuth) anyPriceRedacted = true;
    const matched = bodyParsed.items.filter((it) => scoreProductMatch(it, kw) > 0);
    if (matched.length > 0) {
      log(`    [i] [${tier.label}] Khớp ${matched.length}/${bodyParsed.items.length} item cho '${kw}'.`);
      return {
        ...bodyParsed,
        items: matched,
        timedOut: false
      };
    }
    if (bodyParsed.notFound) {
      log(`    [!] [${tier.label}] Phát hiện sản phẩm Shopee không tồn tại hoặc đã bị xóa.`);
      return { items: [], blocked: false, loginRequired: false, notFound: true, priceRedactedNoAuth: false, timedOut: false };
    }

    const title = extractHtmlTitle(bodyHtml);
    const snippet = extractVisibleBodySnippet(bodyHtml, 160);
    const ds = bodyParsed.domStats || { hrefMatches: 0, sqeItems: 0, cdnImgs: 0 };
    log(
      `    [i] [${tier.label}] origStatus=${origStatus} HTML=${bodyHtml.length}B · title="${title || 'n/a'}"` +
        ` · dom(href=${ds.hrefMatches},sqe=${ds.sqeItems},img=${ds.cdnImgs})` +
        `${bodyParsed.sampleCard ? ` · card="${bodyParsed.sampleCard}"` : ''}` +
        `${snippet ? ` · body="${snippet}"` : ''}` +
        `${bodyParsed.loginRequired ? ' · PHÁT HIỆN LOGIN WALL' : ''}` +
        `${bodyParsed.blocked ? ' · PHÁT HIỆN ANTI-BOT' : ''}` +
        `${bodyParsed.priceRedactedNoAuth ? ' · PHÁT HIỆN ẨN GIÁ KHI CHƯA COOKIE' : ''}`
    );

    if (tier.label === 'Crawlbase JS+Cookie') {
      continue;
    }
    break;
  }

  return {
    items: [],
    blocked: anyBlocked,
    loginRequired: anyLoginRequired,
    notFound: false,
    priceRedactedNoAuth: anyPriceRedacted,
    timedOut: anyTimeout
  };
}

export async function scrapeShopeeLive({
  keywords = [],
  totalLimit = 20,
  preferredProvider = null,
  env = process.env,
  cookieFilePath = '',
  imgDir = 'public/products/shopee_live',
  fetchImpl = fetch,
  onProgress = () => {}
} = {}) {
  const cleanKeywords = (Array.isArray(keywords) ? keywords : [])
    .map((k) => String(k || '').trim())
    .filter(Boolean);

  if (cleanKeywords.length === 0) {
    return {
      products: [],
      status: 'failed',
      message: 'Không có từ khóa hoặc link sản phẩm hợp lệ để cào.',
      anti_bot_blocked: false,
      login_required: false,
      config_required: false,
      provider: null,
      per_keyword_counts: {}
    };
  }

  const configuredProviders = resolveConfiguredProviders(preferredProvider, env);
  const [primaryProvider, primaryKey] = resolveScrapingProvider(preferredProvider, env);
  if (!primaryProvider || !primaryKey || configuredProviders.length === 0) {
    const missingTarget = primaryProvider
      ? `biến môi trường key cho '${primaryProvider}'`
      : 'ZENROWS_API_KEY, SCRAPERAPI_KEY hoặc CRAWLBASE_TOKEN';
    const msg =
      `Chưa cấu hình Scraping API Key (Phương án B). Vui lòng thiết lập ${missingTarget} ` +
      'trong .env / Render Dashboard hoặc nhập tại bảng Cấu Hình Scraping API trên trang Quản Trị.';
    onProgress(`[!] ${msg}\n`);
    return {
      products: [],
      status: 'config_required',
      message: msg,
      anti_bot_blocked: false,
      login_required: false,
      config_required: true,
      provider: primaryProvider || null,
      per_keyword_counts: {}
    };
  }

  const cookieInfo = loadShopeeCookieHeader(cookieFilePath, env);
  const isAutoChain = configuredProviders.length > 1;
  const provBanner = isAutoChain
    ? `AUTO (${configuredProviders.map(([p]) => p.toUpperCase()).join(' -> ')})`
    : primaryProvider.toUpperCase();
  onProgress(
    `[*] Engine Node.js · Scraping API: ${provBanner} | Mục tiêu: ${JSON.stringify(cleanKeywords)} | Giới hạn: ${totalLimit}` +
      `${cookieInfo.hasCookie ? ` | Cookie sẵn sàng (${cookieInfo.cookieCount} cặp)` : ' | Cookie: chưa có (0 cặp)'}\n`
  );

  const perKwCap = Math.max(6, Math.trunc((totalLimit / cleanKeywords.length) * 1.5) + 4);
  const capturedByKw = {};
  let anyBlocked = false;
  let anyLoginRequired = false;
  let anyNotFound = false;
  let anyTimeout = false;
  let anyPriceRedacted = false;
  let anyDirectReqs002 = false;
  let activeUsedProvider = primaryProvider;
  const attemptedProviders = new Set();
  const disabledProviders = new Set();
  let lastFatalMsg = '';

  for (let i = 0; i < cleanKeywords.length; i++) {
    const kw = cleanKeywords[i];
    const targetInfo = resolveTargetForInput(kw);
    const label = targetInfo.kind === 'product'
      ? `link sản phẩm (${targetInfo.canonicalUrl})`
      : targetInfo.kind === 'category'
        ? `danh mục (${targetInfo.targetUrl})`
        : `từ khóa: '${kw}'`;

    let kwItems = [];
    let kwBlocked = false;
    let kwLoginRequired = false;
    let kwNotFound = false;
    let kwTimeout = false;
    let kwPriceRedacted = false;
    let kwDirectReqs002 = false;
    for (let pIdx = 0; pIdx < configuredProviders.length; pIdx++) {
      const [provName, provKey] = configuredProviders[pIdx];
      if (disabledProviders.has(provName)) continue;

      attemptedProviders.add(provName.toUpperCase());
      onProgress(`[*] [${provName.toUpperCase()}] Đang cào Shopee cho ${label}...\n`);
      let res = null;
      try {
        if (provName === 'zenrows' || provName === 'zenrows_direct') {
          res = await fetchViaZenrows(kw, provKey, perKwCap, {
            fetchImpl,
            env,
            cookieHeader: cookieInfo.normalizedHeader,
            onProgress,
            directApiOnly: provName === 'zenrows_direct'
          });
        } else if (provName === 'scraperapi') {
          res = await fetchViaScraperApi(kw, provKey, perKwCap, {
            fetchImpl,
            env,
            cookieHeader: cookieInfo.normalizedHeader,
            onProgress
          });
        } else if (provName === 'crawlbase') {
          res = await fetchViaCrawlbase(kw, provKey, perKwCap, {
            fetchImpl,
            cookieHeader: cookieInfo.normalizedHeader,
            onProgress
          });
        } else {
          throw new ProviderFatalError(`Provider không được hỗ trợ: ${provName}`);
        }
      } catch (err) {
        if (err?.name === 'ProviderFatalError') {
          const safeMsg = sanitizeErrorText(err.message);
          lastFatalMsg = safeMsg;
          disabledProviders.add(provName);
          onProgress(`[!] Lỗi nhà cung cấp ${provName}: ${safeMsg}\n`);
          const hasRemaining = configuredProviders.some(([n]) => !disabledProviders.has(n));
          if (hasRemaining) {
            onProgress(`[*] Tự động chuyển dự phòng sang nhà cung cấp tiếp theo...\n`);
            continue;
          }
          if (Object.values(capturedByKw).every((arr) => arr.length === 0)) {
            return {
              products: [],
              status: 'failed',
              message: safeMsg,
              anti_bot_blocked: false,
              login_required: false,
              config_required: true,
              provider: provName,
              per_keyword_counts: {}
            };
          }
          break;
        }

        const safeErr = sanitizeErrorText(err?.message || String(err));
        onProgress(`[!] Lỗi mạng khi gọi ${provName}: ${safeErr}\n`);
        const hasRemaining = configuredProviders.slice(pIdx + 1).some(([n]) => !disabledProviders.has(n));
        if (hasRemaining) {
          onProgress(`[*] Thử nhà cung cấp dự phòng tiếp theo...\n`);
          continue;
        }
        if (Object.values(capturedByKw).every((arr) => arr.length === 0)) {
          return {
            products: [],
            status: 'failed',
            message: `Lỗi kết nối tới ${provName.toUpperCase()}: ${safeErr}`,
            anti_bot_blocked: false,
            login_required: false,
            config_required: false,
            provider: provName,
            per_keyword_counts: {}
          };
        }
        break;
      }

      const items = Array.isArray(res?.items) ? res.items : [];
      if (res?.blocked) kwBlocked = true;
      if (res?.loginRequired) kwLoginRequired = true;
      if (res?.notFound) kwNotFound = true;
      if (res?.timedOut) kwTimeout = true;
      if (res?.priceRedactedNoAuth) kwPriceRedacted = true;
      if (res?.directReqs002) kwDirectReqs002 = true;
      activeUsedProvider = provName;

      if (items.length > 0) {
        kwItems = items.slice(0, perKwCap);
        kwBlocked = false;
        kwLoginRequired = false;
        kwNotFound = false;
        kwTimeout = false;
        kwPriceRedacted = false;
        kwDirectReqs002 = false;
        onProgress(`    ✓ [${provName.toUpperCase()}] Bóc tách được ${kwItems.length} sản phẩm cho '${kw}'.\n`);
        break;
      }

      onProgress(`    ✓ [${provName.toUpperCase()}] Bóc tách được 0 sản phẩm cho '${kw}'.\n`);
      if (res?.notFound) {
        break;
      }
      const hasNextProv = configuredProviders.slice(pIdx + 1).some(([n]) => !disabledProviders.has(n));
      if (hasNextProv) {
        onProgress(`[*] [${provName.toUpperCase()}] chưa có kết quả — chuyển sang nhà cung cấp dự phòng cho '${kw}'...\n`);
      }
    }

    if (kwItems.length === 0) {
      if (kwBlocked) anyBlocked = true;
      if (kwLoginRequired) anyLoginRequired = true;
      if (kwNotFound) anyNotFound = true;
      if (kwTimeout) anyTimeout = true;
      if (kwPriceRedacted) anyPriceRedacted = true;
      if (kwDirectReqs002) anyDirectReqs002 = true;
    }
    capturedByKw[kw] = kwItems;

    if (i < cleanKeywords.length - 1) {
      const waitMs = 1200 + Math.floor(Math.random() * 800);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  if (lastFatalMsg && Object.values(capturedByKw).every((arr) => arr.length === 0) && disabledProviders.size >= configuredProviders.length) {
    return {
      products: [],
      status: 'failed',
      message: lastFatalMsg,
      anti_bot_blocked: false,
      login_required: false,
      config_required: true,
      provider: activeUsedProvider,
      per_keyword_counts: {}
    };
  }

  const selectedProducts = allocateProductsFairly(capturedByKw, cleanKeywords, totalLimit);

  if (selectedProducts.length > 0) {
    onProgress(`[*] Đang tải & lưu ${selectedProducts.length} ảnh sản phẩm thật từ Shopee CDN...\n`);
    const CONCURRENCY = 5;
    for (let i = 0; i < selectedProducts.length; i += CONCURRENCY) {
      const batch = selectedProducts.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (item, offset) => {
          item.id = `shopee-live-${String(i + offset + 1).padStart(3, '0')}`;
          item.images = await downloadImage(
            item.image_id || '',
            item.shopee_id,
            item.image_url || '',
            imgDir,
            fetchImpl
          );
        })
      );
    }
  }

  const perKeywordCounts = {};
  for (const prod of selectedProducts) {
    const kwKey = prod.keyword || '';
    perKeywordCounts[kwKey] = (perKeywordCounts[kwKey] || 0) + 1;
  }

  const attemptedList = [...attemptedProviders];
  const provLabel =
    selectedProducts.length > 0 || attemptedList.length <= 1
      ? activeUsedProvider.toUpperCase()
      : attemptedList.join(' / ');
  const firstKind = resolveTargetForInput(cleanKeywords[0]).kind;
  const targetDesc =
    firstKind === 'product'
      ? 'link sản phẩm'
      : firstKind === 'category'
        ? 'trang danh mục'
        : 'trang tìm kiếm';
  const noCookieNote = !cookieInfo.hasCookie
    ? ' (Hiện máy chủ có 0 Cookie Shopee — sau mỗi lần Render redeploy cookie cũ sẽ bị xóa, hãy dán lại Cookie Shopee từ trình duyệt hoặc gắn biến SHOPEE_COOKIE trên Render).'
    : '';
  const redactedLoginRequired = !cookieInfo.hasCookie && anyPriceRedacted;
  let status = 'empty';
  let message = `Không tìm thấy sản phẩm khớp với yêu cầu qua ${provLabel}.`;

  if (selectedProducts.length > 0) {
    status = 'completed';
    message = `Đã cào thành công ${selectedProducts.length} sản phẩm thật từ Shopee qua ${provLabel}.`;
  } else if (anyNotFound && !anyBlocked && !anyLoginRequired && !anyPriceRedacted) {
    status = 'empty';
    message = `Sản phẩm Shopee này không tồn tại hoặc đã bị xóa bởi người bán (kiểm tra qua ${provLabel}).`;
  } else if (redactedLoginRequired) {
    status = 'login_required';
    message =
      `Shopee đang ẩn toàn bộ giá sản phẩm (trả price: null / removed_fields khi truy cập chưa đăng nhập) đối với ${targetDesc} qua ${provLabel}. ` +
      'Vui lòng dán Cookie Shopee đã đăng nhập từ trình duyệt vào mục "Cookie Shopee" hoặc dùng Chrome Extension Bridge để cào bằng phiên đăng nhập thật.' +
      noCookieNote;
  } else if (anyLoginRequired) {
    status = 'login_required';
    message =
      `Shopee đang yêu cầu đăng nhập tài khoản (/buyer/login) khi ${provLabel} truy cập ${targetDesc}. ` +
      'Vui lòng dán Cookie Shopee đã đăng nhập từ trình duyệt vào mục "Cookie Shopee" hoặc dùng Chrome Extension Bridge.' +
      noCookieNote;
  } else if (anyDirectReqs002) {
    status = 'blocked';
    message =
      `ZenRows từ chối chế độ tắt JS render (js_render=false) trên domain Shopee.vn (mã REQS002: bắt buộc bật js_render hoặc nâng cấp gói). ` +
      'Hãy dùng nút ⚡ "Cào qua Chrome Extension" (chạy trực tiếp bằng IP nhà & Cookie thật của bạn) hoặc chuyển nhà cung cấp về ZenRows (Auto/JS)!';
  } else if (anyBlocked) {
    status = 'blocked';
    message =
      `Shopee tạm thời trả trang xác minh chống bot khi ${provLabel} truy cập ${targetDesc}. ` +
      'Hãy bấm nút ⚡ "Cào qua Chrome Extension" (cào bằng IP nhà & Chrome thật) hoặc bổ sung Cookie Shopee từ trình duyệt đã đăng nhập.' +
      noCookieNote;
  } else if (anyTimeout) {
    status = 'failed';
    message =
      `Yêu cầu cào Shopee qua ${provLabel} bị quá thời gian chờ ở các lượt thử. ` +
      'Bạn hãy thử lại, dùng ⚡ "Cào qua Chrome Extension", hoặc dán Link chi tiết 1 sản phẩm Shopee cụ thể để tải nhanh hơn.';
  }

  return {
    products: selectedProducts,
    status,
    message,
    anti_bot_blocked: anyBlocked,
    login_required: Boolean(anyLoginRequired || redactedLoginRequired),
    config_required: false,
    provider: activeUsedProvider,
    per_keyword_counts: perKeywordCounts
  };
}

/**
 * Xử lý dữ liệu thô thu thập từ Chrome Extension Bridge (IP nhà & Cookie thật của chủ shop),
 * áp dụng đầy đủ bộ lọc Zero Hallucination (giá >= 1000, đúng từ khóa/itemId, stock=0, status='draft')
 * và tải ảnh thật từ Shopee CDN lưu vào máy chủ.
 */
export async function processBridgeShopeePayloads({
  keywords = [],
  totalLimit = 20,
  entries = [],
  imgDir = 'public/products/shopee_live',
  fetchImpl = fetch,
  onProgress = () => {}
} = {}) {
  const safeEntries = Array.isArray(entries) ? entries.filter((e) => e && typeof e === 'object') : [];
  const rawKeywords = Array.isArray(keywords) && keywords.length > 0
    ? keywords
    : safeEntries.map((e) => e.keyword);
  const cleanKeywords = [...new Set(rawKeywords.map((k) => String(k || '').trim()).filter(Boolean))];

  if (cleanKeywords.length === 0 || safeEntries.length === 0) {
    return {
      products: [],
      status: 'failed',
      message: 'Chrome Extension chưa gửi dữ liệu hoặc thiếu từ khóa mục tiêu.',
      anti_bot_blocked: false,
      login_required: false,
      config_required: false,
      provider: 'chrome_extension',
      per_keyword_counts: {}
    };
  }

  onProgress(`[*] Chrome Extension Bridge đã thu thập ${safeEntries.length} mục tiêu — đang lọc Zero Hallucination trên server...\n`);

  const perKwCap = Math.max(6, Math.trunc((totalLimit / cleanKeywords.length) * 1.5) + 4);
  const capturedByKw = {};
  let anyBlocked = false;
  let anyLoginRequired = false;
  let anyNotFound = false;
  let anyPriceRedacted = false;

  for (const kw of cleanKeywords) {
    capturedByKw[kw] = [];
  }

  for (const entry of safeEntries) {
    const kw = String(entry.keyword || '').trim();
    if (!kw) continue;
    const directProduct = parseShopeeProductUrl(kw);
    const seenIds = new Set();
    const collected = [];

    if (entry.loginRequired) anyLoginRequired = true;
    if (entry.blocked) anyBlocked = true;
    if (entry.notFound) anyNotFound = true;

    const apiPayloads = Array.isArray(entry.apiPayloads) ? entry.apiPayloads : [];
    for (const apiObj of apiPayloads) {
      if (!apiObj || typeof apiObj !== 'object') continue;
      const errCode = Number(apiObj.error);
      if (errCode && errCode !== 0) {
        if (errCode === 19 || errCode === 10002) anyLoginRequired = true;
        else anyBlocked = true;
        onProgress(`    [!] [Bridge API] Shopee error=${errCode} cho '${kw}'.\n`);
      }
      collectShopeeItemsFromObject(apiObj, kw, seenIds, collected, Math.max(perKwCap, 60));
      if (directProduct && hasRedactedPdpPriceInJson(apiObj)) {
        anyPriceRedacted = true;
      }
    }

    if (entry.evalPayload && typeof entry.evalPayload === 'object') {
      const normEval = normalizeEvalPayload(entry.evalPayload);
      const evalUrl = String(normEval.url || entry.pageUrl || '');
      if (/\/buyer\/login/i.test(evalUrl)) anyLoginRequired = true;
      if (/\/verify\//i.test(evalUrl)) anyBlocked = true;
      const evalItems = parseEvalPayloadToItems(normEval, kw, Math.max(perKwCap, 60));
      for (const it of evalItems) {
        if (it?.shopee_id && !seenIds.has(it.shopee_id)) {
          seenIds.add(it.shopee_id);
          collected.push(it);
        }
      }
    }

    if (entry.html && typeof entry.html === 'string') {
      const htmlParsed = parseShopeeHtml(entry.html, kw, Math.max(perKwCap, 60), entry.pageUrl || '');
      if (htmlParsed.loginRequired) anyLoginRequired = true;
      if (htmlParsed.blocked) anyBlocked = true;
      if (htmlParsed.notFound) anyNotFound = true;
      if (htmlParsed.priceRedactedNoAuth) anyPriceRedacted = true;
      for (const it of htmlParsed.items) {
        if (it?.shopee_id && !seenIds.has(it.shopee_id)) {
          seenIds.add(it.shopee_id);
          collected.push(it);
        }
      }
    }

    const matched = collected.filter((it) => scoreProductMatch(it, kw) > 0).map((it) => ({
      ...it,
      via: 'chrome_extension'
    }));
    const existing = capturedByKw[kw] || [];
    capturedByKw[kw] = [...existing, ...matched].slice(0, perKwCap);
    onProgress(`    ✓ [Bridge] '${kw}': khớp ${matched.length}/${collected.length} sản phẩm đạt chuẩn.\n`);
  }

  const selectedProducts = allocateProductsFairly(capturedByKw, cleanKeywords, totalLimit);

  if (selectedProducts.length > 0) {
    onProgress(`[*] Đang tải & lưu ${selectedProducts.length} ảnh sản phẩm thật từ Shopee CDN...\n`);
    const CONCURRENCY = 5;
    for (let i = 0; i < selectedProducts.length; i += CONCURRENCY) {
      const batch = selectedProducts.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (item, offset) => {
          item.id = `shopee-bridge-${String(i + offset + 1).padStart(3, '0')}`;
          item.images = await downloadImage(
            item.image_id || '',
            item.shopee_id,
            item.image_url || '',
            imgDir,
            fetchImpl
          );
        })
      );
    }
  }

  const perKeywordCounts = {};
  for (const prod of selectedProducts) {
    const kwKey = prod.keyword || '';
    perKeywordCounts[kwKey] = (perKeywordCounts[kwKey] || 0) + 1;
  }

  let status = 'empty';
  let message = 'Chrome Extension không tìm thấy sản phẩm nào khớp từ khóa yêu cầu.';

  if (selectedProducts.length > 0) {
    status = 'completed';
    message = `Đã cào & đồng bộ thành công ${selectedProducts.length} sản phẩm thật từ Shopee qua Chrome Extension Bridge!`;
  } else if (anyNotFound && !anyBlocked && !anyLoginRequired && !anyPriceRedacted) {
    status = 'empty';
    message = 'Sản phẩm Shopee này không tồn tại hoặc đã bị gỡ bởi người bán.';
  } else if (anyLoginRequired || anyPriceRedacted) {
    status = 'login_required';
    message =
      'Trình duyệt Chrome của bạn chưa đăng nhập Shopee (hoặc phiên Shopee đã hết hạn). Hãy mở shopee.vn, đăng nhập tài khoản Shopee rồi bấm "Cào qua Chrome Extension" lại!';
  } else if (anyBlocked) {
    status = 'blocked';
    message =
      'Shopee hiển thị yêu cầu xác minh (slider / captcha) trên trình duyệt của bạn. Hãy mở tab shopee.vn giải xác minh một lần rồi thử lại.';
  }

  return {
    products: selectedProducts,
    status,
    message,
    anti_bot_blocked: selectedProducts.length === 0 ? anyBlocked : false,
    login_required: selectedProducts.length === 0 ? Boolean(anyLoginRequired || anyPriceRedacted) : false,
    config_required: false,
    provider: 'chrome_extension',
    per_keyword_counts: perKeywordCounts
  };
}
