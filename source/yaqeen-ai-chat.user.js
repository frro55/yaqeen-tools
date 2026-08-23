// ==UserScript==
// @name         Yaqeen Tool - شات AI
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  شات ذكاء اصطناعي - يقرأ محتوى الصفحة المفتوحة حالياً بيقين ويجاوب على أسئلة تخصها أو أي سؤال عام عن التأجير، مع إمكانية إرفاق صورة
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

    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // نفس بوت السيرفر المستخدم بباقي الأدوات - هنا يستخدمه فقط كتوثيق للوصول
    // لـendpoint الشات (/ai-chat)، والسيرفر هو اللي يستدعي OpenAI بمفتاحه الخاص
    // المخزّن كـenvironment variable هناك - المفتاح ما يمر أبداً عبر المتصفح
    const AI_CHAT_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/ai-chat',
        apiKey: 'Firas_2026_SuperSecret_Key',
    };

    const MAX_PAGE_CONTEXT_CHARS = 12000;
    const MAX_IMAGE_DIM = 1600; // أطول ضلع بالبكسل بعد إعادة الحجم
    const IMAGE_QUALITY = 0.7;  // جودة ضغط JPEG - توازن بين الوضوح وحجم الطلب

    let chatMessages = []; // [{role:'user'|'assistant', content:string, image?:string(dataURL)}]
    let pendingImage = null; // dataURL للصورة المرفقة قبل الإرسال

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "ai-chat",
            name: "🤖 شات AI",
            run() {
                runAiChatTool();
            }
        });
    }

    // ==========================================================
    // قراءة محتوى الصفحة المفتوحة حالياً كنص
    // ==========================================================
    function readPageContext() {
        const scope = document.querySelector('main') || document.body;
        const text = (scope.innerText || '').trim();
        return text.slice(0, MAX_PAGE_CONTEXT_CHARS);
    }

    // ==========================================================
    // إعادة حجم/ضغط الصورة قبل الإرسال - الصور مباشرة من الجوال/screenshot
    // ممكن توصل لعدة ميجابايت، وبصيغة base64 يكبر حجمها أكثر، فنصغّرها
    // ونحوّلها JPEG بجودة معقولة حتى ما يتضخم حجم الطلب أو تكلفة كل رسالة
    // ==========================================================
    function resizeImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width, height = img.height;
                    if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
                        const scale = MAX_IMAGE_DIM / Math.max(width, height);
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
                };
                img.onerror = () => reject(new Error('تعذّر قراءة الصورة'));
                img.src = reader.result;
            };
            reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
            reader.readAsDataURL(file);
        });
    }

    function askAi(pageContext, messages) {
        // نحوّل رسائل المستخدم اللي فيها صورة لصيغة OpenAI (content كمصفوفة
        // نص+صورة) - رسائل المساعد ورسائل المستخدم بدون صورة تبقى نص عادي
        const apiMessages = messages.map(m => {
            if (m.role === 'user' && m.image) {
                return {
                    role: 'user',
                    content: [
                        { type: 'text', text: m.content || '(صورة بدون نص)' },
                        { type: 'image_url', image_url: { url: m.image } },
                    ],
                };
            }
            return { role: m.role, content: m.content };
        });

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: AI_CHAT_CONFIG.apiUrl,
                headers: {
                    Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || AI_CHAT_CONFIG.apiKey),
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ pageContext: pageContext, messages: apiMessages }),
                onload: response => {
                    let data = null;
                    try { data = JSON.parse(response.responseText); } catch (err) { /* رد مو JSON */ }

                    if (response.status < 200 || response.status >= 300) {
                        console.error('[شات AI] فشل الطلب:', response.status, response.responseText);
                        reject(new Error((data && data.message) || 'فشل الاتصال بالسيرفر (رمز الحالة: ' + response.status + ')'));
                        return;
                    }
                    if (!data || data.success !== true) {
                        reject(new Error((data && data.message) || 'رد غير متوقع من السيرفر'));
                        return;
                    }
                    resolve(data.answer || '');
                },
                onerror: () => reject(new Error('تعذّر الاتصال بالسيرفر')),
            });
        });
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    function closeBox() {
        document.getElementById('ai-chat-box')?.remove();
    }

    function bubbleHtml(m) {
        const isUser = m.role === 'user';
        const imageHtml = m.image
            ? '<img src="' + m.image + '" style="max-width:100%;border-radius:10px;margin-bottom:6px;display:block;" />'
            : '';
        return (
            '<div style="display:flex;' + (isUser ? 'justify-content:flex-start;' : 'justify-content:flex-end;') + 'margin-bottom:10px;">' +
            '<div style="max-width:80%;padding:11px 14px;border-radius:14px;font-size:13.5px;font-weight:500;line-height:1.7;white-space:pre-wrap;text-align:right;' +
            (isUser ? 'background:#f1f0ea;color:#1c1c1a;' : 'background:linear-gradient(160deg,#A3E635,#b8ec52);color:#3c4a10;font-weight:700;') +
            '">' + imageHtml + escapeHtml(m.content) + '</div></div>'
        );
    }

    function renderMessages() {
        const box = document.getElementById('ai-chat-messages');
        if (!box) return;
        box.innerHTML = chatMessages.map(bubbleHtml).join('');
        box.scrollTop = box.scrollHeight;
    }

    function showTyping(show) {
        const el = document.getElementById('ai-chat-typing');
        if (el) el.style.display = show ? 'block' : 'none';
        const btn = document.getElementById('ai-chat-send');
        if (btn) btn.disabled = show;
    }

    function renderPreview() {
        const box = document.getElementById('ai-chat-preview');
        if (!box) return;
        if (!pendingImage) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }
        box.style.display = 'flex';
        box.innerHTML =
            '<img src="' + pendingImage + '" style="height:44px;border-radius:9px;" />' +
            '<span id="ai-chat-remove-image" style="cursor:pointer;font-size:12.5px;font-weight:700;color:#dc2626;margin-inline-start:8px;">✕ إزالة</span>';
        document.getElementById('ai-chat-remove-image').onclick = () => {
            pendingImage = null;
            renderPreview();
        };
    }

    /**
     * نافذة عائمة (مو حوار كامل الشاشة) - بدون أي خلفية معتمة تغطي الصفحة،
     * حتى يقدر المستخدم يشتغل بيقين وهي مفتوحة بنفس الوقت. تُسحب من الهيدر
     * لأي مكان بالشاشة (نفس فكرة نوافذ الدردشة العائمة العادية)، وما تُغلق
     * إلا بالضغط الصريح على ✕ - تبقى مفتوحة طول ما يشتغل المستخدم بالصفحة.
     */
    function makeDraggable(panel, handle) {
        let dragging = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        handle.addEventListener('pointerdown', e => {
            if (e.target.closest('#ai-chat-close')) return;
            dragging = true;
            const rect = panel.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;
            // نحوّل من التموضع الأصلي (right/bottom) لـleft/top ثابتة أول
            // سحبة، حتى تصير حسابات السحب بعدها بسيطة (فرق مباشر من نقطة البداية)
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.left = startLeft + 'px';
            panel.style.top = startTop + 'px';
            handle.setPointerCapture(e.pointerId);
            e.preventDefault();
        });

        handle.addEventListener('pointermove', e => {
            if (!dragging) return;
            let newLeft = startLeft + (e.clientX - startX);
            let newTop = startTop + (e.clientY - startY);
            // نحصر الموضع داخل حدود الشاشة حتى ما تنسحب النافذة برة الرؤية بالكامل
            newLeft = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newTop));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
        });

        handle.addEventListener('pointerup', e => {
            dragging = false;
            try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* تجاهل */ }
        });
    }

    function showChatBox() {
        closeBox();
        chatMessages = [];
        pendingImage = null;

        const html =
            '<div id="ai-chat-header" style="background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;padding:16px 18px;' +
            'text-align:center;font-weight:800;font-size:15px;position:relative;cursor:move;user-select:none;">🤖 شات AI' +
            '<span id="ai-chat-close" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:16px;opacity:.75;">✕</span>' +
            '</div>' +
            '<div style="padding:10px 16px 0;font-size:11px;font-weight:600;color:#a19c92;text-align:center;">' +
            'يقرأ الصفحة المفتوحة حالياً - اسأل عنها أو أي سؤال عام يخص التأجير، وممكن ترفقين صورة' +
            '</div>' +
            '<div id="ai-chat-messages" style="height:320px;overflow-y:auto;padding:16px;"></div>' +
            '<div id="ai-chat-typing" style="display:none;padding:0 16px 8px;font-size:12px;font-weight:700;color:#a19c92;text-align:right;">... يكتب</div>' +
            '<div id="ai-chat-preview" style="display:none;align-items:center;padding:0 16px 10px;"></div>' +
            '<div style="display:flex;gap:8px;padding:14px 16px;border-top:1px solid #e9e7df;align-items:center;">' +
            '<button id="ai-chat-send" style="padding:0 18px;height:40px;border:0;border-radius:11px;' +
            'background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;cursor:pointer;font-size:13.5px;font-weight:800;font-family:inherit;">إرسال</button>' +
            '<input id="ai-chat-input" type="text" placeholder="اكتب سؤالك..." style="' +
            'flex:1;padding:10px 13px;border:1.5px solid #e9e7df;border-radius:11px;font-size:13.5px;' +
            'text-align:right;direction:rtl;font-family:inherit;background:#fbfbf9;color:#1c1c1a;box-sizing:border-box;" />' +
            '<button id="ai-chat-attach" title="إرفاق صورة" style="width:40px;height:40px;border:1.5px solid #e9e7df;' +
            'border-radius:11px;background:#fbfbf9;cursor:pointer;font-size:15px;">📎</button>' +
            '<input id="ai-chat-file" type="file" accept="image/*" style="display:none;" />' +
            '</div>';

        // ما فيه أي غلاف كامل الشاشة (لا inset:0 ولا خلفية معتمة) - النافذة
        // نفسها بس عنصر position:fixed بحجمها الطبيعي، فباقي الصفحة (يقين)
        // تفضل قابلة للتفاعل الكامل حواليها وتحتها
        document.body.insertAdjacentHTML('beforeend',
            '<div id="ai-chat-box" style="' +
            'position:fixed;right:30px;bottom:190px;width:360px;background:#fff;border-radius:20px;' +
            'overflow:hidden;direction:rtl;font-family:"Tajawal",Arial,Tahoma,sans-serif;box-shadow:0 20px 50px -12px rgba(0,0,0,.35);' +
            'z-index:999999999;">' + html + '</div>'
        );

        const panel = document.getElementById('ai-chat-box');
        const header = document.getElementById('ai-chat-header');
        makeDraggable(panel, header);

        document.getElementById('ai-chat-close').onclick = closeBox;

        const input = document.getElementById('ai-chat-input');
        input.focus();

        document.getElementById('ai-chat-attach').onclick = () => {
            document.getElementById('ai-chat-file').click();
        };
        document.getElementById('ai-chat-file').addEventListener('change', async e => {
            const file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!file) return;
            try {
                pendingImage = await resizeImageFile(file);
                renderPreview();
            } catch (err) {
                showTyping(false);
                chatMessages.push({ role: 'assistant', content: '⚠️ ' + err.message });
                renderMessages();
            }
        });

        function submit() {
            const text = input.value.trim();
            if (!text && !pendingImage) return;
            input.value = '';
            sendMessage(text);
        }

        document.getElementById('ai-chat-send').onclick = submit;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }

    async function sendMessage(text) {
        const image = pendingImage;
        pendingImage = null;
        renderPreview();

        chatMessages.push({ role: 'user', content: text, image: image });
        renderMessages();
        showTyping(true);

        try {
            const pageContext = readPageContext();
            const answer = await askAi(pageContext, chatMessages);
            chatMessages.push({ role: 'assistant', content: answer || 'ما وصل رد.' });
        } catch (err) {
            chatMessages.push({ role: 'assistant', content: '⚠️ ' + err.message });
        }

        showTyping(false);
        renderMessages();
    }

    async function runAiChatTool() {
        // لو النافذة مفتوحة أصلاً، ما نعيد إنشاءها (بيمسح المحادثة الحالية) -
        // بس نرجّعها للواجهة ونركّز حقل الكتابة
        const existing = document.getElementById('ai-chat-box');
        if (existing) {
            existing.style.display = '';
            document.getElementById('ai-chat-input')?.focus();
            return;
        }
        showChatBox();
    }

    waitCore();

})();
