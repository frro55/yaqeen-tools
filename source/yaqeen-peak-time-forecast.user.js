// ==UserScript==
// @name         Yaqeen Tool - توقع أوقات الذروة
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يقرأ قائمة الحجوزات القادمة ويحسب توقع الاستلام والتسليم لليوم مقسّم على الشفتات الثلاث (صباحي/مسائي/ليلي)
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const PAGE_SIZE = 500;

    // حدود الشفتات الثلاث - نفس تقسيم الفرع الفعلي
    const SHIFTS = [
        { key: 'morning', label: 'صباحي (8ص - 4م)', startHour: 8, endHour: 16 },
        { key: 'evening', label: 'مسائي (4م - 12ص)', startHour: 16, endHour: 24 },
        { key: 'night', label: 'ليلي (12ص - 8ص)', startHour: 0, endHour: 8 },
    ];

    // عتبات تصنيف كل شفت لكل نوع (استلام/تسليم) - محسوبة من متوسط تقارير
    // شفتات فعلية أعطانا إياها المستخدم (أسبوع تقريباً، أيام عادية لا
    // ويكند). [حد "هادئ"، حد "متوسط"] - أي قيمة أقل من الأول = هادئ، بين
    // الاثنين = متوسط، وفوق الثاني = مزدحم. تقريبية بالبداية وتُضبط لاحقاً
    // بعد ما نبدأ نسجّل الأرقام الفعلية باستمرار
    const SHIFT_THRESHOLDS = {
        night: { pickup: [30, 50], dropoff: [25, 32] },
        evening: { pickup: [48, 58], dropoff: [48, 54] },
        morning: { pickup: [46, 58], dropoff: [48, 60] },
    };

    const LEVELS = {
        calm: { label: 'هادئ', color: '#16a34a', rank: 0 },
        medium: { label: 'متوسط', color: '#eab308', rank: 1 },
        busy: { label: 'مزدحم', color: '#dc2626', rank: 2 },
    };

    function classify(shiftKey, type, value) {
        const thresholds = SHIFT_THRESHOLDS[shiftKey][type];
        if (value < thresholds[0]) return LEVELS.calm;
        if (value <= thresholds[1]) return LEVELS.medium;
        return LEVELS.busy;
    }

    /** أشد شفت زحمة لنوع معيّن (استلام أو تسليم) - حسب مستوى التصنيف، وعند التعادل حسب العدد الخام */
    function findBusiestShift(forecast, type) {
        let best = null;
        SHIFTS.forEach(s => {
            const value = forecast.byShift[s.key][type];
            const level = classify(s.key, type, value);
            if (!best || level.rank > best.level.rank || (level.rank === best.level.rank && value > best.value)) {
                best = { shift: s, level, value };
            }
        });
        return best;
    }

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "peak-time-forecast",
            name: "🔮 توقع أوقات الذروة",
            run() {
                runForecastTool();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات "تقرير الحجوزات القادمة")
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
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:820px;height:560px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    const BOOKING_COLUMNS_MAP = {
        id: ['رقم الحجز'],
        pickup: ['وقت الاستلام'],
        dropoff: ['وقت التسليم'],
    };

    function findColumnIndex(headerCells, labelVariants) {
        const normalizedVariants = labelVariants.map(normalizeArabic);
        for (let i = 0; i < headerCells.length; i++) {
            const headerText = normalizeArabic(headerCells[i].textContent);
            if (normalizedVariants.some(v => headerText.indexOf(v) !== -1)) return i;
        }
        return -1;
    }

    /** جدول الحجوزات الحقيقي هو الوحيد اللي فيه عمود "وقت الاستلام" - يميّزه عن أي جدول آخر بالصفحة */
    function findBookingsTable(doc) {
        const tables = Array.from(doc.querySelectorAll('table'));
        return tables.find(t => {
            const headerCells = Array.from(t.querySelectorAll('thead tr th, thead tr td'));
            return findColumnIndex(headerCells, BOOKING_COLUMNS_MAP.pickup) !== -1;
        }) || null;
    }

    function readCurrentPageRows(doc) {
        const table = findBookingsTable(doc);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll('thead tr th, thead tr td'));
        const indices = {};
        Object.keys(BOOKING_COLUMNS_MAP).forEach(key => {
            indices[key] = findColumnIndex(headerCells, BOOKING_COLUMNS_MAP[key]);
        });

        const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
        return bodyRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (cells.length === 0) return null;
            const record = {};
            Object.keys(indices).forEach(key => {
                const idx = indices[key];
                record[key] = idx >= 0 && cells[idx] ? cells[idx].textContent.trim() : '';
            });
            record.__signature = cells.map(c => c.textContent.trim()).join('|');
            return record;
        }).filter(Boolean);
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

    function waitForFirstFrame(iframe, timeoutMs) {
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
                const hasRows = findBookingsTable(doc) && findBookingsTable(doc).querySelectorAll('tbody tr').length > 0;
                if (hasRows || Date.now() - start > timeoutMs) { resolve(doc); return; }
                setTimeout(check, 300);
            })();
        });
    }

    function collectAllPages(iframe, doc) {
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
                try { return readCurrentPageRows(doc); } catch (err) { return []; }
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
    // حساب التوقع
    // ==========================================================

    /** تشخيص مؤقت (Console) - يطلع شكل البيانات الخام الفعلي حتى نتأكد الأعمدة والصيغة صح */
    function logDiagnostics(doc, rawRows) {
        const table = findBookingsTable(doc);
        const headerCells = table
            ? Array.from(table.querySelectorAll('thead tr th, thead tr td')).map(c => c.textContent.trim())
            : [];
        console.log('[توقع أوقات الذروة] رؤوس الأعمدة المكتشفة بالجدول:', headerCells);
        console.log('[توقع أوقات الذروة] عيّنة من أول 10 صفوف (pickup/dropoff):',
            rawRows.slice(0, 10).map(r => ({ pickup: r.pickup, dropoff: r.dropoff })));

        const pickupDayCounts = {};
        rawRows.forEach(r => {
            const d = extractDayLabel(r.pickup) || '(فاضي)';
            pickupDayCounts[d] = (pickupDayCounts[d] || 0) + 1;
        });
        console.log('[توقع أوقات الذروة] توزيع أيام الاستلام لكل الصفوف المجمّعة:', pickupDayCounts);

        const dropoffEmptyCount = rawRows.filter(r => !r.dropoff).length;
        console.log('[توقع أوقات الذروة] عدد الصفوف اللي عمود التسليم فيها فاضي:', dropoffEmptyCount, '/', rawRows.length);
    }

    function computeForecast(bookings) {
        const byShift = {};
        SHIFTS.forEach(s => { byShift[s.key] = { pickup: 0, dropoff: 0 }; });

        let totalPickupToday = 0;
        let totalDropoffToday = 0;

        bookings.forEach(b => {
            if (extractDayLabel(b.pickup) === 'اليوم') {
                totalPickupToday++;
                const shift = shiftForHour(extractHour(b.pickup));
                if (shift) byShift[shift].pickup++;
            }
            if (extractDayLabel(b.dropoff) === 'اليوم') {
                totalDropoffToday++;
                const shift = shiftForHour(extractHour(b.dropoff));
                if (shift) byShift[shift].dropoff++;
            }
        });

        return { byShift, totalPickupToday, totalDropoffToday };
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    async function runForecastTool() {
        const branchMatch = location.pathname.match(/\/rental\/branches\/(\d+)\//);
        const branchId = branchMatch ? branchMatch[1] : '29';
        const listUrl = 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings/upcoming?pageSize=' + PAGE_SIZE;

        showProgress('جارٍ تحميل قائمة الحجوزات القادمة...');

        const frame = openHiddenFrame(listUrl);
        try {
            const doc = await waitForFirstFrame(frame);
            if (!doc) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showMessage('تعذّر تحميل قائمة الحجوزات.');
                return;
            }

            showProgress('جارٍ جمع كل الحجوزات عبر كل الصفحات...');
            const rawRows = await collectAllPages(frame, doc);
            logDiagnostics(doc, rawRows);
            try { frame.remove(); } catch (err) { /* تجاهل */ }

            const forecast = computeForecast(rawRows);
            showReport(forecast, rawRows.length);

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage('تعذّر إتمام الحساب: ' + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function overlayShell(innerHtml, width) {
        return (
            '<div id="peak-forecast-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:' + width + 'px;background:#fff;border-radius:16px;padding:25px;' +
            'text-align:center;direction:rtl;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('peak-forecast-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(text, 340));
    }

    function showMessage(text) {
        document.getElementById('peak-forecast-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div style="margin-bottom:15px">' + text + '</div>' +
            '<button id="peak-forecast-close" style="' +
            'padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>',
            340
        ));
        document.getElementById('peak-forecast-close').onclick = () => {
            document.getElementById('peak-forecast-box')?.remove();
        };
    }

    function badgeHtml(label, valueText, color) {
        return (
            '<div style="flex:1;background:#f8f8f8;border-radius:12px;padding:14px;border-top:4px solid ' + color + ';">' +
            '<div style="font-size:12.5px;color:#666;margin-bottom:6px;">' + label + '</div>' +
            '<div style="font-size:16px;font-weight:bold;color:' + color + ';">' + valueText + '</div>' +
            '</div>'
        );
    }

    function levelChip(level, value) {
        return (
            '<span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:12.5px;' +
            'font-weight:bold;background:' + level.color + '22;color:' + level.color + ';">' +
            level.label + ' (' + value + ')</span>'
        );
    }

    function showReport(forecast, totalScanned) {
        document.getElementById('peak-forecast-box')?.remove();

        const busiestPickup = findBusiestShift(forecast, 'pickup');
        const busiestDropoff = findBusiestShift(forecast, 'dropoff');

        const rowsHtml = SHIFTS.map(s => {
            const counts = forecast.byShift[s.key];
            const pickupLevel = classify(s.key, 'pickup', counts.pickup);
            const dropoffLevel = classify(s.key, 'dropoff', counts.dropoff);
            return (
                '<tr>' +
                '<td style="padding:9px;border-top:1px solid #eee;">' + s.label + '</td>' +
                '<td style="border-top:1px solid #eee;">' + levelChip(pickupLevel, counts.pickup) + '</td>' +
                '<td style="border-top:1px solid #eee;">' + levelChip(dropoffLevel, counts.dropoff) + '</td>' +
                '</tr>'
            );
        }).join('');

        const html =
            '<div id="peak-forecast-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;' +
            'z-index:999999999;font-family:Arial;">' +
            '<div style="width:min(480px,95vw);background:white;border-radius:16px;overflow:hidden;direction:rtl;">' +
            '<div style="background:#A3E635;padding:18px;text-align:center;">' +
            '<div style="font-size:16px;font-weight:bold;">🔮 توقع أوقات الذروة</div>' +
            '<div style="font-size:12.5px;margin-top:4px;opacity:.8;">بُني على ' + totalScanned + ' حجز بالقائمة القادمة</div>' +
            '</div>' +
            '<div style="padding:18px;display:flex;gap:10px;">' +
            badgeHtml('أكثر وقت ازدحام - استلام', busiestPickup.shift.label + '<br>' + busiestPickup.level.label + ' (' + busiestPickup.value + ')', busiestPickup.level.color) +
            badgeHtml('أكثر وقت ازدحام - تسليم', busiestDropoff.shift.label + '<br>' + busiestDropoff.level.label + ' (' + busiestDropoff.value + ')', busiestDropoff.level.color) +
            '</div>' +
            '<div style="padding:0 18px 18px;">' +
            '<table style="width:100%;border-collapse:collapse;font-size:13.5px;">' +
            '<tr style="background:#f5f5f5;"><th style="padding:10px">الشفت</th><th>الاستلام</th><th>التسليم</th></tr>' +
            rowsHtml +
            '</table>' +
            '</div>' +
            '<div style="padding:0 18px 18px;font-size:11.5px;color:#999;text-align:right;">' +
            'ملاحظة: أرقام الاستلام مبنية على الحجوزات المجدولة فقط (ما تشمل عملاء بدون حجز مسبق)، والتصنيف لسا أولي وبيتحسّن مع الوقت لما نبدأ نسجّل الأرقام الفعلية.' +
            '</div>' +
            '<div style="padding:0 18px 18px;text-align:center;display:flex;gap:8px;">' +
            '<button id="peak-forecast-refresh" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">🔄 تحديث</button>' +
            '<button id="peak-forecast-close" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#A3E635;cursor:pointer;">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('peak-forecast-close').onclick = () => {
            document.getElementById('peak-forecast-box')?.remove();
        };
        document.getElementById('peak-forecast-refresh').onclick = () => {
            runForecastTool();
        };
    }

    waitCore();

})();
