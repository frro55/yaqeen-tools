# أدوات يقين (Tampermonkey)

## البنية

```
tampermonkey/
  source/              # الكود المصدري لكل أداة (عدّل هنا فقط)
    yaqeen-core.user.js
    yaqeen-*.user.js
  build/                # ناتج التوليد (لا تعدّله يدوياً)
    yaqeen-all-tools.user.js
  build-bundle.sh        # يدمج كل ملفات source/ بملف build/ واحد
  index.html              # صفحة التثبيت (زر واحد)
```

## طريقة التحديث

1. عدّل الأداة المطلوبة داخل `tampermonkey/source/`.
2. شغّل من جذر الريبو:
   ```
   bash tampermonkey/build-bundle.sh
   ```
   هذا يتحقق من صحة الكود (`node --check`) وينتج
   `tampermonkey/build/yaqeen-all-tools.user.js` محدَّثاً.
3. ادفع (commit + push) التعديل لنفس الريبو.
4. على الـVPS: اسحب آخر نسخة وانسخ الملف الناتج لمجلد `tools` اللي يخدمه
   السيرفر، ثم أعد تشغيل العملية. مثال:
   ```
   cd ~/whatsapp-baileys/tools/yaqeen-tools
   git pull
   cp build/yaqeen-all-tools.user.js ../yaqeen-all-tools.user.js
   pm2 restart whatsapp-api
   ```

بعدها Tampermonkey (عندك وعند كل موظف مثبّت الأداة) يكتشف رقم الإصدار
الجديد ويحدّث نفسه تلقائياً - بدون أي تدخل يدوي إضافي.

## ملاحظات مهمة

- **لا تعدّل** `build/yaqeen-all-tools.user.js` مباشرة - أي تعديل فيه
  يُفقد بأول توليد جديد. المصدر الوحيد للتعديل هو مجلد `source/`.
- ترتيب الدمج داخل `build-bundle.sh` مهم: `yaqeen-core.user.js` لازم
  يكون أول ملف (هو اللي يبني `YAQEEN_TOOLS` اللي تسجّل فيه بقية الأدوات).
  ترتيب ظهور الأدوات بقائمة الواجهة نفسها محدَّد بمصفوفة `TOOL_ORDER`
  داخل `source/yaqeen-core.user.js`، لا علاقة له بترتيب الدمج.
- كل أداة تقدر تُثبَّت منفردة أيضاً (كل ملف بمجلد `source/` سكربت كامل
  بحد ذاته)، لكن التوزيع الموصى به للموظفين هو ملف `build/yaqeen-all-tools.user.js`
  الموحّد عبر صفحة `index.html`.
- الملفات اللي تحتاج تُستضاف فعلياً على الـVPS (تحت مسار `/tools`): كل
  محتويات `source/` + `build/yaqeen-all-tools.user.js` + `index.html`.
