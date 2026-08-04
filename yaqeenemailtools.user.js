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
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-email-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-email-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح صلاحية GM_xmlhttpRequest يشغّل
    // السكربت بوضع sandbox معزول، و window.YAQEEN_TOOLS المسجّلة من صفحة
    // يقين نفسها ما تكون مرئية إلا عبر unsafeWindow بهذا الوضع
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
    // قائمة اختيار نوع الإيميل
    // ==========================================================

    function chooseEmailType() {

        document.getElementById("email-box")?.remove();

        const box = document.createElement("div");
        box.id = "email-box";

        box.style = `
        position:fixed;
        inset:0;
        background:#0008;
        z-index:999999999;
        display:flex;
        align-items:center;
        justify-content:center;
        font-family:Arial;
        `;

        box.innerHTML = `
        <div style="
        background:white;
        padding:25px;
        border-radius:15px;
        width:300px;
        text-align:center;
        direction:rtl;
        ">
        <h3 style="margin-top:0">📧 إيميل</h3>

        <button id="close-agreement">🔒 إغلاق عقد</button>
        <button id="accident">🚗 حادث</button>
        <button id="open-agreement">📄 فتح اتفاقية</button>

        <button id="cancel" style="
                    margin-top:10px;
                    background:#eee;
                    color:#333;
                ">إلغاء</button>
        </div>
        `;

        document.body.appendChild(box);

        box.querySelectorAll("button").forEach(btn => {
            btn.style.cssText += `
            width:100%;
            padding:12px;
            margin-top:8px;
            border:0;
            border-radius:8px;
            cursor:pointer;
            background:#A3E635;
            font-size:15px;
            `;
        });

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

            const box = document.createElement("div");
            box.id = "email-box";
            box.style.cssText = `
                position:fixed;inset:0;background:#0008;z-index:999999999;
                display:flex;align-items:center;justify-content:center;font-family:Arial;
            `;

            box.innerHTML = `
            <div style="background:white;border-radius:15px;width:360px;overflow:hidden;direction:rtl;">
                <div style="background:#A3E635;padding:18px;text-align:center;">
                    <div style="font-size:16px;font-weight:bold;">🔒 إغلاق عقد</div>
                </div>
                <div style="padding:20px;">
                    <div style="text-align:right;margin-bottom:14px;">
                        <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">سبب إغلاق العقد</label>
                        <textarea id="close-reason" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:14px;resize:vertical;"></textarea>
                    </div>
                    <button id="close-submit" style="width:100%;padding:12px;border:0;border-radius:8px;cursor:pointer;background:#A3E635;font-size:15px;">نسخ الإيميل</button>
                    <button id="close-cancel" style="width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;cursor:pointer;background:#eee;color:#333;font-size:15px;">إلغاء</button>
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

    /** رسالة نجاح/خطأ مخصصة (بنفس تصميم باقي الأدوات) بدل alert() المتصفح */
    function showEmailMessage(text, isError) {
        document.getElementById("email-message-box")?.remove();
        const headerColor = isError ? "#dc2626" : "#A3E635";
        const headerText = isError ? "#fff" : "#1a1a1a";
        const html = `
        <div id="email-message-box" style="position:fixed;inset:0;background:#0008;display:flex;align-items:center;justify-content:center;z-index:999999999;font-family:Arial;">
            <div style="width:320px;background:white;border-radius:16px;overflow:hidden;text-align:center;direction:rtl;">
                <div style="background:${headerColor};color:${headerText};padding:18px;font-size:16px;font-weight:bold;">
                    ${isError ? "⚠️ تنبيه" : "✅ تم بنجاح"}
                </div>
                <div style="padding:20px;">
                    <div style="margin-bottom:16px;white-space:pre-line;">${text}</div>
                    <button id="email-message-close" style="width:100%;padding:12px;border:0;border-radius:8px;cursor:pointer;background:#A3E635;font-size:15px;">إغلاق</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        document.getElementById("email-message-close").onclick = () => {
            document.getElementById("email-message-box")?.remove();
        };
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
    // يبحث برقم عقد التأجير، يدخل تفاصيل الحجز تلقائياً، يعرض صور "فحص
    // التسليم" حتى يختار المستخدم منها، يحمّل المختار، ثم يبني الإيميل.
    // ==========================================================

    /** يجمع كل الإدخالات اليدوية (رقم العقد + بيانات الحادث) بنافذة وحدة قبل ما نبدأ، بدل ما نقاطع المستخدم بـprompt عدة مرات وسط التدفق */
    function showAccidentInputForm() {
        return new Promise(resolve => {
            document.getElementById("email-box")?.remove();

            const box = document.createElement("div");
            box.id = "email-box";
            box.style.cssText = `
                position:fixed;inset:0;background:#0008;z-index:999999999;
                display:flex;align-items:center;justify-content:center;font-family:Arial;
            `;

            box.innerHTML = `
            <div style="background:white;padding:25px;border-radius:15px;width:340px;text-align:center;direction:rtl;">
                <h3 style="margin-top:0">🚗 بيانات الحادث</h3>
                <div style="text-align:right;margin-bottom:10px;">
                    <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">رقم عقد التأجير</label>
                    <input id="acc-agreement" type="text" placeholder="A1780008085" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
                </div>
                <div style="text-align:right;margin-bottom:10px;">
                    <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">نسبة الإدانة</label>
                    <input id="acc-guilt" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
                </div>
                <div style="text-align:right;margin-bottom:10px;">
                    <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">موقع الحادث</label>
                    <input id="acc-location" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
                </div>
                <div style="text-align:right;margin-bottom:14px;">
                    <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">رقم الحادث</label>
                    <input id="acc-number" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
                </div>
                <button id="acc-submit" style="width:100%;padding:12px;border:0;border-radius:8px;cursor:pointer;background:#A3E635;font-size:15px;">متابعة</button>
                <button id="acc-cancel" style="width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;cursor:pointer;background:#eee;color:#333;font-size:15px;">إلغاء</button>
            </div>`;

            document.body.appendChild(box);

            const agreementInput = document.getElementById("acc-agreement");
            agreementInput.focus();

            function submit() {
                const agreementNo = agreementInput.value.trim();
                if (!agreementNo) {
                    agreementInput.style.border = "1px solid #dc2626";
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

        // iframe مخفي بدل نافذة منبثقة لكل خطوات البحث والتصفّح - ما يظهر أي
        // شيء فوق صفحتك. الاستثناء الوحيد نافذة طباعة الاتفاقية نفسها، اللي
        // يفتحها يقين بكوده الخاص (مو إحنا) كنافذة منفصلة حقيقية بغض النظر
        // عن كون الزر اللي ضغطناه جوا iframe مخفي أو لا
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

            // ما نكمل للخطوة التالية إلا بعد تأكيد صريح من المستخدم إنه حفظ
            // الاتفاقية فعلاً - قبل كذا كانت العملية تكمل تلقائياً بالخلفية
            // فوراً بدون أي انتظار حقيقي. وفيه زر "إعادة المحاولة" يعيد الضغط
            // على "..." ثم "تنزيل الاتفاقية" من جديد لو فشلت أول مرة (مثلاً
            // القائمة تأخرت تفتح)، بدل ما نضطر نلغي العملية كاملة ونبدأ من الصفر
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
                // "تقرير الفحص" أكورديون مطوي افتراضياً - محتواه (صور فحص الاستلام/التسليم)
                // ما يترسم بالـ DOM أصلاً إلا بعد ما نفتحه
                const reportToggle = Array.from(doc2.querySelectorAll('button'))
                    .find(b => b.textContent.includes('تقرير الفحص'));
                if (reportToggle && reportToggle.getAttribute('aria-expanded') !== 'true') {
                    reportToggle.click();
                }

                // قسم صور الفحص أحياناً يتأخر شوي بالتحميل عن باقي الصفحة - ننتظره بشكل مستقل
                await waitForFrame(frame, d => (
                    Array.from(d.querySelectorAll("h3")).some(h => h.textContent.includes("فحص")) ? d : null
                ), 8000);

                // نفضّل "فحص التسليم" (صور الإرجاع) وإلا نكتفي بـ"فحص الاستلام" (صور الاستلام
                // بداية العقد) - العقد اللي لسا ما رجع للفرع ما يكون فيه "فحص تسليم" أصلاً
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

            // استمارة المركبة: تحتاج رقم اللوحة بالشكل الإنجليزي (زي رابط
            // /rental/vehicles/7015%20HDS/overview) - لو ما توفر نجرب اللي سحبناه
            // من جدول البحث كحل احتياطي، حتى لو صيغته عربي وممكن يفشل بصمت
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
                alert("تم نسخ ايميل الحادث بنجاح\n\n⚠️ تعذّر تحميل:\n" + downloadIssues.join("\n"));
            } else {
                alert("تم نسخ ايميل الحادث بنجاح");
            }

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            hideAgreementStatus();
            alert("تعذّر إنشاء إيميل الحادث: " + err.message);
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

    /**
     * يجمع كل صور القسم: لو ما فيه صور مخفية (بدون شارة "+N") يرجع الصور الظاهرة
     * مباشرة، وإلا يفتح معرض الصور (Lightbox) بالضغط على الصورة الرئيسية،
     * ويتنقل بزر "التالي" لأن شريط المصغّرات هناك مبني بشكل تدريجي (Virtualized) -
     * ما تظهر كل الصور بالـ DOM إلا بعد ما نتصفّح بجانبها فعلياً - ثم يغلق المعرض.
     */
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

            const selected = new Set();

            const box = document.createElement("div");
            box.id = "email-photo-picker";
            box.style.cssText = `
                position:fixed;inset:0;background:#0008;z-index:999999999;
                display:flex;align-items:center;justify-content:center;font-family:Arial;
            `;

            box.innerHTML = `
            <div style="background:white;padding:20px;border-radius:15px;width:min(640px,92vw);max-height:85vh;
            display:flex;flex-direction:column;direction:rtl;">
                <h3 style="margin:0 0 12px">📷 اختر صور الفحص اللي تبغى تحمّلها</h3>
                <div id="photo-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;overflow:auto;padding:4px;"></div>
                <div style="display:flex;gap:8px;margin-top:14px;">
                    <button id="photo-download" style="flex:1;padding:10px;border:0;border-radius:8px;background:#A3E635;cursor:pointer;">تحميل ومتابعة</button>
                    <button id="photo-skip" style="flex:1;padding:10px;border:0;border-radius:8px;background:#eee;color:#333;cursor:pointer;">تخطي بدون تحميل</button>
                    <button id="photo-cancel" style="flex:1;padding:10px;border:0;border-radius:8px;background:#eee;color:#333;cursor:pointer;">إلغاء</button>
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

    /**
     * يحمّل صورة واحدة كملف عبر GM_xmlhttpRequest بدل fetch العادي - صور
     * الفحص مستضافة على cdn.lumirental.com (نطاق مختلف عن يقين نفسها)،
     * و fetch العادي يترفض بصمت بسبب CORS فيرجع يفتحها بتبويب جديد بدل ما
     * ينزّلها. GM_xmlhttpRequest صلاحية من Tampermonkey نفسه فما يخضع لقيود
     * CORS إطلاقاً.
     */
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

    /**
     * يضغط زر "..." بصف الحجز، ثم "تنزيل الاتفاقية" من القائمة. زر يقين هذا
     * يفتح نافذة طباعة حقيقية فيها الاتفاقية - نتركها تفتح طبيعي (بدون أي
     * اعتراض أو تصوير) عشان تختار "حفظ كـ PDF" بنفسك من قائمة الطابعات؛
     * هذي الخطوة الوحيدة اليدوية بكل التدفق، وتنتج PDF حقيقي بمقاس A4 صحيح
     * ونص عربي سليم، بعكس محاولات التصوير (html2canvas) اللي جربناها قبل.
     * يرجع { ok: true } أو { ok: false, reason: "..." } - نعرض السبب للمستخدم مباشرة بدل الاكتفاء بالـ Console.
     */
    async function downloadAgreementFromRow(win, row) {
        // بعض صفوف الحجوزات فيها أكثر من زر (زي "إنهاء الاتفاقية" جنب زر
        // "...")، فأخذ "أول button بالصف" كان يمسك زر غير زر القائمة أصلاً -
        // يفتح القائمة الغلط (أو ما يفتح شي) فما تظهر "تنزيل الاتفاقية"
        // بعدها. المشغّل الحقيقي (aria-haspopup="menu") أحياناً يكون على
        // <div> غالف (Radix asChild) وليس على <button> نفسه (الزر بداخله مجرد
        // أيقونة زخرفية) - فنستهدف أي عنصر عنده هذا الـattribute بغض النظر عن
        // نوع الوسم، ونرجع لأول زر بالصف كحل احتياطي أخير لو ما لقينا شي
        const menuTrigger = row.querySelector('[aria-haspopup="menu"]') || row.querySelector("button");
        if (!menuTrigger) return { ok: false, reason: 'ما لقيت زر "..." بصف الحجز' };
        dispatchFullClick(menuTrigger, win);

        // القائمة قد تاخذ وقت شوي تنفتح (أنيميشن) - نستنى ظهور الزر بدل تأخير ثابت واحد
        const doc = win.document;
        let downloadBtn = null;
        const menuStart = Date.now();
        while (!downloadBtn && Date.now() - menuStart < 3000) {
            // بعض العقود عندها عناصر تجميع/طي إضافية بالقائمة (زي "تحصيل الدفع"
            // اللي يُغلَّف بزرّين متداخلين لأنه Radix DropdownMenuSub) - عنصر
            // <button> الخارجي بهذي الحالات نصّه (textContent) يشمل نص أي عنصر
            // متداخل بداخله، فلو اخترنا أول تطابق بترتيب DOM ممكن نمسك الزر
            // الخارجي (اللي يفتح/يطوي قائمة فرعية بدل ما ينزّل شي) بدل الزر
            // الفعلي. ترتيب DOM دايماً يحط أي عنصر أب قبل أبنائه، فنختار آخر
            // تطابق (الأعمق/الأكثر تحديداً) بدل أول تطابق لضمان إنه هو نفسه
            // الزر الحقيقي وليس أي غلاف حوله
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

    /**
     * يفتح صفحة مستندات المركبة (برقم اللوحة) ويضغط زر عرض "استمارة المركبة" -
     * الضغط عليه يبدأ تحميل الملف تلقائياً على الجهاز مباشرة (بدون معاينة أو
     * تبويب وسيط). نستخدم iframe مخفي بدل نافذة منبثقة لأن هذي الخطوة تصير
     * بعد سلسلة طويلة من await بعيد عن ضغطة المستخدم الأصلية، والمتصفح يحظر
     * window.open() اللي ما تُستدعى مباشرة ضمن حدث ضغطة حقيقي.
     */
    /**
     * يلقط صف مستند معيّن من جدول "مستندات" حسب عمود "نوع المستند" تحديداً
     * (مو نص الصف كامل) - مهم بالذات إن هذا الجدول أحياناً يحتوي أكثر من نوع
     * مستند بنفس الوقت (مثلاً "استمارة المركبة" و"شهادة التأمين" معاً)،
     * فمطابقة نص الصف كامل بدل عمود التصنيف بالذات ممكن تلخبط بينهم لو أي
     * عمود ثاني بالصف فيه نص مشابه بالصدفة. نحاول مطابقة تامة أول شي، وإلا
     * نرجع لمطابقة جزئية كحل احتياطي لو تغيّرت الصياغة قليلاً.
     */
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
            // مهلة أطول من المعتاد: أول تحميل لهذي الصفحة بالجلسة أبطأ بكثير من
            // المحاولات اللي بعدها (تحميل حزمة JS باردة)، و15 ثانية ما كانت كافية.
            // ننتظر تحديداً صف "استمارة المركبة" (مو أي جدول عام بالصفحة) حتى
            // نضمن إن جدول "مستندات" فعلاً انحمّل قبل ما نحاول نقرأ منه
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

            // نفس مشكلة زر "..." بقائمة الاتفاقية - .click() لحاله ما يشغّل معالج
            // الضغط بشكل موثوق دائماً بهذي الواجهة (Radix UI)، يحتاج أحداث
            // pointer حقيقية قبله. هذا سبب فشل التحميل بصمت أول مرة وينجح بإعادة المحاولة
            dispatchFullClick(btn, frame.contentWindow);
            // نستنى وقت أطول حتى يبدأ التحميل فعلياً قبل ما نشيل الـiframe - الضغط
            // يشغّل طلب شبكة لجلب الملف قبل التحميل، وممكن ياخذ وقت أطول من ثانيتين
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
        const html = `
<div id="email-status-box" style="
position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;
z-index:999999999;font-family:Arial;">
<div style="width:300px;background:white;border-radius:16px;padding:30px;text-align:center;direction:rtl;">
${text}
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }

    function hideAgreementStatus() {
        document.getElementById("email-status-box")?.remove();
    }

    /**
     * نافذة تأكيد يدوي تتوقف عندها العملية فعلياً (Promise ما يُحلّ إلا بضغطة
     * المستخدم) - تعرض هل نجحنا بفتح نافذة الطباعة أصلاً، وتطلب من المستخدم
     * يحفظ الاتفاقية كـPDF ويضغط "التالي" قبل ما نكمل لباقي الخطوات (الصور
     * والاستمارة). لو فشلت المحاولة (ما لقينا زر "..." أو "تنزيل الاتفاقية")
     * يظهر زر "🔄 إعادة المحاولة" يعيد استدعاء retryFn (نفس منطق الضغط من
     * جديد) بدون قفل النافذة أو إلغاء العملية كاملة. يرجع الـPromise بآخر
     * نتيجة فعلية (بعد أي إعادة محاولة) حتى تنعكس صح على رسالة الأخطاء
     * النهائية بآخر الإيميل.
     */
    function showAgreementConfirm(initialResult, retryFn) {
        return new Promise(resolve => {
            let currentResult = initialResult;

            function render() {
                document.getElementById("email-status-box")?.remove();

                const ok = currentResult && currentResult.ok;
                const statusLine = ok
                    ? '<div style="color:#16a34a;margin-bottom:10px;">✅ تم فتح نافذة طباعة الاتفاقية</div>'
                    : '<div style="color:#dc2626;margin-bottom:10px;">⚠️ ' + (currentResult ? currentResult.reason : "تعذّر فتح نافذة الطباعة") + '</div>';

                const html = `
                <div id="email-status-box" style="position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;z-index:999999999;font-family:Arial;">
                    <div style="width:340px;background:white;border-radius:16px;overflow:hidden;text-align:center;direction:rtl;">
                        <div style="background:#A3E635;padding:18px;">
                            <div style="font-size:16px;font-weight:bold;">📄 تنزيل الاتفاقية</div>
                        </div>
                        <div style="padding:20px;">
                            ${statusLine}
                            <div style="margin-bottom:16px;">اختر "حفظ كـ PDF" من نافذة الطباعة واحفظ الملف، ثم اضغط "التالي" للمتابعة.</div>
                            <button id="agreement-next" style="width:100%;padding:12px;border:0;border-radius:8px;cursor:pointer;background:#A3E635;font-size:15px;">التالي</button>
                            ${!ok ? '<button id="agreement-retry" style="width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;cursor:pointer;background:#eee;color:#333;font-size:15px;">🔄 إعادة المحاولة</button>' : ''}
                            <button id="agreement-skip" style="width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;cursor:pointer;background:#eee;color:#333;font-size:15px;">تخطي هذي الخطوة</button>
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

            const box = document.createElement("div");
            box.id = "email-box";
            box.style.cssText = `
                position:fixed;inset:0;background:#0008;z-index:999999999;
                display:flex;align-items:center;justify-content:center;font-family:Arial;
            `;

            box.innerHTML = `
            <div style="background:white;border-radius:15px;width:340px;overflow:hidden;direction:rtl;">
                <div style="background:#A3E635;padding:18px;text-align:center;">
                    <div style="font-size:16px;font-weight:bold;">📄 فتح اتفاقية</div>
                </div>
                <div style="padding:20px;">
                    <div style="text-align:right;margin-bottom:10px;">
                        <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">رقم الحجز</label>
                        <input id="open-booking" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
                    </div>
                    <div style="text-align:right;margin-bottom:10px;">
                        <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">رقم عقد التأجير</label>
                        <input id="open-contract" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;" />
                    </div>
                    <div style="text-align:right;margin-bottom:14px;">
                        <label style="font-size:13px;color:#555;display:block;margin-bottom:4px;">الملاحظات</label>
                        <textarea id="open-notes" rows="3" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;box-sizing:border-box;font-family:inherit;font-size:14px;resize:vertical;"></textarea>
                    </div>
                    <button id="open-submit" style="width:100%;padding:12px;border:0;border-radius:8px;cursor:pointer;background:#A3E635;font-size:15px;">التالي</button>
                    <button id="open-cancel" style="width:100%;padding:12px;margin-top:8px;border:0;border-radius:8px;cursor:pointer;background:#eee;color:#333;font-size:15px;">إلغاء</button>
                </div>
            </div>`;

            document.body.appendChild(box);

            const bookingInput = document.getElementById("open-booking");
            bookingInput.focus();

            function submit() {
                const bookingNo = bookingInput.value.trim();
                if (!bookingNo) {
                    bookingInput.style.border = "1px solid #dc2626";
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

        // iframe مخفي بدل نافذة منبثقة - نفس أسلوب إيميل الحادث، ما يظهر أي
        // شيء فوق صفحتك أثناء البحث وجلب البيانات
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

            // لوحة "معلومات السائق": كل حقل عبارة عن <p class="text-sm">التسمية</p> يتبعه
            // <p>القيمة</p> بنفس الحاوية - نلقط التسمية "رقم الهوية" ونرجع أخوها التالي
            const idLabel = Array.from(doc2.querySelectorAll("p"))
                .find(p => p.textContent.trim().startsWith("رقم الهوية"));
            const idNumber = idLabel?.nextElementSibling?.textContent.trim() || "";

            try { frame.remove(); } catch (err) { /* تجاهل */ }
            hideAgreementStatus();

            // إزالة الـiframe أحياناً تسحب التركيز (focus) عن صفحتنا، و
            // navigator.clipboard.write يرفض العمل لو المستند غير مركّز -
            // نجبر التركيز رجوع يدوياً احتياطاً (نفس أسلوب إيميل الحادث)
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
