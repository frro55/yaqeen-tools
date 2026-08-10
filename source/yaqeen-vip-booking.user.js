// ==UserScript==
// @name         Yaqeen Tool - إضافة حجز VIP
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يفتح فورم لتعبئة بيانات حجز VIP ويضيفه مباشرة لقاعدة بيانات موقع vip-reservations (بنفس الطريقة اللي يستخدمها الموقع نفسه)، مع خيار إرسال رسالة القروب فوراً
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      ycguqfilerlkrukiykiy.supabase.co
// @connect      api.yaqeen-vip.space
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لنفس سبب باقي الأدوات - GM_xmlhttpRequest
    // يشغّل السكربت بوضع sandbox معزول عن window الحقيقية لصفحة يقين
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // ==========================================================
    // نفس إعدادات موقع vip-reservations (js/config.js بذاك الريبو) - أي
    // تغيير هناك (خصوصاً SUPABASE_ANON_KEY لو تغيّر يوماً) لازم ينعكس هنا يدوياً
    // ==========================================================
    const SUPABASE_URL = 'https://ycguqfilerlkrukiykiy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ3VxZmlsZXJsa3J1a2l5a2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTY0MTMsImV4cCI6MjA5NjQ3MjQxM30.mcA2Bak3OFZSVnz00vAjY68UUaFOh_fmD-b5aCwfyF4';

    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        defaultTarget: '120363021290047142@g.us', // قروب VIP - نفس الافتراضي بالموقع
    };

    const GROUP_LIST = ['A', 'B', 'C', 'D', 'E', 'G', 'F-i', 'GA', 'GB', 'GC', 'IDC-A', 'TA', 'XB', 'XA', 'XC', 'GXI'];
    const DISC_LIST = ['10%', '15%', '20%', '25%', '30%', '35%', '40%', '45%', '50%'];
    const INS_LIST = ['عادي', 'شامل'];
    const MGR_LIST = ['انمار عطية', 'احمد هجرس', 'يحيى هتاني', 'عبدالله الغامدي', 'حياة الرايقي'];

    // نفس قالب الرسالة الافتراضي بالموقع (DEFAULT_WA_TEMPLATE بـjs/config.js) -
    // لو المستخدم غيّر القالب من إعدادات الموقع، هذي النسخة هنا ما تتحدّث تلقائياً
    const WA_TEMPLATE =
        '*📋 حجز VIP*\n' +
        '───────────────\n' +
        '*الاسم:* {name}\n' +
        '*رقم الهوية:* {idNum}\n' +
        '*رقم الجوال:* {phone}\n' +
        '*رقم الحجز:* {bookNum}\n' +
        '*رقم الاتفاقية:* {agreementNum}\n' +
        '───────────────\n' +
        '*السيارة:* {car}\n' +
        '*رقم اللوحة:* {plate}\n' +
        '*الفئة:* {grp}  •  *الأبگريد:* {upg}\n' +
        '───────────────\n' +
        '*الاستلام:* {date}  •  *الوقت المتبقي:* {timeLeft}\n' +
        '*المدة:* {days} أيام  •  *التأمين:* {ins}  •  *الخصم:* {disc}\n' +
        '───────────────\n' +
        '*الحالة:* {status}\n' +
        '───────────────\n' +
        '*📝 ملاحظات:* {notes}';

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "vip-booking-add",
            name: "⭐ إضافة حجز VIP",
            run() {
                runVipBookingTool();
            }
        });
    }

    // ==========================================================
    // اتصال بـSupabase (REST مباشر - نفس ما يسويه موقع vip-reservations من المتصفح)
    // ==========================================================

    function supabaseRequest(method, path, body) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: SUPABASE_URL + path,
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                data: body ? JSON.stringify(body) : undefined,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        console.error('[إضافة حجز VIP] فشل طلب Supabase:', response.status, response.responseText);
                        reject(new Error('فشل الاتصال بقاعدة بيانات VIP (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بقاعدة بيانات VIP')),
            });
        });
    }

    /** نفس منطق nextId() بموقع vip-reservations (js/utils.js) - يحسب رقم الحجز التالي بالتسلسل */
    async function computeNextId() {
        const text = await supabaseRequest('GET', '/rest/v1/reservations?select=id', null);
        let rows = [];
        try { rows = JSON.parse(text) || []; } catch (err) { rows = []; }
        const nums = rows.map(r => {
            const m = (r.id || '').match(/^VIP-(\d+)$/);
            return m ? +m[1] : 0;
        });
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        return 'VIP-' + String(next).padStart(3, '0');
    }

    function insertReservation(record) {
        return supabaseRequest('POST', '/rest/v1/reservations', [record]);
    }

    function sendToBot(message, target) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: WHATSAPP_CONFIG.apiUrl,
                headers: {
                    Authorization: WHATSAPP_CONFIG.apiKey,
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ message: message, target: target }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve();
                    } else {
                        reject(new Error('فشل إرسال الواتساب (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    // ==========================================================
    // بناء رسالة الواتساب - نفس منطق applyTemplate() بـjs/whatsapp.js
    // بموقع vip-reservations (يشيل السطور/الأقسام الفاضية تلقائياً)
    // ==========================================================

    function fmtDateAr(v) {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function timeLeftText(v) {
        if (!v) return '';
        const diff = new Date(v) - Date.now();
        if (isNaN(diff) || diff <= 0) return '';
        const totalH = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        if (totalH === 0) return mins + ' دقيقة';
        if (totalH < 24) return mins > 0 ? totalH + ' ساعة ' + mins + ' د' : totalH + ' ساعة';
        const days = Math.floor(totalH / 24), remH = totalH % 24;
        return remH > 0 ? days + ' يوم و ' + remH + ' ساعة' : days + ' يوم';
    }

    function buildWaMessage(r) {
        const vals = {
            name: r.name || '', idNum: r.id_num || '', phone: r.phone || '',
            bookNum: r.book_num || '', agreementNum: r.agreement_num || '',
            car: r.car || '', plate: r.plate || '', grp: r.grp || '', upg: r.upg || '',
            disc: r.disc || '', ins: r.ins || '', days: r.days || '',
            date: fmtDateAr(r.date), timeLeft: timeLeftText(r.date),
            status: 'حجز جديد', notes: r.notes || '',
        };

        const SEP = '───────────────';

        function cleanLine(line) {
            if (!line.includes('  •  ')) {
                const keys = [...line.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
                if (!keys.length) return line;
                return keys.some(k => vals[k]) ? line : null;
            }
            const kept = line.split('  •  ').filter(seg => {
                const keys = [...seg.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
                return !keys.length || keys.some(k => vals[k]);
            });
            return kept.length ? kept.join('  •  ') : null;
        }

        const sections = WA_TEMPLATE.split(SEP);
        const built = [];
        for (let i = 0; i < sections.length; i++) {
            const cleanedLines = sections[i].split('\n').map(cleanLine).filter(l => l !== null);
            const hasContent = cleanedLines.some(l => l.trim() !== '');
            if (i === 0) built.push(cleanedLines.join('\n'));
            else if (hasContent) built.push(SEP, cleanedLines.join('\n'));
        }

        let msg = built.join('');
        Object.keys(vals).forEach(k => { msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), vals[k]); });
        return msg.trim();
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function overlayShell(innerHtml, width) {
        return (
            '<div id="vip-booking-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:' + width + 'px;max-height:90vh;overflow-y:auto;background:#fff;border-radius:16px;padding:22px;' +
            'text-align:center;direction:rtl;">' + innerHtml + '</div></div>'
        );
    }

    function closeBox() {
        document.getElementById('vip-booking-box')?.remove();
    }

    function showMessage(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div style="margin-bottom:15px;white-space:pre-line;">' + text + '</div>' +
            '<button id="vip-booking-close" style="' +
            'padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>',
            340
        ));
        document.getElementById('vip-booking-close').onclick = closeBox;
    }

    function showLoading(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(text, 320));
    }

    function selectHtml(id, label, options, selected) {
        const opts = ['<option value="">— اختر —</option>'].concat(
            options.map(o => '<option value="' + escapeHtml(o) + '"' + (o === selected ? ' selected' : '') + '>' + escapeHtml(o) + '</option>')
        ).join('');
        return (
            '<div style="text-align:right;margin-bottom:10px;">' +
            '<label style="display:block;font-size:12.5px;color:#555;margin-bottom:4px;">' + label + '</label>' +
            '<select id="' + id + '" style="width:100%;padding:9px;border:1px solid #ddd;border-radius:8px;font-size:13px;">' + opts + '</select>' +
            '</div>'
        );
    }

    function textHtml(id, label, type, required) {
        return (
            '<div style="text-align:right;margin-bottom:10px;">' +
            '<label style="display:block;font-size:12.5px;color:#555;margin-bottom:4px;">' + label + '</label>' +
            '<input id="' + id + '" type="' + type + '"' + (required ? ' required' : '') + ' style="' +
            'width:100%;padding:9px;border:1px solid #ddd;border-radius:8px;font-size:13px;box-sizing:border-box;" />' +
            '</div>'
        );
    }

    function showForm() {
        closeBox();

        const grid2 = 'display:grid;grid-template-columns:1fr 1fr;gap:0 10px;';

        const html =
            '<div style="font-size:16px;font-weight:bold;margin-bottom:14px;">⭐ إضافة حجز VIP</div>' +
            '<div style="' + grid2 + '">' +
            textHtml('vip-f-name', 'اسم العميل *', 'text', true) +
            textHtml('vip-f-id_num', 'رقم الهوية', 'text', false) +
            textHtml('vip-f-phone', 'الجوال', 'text', false) +
            textHtml('vip-f-book_num', 'رقم الحجز', 'text', false) +
            textHtml('vip-f-agreement_num', 'رقم الاتفاقية', 'text', false) +
            textHtml('vip-f-car', 'السيارة', 'text', false) +
            textHtml('vip-f-plate', 'رقم اللوحة', 'text', false) +
            selectHtml('vip-f-grp', 'الفئة', GROUP_LIST, '') +
            selectHtml('vip-f-upg', 'الأبگريد', GROUP_LIST, '') +
            selectHtml('vip-f-disc', 'الخصم', DISC_LIST, '') +
            selectHtml('vip-f-ins', 'التأمين', INS_LIST, 'عادي') +
            textHtml('vip-f-days', 'عدد الأيام', 'number', false) +
            textHtml('vip-f-date', 'تاريخ الاستلام *', 'datetime-local', true) +
            selectHtml('vip-f-mgr', 'المدير', MGR_LIST, '') +
            '</div>' +
            '<div style="text-align:right;margin-bottom:14px;">' +
            '<label style="display:block;font-size:12.5px;color:#555;margin-bottom:4px;">ملاحظات</label>' +
            '<textarea id="vip-f-notes" rows="2" style="width:100%;padding:9px;border:1px solid #ddd;border-radius:8px;' +
            'font-size:13px;box-sizing:border-box;resize:vertical;"></textarea>' +
            '</div>' +
            '<div id="vip-form-err" style="color:#dc2626;font-size:12.5px;font-weight:bold;margin-bottom:10px;display:none;"></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button id="vip-form-cancel" style="flex:1;padding:12px;border:none;border-radius:8px;' +
            'cursor:pointer;background:#eee;color:#333;font-size:14px;">إلغاء</button>' +
            '<button id="vip-form-save" style="flex:1;padding:12px;border:none;border-radius:8px;' +
            'cursor:pointer;background:#ddd;color:#333;font-size:13.5px;">💾 حفظ فقط</button>' +
            '<button id="vip-form-save-send" style="flex:1;padding:12px;border:none;border-radius:8px;' +
            'cursor:pointer;background:#A3E635;font-size:13.5px;">📩 حفظ وإرسال للقروب</button>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 480));

        document.getElementById('vip-form-cancel').onclick = closeBox;
        document.getElementById('vip-form-save').onclick = () => handleSave(false);
        document.getElementById('vip-form-save-send').onclick = () => handleSave(true);
    }

    function readFormValues() {
        const val = id => (document.getElementById(id).value || '').trim();
        return {
            name: val('vip-f-name'),
            id_num: val('vip-f-id_num'),
            phone: val('vip-f-phone'),
            book_num: val('vip-f-book_num'),
            agreement_num: val('vip-f-agreement_num'),
            car: val('vip-f-car'),
            plate: val('vip-f-plate'),
            grp: val('vip-f-grp'),
            upg: val('vip-f-upg'),
            disc: val('vip-f-disc'),
            ins: val('vip-f-ins'),
            days: val('vip-f-days'),
            dateRaw: val('vip-f-date'),
            mgr: val('vip-f-mgr'),
            notes: val('vip-f-notes'),
        };
    }

    function showFormError(text) {
        const el = document.getElementById('vip-form-err');
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
    }

    async function handleSave(sendWa) {
        const errEl = document.getElementById('vip-form-err');
        if (errEl) errEl.style.display = 'none';

        const f = readFormValues();

        if (!f.name) {
            showFormError('⚠️ اسم العميل مطلوب');
            return;
        }
        if (!f.dateRaw) {
            showFormError('⚠️ تاريخ الاستلام مطلوب');
            return;
        }
        const dateObj = new Date(f.dateRaw);
        if (isNaN(dateObj.getTime()) || dateObj <= new Date()) {
            showFormError('⚠️ لازم يكون تاريخ الاستلام بالمستقبل');
            return;
        }

        showLoading('جارٍ الحفظ...');

        try {
            const id = await computeNextId();
            const record = {
                id: id,
                name: f.name,
                id_num: f.id_num || null,
                phone: f.phone || null,
                book_num: f.book_num || null,
                agreement_num: f.agreement_num || null,
                car: f.car || null,
                plate: f.plate || null,
                grp: f.grp || null,
                upg: f.upg || null,
                disc: f.disc || null,
                ins: f.ins || null,
                days: f.days ? parseInt(f.days, 10) : null,
                date: dateObj.toISOString(),
                mgr: f.mgr || null,
                status: 'new',
                notes: f.notes || null,
                wa_target: WHATSAPP_CONFIG.defaultTarget,
            };

            await insertReservation(record);

            if (sendWa) {
                try {
                    await sendToBot(buildWaMessage(record), WHATSAPP_CONFIG.defaultTarget);
                } catch (waErr) {
                    showMessage('✅ تم إنشاء الحجز ' + id + ' بنجاح.\n\n⚠️ لكن تعذّر إرسال رسالة الواتساب: ' + waErr.message);
                    return;
                }
                showMessage('✅ تم إنشاء الحجز ' + id + ' وإرسال الرسالة للقروب بنجاح.');
                return;
            }

            showMessage('✅ تم إنشاء الحجز ' + id + ' بنجاح.');

        } catch (err) {
            showMessage('تعذّر حفظ الحجز: ' + err.message);
        }
    }

    async function runVipBookingTool() {
        showForm();
    }

    waitCore();

})();
