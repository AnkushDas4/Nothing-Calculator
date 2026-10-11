#!/usr/bin/env python3
"""
scripts/make-icons.py
─────────────────────────────────────────────────────────────
Generates every icon the project needs with the Python standard
library only (no Pillow, no network):

  icons/*.png                     PWA / favicon
  icons/favicon.svg
  android/.../mipmap-*/…png       launcher, round + adaptive foreground
  android/.../drawable/ic_launcher_background.xml

The mark is a dot-matrix "N" with one red dot — Nothing OS style.

    python3 scripts/make-icons.py
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_OUT = os.path.join(ROOT, 'icons')
ANDROID_RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')

BG = (10, 10, 10, 255)
DOT = (242, 242, 242, 255)
DOT_DIM = (168, 168, 168, 255)
ACCENT = (255, 45, 45, 255)
GRID = (255, 255, 255, 14)

# 8 rows x 6 cols dot-matrix "N"
PATTERN = [
    '100001',
    '110001',
    '101001',
    '101001',
    '100101',
    '100101',
    '100011',
    '100001',
]
ACCENT_DOTS = {(7, 5)}

FAVICON = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0a0a0a"/>
  <g fill="#f2f2f2">
    <circle cx="18" cy="14" r="3.1"/><circle cx="46" cy="14" r="3.1"/>
    <circle cx="18" cy="23" r="3.1"/><circle cx="27" cy="23" r="3.1"/><circle cx="46" cy="23" r="3.1"/>
    <circle cx="18" cy="32" r="3.1"/><circle cx="31" cy="32" r="3.1"/><circle cx="46" cy="32" r="3.1"/>
    <circle cx="18" cy="41" r="3.1"/><circle cx="35" cy="41" r="3.1"/><circle cx="46" cy="41" r="3.1"/>
    <circle cx="18" cy="50" r="3.1"/><circle cx="46" cy="50" r="3.1"/>
  </g>
  <circle cx="40" cy="50" r="3.1" fill="#ff2d2d"/>
</svg>
'''


def write_png(path, width, height, pixels):
    raw = bytearray()
    stride = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * stride:(y + 1) * stride])

    def chunk(tag, data):
        return (
            struct.pack('>I', len(data))
            + tag
            + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    png += chunk(b'IEND', b'')
    with open(path, 'wb') as handle:
        handle.write(png)


def blend(pixels, size, x, y, color):
    if x < 0 or y < 0 or x >= size:
        return
    index = (y * size + x) * 4
    if index + 3 >= len(pixels):
        return
    alpha = color[3] / 255.0
    for channel in range(3):
        base = pixels[index + channel]
        pixels[index + channel] = int(base * (1 - alpha) + color[channel] * alpha)
    pixels[index + 3] = max(pixels[index + 3], color[3])


def draw_dot(pixels, size, cx, cy, radius, color):
    span = int(radius + 1)
    for y in range(int(cy - span), int(cy + span) + 1):
        for x in range(int(cx - span), int(cx + span) + 1):
            if x < 0 or y < 0 or x >= size or y >= size:
                continue
            dx = x + 0.5 - cx
            dy = y + 0.5 - cy
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= radius - 0.8:
                blend(pixels, size, x, y, color)
            elif dist <= radius + 0.4:
                coverage = max(0.0, radius + 0.4 - dist)
                blend(pixels, size, x, y, tuple(color[:3]) + (int(color[3] * min(1.0, coverage)),))


def render(size, background=True, logo_scale=0.66, texture=True, circle=False):
    pixels = bytearray(size * size * 4)
    if background:
        for y in range(size):
            for x in range(size):
                blend(pixels, size, x, y, BG)
    if texture and background:
        step = size / 16.0
        for row in range(1, 16):
            for col in range(1, 16):
                draw_dot(pixels, size, col * step, row * step, max(0.6, size * 0.008), GRID)

    rows = len(PATTERN)
    cols = len(PATTERN[0])
    span = size * logo_scale
    cell = span / max(rows, cols)
    start_x = (size - cell * cols) / 2 + cell / 2
    start_y = (size - cell * rows) / 2 + cell / 2
    radius = cell * 0.30

    for row in range(rows):
        for col in range(cols):
            if PATTERN[row][col] != '1':
                continue
            color = ACCENT if (row, col) in ACCENT_DOTS else DOT
            if row >= rows / 2 and color is DOT:
                color = DOT_DIM
            draw_dot(pixels, size, start_x + col * cell, start_y + row * cell, radius, color)

    if circle:
        centre = (size - 1) / 2.0
        radius = size / 2.0 - 1
        for y in range(size):
            for x in range(size):
                dx = x - centre
                dy = y - centre
                if (dx * dx + dy * dy) ** 0.5 > radius:
                    index = (y * size + x) * 4
                    pixels[index:index + 4] = b'\x00\x00\x00\x00'
    return pixels


def build_web_icons():
    os.makedirs(WEB_OUT, exist_ok=True)
    targets = [
        ('icon-192.png', 192, dict(background=True, logo_scale=0.62)),
        ('icon-512.png', 512, dict(background=True, logo_scale=0.62)),
        ('icon-maskable-512.png', 512, dict(background=True, logo_scale=0.50)),
        ('icon-1024.png', 1024, dict(background=True, logo_scale=0.62)),
    ]
    for name, size, options in targets:
        write_png(os.path.join(WEB_OUT, name), size, size, render(size, **options))
        print('✔ icons/' + name)
    with open(os.path.join(WEB_OUT, 'favicon.svg'), 'w') as handle:
        handle.write(FAVICON)
    print('✔ icons/favicon.svg')


def build_android_icons():
    # legacy launcher icons: 48dp baseline
    launcher = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
    # adaptive foreground: 108dp canvas, mark inside the 66dp safe zone
    foreground = {'mdpi': 108, 'hdpi': 162, 'xhdpi': 216, 'xxhdpi': 324, 'xxxhdpi': 432}
    for density, size in launcher.items():
        folder = os.path.join(ANDROID_RES, 'mipmap-' + density)
        os.makedirs(folder, exist_ok=True)
        write_png(
            os.path.join(folder, 'ic_launcher.png'),
            size,
            size,
            render(size, background=True, logo_scale=0.68, texture=False),
        )
        write_png(
            os.path.join(folder, 'ic_launcher_round.png'),
            size,
            size,
            render(size, background=True, logo_scale=0.62, texture=False, circle=True),
        )
        print(f'✔ android mipmap-{density}/ic_launcher(.round).png')

    for density, size in foreground.items():
        folder = os.path.join(ANDROID_RES, 'mipmap-' + density)
        os.makedirs(folder, exist_ok=True)
        write_png(
            os.path.join(folder, 'ic_launcher_foreground.png'),
            size,
            size,
            render(size, background=False, logo_scale=0.42, texture=False),
        )
    print('✔ android mipmap-*/ic_launcher_foreground.png')



def main():
    build_web_icons()
    if os.path.isdir(os.path.join(ROOT, 'android')):
        build_android_icons()


if __name__ == '__main__':
    main()
