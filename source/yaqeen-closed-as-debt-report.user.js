// ==UserScript==
// @name         Yaqeen Tool - عقود أغلقت كمديونية
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يفحص العقود المكتملة على يقين لكنها معلّقة بتأجير ومقفلة كمديونية (فترة محاولة تحصيل قبل التحويل لقسم التحصيل/المحكمة)، ويطلع بيانات العميل والمبلغ المتبقي - تختار الشهر/الأشهر اللي تبي عقودها
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

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    const LIST_URL = 'https://yaqeen.lumirental.com/rental/branches/29/bookings/needs-action?pendingActions=TAJEER_SUSPENDED&pageSize=500';
    // سقف أمان لعدد صفحات التفاصيل اللي نفتحها فعلياً بجلسة واحدة
    const MAX_VISITS = 300;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "closed-as-debt",
            name: "📕 عقود أغلقت كمديونية",
            run() {
                runReport();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات باقي التقارير)
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
                    return;
                }
                let result = null;
                try {
                    result = checkFn(doc);
                } catch (err) { /* تجاهل */ }
                if (result) {
                    resolve(result);
                    return;
                }
                if (Date.now() - start > timeoutMs) {
                    resolve(null);
                    return;
                }
                setTimeout(poll, 300);
            })();
        });
    }

    /**
     * يجيب مستند الـiframe الحالي طازة - لا نخزّن أي مرجع document بمتغيّر
     * طويل العمر عبر عدة عمليات تنقّل، لأنه لو صار تنقّل حقيقي (لا SPA) بأي
     * لحظة، المستند القديم اللي كنا ماسكينه يصير "ميت" و.location فيه يرجع
     * null، وأي قراءة مباشرة لـ.location.href عليه تكسر بخطأ Cannot read
     * properties of null
     */
    function getDoc(frame) {
        try {
            return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null;
        } catch (err) {
            return null;
        }
    }

    /** يحاكي كليك حقيقي (pointerdown/up) لأزرار/صفوف React اللي ما تستجيب لـ.click() العادي دايماً */
    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findLabelElement(doc, labelText) {
        const candidates = doc.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    function findValueNearLabel(doc, labelText) {
        const labelEl = findLabelElement(doc, labelText);
        if (!labelEl) return "";
        const candidates = [
            labelEl.nextElementSibling,
            labelEl.previousElementSibling,
            labelEl.parentElement && labelEl.parentElement.nextElementSibling,
            labelEl.parentElement && labelEl.parentElement.previousElementSibling,
        ].filter(Boolean);
        for (const c of candidates) {
            const text = c.textContent.trim();
            if (text) return text;
        }
        return "";
    }

    function parseAmount(text) {
        if (!text) return NaN;
        const isNegative = text.indexOf('-') !== -1;
        const cleaned = text.replace(/[^\d.]/g, '');
        if (!cleaned) return NaN;
        const value = parseFloat(cleaned);
        if (isNaN(value)) return NaN;
        return isNegative ? -value : value;
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

    // ==========================================================
    // قراءة صف القائمة
    // ==========================================================

    const ARABIC_MONTHS = {
        'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6,
        'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10,
        'نوفمبر': 11, 'ديسمبر': 12,
    };

    /**
     * يحوّل "17, يناير 2026" (صيغة عمود "وقت التسليم" بالقائمة) لشهر/سنة -
     * نستخدمه فقط لتجميع العقود حسب الشهر عشان المستخدم يختار أي شهر يبيه
     * (لا علاقة له بأي استبعاد تلقائي - الاستبعاد بالتاريخ انشال نهائياً،
     * المستخدم هو اللي يحدد الشهور يدوياً).
     */
    function parseListMonth(dateText) {
        if (!dateText) return null;
        const m = dateText.match(/(\d{1,2}),?\s*([؀-ۿ]+)\s*(\d{4})/);
        if (!m) return null;
        const monthNum = ARABIC_MONTHS[m[2].trim()];
        const year = parseInt(m[3], 10);
        if (!monthNum) return null;
        return {
            key: year + '-' + String(monthNum).padStart(2, '0'),
            label: m[2].trim() + ' ' + year,
        };
    }

    /**
     * يقرأ بيانات صف واحد بجدول "تتطلب إجراء" - ترتيب الأعمدة ثابت (مأخوذ
     * من الـHTML الفعلي للجدول): 0=رقم الحجز، 1=رقم الاتفاقية، 2=وقت
     * التسليم، 3=السائق، 4=اسم المدين، البقية غير مستخدمة هنا.
     */
    function readListRow(rowEl) {
        const cells = rowEl.querySelectorAll('td');
        if (cells.length < 9) return null;
        const bookingNo = cells[0].textContent.trim();
        const agreementNo = cells[1].textContent.trim();
        const dateSpans = cells[2].querySelectorAll('span');
        const dateText = dateSpans[0] ? dateSpans[0].textContent.trim() : '';
        const monthInfo = parseListMonth(dateText);
        const driverName = cells[3].textContent.trim();
        const debtorName = cells[4].textContent.trim();
        if (!bookingNo && !agreementNo) return null;
        return {
            bookingNo,
            agreementNo,
            driverName,
            debtorName,
            monthKey: monthInfo ? monthInfo.key : null,
            monthLabel: monthInfo ? monthInfo.label : null,
            __signature: bookingNo || agreementNo,
        };
    }

    /** يقرأ توقيع آخر صف بالجدول - يجيب المستند طازة من الـframe نفسه كل مرة */
    function lastRowSignature(frame) {
        const doc = getDoc(frame);
        if (!doc) return null;
        const rows = Array.from(doc.querySelectorAll('table tbody tr'));
        if (!rows.length) return null;
        const data = readListRow(rows[rows.length - 1]);
        return data ? data.__signature : null;
    }

    async function waitForListRefresh(frame, beforeSig, timeoutMs) {
        timeoutMs = timeoutMs || 6000;
        const start = Date.now();
        while (true) {
            const currentSig = lastRowSignature(frame);
            if (currentSig !== beforeSig || Date.now() - start > timeoutMs) return;
            await new Promise(r => setTimeout(r, 250));
        }
    }

    function formatElapsed(totalHours) {
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        return days + ' أيام : ' + hours + ' ساعات';
    }

    /**
     * يقرأ تاريخ ووقت التسليم الفعلي من داخل صفحة تفاصيل العقد نفسها -
     * قسم "التسليم" فيه data-testid="drop-off-date" (مثل "سبت, 04:16 م" -
     * اسم اليوم + وقت 12 ساعة + ص/م) و data-testid="drop-off-date-secondary"
     * (مثل "17/01/2026" - يوم/شهر/سنة). هذا المصدر الوحيد المعتمد لحساب
     * "المدة من وقت التسليم" - لا نحسبها من عمود القائمة قبل فتح العقد.
     */
    function parseDetailDropOffDate(detailDoc) {
        const dateText = detailDoc.querySelector('[data-testid="drop-off-date-secondary"]')?.textContent.trim();
        const timeText = detailDoc.querySelector('[data-testid="drop-off-date"]')?.textContent.trim();
        if (!dateText || !timeText) return null;

        const dateMatch = dateText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (!dateMatch) return null;
        const day = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const year = parseInt(dateMatch[3], 10);

        const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(ص|م)/);
        if (!timeMatch) return null;
        let hour = parseInt(timeMatch[1], 10);
        const minute = parseInt(timeMatch[2], 10);
        const isPm = timeMatch[3] === 'م';
        if (isPm && hour !== 12) hour += 12;
        if (!isPm && hour === 12) hour = 0;

        return new Date(year, month - 1, day, hour, minute);
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يمر على كل صفحات القائمة (بدون فتح أي تفاصيل) ويجمع بيانات كل صف
     * (بما فيها شهر/سنة التسليم) - يُستخدم لبناء قائمة الشهور المتاحة
     * وتحديد الصفوف المستهدفة قبل مرحلة الضغط الفعلي على كل صف.
     */
    async function collectAllCandidates(frame) {
        const seen = {};
        const candidates = [];
        let pageIndex = 0;
        const maxIterations = 80;

        while (pageIndex < maxIterations) {
            pageIndex++;
            const doc = getDoc(frame);
            if (!doc) break;
            const rowEls = Array.from(doc.querySelectorAll('table tbody tr'));

            rowEls.forEach(rowEl => {
                const rowData = readListRow(rowEl);
                if (!rowData || !rowData.agreementNo || seen[rowData.__signature]) return;
                seen[rowData.__signature] = true;
                candidates.push(rowData);
            });

            const nextControl = findNextPageControl(doc);
            if (!nextControl || isControlDisabled(nextControl)) break;
            const beforeSig = lastRowSignature(frame);
            try {
                nextControl.click();
            } catch (err) {
                break;
            }
            await waitForListRefresh(frame, beforeSig);
        }

        return candidates;
    }

    /** يجمع الشهور المتوفّرة فعلياً بين كل العقود (بدون تكرار)، مرتّبة زمنياً */
    function getAvailableMonths(candidates) {
        const map = {};
        candidates.forEach(c => {
            if (c.monthKey && !map[c.monthKey]) map[c.monthKey] = c.monthLabel;
        });
        return Object.keys(map).sort().map(key => ({ key, label: map[key] }));
    }

    /**
     * يفتح صفحة تفاصيل عقد واحد عبر الضغط على صفّه بالجدول مباشرة (بدل
     * رابط مباشر) - هذا الجدول ما فيه رابط <a href> إطلاقاً، والرقم
     * الداخلي المستخدم برابط التفاصيل غير ظاهر بأي عمود بالجدول، فالضغط
     * الفعلي على الصف هو الطريقة اللي يقين نفسه يعتمدها للتنقّل، وبالتالي
     * أدق من أي رابط نبنيه يدوياً.
     */
    async function visitRowDetail(frame, rowEl) {
        const startDoc = getDoc(frame);
        if (!startDoc || !startDoc.location) return null;
        const beforeHref = startDoc.location.href;

        dispatchFullClick(rowEl);

        const detailDoc = await waitFor(frame, d => {
            if (!d || !d.location || d.location.href === beforeHref) return null;
            return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
        }, 20000);

        if (!detailDoc) return null;

        // نفس زر "توسيع بيانات العميل" المستخدم بأداة العقود المتأخرة (نفس أيقونة SVG)
        const expandBtn = Array.from(detailDoc.querySelectorAll('button'))
            .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        }
        // بدل انتظار ثابت 1200ms دايماً، نستنى فعلياً لين تترسم لوحة بيانات
        // العميل (رقم الهوية) - أسرع لو الشبكة سريعة، وسقف 2500ms احتياطي
        // لو تأخرت
        const dialogWaitStart = Date.now();
        let dialog = detailDoc.querySelector('[role="dialog"]') || detailDoc;
        while (Date.now() - dialogWaitStart < 2500) {
            dialog = detailDoc.querySelector('[role="dialog"]') || detailDoc;
            if (findValueNearLabel(dialog, "رقم الهوية")) break;
            await new Promise(r => setTimeout(r, 150));
        }

        const idNumber = findValueNearLabel(dialog, "رقم الهوية");
        const phoneEl = Array.from(dialog.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        const remainingText = detailDoc.querySelector('[data-testid="remaining-balance-value"]')?.textContent.trim();
        const remaining = parseAmount(remainingText);
        const driverName = detailDoc.querySelector('[data-testid="driver-name"]')?.textContent.trim() || "";

        const dropOffDate = parseDetailDropOffDate(detailDoc);
        const elapsedTotalHours = dropOffDate ? Math.floor((new Date() - dropOffDate) / 3600000) : null;

        return { idNumber, phone, remaining, driverName, elapsedTotalHours };
    }

    /**
     * يرجع لصفحة القائمة عبر تحميل رابطها مباشرة (frame.src) بدل
     * history.back() ثم يعيد الوصول لنفس رقم الصفحة (pageIndex) بالضغط على
     * "التالي" بالتكرار اللازم - history.back() ثبت سابقاً إنه غير موثوق
     * هنا.
     */
    async function returnToListPage(frame, pageIndex) {
        frame.src = LIST_URL;
        let doc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null), 20000);
        if (!doc) return null;
        for (let i = 1; i < pageIndex; i++) {
            const nextControl = findNextPageControl(doc);
            if (!nextControl || isControlDisabled(nextControl)) break;
            const beforeSig = lastRowSignature(frame);
            try {
                nextControl.click();
            } catch (err) {
                break;
            }
            await waitForListRefresh(frame, beforeSig);
            doc = getDoc(frame);
            if (!doc) return null;
        }
        return doc;
    }

    async function runReport() {

        const frame = openHiddenFrame(LIST_URL);
        const results = [];

        showProgress('جارٍ تحميل قائمة العقود...');

        try {

            const doc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null));
            if (!doc) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, '');
                return;
            }

            showProgress('جارٍ جمع كل العقود عبر كل الصفحات...');
            const allCandidates = await collectAllCandidates(frame);

            const months = getAvailableMonths(allCandidates);
            if (months.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, '');
                return;
            }

            const selectedMonthKeys = await showMonthPrompt(months);
            if (!selectedMonthKeys || selectedMonthKeys.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                return;
            }

            const selectedSet = new Set(selectedMonthKeys);
            const monthsLabel = months.filter(m => selectedSet.has(m.key)).map(m => m.label).join('، ');
            const targetSignatures = new Set(
                allCandidates
                    .filter(c => c.monthKey && selectedSet.has(c.monthKey))
                    .slice(0, MAX_VISITS)
                    .map(c => c.__signature)
            );

            if (targetSignatures.size === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, monthsLabel);
                return;
            }

            const totalToVisit = targetSignatures.size;

            // نرجّع القائمة لأول صفحة من جديد - جمع المرشّحين تنقّل بين
            // الصفحات كلها فمرّ آخر صفحة، ولازم نبدأ الفحص الفعلي من البداية
            frame.src = LIST_URL;
            let listDoc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null));
            if (!listDoc) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, monthsLabel);
                return;
            }

            const visited = {};
            let visitedCount = 0;
            let pageIndex = 0;
            const maxIterations = 80;

            while (pageIndex < maxIterations && visitedCount < totalToVisit) {
                pageIndex++;

                // نعيد استعلام مستند الـframe وصفوف الصفحة طازة قبل كل
                // ضغطة، بدل ما نعتمد على مرجع document/مصفوفة عناصر ثابتة
                // نلقطها مرة وحدة - بعض صفحات يقين تعيد جلب/رسم الجدول
                // بالكامل لما نرجع للقائمة من تفاصيل عقد سابق
                let progressedOnThisPage = true;
                while (progressedOnThisPage && visitedCount < totalToVisit) {
                    progressedOnThisPage = false;
                    const currentDoc = getDoc(frame);
                    if (!currentDoc) break;
                    const currentRowEls = Array.from(currentDoc.querySelectorAll('table tbody tr'));

                    for (let i = 0; i < currentRowEls.length; i++) {
                        const rowEl = currentRowEls[i];
                        const rowData = readListRow(rowEl);
                        if (!rowData || !targetSignatures.has(rowData.__signature) || visited[rowData.__signature]) continue;
                        visited[rowData.__signature] = true;
                        progressedOnThisPage = true;

                        visitedCount++;
                        showProgress(`جارٍ فحص العقود... (${visitedCount} من ${totalToVisit})`);

                        const detail = await visitRowDetail(frame, rowEl);
                        if (detail) {
                            results.push({
                                agreementNo: rowData.agreementNo,
                                name: detail.driverName || rowData.driverName,
                                phone: detail.phone,
                                idNumber: detail.idNumber,
                                elapsedText: detail.elapsedTotalHours !== null ? formatElapsed(detail.elapsedTotalHours) : "-",
                                remaining: isNaN(detail.remaining) ? "" : detail.remaining.toFixed(2),
                                remainingRaw: isNaN(detail.remaining) ? 0 : detail.remaining,
                            });
                        }

                        // دائماً نرجع لنفس صفحة القائمة عبر تحميل رابطها مباشرة
                        await returnToListPage(frame, pageIndex);

                        // نخرج ونعيد استعلام الصفوف من جديد بدل ما نكمل على
                        // نفس المصفوفة (احتمال انفصلت عن الـDOM الحي)
                        break;
                    }
                }

                if (visitedCount >= totalToVisit) break;

                const pageDoc = getDoc(frame);
                if (!pageDoc) break;
                const nextControl = findNextPageControl(pageDoc);
                if (!nextControl || isControlDisabled(nextControl)) break;
                const beforeSig = lastRowSignature(frame);
                try {
                    nextControl.click();
                } catch (err) {
                    break;
                }
                await waitForListRefresh(frame, beforeSig);
            }

            try { frame.remove(); } catch (err) { /* تجاهل */ }

            showReport(results, visitedCount, monthsLabel);

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function overlayShell(innerHtml, width) {
        return (
            '<div id="closed-debt-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:' + width + 'px;background:#fff;border-radius:16px;padding:25px;' +
            'text-align:center;direction:rtl;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('closed-debt-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(text, 340));
    }

    function showMessage(text) {
        document.getElementById('closed-debt-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div style="margin-bottom:15px">' + text + '</div>' +
            '<button id="closed-debt-close" style="' +
            'padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>',
            320
        ));
        document.getElementById('closed-debt-close').onclick = () => {
            document.getElementById('closed-debt-box')?.remove();
        };
    }

    /**
     * يعرض قائمة الشهور المتوفّرة (مبنية من عمود "وقت التسليم" بالقائمة)
     * كـcheckboxes يختار منها المستخدم شهر أو أكثر - يرجّع مصفوفة مفاتيح
     * الشهور المختارة، أو null لو ألغى.
     */
    function showMonthPrompt(months) {
        return new Promise(resolve => {
            document.getElementById('closed-debt-box')?.remove();

            const checkboxesHtml = months.map(m => (
                '<label style="display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid #eee;cursor:pointer;">' +
                '<input type="checkbox" class="closed-debt-month-cb" value="' + m.key + '" checked style="width:18px;height:18px;">' +
                '<span>' + m.label + '</span>' +
                '</label>'
            )).join('');

            const html =
                '<div style="font-size:16px;font-weight:bold;margin-bottom:6px;">📕 عقود أغلقت كمديونية</div>' +
                '<div style="font-size:13px;color:#555;margin-bottom:10px;">اختر الشهر/الأشهر اللي تبي تطلع عقودها (حسب تاريخ التسليم بالقائمة):</div>' +
                '<div style="text-align:left;margin-bottom:8px;font-size:13px;">' +
                '<a href="#" id="closed-debt-select-all" style="color:#166534;text-decoration:underline;margin-left:12px;">تحديد الكل</a>' +
                '<a href="#" id="closed-debt-select-none" style="color:#dc2626;text-decoration:underline;">إلغاء الكل</a>' +
                '</div>' +
                '<div style="max-height:280px;overflow:auto;border:1px solid #eee;border-radius:8px;margin-bottom:14px;text-align:right;">' +
                checkboxesHtml +
                '</div>' +
                '<div style="display:flex;gap:8px;">' +
                '<button id="closed-debt-month-cancel" style="flex:1;padding:12px;border:none;border-radius:8px;' +
                'cursor:pointer;background:#eee;color:#333;font-size:14px;">إلغاء</button>' +
                '<button id="closed-debt-month-go" style="flex:1;padding:12px;border:none;border-radius:8px;' +
                'cursor:pointer;background:#A3E635;font-size:14px;">عرض العقود</button>' +
                '</div>';

            document.body.insertAdjacentHTML('beforeend', overlayShell(html, 380));

            document.getElementById('closed-debt-select-all').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-month-cb').forEach(cb => { cb.checked = true; });
            };
            document.getElementById('closed-debt-select-none').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-month-cb').forEach(cb => { cb.checked = false; });
            };
            document.getElementById('closed-debt-month-cancel').onclick = () => {
                document.getElementById('closed-debt-box')?.remove();
                resolve(null);
            };
            document.getElementById('closed-debt-month-go').onclick = () => {
                const selected = Array.from(document.querySelectorAll('.closed-debt-month-cb:checked')).map(cb => cb.value);
                document.getElementById('closed-debt-box')?.remove();
                resolve(selected);
            };
        });
    }

    /** أحمر = مبلغ متبقي على العميل، أخضر = مبلغ زائد له (استرداد)، رمادي = مسدّد بالضبط */
    function remainingColor(value) {
        if (value > 0) return '#dc2626';
        if (value < 0) return '#16a34a';
        return '#555';
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الاسم', 'الجوال', 'رقم الهوية', 'المدة منذ التسليم', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.name, r.phone, r.idNumber, r.elapsedText, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.elapsedText + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود أغلقت كمديونية</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:13px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:13px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>المدة منذ التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:13px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:13px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.elapsedText + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>المدة منذ التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000;
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    function handleSendWhatsApp(records) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: WHATSAPP_CONFIG.apiKey,
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        type: 'image',
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '📕 عقود أغلقت كمديونية - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('✅ تم إرسال صورة التقرير عبر واتساب بنجاح');
                        } else if (response.status === 413) {
                            console.error('[عقود أغلقت كمديونية] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[عقود أغلقت كمديونية] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[عقود أغلقت كمديونية] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[عقود أغلقت كمديونية] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب المبلغ المتبقي فقط)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastVisitedCount = 0;
    let lastMonthsLabel = '';

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (a.remainingRaw - b.remainingRaw) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), lastVisitedCount, lastMonthsLabel);
    }

    function showReport(records, visitedCount, monthsLabel) {
        document.getElementById('closed-debt-box')?.remove();
        lastVisitedCount = visitedCount;
        lastMonthsLabel = monthsLabel;

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td style="padding:9px;border-top:1px solid #eee;">' + r.agreementNo + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.name + '</td>' +
            '<td style="border-top:1px solid #eee;" dir="ltr">' + r.phone + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.idNumber + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.elapsedText + '</td>' +
            '<td style="border-top:1px solid #eee;font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="6" style="padding:20px;text-align:center;color:#777;">لا توجد عقود مطابقة حالياً</td></tr>';

        const html =
            '<div id="closed-debt-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;' +
            'z-index:999999999;font-family:Arial;">' +
            '<div style="width:min(960px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:white;border-radius:16px;overflow:hidden;direction:rtl;">' +
            '<div style="background:#A3E635;padding:18px;text-align:center;flex-shrink:0;">' +
            '<div style="font-size:16px;font-weight:bold;">📕 عقود أغلقت كمديونية</div>' +
            (monthsLabel ? (
                '<div style="font-size:12.5px;margin-top:4px;opacity:.8;">' +
                'الشهور المحددة: ' + monthsLabel +
                '</div>'
            ) : '') +
            '<div style="font-size:13px;margin-top:4px;opacity:.8;">' +
            'تم فحص ' + visitedCount + ' عقد | عدد العقود المطابقة: ' + records.length +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;">' +
            '<table style="width:100%;border-collapse:collapse;font-size:14px;">' +
            '<tr style="background:#f5f5f5;position:sticky;top:0;">' +
            '<th style="padding:10px">رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>المدة منذ التسليم</th>' +
            '<th id="closed-debt-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div style="padding:15px;text-align:center;display:flex;gap:8px;flex-shrink:0;">' +
            '<button id="closed-debt-copy" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">📋 نسخ</button>' +
            '<button id="closed-debt-print" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">🖨️ طباعة</button>' +
            '<button id="closed-debt-whatsapp" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">📱 إرسال صورة واتساب</button>' +
            '<button id="closed-debt-refresh" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">🔄 تحديث</button>' +
            '<button id="closed-debt-close" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#A3E635;cursor:pointer;">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('closed-debt-close').onclick = () => {
            document.getElementById('closed-debt-box')?.remove();
        };
        document.getElementById('closed-debt-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport();
        };
        document.getElementById('closed-debt-sort-remaining').onclick = () => {
            handleSortClick(records, 'remaining');
        };
        document.getElementById('closed-debt-print').onclick = () => {
            printReport(records);
        };
        document.getElementById('closed-debt-whatsapp').onclick = () => {
            handleSendWhatsApp(records);
        };
        document.getElementById('closed-debt-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                alert('تم نسخ الجدول');
            } catch (err) {
                alert('تعذّر النسخ: ' + err.message);
            }
        };
    }

    waitCore();

})();
