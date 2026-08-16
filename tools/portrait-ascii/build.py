#!/usr/bin/env python3
"""Bake assets/portrait-ascii.js — the data behind the hero's ASCII portrait.

Pipeline: crop the headshot -> estimate depth with Depth Anything V2 -> reduce
both to a character grid -> emit a small base64 data file that script.js rotates
under the pointer.

    uv venv --python 3.13 .venv
    uv pip install --python .venv/bin/python numpy pillow onnxruntime
    curl -L -o depth_model.onnx \
      https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main/onnx/model.onnx
    .venv/bin/python build.py

The 94MB model is deliberately not in the repo — this runs once when the photo
changes, and the ~20KB it produces is what ships.

Notes on the numbers below, all of them arrived at by looking at the output:

* CROP is head-tight. The obvious framing (the same bust the photo showed) puts
  the shirt across the bottom third at the same luminance as the skin, and in a
  character grid the two merge into one bright slab with the face lost in it.

* The tone is the photo's own, levelled and lightly sharpened — NOT the depth
  map's shading. Lambert shading off a depth map this smooth washes out exactly
  the features that carry a likeness (brows, glasses, beard), and the result
  reads as an anonymous bust. The relief earns its keep in the rotation instead:
  parallax, occlusion, and a light shading term the renderer applies per frame.

* Cells are 1..255 inside the subject and 0 outside. Reserving 0 for "not drawn"
  means the mask rides along in the tone grid instead of needing its own.
"""
import base64
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "myPhoto.jpeg"
OUT = ROOT / "assets" / "portrait-ascii.js"
MODEL = Path(__file__).parent / "depth_model.onnx"

CROP = (162, 0, 810, 864)   # 3:4, hair top ~7% down, chin ~81%
COLS, ROWS = 96, 77         # 96*0.6 / 77 ≈ 3:4 in JetBrains Mono's cell
RAMP = " .:-=+*#%@"
BG_SPLIT = 0.30             # inverse depth below this is the seamless backdrop
ZDEPTH = 0.42               # relief depth, in units of the plate's width
USM_RADIUS, USM_AMOUNT = 12, 1.1
GAMMA = 1.35
FADE = 0.16                 # bottom fraction over which the bust dissolves
LIGHT = np.array([-0.45, -0.55, 0.70])
LIGHT /= np.linalg.norm(LIGHT)

DX, DY = 1 / COLS, (4 / 3) / ROWS

# ── The invented sides ──────────────────────────────────────────────────────
# Each row of the head is treated as a horizontal slice through the skull. The
# photo gives the front of that slice; these continue the same ellipse past the
# silhouette so there is surface to show when the head turns. Everything out
# here is a guess — an anatomically-shaped one, but a guess.
WRAP_DEG = 46.0             # how far past the silhouette to build
WRAP_BACK = 0.85            # back-of-skull depth, as a fraction of half-width
WRAP_BLEND = 22.0           # degrees over which face curvature becomes skull
WRAP_FADE = 0.5             # tone multiplier at the far edge of the invention
WRAP_STEP = 1.2             # angular sampling, degrees
EAR_ROWS = (34, 45)         # grid rows: brow to nose-base, where ears live
EAR_ANG = (98.0, 128.0)     # degrees past front — the widest part of the skull
EAR_OUT = 0.055             # protrusion in plate widths, ~2cm on a real head


def depth_of(img):
    """Relative inverse depth, 0..1, larger = nearer."""
    w, h = img.size
    sw, sh = 518 / w, 518 / h
    s = sw if abs(1 - sw) < abs(1 - sh) else sh          # DPT keeps aspect
    tw, th = int(round(w * s / 14)) * 14, int(round(h * s / 14)) * 14
    x = np.asarray(img.resize((tw, th), Image.BICUBIC), np.float32) / 255.0
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    sess = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])
    d = sess.run(None, {"pixel_values": x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    d = np.asarray(Image.fromarray(d).resize(img.size, Image.BICUBIC), np.float32)
    return (d - d.min()) / (d.max() - d.min())


def box(a):
    """Area-average down to the character grid."""
    return np.asarray(Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
                      .resize((COLS, ROWS), Image.BOX), np.float32) / 255.0


def grad(z, step, axis):
    """Central difference, one-sided at the silhouette, 0 where isolated."""
    f, b = np.roll(z, -1, axis), np.roll(z, 1, axis)
    both = np.where(~np.isnan(f) & ~np.isnan(b), (f - b) / (2 * step), np.nan)
    fwd = np.where(~np.isnan(f), (f - z) / step, np.nan)
    bwd = np.where(~np.isnan(b), (z - b) / step, np.nan)
    return np.nan_to_num(np.where(~np.isnan(both), both,
                                  np.where(~np.isnan(fwd), fwd, bwd)))


img = Image.open(SRC).convert("RGB").crop(CROP)
gray = np.asarray(img.convert("L"), np.float32) / 255.0
depth = depth_of(img)
print(f"crop {img.size} aspect {img.size[0] / img.size[1]:.3f}")

# ── Tone ────────────────────────────────────────────────────────────────────
blur = np.asarray(Image.fromarray((gray * 255).astype(np.uint8))
                  .filter(ImageFilter.GaussianBlur(USM_RADIUS)), np.float32) / 255.0
sharp = box(np.clip(gray + (gray - blur) * USM_AMOUNT, 0, 1))
mask = np.asarray(Image.fromarray((depth >= BG_SPLIT).astype(np.float32))
                  .resize((COLS, ROWS), Image.BOX)) >= 0.5

lo, hi = np.percentile(sharp[mask], 1), np.percentile(sharp[mask], 99)
tone = np.clip((sharp - lo) / (hi - lo), 0, 1) ** GAMMA
rows_norm = np.linspace(0, 1, ROWS)[:, None]
tone *= np.clip((1.0 - rows_norm) / FADE, 0, 1) ** 0.8

keep = mask & (tone > 0.015)

# ── Geometry ────────────────────────────────────────────────────────────────
dep = box(depth)
z = np.where(mask, dep * ZDEPTH, np.nan)
gx, gy = grad(z, DX, 1), grad(z, DY, 0)
n = np.stack([-gx, -gy, np.ones_like(gx)], -1)
n /= np.linalg.norm(n, axis=-1, keepdims=True)

# Lambert on a frontal head clusters hard around 0.7 — without a stretch every
# cell lands on the top two glyphs. These endpoints are fixed, not per-frame:
# holding them still is what makes the tone shift as the head turns.
lam = (n @ LIGHT)[keep]
shade_lo, shade_hi = np.percentile(lam, 3), np.percentile(lam, 97)
zmid = float(np.nanmean(z))

lum_b = np.where(keep, 1 + np.round(tone * 254), 0).astype(np.uint8)
dep_b = np.round(np.clip((dep - dep[mask].min()) /
                         (dep[mask].max() - dep[mask].min()), 0, 1) * 255).astype(np.uint8)

print(f"grid {COLS}x{ROWS}, {int(keep.sum())} cells drawn ({100 * keep.mean():.0f}%)")
print(f"shade stretch {shade_lo:.4f}..{shade_hi:.4f}, zmid {zmid:.4f}")

b64 = lambda a: base64.b64encode(a.tobytes()).decode()
OUT.write_text(f"""/* Generated by tools/portrait-ascii/build.py — do not hand-edit.
 *
 * The hero portrait as a {COLS}x{ROWS} character grid plus a per-cell depth map
 * from Depth Anything V2. script.js turns it under the pointer and re-renders
 * the glyphs each frame; see "ASCII portrait" there.
 *
 *   lum    0 = background (not drawn), 1..255 = tone
 *   depth  0..255 relative inverse depth, 255 = nearest the camera
 *   zDepth relief depth, in units of the plate's width
 *   zMid   mean depth, the axis the head turns about
 *   shadeLo/shadeHi  fixed endpoints the per-frame lambert term is stretched
 *                    between (see build.py)
 *   wrap   parameters for the sides of the head, which the photo never saw and
 *          the renderer generates as elliptical slices (see build.py)
 */
window.PORTRAIT_ASCII = {{
    cols: {COLS},
    rows: {ROWS},
    ramp: {RAMP!r},
    zDepth: {ZDEPTH},
    zMid: {zmid:.4f},
    light: [{LIGHT[0]:.4f}, {LIGHT[1]:.4f}, {LIGHT[2]:.4f}],
    shadeLo: {shade_lo:.4f},
    shadeHi: {shade_hi:.4f},
    wrap: {{
        deg: {WRAP_DEG}, step: {WRAP_STEP}, back: {WRAP_BACK},
        blend: {WRAP_BLEND}, fade: {WRAP_FADE},
        earRows: [{EAR_ROWS[0]}, {EAR_ROWS[1]}],
        earAng: [{EAR_ANG[0]}, {EAR_ANG[1]}],
        earOut: {EAR_OUT},
    }},
    lum: "{b64(lum_b)}",
    depth: "{b64(dep_b)}",
}};
""")
print(f"wrote {OUT} ({OUT.stat().st_size / 1024:.1f} KB)")
