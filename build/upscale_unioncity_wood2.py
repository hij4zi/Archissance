"""
Archissance — one-off upscale + swap for the Union City Power Market
wood-panel design, revision 2.

Same four camera angles as the first wood-panel swap (New Renders/UnionCity/
WoodPanels/), refined further in New Renders/UnionCity/WoodPanels_updated/ —
matched here again by aspect ratio (1672x941 -> unioncity-1, 1448x1086 -> the
other three). Each file is still exactly 4x smaller than the native
resolution class already established for this project (1448->5792,
1672->6688), so FSRCNN x4 brings them back to it before the normal
process_images.py pipeline applies the site's W_LG=3840 cap.

    python build/upscale_unioncity_wood2.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path("New Renders/UnionCity/WoodPanels_updated")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

MAP = {
    "UC_1_wood.png": "unioncity-1",  # straight-on storefront
    "UC_2_wood.png": "unioncity-2",  # entry tower, angled
    "UC_3_wood.png": "unioncity-3",  # wide site shot — canopy, store, screen wall — hero
    "UC_4_wood.png": "unioncity-4",  # storefront + service volume, angled
}


def main():
    sr = cv2.dnn_superres.DnnSuperResImpl_create()
    model_path = MODEL_DIR / "FSRCNN_x4.pb"
    if not model_path.exists():
        print(f"! missing {model_path}")
        return
    sr.readModel(str(model_path))
    sr.setModel("fsrcnn", 4)

    base = pathlib.Path(r"C:\Users\CAD-00\Desktop\Claude")
    for src_name, site_name in MAP.items():
        src = base / SRC_DIR / src_name
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
