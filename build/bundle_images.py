"""
Archissance — bundle-only image compression.

The self-contained Artifact bundle (build/standalone.mjs) inlines every
gallery image as a base64 data: URI, and has a hard 16MB cap. Most -sm.jpg
files are small enough that this is a non-issue, but a handful of dense,
busy renders (or technical line drawings) can each cost 150-300KB even at
the site-wide -sm quality — enough on their own to push the whole bundle
over.

This is the SAME problem build/bundle-video/ already solves for oversized
clips, solved the same way: generate extra-compressed copies here, in
build/bundle-img/, that standalone.mjs prefers when present. The real
site's own assets/img/proc/*-sm.jpg (served to real visitors on narrower or
2x-DPR viewports, per picture()'s srcset in build.mjs — NOT just a bundle
concern) is never touched by this script.

Only list an image here once you've confirmed via `node build/standalone.mjs`
that the bundle is actually over its cap and this specific image is a
meaningful contributor — don't compress preemptively.

    python build/bundle_images.py
"""
from __future__ import annotations
import pathlib
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
SRC = pathlib.Path("assets/img/proc")
OUT = pathlib.Path("build/bundle-img")
OUT.mkdir(parents=True, exist_ok=True)

# name -> (max width, JPEG quality). Start gentle; only go further if the
# bundle is still over cap after regenerating.
TARGETS: dict[str, tuple[int, int]] = {
    # technical line drawings — mostly flat white with sparse sharp lines,
    # tolerate much more aggressive compression than a photo before any
    # artifacting is visible (confirmed by eye at even harsher settings)
    "jstreet-plan-1": (900, 55),
    "jstreet-plan-2": (900, 55),
    "hbmedical-site-plan": (700, 50),
    # photos — dense/busy renders, kept gentler since JPEG artifacts show up
    # more readily on photographic detail than on line art
    "hbmedical-1": (900, 58),
    "hbmedical-2": (900, 58),
    "hbmedical-3": (900, 58),
    "hbmedical-4": (900, 58),
    "solano-2": (900, 58),
    "solano-3": (900, 58),
    # Chino Hills Residence — 20 photos across two sets is enough on its own to
    # blow the cap (~2.3MB over on first check), so all of them get a pass here.
    "colinas-1": (700, 58), "colinas-2": (700, 58), "colinas-3": (700, 58),
    "colinas-4": (700, 58), "colinas-5": (700, 58), "colinas-6": (700, 58), "colinas-7": (700, 58),
    "chinohills-1": (700, 58), "chinohills-2": (700, 58), "chinohills-3": (700, 58),
    "chinohills-4": (700, 58), "chinohills-5": (700, 58), "chinohills-6": (700, 58),
    "chinohills-7": (700, 58), "chinohills-8": (700, 58), "chinohills-9": (700, 58),
    "chinohills-10": (700, 58), "chinohills-11": (700, 58), "chinohills-12": (700, 58),
    "chinohills-13": (700, 58),
    "unioncity-1": (700, 58), "unioncity-2": (700, 58),
    "unioncity-3": (700, 58), "unioncity-4": (700, 58),
    "montclair-1": (600, 55), "montclair-2": (600, 55),
    "montclair-3": (600, 55), "montclair-4": (600, 55),
    # The Diamond Ring Company — 7 photos pushed the bundle to 16.88MB, over cap.
    # 700/q58 -> 16.14MB, 550/q50 -> still 16.02MB, this pass clears it with margin.
    "diamondring-1": (480, 45), "diamondring-2": (480, 45), "diamondring-3": (480, 45),
    "diamondring-4": (480, 45), "diamondring-5": (480, 45), "diamondring-6": (480, 45),
    "diamondring-7": (480, 45),
    # Sharif Jewelers — Elk Grove — 4 more photos pushed the bundle to 16.75MB, over
    # cap. Squeezing just these 4 (already small at -sm) couldn't close the gap —
    # the site had ~9.46MB of never-optimized -sm.jpg across 104 images and this
    # project's addition simply tipped it over. Given a normal photo-tier pass here
    # plus compressing a handful of the largest untouched offenders below instead.
    "sharifelkgrove-1": (550, 50), "sharifelkgrove-2": (550, 50),
    "sharifelkgrove-3": (550, 50), "sharifelkgrove-4": (550, 50),
    # largest never-optimized images site-wide (233-197 KB each at default -sm) —
    # photo tier, same reasoning as the sets above.
    "sharif-facade": (700, 58), "jstreet-1": (700, 58), "fullerton-6": (700, 58),
    "metrofusion-floor": (700, 58), "fullerton-1": (700, 58),
    # J & Huss Custom Jewelry pushed the bundle to 16.16MB, over cap. jhuss-1/2 are
    # portrait (0.75/0.84 aspect) — at the usual 700px-wide photo tier they'd still
    # carry ~2x the pixel count of a landscape shot, so a narrower width for those two.
    "jhuss-1": (500, 55), "jhuss-2": (500, 55),
    "jhuss-3": (700, 58), "jhuss-4": (700, 58),
    # Gold & Diamond — 4 more photos pushed the bundle to 16.59MB, over cap.
    "goldiamond-1": (550, 50), "goldiamond-2": (550, 50),
    "goldiamond-3": (550, 50), "goldiamond-4": (550, 50),
    # Fullerton — 2 more photos pushed the bundle to 16.35MB, over cap.
    # 700/q55+550/q50 -> 16.04MB, 550/q45+450/q42 -> 16.00MB (too close), this
    # pass clears it with real margin.
    "fullerton-6": (420, 38), "fullerton-10": (360, 35),
    # 2 more Fullerton photos pushed the bundle to 16.49MB, over cap.
    # 400/q38 + 420/q38 -> 16.02MB, 300/q32 + 320/q32 -> 16,777,939 bytes,
    # only 723 bytes over the real 16 MiB (16,777,216) cap — this pass clears
    # it with real margin instead of relying on rounding.
    "fullerton-11": (260, 28), "fullerton-12": (280, 28),
    # Ontario 925 — new hero + 2 new photos pushed the bundle to 16.26MB, over cap.
    "ontario925-1": (500, 45), "ontario925-3": (500, 45), "ontario925-4": (500, 45),
    # ontario925-5 (new) pushed the bundle to 16,825,575 bytes, over the real 16 MiB cap.
    "ontario925-5": (500, 45),
}


def main():
    if not TARGETS:
        print("TARGETS is empty — nothing to compress. Add entries here only")
        print("when node build/standalone.mjs reports the bundle over its cap.")
        return
    for name, (width, quality) in TARGETS.items():
        src = SRC / f"{name}-sm.jpg"
        if not src.exists():
            print(f"! missing {src}")
            continue
        im = Image.open(src).convert("RGB")
        if im.width > width:
            im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
        out = OUT / f"{name}.jpg"
        im.save(out, "JPEG", quality=quality, optimize=True, progressive=True)
        print(f"  {name:24} {im.width}x{im.height} q{quality}  ({out.stat().st_size/1024:.0f} KB)")


if __name__ == "__main__":
    main()
