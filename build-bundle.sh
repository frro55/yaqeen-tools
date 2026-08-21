#!/usr/bin/env bash
# يولّد build/yaqeen-all-tools.user.js بدمج كل ملفات source/*.user.js
# (Core أولاً، ثم بقية الأدوات) بسكربت واحد قابل للتثبيت بضغطة وحدة.
# شغّله من جذر الريبو: bash build-bundle.sh
set -euo pipefail
cd "$(dirname "$0")"

SOURCE_DIR=source
BUILD_DIR=build
BUNDLE="$BUILD_DIR/yaqeen-all-tools.user.js"

mkdir -p "$BUILD_DIR"

# رقم إصدار يزيد تلقائياً بكل توليد (تاريخ+وقت) - لازم يتغيّر بكل بناء
# عشان Tampermonkey يكتشف فعلياً وجود نسخة أحدث عبر @updateURL ويحدّث
# تلقائياً. ترك @version ثابت (كان 1.0.0 دايماً) يعني التحديث التلقائي ما
# يشتغل إطلاقاً - المتصفح يفضل شغّال بآخر نسخة تم تثبيتها يدوياً فقط.
VERSION="$(date -u +%Y.%m%d.%H%M)"

cat > "$BUNDLE" << HDREOF
// ==UserScript==
// @name         Yaqeen Tools - الكل بملف واحد
// @namespace    https://yaqeen.lumirental.com/
// @version      $VERSION
// @description  حزمة موحّدة تجمع كل أدوات يقين (Core + كل الأدوات) بملف تثبيت واحد
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      api.yaqeen-vip.space
// @connect      cdn.lumirental.com
// @connect      mpos.geidea.net
// @connect      ycguqfilerlkrukiykiy.supabase.co
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

// ============================================================
// ملف مُولَّد آلياً بدمج كل ملفات source/*.user.js بمصدر واحد.
// لا تعدّل هذا الملف مباشرة - عدّل الملف الأصلي المقابل بمجلد source وأعد
// التوليد (bash build-bundle.sh) وارفع الناتج على الـVPS.
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
  yaqeen-late-payments-branches-report.user.js
  yaqeen-company-extension-report.user.js
  yaqeen-company-extension-branches-report.user.js
  yaqeen-closed-as-debt-report.user.js
  yaqeen-closed-as-debt-branches-report.user.js
  yaqeen-customer-messages.user.js
  yaqeen-booking-report.user.js
  yaqeen-returned-vehicles-report.user.js
  yaqeen-verify-returned-vehicles.user.js
  yaqeen-vip-booking.user.js
  yaqeen-ai-chat.user.js
  yaqeen-shift-report.user.js
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
