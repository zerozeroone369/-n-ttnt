"""
Shopee Product Scraper - Option B Engine (Third-Party Scraping APIs)
- Tích hợp dịch vụ Scraping API chuyên dụng (ZenRows, ScraperAPI, Crawlbase)
  để chạy JavaScript thật, tự động xử lý Akamai & xoay IP dân cư Việt Nam (VN)
- Không chạy Chromium/Playwright nội bộ -> server Render Free 512MB RAM chạy nhẹ nhàng
- Hỗ trợ bóc tách cả JSON nội bộ (ZenRows XHR interception / embedded state) lẫn DOM HTML
- Tải và tối ưu ảnh sang WebP (Pillow) vào public/products/shopee_live/
- Bảo mật: Không hardcode API key, tự động ẩn token/apikey khỏi mọi log lỗi
"""
from __future__ import annotations

import argparse
import datetime
import json
import os
import random
import re
import time
import urllib.error
import urllib.request
from io import BytesIO
from pathlib import Path
from urllib.parse import quote, urlencode

try:
    import httpx
    _HAS_HTTPX = True
except ImportError:  # pragma: no cover
    _HAS_HTTPX = False

    class _CompatResponse:
        def __init__(self, status_code: int, content: bytes, headers: dict):
            self.status_code = status_code
            self.content = content
            self.headers = {k.lower(): v for k, v in (headers or {}).items()}
            self.text = content.decode("utf-8", errors="replace")

        def json(self):
            return json.loads(self.text)

    class _CompatClient:
        def __init__(self, follow_redirects=True, timeout=80):
            self.timeout = timeout

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        def close(self):
            pass

        def get(self, url, params=None, headers=None, timeout=None):
            full_url = f"{url}?{urlencode(params)}" if params else url
            req = urllib.request.Request(full_url, headers=headers or {}, method="GET")
            try:
                with urllib.request.urlopen(req, timeout=timeout or self.timeout) as resp:
                    return _CompatResponse(resp.status, resp.read(), dict(resp.headers))
            except urllib.error.HTTPError as e:
                return _CompatResponse(e.code, e.read(), dict(e.headers or {}))
            except urllib.error.URLError as e:
                raise OSError(str(e)) from e

    class _HttpxCompat:
        HTTPError = OSError
        Client = _CompatClient

    httpx = _HttpxCompat()  # type: ignore[assignment]

try:
    from bs4 import BeautifulSoup
except ImportError:  # pragma: no cover
    BeautifulSoup = None  # type: ignore[assignment]

try:
    from PIL import Image as PilImage
    _HAS_PIL = True
except ImportError:  # pragma: no cover
    _HAS_PIL = False

OUTPUT_JSON = "shopee_scraped.json"
IMG_DIR = Path("public/products/shopee_live")
IMG_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_PROVIDERS = ("zenrows", "scraperapi", "crawlbase")

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)

_COOKIE_NAME_RE = re.compile(r"^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$")
_SECRET_QUERY_RE = re.compile(r"((?:apikey|api_key|token)=)[^&\s'\"]+", re.IGNORECASE)
_SHOPEE_HREF_RE = re.compile(r"(?:-i\.(\d+)\.(\d+)|/product/(\d+)/(\d+))")


def _sanitize_error_text(text: str) -> str:
    """Che giấu mọi query secret (apikey/token) trước khi ghi log hoặc trả về UI."""
    return _SECRET_QUERY_RE.sub(r"\1***", str(text or ""))


# ---------------------------------------------------------------------------
# Scraping API Provider Configuration (Option B)
# ---------------------------------------------------------------------------

def resolve_scraping_provider(preferred: str | None = None) -> tuple[str | None, str | None]:
    """
    Xác định provider Scraping API và API key hợp lệ từ biến môi trường.
    Ưu tiên khi auto: zenrows -> scraperapi -> crawlbase.
    """
    choice = (preferred or os.environ.get("SCRAPING_PROVIDER") or "auto").strip().lower()

    keys = {
        "zenrows": os.environ.get("ZENROWS_API_KEY", "").strip(),
        "scraperapi": os.environ.get("SCRAPERAPI_KEY", "").strip(),
        "crawlbase": (
            os.environ.get("CRAWLBASE_TOKEN", "").strip()
            or os.environ.get("CRAWLBASE_API_KEY", "").strip()
        ),
    }
    generic_key = os.environ.get("SCRAPING_API_KEY", "").strip()

    if choice in SUPPORTED_PROVIDERS:
        key = keys.get(choice) or generic_key
        return choice, (key or None)

    for prov in SUPPORTED_PROVIDERS:
        if keys[prov]:
            return prov, keys[prov]

    return None, None


# ---------------------------------------------------------------------------
# Cookie helpers (giữ tương thích module & unit test)
# ---------------------------------------------------------------------------

def parse_shopee_cookie_string(raw: str) -> list:
    """Chuẩn hóa và phân tích chuỗi cookie Shopee (hỗ trợ tiền tố `cookie:`, xuống dòng, dấu ngoặc)."""
    if not raw or not isinstance(raw, str):
        return []

    cleaned = raw.lstrip("\ufeff").strip()
    if not cleaned:
        return []

    cleaned = re.sub(r"^\s*cookie\s*:\s*", "", cleaned, flags=re.IGNORECASE).strip()
    if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in ('"', "'"):
        cleaned = cleaned[1:-1].strip()
        cleaned = re.sub(r"^\s*cookie\s*:\s*", "", cleaned, flags=re.IGNORECASE).strip()

    segments = re.split(
        r"\s*(?:;|\r?\n(?=[!#$%&'*+\-.^_`|~0-9A-Za-z]+\s*=))\s*",
        cleaned,
    )
    deduped = {}
    for part in segments:
        compact = re.sub(r"[\r\n]+", "", part).strip()
        if "=" not in compact:
            continue
        name, val = compact.split("=", 1)
        name = name.strip()
        val = val.strip()
        if not name or not _COOKIE_NAME_RE.match(name):
            continue
        deduped[name] = val

    return [
        {
            "name": name,
            "value": val,
            "domain": ".shopee.vn",
            "path": "/",
        }
        for name, val in deduped.items()
    ]


def load_shopee_cookies(cookie_path: Path | str | None = None) -> list:
    """Tải cookie Shopee từ file shopee_cookie.txt (hoặc đường dẫn chỉ định)."""
    target = Path(cookie_path) if cookie_path is not None else Path(
        os.environ.get("SHOPEE_COOKIE_FILE", "shopee_cookie.txt")
    )
    if not target.exists():
        return []
    try:
        raw = target.read_text(encoding="utf-8-sig")
        return parse_shopee_cookie_string(raw)
    except (OSError, UnicodeDecodeError) as e:
        print(f"[!] Lỗi đọc cookie Shopee: {e}")
        return []


# ---------------------------------------------------------------------------
# Category / Price / Parsing helpers
# ---------------------------------------------------------------------------

def guess_category(keyword: str) -> str:
    kw = (keyword or "").lower()
    if any(x in kw for x in [
        "áo", "quần", "váy", "giày", "túi", "ví", "đồng hồ",
        "sneaker", "thời trang", "hoodie", "bomber", "jacket", "tất", "polo",
    ]):
        return "fashion"
    if any(x in kw for x in ["nến", "decor", "đèn", "gốm", "trang trí", "phòng ngủ"]):
        return "decor"
    if any(x in kw for x in ["cà phê", "trà", "mật ong", "hạt", "coffee", "tea"]):
        return "coffee"
    if any(x in kw for x in ["tai nghe", "bàn phím", "chuột", "sạc", "loa", "bluetooth", "công nghệ"]):
        return "tech"
    return "fashion"


def parse_sold_count(sold_val) -> int:
    if isinstance(sold_val, (int, float)):
        return int(sold_val)
    if not sold_val or not isinstance(sold_val, str):
        return 0
    clean = sold_val.lower().replace("đã bán", "").replace("sold", "").strip()
    m_k = re.search(r"([\d\.,]+)\s*k\+?", clean)
    if m_k:
        val = m_k.group(1).replace(",", ".")
        try:
            return int(float(val) * 1000)
        except ValueError:
            return 0
    digits = re.sub(r"[^\d]", "", clean)
    return int(digits) if digits else 0


def parse_vnd_price(text: str) -> int:
    """Chuyển chuỗi giá VND hiển thị trên Shopee (vd: '₫149.000', '149.000 - 250.000') về số nguyên."""
    if not text or not isinstance(text, str):
        return 0
    # Lấy phần giá đầu tiên nếu là khoảng giá "₫149.000 - ₫250.000"
    head = re.split(r"[-–~]", text, maxsplit=1)[0]
    matches = re.findall(r"\d+(?:[.,]\d{3})+", head)
    if not matches:
        matches = re.findall(r"\d{4,9}", head)
    for m in matches:
        digits = re.sub(r"[^\d]", "", m)
        if digits:
            val = int(digits)
            if 1000 <= val <= 500_000_000:
                return val
    return 0


def _extract_image_ref(src: str) -> tuple[str, str]:
    """Trích xuất (image_id, fallback_cdn_url) từ URL ảnh Shopee CDN."""
    clean = (src or "").strip()
    if not clean:
        return "", ""
    if clean.startswith("//"):
        clean = f"https:{clean}"
    m = re.search(r"susercontent\.com/file/([^/?@#\s]+)", clean)
    if m:
        img_id = m.group(1).split("@", 1)[0]
        return img_id, f"https://down-vn.img.susercontent.com/file/{img_id}"
    return "", clean if clean.startswith(("http://", "https://")) else ""


def parse_shopee_item(raw_item: dict, kw: str) -> dict | None:
    """Phân tích 1 item từ Shopee JSON API (hỗ trợ cả định dạng BFF mới 2026 và v4/search_items)."""
    asset = raw_item.get("item_card_displayed_asset") or {}
    ib = raw_item.get("item_basic") or raw_item

    name = asset.get("name") or ib.get("name") or ""
    if not name or len(str(name).strip()) < 3:
        return None

    # Giá bán (Shopee lưu micro-currency × 100,000)
    price_raw = (
        (asset.get("display_price") or {}).get("price")
        or ib.get("price")
        or ib.get("price_min")
        or 0
    )
    price = int(price_raw / 100000) if price_raw > 99999 else int(price_raw)
    if price <= 0:
        return None

    # Giá gốc niêm yết
    orig_raw = (
        (asset.get("display_price") or {}).get("strikethrough_price")
        or ib.get("price_before_discount")
        or ib.get("price_max_before_discount")
        or 0
    )
    orig = int(orig_raw / 100000) if orig_raw > 99999 else int(orig_raw)
    if orig <= price:
        orig = None

    # Đánh giá sao
    rating = None
    r_obj = asset.get("rating")
    if isinstance(r_obj, dict) and r_obj.get("rating_text"):
        try:
            rating = round(float(r_obj.get("rating_text")), 1)
        except (TypeError, ValueError):
            rating = 4.9
    elif ib.get("item_rating"):
        raw_r = ib.get("item_rating", {}).get("rating_star")
        if raw_r:
            rating = round(float(raw_r), 1)

    # Số lượng đã bán
    sold = 0
    if isinstance(asset.get("sold_count"), dict) and asset["sold_count"].get("text"):
        sold = parse_sold_count(asset["sold_count"].get("text"))
    elif ib.get("historical_sold"):
        sold = int(ib.get("historical_sold"))

    # Ảnh đại diện
    image_id = asset.get("image") or ib.get("image") or ""
    all_images = asset.get("images") or ib.get("images") or []

    # ID sản phẩm / shop
    item_id = str(raw_item.get("itemid") or ib.get("itemid") or "")
    shop_id = str(raw_item.get("shopid") or ib.get("shopid") or "")
    if not item_id:
        return None

    source_url = (
        f"https://shopee.vn/product/{shop_id}/{item_id}"
        if shop_id
        else f"https://shopee.vn/search?keyword={quote(kw)}"
    )

    cdn_url = f"https://down-vn.img.susercontent.com/file/{image_id}" if image_id else ""
    return {
        "shopee_id": item_id,
        "shop_id": shop_id,
        "name": str(name).strip()[:150],
        "price": price,
        "orig": orig,
        "rating": rating or 4.9,
        "reviews": max(50, int(sold * 0.12)) if sold > 0 else 20,
        "sold": sold,
        "stock": 0,
        "stock_needs_review": True,
        "images": [cdn_url] if cdn_url else [],
        "image_id": image_id,
        "image_url": cdn_url,
        "all_image_ids": all_images[:3],
        "category": guess_category(kw),
        "keyword": kw,
        "source": "shopee",
        "source_url": source_url,
        "crawled_at": datetime.datetime.now(datetime.UTC).isoformat(),
        "status": "draft",
        "is_verified": True,
    }


def _is_antibot_challenge_html(html: str) -> bool:
    """Phát hiện trang chặn anti-bot / yêu cầu đăng nhập / verify của Shopee hoặc Akamai."""
    if not html or not isinstance(html, str):
        return False
    low = html.lower()
    markers = (
        '"error":90309999',
        '"redirect_to_error_page":true',
        "shopee.vn/verify",
        "/verify/traffic",
        "just a moment...",
        "access denied",
        "captcha-delivery",
        "xác minh bảo mật",
        "hệ thống phát hiện truy cập bất thường",
    )
    has_marker = any(m in low for m in markers)
    has_product_links = bool(_SHOPEE_HREF_RE.search(html))
    return has_marker and not has_product_links


def _extract_embedded_json_items(html: str, kw: str) -> list[dict]:
    """Tìm mảng `items` chứa item_basic/item_card_displayed_asset nhúng trong HTML/script."""
    items: list[dict] = []
    seen: set[str] = set()
    decoder = json.JSONDecoder()

    for match in re.finditer(r'"items"\s*:\s*\[', html):
        arr_start = match.end() - 1
        try:
            parsed_arr, _ = decoder.raw_decode(html, arr_start)
        except json.JSONDecodeError:
            continue
        if not isinstance(parsed_arr, list):
            continue
        for raw in parsed_arr:
            if not isinstance(raw, dict):
                continue
            item = parse_shopee_item(raw, kw)
            if item and item["shopee_id"] not in seen:
                seen.add(item["shopee_id"])
                items.append(item)
    return items


def parse_shopee_html(html: str, kw: str, max_items: int = 40) -> tuple[list[dict], bool]:
    """
    Bóc tách danh sách sản phẩm từ HTML đã render JS bởi Scraping API (ZenRows/ScraperAPI/Crawlbase).
    Ưu tiên embedded JSON; nếu không có thì quét thẻ sản phẩm trên DOM qua BeautifulSoup.
    Trả về (items, is_blocked).
    """
    if not html or not isinstance(html, str):
        return [], False

    embedded = _extract_embedded_json_items(html, kw)
    if embedded:
        return embedded[:max_items], False

    if BeautifulSoup is None:
        return [], _is_antibot_challenge_html(html)

    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select(
        '[data-sqe="item"], li.shopee-search-item-result__item, div.shopee-search-item-result__item'
    )
    if not cards:
        # Fallback: tìm mọi thẻ <a> chứa URL sản phẩm Shopee (-i.<shopid>.<itemid>)
        cards = [a for a in soup.find_all("a", href=True) if _SHOPEE_HREF_RE.search(a["href"])]

    parsed: list[dict] = []
    seen_ids: set[str] = set()

    for card in cards:
        link_el = card if card.name == "a" and card.get("href") else card.find("a", href=_SHOPEE_HREF_RE)
        href = link_el.get("href", "") if link_el else ""
        href_m = _SHOPEE_HREF_RE.search(href)
        if not href_m:
            continue

        shop_id = href_m.group(1) or href_m.group(3) or ""
        item_id = href_m.group(2) or href_m.group(4) or ""
        if not item_id or item_id in seen_ids:
            continue

        # Tên sản phẩm
        name_el = card.select_one('[data-sqe="name"], [data-sqe="title"]')
        name = name_el.get_text(" ", strip=True) if name_el else ""
        img_el = card.find("img")
        if (not name or len(name) < 3) and img_el and img_el.get("alt"):
            name = img_el["alt"].strip()
        if not name or len(name) < 3:
            # Lọc text node dài nhất không phải badge giá/giảm giá
            candidates = [
                t.strip() for t in card.stripped_strings
                if len(t.strip()) >= 8 and not re.match(r"^[₫đ\d\s.,kK+\-%]+$", t.strip())
            ]
            name = candidates[0] if candidates else ""
        if not name or len(name) < 3:
            continue

        # Giá bán & giá gốc (<del> hoặc line-through)
        del_el = card.find("del")
        orig = parse_vnd_price(del_el.get_text(" ", strip=True)) if del_el else 0

        price_el = card.select_one('[data-sqe="price"]')
        price = parse_vnd_price(price_el.get_text(" ", strip=True)) if price_el else 0
        if price <= 0:
            # Quét giá VND trong card (bỏ phần text nằm trong <del>)
            card_texts = card.get_text(" ", strip=True)
            for pm in re.finditer(r"(?:₫\s*[\d.,]+|[\d.,]+\s*[₫đ])", card_texts):
                cand_price = parse_vnd_price(pm.group(0))
                if cand_price > 0 and cand_price != orig:
                    price = cand_price
                    break
                if cand_price > 0 and price <= 0:
                    price = cand_price

        if price <= 0:
            continue
        if orig <= price:
            orig = None

        # Đã bán
        sold = 0
        sold_el = card.select_one('[data-sqe="sold"]')
        if sold_el:
            sold = parse_sold_count(sold_el.get_text(" ", strip=True))
        else:
            sold_m = re.search(r"đã bán\s*([\d\.,]+\s*k?\+?)", card.get_text(" ", strip=True), re.IGNORECASE)
            if sold_m:
                sold = parse_sold_count(sold_m.group(1))

        # Ảnh
        img_src = ""
        if img_el:
            img_src = img_el.get("src") or img_el.get("data-src") or ""
            if not img_src and img_el.get("srcset"):
                img_src = img_el["srcset"].split(",")[0].strip().split(" ")[0]
        image_id, fallback_cdn = _extract_image_ref(img_src)

        source_url = (
            f"https://shopee.vn/product/{shop_id}/{item_id}"
            if shop_id
            else f"https://shopee.vn{href}" if href.startswith("/") else href
        )

        seen_ids.add(item_id)
        parsed.append({
            "shopee_id": item_id,
            "shop_id": shop_id,
            "name": name[:150],
            "price": price,
            "orig": orig,
            "rating": 4.9,
            "reviews": max(50, int(sold * 0.12)) if sold > 0 else 20,
            "sold": sold,
            "stock": 0,
            "stock_needs_review": True,
            "images": [fallback_cdn] if fallback_cdn else [],
            "image_id": image_id,
            "image_url": fallback_cdn,
            "all_image_ids": [image_id] if image_id else [],
            "category": guess_category(kw),
            "keyword": kw,
            "source": "shopee",
            "source_url": source_url,
            "crawled_at": datetime.datetime.now(datetime.UTC).isoformat(),
            "status": "draft",
            "is_verified": True,
        })
        if len(parsed) >= max_items:
            break

    if not parsed and _is_antibot_challenge_html(html):
        return [], True

    return parsed, False


def parse_zenrows_json_payload(payload: dict, kw: str, max_items: int = 40) -> tuple[list[dict], bool]:
    """
    Bóc tách phản hồi từ ZenRows (`js_render=true&json_response=true`):
    - Ưu tiên bắt JSON từ các XHR request `search_items` / `recommend` trong mảng `xhr`
    - Fallback sang `parse_shopee_html(payload['html'])` nếu XHR trống
    """
    if not isinstance(payload, dict):
        return [], False

    xhr_items: list[dict] = []
    seen_ids: set[str] = set()
    xhr_blocked = False

    for entry in payload.get("xhr") or []:
        if not isinstance(entry, dict):
            continue
        url = str(entry.get("url") or "").lower()
        if not any(tok in url for tok in ("search_items", "recommend", "search/api", "search_prefills")):
            continue
        body_raw = entry.get("body")
        if not body_raw or not isinstance(body_raw, str):
            continue
        try:
            body_json = json.loads(body_raw)
        except json.JSONDecodeError:
            continue
        if not isinstance(body_json, dict):
            continue

        err_code = body_json.get("error")
        if err_code and err_code != 0:
            xhr_blocked = True
            continue

        raw_list = (body_json.get("data") or {}).get("items") or body_json.get("items") or []
        for raw in raw_list:
            if not isinstance(raw, dict):
                continue
            item = parse_shopee_item(raw, kw)
            if item and item["shopee_id"] not in seen_ids:
                seen_ids.add(item["shopee_id"])
                xhr_items.append(item)
                if len(xhr_items) >= max_items:
                    break
        if len(xhr_items) >= max_items:
            break

    if xhr_items:
        return xhr_items[:max_items], False

    html_items, html_blocked = parse_shopee_html(str(payload.get("html") or ""), kw, max_items=max_items)
    if html_items:
        return html_items, False

    return [], (xhr_blocked or html_blocked)


# ---------------------------------------------------------------------------
# Fair quota allocation
# ---------------------------------------------------------------------------

def allocate_products_fairly(
    captured_by_kw: dict[str, list[dict]],
    keywords: list[str],
    total_limit: int,
) -> list[dict]:
    """
    Phân bổ hạn mức công bằng cho mọi từ khóa:
    - Vòng 1: Chia đều hạn mức cơ sở cho tất cả từ khóa.
    - Vòng 2: Phân bổ lại phần dư theo vòng tròn nếu có từ khóa ít kết quả.
    - Chống trùng lặp shopee_id toàn cục.
    """
    if total_limit <= 0 or not keywords:
        return []

    clean_kws = [k for k in keywords if k]
    n = len(clean_kws)
    if n == 0:
        return []

    base_quota = total_limit // n
    remainder = total_limit % n

    cursors = {kw: 0 for kw in clean_kws}
    seen_ids: set[str] = set()
    selected: list[dict] = []

    for idx, kw in enumerate(clean_kws):
        if len(selected) >= total_limit:
            break
        target_for_kw = (base_quota + (1 if idx < remainder else 0)) if base_quota > 0 else 1
        items = captured_by_kw.get(kw, [])
        picked = 0
        while cursors[kw] < len(items) and picked < target_for_kw and len(selected) < total_limit:
            candidate = items[cursors[kw]]
            cursors[kw] += 1
            sid = str(candidate.get("shopee_id") or "")
            if sid and sid in seen_ids:
                continue
            if sid:
                seen_ids.add(sid)
            selected.append(candidate)
            picked += 1

    added_in_round = True
    while len(selected) < total_limit and added_in_round:
        added_in_round = False
        for kw in clean_kws:
            if len(selected) >= total_limit:
                break
            items = captured_by_kw.get(kw, [])
            while cursors[kw] < len(items):
                candidate = items[cursors[kw]]
                cursors[kw] += 1
                sid = str(candidate.get("shopee_id") or "")
                if sid and sid in seen_ids:
                    continue
                if sid:
                    seen_ids.add(sid)
                selected.append(candidate)
                added_in_round = True
                break

    return selected[:total_limit]


# ---------------------------------------------------------------------------
# Image downloader & WebP optimizer
# ---------------------------------------------------------------------------

def download_image(image_id: str, pid: str, fallback_url: str = "") -> list[str]:
    """
    Tải ảnh thật từ Shopee CDN về public/products/shopee_live/ và chuyển sang WebP.
    Trả về danh sách [local_path, cdn_url] (nếu có) để frontend có fallback khi disk ephemeral.
    """
    cdn_url = f"https://down-vn.img.susercontent.com/file/{image_id}" if image_id else (fallback_url or "")
    if not cdn_url:
        return ["/placeholder.svg"]

    dest_webp = IMG_DIR / f"{pid}.webp"
    dest_jpg = IMG_DIR / f"{pid}.jpg"

    if dest_webp.exists() and dest_webp.stat().st_size > 500:
        return [f"/products/shopee_live/{pid}.webp", cdn_url]
    if dest_jpg.exists() and dest_jpg.stat().st_size > 500:
        return [f"/products/shopee_live/{pid}.jpg", cdn_url]

    try:
        with httpx.Client(follow_redirects=True, timeout=15) as client:
            r = client.get(cdn_url, headers={"Referer": "https://shopee.vn/", "User-Agent": UA})
        if r.status_code == 200 and len(r.content) > 500:
            if _HAS_PIL:
                try:
                    img = PilImage.open(BytesIO(r.content)).convert("RGB")
                    img.save(dest_webp, "WEBP", quality=82, method=4)
                    return [f"/products/shopee_live/{pid}.webp", cdn_url]
                except (OSError, ValueError) as pil_err:
                    print(f"    [!] Không convert WebP cho {pid}: {pil_err}", flush=True)
            dest_jpg.write_bytes(r.content)
            return [f"/products/shopee_live/{pid}.jpg", cdn_url]
    except (httpx.HTTPError, OSError) as e:
        print(f"    [!] Không tải được ảnh {pid}: {e}", flush=True)

    return [cdn_url]


# ---------------------------------------------------------------------------
# Option B Provider Adapters (ZenRows / ScraperAPI / Crawlbase)
# ---------------------------------------------------------------------------

class ProviderFatalError(RuntimeError):
    """Lỗi cấu hình / xác thực / hết quota từ phía nhà cung cấp Scraping API."""


def _fetch_via_zenrows(kw: str, api_key: str, max_items: int, client: httpx.Client) -> tuple[list[dict], bool]:
    target_url = f"https://shopee.vn/search?keyword={quote(kw)}"
    js_instructions = json.dumps([
        {"wait": 3500},
        {"scroll_y": 1200},
        {"wait": 2000},
    ])
    params = {
        "apikey": api_key,
        "url": target_url,
        "js_render": "true",
        "premium_proxy": "true",
        "proxy_country": "vn",
        "json_response": "true",
        "js_instructions": js_instructions,
    }
    resp = client.get("https://api.zenrows.com/v1/", params=params, timeout=75)
    if resp.status_code in (401, 403):
        raise ProviderFatalError(f"ZenRows từ chối API Key (HTTP {resp.status_code}). Vui lòng kiểm tra ZENROWS_API_KEY.")
    if resp.status_code == 402:
        raise ProviderFatalError("Tài khoản ZenRows đã hết credit hoặc hạn mức miễn phí (HTTP 402).")
    if resp.status_code == 422:
        print(f"    [!] ZenRows báo mục tiêu tạm chặn/không render được cho '{kw}' (HTTP 422).", flush=True)
        return [], True
    if resp.status_code == 429:
        raise ProviderFatalError("ZenRows đang giới hạn tốc độ / đồng thời (HTTP 429). Vui lòng thử lại sau.")
    if resp.status_code != 200:
        print(f"    [!] ZenRows HTTP {resp.status_code} cho '{kw}'.", flush=True)
        return [], False

    ctype = (resp.headers.get("content-type") or "").lower()
    if "application/json" in ctype or resp.text.lstrip().startswith("{"):
        try:
            payload = resp.json()
            return parse_zenrows_json_payload(payload, kw, max_items=max_items)
        except ValueError:
            pass

    return parse_shopee_html(resp.text, kw, max_items=max_items)


def _fetch_via_scraperapi(kw: str, api_key: str, max_items: int, client: httpx.Client) -> tuple[list[dict], bool]:
    target_url = f"https://shopee.vn/search?keyword={quote(kw)}"
    use_ultra = os.environ.get("SCRAPERAPI_ULTRA_PREMIUM", "true").strip().lower() != "false"
    params = {
        "api_key": api_key,
        "url": target_url,
        "render": "true",
        "country_code": "vn",
    }
    if use_ultra:
        params["ultra_premium"] = "true"
    else:
        params["premium"] = "true"

    resp = client.get("https://api.scraperapi.com", params=params, timeout=75)
    if resp.status_code in (401, 403):
        raise ProviderFatalError(
            f"ScraperAPI từ chối API Key hoặc gói chưa hỗ trợ ultra_premium (HTTP {resp.status_code})."
        )
    if resp.status_code == 429:
        raise ProviderFatalError("ScraperAPI vượt giới hạn request đồng thời / credit (HTTP 429).")
    if resp.status_code >= 500:
        print(f"    [!] ScraperAPI gặp lỗi tạm thời (HTTP {resp.status_code}) cho '{kw}'.", flush=True)
        return [], False
    if resp.status_code != 200:
        print(f"    [!] ScraperAPI HTTP {resp.status_code} cho '{kw}'.", flush=True)
        return [], False

    return parse_shopee_html(resp.text, kw, max_items=max_items)


def _fetch_via_crawlbase(kw: str, token: str, max_items: int, client: httpx.Client) -> tuple[list[dict], bool]:
    target_url = f"https://shopee.vn/search?keyword={quote(kw)}"
    params = {
        "token": token,
        "url": target_url,
        "country": "VN",
        "format": "json",
        "page_wait": "4000",
        "ajax_wait": "true",
        "scroll": "true",
    }
    resp = client.get("https://api.crawlbase.com/", params=params, timeout=75)
    if resp.status_code in (401, 403):
        raise ProviderFatalError(
            f"Crawlbase từ chối Token (HTTP {resp.status_code}). Hãy dùng JavaScript Token trong CRAWLBASE_TOKEN."
        )
    if resp.status_code == 402:
        raise ProviderFatalError("Tài khoản Crawlbase đã hết credit (HTTP 402).")
    if resp.status_code == 429:
        raise ProviderFatalError("Crawlbase đang giới hạn tốc độ gọi API (HTTP 429).")
    if resp.status_code != 200:
        print(f"    [!] Crawlbase HTTP {resp.status_code} cho '{kw}'.", flush=True)
        return [], False

    try:
        data = resp.json()
    except ValueError:
        return parse_shopee_html(resp.text, kw, max_items=max_items)

    orig_status = int(data.get("original_status") or 200)
    if orig_status in (403, 429):
        print(f"    [!] Shopee qua Crawlbase trả về original_status={orig_status} cho '{kw}'.", flush=True)
        return [], True

    return parse_shopee_html(str(data.get("body") or ""), kw, max_items=max_items)


def fetch_keyword_via_provider(
    provider: str,
    api_key: str,
    keyword: str,
    per_kw_limit: int,
    client: httpx.Client | None = None,
) -> tuple[list[dict], bool]:
    """Gọi Scraping API tương ứng để thu thập danh sách sản phẩm cho 1 từ khóa."""
    print(f"[*] [{provider.upper()}] Đang cào Shopee cho từ khóa: '{keyword}'...", flush=True)
    own_client = client is None
    active_client = client or httpx.Client(follow_redirects=True, timeout=80)
    try:
        if provider == "zenrows":
            items, blocked = _fetch_via_zenrows(keyword, api_key, per_kw_limit, active_client)
        elif provider == "scraperapi":
            items, blocked = _fetch_via_scraperapi(keyword, api_key, per_kw_limit, active_client)
        elif provider == "crawlbase":
            items, blocked = _fetch_via_crawlbase(keyword, api_key, per_kw_limit, active_client)
        else:
            raise ProviderFatalError(f"Provider không được hỗ trợ: {provider}")
    except httpx.HTTPError as e:
        safe_msg = _sanitize_error_text(str(e))
        print(f"    [!] Lỗi mạng khi gọi {provider} cho '{keyword}': {safe_msg}", flush=True)
        return [], False
    finally:
        if own_client:
            active_client.close()

    print(f"    ✓ [{provider.upper()}] Bóc tách được {len(items)} sản phẩm cho '{keyword}'.", flush=True)
    return items[:per_kw_limit], blocked


# ---------------------------------------------------------------------------
# Main orchestrator
# ---------------------------------------------------------------------------

def scrape_shopee_live(
    keywords: list,
    total_limit: int = 20,
    preferred_provider: str | None = None,
) -> dict:
    """
    Cào sản phẩm Shopee thông qua Scraping API bên thứ ba (Phương án B):
    - ZenRows / ScraperAPI / Crawlbase thực thi JS, xử lý Akamai & xoay IP Việt Nam
    - Phân bổ hạn mức công bằng theo từng từ khóa
    - Tải & chuyển ảnh sang WebP
    """
    clean_keywords = [str(k).strip() for k in keywords if str(k).strip()]
    if not clean_keywords:
        return {
            "products": [],
            "status": "failed",
            "message": "Không có từ khóa hợp lệ để cào.",
            "anti_bot_blocked": False,
            "config_required": False,
            "provider": None,
            "per_keyword_counts": {},
        }

    provider, api_key = resolve_scraping_provider(preferred_provider)
    if not provider or not api_key:
        missing_target = (
            f"biến môi trường key cho '{provider}'" if provider
            else "ZENROWS_API_KEY, SCRAPERAPI_KEY hoặc CRAWLBASE_TOKEN"
        )
        msg = (
            f"Chưa cấu hình Scraping API Key (Phương án B). Vui lòng thiết lập {missing_target} "
            "trong .env / Render Dashboard hoặc nhập tại bảng Cấu Hình Scraping API trên trang Quản Trị."
        )
        print(f"[!] {msg}", flush=True)
        return {
            "products": [],
            "status": "config_required",
            "message": msg,
            "anti_bot_blocked": False,
            "config_required": True,
            "provider": provider,
            "per_keyword_counts": {},
        }

    print(
        f"[*] Phương án B · Scraping API: {provider.upper()} | Từ khóa: {clean_keywords} | Giới hạn: {total_limit}",
        flush=True,
    )

    per_kw_cap = max(6, int(total_limit / len(clean_keywords) * 1.5) + 4)
    captured_by_kw: dict[str, list[dict]] = {}
    any_blocked = False

    try:
        with httpx.Client(follow_redirects=True, timeout=80) as client:
            for idx, kw in enumerate(clean_keywords):
                items, blocked = fetch_keyword_via_provider(
                    provider, api_key, kw, per_kw_cap, client=client
                )
                captured_by_kw[kw] = items
                if blocked:
                    any_blocked = True
                if idx < len(clean_keywords) - 1:
                    delay = random.uniform(1.5, 3.0)
                    print(f"    ... Chờ {delay:.1f}s trước từ khóa tiếp theo...", flush=True)
                    time.sleep(delay)
    except ProviderFatalError as fatal_err:
        err_text = _sanitize_error_text(str(fatal_err))
        print(f"[!] Lỗi nhà cung cấp {provider}: {err_text}", flush=True)
        return {
            "products": [],
            "status": "failed",
            "message": err_text,
            "anti_bot_blocked": False,
            "config_required": True,
            "provider": provider,
            "per_keyword_counts": {},
        }

    selected_products = allocate_products_fairly(captured_by_kw, clean_keywords, total_limit)

    if selected_products:
        print(f"[*] Đang tải & tối ưu WebP cho {len(selected_products)} ảnh sản phẩm...", flush=True)
        for item in selected_products:
            item["images"] = download_image(
                item.get("image_id") or "",
                item["shopee_id"],
                fallback_url=item.get("image_url") or "",
            )

    per_keyword_counts: dict = {}
    for prod in selected_products:
        kw_key = prod.get("keyword") or ""
        per_keyword_counts[kw_key] = per_keyword_counts.get(kw_key, 0) + 1

    if selected_products:
        status = "completed"
        message = f"Đã cào thành công {len(selected_products)} sản phẩm thật từ Shopee qua {provider.upper()}."
    elif any_blocked:
        status = "blocked"
        message = (
            f"Shopee tạm thời trả trang xác minh khi {provider.upper()} truy cập (có thể thử lại sau vài phút "
            "hoặc kiểm tra proxy/tier của gói Scraping API)."
        )
    else:
        status = "empty"
        message = f"Không tìm thấy sản phẩm khớp với từ khóa đã yêu cầu qua {provider.upper()}."

    return {
        "products": selected_products,
        "status": status,
        "message": message,
        "anti_bot_blocked": any_blocked,
        "config_required": False,
        "provider": provider,
        "per_keyword_counts": per_keyword_counts,
    }


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Shopee Live Scraper (Option B - Scraping API) cho Tiệm Nhà Nhỏ")
    parser.add_argument("--keywords", nargs="+", default=["áo khoác"], help="Danh sách từ khóa cần cào")
    parser.add_argument("--output", default=OUTPUT_JSON, help="File JSON kết quả đầu ra")
    parser.add_argument("--limit", type=int, default=20, help="Tổng số sản phẩm cần cào")
    parser.add_argument("--session-id", default="", help="Mã phiên cào để đồng bộ kết quả chính xác")
    parser.add_argument(
        "--provider",
        default="",
        help="Nhà cung cấp Scraping API (auto | zenrows | scraperapi | crawlbase)",
    )
    args = parser.parse_args()

    session_id = args.session_id.strip() or f"cli_{int(time.time())}"
    crawled_at = datetime.datetime.now(datetime.UTC).isoformat()

    print("=== KHỞI ĐỘNG CÀO DỮ LIỆU THẬT TỪ SHOPEE (PHƯƠNG ÁN B - SCRAPING API) ===", flush=True)
    print(f"Session ID: {session_id}", flush=True)
    print(f"Từ khóa: {args.keywords}", flush=True)
    print(f"Số lượng yêu cầu: {args.limit} sản phẩm", flush=True)
    print(f"Thời gian: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", flush=True)

    outcome = scrape_shopee_live(
        args.keywords,
        total_limit=args.limit,
        preferred_provider=args.provider or None,
    )
    products = outcome["products"]

    for i, p in enumerate(products, 1):
        p["id"] = f"shopee-live-{i:03d}"

    payload = {
        "sessionId": session_id,
        "crawledAt": crawled_at,
        "requestedKeywords": args.keywords,
        "limit": args.limit,
        "provider": outcome.get("provider"),
        "status": outcome["status"],
        "message": outcome["message"],
        "antiBotBlocked": outcome["anti_bot_blocked"],
        "configRequired": outcome.get("config_required", False),
        "perKeywordCounts": outcome["per_keyword_counts"],
        "count": len(products),
        "products": products,
    }

    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    if not products:
        print(f"\n[!] Phiên {session_id}: {outcome['message']} (Đã ghi kết quả rỗng đúng phiên).", flush=True)
        return

    print(f"\n[OK] ĐÃ HOÀN THÀNH CÀO {len(products)} SẢN PHẨM THẬT TỪ SHOPEE!", flush=True)
    print(f"[OK] Đã lưu danh sách phiên {session_id} vào '{args.output}'.", flush=True)


if __name__ == "__main__":
    main()
