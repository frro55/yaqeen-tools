// ==UserScript==
// @name         Yaqeen Tool - عقود الشركات غير الممددة (فروع)
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  نفس أداة "عقود الشركات غير الممددة" بس تختار الفرع المطلوب فحصه من قائمة (فرع واحد بكل مرة، مو كل الفروع مع بعض)
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

    // قائمة الفروع المتاحة للاختيار - المستخدم يختار فرع واحد بكل مرة يشغّل
    // فيها الأداة (بعكس أداة "عقود الشركات غير الممددة" الأصلية اللي تفحص
    // فرع مطار جدة فقط، وبعكس أي نسخة تفحص كل الفروع مع بعض)
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

    function lateReturnUrlForBranch(branchId) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings?status=LATE_RETURN&pageSize=500';
    }

    function branchNameById(branchId) {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch ? branch.name : ('فرع #' + branchId);
    }

    const MAX_AGREEMENTS = 300;
    // عدد الإطارات المتوازية لفحص تفاصيل العقود - كل إطار يفحص عقوده بالتتابع،
    // فقط موزّعين على عدة إطارات بدل واحد فقط لتسريع العملية (نفس أسلوب أداة
    // "العقود المتأخرة في السداد (أفراد)")
    const CHECK_CONCURRENCY = 4;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "company-extension-branches",
            name: "🏢 عقود الشركات (اختيار الفرع)",
            run() {
                showBranchPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
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

    function normalizeArabic(text) {
        return (text || '')
            .replace(/[ً-ْ]/g, '')
            .replace(/[إأآا]/g, 'ا')
            .replace(/ى/g, 'ي')
            .replace(/ة/g, 'ه')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function findColumnIndex(headerCells, labelVariants) {
        const normalizedVariants = labelVariants.map(normalizeArabic);
        for (let i = 0; i < headerCells.length; i++) {
            const headerText = normalizeArabic(headerCells[i].textContent);
            if (normalizedVariants.some(v => headerText.indexOf(v) !== -1)) return i;
        }
        return -1;
    }

    /** يحوّل نص مدة بصيغة "X أيام : Y ساعات" إلى إجمالي عدد الساعات (رقم صحيح) */
    function parseDurationToHours(text) {
        if (!text) return null;
        const match = text.match(/(\d+)\s*أيام?\s*:\s*(\d+)\s*ساعات?/);
        if (!match) return null;
        return parseInt(match[1], 10) * 24 + parseInt(match[2], 10);
    }

    /** يحوّل إجمالي عدد ساعات إلى نفس صيغة يقين "X أيام : Y ساعات" */
    function formatHoursToDuration(totalHours) {
        if (totalHours == null || isNaN(totalHours)) return "";
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        return days + " أيام : " + hours + " ساعات";
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

    /**
     * يقرأ صفوف قائمة "العقود المتأخرة" - بعكس أداة الأفراد، هنا نحتفظ فقط
     * بالصفوف اللي عمود "اسم المدين" فيها اسم شركة حقيقي (مو "غير متاح")،
     * لأن هذي الأداة مخصصة لعقود الشركات تحديداً.
     */
    function readLateReturnRows(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const bookingIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
        const driverIdx = findColumnIndex(headerCells, ["السائق"]);
        const debtorIdx = findColumnIndex(headerCells, ["اسم المدين"]);

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return null;

            // "غير متاح" = فرد (بدون شركة راعية) - نتجاهله، هذي الأداة للشركات فقط
            const debtorText = debtorIdx !== -1 ? cells[debtorIdx].textContent.trim() : "";
            if (!debtorText || debtorText === "غير متاح") return null;

            const link = Array.from(row.querySelectorAll("a"))
                .find(a => (a.getAttribute("href") || "").includes("/close-agreements/"));
            if (!link) return null;

            const bookingNo = bookingIdx !== -1 ? cells[bookingIdx].textContent.trim() : "";
            const agreementNo = agreementIdx !== -1 ? cells[agreementIdx].textContent.trim() : "";

            return {
                href: new URL(link.getAttribute("href"), location.origin).href,
                bookingNo,
                agreementNo,
                personName: driverIdx !== -1 ? cells[driverIdx].textContent.trim() : "",
                debtorName: debtorText,
                __signature: agreementNo || bookingNo || link.getAttribute("href"),
            };
        }).filter(Boolean);
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
                try {
                    return readLateReturnRows(doc);
                } catch (err) {
                    return [];
                }
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

    /**
     * يجمع صفوف العقود المتأخرة من الفروع المختارة فقط - فرع تلو فرع
     * بالتتابع (لا بالتوازي) لنفس السبب المعروف بالأدوات الثانية.
     */
    async function collectAllRowsForBranches(branchIds) {
        let allRows = [];
        for (const branchId of branchIds) {
            const branchName = branchNameById(branchId);
            showProgress('جارٍ تحميل قائمة العقود المتأخرة - ' + branchName + '...');
            const frame = openHiddenFrame(lateReturnUrlForBranch(branchId));
            try {
                const doc1 = await waitFor(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
                if (doc1) {
                    const rows = await collectAllPages(frame, doc1);
                    rows.forEach(r => { r.branchName = branchName; });
                    allRows = allRows.concat(rows);
                }
            } catch (err) {
                console.error('[عقود الشركات] تعذّر تحميل فرع ' + branchName + ':', err);
            } finally {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
            }
        }
        return allRows;
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يفحص عقداً واحداً: يفتح صفحة العقد، يوسّع أكورديون "المدة المحتسبة"
     * (مطوي افتراضياً)، ويقرأ تفاصيله. عمود "متأخر بـ" ما يظهر إطلاقاً إلا
     * لو العقد فعلاً متأخر ويحتاج تمديد - غيابه يعني العقد لسا ضمن مدته
     * المخطط لها ولا يحتاج شي، فنستبعده.
     */
    async function checkOneAgreement(frame, c) {
        const targetPath = new URL(c.href).pathname;
        frame.src = c.href;
        const doc2 = await waitFor(frame, d => {
            if (d.location.pathname !== targetPath) return null;
            return d.querySelector('[data-testid="billable-duration-toggle"]') ? d : null;
        }, 20000);
        if (!doc2) return { checked: false, record: null };

        const toggle = doc2.querySelector('[data-testid="billable-duration-toggle"]');
        if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
            try { toggle.click(); } catch (err) { /* تجاهل */ }
        }
        // ننتظر انتهاء أنيميشن التوسيع حتى تترسم عناصر التفاصيل بالـDOM
        await new Promise(r => setTimeout(r, 700));

        const lateEl = doc2.querySelector('[data-testid="billable-late-early"]');
        if (!lateEl) return { checked: true, record: null };

        const actualDuration = doc2.querySelector('[data-testid="billable-actual-duration"]')?.textContent.trim() || "";
        const plannedDuration = doc2.querySelector('[data-testid="billable-planned-duration"]')?.textContent.trim() || "";
        const extensionDuration = doc2.querySelector('[data-testid="billable-extension-duration"]')?.textContent.trim() || "";
        const lateDuration = lateEl.textContent.trim();

        const plannedHours = parseDurationToHours(plannedDuration) || 0;
        const extensionHours = parseDurationToHours(extensionDuration) || 0;

        return {
            checked: true,
            record: {
                agreementNo: c.agreementNo,
                branchName: c.branchName,
                personName: c.personName,
                debtorName: c.debtorName,
                actualDuration,
                plannedPlusExtension: formatHoursToDuration(plannedHours + extensionHours),
                lateDuration,
                lateHours: parseDurationToHours(lateDuration) || 0,
            },
        };
    }

    async function runReport(branchIds) {

        try {

            const allRows = await collectAllRowsForBranches(branchIds);

            const candidates = allRows.slice(0, MAX_AGREEMENTS);

            if (candidates.length === 0) {
                showReport([], branchIds, 0, 0);
                return;
            }

            let checkedCount = 0;
            let processedCount = 0;
            const recordsByIndex = new Array(candidates.length).fill(null);

            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    processedCount++;
                    showProgress(`جارٍ فحص عقود الشركات... (${processedCount} من ${candidates.length})`);
                    const c = candidates[i];
                    try {
                        const { checked, record } = await checkOneAgreement(workerFrame, c);
                        if (checked) checkedCount++;
                        if (record) recordsByIndex[i] = record;
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            const results = recordsByIndex.filter(Boolean);

            showReport(results, branchIds, checkedCount, candidates.length);

        } catch (err) {
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
        '.yq-branch-list{text-align:right;max-height:200px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:10px 14px;background:#fbfbf9;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-stat-row{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}' +
        '.yq-stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
        'font-size:12.5px;font-weight:700;white-space:nowrap;}' +
        '.yq-stat-chip strong{font-size:14px;font-weight:800;}' +
        '.yq-stat-chip--result{background:#fef3c7;color:#b45309;}' +
        '.yq-stat-chip--ok{background:#dcfce7;color:#16a34a;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:16px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:13.5px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
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
        if (document.getElementById('yq-shared-styles-company-ext-branches')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-company-ext-branches';
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
            '<div id="company-ext-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    /** يبني الاختيار متعدد الفروع (Checkboxes) - defaultBranchIds فاضية أو غير معطاة = كلهم محدَّدين افتراضياً */
    function showBranchPrompt(defaultBranchIds) {
        document.getElementById('company-ext-box')?.remove();

        const preselected = (defaultBranchIds && defaultBranchIds.length) ? defaultBranchIds : BRANCHES.map(b => b.id);
        const branchCheckboxesHtml = BRANCHES.map(b => (
            '<label><input type="checkbox" class="company-ext-branch-cb" value="' + b.id + '"' +
            (preselected.indexOf(b.id) !== -1 ? ' checked' : '') + '> ' + b.name +
            '</label>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>🏢 عقود الشركات غير الممددة</h3>' +
            '<div class="yq-link-row">' +
            '<span>الفروع</span>' +
            '<span><a href="#" id="company-ext-select-all">تحديد الكل</a> · ' +
            '<a href="#" id="company-ext-select-none">إلغاء الكل</a></span>' +
            '</div>' +
            '<div id="company-ext-branches-list" class="yq-branch-list">' + branchCheckboxesHtml + '</div>' +
            '<button id="company-ext-submit" class="yq-btn yq-btn-primary">فحص العقود</button>' +
            '<button id="company-ext-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            360
        ));

        document.getElementById('company-ext-select-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.company-ext-branch-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('company-ext-select-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.company-ext-branch-cb').forEach(cb => { cb.checked = false; });
        };

        document.getElementById('company-ext-submit').onclick = () => {
            const branchIds = Array.from(document.querySelectorAll('.company-ext-branch-cb:checked')).map(cb => parseInt(cb.value, 10));
            if (branchIds.length === 0) {
                showToast('اختر فرع واحد على الأقل', 'error');
                return;
            }
            runReport(branchIds);
        };
        document.getElementById('company-ext-cancel').onclick = () => {
            document.getElementById('company-ext-box')?.remove();
        };
    }

    function showProgress(text) {
        document.getElementById('company-ext-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('company-ext-box')?.remove();
        showToast(text, type || 'error');
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الفرع', 'اسم الشخص', 'اسم المدين', 'المدة الفعلية', 'المدة المخطط لها + التمديد', 'متأخر بـ'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.branchName, r.personName, r.debtorName, r.actualDuration, r.plannedPlusExtension, r.lateDuration].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, branchesLabel) {
        const printWindow = window.open('', '_blank', 'width=1100,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.personName + '</td><td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td><td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.lateDuration + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود الشركات غير الممددة</title><style>' +
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
            '<h1>🏢 عقود الشركات غير الممددة</h1>' +
            '<div class="stat-chip">🏢 <strong>' + records.length + '</strong> عقد يحتاج تمديد</div>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>اسم الشخص</th><th>اسم المدين</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th><th>متأخر بـ</th></tr>' + rowsHtml + '</table>' +
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

    function buildReportImageInnerHtml(records, branchesLabel) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.personName + '</td><td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td><td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.lateDuration + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>🏢 عقود الشركات غير الممددة</h1>' +
            '<div class="stat-chip">🏢 <strong>' + records.length + '</strong> عقد يحتاج تمديد</div>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>اسم الشخص</th><th>اسم المدين</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th><th>متأخر بـ</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records, branchName) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, branchName);
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

    function handleSendWhatsApp(records, branchName) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, branchName)
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
                        caption: '🏢 عقود الشركات غير الممددة - ' + branchName + ' - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[عقود الشركات] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[عقود الشركات] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[عقود الشركات] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[عقود الشركات] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب اسم المدين أو مدة التأخير)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastCheckedCount = 0;
    let lastTotalCandidates = 0;

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'debtorName') {
            sorted.sort((a, b) => a.debtorName.localeCompare(b.debtorName, 'ar') * sortState.dir);
        } else if (key === 'lateHours') {
            sorted.sort((a, b) => (a.lateHours - b.lateHours) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, branchIds, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), branchIds, lastCheckedCount, lastTotalCandidates);
    }

    function showReport(records, branchIds, checkedCount, totalCandidates) {
        document.getElementById('company-ext-box')?.remove();
        injectYqStyles();
        lastCheckedCount = checkedCount;
        lastTotalCandidates = totalCandidates;
        const branchesLabel = branchIds.map(branchNameById).join('، ');

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.branchName + '</td>' +
            '<td>' + r.personName + '</td>' +
            '<td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td>' +
            '<td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:800;color:#dc2626;">' + r.lateDuration + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="7" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود شركات متأخرة حالياً</td></tr>';

        const html =
            '<div id="company-ext-box" class="yq-overlay">' +
            '<div style="width:min(1040px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">🏢 عقود الشركات غير الممددة</div>' +
            '<div class="yq-report-sub">الفروع: ' + branchesLabel + '</div>' +
            '<div class="yq-stat-row">' +
            '<span class="yq-stat-chip yq-stat-chip--result">🏢 <strong>' + records.length + '</strong> عقد يحتاج تمديد</span>' +
            '</div>' +
            '<div class="yq-report-sub">' +
            'تم فحص ' + checkedCount + ' من أصل ' + totalCandidates + ' عقد شركة بقائمة LATE_RETURN' +
            (checkedCount < totalCandidates ? ' (' + (totalCandidates - checkedCount) + ' تعذّر فتحها)' : '') +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الفرع</th><th>اسم الشخص</th>' +
            '<th id="company-ext-sort-debtor" style="cursor:pointer;user-select:none;">اسم المدين' + sortIndicator('debtorName') + '</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th>' +
            '<th id="company-ext-sort-late" style="cursor:pointer;user-select:none;">متأخر بـ' + sortIndicator('lateHours') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="company-ext-copy">📋 نسخ</button>' +
            '<button id="company-ext-print">🖨️ طباعة</button>' +
            '<button id="company-ext-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="company-ext-change-branch">🏢 تغيير الفروع</button>' +
            '<button id="company-ext-refresh">🔄 تحديث</button>' +
            '<button id="company-ext-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('company-ext-close').onclick = () => {
            document.getElementById('company-ext-box')?.remove();
        };
        document.getElementById('company-ext-change-branch').onclick = () => {
            showBranchPrompt(branchIds);
        };
        document.getElementById('company-ext-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(branchIds);
        };
        document.getElementById('company-ext-print').onclick = () => {
            printReport(records, branchesLabel);
        };
        document.getElementById('company-ext-whatsapp').onclick = () => {
            handleSendWhatsApp(records, branchesLabel);
        };
        document.getElementById('company-ext-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
        document.getElementById('company-ext-sort-debtor').onclick = () => handleSortClick(records, branchIds, 'debtorName');
        document.getElementById('company-ext-sort-late').onclick = () => handleSortClick(records, branchIds, 'lateHours');
    }

    waitCore();

})();
