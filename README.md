# أدوات يقين (Tampermonkey)

هذا المستودع هو **مصدر النشر الفعلي** — الـVPS يسحب منه مباشرة (`git pull`)
ثم ينسخ ملف الحزمة الموحّدة لمكان تقديمه للموظفين. أي تعديل لازم يوصل
هنا أولاً (commit + push)، بعدها ينعكس على الـVPS بخطوة `git pull` بسيطة.

## البنية

```
source/              # الكود المصدري لكل أداة (عدّل هنا فقط)
  yaqeen-core.user.js
  yaqeen-*.user.js
build/                # ناتج التوليد (لا تعدّله يدوياً)
  yaqeen-all-tools.user.js
admin/
  admin-users.html      # لوحة إدارة المستخدمين والصلاحيات
build-bundle.sh          # يدمج كل ملفات source/ بملف build/ واحد
index.html                # صفحة التثبيت (زر واحد)
```

## طريقة التحديث

1. عدّل الأداة المطلوبة داخل `source/`.
2. شغّل من جذر الريبو:
   ```
   bash build-bundle.sh
   ```
   هذا يتحقق من صحة الكود (`node --check`) وينتج `build/yaqeen-all-tools.user.js`
   محدَّثاً برقم إصدار جديد (تاريخ+وقت) - عشان Tampermonkey يكتشف التحديث
   فعلياً عبر `@updateURL`.
3. ادفع (commit + push) التعديل لنفس الريبو.
4. على الـVPS: اسحب آخر نسخة وانسخ الملف الناتج لمكان تقديمه للموظفين،
   ثم أعد تشغيل العملية. مثال:
   ```
   cd ~/whatsapp-baileys/tools/yaqeen-tools
   git pull
   cp build/yaqeen-all-tools.user.js ../yaqeen-all-tools.user.js
   pm2 restart whatsapp-api
   ```
   تأكد بعد النسخ إن رقم النسخة تطابق: `grep "@version" ../yaqeen-all-tools.user.js`
5. لو عدّلت `admin/admin-users.html` أيضاً، انسخه لمكانه المنشور فعلياً
   (`git pull` وحده ما يكفي - نفس درس يوزر بندل الأدوات):
   ```
   cp admin/admin-users.html ~/whatsapp-baileys/tools/adminusers.html
   ```
   ما يحتاج `pm2 restart` (ملف static، Express يقدّمه مباشرة). الصفحة
   منشورة فعلياً على: `https://api.yaqeen-vip.space/tools/adminusers.html`
   (لاحظ الاسم بدون شرطات، ومسار `/tools` لا `/admin` - `express.static`
   لمسار `/admin` مضاف بـbot.js لكن مجلد `~/whatsapp-baileys/admin/`
   نفسه غير موجود على هذا الـVPS، فلا تعتمد عليه).

بعدها Tampermonkey (عندك وعند كل موظف مثبّت الأداة) يكتشف رقم الإصدار
الجديد ويحدّث نفسه تلقائياً - بدون أي تدخل يدوي إضافي (قد يأخذ وقت لأن
Tampermonkey يفحص التحديثات دورياً لا بكل تحميل صفحة؛ لتحديث فوري افتح
رابط التثبيت مباشرة وأعد التثبيت).

## لوحة إدارة المستخدمين

`admin/admin-users.html` تُستضاف بنفس دومين الـAPI (نفس دومين bot.js)
عشان استدعاءات `/api/admin/*` تكون same-origin بدون مشاكل CORS. تحتاج
endpoints جانب السيرفر (`/api/tools`, `/api/admin/*`) مضافة يدوياً
بـbot.js (خارج هذا المستودع).

## ملاحظات مهمة

- **لا تعدّل** `build/yaqeen-all-tools.user.js` مباشرة - أي تعديل فيه
  يُفقد بأول توليد جديد. المصدر الوحيد للتعديل هو مجلد `source/`.
- ترتيب الدمج داخل `build-bundle.sh` مهم: `yaqeen-core.user.js` لازم
  يكون أول ملف (هو اللي يبني `YAQEEN_TOOLS` اللي تسجّل فيه بقية الأدوات).
  ترتيب ظهور الأدوات بقائمة الواجهة نفسها محدَّد بمصفوفة `TOOL_ORDER`
  داخل `source/yaqeen-core.user.js`، لا علاقة له بترتيب الدمج.
- معرّفات الأدوات (`id`) داخل كل ملف `source/*.user.js` (وداخل `TOOL_ORDER`
  بـCore) لازم تطابق حرفياً مفاتيح `tool_key` بجدول `tools` بقاعدة
  البيانات - أي فرق بينهم يخلي الأداة "مفعّلة" بلوحة الإدارة بس ما تظهر
  فعلياً للموظف.
- كل أداة تقدر تُثبَّت منفردة أيضاً (كل ملف بمجلد `source/` سكربت كامل
  بحد ذاته)، لكن التوزيع الموصى به للموظفين هو ملف
  `build/yaqeen-all-tools.user.js` الموحّد عبر صفحة `index.html`.
- الملفات اللي تحتاج تُستضاف فعلياً على الـVPS: `build/yaqeen-all-tools.user.js`
  (تحت مسار `/tools`) + `index.html` + `admin/admin-users.html`.
