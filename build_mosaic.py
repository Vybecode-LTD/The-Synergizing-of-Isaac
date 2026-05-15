"""Download TBOI screenshots and stitch them into a 12x12 mosaic background."""
import os, sys, io, random, math, ssl
from urllib.request import urlopen, Request
from PIL import Image

# Python 3.14 has stricter SSL cert validation that rejects many CDN certs.
# Use unverified context for these public screenshot downloads.
_ctx = ssl._create_unverified_context()

URLS = [
    # Steam Rebirth
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_25a4a446a433218d41a7e87e35b60c297e68e7a4.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_19ef624e8d97136ba6f928d389b85f7b8130c37a.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_9fa4199fa93cb8b1edd8780fa6ce9e80d2bfb503.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_008a76bd0ab314c8140dd1a7ec61090c122d1779.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_b146a76ac5348e1cf958c3d01834e13b33c4e561.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_89aa019b678e96fd13367a5fda6145ed0bc79fce.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_8961974abd6a3791efd74fbb6e57b4935e494500.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_b6d9427fc6c63f0fe12922ea60609344af241631.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_9fef3dccfe82981d03fedb7ae1f16f748d61cf76.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_18388222cc55311d39fa5221effd6ea620845010.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_887db2a8b10b9e184367d3f8409b40b6f00e77ce.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/250900/ss_ffac64b3c52a148ed6100c8b0ab87d011274991c.1920x1080.jpg",
    # Steam Repentance
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_368e275491bce7f2d43ce32bc451eede42d176ad.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_a142fd0ef647fb0c5dad64c36d6f21c688a7881f.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_886598ad4e9c40e6486e2375b0f00712522d999d.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_b463612e044a3e40ebda68d6662fb056d4209906.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_ae4e1e084dd725c2c0b808a4a2b44a87075a8a0c.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_26721b5a76611f76f5198066c1a71bdaabe4867c.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_dd24a7069a244d7c88e5425583a11dd04bf5df0e.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_1c13beb535ea788e65328605d8aa7c6172c30599.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1426300/ss_eb9a591963125a593a23bc4566b5670e724dc692.1920x1080.jpg",
    # Steam Afterbirth
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/401920/ss_df2aa3770197f0ef8d0887a3835e910b126c866e.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/401920/ss_c0c5d5168cf34052144665492fa2e38eb06801fc.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/401920/ss_994035b8c18b37692cfc4e211b801279673816cd.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/401920/ss_307f007acf74df8ad8cddf4df8043cdfbfbb3dc0.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/401920/ss_9b6e241518e019901849d73b9f690bbcb03e5847.1920x1080.jpg",
    "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/401920/ss_6f53a69dbfe8ab2ddf0853bdf3664f19b338536b.1920x1080.jpg",
    # RAWG Original
    "https://media.rawg.io/media/screenshots/a92/a929eb8caa1364efb248c03ac676d903.jpg",
    "https://media.rawg.io/media/screenshots/fc7/fc77e7fa174faeb7e42e8e5507ba3b83.jpg",
    "https://media.rawg.io/media/screenshots/e49/e496a40740172a7fb77d4400a0ecacfc.jpg",
    "https://media.rawg.io/media/screenshots/784/784b52d3d34a3aa2f67586a252eb9d08.jpg",
    "https://media.rawg.io/media/screenshots/7d9/7d96c6cbf364399aec83ec35953fe311.jpg",
    "https://media.rawg.io/media/screenshots/aca/acacefcdac3381ea1775b6e8b29a9a8c.jpg",
    "https://media.rawg.io/media/screenshots/412/41215fde123dcc364b94b7a910c58bff.jpg",
    "https://media.rawg.io/media/screenshots/ead/ead61fba85ab834521f83d35da2cd0bd.jpg",
    "https://media.rawg.io/media/screenshots/2f2/2f28a10eb7c1e396a213fce22bc666bd.jpg",
    "https://media.rawg.io/media/screenshots/585/5850dd20afb2e40faed13085b70bda5e.jpg",
    "https://media.rawg.io/media/screenshots/f91/f919778bc63bd6c4d85b87c97f3d7bf9.jpg",
    "https://media.rawg.io/media/screenshots/6a9/6a96166896a735d0309c42776ee318fc.jpg",
    # RAWG Rebirth
    "https://media.rawg.io/media/screenshots/886/8868959a867dd17c052fcc0ee509a981.jpg",
    "https://media.rawg.io/media/screenshots/e98/e98badaa2c8c7f0c1851a1fec5d8ad40.jpg",
    "https://media.rawg.io/media/screenshots/697/697cb3a925d77c1b75915a13adce38a2.jpg",
    "https://media.rawg.io/media/screenshots/bb8/bb8ff7c151f6b81704d6aa7ecbb17f99.jpg",
    "https://media.rawg.io/media/screenshots/c61/c61f14b30a0033f051f514c29968eb6f.jpg",
    "https://media.rawg.io/media/screenshots/c77/c77dcb4a0fc85e72d080c2ce8eef1586.jpg",
    "https://media.rawg.io/media/screenshots/b3a/b3aa71743db87cd06798b212d9b7f0b8.jpg",
    "https://media.rawg.io/media/screenshots/e41/e415cdbf777392946d6383c97bb28d4f.jpg",
    "https://media.rawg.io/media/screenshots/958/958195da78dab630df2b85163931e83a.jpg",
    "https://media.rawg.io/media/screenshots/b16/b165130c8a03f9f0317178cbe0c2e40b.jpg",
    "https://media.rawg.io/media/screenshots/00d/00df96fa04d94a1b7bd2580d22a33395.jpg",
    "https://media.rawg.io/media/screenshots/adf/adf0deff0d71e2c1b534b8bb84423fce.jpg",
]

GRID = 12
OUTPUT = os.path.join(os.path.dirname(__file__),
    "src", "TheSynergizingOfIsaac", "Assets", "Images", "bg_mosaic.png")
# Target: 2400x1350 (fits 1920x1080+ windows nicely, 16:9)
CANVAS_W, CANVAS_H = 2400, 1350
CELL_W = CANVAS_W // GRID   # 200
CELL_H = CANVAS_H // GRID   # ~112

def download(url, timeout=10):
    """Download an image from URL, return PIL Image or None."""
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=timeout, context=_ctx) as resp:
            data = resp.read()
        return Image.open(io.BytesIO(data)).convert("RGB")
    except Exception as e:
        print(f"  FAIL: {e}")
        return None

def crop_center(img, tw, th):
    """Center-crop to target aspect ratio then resize."""
    iw, ih = img.size
    target_ratio = tw / th
    img_ratio = iw / ih
    if img_ratio > target_ratio:
        new_w = int(ih * target_ratio)
        left = (iw - new_w) // 2
        img = img.crop((left, 0, left + new_w, ih))
    else:
        new_h = int(iw / target_ratio)
        top = (ih - new_h) // 2
        img = img.crop((0, top, iw, top + new_h))
    return img.resize((tw, th), Image.LANCZOS)

def main():
    print(f"Downloading up to {len(URLS)} screenshots...")
    images = []
    for i, url in enumerate(URLS):
        short = url.split("/")[-1][:40]
        print(f"  [{i+1}/{len(URLS)}] {short}...", end=" ")
        img = download(url)
        if img:
            images.append(img)
            print(f"OK ({img.size[0]}x{img.size[1]})")
        else:
            print("skipped")
        if len(images) >= 50:  # enough for variety
            break

    needed = GRID * GRID  # 144
    print(f"\nDownloaded {len(images)} images. Need {needed} cells.")

    if len(images) == 0:
        print("ERROR: No images downloaded!")
        sys.exit(1)

    # Shuffle and repeat to fill 144 cells
    random.seed(42)
    random.shuffle(images)
    cells = []
    for i in range(needed):
        cells.append(images[i % len(images)])

    # Build mosaic with per-tile variable opacity for 3D depth effect
    # ~20% of tiles rendered at 60% opacity ("popped" foreground)
    # ~80% of tiles at 30% opacity (recessed background)
    print(f"Building {GRID}x{GRID} mosaic ({CANVAS_W}x{CANVAS_H}) with depth effect...")
    num_popped = max(1, int(needed * 0.20))
    popped_set = set(random.sample(range(needed), num_popped))
    print(f"  {num_popped} tiles at 60% opacity, {needed - num_popped} at 30%")

    canvas = Image.new("RGB", (CANVAS_W, CANVAS_H), (26, 26, 46))
    dark_tile = Image.new("RGB", (CELL_W, CELL_H), (26, 26, 46))

    for idx, img in enumerate(cells):
        row = idx // GRID
        col = idx % GRID
        tile = crop_center(img, CELL_W, CELL_H)
        alpha = 0.60 if idx in popped_set else 0.30
        blended_tile = Image.blend(dark_tile, tile, alpha=alpha)
        canvas.paste(blended_tile, (col * CELL_W, row * CELL_H))

    blended = canvas  # already per-tile blended

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    blended.save(OUTPUT, "PNG", optimize=True)
    print(f"Saved to: {OUTPUT}")
    print(f"File size: {os.path.getsize(OUTPUT) / 1024:.0f} KB")

if __name__ == "__main__":
    main()
