"""
Archissance — image prep.

Architectural renders keep their ORIGINAL ASPECT RATIO. No cropping, ever
(the one exception: a bottom watermark strip on a few MLS photos, which is
removing a watermark, not composing a crop). Each source is resampled to a
large and a small width, both native ratio, and its final pixel dimensions
are written to assets/img/proc/manifest.json so the HTML can reserve the
right box without forcing a ratio.

    python build/process_images.py
"""
from __future__ import annotations
import json
import pathlib
from PIL import Image, ImageOps, ImageFilter

Image.MAX_IMAGE_PIXELS = None
RAW = pathlib.Path("build/source-images")
OUT = pathlib.Path("assets/img/proc")
OUT.mkdir(parents=True, exist_ok=True)

W_LG = 3840   # large render — capped, never upscaled past source. Raised from
              # 2400: several recent projects' real source photography runs
              # 5700-8300px wide (HB Medical, Montclair, Union City, the PDF-
              # export site plans) and project heroes render at `sizes=100vw`
              # (see build.mjs) — 2400 was throwing away real detail on large
              # / high-DPR viewports for no reason. resized() only ever scales
              # DOWN, so sources already under 3840 are completely unaffected.
W_SM = 1100   # small render for phones / thumbnails

# source filename -> output name.  All ratios preserved.
MAP = {
    # ---- Fullerton Mixed-Use (new renders) ----
    # ---- 2026 update: entire new render + video set. Sources upscaled via
    # build/upscale_fullerton.py (FSRCNN 4x for the three under ~1900px; the
    # panorama and the PDF-extracted render were already high-res). Dropped
    # 4.png/7.png (near-duplicate crops of 2.png) and 8.png (a tighter,
    # less-complete version of the 3.pdf render) rather than show near-dupes. ----
    "fullerton-1.jpg": "fullerton-1",        # aerial — hero
    "fullerton-2.png": "fullerton-2",        # ultra-wide street panorama
    "fullerton-3.jpg": "fullerton-3",        # dusk, main entrance + garage + Chevron
    "fullerton-4.png": "fullerton-4",        # resident-parking side, full building
    "fullerton-5.jpg": "fullerton-5",        # close-up, main entrance detail
    "fullerton-6.jpg": "fullerton-6",        # ultra-wide street panorama, Power Market + Chevron, alt angle
    "fullerton-10.jpg": "fullerton-10",      # close-up, main entrance detail, alt angle
    "fullerton-11.jpg": "fullerton-11",      # interior courtyard, lounge/fire pit/grill amenity
    "fullerton-12.jpg": "fullerton-12",      # resident-parking side, alt angle
    "fullerton-site-plan.png": "fullerton-site-plan",           # site/parking plan (PDF export, cropped to content)
    "fullerton-landscape-plan.png": "fullerton-landscape-plan", # conceptual landscape plan (PDF export, cropped to content)

    # ---- 1012 J Street (new renders; was Zaytuna) ----
    "jstreet-1.jpg": "jstreet-1",
    "jstreet-2.png": "jstreet-2",
    "jstreet-plan-1.png": "jstreet-plan-1",  # 1st floor plan (PDF export, cropped to content)
    "jstreet-plan-2.png": "jstreet-plan-2",  # 2nd floor plan (PDF export, cropped to content)

    # ---- Chino Hills Residence — original MLS photo set. Client-upscaled via
    # Upscayl (high-fidelity-4x) — replaces the earlier low-res "keep as
    # supplied" sources. ----
    "colinas-02.jpg": "colinas-1",
    "colinas-03.jpg": "colinas-2",
    "colinas-16.jpg": "colinas-3",
    "colinas-01.jpg": "colinas-4",
    "colinas-04.jpg": "colinas-5",
    "colinas-07.jpg": "colinas-6",
    "colinas-13.jpg": "colinas-7",

    # ---- Chino Hills Residence — second photo set (13 images), shown alongside
    # the original 7 above, not replacing them. Originally 384px/768px MLS
    # thumbnails; client-upscaled via Upscayl (high-fidelity-4x), superseding
    # this project's own earlier build/upscale_images.py (FSRCNN) pass.
    "chinohills-1.jpg": "chinohills-1",     # twilight rear/front
    "chinohills-2.jpg": "chinohills-2",     # rotunda entry
    "chinohills-3.jpg": "chinohills-3",     # round turret sitting room
    "chinohills-4.jpg": "chinohills-4",     # pool/patio twilight
    "chinohills-5.jpg": "chinohills-5",     # primary bath, fireplace
    "chinohills-6.jpg": "chinohills-6",     # pool/patio twilight, second angle
    "chinohills-7.jpg": "chinohills-7",     # garage
    "chinohills-8.jpg": "chinohills-8",     # kitchen
    "chinohills-9.jpg": "chinohills-9",     # kitchen, second angle
    "chinohills-10.jpg": "chinohills-10",   # primary bedroom
    "chinohills-11.jpg": "chinohills-11",   # hillside aerial, sunset — hero
    "chinohills-12.jpg": "chinohills-12",   # wood-paneled office
    "chinohills-13.jpg": "chinohills-13",   # pool/spa, daylight

    # ---- Bellflower (new wide elevation + video poster) ----
    "bellflower-elev.jpg": "bellflower-elev",
    "bellflower-poster.jpg": "bellflower-poster",

    # ---- video first-frames: each clip's frame 0, so poster == what plays ----
    "fullerton-vframe.png": "fullerton-vframe",       # fullerton-render.mp4
    "bellflower-vframe-a.png": "bellflower-vframe-a",  # bellflower-6.mp4 (hero video)
    "bellflower-vframe-b.png": "bellflower-vframe-b",  # bellflower-5.mp4
    "sharif-vframe.png": "sharif-vframe",             # sharif-2.mp4 (retired, kept for reference)
    "sharif-cars-vframe.png": "sharif-cars-vframe",   # sharif-cars.mp4
    "sharif-store-vframe.png": "sharif-store-vframe", # sharif-store.mp4
    "linden-vframe.png": "linden-vframe",             # linden-render.mp4 (linden media)
    "linden-hero-vframe.png": "linden-hero-vframe",   # linden-hero.mp4 (home hero)

    # ---- Sharif Jewelers (2025 update — second building added) ----
    "sharif-site.png": "sharif-site",         # wide site shot, both buildings — cover / hero
    "sharif-front.png": "sharif-front",       # front elevation
    "sharif-building2.png": "sharif-building2",  # building two (leased office/retail) alone
    "sharif-facade.png": "sharif-facade",     # angled evening shot of building one
    "sharif-site-plan.png": "sharif-site-plan",  # site plan (PDF export, cropped to content)

    # ---- Linden Point (new renders) ----
    "linden-1.png": "linden-1",
    "linden-2.png": "linden-2",
    "linden-3.png": "linden-3",
    "linden-4.png": "linden-4",
    "linden-5.png": "linden-5",

    # ---- Irvine Residence Interior (no new folder — keep existing) ----
    "irvine-1.webp": "irvine-1",
    "irvine-2.webp": "irvine-2",
    "irvine-3.webp": "irvine-3",
    "irvine-4.webp": "irvine-4",
    "irvine-5.webp": "irvine-5",

    # ---- Sharif Jewelers (new renders) ----
    "sharif-1.jpg": "sharif-1",       # front
    "sharif-2.jpg": "sharif-2",       # angled

    # ---- Metro Fusion (new renders) ----
    "metrofusion-store.jpg": "metrofusion-store",     # storefront
    "metrofusion-atrium.jpg": "metrofusion-after",    # after (atrium)
    "metrofusion-floor.png": "metrofusion-floor",     # sales floor
    "metrofusion-before.jpg": "metrofusion-before",   # existing (Claire's)

    # ---- Power Market Gas Station (new renders; previously "Los Alamitos Chevron") ----
    "powermarket-1.jpg": "powermarket-1",
    "powermarket-2.jpg": "powermarket-2",
    "powermarket-3.jpg": "powermarket-3",
    "powermarket-axon.jpg": "powermarket-axon",

    # ---- Union City Power Market (new project) ----
    "unioncity-1.jpg": "unioncity-1",   # storefront, straight-on (client-upscaled via Upscayl 4x)
    "unioncity-2.jpg": "unioncity-2",   # entry tower, angled
    "unioncity-3.jpg": "unioncity-3",   # wide site shot — canopy, store, screen wall — hero
    "unioncity-4.jpg": "unioncity-4",   # storefront + service volume, angled

    # ---- Montclair Chevron (new project; client-upscaled via Upscayl) ----
    "montclair-1.jpg": "montclair-1",   # storefront + car wash, angled
    "montclair-2.jpg": "montclair-2",   # wide site shot — canopy, car wash, store — hero
    "montclair-3.jpg": "montclair-3",   # wide site shot, second angle
    "montclair-4.jpg": "montclair-4",   # fueling canopy, angled

    # ---- Huntington Beach Medical Offices (new project) ----
    # client-upscaled via Upscayl (ultramix-balanced-4x)
    "hbmedical-1.jpg": "hbmedical-1",   # wide day shot, three storefronts — hero
    "hbmedical-2.jpg": "hbmedical-2",
    "hbmedical-3.jpg": "hbmedical-3",
    "hbmedical-4.jpg": "hbmedical-4",   # dusk street view
    "hbmedical-site-plan.png": "hbmedical-site-plan",  # site plan (PDF export, cropped to content)

    # ---- Solano Water Treatment Plant (new render) ----
    "solano-1.jpg": "solano-1",
    "solano-2.png": "solano-2",
    "solano-3.png": "solano-3",

    # ---- Ontario Water Treatment Plant 925 (new project) ----
    "ontario925-1.jpg": "ontario925-1",   # aerial isometric — hero
    "ontario925-2.png": "ontario925-2",   # elevation, roll-up door side
    "ontario925-3.jpg": "ontario925-3",   # elevation, entrance side
    "ontario925-4.jpg": "ontario925-4",   # angled corner view
    "ontario925-5.jpg": "ontario925-5",   # angled corner, alt material study

    # ---- Ontario Treatment Plant — Well 37 & 39 (new project) ----
    "ontario3739-1.jpg": "ontario3739-1",
    "ontario3739-2.jpg": "ontario3739-2",

    # ---- West Valley Water Treatment Plant ----
    "westvalley-1.png": "westvalley-1",
    "westvalley-2.png": "westvalley-2",
    "westvalley-3.png": "westvalley-3",
    "westvalley-4.png": "westvalley-4",
    "westvalley-5.png": "westvalley-5",

    # ---- The Diamond Ring Company (new project; client screenshots
    # upscaled via build/upscale_diamondring.py — FSRCNN 4x) ----
    "diamondring-1.jpg": "diamondring-1",   # storefront — hero
    "diamondring-2.jpg": "diamondring-2",   # wide panorama, 3 chandeliers + gold walls
    "diamondring-3.jpg": "diamondring-3",   # chandelier, circular case, gold feature wall
    "diamondring-4.jpg": "diamondring-4",   # gold geometric feature wall, close
    "diamondring-5.jpg": "diamondring-5",   # lightbox display wall + curved case
    "diamondring-6.jpg": "diamondring-6",   # VERRAGIO / TACORI brand wall
    "diamondring-7.jpg": "diamondring-7",   # view back toward storefront / mall corridor

    # ---- Sharif Jewelers — Elk Grove (new project; client renders upscaled
    # via build/upscale_sharif_elkgrove.py — FSRCNN 4x) ----
    "sharifelkgrove-1.jpg": "sharifelkgrove-1",   # wide showroom overview
    "sharifelkgrove-2.jpg": "sharifelkgrove-2",   # circular ceiling feature, frontal — hero
    "sharifelkgrove-3.jpg": "sharifelkgrove-3",   # curved display counters, angled
    "sharifelkgrove-4.jpg": "sharifelkgrove-4",   # circular counter + brand wall

    # ---- J & Huss Custom Jewelry (new project; client renders upscaled via
    # build/upscale_jhuss.py — FSRCNN 4x) ----
    "jhuss-1.jpg": "jhuss-1",   # storefront, angled — portrait
    "jhuss-2.jpg": "jhuss-2",   # storefront, straight-on — portrait
    "jhuss-3.jpg": "jhuss-3",   # interior corridor, storefront visible beyond — hero
    "jhuss-4.jpg": "jhuss-4",   # interior, brand wall

    # ---- Gold & Diamond / G&D Center (new project; client renders upscaled
    # via build/upscale_goldiamond.py — FSRCNN 4x) ----
    "goldiamond-1.jpg": "goldiamond-1",   # storefront, wide angle — hero
    "goldiamond-2.jpg": "goldiamond-2",   # interior overview, straight-on
    "goldiamond-3.jpg": "goldiamond-3",   # interior overview, angled
    "goldiamond-4.jpg": "goldiamond-4",   # storefront, straight-on — full signage

    # ---- Brand logo (supplied file LOGO-A, used as-is) ----
    "logo-a.jpg": "logo-a",
}

# names whose SOURCE carries a bottom-corner watermark strip (MLS) — trim it,
# then keep the native ratio of what remains.
CROP_WATERMARK = {
    "colinas-1", "colinas-2", "colinas-3", "colinas-4", "colinas-5", "colinas-6", "colinas-7",
    "irvine-1", "irvine-2", "irvine-3", "irvine-4", "irvine-5",
}

# NOTE: there used to be a SM_QUALITY_OVERRIDE / SM_WIDTH_OVERRIDE here that
# degraded specific -sm.jpg files to keep the self-contained bundle under its
# 16MB Artifact cap. That was the wrong lever: -sm.jpg isn't bundle-only, it's
# also what the real multi-page site serves on narrower/2x-DPR viewports (see
# picture()'s srcset in build.mjs) — so it quietly shipped blurry images to
# real visitors too, not just the bundle preview. The bundle's size problem is
# now solved the same way oversized video already was (build/bundle-video/,
# see standalone.mjs) — a separate build/bundle-img/ of bundle-only compressed
# copies, generated by build/bundle_images.py, that never touches this file's
# normal-quality output. If the bundle goes over cap again, compress there —
# not here.


def prep(im: Image.Image, name: str) -> Image.Image:
    im = ImageOps.exif_transpose(im).convert("RGB")
    if name in CROP_WATERMARK:
        w, h = im.size
        im = im.crop((0, 0, w, int(h * 0.955)))
    return im


def resized(im: Image.Image, target_w: int) -> Image.Image:
    if im.width <= target_w:
        return im
    return im.resize((target_w, round(im.height * target_w / im.width)), Image.LANCZOS)


def save(im: Image.Image, name: str, kind: str, q_webp: int, q_jpg: int):
    # a touch of sharpening only when we downscaled meaningfully
    out = im
    out.save(OUT / f"{name}-{kind}.webp", "WEBP", quality=q_webp, method=6)
    out.save(OUT / f"{name}-{kind}.jpg", "JPEG", quality=q_jpg, optimize=True, progressive=True)


def main():
    manifest = {}
    for raw, name in MAP.items():
        src = RAW / raw
        if not src.exists():
            alt = next((p for p in RAW.glob(pathlib.Path(raw).stem + ".*")), None)
            src = alt if alt else src
        if not src.exists():
            print(f"! missing source for {name}  ({raw})")
            continue
        im = prep(Image.open(src), name)

        lg = resized(im, W_LG)
        lg = lg.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
        save(lg, name, "lg", 82, 88)

        sm = resized(im, W_SM)
        sm = sm.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        save(sm, name, "sm", 80, 84)

        manifest[name] = [lg.width, lg.height]
        print(f"  {name:22} {lg.width}x{lg.height}  ({lg.width/lg.height:.3f})")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=0), "utf8")
    print(f"\n{len(manifest)} images -> {OUT}/  (+ manifest.json)")


if __name__ == "__main__":
    main()
