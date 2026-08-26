// ==UserScript==
// @name         Yaqeen Tool - تدقيق الاتفاقيات
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يفحص كل اتفاقيات B2B بمدة معيّنة ويطلع بس اللي فتحها/قفلها موظف معيّن
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      oxlobztibhzeqtqiiffa.supabase.co
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "agreement-audit",
            name: "🔍 تدقيق اتفاقياتي",
            run() {
                showAuditForm();
            }
        });
    }

    // ==========================================================
    // نظام تصميم موحّد (YQ) - نفس المستخدم بباقي الأدوات
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;max-height:90vh;overflow-y:auto;box-sizing:border-box;}' +
        '.yq-card.yq-pad{padding:28px 26px;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-card-header{border-radius:22px 22px 0 0;padding:20px 24px;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;font-size:17px;font-weight:800;}' +
        '.yq-card-body{padding:24px;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
        '.yq-field-wrap{text-align:right;margin-bottom:12px;}' +
        '.yq-field-wrap label{display:block;font-size:13px;font-weight:700;color:#767068;margin-bottom:5px;}' +
        '.yq-field{width:100%;padding:12px;border:1.5px solid #cec7b4;border-radius:12px;font-size:15px;' +
        'box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
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
        '.yq-btn:not(.yq-btn-primary):not(.yq-btn-secondary):hover{background:#f5f3ec;border-color:#a19c92;}' +
        '.yq-btn-secondary:hover{background:#e5e2d5;}' +
        '.yq-btn-primary:hover{filter:brightness(1.06);}' +
        '.yq-field:focus{outline:2px solid #a8cf5a;border-color:#79a916;}' +
        '.aud-progress-bar{height:8px;border-radius:999px;background:#eee9da;overflow:hidden;margin:14px 0;}' +
        '.aud-progress-fill{height:100%;background:linear-gradient(90deg,#A3E635,#79a916);transition:width .2s ease;}' +
        '.aud-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;' +
        'border:1px solid #eee9da;border-radius:12px;margin-bottom:8px;text-align:right;font-size:13px;}' +
        '.aud-row b{font-size:13.5px;}' +
        '.aud-tag{font-size:11px;font-weight:800;padding:3px 9px;border-radius:999px;white-space:nowrap;}' +
        '.aud-tag.open{background:#dcfce7;color:#16a34a;}' +
        '.aud-tag.close{background:#dbeafe;color:#2563eb;}' +
        '.aud-empty{color:#a19c92;font-size:13.5px;padding:20px;}';

    function injectYqStyles() {
        if (document.getElementById('yq-shared-styles-agreement-audit')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-agreement-audit';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    /** إشعار خفيف يختفي تلقائياً */
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

    // ==========================================================
    // أدوات iframe المخفي (نفس المستخدمة بأداة الإيميل)
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;";
        document.body.appendChild(iframe);
        return iframe;
    }

    /** يستنى حتى checkFn(doc) ترجع قيمة غير فارغة (أو تنتهي المهلة) */
    function waitForFrame(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 15000;
        return new Promise(resolve => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) { resolve(null); return; }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) { resolve(null); return; }
                let result = null;
                try { result = doc && checkFn(doc); } catch (err) { /* تجاهل */ }
                if (result) { resolve(result); return; }
                if (Date.now() - start > timeoutMs) { resolve(null); return; }
                setTimeout(poll, 250);
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

    function findFirstTableRow(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return null;
        return table.querySelector("tbody tr");
    }

    /** بعض قوائم يقين (Radix UI) ما تنفتح بـ.click() لحاله - تحتاج أحداث pointer حقيقية قبلها */
    function dispatchFullClick(el, win) {
        try {
            el.dispatchEvent(new win.PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new win.PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    // ==========================================================
    // قاعدة بيانات التخزين المؤقت (Supabase مشروع "tools") - تخزّن نتيجة
    // كل اتفاقية اتفحصت مرة (بدون فلترة لموظف معيّن)، فأي تشغيلة بعدها
    // تستخدم المحفوظ بدل ما تفتح نفس الاتفاقية بيقين من جديد
    // ==========================================================

    const SUPABASE_URL = "https://oxlobztibhzeqtqiiffa.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94bG9ienRpYmh6ZXF0cWlpZmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzIwMjMsImV4cCI6MjEwMTQ0ODAyM30.kS9zdu8sxteAtGuws4hHBpu-wKo8L_WvNpjru3ixFFU";

    /** طلب عام لـSupabase REST (PostgREST) عبر GM_xmlhttpRequest (يتفادى قيود CORS) مع fetch كحل احتياطي */
    function supabaseRequest(method, path, body, extraHeaders) {
        const headers = Object.assign({
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
        }, extraHeaders || {});
        const url = SUPABASE_URL + path;
        return new Promise(resolve => {
            if (typeof GM_xmlhttpRequest !== "undefined") {
                GM_xmlhttpRequest({
                    method: method,
                    url: url,
                    headers: headers,
                    data: body ? JSON.stringify(body) : undefined,
                    onload: function (response) {
                        if (response.status >= 400) {
                            console.log("[agreement-audit] فشل طلب Supabase:", method, path, response.status, response.responseText);
                            resolve(null);
                            return;
                        }
                        try { resolve(response.responseText ? JSON.parse(response.responseText) : true); } catch (err) { resolve(null); }
                    },
                    onerror: function () {
                        console.log("[agreement-audit] فشل طلب Supabase (شبكة):", method, path);
                        resolve(null);
                    },
                });
                return;
            }
            fetch(url, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined })
                .then(res => {
                    if (!res.ok) {
                        console.log("[agreement-audit] فشل طلب Supabase:", method, path, res.status);
                        return null;
                    }
                    return res.json().catch(() => true);
                })
                .then(resolve)
                .catch(() => resolve(null));
        });
    }

    /** يجيب كل الاتفاقيات المحفوظة مسبقاً من أرقام معيّنة (يقسّمها لدفعات حتى ما يطول الرابط) */
    async function fetchCachedAgreements(agreementNos) {
        const cached = new Map();
        const BATCH_SIZE = 150;
        for (let i = 0; i < agreementNos.length; i += BATCH_SIZE) {
            const batch = agreementNos.slice(i, i + BATCH_SIZE);
            const filter = encodeURIComponent("in.(" + batch.join(",") + ")");
            const rows = await supabaseRequest("GET", `/rest/v1/agreement_audit_cache?agreement_no=${filter}&select=*`);
            if (Array.isArray(rows)) {
                rows.forEach(r => cached.set(r.agreement_no, r));
            }
        }
        return cached;
    }

    /** يحفظ نتيجة اتفاقية وحدة بالقاعدة (upsert - يحدّث لو موجودة، يضيف لو جديدة) */
    function saveAgreementToCache(record) {
        return supabaseRequest("POST", "/rest/v1/agreement_audit_cache", record, {
            "Prefer": "resolution=merge-duplicates",
        });
    }

    // ==========================================================
    // قراءة فواتير B2B (مصدر أرقام الاتفاقيات بالمدة المطلوبة)
    // ==========================================================

    /** يستنى جدول الفواتير حتى عدد صفوفه يثبت (ما يتغيّر) لـ3 فحوصات متتالية - صفحة الفواتير
     * تحمّل صفوفها تدريجياً (streaming)، فأول ظهور لصف وحد مو دليل إن التحميل خلص */
    function waitForStableRowCount(iframe, timeoutMs) {
        timeoutMs = timeoutMs || 25000;
        return new Promise(resolve => {
            const start = Date.now();
            let lastCount = -1;
            let stableStreak = 0;
            (function poll() {
                if (!iframe.isConnected) { resolve(null); return; }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) { resolve(null); return; }
                if (doc && doc.body.innerText.includes("لا يوجد")) { resolve(doc); return; }
                const count = doc ? doc.querySelectorAll("table tbody tr").length : 0;
                // العناوين ممكن توصل بنية فاضية أول شي (React لسا يملّي النص) - ننتظر
                // أول <th>/<td> برأس الجدول يصير فيه نص فعلي قبل ما نعتبر الصفحة جاهزة
                const headersReady = doc
                    ? Array.from(doc.querySelectorAll("table thead tr th, table thead tr td")).some(c => c.textContent.trim())
                    : false;
                if (count > 0 && headersReady && count === lastCount) {
                    stableStreak++;
                    if (stableStreak >= 3) { resolve(doc); return; }
                } else {
                    stableStreak = 0;
                }
                lastCount = count;
                if (Date.now() - start > timeoutMs) { resolve(doc || null); return; }
                setTimeout(poll, 400);
            })();
        });
    }

    /** يبني رابط صفحة فواتير B2B/B2C لرقم صفحة معيّن (0 = الأولى، بدون باراميتر pageNumber) */
    function buildInvoicesUrl(branchId, docType, fromDate, toDate, pageNumber) {
        let url = `https://yaqeen.lumirental.com/rental/branches/${branchId}/financials/invoices/${docType}-invoices` +
            `?branchIds=${branchId}&issueDate=${fromDate},${toDate}&pageSize=500`;
        if (pageNumber > 0) url += `&pageNumber=${pageNumber}`;
        return url;
    }

    /** يسحب كل أرقام اتفاقيات B2B/B2C الفريدة بالمدة، ويجمع مبلغ كل فواتيرها (اتفاقية ممكن يكون لها أكثر من فاتورة - رسوم تمديد مثلاً) */
    async function fetchAllAgreementNumbers(branchId, docType, fromDate, toDate, onProgress) {
        const frame = openHiddenFrame("about:blank");
        const byAgreement = new Map(); // agreementNo -> مجموع مبالغ فواتيره
        let truncated = false;
        let totalRowsSeen = 0;
        let knownTotal = null; // "عرض 0-500 من 1,030" - نوقف بثقة لما نوصله بدل ما نخمّن
        try {
            let pageNumber = 0;
            while (true) {
                onProgress && onProgress(`جارٍ جلب صفحة الفواتير رقم ${pageNumber + 1}...`);
                const pageUrl = buildInvoicesUrl(branchId, docType, fromDate, toDate, pageNumber);
                console.log("[agreement-audit] تحميل:", pageUrl);
                frame.src = pageUrl;
                const doc = await waitForStableRowCount(frame, 25000);
                if (!doc) {
                    console.log("[agreement-audit] توقف: الصفحة ما استجابت خلال 25 ثانية");
                    break;
                }

                const allTables = doc.querySelectorAll("table").length;
                const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
                if (!table) {
                    console.log("[agreement-audit] توقف: فيه", allTables, "جدول بالصفحة بس ولا وحد فيه صفوف");
                    break;
                }

                const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
                console.log("[agreement-audit] عناوين أعمدة الجدول:", headerCells.map(c => c.textContent.trim()));
                const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
                const amountIdx = findColumnIndex(headerCells, ["المبلغ"]);
                if (agreementIdx === -1) {
                    console.log("[agreement-audit] توقف: ما لقيت عمود \"رقم الاتفاقية\" بالعناوين أعلاه");
                    break;
                }

                const rows = Array.from(table.querySelectorAll("tbody tr"));
                console.log("[agreement-audit] عدد الصفوف بهذي الصفحة:", rows.length);
                if (!rows.length) break;

                // نقرأ "عرض 0-500 من 1,030" (إن وُجدت) عشان نعرف نتوقف بثقة لما نغطي كل الصفوف،
                // بدل ما نعتمد بس على صفحة فاضية (ممكن تاخذ وقت طويل تتأكد إنها فاضية فعلاً)
                const totalMatch = /من\s+([\d,]+)/.exec(doc.body.innerText);
                if (totalMatch) knownTotal = parseInt(totalMatch[1].replace(/,/g, ""), 10);
                totalRowsSeen += rows.length;
                console.log("[agreement-audit] إجمالي الصفوف المقروءة لين الآن:", totalRowsSeen, knownTotal ? `من أصل ${knownTotal}` : "");

                rows.forEach(row => {
                    const cells = row.querySelectorAll("td");
                    const agreementNo = (cells[agreementIdx]?.textContent || "").trim();
                    if (!agreementNo) return;
                    const amountText = amountIdx !== -1 ? (cells[amountIdx]?.textContent || "").trim() : "";
                    const amountNum = parseFloat(amountText.replace(/[^\d.]/g, "")) || 0;
                    byAgreement.set(agreementNo, (byAgreement.get(agreementNo) || 0) + amountNum);
                });

                if (knownTotal !== null && totalRowsSeen >= knownTotal) {
                    console.log("[agreement-audit] وصلنا كل الصفوف المعروفة، خلصنا");
                    break;
                }

                // نكمل للصفحة التالية دايماً (السيرفر ممكن يحدد حد أقصى للصف بالصفحة أقل من
                // pageSize المطلوب - شفناها فعلياً ترجع 100 صف رغم طلب 500)، ونتوقف بس
                // لما صفحة ترجع فاضية فعلاً (rows.length === 0 بأعلى الحلقة)
                pageNumber++;
                if (pageNumber > 300) { truncated = true; break; } // حد أمان يمنع حلقة لا نهائية (B2C ممكن تكون آلاف الفواتير)
            }
        } finally {
            frame.remove();
        }
        const list = Array.from(byAgreement, ([agreementNo, amountSum]) => ({
            agreementNo,
            amount: amountSum ? amountSum.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "",
        }));
        return { list, truncated };
    }

    // ==========================================================
    // فحص اتفاقية وحدة: يفتح "..." ← "تنزيل الاتفاقية"، يلقط نافذة
    // الطباعة قبل ما تفتح فعلياً، ويقرأ منها Opened By / Closed By
    // ==========================================================

    /** يعترض window.open بالإطار عشان يمسك مرجع نافذة الطباعة ويمنعها تفتح فعلياً */
    function captureNextPopup(win) {
        return new Promise(resolve => {
            const originalOpen = win.open;
            win.open = function (...args) {
                const popup = originalOpen.apply(win, args);
                win.open = originalOpen;
                if (popup) {
                    try { popup.print = function () { /* منع نافذة الطباعة الفعلية */ }; } catch (err) { /* تجاهل */ }
                }
                resolve(popup);
                return popup;
            };
            // مهلة سخية: قائمة "..." وحدها ممكن تاخذ لين 3 ثواني قبل حتى نضغط زر التنزيل
            setTimeout(() => {
                if (win.open !== originalOpen) { win.open = originalOpen; resolve(null); }
            }, 15000);
        });
    }

    /** يستنى حتى popup.document.body يحتوي "Opened By" (أو تنتهي المهلة) */
    function waitForPopupContent(popup, timeoutMs) {
        timeoutMs = timeoutMs || 8000;
        return new Promise(resolve => {
            const start = Date.now();
            (function poll() {
                if (!popup || popup.closed) { resolve(null); return; }
                let text = "";
                try { text = popup.document.body.innerText || ""; } catch (err) { resolve(null); return; }
                if (text.includes("Opened By")) { resolve(text); return; }
                if (Date.now() - start > timeoutMs) { resolve(text || null); return; }
                setTimeout(poll, 200);
            })();
        });
    }

    // بقية تسميات الحقول المجاورة بنفس نموذج الاتفاقية - نوقف الاستخراج عند
    // أقربها حتى ما تتسرب قيمة حقل ثاني (مثلاً "Closed By") لداخل نتيجة الحقل الحالي
    const AGREEMENT_FIELD_LABELS = ["Opened By", "Closed By", "Checked By on Exit", "Checked By on Entry", "Renter Sign"];

    /** يستخرج القيمة اللي بعد تسمية معيّنة (Opened By / Closed By) من نص الاتفاقية الكامل */
    function extractFieldAfterLabel(fullText, label) {
        const idx = fullText.indexOf(label);
        if (idx === -1) return "";
        const searchStart = idx + label.length;
        let boundary = searchStart + 120;
        AGREEMENT_FIELD_LABELS.forEach(other => {
            if (other === label) return;
            const otherIdx = fullText.indexOf(other, searchStart);
            if (otherIdx !== -1 && otherIdx < boundary) boundary = otherIdx;
        });
        const after = fullText.slice(searchStart, boundary);
        const match = /(\d{4,10}\s+[A-Za-z][A-Za-z .'-]{2,40})/.exec(after);
        return match ? match[1].trim() : "";
    }

    // نفس فكرة AGREEMENT_FIELD_LABELS: نوقف الاستخراج عند أقرب حقل مجاور
    // حتى ما نتسرب لقيمة حقل ثاني (مثلاً "Deductible Amount" بدل "CDW")
    const RENTAL_INFO_FIELD_LABELS = ["Check out Date", "Check Out Branch", "Check In Date", "Check In Branch", "Rent Per Day", "Period of Rent", "Drop Off Charges"];
    const INSURANCE_FIELD_LABELS = ["CDW", "Deductible Amount", "Insurance Type", "Policy No", "Expiry Date"];

    /** يستخرج القيمة اللي بعد تسمية معيّنة، بحد أقصى boundaryLabels الأقرب (نفس منطق extractFieldAfterLabel) */
    function extractNearLabel(fullText, label, boundaryLabels, valueRegex, maxChars) {
        const idx = fullText.indexOf(label);
        if (idx === -1) return null;
        const searchStart = idx + label.length;
        let boundary = searchStart + maxChars;
        boundaryLabels.forEach(other => {
            if (other === label) return;
            const otherIdx = fullText.indexOf(other, searchStart);
            if (otherIdx !== -1 && otherIdx < boundary) boundary = otherIdx;
        });
        const after = fullText.slice(searchStart, boundary);
        const match = valueRegex.exec(after);
        return match ? match[1] : null;
    }

    /** يستخرج عدد أيام التأجير من "Period of Rent: ... N Day(s)" */
    function extractPeriodOfRentDays(fullText) {
        const val = extractNearLabel(fullText, "Period of Rent", RENTAL_INFO_FIELD_LABELS, /(\d+)\s*Days?/i, 80);
        return val ? parseInt(val, 10) : 0;
    }

    /** يستخرج مبلغ تأمين CDW من "CDW: ... N.NN" */
    function extractCdwAmount(fullText) {
        const val = extractNearLabel(fullText, "CDW", INSURANCE_FIELD_LABELS, /(\d[\d,]*\.\d{2})/, 150);
        return val ? parseFloat(val.replace(/,/g, "")) : 0;
    }

    /** يفحص اتفاقية وحدة: يرجّع {agreementNo, openedBy, closedBy, days, cdw} أو null لو تعذّر الفحص */
    async function checkOneAgreement(branchId, agreementNo) {
        const frame = openHiddenFrame(
            `https://yaqeen.lumirental.com/rental/branches/${branchId}/bookings?agreementNo=${encodeURIComponent(agreementNo)}`
        );
        try {
            const doc1 = await waitForFrame(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
            if (!doc1) return null;

            const row = findFirstTableRow(doc1);
            if (!row) return null;

            const win = frame.contentWindow;
            const menuTrigger = row.querySelector('[aria-haspopup="menu"]') || row.querySelector("button");
            if (!menuTrigger) return null;

            const popupPromise = captureNextPopup(win);
            dispatchFullClick(menuTrigger, win);

            // القائمة قد تاخذ وقت شوي تنفتح (أنيميشن)
            let downloadBtn = null;
            const menuStart = Date.now();
            while (!downloadBtn && Date.now() - menuStart < 3000) {
                const matches = Array.from(win.document.querySelectorAll('[role="menuitem"], button'))
                    .filter(b => b.textContent.includes("تنزيل الاتفاقية"));
                downloadBtn = matches.length ? matches[matches.length - 1] : null;
                if (!downloadBtn) await new Promise(r => setTimeout(r, 200));
            }
            if (!downloadBtn) return null;
            dispatchFullClick(downloadBtn, win);

            const popup = await popupPromise;
            if (!popup) return null;

            const fullText = await waitForPopupContent(popup);
            try { popup.close(); } catch (err) { /* تجاهل */ }
            if (!fullText) return null;

            return {
                agreementNo,
                openedBy: extractFieldAfterLabel(fullText, "Opened By"),
                closedBy: extractFieldAfterLabel(fullText, "Closed By"),
                days: extractPeriodOfRentDays(fullText),
                cdw: extractCdwAmount(fullText),
            };
        } finally {
            frame.remove();
        }
    }

    // ==========================================================
    // واجهة الأداة
    // ==========================================================

    function showAuditForm() {
        document.getElementById("aud-box")?.remove();
        injectYqStyles();
        const today = new Date();
        const yyyy = today.getFullYear();
        const html = `
<div id="aud-box" class="yq-overlay">
<div class="yq-card yq-pad" style="max-width:380px;">
<h3>🔍 تدقيق اتفاقياتي</h3>
<div class="yq-desc">يفحص كل اتفاقيات الفرع بالمدة المحددة ويطلع لك بس اللي فتحتها أو قفلتها أنت.</div>
<div class="yq-field-wrap">
<label>نوع الاتفاقيات</label>
<div style="display:flex;gap:8px;">
<label style="flex:1;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;border:1.5px solid #cec7b4;border-radius:12px;padding:10px;cursor:pointer;">
<input type="radio" name="aud-doctype" value="b2b" checked> شركات (B2B)
</label>
<label style="flex:1;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;border:1.5px solid #cec7b4;border-radius:12px;padding:10px;cursor:pointer;">
<input type="radio" name="aud-doctype" value="b2c"> أفراد (B2C)
</label>
</div>
</div>
<div class="yq-field-wrap"><label>الفرع</label><input type="text" class="yq-field" id="aud-branch" value="29"></div>
<div class="yq-field-wrap"><label>من تاريخ</label><input type="date" class="yq-field" id="aud-from" value="${yyyy}-01-01"></div>
<div class="yq-field-wrap"><label>إلى تاريخ</label><input type="date" class="yq-field" id="aud-to" value="${yyyy}-03-31"></div>
<div class="yq-field-wrap"><label>ابحث عن (اسمك أو رقم موظفك)</label><input type="text" class="yq-field" id="aud-name" placeholder="مثال: Ahmed Almalki أو 13106197"></div>
<button class="yq-btn yq-btn-primary" id="aud-start">ابدأ الفحص</button>
<button class="yq-btn yq-btn-secondary" id="aud-cancel-form">إلغاء</button>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);

        document.getElementById("aud-cancel-form").onclick = () => document.getElementById("aud-box")?.remove();
        document.getElementById("aud-start").onclick = () => {
            const docType = document.querySelector('input[name="aud-doctype"]:checked').value;
            const branch = document.getElementById("aud-branch").value.trim();
            const from = document.getElementById("aud-from").value;
            const to = document.getElementById("aud-to").value;
            const name = document.getElementById("aud-name").value.trim();
            if (!branch || !from || !to || !name) {
                showToast("عبّي كل الحقول أول", "error");
                return;
            }
            document.getElementById("aud-box")?.remove();
            runAudit(branch, docType, from, to, name);
        };
    }

    function showProgress(text, done, total) {
        document.getElementById("aud-box")?.remove();
        injectYqStyles();
        const pct = total ? Math.round((done / total) * 100) : 0;
        const html = `
<div id="aud-box" class="yq-overlay">
<div class="yq-card yq-pad" style="max-width:340px;">
<div class="yq-spinner"></div>
<div style="font-size:14.5px;font-weight:700;">${text}</div>
<div class="aud-progress-bar"><div class="aud-progress-fill" style="width:${pct}%"></div></div>
<div style="font-size:12.5px;color:#a19c92;">${done} / ${total}</div>
<button class="yq-btn yq-btn-secondary" id="aud-stop">إيقاف</button>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        document.getElementById("aud-stop").onclick = () => { AUDIT_STATE.cancelled = true; };
    }

    function showResults(nameQuery, matches, totalChecked) {
        document.getElementById("aud-box")?.remove();
        injectYqStyles();
        const totalDays = matches.reduce((sum, m) => sum + (m.days || 0), 0);
        const totalCdw = matches.reduce((sum, m) => sum + (m.cdw || 0), 0);

        const rowsHtml = matches.length
            ? matches.map(m => `
                <div class="aud-row">
                    <div>
                        <b>${m.agreementNo}</b> — ${m.amount ? m.amount + " ر.س" : ""}
                        · ${m.days} يوم · تأمين ${m.cdw.toFixed(2)} ر.س
                        <div style="color:#a19c92;font-size:11.5px;">
                            ${m.openedByMatch ? "فتح: " + m.openedBy : ""}
                            ${m.closedByMatch ? " قفل: " + m.closedBy : ""}
                        </div>
                    </div>
                    <div>
                        ${m.openedByMatch ? '<span class="aud-tag open">فتح</span>' : ""}
                        ${m.closedByMatch ? '<span class="aud-tag close">قفل</span>' : ""}
                    </div>
                </div>`).join("")
            : `<div class="aud-empty">ما لقيت أي اتفاقية عليها "${nameQuery}"</div>`;

        const summaryHtml = matches.length
            ? `<div class="yq-desc" style="margin-top:0;">
                فُحصت ${totalChecked} اتفاقية، ولُقي ${matches.length} عليها "${nameQuery}"<br>
                إجمالي الأيام: <b>${totalDays}</b> · إجمالي تأمين CDW: <b>${totalCdw.toFixed(2)}</b> ر.س (5% منه = ${(totalCdw * 0.05).toFixed(2)} ر.س)
               </div>`
            : `<div class="yq-desc" style="margin-top:0;">فُحصت ${totalChecked} اتفاقية، ولُقي ${matches.length} عليها "${nameQuery}"</div>`;

        const html = `
<div id="aud-box" class="yq-overlay">
<div class="yq-card" style="max-width:460px;">
<div class="yq-card-header">نتيجة التدقيق</div>
<div class="yq-card-body">
${summaryHtml}
${rowsHtml}
<button class="yq-btn yq-btn-secondary" id="aud-close">إغلاق</button>
</div>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        document.getElementById("aud-close").onclick = () => document.getElementById("aud-box")?.remove();
    }

    const AUDIT_STATE = { cancelled: false };

    async function runAudit(branchId, docType, fromDate, toDate, nameQuery) {
        AUDIT_STATE.cancelled = false;
        const docLabel = docType === "b2c" ? "أفراد (B2C)" : "شركات (B2B)";
        showProgress(`جارٍ جلب قائمة اتفاقيات ${docLabel}...`, 0, 0);

        const { list: agreements, truncated } = await fetchAllAgreementNumbers(branchId, docType, fromDate, toDate, text => {
            if (!AUDIT_STATE.cancelled) showProgress(text, 0, 0);
        });

        if (truncated) {
            showToast("تحذير: عدد الفواتير كبير جداً، النتيجة قد تكون ناقصة - قسّم المدة لفترات أصغر لنتيجة كاملة", "error");
        }

        if (!agreements.length) {
            document.getElementById("aud-box")?.remove();
            showToast(`ما لقيت أي اتفاقية ${docLabel} بهذي المدة`, "error");
            return;
        }

        showProgress("جارٍ التحقق من المحفوظ مسبقاً بقاعدة البيانات...", 0, agreements.length);
        const cached = await fetchCachedAgreements(agreements.map(a => a.agreementNo));
        console.log("[agreement-audit] لقينا", cached.size, "اتفاقية محفوظة مسبقاً من أصل", agreements.length);

        const normQuery = normalizeArabic(nameQuery).toLowerCase();
        const matches = [];
        let checked = 0;
        let fromCache = 0;

        for (const item of agreements) {
            if (AUDIT_STATE.cancelled) break;

            let result;
            const cachedRow = cached.get(item.agreementNo);
            if (cachedRow) {
                showProgress(`(محفوظة) ${item.agreementNo}...`, checked, agreements.length);
                result = {
                    openedBy: cachedRow.opened_by || "",
                    closedBy: cachedRow.closed_by || "",
                    days: cachedRow.days || 0,
                    cdw: Number(cachedRow.cdw) || 0,
                };
                fromCache++;
            } else {
                showProgress(`جارٍ فحص الاتفاقية ${item.agreementNo}...`, checked, agreements.length);
                result = await checkOneAgreement(branchId, item.agreementNo);
                // نحفظ بس الاتفاقيات المقفلة فعلياً (closedBy موجود) - اتفاقية لسا مفتوحة
                // لو حفظناها بـclosedBy فاضي بتضل كذا للأبد حتى لو انقفلت لاحقاً، لأن
                // القاعدة ما تُعاد قراءتها من يقين إلا لو ما كانت موجودة أصلاً بالكاش
                if (result && result.closedBy) {
                    saveAgreementToCache({
                        agreement_no: item.agreementNo,
                        doc_type: docType,
                        branch_id: String(branchId),
                        opened_by: result.openedBy || null,
                        closed_by: result.closedBy || null,
                        days: result.days || 0,
                        cdw: result.cdw || 0,
                        amount: item.amount ? parseFloat(String(item.amount).replace(/,/g, "")) : null,
                    });
                }
            }
            checked++;

            if (result) {
                const openedByMatch = result.openedBy && normalizeArabic(result.openedBy).toLowerCase().includes(normQuery);
                const closedByMatch = result.closedBy && normalizeArabic(result.closedBy).toLowerCase().includes(normQuery);
                if (openedByMatch || closedByMatch) {
                    matches.push({ ...item, ...result, openedByMatch, closedByMatch });
                }
            }
        }

        console.log("[agreement-audit] خلص:", checked, "فُحصت،", fromCache, "منها من الكاش");
        showResults(nameQuery, matches, checked);
    }

    waitCore();

})();
