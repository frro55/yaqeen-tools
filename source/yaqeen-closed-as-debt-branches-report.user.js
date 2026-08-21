// ==UserScript==
// @name         Yaqeen Tool - عقود أغلقت كمديونية (اختيار الفرع)
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  نفس أداة "عقود أغلقت كمديونية" الأصلية بالضبط، بس تختار الفرع/الفروع المطلوب فحصها من قائمة بدل فرع مطار جدة الثابت
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

    // قائمة الفروع المتاحة للاختيار (نفس قائمة أدوات "اختيار الفرع" الثانية) -
    // المستخدم يختار فرع أو أكثر بكل مرة يشغّل فيها الأداة (بعكس أداة "عقود
    // أغلقت كمديونية" الأصلية اللي تفحص فرع مطار جدة فقط)
    const BRANCHES = [
        { id: 29, name: 'مطار جدة' },
        { id: 11, name: 'طريق المدينة' },
        { id: 12, name: 'شارع التحلية' },
        { id: 30, name: 'مطار الطائف' },
        { id: 10, name: 'ينبع - الهيئة الملكية' },
        { id: 25, name: 'مطار الأمير عبدالمحسن - ينبع' },
        { id: 36, name: 'المدينة المنورة' },
        { id: 59, name: 'مطار الأمير محمد بن عبدالعزيز الدولي - المدينة' },
        { id: 70, name: 'مدينة العلا' },
        { id: 217, name: 'الطائف' },
        { id: 218, name: 'طريق الأمير سلطان' },
    ];

    function branchNameById(branchId) {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch ? branch.name : ('فرع #' + branchId);
    }

    function listUrlForBranch(branchId) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings/needs-action?pendingActions=TAJEER_SUSPENDED&pageSize=500';
    }

    // سقف أمان لعدد صفحات التفاصيل اللي نفتحها فعلياً بجلسة واحدة (كل الفروع مع بعض)
    const MAX_VISITS = 300;
    // عدد الإطارات المتوازية اللي تفحص العقود بنفس الوقت - نفس منطق الأداة
    // الأصلية بالضبط (راجع تعليقها هناك لتفاصيل ليش التوازي آمن هنا)
    const CHECK_CONCURRENCY = 3;

    /**
     * قائمة مفلترة برقم اتفاقية واحد بالضبط ضمن فرع معيّن - نفس فكرة الأداة
     * الأصلية بالضبط، بس رقم الفرع بارامتر بدل ثابت (29)
     */
    function buildMiniListUrl(branchId, agreementNo) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings?agreementNo=' + encodeURIComponent(agreementNo);
    }

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "closed-as-debt-branches",
            name: "📕 عقود أغلقت كمديونية (اختيار الفرع)",
            run() {
                showBranchPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات الأداة الأصلية بالضبط)
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
    // ترقيم الصفحات (نفس منطق الأداة الأصلية)
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
    // قراءة صف القائمة (نفس منطق الأداة الأصلية)
    // ==========================================================

    const ARABIC_MONTHS = {
        'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6,
        'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10,
        'نوفمبر': 11, 'ديسمبر': 12,
    };

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
     * يقرأ بيانات صف واحد بجدول "تتطلب إجراء" - ترتيب الأعمدة ثابت (نفس
     * الأداة الأصلية بالضبط: 0=رقم الحجز، 1=رقم الاتفاقية، 2=وقت التسليم،
     * 3=السائق، 4=اسم المدين). branchId/branchName يُضافان بعدها من الخارج.
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
    // جمع مرشّحي فرع واحد + كل الفروع المختارة
    // ==========================================================

    /** نفس collectAllCandidates بالأداة الأصلية بالضبط - يمر على صفحات فرع واحد فقط */
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

    /**
     * يمر على الفروع المختارة فرع تلو فرع (لا بالتوازي - نفس سبب أدوات
     * "اختيار الفرع" الثانية: عدة قوائم ثقيلة بنفس اللحظة تتنافس على الموارد)،
     * ويجمع مرشّحي كل فرع مع وسم كل واحد بفرعه.
     */
    async function collectAllCandidatesForBranches(branchIds) {
        let allCandidates = [];
        for (const branchId of branchIds) {
            const branchName = branchNameById(branchId);
            showProgress('جارٍ تحميل قائمة العقود - ' + branchName + '...');
            const frame = openHiddenFrame(listUrlForBranch(branchId));
            try {
                const doc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null));
                if (doc) {
                    showProgress('جارٍ جمع عقود ' + branchName + ' عبر كل الصفحات...');
                    const candidates = await collectAllCandidates(frame);
                    candidates.forEach(c => { c.branchId = branchId; c.branchName = branchName; });
                    allCandidates = allCandidates.concat(candidates);
                }
            } catch (err) {
                console.error('[عقود أغلقت كمديونية] تعذّر تحميل فرع ' + branchName + ':', err);
            } finally {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
            }
        }
        return allCandidates;
    }

    /** يجمع الشهور المتوفّرة فعلياً بين كل العقود (بدون تكرار)، مرتّبة زمنياً */
    function getAvailableMonths(candidates) {
        const map = {};
        candidates.forEach(c => {
            if (c.monthKey && !map[c.monthKey]) map[c.monthKey] = c.monthLabel;
        });
        return Object.keys(map).sort().map(key => ({ key, label: map[key] }));
    }

    // ==========================================================
    // فحص عقد واحد (نفس منطق الأداة الأصلية بالضبط، بدون أي تغيير بالتوقيت/إعادة المحاولة)
    // ==========================================================

    async function visitRowDetail(frame, rowEl, label) {
        const startDoc = getDoc(frame);
        if (!startDoc || !startDoc.location) {
            console.warn('[عقود أغلقت كمديونية] تعذّر قراءة مستند القائمة قبل الضغط على الصف:', label);
            return null;
        }
        const beforeHref = startDoc.location.href;

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

        const expandBtn = Array.from(detailDoc.querySelectorAll('button'))
            .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66') && x.textContent.trim() === '');
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        } else {
            console.warn('[عقود أغلقت كمديونية] ما لقينا زر توسيع بيانات العميل بصفحة التفاصيل:', label);
        }
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
     * نفس checkOneAgreement بالأداة الأصلية بالضبط، بس رابط القائمة المصغّرة
     * يُبنى برقم فرع المرشّح (candidate.branchId) بدل فرع ثابت
     */
    async function checkOneAgreement(frame, candidate) {
        const expectedUrlFragment = 'agreementNo=' + encodeURIComponent(candidate.agreementNo);
        frame.src = buildMiniListUrl(candidate.branchId, candidate.agreementNo);
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

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    async function runReport(branchIds) {

        const results = [];

        try {

            const allCandidates = await collectAllCandidatesForBranches(branchIds);

            const months = getAvailableMonths(allCandidates);
            if (months.length === 0) {
                showReport([], 0, '', branchIds);
                return;
            }

            const selectedMonthKeys = await showMonthPrompt(months);
            if (!selectedMonthKeys || selectedMonthKeys.length === 0) {
                return;
            }

            const selectedSet = new Set(selectedMonthKeys);
            const monthsLabel = months.filter(m => selectedSet.has(m.key)).map(m => m.label).join('، ');
            const candidates = allCandidates
                .filter(c => c.monthKey && selectedSet.has(c.monthKey) && c.agreementNo)
                .slice(0, MAX_VISITS);

            if (candidates.length === 0) {
                showReport([], 0, monthsLabel, branchIds);
                return;
            }

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
                                branchName: candidate.branchName,
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

            showReport(results, visitedCount, monthsLabel, branchIds);

        } catch (err) {
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function overlayShell(innerHtml, width) {
        return (
            '<div id="closed-debt-branches-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:' + width + 'px;background:#fff;border-radius:16px;padding:25px;' +
            'text-align:center;direction:rtl;">' + innerHtml + '</div></div>'
        );
    }

    /** يبني اختيار الفروع (Checkboxes) - defaultBranchIds فاضية أو غير معطاة = كلهم محدَّدين افتراضياً */
    function showBranchPrompt(defaultBranchIds) {
        document.getElementById('closed-debt-branches-box')?.remove();

        const preselected = (defaultBranchIds && defaultBranchIds.length) ? defaultBranchIds : BRANCHES.map(b => b.id);
        const branchCheckboxesHtml = BRANCHES.map(b => (
            '<label style="display:flex;align-items:center;gap:8px;padding:6px 2px;font-size:15px;cursor:pointer;">' +
            '<input type="checkbox" class="closed-debt-branch-cb" value="' + b.id + '"' +
            (preselected.indexOf(b.id) !== -1 ? ' checked' : '') + '> ' + b.name +
            '</label>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3 style="margin-top:0">📕 عقود أغلقت كمديونية</h3>' +
            '<div style="margin:15px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;">' +
            '<span>الفروع:</span>' +
            '<span>' +
            '<a href="#" id="closed-debt-branch-select-all" style="font-size:12.5px;color:#2563eb;text-decoration:none;">تحديد الكل</a>' +
            ' | <a href="#" id="closed-debt-branch-select-none" style="font-size:12.5px;color:#2563eb;text-decoration:none;">إلغاء الكل</a>' +
            '</span>' +
            '</div>' +
            '<div id="closed-debt-branches-list" style="' +
            'text-align:right;max-height:220px;overflow:auto;border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin-bottom:14px;">' +
            branchCheckboxesHtml + '</div>' +
            '<button id="closed-debt-branch-submit" style="' +
            'width:100%;padding:12px;border:none;border-radius:8px;cursor:pointer;' +
            'background:#A3E635;font-size:15px;">التالي - اختيار الشهر</button>' +
            '<button id="closed-debt-branch-cancel" style="' +
            'width:100%;padding:12px;margin-top:8px;border:none;border-radius:8px;cursor:pointer;' +
            'background:#eee;color:#333;font-size:15px;">إلغاء</button>',
            340
        ));

        document.getElementById('closed-debt-branch-select-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.closed-debt-branch-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('closed-debt-branch-select-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.closed-debt-branch-cb').forEach(cb => { cb.checked = false; });
        };
        document.getElementById('closed-debt-branch-cancel').onclick = () => {
            document.getElementById('closed-debt-branches-box')?.remove();
        };
        document.getElementById('closed-debt-branch-submit').onclick = () => {
            const branchIds = Array.from(document.querySelectorAll('.closed-debt-branch-cb:checked')).map(cb => parseInt(cb.value, 10));
            if (branchIds.length === 0) {
                alert('اختر فرع واحد على الأقل');
                return;
            }
            document.getElementById('closed-debt-branches-box')?.remove();
            runReport(branchIds);
        };
    }

    function showProgress(text) {
        document.getElementById('closed-debt-branches-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(text, 340));
    }

    function showMessage(text) {
        document.getElementById('closed-debt-branches-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div style="margin-bottom:15px">' + text + '</div>' +
            '<button id="closed-debt-branches-close-msg" style="' +
            'padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>',
            320
        ));
        document.getElementById('closed-debt-branches-close-msg').onclick = () => {
            document.getElementById('closed-debt-branches-box')?.remove();
        };
    }

    /** نفس عرض اختيار الشهر بالأداة الأصلية بالضبط */
    function showMonthPrompt(months) {
        return new Promise(resolve => {
            document.getElementById('closed-debt-branches-box')?.remove();

            const checkboxesHtml = months.map(m => (
                '<label style="display:flex;align-items:center;gap:8px;padding:8px 4px;border-bottom:1px solid #eee;cursor:pointer;">' +
                '<input type="checkbox" class="closed-debt-branches-month-cb" value="' + m.key + '" checked style="width:18px;height:18px;">' +
                '<span>' + m.label + '</span>' +
                '</label>'
            )).join('');

            const html =
                '<div style="font-size:16px;font-weight:bold;margin-bottom:6px;">📕 عقود أغلقت كمديونية</div>' +
                '<div style="font-size:13px;color:#555;margin-bottom:10px;">اختر الشهر/الأشهر اللي تبي تطلع عقودها (حسب تاريخ التسليم بالقائمة):</div>' +
                '<div style="text-align:left;margin-bottom:8px;font-size:13px;">' +
                '<a href="#" id="closed-debt-branches-select-all" style="color:#166534;text-decoration:underline;margin-left:12px;">تحديد الكل</a>' +
                '<a href="#" id="closed-debt-branches-select-none" style="color:#dc2626;text-decoration:underline;">إلغاء الكل</a>' +
                '</div>' +
                '<div style="max-height:280px;overflow:auto;border:1px solid #eee;border-radius:8px;margin-bottom:14px;text-align:right;">' +
                checkboxesHtml +
                '</div>' +
                '<div style="display:flex;gap:8px;">' +
                '<button id="closed-debt-branches-month-cancel" style="flex:1;padding:12px;border:none;border-radius:8px;' +
                'cursor:pointer;background:#eee;color:#333;font-size:14px;">إلغاء</button>' +
                '<button id="closed-debt-branches-month-go" style="flex:1;padding:12px;border:none;border-radius:8px;' +
                'cursor:pointer;background:#A3E635;font-size:14px;">عرض العقود</button>' +
                '</div>';

            document.body.insertAdjacentHTML('beforeend', overlayShell(html, 380));

            document.getElementById('closed-debt-branches-select-all').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-branches-month-cb').forEach(cb => { cb.checked = true; });
            };
            document.getElementById('closed-debt-branches-select-none').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-branches-month-cb').forEach(cb => { cb.checked = false; });
            };
            document.getElementById('closed-debt-branches-month-cancel').onclick = () => {
                document.getElementById('closed-debt-branches-box')?.remove();
                resolve(null);
            };
            document.getElementById('closed-debt-branches-month-go').onclick = () => {
                const selected = Array.from(document.querySelectorAll('.closed-debt-branches-month-cb:checked')).map(cb => cb.value);
                document.getElementById('closed-debt-branches-box')?.remove();
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
        const header = ['رقم العقد', 'الفرع', 'الاسم', 'الجوال', 'رقم الهوية', 'شهر التسليم', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.branchName, r.name, r.phone, r.idNumber, r.monthLabel, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, branchesLabel) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

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
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
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
        '.meta{color:#555;font-size:13px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:13px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records, branchesLabel) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records, branchesLabel) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, branchesLabel);
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

    function handleSendWhatsApp(records, branchesLabel) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, branchesLabel)
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
                        caption: '📕 عقود أغلقت كمديونية - ' + branchesLabel + ' - ' + new Date().toLocaleString('ar-SA'),
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
    // الترتيب (فرز حسب المبلغ المتبقي أو شهر التسليم)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastVisitedCount = 0;
    let lastMonthsLabel = '';
    let lastBranchIds = [];

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (a.remainingRaw - b.remainingRaw) * sortState.dir);
        } else if (key === 'month') {
            sorted.sort((a, b) => (a.monthKey || '').localeCompare(b.monthKey || '') * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), lastVisitedCount, lastMonthsLabel, lastBranchIds);
    }

    function showReport(records, visitedCount, monthsLabel, branchIds) {
        document.getElementById('closed-debt-branches-box')?.remove();
        lastVisitedCount = visitedCount;
        lastMonthsLabel = monthsLabel;
        lastBranchIds = branchIds || [];
        const branchesLabel = lastBranchIds.map(branchNameById).join('، ');

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td style="padding:9px;border-top:1px solid #eee;">' + r.agreementNo + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.branchName + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.name + '</td>' +
            '<td style="border-top:1px solid #eee;" dir="ltr">' + r.phone + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.idNumber + '</td>' +
            '<td style="border-top:1px solid #eee;">' + r.monthLabel + '</td>' +
            '<td style="border-top:1px solid #eee;font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="7" style="padding:20px;text-align:center;color:#777;">لا توجد عقود مطابقة حالياً</td></tr>';

        const html =
            '<div id="closed-debt-branches-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;' +
            'z-index:999999999;font-family:Arial;">' +
            '<div style="width:min(1000px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:white;border-radius:16px;overflow:hidden;direction:rtl;">' +
            '<div style="background:#A3E635;padding:18px;text-align:center;flex-shrink:0;">' +
            '<div style="font-size:16px;font-weight:bold;">📕 عقود أغلقت كمديونية</div>' +
            '<div style="font-size:12.5px;margin-top:4px;opacity:.8;">الفروع: ' + branchesLabel + '</div>' +
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
            '<th style="padding:10px">رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th id="closed-debt-branches-sort-month" style="cursor:pointer;user-select:none;">شهر التسليم' + sortIndicator('month') + '</th>' +
            '<th id="closed-debt-branches-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div style="padding:15px;text-align:center;display:flex;gap:8px;flex-shrink:0;flex-wrap:wrap;">' +
            '<button id="closed-debt-branches-copy" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">📋 نسخ</button>' +
            '<button id="closed-debt-branches-print" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">🖨️ طباعة</button>' +
            '<button id="closed-debt-branches-whatsapp" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">📱 إرسال صورة واتساب</button>' +
            '<button id="closed-debt-branches-change" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">🏢 تغيير الفروع</button>' +
            '<button id="closed-debt-branches-refresh" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#eee;color:#333;cursor:pointer;">🔄 تحديث</button>' +
            '<button id="closed-debt-branches-close" style="flex:1;padding:10px;border:none;border-radius:8px;' +
            'background:#A3E635;cursor:pointer;">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('closed-debt-branches-close').onclick = () => {
            document.getElementById('closed-debt-branches-box')?.remove();
        };
        document.getElementById('closed-debt-branches-change').onclick = () => {
            showBranchPrompt(lastBranchIds);
        };
        document.getElementById('closed-debt-branches-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(lastBranchIds);
        };
        document.getElementById('closed-debt-branches-sort-remaining').onclick = () => {
            handleSortClick(records, 'remaining');
        };
        document.getElementById('closed-debt-branches-sort-month').onclick = () => {
            handleSortClick(records, 'month');
        };
        document.getElementById('closed-debt-branches-print').onclick = () => {
            printReport(records, branchesLabel);
        };
        document.getElementById('closed-debt-branches-whatsapp').onclick = () => {
            handleSendWhatsApp(records, branchesLabel);
        };
        document.getElementById('closed-debt-branches-copy').onclick = async () => {
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
