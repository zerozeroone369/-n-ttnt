"""
Shopee Scraper v4 - Anti-bot bypass
- Dùng headful mode (có giao diện) thay vì headless
- Giả lập hành vi người dùng thật (mouse move, scroll tự nhiên)
- Bắt response trực tiếp từ search_items API
"""
import asyncio
import json
import random
import re
from pathlib import Path
from urllib.parse import quote
from playwright.async_api import async_playwright
import httpx

OUTPUT_JSON = "shopee_scraped.json"
IMG_DIR     = Path("public/products")
IMG_DIR.mkdir(parents=True, exist_ok=True)

import sys

KEYWORDS = [
    "áo thun nam nữ",
    "nến thơm decor phòng ngủ",
    "cà phê arabica",
    "tai nghe bluetooth chống ồn",
    "kem dưỡng da mặt",
    "túi xách nữ da",
    "đèn led decor",
    "bàn phím cơ gaming",
    "đồng hồ thời trang",
    "giày sneaker unisex",
]

for i, arg in enumerate(sys.argv):
    if arg == "--keywords" and i + 1 < len(sys.argv):
        custom_kw = [k.strip() for k in sys.argv[i + 1].split(",") if k.strip()]
        if custom_kw:
            KEYWORDS = custom_kw
            print(f"[*] Sử dụng danh sách từ khóa tùy chỉnh: {KEYWORDS}")

ITEMS_PER_KW = 10
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"


def guess_category(keyword: str) -> str:
    kw = keyword.lower()
    if any(x in kw for x in ["áo","quần","váy","giày","túi","ví","đồng hồ","sneaker"]):
        return "fashion"
    if any(x in kw for x in ["nến","decor","đèn","gốm","kem dưỡng"]):
        return "decor"
    if any(x in kw for x in ["cà phê","trà","mật ong","hạt"]):
        return "coffee"
    if any(x in kw for x in ["tai nghe","bàn phím","chuột","sạc"]):
        return "tech"
    return "decor"


FALLBACK_IMAGES = {
    "fashion": [
        "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&auto=format&fit=crop&q=80",
    ],
    "decor": [
        "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=80",
    ],
    "coffee": [
        "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80",
    ],
    "tech": [
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80",
    ],
}


async def human_scroll(page):
    """Giả lập scroll tự nhiên của người dùng"""
    for dist in [300, 600, 900, 1200, 1500]:
        await page.evaluate(f"window.scrollTo({{top: {dist}, behavior: 'smooth'}})")
        await asyncio.sleep(random.uniform(0.5, 1.2))


async def download_image(client: httpx.AsyncClient, image_id: str, pid: str) -> str:
    if not image_id:
        return ""
    dest = IMG_DIR / f"{pid}.jpg"
    if dest.exists():
        return f"/products/{pid}.jpg"
    for suffix in ["_tn", ""]:
        url = f"https://down-vn.img.susercontent.com/file/{image_id}{suffix}"
        try:
            r = await client.get(url, timeout=12, headers={
                "Referer": "https://shopee.vn/",
                "User-Agent": UA,
            })
            if r.status_code == 200 and len(r.content) > 500:
                dest.write_bytes(r.content)
                return f"/products/{pid}.jpg"
        except:
            pass
    return ""


def parse_items(data: dict, keyword: str, img_client, loop) -> list:
    """Parse sản phẩm từ response JSON"""
    products = []
    # Tìm items trong nhiều cấu trúc khác nhau
    items = (
        (data.get("data") or {}).get("items") or
        data.get("items") or
        []
    )
    if not items:
        # Thử tìm sâu hơn
        for val in data.values():
            if isinstance(val, dict):
                sub = val.get("items") or []
                if sub:
                    items = sub
                    break

    cat = guess_category(keyword)
    fallbacks = FALLBACK_IMAGES.get(cat, FALLBACK_IMAGES["decor"])

    for item in items:
        info = item.get("item_basic") or item.get("item") or item
        if not isinstance(info, dict):
            continue
        name = (info.get("name") or "").strip()
        if not name or len(name) < 3:
            continue

        pid      = str(info.get("itemid") or info.get("id") or random.randint(10000, 99999))
        image_id = info.get("image") or info.get("image_id") or ""

        price_raw = info.get("price") or info.get("price_min") or 0
        price = int(price_raw / 100000) if price_raw > 99999 else int(price_raw)
        if price < 5000:
            price = price * 1000
        price = max(9000, price)

        orig_raw = info.get("price_max_before_discount") or info.get("price_before_discount") or 0
        orig = int(orig_raw / 100000) if orig_raw > 99999 else int(orig_raw)
        if orig <= price or orig == 0:
            orig = int(price * random.uniform(1.15, 1.45))

        rating_obj = info.get("item_rating") or {}
        rating = float(rating_obj.get("rating_star") or info.get("rating_star") or 4.5)
        rating = round(max(3.5, min(5.0, rating)), 1)

        sold   = info.get("historical_sold") or info.get("sold") or random.randint(100, 8000)
        stock  = random.randint(8, 200)
        images = [random.choice(fallbacks), random.choice(fallbacks)]

        products.append({
            "shopee_id": pid,
            "name":      name[:120],
            "price":     price,
            "orig":      orig,
            "rating":    rating,
            "reviews":   min(int(sold), 9999),
            "stock":     stock,
            "images":    images,
            "image_id":  image_id,
            "category":  cat,
            "keyword":   keyword,
        })

    return products


async def main():
    all_products = []

    async with async_playwright() as p:
        # Sử dụng Persistent Context và Stealth Plugin
        import os
        from playwright_stealth import Stealth
        user_data_dir = os.path.join(os.getcwd(), "shopee_profile")
        
        context = await p.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            channel="msedge", # Dùng trình duyệt Edge thật trên máy tính để tránh bị lộ là Bot
            headless=False,
            user_agent=UA,
            locale="vi-VN",
            viewport={"width": 1366, "height": 768},
            extra_http_headers={"Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8"},
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
            ]
        )

        page = context.pages[0] if context.pages else await context.new_page()
        await Stealth().apply_stealth_async(page) # Xóa mọi dấu vết của bot


        print("[1] Truy cập Shopee trang chủ...")
        await page.goto("https://shopee.vn", wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(random.uniform(3, 5))

        # Di chuyển chuột ngẫu nhiên để giống người thật
        for _ in range(5):
            await page.mouse.move(
                random.randint(100, 1200),
                random.randint(100, 600)
            )
            await asyncio.sleep(random.uniform(0.2, 0.5))

        async with httpx.AsyncClient(follow_redirects=True) as img_client:
            for kw in KEYWORDS:
                if len(all_products) >= 100:
                    break

                need = min(ITEMS_PER_KW, 100 - len(all_products))
                print(f"\n[2] Keyword: '{kw}'")

                captured_data = []

                async def on_resp(resp):
                    if "search_items" in resp.url and resp.status == 200:
                        try:
                            body = await resp.text()
                            if len(body) > 200:
                                data = json.loads(body)
                                captured_data.append(data)
                                print(f"    ✓ Bắt response: {len(body)} bytes")
                        except Exception as e:
                            print(f"    Parse error: {e}")

                page.on("response", on_resp)

                kw_enc = quote(kw)
                await page.goto(
                    f"https://shopee.vn/search?keyword={kw_enc}&page=0",
                    wait_until="networkidle",
                    timeout=60000
                )

                # Kiểm tra bị redirect verify/login không
                curr_url = page.url
                if "verify" in curr_url or "login" in curr_url:
                    print(f"\n    ⚠ Shopee yêu cầu xác minh hoặc đăng nhập!")
                    
                    try:
                        print("    🔄 Đang thử tự động điền tài khoản...")
                        if "login" not in page.url:
                            await page.goto("https://shopee.vn/buyer/login", timeout=30000)
                            await asyncio.sleep(3)
                            
                        # Điền thông tin
                        await page.fill('input[name="loginKey"]', "nguyenngotuanhtk123@gmail.com")
                        await asyncio.sleep(1)
                        await page.fill('input[name="password"]', "Anh040825@")
                        await asyncio.sleep(1)
                        await page.keyboard.press("Enter")
                        
                        print("    ✅ Đã tự động điền và bấm Đăng nhập!")
                        print("    👉 NẾU CÓ CAPTCHA (Kéo mảnh ghép/OTP), VUI LÒNG TỰ XỬ LÝ TRÊN CỬA SỔ CHROMIUM.")
                    except Exception as e:
                        print("    👉 VUI LÒNG MỞ CỬA SỔ TRÌNH DUYỆT (CHROMIUM) ĐANG CHẠY VÀ TỰ ĐĂNG NHẬP HOẶC GIẢI CAPTCHA.")
                    
                    print("    ⏳ Script đang tạm dừng chờ bạn vượt Captcha/Xác minh...")
                    
                    # Chờ người dùng tự xử lý trên GUI cho đến khi thoát khỏi login/verify
                    while "verify" in page.url or "login" in page.url:
                        await asyncio.sleep(2)
                        
                    print("    ✅ Đã vượt qua bước xác minh! Đang tiếp tục cào dữ liệu...")
                    await asyncio.sleep(3)
                    
                    # Tải lại trang tìm kiếm sau khi đã có cookie xịn
                    await page.goto(
                        f"https://shopee.vn/search?keyword={kw_enc}&page=0",
                        wait_until="networkidle",
                        timeout=60000
                    )

                await asyncio.sleep(3)
                await human_scroll(page)
                await asyncio.sleep(2)

                page.remove_listener("response", on_resp)

                items_found = []
                for data in captured_data:
                    items = parse_items(data, kw, img_client, None)
                    items_found.extend(items[:need])

                # Tải ảnh về local
                for item in items_found:
                    if item.get("image_id"):
                        img_path = await download_image(img_client, item["image_id"], item["shopee_id"])
                        if img_path:
                            item["images"] = [img_path, item["images"][0]]

                print(f"    → Lấy được {len(items_found)} sản phẩm")
                all_products.extend(items_found[:need])
                print(f"    Tổng: {len(all_products)}/100")

                await asyncio.sleep(random.uniform(2, 4))

        await context.close()

    # Gán ID cuối cùng
    final = []
    for i, prod in enumerate(all_products[:100], 1):
        prod["id"] = f"sp-{i:03d}"
        final.append(prod)

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(final, f, ensure_ascii=False, indent=2)

    imgs = list(IMG_DIR.glob("*.jpg"))
    print(f"\n✅ HOÀN THÀNH!")
    print(f"   Sản phẩm: {len(final)}/100")
    print(f"   Ảnh local: {len(imgs)} files")
    print(f"   File: {OUTPUT_JSON}")

if __name__ == "__main__":
    asyncio.run(main())
