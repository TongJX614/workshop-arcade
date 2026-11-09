# -*- coding: utf-8 -*-
"""把网页资源与 classes.dex 打进 aapt2 生成的 APK，输出 build/unsigned.apk。
   直接从 arcade/ 目录读取，只挑选需要的文件，不做中间拷贝。"""
import os, sys, zipfile

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCADE = os.path.abspath(os.path.join(PROJ, '..', 'arcade'))
BASE = os.path.join(PROJ, 'build', 'base.apk')
OUT = os.path.join(PROJ, 'build', 'unsigned.apk')
DEX = os.path.join(PROJ, 'build', 'dex', 'classes.dex')

SKIP_DIR = {'tools', '.workbuddy', 'node_modules'}
SKIP_PREFIX = ('_', '.')
SKIP_EXT = ('.md',)


def collect():
    items = []
    for root, dirs, files in os.walk(ARCADE):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIR and not d.startswith(SKIP_PREFIX))
        for f in sorted(files):
            if f.startswith(SKIP_PREFIX) or f.lower().endswith(SKIP_EXT):
                continue
            full = os.path.join(root, f)
            rel = os.path.relpath(full, ARCADE).replace('\\', '/')
            items.append((full, 'assets/arcade/' + rel))
    return items


def main():
    if not os.path.exists(BASE):
        sys.exit('缺少 build/base.apk')
    items = collect()
    if os.path.exists(OUT):
        os.remove(OUT)

    with zipfile.ZipFile(BASE, 'r') as src, \
         zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            dst.writestr(info, src.read(info.filename))
        # classes.dex 不压缩（体积小、启动快）
        with open(DEX, 'rb') as f:
            zi = zipfile.ZipInfo('classes.dex')
            zi.compress_type = zipfile.ZIP_DEFLATED
            dst.writestr(zi, f.read())
        total = 0
        for full, arc in items:
            with open(full, 'rb') as f:
                data = f.read()
            total += len(data)
            zi = zipfile.ZipInfo(arc)
            zi.compress_type = zipfile.ZIP_DEFLATED
            dst.writestr(zi, data)
    print('   打包 %d 个网页文件，%.1f KB' % (len(items), total / 1024.0))
    print('   unsigned.apk: %.1f KB' % (os.path.getsize(OUT) / 1024.0))


if __name__ == '__main__':
    main()
