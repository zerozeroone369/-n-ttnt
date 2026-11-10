/**
 * Pure utility for normalizing, validating, and inspecting Shopee Cookie headers.
 * Zero Node/DOM side-effects so it can be shared safely by backend, frontend UI, and tests.
 */

const COOKIE_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;
const MAX_COOKIE_HEADER_LENGTH = 32768;

/**
 * Parses and normalizes a raw Shopee cookie string (supports DevTools `cookie:` prefix,
 * multiline wrapping, newline-delimited pairs, and UTF-8 BOM).
 * Never throws; returns structured validation metadata and canonical `normalizedHeader`.
 */
export function normalizeShopeeCookieHeader(rawInput) {
  if (typeof rawInput !== 'string') {
    return {
      ok: false,
      error: 'Vui lòng nhập chuỗi cookie hợp lệ.',
      normalizedHeader: '',
      cookies: [],
      cookieCount: 0,
      hasAuthToken: false
    };
  }

  let cleaned = rawInput.replace(/^\uFEFF/, '').trim();
  if (!cleaned) {
    return {
      ok: false,
      error: 'Chuỗi cookie đang trống.',
      normalizedHeader: '',
      cookies: [],
      cookieCount: 0,
      hasAuthToken: false
    };
  }

  if (cleaned.length > MAX_COOKIE_HEADER_LENGTH) {
    return {
      ok: false,
      error: `Chuỗi cookie vượt quá giới hạn cho phép (${MAX_COOKIE_HEADER_LENGTH} ký tự).`,
      normalizedHeader: '',
      cookies: [],
      cookieCount: 0,
      hasAuthToken: false
    };
  }

  // Strip optional DevTools header prefix ("cookie: ..." or "Cookie: ...")
  cleaned = cleaned.replace(/^\s*cookie\s*:\s*/i, '').trim();

  // Unwrap single/double matching quotes if user copied from a quoted CLI command
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length >= 2) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'") && cleaned.length >= 2)
  ) {
    cleaned = cleaned.slice(1, -1).trim();
    cleaned = cleaned.replace(/^\s*cookie\s*:\s*/i, '').trim();
  }

  // Split by ';' or by newline preceding a new "name=" cookie pair
  const rawSegments = cleaned.split(/\s*(?:;|\r?\n(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+\s*=))\s*/);

  const cookieMap = new Map();
  for (const segment of rawSegments) {
    const compact = segment.replace(/[\r\n]+/g, '').trim();
    if (!compact) continue;

    const eqIdx = compact.indexOf('=');
    if (eqIdx <= 0) continue;

    const name = compact.slice(0, eqIdx).trim();
    const value = compact.slice(eqIdx + 1).trim();

    if (!COOKIE_NAME_RE.test(name)) continue;
    if (CONTROL_CHAR_RE.test(value)) continue;

    cookieMap.set(name, value);
  }

  const cookies = Array.from(cookieMap.entries()).map(([name, value]) => ({ name, value }));
  if (cookies.length === 0) {
    return {
      ok: false,
      error: 'Không tìm thấy cặp cookie hợp lệ (định dạng chuẩn: ten=giatri; ten2=giatri2).',
      normalizedHeader: '',
      cookies: [],
      cookieCount: 0,
      hasAuthToken: false
    };
  }

  const hasAuthToken = cookies.some((c) => {
    if (!c.value || c.value === '-' || c.value === '""' || c.value === 'null') return false;
    return c.name === 'SPC_ST' || c.name === 'SPC_EC' || c.name === 'SPC_U';
  });

  const normalizedHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  return {
    ok: true,
    error: null,
    normalizedHeader,
    cookies,
    cookieCount: cookies.length,
    hasAuthToken
  };
}

const CORE_AUTH_COOKIE_NAMES = new Set([
  'SPC_ST',
  'SPC_U',
  'SPC_EC',
  'SPC_T_ID',
  'SPC_T_IV',
  'SPC_R_T_ID',
  'SPC_R_T_IV',
  'csrftoken',
  'language',
  'ssr-tz'
]);

/**
 * Extracts only core Shopee auth/locale cookies, omitting browser-bound anti-bot/tracking
 * fingerprint cookies (SPC_F, SPC_SI, SPC_SEC_SI, shopee_webUnique_ccd, ds) that expire or
 * mismatch across proxy IPs.
 */
export function extractCoreAuthCookieHeader(rawInput) {
  const parsed = normalizeShopeeCookieHeader(rawInput);
  if (!parsed.ok || !parsed.hasAuthToken) return '';
  const core = parsed.cookies.filter((c) => CORE_AUTH_COOKIE_NAMES.has(c.name));
  if (core.length === 0) return '';
  return core.map((c) => `${c.name}=${c.value}`).join('; ');
}


