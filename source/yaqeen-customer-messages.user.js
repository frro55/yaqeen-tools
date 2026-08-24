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

    // unsafeWindow: مطلوب لأن GM_xmlhttpRequest يشغّل الكود بوضع sandboxed
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب - بدون target ثابت لأن كل رسالة تروح لجوال عميل مختلف
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
        location: {
            // رسالة معلومات ثابتة (بدون اسم العميل) - شرح موقع استلام السيارة
            label: '📍 رسالة موقع الاستلام (مطار الملك عبدالعزيز)',
            build() {
                return (
                    'لومي لتأجير السيارات (مطار الملك عبد العزيز).\n' +
                    'للاستفسار الاتصال على خدمة العملاء 920028428\n' +
                    '‏______________\n' +
                    '● شرح الوصول الى موقع تسليم السيارة\n\n' +
                    '- الموقع الى نقطة التفتيش\n' +
                    'https://goo.gl/maps/x5bLYZMbqLtajQ1Q9\n\n' +
                    '- بعد الوصول الى نقطة التفتيش الرجاء إتباع مقطع الفيديو الموضح ادناه\n' +
                    'https://youtu.be/nJ67mhANEso?si=6e5kRqBeNkOslgi-\n\n' +
                    '- بعد ذلك التوجه الى العامود ( J ) ..'
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

    /** يحوّل رقم جوال بأي صيغة شائعة إلى JID واتساب بصيغة Baileys (رقم دولي@s.whatsapp.net) */
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
                data: JSON.stringify({
                    target: phoneJid,
                    sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
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

    /** يقرأ اسم وجوال العميل من الصفحة الحالية، يوسّع لوحة "بيانات العميل" لو مطوية */
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
    // واجهة العرض (نظام يقين الموحّد - نفس هوية لوحة التحكم)
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-info-box{font-size:14px;color:#767068;line-height:2;margin-bottom:16px;padding:16px 18px;' +
        'background:#fbfbf7;border-radius:14px;border:1.5px solid #cec7b4;text-align:right;' +
        'border-inline-start:4px solid #79a916;}' +
        '.yq-info-box strong{color:#1c1c1a;}' +
        '.yq-divider{height:1.5px;background:#e5e2d5;margin:4px 0 18px;}' +
        '.yq-btn{width:100%;padding:14px;margin-bottom:11px;border:1.5px solid #cec7b4;border-radius:13px;' +
        'cursor:pointer;background:#fff;color:#1c1c1a;font-size:14.5px;font-weight:700;font-family:inherit;' +
        'text-align:right;display:block;transition:background .15s,border-color .15s;}' +
        '.yq-btn-primary{border:0;background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;' +
        'font-weight:800;box-shadow:0 8px 16px -8px rgba(121,169,22,.55);text-align:center;}' +
        '.yq-btn-secondary{background:#f1f0ea;border:0;color:#767068;text-align:center;}' +
        '.yq-btn-row{display:flex;gap:10px;}' +
        '.yq-btn-row .yq-btn{margin-bottom:0;}' +
        '.yq-textarea{width:100%;height:260px;box-sizing:border-box;padding:16px;border:2px solid #a19c92;' +
        'border-radius:14px;font-size:14.5px;font-family:inherit;text-align:right;resize:vertical;background:#fbfbf7;' +
        'line-height:1.9;box-shadow:inset 0 2px 6px rgba(0,0,0,.04);}' +
        '.yq-meta-line{font-size:13.5px;font-weight:600;color:#767068;margin:14px 0 18px;padding-top:14px;' +
        'border-top:1.5px solid #e5e2d5;}' +
        '.yq-spinner{width:30px;height:30px;border:3px solid #A3E635;border-left-color:transparent;' +
        'border-radius:50%;margin:0 auto 14px;animation:yq-spin .8s linear infinite;}' +
        '@keyframes yq-spin{to{transform:rotate(360deg);}}' +
        '.yq-toast-wrap{position:fixed;top:28px;left:50%;transform:translateX(-50%);z-index:999999999;' +
        'display:flex;flex-direction:column;gap:10px;width:min(92vw,400px);font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
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
        if (document.getElementById('yq-shared-styles-customer-msg')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-customer-msg';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /** إشعار خفيف يختفي تلقائياً - بديل alert()/رسائل النجاح والخطأ المزعجة القديمة */
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
            '<div id="customer-msg-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function closeBox() {
        document.getElementById('customer-msg-box')?.remove();
    }

    function showLoading(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + escapeHtml(text) + '</div>',
            300
        ));
    }

    function showChoicePrompt(customer) {
        closeBox();
        const templateButtonsHtml = Object.keys(MESSAGE_TEMPLATES).map(key => (
            '<button data-template="' + key + '" class="customer-msg-tpl-btn yq-btn">' +
            MESSAGE_TEMPLATES[key].label + '</button>'
        )).join('');
        const html =
            '<h3>💬 رسائل واتساب للعميل</h3>' +
            '<div class="yq-info-box">' +
            'الاسم: <strong>' + escapeHtml(customer.name || 'غير معروف') + '</strong><br>' +
            'الجوال: <span dir="ltr"><strong>' + escapeHtml(customer.phone || 'غير معروف') + '</strong></span>' +
            '</div>' +
            '<div class="yq-divider"></div>' +
            templateButtonsHtml +
            '<button id="customer-msg-cancel" class="yq-btn yq-btn-secondary" style="margin-top:6px;">إلغاء</button>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 430));

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
            '<h3 style="margin-bottom:12px;">معاينة الرسالة</h3>' +
            '<textarea id="customer-msg-preview" readonly class="yq-textarea">' + escapeHtml(message) + '</textarea>' +
            '<div class="yq-meta-line">سيُرسل إلى: <span dir="ltr"><strong>' + escapeHtml(customer.phone || '') + '</strong></span></div>' +
            '<div class="yq-btn-row">' +
            '<button id="customer-msg-back" class="yq-btn yq-btn-secondary">رجوع</button>' +
            '<button id="customer-msg-send" class="yq-btn yq-btn-primary">✅ إرسال</button>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 460));

        document.getElementById('customer-msg-back').onclick = () => showChoicePrompt(customer);
        document.getElementById('customer-msg-send').onclick = async () => {
            if (!customer.phone) {
                showToast('تعذّر الإرسال: ما قدرنا نقرأ رقم جوال العميل من الصفحة.', 'error');
                return;
            }
            showLoading('جارٍ إرسال الرسالة...');
            try {
                const jid = normalizePhoneToJid(customer.phone);
                await sendWhatsAppText(jid, message);
                closeBox();
                showToast('تم إرسال الرسالة بنجاح.', 'success');
            } catch (err) {
                closeBox();
                showToast('تعذّر إرسال الرسالة: ' + err.message, 'error');
            }
        };
    }

    async function runCustomerMessageTool() {
        showLoading('جارٍ قراءة بيانات العميل من الصفحة...');

        const customer = await extractCustomerInfo();

        if (!customer.name && !customer.phone) {
            closeBox();
            showToast('ما قدرنا نقرأ اسم أو جوال العميل من هذي الصفحة - تأكد إنك فاتح صفحة تفاصيل عقد معيّن.', 'error');
            return;
        }

        showChoicePrompt(customer);
    }

    waitCore();

})();
