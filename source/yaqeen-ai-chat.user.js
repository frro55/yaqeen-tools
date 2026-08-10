// ==UserScript==
// @name         Yaqeen Tool - شات AI
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  شات ذكاء اصطناعي - يقرأ محتوى الصفحة المفتوحة حالياً بيقين ويجاوب على أسئلة تخصها، أو أي سؤال عام عن التأجير
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

    let chatMessages = []; // [{role:'user'|'assistant', content:string}]

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
    // قراءة محتوى الصفحة المفتوحة حالياً كنص - نص العنصر main لو موجود
    // (أدق - يتجاهل القوائم الجانبية/الهيدر)، وإلا نص الصفحة كاملة، مع تحديد
    // طول أقصى حتى ما يكبر الطلب بلا داعي (وتزيد تكلفة كل رسالة)
    // ==========================================================
    function readPageContext() {
        const scope = document.querySelector('main') || document.body;
        const text = (scope.innerText || '').trim();
        return text.slice(0, MAX_PAGE_CONTEXT_CHARS);
    }

    function askAi(pageContext, messages) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: AI_CHAT_CONFIG.apiUrl,
                headers: {
                    Authorization: AI_CHAT_CONFIG.apiKey,
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ pageContext: pageContext, messages: messages }),
                onload: response => {
                    if (response.status < 200 || response.status >= 300) {
                        console.error('[شات AI] فشل الطلب:', response.status, response.responseText);
                        reject(new Error('فشل الاتصال بالسيرفر (رمز الحالة: ' + response.status + ')'));
                        return;
                    }
                    try {
                        const data = JSON.parse(response.responseText);
                        if (!data || data.success !== true) {
                            reject(new Error((data && data.message) || 'رد غير متوقع من السيرفر'));
                            return;
                        }
                        resolve(data.answer || '');
                    } catch (err) {
                        reject(new Error('تعذّر قراءة رد السيرفر'));
                    }
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

    function bubbleHtml(role, content) {
        const isUser = role === 'user';
        return (
            '<div style="display:flex;' + (isUser ? 'justify-content:flex-start;' : 'justify-content:flex-end;') + 'margin-bottom:10px;">' +
            '<div style="max-width:80%;padding:10px 13px;border-radius:12px;font-size:13.5px;line-height:1.7;white-space:pre-wrap;text-align:right;' +
            (isUser ? 'background:#f0f0f0;color:#111;' : 'background:#A3E635;color:#1a1a1a;') +
            '">' + escapeHtml(content) + '</div></div>'
        );
    }

    function renderMessages() {
        const box = document.getElementById('ai-chat-messages');
        if (!box) return;
        box.innerHTML = chatMessages.map(m => bubbleHtml(m.role, m.content)).join('');
        box.scrollTop = box.scrollHeight;
    }

    function showTyping(show) {
        const el = document.getElementById('ai-chat-typing');
        if (el) el.style.display = show ? 'block' : 'none';
        const btn = document.getElementById('ai-chat-send');
        if (btn) btn.disabled = show;
    }

    function showChatBox() {
        closeBox();
        chatMessages = [];

        const html =
            '<div style="background:#A3E635;padding:14px 18px;text-align:center;font-weight:bold;font-size:16px;' +
            'border-radius:14px 14px 0 0;position:relative;">🤖 شات AI' +
            '<span id="ai-chat-close" style="position:absolute;left:14px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:18px;">✕</span>' +
            '</div>' +
            '<div style="padding:10px 14px 0;font-size:11.5px;color:#777;text-align:center;">' +
            'يقرأ الصفحة المفتوحة حالياً - اسأل عنها أو أي سؤال عام يخص التأجير' +
            '</div>' +
            '<div id="ai-chat-messages" style="height:340px;overflow-y:auto;padding:14px;"></div>' +
            '<div id="ai-chat-typing" style="display:none;padding:0 14px 8px;font-size:12px;color:#999;text-align:right;">... يكتب</div>' +
            '<div style="display:flex;gap:8px;padding:12px 14px;border-top:1px solid #eee;">' +
            '<button id="ai-chat-send" style="padding:0 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;font-size:14px;">إرسال</button>' +
            '<input id="ai-chat-input" type="text" placeholder="اكتب سؤالك..." style="' +
            'flex:1;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font-size:13.5px;text-align:right;direction:rtl;" />' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend',
            '<div id="ai-chat-box" style="' +
            'position:fixed;inset:0;background:#0008;display:flex;align-items:center;' +
            'justify-content:center;z-index:999999999;font-family:Arial;">' +
            '<div style="width:380px;background:#fff;border-radius:14px;overflow:hidden;direction:rtl;">' + html + '</div></div>'
        );

        document.getElementById('ai-chat-close').onclick = closeBox;

        const input = document.getElementById('ai-chat-input');
        input.focus();

        function submit() {
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            sendMessage(text);
        }

        document.getElementById('ai-chat-send').onclick = submit;
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }

    async function sendMessage(text) {
        chatMessages.push({ role: 'user', content: text });
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
        showChatBox();
    }

    waitCore();

})();
