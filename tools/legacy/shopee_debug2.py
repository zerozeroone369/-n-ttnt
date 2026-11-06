"""
Debug v2 - Bắt TẤT CẢ API Shopee và tìm endpoint chứa sản phẩm
"""
import asyncio
import json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="vi-VN",
        )
        page = await context.new_page()

        found_product_apis = []
        all_api_urls = []

        async def handle_response(response):
            url = response.url
            if "shopee.vn/api" not in url:
                return
            if response.status != 200:
                return
            try:
                ct = response.headers.get("content-type","")
                if "json" not in ct:
                    return
                body = await response.text()
                all_api_urls.append(url[:150])
                # Tìm API có chứa dữ liệu sản phẩm
                if any(k in body for k in ['"name"', '"price"', '"image"', '"itemid"', '"shopid"']):
                    if len(body) > 500:  # Bỏ qua response nhỏ
                        found_product_apis.append({
                            "url": url,
                            "size": len(body),
                            "preview": body[:300]
                        })
                        print(f"\n🎯 SẢN PHẨM API: {url[:100]}")
                        print(f"   Size: {len(body)} bytes")
                        print(f"   Preview: {body[:200]}")
            except Exception as e:
                pass

        page.on("response", handle_response)

        # Intercept search page trực tiếp
        print("Truy cập search page...")
        await page.goto(
            "https://shopee.vn/search?keyword=ao+thun&page=0",
            wait_until="networkidle",
            timeout=60000
        )
        await asyncio.sleep(8)

        # Thử scroll để trigger lazy load
        await page.evaluate("window.scrollTo(0, 1000)")
        await asyncio.sleep(3)
        await page.evaluate("window.scrollTo(0, 2000)")
        await asyncio.sleep(3)

        cookies = await context.cookies()
        cookie_dict = {c["name"]: c["value"] for c in cookies}

        print(f"\n=== TÓM TẮT ===")
        print(f"Tổng API calls: {len(all_api_urls)}")
        print(f"APIs có thể có sản phẩm: {len(found_product_apis)}")
        print("\nTất cả API URLs:")
        for u in set(all_api_urls):
            print(f"  {u}")

        result = {
            "cookies": cookie_dict,
            "product_apis": found_product_apis,
            "all_urls": list(set(all_api_urls))
        }
        with open("debug2_result.json", "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print("\n💾 Saved debug2_result.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
