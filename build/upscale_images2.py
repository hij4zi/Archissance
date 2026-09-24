"""
Archissance — one-off follow-up upscale for the seven Chino Hills photos that
never got the client's Upscayl replacement.

build/upscale_images.py (FSRCNN x4/x2) already brought this project's second
photo set from 384px/768px MLS thumbnails up to a uniform 1536px, and
process_images.py's MAP comment claims all 13 were later superseded by a
client Upscayl pass — but only six files (chinohills-2,4,5,7,11,13) actually
arrived at that higher resolution (3072x2304, native). The other seven
(chinohills-1,3,6,8,9,10,12) are still the old FSRCNN 1536x1152 result, and
their true low-res originals no longer exist on disk (overwritten by that
earlier pass) — so there's no going back to a real source.

This cascades a second FSRCNN x2 pass on TOP of the existing 1536px files to
reach the same 3072px class as the other six, so the gallery reads as one
consistent resolution tier instead of two visibly different ones. It can't
recover detail the 384px original never had, but it removes the visible
step-down between these seven and their neighbors in the same gallery, and
lets process_images.py's W_LG=2400 cap apply uniformly across all 13.

    python build/upscale_images2.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

TARGETS = ["chinohills-1", "chinohills-3", "chinohills-6", "chinohills-8",
           "chinohills-9", "chinohills-10", "chinohills-12"]


def main():
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    model_path = MODEL_DIR / "FSRCNN_x2.pb"
    if not model_path.exists():
        print(f"! missing {model_path}")
        return
    sr.readModel(str(model_path))
    sr.setModel("fsrcnn", 2)

    for name in TARGETS:
        src = SRC / f"{name}.jpg"
        if not src.exists():
            print(f"! missing {src}")
            continue
        img = cv2.imread(str(src))
        result = sr.upsample(img)
        cv2.imwrite(str(src), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"  {name:16} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
