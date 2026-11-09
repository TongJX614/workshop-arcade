# -*- coding: utf-8 -*-
"""同步网页资源到 assets/arcade，并清理构建目录。
   用 Python 做删除，避免 shell 的 rm 被安全策略拦截。"""
import os, shutil, sys

PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCADE = os.path.abspath(os.path.join(PROJ, '..', 'arcade'))
DEST = os.path.join(PROJ, 'assets', 'arcade')

SKIP_DIR = {'tools', '.workbuddy', 'node_modules'}
SKIP_PREFIX = ('_', '.')
SKIP_EXT = ('.md',)


def wipe(p):
    if os.path.isdir(p):
        shutil.rmtree(p, ignore_errors=True)
    elif os.path.exists(p):
        try:
            os.remove(p)
        except OSError:
            pass


def sync():
    wipe(DEST)
    os.makedirs(DEST, exist_ok=True)
    n = 0
    for root, dirs, files in os.walk(ARCADE):
        dirs[:] = [d for d in dirs if d not in SKIP_DIR and not d.startswith(SKIP_PREFIX)]
        rel = os.path.relpath(root, ARCADE)
        target = DEST if rel == '.' else os.path.join(DEST, rel)
        os.makedirs(target, exist_ok=True)
        for f in files:
            if f.startswith(SKIP_PREFIX) or f.lower().endswith(SKIP_EXT):
                continue
            shutil.copy2(os.path.join(root, f), os.path.join(target, f))
            n += 1
    print('   同步 %d 个文件 -> assets/arcade' % n)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'clean':
        for d in ('build', 'dist'):
            wipe(os.path.join(PROJ, d))
        print('   已清理 build/ dist/')
    else:
        sync()
