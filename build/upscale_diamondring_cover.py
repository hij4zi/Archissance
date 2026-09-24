"""
Archissance — one-off upscale + swap for The Diamond Ring Company's hero
photo. The client supplied a better-populated storefront shot (staff and
shoppers visible, more polished lighting) at 1607x979 — still well under the
site's usual native resolution, so FSRCNN x4 brings it up to ~6400px before
it enters the normal process_images.py pipeline (which then applies the
site's W_LG=3840 cap), same approach as the earlier Diamond Ring Co import.

    python build/upscale_diamondring_cover.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\The Diamond Ring Co\DRC_cover.png")
OUT = pathlib.Path("build/source-images/diamondring-1.jpg")
MODEL_DIR = pathlib.Path("build")


def main():
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    model_path = MODEL_DIR / "FSRCNN_x4.pb"
    if not model_path.exists():
        print(f"! missing {model_path}")
        return
    sr.readModel(str(model_path))
    sr.setModel("fsrcnn", 4)

    img = cv2.imread(str(SRC))
    result = sr.upsample(img)
    cv2.imwrite(str(OUT), result, [cv2.IMWRITE_JPEG_QUALITY, 95])
    print(f"  {SRC.name} -> {OUT}  {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
