"""
Archissance — one-off upscale + import for Gold & Diamond / G&D Center.

Source renders (New Renders/Gold&Diamond/*_GD.png) are ~1350-1670px wide —
below the site's usual native resolution. FSRCNN x4 brings them to
~5400-6700px before the normal process_images.py pipeline (which then
applies the site's W_LG=3840 cap), same approach used for every other recent
import this session.

    python build/upscale_goldiamond.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\Gold&Diamond")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

MAP = {
    "1_GD.png": "goldiamond-1",  # storefront, wide angle — hero
    "2_GD.png": "goldiamond-2",  # interior overview, straight-on
    "3_GD.png": "goldiamond-3",  # interior overview, angled
    "4_GD.png": "goldiamond-4",  # storefront, straight-on — full signage
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
        print(f"  {src_name:10} -> {site_name:14} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
