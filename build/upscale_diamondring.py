"""
Archissance — one-off upscale + import for The Diamond Ring Company.

The client's seven source files are UI screenshots of a 3D render viewer
(~1120px wide, filenames "Screenshot 2020-12-17 ...") rather than exported
full-resolution renders — well below the site's usual native resolution.
FSRCNN x4 brings them up to a resolution the normal W_LG=3840 cap can
actually use, the same approach already used for Chino Hills and the Union
City wood-panel swap in this repo.

    python build/upscale_diamondring.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\The Diamond Ring Co")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

# source screenshot -> site name, in the chosen gallery order
MAP = {
    "Screenshot 2020-12-17 102912.png": "diamondring-1",  # storefront, hero
    "Screenshot 2020-12-17 103242.png": "diamondring-2",  # wide panorama — 3 chandeliers, gold walls
    "Screenshot 2020-12-17 103001.png": "diamondring-3",  # chandelier + circular case + gold feature wall bg
    "Screenshot 2020-12-17 103037.png": "diamondring-4",  # gold geometric feature wall, close
    "Screenshot 2020-12-17 103058.png": "diamondring-5",  # lightbox display wall + curved case
    "Screenshot 2020-12-17 103138.png": "diamondring-6",  # VERRAGIO / TACORI brand wall
    "Screenshot 2020-12-17 103210.png": "diamondring-7",  # view back toward storefront / mall corridor
}


def main():
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    model_path = MODEL_DIR / "FSRCNN_x4.pb"
    if not model_path.exists():
        print(f"! missing {model_path}")
        return
    sr.readModel(str(model_path))
    sr.setModel("fsrcnn", 4)

    for src_name, site_name in MAP.items():
        src = SRC_DIR / src_name
        if not src.exists():
            print(f"! missing {src}")
            continue
        img = cv2.imread(str(src))
        result = sr.upsample(img)
        out = OUT_DIR / f"{site_name}.jpg"
        cv2.imwrite(str(out), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  {src_name:38} -> {site_name:14} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
