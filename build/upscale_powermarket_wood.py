"""
Archissance — one-off upscale + swap for Power Market Gas Station (Woodland),
wood-panel design revision.

Source renders (New Renders/Yolo County-Woodland/Wood_updated/) are
1526-1895px wide — already larger than the previous sources but still well
under the site's usual native resolution. FSRCNN x4 brings them to
~6100-7600px before the normal process_images.py pipeline (which then
applies the site's W_LG=3840 cap), same approach used for every other recent
import this session.

    python build/upscale_powermarket_wood.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude\New Renders\Yolo County-Woodland\Wood_updated")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

MAP = {
    "1.png": "powermarket-1",
    "2.png": "powermarket-2",
    "3.png": "powermarket-3",
    "axon.png": "powermarket-axon",
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
