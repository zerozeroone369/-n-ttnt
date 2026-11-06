"""Debug v3 - In ra JSON thực tế của search_items response"""
import asyncio, json
from urllib.parse import quote
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            locale="vi-VN",
        )
        page = await ctx.new_page()

        captured = []
        async def on_resp(resp):
            if "search_items" in resp.url and resp.status == 200:
                try:
                    body = await resp.text()
                    captured.append({"url": resp.url, "body": body})
                except: pass
        page.on("response", on_resp)

        await page.goto("https://shopee.vn", wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(2)
        kw = quote("áo thun")
        await page.goto(f"https://shopee.vn/search?keyword={kw}&page=0",
                        wait_until="networkidle", timeout=60000)
        await asyncio.sleep(5)

        print(f"Captured {len(captured)} search_items responses")
        for i, c in enumerate(captured):
            print(f"\n=== Response {i+1} ===")
            print(f"URL: {c['url'][:120]}")
            body = c['body']
            print(f"Size: {len(body)} bytes")
            # In 1000 chars đầu
            print(f"Body (1000 chars):\n{body[:1000]}")
            print("...")
            # Lưu full
            with open(f"raw_response_{i+1}.json","w",encoding="utf-8") as f:
                f.write(body)
            print(f"Saved raw_response_{i+1}.json")

        await browser.close()

asyncio.run(main())
