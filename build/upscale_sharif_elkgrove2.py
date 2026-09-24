"""
Archissance — one-off upscale + swap for the two Sharif Jewelers — Elk Grove
renders the client revised (TI-2 hero, TI-3 gallery). TI-1 and TI-4 came back
byte-for-byte equivalent to what's already live, so they're left untouched.

Same FSRCNN x4 approach as the original import (build/upscale_sharif_elkgrove.py).

    python build/upscale_sharif_elkgrove2.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\Sharif TI")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

MAP = {
    "TI-2.png": "sharifelkgrove-2",  # hero — circular ceiling feature, frontal
    "TI-3.png": "sharifelkgrove-3",  # curved display counters, angled
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
