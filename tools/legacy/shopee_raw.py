"""Dump raw JSON từ search_items để xem cấu trúc thật"""
import asyncio, json
from urllib.parse import quote
from playwright.async_api import async_playwright

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"]
        )
        ctx = await browser.new_context(
            user_agent=UA, locale="vi-VN",
            viewport={"width": 1366, "height": 768},
        )
        await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")
        page = await ctx.new_page()

        captured = []
        async def on_resp(resp):
            if "search_items" in resp.url and resp.status == 200:
                try:
                    body = await resp.text()
                    captured.append({"url": resp.url, "body": body})
                    print(f"GOT search_items: {len(body)} bytes")
                    print(f"URL: {resp.url[:120]}")
                except Exception as e:
                    print(f"Err: {e}")

        page.on("response", on_resp)

        await page.goto("https://shopee.vn", wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(3)
        await page.goto(
            f"https://shopee.vn/search?keyword={quote('ao thun')}&page=0",
            wait_until="networkidle", timeout=60000
        )
        await asyncio.sleep(8)

        print(f"\nTotal captured: {len(captured)}")
        for i, c in enumerate(captured):
            fname = f"raw_{i+1}.json"
            with open(fname, "w", encoding="utf-8") as f:
                f.write(c["body"])
            print(f"Saved {fname} ({len(c['body'])} bytes)")
            # In 2000 chars để xem cấu trúc
            try:
                data = json.loads(c["body"])
                print(f"Top-level keys: {list(data.keys())}")
                # In đệ quy để tìm items
                def find_items(obj, depth=0, path=""):
                    if depth > 4: return
                    if isinstance(obj, dict):
                        for k,v in obj.items():
                            if k in ("items","products","result") and isinstance(v, list) and len(v) > 0:
                                print(f"  FOUND LIST at {path}.{k}: {len(v)} items")
                                if isinstance(v[0], dict):
                                    print(f"    First item keys: {list(v[0].keys())[:15]}")
                            else:
                                find_items(v, depth+1, f"{path}.{k}")
                find_items(data)
            except Exception as e:
                print(f"JSON parse error: {e}")
                print(c["body"][:300])

        await browser.close()

asyncio.run(main())
