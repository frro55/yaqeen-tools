// ==UserScript==
// @name         Yaqeen Tool - تحقق من الدفع
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يقرأ إيصال دفع Geidea من رابط تلصقه، يعبّي رمز الموافقة وآخر 4 أرقام من البطاقة تلقائياً بنموذج الدفع بيقين، وينبهك لو المبلغ مختلف عن المسجّل
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      mpos.geidea.net
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
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
            id: "payment-verify",
            name: "💳 تحقق من الدفع",
            run() {
                runPaymentVerify();
            }
        });
    }

    // ==========================================================
    // نافذة "تحصيل الدفع" (Radix Dialog) تعتبر أي ضغطة بره محتواها "ضغطة
    // خارجية" وتسكّر نفسها بسببها - حتى لو الضغطة على نافذتنا احنا. Radix
    // يلتقط هذي الضغطات عبر مستمع على document بمرحلة الـcapture، وما نقدر
    // نسبقه بمستمع على عناصرنا (اللي هي فروع من document أصلاً). الحل نسجّل
    // مستمعنا على window نفسها بمرحلة الـcapture (تُزار قبل document بترتيب
    // الـcapture) ونوقف الحدث هناك - بس هذا معناه الحدث ما يوصل أصلاً لعناصر
    // نافذتنا (زر الإغلاق مثلاً) فـ.onclick العادي عليها ما يشتغل. الحل: ننفّذ
    // إجراء الزر مباشرة من جوا نفس مستمع الـcapture هذا، بدل ما نعتمد على وصول
    // الحدث لمرحلة الـbubble الطبيعية على الزر
    // ==========================================================
    var overlayActionHandlers = {};

    function registerOverlayAction(name, handler) {
        overlayActionHandlers[name] = handler;
    }

    function handleOverlayCapture(e) {
        if (!(e.target && e.target.closest && e.target.closest("#payment-verify-box"))) return;
        e.stopPropagation();
        if (e.type !== "click") return;
        var actionEl = e.target.closest("[data-overlay-action]");
        if (!actionEl) return;
        var handler = overlayActionHandlers[actionEl.getAttribute("data-overlay-action")];
        if (handler) handler();
    }
    window.addEventListener("pointerdown", handleOverlayCapture, true);
    window.addEventListener("mousedown", handleOverlayCapture, true);
    window.addEventListener("click", handleOverlayCapture, true);

    // ==========================================================
    // جلب صفحة الإيصال (نطاق مختلف - mpos.geidea.net) عبر GM_xmlhttpRequest
    // لأن fetch العادي يترفض بسبب CORS، وGM_xmlhttpRequest صلاحية من
    // Tampermonkey نفسه فما يخضع لهذا القيد
    // ==========================================================

    function fetchReceiptHtml(url) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function (response) {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        reject(new Error("فشل جلب الإيصال برمز حالة " + response.status));
                    }
                },
                onerror: function () {
                    reject(new Error("تعذّر الاتصال بخادم Geidea"));
                },
            });
        });
    }

    /** يستخرج رمز الموافقة، آخر 4 أرقام من البطاقة، ومبلغ الشراء من HTML الإيصال */
    function extractReceiptData(doc) {
        // رمز الموافقة: صف فيه خلية أولى نصها بالضبط "APPROVAL CODE"، والقيمة
        // بأول خلية بالصف اللي بعده مباشرة (نفس ترتيب جدول الإيصال)
        const rows = Array.from(doc.querySelectorAll("tr"));
        let approvalCode = "";
        for (let i = 0; i < rows.length; i++) {
            const cells = rows[i].querySelectorAll("td");
            if (cells[0] && cells[0].textContent.trim() === "APPROVAL CODE") {
                const nextCells = rows[i + 1] ? rows[i + 1].querySelectorAll("td") : [];
                if (nextCells[0]) approvalCode = nextCells[0].textContent.trim();
                break;
            }
        }

        // آخر 4 أرقام من رقم البطاقة المقنّع (مثال: 506968******0175)
        const cardMatch = doc.body.textContent.match(/\d{4,6}\*{4,}(\d{4})/);
        const last4 = cardMatch ? cardMatch[1] : "";

        // مبلغ الشراء: العنصر بالنسخة الإنجليزية (أرقام لاتينية) - أسهل بالتحويل لرقم
        const amountEl = doc.querySelector(".currency-amount");
        const amountMatch = amountEl ? amountEl.textContent.match(/[\d.]+/) : null;
        const amount = amountMatch ? parseFloat(amountMatch[0]) : NaN;

        return { approvalCode, last4, amount };
    }

    // ==========================================================
    // تعبئة حقول React المتحكَّم بها - .value العادي ما يكفي لأن React يتجاوز
    // الـ setter الأصلي لتتبّع التغييرات، فنستخدم الـ setter الأصلي مباشرة
    // ثم نطلق حدث input يدوياً حتى React يلتقط القيمة الجديدة
    // ==========================================================

    function setReactInputValue(input, value) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        nativeSetter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
    }

    /** بعض أزرار يقين (Radix/shadcn) ما تستجيب لـ.click() لحاله دائماً - تحتاج أحداث pointer حقيقية قبله */
    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findButtonByText(text) {
        return Array.from(document.querySelectorAll("button")).find(b => b.textContent.trim().includes(text));
    }

    /**
     * حقلا "رمز الموافقة" و"آخر 4 أرقام" ما يظهروا بالصفحة إلا بعد فتح نافذة
     * "تحصيل الدفع" واختيار طريقة "بطاقة ائتمان / خصم" منها - نضغط الزرين
     * تلقائياً لو الحقول مو موجودة أصلاً (المستخدم ممكن يكون فتحها يدوياً أصلاً)
     */
    async function ensurePaymentFormOpen() {
        if (document.querySelector('input[name="approvalCode"]')) return true;

        const collectBtn = findButtonByText("تحصيل الدفع");
        if (collectBtn) {
            dispatchFullClick(collectBtn);
            await new Promise(r => setTimeout(r, 800));
        }

        const cardBtn = findButtonByText("بطاقة ائتمان");
        if (cardBtn) {
            dispatchFullClick(cardBtn);
        }

        const start = Date.now();
        while (!document.querySelector('input[name="approvalCode"]') && Date.now() - start < 5000) {
            await new Promise(r => setTimeout(r, 200));
        }

        return !!document.querySelector('input[name="approvalCode"]');
    }

    /**
     * "جهاز الدفع" قائمة Radix Select مبنية على <select> حقيقي مخفي (لأغراض
     * النموذج) + زر combobox مرئي بجانبه، يفتح قائمة خيارات مرسومة عادةً
     * بـportal منفصل عن الحاوية. أي جهاز يفي بالغرض (حسب طلب المستخدم)، فنختار
     * أول خيار متاح دائماً - نضغط الزر، ننتظر ظهور القائمة عبر id اللي يشاوره
     * aria-controls بالزر (أدق من البحث عن أي [role="option"] بالصفحة كلها)،
     * ثم نضغط أول خيار فيها.
     */
    async function selectPosMachine() {
        const selectEl = document.querySelector('select[name="posMachine"]');
        if (!selectEl) return true; // الحقل غير موجود بهذي الصفحة - نتجاهل بصمت

        const trigger = selectEl.parentElement
            ? selectEl.parentElement.querySelector('button[role="combobox"]')
            : null;
        if (!trigger) return false;

        // ملاحظة مهمة: ما نعتمد على selectEl.value كدليل على وجود اختيار -
        // الـ<select> الحقيقي المخفي يرجّع قيمة أول عنصر بالقائمة تلقائياً
        // بمجرد ما يترسم (سلوك متصفح افتراضي عادي)، حتى بدون أي اختيار حقيقي
        // بواجهة Radix. العلامة الصحيحة هي data-placeholder على الزر نفسه:
        // Radix يضيفها لما ما يكون فيه اختيار بعد ويشيلها بعد اختيار فعلي
        if (!trigger.hasAttribute("data-placeholder")) return true;

        dispatchFullClick(trigger);

        const listboxId = trigger.getAttribute("aria-controls");
        let option = null;
        const start = Date.now();
        while (!option && Date.now() - start < 3000) {
            const scope = (listboxId && document.getElementById(listboxId)) || document;
            option = scope.querySelector('[role="option"]');
            if (!option) await new Promise(r => setTimeout(r, 150));
        }
        if (!option) return false;

        dispatchFullClick(option);
        await new Promise(r => setTimeout(r, 300));
        return !trigger.hasAttribute("data-placeholder");
    }

    // ==========================================================
    // واجهة العرض - بنفس تصميم بقية الأدوات (رأس أخضر، صندوق دائري، RTL)
    // ==========================================================

    // ملاحظة: pointer-events:auto ضروري - نافذة "تحصيل الدفع" (Radix Dialog)
    // تعطّل pointer-events على باقي الصفحة (body) لفرض التركيز على نفسها، فبدونها
    // زر الإغلاق يكون ظاهر بس ما يستجيب للضغط رغم إنه فوق كل شي بصرياً
    function overlayShell(innerHtml, width) {
        return (
            '<div id="payment-verify-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;pointer-events:auto;">' +
            '<div style="width:' + width + 'px;background:#fff;border-radius:16px;padding:25px;' +
            'text-align:center;direction:rtl;pointer-events:auto;">' + innerHtml + '</div></div>'
        );
    }

    function showUrlPrompt() {
        return new Promise(resolve => {
            document.getElementById("payment-verify-box")?.remove();

            document.body.insertAdjacentHTML("beforeend", overlayShell(
                '<h3 style="margin-top:0">💳 تحقق من الدفع</h3>' +
                '<div style="margin:15px 0;text-align:right">الصق رابط إيصال الدفع (Geidea):</div>' +
                '<input id="payment-verify-url" type="text" placeholder="https://mpos.geidea.net/QRReceipt?..." style="' +
                'width:100%;padding:12px;border:1px solid #ddd;border-radius:8px;font-size:13px;' +
                'text-align:left;direction:ltr;box-sizing:border-box;" />' +
                '<button data-overlay-action="url-submit" style="' +
                'width:100%;padding:12px;margin-top:12px;border:none;border-radius:8px;cursor:pointer;' +
                'background:#A3E635;font-size:15px;">تحقق وتعبئة</button>' +
                '<button data-overlay-action="url-cancel" style="' +
                'width:100%;padding:12px;margin-top:8px;border:none;border-radius:8px;cursor:pointer;' +
                'background:#eee;color:#333;font-size:15px;">إلغاء</button>',
                340
            ));

            const input = document.getElementById("payment-verify-url");
            input.focus();

            function submit() {
                const url = input.value.trim();
                if (!url) {
                    input.style.border = "1px solid #dc2626";
                    return;
                }
                document.getElementById("payment-verify-box")?.remove();
                resolve(url);
            }

            registerOverlayAction("url-submit", submit);
            registerOverlayAction("url-cancel", () => {
                document.getElementById("payment-verify-box")?.remove();
                resolve(null);
            });
            input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
        });
    }

    function showLoading(text) {
        document.getElementById("payment-verify-box")?.remove();
        document.body.insertAdjacentHTML("beforeend", overlayShell(text, 300));
    }

    function showErrorMessage(text) {
        document.getElementById("payment-verify-box")?.remove();
        document.body.insertAdjacentHTML("beforeend", overlayShell(
            '<div style="margin-bottom:15px">' + text + "</div>" +
            '<button data-overlay-action="close" style="' +
            "padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;\">إغلاق</button>",
            300
        ));
        registerOverlayAction("close", () => {
            document.getElementById("payment-verify-box")?.remove();
        });
    }

    /** تنبيه كبير وواضح (أحمر حقيقي) - يُستخدم فقط لما فيه شي محتاج انتباه فعلي (مبلغ مختلف، أو فشل خطوة تلقائية) */
    function showWarningResult(text) {
        document.getElementById("payment-verify-box")?.remove();
        const html =
            '<div id="payment-verify-box" style="' +
            "position:fixed;inset:0;background:#0008;display:flex;align-items:center;" +
            'justify-content:center;z-index:999999999;font-family:Arial;pointer-events:auto;">' +
            '<div style="width:380px;background:#fff;border-radius:16px;overflow:hidden;direction:rtl;pointer-events:auto;' +
            'box-shadow:0 0 0 3px #dc2626;">' +
            '<div style="background:#dc2626;padding:20px;text-align:center;font-weight:bold;font-size:20px;color:#fff;">' +
            "⚠️ تنبيه</div>" +
            '<div style="padding:20px;text-align:right;white-space:pre-line;line-height:1.9;font-size:16px;font-weight:bold;color:#111;">' + text + "</div>" +
            '<div style="padding:0 15px 15px;text-align:center;">' +
            '<button data-overlay-action="close" style="width:100%;padding:12px;border:none;border-radius:8px;' +
            'cursor:pointer;background:#A3E635;font-size:15px;">إغلاق</button>' +
            "</div></div></div>";
        document.body.insertAdjacentHTML("beforeend", html);
        registerOverlayAction("close", () => {
            document.getElementById("payment-verify-box")?.remove();
        });
    }

    /** إشعار صغير وسريع - يُستخدم لما كل شي تمام (المبلغ صحيح) بدون داعي لصندوق كبير بكل التفاصيل */
    function showSuccessToast(text) {
        document.getElementById("payment-verify-box")?.remove();
        document.body.insertAdjacentHTML("beforeend",
            '<div id="payment-verify-box" style="' +
            "position:fixed;inset:0;background:#0004;display:flex;align-items:center;" +
            'justify-content:center;z-index:999999999;font-family:Arial;pointer-events:auto;">' +
            '<div style="background:#fff;border-radius:14px;padding:16px 24px;direction:rtl;pointer-events:auto;' +
            'display:flex;align-items:center;gap:10px;box-shadow:0 10px 28px #0004;cursor:pointer;">' +
            '<span style="font-size:22px;">✅</span>' +
            '<span style="font-size:16px;font-weight:bold;color:#166534;">' + text + "</span>" +
            "</div></div>"
        );
        const box = document.getElementById("payment-verify-box");
        box.addEventListener("click", () => box.remove());
        setTimeout(() => box.remove(), 2500);
    }

    async function runPaymentVerify() {

        const url = await showUrlPrompt();
        if (!url) return;

        showLoading("جارٍ جلب بيانات الإيصال...");

        try {

            const html = await fetchReceiptHtml(url);
            const doc = new DOMParser().parseFromString(html, "text/html");
            const { approvalCode, last4, amount } = extractReceiptData(doc);

            if (!approvalCode && !last4 && isNaN(amount)) {
                showErrorMessage("تعذّر قراءة بيانات الإيصال - تأكد من صحة الرابط");
                return;
            }

            showLoading("جارٍ فتح نموذج الدفع...");
            const opened = await ensurePaymentFormOpen();
            if (!opened) {
                showErrorMessage('ما قدرت أفتح نموذج الدفع تلقائياً - افتح "تحصيل الدفع" واختر "بطاقة ائتمان / خصم" يدوياً ثم أعد المحاولة');
                return;
            }

            const posSelected = await selectPosMachine();

            const approvalInput = document.querySelector('input[name="approvalCode"]');
            const cardDigitsInput = document.querySelector('input[name="card-digits"]');
            const amountInput = document.querySelector('input[name="amount"]');

            if (approvalInput && approvalCode) setReactInputValue(approvalInput, approvalCode);
            if (cardDigitsInput && last4) setReactInputValue(cardDigitsInput, last4);

            // لو المبلغ مختلف، نصحّحه تلقائياً بنفس مبلغ الإيصال (مو بس تنبيه)
            let mismatch = false;
            let expected = NaN;
            if (amountInput && !isNaN(amount)) {
                expected = parseFloat(amountInput.value);
                if (!isNaN(expected) && Math.abs(expected - amount) > 0.01) {
                    mismatch = true;
                    setReactInputValue(amountInput, amount.toFixed(2));
                }
            }

            // نعرض صندوق التنبيه الكبير الأحمر فقط لو فيه شي فعلاً يستاهل الانتباه
            // (مبلغ مختلف أو فشل اختيار جهاز الدفع تلقائياً) - وإلا إشعار صغير وسريع يكفي
            if (mismatch || !posSelected) {
                let message = "تم تعبئة رمز الموافقة وآخر 4 أرقام من الإيصال.";
                if (mismatch) {
                    message +=
                        "\n\nالمبلغ كان مختلف وتم تصحيحه تلقائياً:\n" +
                        "كان مسجّل بيقين: " + expected.toFixed(2) + "\n" +
                        "المبلغ الصحيح من الإيصال: " + amount.toFixed(2);
                }
                if (!posSelected) {
                    message += "\n\nما قدرت أختار جهاز الدفع تلقائياً - اخترها يدوياً من القائمة.";
                }
                showWarningResult(message);
            } else {
                showSuccessToast("المبلغ صحيح");
            }

        } catch (err) {
            showErrorMessage("تعذّر معالجة الإيصال: " + err.message);
        }

    }

    waitCore();

})();
