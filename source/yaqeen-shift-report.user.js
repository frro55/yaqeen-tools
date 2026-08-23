// ==UserScript==
// @name         Yaqeen Tool - تقرير الشفت
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يسحب أرقام Opened/Closed/Rented/Ready تلقائياً من الموقع حسب الشفت المختار، ويخليك تضيف أسماء الموظفين يدوياً قبل الإرسال للقروب
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      api.yaqeen-vip.space
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    const AIRPORT_BRANCH_ID = 29;
    const YARD_BRANCH_ID = 53;

    // حدود الشفتات الثلاث - نفس تقسيم أداة توقع أوقات الذروة
    const SHIFTS = [
        { key: 'morning', label: 'صباحي (8ص - 4م)', labelEn: 'Morning shift', startHour: 8, endHour: 16 },
        { key: 'evening', label: 'مسائي (4م - 12ص)', labelEn: 'Evening shift', startHour: 16, endHour: 24 },
        { key: 'night', label: 'ليلي (12ص - 8ص)', labelEn: 'Night shift', startHour: 0, endHour: 8 },
    ];

    function currentShiftKey() {
        const hour = new Date().getHours();
        return (SHIFTS.find(s => hour >= s.startHour && hour < s.endHour) || SHIFTS[0]).key;
    }

    function shiftByKey(key) {
        return SHIFTS.find(s => s.key === key) || SHIFTS[0];
    }

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "shift-report",
            name: "📋 تقرير الشفت",
            run() {
                showShiftPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
    // ==========================================================

    function normalizeArabic(text) {
        return (text || '')
            .replace(/[ً-ْ]/g, '')
            .replace(/[إأآا]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise(resolve => {
            const start = Date.now();
            (function check() {
                if (!iframe.isConnected) { resolve(null); return; }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    resolve(null);
                    return;
                }
                if (!doc || doc.readyState !== 'complete') {
                    if (Date.now() - start > timeoutMs) { resolve(doc || null); return; }
                    setTimeout(check, 300);
                    return;
                }
                let result = null;
                try { result = checkFn(doc); } catch (err) { /* تجاهل */ }
                if (result || Date.now() - start > timeoutMs) { resolve(result ? doc : (doc || null)); return; }
                setTimeout(check, 300);
            })();
        });
    }

    function findColumnIndex(headerCells, labelVariants) {
        const normalizedVariants = labelVariants.map(normalizeArabic);
        for (let i = 0; i < headerCells.length; i++) {
            const headerText = normalizeArabic(headerCells[i].textContent);
            if (normalizedVariants.some(v => headerText.indexOf(v) !== -1)) return i;
        }
        return -1;
    }

    function findDataTable(doc, identifyingVariants) {
        const tables = Array.from(doc.querySelectorAll('table'));
        return tables.find(t => {
            const headerCells = Array.from(t.querySelectorAll('thead tr th, thead tr td'));
            return findColumnIndex(headerCells, identifyingVariants) !== -1;
        }) || null;
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق باقي الأدوات)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    function collectAllPages(iframe, doc, readRowsFn) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try { return readRowsFn(doc); } catch (err) { return []; }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    // ==========================================================
    // تحليل وقت الاستلام/التسليم النصي ("اليوم - 08:30"، "غداً - 14:00"، اسم يوم - وقت)
    // ==========================================================

    function buildDayChips() {
        const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const chips = ['اليوم', 'غداً'];
        let cursor = (new Date().getDay() + 2) % 7;
        while (chips.length < 9) {
            chips.push(WEEKDAY_NAMES[cursor]);
            cursor = (cursor + 1) % 7;
        }
        return chips;
    }
    const DAY_CHIPS = buildDayChips();

    function extractDayLabel(timeText) {
        if (!timeText) return null;
        const dayPart = timeText.split('-')[0].trim();
        const normalizedDayPart = normalizeArabic(dayPart);
        return DAY_CHIPS.find(chip => normalizeArabic(chip) === normalizedDayPart) || dayPart;
    }

    function extractHour(timeText) {
        if (!timeText) return null;
        const parts = timeText.split('-');
        const timePart = (parts.length > 1 ? parts[1] : parts[0]).trim();
        const m = timePart.match(/(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1], 10) : null;
    }

    function shiftForHour(hour) {
        if (hour === null || isNaN(hour)) return null;
        return (SHIFTS.find(s => hour >= s.startHour && hour < s.endHour) || {}).key || null;
    }

    // ==========================================================
    // جلب الأرقام الأربعة من الموقع
    // ==========================================================

    /** صفحة "مستأجر" فيها عنوان h2 بصيغة "مستأجر (401)" - نستخرج الرقم من العنوان مباشرة بدون عد صفوف */
    async function fetchRentedTotal() {
        const url = 'https://yaqeen.lumirental.com/rental/vehicles/rented';
        const frame = openHiddenFrame(url);
        try {
            const doc = await waitFor(frame, d => {
                const h2 = Array.from(d.querySelectorAll('h2')).find(x => x.textContent.indexOf('مستأجر') !== -1);
                return h2 || null;
            }, 20000);
            if (!doc) return null;
            const h2 = Array.from(doc.querySelectorAll('h2')).find(x => x.textContent.indexOf('مستأجر') !== -1);
            if (!h2) return null;
            const match = h2.textContent.match(/\((\d+)\)/);
            return match ? parseInt(match[1], 10) : null;
        } catch (err) {
            return null;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function readReadyRows(doc) {
        const table = findDataTable(doc, ['المجموعة']);
        if (!table) return [];
        const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
        return bodyRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (!cells.length) return null;
            return { __signature: cells.map(c => c.textContent.trim()).join('|') };
        }).filter(Boolean);
    }

    /** إجمالي السيارات الجاهزة بموقع معيّن (مطار/ساحة) - نفس مصدر أداة "السيارات المتوفرة" */
    async function fetchReadyTotal(branchId) {
        const url = 'https://yaqeen.lumirental.com/rental/vehicles/ready?currentLocationIds=' + branchId + '&pageSize=500';
        const frame = openHiddenFrame(url);
        try {
            const doc = await waitFor(frame, d => (findDataTable(d, ['المجموعة']) ? d : null), 20000);
            if (!doc) return null;
            const rows = await collectAllPages(frame, doc, d => readReadyRows(d));
            return rows.length;
        } catch (err) {
            return null;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function readTimeColumnRows(doc, identifyingVariants, timeColumnVariants) {
        const table = findDataTable(doc, identifyingVariants);
        if (!table) return [];
        const headerCells = Array.from(table.querySelectorAll('thead tr th, thead tr td'));
        const timeIdx = findColumnIndex(headerCells, timeColumnVariants);
        const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
        return bodyRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (!cells.length) return null;
            const timeText = timeIdx >= 0 && cells[timeIdx] ? cells[timeIdx].textContent.trim() : '';
            return { timeText, __signature: cells.map(c => c.textContent.trim()).join('|') };
        }).filter(Boolean);
    }

    /** يعدّ صفوف قائمة معيّنة (مفتوحة أو مغلقة) الواقعة اليوم بساعات الشفت المختار حسب عمود الوقت المطلوب */
    async function fetchShiftCount(url, identifyingVariants, timeColumnVariants, shiftKey) {
        const frame = openHiddenFrame(url);
        try {
            const doc = await waitFor(frame, d => (findDataTable(d, identifyingVariants) ? d : null), 20000);
            if (!doc) return null;
            const rows = await collectAllPages(frame, doc, d => readTimeColumnRows(d, identifyingVariants, timeColumnVariants));
            return rows.filter(r => extractDayLabel(r.timeText) === 'اليوم' && shiftForHour(extractHour(r.timeText)) === shiftKey).length;
        } catch (err) {
            return null;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    async function fetchAllNumbers(shiftKey) {
        const openedUrl = 'https://yaqeen.lumirental.com/rental/branches/' + AIRPORT_BRANCH_ID + '/bookings?pickupDateRangeStart=TODAY&status=ONGOING&pageSize=500';
        const closedUrl = 'https://yaqeen.lumirental.com/rental/branches/' + AIRPORT_BRANCH_ID + '/bookings/completed?dropOffDateRangeStart=TODAY&pageSize=500';

        const [opened, closed, rented, ready138, ready162] = await Promise.all([
            fetchShiftCount(openedUrl, ['وقت الاستلام'], ['وقت الاستلام'], shiftKey),
            fetchShiftCount(closedUrl, ['وقت التسليم'], ['وقت التسليم'], shiftKey),
            fetchRentedTotal(),
            fetchReadyTotal(AIRPORT_BRANCH_ID),
            fetchReadyTotal(YARD_BRANCH_ID),
        ]);

        return { opened, closed, rented, ready138, ready162 };
    }

    // ==========================================================
    // إرسال واتساب (نص)
    // ==========================================================

    function sendWhatsAppText(message) {
        return new Promise((resolve, reject) => {
            if (typeof GM_xmlhttpRequest === 'undefined') {
                reject(new Error('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey'));
                return;
            }
            GM_xmlhttpRequest({
                method: 'POST',
                url: WHATSAPP_CONFIG.apiUrl,
                headers: {
                    Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ target: WHATSAPP_CONFIG.target, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main', type: 'text', message: message }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve();
                    else {
                        console.error('[تقرير الشفت] فشل الإرسال:', response.status, response.responseText);
                        reject(new Error('فشل الإرسال (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:16px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:13px;color:#767068;line-height:1.9;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:15px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
        '.yq-field.yq-field-err{border-color:#dc2626;}' +
        '.yq-btn{width:100%;padding:13px;margin-top:10px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:14px;font-weight:800;font-family:inherit;}' +
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
        'justify-content:center;font-size:15px;flex-shrink:0;background:#eaf7e9;}' +
        '.yq-toast.err .yq-toast-icon{background:#fdecec;}' +
        '.yq-toast-text{flex:1;text-align:right;font-size:12.5px;font-weight:700;line-height:1.6;color:#1c1c1a;}' +
        '.yq-toast-close{background:none;border:0;color:#a19c92;font-size:13px;cursor:pointer;padding:4px;flex-shrink:0;}' +
        '@keyframes yq-toast-in{from{opacity:0;transform:translateY(-10px);}to{opacity:1;transform:translateY(0);}}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:17px;font-weight:800;}' +
        '.yq-report-sub{font-size:12.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:12.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.shift-section-label{font-weight:800;font-size:13px;margin-bottom:8px;color:#1c1c1a;}' +
        '.shift-mini-field{width:100%;padding:11px;border:1.5px solid #cec7b4;border-radius:10px;font-size:14px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
        '.shift-mini-field:focus{outline:2px solid #a8cf5a;border-color:#79a916;}' +
        '.shift-add-emp-btn{width:100%;padding:10px;margin-top:8px;border:0;border-radius:10px;cursor:pointer;' +
        'background:#f1f0ea;color:#767068;font-size:12px;font-weight:700;font-family:inherit;transition:background .15s;}' +
        '.shift-emp-name,.shift-emp-count{padding:9px;border:1.5px solid #cec7b4;border-radius:9px;font-size:13px;' +
        'text-align:center;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
        '.shift-emp-name{text-align:right;flex:2;}' +
        '.shift-emp-count{flex:1;}' +
        '.shift-emp-remove{padding:0 12px;border:0;border-radius:9px;background:#fdecec;color:#dc2626;cursor:pointer;font-family:inherit;}' +
        '.shift-preview{width:100%;height:190px;box-sizing:border-box;padding:14px;border:1.5px solid #cec7b4;' +
        'border-radius:12px;font-size:13px;text-align:left;resize:vertical;white-space:pre;background:#fbfbf9;color:#1c1c1a;font-family:inherit;}' +
        '.shift-pick-btn{width:100%;padding:13px;margin-top:8px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:14px;font-weight:800;font-family:inherit;background:#f1f0ea;color:#1c1c1a;}' +
        '.shift-pick-btn.current{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
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
        if (document.getElementById('yq-shared-styles-shift-report')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-shift-report';
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
            '<div id="shift-report-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('shift-report-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:13.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('shift-report-box')?.remove();
        showToast(text, type || 'error');
    }

    function showShiftPrompt() {
        document.getElementById('shift-report-box')?.remove();
        const current = currentShiftKey();

        const buttonsHtml = SHIFTS.map(s => (
            '<button class="shift-report-pick shift-pick-btn' + (s.key === current ? ' current' : '') + '" data-shift="' + s.key + '">' +
            s.label + (s.key === current ? ' (الحالي)' : '') + '</button>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>📋 تقرير الشفت</h3>' +
            '<div class="yq-desc">اختر الشفت اللي تبي تسحب أرقامه:</div>' +
            buttonsHtml +
            '<button id="shift-report-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            320
        ));

        document.querySelectorAll('.shift-report-pick').forEach(btn => {
            btn.onclick = () => runFetchAndShowForm(btn.getAttribute('data-shift'));
        });
        document.getElementById('shift-report-cancel').onclick = () => {
            document.getElementById('shift-report-box')?.remove();
        };
    }

    async function runFetchAndShowForm(shiftKey) {
        showProgress('جارٍ سحب الأرقام من الموقع (Opened / Closed / Rented / Ready)...');
        try {
            const numbers = await fetchAllNumbers(shiftKey);
            showForm(shiftKey, numbers);
        } catch (err) {
            showMessage('تعذّر سحب الأرقام: ' + err.message);
        }
    }

    function empRowHtml(section) {
        return (
            '<div class="shift-emp-row" data-section="' + section + '" style="display:flex;gap:8px;margin-top:8px;">' +
            '<input type="text" class="shift-emp-name" placeholder="اسم الموظف" />' +
            '<input type="number" class="shift-emp-count" placeholder="العدد" />' +
            '<button class="shift-emp-remove">✕</button>' +
            '</div>'
        );
    }

    function buildMessageFromForm(shiftLabelEn) {
        const openedTotal = document.getElementById('shift-report-opened-total').value || '0';
        const closedTotal = document.getElementById('shift-report-closed-total').value || '0';
        const rentedTotal = document.getElementById('shift-report-rented').value || '0';
        const ready138 = document.getElementById('shift-report-ready138').value || '0';
        const ready162 = document.getElementById('shift-report-ready162').value || '0';

        function empLines(section) {
            return Array.from(document.querySelectorAll('.shift-emp-row[data-section="' + section + '"]'))
                .map(row => {
                    const name = row.querySelector('.shift-emp-name').value.trim();
                    const count = row.querySelector('.shift-emp-count').value.trim();
                    if (!name && !count) return null;
                    return name + (count ? ' ' + count : ' ');
                })
                .filter(Boolean);
        }

        const lines = [];
        lines.push(shiftLabelEn);
        lines.push('');
        lines.push('Opened  ' + openedTotal);
        lines.push(...empLines('opened'));
        lines.push('');
        lines.push('Closed ' + closedTotal);
        lines.push(...empLines('closed'));
        lines.push('');
        lines.push('Rented : ' + rentedTotal);
        lines.push('Ready 138 : ' + ready138);
        lines.push('Ready 162 : ' + ready162);
        return lines.join('\n');
    }

    function updatePreview(shiftLabelEn) {
        const preview = document.getElementById('shift-report-preview');
        if (preview) preview.value = buildMessageFromForm(shiftLabelEn);
    }

    function wireLiveInputs(shiftLabelEn) {
        document.querySelectorAll(
            '#shift-report-opened-total, #shift-report-closed-total, #shift-report-rented, ' +
            '#shift-report-ready138, #shift-report-ready162, .shift-emp-name, .shift-emp-count'
        ).forEach(el => {
            el.oninput = () => updatePreview(shiftLabelEn);
        });
        document.querySelectorAll('.shift-emp-remove').forEach(btn => {
            btn.onclick = () => {
                btn.closest('.shift-emp-row').remove();
                updatePreview(shiftLabelEn);
            };
        });
    }

    function addEmpRow(section, shiftLabelEn) {
        const container = document.getElementById('shift-report-' + section + '-employees');
        container.insertAdjacentHTML('beforeend', empRowHtml(section));
        wireLiveInputs(shiftLabelEn);
    }

    function showForm(shiftKey, numbers) {
        document.getElementById('shift-report-box')?.remove();
        injectYqStyles();
        const shift = shiftByKey(shiftKey);

        const html =
            '<div id="shift-report-box" class="yq-overlay">' +
            '<div style="width:min(520px,95vw);max-height:92vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">📋 تقرير الشفت - ' + shift.label + '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:24px;text-align:right;">' +

            '<div class="shift-section-label">Opened (إجمالي من الموقع)</div>' +
            '<input id="shift-report-opened-total" type="number" value="' + (numbers.opened ?? '') + '" class="shift-mini-field" />' +
            '<div id="shift-report-opened-employees"></div>' +
            '<button id="shift-report-add-opened" class="shift-add-emp-btn">+ إضافة موظف</button>' +

            '<div class="shift-section-label" style="margin-top:16px;">Closed (إجمالي من الموقع)</div>' +
            '<input id="shift-report-closed-total" type="number" value="' + (numbers.closed ?? '') + '" class="shift-mini-field" />' +
            '<div id="shift-report-closed-employees"></div>' +
            '<button id="shift-report-add-closed" class="shift-add-emp-btn">+ إضافة موظف</button>' +

            '<div style="display:flex;gap:8px;margin-top:16px;">' +
            '<div style="flex:1;">' +
            '<div class="shift-section-label" style="font-size:12.5px;">Rented</div>' +
            '<input id="shift-report-rented" type="number" value="' + (numbers.rented ?? '') + '" class="shift-mini-field" />' +
            '</div>' +
            '<div style="flex:1;">' +
            '<div class="shift-section-label" style="font-size:12.5px;">Ready 138 (مطار)</div>' +
            '<input id="shift-report-ready138" type="number" value="' + (numbers.ready138 ?? '') + '" class="shift-mini-field" />' +
            '</div>' +
            '<div style="flex:1;">' +
            '<div class="shift-section-label" style="font-size:12.5px;">Ready 162 (ساحة)</div>' +
            '<input id="shift-report-ready162" type="number" value="' + (numbers.ready162 ?? '') + '" class="shift-mini-field" />' +
            '</div>' +
            '</div>' +

            '<div class="shift-section-label" style="margin-top:16px;">معاينة الرسالة</div>' +
            '<textarea id="shift-report-preview" readonly dir="ltr" class="shift-preview"></textarea>' +

            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="shift-report-refresh">🔄 تحديث الأرقام</button>' +
            '<button id="shift-report-cancel2">إلغاء</button>' +
            '<button id="shift-report-send" class="yq-send">📩 إرسال للقروب</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        // صف موظف فاضي واحد جاهز بكل قسم كبداية
        addEmpRow('opened', shift.labelEn);
        addEmpRow('closed', shift.labelEn);
        wireLiveInputs(shift.labelEn);
        updatePreview(shift.labelEn);

        document.getElementById('shift-report-add-opened').onclick = () => addEmpRow('opened', shift.labelEn);
        document.getElementById('shift-report-add-closed').onclick = () => addEmpRow('closed', shift.labelEn);

        document.getElementById('shift-report-cancel2').onclick = () => {
            document.getElementById('shift-report-box')?.remove();
        };

        document.getElementById('shift-report-refresh').onclick = () => {
            runFetchAndShowForm(shiftKey);
        };

        document.getElementById('shift-report-send').onclick = async () => {
            const message = buildMessageFromForm(shift.labelEn);
            if (!confirm('سيتم إرسال هذي الرسالة للقروب:\n\n' + message + '\n\nمتابعة؟')) return;
            const btn = document.getElementById('shift-report-send');
            btn.disabled = true;
            btn.textContent = '... جارٍ الإرسال';
            try {
                await sendWhatsAppText(message);
                document.getElementById('shift-report-box')?.remove();
                showMessage('تم إرسال تقرير الشفت للقروب بنجاح', 'success');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = '📩 إرسال للقروب';
                showToast('تعذّر الإرسال: ' + err.message, 'error');
            }
        };
    }

    waitCore();

})();
