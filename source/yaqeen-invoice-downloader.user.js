// ==UserScript==
// @name         Yaqeen Tool - تحميل فواتير العقود المكتملة
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يمر على كل عقود العميل بالقائمة المفتوحة (مثلاً بحث برقم هوية السائق)، يفتح "عرض الفواتير" لكل عقد مكتمل، ويحمّل كل فاتورة فيها تلقائياً
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

    // كل عقد "مكتمل" وحده اللي يعرض زر "عرض الفواتير" - باقي الحالات
    // (بدء/إنهاء الاتفاقية، لم يحضر، ملغي...) ما تحتوي هذا الزر إطلاقاً،
    // فنستخدم وجوده نفسه كفلتر بدل قراءة عمود الحالة نصياً
    const VIEW_INVOICES_LABEL = 'عرض الفواتير';
    const VIEW_INVOICE_LABEL = 'عرض الفاتورة';
    const CLOSE_LABEL = 'إغلاق';

    // مهلة الانتظار بعد كل ضغطة "عرض الفاتورة" - التحميل يبدأ تلقائياً
    // بالمتصفح فور الضغط، فنعطيه وقت كافي يبدأ فعلياً قبل لا ننتقل للفاتورة
    // التالية أو نقفل النافذة
    const WAIT_AFTER_INVOICE_CLICK_MS = 2500;
    const DIALOG_OPEN_TIMEOUT_MS = 10000;
    const DIALOG_CLOSE_TIMEOUT_MS = 5000;
    const MAX_ROWS = 500;
    const MAX_PAGES = 20;

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
    // أدوات عامة
    // ==========================================================

    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function waitForCondition(checkFn, timeoutMs, intervalMs) {
        intervalMs = intervalMs || 300;
        return new Promise(resolve => {
            const start = Date.now();
            (function poll() {
                let result = null;
                try { result = checkFn(); } catch (err) { /* تجاهل */ }
                if (result) { resolve(result); return; }
                if (Date.now() - start > timeoutMs) { resolve(null); return; }
                setTimeout(poll, intervalMs);
            })();
        });
    }

    function findButtonByText(root, text) {
        return Array.from(root.querySelectorAll('button')).find(b => b.textContent.trim() === text);
    }

    function findButtonsByText(root, text) {
        return Array.from(root.querySelectorAll('button')).filter(b => b.textContent.trim() === text);
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق باقي الأدوات، بس على الصفحة الحالية مباشرة
    // - ما نفتح أي iframe هنا، نتعامل مع القائمة المفتوحة فعلياً بالمتصفح)
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

    function findNextPageControl() {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'));
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

    function tableSignature() {
        const rows = document.querySelectorAll('table tbody tr');
        if (!rows.length) return null;
        const lastRow = rows[rows.length - 1];
        const firstCell = lastRow.querySelector('td');
        return firstCell ? firstCell.textContent.trim() : null;
    }

    async function waitForPageChange(beforeSig, timeoutMs) {
        timeoutMs = timeoutMs || 6000;
        const start = Date.now();
        while (true) {
            const cur = tableSignature();
            if (cur !== beforeSig || Date.now() - start > timeoutMs) return;
            await new Promise(r => setTimeout(r, 250));
        }
    }

    // ==========================================================
    // معالجة صف واحد: فتح نافذة الفواتير (لو موجودة)، تحميل كل فاتورة فيها، إغلاقها
    // ==========================================================

    async function processRow(row, label) {
        const viewInvoicesBtn = findButtonByText(row, VIEW_INVOICES_LABEL);
        if (!viewInvoicesBtn) return 0; // عقد غير مكتمل / بدون فواتير

        dispatchFullClick(viewInvoicesBtn);

        const dialog = await waitForCondition(() => {
            const d = document.querySelector('[role="dialog"]');
            if (!d) return null;
            return d.textContent.includes('فواتير الحجز') ? d : null;
        }, DIALOG_OPEN_TIMEOUT_MS);

        if (!dialog) {
            console.warn('[تحميل الفواتير] ما فتحت نافذة الفواتير للعقد:', label);
            return 0;
        }

        // نستنى شوي حتى تستقر قائمة الفواتير جوا النافذة (نفس مشكلة إعادة
        // الرسم اللحظية اللي واجهناها بأدوات ثانية)
        await new Promise(r => setTimeout(r, 500));

        const invoiceButtons = findButtonsByText(dialog, VIEW_INVOICE_LABEL);
        let downloaded = 0;

        for (const btn of invoiceButtons) {
            dispatchFullClick(btn);
            await new Promise(r => setTimeout(r, WAIT_AFTER_INVOICE_CLICK_MS));
            downloaded++;
        }

        const closeBtn = findButtonByText(dialog, CLOSE_LABEL) || dialog.querySelector('button.absolute');
        if (closeBtn) dispatchFullClick(closeBtn);

        await waitForCondition(() => (!document.body.contains(dialog) ? true : null), DIALOG_CLOSE_TIMEOUT_MS);
        // مهلة صغيرة إضافية لحركة إغلاق النافذة (fade-out) قبل ننتقل للصف التالي
        await new Promise(r => setTimeout(r, 300));

        if (invoiceButtons.length === 0) {
            console.warn('[تحميل الفواتير] نافذة الفواتير فتحت بدون أي فاتورة داخلها:', label);
        }

        return downloaded;
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    async function runInvoiceDownloadTool() {
        showProgress('جارٍ البحث عن العقود المكتملة...');

        let totalInvoices = 0;
        let processedRows = 0;
        let pageIndex = 0;

        try {
            while (pageIndex < MAX_PAGES && processedRows < MAX_ROWS) {
                pageIndex++;
                const rows = Array.from(document.querySelectorAll('table tbody tr'));

                for (const row of rows) {
                    if (processedRows >= MAX_ROWS) break;
                    processedRows++;
                    const agreementCell = row.querySelectorAll('td')[1];
                    const label = agreementCell ? agreementCell.textContent.trim() : ('صف #' + processedRows);
                    showProgress(`جارٍ الفحص... (${processedRows} عقد) - تم تحميل ${totalInvoices} فاتورة حتى الآن`);
                    try {
                        totalInvoices += await processRow(row, label);
                    } catch (err) {
                        console.warn('[تحميل الفواتير] تعذّر معالجة العقد:', label, err);
                    }
                }

                const nextControl = findNextPageControl();
                if (!nextControl || isControlDisabled(nextControl) || processedRows >= MAX_ROWS) break;

                const beforeSig = tableSignature();
                dispatchFullClick(nextControl);
                await waitForPageChange(beforeSig);
            }

            showMessage(
                '✅ خلصت العملية.\n\n' +
                'عدد العقود المفحوصة: ' + processedRows + '\n' +
                'عدد الفواتير اللي تم تحميلها: ' + totalInvoices +
                '\n\nملاحظة: لو المتصفح وقف التحميلات المتعددة وسألك إذن، وافقي عليه ثم شغّلي الأداة مرة ثانية.'
            );

        } catch (err) {
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
