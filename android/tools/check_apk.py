# -*- coding: utf-8 -*-
"""校验 APK：清单、dex、资源、网页资源完整性，以及页面内所有链接是否都能命中包内文件。"""
import os, re, zipfile, sys, posixpath

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APK = os.path.join(PROJ, 'dist', 'arcade-1.6.apk')

RE_LINK = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"')
RE_JS_PATH = re.compile(r"location\.href\s*=\s*[^'\"]*['\"]([^'\"]+\.html)['\"]")

def main():
    z = zipfile.ZipFile(APK)
    names = set(z.namelist())
    problems = []

    for need in ('AndroidManifest.xml', 'resources.arsc', 'classes.dex'):
        if need not in names:
            problems.append('缺 ' + need)

    pages = [n for n in names if n.startswith('assets/arcade/') and n.endswith(('.html', '.css', '.js'))]
    print('包内网页文件 %d 个：' % len(pages))
    for p in sorted(pages):
        print('   %-40s %6.1f KB' % (p, z.getinfo(p).file_size / 1024.0))

    checked = 0
    for p in pages:
        if not p.endswith('.html'):
            continue
        text = z.read(p).decode('utf-8', 'ignore')
        html_dir = posixpath.dirname(p)
        for raw in RE_LINK.findall(text) + RE_JS_PATH.findall(text):
            if raw.startswith(('#', 'data:', 'http:', 'https:', 'mailto:', 'javascript:')):
                continue
            target = posixpath.normpath(posixpath.join(html_dir, raw.split('?')[0].split('#')[0]))
            checked += 1
            if target not in names:
                problems.append('%s -> %s（包内不存在）' % (p, raw))
    print('检查内链 %d 条' % checked)

    # 网页不应引用任何外网资源
    for p in pages:
        text = z.read(p).decode('utf-8', 'ignore')
        for m in re.findall(r'(?:href|src)\s*=\s*"(https?://[^"]+)"', text):
            problems.append('%s 引用了外网资源 %s' % (p, m))

    dex = z.read('classes.dex')
    if not dex.startswith(b'dex\n'):
        problems.append('classes.dex 头部异常')

    if problems:
        print('\n发现问题：')
        for x in problems:
            print('  ✘', x)
        return 1
    print('\n✔ APK 结构完整，所有内链均命中包内文件，无外网依赖')
    return 0

if __name__ == '__main__':
    sys.exit(main())
