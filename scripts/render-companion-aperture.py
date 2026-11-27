"""Render the Playground's two aperture settings from each original room PNG.

Run with Python, NumPy, SciPy and Pillow. The browser blends the two exposures
of the same painting without sampling a blur kernel on every animation frame.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.signal import oaconvolve


SCENES = Path(__file__).resolve().parents[1] / "assets/images/classic/scenes"
# Circle-of-confusion radii in the source painting at f/4. Opening to f/2
# doubles the radius at the same focus distance.
ROOMS = {"alice-atelier": 7.5, "marisa-workshop": 8.5, "patchouli-library": 8.0}
HIGHLIGHT_SHOULDER = 0.92


def aperture_kernel(radius):
    """Pixel coverage of a seven-blade iris with gently rounded blades."""
    extent = int(np.ceil(radius))
    side = 2 * extent + 1
    samples = 8
    axis = (np.arange(side * samples) + 0.5) / samples - extent - 0.5
    x, y = np.meshgrid(axis, axis)
    half_blade = np.pi / 7
    angle = (np.arctan2(y, x) + half_blade) % (2 * half_blade) - half_blade
    polygon = np.cos(half_blade) / np.cos(angle)
    edge = radius * (0.64 + 0.36 * polygon)
    coverage = np.hypot(x, y) <= edge
    kernel = coverage.reshape(side, samples, side, samples).mean(axis=(1, 3))
    return (kernel / kernel.sum()).astype(np.float32)


def scene_radiance(image):
    srgb = np.asarray(image, dtype=np.float32) / 255
    linear = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
    # The paintings are display-referred SDR. Expand the shoulder before
    # integration so small bright details contribute their color to neighbours.
    # One scale for all three channels preserves the hue of each emitter.
    peak = linear.max(axis=2, keepdims=True)
    return linear / (1 - HIGHLIGHT_SHOULDER * peak)


def aperture_exposure(radiance, radius):
    kernel = aperture_kernel(radius)
    margin = kernel.shape[0] // 2
    padded = np.pad(radiance, ((margin, margin), (margin, margin), (0, 0)), mode="reflect")
    exposure = oaconvolve(padded, kernel[:, :, None], mode="valid", axes=(0, 1))
    return np.maximum(exposure, 0)


def develop(exposure):
    # The inverse shoulder preserves a uniform patch at every aperture.
    peak = exposure.max(axis=2, keepdims=True)
    linear = exposure / (1 + HIGHLIGHT_SHOULDER * peak)
    srgb = np.where(linear <= 0.0031308, 12.92 * linear, 1.055 * linear ** (1 / 2.4) - 0.055)
    return Image.fromarray(np.rint(np.clip(srgb, 0, 1) * 255).astype(np.uint8))


def main():
    for room, narrow_radius in ROOMS.items():
        with Image.open(SCENES / (room + ".png")) as source:
            radiance = scene_radiance(source.convert("RGB"))
        for aperture, radius in [(4, narrow_radius), (2, narrow_radius * 2)]:
            plate = develop(aperture_exposure(radiance, radius))
            output = SCENES / f"{room}-f{aperture}.webp"
            plate.save(output, format="WEBP", quality=95, method=6)
            print(f"{output.name} ({output.stat().st_size // 1024} KiB)", flush=True)


if __name__ == "__main__":
    main()
