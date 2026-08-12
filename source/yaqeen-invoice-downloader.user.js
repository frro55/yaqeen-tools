// ==UserScript==
// @name         Yaqeen Tool - تحميل فواتير العقود المكتملة
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يمر على كل عقود العميل بالقائمة المفتوحة (مثلاً بحث برقم هوية السائق)، يفتح كل عقد مكتمل، ويحمّل فاتورته الضريبية المبسطة تلقائياً (فاتورة واحدة فقط لكل عقد)
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

    // زر "عرض الفواتير" مو موجود بالقائمة نفسها ولا بأي قائمة منسدلة فيها -
    // هو موجود بصفحة تفاصيل العقد نفسها، ما يظهر إلا بعد فتح العقد (الضغط
    // على صفّه بالقائمة). فنفتح كل عقد "مكتمل" فعلياً (نفس طريقة فحص
    // العقود بأداة "عقود أغلقت كمديونية")، وبعدها نضغط الزر ونحمّل الفواتير
    const TARGET_STATUS = 'مكتمل';
    const VIEW_INVOICES_LABEL = 'عرض الفواتير';
    const VIEW_INVOICE_LABEL = 'عرض الفاتورة';
    const CLOSE_LABEL = 'إغلاق';
    // نافذة "فواتير الحجز" تقسّم الفواتير لأقسام بعنوان (h3) - عقد فيه أكثر
    // من فاتورة ممكن يشمل قسم "فاتورة المرور" مثلاً، وما نبيه. نحمّل بس أول
    // فاتورة ضمن القسم اللي عنوانه بالضبط "فاتورة ضريبية مبسطة"
    const SIMPLIFIED_INVOICE_HEADING = 'فاتورة ضريبية مبسطة';

    // مهلة الانتظار بعد كل ضغطة "عرض الفاتورة" - التحميل يبدأ تلقائياً
    // بالمتصفح فور الضغط، فنعطيه وقت كافي يبدأ فعلياً قبل لا ننتقل للفاتورة
    // التالية أو نقفل النافذة
    const WAIT_AFTER_INVOICE_CLICK_MS = 2500;
    const DIALOG_OPEN_TIMEOUT_MS = 10000;
    const DIALOG_CLOSE_TIMEOUT_MS = 5000;
    const MAX_CANDIDATES = 300;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "invoice-downloader",
            name: "🧾 تحميل فواتير العقود المكتملة",
            run() {
                runInvoiceDownloadTool();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات "عقود أغلقت كمديونية")
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

    function getDoc(frame) {
        try {
            return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null;
        } catch (err) {
            return null;
        }
    }

    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findButtonByText(root, text) {
        return Array.from(root.querySelectorAll('button')).find(b => b.textContent.trim() === text);
    }

    /**
     * يلقط زر "عرض الفاتورة" لأول فاتورة بس ضمن القسم اللي عنوانه (h3)
     * بالضبط "فاتورة ضريبية مبسطة" - يتجاهل أي قسم ثاني (زي "فاتورة
     * المرور") وأي فاتورة إضافية بنفس القسم لو وُجدت
     */
    function findSimplifiedInvoiceButton(dialog) {
        const heading = Array.from(dialog.querySelectorAll('h3'))
            .find(h => h.textContent.trim() === SIMPLIFIED_INVOICE_HEADING);
        if (!heading) return null;
        const group = heading.closest('div');
        if (!group) return null;
        return findButtonByText(group, VIEW_INVOICE_LABEL);
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق "عقود أغلقت كمديونية")
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
    // قراءة صف القائمة وجمع مرشّحي العقود "المكتملة"
    // ==========================================================

    /**
     * ترتيب الأعمدة ثابت (رقم الحجز، رقم الاتفاقية، تاريخ الحجز، وقت
     * الاستلام، وقت التسليم، السائق، اسم المدين، المركبة، المصدر، الحالة،
     * الإجمالي، إجراءات) - الحالة بعمود رقم 9
     */
    function readListRow(rowEl) {
        const cells = rowEl.querySelectorAll('td');
        if (cells.length < 10) return null;
        const bookingNo = cells[0].textContent.trim();
        const agreementNo = cells[1].textContent.trim();
        const status = cells[9].textContent.trim();
        if (!bookingNo && !agreementNo) return null;
        return { bookingNo, agreementNo, status, __signature: bookingNo || agreementNo };
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

    async function collectCompletedCandidates(frame) {
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
                if (!rowData || seen[rowData.__signature]) return;
                seen[rowData.__signature] = true;
                if (rowData.status === TARGET_STATUS) candidates.push(rowData);
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

    // ==========================================================
    // فتح عقد واحد وتحميل فواتيره
    // ==========================================================

    function buildMiniListUrl(branchId, candidate) {
        const useAgreement = candidate.agreementNo && candidate.agreementNo !== '---';
        const param = useAgreement ? 'agreementNo' : 'bookingNo';
        const value = useAgreement ? candidate.agreementNo : candidate.bookingNo;
        return {
            url: 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings?' + param + '=' + encodeURIComponent(value),
            expectedFragment: param + '=' + encodeURIComponent(value),
        };
    }

    /**
     * يضغط صف القائمة المصغّرة ويستنى فتح صفحة تفاصيل العقد فعلياً - نفس
     * منطق visitRowDetail بأداة "عقود أغلقت كمديونية" بالضبط (إعادة محاولة
     * الضغط لو ضاعت الضغطة الأولى بسبب hydration)، بس علامة نجاح التنقّل
     * هنا هي وجود زر "عرض الفواتير" بدل بيانات الرصيد المتبقي
     */
    async function openContractDetail(frame, rowEl, label) {
        const startDoc = getDoc(frame);
        if (!startDoc || !startDoc.location) {
            console.warn('[تحميل الفواتير] تعذّر قراءة مستند القائمة المصغّرة قبل الضغط:', label);
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
                return findButtonByText(d, VIEW_INVOICES_LABEL) ? d : null;
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
                '[تحميل الفواتير] انتهت مهلة فتح تفاصيل العقد (20 ثانية):', label,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        return detailDoc;
    }

    /** يفتح نافذة "فواتير الحجز" ويحمّل كل فاتورة فيها، ثم يقفلها */
    async function downloadInvoicesFromDetail(frame, detailDoc, label) {
        const viewInvoicesBtn = findButtonByText(detailDoc, VIEW_INVOICES_LABEL);
        if (!viewInvoicesBtn) {
            console.warn('[تحميل الفواتير] ما لقينا زر "عرض الفواتير" بصفحة تفاصيل العقد:', label);
            return 0;
        }

        dispatchFullClick(viewInvoicesBtn);

        const dialog = await waitFor(frame, d => {
            if (!d) return null;
            const dlg = d.querySelector('[role="dialog"]');
            if (!dlg) return null;
            return dlg.textContent.includes('فواتير الحجز') ? dlg : null;
        }, DIALOG_OPEN_TIMEOUT_MS);

        if (!dialog) {
            console.warn('[تحميل الفواتير] ما فتحت نافذة الفواتير للعقد:', label);
            return 0;
        }

        // نستنى شوي حتى تستقر قائمة الفواتير جوا النافذة
        await new Promise(r => setTimeout(r, 500));

        const invoiceBtn = findSimplifiedInvoiceButton(dialog);
        let downloaded = 0;

        if (invoiceBtn) {
            dispatchFullClick(invoiceBtn);
            await new Promise(r => setTimeout(r, WAIT_AFTER_INVOICE_CLICK_MS));
            downloaded = 1;
        } else {
            console.warn('[تحميل الفواتير] ما فيه قسم "' + SIMPLIFIED_INVOICE_HEADING + '" بنافذة فواتير العقد:', label);
        }

        const closeBtn = findButtonByText(dialog, CLOSE_LABEL) || dialog.querySelector('button.absolute');
        if (closeBtn) dispatchFullClick(closeBtn);

        await waitFor(frame, d => (d && !d.body.contains(dialog) ? true : null), DIALOG_CLOSE_TIMEOUT_MS);
        await new Promise(r => setTimeout(r, 300));

        return downloaded;
    }

    async function checkOneContract(frame, branchId, candidate) {
        const label = candidate.agreementNo && candidate.agreementNo !== '---' ? candidate.agreementNo : candidate.bookingNo;
        const { url, expectedFragment } = buildMiniListUrl(branchId, candidate);

        frame.src = url;
        const listDoc = await waitFor(frame, d => {
            if (!d || !d.location || d.location.href.indexOf(expectedFragment) === -1) return null;
            return d.querySelectorAll('table tbody tr').length > 0 ? d : null;
        }, 20000);

        if (!listDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn('[تحميل الفواتير] انتهت مهلة تحميل القائمة المصغّرة:', label, '| الرابط الحالي:', currentHref);
            return 0;
        }

        let rowEl = null;
        const rowWaitStart = Date.now();
        while (!rowEl && Date.now() - rowWaitStart < 5000) {
            await new Promise(r => setTimeout(r, 300));
            const currentDoc = getDoc(frame);
            rowEl = currentDoc && currentDoc.querySelector('table tbody tr');
        }

        if (!rowEl) {
            console.warn('[تحميل الفواتير] القائمة المصغّرة ما رجّعت أي صف مستقر:', label);
            return 0;
        }

        const detailDoc = await openContractDetail(frame, rowEl, label);
        if (!detailDoc) return 0;

        return await downloadInvoicesFromDetail(frame, detailDoc, label);
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    async function runInvoiceDownloadTool() {
        const branchMatch = location.pathname.match(/\/rental\/branches\/(\d+)\//);
        const branchId = branchMatch ? branchMatch[1] : '29';
        const listUrl = location.href;

        showProgress('جارٍ تحميل قائمة العقود...');

        const frame = openHiddenFrame(listUrl);
        let totalInvoices = 0;
        let processedCount = 0;

        try {
            const doc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null));
            if (!doc) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showMessage('ما لقينا أي عقود بالقائمة الحالية.');
                return;
            }

            showProgress('جارٍ جمع العقود المكتملة عبر كل الصفحات...');
            const candidates = (await collectCompletedCandidates(frame)).slice(0, MAX_CANDIDATES);

            if (candidates.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showMessage('ما فيه أي عقد بحالة "مكتمل" بالقائمة الحالية.');
                return;
            }

            for (const candidate of candidates) {
                processedCount++;
                showProgress(`جارٍ فحص العقود المكتملة... (${processedCount} من ${candidates.length}) - تم تحميل ${totalInvoices} فاتورة حتى الآن`);
                try {
                    totalInvoices += await checkOneContract(frame, branchId, candidate);
                } catch (err) {
                    console.warn('[تحميل الفواتير] تعذّر معالجة العقد:', candidate.agreementNo || candidate.bookingNo, err);
                }
            }

            try { frame.remove(); } catch (err) { /* تجاهل */ }

            showMessage(
                '✅ خلصت العملية.\n\n' +
                'عدد العقود المكتملة اللي تم فحصها: ' + candidates.length + '\n' +
                'عدد الفواتير اللي تم تحميلها: ' + totalInvoices +
                '\n\nملاحظة: لو المتصفح وقف التحميلات المتعددة وسألك إذن، وافقي عليه ثم شغّلي الأداة مرة ثانية.'
            );

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage('تعذّر إتمام العملية: ' + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function overlayShell(innerHtml, width) {
        return (
            '<div id="invoice-dl-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:' + width + 'px;background:#fff;border-radius:16px;padding:25px;' +
            'text-align:center;direction:rtl;white-space:pre-line;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('invoice-dl-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(text, 340));
    }

    function showMessage(text) {
        document.getElementById('invoice-dl-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div style="margin-bottom:15px">' + text + '</div>' +
            '<button id="invoice-dl-close" style="' +
            'padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>',
            340
        ));
        document.getElementById('invoice-dl-close').onclick = () => {
            document.getElementById('invoice-dl-box')?.remove();
        };
    }

    waitCore();

})();
