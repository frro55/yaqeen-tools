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
                    Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ message: message, target: target, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main' }),
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

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;max-height:90vh;overflow-y:auto;box-sizing:border-box;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:16px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
        '.yq-field.yq-field-err{border-color:#dc2626;}' +
        '.yq-btn{width:100%;padding:13px;margin-top:10px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:15px;font-weight:800;font-family:inherit;}' +
        '.yq-btn-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;' +
        'box-shadow:0 8px 16px -8px rgba(121,169,22,.55);}' +
        '.yq-btn-secondary{background:#f1f0ea;color:#767068;}' +
        '.yq-spinner{width:30px;height:30px;border:3px solid #A3E635;border-left-color:transparent;' +
        'border-radius:50%;margin:0 auto 14px;animation:yq-spin .8s linear infinite;}' +
        '@keyframes yq-spin{to{transform:rotate(360deg);}}' +
        '.yq-toast-wrap{position:fixed;top:28px;left:50%;transform:translateX(-50%);z-index:999999999;' +
        'display:flex;flex-direction:column;gap:10px;width:min(92vw,420px);font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-toast{background:#fff;border-radius:14px;box-shadow:0 16px 34px -12px rgba(0,0,0,.25);' +
        'padding:14px 16px;display:flex;align-items:center;gap:11px;direction:rtl;' +
        'border-inline-start:5px solid #16a34a;animation:yq-toast-in .25s ease;}' +
        '.yq-toast.err{border-inline-start-color:#dc2626;}' +
        '.yq-toast-icon{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;' +
        'justify-content:center;font-size:16px;flex-shrink:0;background:#eaf7e9;}' +
        '.yq-toast.err .yq-toast-icon{background:#fdecec;}' +
        '.yq-toast-text{flex:1;text-align:right;font-size:13.5px;font-weight:700;line-height:1.6;color:#1c1c1a;}' +
        '.yq-toast-close{background:none;border:0;color:#a19c92;font-size:14px;cursor:pointer;padding:4px;flex-shrink:0;}' +
        '@keyframes yq-toast-in{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}' +
        '.vip-field-wrap{text-align:right;margin-bottom:16px;}' +
        '.vip-field-wrap label{display:block;font-size:13px;font-weight:700;color:#767068;margin-bottom:6px;}' +
        '.vip-field-wrap select,.vip-field-wrap input,.vip-field-wrap textarea{width:100%;padding:11px;' +
        'border:1.5px solid #cec7b4;border-radius:10px;font-size:14.5px;box-sizing:border-box;font-family:inherit;' +
        'background:#fbfbf9;color:#1c1c1a;}' +
        '.vip-field-wrap select:focus,.vip-field-wrap input:focus,.vip-field-wrap textarea:focus{' +
        'outline:2px solid #a8cf5a;border-color:#79a916;}' +
        '.vip-field-wrap textarea{resize:vertical;}' +
        '.vip-form-actions{display:flex;gap:8px;}' +
        '.vip-form-actions button{flex:1;padding:12px;border:0;border-radius:12px;cursor:pointer;' +
        'font-size:14px;font-weight:800;font-family:inherit;background:#f1f0ea;color:#1c1c1a;}' +
        '.vip-form-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-btn:not(.yq-btn-primary):not(.yq-btn-secondary):hover{background:#f5f3ec;border-color:#a19c92;}' +
        '.yq-btn-secondary:hover{background:#e5e2d5;}' +
        '.yq-btn-primary:hover{filter:brightness(1.06);}' +
        '.yq-menu-btn:hover{background:#e5e2d5;}' +
        '.yq-toast-close:hover{color:#1c1c1a;}' +
        '.yq-report-actions button:not(.yq-primary):hover{background:#e5e2d5;}' +
        '.yq-report-actions button.yq-primary:hover{filter:brightness(1.06);}' +
        '.vip-form-actions button:not(.yq-primary):hover{background:#e5e2d5;}' +
        '.vip-form-actions button.yq-primary:hover{filter:brightness(1.06);}' +
        '.shift-pick-btn:not(.current):hover{background:#e5e2d5;}' +
        '.shift-add-emp-btn:hover{background:#e5e2d5;}' +
        '.shift-emp-remove:hover{background:#fbdada;}' +
        '.yq-field:focus{outline:2px solid #a8cf5a;border-color:#79a916;}';
    function injectYqStyles() {
        if (document.getElementById('yq-shared-styles-vip-booking')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-vip-booking';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    /** إشعار خفيف يختفي تلقائياً - بديل alert()/رسائل النجاح والخطأ القديمة */
    function showToast(message, type) {
        injectYqStyles();
        let wrap = document.getElementById('yq-toast-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'yq-toast-wrap';
            wrap.className = 'yq-toast-wrap';
            document.body.appendChild(wrap);
        }
        const toast = document.createElement('div');
        toast.className = 'yq-toast' + (type === 'error' ? ' err' : '');
        toast.innerHTML =
            '<div class="yq-toast-icon">' + (type === 'error' ? '⚠️' : '✅') + '</div>' +
            '<div class="yq-toast-text"></div>' +
            '<button class="yq-toast-close">✕</button>';
        toast.querySelector('.yq-toast-text').textContent = message;
        wrap.appendChild(toast);

        const remove = () => { toast.remove(); if (!wrap.children.length) wrap.remove(); };
        toast.querySelector('.yq-toast-close').onclick = remove;
        setTimeout(remove, type === 'error' ? 6000 : 4000);
    }

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="vip-booking-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function closeBox() {
        document.getElementById('vip-booking-box')?.remove();
    }

    function showMessage(text, type) {
        closeBox();
        showToast(text, type || 'error');
    }

    function showLoading(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function selectHtml(id, label, options, selected) {
        const opts = ['<option value="">— اختر —</option>'].concat(
            options.map(o => '<option value="' + escapeHtml(o) + '"' + (o === selected ? ' selected' : '') + '>' + escapeHtml(o) + '</option>')
        ).join('');
        return (
            '<div class="vip-field-wrap">' +
            '<label>' + label + '</label>' +
            '<select id="' + id + '">' + opts + '</select>' +
            '</div>'
        );
    }

    function textHtml(id, label, type, required) {
        return (
            '<div class="vip-field-wrap">' +
            '<label>' + label + '</label>' +
            '<input id="' + id + '" type="' + type + '"' + (required ? ' required' : '') + ' />' +
            '</div>'
        );
    }

    function showForm() {
        closeBox();
        injectYqStyles();

        const grid2 = 'display:grid;grid-template-columns:1fr 1fr;gap:0 14px;';

        const html =
            '<h3 style="margin-bottom:14px;">⭐ إضافة حجز VIP</h3>' +
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
            '<div class="vip-field-wrap">' +
            '<label>ملاحظات</label>' +
            '<textarea id="vip-f-notes" rows="2"></textarea>' +
            '</div>' +
            '<div id="vip-form-err" style="color:#dc2626;font-size:13.5px;font-weight:bold;margin-bottom:10px;display:none;"></div>' +
            '<div class="vip-form-actions">' +
            '<button id="vip-form-cancel">إلغاء</button>' +
            '<button id="vip-form-save">💾 حفظ فقط</button>' +
            '<button id="vip-form-save-send" class="yq-primary">📩 حفظ وإرسال للقروب</button>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 540));

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
                    showMessage('تم إنشاء الحجز ' + id + ' بنجاح، لكن تعذّر إرسال رسالة الواتساب: ' + waErr.message, 'error');
                    return;
                }
                showMessage('تم إنشاء الحجز ' + id + ' وإرسال الرسالة للقروب بنجاح.', 'success');
                return;
            }

            showMessage('تم إنشاء الحجز ' + id + ' بنجاح.', 'success');

        } catch (err) {
            showMessage('تعذّر حفظ الحجز: ' + err.message);
        }
    }

    async function runVipBookingTool() {
        showForm();
    }

    waitCore();

})();
