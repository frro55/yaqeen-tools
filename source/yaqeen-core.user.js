// ==UserScript==
// @name         Yaqeen Tools Core
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0.0
// @description  نظام أدوات يقين
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


    // نستخدم unsafeWindow (إن وُجد) لنفس سبب باقي الأدوات: لو هذا الملف
    // انضم يوماً لملف مجمّع مع أدوات تطلب صلاحيات GM_* (زي الحزمة الموحّدة)،
    // كامل الملف المجمّع ينفّذ بوضع sandboxed، فلازم Core يستخدم نفس المرجع
    // (unsafeWindow) اللي تستخدمه بقية الأدوات، وإلا كل طرف يسجّل/يدوّر على
    // YAQEEN_TOOLS في window مختلف عن الثاني ولا شي يشتغل. لما Core يشتغل
    // لحاله (بدون أي صلاحيات) unsafeWindow ما يكون معرّف، فيرجع لسلوكه الحالي
    // العادي (window الحقيقية) بدون أي تغيير
    var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    if (HOST_WINDOW.YAQEEN_TOOLS) return;


    const THEME = "#A3E635";

    // ترتيب ظهور الأدوات بالقائمة - ثابت دايماً بغض النظر عن ترتيب تحميل
    // Tampermonkey للسكربتات الفعلي (اللي ما يُضمن يبقى ثابت بين إعادة
    // التثبيت والتحديثات). أي أداة جديدة ما ب هذي القائمة تنحط تلقائياً
    // بالآخر بترتيب تسجيلها.
    const TOOL_ORDER = [
        "fleet-inventory",
        "available-vehicles",
        "email-tools",
        "payment-verify",
        "airport-report",
        "late-payments",
        "late-payments-branches",
        "company-extension",
        "company-extension-branches",
        "closed-as-debt",
        "customer-whatsapp-messages",
        "booking-report",
    ];

    // اختصارات لوحة المفاتيح: كل عنصر يفتح أداة معيّنة (بالـid تبعها) مباشرة
    // بدل فتح القائمة والبحث عنها يدوياً. نستخدم "code" (يمثّل المفتاح
    // الفعلي بالكيبورد، مثل "KeyA") لا "key" - لأن Alt/Option على Mac يغيّر
    // القيمة اللي يرجّعها "key" لحرف مختلف كلياً (Option+A مثلاً يرجّع "å"
    // مو "a")، بينما "code" يبقى ثابت بغض النظر عن نظام التشغيل أو تأثير
    // المفاتيح المُعدِّلة. لإضافة اختصار جديد مستقبلاً، ضيف سطر جديد بنفس
    // الشكل: { alt, ctrl, shift, code, toolId } - كود المفتاح لأي حرف هو
    // "Key" + الحرف بالإنجليزي كبير (مثال: زر B = "KeyB")
    const SHORTCUTS = [
        { alt: true, ctrl: false, shift: false, code: "KeyA", toolId: "payment-verify" },
    ];

    // ============================================================
    // صلاحيات المستخدم: أي أداة مسجّلة عبر add() ما تظهر بالقائمة إلا لو
    // مفتاحها موجود ضمن القائمة اللي يرجّعها الـAPI لهذا المستخدم. الحالة
    // الافتراضية (قبل ما نتأكد من الصلاحيات، أو لو فشل الطلب) هي "ما فيه
    // أدوات ظاهرة إطلاقاً" - أأمن خيار افتراضي.
    // ============================================================

    const PERMISSIONS_API_URL = "https://api.yaqeen-vip.space/api/tools";
    const PERMISSIONS_CACHE_KEY = "yaqeen_tool_permissions";
    const PERMISSIONS_CACHE_MS = 60 * 1000; // دقيقة وحدة - سحب صلاحية موظف يتطبق بسرعة معقولة

    /** يبحث عن أول نص يشبه إيميل داخل نص عام */
    function findEmailInText(text) {
        if (!text) return "";
        const match = String(text).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        return match ? match[0] : "";
    }

    /**
     * يبحث عن إيميل داخل عنصر، بفحص كل عنصر ورقة (بدون أولاد) بمفرده على
     * حدة - لا نستخدم textContent لكامل الحاوية لأنه يدمج نصوص العناصر
     * المتجاورة بدون أي فاصل بينها (مثلاً span "LUMI" ملاصق لـspan
     * الإيميل يطلع "LUMIahmed@..." بدل "ahmed@..." ويكسر الريجيكس)
     */
    function findEmailInElement(root) {
        if (!root) return "";

        if (root.children.length === 0) {
            return findEmailInText(root.textContent);
        }

        const leaves = root.querySelectorAll("*");
        for (let i = 0; i < leaves.length; i++) {
            if (leaves[i].children.length > 0) continue;
            const match = findEmailInText(leaves[i].textContent);
            if (match) return match;
        }
        return "";
    }

    /**
     * يقرأ إيميل المستخدم الحالي من زر قائمة المستخدم بأعلى يقين بدون فتح
     * أي شيء - نص الزر أحياناً يكون بس الأحرف الأولى (Avatar)، مو الإيميل
     * الكامل، فنبحث عن نمط إيميل داخل عناصر الزر بدل الاعتماد على عنصر
     * محدد بالضبط
     */
    function readCurrentUserEmail() {
        const trigger = document.querySelector('[data-testid="user-menu-button"]');
        return trigger ? findEmailInElement(trigger) : "";
    }

    /** يحاكي كليك حقيقي (pointerdown/up) لأزرار Radix اللي ما تستجيب لـ.click() العادي دايماً */
    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    /**
     * يلقط عنصر القائمة المنسدلة المفتوحة حالياً المرتبطة بزر المستخدم.
     * زر قائمة المستخدم بالذات ما فيه aria-controls (خلاف بعض أزرار Radix
     * الثانية بالنظام)، لكن محتوى القائمة نفسه يربط رجوع للزر عبر
     * aria-labelledby="<id تبع الزر>" - هذا أدق مطابقة، مع احتياط عام لو
     * تغيّرت الماركب مستقبلاً
     */
    function findOpenUserMenu(trigger) {
        if (trigger.id) {
            const byLabel = document.querySelector('[role="menu"][aria-labelledby="' + trigger.id + '"]');
            if (byLabel) return byLabel;
        }

        const controlsId = trigger.getAttribute("aria-controls");
        if (controlsId) {
            const byId = document.getElementById(controlsId);
            if (byId) return byId;
        }

        return document.querySelector('[role="menu"]');
    }

    /**
     * يجيب إيميل المستخدم الحالي: يحاول يقرأه مباشرة من زر القائمة أول شي
     * (بدون أي فتح)، ولو ما لقاه - لأن الإيميل الكامل ما يترسم بالـDOM إلا
     * بعد فتح القائمة المنسدلة - يفتحها تلقائياً بنفسه، يقرأ الإيميل من
     * محتواها، ثم يقفلها زي ما كانت (لو المستخدم نفسه ما كان فاتحها أصلاً)،
     * كل هذا بدون أي تدخل يدوي من المستخدم
     */
    function resolveUserEmail(callback) {
        const direct = readCurrentUserEmail();
        if (direct) {
            callback(direct);
            return;
        }

        const trigger = document.querySelector('[data-testid="user-menu-button"]');
        if (!trigger) {
            callback("");
            return;
        }

        const wasOpen = trigger.getAttribute("aria-expanded") === "true";
        if (!wasOpen) {
            dispatchFullClick(trigger);
        }

        let attempts = 0;
        (function poll() {
            attempts++;
            const menu = findOpenUserMenu(trigger);
            const email = menu ? findEmailInElement(menu) : "";

            if (email || attempts >= 20) {
                if (!wasOpen) {
                    // نقفل القائمة زي ما كانت قبل - المستخدم ما فتحها هو بنفسه
                    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
                }
                callback(email);
                return;
            }

            setTimeout(poll, 100);
        })();
    }

    /** POST بصيغة JSON عبر GM_xmlhttpRequest (يتفادى قيود CORS) مع fetch كحل احتياطي */
    function postJson(url, payload) {
        return new Promise(resolve => {
            if (typeof GM_xmlhttpRequest !== "undefined") {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: url,
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(payload),
                    onload: function (response) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (err) {
                            resolve(null);
                        }
                    },
                    onerror: function () { resolve(null); },
                });
                return;
            }
            // احتياط لو GM_xmlhttpRequest مو متاح لأي سبب - fetch العادي ممكن
            // يترفض بسبب CORS، لكن أفضل من عدم المحاولة إطلاقاً
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })
                .then(res => res.json())
                .then(resolve)
                .catch(() => resolve(null));
        });
    }

    /** نتيجة مخزّنة بـsessionStorage صالحة لآخر دقيقة - نتفادى طلب API بكل تحميل صفحة */
    function readCachedPermissions() {
        try {
            const raw = sessionStorage.getItem(PERMISSIONS_CACHE_KEY);
            if (!raw) return null;
            const cached = JSON.parse(raw);
            if (!cached || !Array.isArray(cached.tools) || !cached.timestamp) return null;
            if (Date.now() - cached.timestamp > PERMISSIONS_CACHE_MS) return null;
            return cached.tools;
        } catch (err) {
            return null;
        }
    }

    function writeCachedPermissions(tools) {
        try {
            sessionStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({ tools: tools, timestamp: Date.now() }));
        } catch (err) { /* تجاهل */ }
    }

    function applyAllowedTools(tools) {
        HOST_WINDOW.YAQEEN_TOOLS.allowedTools = Array.isArray(tools) ? tools : [];
        HOST_WINDOW.YAQEEN_TOOLS.permissionsLoaded = true;
        HOST_WINDOW.YAQEEN_TOOLS.refresh();
    }

    /** يستدعى مرة وحدة عند تشغيل الـCore - يجيب صلاحيات المستخدم ويطبّقها على القائمة */
    function loadUserPermissions() {
        const cached = readCachedPermissions();
        if (cached) {
            applyAllowedTools(cached);
            return;
        }

        resolveUserEmail(function (email) {
            if (!email) {
                // ما لقينا الإيميل هالمرة (مثلاً زر القائمة لسا ما ترسم
                // بالصفحة) - نعيد المحاولة بدل ما نفشل نهائياً
                setTimeout(loadUserPermissions, 1000);
                return;
            }

            postJson(PERMISSIONS_API_URL, { email: email }).then(data => {
                if (!data || data.success !== true || !Array.isArray(data.tools)) {
                    // فشل الاتصال أو success:false - ما نخزّن هذي النتيجة بالكاش
                    // (حتى تتاح إعادة محاولة حقيقية بأقرب تحميل صفحة)، وما نظهر أي أداة
                    applyAllowedTools([]);
                    return;
                }
                writeCachedPermissions(data.tools);
                applyAllowedTools(data.tools);
            });
        });
    }


    HOST_WINDOW.YAQEEN_TOOLS = {

        tools: [],
        allowedTools: [],
        permissionsLoaded: false,


        add(tool){

            if(!tool.id) return;

            if(this.tools.find(t=>t.id === tool.id))
                return;


            this.tools.push(tool);


            this.refresh();

        },


        refresh(){

            const box = document.getElementById("yt-tools");

            if(!box) return;


            box.innerHTML = "";


            // ما نعرض أي أداة قبل ما نتأكد فعلياً من صلاحيات المستخدم -
            // سواء لسا نستنى رد الـAPI، أو فشل الاتصال، أو رجع success:false
            if (!this.permissionsLoaded) return;

            const allowed = this.allowedTools || [];
            const visibleTools = this.tools.filter(t => allowed.indexOf(t.id) !== -1);

            // نرتّب نسخة مستقلة عن ترتيب التسجيل حسب TOOL_ORDER - أي أداة
            // غير موجودة بالقائمة تُلحق بالآخر (بترتيب تسجيلها هي بينها)
            const orderedTools = visibleTools.slice().sort((a, b) => {
                const aIndex = TOOL_ORDER.indexOf(a.id);
                const bIndex = TOOL_ORDER.indexOf(b.id);
                const aRank = aIndex === -1 ? TOOL_ORDER.length : aIndex;
                const bRank = bIndex === -1 ? TOOL_ORDER.length : bIndex;
                return aRank - bRank;
            });


            orderedTools.forEach(tool=>{


                const btn = document.createElement("button");


                btn.className = "yt-tool";

                btn.innerHTML = tool.name;


                btn.onclick = ()=>{

                    try{

                        tool.run();

                    }
                    catch(e){

                        console.error(
                            "Yaqeen Tool Error:",
                            e
                        );

                    }

                };


                box.appendChild(btn);


            });


        }

    };



    function createUI(){


        if(document.getElementById("yt-floating-btn"))
            return;



        // الزر العائم

        const btn = document.createElement("div");

        btn.id="yt-floating-btn";

        btn.innerHTML="🛠";


        Object.assign(btn.style,{

            position:"fixed",
            right:"30px",
            bottom:"120px",
            width:"58px",
            height:"58px",
            borderRadius:"50%",
            background:THEME,
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            cursor:"pointer",
            fontSize:"28px",
            zIndex:"99999999",
            boxShadow:"0 8px 20px #0004"

        });



        document.body.appendChild(btn);




        // القائمة


        const panel=document.createElement("div");


        panel.id="yt-panel";


        Object.assign(panel.style,{

            position:"fixed",
            top:"0",
            right:"-350px",
            width:"320px",
            height:"100%",
            background:"#fff",
            zIndex:"99999998",
            boxShadow:"-5px 0 20px #0003",
            transition:".3s",
            fontFamily:"Arial"

        });



        panel.innerHTML=`

        <div style="
        background:${THEME};
        padding:18px;
        text-align:center;
        font-size:20px;
        font-weight:bold;
        ">
        🛠 أدوات يقين
        </div>


        <div style="padding:15px">

            <input id="yt-search"
            placeholder="بحث عن أداة..."
            style="
            width:100%;
            padding:10px;
            margin-bottom:15px;
            border:1px solid #ddd;
            border-radius:8px;
            ">


            <div id="yt-tools"></div>

        </div>

        `;


        document.body.appendChild(panel);



        // تصميم الأزرار


        const style=document.createElement("style");

        style.innerHTML=`

        .yt-tool{

            width:100%;
            padding:12px;
            margin-bottom:10px;
            border:0;
            border-radius:8px;
            background:#f5f5f5;
            cursor:pointer;
            text-align:right;
            font-size:15px;

        }


        .yt-tool:hover{

            background:${THEME};

        }

        `;


        document.head.appendChild(style);




        let open=false;


        btn.onclick=()=>{

            open=!open;

            panel.style.right =
            open ? "0" : "-350px";

        };



        // البحث


        document.addEventListener("input",e=>{


            if(e.target.id==="yt-search"){


                const value=e.target.value.toLowerCase();


                document.querySelectorAll(".yt-tool")
                .forEach(btn=>{

                    btn.style.display =
                    btn.innerText
                    .toLowerCase()
                    .includes(value)
                    ? "block"
                    :"none";


                });


            }


        });



    }




    function wait(){


        if(!document.body){

            requestAnimationFrame(wait);

            return;

        }


        createUI();


    }



    wait();

    loadUserPermissions();


    // اختصارات لوحة المفاتيح - نتجاهل الحدث لو المستخدم يكتب بحقل نص/textarea
    // حتى ما نتعارض مع أي اختصار متصفح آخر أو كتابة عادية
    document.addEventListener("keydown", function (e) {

        const target = e.target;
        const isTyping = target && (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        );
        if (isTyping) return;

        const match = SHORTCUTS.find(function (s) {
            return !!s.alt === e.altKey &&
                !!s.ctrl === e.ctrlKey &&
                !!s.shift === e.shiftKey &&
                e.code === s.code;
        });
        if (!match) return;

        // نفس شرط الصلاحيات المستخدم بعرض القائمة - الاختصار ما يشتغل لأداة
        // المستخدم غير مصرّح له فيها، حتى لو مسجّلة بالـCore
        if (HOST_WINDOW.YAQEEN_TOOLS.allowedTools.indexOf(match.toolId) === -1) return;

        const tool = HOST_WINDOW.YAQEEN_TOOLS.tools.find(function (t) { return t.id === match.toolId; });
        if (!tool) return;

        e.preventDefault();

        try {
            tool.run();
        } catch (err) {
            console.error("Yaqeen Tool Error:", err);
        }

    }, true);



})();
