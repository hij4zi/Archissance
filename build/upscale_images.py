"""
Archissance — one-off neural upscaling for source photos that arrived at a
lower resolution than this site normally works with (Chino Hills Residence's
second photo set: MLS-thumbnail-sized, 384px or 768px wide, vs. the site's
usual 1600px+ renders).

Uses OpenCV's dnn_superres with pretrained FSRCNN models (small, CPU-fast,
no GPU/PyTorch needed) — genuine learned super-resolution, not a plain
resize: meaningfully sharper edges and texture than LANCZOS + unsharp mask,
with none of the halo/ringing artifacts plain sharpening leaves on
high-contrast edges (balustrades, palm fronds, window mullions). It cannot
invent detail that was never captured, so this is a real but bounded
improvement — a 384px source upscaled to 1536px will never match a native
1536px photo.

Requires opencv-contrib-python (for dnn_superres) and the two FSRCNN model
files (download once, gitignored, not committed):
    curl -L -o build/FSRCNN_x2.pb https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/master/models/FSRCNN_x2.pb
    curl -L -o build/FSRCNN_x4.pb https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/master/models/FSRCNN_x4.pb

Every source in TARGETS is upscaled to the SAME final width (1536px) — x4
for the 384px tier, x2 for the 768px tier — so the whole photo set reads as
one consistent resolution rather than two visibly different tiers. Writes
back into build/source-images/, overwriting the low-res source; run BEFORE
process_images.py so the normal pipeline picks up the upscaled version.

    python build/upscale_images.py
    python build/process_images.py
"""
from __future__ import annotations
import pathlib
import cv2

SRC = pathlib.Path("build/source-images")
MODEL_DIR = pathlib.Path("build")
TARGET_WIDTH = 1536

# name -> source scale tier (determines which FSRCNN model to use)
TARGETS = {
    "chinohills-1": 4,   # 384px source
    "chinohills-3": 4,
    "chinohills-6": 4,
    "chinohills-8": 4,
    "chinohills-9": 4,
    "chinohills-10": 4,
    "chinohills-12": 4,
    "chinohills-2": 2,   # 768px source
    "chinohills-4": 2,
    "chinohills-5": 2,
    "chinohills-7": 2,
    "chinohills-11": 2,
    "chinohills-13": 2,
}


def main():
    models = {}
    for scale in (2, 4):
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        model_path = MODEL_DIR / f"FSRCNN_x{scale}.pb"
        if not model_path.exists():
            print(f"! missing {model_path} — see module docstring for the download command")
            continue
        sr.readModel(str(model_path))
        sr.setModel("fsrcnn", scale)
        models[scale] = sr

    for name, scale in TARGETS.items():
        src = SRC / f"{name}.webp"
        if not src.exists():
            print(f"! missing source for {name}")
            continue
        if scale not in models:
            continue
        img = cv2.imread(str(src))
        result = models[scale].upsample(img)
        h, w = result.shape[:2]
        if w != TARGET_WIDTH:
            new_h = round(h * TARGET_WIDTH / w)
            result = cv2.resize(result, (TARGET_WIDTH, new_h), interpolation=cv2.INTER_LANCZOS4)
        out = SRC / f"{name}.png"
        cv2.imwrite(str(out), result)
        # drop the old .webp so process_images.py's MAP (pointed at .webp)
        # picks up the new .png via its "missing source -> glob for any
        # extension" fallback, without needing the MAP edited again
        src.unlink()
        print(f"  {name:16} -> {result.shape[1]}x{result.shape[0]}")


if __name__ == "__main__":
    main()
