"""
Archissance — one-off upscale + import for the new Fullerton Mixed-Use
render/video set.

Two sources (New Renders/Mixed-Use/updated/1.png at 8204x3068, and the PDF
render extracted at build/_fullerton_3_extracted.png at 4822x2844) are
already well above the site's W_LG=3840 cap and are used as-is. The other
two (9.png hero and 2.png, 5.png) are ~1250-1900px and get FSRCNN x4, same
approach used for every other recent import this session.

Selected 5 of the 8 supplied renders (9, 1, 2, 3-as-pdf, 5) — 4.png and 7.png
were near-duplicate crops of 2.png (same "main entrance + garage + Chevron"
composition at different times/crops), and 8.png was a tighter, less
complete version of the same shot as the 3.pdf render — kept the strongest
version of each distinct composition rather than showing near-duplicates.

    python build/upscale_fullerton.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import shutil
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\Mixed-Use\updated")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

UPSCALE_MAP = {
    "9.png": "fullerton-1",  # aerial — hero
    "2.png": "fullerton-3",  # dusk, main entrance + garage + Chevron
    "5.png": "fullerton-5",  # close-up, main entrance detail
}
COPY_MAP = {
    "1.png": "fullerton-2",                          # ultra-wide street panorama
    "build/_fullerton_3_extracted.png": "fullerton-4",  # resident-parking side, full building (from 3.pdf)
}


def main():
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    model_path = MODEL_DIR / "FSRCNN_x4.pb"
    if not model_path.exists():
        print(f"! missing {model_path}")
        return
    sr.readModel(str(model_path))
    sr.setModel("fsrcnn", 4)

    for src_name, site_name in UPSCALE_MAP.items():
        src = SRC_DIR / src_name
        if not src.exists():
            print(f"! missing {src}")
            continue
        img = cv2.imread(str(src))
        result = sr.upsample(img)
        out = OUT_DIR / f"{site_name}.jpg"
        cv2.imwrite(str(out), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  {src_name:10} -> {site_name:14} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}  (upscaled)")

    for src_path, site_name in COPY_MAP.items():
        src = pathlib.Path(src_path)
        if not src.is_absolute():
            src = SRC_DIR / src_path if (SRC_DIR / src_path).exists() else pathlib.Path(src_path)
        out = OUT_DIR / f"{site_name}.png"
        shutil.copy(src, out)
        print(f"  {src.name:30} -> {site_name:14}  (already high-res, copied as-is)")


if __name__ == "__main__":
    main()
