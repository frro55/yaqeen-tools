// ==UserScript==
// @name         Yaqeen Tool - إيميل
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  نسخ محتوى إيميلات جاهزة (إغلاق عقد / حادث / فتح اتفاقية) كجدول HTML بضغطة زر
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      cdn.lumirental.com
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    // unsafeWindow: مطلوب لأن GM_xmlhttpRequest يشغّل السكربت بوضع sandbox معزول
    var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "email-tools",
            name: "📧 إيميل",
            run() {
                chooseEmailType();
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
        'textarea.yq-field{resize:vertical;}' +
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
        '.yq-menu-btn{width:100%;padding:13px;margin-top:8px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:15px;font-weight:800;font-family:inherit;background:#f1f0ea;color:#1c1c1a;}' +
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
        if (document.getElementById('yq-shared-styles-email-tools')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-email-tools';
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

    // ==========================================================
    // قائمة اختيار نوع الإيميل
    // ==========================================================

    function chooseEmailType() {

        document.getElementById("email-box")?.remove();
        injectYqStyles();

        const box = document.createElement("div");
        box.id = "email-box";
        box.className = "yq-overlay";

        box.innerHTML = `
        <div class="yq-card yq-pad" style="max-width:320px;">
        <h3>📧 إيميل</h3>

        <button id="close-agreement" class="yq-menu-btn">🔒 إغلاق عقد</button>
        <button id="accident" class="yq-menu-btn">🚗 حادث</button>
        <button id="open-agreement" class="yq-menu-btn">📄 فتح اتفاقية</button>

        <button id="cancel" class="yq-btn yq-btn-secondary">إلغاء</button>
        </div>
        `;

        document.body.appendChild(box);

        box.querySelector("#cancel").onclick = () => box.remove();

        box.querySelector("#close-agreement").onclick = () => {
            box.remove();
            closeAgreementEmail();
        };

        box.querySelector("#accident").onclick = () => {
            box.remove();
            accidentEmail();
        };

        box.querySelector("#open-agreement").onclick = () => {
            box.remove();
            openAgreementEmail();
        };

    }

    // ==========================================================
    // إيميل إغلاق عقد
    // ==========================================================

    /** نافذة مخصصة (بنفس تصميم باقي الأدوات: رأس أخضر + جسم أبيض) بدل prompt() المتصفح لجمع سبب الإغلاق */
    function showCloseAgreementForm() {
        return new Promise(resolve => {
            document.getElementById("email-box")?.remove();
            injectYqStyles();

            const box = document.createElement("div");
            box.id = "email-box";
            box.className = "yq-overlay";

            box.innerHTML = `
            <div class="yq-card" style="max-width:360px;">
                <div class="yq-card-header">🔒 إغلاق عقد</div>
                <div class="yq-card-body">
                    <div class="yq-field-wrap">
                        <label>سبب إغلاق العقد</label>
                        <textarea id="close-reason" rows="3" class="yq-field"></textarea>
                    </div>
                    <button id="close-submit" class="yq-btn yq-btn-primary">نسخ الإيميل</button>
                    <button id="close-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>
                </div>
            </div>`;

            document.body.appendChild(box);

            const reasonInput = document.getElementById("close-reason");
            reasonInput.focus();

            function submit() {
                const reason = reasonInput.value.trim();
                box.remove();
                resolve(reason);
            }

            document.getElementById("close-submit").onclick = submit;
            document.getElementById("close-cancel").onclick = () => {
                box.remove();
                resolve(null);
            };
        });
    }

    /** إشعار خفيف (توست) - بديل alert() المتصفح */
    function showEmailMessage(text, isError) {
        showToast(text, isError ? "error" : "success");
    }

    async function closeAgreementEmail() {

        let a = (document.body.innerText.match(/A\d{8,}/) || [""])[0];

        let s = Array.from(document.querySelectorAll("h3"))
            .find(h => h.innerText.includes("فحص التسليم"));

        let dt = s?.querySelector("p.text-sm.font-light")?.innerText || "";
        let d = dt.split("-")[0].trim();
        let date = d.split(" ")[0] || "";
        let time = d.split(" ")[1] || "";

        let kms = Array.from(document.querySelectorAll("td"))
            .map(td => td.innerText)
            .filter(t => t.includes("كم"))
            .map(t => parseInt(t.replace(/[^\d]/g, "")))
            .filter(n => !isNaN(n));
        let maxKm = Math.max(...kms, 0);

        let fuel = Array.from(document.querySelectorAll("td span"))
            .map(s => s.innerText)
            .find(t => t.includes("/")) || "";

        let remaining = document.querySelector('[data-testid="remaining-value"]')?.innerText || "";

        const reason = await showCloseAgreementForm();
        if (reason === null) return; // المستخدم ألغى

        let subj = `إغلاق عقد - ${a}`;

        let html = `<div style="text-align:right;font-weight:bold;font-family:Arial"><p>${subj}</p><p>تحية طيبة وبعد</p><p>الرجاء اغلاق العقد التالي:</p><table border="1" style="border-collapse:collapse;text-align:right;font-weight:bold;font-family:Arial"><tr style="background:#1f7a3b;color:white"><th colspan="2" style="padding:4px 8px">إغلاق عقد</th></tr><tr><td style="padding:4px 8px">${a}</td><td style="padding:4px 8px">رقم الاتفاقية</td></tr><tr><td style="padding:4px 8px">${date}</td><td style="padding:4px 8px">تاريخ الدخول</td></tr><tr><td style="padding:4px 8px">${time}</td><td style="padding:4px 8px">وقت الدخول</td></tr><tr><td style="padding:4px 8px">${maxKm} كم</td><td style="padding:4px 8px">العداد</td></tr><tr><td style="padding:4px 8px">${fuel}</td><td style="padding:4px 8px">البنزين</td></tr><tr><td style="padding:4px 8px">${remaining}</td><td style="padding:4px 8px">المتبقي</td></tr><tr style="background:#1f7a3b;color:white"><td colspan="2" style="padding:4px 8px">سبب الإغلاق</td></tr><tr><td colspan="2" style="padding:4px 8px">${reason}</td></tr></table></div>`;

        await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) })]);

        showEmailMessage("تم نسخ إيميل إغلاق العقد بنجاح");

    }

    // ==========================================================
    // إيميل حادث
    // ==========================================================
    // يبحث بالعقد، يدخل التفاصيل، يعرض صور الفحص للاختيار، يحمّلها، ويبني الإيميل

    /** يجمع كل الإدخالات اليدوية (رقم العقد + بيانات الحادث) بنافذة وحدة قبل ما نبدأ، بدل ما نقاطع المستخدم بـprompt عدة مرات وسط التدفق */
    function showAccidentInputForm() {
        return new Promise(resolve => {
            document.getElementById("email-box")?.remove();
            injectYqStyles();

            const box = document.createElement("div");
            box.id = "email-box";
            box.className = "yq-overlay";

            box.innerHTML = `
            <div class="yq-card yq-pad" style="max-width:340px;">
                <h3>🚗 بيانات الحادث</h3>
                <div class="yq-field-wrap">
                    <label>رقم عقد التأجير</label>
                    <input id="acc-agreement" type="text" placeholder="A1780008085" class="yq-field" />
                </div>
                <div class="yq-field-wrap">
                    <label>نسبة الإدانة</label>
                    <input id="acc-guilt" type="text" class="yq-field" />
                </div>
                <div class="yq-field-wrap">
                    <label>موقع الحادث</label>
                    <input id="acc-location" type="text" class="yq-field" />
                </div>
                <div class="yq-field-wrap">
                    <label>رقم الحادث</label>
                    <input id="acc-number" type="text" class="yq-field" />
                </div>
                <button id="acc-submit" class="yq-btn yq-btn-primary">متابعة</button>
                <button id="acc-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>
            </div>`;

            document.body.appendChild(box);

            const agreementInput = document.getElementById("acc-agreement");
            agreementInput.focus();

            function submit() {
                const agreementNo = agreementInput.value.trim();
                if (!agreementNo) {
                    agreementInput.classList.add("yq-field-err");
                    return;
                }
                const result = {
                    agreementNo,
                    guiltPercentage: document.getElementById("acc-guilt").value.trim(),
                    accidentLocation: document.getElementById("acc-location").value.trim(),
                    accidentNumber: document.getElementById("acc-number").value.trim(),
                };
                box.remove();
                resolve(result);
            }

            document.getElementById("acc-submit").onclick = submit;
            document.getElementById("acc-cancel").onclick = () => {
                box.remove();
                resolve(null);
            };
            box.addEventListener("keydown", e => {
                if (e.key === "Enter" && e.target.tagName === "INPUT") submit();
            });
        });
    }

    async function accidentEmail() {

        const formData = await showAccidentInputForm();
        if (!formData) return;
        const agreementNo = formData.agreementNo;
        const f = formData.guiltPercentage;
        const l = formData.accidentLocation;
        const acc = formData.accidentNumber;

        showAgreementStatus("جارٍ البحث عن العقد...");

        // iframe مخفي للبحث والتصفّح؛ الاستثناء: نافذة طباعة الاتفاقية يفتحها يقين نفسه كنافذة حقيقية منفصلة
        const frame = openHiddenFrame(
            `https://yaqeen.lumirental.com/rental/branches/29/bookings?agreementNo=${encodeURIComponent(agreementNo)}`
        );

        try {

            const doc1 = await waitForFrame(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
            if (!doc1) throw new Error("لم يتم العثور على العقد");

            const row = findFirstTableRow(doc1);
            if (!row) throw new Error("لم يتم العثور على صف الحجز");

            const plateFromList = extractPlateFromRow(row);
            const downloadIssues = [];

            async function attemptAgreementDownload() {
                try {
                    return await downloadAgreementFromRow(frame.contentWindow, row);
                } catch (err) {
                    return { ok: false, reason: err.message };
                }
            }

            showAgreementStatus("جارٍ فتح نافذة طباعة الاتفاقية...");
            let agreementResult = await attemptAgreementDownload();
            hideAgreementStatus();

            // ننتظر تأكيد يدوي إن المستخدم حفظ الاتفاقية قبل المتابعة، مع زر إعادة محاولة لو فشل الضغط الأول
            agreementResult = await showAgreementConfirm(agreementResult, attemptAgreementDownload);
            if (agreementResult && !agreementResult.ok) downloadIssues.push("الاتفاقية: " + agreementResult.reason);

            showAgreementStatus("جارٍ فتح تفاصيل الحجز...");

            const link = row.querySelector("a") || row;
            link.click();

            await waitForFrame(frame, d => (
                d.body.innerText.includes("تفاصيل الحجز") ||
                d.querySelector('[data-testid="insurance-value"]') ||
                d.querySelector('[data-testid="insurance-amount-value"]')
            ) ? d : null, 15000);

            const doc2 = frame.contentDocument || frame.contentWindow.document;

            // نفس زر توسيع بيانات العميل المستخدم بإيميل فتح الاتفاقية
            const expandBtn = Array.from(doc2.querySelectorAll('button.inline-flex'))
                .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
            if (expandBtn) expandBtn.click();

            await new Promise(r => setTimeout(r, 1200));

            const dialog = doc2.querySelector('[role="dialog"]') || doc2;
            const phoneEl = Array.from(dialog.querySelectorAll('span'))
                .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
            const phone = phoneEl ? phoneEl.textContent.trim() : "";

            const v1 = parseFloat((doc2.querySelector('[data-testid="insurance-value"]')?.innerText || "0").replace(/[^\d.]/g, ''));
            const v2 = parseFloat((doc2.querySelector('[data-testid="insurance-amount-value"]')?.innerText || "0").replace(/[^\d.]/g, ''));
            const insurance = (v1 > 0 || v2 > 0) ? "شامل" : "عادي";

            // نحاول نص إنجليزي للوحة إن وُجد بهذي الصفحة، وإلا نكتفي بالي سحبناه من جدول البحث
            const pn = doc2.querySelector('[data-testid="plate-number"]')?.innerText || "";
            const pl = doc2.querySelector('[data-testid="plate-letters"]')?.innerText || "";
            const plateFromDetail = (pn + " " + pl).trim();
            const plate = plateFromDetail || plateFromList;

            showAgreementStatus("جارٍ جلب صور الفحص...");
            let deliveryImages = [];
            try {
                // تقرير الفحص أكورديون مطوي افتراضياً، لازم نفتحه قبل ما محتواه يترسم بالـDOM
                const reportToggle = Array.from(doc2.querySelectorAll('button'))
                    .find(b => b.textContent.includes('تقرير الفحص'));
                if (reportToggle && reportToggle.getAttribute('aria-expanded') !== 'true') {
                    reportToggle.click();
                }

                // قسم صور الفحص أحياناً يتأخر شوي بالتحميل عن باقي الصفحة - ننتظره بشكل مستقل
                await waitForFrame(frame, d => (
                    Array.from(d.querySelectorAll("h3")).some(h => h.textContent.includes("فحص")) ? d : null
                ), 8000);

                // نفضّل فحص التسليم وإلا فحص الاستلام (العقد اللي ما رجع للفرع ما فيه تسليم بعد)
                const section = findInspectionSection(doc2, "فحص التسليم") || findInspectionSection(doc2, "فحص الاستلام");
                if (section) {
                    deliveryImages = await collectAllInspectionImages(frame.contentWindow, doc2, section);
                } else {
                    console.warn("[إيميل حادث] ما لقيت قسم فحص الاستلام ولا التسليم بهذي الصفحة");
                }
            } catch (err) {
                console.error("[إيميل حادث] تعذّر جلب صور الفحص:", err);
            }

            try { frame.remove(); } catch (err) { /* تجاهل */ }
            hideAgreementStatus();

            let selectedImages = [];
            if (deliveryImages.length > 0) {
                const picked = await showPhotoPicker(deliveryImages);
                if (picked === null) return; // المستخدم ألغى العملية كاملة
                selectedImages = picked;
            }

            if (selectedImages.length > 0) {
                showAgreementStatus("جارٍ تحميل الصور المحددة...");
                await downloadImages(selectedImages);
                hideAgreementStatus();
            }

            // استمارة المركبة تحتاج رقم اللوحة إنجليزي؛ لو ما توفر نجرب لوحة جدول البحث كحل احتياطي
            showAgreementStatus("جارٍ تحميل استمارة المركبة...");
            const registrationResult = await downloadVehicleRegistration(plateFromDetail || plate);
            if (registrationResult && !registrationResult.ok) downloadIssues.push("الاستمارة: " + registrationResult.reason);
            hideAgreementStatus();

            const subj = `استلام حادث - ${agreementNo} - ${plate}`;

            const html = `<div style="text-align:right;font-weight:bold;font-family:Arial"><p>${subj}</p><p>تحية طيبة وبعد</p><p>تم استلام الحادث وفق تقرير من نجم.<br>أرفق لكم جميع المستندات اللازمة، ويرجى التكرم بإشعاري في حال الحاجة إلى أي مستندات إضافية.</p><table border="1" style="border-collapse:collapse;text-align:right;font-weight:bold;font-family:Arial"><tr style="background:#1f7a3b;color:white"><th colspan="2" style="padding:4px 8px">حادث سيارة</th></tr><tr><td style="padding:4px 8px">${agreementNo}</td><td style="padding:4px 8px">رقم الاتفاقية</td></tr><tr><td style="padding:4px 8px">${phone}</td><td style="padding:4px 8px">رقم جوال العميل</td></tr><tr><td style="padding:4px 8px">${plate}</td><td style="padding:4px 8px">رقم اللوحة</td></tr><tr><td style="padding:4px 8px">${insurance}</td><td style="padding:4px 8px">نوع التأمين</td></tr><tr><td style="padding:4px 8px">${f || ""}</td><td style="padding:4px 8px">نسبة الإدانة</td></tr><tr><td style="padding:4px 8px">${l || ""}</td><td style="padding:4px 8px">موقع الحادث</td></tr><tr><td style="padding:4px 8px">${acc || ""}</td><td style="padding:4px 8px">رقم الحادث</td></tr><tr style="background:#1f7a3b;color:white"><td colspan="2" style="padding:4px 8px">الملاحظات إن وجدت</td></tr></table></div>`;

            window.focus();
            await new Promise(r => setTimeout(r, 150));

            await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) })]);

            if (downloadIssues.length > 0) {
                showToast("تم نسخ ايميل الحادث بنجاح، لكن تعذّر تحميل: " + downloadIssues.join("، "), "error");
            } else {
                showToast("تم نسخ ايميل الحادث بنجاح", "success");
            }

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            hideAgreementStatus();
            showToast("تعذّر إنشاء إيميل الحادث: " + err.message, "error");
        }

    }

    // ==========================================================
    // إيميل فتح اتفاقية
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

    function findColumnIndex(headerCells, labelVariants) {
        const normalizedVariants = labelVariants.map(normalizeArabic);
        for (let i = 0; i < headerCells.length; i++) {
            const headerText = normalizeArabic(headerCells[i].textContent);
            if (normalizedVariants.some(v => headerText.indexOf(v) !== -1)) return i;
        }
        return -1;
    }

    /** يستنى حتى checkFn(doc) ترجع قيمة غير فارغة (أو تنتهي المهلة) */
    function waitFor(win, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 15000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (win.closed) {
                    reject(new Error("تم إغلاق النافذة قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = win.document;
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى النافذة"));
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

    function findBookingRow(doc, bookingNo) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return null;

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const idIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const rows = Array.from(table.querySelectorAll("tbody tr"));

        if (idIdx !== -1) {
            const match = rows.find(tr => {
                const cells = tr.querySelectorAll("td");
                return cells[idIdx] && cells[idIdx].textContent.trim() === bookingNo;
            });
            if (match) return match;
        }
        return rows[0] || null;
    }

    /** لا يوجد شكل إنجليزي للوحة بصفحة تفاصيل الحجز - نرجع لعمود "المركبة" بجدول البحث */
    function extractPlateFromRow(row) {
        const table = row.closest("table");
        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const vehicleIdx = findColumnIndex(headerCells, ["المركبة"]);
        if (vehicleIdx === -1) return "";
        const cell = row.querySelectorAll("td")[vehicleIdx];
        if (!cell) return "";
        const lines = cell.innerText.split("\n").map(t => t.trim()).filter(Boolean);
        return lines.length ? lines[lines.length - 1] : "";
    }

    /** أول صف بأول جدول فيه بيانات - يُستخدم لما البحث نفسه (برقم عقد) مفلتر مسبقاً وما نحتاج مطابقة عمود معيّن */
    function findFirstTableRow(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return null;
        return table.querySelector("tbody tr");
    }

    // ==========================================================
    // صور "تقرير الفحص" (فحص الاستلام / فحص التسليم)
    // ==========================================================

    /** يلقط حاوية قسم فحص معيّن ("فحص الاستلام" أو "فحص التسليم") من عنوانه (h3) */
    function findInspectionSection(doc, label) {
        const h3 = Array.from(doc.querySelectorAll("h3")).find(h => h.textContent.includes(label));
        if (!h3) return null;
        return h3.closest("div.w-full") || h3.parentElement;
    }

    /** هل فيه صور إضافية مخفية خلف شارة "+N" غير الصور الظاهرة مباشرة بالقسم؟ */
    function sectionHasMoreImages(section) {
        return Array.from(section.querySelectorAll("span")).some(s => /^\+\d+$/.test(s.textContent.trim()));
    }

    /** يلقط روابط الصور الظاهرة مباشرة بالقسم (الصورة الرئيسية + المصغّرات) بدون فتح أي معرض */
    function extractVisibleInspectionImages(section) {
        return Array.from(section.querySelectorAll('img[alt^="Inspection image"]'))
            .map(img => img.src)
            .filter(Boolean);
    }

    /** يجمع كل صور القسم: يرجع الظاهر مباشرة، أو يفتح المعرض ويتنقل بـ"التالي" (المصغّرات تُحمَّل تدريجياً) */
    async function collectAllInspectionImages(popup, doc, section) {
        const visibleImages = extractVisibleInspectionImages(section);
        if (!sectionHasMoreImages(section)) return visibleImages;

        const mainImg = section.querySelector('img[alt^="Inspection image"]');
        if (!mainImg) return visibleImages;

        try {
            mainImg.click();
        } catch (err) {
            return visibleImages;
        }

        const opened = await waitFor(popup, d => (d.querySelector(".yarl__thumbnails_track") ? d : null), 6000);
        if (!opened) return visibleImages;

        const collected = {};
        let total = null;

        function readCurrentThumbnails() {
            Array.from(doc.querySelectorAll(".yarl__thumbnails_track button")).forEach(btn => {
                const label = btn.getAttribute("aria-label") || "";
                const match = label.match(/^(\d+) of (\d+)$/);
                const img = btn.querySelector("img");
                if (match && img && img.src) {
                    collected[match[1]] = img.src;
                    total = parseInt(match[2], 10);
                }
            });
        }

        readCurrentThumbnails();

        let guard = 0;
        while ((!total || Object.keys(collected).length < total) && guard < 30) {
            guard++;
            const nextBtn = doc.querySelector('button[aria-label="Next"]');
            if (!nextBtn) break;
            try {
                nextBtn.click();
            } catch (err) {
                break;
            }
            await new Promise(r => setTimeout(r, 400));
            readCurrentThumbnails();
        }

        // نغلق المعرض قبل ما نكمل، وإلا نجرب Escape كحل احتياطي
        const closeBtn = doc.querySelector('button[title="Close"]') || doc.querySelector('button[aria-label="Close"]');
        try {
            if (closeBtn) closeBtn.click();
            else doc.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        } catch (err) { /* تجاهل */ }
        await new Promise(r => setTimeout(r, 300));

        if (Object.keys(collected).length === 0) return visibleImages;

        return Object.keys(collected)
            .map(k => parseInt(k, 10))
            .sort((a, b) => a - b)
            .map(k => collected[String(k)]);
    }

    /** يعرض شبكة صور فيها تحديد يدوي، ويرجع مصفوفة الروابط المختارة (أو [] لو تخطّى، أو null لو ألغى) */
    function showPhotoPicker(images) {
        return new Promise(resolve => {
            document.getElementById("email-photo-picker")?.remove();
            injectYqStyles();

            const selected = new Set();

            const box = document.createElement("div");
            box.id = "email-photo-picker";
            box.className = "yq-overlay";

            box.innerHTML = `
            <div class="yq-card" style="max-width:640px;padding:22px;display:flex;flex-direction:column;">
                <h3 style="margin-bottom:12px;">📷 اختر صور الفحص اللي تبغى تحمّلها</h3>
                <div id="photo-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow:auto;padding:4px;"></div>
                <div style="display:flex;gap:8px;margin-top:14px;">
                    <button id="photo-download" class="yq-btn yq-btn-primary" style="margin-top:0;flex:1;">تحميل ومتابعة</button>
                    <button id="photo-skip" class="yq-btn yq-btn-secondary" style="margin-top:0;flex:1;">تخطي بدون تحميل</button>
                    <button id="photo-cancel" class="yq-btn yq-btn-secondary" style="margin-top:0;flex:1;">إلغاء</button>
                </div>
            </div>`;

            document.body.appendChild(box);

            const grid = box.querySelector("#photo-grid");
            images.forEach(url => {
                const wrap = document.createElement("div");
                wrap.style.cssText = "position:relative;cursor:pointer;border-radius:8px;overflow:hidden;border:3px solid transparent;aspect-ratio:1;";
                wrap.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
                wrap.addEventListener("click", () => {
                    if (selected.has(url)) {
                        selected.delete(url);
                        wrap.style.borderColor = "transparent";
                    } else {
                        selected.add(url);
                        wrap.style.borderColor = "#16a34a";
                    }
                });
                grid.appendChild(wrap);
            });

            box.querySelector("#photo-download").onclick = () => {
                box.remove();
                resolve(Array.from(selected));
            };
            box.querySelector("#photo-skip").onclick = () => {
                box.remove();
                resolve([]);
            };
            box.querySelector("#photo-cancel").onclick = () => {
                box.remove();
                resolve(null);
            };
        });
    }

    /** تحميل صورة عبر GM_xmlhttpRequest بدل fetch لتفادي CORS (صور الفحص على نطاق cdn مختلف) */
    function downloadImage(url, filename) {
        return new Promise(resolve => {
            if (typeof GM_xmlhttpRequest === "undefined") {
                window.open(url, "_blank");
                resolve();
                return;
            }
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function (response) {
                    try {
                        const objUrl = URL.createObjectURL(response.response);
                        const a = document.createElement("a");
                        a.href = objUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(objUrl);
                    } catch (err) {
                        window.open(url, "_blank");
                    }
                    resolve();
                },
                onerror: function () {
                    window.open(url, "_blank");
                    resolve();
                },
            });
        });
    }

    async function downloadImages(urls) {
        for (let i = 0; i < urls.length; i++) {
            await downloadImage(urls[i], `صورة-فحص-${i + 1}.jpg`);
            await new Promise(r => setTimeout(r, 400)); // تجنّب تعليق المتصفح بتحميلات متتالية سريعة جداً
        }
    }

    /** بعض قوائم يقين (Radix UI) ما تنفتح بـ .click() لحاله - تحتاج أحداث pointer حقيقية قبلها، نفس اللي احتجناه بأداة الجرد */
    function dispatchFullClick(el, win) {
        try {
            el.dispatchEvent(new win.PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new win.PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    /** يضغط "..." ثم "تنزيل الاتفاقية"، ويترك نافذة الطباعة الحقيقية تفتح ليحفظها المستخدم PDF يدوياً (الخطوة اليدوية الوحيدة - بديل html2canvas اللي فشل بجودة الـPDF والعربي)
     * يرجع { ok, reason } */
    async function downloadAgreementFromRow(win, row) {
        // "أول button بالصف" يمسك زر غلط لو فيه أكثر من زر (صفوف فيها "إنهاء الاتفاقية" مثلاً)؛
        // نستهدف [aria-haspopup="menu"] مباشرة لأنه قد يكون على <div> غالف لا على <button> نفسه
        const menuTrigger = row.querySelector('[aria-haspopup="menu"]') || row.querySelector("button");
        if (!menuTrigger) return { ok: false, reason: 'ما لقيت زر "..." بصف الحجز' };
        dispatchFullClick(menuTrigger, win);

        // القائمة قد تاخذ وقت شوي تنفتح (أنيميشن) - نستنى ظهور الزر بدل تأخير ثابت واحد
        const doc = win.document;
        let downloadBtn = null;
        const menuStart = Date.now();
        while (!downloadBtn && Date.now() - menuStart < 3000) {
            // نختار آخر تطابق لا أول تطابق: بعض القوائم متداخلة (Radix DropdownMenuSub) وزر
            // <button> الخارجي نصّه يشمل نص العناصر بداخله، فأول تطابق يمسك الغلاف لا الزر الفعلي
            const matches = Array.from(doc.querySelectorAll('[role="menuitem"], button'))
                .filter(b => b.textContent.includes("تنزيل الاتفاقية"));
            downloadBtn = matches.length ? matches[matches.length - 1] : null;
            if (!downloadBtn) await new Promise(r => setTimeout(r, 200));
        }
        if (!downloadBtn) {
            return { ok: false, reason: 'ما لقيت زر "تنزيل الاتفاقية" بقائمة "..."' };
        }

        try {
            dispatchFullClick(downloadBtn, win);
        } catch (err) {
            return { ok: false, reason: "تعذّر الضغط على زر التنزيل: " + err.message };
        }

        return { ok: true };
    }

    function openHiddenFrame(url) {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;";
        document.body.appendChild(iframe);
        return iframe;
    }

    /** نسخة waitFor لكن على iframe بدل نافذة منبثقة */
    function waitForFrame(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 15000;
        return new Promise(resolve => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    resolve(null);
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    resolve(null);
                    return;
                }
                let result = null;
                try {
                    result = doc && checkFn(doc);
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

    /** يفتح صفحة مستندات المركبة ويضغط تحميل "استمارة المركبة"؛ iframe مخفي لأن window.open يُحظر بعيد عن ضغطة المستخدم الأصلية */
    /** يلقط صف مستند حسب عمود "نوع المستند" تحديداً (مو نص الصف كامل) لتفادي تعارض أنواع مستندات متعددة بنفس الصف */
    function findDocumentRowByType(doc, exactLabel, fallbackSubstring) {
        const tables = Array.from(doc.querySelectorAll("table"));
        for (const table of tables) {
            const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
            const typeIdx = findColumnIndex(headerCells, ["نوع المستند"]);
            if (typeIdx === -1) continue;
            const rows = Array.from(table.querySelectorAll("tbody tr"));
            const exact = rows.find(tr => {
                const cell = tr.querySelectorAll("td")[typeIdx];
                return cell && cell.textContent.trim() === exactLabel;
            });
            if (exact) return exact;
            const partial = rows.find(tr => {
                const cell = tr.querySelectorAll("td")[typeIdx];
                return cell && cell.textContent.trim().includes(fallbackSubstring);
            });
            if (partial) return partial;
        }
        return null;
    }

    /** يرجع { ok: true } أو { ok: false, reason: "..." } - نعرض السبب للمستخدم مباشرة بدل الاكتفاء بالـ Console */
    async function downloadVehicleRegistration(plate) {
        if (!plate) return { ok: false, reason: "ما توفر رقم لوحة صالح" };

        const frame = openHiddenFrame(`https://yaqeen.lumirental.com/rental/vehicles/${encodeURIComponent(plate)}/overview`);

        try {
            // مهلة أطول (25 ثانية): أول تحميل للصفحة بالجلسة أبطأ بكثير، ننتظر صف "استمارة المركبة" تحديداً
            const doc = await waitForFrame(frame, d => (findDocumentRowByType(d, "استمارة المركبة", "استمارة") ? d : null), 25000);
            if (!doc) {
                return { ok: false, reason: `ما تحمّلت صفحة مستندات المركبة أو ما لقينا صف "استمارة المركبة" (اللوحة: "${plate}")` };
            }

            const row = findDocumentRowByType(doc, "استمارة المركبة", "استمارة");
            if (!row) {
                return { ok: false, reason: "ما لقيت صف استمارة المركبة بجدول المستندات" };
            }

            const btn = row.querySelector("button");
            if (!btn) {
                return { ok: false, reason: "ما لقيت زر التحميل بصف الاستمارة" };
            }

            // نفس مشكلة زر "..." السابق: .click() لحاله ما يشغّل معالج الضغط بموثوقية بهذي الواجهة (Radix UI)
            dispatchFullClick(btn, frame.contentWindow);
            // ننتظر أطول من ثانيتين حتى يبدأ التحميل فعلياً قبل إزالة الـiframe
            await new Promise(r => setTimeout(r, 5000));
            return { ok: true };
        } catch (err) {
            return { ok: false, reason: "تعذّر تحميل استمارة المركبة: " + err.message };
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function showAgreementStatus(text) {
        document.getElementById("email-status-box")?.remove();
        injectYqStyles();
        const html = `
<div id="email-status-box" class="yq-overlay">
<div class="yq-card" style="max-width:300px;padding:30px;">
<div class="yq-spinner"></div>
<div style="font-size:14.5px;font-weight:700;">${text}</div>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }

    function hideAgreementStatus() {
        document.getElementById("email-status-box")?.remove();
    }

    /** نافذة تأكيد يدوي تنتظر ضغطة المستخدم بعد حفظ PDF؛ فيها زر إعادة محاولة لو فشل، وترجع آخر نتيجة فعلية */
    function showAgreementConfirm(initialResult, retryFn) {
        return new Promise(resolve => {
            let currentResult = initialResult;

            function render() {
                document.getElementById("email-status-box")?.remove();
                injectYqStyles();

                const ok = currentResult && currentResult.ok;
                const statusLine = ok
                    ? '<div style="color:#16a34a;font-weight:700;margin-bottom:10px;">✅ تم فتح نافذة طباعة الاتفاقية</div>'
                    : '<div style="color:#dc2626;font-weight:700;margin-bottom:10px;">⚠️ ' + (currentResult ? currentResult.reason : "تعذّر فتح نافذة الطباعة") + '</div>';

                const html = `
                <div id="email-status-box" class="yq-overlay">
                    <div class="yq-card" style="max-width:340px;">
                        <div class="yq-card-header">📄 تنزيل الاتفاقية</div>
                        <div class="yq-card-body">
                            ${statusLine}
                            <div class="yq-desc" style="text-align:center;">اختر "حفظ كـ PDF" من نافذة الطباعة واحفظ الملف، ثم اضغط "التالي" للمتابعة.</div>
                            <button id="agreement-next" class="yq-btn yq-btn-primary">التالي</button>
                            ${!ok ? '<button id="agreement-retry" class="yq-btn yq-btn-secondary">🔄 إعادة المحاولة</button>' : ''}
                            <button id="agreement-skip" class="yq-btn yq-btn-secondary">تخطي هذي الخطوة</button>
                        </div>
                    </div>
                </div>`;

                document.body.insertAdjacentHTML("beforeend", html);

                document.getElementById("agreement-next").onclick = () => {
                    document.getElementById("email-status-box")?.remove();
                    resolve(currentResult);
                };
                document.getElementById("agreement-skip").onclick = () => {
                    document.getElementById("email-status-box")?.remove();
                    resolve(currentResult);
                };
                const retryBtn = document.getElementById("agreement-retry");
                if (retryBtn) {
                    retryBtn.onclick = async () => {
                        retryBtn.textContent = "جارٍ إعادة المحاولة...";
                        retryBtn.disabled = true;
                        currentResult = await retryFn();
                        render();
                    };
                }
            }

            render();
        });
    }

    /** نافذة مخصصة (بنفس تصميم باقي الأدوات) تجمع كل الإدخالات مرة وحدة قبل البدء، بدل عدة prompt() متتالية */
    function showOpenAgreementForm() {
        return new Promise(resolve => {
            document.getElementById("email-box")?.remove();
            injectYqStyles();

            const box = document.createElement("div");
            box.id = "email-box";
            box.className = "yq-overlay";

            box.innerHTML = `
            <div class="yq-card" style="max-width:340px;">
                <div class="yq-card-header">📄 فتح اتفاقية</div>
                <div class="yq-card-body">
                    <div class="yq-field-wrap">
                        <label>رقم الحجز</label>
                        <input id="open-booking" type="text" class="yq-field" />
                    </div>
                    <div class="yq-field-wrap">
                        <label>رقم عقد التأجير</label>
                        <input id="open-contract" type="text" class="yq-field" />
                    </div>
                    <div class="yq-field-wrap">
                        <label>الملاحظات</label>
                        <textarea id="open-notes" rows="3" class="yq-field"></textarea>
                    </div>
                    <button id="open-submit" class="yq-btn yq-btn-primary">التالي</button>
                    <button id="open-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>
                </div>
            </div>`;

            document.body.appendChild(box);

            const bookingInput = document.getElementById("open-booking");
            bookingInput.focus();

            function submit() {
                const bookingNo = bookingInput.value.trim();
                if (!bookingNo) {
                    bookingInput.classList.add("yq-field-err");
                    return;
                }
                const result = {
                    bookingNo,
                    contractNo: document.getElementById("open-contract").value.trim(),
                    notes: document.getElementById("open-notes").value.trim(),
                };
                box.remove();
                resolve(result);
            }

            document.getElementById("open-submit").onclick = submit;
            document.getElementById("open-cancel").onclick = () => {
                box.remove();
                resolve(null);
            };
            box.addEventListener("keydown", e => {
                if (e.key === "Enter" && e.target.tagName === "INPUT") submit();
            });
        });
    }

    async function openAgreementEmail() {

        const formData = await showOpenAgreementForm();
        if (!formData) return;
        const { bookingNo, contractNo, notes } = formData;

        showAgreementStatus("جارٍ البحث عن الحجز...");

        // iframe مخفي (نفس أسلوب إيميل الحادث) أثناء البحث وجلب البيانات
        const frame = openHiddenFrame(
            `https://yaqeen.lumirental.com/rental/branches/29/bookings?bookingNo=${encodeURIComponent(bookingNo)}`
        );

        try {

            const doc1 = await waitForFrame(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
            if (!doc1) throw new Error("لم يتم العثور على الحجز");

            const row = findBookingRow(doc1, bookingNo);
            if (!row) throw new Error("لم يتم العثور على صف الحجز برقم " + bookingNo);

            const plate = extractPlateFromRow(row);

            showAgreementStatus("جارٍ فتح تفاصيل الحجز...");

            // ندخل تفاصيل الحجز بنفس الإطار (نفضّل رابط برقم الحجز إن وُجد، وإلا نضغط الصف نفسه)
            const link = Array.from(row.querySelectorAll("a")).find(a => a.textContent.includes(bookingNo))
                || row.querySelector("a")
                || row;
            link.click();

            await waitForFrame(frame, d => (
                d.body.innerText.includes("تفاصيل الحجز") ||
                d.querySelector('[data-testid="insurance-value"]') ||
                d.querySelector('[data-testid="insurance-amount-value"]')
            ) ? d : null, 15000);

            const doc2 = frame.contentDocument || frame.contentWindow.document;

            const v1 = parseFloat((doc2.querySelector('[data-testid="insurance-value"]')?.innerText || "0").replace(/[^\d.]/g, ''));
            const v2 = parseFloat((doc2.querySelector('[data-testid="insurance-amount-value"]')?.innerText || "0").replace(/[^\d.]/g, ''));
            const insurance = (v1 > 0 || v2 > 0) ? "شامل" : "عادي";

            const durationMatch = doc2.body.innerText.match(/\d+\s*أيام\s*:\s*\d+\s*ساعات/);
            const duration = durationMatch ? durationMatch[0] : "";

            showAgreementStatus("جارٍ جلب بيانات العميل...");

            // نفس زر توسيع بيانات العميل المستخدم بإيميل الحادث
            const expandBtn = Array.from(doc2.querySelectorAll('button.inline-flex'))
                .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
            if (expandBtn) expandBtn.click();

            await new Promise(r => setTimeout(r, 1200));

            // لوحة "معلومات السائق": نلقط <p> تسمية "رقم الهوية" ونرجع أخوها التالي كقيمة
            const idLabel = Array.from(doc2.querySelectorAll("p"))
                .find(p => p.textContent.trim().startsWith("رقم الهوية"));
            const idNumber = idLabel?.nextElementSibling?.textContent.trim() || "";

            try { frame.remove(); } catch (err) { /* تجاهل */ }
            hideAgreementStatus();

            // نجبر التركيز رجوع يدوياً: إزالة الـiframe تسحب focus وclipboard.write يرفض العمل بدونه
            window.focus();
            await new Promise(r => setTimeout(r, 150));

            const now = new Date();
            const exitDate = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
            const exitTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

            const subj = `فتح اتفاقية - ${bookingNo}`;

            const html = `<div style="text-align:right;font-weight:bold;font-family:Arial"><p>${subj}</p><p>تحية طيبة وبعد</p><p>الرجاء فتح الاتفاقية التالية يدوياً:</p><table border="1" style="border-collapse:collapse;text-align:right;font-weight:bold;font-family:Arial"><tr style="background:#1f7a3b;color:white"><th colspan="2" style="padding:4px 8px">فتح اتفاقية</th></tr><tr><td style="padding:4px 8px">${bookingNo}</td><td style="padding:4px 8px">رقم الحجز</td></tr><tr><td style="padding:4px 8px">${idNumber}</td><td style="padding:4px 8px">رقم الهوية</td></tr><tr><td style="padding:4px 8px">${plate}</td><td style="padding:4px 8px">رقم اللوحة</td></tr><tr><td style="padding:4px 8px">${contractNo}</td><td style="padding:4px 8px">عقد تأجير</td></tr><tr><td style="padding:4px 8px">${insurance}</td><td style="padding:4px 8px">التأمين</td></tr><tr><td style="padding:4px 8px">${exitDate}</td><td style="padding:4px 8px">تاريخ الخروج</td></tr><tr><td style="padding:4px 8px">${exitTime}</td><td style="padding:4px 8px">وقت الخروج</td></tr><tr><td style="padding:4px 8px">${duration}</td><td style="padding:4px 8px">مدة العقد</td></tr><tr style="background:#1f7a3b;color:white"><td colspan="2" style="padding:4px 8px">يرجى ذكر سبب عدم فتح الاتفاقية</td></tr><tr><td colspan="2" style="padding:4px 8px">${notes || "&nbsp;"}</td></tr></table></div>`;

            await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }) })]);

            showEmailMessage("تم نسخ إيميل فتح الاتفاقية بنجاح");

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            hideAgreementStatus();
            showEmailMessage("تعذّر إنشاء إيميل فتح الاتفاقية: " + err.message, true);
        }

    }

    waitCore();

})();
