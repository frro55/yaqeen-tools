#!/usr/bin/env bash
# يولّد tampermonkey/build/yaqeen-all-tools.user.js بدمج كل ملفات
# tampermonkey/source/*.user.js (Core أولاً، ثم بقية الأدوات) بسكربت واحد
# قابل للتثبيت بضغطة وحدة.
# شغّله من جذر الريبو: bash tampermonkey/build-bundle.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SOURCE_DIR=tampermonkey/source
BUILD_DIR=tampermonkey/build
BUNDLE="$BUILD_DIR/yaqeen-all-tools.user.js"

mkdir -p "$BUILD_DIR"

cat > "$BUNDLE" << 'HDREOF'
// ==UserScript==
// @name         Yaqeen Tools - الكل بملف واحد
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0.0
// @description  حزمة موحّدة تجمع كل أدوات يقين (Core + كل الأدوات) بملف تثبيت واحد
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      api.yaqeen-vip.space
// @connect      cdn.lumirental.com
// @connect      mpos.geidea.net
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

// ============================================================
// ملف مُولَّد آلياً بدمج كل ملفات tampermonkey/source/*.user.js بمصدر واحد.
// لا تعدّل هذا الملف مباشرة - عدّل الملف الأصلي المقابل بمجلد source وأعد
// التوليد (bash tampermonkey/build-bundle.sh) وارفع الناتج على الـVPS.
// ترتيب الدمج: Core أولاً (يبني YAQEEN_TOOLS)، ثم بقية الأدوات.
// ============================================================
HDREOF

# ملاحظة: ترتيب هذي القائمة يحدد ترتيب التنفيذ الفعلي عند التحميل (Core لازم
# يكون أول واحد لأنه يبني YAQEEN_TOOLS اللي تسجّل فيه بقية الأدوات) - لا علاقة
# له بترتيب الظهور بالقائمة (ذاك محدد بـTOOL_ORDER داخل Core نفسه)
FILES=(
  yaqeen-core.user.js
  yaqeen-fleet-inventory.user.js
  yaqeen-available-vehicles.user.js
  yaqeen-email-tools.user.js
  yaqeen-payment-verify.user.js
  yaqeen-airport-hours-report.user.js
  yaqeen-late-payments-report.user.js
  yaqeen-company-extension-report.user.js
  yaqeen-booking-report.user.js
)

for f in "${FILES[@]}"; do
  {
    echo ""
    echo "// ============================================================"
    echo "// المصدر: $SOURCE_DIR/$f"
    echo "// ============================================================"
    awk '/^\/\/ ==\/UserScript==$/{found=1; next} found' "$SOURCE_DIR/$f"
  } >> "$BUNDLE"
done

node --check "$BUNDLE"
echo "تم توليد $BUNDLE بنجاح"
