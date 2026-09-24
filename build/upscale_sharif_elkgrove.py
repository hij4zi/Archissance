"""
Archissance — one-off upscale + import for Sharif Jewelers — Elk Grove.

Source renders (New Renders/Sharif TI/TI-1..4.png) are ~1620-1750px wide —
below the site's usual native resolution. FSRCNN x4 brings them to
~6500-7000px before the normal process_images.py pipeline (which then
applies the site's W_LG=3840 cap), same approach used for every other
recent import this session.

    python build/upscale_sharif_elkgrove.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\Sharif TI")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

# source screenshot -> site name, in the chosen gallery order (hero first)
MAP = {
    "TI-2.png": "sharifelkgrove-2",  # hero — circular ceiling feature, frontal
    "TI-1.png": "sharifelkgrove-1",  # wide showroom overview
    "TI-3.png": "sharifelkgrove-3",  # curved display counters, angled
    "TI-4.png": "sharifelkgrove-4",  # circular counter + brand wall
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
        print(f"  {src_name:10} -> {site_name:16} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
