"""
Archissance — one-off upscale + import for J & Huss Custom Jewelry.

Source renders (New Renders/J&Huss/J&Huss_1..4.png) are ~1089-1725px wide —
below the site's usual native resolution. FSRCNN x4 brings them to
~4400-6900px before the normal process_images.py pipeline (which then
applies the site's W_LG=3840 cap), same approach used for every other recent
import this session.

    python build/upscale_jhuss.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\J&Huss")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

MAP = {
    "J&Huss_1.png": "jhuss-1",  # storefront, angled — portrait
    "J&Huss_2.png": "jhuss-2",  # storefront, straight-on — portrait
    "J&Huss_3.png": "jhuss-3",  # interior corridor, storefront visible beyond — hero
    "J&Huss_4.png": "jhuss-4",  # interior, brand wall
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
        print(f"  {src_name:14} -> {site_name:10} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
