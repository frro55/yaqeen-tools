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

    // صورة زر الليمونة العائم (Base64) - نفس الأيقونة المستخدمة بتصميم القائمة
    // الدائرية، مضمّنة مباشرة بالسكربت بدل ما تُحمّل من رابط خارجي
    const LIME_IMAGE_DATA_URL = "data:image/jpeg;base64,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";

    // ============================================================
    // تجاوز شخصي محلي: يورّي كل الأدوات المسجّلة فوراً بدون انتظار API
    // الصلاحيات إطلاقاً. مفيد لما زر/إيميل المستخدم ما يظهر أصلاً بتخطيط
    // الجوال، فيتعذّر قراءة الإيميل ولا تُحمّل الصلاحيات أبداً وتضل القائمة
    // فاضية. التفعيل محلي فقط (localStorage بنفس المتصفح/الجهاز) - ما يأثر
    // على أي موظف ثاني إلا لو هو نفسه زار نفس الرابط بجهازه، وبما إنه تجاوز
    // كامل لفحص الصلاحيات لازم يبقى سر ما يُشارك. للتفعيل زوري أي رابط بيقين
    // وضيفي ?yt_show_all=1 بآخره مرة وحدة (يبقى مفعّل بعدها بنفس المتصفح)،
    // ولإلغائه ?yt_show_all=0
    // ============================================================
    const LOCAL_SHOW_ALL_KEY = "yaqeen_show_all_tools";

    (function applyShowAllUrlFlag() {
        try {
            const params = new URLSearchParams(location.search);
            if (!params.has("yt_show_all")) return;
            if (params.get("yt_show_all") === "0") {
                localStorage.removeItem(LOCAL_SHOW_ALL_KEY);
            } else {
                localStorage.setItem(LOCAL_SHOW_ALL_KEY, "1");
            }
        } catch (err) { /* تجاهل */ }
    })();

    function isShowAllEnabled() {
        try {
            return localStorage.getItem(LOCAL_SHOW_ALL_KEY) === "1";
        } catch (err) {
            return false;
        }
    }

    // ترتيب ظهور الأدوات بالقائمة - ثابت دايماً بغض النظر عن ترتيب تحميل
    // Tampermonkey للسكربتات الفعلي (اللي ما يُضمن يبقى ثابت بين إعادة
    // التثبيت والتحديثات). أي أداة جديدة ما ب هذي القائمة تنحط تلقائياً
    // بالآخر بترتيب تسجيلها.
    const TOOL_ORDER = [
        "fleet-inventory",
        "available-vehicles",
        "late-payments",
        "late-payments-branches",
        "company-extension",
        "company-extension-branches",
        "closed-as-debt",
        "closed-as-debt-branches",
        "airport-report",
        "booking-report",
        "shift-report",
        "vip-booking-add",
        "email-tools",
        "customer-whatsapp-messages",
        "ai-chat",
    ];

    // تجميع الأدوات بمجموعات قابلة للطي بالقائمة (Accordion) - شكلي بحت،
    // ما يأثر على نظام الصلاحيات إطلاقاً (كل أداة تفلتر حسب صلاحية الموظف
    // الفردية كما هي، والمجموعة تختفي تلقائياً لو ما فيها أي أداة ظاهرة له).
    // أي أداة مو موجودة هنا تُعرض مستقلة برا أي مجموعة (زي "تحقق من الدفع")
    const TOOL_GROUPS = {
        "fleet-inventory": "fleet",
        "available-vehicles": "fleet",
        "late-payments": "debt",
        "late-payments-branches": "debt",
        "company-extension": "debt",
        "company-extension-branches": "debt",
        "closed-as-debt": "debt",
        "closed-as-debt-branches": "debt",
        "airport-report": "reports",
        "booking-report": "reports",
        "shift-report": "reports",
        "vip-booking-add": "reports",
        "email-tools": "other",
        "customer-whatsapp-messages": "other",
        "ai-chat": "other",
    };
    const GROUP_META = {
        fleet: { glyph: "🚗", label: "الأسطول" },
        debt: { glyph: "💰", label: "الدفع والمديونية" },
        reports: { glyph: "📊", label: "التقارير والحجوزات" },
        other: { glyph: "🛠️", label: "أدوات أخرى" },
    };

    // ============================================================
    // القائمة الدائرية (زر الليمونة): يضغط الموظف الزر العائم فتنفتح فقاعات
    // التصنيفات بقوس حواليه، يضغط تصنيف فتطلع أدواته بقوس أبعد. الأدوات
    // المستقلة (بدون تصنيف بـTOOL_GROUPS) تطلع فقاعة مباشرة بنفس حلقة
    // التصنيفات، وتنفّذ الأداة مباشرة عند الضغط بدل ما تفتح قوس ثاني.
    // ============================================================

    const RADIAL_STATE = { open: false, catIndex: null };
    const RADIAL_CAT_RADIUS = 185;
    const RADIAL_CAT_STEP_DEG = 32;
    const RADIAL_BASE_DEG = 183;

    function radialPoint(deg, r) {
        const rad = deg * Math.PI / 180;
        return [Math.cos(rad) * r, Math.sin(rad) * r];
    }

    /** يفصل الرمز التعبيري بأول اسم الأداة عن باقي النص (كل أسماء الأدوات تبدأ برمز + مسافة) */
    function splitToolLabel(tool) {
        const match = /^(\S+)\s+(.+)$/.exec(tool.name || "");
        return match ? { glyph: match[1], text: match[2] } : { glyph: "🔧", text: tool.name || "" };
    }

    /** نفس منطق الصلاحيات والترتيب المستخدم سابقاً - يبني عقد الحلقة الأولى (تصنيف أو أداة مستقلة) */
    function buildRadialNodes() {
        const showAll = isShowAllEnabled();
        if (!showAll && !HOST_WINDOW.YAQEEN_TOOLS.permissionsLoaded) return [];

        const allowed = HOST_WINDOW.YAQEEN_TOOLS.allowedTools || [];
        const visibleTools = showAll
            ? HOST_WINDOW.YAQEEN_TOOLS.tools.slice()
            : HOST_WINDOW.YAQEEN_TOOLS.tools.filter(t => allowed.indexOf(t.id) !== -1);

        const orderedTools = visibleTools.slice().sort((a, b) => {
            const aIndex = TOOL_ORDER.indexOf(a.id);
            const bIndex = TOOL_ORDER.indexOf(b.id);
            const aRank = aIndex === -1 ? TOOL_ORDER.length : aIndex;
            const bRank = bIndex === -1 ? TOOL_ORDER.length : bIndex;
            return aRank - bRank;
        });

        const nodes = [];
        const renderedGroups = {};

        orderedTools.forEach(tool => {
            const groupKey = TOOL_GROUPS[tool.id];

            if (!groupKey) {
                const parts = splitToolLabel(tool);
                nodes.push({ type: "tool", tool: tool, glyph: parts.glyph, label: parts.text });
                return;
            }

            if (renderedGroups[groupKey]) return;
            renderedGroups[groupKey] = true;

            const meta = GROUP_META[groupKey];
            const groupTools = orderedTools.filter(t => TOOL_GROUPS[t.id] === groupKey);
            nodes.push({ type: "category", key: groupKey, glyph: meta.glyph, label: meta.label, tools: groupTools });
        });

        return nodes;
    }

    function closeRadialMenu() {
        RADIAL_STATE.open = false;
        RADIAL_STATE.catIndex = null;
        renderRadialMenu();
    }

    function runToolFromRadial(tool) {
        closeRadialMenu();
        try {
            tool.run();
        } catch (e) {
            console.error("Yaqeen Tool Error:", e);
        }
    }

    function renderRadialMenu() {
        const fab = document.getElementById("yt-fab");
        const scrim = document.getElementById("yt-scrim");
        const catsLayer = document.getElementById("yt-cats");
        const panel = document.getElementById("yt-tool-panel");
        const panelHeader = document.getElementById("yt-tool-panel-header");
        const panelList = document.getElementById("yt-tool-panel-list");
        if (!fab || !scrim || !catsLayer || !panel || !panelHeader || !panelList) return;

        const nodes = buildRadialNodes();

        // لو الصلاحيات تغيّرت وصار التصنيف المفتوح ما عاد موجود، نقفل اللوحة
        if (RADIAL_STATE.catIndex !== null && (!nodes[RADIAL_STATE.catIndex] || nodes[RADIAL_STATE.catIndex].type !== "category")) {
            RADIAL_STATE.catIndex = null;
        }

        fab.classList.toggle("yt-open", RADIAL_STATE.open);
        scrim.classList.toggle("yt-open", RADIAL_STATE.open);

        catsLayer.innerHTML = "";

        // كل فقاعة تتولد دايماً بحالتها المقفلة (مصغّرة عند المركز) أول شي،
        // وبعدها بإطار تالي (requestAnimationFrame) نطبّق الموضع المفتوح لو
        // القائمة مفتوحة فعلاً - كذا CSS transition يشتغل حقيقةً (عنصر
        // يتولد مباشرة بحالته النهائية ما يتحرّك أبداً، لازم "قبل" و"بعد"
        // بإطارين منفصلين حتى يلتقطهما المتصفح)
        const openTargets = [];

        nodes.forEach((node, i) => {
            // نعكس ترتيب المواقع على القوس (بدون ما نغيّر ترتيب العقد نفسه
            // ولا catIndex): أول عقدة (الأسطول) تاخذ أبعد زاوية (أعلى نقطة،
            // أبعد عن الزر)، وآخر عقدة (أدوات أخرى) تاخذ أقرب زاوية للزر
            const posIndex = nodes.length - 1 - i;
            const deg = RADIAL_BASE_DEG + posIndex * RADIAL_CAT_STEP_DEG;
            const [dx, dy] = radialPoint(deg, RADIAL_CAT_RADIUS);

            const orb = document.createElement("div");
            orb.className = "yt-cat-orb";
            orb.style.transform = "translate(-50%,-50%) scale(.4)";
            orb.style.opacity = "0";
            orb.style.pointerEvents = "none";
            orb.style.transitionDelay = (i * 50) + "ms";
            openTargets.push({ el: orb, dx, dy });

            const selected = node.type === "category" && RADIAL_STATE.catIndex === i;
            orb.innerHTML =
                '<div class="yt-cat-orb-inner' + (selected ? " yt-selected" : "") + '">' +
                '<span class="yt-cat-orb-glyph">' + node.glyph + '</span>' +
                '<span class="yt-cat-orb-label">' + node.label + '</span>' +
                '</div>';

            orb.onclick = () => {
                if (node.type === "tool") {
                    runToolFromRadial(node.tool);
                    return;
                }
                RADIAL_STATE.catIndex = (RADIAL_STATE.catIndex === i) ? null : i;
                renderRadialMenu();
            };

            catsLayer.appendChild(orb);
        });

        if (RADIAL_STATE.open) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    openTargets.forEach(t => {
                        t.el.style.transform = "translate(-50%,-50%) translate(" + t.dx + "px," + t.dy + "px)";
                        t.el.style.opacity = "1";
                        t.el.style.pointerEvents = "auto";
                    });
                });
            });
        }

        // لوحة الأداة المنبثقة: عنصر واحد ثابت الموضع (بدل عمود فقاعات
        // يلاحق كل تصنيف) - تفتح دايماً بمكان أعلى القوس كله بهامش أمان،
        // فمستحيل تتقاطع مع أي فقاعة تصنيف بغض النظر عن التصنيف المختار
        // أو حجم الشاشة (القوس نفسه ثابت الهندسة دايماً، ما يتغير)
        if (RADIAL_STATE.catIndex !== null) {
            const catNode = nodes[RADIAL_STATE.catIndex];

            panelHeader.innerHTML =
                '<div class="yt-panel-icon">' + catNode.glyph + '</div>' +
                '<div class="yt-panel-title">' + catNode.label + '</div>';

            panelList.innerHTML = "";
            const rowTargets = [];
            catNode.tools.forEach((tool, i) => {
                const row = document.createElement("div");
                row.className = "yt-tool-row";
                row.style.opacity = "0";
                row.style.transform = "translateX(14px)";
                row.style.transitionDelay = (i * 26) + "ms";
                row.innerHTML = '<span class="yt-dot"></span><span>' + tool.name + '</span>';
                row.onclick = () => runToolFromRadial(tool);
                panelList.appendChild(row);
                rowTargets.push(row);
            });

            panel.classList.add("yt-open");
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    rowTargets.forEach(el => {
                        el.style.opacity = "1";
                        el.style.transform = "translateX(0)";
                    });
                });
            });
        } else {
            panel.classList.remove("yt-open");
        }
    }

    // اختصارات لوحة المفاتيح: كل عنصر يفتح أداة معيّنة (بالـid تبعها) مباشرة
    // بدل فتح القائمة والبحث عنها يدوياً. نستخدم "code" (يمثّل المفتاح
    // الفعلي بالكيبورد، مثل "KeyA") لا "key" - لأن Alt/Option على Mac يغيّر
    // القيمة اللي يرجّعها "key" لحرف مختلف كلياً (Option+A مثلاً يرجّع "å"
    // مو "a")، بينما "code" يبقى ثابت بغض النظر عن نظام التشغيل أو تأثير
    // المفاتيح المُعدِّلة. لإضافة اختصار جديد مستقبلاً، ضيف سطر جديد بنفس
    // الشكل: { alt, ctrl, shift, code, toolId } - كود المفتاح لأي حرف هو
    // "Key" + الحرف بالإنجليزي كبير (مثال: زر B = "KeyB")
    const SHORTCUTS = [];

    // ============================================================
    // صلاحيات المستخدم: أي أداة مسجّلة عبر add() ما تظهر بالقائمة إلا لو
    // مفتاحها موجود ضمن القائمة اللي يرجّعها الـAPI لهذا المستخدم. الحالة
    // الافتراضية (قبل ما نتأكد من الصلاحيات، أو لو فشل الطلب) هي "ما فيه
    // أدوات ظاهرة إطلاقاً" - أأمن خيار افتراضي.
    // ============================================================

    const PERMISSIONS_API_URL = "https://api.yaqeen-vip.space/api/tools";
    // رقم إصدار الحزمة المثبتة فعلياً عند هذا الموظف (يوفّره Tampermonkey
    // تلقائياً من @version) - يُرسل مع كل طلب صلاحيات عشان الأدمن يقدر يشوف
    // بلوحة التحكم مين لسا على نسخة قديمة
    const SCRIPT_VERSION = (typeof GM_info !== "undefined" && GM_info.script && GM_info.script.version) || "unknown";
    const PERMISSIONS_CACHE_KEY = "yaqeen_tool_permissions";
    const PERMISSIONS_CACHE_MS = 60 * 1000; // دقيقة وحدة - سحب صلاحية موظف يتطبق بسرعة معقولة

    // ============================================================
    // اختيار جلسة الواتساب النشطة (لو فيه أكثر من رقم مربوط بالبوت) - إعداد
    // عام واحد يطبّق على كل الأدوات اللي ترسل واتساب، مخزّن محلياً بنفس
    // الجهاز/المتصفح. القيمة الافتراضية "main" لو الموظف ما اختار شي بعد
    // ============================================================
    const ACTIVE_SESSION_KEY = "yaqeen_active_wa_session";

    function getActiveSessionId() {
        try {
            return localStorage.getItem(ACTIVE_SESSION_KEY) || "main";
        } catch (err) {
            return "main";
        }
    }

    function setActiveSessionId(id) {
        try {
            localStorage.setItem(ACTIVE_SESSION_KEY, id);
        } catch (err) { /* تجاهل */ }
        HOST_WINDOW.YAQEEN_TOOLS.activeSessionId = id;
        updateSessionBadge();
    }

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
            return cached;
        } catch (err) {
            return null;
        }
    }

    function writeCachedPermissions(tools, sessionToken, sessionExpiresAt, waSessions) {
        try {
            sessionStorage.setItem(PERMISSIONS_CACHE_KEY, JSON.stringify({
                tools: tools,
                sessionToken: sessionToken,
                sessionExpiresAt: sessionExpiresAt,
                waSessions: waSessions,
                timestamp: Date.now(),
            }));
        } catch (err) { /* تجاهل */ }
    }

    /** يحدّث شكل شارة اختيار الجلسة (تختفي لو جلسة واحدة بس أو لو ما اتخلقت الواجهة بعد) */
    function updateSessionBadge() {
        const badge = document.getElementById("yt-session-badge");
        if (!badge) return;
        const available = HOST_WINDOW.YAQEEN_TOOLS.availableSessions || [];
        if (available.length < 2) {
            badge.style.display = "none";
            return;
        }
        badge.style.display = "block";
        badge.textContent = "📶 " + HOST_WINDOW.YAQEEN_TOOLS.activeSessionId;
    }

    function applyAllowedTools(tools, sessionToken, sessionExpiresAt, waSessions) {
        HOST_WINDOW.YAQEEN_TOOLS.allowedTools = Array.isArray(tools) ? tools : [];
        HOST_WINDOW.YAQEEN_TOOLS.permissionsLoaded = true;
        // توكن الجلسة يُستخدم بدل المفتاح الثابت القديم بطلبات /send و/ai-chat -
        // نحدّثه بس لو رجع وحدة جديدة (نتفادى مسحه بالغلط لو صار خطأ اتصال)
        if (sessionToken) {
            HOST_WINDOW.YAQEEN_TOOLS.sessionToken = sessionToken;
            HOST_WINDOW.YAQEEN_TOOLS.sessionExpiresAt = sessionExpiresAt || 0;
        }
        if (Array.isArray(waSessions)) {
            HOST_WINDOW.YAQEEN_TOOLS.availableSessions = waSessions;
            // لو الجلسة النشطة المخزّنة سابقاً ما عادت موجودة (اتحذفت من لوحة
            // التحكم مثلاً)، نرجع تلقائياً لـ"main" أو أول جلسة متاحة
            const current = getActiveSessionId();
            if (waSessions.length && waSessions.indexOf(current) === -1) {
                setActiveSessionId(waSessions.indexOf("main") !== -1 ? "main" : waSessions[0]);
            } else {
                HOST_WINDOW.YAQEEN_TOOLS.activeSessionId = current;
            }
            updateSessionBadge();
        }
        HOST_WINDOW.YAQEEN_TOOLS.refresh();
    }

    /**
     * يستدعى عند تشغيل الـCore، وبعدها دورياً (setInterval بالأسفل) - يجيب
     * صلاحيات المستخدم + توكن جلسة جديد ويطبّقهم على القائمة. التكرار الدوري
     * ضروري عشان يجدد توكن الجلسة قبل ما ينتهي (صالح 4 ساعات من طرف السيرفر)
     * لو الموظف سايب التبويب مفتوح لمدة طويلة بدون إعادة تحميل
     */
    function loadUserPermissions() {
        const cached = readCachedPermissions();
        if (cached) {
            applyAllowedTools(cached.tools, cached.sessionToken, cached.sessionExpiresAt, cached.waSessions);
            return;
        }

        resolveUserEmail(function (email) {
            if (!email) {
                // ما لقينا الإيميل هالمرة (مثلاً زر القائمة لسا ما ترسم
                // بالصفحة) - نعيد المحاولة بدل ما نفشل نهائياً
                setTimeout(loadUserPermissions, 1000);
                return;
            }

            postJson(PERMISSIONS_API_URL, { email: email, scriptVersion: SCRIPT_VERSION }).then(data => {
                if (!data || data.success !== true || !Array.isArray(data.tools)) {
                    // فشل الاتصال أو success:false - ما نخزّن هذي النتيجة بالكاش
                    // (حتى تتاح إعادة محاولة حقيقية بأقرب تحميل صفحة)، وما نظهر أي أداة
                    applyAllowedTools([]);
                    return;
                }
                writeCachedPermissions(data.tools, data.sessionToken, data.sessionExpiresAt, data.waSessions);
                applyAllowedTools(data.tools, data.sessionToken, data.sessionExpiresAt, data.waSessions);
            });
        });
    }


    HOST_WINDOW.YAQEEN_TOOLS = {

        tools: [],
        allowedTools: [],
        permissionsLoaded: false,
        sessionToken: "",
        sessionExpiresAt: 0,
        activeSessionId: getActiveSessionId(),
        availableSessions: [],


        add(tool){

            if(!tool.id) return;

            if(this.tools.find(t=>t.id === tool.id))
                return;


            this.tools.push(tool);


            this.refresh();

        },


        refresh(){

            renderRadialMenu();

        }

    };



    function createUI(){


        if(document.getElementById("yt-fab"))
            return;


        // خط Tajawal - يُحمَّل مرة وحدة هنا (الـCore يشتغل أول شي دايماً) عشان
        // كل الأدوات الثانية تقدر تستخدمه مباشرة بدون ما كل وحدة تحمّله لحالها
        if (!document.getElementById("yt-font-tajawal")) {
            const fontLink = document.createElement("link");
            fontLink.id = "yt-font-tajawal";
            fontLink.rel = "stylesheet";
            fontLink.href = "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap";
            document.head.appendChild(fontLink);
        }


        // زر الليمونة العائم

        const fab = document.createElement("div");
        fab.id = "yt-fab";
        fab.innerHTML = '<img src="' + LIME_IMAGE_DATA_URL + '" alt="أدوات يقين">';
        document.body.appendChild(fab);


        // الستارة الخلفية - تظهر خلف الفقاعات، والضغط عليها يقفل القائمة كاملة

        const scrim = document.createElement("div");
        scrim.id = "yt-scrim";
        document.body.appendChild(scrim);


        // حلقة التصنيفات/الأدوات المستقلة - مرساة عند نفس نقطة مركز زر
        // الليمونة (تُحسب مواقع الفقاعات كإزاحة عن هذي النقطة داخل
        // renderRadialMenu)

        const catsLayer = document.createElement("div");
        catsLayer.id = "yt-cats";
        document.body.appendChild(catsLayer);

        // لوحة أدوات التصنيف المفتوح - عنصر واحد ثابت الموضع (بدل عمود
        // فقاعات يلاحق كل تصنيف)، يفتح دايماً أعلى قوس التصنيفات كله بهامش
        // أمان، فمستحيل تتقاطع مع أي فقاعة تصنيف مهما كان التصنيف المختار

        const toolPanel = document.createElement("div");
        toolPanel.id = "yt-tool-panel";

        const toolPanelHeader = document.createElement("div");
        toolPanelHeader.id = "yt-tool-panel-header";
        toolPanel.appendChild(toolPanelHeader);

        const toolPanelList = document.createElement("div");
        toolPanelList.id = "yt-tool-panel-list";
        toolPanel.appendChild(toolPanelList);

        document.body.appendChild(toolPanel);


        // شارة اختيار جلسة الواتساب النشطة - تظهر بس لو فيه أكثر من رقم
        // واحد مربوط بالبوت حالياً. الضغط عليها يدور على الجلسات المتاحة

        const sessionBadge = document.createElement("div");
        sessionBadge.id = "yt-session-badge";
        sessionBadge.onclick = () => {
            const available = HOST_WINDOW.YAQEEN_TOOLS.availableSessions || [];
            if (available.length < 2) return;
            const idx = available.indexOf(HOST_WINDOW.YAQEEN_TOOLS.activeSessionId);
            const next = available[(idx + 1) % available.length];
            setActiveSessionId(next);
        };
        document.body.appendChild(sessionBadge);
        updateSessionBadge();


        // التصميم

        const style = document.createElement("style");
        style.innerHTML = `

        #yt-fab{
            position:fixed;
            right:62px;
            bottom:92px;
            width:74px;
            height:74px;
            border-radius:50%;
            overflow:hidden;
            cursor:pointer;
            border:3px solid #fff;
            box-shadow:0 8px 22px rgba(20,30,0,.28);
            transition:transform .4s cubic-bezier(.34,1.4,.5,1),box-shadow .3s;
            z-index:100000000;
        }

        #yt-fab.yt-open{
            transform:rotate(45deg) scale(.92);
            box-shadow:0 10px 30px rgba(0,0,0,.35);
        }

        #yt-session-badge{
            display:none;
            position:fixed;
            right:62px;
            bottom:172px;
            background:#1d2610;
            color:#eef4e2;
            font:600 11px Tajawal,Arial,sans-serif;
            padding:5px 12px;
            border-radius:999px;
            cursor:pointer;
            box-shadow:0 4px 12px rgba(0,0,0,.25);
            white-space:nowrap;
            z-index:100000000;
        }

        #yt-fab img{
            width:100%;
            height:100%;
            object-fit:cover;
            display:block;
        }

        #yt-scrim{
            position:fixed;
            inset:0;
            background:rgba(20,26,10,.30);
            backdrop-filter:blur(2px);
            opacity:0;
            pointer-events:none;
            transition:opacity .3s;
            z-index:99999997;
        }

        #yt-scrim.yt-open{
            opacity:1;
            pointer-events:auto;
        }

        #yt-cats{
            position:fixed;
            right:99px;
            bottom:129px;
            width:0;
            height:0;
            z-index:99999998;
        }

        .yt-cat-orb{
            position:absolute;
            left:0;
            top:0;
            cursor:pointer;
            transition:transform .42s cubic-bezier(.34,1.56,.64,1),opacity .28s;
        }

        .yt-cat-orb-inner{
            width:92px;
            height:92px;
            border-radius:50%;
            display:flex;
            flex-direction:column;
            align-items:center;
            justify-content:center;
            gap:5px;
            background:#fff;
            color:#1d2610;
            border:1.5px solid rgba(140,197,0,.5);
            box-shadow:0 5px 14px rgba(29,38,16,.10);
            transition:background .2s,color .2s,box-shadow .2s,border-color .2s,transform .18s cubic-bezier(.34,1.56,.64,1);
            font-family:Tajawal,Arial,sans-serif;
            text-align:center;
        }

        .yt-cat-orb-inner:hover{
            transform:scale(1.06);
        }

        .yt-cat-orb-inner.yt-selected{
            background:${THEME};
            color:#12170c;
            border-color:${THEME};
            box-shadow:0 8px 20px rgba(140,197,0,.5);
        }

        .yt-cat-orb-glyph{
            font-size:24px;
            line-height:1;
        }

        .yt-cat-orb-label{
            font:600 10.5px/1.2 Tajawal,Arial,sans-serif;
            text-align:center;
            max-width:74px;
            white-space:normal;
        }

        #yt-tool-panel{
            position:fixed;
            right:24px;
            bottom:380px;
            width:min(320px,calc(100vw - 48px));
            max-height:min(440px,calc(100vh - 404px));
            background:#fff;
            border-radius:22px;
            border:1px solid #e9e7df;
            box-shadow:0 24px 48px -12px rgba(20,18,12,.35);
            overflow:hidden;
            display:flex;
            flex-direction:column;
            transform-origin:right bottom;
            transform:scale(.9) translateY(14px);
            opacity:0;
            pointer-events:none;
            transition:opacity .28s ease,transform .36s cubic-bezier(.34,1.56,.64,1);
            z-index:99999998;
        }

        #yt-tool-panel.yt-open{
            transform:scale(1) translateY(0);
            opacity:1;
            pointer-events:auto;
        }

        #yt-tool-panel-header{
            padding:16px 20px;
            display:flex;
            align-items:center;
            gap:10px;
            background:linear-gradient(100deg,${THEME},#b8ec52);
            flex-shrink:0;
        }

        #yt-tool-panel-header .yt-panel-icon{
            width:34px;
            height:34px;
            border-radius:10px;
            background:rgba(255,255,255,.55);
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:17px;
            flex-shrink:0;
        }

        #yt-tool-panel-header .yt-panel-title{
            font:800 15px Tajawal,Arial,sans-serif;
            color:#3c4a10;
        }

        #yt-tool-panel-list{
            overflow-y:auto;
            padding:8px;
        }

        .yt-tool-row{
            display:flex;
            align-items:center;
            gap:10px;
            padding:11px 12px;
            border-radius:12px;
            cursor:pointer;
            font:600 13.5px Tajawal,Arial,sans-serif;
            color:#1c1c1a;
            transition:background .12s ease,opacity .3s ease,transform .32s cubic-bezier(.34,1.56,.64,1);
        }

        .yt-tool-row:hover{
            background:#f1f0ea;
        }

        .yt-tool-row .yt-dot{
            width:7px;
            height:7px;
            border-radius:50%;
            background:linear-gradient(160deg,${THEME},#79a916);
            flex-shrink:0;
            transition:transform .18s cubic-bezier(.34,1.56,.64,1);
        }

        .yt-tool-row:hover .yt-dot{
            transform:scale(1.35);
        }

        `;
        document.head.appendChild(style);


        // الضغط على الليمونة يفتح/يقفل القائمة، وأي طلب فتح جديد يصفّر
        // التصنيف المختار سابقاً (زي زر التصنيفات بالتصميم الأصلي)

        fab.onclick = () => {
            RADIAL_STATE.open = !RADIAL_STATE.open;
            RADIAL_STATE.catIndex = null;
            renderRadialMenu();
        };

        scrim.onclick = () => {
            closeRadialMenu();
        };


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
    // تحديث دوري كل 20 دقيقة - يجدد توكن الجلسة قبل انتهاءه (صالح 4 ساعات)
    // لو الموظف سايب التبويب مفتوح لمدة طويلة بدون إعادة تحميل الصفحة
    setInterval(loadUserPermissions, 20 * 60 * 1000);


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
        // المستخدم غير مصرّح له فيها، حتى لو مسجّلة بالـCore (إلا لو التجاوز
        // المحلي مفعّل)
        if (!isShowAllEnabled() && HOST_WINDOW.YAQEEN_TOOLS.allowedTools.indexOf(match.toolId) === -1) return;

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
