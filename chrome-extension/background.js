/**
 * Background MV3 Service Worker cho Tiệm Nhà Nhỏ — Shopee Bridge.
 * Chạy các yêu cầu cào Shopee ngay trong trình duyệt Chrome của chủ shop (IP nhà + phiên Shopee thật),
 * tuyệt đối không đọc hay truyền thô chuỗi Cookie về backend.
 */

const ALLOWED_SENDER_ORIGIN_RE = /^(?:https:\/\/n-ttnt\.vercel\.app|http:\/\/localhost(?::\d+)?|http:\/\/127\.0\.0\.1(?::\d+)?)$/i;

function isAllowedSender(sender) {
  const rawUrl = sender?.tab?.url || sender?.url || '';
  if (!rawUrl) return false;
  try {
    const u = new URL(rawUrl);
    return ALLOWED_SENDER_ORIGIN_RE.test(u.origin);
  } catch {
    return false;
  }
}

function parseShopeeTarget(input) {
  const raw = String(input || '').trim();
  let candidate = raw;
  if (/^(?:www\.)?shopee\.vn\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const u = new URL(candidate);
      const host = u.hostname.toLowerCase();
      if (host === 'shopee.vn' || host.endsWith('.shopee.vn')) {
        const pdpMatch =
          u.pathname.match(/(?:-i\.(\d+)\.(\d+)|^\/product\/(\d+)\/(\d+))\/?$/i) ||
          u.pathname.match(/(?:-i\.(\d+)\.(\d+)|^\/product\/(\d+)\/(\d+))/i);
        if (pdpMatch) {
          const shopId = pdpMatch[1] || pdpMatch[3] || '';
          const itemId = pdpMatch[2] || pdpMatch[4] || '';
          if (shopId && itemId) {
            return {
              kind: 'product',
              shopId,
              itemId,
              pageUrl: `https://shopee.vn${u.pathname}`,
              apiUrls: [
                `https://shopee.vn/api/v4/pdp/get_pc?item_id=${encodeURIComponent(itemId)}&shop_id=${encodeURIComponent(shopId)}`,
                `https://shopee.vn/api/v4/item/get?itemid=${encodeURIComponent(itemId)}&shopid=${encodeURIComponent(shopId)}`
              ]
            };
          }
        }
        if (u.pathname === '/search' || u.pathname.startsWith('/search/')) {
          const kw = (u.searchParams.get('keyword') || '').trim();
          return {
            kind: 'search',
            keywordText: kw,
            pageUrl: `https://shopee.vn${u.pathname}${u.search}`,
            apiUrls: kw
              ? [
                  `https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(kw)}&limit=30&newest=0&order=desc&page_type=search`
                ]
              : []
          };
        }
        const catMatch = u.pathname.match(/-cat\.(\d+(?:\.\d+)*)\/?$/i);
        if (catMatch) {
          const leafCatId = catMatch[1].split('.').filter(Boolean).pop();
          return {
            kind: 'category',
            categoryId: catMatch[1],
            pageUrl: `https://shopee.vn${u.pathname}${u.search}`,
            apiUrls: leafCatId
              ? [
                  `https://shopee.vn/api/v4/search/search_items?by=pop&limit=30&match_id=${encodeURIComponent(leafCatId)}&newest=0&order=desc&page_type=search`
                ]
              : []
          };
        }
      }
    } catch {
      // treat as keyword
    }
  }

  return {
    kind: 'keyword',
    keywordText: raw,
    pageUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(raw)}`,
    apiUrls: [
      `https://shopee.vn/api/v4/search/search_items?by=relevancy&keyword=${encodeURIComponent(raw)}&limit=30&newest=0&order=desc&page_type=search`
    ]
  };
}

function slimApiPayload(data, maxArr = 45) {
  if (!data || typeof data !== 'object') return data;
  try {
    const rawStr = JSON.stringify(data);
    if (rawStr.length <= 900_000) return data;
  } catch {
    return null;
  }
  const clone = { ...data };
  if (Array.isArray(clone.items)) {
    clone.items = clone.items.slice(0, maxArr);
  }
  if (clone.data && typeof clone.data === 'object') {
    clone.data = { ...clone.data };
    if (Array.isArray(clone.data.items)) {
      clone.data.items = clone.data.items.slice(0, maxArr);
    }
    if (Array.isArray(clone.data.sections)) {
      clone.data.sections = clone.data.sections.slice(0, 4);
    }
  }
  return clone;
}

function hasUsableShopeeJson(data, kind) {
  if (!data || typeof data !== 'object') return { ok: false, loginRequired: false, blocked: false };
  const errCode = Number(data.error);
  if (errCode && errCode !== 0) {
    return {
      ok: false,
      loginRequired: errCode === 19 || errCode === 10002,
      blocked: errCode !== 19 && errCode !== 10002
    };
  }
  if (kind === 'product') {
    const dp = data.data && typeof data.data === 'object' ? data.data : data;
    const it = dp.item || dp.item_basic || (dp.itemid || dp.item_id ? dp : null);
    if (!it) return { ok: false, loginRequired: false, blocked: false };
    const priceCandidates = [
      it.price,
      it.price_min,
      dp.product_price?.price?.single_value,
      dp.product_price?.price,
      dp.flash_sale?.price,
      dp.deep_discount?.promotion?.price,
      ...(Array.isArray(it.models) ? it.models.map((m) => m?.price) : [])
    ];
    const hasValidPrice = priceCandidates.some((p) => Number.isFinite(Number(p)) && Number(p) >= 100_000_000);
    return { ok: hasValidPrice, loginRequired: false, blocked: false };
  }

  const list =
    (Array.isArray(data.items) && data.items) ||
    (Array.isArray(data.data?.items) && data.data.items) ||
    [];
  if (list.length > 0) return { ok: true, loginRequired: false, blocked: false };

  const sections = Array.isArray(data.data?.sections) ? data.data.sections : [];
  for (const sec of sections) {
    if (Array.isArray(sec?.data?.item) && sec.data.item.length > 0) {
      return { ok: true, loginRequired: false, blocked: false };
    }
  }
  return { ok: false, loginRequired: false, blocked: false };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTabComplete(tabId, timeoutMs = 20000, isAborted = () => false) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.status === 'complete') return tab;
  } catch {
    return null;
  }

  return await new Promise((resolve) => {
    let finished = false;
    const done = (tabObj) => {
      if (finished) return;
      finished = true;
      chrome.tabs.onUpdated.removeListener(onUpdated);
      clearTimeout(timer);
      clearInterval(abortCheck);
      resolve(tabObj);
    };

    const onUpdated = (updatedId, changeInfo, tabObj) => {
      if (updatedId === tabId && changeInfo.status === 'complete') {
        done(tabObj);
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);
    const timer = setTimeout(async () => {
      try {
        done(await chrome.tabs.get(tabId));
      } catch {
        done(null);
      }
    }, timeoutMs);
    const abortCheck = setInterval(() => {
      if (isAborted()) done(null);
    }, 400);
  });
}

// Executed inside a real https://shopee.vn page in world: 'MAIN' so Chrome attaches cookies & Shopee JS Akamai hooks run natively.
async function inPageShopeeApiFetch(apiUrl) {
  try {
    const res = await window.fetch(apiUrl, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json, text/plain, */*',
        'X-Api-Source': 'pc',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Shopee-Language': 'vi'
      }
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: res.status,
      finalUrl: res.url || window.location.href,
      json
    };
  } catch (err) {
    return {
      status: 0,
      error: String(err?.message || err),
      json: null
    };
  }
}

// Executed in world: 'MAIN' during tab loading/complete to capture search/pdp API XHRs triggered by Shopee React app.
function installInPageNetworkSpy() {
  try {
    const W = window;
    if (W.__snnBridgeSpyInstalled) return true;
    W.__snnBridgeSpyInstalled = true;
    W.__snnCap = [];
    const URL_MATCH = /search_items|global_search|recommend|pdp\/get_|item\/get/i;
    const captureBody = (url, rawText) => {
      try {
        if (!rawText || rawText.length < 30 || rawText.length > 1_800_000) return;
        const parsed = JSON.parse(rawText);
        if (!parsed || typeof parsed !== 'object') return;
        if (W.__snnCap.length < 6) {
          W.__snnCap.push({ url: String(url || '').slice(0, 260), d: parsed });
        }
      } catch {
        // ignore non-JSON
      }
    };

    const origFetch = W.fetch;
    if (origFetch) {
      W.fetch = function (...args) {
        const reqUrl = args[0]?.url || String(args[0] || '');
        return origFetch.apply(this, args).then((res) => {
          try {
            if (URL_MATCH.test(reqUrl) && res?.clone) {
              res.clone().text().then((t) => captureBody(reqUrl, t), () => {});
            }
          } catch {
            // ignore
          }
          return res;
        });
      };
    }

    const XHRProto = XMLHttpRequest.prototype;
    const origOpen = XHRProto.open;
    const origSend = XHRProto.send;
    XHRProto.open = function (method, url) {
      this.__snnUrl = url;
      return origOpen.apply(this, arguments);
    };
    XHRProto.send = function () {
      try {
        if (URL_MATCH.test(String(this.__snnUrl || ''))) {
          this.addEventListener('load', () => captureBody(this.__snnUrl, this.responseText));
        }
      } catch {
        // ignore
      }
      return origSend.apply(this, arguments);
    };
    return true;
  } catch {
    return false;
  }
}

function scrollAndExtractInPageDom(scrollYValue, includePdp) {
  try {
    if (typeof scrollYValue === 'number' && scrollYValue > 0) {
      window.scrollTo({ top: scrollYValue, behavior: 'auto' });
    }
    const D = document;
    const L = location;
    const Q = (e, s) => e?.querySelector(s);
    const QA = (s, e = D) => [...e.querySelectorAll(s)];
    const T = (s) => String(s || '').replace(/\s+/g, ' ').trim();
    const A = (e, k) => e?.getAttribute(k) || '';
    const IT = (e, s) => T(Q(e, s)?.innerText);
    const G = (v) => (/^\d{4,20}$/.test(String(v || '')) ? String(v) : '');
    const HREF_RE = /(?:-i\.(\d+)\.(\d+)|\/product\/(\d+)\/(\d+))/i;
    const IU = (x) => x.currentSrc || x.src || A(x, 'data-src') || A(x, 'data-lazy-src') || (A(x, 'srcset').split(/[\s,]/)[0] || '');

    const cap = Array.isArray(window.__snnCap) ? window.__snnCap.slice(0, 6) : [];
    const mt = IT(D, 'main,[role=main]') || T(D.body?.innerText);

    if (includePdp) {
      const pm = L.pathname.match(HREF_RE);
      const M = (p) => Q(D, `meta[property='${p}']`)?.content || '';
      const mp = M('product:price:amount') || M('og:price:amount') || A(Q(D, 'meta[itemprop=price]'), 'content');
      const pp = (mt.match(/(?:₫\s*[\d.,]+|[\d.,]+\s*[₫đ])/) || [])[0] || '';
      return {
        url: L.href,
        title: D.title,
        ready: D.readyState,
        sqeCount: 0,
        capCount: cap.length,
        cap,
        items: [],
        pdp: pm
          ? {
              shopId: pm[1] || pm[3] || '',
              itemId: pm[2] || pm[4] || '',
              h1: Q(D, 'main h1,h1')?.innerText?.trim() || '',
              metaPrice: mp,
              pdpPrice: pp,
              pdpOrig: Q(D, 'main del,[class*=line-]')?.innerText?.trim() || '',
              pdpImg: QA('main img,picture img').map(IU).find((u) => /susercontent\.com\/file\//i.test(u)) || M('og:image'),
              ogImg: M('og:image'),
              ogTitle: M('og:title'),
              sold: (mt.match(/[\d.,]+k?\+?\s*đã bán|đã bán\s*[\d.,]+k?\+?/i) || [])[0] || ''
            }
          : null,
        mainText: mt.slice(0, 800)
      };
    }

    const extractFromReact = (e) => {
      const scanObj = (o, d, seen) => {
        if (!o || typeof o !== 'object' || d > 3 || seen.has(o)) return null;
        seen.add(o);
        const i = G(o.itemid || o.item_id || o.itemId || o.id);
        const p = G(o.shopid || o.shop_id || o.shopId);
        const h = o.href || o.to || o.url || '';
        const hasHref = HREF_RE.test(h);
        if ((i && (p || hasHref)) || hasHref) {
          const a = o.item_card_displayed_asset || o.item_data || o.item_basic || o;
          const dp = a.display_price || a.item_card_display_price || a;
          return {
            i,
            p,
            h,
            n: o.name || a.name || o.title,
            im: a.image || a.images?.[0] || o.image || o.images?.[0],
            pr: dp.price || o.price || o.price_min,
            or: dp.strikethrough_price || a.price_before_discount || o.price_before_discount,
            sd: a.historical_sold || a.sold || a.sold_count?.text
          };
        }
        const keys = ['item', 'item_basic', 'item_data', 'data', ...Object.keys(o).slice(0, 10)];
        for (const k of keys) {
          if (o[k] && !/^(_|return|child|sib|state)/.test(k)) {
            const res = scanObj(o[k], d + 1, seen);
            if (res) return res;
          }
        }
        return null;
      };
      for (const n of [e, e.closest('a'), Q(e, 'a'), e.firstElementChild, e.parentElement]) {
        if (!n) continue;
        const ks = Object.keys(n);
        for (const k of ks) {
          if (k.startsWith('__reactProps')) {
            const r = scanObj(n[k], 0, new Set());
            if (r) return r;
          }
        }
        const fk = ks.find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternal'));
        if (fk) {
          for (let c = n[fk], steps = 0; c && steps < 9; steps++, c = c.return) {
            const r = scanObj(c.memoizedProps, 0, new Set());
            if (r) return r;
          }
        }
      }
      return null;
    };

    let cs = QA('[data-sqe=item],.shopee-search-item-result__item');
    if (!cs.length) {
      cs = [...new Set(QA("a[href*='-i.'],a[href*='/product/']").map((a) => a.closest('li') || a))];
    }
    const items = [];
    cs.slice(0, 40).forEach((e) => {
      const a = e.closest('a[href]') || Q(e, 'a[href]');
      const href = a ? A(a, 'href') || a.href : '';
      const hm = href.match(HREF_RE);
      const ims = QA('img', e);
      const im = ims.find((y) => /susercontent|shopee/i.test(IU(y))) || ims.find((y) => /^https?:/i.test(IU(y)));
      const iu = im ? IU(im) : '';
      const fb = ((!hm || !iu) && extractFromReact(e)) || {};
      items.push({
        href: href || fb.h || '',
        itemId: (hm && (hm[2] || hm[4])) || fb.i || G(A(e, 'data-itemid') || A(e, 'data-item-id')),
        shopId: (hm && (hm[1] || hm[3])) || fb.p || G(A(e, 'data-shopid') || A(e, 'data-shop-id')),
        name: T(fb.n || IT(e, '[data-sqe=name],[class*=clamp]') || (im && im.alt)),
        txt: T(e.innerText).slice(0, 260),
        del: IT(e, 'del,[class*=line-]'),
        priceTxt: IT(e, '[data-sqe=price]'),
        img: iu,
        fim: fb.im || '',
        fbPrice: fb.pr || 0,
        fbOrig: fb.or || 0,
        fbSold: fb.sd || 0
      });
    });

    const scriptJsons = QA('script[type="text/mfe-initial-data"],script[type="application/json"],script[type="application/ld+json"]')
      .map((el) => el.textContent || '')
      .filter((t) => t.length > 40 && t.length < 900_000)
      .slice(0, 3);

    return {
      url: L.href,
      title: D.title,
      ready: D.readyState,
      sqeCount: cs.length,
      capCount: cap.length,
      cap,
      items,
      pdp: null,
      mainText: mt.slice(0, 600),
      extraJsonCount: scriptJsons.length
    };
  } catch (err) {
    return {
      url: location.href,
      title: document.title,
      err: String(err?.message || err),
      cap: [],
      items: []
    };
  }
}

async function runExtensionScrape({ keywords = [], limit = 20, emit, isAborted }) {
  const createdTabIds = [];
  const entries = [];

  try {
    const existingTabs = await chrome.tabs.query({ url: 'https://shopee.vn/*' });
    const reusableTab = existingTabs.find(
      (t) => t.id && t.url && !/\/buyer\/login|\/verify\//i.test(t.url)
    );

    emit(`[*] Chrome Extension Bridge bắt đầu cào ${keywords.length} mục tiêu (giới hạn ${limit})...\n`);
    if (reusableTab) {
      emit(`[*] Đang tận dụng tab Shopee mở sẵn (#${reusableTab.id}) để gọi API nội bộ với IP nhà...\n`);
    } else {
      emit(`[*] Chưa có tab Shopee mở sẵn — sẽ mở tab nền shopee.vn để lấy dữ liệu thật...\n`);
    }

    for (let idx = 0; idx < keywords.length; idx++) {
      if (isAborted()) break;
      const kw = String(keywords[idx] || '').trim();
      if (!kw) continue;

      const target = parseShopeeTarget(kw);
      const entry = {
        keyword: kw,
        pageUrl: target.pageUrl,
        title: '',
        apiPayloads: [],
        evalPayload: null,
        loginRequired: false,
        blocked: false,
        notFound: false
      };

      let tier1Succeeded = false;

      // Tier 1: Call internal Shopee JSON API right inside existing Shopee tab (fast 1-2s, preserves user tab)
      if (reusableTab?.id && target.apiUrls.length > 0) {
        for (const apiUrl of target.apiUrls) {
          if (isAborted()) break;
          emit(`[*] [Tier 1 · API Trực Tiếp] '${kw}'...\n`);
          try {
            const execRes = await chrome.scripting.executeScript({
              target: { tabId: reusableTab.id },
              world: 'MAIN',
              func: inPageShopeeApiFetch,
              args: [apiUrl]
            });
            const outcome = execRes?.[0]?.result;
            if (outcome?.finalUrl && /\/buyer\/login/i.test(outcome.finalUrl)) {
              entry.loginRequired = true;
              break;
            }
            if (outcome?.status === 200 && outcome?.json) {
              const check = hasUsableShopeeJson(outcome.json, target.kind);
              if (check.loginRequired) entry.loginRequired = true;
              if (check.blocked) entry.blocked = true;
              entry.apiPayloads.push(slimApiPayload(outcome.json));
              if (check.ok) {
                tier1Succeeded = true;
                emit(`    ✓ [Tier 1] Nhận JSON thật từ Shopee API cho '${kw}'.\n`);
                break;
              }
            } else if (outcome?.status === 401) {
              entry.loginRequired = true;
            } else if (outcome?.status === 403 || outcome?.status === 429) {
              entry.blocked = true;
            }
            emit(`    [i] [Tier 1] HTTP ${outcome?.status ?? 0} — chuyển sang Tier 2 (Tab Chrome nền)...\n`);
          } catch (err) {
            emit(`    [i] [Tier 1] Không chạy được trực tiếp (${err?.message || err}) — chuyển Tier 2...\n`);
          }
        }
      }

      // Tier 2: Real background Chrome tab navigation + XHR spy + React Fiber/DOM fallback
      if (!tier1Succeeded && !isAborted()) {
        emit(`[*] [Tier 2 · Chrome Tab Nền] Đang tải trang thật cho '${kw}'...\n`);
        let bgTab = null;
        let spyInstalled = false;

        const onLoadingSpy = (updatedTabId, changeInfo) => {
          if (bgTab && updatedTabId === bgTab.id && changeInfo.status === 'loading' && !spyInstalled) {
            chrome.scripting
              .executeScript({
                target: { tabId: bgTab.id },
                world: 'MAIN',
                func: installInPageNetworkSpy
              })
              .then(() => {
                spyInstalled = true;
              })
              .catch(() => {});
          }
        };

        chrome.tabs.onUpdated.addListener(onLoadingSpy);
        try {
          bgTab = await chrome.tabs.create({ url: target.pageUrl, active: false });
          if (bgTab?.id) createdTabIds.push(bgTab.id);

          const loadedTab = await waitForTabComplete(bgTab.id, 20000, isAborted);
          const curUrl = loadedTab?.url || '';
          entry.pageUrl = curUrl || target.pageUrl;
          entry.title = loadedTab?.title || '';

          if (/\/buyer\/login/i.test(curUrl)) {
            entry.loginRequired = true;
            emit(`    [!] Shopee yêu cầu đăng nhập (/buyer/login) trên trình duyệt Chrome.\n`);
          } else if (/\/verify\//i.test(curUrl)) {
            entry.blocked = true;
            emit(`    [!] Shopee yêu cầu xác minh bảo mật (/verify/).\n`);
          } else if (!isAborted()) {
            await chrome.scripting
              .executeScript({
                target: { tabId: bgTab.id },
                world: 'MAIN',
                func: installInPageNetworkSpy
              })
              .catch(() => {});

            // Try direct internal API fetch inside the freshly loaded target page too
            for (const apiUrl of target.apiUrls) {
              const directInBg = await chrome.scripting
                .executeScript({
                  target: { tabId: bgTab.id },
                  world: 'MAIN',
                  func: inPageShopeeApiFetch,
                  args: [apiUrl]
                })
                .then((r) => r?.[0]?.result)
                .catch(() => null);
              if (directInBg?.status === 200 && directInBg?.json) {
                entry.apiPayloads.push(slimApiPayload(directInBg.json));
                if (hasUsableShopeeJson(directInBg.json, target.kind).ok) {
                  break;
                }
              }
            }

            // Wait & scroll incrementally if we haven't secured usable JSON yet
            const hasDirectOk = entry.apiPayloads.some((p) => hasUsableShopeeJson(p, target.kind).ok);
            const scrollStops = hasDirectOk ? [0] : [650, 1400];
            let bestEval = null;
            for (let sIdx = 0; sIdx < scrollStops.length; sIdx++) {
              if (isAborted()) break;
              if (!hasDirectOk) {
                await delay(sIdx === 0 ? 2800 : 2200);
              }
              const evRes = await chrome.scripting
                .executeScript({
                  target: { tabId: bgTab.id },
                  world: 'MAIN',
                  func: scrollAndExtractInPageDom,
                  args: [scrollStops[sIdx], target.kind === 'product']
                })
                .then((r) => r?.[0]?.result)
                .catch(() => null);
              if (evRes) {
                bestEval = evRes;
                if ((evRes.capCount || 0) > 0 || (evRes.items?.length || 0) >= 6 || (evRes.pdp?.pdpPrice && target.kind === 'product')) {
                  break;
                }
              }
            }

            if (bestEval) {
              if (/\/buyer\/login/i.test(bestEval.url || '')) entry.loginRequired = true;
              if (/\/verify\//i.test(bestEval.url || '')) entry.blocked = true;
              if (Array.isArray(bestEval.cap)) {
                for (const c of bestEval.cap) {
                  if (c?.d) entry.apiPayloads.push(slimApiPayload(c.d));
                }
              }
              entry.evalPayload = bestEval;
              emit(
                `    [i] [Tier 2] DOM items=${bestEval.items?.length || 0}, capturedAPI=${entry.apiPayloads.length}.\n`
              );
            }
          }
        } finally {
          chrome.tabs.onUpdated.removeListener(onLoadingSpy);
          if (bgTab?.id) {
            await chrome.tabs.remove(bgTab.id).catch(() => {});
          }
        }
      }

      entries.push(entry);
      if (idx < keywords.length - 1 && !isAborted()) {
        await delay(700);
      }
    }
  } finally {
    for (const tid of createdTabIds) {
      await chrome.tabs.remove(tid).catch(() => {});
    }
  }

  return entries;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || typeof msg !== 'object') return false;

  if (msg.type === 'PING') {
    if (!isAllowedSender(sender)) {
      sendResponse({ ok: false });
      return false;
    }
    chrome.tabs.query({ url: 'https://shopee.vn/*' }, (tabs) => {
      sendResponse({
        ok: true,
        version: chrome.runtime.getManifest()?.version || '1.0.0',
        shopeeTabs: Array.isArray(tabs) ? tabs.length : 0
      });
    });
    return true;
  }

  if (msg.type === 'OPEN_SHOPEE_TAB') {
    if (!isAllowedSender(sender)) return false;
    const url = typeof msg.url === 'string' && /^https:\/\/(?:[a-z0-9-]+\.)?shopee\.vn\//i.test(msg.url)
      ? msg.url
      : 'https://shopee.vn/buyer/login';
    chrome.tabs.create({ url, active: true });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'snn-bridge-scrape') return;
  if (!isAllowedSender(port.sender)) {
    port.disconnect();
    return;
  }

  let aborted = false;
  port.onDisconnect.addListener(() => {
    aborted = true;
  });

  port.onMessage.addListener(async (msg) => {
    if (!msg || msg.type !== 'START_SCRAPE') return;
    const emit = (line) => {
      if (aborted) return;
      try {
        port.postMessage({ type: 'PROGRESS', line });
      } catch {
        aborted = true;
      }
    };

    try {
      const entries = await runExtensionScrape({
        keywords: Array.isArray(msg.keywords) ? msg.keywords : [],
        limit: Number(msg.limit) || 20,
        emit,
        isAborted: () => aborted
      });
      if (!aborted) {
        port.postMessage({ type: 'COMPLETE', entries });
      }
    } catch (err) {
      if (!aborted) {
        try {
          port.postMessage({ type: 'ERROR', error: String(err?.message || err) });
        } catch {
          // ignore
        }
      }
    }
  });
});
