# portrait-ascii

Generates `assets/portrait-ascii.js` — the character grid and depth map behind
the hero's ASCII portrait. Run it only when `assets/myPhoto.jpeg` changes; the
~20KB file it writes is what ships.

## Running it

```sh
cd tools/portrait-ascii
uv venv --python 3.13 .venv
uv pip install --python .venv/bin/python numpy pillow onnxruntime
curl -L -o depth_model.onnx \
  https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
.venv/bin/python build.py
```

The model (94MB) and the venv are gitignored. Depth Anything V2 Small is
Apache-2.0.

## What it does

1. Crops the headshot to a head-tight 3:4 box (`CROP` in `build.py`).
2. Runs monocular depth estimation over the crop. The result is *relative
   inverse depth* — larger is nearer, with no absolute scale — which is all a
   relief needs.
3. Reduces photo and depth to a 96x77 grid, one byte each per cell.
4. Emits base64 for both grids, plus the constants the renderer needs to match
   what was tuned here (`zDepth`, `zMid`, `light`, `shadeLo/shadeHi`, `wrap`).

The renderer lives in `script.js` under "ASCII portrait". It treats each cell as
a point in 3D, rotates the cloud under the pointer, and z-buffers it back into a
character grid every frame.

## What is photographed and what is invented

Worth keeping straight, because most of it is real and the rest is a guess:

| | source |
|---|---|
| front of the head, tone and relief | the photo + Depth Anything |
| sides of the head, the ears | invented — `WRAP_*` and `EAR_*` below |

The `WRAP_*` constants continue each row of the head past the silhouette as an
elliptical slice, so there is surface to show when it turns; `EAR_*` models a
bump onto that surface where an ear goes. Both are anatomy-shaped guesses, and
they are what let the rotation run to ~34° instead of tearing at 25°. Nothing
out there is a likeness — it is the right shape wearing the tone carried out
from the last cells the camera saw.

## If you re-shoot the photo

`CROP` is the thing most likely to need changing — it is in the original
image's pixels, and it wants the hair top around 7% down and the chin around
81%. After that, check:

- **`BG_SPLIT`** cuts subject from backdrop on depth. It works because the photo
  is on a seamless: the histogram is strongly bimodal. On a real-world
  background there may be no clean split, and the mask would need another
  source.
- **Tone** (`USM_*`, `GAMMA`, `FADE`) is tuned for flat studio lighting, which
  is the hard case — skin and a light shirt land on the same luminance and merge
  into one bright slab. That is why the crop is tight and the bottom fades out.
- **`ZDEPTH`** is the one dial for how much relief the head has.
- **`EAR_ROWS`/`EAR_ANG`** place the modelled ear, and are measured off the
  crop: rows are brow to nose-base, angles are degrees past the front of the
  skull. Ears sit at its widest point.

Sanity check the result by loading the page and sweeping the pointer across it:
the near cheek should widen and the far one compress, and the nose should lead.
If it looks like a flat picture being skewed, the depth map didn't land.
