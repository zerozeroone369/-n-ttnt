import httpx
from pathlib import Path

OUT_DIR = Path("public/products/market")
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Các ảnh sản phẩm chất lượng cao chuẩn xác theo từng mặt hàng
IMAGE_URLS = {
    "nen_thom_1.jpg": "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=800&auto=format&fit=crop&q=80",
    "nen_thom_2.jpg": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
    "ca_phe_1.jpg": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&auto=format&fit=crop&q=80",
    "ca_phe_2.jpg": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=800&auto=format&fit=crop&q=80",
    "tai_nghe_1.jpg": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    "tai_nghe_2.jpg": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&auto=format&fit=crop&q=80",
    "tui_xach_1.jpg": "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop&q=80",
    "tui_xach_2.jpg": "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&auto=format&fit=crop&q=80",
    "ao_thun_1.jpg": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    "ao_thun_2.jpg": "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
    "ban_phim_1.jpg": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&auto=format&fit=crop&q=80",
    "dong_ho_1.jpg": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&auto=format&fit=crop&q=80",
    "giay_sneaker_1.jpg": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80"
}

headers = {"User-Agent": "Mozilla/5.0"}
with httpx.Client(follow_redirects=True, timeout=20) as client:
    for filename, url in IMAGE_URLS.items():
        dest = OUT_DIR / filename
        if not dest.exists() or dest.stat().st_size < 1000:
            try:
                r = client.get(url, headers=headers)
                if r.status_code == 200:
                    dest.write_bytes(r.content)
                    print(f"Downloaded {filename}: {len(r.content)} bytes")
                else:
                    print(f"Failed {filename}: {r.status_code}")
            except Exception as e:
                print(f"Error {filename}: {e}")
        else:
            print(f"Already exists: {filename}")
