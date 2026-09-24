"""
Archissance — one-off upscale + swap for the Union City Power Market wood-
panel design variant.

The client supplied four new renders in New Renders/UnionCity/WoodPanels/
(same four camera angles as the current stone/white-panel design, with the
side volumes re-clad in wood siding), but each file is exactly 4x smaller
than the current source it replaces (1448x1086 -> 5792x4344 native,
1672x941 -> 6688x3764 native) — almost certainly a downscaled preview
export of the same full-res render. FSRCNN x4 brings each back to that
native resolution class before it enters the normal process_images.py
pipeline (which then applies the site's usual W_LG=3840 cap).

    python build/upscale_unioncity_wood.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC_DIR = pathlib.Path("New Renders/UnionCity/WoodPanels")
OUT_DIR = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")

# WoodPanels filename -> site name it replaces (matched by camera angle + aspect ratio)
MAP = {
    "UC_2.png": "unioncity-1",  # straight-on storefront
    "UC_1.png": "unioncity-2",  # entry tower, angled
    "UC_3.png": "unioncity-3",  # wide site shot — canopy, store, screen wall — hero
    "UC_4.png": "unioncity-4",  # storefront + service volume, angled
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
        print(f"  {src_name:10} -> {site_name:14} {img.shape[1]}x{img.shape[0]} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
