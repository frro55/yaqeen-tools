// ==UserScript==
// @name         Yaqeen Tool - رسائل واتساب للعميل
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  يسحب اسم ورقم جوال العميل من صفحة تفاصيل العقد المفتوحة، ويرسل له رسالة واتساب جاهزة (فتح العقد أو إغلاقه) بعد معاينتها
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

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات) - هنا بدون target ثابت لأن
    // كل رسالة تروح لجوال عميل مختلف (نحسبه وقت الإرسال)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
    };

    const RECEIPT_LINK = 'https://maps.app.goo.gl/5jA6kMNSHLzkweJ47?g_st=ic';

    const MESSAGE_TEMPLATES = {
        open: {
            label: '📩 رسالة فتح العقد (تسليم السيارة)',
            build(name) {
                return (
                    'مرحبًا ' + name + ' 🌟\n' +
                    'شكرًا لاختياركم لومي لتأجير السيارات. نتمنى لكم رحلة آمنة وممتعة.\n\n' +
                    'في حال احتجتم أي مساعدة خلال فترة التأجير، يسعدنا خدمتكم على الارقام التالية:-\n' +
                    'رقم الفرع: 0505432414\n' +
                    'رقم خدمة العملاء: 920028428\n\n' +
                    'ونقدّر رأيكم في بداية تجربتكم، ويمكنكم تقييم خدمة الاستلام من خلال الرابط:\n' +
                    RECEIPT_LINK + '\n\n' +
                    'شكرًا لثقتكم، ونتمنى لكم قيادة آمنة. 🚗'
                );
            },
        },
        close: {
            label: '📩 رسالة إغلاق العقد (تسليم السيارة)',
            build(name) {
                return (
                    'شكرًا لك ' + name + ' على اختيار لومي لتأجير السيارات. 💚\n\n' +
                    'سعدنا بخدمتكم، ونتمنى أن تكون تجربتكم معنا مميزة.\n\n' +
                    'يسعدنا مشاركة رأيكم في تجربة التأجير من خلال الرابط التالي:\n' +
                    RECEIPT_LINK + '\n\n' +
                    'ملاحظاتكم تساعدنا على تحسين خدماتنا باستمرار. شكرًا لكم، ونتطلع لخدمتكم مرة أخرى. 🌟'
                );
            },
        },
    };

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "customer-whatsapp-messages",
            name: "💬 رسائل واتساب للعميل",
            run() {
                runCustomerMessageTool();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات باقي الأدوات)
    // ==========================================================

    /** بعض أزرار يقين (Radix/shadcn) ما تستجيب لـ.click() لحاله دائماً - تحتاج أحداث pointer حقيقية قبله */
    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findLabelElement(root, labelText) {
        const candidates = root.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    function findValueNearLabel(root, labelText) {
        const labelEl = findLabelElement(root, labelText);
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

    /**
     * يحوّل رقم جوال معروض بأي صيغة شائعة (05xxxxxxxx، +9665xxxxxxxx،
     * 9665xxxxxxxx، 5xxxxxxxx) إلى JID واتساب لرقم فردي بصيغة Baileys
     * (رقم دولي كامل بدون + متبوع بـ@s.whatsapp.net) - افتراض قابل للتعديل
     * لو تبيّن إن صيغة البوت مختلفة
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
                    Authorization: WHATSAPP_CONFIG.apiKey,
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({
                    target: phoneJid,
                    type: 'text',
                    message: message,
                }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve();
                    } else {
                        console.error('[رسائل العميل] فشل الإرسال:', response.status, response.responseText);
                        reject(new Error('فشل الإرسال (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => {
                    reject(new Error('تعذّر الاتصال بخادم بوت واتساب'));
                },
            });
        });
    }

    // ==========================================================
    // قراءة بيانات العميل من صفحة العقد المفتوحة حالياً
    // ==========================================================

    /**
     * يقرأ اسم ورقم جوال العميل من الصفحة المفتوحة حالياً - يفتح لوحة
     * "بيانات العميل" لو كانت مطوية (نفس زر التوسيع بأيقونة SVG المستخدم
     * بباقي الأدوات) وينتظر فعلياً لين تترسم البيانات بدل انتظار ثابت.
     */
    async function extractCustomerInfo() {
        const expandBtn = Array.from(document.querySelectorAll('button'))
            .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
        if (expandBtn) {
            try { dispatchFullClick(expandBtn); } catch (err) { /* تجاهل */ }
        }

        const waitStart = Date.now();
        let scope = document.querySelector('[role="dialog"]') || document;
        while (Date.now() - waitStart < 2500) {
            scope = document.querySelector('[role="dialog"]') || document;
            if (findValueNearLabel(scope, "رقم الهوية")) break;
            await new Promise(r => setTimeout(r, 150));
        }

        const name = document.querySelector('[data-testid="driver-name"]')?.textContent.trim() || "";
        const phoneEl = Array.from(scope.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        return { name, phone };
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function overlayShell(innerHtml, width) {
        return (
            '<div id="customer-msg-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:' + width + 'px;background:#fff;border-radius:16px;padding:22px;' +
            'text-align:center;direction:rtl;">' + innerHtml + '</div></div>'
        );
    }

    function closeBox() {
        document.getElementById('customer-msg-box')?.remove();
    }

    function showMessage(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div style="margin-bottom:15px;white-space:pre-line;">' + text + '</div>' +
            '<button id="customer-msg-close" style="' +
            'padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>',
            340
        ));
        document.getElementById('customer-msg-close').onclick = closeBox;
    }

    function showLoading(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(text, 320));
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function showChoicePrompt(customer) {
        closeBox();
        const html =
            '<div style="font-size:16px;font-weight:bold;margin-bottom:6px;">💬 رسائل واتساب للعميل</div>' +
            '<div style="font-size:13px;color:#555;margin-bottom:16px;">' +
            'الاسم: ' + escapeHtml(customer.name || 'غير معروف') + '<br>' +
            'الجوال: <span dir="ltr">' + escapeHtml(customer.phone || 'غير معروف') + '</span>' +
            '</div>' +
            '<button data-template="open" class="customer-msg-tpl-btn" style="' +
            'width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:8px;cursor:pointer;' +
            'background:#A3E635;font-size:14px;">' + MESSAGE_TEMPLATES.open.label + '</button>' +
            '<button data-template="close" class="customer-msg-tpl-btn" style="' +
            'width:100%;padding:12px;margin-bottom:10px;border:none;border-radius:8px;cursor:pointer;' +
            'background:#A3E635;font-size:14px;">' + MESSAGE_TEMPLATES.close.label + '</button>' +
            '<button id="customer-msg-cancel" style="' +
            'width:100%;padding:10px;border:none;border-radius:8px;cursor:pointer;' +
            'background:#eee;color:#333;font-size:14px;">إلغاء</button>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 360));

        document.querySelectorAll('.customer-msg-tpl-btn').forEach(btn => {
            btn.onclick = () => {
                const key = btn.getAttribute('data-template');
                showPreview(customer, key);
            };
        });
        document.getElementById('customer-msg-cancel').onclick = closeBox;
    }

    function showPreview(customer, templateKey) {
        closeBox();
        const template = MESSAGE_TEMPLATES[templateKey];
        const name = customer.name || 'عميلنا العزيز';
        const message = template.build(name);

        const html =
            '<div style="font-size:15px;font-weight:bold;margin-bottom:10px;">معاينة الرسالة</div>' +
            '<textarea id="customer-msg-preview" readonly style="' +
            'width:100%;height:220px;box-sizing:border-box;padding:10px;border:1px solid #ddd;' +
            'border-radius:8px;font-size:13px;text-align:right;resize:vertical;">' + escapeHtml(message) + '</textarea>' +
            '<div style="font-size:12px;color:#777;margin:8px 0 14px;">سيُرسل إلى: <span dir="ltr">' +
            escapeHtml(customer.phone || '') + '</span></div>' +
            '<div style="display:flex;gap:8px;">' +
            '<button id="customer-msg-back" style="flex:1;padding:12px;border:none;border-radius:8px;' +
            'cursor:pointer;background:#eee;color:#333;font-size:14px;">رجوع</button>' +
            '<button id="customer-msg-send" style="flex:1;padding:12px;border:none;border-radius:8px;' +
            'cursor:pointer;background:#A3E635;font-size:14px;">✅ إرسال</button>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 380));

        document.getElementById('customer-msg-back').onclick = () => showChoicePrompt(customer);
        document.getElementById('customer-msg-send').onclick = async () => {
            if (!customer.phone) {
                showMessage('تعذّر الإرسال: ما قدرنا نقرأ رقم جوال العميل من الصفحة.');
                return;
            }
            showLoading('جارٍ إرسال الرسالة...');
            try {
                const jid = normalizePhoneToJid(customer.phone);
                await sendWhatsAppText(jid, message);
                showMessage('✅ تم إرسال الرسالة بنجاح.');
            } catch (err) {
                showMessage('تعذّر إرسال الرسالة: ' + err.message);
            }
        };
    }

    async function runCustomerMessageTool() {
        showLoading('جارٍ قراءة بيانات العميل من الصفحة...');

        const customer = await extractCustomerInfo();

        if (!customer.name && !customer.phone) {
            showMessage(
                'ما قدرنا نقرأ اسم أو جوال العميل من هذي الصفحة.\n\n' +
                'تأكد إنك فاتح صفحة تفاصيل عقد معيّن (فيها بيانات العميل) قبل تشغيل الأداة.'
            );
            return;
        }

        showChoicePrompt(customer);
    }

    waitCore();

})();
