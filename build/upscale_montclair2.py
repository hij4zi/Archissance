"""
Archissance — one-off upscale + swap for Montclair Chevron Gas Station,
full render set refresh (new architectural style — traditional stucco/brick
with hip roofs, vs the previous flat-modern brick design).

Sources are matched by CONTENT/composition, not filename number — the new
folder's numbering doesn't correspond to the site's montclair-N slots:
  1.png        -> montclair-2  (wide site shot, canopy+carwash+price sign — hero)
  2.png        -> montclair-1  (storefront+carwash, angled entrance)
  3.png        -> montclair-3  (carwash exit + fuel canopy)
  Montclair4.png -> montclair-4 (fuel canopy, angled, price sign)

Sources are ~1620-1730px wide — FSRCNN x4 brings them to ~6500-6900px before
the normal process_images.py pipeline (which then applies the site's
W_LG=3840 cap), same approach used for every other recent import.

    python build/upscale_montclair2.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\Montclair\updated")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

MAP = {
    "1.png": "montclair-2",
    "2.png": "montclair-1",
    "3.png": "montclair-3",
    "Montclair4.png": "montclair-4",
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
        print(f"  {src_name:16} -> {site_name:14} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
