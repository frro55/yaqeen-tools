// ==UserScript==
// @name         Yaqeen Tool - العقود المتأخرة في السداد (أفراد)
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يفحص عقود الأفراد المتأخرة في السداد (LATE_RETURN) بفرع المطار (يستبعد عقود الشركات)، ويطلع فقط اللي متأخرين بمبلغ معيّن أو أكثر مع بياناتهم
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

    const BRANCH_ID = 29;
    const LATE_RETURN_URL = 'https://yaqeen.lumirental.com/rental/branches/' + BRANCH_ID + '/bookings?status=LATE_RETURN&pageSize=500';
    const MAX_AGREEMENTS = 300;
    // عدد الإطارات المتوازية لفحص تفاصيل العقود - كل إطار يفحص عقوده بالتتابع
    // تماماً بنفس منطق الفحص الأصلي، بس موزّعين على عدة إطارات بدل واحد
    // فقط، فتسرع العملية بمقدار العدد تقريباً بدون أي تغيير بمنطق الفحص نفسه
    const CHECK_CONCURRENCY = 4;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "late-payments",
            name: "💰 العقود المتأخرة في السداد (أفراد)",
            run() {
                showThresholdPrompt();
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

    /** يلقط أي عنصر عنده نص مباشر (text node) يطابق التسمية تماماً - يتحمّل وجود أيقونة SVG جنبه */
    function findLabelElement(doc, labelText) {
        const candidates = doc.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    /** يدور القيمة القريبة من عنصر تسمية (يجرب الإخوة القريبين بالترتيبين، ما نعرف بالضبط ترتيب DOM) */
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

    // ==========================================================
    // ترقيم الصفحات (نفس منطق الأدوات الثانية)
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
     * كل صف بجدول "العقود المتأخرة" فيه عمود "الإجمالي (ريال)" برقم + أيقونة:
     * أيقونة خضراء (fill-green-600) = تم السداد فعلياً رغم تأخر التسليم، ما نعتبره متأخر بالسداد.
     * أيقونة رمادية (fill-slate-400) = لسا عليه مبلغ متأخر فعلاً.
     * هذا يغنينا عن فتح كل عقد للتأكد - نفلتر أول شي من نفس القائمة، ونفتح بس اللي يستاهل.
     */
    function readLateReturnRows(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const bookingIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
        const driverIdx = findColumnIndex(headerCells, ["السائق"]);
        const totalIdx = findColumnIndex(headerCells, ["الإجمالي"]);
        const debtorIdx = findColumnIndex(headerCells, ["اسم المدين"]);

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return null;

            // عمود "اسم المدين" يكون "غير متاح" للأفراد، ويعرض اسم الشركة
            // الفعلي للعقود التابعة لشركات - وأغلب عقود الشركات المتأخرة سببها
            // إن الشركة نفسها ما مدّدت العقد بعد (مو تأخر سداد فردي). هذي
            // الأداة للأفراد فقط، فنتجاهل أي صف عنده اسم شركة حقيقي بهذا العمود
            const debtorText = debtorIdx !== -1 ? cells[debtorIdx].textContent.trim() : "";
            if (debtorText && debtorText !== "غير متاح") return null;

            const link = Array.from(row.querySelectorAll("a"))
                .find(a => (a.getAttribute("href") || "").includes("/close-agreements/"));
            if (!link) return null;

            const totalCell = totalIdx !== -1 ? cells[totalIdx] : null;
            const amountText = totalCell?.querySelector("p")?.textContent || "";
            const svg = totalCell?.querySelector("svg");
            const isSettled = svg ? (svg.getAttribute("class") || "").includes("fill-green-600") : false;

            const bookingNo = bookingIdx !== -1 ? cells[bookingIdx].textContent.trim() : "";
            const agreementNo = agreementIdx !== -1 ? cells[agreementIdx].textContent.trim() : "";

            return {
                href: new URL(link.getAttribute("href"), location.origin).href,
                bookingNo,
                agreementNo,
                name: driverIdx !== -1 ? cells[driverIdx].textContent.trim() : "",
                listAmount: parseAmount(amountText),
                isSettled,
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

    // ==========================================================
    // إرسال رابط السداد عبر واتساب (زر لكل عقد بالتقرير)
    // ==========================================================

    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findButtonByText(root, text) {
        const candidates = Array.from(root.querySelectorAll('button, a'));
        return candidates.find(el => (el.textContent || '').trim() === text) || null;
    }

    /**
     * يحوّل رقم جوال معروض بأي صيغة شائعة (05xxxxxxxx، +9665xxxxxxxx،
     * 9665xxxxxxxx، 5xxxxxxxx) إلى JID واتساب لرقم فردي بصيغة Baileys
     */
    function normalizePhoneToJid(rawPhone) {
        let digits = (rawPhone || '').replace(/\D/g, '');
        if (digits.startsWith('00')) digits = digits.slice(2);
        if (digits.startsWith('0')) digits = '966' + digits.slice(1);
        if (digits.length === 9 && digits.startsWith('5')) digits = '966' + digits;
        return digits + '@s.whatsapp.net';
    }

    function sendWhatsAppText(phoneJid, message) {
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
                data: JSON.stringify({ target: phoneJid, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main', type: 'text', message: message }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve();
                    else {
                        console.error('[العقود المتأخرة] فشل إرسال رابط الدفع:', response.status, response.responseText);
                        reject(new Error('فشل الإرسال (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    function findQuickpayLink(root) {
        if (!root) return null;
        return Array.from(root.querySelectorAll('a')).find(x => (x.getAttribute('href') || '').includes('/payment/quickpay/')) || null;
    }

    /**
     * نافذة "رابط الدفع" تطلع فيها حالتين متشابهتين شكلياً (فيهما نفس بلوك
     * تفاصيل الرابط)، بس بنص مختلف كلياً بتنبيه [role="alert"] بالأعلى:
     * - "يوجد رابط دفع نشط": رابط قديم من قبل - ما ننشئ ولا نرسل شي جديد.
     * - "تم إنشاء رابط الدفع وإرساله...": رابط جديد أنشأناه للتو فعلياً.
     * الاعتماد على نص التنبيه نفسه (مو مجرد وجود رابط بالنافذة، اللي يطلع
     * بالحالتين) هو الفيصل الموثوق - لون/شكل التنبيه تفصيل ثانوي قابل للتغيّر.
     */
    function classifyPaymentDialogState(dialog) {
        if (!dialog) return null;
        const alerts = Array.from(dialog.querySelectorAll('[role="alert"]'));
        for (const alert of alerts) {
            const text = alert.textContent || '';
            if (text.indexOf('يوجد رابط دفع نشط') !== -1) return 'active';
            if (text.indexOf('تم إنشاء رابط الدفع') !== -1) return 'created';
        }
        return null;
    }

    /**
     * يتحقق أول شي إذا الحالة المطلوبة متحققة أصلاً (بدون ضغط أي شي - مفيد
     * لما نكون فعلاً بمرحلة متقدمة ومحتاجين خطوة سابقة). إذا لأ، يدور على
     * عنصر يضغطه وينتظر تحقق الحالة، ويكرر المحاولة (ضغط جديد + انتظار جديد)
     * لأكثر من مرة - لأن أحياناً العنصر يكون موجود بالـDOM بس لسا ما تركّبت
     * معالجات الأحداث عليه فعلياً (سباق تحميل الصفحة)، فالضغطة الأولى تُفقد.
     */
    async function clickUntil(frame, findClickTarget, checkFn, opts) {
        const maxAttempts = (opts && opts.maxAttempts) || 3;
        const perAttemptTimeout = (opts && opts.perAttemptTimeout) || 5000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            if (!doc) return null;
            const already = checkFn(doc);
            if (already) return already;
            const target = findClickTarget(doc);
            if (!target) {
                await new Promise(r => setTimeout(r, 400));
                continue;
            }
            dispatchFullClick(target);
            const result = await waitFor(frame, checkFn, perAttemptTimeout);
            if (result) return result;
        }
        const lastDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        return lastDoc ? checkFn(lastDoc) : null;
    }

    /**
     * يمشي فعلياً بنفس خطوات الموظف اليدوية: يفتح صفحة الدفع الخاصة بالعقد،
     * يضغط "تحصيل الدفع"، يختار طريقة "رابط الدفع". من هذي النقطة احتمالين:
     * - ما فيه رابط نشط: يطلع زر "إنشاء رابط الدفع" - نضغطه وننتظر الرابط
     *   الجديد (يقين نفسه يرسله تلقائياً على واتساب العميل من رقمه فور إنشائه).
     * - فيه رابط نشط من قبل (تنبيه "يوجد رابط دفع نشط"): نرجّع نفس الرابط
     *   الموجود بدون إنشاء رابط جديد ولا أي إرسال إضافي - يقين يسمح برابط
     *   نشط واحد بس، وهذا يمنع تكرار الرسائل للعميل.
     * المبلغ بالنموذج يجيه معبّى تلقائياً بالرصيد المتبقي من نظام يقين نفسه، فما نلمسه.
     */
    async function locateOrCreatePaymentLink(branchId, agreementNo) {
        const url = 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/close-agreements/' + agreementNo + '//payment';
        const frame = openHiddenFrame(url);
        try {
            const doc1 = await waitFor(frame, d => (findButtonByText(d, 'تحصيل الدفع') ? d : null), 20000);
            if (!doc1) throw new Error('تعذّر فتح صفحة الدفع الخاصة بالعقد');

            // بعد الضغط على "تحصيل الدفع" احتمالين: تطلع طرق الدفع (لازم نختار
            // "رابط الدفع")، أو تطلع مباشرة حالة "يوجد رابط دفع نشط" أو زر
            // "إنشاء رابط الدفع" لو كانت آخر طريقة استخدمها الموظف هي رابط
            // الدفع (يقين يتذكر آخر طريقة مختارة) - نتحمّل كل الاحتمالات
            const doc2 = await clickUntil(
                frame,
                d => findButtonByText(d, 'تحصيل الدفع'),
                d => {
                    const dialog = d.querySelector('[role="dialog"]');
                    if (!dialog) return null;
                    return (findButtonByText(dialog, 'رابط الدفع') || classifyPaymentDialogState(dialog) || findButtonByText(dialog, 'إنشاء رابط الدفع')) ? d : null;
                },
                { maxAttempts: 3, perAttemptTimeout: 5000 }
            );
            if (!doc2) throw new Error('تعذّر فتح نافذة تحصيل الدفع');

            let dialog = doc2.querySelector('[role="dialog"]');
            let state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            const doc3 = await clickUntil(
                frame,
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return dlg ? findButtonByText(dlg, 'رابط الدفع') : null;
                },
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    if (!dlg) return null;
                    return (findButtonByText(dlg, 'إنشاء رابط الدفع') || classifyPaymentDialogState(dlg)) ? d : null;
                },
                { maxAttempts: 3, perAttemptTimeout: 4000 }
            );
            if (!doc3) throw new Error('تعذّر تحميل خيار رابط الدفع');

            dialog = doc3.querySelector('[role="dialog"]');
            state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            // زر "إنشاء رابط الدفع" أحياناً يطلع أول شي بشكل متفائل (optimistic)
            // قبل ما يوصل رد فحص "هل فيه رابط نشط؟" من السيرفر، وبعدها يتحوّل
            // فجأة لتنبيه "يوجد رابط دفع نشط" - ننتظر شوي ونعيد الفحص قبل ما
            // نضغط "إنشاء رابط الدفع" فعلياً، حتى ما نولّد رابط مكرر ونرسله بالغلط
            await new Promise(r => setTimeout(r, 1200));
            dialog = (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document))?.querySelector('[role="dialog"]');
            state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            const doc4 = await clickUntil(
                frame,
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return dlg ? findButtonByText(dlg, 'إنشاء رابط الدفع') : null;
                },
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return (dlg && classifyPaymentDialogState(dlg)) ? d : null;
                },
                { maxAttempts: 2, perAttemptTimeout: 10000 }
            );
            if (!doc4) throw new Error('تعذّر الحصول على رابط الدفع (تأكد إن العقد لسا عليه مبلغ متبقي)');

            const finalDialog = doc4.querySelector('[role="dialog"]');
            const finalState = classifyPaymentDialogState(finalDialog);
            const linkEl = findQuickpayLink(finalDialog);
            if (!linkEl) throw new Error('تعذّر الحصول على رابط الدفع (تأكد إن العقد لسا عليه مبلغ متبقي)');
            return { status: finalState === 'active' ? 'existing' : 'created', link: linkEl.getAttribute('href') };
        } catch (err) {
            // تشخيص: نطبع محتوى نافذة الدفع وقت الفشل بالـconsole عشان لو
            // تكرر الفشل نقدر نشوف بالضبط أي حالة DOM ما كنا نتوقعها
            try {
                const failDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
                const dialog = failDoc && failDoc.querySelector('[role="dialog"]');
                console.warn('[العقود المتأخرة] محتوى نافذة الدفع وقت الفشل:', dialog ? dialog.innerHTML.slice(0, 3000) : '(لا توجد نافذة مفتوحة حالياً)');
            } catch (logErr) { /* تجاهل */ }
            throw err;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function buildPaymentLinkMessage(record, paymentLink) {
        const name = record.name || 'عميلنا العزيز';
        return (
            'مرحباً ' + name + '،\n\n' +
            'يوجد مبلغ متأخر بقيمة ' + record.remaining + ' ريال على العقد رقم ' + record.agreementNo + ' الخاص فيكم.\n' +
            'الرجاء السداد عن طريق الرابط التالي:\n' + paymentLink + '\n\n' +
            'شاكرين لكم تعاونكم 🌹'
        );
    }

    function setRowStatus(idx, text, color) {
        const el = document.getElementById('late-payments-status-' + idx);
        if (el) { el.textContent = text; el.style.color = color; }
    }

    function rowButtons(idx) {
        return {
            branchBtn: document.querySelector('.late-payments-send-branch-btn[data-idx="' + idx + '"]'),
        };
    }

    /**
     * منطق الإرسال الفعلي لصف واحد (بدون أي تأكيد - التأكيد مسؤولية المستدعي).
     * يحدّث حالة الصف بنفسه: ⏳ جارٍ ← ✅ تم الإرسال / ℹ️ يوجد رابط مرسل بالفعل
     * / ⚠️ لا يوجد جوال / ❌ فشل الإرسال. تُستخدم من زر الصف نفسه ومن "إرسال للجميع".
     */
    async function sendPaymentLinkForRecord(record, idx) {
        const { branchBtn } = rowButtons(idx);
        if (branchBtn) branchBtn.disabled = true;
        setRowStatus(idx, '⏳ جارٍ التنفيذ...', '#777');
        try {
            if (!record.phone) {
                setRowStatus(idx, '⚠️ لا يوجد جوال', '#eab308');
                return;
            }
            const result = await locateOrCreatePaymentLink(BRANCH_ID, record.agreementNo);
            console.log('[العقود المتأخرة] نتيجة رابط الدفع للعقد ' + record.agreementNo + ':', result.status, result.link);
            if (result.status === 'existing') {
                setRowStatus(idx, 'ℹ️ يوجد رابط مرسل بالفعل', '#2563eb');
            } else {
                const message = buildPaymentLinkMessage(record, result.link);
                await sendWhatsAppText(normalizePhoneToJid(record.phone), message);
                setRowStatus(idx, '✅ تم الإرسال', '#16a34a');
            }
        } catch (err) {
            console.error('[العقود المتأخرة] فشل إرسال رابط الدفع:', err);
            setRowStatus(idx, '❌ فشل الإرسال', '#dc2626');
        } finally {
            if (branchBtn) branchBtn.disabled = false;
        }
    }

    /** زر الصف الواحد - يسأل تأكيد فردي ثم ينفّذ */
    async function handleSendFromBranch(record, idx) {
        if (!record.phone) {
            showToast('لا يوجد رقم جوال لهذا العميل بالبيانات المسحوبة', 'error');
            return;
        }
        if (!confirm('سيتم إنشاء رابط دفع (إن لم يوجد رابط نشط) للعقد ' + record.agreementNo + ' وإرساله للعميل (' + record.name + ') من رقم واتساب الفرع.\nمتابعة؟')) {
            return;
        }
        await sendPaymentLinkForRecord(record, idx);
    }

    /** زر "إرسال للجميع" - تأكيد واحد للدفعة كاملة، ثم يمشي على كل صف بالتتابع (مو بالتوازي) */
    async function handleSendAll(records) {
        if (records.length === 0) return;
        if (!confirm('سيتم إرسال روابط السداد لجميع العملاء بالقائمة (' + records.length + ' عميل) واحداً تلو الآخر عبر رقم واتساب الفرع.\nمتابعة؟')) {
            return;
        }
        const allBtn = document.getElementById('late-payments-send-all');
        if (allBtn) allBtn.disabled = true;
        for (let i = 0; i < records.length; i++) {
            await sendPaymentLinkForRecord(records[i], i);
        }
        if (allBtn) allBtn.disabled = false;
        showToast('انتهى إرسال روابط السداد لجميع العملاء.', 'success');
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يفحص عقداً واحداً بالتفصيل (نفس المنطق الأصلي بالضبط، بدون أي تغيير):
     * يفتح صفحة العقد، يقرأ الرصيد المتبقي الحقيقي، ويرجع null لو تعذّر الفتح
     * أو لو الرصيد أقل من الحد المطلوب - وإلا يوسّع بيانات العميل ويرجع النتيجة.
     */
    async function checkOneAgreement(frame, c, threshold) {
        // نتأكد إن الرابط فعلاً تغيّر قبل قراءة القيمة، وإلا ممكن نلقط DOM العقد السابق
        // اللي لسا موجود لحظة التنقّل، ونظل نقرأ نفس القيمة القديمة لكل العقود اللي بعده
        const targetPath = new URL(c.href).pathname;
        frame.src = c.href;
        const doc2 = await waitFor(frame, d => {
            if (d.location.pathname !== targetPath) return null;
            return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
        }, 20000);
        if (!doc2) return { checked: false, record: null };

        const total = parseAmount(doc2.querySelector('[data-testid="total-value"]')?.textContent);
        const paid = parseAmount(doc2.querySelector('[data-testid="paid-amount-value"]')?.textContent);
        const remaining = parseAmount(doc2.querySelector('[data-testid="remaining-balance-value"]')?.textContent);

        // الرصيد المتبقي الحقيقي (من صفحة العقد نفسها) هو أساس الفلترة، مو أي مؤشر بالقائمة
        if (isNaN(remaining) || remaining < threshold) return { checked: true, record: null };

        // نفس زر توسيع بيانات العميل المستخدم بأدوات الإيميل - يفتح لوحة فيها الجوال ورقم الهوية.
        // نبحث عنه بانتظار فعلي (مو محاولة وحدة) لأن مع 4 إطارات تشتغل بالتوازي
        // ممكن العنصر يكون لسا ما تركّب لحظة وصولنا هنا رغم ظهور "الرصيد المتبقي"
        let expandBtn = null;
        const btnWaitStart = Date.now();
        while (Date.now() - btnWaitStart < 3000) {
            expandBtn = Array.from(doc2.querySelectorAll('button.inline-flex'))
                .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
            if (expandBtn) break;
            await new Promise(r => setTimeout(r, 150));
        }
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        }

        // ننتظر فعلياً لين يظهر رقم الجوال بدل انتظار ثابت 1200ms - مع 4
        // إطارات تشتغل بالتوازي (CHECK_CONCURRENCY) ممكن يتأخر ظهور اللوحة
        // شوي عن ذلك الوقت الثابت، فيطلع الصف بدون جوال ولا هوية بدون داعي
        const waitStart = Date.now();
        let dialog = doc2.querySelector('[role="dialog"]') || doc2;
        while (Date.now() - waitStart < 4000) {
            dialog = doc2.querySelector('[role="dialog"]') || doc2;
            const hasPhone = Array.from(dialog.querySelectorAll('span')).some(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
            if (hasPhone) break;
            await new Promise(r => setTimeout(r, 200));
        }

        const idNumber = findValueNearLabel(dialog, "رقم الهوية");
        const phoneEl = Array.from(dialog.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        return {
            checked: true,
            record: {
                agreementNo: c.agreementNo,
                name: c.name,
                phone,
                idNumber,
                total: isNaN(total) ? "" : total.toFixed(2),
                paid: isNaN(paid) ? "" : paid.toFixed(2),
                remaining: remaining.toFixed(2),
            },
        };
    }

    async function runReport(threshold) {

        const frame = openHiddenFrame(LATE_RETURN_URL);

        showProgress("جارٍ تحميل قائمة العقود المتأخرة...");

        try {

            const doc1 = await waitFor(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
            if (!doc1) throw new Error("لم يتم العثور على أي عقود متأخرة");

            showProgress("جارٍ جمع كل صفحات القائمة...");
            const allRows = await collectAllPages(frame, doc1);
            try { frame.remove(); } catch (err) { /* تجاهل */ }

            // أيقونة "الإجمالي" بالقائمة مو مؤشر موثوق - لازم ندخل كل عقد فعلياً من زر
            // "إنهاء الاتفاقية" ونشوف "الرصيد المتبقي" الحقيقي بصفحة التفاصيل
            const candidates = allRows.slice(0, MAX_AGREEMENTS);

            if (candidates.length === 0) {
                showReport([], threshold, 0, 0);
                return;
            }

            let checkedCount = 0;
            let processedCount = 0;
            // نتيجة كل عقد تُحفظ في نفس فهرسه الأصلي (وليس بترتيب الاكتمال) حتى
            // يبقى ترتيب التقرير النهائي مطابقاً تماماً لترتيب قائمة LATE_RETURN
            // الأصلية، بغض النظر عن أي عامل خلص قبل غيره
            const recordsByIndex = new Array(candidates.length).fill(null);

            // نوزّع العقود على عدة إطارات مخفية بالتناوب (round robin)، كل إطار
            // يعالج نصيبه بالتتابع بنفس منطق الفحص الأصلي بالضبط - فقط موازاة
            // على مستوى الإطارات، بدون أي تغيير على كيفية فحص العقد الواحد
            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    processedCount++;
                    showProgress(`جارٍ فحص العقود المرشّحة... (${processedCount} من ${candidates.length})`);
                    const c = candidates[i];
                    try {
                        const { checked, record } = await checkOneAgreement(workerFrame, c, threshold);
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

            showReport(results, threshold, checkedCount, candidates.length);

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
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:13.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:11px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:11.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-late-payments')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-late-payments';
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
            '<div id="late-payments-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showThresholdPrompt() {
        document.getElementById('late-payments-box')?.remove();

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>💰 العقود المتأخرة في السداد</h3>' +
            '<div class="yq-desc">بيفلتر أول شي من نفس القائمة (المسدَّدة وتحت الحد ما تُفتح)، وبيفتح بس العقود المرشّحة للتأكد من التفاصيل.<br>أقل مبلغ تأخير تبغى تشوفه (ريال):</div>' +
            '<input id="late-payments-input" type="number" min="1" step="1" value="500" class="yq-field" />' +
            '<button id="late-payments-submit" class="yq-btn yq-btn-primary">فحص العقود</button>' +
            '<button id="late-payments-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            340
        ));

        const input = document.getElementById('late-payments-input');
        input.focus();
        input.select();

        function submit() {
            const threshold = parseFloat(input.value);
            if (!threshold || threshold <= 0) {
                input.classList.add('yq-field-err');
                return;
            }
            runReport(threshold);
        }

        document.getElementById('late-payments-submit').onclick = submit;
        document.getElementById('late-payments-cancel').onclick = () => {
            document.getElementById('late-payments-box')?.remove();
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }

    function showProgress(text) {
        document.getElementById('late-payments-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:13.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('late-payments-box')?.remove();
        showToast(text, type || 'error');
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الاسم', 'الجوال', 'رقم الهوية', 'الإجمالي', 'المدفوع', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.name, r.phone, r.idNumber, r.total, r.paid, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, threshold) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.total + '</td><td>' + r.paid + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>العقود المتأخرة في السداد</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:13px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:13px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر)</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    /** يحوّل نص UTF-8 (فيه عربي) إلى base64 - btoa العادية تدعم Latin1 بس */
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

    function buildReportImageInnerHtml(records, threshold) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.total + '</td><td>' + r.paid + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر)</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    /** يرسم الجدول كصورة PNG/JPEG عبر SVG+foreignObject. يعيد Promise بصيغة data URL */
    function buildReportImageDataUrl(records, threshold) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, threshold);
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

                // data URI (مش blob:) لأن كروم يرفض canvas.toDataURL() بصمت على SVG
                // فيها foreignObject لو كانت محمّلة من blob: (Tainted Canvas)
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

                        const TARGET_DATA_URL_LENGTH = 8000000; // ~6MB بعد فك التشفير - هامش مريح تحت حد الـ100mb
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

    /** إرسال كصورة عبر بوت واتساب - نفس صيغة باقي الأدوات */
    function handleSendWhatsApp(records, threshold) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, threshold)
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
                        // نرسل base64 خام بدون بادئة data:image/...;base64, لأن أغلب أكواد
                        // البوتات تعمل Buffer.from(imageBase64,'base64') مباشرة، والبادئة تفسد البيانات
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر) - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[العقود المتأخرة] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[العقود المتأخرة] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[العقود المتأخرة] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[العقود المتأخرة] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب المبلغ المتبقي)
    // ==========================================================

    const sortState = { key: null, dir: 1 };

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (parseFloat(a.remaining) - parseFloat(b.remaining)) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, threshold, checkedCount, totalCandidates, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), threshold, checkedCount, totalCandidates);
    }

    function showReport(records, threshold, checkedCount, totalCandidates) {
        document.getElementById('late-payments-box')?.remove();
        injectYqStyles();

        const rowsHtml = records.map((r, idx) => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td>' +
            '<td>' + r.total + '</td>' +
            '<td>' + r.paid + '</td>' +
            '<td style="font-weight:800;color:#dc2626;">' + r.remaining + '</td>' +
            '<td><button class="late-payments-send-branch-btn yq-row-send-btn" data-idx="' + idx + '">📤 إرسال رابط سداد</button></td>' +
            '<td><span id="late-payments-status-' + idx + '" style="font-size:12px;color:#a19c92;">—</span></td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="9" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود متأخرة بهذا المبلغ أو أكثر</td></tr>';

        const html =
            '<div id="late-payments-box" class="yq-overlay">' +
            '<div style="width:min(980px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">💰 العقود المتأخرة بمبلغ ' + threshold + ' ريال فأكثر</div>' +
            '<div class="yq-report-sub">' +
            'تم فحص ' + checkedCount + ' من أصل ' + totalCandidates + ' عقد بقائمة LATE_RETURN' +
            (checkedCount < totalCandidates ? ' (' + (totalCandidates - checkedCount) + ' تعذّر فتحها)' : '') +
            ' · عدد العقود المطابقة: ' + records.length +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th>' +
            '<th id="late-payments-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '<th>إرسال رابط سداد</th><th>الحالة</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="late-payments-copy">📋 نسخ</button>' +
            '<button id="late-payments-print">🖨️ طباعة</button>' +
            '<button id="late-payments-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="late-payments-send-all" class="yq-send">📤 إرسال للجميع</button>' +
            '<button id="late-payments-refresh">🔄 تحديث</button>' +
            '<button id="late-payments-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('late-payments-close').onclick = () => {
            document.getElementById('late-payments-box')?.remove();
        };
        document.getElementById('late-payments-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(threshold);
        };
        document.getElementById('late-payments-sort-remaining').onclick = () => {
            handleSortClick(records, threshold, checkedCount, totalCandidates, 'remaining');
        };
        document.getElementById('late-payments-print').onclick = () => {
            printReport(records, threshold);
        };
        document.getElementById('late-payments-whatsapp').onclick = () => {
            handleSendWhatsApp(records, threshold);
        };
        document.getElementById('late-payments-send-all').onclick = () => {
            handleSendAll(records);
        };
        document.getElementById('late-payments-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
        document.querySelectorAll('.late-payments-send-branch-btn').forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            btn.onclick = () => handleSendFromBranch(records[idx], idx);
        });
    }

    waitCore();

})();
