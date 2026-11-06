"""
Parse shopee.xlsx -> tải ảnh về public/products/ -> xuất shopee_parsed.json
"""
import asyncio
import json
import re
import random
from pathlib import Path
import httpx

XLSX_PATH = r"c:\web\TIEM_NHA_NHO_ECOMMERCE_AI (1)\shopee.xlsx"
IMG_DIR   = Path("public/products")
OUT_JSON  = "shopee_parsed.json"

IMG_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://shopee.vn/",
}

def parse_price(val: str) -> int:
    if not val:
        return 0
    s = re.sub(r"[^\d]", "", str(val))
    return int(s) if s else 0

def parse_sold(val: str) -> int:
    if not val:
        return 0
    s = str(val).strip()
    m = re.match(r"([\d]+)([kK]?)\+?", s)
    if m:
        n = int(m.group(1))
        return n * 1000 if m.group(2).lower() == "k" else n
    return random.randint(500, 10000)

def parse_discount(val: str) -> float:
    if not val:
        return 0.0
    s = re.sub(r"[^\d]", "", str(val))
    return float(s) / 100 if s else 0.0

async def download_image(client: httpx.AsyncClient, url: str, filename: str) -> str:
    if not url:
        return ""
    dest = IMG_DIR / filename
    if dest.exists():
        return f"/products/{filename}"
    try:
        r = await client.get(url, headers=HEADERS, timeout=15, follow_redirects=True)
        if r.status_code == 200 and len(r.content) > 500:
            dest.write_bytes(r.content)
            print(f"  ✓ {filename}")
            return f"/products/{filename}"
    except Exception as e:
        print(f"  ✗ {filename}: {e}")
    return ""

async def main():
    # Đọc XML trực tiếp từ file xlsx (zip)
    import zipfile
    from xml.etree import ElementTree as ET

    with zipfile.ZipFile(XLSX_PATH, 'r') as z:
        # Đọc shared strings
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_xml = z.read('xl/sharedStrings.xml')
            ss_tree = ET.fromstring(ss_xml)
            ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            for si in ss_tree.findall('ns:si', ns):
                texts = si.findall('.//ns:t', ns)
                val = ''.join((t.text or '') for t in texts)
                shared_strings.append(val)

        # Đọc sheet1
        sheet_xml = z.read('xl/worksheets/sheet1.xml')
        sheet_tree = ET.fromstring(sheet_xml)
        ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

        rows_data = []
        for row in sheet_tree.findall('.//ns:row', ns):
            row_vals = {}
            for cell in row.findall('ns:c', ns):
                ref  = cell.get('r', '')
                col  = re.sub(r'\d', '', ref)
                t    = cell.get('t', '')
                v_el = cell.find('ns:v', ns)
                val  = ''
                if v_el is not None and v_el.text:
                    if t == 's':
                        val = shared_strings[int(v_el.text)]
                    else:
                        val = v_el.text
                row_vals[col] = val
            rows_data.append(row_vals)

    # Bỏ header (row đầu)
    data_rows = rows_data[1:]
    print(f"Tìm thấy {len(data_rows)} sản phẩm")

    products_raw = []
    for row in data_rows:
        # A=href, B=img1, C=img2, D=discount, E=name, H=price, J=sold
        name     = row.get('E', '').strip()
        if not name or len(name) < 3:
            continue
        products_raw.append({
            "name":     name,
            "img1":     row.get('B', ''),
            "img2":     row.get('C', ''),
            "href":     row.get('A', ''),
            "discount": parse_discount(row.get('D', '')),
            "price":    parse_price(row.get('H', '')),
            "sold":     parse_sold(row.get('J', '')),
        })

    print(f"Parse được {len(products_raw)} sản phẩm hợp lệ")

    results = []
    async with httpx.AsyncClient() as client:
        for i, p in enumerate(products_raw):
            pid = f"sp-{i+1:03d}"

            img1 = await download_image(client, p["img1"], f"{pid}.jpg")
            img2 = await download_image(client, p["img2"], f"{pid}_2.jpg") if p["img2"] else ""

            price = max(9000, p["price"])
            disc  = p["discount"]
            orig  = int(price / (1 - disc)) if 0 < disc < 1 else int(price * 1.3)

            rating  = round(random.uniform(4.4, 5.0), 1)
            stock   = random.randint(15, 300)
            reviews = min(p["sold"] // 3, 9999)

            images = []
            if img1: images.append(img1)
            if img2: images.append(img2)
            # Fallback nếu không tải được ảnh
            if not images:
                images.append("https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=800&auto=format&fit=crop&q=80")

            results.append({
                "id":      pid,
                "name":    p["name"][:120],
                "price":   price,
                "orig":    max(price + 5000, orig),
                "rating":  rating,
                "reviews": reviews,
                "stock":   stock,
                "images":  images,
                "sold":    p["sold"],
            })

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    imgs_ok = sum(1 for r in results if r["images"] and "/products/" in r["images"][0])
    print(f"\n✅ Xong! {len(results)} sản phẩm → {OUT_JSON}")
    print(f"   Ảnh local: {imgs_ok}/{len(results)}")

if __name__ == "__main__":
    asyncio.run(main())
