# -*- coding: utf-8 -*-
"""生成安卓启动图标（纯像素绘制，不依赖 Pillow）。
   纸底 + 一根试管，三颗瓷釉球：墨黑 / 朱红 / 松绿。"""
import os, zlib, struct

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

PAPER = (0xF2, 0xEE, 0xE4)
INK   = (0x1F, 0x1C, 0x16)
RED   = (0xB4, 0x40, 0x2C)
GREEN = (0x2F, 0x6B, 0x63)
GLASS = (0x6E, 0x67, 0x58)

SS = 4  # 超采样倍数


def draw(unit=512):
    n = unit * SS
    buf = [[PAPER for _ in range(n)] for _ in range(n)]

    def put(x, y, c):
        if 0 <= x < n and 0 <= y < n:
            buf[y][x] = c

    def circle(cx, cy, r, c):
        cx *= n; cy *= n; r *= n
        x0, x1 = int(cx - r) - 1, int(cx + r) + 1
        y0, y1 = int(cy - r) - 1, int(cy + r) + 1
        for y in range(max(0, y0), min(n, y1 + 1)):
            dy = y + 0.5 - cy
            for x in range(max(0, x0), min(n, x1 + 1)):
                dx = x + 0.5 - cx
                if dx * dx + dy * dy <= r * r:
                    put(x, y, c)

    # ---- 试管轮廓：上端开口，下端半圆 ----
    cx, half = 0.5, 0.150
    top, bottom = 0.045, 0.860
    stroke = 0.028
    yb = bottom * n
    yc = yb - half * n
    yt = top * n
    hw = half * n
    sw = stroke * n / 2

    for y in range(int(yt) - 3, int(yb) + 4):
        for x in range(int((cx - half) * n) - 3, int((cx + half) * n) + 4):
            px, py = x + 0.5, y + 0.5
            if py < yt:
                continue
            if py <= yc:
                d = min(abs(px - (cx * n - hw)), abs(px - (cx * n + hw)))
            else:
                d = abs(((px - cx * n) ** 2 + (py - yc) ** 2) ** 0.5 - hw)
            if d <= sw:
                put(x, y, GLASS)

    # ---- 三颗球 ----
    r = 0.115
    y_bot = (yb - half * n) / n + 0.0  # 半圆圆心高度
    c1 = y_bot + (hw / n) - r - 0.012
    for i, c in enumerate([INK, RED, GREEN]):
        circle(cx, c1 - i * (r * 2.02), r, c)

    # ---- 降采样 ----
    out = bytearray()
    for y in range(unit):
        out.append(0)
        for x in range(unit):
            ar = ag = ab = 0
            for sy in range(SS):
                row = buf[y * SS + sy]
                for sx in range(SS):
                    p = row[x * SS + sx]
                    ar += p[0]; ag += p[1]; ab += p[2]
            k = SS * SS
            out += bytes((ar // k, ag // k, ab // k, 255))
    return bytes(out)


def png(path, unit, raw):
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)
    head = struct.pack('>IIBBBBB', unit, unit, 8, 6, 0, 0, 0)
    body = zlib.compress(raw, 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', head))
        f.write(chunk(b'IDAT', body))
        f.write(chunk(b'IEND', b''))


if __name__ == '__main__':
    cache = {}
    for dens, size in [('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)]:
        d = os.path.join(ROOT, 'res', 'mipmap-' + dens)
        os.makedirs(d, exist_ok=True)
        key = size
        if key not in cache:
            cache[key] = draw(size)
        p = os.path.join(d, 'ic_launcher.png')
        png(p, size, cache[key])
        print('wrote', p, size)
