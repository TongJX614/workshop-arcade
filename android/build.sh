#!/usr/bin/env bash
# 打包「工坊游戏集」安卓 APK（不依赖 Gradle，直接用 aapt2 + javac + d8 + apksigner）
set -euo pipefail

ANDROID="C:/Users/tongj/.workbuddy/binaries/android"
SDK="$ANDROID/sdk"
BT="$SDK/build-tools/34.0.0"
PLATFORM="$SDK/platforms/android-35/android.jar"
export JAVA_HOME="$ANDROID/jdk/jdk-17.0.20.1+1"
export PATH="$JAVA_HOME/bin:$PATH"
PY="C:/Users/tongj/.workbuddy/binaries/python/versions/3.13.12/python.exe"

PROJ="C:/Users/tongj/Desktop/游戏/android"
cd "$PROJ"

mkdir -p build/gen build/classes build/dex dist

echo "== 1/5 aapt2 编译资源 =="
"$BT/aapt2.exe" compile --dir res -o build/res.zip
echo "   ok"

echo "== 2/5 aapt2 链接 =="
"$BT/aapt2.exe" link \
  -o build/base.apk \
  -I "$PLATFORM" \
  --manifest AndroidManifest.xml \
  -R build/res.zip \
  --java build/gen \
  --min-sdk-version 21 \
  --target-sdk-version 34 \
  --auto-add-overlay
echo "   ok"

echo "== 3/5 javac + d8 =="
SRCS=$(find src build/gen -name '*.java')
"$JAVA_HOME/bin/javac.exe" -source 8 -target 8 -nowarn \
  -bootclasspath "$PLATFORM" -classpath "$PLATFORM" \
  -encoding UTF-8 -d build/classes $SRCS 2>&1 | grep -v 'bootstrap class path' || true
CLS=$(find build/classes -name '*.class')
"$BT/d8.bat" --release --min-api 21 --lib "$PLATFORM" --output build/dex $CLS
echo "   dex: $(stat -c%s build/dex/classes.dex) bytes"

echo "== 4/5 打包网页资源 =="
"$PY" tools/pack.py

echo "== 5/5 对齐 + 签名 =="
"$BT/zipalign.exe" -f -p 4 build/unsigned.apk build/aligned.apk
if [ ! -f keystore.jks ]; then
  "$JAVA_HOME/bin/keytool.exe" -genkeypair -keystore keystore.jks -alias arcade \
    -storepass arcade2024 -keypass arcade2024 \
    -dname "CN=Workshop Set, OU=Games, O=Workshop, L=Beijing, C=CN" \
    -keyalg RSA -keysize 2048 -validity 12000 -noprompt
  echo "   已生成签名密钥 keystore.jks"
fi
OUT="dist/arcade-1.7.apk"
"$BT/apksigner.bat" sign \
  --ks keystore.jks --ks-pass pass:arcade2024 --key-pass pass:arcade2024 \
  --v1-signing-enabled true --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$OUT" build/aligned.apk

"$BT/apksigner.bat" verify --print-certs "$OUT" | head -4
# 中文文件名交给 python 复制，避免 bash 在 Windows 下的编码问题
"$PY" -c "
import glob, os, shutil
for f in glob.glob('dist/*.idsig'):
    os.remove(f)
dst = 'dist/工坊游戏集-v1.7.apk'
shutil.copyfile('$OUT', dst)
print('   ', dst, os.path.getsize(dst), 'bytes')
"
ls -lh dist/
echo "== 完成 =="
