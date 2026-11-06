"""Debug v4 - Bắt ALL requests và check __NEXT_DATA__ trong HTML"""
import asyncio, json, re
from urllib.parse import quote
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            locale="vi-VN",
        )
        page = await ctx.new_page()

        all_responses = []

        async def on_resp(resp):
            url = resp.url
            status = resp.status
            ct = resp.headers.get("content-type","")
            # Log mọi response từ shopee
            if "shopee.vn" in url and status == 200:
                all_responses.append({
                    "url": url[:150],
                    "ct": ct[:80],
                    "status": status
                })

        page.on("response", on_resp)

        # Vào trang chủ trước
        await page.goto("https://shopee.vn", wait_until="domcontentloaded", timeout=60000)
        await asyncio.sleep(2)
        all_responses.clear()

        kw = quote("áo thun")
        await page.goto(
            f"https://shopee.vn/search?keyword={kw}&page=0",
            wait_until="networkidle", timeout=60000
        )
        await asyncio.sleep(6)
        await page.evaluate("window.scrollTo(0, 2000)")
        await asyncio.sleep(3)

        print(f"Total responses from shopee.vn: {len(all_responses)}")
        print("\nAll URLs (unique):")
        seen = set()
        for r in all_responses:
            base = r['url'].split('?')[0]
            if base not in seen:
                seen.add(base)
                print(f"  [{r['status']}] {r['url'][:130]}")
                print(f"         CT: {r['ct']}")

        # Thử đọc __NEXT_DATA__ hoặc window.__data từ page HTML
        print("\n=== Checking page for embedded JSON data ===")
        
        # Check Next.js data
        next_data = await page.evaluate("""
            () => {
                const el = document.getElementById('__NEXT_DATA__');
                return el ? el.textContent.substring(0, 2000) : null;
            }
        """)
        if next_data:
            print(f"__NEXT_DATA__ found! ({len(next_data)} chars)")
            print(next_data[:500])
        else:
            print("No __NEXT_DATA__")

        # Check Redux store
        redux = await page.evaluate("""
            () => {
                try {
                    // Tìm data trong window
                    for (const key of Object.keys(window)) {
                        if (key.startsWith('__') || key.includes('data') || key.includes('Data')) {
                            const val = JSON.stringify(window[key]);
                            if (val && val.includes('itemid') && val.length > 100) {
                                return key + ':' + val.substring(0, 500);
                            }
                        }
                    }
                    return null;
                } catch(e) { return null; }
            }
        """)
        if redux:
            print(f"\nFound window data: {redux[:300]}")

        # Lấy text các product card từ DOM
        items_text = await page.evaluate("""
            () => {
                // Tìm elements có data-sqe="item" hoặc class chứa product
                const selectors = [
                    '[data-sqe="item"]',
                    '[class*="product"]',
                    '[class*="item"]',
                    'a[href*="/product"]',
                    'a[href*="shopee.vn"][class*="item"]'
                ];
                for (const sel of selectors) {
                    const els = document.querySelectorAll(sel);
                    if (els.length > 5) {
                        return {
                            selector: sel,
                            count: els.length,
                            sample: els[0] ? els[0].outerHTML.substring(0, 500) : ''
                        };
                    }
                }
                return {
                    bodyLength: document.body.innerHTML.length,
                    title: document.title,
                    msg: 'No product elements found'
                };
            }
        """)
        print(f"\nDOM items: {items_text}")

        await browser.close()

asyncio.run(main())
