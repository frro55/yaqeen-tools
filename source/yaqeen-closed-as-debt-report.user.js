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
    // عدد الإطارات المتوازية اللي تفحص العقود بنفس الوقت. جرّبنا التوازي
    // سابقاً بس بمنطق الضغط على صفوف القائمة الكبيرة المشتركة، وفشل (توقف
    // بالضبط عند عدد الإطارات). اتضح لاحقاً إن السبب الحقيقي كان خللين
    // بالتوقيت (hydration الصف + سباق تحديث الرابط) مو تعارض جلسات - وصرنا
    // نصلحهم الاثنين. بما إن كل عامل الحين يفتح رابط قائمته المصغّرة
    // الخاصة به (مستقل تماماً عن بقية العمّال)، التوازي المفروض يصير آمن.
    // نبدأ برقم متحفّظ (3) بدل 4 المستخدمة بأدوات ثانية.
    const CHECK_CONCURRENCY = 3;

    /**
     * قائمة مفلترة برقم اتفاقية واحد بالضبط - ترجّع صف واحد بس (نفس رقم
     * الاتفاقية اللي طلبناه)، فنضغط عليه وندخل تفاصيله بدون الحاجة لتصفّح
     * القائمة الكبيرة (500 عقد) والبحث فيها كل مرة، وبدون الحاجة نرجع لها
     * بعدها (نروح مباشرة لرابط العقد التالي). أخف وأسرع بكثير من إعادة
     * تحميل القائمة الكاملة، وبما إنه صف واحد بس يترسم أسرع فيصير الضغط
     * عليه أوثق (وقت أقل لمشكلة hydration اللي واجهناها بالقائمة الكبيرة).
     */
    function buildMiniListUrl(agreementNo) {
        return 'https://yaqeen.lumirental.com/rental/branches/29/bookings?agreementNo=' + encodeURIComponent(agreementNo);
    }

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
    async function visitRowDetail(frame, rowEl, label) {
        const startDoc = getDoc(frame);
        if (!startDoc || !startDoc.location) {
            console.warn('[عقود أغلقت كمديونية] تعذّر قراءة مستند القائمة قبل الضغط على الصف:', label);
            return null;
        }
        const beforeHref = startDoc.location.href;

        // بعض المرات الضغطة الأولى تُتجاهل بصمت (الصف لسا ما خلص React ربط
        // مستمع الضغط عليه - hydration - رغم مهلة الاستقرار قبلها). بدل
        // انتظار 20 ثانية كاملة على أمل ضغطة وحدة، نعيد الضغط كل 2.5 ثانية
        // (على نفس الصف، نعيد استعلامه طازة كل مرة) لين ينجح التنقّل أو
        // تخلص المهلة الكلية - هذا يصحّح نفسه تلقائياً لو الضغطة الأولى ضاعت
        const totalBudgetMs = 20000;
        const retryEveryMs = 2500;
        const overallStart = Date.now();
        let detailDoc = null;

        dispatchFullClick(rowEl);

        while (!detailDoc && Date.now() - overallStart < totalBudgetMs) {
            detailDoc = await waitFor(frame, d => {
                if (!d || !d.location || d.location.href === beforeHref) return null;
                return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
            }, retryEveryMs);

            if (!detailDoc && Date.now() - overallStart < totalBudgetMs) {
                try {
                    const currentDoc = getDoc(frame);
                    if (currentDoc && currentDoc.location && currentDoc.location.href === beforeHref) {
                        const freshRow = currentDoc.querySelector('table tbody tr');
                        if (freshRow) dispatchFullClick(freshRow);
                    }
                } catch (err) { /* تجاهل */ }
            }
        }

        if (!detailDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn(
                '[عقود أغلقت كمديونية] انتهت مهلة فتح تفاصيل العقد (20 ثانية) رغم إعادة الضغط:', label,
                '| الرابط قبل الضغط:', beforeHref,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        // هذي الصفحة فيها زرّين بنفس أيقونة السهم (M181.66,133.66): "عرض
        // التفاصيل" (نص ظاهر، لأكورديون ثاني ما له علاقة ببيانات العميل)
        // وزر توسيع بيانات العميل الحقيقي (أيقونة بس، بدون أي نص). نفلتر
        // على عدم وجود نص عشان نضمن نضغط الزر الصحيح
        const expandBtn = Array.from(detailDoc.querySelectorAll('button'))
            .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66') && x.textContent.trim() === '');
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        } else {
            console.warn('[عقود أغلقت كمديونية] ما لقينا زر توسيع بيانات العميل بصفحة التفاصيل:', label);
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

        if (!idNumber || !phone) {
            console.warn(
                '[عقود أغلقت كمديونية] بيانات العميل ناقصة بعد المحاولة:', label,
                '| رقم الهوية:', idNumber || '(فاضي)',
                '| الجوال:', phone || '(فاضي)',
                '| وُجد زر التوسيع:', !!expandBtn
            );
        }

        const remainingText = detailDoc.querySelector('[data-testid="remaining-balance-value"]')?.textContent.trim();
        const remaining = parseAmount(remainingText);
        const driverName = detailDoc.querySelector('[data-testid="driver-name"]')?.textContent.trim() || "";

        return { idNumber, phone, remaining, driverName };
    }

    /**
     * يفحص عقداً واحداً عبر قائمة مصغّرة برقم اتفاقيته (buildMiniListUrl) -
     * تطلع صف واحد بس، نستنى استقرار الصف (hydration، نفس مشكلة القائمة
     * الكبيرة) ثم نضغطه وندخل تفاصيله عبر visitRowDetail. ما فيه أي رجوع
     * لأي قائمة بعدها - العقد التالي يروح لرابطه الخاص مباشرة.
     */
    async function checkOneAgreement(frame, candidate) {
        // مهم: نتحقق إن رابط الإطار فعلاً تحوّل لرابط هذا العقد بالذات
        // (مو بس "فيه صف بجدول") - لو التنقّل لسا ما خلص، ممكن نلقط صفحة
        // العقد السابق (لسا مرسومة) ونظن إننا وصلنا للعقد الجديد
        const expectedUrlFragment = 'agreementNo=' + encodeURIComponent(candidate.agreementNo);
        frame.src = buildMiniListUrl(candidate.agreementNo);
        const listDoc = await waitFor(frame, d => {
            if (!d || !d.location || d.location.href.indexOf(expectedUrlFragment) === -1) return null;
            return d.querySelectorAll('table tbody tr').length > 0 ? d : null;
        }, 20000);
        if (!listDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn(
                '[عقود أغلقت كمديونية] انتهت مهلة تحميل القائمة المصغّرة (20 ثانية):', candidate.agreementNo,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        // الصف قد يظهر لحظياً ثم يُعاد رسمه (يختفي مؤقتاً) قبل ما يستقر -
        // فحص وحيد بتوقيت ثابت ممكن يقع بالضبط بفجوة إعادة الرسم هذي.
        // نتأكد من وجوده بشكل متكرر لين يثبت (أو تنتهي المهلة)
        let rowEl = null;
        const rowWaitStart = Date.now();
        while (!rowEl && Date.now() - rowWaitStart < 5000) {
            await new Promise(r => setTimeout(r, 300));
            const currentDoc = getDoc(frame);
            rowEl = currentDoc && currentDoc.querySelector('table tbody tr');
        }

        if (!rowEl) {
            console.warn('[عقود أغلقت كمديونية] القائمة المصغّرة ما رجّعت أي صف مستقر:', candidate.agreementNo);
            return null;
        }

        return await visitRowDetail(frame, rowEl, candidate.agreementNo);
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
            const candidates = allCandidates
                .filter(c => c.monthKey && selectedSet.has(c.monthKey) && c.agreementNo)
                .slice(0, MAX_VISITS);

            if (candidates.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, monthsLabel);
                return;
            }

            try { frame.remove(); } catch (err) { /* تجاهل */ }

            const totalToVisit = candidates.length;
            let visitedCount = 0;
            showProgress(`جارٍ فحص العقود... (0 من ${totalToVisit})`);

            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    const candidate = candidates[i];
                    try {
                        const detail = await checkOneAgreement(workerFrame, candidate);
                        if (detail) {
                            results.push({
                                agreementNo: candidate.agreementNo,
                                name: detail.driverName || candidate.driverName,
                                phone: detail.phone,
                                idNumber: detail.idNumber,
                                monthKey: candidate.monthKey || "",
                                monthLabel: candidate.monthLabel || "-",
                                remaining: isNaN(detail.remaining) ? "" : detail.remaining.toFixed(2),
                                remainingRaw: isNaN(detail.remaining) ? 0 : detail.remaining,
                            });
                        }
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                    visitedCount++;
                    showProgress(`جارٍ فحص العقود... (${visitedCount} من ${totalToVisit})`);
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            showReport(results, visitedCount, monthsLabel);

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
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
        '.yq-branch-list{text-align:right;max-height:280px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:10px 14px;background:#fbfbf9;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;position:relative;' +
        'background:#fff;color:#1c1c1a;border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-close{position:absolute;top:20px;left:24px;background:transparent;border:0;font-size:18px;' +
        'cursor:pointer;color:#a19c92;padding:8px;border-radius:9px;line-height:1;transition:background .15s,color .15s;}' +
        '.yq-report-close:hover{background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-stat-row{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}' +
        '.yq-stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
        'font-size:12.5px;font-weight:700;white-space:nowrap;}' +
        '.yq-stat-chip strong{font-size:14px;font-weight:800;}' +
        '.yq-stat-chip--result{background:#fef3c7;color:#b45309;}' +
        '.yq-stat-chip--ok{background:#dcfce7;color:#16a34a;}' +
        '.yq-report-actions{display:flex;gap:8px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;' +
        'border-top:1.5px solid #cec7b4;align-items:center;}' +
        '.yq-icon-btn{cursor:pointer;border:1.5px solid #cec7b4;background:#fff;color:#1c1c1a;font-family:inherit;' +
        'width:38px;height:38px;border-radius:11px;font-size:16px;line-height:1;transition:background .15s,border-color .15s;' +
        'display:flex;align-items:center;justify-content:center;}' +
        '.yq-icon-btn:hover{background:#f1f0ea;border-color:#a19c92;}' +
        '.yq-btn-labeled{cursor:pointer;border:0;border-radius:11px;height:38px;padding:0 16px;font-size:13.5px;' +
        'font-weight:800;font-family:inherit;display:inline-flex;align-items:center;gap:6px;' +
        'background:#f1f0ea;color:#1c1c1a;transition:background .15s;}' +
        '.yq-btn-labeled:hover{background:#e5e2d5;}' +
        '.yq-btn-labeled--send{background:#16a34a;color:#fff;}' +
        '.yq-btn-labeled--send:hover{filter:brightness(1.06);}' +
        '.yq-btn-labeled--whatsapp{background:linear-gradient(160deg,#25D366,#16a34a);color:#fff;}' +
        '.yq-btn-labeled--whatsapp:hover{filter:brightness(1.06);}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:16px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:13.5px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-closed-debt')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-closed-debt';
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
            '<div id="closed-debt-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('closed-debt-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('closed-debt-box')?.remove();
        showToast(text, type || 'error');
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
                '<label><input type="checkbox" class="closed-debt-month-cb" value="' + m.key + '" checked> ' +
                '<span>' + m.label + '</span></label>'
            )).join('');

            const html =
                '<h3>📕 عقود أغلقت كمديونية</h3>' +
                '<div class="yq-desc">اختر الشهر/الأشهر اللي تبي تطلع عقودها (حسب تاريخ التسليم بالقائمة):</div>' +
                '<div class="yq-link-row">' +
                '<span>الشهور</span>' +
                '<span><a href="#" id="closed-debt-select-all">تحديد الكل</a> · ' +
                '<a href="#" id="closed-debt-select-none">إلغاء الكل</a></span>' +
                '</div>' +
                '<div class="yq-branch-list">' + checkboxesHtml + '</div>' +
                '<button id="closed-debt-month-go" class="yq-btn yq-btn-primary">عرض العقود</button>' +
                '<button id="closed-debt-month-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>';

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
        const header = ['رقم العقد', 'الاسم', 'الجوال', 'رقم الهوية', 'شهر التسليم', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.name, r.phone, r.idNumber, r.monthLabel, r.remaining].join('\t'));
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
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود أغلقت كمديونية</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            '.stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
            'font-size:13px;font-weight:700;background:#fef3c7;color:#b45309;margin:8px 0;}' +
            '.stat-chip strong{font-size:14px;font-weight:800;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="stat-chip">📕 <strong>' + records.length + '</strong> عقد</div>' +
            '<div class="meta">' + now + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
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
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        '.stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
        'font-size:13px;font-weight:700;background:#fef3c7;color:#b45309;margin:8px 0;}' +
        '.stat-chip strong{font-size:14px;font-weight:800;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="stat-chip">📕 <strong>' + records.length + '</strong> عقد</div>' +
            '<div class="meta">' + now + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
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
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '📕 عقود أغلقت كمديونية - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
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
        } else if (key === 'month') {
            // monthKey بصيغة "YYYY-MM" فيترتب زمنياً بالمقارنة النصية العادية
            sorted.sort((a, b) => (a.monthKey || '').localeCompare(b.monthKey || '') * sortState.dir);
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
        injectYqStyles();
        lastVisitedCount = visitedCount;
        lastMonthsLabel = monthsLabel;

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td>' +
            '<td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:800;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="6" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود مطابقة حالياً</td></tr>';

        const html =
            '<div id="closed-debt-box" class="yq-overlay">' +
            '<div style="width:min(960px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<button type="button" class="yq-report-close" id="closed-debt-close" aria-label="إغلاق">✕</button>' +
            '<div class="yq-report-title">📕 عقود أغلقت كمديونية</div>' +
            (monthsLabel ? (
                '<div class="yq-report-sub">الشهور المحددة: ' + monthsLabel + '</div>'
            ) : '') +
            '<div class="yq-stat-row">' +
            '<span class="yq-stat-chip yq-stat-chip--result">📕 <strong>' + records.length + '</strong> عقد</span>' +
            '</div>' +
            '<div class="yq-report-sub">تم فحص ' + visitedCount + ' عقد</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th id="closed-debt-sort-month" style="cursor:pointer;user-select:none;">شهر التسليم' + sortIndicator('month') + '</th>' +
            '<th id="closed-debt-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="closed-debt-copy" class="yq-icon-btn" title="نسخ الجدول">📋</button>' +
            '<button id="closed-debt-print" class="yq-icon-btn" title="طباعة التقرير">🖨️</button>' +
            '<button id="closed-debt-refresh" class="yq-icon-btn" title="تحديث">🔄</button>' +
            '<button id="closed-debt-whatsapp" class="yq-btn-labeled yq-btn-labeled--whatsapp">📱 إرسال</button>' +
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
        document.getElementById('closed-debt-sort-month').onclick = () => {
            handleSortClick(records, 'month');
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
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
    }

    waitCore();

})();
