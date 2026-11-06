"""
Debug script - Dùng Playwright intercept để bắt đúng API Shopee đang dùng
khi người dùng tìm kiếm sản phẩm thật sự.
"""
import asyncio
import json
from playwright.async_api import async_playwright

CAPTURED = []

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)  # Mở trình duyệt có giao diện
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="vi-VN",
        )
        page = await context.new_page()

        # Intercept tất cả network requests
        captured_apis = []

        async def handle_response(response):
            url = response.url
            # Bắt các request API của Shopee
            if "shopee.vn/api" in url and response.status == 200:
                try:
                    body = await response.text()
                    if '"items"' in body or '"item_basic"' in body or '"data"' in body:
                        print(f"\n✅ BẮT ĐƯỢC API: {url[:120]}")
                        data = json.loads(body)
                        # In ra cấu trúc keys
                        print(f"   Keys: {list(data.keys())[:10]}")
                        if "items" in data:
                            items = data["items"]
                            print(f"   items count: {len(items)}")
                            if items:
                                first = items[0]
                                print(f"   First item keys: {list(first.keys())[:10]}")
                        captured_apis.append({"url": url, "keys": list(data.keys())})
                except:
                    pass

        page.on("response", handle_response)

        print("Đang mở Shopee...")
        await page.goto("https://shopee.vn", wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)

        print("Đang tìm kiếm 'áo thun'...")
        await page.goto(
            "https://shopee.vn/search?keyword=%C3%A1o+th%C3%BAn&page=0",
            wait_until="networkidle",
            timeout=60000
        )
        await asyncio.sleep(5)

        # Lấy cookies
        cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in cookies}
        
        print(f"\n📦 Cookie count: {len(cookie_dict)}")
        print(f"📡 APIs bắt được: {len(captured_apis)}")
        for api in captured_apis[:5]:
            print(f"  - {api['url'][:100]}")
            print(f"    Keys: {api['keys']}")

        # Lưu kết quả debug
        with open("debug_result.json", "w", encoding="utf-8") as f:
            json.dump({
                "cookies": cookie_dict,
                "apis": captured_apis
            }, f, ensure_ascii=False, indent=2)

        print("\n💾 Đã lưu debug_result.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
