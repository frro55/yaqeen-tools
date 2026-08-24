// ==UserScript==
// @name         Yaqeen Tools - الكل بملف واحد
// @namespace    https://yaqeen.lumirental.com/
// @version      2026.0824.0003
// @description  حزمة موحّدة تجمع كل أدوات يقين (Core + كل الأدوات) بملف تثبيت واحد
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      api.yaqeen-vip.space
// @connect      cdn.lumirental.com
// @connect      mpos.geidea.net
// @connect      ycguqfilerlkrukiykiy.supabase.co
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

// ============================================================
// ملف مُولَّد آلياً بدمج كل ملفات source/*.user.js بمصدر واحد.
// لا تعدّل هذا الملف مباشرة - عدّل الملف الأصلي المقابل بمجلد source وأعد
// التوليد (bash build-bundle.sh) وارفع الناتج على الـVPS.
// ترتيب الدمج: Core أولاً (يبني YAQEEN_TOOLS)، ثم بقية الأدوات.
// ============================================================

// ============================================================
// المصدر: source/yaqeen-core.user.js
// ============================================================

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
    const LIME_IMAGE_DATA_URL = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBw0PDRAOEQ4VFRANDxMNDRANDQ8ODg0RFxIWFhUVFRYYHCghGBomJxUVIT0iJSkrLi8vFx8/ODMtODQtLisBCgoKDg0OGhAQGyslIB0tLS0vLS0wLS0tKy0tKy0tLS0tLS0tLS0tLS0tLSstLS0tLSstLS0tLS0tLS0tLS0rLf/AABEIAMgAyAMBEQACEQEDEQH/xAAbAAEAAgMBAQAAAAAAAAAAAAAABQYBAwQCB//EADwQAAIBAgIGBAwFBAMAAAAAAAABAgMRBAUGEiExUWEiMkFxExY0U3KBkqGxwdHwQoKRk+FSsuLxI2Oj/8QAGwEBAAIDAQEAAAAAAAAAAAAAAAEEAwUGAgf/xAApEQEAAgEDAwMFAAMBAAAAAAAAAQIDBAUREiExEzJBFTRRUmEWM3Ei/9oADAMBAAIRAxEAPwCxnzRSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAniQIAAAAAAAAAAAAAAAAAAAAAAAAAEx5PDtyjAPEVVD8K6VR8I33F7b9JOoy8fEPdK8yudXK6Eqfg/BpRtZWSTjzT4nX20GG2Po47LE1iVMzXLZ4eeq9sX1J9kv5OQ1uivprfxXvWYcRR7vETyACAAAAAAAAAAAAAAAAAAAAAAJiOZ4OOZXnR/AeBoK66dTpT4rgvUdvtmljDh/srVI4hKGy8PbRjMLCrBwmrp/quaMOo09c1Om0ImIlR81y2eHnZ7YvqT49/M4rXaG+nvxPhXvTpcJQ+WMAAAAAAAAAAAAAAAAAAAAAAkMhwnhcRGLXRj/wAku5fzb3mx2zT+rqIj4h7pHMr6juY8cLTJIAaMXhYVYOE1dP3c0YM+CmanTZExyo2bZZPDzs9sH1JceT5nF67QW01v5+Va9OHCUO7wACAAAAAAAAAAAAAAAAAAAFq0Ow9oVKnbKWou5f79x1WxYeKTf8rGKOyyHQMoSAGCBpxWGhVg4TV4yMWfBTNTpsiY5UfNssnh52e2EupPjyfM4vXaG+ntx8K96dLgNcxgAAAAAAAAAAAAAAAAAACBfNH6Wrhaa4rW/V3+Z3W2U6NNWFqkdkibB7ZJAdgAEDRisPCrBwmrxkYs+GmWvTaETHKkZvlc8PPjCT6E/k+Zxev0F9Nfn4lWvThHmueAAAAAAAAAAAAAAAAAAE190JfQI1oUMNGUnaMKcV7kjvqZa4MEWt44W+eIQ1TSxXerQuuxyqar/Szsae+/1if/ADTlinK8+Nr8x/6f4nj/ACCf0R6zHjZLzC/cf0H+QT+h6zHjZPzK9t/Qj6/b9D1mPGup5le2/oR9ft+p6zHjXU81H2mR9fv+p6zTidIpVYuE6MXGS2q7+0Yc28Tlr02qicnKEZpJYgAAAAAAAAAAAAAAAAAHqnuhMLRpY34Gjbq329+rs+Z028TMYKdPhmyTPCrnLsHkAAAAAASBAAAAAAAAAAAAAAAAAAAmvmEr+qEMRhoRmrqdOL2b07LajvK4aajBEX/C1xFoQdTRSd+jVVuy8Wn8TS32G3PNbMXpd3nxUqedj7LPP0G/7Hos+KlTzy9l/Un6Bb9j0WfFOfnl7D+o+gW/Y9FnxTl59ft/yT9At+56LPim/Pr9r/In6BPHuT6TTi9HI0oOc8Qkl/1b+XWMWbZq4adV7onH/UA/dz+ZoZYQgAAAAAAAAAAAAAAAAAC96O1dfC0+MU4P1O30O62vJ16aq1SeySNg9skgAIGB2GnF4mFKDnN2jH7sYc+euGs3vKJnhRs2zKeInd7ILqR4c+84vXa6+pv/ABWvblwlB45Le772jpAgETET8HkH/TkIAAAAAAAAAAAAALPodidlSlwfhI/B/L9Tp9izcxONYwz2WY6RlZAAYI57DTisTClBzm7KO8w5s1MNeu6JnhR82zOeInd7IR6keHN8zi9drr6m/wDFa1+XAa/u8RDfgsJOtNQgtva+yK4staXS3z26Yeq15lP51l8MPg1GO9zi5ye+Tszea7R0waTiPLLevFVZOZ+GBLaM04yxGq1dSpyTT2prYbbacdb5eLMmKOZM8yeVCWvG7pN7H2w5Pl99/rcdttgnqp7U3pwiTUMUBAAAAAAAAAAAADsyjF+Brwn2X1Z+i97++Be0Go9DNW3w90niX0FPYd3E8xytBPfkANOKxEKUHObtGP3sMWfPTDWb3nsiZUfN8zniJ33Qj1I8Ob5nF6/XW1N/4rWt1OA1/EzLxMt+Cwk601CC2vfwiuLLGm0989+ir1WvK85Xl0KFPVirt7Zye+TO10ekppqcQs1rxDi0t8m/PH5lPevt5ecntUw41W+Uvor5UvRkbjZfuYZMXuXOpTjKLi1dNWae1M7C9IvXiyzPdTM8yaVB68buk366fJ8vvv4/cdttht1V9qveiINQxchAAAAAAAAAAAAkntK56MZh4Wj4Nvp0rLvj2P5HY7Rq/VxdE+arVJ5hNG4e2nFYmFKDnN2jHezFmzVw16rImeFIzfNJ4id90I9SPzfM4vX662pv/Fe9upHmu+WPy3YPCzrTVOCu3+iXFljT6e+e/TRNa8rzlWXQw8NVbZPbOT3yZ22i0VdNTiPPzK1WvDuLnZ6Qulnkv54mo3r/AEPGT2qYcYq/KX0W8rj6MvgbbZvuYZMXuXY7VZealNSTi1dNWae5ni9K3jpknupme5M6Dc4Juk364cny++/kNy222C3XTwr3pwhzTsUBAAAAAAAAAAAngl0YDFyo1Y1I71vW7WXai1pdTbBli0PVbcLrHOMM6fhPCK1rtNrWWzdbidjG44Ojr5WeuFSzjNJ4ifCEX0I/N8/vv5bX6+2ptx8K978o81zw3YXDTqzUIK8n7ubM2nwXz36KvUV5XjKcthh4WW2T68u1v6HbaLRU09OI8rFa8O8uvYT8nwhtLPJfzxNRvP28seX2qWcWrfKW0X8rh6MvgbbZvuasmL3LwdqsgHipBSTi1dNWae1M8XpF68WOOVMz3JnQbqQV6Tfrp8nyOR3LbJxT108K96Ic0rFyEgQAAAAAAAASEo4BE8djuEHLbhsPOrNQgryl7jPgwXz36aPVY5XjKMshh4WW2b68rbW/odrodDXTV/vysVrwkC89gGSRC6WeSv04/E1G8/byx5fapZxasldGPK4d0v7WbXZ/uasmL3LydssgGAPM4KSaaumrNPameL0raOJJjlTc9yV0W6kFek3t40/4OS3LbZwz14/CvenCGNIxQAAAAAAAAAAAABctFcPTVBVFtnO6m+1We47HZcOOMPXHmfKzjiOE2blkZJADAEPpX5K/Sj8TUbz9vLHk9qlHFqyU0Z8sp90v7WbTZ/uasmP3L0dusgGCAJGuu4qMta2rZ62ta1udzFmmvRPUT2h85r6uvLV6us9T0b7D59m6euePCnPl4MSAAAAAAAAAAAAdOBx9WhLWhK198XtjLvRb02syaeeay9VtNVsy3SCjVtGT1J8JPovuZ1Ol3bFm7T2lnpkiUwmbaJifDIySMAROk1Nyws7fhak+5Paavd8c2088PGT2qQcQqpbReDeLi1uipSfday+Jt9mpM6mJZMfuXg7RZAMECNzHOaFC6ctaf9Edr9fA1+q3HDg+eZ/Dza8QqeZ5rVxD6TtDshG9uV+Jyus3DJqJ7z2/Cva8y4Chy8cBAAAAAAAAAAAAAAETwO7BZtiKNlGfRX4Z9KPdy9Rf0+458Piez3W8wm8LpVF7KlNrnB6yfq7DdYN9pb3xwyxlSlHOsLPdVS9O8PibLHuent4s99UOqNanNbJRaezY00yz6uK8ccwnmENiNGKEpXjNxT26qs0u41GXZ8F7c1nh4nHEu/AYKhhotJrb1pTktZ95e0+DBpa9uOXqtYh6rZvhYb60fyvWfuPV9x09PNibRCNxOlNJbIQcnxfQia/NvlK+yOXicqExue4mrs1tWP8ATTuvfvNNqN0zZfE8MdssyjTWTabTzLH5CAAAAAAAAAAAAAAAAAAAAnmYO4T12/KeZCeu/wCZRzIR1T+TvIRMzJ3COAHY7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB/9k=";

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
    const RADIAL_TOOL_ROW_GAP = 58;
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
        const toolsLayer = document.getElementById("yt-tools-ring");
        if (!fab || !scrim || !catsLayer || !toolsLayer) return;

        const nodes = buildRadialNodes();

        // لو الصلاحيات تغيّرت وصار التصنيف المفتوح ما عاد موجود، نقفل حلقة الأدوات
        if (RADIAL_STATE.catIndex !== null && (!nodes[RADIAL_STATE.catIndex] || nodes[RADIAL_STATE.catIndex].type !== "category")) {
            RADIAL_STATE.catIndex = null;
        }

        fab.classList.toggle("yt-open", RADIAL_STATE.open);
        scrim.classList.toggle("yt-open", RADIAL_STATE.open);

        catsLayer.innerHTML = "";
        toolsLayer.innerHTML = "";

        nodes.forEach((node, i) => {
            // نعكس ترتيب المواقع على القوس (بدون ما نغيّر ترتيب العقد نفسه
            // ولا catIndex): أول عقدة (الأسطول) تاخذ أبعد زاوية (أعلى نقطة،
            // أبعد عن الزر)، وآخر عقدة (أدوات أخرى) تاخذ أقرب زاوية للزر
            const posIndex = nodes.length - 1 - i;
            const deg = RADIAL_BASE_DEG + posIndex * RADIAL_CAT_STEP_DEG;
            const [dx, dy] = radialPoint(deg, RADIAL_CAT_RADIUS);

            const orb = document.createElement("div");
            orb.className = "yt-cat-orb";
            orb.style.transform = RADIAL_STATE.open
                ? "translate(-50%,-50%) translate(" + dx + "px," + dy + "px)"
                : "translate(-50%,-50%) scale(.4)";
            orb.style.opacity = RADIAL_STATE.open ? "1" : "0";
            orb.style.pointerEvents = RADIAL_STATE.open ? "auto" : "none";
            orb.style.transitionDelay = (i * 50) + "ms";

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

        if (RADIAL_STATE.catIndex !== null) {
            // نقطة الانطلاق = موقع فقاعة التصنيف نفسها بالضبط (نفس زاويتها)،
            // بس من هناك تطلع الأدوات بعمود عمودي صافي (فوق بعض بالضبط، x
            // ثابت) بدل ما تكمل بنفس الخط المائل - كذا كل تصنيف يفتح أدواته
            // من جهته الصحيحة، وبنفس الوقت العمود نفسه مستقيم عمودي مو مايل
            const catNode = nodes[RADIAL_STATE.catIndex];
            const list = catNode.tools;
            const catPosIndex = nodes.length - 1 - RADIAL_STATE.catIndex;
            const catDeg = RADIAL_BASE_DEG + catPosIndex * RADIAL_CAT_STEP_DEG;
            // نزيح نقطة انطلاق العمود لليسار مرة وحدة بس (مو تدريجياً) حتى
            // يقف العمود فوق يسار الفقاعة (مو فوقها مباشرة) ويبعد عن فقاعات
            // التصنيفات الثانية، وبعدها يطلع للأعلى بخط عمودي صافي (x ثابت
            // لكل الصفوف، مافيه أي ميلان)
            const [catDxRaw, catDy] = radialPoint(catDeg, RADIAL_CAT_RADIUS);
            const catDx = catDxRaw - 60;
            const startDy = catDy - 70;

            list.forEach((tool, i) => {
                const dx = catDx;
                const dy = startDy - i * RADIAL_TOOL_ROW_GAP;

                const pill = document.createElement("div");
                pill.className = "yt-tool-pill";
                pill.style.transform = "translate(-50%,-50%) translate(" + dx + "px," + dy + "px)";
                pill.style.transitionDelay = (i * 45) + "ms";
                pill.innerHTML = '<span>' + tool.name + '</span><span class="yt-dot"></span>';
                pill.onclick = () => runToolFromRadial(tool);

                toolsLayer.appendChild(pill);
            });
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


        // حلقة التصنيفات/الأدوات المستقلة، وحلقة أدوات التصنيف المفتوح -
        // كلتاهما مرساة عند نفس نقطة مركز زر الليمونة (تُحسب مواقع الفقاعات
        // كإزاحة عن هذي النقطة داخل renderRadialMenu)

        const catsLayer = document.createElement("div");
        catsLayer.id = "yt-cats";
        document.body.appendChild(catsLayer);

        const toolsLayer = document.createElement("div");
        toolsLayer.id = "yt-tools-ring";
        document.body.appendChild(toolsLayer);


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
            opacity:0;
            pointer-events:none;
            transition:opacity .3s;
            z-index:99999997;
        }

        #yt-scrim.yt-open{
            opacity:1;
            pointer-events:auto;
        }

        #yt-cats, #yt-tools-ring{
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
            transition:transform .4s cubic-bezier(.2,1.3,.4,1),opacity .28s;
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
            transition:background .2s,color .2s,box-shadow .2s,border-color .2s;
            font-family:Tajawal,Arial,sans-serif;
            text-align:center;
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

        .yt-tool-pill{
            position:absolute;
            left:0;
            top:0;
            cursor:pointer;
            display:flex;
            align-items:center;
            justify-content:flex-end;
            gap:10px;
            background:#1d2610;
            border-radius:999px;
            padding:10px 18px 10px 15px;
            box-shadow:0 6px 16px rgba(0,0,0,.28);
            white-space:nowrap;
            max-width:min(80vw,340px);
            overflow:hidden;
            text-overflow:ellipsis;
            font:500 15px Tajawal,Arial,sans-serif;
            color:#eef4e2;
            transition:transform .38s cubic-bezier(.2,1.3,.4,1);
        }

        .yt-tool-pill span:first-child{
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
        }

        .yt-tool-pill .yt-dot{
            width:8px;
            height:8px;
            border-radius:50%;
            background:${THEME};
            flex-shrink:0;
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

// ============================================================
// المصدر: source/yaqeen-fleet-inventory.user.js
// ============================================================

(function () {

    'use strict';

    var GROUP_COLUMN_HINT = ['المجموعة', 'Group'];
    var lastBranch = null;

    function waitCore() {

        var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }

        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "fleet-inventory",
            name: "🚗 جرد الأسطول",
            run() {
                chooseBranch();
            }
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

    // ==========================================================
    // اختيار الفرع
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-btn{width:100%;padding:13px;margin-top:10px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:15px;font-weight:800;font-family:inherit;}' +
        '.yq-btn-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;' +
        'box-shadow:0 8px 16px -8px rgba(121,169,22,.55);}' +
        '.yq-btn-secondary{background:#f1f0ea;color:#767068;}' +
        '.yq-spinner{width:30px;height:30px;border:3px solid #A3E635;border-left-color:transparent;' +
        'border-radius:50%;margin:0 auto 14px;animation:yq-spin .8s linear infinite;}' +
        '@keyframes yq-spin{to{transform:rotate(360deg);}}' +
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
        if (document.getElementById('yq-shared-styles-fleet-inventory')) return;
        var style = document.createElement('style');
        style.id = 'yq-shared-styles-fleet-inventory';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    function chooseBranch() {

        document.getElementById("fleet-box")?.remove();
        injectYqStyles();

        let box = document.createElement("div");
        box.id = "fleet-box";
        box.className = "yq-overlay";

        box.innerHTML = `
        <div class="yq-card" style="max-width:300px;">

        <h3>🚗 جرد الأسطول</h3>

        <button id="airport" class="yq-menu-btn">✈️ المطار</button>
        <button id="yard" class="yq-menu-btn">🏢 الساحة</button>
        <button id="all" class="yq-menu-btn">📍 الكل</button>

        <button id="cancel" class="yq-btn yq-btn-secondary">إلغاء</button>
        </div>
        `;

        document.body.appendChild(box);

        box.querySelector("#cancel").onclick = () => box.remove();

        // ملاحظة: لازم نفتح النافذة المنبثقة بشكل متزامن هنا (داخل onclick مباشرة)
        // بدون أي await قبلها، وإلا يحظرها المتصفح كنافذة منبثقة غير مرغوبة.
        box.querySelector("#airport").onclick = () => start(29);
        box.querySelector("#yard").onclick = () => start(53);
        box.querySelector("#all").onclick = () => start("29,53");

    }

    // ==========================================================
    // التنفيذ: نافذة منبثقة بدل مغادرة الصفحة الحالية
    // ==========================================================

    function start(branch) {

        lastBranch = branch;
        document.getElementById("fleet-box")?.remove();

        const url = `/rental/vehicles/ready?currentLocationIds=${branch}&pageSize=500`;
        const frame = openHiddenFrame(url);

        showLoading("جارٍ تحميل بيانات الأسطول...");

        waitForFirstFrame(frame)
            .then(() => {
                showLoading("جارٍ تغيير لغة الصفحة إلى الإنجليزية...");
                return changeLanguage(frame, "English");
            })
            .then(() => waitForFirstFrame(frame))
            .then(doc => {
                showLoading("جارٍ جمع كل صفحات الجدول...");
                return collectAllPages(frame, doc);
            })
            .then(rows => {
                showLoading("جارٍ إرجاع لغة الصفحة إلى العربية...");
                // نرجّع اللغة عربي جوّا نفس الـiframe قبل ما نشيله، عشان لغة النظام
                // عندك (بالتبويب الأصلي) ما تظل عالقة إنجليزي بعد استخدام الأداة
                return changeLanguage(frame, "العربية").then(() => rows);
            })
            .then(rows => {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                if (!rows.length) {
                    showMessage("لم يتم العثور على جدول الجرد");
                    return;
                }
                document.getElementById("fleet-box")?.remove();
                printFleet(rows);
            })
            .catch(err => {
                try { frame.remove(); } catch (err2) { /* تجاهل */ }
                showMessage("تعذّر جلب بيانات الجرد: " + err.message);
            });

    }

    // ==========================================================
    // جلب البيانات عبر iframe مخفي (بدون نافذة منبثقة)
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;";
        document.body.appendChild(iframe);
        return iframe;
    }

    function findDataTable(doc) {
        const tables = Array.prototype.slice.call(doc.querySelectorAll("table"));
        if (tables.length === 0) return null;

        function headerMatches(table) {
            const headerCells = Array.prototype.slice.call(table.querySelectorAll("thead tr th, thead tr td"));
            const normalizedVariants = GROUP_COLUMN_HINT.map(normalizeArabic);
            return headerCells.some(cell => {
                const text = normalizeArabic(cell.textContent);
                return normalizedVariants.some(v => text.indexOf(v) !== -1);
            });
        }

        const matching = tables.filter(headerMatches);
        const candidates = matching.length > 0 ? matching : tables;

        let best = null;
        let bestCount = -1;
        candidates.forEach(t => {
            const count = t.querySelectorAll("tbody tr").length;
            if (count > bestCount) {
                best = t;
                bestCount = count;
            }
        });
        return best;
    }

    function waitForFirstFrame(iframe, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function check() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال التحميل"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
                    return;
                }
                if (!doc || doc.readyState !== "complete") {
                    if (Date.now() - start > timeoutMs) {
                        resolve(doc || null);
                        return;
                    }
                    setTimeout(check, 300);
                    return;
                }
                const table = findDataTable(doc);
                const hasRows = table && table.querySelectorAll("tbody tr").length > 0;
                if (hasRows || Date.now() - start > timeoutMs) {
                    resolve(doc);
                    return;
                }
                setTimeout(check, 300);
            })();
        });
    }

    /** يفتح قائمة المستخدم جوّا الـiframe ويبدّل اللغة إلى targetLabel (مثلاً "English" أو "العربية") */
    function changeLanguage(iframe, targetLabel) {
        return new Promise(resolve => {
            const win = iframe.contentWindow;
            let doc;
            try {
                doc = iframe.contentDocument || (win && win.document);
            } catch (err) {
                resolve();
                return;
            }
            if (!doc || !win) {
                resolve();
                return;
            }

            const menu = doc.querySelector('[data-testid="user-menu-button"]');
            if (menu) {
                menu.dispatchEvent(new win.PointerEvent("pointerdown", { bubbles: true }));
                menu.dispatchEvent(new win.PointerEvent("pointerup", { bubbles: true }));
                menu.click();
            }

            setTimeout(() => {
                const target = [...doc.querySelectorAll("button")]
                    .find(b => b.textContent.trim() === targetLabel);

                if (target) {
                    target.dispatchEvent(new win.PointerEvent("pointerdown", { bubbles: true }));
                    target.dispatchEvent(new win.PointerEvent("pointerup", { bubbles: true }));
                    target.click();
                }

                // ننتظر شوي إضافي بعد الضغط حتى تُعاد صياغة الجدول باللغة الجديدة
                setTimeout(resolve, 2000);
            }, 1000);
        });
    }

    // بعض جداول Yaqeen تعرض صفوف الصفحة الحالية فقط بالـ DOM حتى لو طلبنا
    // pageSize كبير بالرابط، فنحتاج نتنقّل بين الصفحات ونجمع كل الصفوف.
    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.prototype.slice.call(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    function readCurrentPageRows(doc) {
        const table = findDataTable(doc);
        if (!table) return [];
        const rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr"));
        return rows
            .map(tr => {
                const c = tr.querySelectorAll("td");
                if (c.length < 9) return null;
                return {
                    plate: (c[0].querySelector("span")?.innerText || "").trim(),
                    group: c[3].innerText.trim(),
                    vehicle: c[1].innerText.replace(/\n/g, " ").trim(),
                    year: c[2].innerText.trim(),
                    km: c[7].innerText.trim(),
                    __signature: Array.prototype.map.call(c, td => td.textContent.trim()).join("|"),
                };
            })
            .filter(Boolean);
    }

    function collectAllPages(iframe, doc) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return readCurrentPageRows(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) {
                        resolve(allRows);
                        return;
                    }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) {
                        step();
                        return;
                    }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) {
                    resolve(allRows);
                    return;
                }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) {
                    resolve(allRows);
                    return;
                }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    // ==========================================================
    // واجهة رسائل بسيطة (تحميل / خطأ)
    // ==========================================================

    function showLoading(text) {
        document.getElementById("fleet-box")?.remove();
        injectYqStyles();
        const html = `
<div id="fleet-box" class="yq-overlay">
<div class="yq-card" style="max-width:300px;padding:30px;">
<div class="yq-spinner"></div>
<div style="font-size:14.5px;font-weight:700;">${text}</div>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }

    function showMessage(text) {
        document.getElementById("fleet-box")?.remove();
        injectYqStyles();
        const html = `
<div id="fleet-box" class="yq-overlay">
<div class="yq-card" style="max-width:300px;">
<div style="margin-bottom:15px;font-size:14.5px;font-weight:700;">${text}</div>
<button id="close-fleet-message" class="yq-btn yq-btn-primary">إغلاق</button>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        document.getElementById("close-fleet-message").onclick = () => {
            document.getElementById("fleet-box")?.remove();
        };
    }

    // ==========================================================
    // طباعة كشف الجرد
    // ==========================================================

    function printFleet(rows) {

        rows.sort((a, b) =>
            a.group.localeCompare(b.group) ||
            a.plate.localeCompare(b.plate, undefined, { numeric: true })
        );

        let html = `
<html dir="ltr">
<head>
<title>Fleet Inventory</title>
<style>
body{font-family:Arial;padding:30px;}
h2{text-align:center;}
table{width:100%;border-collapse:collapse;}
th,td{border:1px solid #999;padding:8px;text-align:center;}
.check{width:35px;height:25px;}
.box{font-size:22px;font-weight:bold;}
</style>
</head>
<body>
<h2>Fleet Inventory</h2>
<table>
<tr>
<th>#</th>
<th>Plate</th>
<th>✓</th>
<th>Group</th>
<th>Vehicle</th>
<th>Year</th>
<th>KM</th>
</tr>
`;

        rows.forEach((x, i) => {
            html += `
<tr>
<td>${i + 1}</td>
<td>${x.plate}</td>
<td class="check"><div class="box">☐</div></td>
<td>${x.group}</td>
<td>${x.vehicle}</td>
<td>${x.year}</td>
<td>${x.km}</td>
</tr>
`;
        });

        html += `
</table>
</body>
</html>
`;

        let win = window.open("");
        win.document.write(html);
        win.document.close();

        setTimeout(() => {
            win.print();
        }, 1000);

    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-available-vehicles.user.js
// ============================================================

(function () {

    'use strict';

    var GROUP_COLUMN_HINT = ['المجموعة'];
    var lastBranch = null;

    function waitCore() {

        var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 300);
            return;
        }

        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "available-vehicles",
            name: "🚗 السيارات المتوفرة",
            run() {
                chooseBranch();
            }
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

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-btn{width:100%;padding:13px;margin-top:10px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:15px;font-weight:800;font-family:inherit;}' +
        '.yq-btn-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;' +
        'box-shadow:0 8px 16px -8px rgba(121,169,22,.55);}' +
        '.yq-btn-secondary{background:#f1f0ea;color:#767068;}' +
        '.yq-spinner{width:30px;height:30px;border:3px solid #A3E635;border-left-color:transparent;' +
        'border-radius:50%;margin:0 auto 14px;animation:yq-spin .8s linear infinite;}' +
        '@keyframes yq-spin{to{transform:rotate(360deg);}}' +
        '.yq-menu-btn{width:100%;padding:13px;margin-top:8px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:15px;font-weight:800;font-family:inherit;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-big{font-size:40px;font-weight:800;margin-top:4px;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
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
        if (document.getElementById('yq-shared-styles-available-vehicles')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-available-vehicles';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    function chooseBranch() {

        document.getElementById("available-box")?.remove();
        injectYqStyles();

        const box = document.createElement("div");
        box.id = "available-box";
        box.className = "yq-overlay";

        box.innerHTML = `
        <div class="yq-card" style="max-width:300px;">
            <h3>🚗 السيارات المتوفرة</h3>

            <button id="airport" class="yq-menu-btn">✈️ المطار</button>
            <button id="yard" class="yq-menu-btn">🏢 الساحة</button>
            <button id="all" class="yq-menu-btn">📍 الكل</button>

            <button id="cancel" class="yq-btn yq-btn-secondary">إلغاء</button>
        </div>`;

        document.body.appendChild(box);

        box.querySelector("#cancel").onclick = () => box.remove();

        // ملاحظة: لازم نفتح النافذة المنبثقة بشكل متزامن هنا (داخل onclick مباشرة)
        // بدون أي await قبلها، وإلا يحظرها المتصفح كنافذة منبثقة غير مرغوبة.
        box.querySelector("#airport").onclick = () => start("29");
        box.querySelector("#yard").onclick = () => start("53");
        box.querySelector("#all").onclick = () => start("53,29");

    }

    function start(branch) {

        lastBranch = branch;
        document.getElementById("available-box")?.remove();

        const url = `/rental/vehicles/ready?currentLocationIds=${branch}&pageSize=500`;
        const frame = openHiddenFrame(url);

        showLoading();

        waitForFirstFrame(frame)
            .then(doc => collectAllPages(frame, doc))
            .then(rows => {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport(rows);
            })
            .catch(err => {
                try { frame.remove(); } catch (err2) { /* تجاهل */ }
                showMessage("تعذّر جلب السيارات المتوفرة: " + err.message);
            });

    }

    // ==========================================================
    // جلب البيانات عبر iframe مخفي (بدون نافذة منبثقة)
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;";
        document.body.appendChild(iframe);
        return iframe;
    }

    function findDataTable(doc) {
        const tables = Array.prototype.slice.call(doc.querySelectorAll("table"));
        if (tables.length === 0) return null;

        function headerMatches(table) {
            const headerCells = Array.prototype.slice.call(table.querySelectorAll("thead tr th, thead tr td"));
            const normalizedVariants = GROUP_COLUMN_HINT.map(normalizeArabic);
            return headerCells.some(cell => {
                const text = normalizeArabic(cell.textContent);
                return normalizedVariants.some(v => text.indexOf(v) !== -1);
            });
        }

        const matching = tables.filter(headerMatches);
        const candidates = matching.length > 0 ? matching : tables;

        let best = null;
        let bestCount = -1;
        candidates.forEach(t => {
            const count = t.querySelectorAll("tbody tr").length;
            if (count > bestCount) {
                best = t;
                bestCount = count;
            }
        });
        return best;
    }

    function waitForFirstFrame(iframe, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function check() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال التحميل"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
                    return;
                }
                if (!doc || doc.readyState !== "complete") {
                    if (Date.now() - start > timeoutMs) {
                        resolve(doc || null);
                        return;
                    }
                    setTimeout(check, 300);
                    return;
                }
                const table = findDataTable(doc);
                const hasRows = table && table.querySelectorAll("tbody tr").length > 0;
                if (hasRows || Date.now() - start > timeoutMs) {
                    resolve(doc);
                    return;
                }
                setTimeout(check, 300);
            })();
        });
    }

    // بعض جداول Yaqeen تعرض صفوف الصفحة الحالية فقط بالـ DOM حتى لو طلبنا
    // pageSize كبير بالرابط، فنحتاج نتنقّل بين الصفحات ونجمع كل الصفوف.
    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];

    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.prototype.slice.call(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    function readCurrentPageRows(doc) {
        const table = findDataTable(doc);
        if (!table) return [];
        const rows = Array.prototype.slice.call(table.querySelectorAll("tbody tr"));
        return rows
            .map(row => {
                const td = row.querySelectorAll("td");
                if (td.length < 6) return null;
                return {
                    group: td[3].textContent.trim(),
                    available: td[5].textContent.includes("غير مخصصة"),
                    __signature: Array.prototype.map.call(td, c => c.textContent.trim()).join("|"),
                };
            })
            .filter(Boolean);
    }

    function collectAllPages(iframe, doc) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return readCurrentPageRows(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) {
                        resolve(allRows);
                        return;
                    }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) {
                        step();
                        return;
                    }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) {
                    resolve(allRows);
                    return;
                }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) {
                    resolve(allRows);
                    return;
                }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function showLoading() {
        document.getElementById("available-report")?.remove();
        injectYqStyles();

        const html = `
<div id="available-report" class="yq-overlay">
<div class="yq-card" style="max-width:280px;padding:30px;">
<div class="yq-spinner"></div>
<div style="font-size:14.5px;font-weight:700;">جارٍ جلب السيارات المتوفرة...</div>
</div>
</div>`;

        document.body.insertAdjacentHTML("beforeend", html);
    }

    function showMessage(text) {
        document.getElementById("available-report")?.remove();
        injectYqStyles();

        const html = `
<div id="available-report" class="yq-overlay">
<div class="yq-card" style="max-width:300px;">
<div style="margin-bottom:15px;font-size:14.5px;font-weight:700;">${text}</div>
<button id="close-report" class="yq-btn yq-btn-primary">إغلاق</button>
</div>
</div>`;

        document.body.insertAdjacentHTML("beforeend", html);
        document.getElementById("close-report").onclick = () => {
            document.getElementById("available-report").remove();
        };
    }

    function showReport(rows) {

        let groups = {};
        let total = 0;

        rows.forEach(row => {
            if (!row.available) return;
            groups[row.group] = (groups[row.group] || 0) + 1;
            total++;
        });

        document.getElementById("available-report")?.remove();
        injectYqStyles();

        let html = `
<div id="available-report" class="yq-overlay">

<div style="width:min(380px,95vw);max-height:85vh;background:#fff;border-radius:22px;
overflow:hidden;direction:rtl;display:flex;flex-direction:column;">

<div class="yq-report-header">
<div class="yq-report-title">إجمالي السيارات المتوفرة</div>
<div class="yq-report-big">${total}</div>
</div>

<div style="overflow:auto;flex:1;padding:0 10px;">
<table class="yq-report-table">

<tr><th>القروب</th><th>العدد</th></tr>
`;

        Object.keys(groups)
            .sort()
            .forEach(group => {

                html += `
<tr>
<td style="text-align:center;">${group}</td>
<td style="text-align:center;font-weight:800;">${groups[group]}</td>
</tr>`;

            });

        html += `
</table>
</div>

<div class="yq-report-actions">
<button id="print-report">🖨️ طباعة</button>
<button id="refresh-report">🔄 تحديث</button>
<button id="close-report" class="yq-primary">إغلاق</button>
</div>

</div>
</div>`;

        document.body.insertAdjacentHTML("beforeend", html);

        document.getElementById("close-report").onclick = () => {
            document.getElementById("available-report").remove();
        };

        document.getElementById("print-report").onclick = () => {
            printReport(groups, total);
        };

        document.getElementById("refresh-report").onclick = () => {
            if (lastBranch) start(lastBranch);
        };

    }

    function printReport(groups, total) {

        const printWindow = window.open("", "_blank", "width=800,height=600");
        if (!printWindow) {
            showMessage("يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.");
            return;
        }

        let rowsHtml = Object.keys(groups)
            .sort()
            .map(group => `<tr><td>${group}</td><td>${groups[group]}</td></tr>`)
            .join("");

        if (Object.keys(groups).length === 0) {
            rowsHtml = `<tr><td colspan="2">لا توجد سيارات متوفرة</td></tr>`;
        }

        const now = new Date().toLocaleString("ar-SA");

        const printHtml = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<title>السيارات المتوفرة</title>
<style>
*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}
body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}
h1{font-size:20px;margin:0 0 4px;}
.meta{color:#555;font-size:14px;margin-bottom:16px;}
table{border-collapse:collapse;width:100%;font-size:15px;}
th,td{border:1px solid #999;padding:8px 10px;text-align:center;}
th{background:#f0f0f0;}
</style>
</head>
<body>
<h1>🚗 السيارات المتوفرة</h1>
<div class="meta">${now} | الإجمالي: ${total}</div>
<table>
<tr><th>القروب</th><th>العدد</th></tr>
${rowsHtml}
</table>
</body>
</html>`;

        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-email-tools.user.js
// ============================================================

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
    // يبحث برقم عقد التأجير، يدخل تفاصيل الحجز تلقائياً، يعرض صور "فحص
    // التسليم" حتى يختار المستخدم منها، يحمّل المختار، ثم يبني الإيميل.
    // ==========================================================

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

// ============================================================
// المصدر: source/yaqeen-airport-hours-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت أداة "تقرير الحجوزات القادمة")
    var WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    var AIRPORT_LOCATION_ID = 29;
    var YARD_LOCATION_ID = 53; // موقع "الحوش" - عمود إضافي فقط، لا يدخل في حساب الإشغال
    var PAGE_SIZE = 500;

    var BOOKINGS_URL =
        'https://yaqeen.lumirental.com/rental/branches/' + AIRPORT_LOCATION_ID +
        '/bookings/upcoming?pageSize=' + PAGE_SIZE;

    var VEHICLES_URL =
        'https://yaqeen.lumirental.com/rental/vehicles/ready?currentLocationIds=' + AIRPORT_LOCATION_ID +
        '&pageSize=' + PAGE_SIZE;

    var YARD_VEHICLES_URL =
        'https://yaqeen.lumirental.com/rental/vehicles/ready?currentLocationIds=' + YARD_LOCATION_ID +
        '&pageSize=' + PAGE_SIZE;

    var BOOKING_COLUMNS_MAP = {
        pickup: ['وقت الاستلام'],
        group: ['المجموعة'],
    };
    var GROUP_COLUMN_HINT = ['المجموعة'];

    var WEEKDAY_MAP = {
        'الاحد': 0,
        'الاثنين': 1,
        'الثلاثاء': 2,
        'الاربعاء': 3,
        'الخميس': 4,
        'الجمعه': 5,
        'السبت': 6,
    };

    // تعديلات يدوية على عدد سيارات الحوش لكل قروب - تُمسح مع كل تحديث حقيقي
    // للبيانات (تحديث/تغيير المدة) عشان ما تطغى على الأرقام الفعلية الجديدة
    var yardOverrides = {};

    // ==========================================================
    // تسجيل الأداة في نظام Yaqeen
    // ==========================================================

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 300);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "airport-report",
            name: "🛫 حجوزات المطار القادمة",
            run() {
                showHoursPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات نصية
    // ==========================================================

    function escapeHtml(text) {
        return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }

    /** رقم الحوش الفعلي المعروض لهذا القروب - يفضّل التعديل اليدوي إن وُجد، وإلا الرقم المسحوب تلقائياً */
    function getEffectiveYardCount(group, rawYardCounts) {
        if (Object.prototype.hasOwnProperty.call(yardOverrides, group)) return yardOverrides[group];
        return rawYardCounts[group] || 0;
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

    /** يحوّل نص "وقت الاستلام" (مثال: "اليوم - 08:30" أو "الأحد - 14:00") إلى تاريخ/وقت فعلي */
    function resolveBookingDateTime(pickupText, now) {
        if (!pickupText) return null;
        var timeMatch = pickupText.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) return null;

        var dayPart = normalizeArabic(pickupText.split('-')[0] || '');
        var target = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (dayPart === normalizeArabic('اليوم')) {
            // نفس اليوم - لا شي إضافي
        } else if (dayPart === normalizeArabic('غداً') || dayPart === normalizeArabic('غدا')) {
            target.setDate(target.getDate() + 1);
        } else if (Object.prototype.hasOwnProperty.call(WEEKDAY_MAP, dayPart)) {
            var todayIndex = now.getDay();
            var weekdayIndex = WEEKDAY_MAP[dayPart];
            var daysAhead = (weekdayIndex - todayIndex + 7) % 7;
            if (daysAhead === 0) daysAhead = 7; // "اليوم"/"غداً" يغطون أقرب حالتين، فأي تطابق آخر يعني الأسبوع القادم
            target.setDate(target.getDate() + daysAhead);
        } else {
            return null; // نص يوم غير معروف - نتجاهل هذا الحجز بدل ما نخمّن تاريخ خاطئ
        }

        target.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
        return target;
    }

    // ==========================================================
    // جلب البيانات من نافذة منبثقة (بدون مغادرة الصفحة الحالية)
    // ==========================================================

    function findDataTable(doc, requiredColumnVariants) {
        var tables = Array.prototype.slice.call(doc.querySelectorAll('table'));
        if (tables.length === 0) return null;

        function headerMatches(table) {
            var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
            var normalizedVariants = requiredColumnVariants.map(normalizeArabic);
            return headerCells.some(function (cell) {
                var text = normalizeArabic(cell.textContent);
                return normalizedVariants.some(function (v) { return text.indexOf(v) !== -1; });
            });
        }

        var matching = tables.filter(headerMatches);
        var candidates = matching.length > 0 ? matching : tables;

        var best = null;
        var bestCount = -1;
        candidates.forEach(function (t) {
            var count = t.querySelectorAll('tbody tr').length;
            if (count > bestCount) {
                best = t;
                bestCount = count;
            }
        });
        return best;
    }

    function openHiddenFrame(url) {
        var iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitForFirstFrame(iframe, groupHint, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise(function (resolve, reject) {
            var start = Date.now();
            (function check() {
                if (!iframe.isConnected) {
                    reject(new Error('تمت إزالة الـiframe قبل اكتمال التحميل'));
                    return;
                }
                var doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error('تعذّر الوصول لمحتوى الـiframe'));
                    return;
                }
                if (!doc || doc.readyState !== 'complete') {
                    if (Date.now() - start > timeoutMs) { resolve(doc || null); return; }
                    setTimeout(check, 300);
                    return;
                }
                var table = findDataTable(doc, groupHint);
                var hasRows = table && table.querySelectorAll('tbody tr').length > 0;
                if (hasRows || Date.now() - start > timeoutMs) { resolve(doc); return; }
                setTimeout(check, 300);
            })();
        });
    }

    var NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    var NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (var i = 0; i < NEXT_PAGE_SELECTORS.length; i++) {
            var el = doc.querySelector(NEXT_PAGE_SELECTORS[i]);
            if (el) return el;
        }
        var candidates = Array.prototype.slice.call(doc.querySelectorAll('button, a, [role="button"]'));
        var textMatch = candidates.find(function (el) {
            return NEXT_PAGE_TEXT_PATTERN.test((el.textContent || '').trim());
        });
        return textMatch || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute('aria-disabled') === 'true') return true;
        var className = (el.className || '').toString().toLowerCase();
        if (className.indexOf('disabled') !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    /** يجمع صفوف كل الصفحات - rowReaderFn(doc) ترجع مصفوفة صفوف فيها __signature */
    function collectAllPages(iframe, doc, groupHint, rowReaderFn) {
        return new Promise(function (resolve) {
            var allRows = [];
            var seen = {};
            var pageIndex = 0;
            var maxIterations = 80;

            function addRows(rows) {
                rows.forEach(function (r) {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return rowReaderFn(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                var waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    var currentRows = readRowsSafely();
                    var currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                var rows = readRowsSafely();
                addRows(rows);

                var nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                var beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    function fetchAllFromFrame(iframe, groupHint, rowReaderFn) {
        return waitForFirstFrame(iframe, groupHint).then(function (doc) {
            return collectAllPages(iframe, doc, groupHint, rowReaderFn).then(function (rows) {
                try { iframe.remove(); } catch (err) { /* تجاهل */ }
                return rows;
            });
        });
    }

    // -------- قارئ صفوف جدول السيارات الجاهزة (نفس منطق أداة "السيارات المتوفرة") --------
    function readVehicleRows(doc) {
        var table = findDataTable(doc, GROUP_COLUMN_HINT);
        if (!table) return [];
        var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
        return rows.map(function (row) {
            var td = row.querySelectorAll('td');
            if (td.length < 6) return null;
            return {
                group: td[3].textContent.trim(),
                available: td[5].textContent.indexOf('غير مخصصة') !== -1,
                __signature: Array.prototype.map.call(td, function (c) { return c.textContent.trim(); }).join('|'),
            };
        }).filter(Boolean);
    }

    // -------- قارئ صفوف جدول الحجوزات (حسب أسماء الأعمدة، لا مواقعها) --------
    function findColumnIndex(headerCells, labelVariants) {
        var normalizedVariants = labelVariants.map(normalizeArabic);
        for (var i = 0; i < headerCells.length; i++) {
            var headerText = normalizeArabic(headerCells[i].textContent);
            for (var j = 0; j < normalizedVariants.length; j++) {
                if (headerText.indexOf(normalizedVariants[j]) !== -1) return i;
            }
        }
        return -1;
    }

    function readBookingRows(doc) {
        var table = findDataTable(doc, GROUP_COLUMN_HINT);
        if (!table) return [];
        var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
        var pickupIdx = findColumnIndex(headerCells, BOOKING_COLUMNS_MAP.pickup);
        var groupIdx = findColumnIndex(headerCells, BOOKING_COLUMNS_MAP.group);
        if (pickupIdx === -1 || groupIdx === -1) return [];

        var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
        return rows.map(function (row) {
            var cells = Array.prototype.slice.call(row.querySelectorAll('td'));
            if (cells.length === 0) return null;
            return {
                pickup: cells[pickupIdx] ? cells[pickupIdx].textContent.trim() : '',
                group: cells[groupIdx] ? cells[groupIdx].textContent.trim() : '',
                __signature: cells.map(function (c) { return c.textContent.trim(); }).join('|'),
            };
        }).filter(Boolean);
    }

    // ==========================================================
    // التنفيذ
    // ==========================================================

    function runReport(hours) {
        document.getElementById('airport-hours-box')?.remove();

        // ننشئ الإطارات الثلاثة فوراً (يبدأ تحميلها بالخلفية فوراً)، لكن نقرأها
        // بالتتابع لا بالتوازي (Promise.all): فتح 3 صفحات React ثقيلة والبدء
        // بقراءتها كلها بنفس اللحظة يسبب تنافساً على الموارد يمنع إطار
        // "الحوش" (آخر واحد) من اكتمال تحميله ضمن المهلة، فيرجع صفوفاً فارغة
        // رغم وجود بيانات فعلية بالصفحة الحقيقية
        var bookingsFrame = openHiddenFrame(BOOKINGS_URL);
        var vehiclesFrame = openHiddenFrame(VEHICLES_URL);
        var yardFrame = openHiddenFrame(YARD_VEHICLES_URL);

        showLoading();

        var now = new Date();

        fetchAllFromFrame(bookingsFrame, GROUP_COLUMN_HINT, readBookingRows)
            .then(function (bookingRows) {
                return fetchAllFromFrame(vehiclesFrame, GROUP_COLUMN_HINT, readVehicleRows).then(function (vehicleRows) {
                    return [bookingRows, vehicleRows];
                });
            })
            .then(function (partial) {
                return fetchAllFromFrame(yardFrame, GROUP_COLUMN_HINT, readVehicleRows).then(function (yardRows) {
                    return partial.concat([yardRows]);
                });
            })
            .then(function (results) {
                var bookingRows = results[0];
                var vehicleRows = results[1];
                var yardRows = results[2];
                console.log('[حجوزات المطار] عدد صفوف الحوش (53) المستخرجة:', yardRows.length);
                var cutoff = new Date(now.getTime() + hours * 3600000);

                var bookingCounts = {};
                var totalBookings = 0;
                bookingRows.forEach(function (r) {
                    if (!r.group) return;
                    var dt = resolveBookingDateTime(r.pickup, now);
                    if (!dt || dt < now || dt > cutoff) return;
                    bookingCounts[r.group] = (bookingCounts[r.group] || 0) + 1;
                    totalBookings++;
                });

                var vehicleCounts = {};
                var totalVehicles = 0;
                vehicleRows.forEach(function (r) {
                    if (!r.group || !r.available) return;
                    vehicleCounts[r.group] = (vehicleCounts[r.group] || 0) + 1;
                    totalVehicles++;
                });

                // عمود "سيارات الحوش" يشمل الآن كل قروبات الحوش فعلياً - حتى لو
                // القروب ما عنده أي سيارة بالمطار نفسه ولا أي حجز، عشان يظهر
                // بالتقرير ويصير قابل للتعديل اليدوي
                var yardVehicleCounts = {};
                yardRows.forEach(function (r) {
                    if (!r.group || !r.available) return;
                    yardVehicleCounts[r.group] = (yardVehicleCounts[r.group] || 0) + 1;
                });

                // تحديث حقيقي جديد للبيانات - نمسح أي تعديل يدوي سابق حتى ما يظل
                // يطغى على الأرقام الفعلية الجديدة
                yardOverrides = {};

                showReport(hours, bookingCounts, vehicleCounts, yardVehicleCounts, totalBookings, totalVehicles);
            })
            .catch(function (err) {
                try { bookingsFrame.remove(); } catch (e) { /* تجاهل */ }
                try { vehiclesFrame.remove(); } catch (e) { /* تجاهل */ }
                try { yardFrame.remove(); } catch (e) { /* تجاهل */ }
                showMessage('تعذّر جلب البيانات: ' + err.message);
            });
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:16px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
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
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-airport-hours')) return;
        var style = document.createElement('style');
        style.id = 'yq-shared-styles-airport-hours';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    /** إشعار خفيف يختفي تلقائياً - بديل alert()/رسائل النجاح والخطأ القديمة */
    function showToast(message, type) {
        injectYqStyles();
        var wrap = document.getElementById('yq-toast-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'yq-toast-wrap';
            wrap.className = 'yq-toast-wrap';
            document.body.appendChild(wrap);
        }
        var toast = document.createElement('div');
        toast.className = 'yq-toast' + (type === 'error' ? ' err' : '');
        toast.innerHTML =
            '<div class="yq-toast-icon">' + (type === 'error' ? '⚠️' : '✅') + '</div>' +
            '<div class="yq-toast-text"></div>' +
            '<button class="yq-toast-close">✕</button>';
        toast.querySelector('.yq-toast-text').textContent = message;
        wrap.appendChild(toast);

        var remove = function () { toast.remove(); if (!wrap.children.length) wrap.remove(); };
        toast.querySelector('.yq-toast-close').onclick = remove;
        setTimeout(remove, type === 'error' ? 6000 : 4000);
    }

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="airport-hours-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showHoursPrompt() {
        document.getElementById('airport-hours-box')?.remove();

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>🛫 حجوزات المطار القادمة</h3>' +
            '<div class="yq-desc">كم ساعة قدام تبغى تشوف الحجوزات؟</div>' +
            '<input id="airport-hours-input" type="number" min="1" step="1" value="6" class="yq-field" />' +
            '<button id="airport-hours-submit" class="yq-btn yq-btn-primary">عرض التقرير</button>' +
            '<button id="airport-hours-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            300
        ));

        var input = document.getElementById('airport-hours-input');
        input.focus();
        input.select();

        function submit() {
            var hours = parseFloat(input.value);
            if (!hours || hours <= 0) {
                input.classList.add('yq-field-err');
                return;
            }
            runReport(hours);
        }

        document.getElementById('airport-hours-submit').onclick = submit;
        document.getElementById('airport-hours-cancel').onclick = function () {
            document.getElementById('airport-hours-box')?.remove();
        };
        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') submit();
        });
    }

    function showLoading() {
        document.getElementById('airport-hours-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">جارٍ جلب الحجوزات والسيارات المتاحة...</div>',
            280
        ));
    }

    function showMessage(text, type) {
        document.getElementById('airport-hours-box')?.remove();
        showToast(text, type || 'error');
    }

    function showReport(hours, bookingCounts, vehicleCounts, yardVehicleCounts, totalBookings, totalVehicles) {
        document.getElementById('airport-hours-box')?.remove();
        injectYqStyles();

        // اتحاد كل القروبات (حجوزات + سيارات مطار + سيارات حوش) عشان أي قروب
        // له حوش فقط بدون سيارات مطار ولا حجوزات يظل يظهر بالتقرير
        var groups = Object.keys(Object.assign({}, bookingCounts, vehicleCounts, yardVehicleCounts)).sort();

        var rowsHtml = groups.map(function (group) {
            var vehicles = vehicleCounts[group] || 0;
            var bookings = bookingCounts[group] || 0;
            var yardVehicles = getEffectiveYardCount(group, yardVehicleCounts);
            var diff = vehicles - bookings;
            var diffColor = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#b45309';
            return (
                '<tr>' +
                '<td style="text-align:center;font-weight:800;">' + escapeHtml(group) + '</td>' +
                '<td style="text-align:center;">' + vehicles + '</td>' +
                '<td style="text-align:center;">' + bookings + '</td>' +
                '<td style="text-align:center;font-weight:800;color:' + diffColor + '">' +
                (diff > 0 ? '+' + diff : diff) + '</td>' +
                '<td style="text-align:center;padding:6px;">' +
                '<input type="number" min="0" class="yard-vehicle-input" data-group="' + escapeHtml(group) + '" value="' + yardVehicles + '" style="' +
                'width:52px;padding:5px 3px;border:1.5px solid #cec7b4;border-radius:8px;text-align:center;font:inherit;font-weight:800;">' +
                '</td>' +
                '</tr>'
            );
        }).join('');

        if (groups.length === 0) {
            rowsHtml = '<tr><td colspan="5" style="padding:22px;text-align:center;color:#a19c92;">لا توجد بيانات ضمن هذه المدة</td></tr>';
        }

        var html =
            '<div id="airport-hours-box" class="yq-overlay">' +
            '<div style="width:min(460px,95vw);max-height:85vh;background:#fff;border-radius:22px;' +
            'overflow:hidden;direction:rtl;display:flex;flex-direction:column;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">🛫 حجوزات المطار خلال ' + hours + ' ساعة القادمة</div>' +
            '<div class="yq-report-sub">إجمالي الحجوزات: ' + totalBookings +
            ' · إجمالي السيارات المتاحة: ' + totalVehicles + '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>القروب</th><th>السيارات المتاحة</th><th>الحجوزات</th><th>الفرق</th>' +
            '<th>سيارات الحوش (53)</th>' +
            '</tr>' + rowsHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="airport-hours-refresh">🔄 تحديث</button>' +
            '<button id="airport-hours-print">🖨️ طباعة</button>' +
            '<button id="airport-hours-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="airport-hours-change">تغيير المدة</button>' +
            '<button id="airport-hours-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        Array.prototype.slice.call(document.querySelectorAll('.yard-vehicle-input')).forEach(function (input) {
            input.addEventListener('click', function (e) { e.stopPropagation(); });
            input.addEventListener('change', function () {
                var value = parseInt(input.value, 10);
                if (!Number.isFinite(value) || value < 0) value = 0;
                input.value = value;
                yardOverrides[input.dataset.group] = value;
            });
        });

        document.getElementById('airport-hours-close').onclick = function () {
            document.getElementById('airport-hours-box')?.remove();
        };
        document.getElementById('airport-hours-change').onclick = function () {
            showHoursPrompt();
        };
        document.getElementById('airport-hours-refresh').onclick = function () {
            runReport(hours);
        };
        document.getElementById('airport-hours-print').onclick = function () {
            printReport(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles);
        };
        document.getElementById('airport-hours-whatsapp').onclick = function () {
            handleSendWhatsApp(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles);
        };
    }

    function printReport(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles) {
        var printWindow = window.open('', '_blank', 'width=800,height=600');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        var rowsHtml = groups.map(function (group) {
            var vehicles = vehicleCounts[group] || 0;
            var bookings = bookingCounts[group] || 0;
            var yardVehicles = getEffectiveYardCount(group, yardVehicleCounts);
            var diff = vehicles - bookings;
            var diffColor = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#b45309';
            return (
                '<tr>' +
                '<td>' + escapeHtml(group) + '</td>' +
                '<td>' + vehicles + '</td>' +
                '<td>' + bookings + '</td>' +
                '<td style="color:' + diffColor + ';font-weight:bold;">' + (diff > 0 ? '+' + diff : diff) + '</td>' +
                '<td>' + yardVehicles + '</td>' +
                '</tr>'
            );
        }).join('');

        if (groups.length === 0) {
            rowsHtml = '<tr><td colspan="5">لا توجد بيانات ضمن هذه المدة</td></tr>';
        }

        var now = new Date().toLocaleString('ar-SA');

        var printHtml =
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>حجوزات المطار القادمة</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:15px;}' +
            'th,td{border:1px solid #999;padding:8px 10px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>🛫 حجوزات المطار خلال ' + hours + ' ساعة القادمة</h1>' +
            '<div class="meta">' + now + ' | إجمالي الحجوزات: ' + totalBookings +
            ' | إجمالي السيارات المتاحة: ' + totalVehicles + '</div>' +
            '<table><tr><th>القروب</th><th>السيارات المتاحة</th><th>الحجوزات</th><th>الفرق</th><th>سيارات الحوش (53)</th></tr>' +
            rowsHtml + '</table></body></html>';

        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب أداة "تقرير الحجوزات القادمة"
    // (SVG+foreignObject لرسم الجدول كصورة، بدون أي مكتبة خارجية)
    // ==========================================================

    /** يحوّل نص UTF-8 (فيه عربي) إلى base64 - btoa العادية تدعم Latin1 بس */
    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    var IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:15px;}' +
        'th,td{border:1px solid #999;padding:8px 10px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles) {
        var rowsHtml = groups.map(function (group) {
            var vehicles = vehicleCounts[group] || 0;
            var bookings = bookingCounts[group] || 0;
            var yardVehicles = getEffectiveYardCount(group, yardVehicleCounts);
            var diff = vehicles - bookings;
            var diffColor = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#b45309';
            return (
                '<tr>' +
                '<td>' + escapeHtml(group) + '</td>' +
                '<td>' + vehicles + '</td>' +
                '<td>' + bookings + '</td>' +
                '<td style="color:' + diffColor + ';font-weight:bold;">' + (diff > 0 ? '+' + diff : diff) + '</td>' +
                '<td>' + yardVehicles + '</td>' +
                '</tr>'
            );
        }).join('');

        if (groups.length === 0) {
            rowsHtml = '<tr><td colspan="5">لا توجد بيانات ضمن هذه المدة</td></tr>';
        }

        var now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>🛫 حجوزات المطار خلال ' + hours + ' ساعة القادمة</h1>' +
            '<div class="meta">' + now + ' | إجمالي الحجوزات: ' + totalBookings +
            ' | إجمالي السيارات المتاحة: ' + totalVehicles + '</div>' +
            '<table><tr><th>القروب</th><th>السيارات المتاحة</th><th>الحجوزات</th><th>الفرق</th><th>سيارات الحوش (' + YARD_LOCATION_ID + ')</th></tr>' +
            rowsHtml + '</table>'
        );
    }

    /** يرسم الجدول كصورة PNG/JPEG عبر SVG+foreignObject. يعيد Promise بصيغة data URL */
    function buildReportImageDataUrl(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles) {
        return new Promise(function (resolve, reject) {
            var settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                var innerHtml = buildReportImageInnerHtml(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles);
                var wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                var measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                var measuredRect = measureEl.getBoundingClientRect();
                var width = Math.max(Math.ceil(measuredRect.width), 400);
                var height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                var contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                var svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                // data URI (مش blob:) لأن كروم يرفض canvas.toDataURL() بصمت على SVG
                // فيها foreignObject لو كانت محمّلة من blob: (Tainted Canvas)
                var svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                var img = new Image();
                var timeoutId = setTimeout(function () {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = function () {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            var ctx2d = canvas.getContext('2d');
                            var w = canvas.width;
                            var h = canvas.height;
                            var data = ctx2d.getImageData(0, 0, w, h).data;
                            var stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (var x = 0; x < w; x += stride) {
                                    var i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (var y = 0; y < h; y += stride) {
                                    var i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            var lastRow = 0;
                            for (var y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            var lastCol = 0;
                            for (var x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            var margin = stride * 2;
                            var trimmedW = Math.min(w, lastCol + margin);
                            var trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            var trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            var canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            var ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        var TARGET_DATA_URL_LENGTH = 8000000; // ~6MB بعد فك التشفير - هامش مريح تحت حد الـ100mb
                        var scales = [2, 1.5, 1];
                        var qualities = [0.92, 0.85, 0.75, 0.6];
                        var best = null;

                        outer:
                        for (var s = 0; s < scales.length; s++) {
                            var canvas = drawAtScale(scales[s]);
                            for (var q = 0; q < qualities.length; q++) {
                                var dataUrl = canvas.toDataURL('image/jpeg', qualities[q]);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = function () {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    /** إرسال كصورة عبر بوت واتساب - نفس صيغة أداة "تقرير الحجوزات القادمة" */
    function handleSendWhatsApp(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showLoading();
        buildReportImageDataUrl(hours, groups, vehicleCounts, bookingCounts, yardVehicleCounts, totalBookings, totalVehicles)
            .then(function (dataUrl) {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        // نرسل base64 خام بدون بادئة data:image/...;base64, لأن أغلب أكواد
                        // البوتات تعمل Buffer.from(imageBase64,'base64') مباشرة، والبادئة تفسد البيانات
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '🛫 حجوزات المطار خلال ' + hours + ' ساعة القادمة - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: function (response) {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[حجوزات المطار] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[حجوزات المطار] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: function (error) {
                        console.error('[حجوزات المطار] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(function (err) {
                console.error('[حجوزات المطار] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-late-payments-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    const BRANCH_ID = 29;
    const LATE_RETURN_URL = 'https://yaqeen.lumirental.com/rental/branches/' + BRANCH_ID + '/bookings?status=LATE_RETURN&pageSize=500';
    const MAX_AGREEMENTS = 300;
    // عدد الإطارات المتوازية لفحص تفاصيل العقود - كل إطار يفحص عقوده بالتتابع
    // تماماً بنفس منطق الفحص الأصلي، بس موزّعين على عدة إطارات بدل واحد
    // فقط، فتسرع العملية بمقدار العدد تقريباً بدون أي تغيير بمنطق الفحص نفسه
    const CHECK_CONCURRENCY = 4;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "late-payments",
            name: "💰 العقود المتأخرة في السداد (أفراد)",
            run() {
                showThresholdPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
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

    /** يلقط أي عنصر عنده نص مباشر (text node) يطابق التسمية تماماً - يتحمّل وجود أيقونة SVG جنبه */
    function findLabelElement(doc, labelText) {
        const candidates = doc.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    /** يدور القيمة القريبة من عنصر تسمية (يجرب الإخوة القريبين بالترتيبين، ما نعرف بالضبط ترتيب DOM) */
    function findValueNearLabel(doc, labelText) {
        const labelEl = findLabelElement(doc, labelText);
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

    function parseAmount(text) {
        if (!text) return NaN;
        const isNegative = text.indexOf('-') !== -1;
        const cleaned = text.replace(/[^\d.]/g, '');
        if (!cleaned) return NaN;
        const value = parseFloat(cleaned);
        if (isNaN(value)) return NaN;
        return isNegative ? -value : value;
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

    // ==========================================================
    // ترقيم الصفحات (نفس منطق الأدوات الثانية)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    /**
     * كل صف بجدول "العقود المتأخرة" فيه عمود "الإجمالي (ريال)" برقم + أيقونة:
     * أيقونة خضراء (fill-green-600) = تم السداد فعلياً رغم تأخر التسليم، ما نعتبره متأخر بالسداد.
     * أيقونة رمادية (fill-slate-400) = لسا عليه مبلغ متأخر فعلاً.
     * هذا يغنينا عن فتح كل عقد للتأكد - نفلتر أول شي من نفس القائمة، ونفتح بس اللي يستاهل.
     */
    function readLateReturnRows(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const bookingIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
        const driverIdx = findColumnIndex(headerCells, ["السائق"]);
        const totalIdx = findColumnIndex(headerCells, ["الإجمالي"]);
        const debtorIdx = findColumnIndex(headerCells, ["اسم المدين"]);

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return null;

            // عمود "اسم المدين" يكون "غير متاح" للأفراد، ويعرض اسم الشركة
            // الفعلي للعقود التابعة لشركات - وأغلب عقود الشركات المتأخرة سببها
            // إن الشركة نفسها ما مدّدت العقد بعد (مو تأخر سداد فردي). هذي
            // الأداة للأفراد فقط، فنتجاهل أي صف عنده اسم شركة حقيقي بهذا العمود
            const debtorText = debtorIdx !== -1 ? cells[debtorIdx].textContent.trim() : "";
            if (debtorText && debtorText !== "غير متاح") return null;

            const link = Array.from(row.querySelectorAll("a"))
                .find(a => (a.getAttribute("href") || "").includes("/close-agreements/"));
            if (!link) return null;

            const totalCell = totalIdx !== -1 ? cells[totalIdx] : null;
            const amountText = totalCell?.querySelector("p")?.textContent || "";
            const svg = totalCell?.querySelector("svg");
            const isSettled = svg ? (svg.getAttribute("class") || "").includes("fill-green-600") : false;

            const bookingNo = bookingIdx !== -1 ? cells[bookingIdx].textContent.trim() : "";
            const agreementNo = agreementIdx !== -1 ? cells[agreementIdx].textContent.trim() : "";

            return {
                href: new URL(link.getAttribute("href"), location.origin).href,
                bookingNo,
                agreementNo,
                name: driverIdx !== -1 ? cells[driverIdx].textContent.trim() : "",
                listAmount: parseAmount(amountText),
                isSettled,
                __signature: agreementNo || bookingNo || link.getAttribute("href"),
            };
        }).filter(Boolean);
    }

    function collectAllPages(iframe, doc) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return readLateReturnRows(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    // ==========================================================
    // إرسال رابط السداد عبر واتساب (زر لكل عقد بالتقرير)
    // ==========================================================

    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findButtonByText(root, text) {
        const candidates = Array.from(root.querySelectorAll('button, a'));
        return candidates.find(el => (el.textContent || '').trim() === text) || null;
    }

    /**
     * يحوّل رقم جوال معروض بأي صيغة شائعة (05xxxxxxxx، +9665xxxxxxxx،
     * 9665xxxxxxxx، 5xxxxxxxx) إلى JID واتساب لرقم فردي بصيغة Baileys
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
                    Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ target: phoneJid, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main', type: 'text', message: message }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve();
                    else {
                        console.error('[العقود المتأخرة] فشل إرسال رابط الدفع:', response.status, response.responseText);
                        reject(new Error('فشل الإرسال (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    function findQuickpayLink(root) {
        if (!root) return null;
        return Array.from(root.querySelectorAll('a')).find(x => (x.getAttribute('href') || '').includes('/payment/quickpay/')) || null;
    }

    /**
     * نافذة "رابط الدفع" تطلع فيها حالتين متشابهتين شكلياً (فيهما نفس بلوك
     * تفاصيل الرابط)، بس بنص مختلف كلياً بتنبيه [role="alert"] بالأعلى:
     * - "يوجد رابط دفع نشط": رابط قديم من قبل - ما ننشئ ولا نرسل شي جديد.
     * - "تم إنشاء رابط الدفع وإرساله...": رابط جديد أنشأناه للتو فعلياً.
     * الاعتماد على نص التنبيه نفسه (مو مجرد وجود رابط بالنافذة، اللي يطلع
     * بالحالتين) هو الفيصل الموثوق - لون/شكل التنبيه تفصيل ثانوي قابل للتغيّر.
     */
    function classifyPaymentDialogState(dialog) {
        if (!dialog) return null;
        const alerts = Array.from(dialog.querySelectorAll('[role="alert"]'));
        for (const alert of alerts) {
            const text = alert.textContent || '';
            if (text.indexOf('يوجد رابط دفع نشط') !== -1) return 'active';
            if (text.indexOf('تم إنشاء رابط الدفع') !== -1) return 'created';
        }
        return null;
    }

    /**
     * يتحقق أول شي إذا الحالة المطلوبة متحققة أصلاً (بدون ضغط أي شي - مفيد
     * لما نكون فعلاً بمرحلة متقدمة ومحتاجين خطوة سابقة). إذا لأ، يدور على
     * عنصر يضغطه وينتظر تحقق الحالة، ويكرر المحاولة (ضغط جديد + انتظار جديد)
     * لأكثر من مرة - لأن أحياناً العنصر يكون موجود بالـDOM بس لسا ما تركّبت
     * معالجات الأحداث عليه فعلياً (سباق تحميل الصفحة)، فالضغطة الأولى تُفقد.
     */
    async function clickUntil(frame, findClickTarget, checkFn, opts) {
        const maxAttempts = (opts && opts.maxAttempts) || 3;
        const perAttemptTimeout = (opts && opts.perAttemptTimeout) || 5000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            if (!doc) return null;
            const already = checkFn(doc);
            if (already) return already;
            const target = findClickTarget(doc);
            if (!target) {
                await new Promise(r => setTimeout(r, 400));
                continue;
            }
            dispatchFullClick(target);
            const result = await waitFor(frame, checkFn, perAttemptTimeout);
            if (result) return result;
        }
        const lastDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        return lastDoc ? checkFn(lastDoc) : null;
    }

    /**
     * يمشي فعلياً بنفس خطوات الموظف اليدوية: يفتح صفحة الدفع الخاصة بالعقد،
     * يضغط "تحصيل الدفع"، يختار طريقة "رابط الدفع". من هذي النقطة احتمالين:
     * - ما فيه رابط نشط: يطلع زر "إنشاء رابط الدفع" - نضغطه وننتظر الرابط
     *   الجديد (يقين نفسه يرسله تلقائياً على واتساب العميل من رقمه فور إنشائه).
     * - فيه رابط نشط من قبل (تنبيه "يوجد رابط دفع نشط"): نرجّع نفس الرابط
     *   الموجود بدون إنشاء رابط جديد ولا أي إرسال إضافي - يقين يسمح برابط
     *   نشط واحد بس، وهذا يمنع تكرار الرسائل للعميل.
     * المبلغ بالنموذج يجيه معبّى تلقائياً بالرصيد المتبقي من نظام يقين نفسه، فما نلمسه.
     */
    async function locateOrCreatePaymentLink(branchId, agreementNo) {
        const url = 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/close-agreements/' + agreementNo + '//payment';
        const frame = openHiddenFrame(url);
        try {
            const doc1 = await waitFor(frame, d => (findButtonByText(d, 'تحصيل الدفع') ? d : null), 20000);
            if (!doc1) throw new Error('تعذّر فتح صفحة الدفع الخاصة بالعقد');

            // بعد الضغط على "تحصيل الدفع" احتمالين: تطلع طرق الدفع (لازم نختار
            // "رابط الدفع")، أو تطلع مباشرة حالة "يوجد رابط دفع نشط" أو زر
            // "إنشاء رابط الدفع" لو كانت آخر طريقة استخدمها الموظف هي رابط
            // الدفع (يقين يتذكر آخر طريقة مختارة) - نتحمّل كل الاحتمالات
            const doc2 = await clickUntil(
                frame,
                d => findButtonByText(d, 'تحصيل الدفع'),
                d => {
                    const dialog = d.querySelector('[role="dialog"]');
                    if (!dialog) return null;
                    return (findButtonByText(dialog, 'رابط الدفع') || classifyPaymentDialogState(dialog) || findButtonByText(dialog, 'إنشاء رابط الدفع')) ? d : null;
                },
                { maxAttempts: 3, perAttemptTimeout: 5000 }
            );
            if (!doc2) throw new Error('تعذّر فتح نافذة تحصيل الدفع');

            let dialog = doc2.querySelector('[role="dialog"]');
            let state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            const doc3 = await clickUntil(
                frame,
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return dlg ? findButtonByText(dlg, 'رابط الدفع') : null;
                },
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    if (!dlg) return null;
                    return (findButtonByText(dlg, 'إنشاء رابط الدفع') || classifyPaymentDialogState(dlg)) ? d : null;
                },
                { maxAttempts: 3, perAttemptTimeout: 4000 }
            );
            if (!doc3) throw new Error('تعذّر تحميل خيار رابط الدفع');

            dialog = doc3.querySelector('[role="dialog"]');
            state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            // زر "إنشاء رابط الدفع" أحياناً يطلع أول شي بشكل متفائل (optimistic)
            // قبل ما يوصل رد فحص "هل فيه رابط نشط؟" من السيرفر، وبعدها يتحوّل
            // فجأة لتنبيه "يوجد رابط دفع نشط" - ننتظر شوي ونعيد الفحص قبل ما
            // نضغط "إنشاء رابط الدفع" فعلياً، حتى ما نولّد رابط مكرر ونرسله بالغلط
            await new Promise(r => setTimeout(r, 1200));
            dialog = (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document))?.querySelector('[role="dialog"]');
            state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            const doc4 = await clickUntil(
                frame,
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return dlg ? findButtonByText(dlg, 'إنشاء رابط الدفع') : null;
                },
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return (dlg && classifyPaymentDialogState(dlg)) ? d : null;
                },
                { maxAttempts: 2, perAttemptTimeout: 10000 }
            );
            if (!doc4) throw new Error('تعذّر الحصول على رابط الدفع (تأكد إن العقد لسا عليه مبلغ متبقي)');

            const finalDialog = doc4.querySelector('[role="dialog"]');
            const finalState = classifyPaymentDialogState(finalDialog);
            const linkEl = findQuickpayLink(finalDialog);
            if (!linkEl) throw new Error('تعذّر الحصول على رابط الدفع (تأكد إن العقد لسا عليه مبلغ متبقي)');
            return { status: finalState === 'active' ? 'existing' : 'created', link: linkEl.getAttribute('href') };
        } catch (err) {
            // تشخيص: نطبع محتوى نافذة الدفع وقت الفشل بالـconsole عشان لو
            // تكرر الفشل نقدر نشوف بالضبط أي حالة DOM ما كنا نتوقعها
            try {
                const failDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
                const dialog = failDoc && failDoc.querySelector('[role="dialog"]');
                console.warn('[العقود المتأخرة] محتوى نافذة الدفع وقت الفشل:', dialog ? dialog.innerHTML.slice(0, 3000) : '(لا توجد نافذة مفتوحة حالياً)');
            } catch (logErr) { /* تجاهل */ }
            throw err;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function buildPaymentLinkMessage(record, paymentLink) {
        const name = record.name || 'عميلنا العزيز';
        return (
            'مرحباً ' + name + '،\n\n' +
            'يوجد مبلغ متأخر بقيمة ' + record.remaining + ' ريال على العقد رقم ' + record.agreementNo + ' الخاص فيكم.\n' +
            'الرجاء السداد عن طريق الرابط التالي:\n' + paymentLink + '\n\n' +
            'شاكرين لكم تعاونكم 🌹'
        );
    }

    function setRowStatus(idx, text, color) {
        const el = document.getElementById('late-payments-status-' + idx);
        if (el) { el.textContent = text; el.style.color = color; }
    }

    function rowButtons(idx) {
        return {
            branchBtn: document.querySelector('.late-payments-send-branch-btn[data-idx="' + idx + '"]'),
        };
    }

    /**
     * منطق الإرسال الفعلي لصف واحد (بدون أي تأكيد - التأكيد مسؤولية المستدعي).
     * يحدّث حالة الصف بنفسه: ⏳ جارٍ ← ✅ تم الإرسال / ℹ️ يوجد رابط مرسل بالفعل
     * / ⚠️ لا يوجد جوال / ❌ فشل الإرسال. تُستخدم من زر الصف نفسه ومن "إرسال للجميع".
     */
    async function sendPaymentLinkForRecord(record, idx) {
        const { branchBtn } = rowButtons(idx);
        if (branchBtn) branchBtn.disabled = true;
        setRowStatus(idx, '⏳ جارٍ التنفيذ...', '#777');
        try {
            if (!record.phone) {
                setRowStatus(idx, '⚠️ لا يوجد جوال', '#eab308');
                return;
            }
            const result = await locateOrCreatePaymentLink(BRANCH_ID, record.agreementNo);
            console.log('[العقود المتأخرة] نتيجة رابط الدفع للعقد ' + record.agreementNo + ':', result.status, result.link);
            if (result.status === 'existing') {
                setRowStatus(idx, 'ℹ️ يوجد رابط مرسل بالفعل', '#2563eb');
            } else {
                const message = buildPaymentLinkMessage(record, result.link);
                await sendWhatsAppText(normalizePhoneToJid(record.phone), message);
                setRowStatus(idx, '✅ تم الإرسال', '#16a34a');
            }
        } catch (err) {
            console.error('[العقود المتأخرة] فشل إرسال رابط الدفع:', err);
            setRowStatus(idx, '❌ فشل الإرسال', '#dc2626');
        } finally {
            if (branchBtn) branchBtn.disabled = false;
        }
    }

    /** زر الصف الواحد - يسأل تأكيد فردي ثم ينفّذ */
    async function handleSendFromBranch(record, idx) {
        if (!record.phone) {
            showToast('لا يوجد رقم جوال لهذا العميل بالبيانات المسحوبة', 'error');
            return;
        }
        if (!confirm('سيتم إنشاء رابط دفع (إن لم يوجد رابط نشط) للعقد ' + record.agreementNo + ' وإرساله للعميل (' + record.name + ') من رقم واتساب الفرع.\nمتابعة؟')) {
            return;
        }
        await sendPaymentLinkForRecord(record, idx);
    }

    /** زر "إرسال للجميع" - تأكيد واحد للدفعة كاملة، ثم يمشي على كل صف بالتتابع (مو بالتوازي) */
    async function handleSendAll(records) {
        if (records.length === 0) return;
        if (!confirm('سيتم إرسال روابط السداد لجميع العملاء بالقائمة (' + records.length + ' عميل) واحداً تلو الآخر عبر رقم واتساب الفرع.\nمتابعة؟')) {
            return;
        }
        const allBtn = document.getElementById('late-payments-send-all');
        if (allBtn) allBtn.disabled = true;
        for (let i = 0; i < records.length; i++) {
            await sendPaymentLinkForRecord(records[i], i);
        }
        if (allBtn) allBtn.disabled = false;
        showToast('انتهى إرسال روابط السداد لجميع العملاء.', 'success');
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يفحص عقداً واحداً بالتفصيل (نفس المنطق الأصلي بالضبط، بدون أي تغيير):
     * يفتح صفحة العقد، يقرأ الرصيد المتبقي الحقيقي، ويرجع null لو تعذّر الفتح
     * أو لو الرصيد أقل من الحد المطلوب - وإلا يوسّع بيانات العميل ويرجع النتيجة.
     */
    async function checkOneAgreement(frame, c, threshold) {
        // نتأكد إن الرابط فعلاً تغيّر قبل قراءة القيمة، وإلا ممكن نلقط DOM العقد السابق
        // اللي لسا موجود لحظة التنقّل، ونظل نقرأ نفس القيمة القديمة لكل العقود اللي بعده
        const targetPath = new URL(c.href).pathname;
        frame.src = c.href;
        const doc2 = await waitFor(frame, d => {
            if (d.location.pathname !== targetPath) return null;
            return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
        }, 20000);
        if (!doc2) return { checked: false, record: null };

        const total = parseAmount(doc2.querySelector('[data-testid="total-value"]')?.textContent);
        const paid = parseAmount(doc2.querySelector('[data-testid="paid-amount-value"]')?.textContent);
        const remaining = parseAmount(doc2.querySelector('[data-testid="remaining-balance-value"]')?.textContent);

        // الرصيد المتبقي الحقيقي (من صفحة العقد نفسها) هو أساس الفلترة، مو أي مؤشر بالقائمة
        if (isNaN(remaining) || remaining < threshold) return { checked: true, record: null };

        // نفس زر توسيع بيانات العميل المستخدم بأدوات الإيميل - يفتح لوحة فيها الجوال ورقم الهوية.
        // نبحث عنه بانتظار فعلي (مو محاولة وحدة) لأن مع 4 إطارات تشتغل بالتوازي
        // ممكن العنصر يكون لسا ما تركّب لحظة وصولنا هنا رغم ظهور "الرصيد المتبقي"
        let expandBtn = null;
        const btnWaitStart = Date.now();
        while (Date.now() - btnWaitStart < 3000) {
            expandBtn = Array.from(doc2.querySelectorAll('button.inline-flex'))
                .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
            if (expandBtn) break;
            await new Promise(r => setTimeout(r, 150));
        }
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        }

        // ننتظر فعلياً لين يظهر رقم الجوال بدل انتظار ثابت 1200ms - مع 4
        // إطارات تشتغل بالتوازي (CHECK_CONCURRENCY) ممكن يتأخر ظهور اللوحة
        // شوي عن ذلك الوقت الثابت، فيطلع الصف بدون جوال ولا هوية بدون داعي
        const waitStart = Date.now();
        let dialog = doc2.querySelector('[role="dialog"]') || doc2;
        while (Date.now() - waitStart < 4000) {
            dialog = doc2.querySelector('[role="dialog"]') || doc2;
            const hasPhone = Array.from(dialog.querySelectorAll('span')).some(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
            if (hasPhone) break;
            await new Promise(r => setTimeout(r, 200));
        }

        const idNumber = findValueNearLabel(dialog, "رقم الهوية");
        const phoneEl = Array.from(dialog.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        return {
            checked: true,
            record: {
                agreementNo: c.agreementNo,
                name: c.name,
                phone,
                idNumber,
                total: isNaN(total) ? "" : total.toFixed(2),
                paid: isNaN(paid) ? "" : paid.toFixed(2),
                remaining: remaining.toFixed(2),
            },
        };
    }

    async function runReport(threshold) {

        const frame = openHiddenFrame(LATE_RETURN_URL);

        showProgress("جارٍ تحميل قائمة العقود المتأخرة...");

        try {

            const doc1 = await waitFor(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
            if (!doc1) throw new Error("لم يتم العثور على أي عقود متأخرة");

            showProgress("جارٍ جمع كل صفحات القائمة...");
            const allRows = await collectAllPages(frame, doc1);
            try { frame.remove(); } catch (err) { /* تجاهل */ }

            // أيقونة "الإجمالي" بالقائمة مو مؤشر موثوق - لازم ندخل كل عقد فعلياً من زر
            // "إنهاء الاتفاقية" ونشوف "الرصيد المتبقي" الحقيقي بصفحة التفاصيل
            const candidates = allRows.slice(0, MAX_AGREEMENTS);

            if (candidates.length === 0) {
                showReport([], threshold, 0, 0);
                return;
            }

            let checkedCount = 0;
            let processedCount = 0;
            // نتيجة كل عقد تُحفظ في نفس فهرسه الأصلي (وليس بترتيب الاكتمال) حتى
            // يبقى ترتيب التقرير النهائي مطابقاً تماماً لترتيب قائمة LATE_RETURN
            // الأصلية، بغض النظر عن أي عامل خلص قبل غيره
            const recordsByIndex = new Array(candidates.length).fill(null);

            // نوزّع العقود على عدة إطارات مخفية بالتناوب (round robin)، كل إطار
            // يعالج نصيبه بالتتابع بنفس منطق الفحص الأصلي بالضبط - فقط موازاة
            // على مستوى الإطارات، بدون أي تغيير على كيفية فحص العقد الواحد
            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    processedCount++;
                    showProgress(`جارٍ فحص العقود المرشّحة... (${processedCount} من ${candidates.length})`);
                    const c = candidates[i];
                    try {
                        const { checked, record } = await checkOneAgreement(workerFrame, c, threshold);
                        if (checked) checkedCount++;
                        if (record) recordsByIndex[i] = record;
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            const results = recordsByIndex.filter(Boolean);

            showReport(results, threshold, checkedCount, candidates.length);

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:16px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
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
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-late-payments')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-late-payments';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="late-payments-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showThresholdPrompt() {
        document.getElementById('late-payments-box')?.remove();

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>💰 العقود المتأخرة في السداد</h3>' +
            '<div class="yq-desc">بيفلتر أول شي من نفس القائمة (المسدَّدة وتحت الحد ما تُفتح)، وبيفتح بس العقود المرشّحة للتأكد من التفاصيل.<br>أقل مبلغ تأخير تبغى تشوفه (ريال):</div>' +
            '<input id="late-payments-input" type="number" min="1" step="1" value="500" class="yq-field" />' +
            '<button id="late-payments-submit" class="yq-btn yq-btn-primary">فحص العقود</button>' +
            '<button id="late-payments-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            340
        ));

        const input = document.getElementById('late-payments-input');
        input.focus();
        input.select();

        function submit() {
            const threshold = parseFloat(input.value);
            if (!threshold || threshold <= 0) {
                input.classList.add('yq-field-err');
                return;
            }
            runReport(threshold);
        }

        document.getElementById('late-payments-submit').onclick = submit;
        document.getElementById('late-payments-cancel').onclick = () => {
            document.getElementById('late-payments-box')?.remove();
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }

    function showProgress(text) {
        document.getElementById('late-payments-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('late-payments-box')?.remove();
        showToast(text, type || 'error');
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الاسم', 'الجوال', 'رقم الهوية', 'الإجمالي', 'المدفوع', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.name, r.phone, r.idNumber, r.total, r.paid, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, threshold) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.total + '</td><td>' + r.paid + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>العقود المتأخرة في السداد</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر)</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    /** يحوّل نص UTF-8 (فيه عربي) إلى base64 - btoa العادية تدعم Latin1 بس */
    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records, threshold) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.total + '</td><td>' + r.paid + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر)</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    /** يرسم الجدول كصورة PNG/JPEG عبر SVG+foreignObject. يعيد Promise بصيغة data URL */
    function buildReportImageDataUrl(records, threshold) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, threshold);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                // data URI (مش blob:) لأن كروم يرفض canvas.toDataURL() بصمت على SVG
                // فيها foreignObject لو كانت محمّلة من blob: (Tainted Canvas)
                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000; // ~6MB بعد فك التشفير - هامش مريح تحت حد الـ100mb
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    /** إرسال كصورة عبر بوت واتساب - نفس صيغة باقي الأدوات */
    function handleSendWhatsApp(records, threshold) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, threshold)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        // نرسل base64 خام بدون بادئة data:image/...;base64, لأن أغلب أكواد
                        // البوتات تعمل Buffer.from(imageBase64,'base64') مباشرة، والبادئة تفسد البيانات
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر) - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[العقود المتأخرة] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[العقود المتأخرة] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[العقود المتأخرة] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[العقود المتأخرة] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب المبلغ المتبقي)
    // ==========================================================

    const sortState = { key: null, dir: 1 };

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (parseFloat(a.remaining) - parseFloat(b.remaining)) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, threshold, checkedCount, totalCandidates, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), threshold, checkedCount, totalCandidates);
    }

    function showReport(records, threshold, checkedCount, totalCandidates) {
        document.getElementById('late-payments-box')?.remove();
        injectYqStyles();

        const rowsHtml = records.map((r, idx) => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td>' +
            '<td>' + r.total + '</td>' +
            '<td>' + r.paid + '</td>' +
            '<td style="font-weight:800;color:#dc2626;">' + r.remaining + '</td>' +
            '<td><button class="late-payments-send-branch-btn yq-row-send-btn" data-idx="' + idx + '">📤 إرسال رابط سداد</button></td>' +
            '<td><span id="late-payments-status-' + idx + '" style="font-size:13px;color:#a19c92;">—</span></td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="9" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود متأخرة بهذا المبلغ أو أكثر</td></tr>';

        const html =
            '<div id="late-payments-box" class="yq-overlay">' +
            '<div style="width:min(980px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">💰 العقود المتأخرة بمبلغ ' + threshold + ' ريال فأكثر</div>' +
            '<div class="yq-report-sub">' +
            'تم فحص ' + checkedCount + ' من أصل ' + totalCandidates + ' عقد بقائمة LATE_RETURN' +
            (checkedCount < totalCandidates ? ' (' + (totalCandidates - checkedCount) + ' تعذّر فتحها)' : '') +
            ' · عدد العقود المطابقة: ' + records.length +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th>' +
            '<th id="late-payments-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '<th>إرسال رابط سداد</th><th>الحالة</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="late-payments-copy">📋 نسخ</button>' +
            '<button id="late-payments-print">🖨️ طباعة</button>' +
            '<button id="late-payments-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="late-payments-send-all" class="yq-send">📤 إرسال للجميع</button>' +
            '<button id="late-payments-refresh">🔄 تحديث</button>' +
            '<button id="late-payments-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('late-payments-close').onclick = () => {
            document.getElementById('late-payments-box')?.remove();
        };
        document.getElementById('late-payments-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(threshold);
        };
        document.getElementById('late-payments-sort-remaining').onclick = () => {
            handleSortClick(records, threshold, checkedCount, totalCandidates, 'remaining');
        };
        document.getElementById('late-payments-print').onclick = () => {
            printReport(records, threshold);
        };
        document.getElementById('late-payments-whatsapp').onclick = () => {
            handleSendWhatsApp(records, threshold);
        };
        document.getElementById('late-payments-send-all').onclick = () => {
            handleSendAll(records);
        };
        document.getElementById('late-payments-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
        document.querySelectorAll('.late-payments-send-branch-btn').forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            btn.onclick = () => handleSendFromBranch(records[idx], idx);
        });
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-late-payments-branches-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    // قائمة الفروع المتاحة للاختيار - المستخدم يختار فرع واحد بكل مرة يشغّل
    // فيها الأداة (بعكس أداة "العقود المتأخرة في السداد (أفراد)" الأصلية
    // اللي تفحص فرع مطار جدة فقط، وبعكس أي نسخة تفحص كل الفروع مع بعض)
    const BRANCHES = [
        { id: 29, name: 'مطار جدة' },
        { id: 11, name: 'طريق المدينة' },
        { id: 12, name: 'شارع التحلية' },
        { id: 30, name: 'مطار الطائف' },
        { id: 10, name: 'ينبع - الهيئة الملكية' },
        { id: 25, name: 'مطار الأمير عبدالمحسن - ينبع' },
        { id: 36, name: 'المدينة المنورة' },
        { id: 59, name: 'مطار الأمير محمد بن عبدالعزيز الدولي - المدينة' },
        { id: 70, name: 'مدينة العلا' },
        { id: 217, name: 'الطائف' },
        { id: 218, name: 'طريق الأمير سلطان' },
    ];

    function lateReturnUrlForBranch(branchId) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings?status=LATE_RETURN&pageSize=500';
    }

    function branchNameById(branchId) {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch ? branch.name : ('فرع #' + branchId);
    }

    const MAX_AGREEMENTS = 300;
    // عدد الإطارات المتوازية لفحص تفاصيل العقود - كل إطار يفحص عقوده بالتتابع
    // تماماً بنفس منطق الفحص الأصلي، بس موزّعين على عدة إطارات بدل واحد
    // فقط، فتسرع العملية بمقدار العدد تقريباً بدون أي تغيير بمنطق الفحص نفسه
    const CHECK_CONCURRENCY = 4;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "late-payments-branches",
            name: "💰 العقود المتأخرة (اختيار الفرع)",
            run() {
                showThresholdPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
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

    /** يلقط أي عنصر عنده نص مباشر (text node) يطابق التسمية تماماً - يتحمّل وجود أيقونة SVG جنبه */
    function findLabelElement(doc, labelText) {
        const candidates = doc.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    /** يدور القيمة القريبة من عنصر تسمية (يجرب الإخوة القريبين بالترتيبين، ما نعرف بالضبط ترتيب DOM) */
    function findValueNearLabel(doc, labelText) {
        const labelEl = findLabelElement(doc, labelText);
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

    function parseAmount(text) {
        if (!text) return NaN;
        const isNegative = text.indexOf('-') !== -1;
        const cleaned = text.replace(/[^\d.]/g, '');
        if (!cleaned) return NaN;
        const value = parseFloat(cleaned);
        if (isNaN(value)) return NaN;
        return isNegative ? -value : value;
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

    // ==========================================================
    // ترقيم الصفحات (نفس منطق الأدوات الثانية)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    /**
     * كل صف بجدول "العقود المتأخرة" فيه عمود "الإجمالي (ريال)" برقم + أيقونة:
     * أيقونة خضراء (fill-green-600) = تم السداد فعلياً رغم تأخر التسليم، ما نعتبره متأخر بالسداد.
     * أيقونة رمادية (fill-slate-400) = لسا عليه مبلغ متأخر فعلاً.
     * هذا يغنينا عن فتح كل عقد للتأكد - نفلتر أول شي من نفس القائمة، ونفتح بس اللي يستاهل.
     */
    function readLateReturnRows(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const bookingIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
        const driverIdx = findColumnIndex(headerCells, ["السائق"]);
        const totalIdx = findColumnIndex(headerCells, ["الإجمالي"]);
        const debtorIdx = findColumnIndex(headerCells, ["اسم المدين"]);

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return null;

            // عمود "اسم المدين" يكون "غير متاح" للأفراد، ويعرض اسم الشركة
            // الفعلي للعقود التابعة لشركات - وأغلب عقود الشركات المتأخرة سببها
            // إن الشركة نفسها ما مدّدت العقد بعد (مو تأخر سداد فردي). هذي
            // الأداة للأفراد فقط، فنتجاهل أي صف عنده اسم شركة حقيقي بهذا العمود
            const debtorText = debtorIdx !== -1 ? cells[debtorIdx].textContent.trim() : "";
            if (debtorText && debtorText !== "غير متاح") return null;

            const link = Array.from(row.querySelectorAll("a"))
                .find(a => (a.getAttribute("href") || "").includes("/close-agreements/"));
            if (!link) return null;

            const totalCell = totalIdx !== -1 ? cells[totalIdx] : null;
            const amountText = totalCell?.querySelector("p")?.textContent || "";
            const svg = totalCell?.querySelector("svg");
            const isSettled = svg ? (svg.getAttribute("class") || "").includes("fill-green-600") : false;

            const bookingNo = bookingIdx !== -1 ? cells[bookingIdx].textContent.trim() : "";
            const agreementNo = agreementIdx !== -1 ? cells[agreementIdx].textContent.trim() : "";

            return {
                href: new URL(link.getAttribute("href"), location.origin).href,
                bookingNo,
                agreementNo,
                name: driverIdx !== -1 ? cells[driverIdx].textContent.trim() : "",
                listAmount: parseAmount(amountText),
                isSettled,
                __signature: agreementNo || bookingNo || link.getAttribute("href"),
            };
        }).filter(Boolean);
    }

    function collectAllPages(iframe, doc) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return readLateReturnRows(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    /**
     * يجمع صفوف العقود المتأخرة من الفروع المختارة فقط - فرع تلو فرع
     * بالتتابع (لا بالتوازي) لنفس السبب المعروف بالأدوات الثانية: فتح عدة
     * صفحات ثقيلة بنفس اللحظة يسبب تنافساً على الموارد ويفشل بعضها بصمت.
     */
    async function collectAllRowsForBranches(branchIds) {
        let allRows = [];
        for (const branchId of branchIds) {
            const branchName = branchNameById(branchId);
            showProgress('جارٍ تحميل قائمة العقود المتأخرة - ' + branchName + '...');
            const frame = openHiddenFrame(lateReturnUrlForBranch(branchId));
            try {
                const doc1 = await waitFor(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
                if (doc1) {
                    const rows = await collectAllPages(frame, doc1);
                    rows.forEach(r => { r.branchName = branchName; r.branchId = branchId; });
                    allRows = allRows.concat(rows);
                }
            } catch (err) {
                console.error('[العقود المتأخرة] تعذّر تحميل فرع ' + branchName + ':', err);
            } finally {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
            }
        }
        return allRows;
    }

    // ==========================================================
    // إرسال رابط السداد عبر واتساب (زر لكل عقد بالتقرير)
    // ==========================================================

    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findButtonByText(root, text) {
        const candidates = Array.from(root.querySelectorAll('button, a'));
        return candidates.find(el => (el.textContent || '').trim() === text) || null;
    }

    /**
     * يحوّل رقم جوال معروض بأي صيغة شائعة (05xxxxxxxx، +9665xxxxxxxx،
     * 9665xxxxxxxx، 5xxxxxxxx) إلى JID واتساب لرقم فردي بصيغة Baileys
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
                    Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ target: phoneJid, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main', type: 'text', message: message }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve();
                    else {
                        console.error('[العقود المتأخرة] فشل إرسال رابط الدفع:', response.status, response.responseText);
                        reject(new Error('فشل الإرسال (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    function findQuickpayLink(root) {
        if (!root) return null;
        return Array.from(root.querySelectorAll('a')).find(x => (x.getAttribute('href') || '').includes('/payment/quickpay/')) || null;
    }

    /**
     * نافذة "رابط الدفع" تطلع فيها حالتين متشابهتين شكلياً (فيهما نفس بلوك
     * تفاصيل الرابط)، بس بنص مختلف كلياً بتنبيه [role="alert"] بالأعلى:
     * - "يوجد رابط دفع نشط": رابط قديم من قبل - ما ننشئ ولا نرسل شي جديد.
     * - "تم إنشاء رابط الدفع وإرساله...": رابط جديد أنشأناه للتو فعلياً.
     * الاعتماد على نص التنبيه نفسه (مو مجرد وجود رابط بالنافذة، اللي يطلع
     * بالحالتين) هو الفيصل الموثوق - لون/شكل التنبيه تفصيل ثانوي قابل للتغيّر.
     */
    function classifyPaymentDialogState(dialog) {
        if (!dialog) return null;
        const alerts = Array.from(dialog.querySelectorAll('[role="alert"]'));
        for (const alert of alerts) {
            const text = alert.textContent || '';
            if (text.indexOf('يوجد رابط دفع نشط') !== -1) return 'active';
            if (text.indexOf('تم إنشاء رابط الدفع') !== -1) return 'created';
        }
        return null;
    }

    /**
     * يتحقق أول شي إذا الحالة المطلوبة متحققة أصلاً (بدون ضغط أي شي - مفيد
     * لما نكون فعلاً بمرحلة متقدمة ومحتاجين خطوة سابقة). إذا لأ، يدور على
     * عنصر يضغطه وينتظر تحقق الحالة، ويكرر المحاولة (ضغط جديد + انتظار جديد)
     * لأكثر من مرة - لأن أحياناً العنصر يكون موجود بالـDOM بس لسا ما تركّبت
     * معالجات الأحداث عليه فعلياً (سباق تحميل الصفحة)، فالضغطة الأولى تُفقد.
     */
    async function clickUntil(frame, findClickTarget, checkFn, opts) {
        const maxAttempts = (opts && opts.maxAttempts) || 3;
        const perAttemptTimeout = (opts && opts.perAttemptTimeout) || 5000;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const doc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
            if (!doc) return null;
            const already = checkFn(doc);
            if (already) return already;
            const target = findClickTarget(doc);
            if (!target) {
                await new Promise(r => setTimeout(r, 400));
                continue;
            }
            dispatchFullClick(target);
            const result = await waitFor(frame, checkFn, perAttemptTimeout);
            if (result) return result;
        }
        const lastDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
        return lastDoc ? checkFn(lastDoc) : null;
    }

    /**
     * يمشي فعلياً بنفس خطوات الموظف اليدوية: يفتح صفحة الدفع الخاصة بالعقد،
     * يضغط "تحصيل الدفع"، يختار طريقة "رابط الدفع". من هذي النقطة احتمالين:
     * - ما فيه رابط نشط: يطلع زر "إنشاء رابط الدفع" - نضغطه وننتظر الرابط
     *   الجديد (يقين نفسه يرسله تلقائياً على واتساب العميل من رقمه فور إنشائه).
     * - فيه رابط نشط من قبل (تنبيه "يوجد رابط دفع نشط"): نرجّع نفس الرابط
     *   الموجود بدون إنشاء رابط جديد ولا أي إرسال إضافي - يقين يسمح برابط
     *   نشط واحد بس، وهذا يمنع تكرار الرسائل للعميل.
     * المبلغ بالنموذج يجيه معبّى تلقائياً بالرصيد المتبقي من نظام يقين نفسه، فما نلمسه.
     */
    async function locateOrCreatePaymentLink(branchId, agreementNo) {
        const url = 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/close-agreements/' + agreementNo + '//payment';
        const frame = openHiddenFrame(url);
        try {
            const doc1 = await waitFor(frame, d => (findButtonByText(d, 'تحصيل الدفع') ? d : null), 20000);
            if (!doc1) throw new Error('تعذّر فتح صفحة الدفع الخاصة بالعقد');

            // بعد الضغط على "تحصيل الدفع" احتمالين: تطلع طرق الدفع (لازم نختار
            // "رابط الدفع")، أو تطلع مباشرة حالة "يوجد رابط دفع نشط" أو زر
            // "إنشاء رابط الدفع" لو كانت آخر طريقة استخدمها الموظف هي رابط
            // الدفع (يقين يتذكر آخر طريقة مختارة) - نتحمّل كل الاحتمالات
            const doc2 = await clickUntil(
                frame,
                d => findButtonByText(d, 'تحصيل الدفع'),
                d => {
                    const dialog = d.querySelector('[role="dialog"]');
                    if (!dialog) return null;
                    return (findButtonByText(dialog, 'رابط الدفع') || classifyPaymentDialogState(dialog) || findButtonByText(dialog, 'إنشاء رابط الدفع')) ? d : null;
                },
                { maxAttempts: 3, perAttemptTimeout: 5000 }
            );
            if (!doc2) throw new Error('تعذّر فتح نافذة تحصيل الدفع');

            let dialog = doc2.querySelector('[role="dialog"]');
            let state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            const doc3 = await clickUntil(
                frame,
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return dlg ? findButtonByText(dlg, 'رابط الدفع') : null;
                },
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    if (!dlg) return null;
                    return (findButtonByText(dlg, 'إنشاء رابط الدفع') || classifyPaymentDialogState(dlg)) ? d : null;
                },
                { maxAttempts: 3, perAttemptTimeout: 4000 }
            );
            if (!doc3) throw new Error('تعذّر تحميل خيار رابط الدفع');

            dialog = doc3.querySelector('[role="dialog"]');
            state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            // زر "إنشاء رابط الدفع" أحياناً يطلع أول شي بشكل متفائل (optimistic)
            // قبل ما يوصل رد فحص "هل فيه رابط نشط؟" من السيرفر، وبعدها يتحوّل
            // فجأة لتنبيه "يوجد رابط دفع نشط" - ننتظر شوي ونعيد الفحص قبل ما
            // نضغط "إنشاء رابط الدفع" فعلياً، حتى ما نولّد رابط مكرر ونرسله بالغلط
            await new Promise(r => setTimeout(r, 1200));
            dialog = (frame.contentDocument || (frame.contentWindow && frame.contentWindow.document))?.querySelector('[role="dialog"]');
            state = classifyPaymentDialogState(dialog);
            if (state) {
                const link = findQuickpayLink(dialog);
                return { status: state === 'active' ? 'existing' : 'created', link: link ? link.getAttribute('href') : null };
            }

            const doc4 = await clickUntil(
                frame,
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return dlg ? findButtonByText(dlg, 'إنشاء رابط الدفع') : null;
                },
                d => {
                    const dlg = d.querySelector('[role="dialog"]');
                    return (dlg && classifyPaymentDialogState(dlg)) ? d : null;
                },
                { maxAttempts: 2, perAttemptTimeout: 10000 }
            );
            if (!doc4) throw new Error('تعذّر الحصول على رابط الدفع (تأكد إن العقد لسا عليه مبلغ متبقي)');

            const finalDialog = doc4.querySelector('[role="dialog"]');
            const finalState = classifyPaymentDialogState(finalDialog);
            const linkEl = findQuickpayLink(finalDialog);
            if (!linkEl) throw new Error('تعذّر الحصول على رابط الدفع (تأكد إن العقد لسا عليه مبلغ متبقي)');
            return { status: finalState === 'active' ? 'existing' : 'created', link: linkEl.getAttribute('href') };
        } catch (err) {
            // تشخيص: نطبع محتوى نافذة الدفع وقت الفشل بالـconsole عشان لو
            // تكرر الفشل نقدر نشوف بالضبط أي حالة DOM ما كنا نتوقعها
            try {
                const failDoc = frame.contentDocument || (frame.contentWindow && frame.contentWindow.document);
                const dialog = failDoc && failDoc.querySelector('[role="dialog"]');
                console.warn('[العقود المتأخرة] محتوى نافذة الدفع وقت الفشل:', dialog ? dialog.innerHTML.slice(0, 3000) : '(لا توجد نافذة مفتوحة حالياً)');
            } catch (logErr) { /* تجاهل */ }
            throw err;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function buildPaymentLinkMessage(record, paymentLink) {
        const name = record.name || 'عميلنا العزيز';
        return (
            'مرحباً ' + name + '،\n\n' +
            'يوجد مبلغ متأخر بقيمة ' + record.remaining + ' ريال على العقد رقم ' + record.agreementNo + ' الخاص فيكم.\n' +
            'الرجاء السداد عن طريق الرابط التالي:\n' + paymentLink + '\n\n' +
            'شاكرين لكم تعاونكم 🌹'
        );
    }

    function setRowStatus(idx, text, color) {
        const el = document.getElementById('late-payments-status-' + idx);
        if (el) { el.textContent = text; el.style.color = color; }
    }

    function rowButtons(idx) {
        return {
            branchBtn: document.querySelector('.late-payments-send-branch-btn[data-idx="' + idx + '"]'),
        };
    }

    /**
     * منطق الإرسال الفعلي لصف واحد (بدون أي تأكيد - التأكيد مسؤولية المستدعي).
     * يحدّث حالة الصف بنفسه: ⏳ جارٍ ← ✅ تم الإرسال / ℹ️ يوجد رابط مرسل بالفعل
     * / ⚠️ لا يوجد جوال / ❌ فشل الإرسال. تُستخدم من زر الصف نفسه ومن "إرسال للجميع".
     */
    async function sendPaymentLinkForRecord(record, idx) {
        const { branchBtn } = rowButtons(idx);
        if (branchBtn) branchBtn.disabled = true;
        setRowStatus(idx, '⏳ جارٍ التنفيذ...', '#777');
        try {
            if (!record.phone) {
                setRowStatus(idx, '⚠️ لا يوجد جوال', '#eab308');
                return;
            }
            const result = await locateOrCreatePaymentLink(record.branchId, record.agreementNo);
            console.log('[العقود المتأخرة] نتيجة رابط الدفع للعقد ' + record.agreementNo + ':', result.status, result.link);
            if (result.status === 'existing') {
                setRowStatus(idx, 'ℹ️ يوجد رابط مرسل بالفعل', '#2563eb');
            } else {
                const message = buildPaymentLinkMessage(record, result.link);
                await sendWhatsAppText(normalizePhoneToJid(record.phone), message);
                setRowStatus(idx, '✅ تم الإرسال', '#16a34a');
            }
        } catch (err) {
            console.error('[العقود المتأخرة] فشل إرسال رابط الدفع:', err);
            setRowStatus(idx, '❌ فشل الإرسال', '#dc2626');
        } finally {
            if (branchBtn) branchBtn.disabled = false;
        }
    }

    /** زر الصف الواحد - يسأل تأكيد فردي ثم ينفّذ */
    async function handleSendFromBranch(record, idx) {
        if (!record.phone) {
            showToast('لا يوجد رقم جوال لهذا العميل بالبيانات المسحوبة', 'error');
            return;
        }
        if (!confirm('سيتم إنشاء رابط دفع (إن لم يوجد رابط نشط) للعقد ' + record.agreementNo + ' (' + record.branchName + ') وإرساله للعميل (' + record.name + ') من رقم واتساب الفرع.\nمتابعة؟')) {
            return;
        }
        await sendPaymentLinkForRecord(record, idx);
    }

    /** زر "إرسال للجميع" - تأكيد واحد للدفعة كاملة، ثم يمشي على كل صف بالتتابع (مو بالتوازي) */
    async function handleSendAll(records) {
        if (records.length === 0) return;
        if (!confirm('سيتم إرسال روابط السداد لجميع العملاء بالقائمة (' + records.length + ' عميل) واحداً تلو الآخر عبر رقم واتساب الفرع.\nمتابعة؟')) {
            return;
        }
        const allBtn = document.getElementById('late-payments-send-all');
        if (allBtn) allBtn.disabled = true;
        for (let i = 0; i < records.length; i++) {
            await sendPaymentLinkForRecord(records[i], i);
        }
        if (allBtn) allBtn.disabled = false;
        showToast('انتهى إرسال روابط السداد لجميع العملاء.', 'success');
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يفحص عقداً واحداً بالتفصيل (نفس المنطق الأصلي بالضبط، بدون أي تغيير):
     * يفتح صفحة العقد، يقرأ الرصيد المتبقي الحقيقي، ويرجع null لو تعذّر الفتح
     * أو لو الرصيد أقل من الحد المطلوب - وإلا يوسّع بيانات العميل ويرجع النتيجة.
     */
    async function checkOneAgreement(frame, c, threshold) {
        // نتأكد إن الرابط فعلاً تغيّر قبل قراءة القيمة، وإلا ممكن نلقط DOM العقد السابق
        // اللي لسا موجود لحظة التنقّل، ونظل نقرأ نفس القيمة القديمة لكل العقود اللي بعده
        const targetPath = new URL(c.href).pathname;
        frame.src = c.href;
        const doc2 = await waitFor(frame, d => {
            if (d.location.pathname !== targetPath) return null;
            return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
        }, 20000);
        if (!doc2) return { checked: false, record: null };

        const total = parseAmount(doc2.querySelector('[data-testid="total-value"]')?.textContent);
        const paid = parseAmount(doc2.querySelector('[data-testid="paid-amount-value"]')?.textContent);
        const remaining = parseAmount(doc2.querySelector('[data-testid="remaining-balance-value"]')?.textContent);

        // الرصيد المتبقي الحقيقي (من صفحة العقد نفسها) هو أساس الفلترة، مو أي مؤشر بالقائمة
        if (isNaN(remaining) || remaining < threshold) return { checked: true, record: null };

        // نفس زر توسيع بيانات العميل المستخدم بأدوات الإيميل - يفتح لوحة فيها الجوال ورقم الهوية.
        // نبحث عنه بانتظار فعلي (مو محاولة وحدة) لأن مع 4 إطارات تشتغل بالتوازي
        // ممكن العنصر يكون لسا ما تركّب لحظة وصولنا هنا رغم ظهور "الرصيد المتبقي"
        let expandBtn = null;
        const btnWaitStart = Date.now();
        while (Date.now() - btnWaitStart < 3000) {
            expandBtn = Array.from(doc2.querySelectorAll('button.inline-flex'))
                .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66'));
            if (expandBtn) break;
            await new Promise(r => setTimeout(r, 150));
        }
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        }

        // ننتظر فعلياً لين يظهر رقم الجوال بدل انتظار ثابت 1200ms - مع 4
        // إطارات تشتغل بالتوازي (CHECK_CONCURRENCY) ممكن يتأخر ظهور اللوحة
        // شوي عن ذلك الوقت الثابت، فيطلع الصف بدون جوال ولا هوية بدون داعي
        const waitStart = Date.now();
        let dialog = doc2.querySelector('[role="dialog"]') || doc2;
        while (Date.now() - waitStart < 4000) {
            dialog = doc2.querySelector('[role="dialog"]') || doc2;
            const hasPhone = Array.from(dialog.querySelectorAll('span')).some(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
            if (hasPhone) break;
            await new Promise(r => setTimeout(r, 200));
        }

        const idNumber = findValueNearLabel(dialog, "رقم الهوية");
        const phoneEl = Array.from(dialog.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        return {
            checked: true,
            record: {
                agreementNo: c.agreementNo,
                branchName: c.branchName,
                branchId: c.branchId,
                name: c.name,
                phone,
                idNumber,
                total: isNaN(total) ? "" : total.toFixed(2),
                paid: isNaN(paid) ? "" : paid.toFixed(2),
                remaining: remaining.toFixed(2),
            },
        };
    }

    async function runReport(branchIds, threshold) {

        try {

            const allRows = await collectAllRowsForBranches(branchIds);

            // أيقونة "الإجمالي" بالقائمة مو مؤشر موثوق - لازم ندخل كل عقد فعلياً من زر
            // "إنهاء الاتفاقية" ونشوف "الرصيد المتبقي" الحقيقي بصفحة التفاصيل
            const candidates = allRows.slice(0, MAX_AGREEMENTS);

            if (candidates.length === 0) {
                showReport([], branchIds, threshold, 0, 0);
                return;
            }

            let checkedCount = 0;
            let processedCount = 0;
            // نتيجة كل عقد تُحفظ في نفس فهرسه الأصلي (وليس بترتيب الاكتمال) حتى
            // يبقى ترتيب التقرير النهائي مطابقاً تماماً لترتيب قائمة LATE_RETURN
            // الأصلية، بغض النظر عن أي عامل خلص قبل غيره
            const recordsByIndex = new Array(candidates.length).fill(null);

            // نوزّع العقود على عدة إطارات مخفية بالتناوب (round robin)، كل إطار
            // يعالج نصيبه بالتتابع بنفس منطق الفحص الأصلي بالضبط - فقط موازاة
            // على مستوى الإطارات، بدون أي تغيير على كيفية فحص العقد الواحد
            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    processedCount++;
                    showProgress(`جارٍ فحص العقود المرشّحة... (${processedCount} من ${candidates.length})`);
                    const c = candidates[i];
                    try {
                        const { checked, record } = await checkOneAgreement(workerFrame, c, threshold);
                        if (checked) checkedCount++;
                        if (record) recordsByIndex[i] = record;
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            const results = recordsByIndex.filter(Boolean);

            showReport(results, branchIds, threshold, checkedCount, candidates.length);

        } catch (err) {
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:16px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
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
        '.yq-branch-list{text-align:right;max-height:200px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:10px 14px;background:#fbfbf9;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-late-payments-branches')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-late-payments-branches';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="late-payments-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    /** يبني الاختيار متعدد الفروع (Checkboxes) - defaultBranchIds فاضية أو غير معطاة = كلهم محدَّدين افتراضياً */
    function showThresholdPrompt(defaultBranchIds) {
        document.getElementById('late-payments-box')?.remove();

        const preselected = (defaultBranchIds && defaultBranchIds.length) ? defaultBranchIds : BRANCHES.map(b => b.id);
        const branchCheckboxesHtml = BRANCHES.map(b => (
            '<label><input type="checkbox" class="late-payments-branch-cb" value="' + b.id + '"' +
            (preselected.indexOf(b.id) !== -1 ? ' checked' : '') + '> ' + b.name +
            '</label>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>💰 العقود المتأخرة في السداد</h3>' +
            '<div class="yq-link-row">' +
            '<span>الفروع</span>' +
            '<span><a href="#" id="late-payments-select-all">تحديد الكل</a> · ' +
            '<a href="#" id="late-payments-select-none">إلغاء الكل</a></span>' +
            '</div>' +
            '<div id="late-payments-branches-list" class="yq-branch-list">' + branchCheckboxesHtml + '</div>' +
            '<div class="yq-desc">بيفلتر أول شي من نفس القائمة (المسدَّدة وتحت الحد ما تُفتح)، وبيفتح بس العقود المرشّحة للتأكد من التفاصيل.<br>أقل مبلغ تأخير تبغى تشوفه (ريال):</div>' +
            '<input id="late-payments-input" type="number" min="1" step="1" value="500" class="yq-field" />' +
            '<button id="late-payments-submit" class="yq-btn yq-btn-primary">فحص العقود</button>' +
            '<button id="late-payments-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            360
        ));

        const input = document.getElementById('late-payments-input');
        input.focus();
        input.select();

        document.getElementById('late-payments-select-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.late-payments-branch-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('late-payments-select-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.late-payments-branch-cb').forEach(cb => { cb.checked = false; });
        };

        function submit() {
            const threshold = parseFloat(input.value);
            if (!threshold || threshold <= 0) {
                input.classList.add('yq-field-err');
                return;
            }
            const branchIds = Array.from(document.querySelectorAll('.late-payments-branch-cb:checked')).map(cb => parseInt(cb.value, 10));
            if (branchIds.length === 0) {
                showToast('اختر فرع واحد على الأقل', 'error');
                return;
            }
            runReport(branchIds, threshold);
        }

        document.getElementById('late-payments-submit').onclick = submit;
        document.getElementById('late-payments-cancel').onclick = () => {
            document.getElementById('late-payments-box')?.remove();
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    }

    function showProgress(text) {
        document.getElementById('late-payments-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('late-payments-box')?.remove();
        showToast(text, type || 'error');
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الفرع', 'الاسم', 'الجوال', 'رقم الهوية', 'الإجمالي', 'المدفوع', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.branchName, r.name, r.phone, r.idNumber, r.total, r.paid, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, branchesLabel, threshold) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.total + '</td><td>' + r.paid + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="8">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>العقود المتأخرة في السداد</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر)</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    /** يحوّل نص UTF-8 (فيه عربي) إلى base64 - btoa العادية تدعم Latin1 بس */
    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records, branchesLabel, threshold) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.total + '</td><td>' + r.paid + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="8">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر)</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    /** يرسم الجدول كصورة PNG/JPEG عبر SVG+foreignObject. يعيد Promise بصيغة data URL */
    function buildReportImageDataUrl(records, branchName, threshold) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, branchName, threshold);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                // data URI (مش blob:) لأن كروم يرفض canvas.toDataURL() بصمت على SVG
                // فيها foreignObject لو كانت محمّلة من blob: (Tainted Canvas)
                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000; // ~6MB بعد فك التشفير - هامش مريح تحت حد الـ100mb
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    /** إرسال كصورة عبر بوت واتساب - نفس صيغة باقي الأدوات */
    function handleSendWhatsApp(records, branchName, threshold) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, branchName, threshold)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        // نرسل base64 خام بدون بادئة data:image/...;base64, لأن أغلب أكواد
                        // البوتات تعمل Buffer.from(imageBase64,'base64') مباشرة، والبادئة تفسد البيانات
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '💰 العقود المتأخرة في السداد (' + threshold + ' ريال فأكثر) - ' + branchName + ' - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[العقود المتأخرة] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[العقود المتأخرة] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[العقود المتأخرة] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[العقود المتأخرة] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب المبلغ المتبقي)
    // ==========================================================

    const sortState = { key: null, dir: 1 };

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (parseFloat(a.remaining) - parseFloat(b.remaining)) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, branchIds, threshold, checkedCount, totalCandidates, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), branchIds, threshold, checkedCount, totalCandidates);
    }

    function showReport(records, branchIds, threshold, checkedCount, totalCandidates) {
        document.getElementById('late-payments-box')?.remove();
        injectYqStyles();
        const branchesLabel = branchIds.map(branchNameById).join('، ');

        const rowsHtml = records.map((r, idx) => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.branchName + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td>' +
            '<td>' + r.total + '</td>' +
            '<td>' + r.paid + '</td>' +
            '<td style="font-weight:800;color:#dc2626;">' + r.remaining + '</td>' +
            '<td><button class="late-payments-send-branch-btn yq-row-send-btn" data-idx="' + idx + '">📤 إرسال رابط سداد</button></td>' +
            '<td><span id="late-payments-status-' + idx + '" style="font-size:13px;color:#a19c92;">—</span></td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="10" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود متأخرة بهذا المبلغ أو أكثر</td></tr>';

        const html =
            '<div id="late-payments-box" class="yq-overlay">' +
            '<div style="width:min(1000px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">💰 العقود المتأخرة بمبلغ ' + threshold + ' ريال فأكثر</div>' +
            '<div class="yq-report-sub">الفروع: ' + branchesLabel + '</div>' +
            '<div class="yq-report-sub">' +
            'تم فحص ' + checkedCount + ' من أصل ' + totalCandidates + ' عقد بقائمة LATE_RETURN' +
            (checkedCount < totalCandidates ? ' (' + (totalCandidates - checkedCount) + ' تعذّر فتحها)' : '') +
            ' · عدد العقود المطابقة: ' + records.length +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>الإجمالي</th><th>المدفوع</th>' +
            '<th id="late-payments-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '<th>إرسال رابط سداد</th><th>الحالة</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="late-payments-copy">📋 نسخ</button>' +
            '<button id="late-payments-print">🖨️ طباعة</button>' +
            '<button id="late-payments-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="late-payments-send-all" class="yq-send">📤 إرسال للجميع</button>' +
            '<button id="late-payments-change-branch">🏢 تغيير الفروع</button>' +
            '<button id="late-payments-refresh">🔄 تحديث</button>' +
            '<button id="late-payments-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('late-payments-close').onclick = () => {
            document.getElementById('late-payments-box')?.remove();
        };
        document.getElementById('late-payments-change-branch').onclick = () => {
            showThresholdPrompt(branchIds);
        };
        document.getElementById('late-payments-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(branchIds, threshold);
        };
        document.getElementById('late-payments-sort-remaining').onclick = () => {
            handleSortClick(records, branchIds, threshold, checkedCount, totalCandidates, 'remaining');
        };
        document.getElementById('late-payments-print').onclick = () => {
            printReport(records, branchesLabel, threshold);
        };
        document.getElementById('late-payments-whatsapp').onclick = () => {
            handleSendWhatsApp(records, branchesLabel, threshold);
        };
        document.getElementById('late-payments-send-all').onclick = () => {
            handleSendAll(records);
        };
        document.getElementById('late-payments-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
        document.querySelectorAll('.late-payments-send-branch-btn').forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            btn.onclick = () => handleSendFromBranch(records[idx], idx);
        });
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-company-extension-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    const LATE_RETURN_URL = 'https://yaqeen.lumirental.com/rental/branches/29/bookings?status=LATE_RETURN&pageSize=500';
    const MAX_AGREEMENTS = 300;
    // عدد الإطارات المتوازية لفحص تفاصيل العقود - كل إطار يفحص عقوده بالتتابع،
    // فقط موزّعين على عدة إطارات بدل واحد فقط لتسريع العملية (نفس أسلوب أداة
    // "العقود المتأخرة في السداد (أفراد)")
    const CHECK_CONCURRENCY = 4;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "company-extension",
            name: "🏢 عقود الشركات غير الممددة",
            run() {
                runReport();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
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

    /** يحوّل نص مدة بصيغة "X أيام : Y ساعات" إلى إجمالي عدد الساعات (رقم صحيح) */
    function parseDurationToHours(text) {
        if (!text) return null;
        const match = text.match(/(\d+)\s*أيام?\s*:\s*(\d+)\s*ساعات?/);
        if (!match) return null;
        return parseInt(match[1], 10) * 24 + parseInt(match[2], 10);
    }

    /** يحوّل إجمالي عدد ساعات إلى نفس صيغة يقين "X أيام : Y ساعات" */
    function formatHoursToDuration(totalHours) {
        if (totalHours == null || isNaN(totalHours)) return "";
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        return days + " أيام : " + hours + " ساعات";
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق باقي الأدوات)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    /**
     * يقرأ صفوف قائمة "العقود المتأخرة" - بعكس أداة الأفراد، هنا نحتفظ فقط
     * بالصفوف اللي عمود "اسم المدين" فيها اسم شركة حقيقي (مو "غير متاح")،
     * لأن هذي الأداة مخصصة لعقود الشركات تحديداً.
     */
    function readLateReturnRows(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const bookingIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
        const driverIdx = findColumnIndex(headerCells, ["السائق"]);
        const debtorIdx = findColumnIndex(headerCells, ["اسم المدين"]);

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return null;

            // "غير متاح" = فرد (بدون شركة راعية) - نتجاهله، هذي الأداة للشركات فقط
            const debtorText = debtorIdx !== -1 ? cells[debtorIdx].textContent.trim() : "";
            if (!debtorText || debtorText === "غير متاح") return null;

            const link = Array.from(row.querySelectorAll("a"))
                .find(a => (a.getAttribute("href") || "").includes("/close-agreements/"));
            if (!link) return null;

            const bookingNo = bookingIdx !== -1 ? cells[bookingIdx].textContent.trim() : "";
            const agreementNo = agreementIdx !== -1 ? cells[agreementIdx].textContent.trim() : "";

            return {
                href: new URL(link.getAttribute("href"), location.origin).href,
                bookingNo,
                agreementNo,
                personName: driverIdx !== -1 ? cells[driverIdx].textContent.trim() : "",
                debtorName: debtorText,
                __signature: agreementNo || bookingNo || link.getAttribute("href"),
            };
        }).filter(Boolean);
    }

    function collectAllPages(iframe, doc) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return readLateReturnRows(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يفحص عقداً واحداً: يفتح صفحة العقد، يوسّع أكورديون "المدة المحتسبة"
     * (مطوي افتراضياً)، ويقرأ تفاصيله. عمود "متأخر بـ" ما يظهر إطلاقاً إلا
     * لو العقد فعلاً متأخر ويحتاج تمديد - غيابه يعني العقد لسا ضمن مدته
     * المخطط لها ولا يحتاج شي، فنستبعده.
     */
    async function checkOneAgreement(frame, c) {
        const targetPath = new URL(c.href).pathname;
        frame.src = c.href;
        const doc2 = await waitFor(frame, d => {
            if (d.location.pathname !== targetPath) return null;
            return d.querySelector('[data-testid="billable-duration-toggle"]') ? d : null;
        }, 20000);
        if (!doc2) return { checked: false, record: null };

        const toggle = doc2.querySelector('[data-testid="billable-duration-toggle"]');
        if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
            try { toggle.click(); } catch (err) { /* تجاهل */ }
        }
        // ننتظر انتهاء أنيميشن التوسيع حتى تترسم عناصر التفاصيل بالـDOM
        await new Promise(r => setTimeout(r, 700));

        const lateEl = doc2.querySelector('[data-testid="billable-late-early"]');
        if (!lateEl) return { checked: true, record: null };

        const actualDuration = doc2.querySelector('[data-testid="billable-actual-duration"]')?.textContent.trim() || "";
        const plannedDuration = doc2.querySelector('[data-testid="billable-planned-duration"]')?.textContent.trim() || "";
        const extensionDuration = doc2.querySelector('[data-testid="billable-extension-duration"]')?.textContent.trim() || "";
        const lateDuration = lateEl.textContent.trim();

        const plannedHours = parseDurationToHours(plannedDuration) || 0;
        const extensionHours = parseDurationToHours(extensionDuration) || 0;

        return {
            checked: true,
            record: {
                agreementNo: c.agreementNo,
                personName: c.personName,
                debtorName: c.debtorName,
                actualDuration,
                plannedPlusExtension: formatHoursToDuration(plannedHours + extensionHours),
                lateDuration,
                lateHours: parseDurationToHours(lateDuration) || 0,
            },
        };
    }

    async function runReport() {

        const frame = openHiddenFrame(LATE_RETURN_URL);

        showProgress("جارٍ تحميل قائمة العقود المتأخرة...");

        try {

            const doc1 = await waitFor(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
            if (!doc1) throw new Error("لم يتم العثور على أي عقود متأخرة");

            showProgress("جارٍ جمع كل صفحات القائمة...");
            const allRows = await collectAllPages(frame, doc1);
            try { frame.remove(); } catch (err) { /* تجاهل */ }

            const candidates = allRows.slice(0, MAX_AGREEMENTS);

            if (candidates.length === 0) {
                showReport([], 0, 0);
                return;
            }

            let checkedCount = 0;
            let processedCount = 0;
            const recordsByIndex = new Array(candidates.length).fill(null);

            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    processedCount++;
                    showProgress(`جارٍ فحص عقود الشركات... (${processedCount} من ${candidates.length})`);
                    const c = candidates[i];
                    try {
                        const { checked, record } = await checkOneAgreement(workerFrame, c);
                        if (checked) checkedCount++;
                        if (record) recordsByIndex[i] = record;
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            const results = recordsByIndex.filter(Boolean);

            showReport(results, checkedCount, candidates.length);

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
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
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-company-ext')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-company-ext';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="company-ext-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('company-ext-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('company-ext-box')?.remove();
        showToast(text, type || 'error');
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'اسم الشخص', 'اسم المدين', 'المدة الفعلية', 'المدة المخطط لها + التمديد', 'متأخر بـ'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.personName, r.debtorName, r.actualDuration, r.plannedPlusExtension, r.lateDuration].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records) {
        const printWindow = window.open('', '_blank', 'width=1100,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.personName + '</td><td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td><td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.lateDuration + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود الشركات غير الممددة</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>🏢 عقود الشركات غير الممددة</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>اسم الشخص</th><th>اسم المدين</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th><th>متأخر بـ</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.personName + '</td><td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td><td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.lateDuration + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>🏢 عقود الشركات غير الممددة</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>اسم الشخص</th><th>اسم المدين</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th><th>متأخر بـ</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000;
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    function handleSendWhatsApp(records) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '🏢 عقود الشركات غير الممددة - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[عقود الشركات] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[عقود الشركات] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[عقود الشركات] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[عقود الشركات] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب اسم المدين أو مدة التأخير)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastCheckedCount = 0;
    let lastTotalCandidates = 0;

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'debtorName') {
            sorted.sort((a, b) => a.debtorName.localeCompare(b.debtorName, 'ar') * sortState.dir);
        } else if (key === 'lateHours') {
            sorted.sort((a, b) => (a.lateHours - b.lateHours) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), lastCheckedCount, lastTotalCandidates);
    }

    function showReport(records, checkedCount, totalCandidates) {
        document.getElementById('company-ext-box')?.remove();
        injectYqStyles();
        lastCheckedCount = checkedCount;
        lastTotalCandidates = totalCandidates;

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.personName + '</td>' +
            '<td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td>' +
            '<td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:800;color:#dc2626;">' + r.lateDuration + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="6" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود شركات متأخرة حالياً</td></tr>';

        const html =
            '<div id="company-ext-box" class="yq-overlay">' +
            '<div style="width:min(1040px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">🏢 عقود الشركات غير الممددة</div>' +
            '<div class="yq-report-sub">' +
            'تم فحص ' + checkedCount + ' من أصل ' + totalCandidates + ' عقد شركة بقائمة LATE_RETURN' +
            (checkedCount < totalCandidates ? ' (' + (totalCandidates - checkedCount) + ' تعذّر فتحها)' : '') +
            ' · عدد العقود المحتاجة تمديد: ' + records.length +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>اسم الشخص</th>' +
            '<th id="company-ext-sort-debtor" style="cursor:pointer;user-select:none;">اسم المدين' + sortIndicator('debtorName') + '</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th>' +
            '<th id="company-ext-sort-late" style="cursor:pointer;user-select:none;">متأخر بـ' + sortIndicator('lateHours') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="company-ext-copy">📋 نسخ</button>' +
            '<button id="company-ext-print">🖨️ طباعة</button>' +
            '<button id="company-ext-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="company-ext-refresh">🔄 تحديث</button>' +
            '<button id="company-ext-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('company-ext-close').onclick = () => {
            document.getElementById('company-ext-box')?.remove();
        };
        document.getElementById('company-ext-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport();
        };
        document.getElementById('company-ext-print').onclick = () => {
            printReport(records);
        };
        document.getElementById('company-ext-whatsapp').onclick = () => {
            handleSendWhatsApp(records);
        };
        document.getElementById('company-ext-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
        document.getElementById('company-ext-sort-debtor').onclick = () => handleSortClick(records, 'debtorName');
        document.getElementById('company-ext-sort-late').onclick = () => handleSortClick(records, 'lateHours');
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-company-extension-branches-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    // قائمة الفروع المتاحة للاختيار - المستخدم يختار فرع واحد بكل مرة يشغّل
    // فيها الأداة (بعكس أداة "عقود الشركات غير الممددة" الأصلية اللي تفحص
    // فرع مطار جدة فقط، وبعكس أي نسخة تفحص كل الفروع مع بعض)
    const BRANCHES = [
        { id: 29, name: 'مطار جدة' },
        { id: 11, name: 'طريق المدينة' },
        { id: 12, name: 'شارع التحلية' },
        { id: 30, name: 'مطار الطائف' },
        { id: 10, name: 'ينبع - الهيئة الملكية' },
        { id: 25, name: 'مطار الأمير عبدالمحسن - ينبع' },
        { id: 36, name: 'المدينة المنورة' },
        { id: 59, name: 'مطار الأمير محمد بن عبدالعزيز الدولي - المدينة' },
        { id: 70, name: 'مدينة العلا' },
        { id: 217, name: 'الطائف' },
        { id: 218, name: 'طريق الأمير سلطان' },
    ];

    function lateReturnUrlForBranch(branchId) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings?status=LATE_RETURN&pageSize=500';
    }

    function branchNameById(branchId) {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch ? branch.name : ('فرع #' + branchId);
    }

    const MAX_AGREEMENTS = 300;
    // عدد الإطارات المتوازية لفحص تفاصيل العقود - كل إطار يفحص عقوده بالتتابع،
    // فقط موزّعين على عدة إطارات بدل واحد فقط لتسريع العملية (نفس أسلوب أداة
    // "العقود المتأخرة في السداد (أفراد)")
    const CHECK_CONCURRENCY = 4;

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "company-extension-branches",
            name: "🏢 عقود الشركات (اختيار الفرع)",
            run() {
                showBranchPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
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

    /** يحوّل نص مدة بصيغة "X أيام : Y ساعات" إلى إجمالي عدد الساعات (رقم صحيح) */
    function parseDurationToHours(text) {
        if (!text) return null;
        const match = text.match(/(\d+)\s*أيام?\s*:\s*(\d+)\s*ساعات?/);
        if (!match) return null;
        return parseInt(match[1], 10) * 24 + parseInt(match[2], 10);
    }

    /** يحوّل إجمالي عدد ساعات إلى نفس صيغة يقين "X أيام : Y ساعات" */
    function formatHoursToDuration(totalHours) {
        if (totalHours == null || isNaN(totalHours)) return "";
        const days = Math.floor(totalHours / 24);
        const hours = totalHours % 24;
        return days + " أيام : " + hours + " ساعات";
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق باقي الأدوات)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    /**
     * يقرأ صفوف قائمة "العقود المتأخرة" - بعكس أداة الأفراد، هنا نحتفظ فقط
     * بالصفوف اللي عمود "اسم المدين" فيها اسم شركة حقيقي (مو "غير متاح")،
     * لأن هذي الأداة مخصصة لعقود الشركات تحديداً.
     */
    function readLateReturnRows(doc) {
        const table = Array.from(doc.querySelectorAll("table")).find(t => t.querySelectorAll("tbody tr").length > 0);
        if (!table) return [];

        const headerCells = Array.from(table.querySelectorAll("thead tr th, thead tr td"));
        const bookingIdx = findColumnIndex(headerCells, ["رقم الحجز"]);
        const agreementIdx = findColumnIndex(headerCells, ["رقم الاتفاقية"]);
        const driverIdx = findColumnIndex(headerCells, ["السائق"]);
        const debtorIdx = findColumnIndex(headerCells, ["اسم المدين"]);

        const rows = Array.from(table.querySelectorAll("tbody tr"));
        return rows.map(row => {
            const cells = row.querySelectorAll("td");
            if (!cells.length) return null;

            // "غير متاح" = فرد (بدون شركة راعية) - نتجاهله، هذي الأداة للشركات فقط
            const debtorText = debtorIdx !== -1 ? cells[debtorIdx].textContent.trim() : "";
            if (!debtorText || debtorText === "غير متاح") return null;

            const link = Array.from(row.querySelectorAll("a"))
                .find(a => (a.getAttribute("href") || "").includes("/close-agreements/"));
            if (!link) return null;

            const bookingNo = bookingIdx !== -1 ? cells[bookingIdx].textContent.trim() : "";
            const agreementNo = agreementIdx !== -1 ? cells[agreementIdx].textContent.trim() : "";

            return {
                href: new URL(link.getAttribute("href"), location.origin).href,
                bookingNo,
                agreementNo,
                personName: driverIdx !== -1 ? cells[driverIdx].textContent.trim() : "",
                debtorName: debtorText,
                __signature: agreementNo || bookingNo || link.getAttribute("href"),
            };
        }).filter(Boolean);
    }

    function collectAllPages(iframe, doc) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try {
                    return readLateReturnRows(doc);
                } catch (err) {
                    return [];
                }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    /**
     * يجمع صفوف العقود المتأخرة من الفروع المختارة فقط - فرع تلو فرع
     * بالتتابع (لا بالتوازي) لنفس السبب المعروف بالأدوات الثانية.
     */
    async function collectAllRowsForBranches(branchIds) {
        let allRows = [];
        for (const branchId of branchIds) {
            const branchName = branchNameById(branchId);
            showProgress('جارٍ تحميل قائمة العقود المتأخرة - ' + branchName + '...');
            const frame = openHiddenFrame(lateReturnUrlForBranch(branchId));
            try {
                const doc1 = await waitFor(frame, d => (d.querySelectorAll("table tbody tr").length > 0 ? d : null));
                if (doc1) {
                    const rows = await collectAllPages(frame, doc1);
                    rows.forEach(r => { r.branchName = branchName; });
                    allRows = allRows.concat(rows);
                }
            } catch (err) {
                console.error('[عقود الشركات] تعذّر تحميل فرع ' + branchName + ':', err);
            } finally {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
            }
        }
        return allRows;
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يفحص عقداً واحداً: يفتح صفحة العقد، يوسّع أكورديون "المدة المحتسبة"
     * (مطوي افتراضياً)، ويقرأ تفاصيله. عمود "متأخر بـ" ما يظهر إطلاقاً إلا
     * لو العقد فعلاً متأخر ويحتاج تمديد - غيابه يعني العقد لسا ضمن مدته
     * المخطط لها ولا يحتاج شي، فنستبعده.
     */
    async function checkOneAgreement(frame, c) {
        const targetPath = new URL(c.href).pathname;
        frame.src = c.href;
        const doc2 = await waitFor(frame, d => {
            if (d.location.pathname !== targetPath) return null;
            return d.querySelector('[data-testid="billable-duration-toggle"]') ? d : null;
        }, 20000);
        if (!doc2) return { checked: false, record: null };

        const toggle = doc2.querySelector('[data-testid="billable-duration-toggle"]');
        if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
            try { toggle.click(); } catch (err) { /* تجاهل */ }
        }
        // ننتظر انتهاء أنيميشن التوسيع حتى تترسم عناصر التفاصيل بالـDOM
        await new Promise(r => setTimeout(r, 700));

        const lateEl = doc2.querySelector('[data-testid="billable-late-early"]');
        if (!lateEl) return { checked: true, record: null };

        const actualDuration = doc2.querySelector('[data-testid="billable-actual-duration"]')?.textContent.trim() || "";
        const plannedDuration = doc2.querySelector('[data-testid="billable-planned-duration"]')?.textContent.trim() || "";
        const extensionDuration = doc2.querySelector('[data-testid="billable-extension-duration"]')?.textContent.trim() || "";
        const lateDuration = lateEl.textContent.trim();

        const plannedHours = parseDurationToHours(plannedDuration) || 0;
        const extensionHours = parseDurationToHours(extensionDuration) || 0;

        return {
            checked: true,
            record: {
                agreementNo: c.agreementNo,
                branchName: c.branchName,
                personName: c.personName,
                debtorName: c.debtorName,
                actualDuration,
                plannedPlusExtension: formatHoursToDuration(plannedHours + extensionHours),
                lateDuration,
                lateHours: parseDurationToHours(lateDuration) || 0,
            },
        };
    }

    async function runReport(branchIds) {

        try {

            const allRows = await collectAllRowsForBranches(branchIds);

            const candidates = allRows.slice(0, MAX_AGREEMENTS);

            if (candidates.length === 0) {
                showReport([], branchIds, 0, 0);
                return;
            }

            let checkedCount = 0;
            let processedCount = 0;
            const recordsByIndex = new Array(candidates.length).fill(null);

            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    processedCount++;
                    showProgress(`جارٍ فحص عقود الشركات... (${processedCount} من ${candidates.length})`);
                    const c = candidates[i];
                    try {
                        const { checked, record } = await checkOneAgreement(workerFrame, c);
                        if (checked) checkedCount++;
                        if (record) recordsByIndex[i] = record;
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            const results = recordsByIndex.filter(Boolean);

            showReport(results, branchIds, checkedCount, candidates.length);

        } catch (err) {
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
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
        '.yq-branch-list{text-align:right;max-height:200px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:10px 14px;background:#fbfbf9;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
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
        if (document.getElementById('yq-shared-styles-company-ext-branches')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-company-ext-branches';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="company-ext-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    /** يبني الاختيار متعدد الفروع (Checkboxes) - defaultBranchIds فاضية أو غير معطاة = كلهم محدَّدين افتراضياً */
    function showBranchPrompt(defaultBranchIds) {
        document.getElementById('company-ext-box')?.remove();

        const preselected = (defaultBranchIds && defaultBranchIds.length) ? defaultBranchIds : BRANCHES.map(b => b.id);
        const branchCheckboxesHtml = BRANCHES.map(b => (
            '<label><input type="checkbox" class="company-ext-branch-cb" value="' + b.id + '"' +
            (preselected.indexOf(b.id) !== -1 ? ' checked' : '') + '> ' + b.name +
            '</label>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>🏢 عقود الشركات غير الممددة</h3>' +
            '<div class="yq-link-row">' +
            '<span>الفروع</span>' +
            '<span><a href="#" id="company-ext-select-all">تحديد الكل</a> · ' +
            '<a href="#" id="company-ext-select-none">إلغاء الكل</a></span>' +
            '</div>' +
            '<div id="company-ext-branches-list" class="yq-branch-list">' + branchCheckboxesHtml + '</div>' +
            '<button id="company-ext-submit" class="yq-btn yq-btn-primary">فحص العقود</button>' +
            '<button id="company-ext-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            360
        ));

        document.getElementById('company-ext-select-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.company-ext-branch-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('company-ext-select-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.company-ext-branch-cb').forEach(cb => { cb.checked = false; });
        };

        document.getElementById('company-ext-submit').onclick = () => {
            const branchIds = Array.from(document.querySelectorAll('.company-ext-branch-cb:checked')).map(cb => parseInt(cb.value, 10));
            if (branchIds.length === 0) {
                showToast('اختر فرع واحد على الأقل', 'error');
                return;
            }
            runReport(branchIds);
        };
        document.getElementById('company-ext-cancel').onclick = () => {
            document.getElementById('company-ext-box')?.remove();
        };
    }

    function showProgress(text) {
        document.getElementById('company-ext-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('company-ext-box')?.remove();
        showToast(text, type || 'error');
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الفرع', 'اسم الشخص', 'اسم المدين', 'المدة الفعلية', 'المدة المخطط لها + التمديد', 'متأخر بـ'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.branchName, r.personName, r.debtorName, r.actualDuration, r.plannedPlusExtension, r.lateDuration].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, branchesLabel) {
        const printWindow = window.open('', '_blank', 'width=1100,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.personName + '</td><td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td><td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.lateDuration + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود الشركات غير الممددة</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>🏢 عقود الشركات غير الممددة</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>اسم الشخص</th><th>اسم المدين</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th><th>متأخر بـ</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records, branchesLabel) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.personName + '</td><td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td><td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:bold;color:#dc2626;">' + r.lateDuration + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>🏢 عقود الشركات غير الممددة</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>اسم الشخص</th><th>اسم المدين</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th><th>متأخر بـ</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records, branchName) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, branchName);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000;
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    function handleSendWhatsApp(records, branchName) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, branchName)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '🏢 عقود الشركات غير الممددة - ' + branchName + ' - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[عقود الشركات] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[عقود الشركات] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[عقود الشركات] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[عقود الشركات] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب اسم المدين أو مدة التأخير)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastCheckedCount = 0;
    let lastTotalCandidates = 0;

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'debtorName') {
            sorted.sort((a, b) => a.debtorName.localeCompare(b.debtorName, 'ar') * sortState.dir);
        } else if (key === 'lateHours') {
            sorted.sort((a, b) => (a.lateHours - b.lateHours) * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, branchIds, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), branchIds, lastCheckedCount, lastTotalCandidates);
    }

    function showReport(records, branchIds, checkedCount, totalCandidates) {
        document.getElementById('company-ext-box')?.remove();
        injectYqStyles();
        lastCheckedCount = checkedCount;
        lastTotalCandidates = totalCandidates;
        const branchesLabel = branchIds.map(branchNameById).join('، ');

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.branchName + '</td>' +
            '<td>' + r.personName + '</td>' +
            '<td>' + r.debtorName + '</td>' +
            '<td>' + r.actualDuration + '</td>' +
            '<td>' + r.plannedPlusExtension + '</td>' +
            '<td style="font-weight:800;color:#dc2626;">' + r.lateDuration + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="7" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود شركات متأخرة حالياً</td></tr>';

        const html =
            '<div id="company-ext-box" class="yq-overlay">' +
            '<div style="width:min(1040px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">🏢 عقود الشركات غير الممددة</div>' +
            '<div class="yq-report-sub">الفروع: ' + branchesLabel + '</div>' +
            '<div class="yq-report-sub">' +
            'تم فحص ' + checkedCount + ' من أصل ' + totalCandidates + ' عقد شركة بقائمة LATE_RETURN' +
            (checkedCount < totalCandidates ? ' (' + (totalCandidates - checkedCount) + ' تعذّر فتحها)' : '') +
            ' · عدد العقود المحتاجة تمديد: ' + records.length +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الفرع</th><th>اسم الشخص</th>' +
            '<th id="company-ext-sort-debtor" style="cursor:pointer;user-select:none;">اسم المدين' + sortIndicator('debtorName') + '</th>' +
            '<th>المدة الفعلية</th><th>المدة المخطط لها + التمديد</th>' +
            '<th id="company-ext-sort-late" style="cursor:pointer;user-select:none;">متأخر بـ' + sortIndicator('lateHours') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="company-ext-copy">📋 نسخ</button>' +
            '<button id="company-ext-print">🖨️ طباعة</button>' +
            '<button id="company-ext-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="company-ext-change-branch">🏢 تغيير الفروع</button>' +
            '<button id="company-ext-refresh">🔄 تحديث</button>' +
            '<button id="company-ext-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('company-ext-close').onclick = () => {
            document.getElementById('company-ext-box')?.remove();
        };
        document.getElementById('company-ext-change-branch').onclick = () => {
            showBranchPrompt(branchIds);
        };
        document.getElementById('company-ext-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(branchIds);
        };
        document.getElementById('company-ext-print').onclick = () => {
            printReport(records, branchesLabel);
        };
        document.getElementById('company-ext-whatsapp').onclick = () => {
            handleSendWhatsApp(records, branchesLabel);
        };
        document.getElementById('company-ext-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
        document.getElementById('company-ext-sort-debtor').onclick = () => handleSortClick(records, branchIds, 'debtorName');
        document.getElementById('company-ext-sort-late').onclick = () => handleSortClick(records, branchIds, 'lateHours');
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-closed-as-debt-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    const LIST_URL = 'https://yaqeen.lumirental.com/rental/branches/29/bookings/needs-action?pendingActions=TAJEER_SUSPENDED&pageSize=500';
    // سقف أمان لعدد صفحات التفاصيل اللي نفتحها فعلياً بجلسة واحدة
    const MAX_VISITS = 300;
    // عدد الإطارات المتوازية اللي تفحص العقود بنفس الوقت. جرّبنا التوازي
    // سابقاً بس بمنطق الضغط على صفوف القائمة الكبيرة المشتركة، وفشل (توقف
    // بالضبط عند عدد الإطارات). اتضح لاحقاً إن السبب الحقيقي كان خللين
    // بالتوقيت (hydration الصف + سباق تحديث الرابط) مو تعارض جلسات - وصرنا
    // نصلحهم الاثنين. بما إن كل عامل الحين يفتح رابط قائمته المصغّرة
    // الخاصة به (مستقل تماماً عن بقية العمّال)، التوازي المفروض يصير آمن.
    // نبدأ برقم متحفّظ (3) بدل 4 المستخدمة بأدوات ثانية.
    const CHECK_CONCURRENCY = 3;

    /**
     * قائمة مفلترة برقم اتفاقية واحد بالضبط - ترجّع صف واحد بس (نفس رقم
     * الاتفاقية اللي طلبناه)، فنضغط عليه وندخل تفاصيله بدون الحاجة لتصفّح
     * القائمة الكبيرة (500 عقد) والبحث فيها كل مرة، وبدون الحاجة نرجع لها
     * بعدها (نروح مباشرة لرابط العقد التالي). أخف وأسرع بكثير من إعادة
     * تحميل القائمة الكاملة، وبما إنه صف واحد بس يترسم أسرع فيصير الضغط
     * عليه أوثق (وقت أقل لمشكلة hydration اللي واجهناها بالقائمة الكبيرة).
     */
    function buildMiniListUrl(agreementNo) {
        return 'https://yaqeen.lumirental.com/rental/branches/29/bookings?agreementNo=' + encodeURIComponent(agreementNo);
    }

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "closed-as-debt",
            name: "📕 عقود أغلقت كمديونية",
            run() {
                runReport();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات باقي التقارير)
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
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

    /**
     * يجيب مستند الـiframe الحالي طازة - لا نخزّن أي مرجع document بمتغيّر
     * طويل العمر عبر عدة عمليات تنقّل، لأنه لو صار تنقّل حقيقي (لا SPA) بأي
     * لحظة، المستند القديم اللي كنا ماسكينه يصير "ميت" و.location فيه يرجع
     * null، وأي قراءة مباشرة لـ.location.href عليه تكسر بخطأ Cannot read
     * properties of null
     */
    function getDoc(frame) {
        try {
            return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null;
        } catch (err) {
            return null;
        }
    }

    /** يحاكي كليك حقيقي (pointerdown/up) لأزرار/صفوف React اللي ما تستجيب لـ.click() العادي دايماً */
    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findLabelElement(doc, labelText) {
        const candidates = doc.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    function findValueNearLabel(doc, labelText) {
        const labelEl = findLabelElement(doc, labelText);
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

    function parseAmount(text) {
        if (!text) return NaN;
        const isNegative = text.indexOf('-') !== -1;
        const cleaned = text.replace(/[^\d.]/g, '');
        if (!cleaned) return NaN;
        const value = parseFloat(cleaned);
        if (isNaN(value)) return NaN;
        return isNegative ? -value : value;
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق باقي الأدوات)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    // ==========================================================
    // قراءة صف القائمة
    // ==========================================================

    const ARABIC_MONTHS = {
        'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6,
        'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10,
        'نوفمبر': 11, 'ديسمبر': 12,
    };

    /**
     * يحوّل "17, يناير 2026" (صيغة عمود "وقت التسليم" بالقائمة) لشهر/سنة -
     * نستخدمه فقط لتجميع العقود حسب الشهر عشان المستخدم يختار أي شهر يبيه
     * (لا علاقة له بأي استبعاد تلقائي - الاستبعاد بالتاريخ انشال نهائياً،
     * المستخدم هو اللي يحدد الشهور يدوياً).
     */
    function parseListMonth(dateText) {
        if (!dateText) return null;
        const m = dateText.match(/(\d{1,2}),?\s*([؀-ۿ]+)\s*(\d{4})/);
        if (!m) return null;
        const monthNum = ARABIC_MONTHS[m[2].trim()];
        const year = parseInt(m[3], 10);
        if (!monthNum) return null;
        return {
            key: year + '-' + String(monthNum).padStart(2, '0'),
            label: m[2].trim() + ' ' + year,
        };
    }

    /**
     * يقرأ بيانات صف واحد بجدول "تتطلب إجراء" - ترتيب الأعمدة ثابت (مأخوذ
     * من الـHTML الفعلي للجدول): 0=رقم الحجز، 1=رقم الاتفاقية، 2=وقت
     * التسليم، 3=السائق، 4=اسم المدين، البقية غير مستخدمة هنا.
     */
    function readListRow(rowEl) {
        const cells = rowEl.querySelectorAll('td');
        if (cells.length < 9) return null;
        const bookingNo = cells[0].textContent.trim();
        const agreementNo = cells[1].textContent.trim();
        const dateSpans = cells[2].querySelectorAll('span');
        const dateText = dateSpans[0] ? dateSpans[0].textContent.trim() : '';
        const monthInfo = parseListMonth(dateText);
        const driverName = cells[3].textContent.trim();
        const debtorName = cells[4].textContent.trim();
        if (!bookingNo && !agreementNo) return null;
        return {
            bookingNo,
            agreementNo,
            driverName,
            debtorName,
            monthKey: monthInfo ? monthInfo.key : null,
            monthLabel: monthInfo ? monthInfo.label : null,
            __signature: bookingNo || agreementNo,
        };
    }

    /** يقرأ توقيع آخر صف بالجدول - يجيب المستند طازة من الـframe نفسه كل مرة */
    function lastRowSignature(frame) {
        const doc = getDoc(frame);
        if (!doc) return null;
        const rows = Array.from(doc.querySelectorAll('table tbody tr'));
        if (!rows.length) return null;
        const data = readListRow(rows[rows.length - 1]);
        return data ? data.__signature : null;
    }

    async function waitForListRefresh(frame, beforeSig, timeoutMs) {
        timeoutMs = timeoutMs || 6000;
        const start = Date.now();
        while (true) {
            const currentSig = lastRowSignature(frame);
            if (currentSig !== beforeSig || Date.now() - start > timeoutMs) return;
            await new Promise(r => setTimeout(r, 250));
        }
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    /**
     * يمر على كل صفحات القائمة (بدون فتح أي تفاصيل) ويجمع بيانات كل صف
     * (بما فيها شهر/سنة التسليم) - يُستخدم لبناء قائمة الشهور المتاحة
     * وتحديد الصفوف المستهدفة قبل مرحلة الضغط الفعلي على كل صف.
     */
    async function collectAllCandidates(frame) {
        const seen = {};
        const candidates = [];
        let pageIndex = 0;
        const maxIterations = 80;

        while (pageIndex < maxIterations) {
            pageIndex++;
            const doc = getDoc(frame);
            if (!doc) break;
            const rowEls = Array.from(doc.querySelectorAll('table tbody tr'));

            rowEls.forEach(rowEl => {
                const rowData = readListRow(rowEl);
                if (!rowData || !rowData.agreementNo || seen[rowData.__signature]) return;
                seen[rowData.__signature] = true;
                candidates.push(rowData);
            });

            const nextControl = findNextPageControl(doc);
            if (!nextControl || isControlDisabled(nextControl)) break;
            const beforeSig = lastRowSignature(frame);
            try {
                nextControl.click();
            } catch (err) {
                break;
            }
            await waitForListRefresh(frame, beforeSig);
        }

        return candidates;
    }

    /** يجمع الشهور المتوفّرة فعلياً بين كل العقود (بدون تكرار)، مرتّبة زمنياً */
    function getAvailableMonths(candidates) {
        const map = {};
        candidates.forEach(c => {
            if (c.monthKey && !map[c.monthKey]) map[c.monthKey] = c.monthLabel;
        });
        return Object.keys(map).sort().map(key => ({ key, label: map[key] }));
    }

    /**
     * يفتح صفحة تفاصيل عقد واحد عبر الضغط على صفّه بالجدول مباشرة (بدل
     * رابط مباشر) - هذا الجدول ما فيه رابط <a href> إطلاقاً، والرقم
     * الداخلي المستخدم برابط التفاصيل غير ظاهر بأي عمود بالجدول، فالضغط
     * الفعلي على الصف هو الطريقة اللي يقين نفسه يعتمدها للتنقّل، وبالتالي
     * أدق من أي رابط نبنيه يدوياً.
     */
    async function visitRowDetail(frame, rowEl, label) {
        const startDoc = getDoc(frame);
        if (!startDoc || !startDoc.location) {
            console.warn('[عقود أغلقت كمديونية] تعذّر قراءة مستند القائمة قبل الضغط على الصف:', label);
            return null;
        }
        const beforeHref = startDoc.location.href;

        // بعض المرات الضغطة الأولى تُتجاهل بصمت (الصف لسا ما خلص React ربط
        // مستمع الضغط عليه - hydration - رغم مهلة الاستقرار قبلها). بدل
        // انتظار 20 ثانية كاملة على أمل ضغطة وحدة، نعيد الضغط كل 2.5 ثانية
        // (على نفس الصف، نعيد استعلامه طازة كل مرة) لين ينجح التنقّل أو
        // تخلص المهلة الكلية - هذا يصحّح نفسه تلقائياً لو الضغطة الأولى ضاعت
        const totalBudgetMs = 20000;
        const retryEveryMs = 2500;
        const overallStart = Date.now();
        let detailDoc = null;

        dispatchFullClick(rowEl);

        while (!detailDoc && Date.now() - overallStart < totalBudgetMs) {
            detailDoc = await waitFor(frame, d => {
                if (!d || !d.location || d.location.href === beforeHref) return null;
                return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
            }, retryEveryMs);

            if (!detailDoc && Date.now() - overallStart < totalBudgetMs) {
                try {
                    const currentDoc = getDoc(frame);
                    if (currentDoc && currentDoc.location && currentDoc.location.href === beforeHref) {
                        const freshRow = currentDoc.querySelector('table tbody tr');
                        if (freshRow) dispatchFullClick(freshRow);
                    }
                } catch (err) { /* تجاهل */ }
            }
        }

        if (!detailDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn(
                '[عقود أغلقت كمديونية] انتهت مهلة فتح تفاصيل العقد (20 ثانية) رغم إعادة الضغط:', label,
                '| الرابط قبل الضغط:', beforeHref,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        // هذي الصفحة فيها زرّين بنفس أيقونة السهم (M181.66,133.66): "عرض
        // التفاصيل" (نص ظاهر، لأكورديون ثاني ما له علاقة ببيانات العميل)
        // وزر توسيع بيانات العميل الحقيقي (أيقونة بس، بدون أي نص). نفلتر
        // على عدم وجود نص عشان نضمن نضغط الزر الصحيح
        const expandBtn = Array.from(detailDoc.querySelectorAll('button'))
            .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66') && x.textContent.trim() === '');
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        } else {
            console.warn('[عقود أغلقت كمديونية] ما لقينا زر توسيع بيانات العميل بصفحة التفاصيل:', label);
        }
        // بدل انتظار ثابت 1200ms دايماً، نستنى فعلياً لين تترسم لوحة بيانات
        // العميل (رقم الهوية) - أسرع لو الشبكة سريعة، وسقف 2500ms احتياطي
        // لو تأخرت
        const dialogWaitStart = Date.now();
        let dialog = detailDoc.querySelector('[role="dialog"]') || detailDoc;
        while (Date.now() - dialogWaitStart < 2500) {
            dialog = detailDoc.querySelector('[role="dialog"]') || detailDoc;
            if (findValueNearLabel(dialog, "رقم الهوية")) break;
            await new Promise(r => setTimeout(r, 150));
        }

        const idNumber = findValueNearLabel(dialog, "رقم الهوية");
        const phoneEl = Array.from(dialog.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        if (!idNumber || !phone) {
            console.warn(
                '[عقود أغلقت كمديونية] بيانات العميل ناقصة بعد المحاولة:', label,
                '| رقم الهوية:', idNumber || '(فاضي)',
                '| الجوال:', phone || '(فاضي)',
                '| وُجد زر التوسيع:', !!expandBtn
            );
        }

        const remainingText = detailDoc.querySelector('[data-testid="remaining-balance-value"]')?.textContent.trim();
        const remaining = parseAmount(remainingText);
        const driverName = detailDoc.querySelector('[data-testid="driver-name"]')?.textContent.trim() || "";

        return { idNumber, phone, remaining, driverName };
    }

    /**
     * يفحص عقداً واحداً عبر قائمة مصغّرة برقم اتفاقيته (buildMiniListUrl) -
     * تطلع صف واحد بس، نستنى استقرار الصف (hydration، نفس مشكلة القائمة
     * الكبيرة) ثم نضغطه وندخل تفاصيله عبر visitRowDetail. ما فيه أي رجوع
     * لأي قائمة بعدها - العقد التالي يروح لرابطه الخاص مباشرة.
     */
    async function checkOneAgreement(frame, candidate) {
        // مهم: نتحقق إن رابط الإطار فعلاً تحوّل لرابط هذا العقد بالذات
        // (مو بس "فيه صف بجدول") - لو التنقّل لسا ما خلص، ممكن نلقط صفحة
        // العقد السابق (لسا مرسومة) ونظن إننا وصلنا للعقد الجديد
        const expectedUrlFragment = 'agreementNo=' + encodeURIComponent(candidate.agreementNo);
        frame.src = buildMiniListUrl(candidate.agreementNo);
        const listDoc = await waitFor(frame, d => {
            if (!d || !d.location || d.location.href.indexOf(expectedUrlFragment) === -1) return null;
            return d.querySelectorAll('table tbody tr').length > 0 ? d : null;
        }, 20000);
        if (!listDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn(
                '[عقود أغلقت كمديونية] انتهت مهلة تحميل القائمة المصغّرة (20 ثانية):', candidate.agreementNo,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        // الصف قد يظهر لحظياً ثم يُعاد رسمه (يختفي مؤقتاً) قبل ما يستقر -
        // فحص وحيد بتوقيت ثابت ممكن يقع بالضبط بفجوة إعادة الرسم هذي.
        // نتأكد من وجوده بشكل متكرر لين يثبت (أو تنتهي المهلة)
        let rowEl = null;
        const rowWaitStart = Date.now();
        while (!rowEl && Date.now() - rowWaitStart < 5000) {
            await new Promise(r => setTimeout(r, 300));
            const currentDoc = getDoc(frame);
            rowEl = currentDoc && currentDoc.querySelector('table tbody tr');
        }

        if (!rowEl) {
            console.warn('[عقود أغلقت كمديونية] القائمة المصغّرة ما رجّعت أي صف مستقر:', candidate.agreementNo);
            return null;
        }

        return await visitRowDetail(frame, rowEl, candidate.agreementNo);
    }

    async function runReport() {

        const frame = openHiddenFrame(LIST_URL);
        const results = [];

        showProgress('جارٍ تحميل قائمة العقود...');

        try {

            const doc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null));
            if (!doc) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, '');
                return;
            }

            showProgress('جارٍ جمع كل العقود عبر كل الصفحات...');
            const allCandidates = await collectAllCandidates(frame);

            const months = getAvailableMonths(allCandidates);
            if (months.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, '');
                return;
            }

            const selectedMonthKeys = await showMonthPrompt(months);
            if (!selectedMonthKeys || selectedMonthKeys.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                return;
            }

            const selectedSet = new Set(selectedMonthKeys);
            const monthsLabel = months.filter(m => selectedSet.has(m.key)).map(m => m.label).join('، ');
            const candidates = allCandidates
                .filter(c => c.monthKey && selectedSet.has(c.monthKey) && c.agreementNo)
                .slice(0, MAX_VISITS);

            if (candidates.length === 0) {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                showReport([], 0, monthsLabel);
                return;
            }

            try { frame.remove(); } catch (err) { /* تجاهل */ }

            const totalToVisit = candidates.length;
            let visitedCount = 0;
            showProgress(`جارٍ فحص العقود... (0 من ${totalToVisit})`);

            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    const candidate = candidates[i];
                    try {
                        const detail = await checkOneAgreement(workerFrame, candidate);
                        if (detail) {
                            results.push({
                                agreementNo: candidate.agreementNo,
                                name: detail.driverName || candidate.driverName,
                                phone: detail.phone,
                                idNumber: detail.idNumber,
                                monthKey: candidate.monthKey || "",
                                monthLabel: candidate.monthLabel || "-",
                                remaining: isNaN(detail.remaining) ? "" : detail.remaining.toFixed(2),
                                remainingRaw: isNaN(detail.remaining) ? 0 : detail.remaining,
                            });
                        }
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                    visitedCount++;
                    showProgress(`جارٍ فحص العقود... (${visitedCount} من ${totalToVisit})`);
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            showReport(results, visitedCount, monthsLabel);

        } catch (err) {
            try { frame.remove(); } catch (err2) { /* تجاهل */ }
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
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
        '.yq-branch-list{text-align:right;max-height:280px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:10px 14px;background:#fbfbf9;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-closed-debt')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-closed-debt';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="closed-debt-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('closed-debt-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('closed-debt-box')?.remove();
        showToast(text, type || 'error');
    }

    /**
     * يعرض قائمة الشهور المتوفّرة (مبنية من عمود "وقت التسليم" بالقائمة)
     * كـcheckboxes يختار منها المستخدم شهر أو أكثر - يرجّع مصفوفة مفاتيح
     * الشهور المختارة، أو null لو ألغى.
     */
    function showMonthPrompt(months) {
        return new Promise(resolve => {
            document.getElementById('closed-debt-box')?.remove();

            const checkboxesHtml = months.map(m => (
                '<label><input type="checkbox" class="closed-debt-month-cb" value="' + m.key + '" checked> ' +
                '<span>' + m.label + '</span></label>'
            )).join('');

            const html =
                '<h3>📕 عقود أغلقت كمديونية</h3>' +
                '<div class="yq-desc">اختر الشهر/الأشهر اللي تبي تطلع عقودها (حسب تاريخ التسليم بالقائمة):</div>' +
                '<div class="yq-link-row">' +
                '<span>الشهور</span>' +
                '<span><a href="#" id="closed-debt-select-all">تحديد الكل</a> · ' +
                '<a href="#" id="closed-debt-select-none">إلغاء الكل</a></span>' +
                '</div>' +
                '<div class="yq-branch-list">' + checkboxesHtml + '</div>' +
                '<button id="closed-debt-month-go" class="yq-btn yq-btn-primary">عرض العقود</button>' +
                '<button id="closed-debt-month-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>';

            document.body.insertAdjacentHTML('beforeend', overlayShell(html, 380));

            document.getElementById('closed-debt-select-all').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-month-cb').forEach(cb => { cb.checked = true; });
            };
            document.getElementById('closed-debt-select-none').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-month-cb').forEach(cb => { cb.checked = false; });
            };
            document.getElementById('closed-debt-month-cancel').onclick = () => {
                document.getElementById('closed-debt-box')?.remove();
                resolve(null);
            };
            document.getElementById('closed-debt-month-go').onclick = () => {
                const selected = Array.from(document.querySelectorAll('.closed-debt-month-cb:checked')).map(cb => cb.value);
                document.getElementById('closed-debt-box')?.remove();
                resolve(selected);
            };
        });
    }

    /** أحمر = مبلغ متبقي على العميل، أخضر = مبلغ زائد له (استرداد)، رمادي = مسدّد بالضبط */
    function remainingColor(value) {
        if (value > 0) return '#dc2626';
        if (value < 0) return '#16a34a';
        return '#555';
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الاسم', 'الجوال', 'رقم الهوية', 'شهر التسليم', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.name, r.phone, r.idNumber, r.monthLabel, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود أغلقت كمديونية</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="6">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000;
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    function handleSendWhatsApp(records) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '📕 عقود أغلقت كمديونية - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[عقود أغلقت كمديونية] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[عقود أغلقت كمديونية] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[عقود أغلقت كمديونية] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[عقود أغلقت كمديونية] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب المبلغ المتبقي فقط)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastVisitedCount = 0;
    let lastMonthsLabel = '';

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (a.remainingRaw - b.remainingRaw) * sortState.dir);
        } else if (key === 'month') {
            // monthKey بصيغة "YYYY-MM" فيترتب زمنياً بالمقارنة النصية العادية
            sorted.sort((a, b) => (a.monthKey || '').localeCompare(b.monthKey || '') * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), lastVisitedCount, lastMonthsLabel);
    }

    function showReport(records, visitedCount, monthsLabel) {
        document.getElementById('closed-debt-box')?.remove();
        injectYqStyles();
        lastVisitedCount = visitedCount;
        lastMonthsLabel = monthsLabel;

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td>' +
            '<td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:800;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="6" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود مطابقة حالياً</td></tr>';

        const html =
            '<div id="closed-debt-box" class="yq-overlay">' +
            '<div style="width:min(960px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">📕 عقود أغلقت كمديونية</div>' +
            (monthsLabel ? (
                '<div class="yq-report-sub">الشهور المحددة: ' + monthsLabel + '</div>'
            ) : '') +
            '<div class="yq-report-sub">تم فحص ' + visitedCount + ' عقد · عدد العقود المطابقة: ' + records.length + '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th id="closed-debt-sort-month" style="cursor:pointer;user-select:none;">شهر التسليم' + sortIndicator('month') + '</th>' +
            '<th id="closed-debt-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="closed-debt-copy">📋 نسخ</button>' +
            '<button id="closed-debt-print">🖨️ طباعة</button>' +
            '<button id="closed-debt-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="closed-debt-refresh">🔄 تحديث</button>' +
            '<button id="closed-debt-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('closed-debt-close').onclick = () => {
            document.getElementById('closed-debt-box')?.remove();
        };
        document.getElementById('closed-debt-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport();
        };
        document.getElementById('closed-debt-sort-remaining').onclick = () => {
            handleSortClick(records, 'remaining');
        };
        document.getElementById('closed-debt-sort-month').onclick = () => {
            handleSortClick(records, 'month');
        };
        document.getElementById('closed-debt-print').onclick = () => {
            printReport(records);
        };
        document.getElementById('closed-debt-whatsapp').onclick = () => {
            handleSendWhatsApp(records);
        };
        document.getElementById('closed-debt-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-closed-as-debt-branches-report.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لأن منح GM_xmlhttpRequest يحوّل التنفيذ
    // لوضع sandboxed، فتصبح window معزولة عن نافذة الصفحة الحقيقية (وعن
    // YAQEEN_TOOLS المسجّلة فيها) إلا عبر unsafeWindow
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // إعدادات بوت واتساب (نفس بوت باقي الأدوات)
    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    // قائمة الفروع المتاحة للاختيار (نفس قائمة أدوات "اختيار الفرع" الثانية) -
    // المستخدم يختار فرع أو أكثر بكل مرة يشغّل فيها الأداة (بعكس أداة "عقود
    // أغلقت كمديونية" الأصلية اللي تفحص فرع مطار جدة فقط)
    const BRANCHES = [
        { id: 29, name: 'مطار جدة' },
        { id: 11, name: 'طريق المدينة' },
        { id: 12, name: 'شارع التحلية' },
        { id: 30, name: 'مطار الطائف' },
        { id: 10, name: 'ينبع - الهيئة الملكية' },
        { id: 25, name: 'مطار الأمير عبدالمحسن - ينبع' },
        { id: 36, name: 'المدينة المنورة' },
        { id: 59, name: 'مطار الأمير محمد بن عبدالعزيز الدولي - المدينة' },
        { id: 70, name: 'مدينة العلا' },
        { id: 217, name: 'الطائف' },
        { id: 218, name: 'طريق الأمير سلطان' },
    ];

    function branchNameById(branchId) {
        const branch = BRANCHES.find(b => b.id === branchId);
        return branch ? branch.name : ('فرع #' + branchId);
    }

    function listUrlForBranch(branchId) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings/needs-action?pendingActions=TAJEER_SUSPENDED&pageSize=500';
    }

    // سقف أمان لعدد صفحات التفاصيل اللي نفتحها فعلياً بجلسة واحدة (كل الفروع مع بعض)
    const MAX_VISITS = 300;
    // عدد الإطارات المتوازية اللي تفحص العقود بنفس الوقت - نفس منطق الأداة
    // الأصلية بالضبط (راجع تعليقها هناك لتفاصيل ليش التوازي آمن هنا)
    const CHECK_CONCURRENCY = 3;

    /**
     * قائمة مفلترة برقم اتفاقية واحد بالضبط ضمن فرع معيّن - نفس فكرة الأداة
     * الأصلية بالضبط، بس رقم الفرع بارامتر بدل ثابت (29)
     */
    function buildMiniListUrl(branchId, agreementNo) {
        return 'https://yaqeen.lumirental.com/rental/branches/' + branchId + '/bookings?agreementNo=' + encodeURIComponent(agreementNo);
    }

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "closed-as-debt-branches",
            name: "📕 عقود أغلقت كمديونية (اختيار الفرع)",
            run() {
                showBranchPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة (نفس أدوات الأداة الأصلية بالضبط)
    // ==========================================================

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise((resolve, reject) => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) {
                    reject(new Error("تمت إزالة الـiframe قبل اكتمال العملية"));
                    return;
                }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    reject(new Error("تعذّر الوصول لمحتوى الـiframe"));
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

    /**
     * يجيب مستند الـiframe الحالي طازة - لا نخزّن أي مرجع document بمتغيّر
     * طويل العمر عبر عدة عمليات تنقّل، لأنه لو صار تنقّل حقيقي (لا SPA) بأي
     * لحظة، المستند القديم اللي كنا ماسكينه يصير "ميت" و.location فيه يرجع
     * null، وأي قراءة مباشرة لـ.location.href عليه تكسر بخطأ Cannot read
     * properties of null
     */
    function getDoc(frame) {
        try {
            return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document) || null;
        } catch (err) {
            return null;
        }
    }

    /** يحاكي كليك حقيقي (pointerdown/up) لأزرار/صفوف React اللي ما تستجيب لـ.click() العادي دايماً */
    function dispatchFullClick(el) {
        try {
            el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
            el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
        } catch (err) { /* تجاهل */ }
        el.click();
    }

    function findLabelElement(doc, labelText) {
        const candidates = doc.querySelectorAll('p, span, div, td, th, label, dt');
        for (const el of candidates) {
            for (const node of el.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() === labelText) return el;
            }
        }
        return null;
    }

    function findValueNearLabel(doc, labelText) {
        const labelEl = findLabelElement(doc, labelText);
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

    function parseAmount(text) {
        if (!text) return NaN;
        const isNegative = text.indexOf('-') !== -1;
        const cleaned = text.replace(/[^\d.]/g, '');
        if (!cleaned) return NaN;
        const value = parseFloat(cleaned);
        if (isNaN(value)) return NaN;
        return isNegative ? -value : value;
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق الأداة الأصلية)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    // ==========================================================
    // قراءة صف القائمة (نفس منطق الأداة الأصلية)
    // ==========================================================

    const ARABIC_MONTHS = {
        'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6,
        'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10,
        'نوفمبر': 11, 'ديسمبر': 12,
    };

    function parseListMonth(dateText) {
        if (!dateText) return null;
        const m = dateText.match(/(\d{1,2}),?\s*([؀-ۿ]+)\s*(\d{4})/);
        if (!m) return null;
        const monthNum = ARABIC_MONTHS[m[2].trim()];
        const year = parseInt(m[3], 10);
        if (!monthNum) return null;
        return {
            key: year + '-' + String(monthNum).padStart(2, '0'),
            label: m[2].trim() + ' ' + year,
        };
    }

    /**
     * يقرأ بيانات صف واحد بجدول "تتطلب إجراء" - ترتيب الأعمدة ثابت (نفس
     * الأداة الأصلية بالضبط: 0=رقم الحجز، 1=رقم الاتفاقية، 2=وقت التسليم،
     * 3=السائق، 4=اسم المدين). branchId/branchName يُضافان بعدها من الخارج.
     */
    function readListRow(rowEl) {
        const cells = rowEl.querySelectorAll('td');
        if (cells.length < 9) return null;
        const bookingNo = cells[0].textContent.trim();
        const agreementNo = cells[1].textContent.trim();
        const dateSpans = cells[2].querySelectorAll('span');
        const dateText = dateSpans[0] ? dateSpans[0].textContent.trim() : '';
        const monthInfo = parseListMonth(dateText);
        const driverName = cells[3].textContent.trim();
        const debtorName = cells[4].textContent.trim();
        if (!bookingNo && !agreementNo) return null;
        return {
            bookingNo,
            agreementNo,
            driverName,
            debtorName,
            monthKey: monthInfo ? monthInfo.key : null,
            monthLabel: monthInfo ? monthInfo.label : null,
            __signature: bookingNo || agreementNo,
        };
    }

    function lastRowSignature(frame) {
        const doc = getDoc(frame);
        if (!doc) return null;
        const rows = Array.from(doc.querySelectorAll('table tbody tr'));
        if (!rows.length) return null;
        const data = readListRow(rows[rows.length - 1]);
        return data ? data.__signature : null;
    }

    async function waitForListRefresh(frame, beforeSig, timeoutMs) {
        timeoutMs = timeoutMs || 6000;
        const start = Date.now();
        while (true) {
            const currentSig = lastRowSignature(frame);
            if (currentSig !== beforeSig || Date.now() - start > timeoutMs) return;
            await new Promise(r => setTimeout(r, 250));
        }
    }

    // ==========================================================
    // جمع مرشّحي فرع واحد + كل الفروع المختارة
    // ==========================================================

    /** نفس collectAllCandidates بالأداة الأصلية بالضبط - يمر على صفحات فرع واحد فقط */
    async function collectAllCandidates(frame) {
        const seen = {};
        const candidates = [];
        let pageIndex = 0;
        const maxIterations = 80;

        while (pageIndex < maxIterations) {
            pageIndex++;
            const doc = getDoc(frame);
            if (!doc) break;
            const rowEls = Array.from(doc.querySelectorAll('table tbody tr'));

            rowEls.forEach(rowEl => {
                const rowData = readListRow(rowEl);
                if (!rowData || !rowData.agreementNo || seen[rowData.__signature]) return;
                seen[rowData.__signature] = true;
                candidates.push(rowData);
            });

            const nextControl = findNextPageControl(doc);
            if (!nextControl || isControlDisabled(nextControl)) break;
            const beforeSig = lastRowSignature(frame);
            try {
                nextControl.click();
            } catch (err) {
                break;
            }
            await waitForListRefresh(frame, beforeSig);
        }

        return candidates;
    }

    /**
     * يمر على الفروع المختارة فرع تلو فرع (لا بالتوازي - نفس سبب أدوات
     * "اختيار الفرع" الثانية: عدة قوائم ثقيلة بنفس اللحظة تتنافس على الموارد)،
     * ويجمع مرشّحي كل فرع مع وسم كل واحد بفرعه.
     */
    async function collectAllCandidatesForBranches(branchIds) {
        let allCandidates = [];
        for (const branchId of branchIds) {
            const branchName = branchNameById(branchId);
            showProgress('جارٍ تحميل قائمة العقود - ' + branchName + '...');
            const frame = openHiddenFrame(listUrlForBranch(branchId));
            try {
                const doc = await waitFor(frame, d => (d.querySelectorAll('table tbody tr').length > 0 ? d : null));
                if (doc) {
                    showProgress('جارٍ جمع عقود ' + branchName + ' عبر كل الصفحات...');
                    const candidates = await collectAllCandidates(frame);
                    candidates.forEach(c => { c.branchId = branchId; c.branchName = branchName; });
                    allCandidates = allCandidates.concat(candidates);
                }
            } catch (err) {
                console.error('[عقود أغلقت كمديونية] تعذّر تحميل فرع ' + branchName + ':', err);
            } finally {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
            }
        }
        return allCandidates;
    }

    /** يجمع الشهور المتوفّرة فعلياً بين كل العقود (بدون تكرار)، مرتّبة زمنياً */
    function getAvailableMonths(candidates) {
        const map = {};
        candidates.forEach(c => {
            if (c.monthKey && !map[c.monthKey]) map[c.monthKey] = c.monthLabel;
        });
        return Object.keys(map).sort().map(key => ({ key, label: map[key] }));
    }

    // ==========================================================
    // فحص عقد واحد (نفس منطق الأداة الأصلية بالضبط، بدون أي تغيير بالتوقيت/إعادة المحاولة)
    // ==========================================================

    async function visitRowDetail(frame, rowEl, label) {
        const startDoc = getDoc(frame);
        if (!startDoc || !startDoc.location) {
            console.warn('[عقود أغلقت كمديونية] تعذّر قراءة مستند القائمة قبل الضغط على الصف:', label);
            return null;
        }
        const beforeHref = startDoc.location.href;

        const totalBudgetMs = 20000;
        const retryEveryMs = 2500;
        const overallStart = Date.now();
        let detailDoc = null;

        dispatchFullClick(rowEl);

        while (!detailDoc && Date.now() - overallStart < totalBudgetMs) {
            detailDoc = await waitFor(frame, d => {
                if (!d || !d.location || d.location.href === beforeHref) return null;
                return d.querySelector('[data-testid="remaining-balance-value"]') ? d : null;
            }, retryEveryMs);

            if (!detailDoc && Date.now() - overallStart < totalBudgetMs) {
                try {
                    const currentDoc = getDoc(frame);
                    if (currentDoc && currentDoc.location && currentDoc.location.href === beforeHref) {
                        const freshRow = currentDoc.querySelector('table tbody tr');
                        if (freshRow) dispatchFullClick(freshRow);
                    }
                } catch (err) { /* تجاهل */ }
            }
        }

        if (!detailDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn(
                '[عقود أغلقت كمديونية] انتهت مهلة فتح تفاصيل العقد (20 ثانية) رغم إعادة الضغط:', label,
                '| الرابط قبل الضغط:', beforeHref,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        const expandBtn = Array.from(detailDoc.querySelectorAll('button'))
            .find(x => x.querySelector('svg')?.outerHTML.includes('M181.66,133.66') && x.textContent.trim() === '');
        if (expandBtn) {
            try { expandBtn.click(); } catch (err) { /* تجاهل */ }
        } else {
            console.warn('[عقود أغلقت كمديونية] ما لقينا زر توسيع بيانات العميل بصفحة التفاصيل:', label);
        }
        const dialogWaitStart = Date.now();
        let dialog = detailDoc.querySelector('[role="dialog"]') || detailDoc;
        while (Date.now() - dialogWaitStart < 2500) {
            dialog = detailDoc.querySelector('[role="dialog"]') || detailDoc;
            if (findValueNearLabel(dialog, "رقم الهوية")) break;
            await new Promise(r => setTimeout(r, 150));
        }

        const idNumber = findValueNearLabel(dialog, "رقم الهوية");
        const phoneEl = Array.from(dialog.querySelectorAll('span'))
            .find(el => /^\+?\d[\d\s]{7,}$/.test(el.textContent.trim()));
        const phone = phoneEl ? phoneEl.textContent.trim() : "";

        if (!idNumber || !phone) {
            console.warn(
                '[عقود أغلقت كمديونية] بيانات العميل ناقصة بعد المحاولة:', label,
                '| رقم الهوية:', idNumber || '(فاضي)',
                '| الجوال:', phone || '(فاضي)',
                '| وُجد زر التوسيع:', !!expandBtn
            );
        }

        const remainingText = detailDoc.querySelector('[data-testid="remaining-balance-value"]')?.textContent.trim();
        const remaining = parseAmount(remainingText);
        const driverName = detailDoc.querySelector('[data-testid="driver-name"]')?.textContent.trim() || "";

        return { idNumber, phone, remaining, driverName };
    }

    /**
     * نفس checkOneAgreement بالأداة الأصلية بالضبط، بس رابط القائمة المصغّرة
     * يُبنى برقم فرع المرشّح (candidate.branchId) بدل فرع ثابت
     */
    async function checkOneAgreement(frame, candidate) {
        const expectedUrlFragment = 'agreementNo=' + encodeURIComponent(candidate.agreementNo);
        frame.src = buildMiniListUrl(candidate.branchId, candidate.agreementNo);
        const listDoc = await waitFor(frame, d => {
            if (!d || !d.location || d.location.href.indexOf(expectedUrlFragment) === -1) return null;
            return d.querySelectorAll('table tbody tr').length > 0 ? d : null;
        }, 20000);
        if (!listDoc) {
            let currentHref = '';
            try { currentHref = getDoc(frame)?.location?.href || ''; } catch (err) { /* تجاهل */ }
            console.warn(
                '[عقود أغلقت كمديونية] انتهت مهلة تحميل القائمة المصغّرة (20 ثانية):', candidate.agreementNo,
                '| الرابط الحالي:', currentHref
            );
            return null;
        }

        let rowEl = null;
        const rowWaitStart = Date.now();
        while (!rowEl && Date.now() - rowWaitStart < 5000) {
            await new Promise(r => setTimeout(r, 300));
            const currentDoc = getDoc(frame);
            rowEl = currentDoc && currentDoc.querySelector('table tbody tr');
        }

        if (!rowEl) {
            console.warn('[عقود أغلقت كمديونية] القائمة المصغّرة ما رجّعت أي صف مستقر:', candidate.agreementNo);
            return null;
        }

        return await visitRowDetail(frame, rowEl, candidate.agreementNo);
    }

    // ==========================================================
    // التنفيذ الرئيسي
    // ==========================================================

    async function runReport(branchIds) {

        const results = [];

        try {

            const allCandidates = await collectAllCandidatesForBranches(branchIds);

            const months = getAvailableMonths(allCandidates);
            if (months.length === 0) {
                showReport([], 0, '', branchIds);
                return;
            }

            const selectedMonthKeys = await showMonthPrompt(months);
            if (!selectedMonthKeys || selectedMonthKeys.length === 0) {
                return;
            }

            const selectedSet = new Set(selectedMonthKeys);
            const monthsLabel = months.filter(m => selectedSet.has(m.key)).map(m => m.label).join('، ');
            const candidates = allCandidates
                .filter(c => c.monthKey && selectedSet.has(c.monthKey) && c.agreementNo)
                .slice(0, MAX_VISITS);

            if (candidates.length === 0) {
                showReport([], 0, monthsLabel, branchIds);
                return;
            }

            const totalToVisit = candidates.length;
            let visitedCount = 0;
            showProgress(`جارٍ فحص العقود... (0 من ${totalToVisit})`);

            const workerCount = Math.min(CHECK_CONCURRENCY, candidates.length);
            const workerFrames = [];

            async function worker(workerIndex) {
                const workerFrame = openHiddenFrame('about:blank');
                workerFrames.push(workerFrame);
                for (let i = workerIndex; i < candidates.length; i += workerCount) {
                    const candidate = candidates[i];
                    try {
                        const detail = await checkOneAgreement(workerFrame, candidate);
                        if (detail) {
                            results.push({
                                agreementNo: candidate.agreementNo,
                                branchName: candidate.branchName,
                                name: detail.driverName || candidate.driverName,
                                phone: detail.phone,
                                idNumber: detail.idNumber,
                                monthKey: candidate.monthKey || "",
                                monthLabel: candidate.monthLabel || "-",
                                remaining: isNaN(detail.remaining) ? "" : detail.remaining.toFixed(2),
                                remainingRaw: isNaN(detail.remaining) ? 0 : detail.remaining,
                            });
                        }
                    } catch (err) {
                        /* تجاهل هذا العقد فقط، نكمل الباقي */
                    }
                    visitedCount++;
                    showProgress(`جارٍ فحص العقود... (${visitedCount} من ${totalToVisit})`);
                }
            }

            await Promise.all(Array.from({ length: workerCount }, (_, i) => worker(i)));
            workerFrames.forEach(f => { try { f.remove(); } catch (err) { /* تجاهل */ } });

            showReport(results, visitedCount, monthsLabel, branchIds);

        } catch (err) {
            showMessage("تعذّر إتمام الفحص: " + err.message);
        }
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
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
        '.yq-branch-list{text-align:right;max-height:280px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:10px 14px;background:#fbfbf9;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}' +
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:14.5px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:12px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:12.5px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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
        if (document.getElementById('yq-shared-styles-closed-debt-branches')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-closed-debt-branches';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="closed-debt-branches-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    /** يبني اختيار الفروع (Checkboxes) - defaultBranchIds فاضية أو غير معطاة = كلهم محدَّدين افتراضياً */
    function showBranchPrompt(defaultBranchIds) {
        document.getElementById('closed-debt-branches-box')?.remove();

        const preselected = (defaultBranchIds && defaultBranchIds.length) ? defaultBranchIds : BRANCHES.map(b => b.id);
        const branchCheckboxesHtml = BRANCHES.map(b => (
            '<label><input type="checkbox" class="closed-debt-branch-cb" value="' + b.id + '"' +
            (preselected.indexOf(b.id) !== -1 ? ' checked' : '') + '> ' + b.name +
            '</label>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>📕 عقود أغلقت كمديونية</h3>' +
            '<div class="yq-link-row">' +
            '<span>الفروع</span>' +
            '<span><a href="#" id="closed-debt-branch-select-all">تحديد الكل</a> · ' +
            '<a href="#" id="closed-debt-branch-select-none">إلغاء الكل</a></span>' +
            '</div>' +
            '<div id="closed-debt-branches-list" class="yq-branch-list">' + branchCheckboxesHtml + '</div>' +
            '<button id="closed-debt-branch-submit" class="yq-btn yq-btn-primary">التالي - اختيار الشهر</button>' +
            '<button id="closed-debt-branch-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            340
        ));

        document.getElementById('closed-debt-branch-select-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.closed-debt-branch-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('closed-debt-branch-select-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.closed-debt-branch-cb').forEach(cb => { cb.checked = false; });
        };
        document.getElementById('closed-debt-branch-cancel').onclick = () => {
            document.getElementById('closed-debt-branches-box')?.remove();
        };
        document.getElementById('closed-debt-branch-submit').onclick = () => {
            const branchIds = Array.from(document.querySelectorAll('.closed-debt-branch-cb:checked')).map(cb => parseInt(cb.value, 10));
            if (branchIds.length === 0) {
                showToast('اختر فرع واحد على الأقل', 'error');
                return;
            }
            document.getElementById('closed-debt-branches-box')?.remove();
            runReport(branchIds);
        };
    }

    function showProgress(text) {
        document.getElementById('closed-debt-branches-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('closed-debt-branches-box')?.remove();
        showToast(text, type || 'error');
    }

    /** نفس عرض اختيار الشهر بالأداة الأصلية بالضبط */
    function showMonthPrompt(months) {
        return new Promise(resolve => {
            document.getElementById('closed-debt-branches-box')?.remove();

            const checkboxesHtml = months.map(m => (
                '<label><input type="checkbox" class="closed-debt-branches-month-cb" value="' + m.key + '" checked> ' +
                '<span>' + m.label + '</span></label>'
            )).join('');

            const html =
                '<h3>📕 عقود أغلقت كمديونية</h3>' +
                '<div class="yq-desc">اختر الشهر/الأشهر اللي تبي تطلع عقودها (حسب تاريخ التسليم بالقائمة):</div>' +
                '<div class="yq-link-row">' +
                '<span>الشهور</span>' +
                '<span><a href="#" id="closed-debt-branches-select-all">تحديد الكل</a> · ' +
                '<a href="#" id="closed-debt-branches-select-none">إلغاء الكل</a></span>' +
                '</div>' +
                '<div class="yq-branch-list">' + checkboxesHtml + '</div>' +
                '<button id="closed-debt-branches-month-go" class="yq-btn yq-btn-primary">عرض العقود</button>' +
                '<button id="closed-debt-branches-month-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>';

            document.body.insertAdjacentHTML('beforeend', overlayShell(html, 380));

            document.getElementById('closed-debt-branches-select-all').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-branches-month-cb').forEach(cb => { cb.checked = true; });
            };
            document.getElementById('closed-debt-branches-select-none').onclick = e => {
                e.preventDefault();
                document.querySelectorAll('.closed-debt-branches-month-cb').forEach(cb => { cb.checked = false; });
            };
            document.getElementById('closed-debt-branches-month-cancel').onclick = () => {
                document.getElementById('closed-debt-branches-box')?.remove();
                resolve(null);
            };
            document.getElementById('closed-debt-branches-month-go').onclick = () => {
                const selected = Array.from(document.querySelectorAll('.closed-debt-branches-month-cb:checked')).map(cb => cb.value);
                document.getElementById('closed-debt-branches-box')?.remove();
                resolve(selected);
            };
        });
    }

    /** أحمر = مبلغ متبقي على العميل، أخضر = مبلغ زائد له (استرداد)، رمادي = مسدّد بالضبط */
    function remainingColor(value) {
        if (value > 0) return '#dc2626';
        if (value < 0) return '#16a34a';
        return '#555';
    }

    function tableToTsv(records) {
        const header = ['رقم العقد', 'الفرع', 'الاسم', 'الجوال', 'رقم الهوية', 'شهر التسليم', 'المتبقي'];
        const lines = [header.join('\t')];
        records.forEach(r => {
            lines.push([r.agreementNo, r.branchName, r.name, r.phone, r.idNumber, r.monthLabel, r.remaining].join('\t'));
        });
        return lines.join('\n');
    }

    function printReport(records, branchesLabel) {
        const printWindow = window.open('', '_blank', 'width=1000,height=700');
        if (!printWindow) {
            showMessage('يرجى السماح بالنوافذ المنبثقة (Popups) لهذا الموقع للطباعة.');
            return;
        }

        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.name + '</td><td>' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        printWindow.document.write(
            '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">' +
            '<title>عقود أغلقت كمديونية</title><style>' +
            '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
            'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;padding:24px;}' +
            'h1{font-size:20px;margin:0 0 4px;}' +
            '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
            'table{border-collapse:collapse;width:100%;font-size:14px;}' +
            'th,td{border:1px solid #999;padding:6px 8px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>' +
            '</body></html>'
        );
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب - نفس أسلوب باقي الأدوات (SVG+foreignObject)
    // ==========================================================

    function utf8ToBase64(str) {
        return btoa(unescape(encodeURIComponent(str)));
    }

    const IMAGE_EXPORT_CSS =
        '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
        'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
        'h1{font-size:20px;margin:0 0 4px;}' +
        '.meta{color:#555;font-size:14px;margin-bottom:16px;}' +
        'table{border-collapse:collapse;width:100%;font-size:14px;}' +
        'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
        'th{background:#f0f0f0;}';

    function buildReportImageInnerHtml(records, branchesLabel) {
        const rowsHtml = records.map(r => (
            '<tr><td>' + r.agreementNo + '</td><td>' + r.branchName + '</td><td>' + r.name + '</td><td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td><td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:bold;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td></tr>'
        )).join('') || '<tr><td colspan="7">لا توجد عقود مطابقة</td></tr>';

        const now = new Date().toLocaleString('ar-SA');

        return (
            '<style>' + IMAGE_EXPORT_CSS + '</style>' +
            '<h1>📕 عقود أغلقت كمديونية</h1>' +
            '<div class="meta">' + now + ' | الفروع: ' + branchesLabel + ' | عدد العقود: ' + records.length + '</div>' +
            '<table><tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th>شهر التسليم</th><th>المتبقي</th></tr>' + rowsHtml + '</table>'
        );
    }

    function buildReportImageDataUrl(records, branchesLabel) {
        return new Promise((resolve, reject) => {
            let settled = false;
            function settleResolve(value) { if (settled) return; settled = true; resolve(value); }
            function settleReject(err) { if (settled) return; settled = true; reject(err); }

            try {
                const innerHtml = buildReportImageInnerHtml(records, branchesLabel);
                const wrapperStyle = 'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

                const measureEl = document.createElement('div');
                measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
                measureEl.innerHTML = innerHtml;
                document.body.appendChild(measureEl);
                const measuredRect = measureEl.getBoundingClientRect();
                const width = Math.max(Math.ceil(measuredRect.width), 400);
                const height = Math.max(Math.ceil(measuredRect.height), 300);
                document.body.removeChild(measureEl);

                const contentHtml =
                    '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

                const svgString =
                    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                    '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

                const svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

                const img = new Image();
                const timeoutId = setTimeout(() => {
                    settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
                }, 15000);

                img.onload = () => {
                    clearTimeout(timeoutId);
                    try {
                        function trimWhitespace(canvas) {
                            const ctx2d = canvas.getContext('2d');
                            const w = canvas.width;
                            const h = canvas.height;
                            const data = ctx2d.getImageData(0, 0, w, h).data;
                            const stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
                            function rowHasContent(y) {
                                for (let x = 0; x < w; x += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            function colHasContent(x) {
                                for (let y = 0; y < h; y += stride) {
                                    const i = (y * w + x) * 4;
                                    if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                                }
                                return false;
                            }
                            let lastRow = 0;
                            for (let y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
                            let lastCol = 0;
                            for (let x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

                            const margin = stride * 2;
                            const trimmedW = Math.min(w, lastCol + margin);
                            const trimmedH = Math.min(h, lastRow + margin);
                            if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas;

                            const trimmed = document.createElement('canvas');
                            trimmed.width = trimmedW;
                            trimmed.height = trimmedH;
                            trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
                            return trimmed;
                        }

                        function drawAtScale(scale) {
                            const canvas = document.createElement('canvas');
                            canvas.width = width * scale;
                            canvas.height = height * scale;
                            const ctx = canvas.getContext('2d');
                            ctx.scale(scale, scale);
                            ctx.fillStyle = '#ffffff';
                            ctx.fillRect(0, 0, width, height);
                            ctx.drawImage(img, 0, 0, width, height);
                            return trimWhitespace(canvas);
                        }

                        const TARGET_DATA_URL_LENGTH = 8000000;
                        const scales = [2, 1.5, 1];
                        const qualities = [0.92, 0.85, 0.75, 0.6];
                        let best = null;

                        outer:
                        for (const scale of scales) {
                            const canvas = drawAtScale(scale);
                            for (const quality of qualities) {
                                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                                if (!best || dataUrl.length < best.length) best = dataUrl;
                                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) break outer;
                            }
                        }

                        settleResolve(best);
                    } catch (err) {
                        settleReject(err);
                    }
                };
                img.onerror = () => {
                    clearTimeout(timeoutId);
                    settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
                };
                img.src = svgDataUrl;
            } catch (err) {
                settleReject(err);
            }
        });
    }

    function handleSendWhatsApp(records, branchesLabel) {
        if (typeof GM_xmlhttpRequest === 'undefined') {
            showMessage('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey');
            return;
        }
        showProgress('جارٍ تجهيز وإرسال صورة التقرير...');
        buildReportImageDataUrl(records, branchesLabel)
            .then(dataUrl => {
                GM_xmlhttpRequest({
                    method: 'POST',
                    url: WHATSAPP_CONFIG.apiUrl,
                    headers: {
                        Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                        'Content-Type': 'application/json',
                    },
                    data: JSON.stringify({
                        target: WHATSAPP_CONFIG.target,
                        sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
                        type: 'image',
                        imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
                        caption: '📕 عقود أغلقت كمديونية - ' + branchesLabel + ' - ' + new Date().toLocaleString('ar-SA'),
                    }),
                    onload: response => {
                        if (response.status >= 200 && response.status < 300) {
                            showMessage('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
                        } else if (response.status === 413) {
                            console.error('[عقود أغلقت كمديونية] فشل إرسال واتساب: 413', response.responseText);
                            showMessage('فشل الإرسال: السيرفر يرفض حجم الصورة (413)');
                        } else {
                            console.error('[عقود أغلقت كمديونية] فشل إرسال واتساب:', response.status, response.responseText);
                            showMessage('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')');
                        }
                    },
                    onerror: error => {
                        console.error('[عقود أغلقت كمديونية] تعذّر الاتصال ببوت واتساب:', error);
                        showMessage('تعذّر الاتصال بخادم بوت واتساب');
                    },
                });
            })
            .catch(err => {
                console.error('[عقود أغلقت كمديونية] تعذّر إنشاء صورة التقرير:', err);
                showMessage('تعذّر إنشاء صورة التقرير: ' + err.message);
            });
    }

    // ==========================================================
    // الترتيب (فرز حسب المبلغ المتبقي أو شهر التسليم)
    // ==========================================================

    const sortState = { key: null, dir: 1 };
    let lastVisitedCount = 0;
    let lastMonthsLabel = '';
    let lastBranchIds = [];

    function sortIndicator(key) {
        if (sortState.key !== key) return '';
        return sortState.dir === 1 ? ' ▲' : ' ▼';
    }

    function sortRecords(records, key) {
        const sorted = records.slice();
        if (key === 'remaining') {
            sorted.sort((a, b) => (a.remainingRaw - b.remainingRaw) * sortState.dir);
        } else if (key === 'month') {
            sorted.sort((a, b) => (a.monthKey || '').localeCompare(b.monthKey || '') * sortState.dir);
        }
        return sorted;
    }

    function handleSortClick(records, key) {
        if (sortState.key === key) sortState.dir *= -1;
        else { sortState.key = key; sortState.dir = 1; }
        showReport(sortRecords(records, key), lastVisitedCount, lastMonthsLabel, lastBranchIds);
    }

    function showReport(records, visitedCount, monthsLabel, branchIds) {
        document.getElementById('closed-debt-branches-box')?.remove();
        injectYqStyles();
        lastVisitedCount = visitedCount;
        lastMonthsLabel = monthsLabel;
        lastBranchIds = branchIds || [];
        const branchesLabel = lastBranchIds.map(branchNameById).join('، ');

        const rowsHtml = records.map(r => (
            '<tr>' +
            '<td>' + r.agreementNo + '</td>' +
            '<td>' + r.branchName + '</td>' +
            '<td>' + r.name + '</td>' +
            '<td dir="ltr">' + r.phone + '</td>' +
            '<td>' + r.idNumber + '</td>' +
            '<td>' + r.monthLabel + '</td>' +
            '<td style="font-weight:800;color:' + remainingColor(r.remainingRaw) + ';">' + r.remaining + '</td>' +
            '</tr>'
        )).join('');

        const bodyHtml = records.length
            ? rowsHtml
            : '<tr><td colspan="7" style="padding:22px;text-align:center;color:#a19c92;">لا توجد عقود مطابقة حالياً</td></tr>';

        const html =
            '<div id="closed-debt-branches-box" class="yq-overlay">' +
            '<div style="width:min(1000px,95vw);max-height:90vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">📕 عقود أغلقت كمديونية</div>' +
            '<div class="yq-report-sub">الفروع: ' + branchesLabel + '</div>' +
            (monthsLabel ? (
                '<div class="yq-report-sub">الشهور المحددة: ' + monthsLabel + '</div>'
            ) : '') +
            '<div class="yq-report-sub">تم فحص ' + visitedCount + ' عقد · عدد العقود المطابقة: ' + records.length + '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>رقم العقد</th><th>الفرع</th><th>الاسم</th><th>الجوال</th><th>رقم الهوية</th>' +
            '<th id="closed-debt-branches-sort-month" style="cursor:pointer;user-select:none;">شهر التسليم' + sortIndicator('month') + '</th>' +
            '<th id="closed-debt-branches-sort-remaining" style="cursor:pointer;user-select:none;">المتبقي' + sortIndicator('remaining') + '</th>' +
            '</tr>' + bodyHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="closed-debt-branches-copy">📋 نسخ</button>' +
            '<button id="closed-debt-branches-print">🖨️ طباعة</button>' +
            '<button id="closed-debt-branches-whatsapp" class="yq-primary">📱 إرسال صورة واتساب</button>' +
            '<button id="closed-debt-branches-change">🏢 تغيير الفروع</button>' +
            '<button id="closed-debt-branches-refresh">🔄 تحديث</button>' +
            '<button id="closed-debt-branches-close">إغلاق</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        document.getElementById('closed-debt-branches-close').onclick = () => {
            document.getElementById('closed-debt-branches-box')?.remove();
        };
        document.getElementById('closed-debt-branches-change').onclick = () => {
            showBranchPrompt(lastBranchIds);
        };
        document.getElementById('closed-debt-branches-refresh').onclick = () => {
            sortState.key = null;
            sortState.dir = 1;
            runReport(lastBranchIds);
        };
        document.getElementById('closed-debt-branches-sort-remaining').onclick = () => {
            handleSortClick(records, 'remaining');
        };
        document.getElementById('closed-debt-branches-sort-month').onclick = () => {
            handleSortClick(records, 'month');
        };
        document.getElementById('closed-debt-branches-print').onclick = () => {
            printReport(records, branchesLabel);
        };
        document.getElementById('closed-debt-branches-whatsapp').onclick = () => {
            handleSendWhatsApp(records, branchesLabel);
        };
        document.getElementById('closed-debt-branches-copy').onclick = async () => {
            try {
                await navigator.clipboard.writeText(tableToTsv(records));
                showToast('تم نسخ الجدول', 'success');
            } catch (err) {
                showToast('تعذّر النسخ: ' + err.message, 'error');
            }
        };
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-customer-messages.user.js
// ============================================================

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

// ============================================================
// المصدر: source/yaqeen-booking-report.user.js
// ============================================================

/**
 * أداة "تقرير الحجوزات القادمة"
 * ------------------------------------------------------------
 * أداة مستقلة تُسجَّل داخل نظام الأدوات الحالي عبر YAQEEN_TOOLS.add()
 * ولا تُعدّل أي شيء في الـ Core أو بقية الأدوات.
 *
 * مصادر البيانات (بدون أي API خارجي):
 *  1) صفحة الحجوزات القادمة.
 *  2) صفحة المركبات الجاهزة (حسب مصدر السيارات الذي يختاره المستخدم).
 *  3) صفحة السيارات المستأجرة الحالية (المسترجعة) - نأخذ منها فقط الراجعة
 *     لنفس الفرع، ونعرض عددها تحت كل عمود يوم كمعلومة إضافية (وتُضاف على
 *     السيارات الجاهزة حالياً عند حساب نسبة الإشغال والفرق).
 *
 * تُقرأ الصفحات عبر iframe مخفي (نفس النطاق، بدون نافذة منبثقة حقيقية)، ثم
 * تُستخرج البيانات مباشرة من جدول HTML الظاهر في الصفحة - دون الضغط على أي فلتر.
 */
(function () {
  'use strict';

  // نستخدم unsafeWindow (إن وُجد) لأن أدوات Tampermonkey المختلفة
  // قد تُسجَّل في نافذة الصفحة الحقيقية وليس في الـ sandbox الخاص بالسكربت.
  var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  // لا نلمس الـ Core إطلاقاً: إن لم يكن موجوداً نتوقف بصمت (مع تحذير في الـ console).
  if (!HOST_WINDOW.YAQEEN_TOOLS || typeof HOST_WINDOW.YAQEEN_TOOLS.add !== 'function') {
    console.error('[تقرير الحجوزات القادمة] لم يتم العثور على YAQEEN_TOOLS، الأداة لن تعمل.');
    return;
  }

  // ==========================================================
  // إعدادات ثابتة
  // ==========================================================
  var BRANCH_LOCATION_ID = 29;
  var YARD_LOCATION_ID = 53;
  var PAGE_SIZE = 500;
  var SAME_BRANCH_LABEL = 'نفس الفرع';
  var MAX_FETCH_ATTEMPTS = 5;
  var RETURNED_FETCH_TIMEOUT_MS = 30000;
  var RETRY_DELAY_MS = 1500;

  var URLS = {
    bookings:
      'https://yaqeen.lumirental.com/rental/branches/' +
      BRANCH_LOCATION_ID +
      '/bookings/upcoming?pageSize=' +
      PAGE_SIZE,
    vehicles: {
      branch:
        'https://yaqeen.lumirental.com/rental/vehicles/ready?currentLocationIds=' +
        BRANCH_LOCATION_ID +
        '&pageSize=' +
        PAGE_SIZE,
      yard:
        'https://yaqeen.lumirental.com/rental/vehicles/ready?currentLocationIds=' +
        YARD_LOCATION_ID +
        '&pageSize=' +
        PAGE_SIZE,
    },
    returned:
      'https://yaqeen.lumirental.com/rental/vehicles/rented?pageSize=' +
      PAGE_SIZE +
      '&sort=dropoffDate&order=desc&pageNumber=0',
  };

  /**
   * ترتيب الأيام بالضبط زي ما يعرضه يقين: "اليوم"، "غداً"، ثم بقية أيام الأسبوع
   * السبعة بترتيبها الحقيقي (السبت موجود ضمنها) بدءاً من اليوم اللي بعد "غداً"
   * مباشرة - مو قائمة ثابتة تبدأ دائماً بالأحد بغض النظر عن يوم اليوم الفعلي.
   */
  var WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function buildDayChips() {
    var chips = ['اليوم', 'غداً'];
    var cursor = (new Date().getDay() + 2) % 7; // اليوم اللي بعد "غداً" مباشرة
    while (chips.length < 9) {
      chips.push(WEEKDAY_NAMES[cursor]);
      cursor = (cursor + 1) % 7;
    }
    return chips;
  }
  var DAY_CHIPS = buildDayChips();

  var VEHICLE_SOURCES = [
    { value: 'branch', label: 'الفرع' },
    { value: 'yard', label: 'الساحة' },
    { value: 'all', label: 'الكل' },
  ];

  // إعدادات بوت واتساب (VPS خاص بالمستخدم) - عدّل target إذا اختلفت صيغة الرقم
  var WHATSAPP_CONFIG = {
    apiUrl: 'https://api.yaqeen-vip.space/send',
    apiKey: 'Firas_2026_SuperSecret_Key',
    target: '120363021290047142@g.us',
  };

  // أسماء الأعمدة المطلوب البحث عنها داخل رؤوس الجداول (مع تحمّل اختلاف الترتيب)
  var BOOKING_COLUMNS_MAP = {
    id: ['رقم الحجز'],
    pickup: ['وقت الاستلام'],
    group: ['المجموعة'],
    vehicle: ['المركبة'],
  };
  var VEHICLE_COLUMNS_MAP = {
    group: ['المجموعة'],
  };
  var RETURNED_COLUMNS_MAP = {
    group: ['المجموعة'],
    dropoffBranch: ['فرع التسليم'],
    dropoffText: ['تاريخ التسليم'],
  };

  // عمود "المجموعة" موجود في الجدولين معاً، لذلك نستخدمه لتمييز جدول البيانات
  // الحقيقي عن أي جداول أخرى بالصفحة (بدل الاعتماد على عدد الصفوف الذي يفشل
  // عندما يكون عدد السيارات قليلاً، كما هو الحال غالباً في الساحة)
  var GROUP_COLUMN_HINT = ['المجموعة'];

  var OCCUPANCY_WARNING_THRESHOLD = 80;
  var OCCUPANCY_CRITICAL_THRESHOLD = 100;

  // ==========================================================
  // الحالة والذاكرة المؤقتة (Cache)
  // ==========================================================
  var state = {
    dataLoaded: false,
    lastUpdated: null,
    bookings: [], // [{id, pickupText, day, group, vehicle}]
    vehiclesBySource: { branch: [], yard: [], all: [] }, // group[] لكل مصدر
    returns: [], // [{group, day}] - سيارات مسترجعة لنفس الفرع فقط
    selectedSource: 'all',
    selectedDays: new Set(['اليوم']),
    sort: { key: null, dir: 1 },
    // تعديلات يدوية لعدد سيارات "الساحة" فقط لكل مجموعة (مفتاحها "yard::مجموعة" -
    // ثابت بغض النظر عن مصدر السيارات المختار حالياً بالعرض). أسطول "الفرع" غير
    // قابل للتعديل أبداً؛ في وضع "الكل" يُجمع أسطول الفرع الثابت مع رقم الساحة
    // هذا (المعدَّل أو الأصلي) - تُستخدم لإعادة حساب نسبة الإشغال والفرق فوراً
    // بدون أي طلب شبكة جديد
    vehicleOverrides: {},
  };

  var modalEls = null; // مراجع عناصر الـ DOM بعد بنائها لأول مرة

  // ==========================================================
  // أدوات مساعدة عامة
  // ==========================================================

  /** إزالة التشكيل وتوحيد بعض الحروف العربية لتسهيل مطابقة النصوص */
  function normalizeArabic(text) {
    return (text || '')
      .replace(/[ً-ْ]/g, '')
      .replace(/[إأآا]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function setStatus(message, type) {
    if (!modalEls) return;
    modalEls.statusEl.className = 'yqn-status' + (type ? ' yqn-status--' + type : '');
    if (type === 'loading') {
      modalEls.statusEl.innerHTML = '<span class="yqn-spinner" aria-hidden="true"></span><span>' + escapeHtml(message || '') + '</span>';
    } else {
      modalEls.statusEl.textContent = message || '';
    }
  }

  // ==========================================================
  // تحميل صفحة أخرى من نفس الموقع عبر iframe مخفي (بدون نافذة منبثقة)
  // ==========================================================

  /**
   * يحدد جدول البيانات الحقيقي داخل الصفحة.
   * الأولوية لأي جدول يحتوي عمود "المجموعة" في رأسه (أدق وسيلة، تعمل حتى لو
   * كان عدد الصفوف قليلاً كما في حالة الساحة). في حال لم يوجد أي جدول مطابق
   * بالرأس، نرجع لاختيار الجدول الأكبر عدد صفوف كحل احتياطي.
   */
  function findDataTable(doc, requiredColumnVariants) {
    var tables = Array.prototype.slice.call(doc.querySelectorAll('table'));
    if (tables.length === 0) return null;

    function rowCount(table) {
      return table.querySelectorAll('tbody tr').length;
    }

    function headerMatches(table) {
      if (!requiredColumnVariants || requiredColumnVariants.length === 0) return false;
      var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
      var normalizedVariants = requiredColumnVariants.map(normalizeArabic);
      return headerCells.some(function (cell) {
        var text = normalizeArabic(cell.textContent);
        return normalizedVariants.some(function (v) { return text.indexOf(v) !== -1; });
      });
    }

    var matchingTables = tables.filter(headerMatches);
    var candidates = matchingTables.length > 0 ? matchingTables : tables;

    var best = null;
    var bestCount = -1;
    candidates.forEach(function (t) {
      var count = rowCount(t);
      if (count > bestCount) {
        best = t;
        bestCount = count;
      }
    });
    return best;
  }

  /**
   * صفحات ثقيلة (مثل صفحة المستأجرة بمئات الصفوف) ممكن تظهر أول صفوفها
   * بخلايا فارغة مؤقتاً أثناء التحميل. الاكتفاء بوجود صفوف (tbody tr) فقط
   * يخدع المنطق فيعتبر التحميل مكتمل وهو لسا فاضي. هذا الفحص يتأكد من وجود
   * نص فعلي بعمود "المجموعة" على الأقل بصف واحد قبل اعتبار الصفحة جاهزة.
   */
  function tableHasMeaningfulData(doc, columnsMap) {
    var table = findDataTable(doc, columnsMap.group || GROUP_COLUMN_HINT);
    if (!table) return false;
    var bodyRows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    if (bodyRows.length === 0) return false;

    var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
    var groupIdx = findColumnIndex(headerCells, columnsMap.group || GROUP_COLUMN_HINT);
    if (groupIdx < 0) return true; // احتياطي: لو ما قدرنا نحدد رقم العمود، نكتفي بوجود صفوف

    return bodyRows.some(function (row) {
      var cells = row.querySelectorAll('td');
      var cell = cells[groupIdx];
      return cell && cell.textContent.trim().length > 0;
    });
  }

  /**
   * ينشئ iframe مخفي (خارج حدود الشاشة تماماً) ويحمّل الرابط المطلوب بداخله،
   * بدل فتح نافذة منبثقة حقيقية. هذا يمنع أي نافذة تظهر فوق صفحتك أو تسرق
   * التركيز أثناء جلب البيانات - جُرّب وتحقّقنا إن Yaqeen ما يتصرف مختلف ولا
   * يتجاهل فلاتر الرابط لما يكتشف إنه محمّل داخل إطار (window.self !== window.top).
   */
  function openHiddenFrame(url) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:820px;height:560px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    return iframe;
  }

  /**
   * يستنى حتى تظهر أول صفحة بيانات في الجدول داخل الـiframe (لا نزيله من
   * الصفحة، لأنه لازم نبقى نتصفّح صفحاته لاحقاً لجمع كل الصفوف قبل الإزالة).
   */
  function waitForFirstFrame(iframe, requestedUrl, columnsMap, timeoutMs) {
    timeoutMs = timeoutMs || 20000;
    return new Promise(function (resolve, reject) {
      var start = Date.now();
      (function check() {
        if (!iframe.isConnected) {
          reject(new Error('تمت إزالة الـiframe قبل اكتمال التحميل: ' + requestedUrl));
          return;
        }
        var doc;
        try {
          doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        } catch (err) {
          reject(new Error('تعذّر الوصول لمحتوى الـiframe: ' + requestedUrl));
          return;
        }
        if (!doc || doc.readyState !== 'complete') {
          if (Date.now() - start > timeoutMs) {
            resolve(doc || null);
            return;
          }
          setTimeout(check, 300);
          return;
        }
        if (tableHasMeaningfulData(doc, columnsMap) || Date.now() - start > timeoutMs) {
          resolve(doc);
          return;
        }
        setTimeout(check, 300);
      })();
    });
  }


  // ==========================================================
  // ترقيم الصفحات (Pagination) - بعض جداول Yaqeen تعرض صفوف الصفحة
  // الحالية فقط بالـ DOM حتى لو طلبنا pageSize كبير بالرابط، فنحتاج نتنقّل
  // بين الصفحات ونجمع كل الصفوف قبل ما نعتبر التحميل مكتمل.
  // ==========================================================

  var NEXT_PAGE_SELECTORS = [
    '[aria-label="Next page"]',
    '[aria-label="التالي"]',
    '[aria-label="الصفحة التالية"]',
    '.MuiTablePagination-actions button:last-of-type',
    '.MuiPagination-ul li:last-child button',
    '.ant-pagination-next',
    '.pagination .page-item:last-child .page-link',
    'button[data-testid*="next" i]',
    'a[data-testid*="next" i]',
  ];

  var NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

  function findNextPageControl(doc) {
    for (var i = 0; i < NEXT_PAGE_SELECTORS.length; i++) {
      var el = doc.querySelector(NEXT_PAGE_SELECTORS[i]);
      if (el) return el;
    }
    var candidates = Array.prototype.slice.call(doc.querySelectorAll('button, a, [role="button"]'));
    var textMatch = candidates.find(function (el) {
      var text = (el.textContent || '').trim();
      return NEXT_PAGE_TEXT_PATTERN.test(text);
    });
    return textMatch || null;
  }

  function isControlDisabled(el) {
    if (!el) return true;
    if (el.disabled) return true;
    if (el.getAttribute('aria-disabled') === 'true') return true;
    var className = (el.className || '').toString().toLowerCase();
    if (className.indexOf('disabled') !== -1) return true;
    if (el.closest && el.closest('[aria-disabled="true"]')) return true;
    return false;
  }

  /** يقرأ صفوف الصفحة الحالية فقط (بدون تنقّل بين الصفحات) */
  function readCurrentPageRows(doc, columnsMap) {
    var table = findDataTable(doc, columnsMap.group || GROUP_COLUMN_HINT);
    if (!table) throw new Error('لم يتم العثور على جدول البيانات في الصفحة');

    var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
    if (headerCells.length === 0) throw new Error('تعذّر قراءة رؤوس أعمدة الجدول');

    var indices = {};
    Object.keys(columnsMap).forEach(function (key) {
      indices[key] = findColumnIndex(headerCells, columnsMap[key]);
    });

    var bodyRows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    return bodyRows
      .map(function (row) {
        var cells = Array.prototype.slice.call(row.querySelectorAll('td'));
        if (cells.length === 0) return null;
        var record = {};
        Object.keys(indices).forEach(function (key) {
          var idx = indices[key];
          record[key] = idx >= 0 && cells[idx] ? cells[idx].textContent.trim() : '';
        });
        record.__signature = cells.map(function (c) { return c.textContent.trim(); }).join('|');
        return record;
      })
      .filter(Boolean);
  }

  /**
   * يجمع صفوف كل صفحات الجدول: يقرأ الصفحة الحالية، يضغط "التالي" إن
   * وُجد ونشِط، وينتظر تغيّر محتوى الجدول قبل قراءة الصفحة الجديدة، وهكذا
   * حتى ينتهي الترقيم أو يصل لحد أقصى من الصفحات (حماية من التكرار اللانهائي).
   */
  function collectAllPages(iframe, doc, columnsMap) {
    return new Promise(function (resolve) {
      var allRows = [];
      var seen = {};
      var pageIndex = 0;
      var maxIterations = 80;

      function addRows(rows) {
        rows.forEach(function (r) {
          if (!seen[r.__signature]) {
            seen[r.__signature] = true;
            allRows.push(r);
          }
        });
      }

      function readRowsSafely() {
        try {
          return readCurrentPageRows(doc, columnsMap);
        } catch (err) {
          return [];
        }
      }

      function waitForPageChange(beforeSignature) {
        var waitStart = Date.now();
        (function poll() {
          if (!iframe.isConnected) {
            resolve(allRows);
            return;
          }
          var currentRows = readRowsSafely();
          var currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
          if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) {
            step();
            return;
          }
          setTimeout(poll, 250);
        })();
      }

      function step() {
        if (!iframe.isConnected) {
          resolve(allRows);
          return;
        }
        if (pageIndex >= maxIterations) {
          resolve(allRows);
          return;
        }
        pageIndex++;

        var rows = readRowsSafely();
        addRows(rows);

        var nextControl = findNextPageControl(doc);
        if (!nextControl || isControlDisabled(nextControl)) {
          resolve(allRows);
          return;
        }

        var beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
        try {
          nextControl.click();
        } catch (err) {
          resolve(allRows);
          return;
        }
        waitForPageChange(beforeSignature);
      }

      step();
    });
  }

  /**
   * يستنى أول صفحة، يجمع كل الصفحات التالية، ثم يزيل الـiframe من الصفحة
   * ويعيد السجلات الخام + مستند آخر صفحة (للتشخيص).
   */
  function fetchAllRecordsFromFrame(iframe, requestedUrl, columnsMap, timeoutMs) {
    return waitForFirstFrame(iframe, requestedUrl, columnsMap, timeoutMs).then(function (doc) {
      return collectAllPages(iframe, doc, columnsMap).then(function (records) {
        try {
          iframe.remove();
        } catch (err) {
          /* تجاهل */
        }
        return { doc: doc, records: records };
      });
    });
  }

  // ==========================================================
  // استخراج البيانات من الجداول
  // ==========================================================

  function findColumnIndex(headerCells, labelVariants) {
    var normalizedVariants = labelVariants.map(normalizeArabic);
    for (var i = 0; i < headerCells.length; i++) {
      var headerText = normalizeArabic(headerCells[i].textContent);
      for (var j = 0; j < normalizedVariants.length; j++) {
        if (headerText.indexOf(normalizedVariants[j]) !== -1) return i;
      }
    }
    return -1;
  }

  /** يحوّل نص "وقت الاستلام" (مثال: "اليوم - 08:30") إلى اسم اليوم فقط */
  function extractDayLabel(pickupText) {
    if (!pickupText) return null;
    var dayPart = pickupText.split('-')[0].trim();
    var normalizedDayPart = normalizeArabic(dayPart);
    var match = DAY_CHIPS.find(function (chip) {
      return normalizeArabic(chip) === normalizedDayPart;
    });
    return match || dayPart;
  }

  /** يحوّل السجلات الخام المجموعة من كل صفحات جدول الحجوزات إلى كائنات حجز */
  function parseBookingsFromRecords(rawRecords) {
    return rawRecords
      .filter(function (r) {
        return r.group;
      })
      .map(function (r) {
        return {
          id: r.id,
          pickupText: r.pickup,
          day: extractDayLabel(r.pickup),
          group: r.group.trim(),
          vehicle: r.vehicle,
        };
      });
  }

  /** يحوّل السجلات الخام المجموعة من كل صفحات جدول المركبات إلى أسماء مجموعات */
  function parseVehiclesFromRecords(rawRecords) {
    return rawRecords
      .filter(function (r) {
        return r.group;
      })
      .map(function (r) {
        return r.group.trim();
      });
  }

  /** يستخرج تاريخ التسليم (بدون وقت) من نص خلية "تاريخ التسليم" (ثلاث صيغ محتملة) */
  function parseDropoffDateOnly(text) {
    text = (text || '').trim();
    var now = new Date();
    var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    var relMatch = /^(اليوم|غدا ?ً?)\s*-/.exec(text);
    if (relMatch) {
      var isToday = normalizeArabic(relMatch[1]) === normalizeArabic('اليوم');
      var d = new Date(todayMid);
      d.setDate(d.getDate() + (isToday ? 0 : 1));
      return d;
    }

    var dateMatch = /(\d{1,2})-(\d{1,2})-(\d{4})/.exec(text);
    if (dateMatch) {
      var day = parseInt(dateMatch[1], 10);
      var month = parseInt(dateMatch[2], 10);
      var year = parseInt(dateMatch[3], 10);
      return new Date(year, month - 1, day);
    }

    return null;
  }

  /**
   * يحوّل تاريخ التسليم إلى اسم شريحة اليوم بنفس مفردات DAY_CHIPS (اليوم/غداً/
   * أيام الأسبوع). السيارات المتأخرة عن تاريخ تسليمها (راجعة من قبل ولسا ما
   * تسلمت فعلياً) تُستثنى بالكامل ولا تُحتسب ضمن أي يوم - وجودها بالنظام متأخر
   * عن الموعد، فما نعتمد عليها كـ"سيارة راح ترجع اليوم" لأنها فعلياً متأخرة.
   */
  function computeReturnDayLabel(dropoffText) {
    var dateOnly = parseDropoffDateOnly(dropoffText);
    if (!dateOnly) return null;
    var now = new Date();
    var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diffDays = Math.round((dateOnly - todayMid) / 86400000);
    if (diffDays < 0) return null; // متأخرة - نستثنيها
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    return WEEKDAY_NAMES[dateOnly.getDay()];
  }

  /** يحوّل السجلات الخام لصفحة "المستأجرة" إلى سيارات مسترجعة بنفس الفرع فقط */
  function parseReturnsFromRecords(rawRecords) {
    return rawRecords
      .filter(function (r) { return r.group; })
      .filter(function (r) {
        var branchRaw = (r.dropoffBranch || '').trim();
        // نتجاهل أي سيارة راجعة لفرع مختلف - ما تفيد أسطول فرعك
        return !branchRaw || normalizeArabic(branchRaw) === normalizeArabic(SAME_BRANCH_LABEL);
      })
      .map(function (r) {
        return { group: r.group.trim(), day: computeReturnDayLabel(r.dropoffText) };
      })
      .filter(function (r) { return r.day; });
  }

  // ==========================================================
  // تشخيص (Console) - يساعد على معرفة سبب عدم ظهور بيانات مصدر معيّن
  // دون الحاجة للوصول المباشر لموقع Yaqeen
  // ==========================================================

  function logSourceDiagnostics(label, requestedUrl, doc, groups) {
    var table = findDataTable(doc, GROUP_COLUMN_HINT);
    var headerTexts = table
      ? Array.prototype.map.call(table.querySelectorAll('thead th, thead td'), function (c) {
          return c.textContent.trim();
        })
      : null;
    var finalUrl = doc && doc.URL ? doc.URL : '(غير معروف)';
    var requestedQuery = requestedUrl.split('?')[1] || '';
    var urlMismatch = requestedQuery && finalUrl.indexOf(requestedQuery) === -1;

    console.groupCollapsed('[تقرير الحجوزات القادمة] تشخيص مصدر: ' + label);
    console.log('الرابط المطلوب:', requestedUrl);
    console.log('الرابط النهائي بعد التحميل:', finalUrl);
    if (urlMismatch) {
      console.warn('⚠️ الرابط النهائي يختلف عن المطلوب — على الأغلب الموقع تجاهل الفلتر أو أعاد التوجيه لموقع/فرع افتراضي');
    }
    console.log('عنوان الصفحة (title):', doc ? doc.title : '(غير معروف)');
    console.log('تم العثور على جدول بعمود "المجموعة":', !!table);
    console.log('رؤوس أعمدة الجدول المكتشف:', headerTexts);
    console.log('عدد صفوف الجدول:', table ? table.querySelectorAll('tbody tr').length : 0);
    console.log('عدد السيارات المستخرجة:', groups.length);
    console.log('عينة من المجموعات المستخرجة:', groups.slice(0, 8));
    if (groups.length === 0 && doc && doc.body) {
      console.log('أول 300 حرف من نص الصفحة (لتشخيص صفحة فارغة أو رسالة خطأ):', doc.body.innerText.slice(0, 300));
    }
    console.groupEnd();
  }

  // ==========================================================
  // تحميل كل البيانات (مع الكاش)
  // ==========================================================

  /**
   * صفحة "المستأجرة" ثقيلة (مئات الصفوف)، فأحياناً رغم فحص tableHasMeaningfulData
   * ترجع محاولة واحدة بصفر سجلات خام (لسا ما اكتمل تحميلها بالكامل). نعيد
   * المحاولة تلقائياً بدل ما نعرض عمود "مسترجعة" فاضي بالغلط.
   */
  function delay(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function fetchReturnedRecordsWithRetry(attempt) {
    attempt = attempt || 1;
    var frame = openHiddenFrame(URLS.returned);
    return fetchAllRecordsFromFrame(frame, URLS.returned, RETURNED_COLUMNS_MAP, RETURNED_FETCH_TIMEOUT_MS).then(function (result) {
      if (result.records.length === 0 && attempt < MAX_FETCH_ATTEMPTS) {
        console.warn('[تقرير الحجوزات القادمة] محاولة جلب المسترجعة ' + attempt + ' رجعت بدون بيانات، إعادة محاولة بعد مهلة قصيرة...');
        // مهلة قبل إعادة المحاولة - صفحة "المستأجرة" ثقيلة وممكن تحتاج وقت
        // إضافي قبل ما تصير جاهزة فعلياً، إعادة المحاولة فوراً بدون انتظار
        // غالباً تصطدم بنفس حالة "لسا ما اكتمل التحميل"
        return delay(RETRY_DELAY_MS).then(function () {
          return fetchReturnedRecordsWithRetry(attempt + 1);
        });
      }
      return result;
    });
  }

  function fetchAllData(force) {
    if (state.dataLoaded && !force) return Promise.resolve();

    setStatus('جارٍ تحميل بيانات الحجوزات والسيارات...', 'loading');
    showLoadingOverlay();

    // ننشئ الإطارات فوراً - بعكس النوافذ المنبثقة، الـiframe عنصر
    // DOM عادي، فما فيه خطر حظر Popup ولا حاجة نفتحه بشكل متزامن ضمن نفس
    // ضغطة المستخدم.
    var bookingsFrame = openHiddenFrame(URLS.bookings);
    var branchFrame = openHiddenFrame(URLS.vehicles.branch);
    var yardFrame = openHiddenFrame(URLS.vehicles.yard);

    var branchVehicles = [];
    return fetchAllRecordsFromFrame(bookingsFrame, URLS.bookings, BOOKING_COLUMNS_MAP)
      .then(function (result) {
        state.bookings = parseBookingsFromRecords(result.records);
        console.log('[تقرير الحجوزات القادمة] إجمالي الحجوزات المجمّعة (كل الصفحات):', state.bookings.length);
        return fetchAllRecordsFromFrame(branchFrame, URLS.vehicles.branch, VEHICLE_COLUMNS_MAP);
      })
      .then(function (result) {
        branchVehicles = parseVehiclesFromRecords(result.records);
        logSourceDiagnostics('الفرع', URLS.vehicles.branch, result.doc, branchVehicles);
        return fetchAllRecordsFromFrame(yardFrame, URLS.vehicles.yard, VEHICLE_COLUMNS_MAP);
      })
      .then(function (result) {
        var yardVehicles = parseVehiclesFromRecords(result.records);
        logSourceDiagnostics('الساحة', URLS.vehicles.yard, result.doc, yardVehicles);

        // "الكل" = اتحاد الفرع + الساحة، محسوب محلياً بدون طلب شبكة إضافي
        state.vehiclesBySource = {
          branch: branchVehicles,
          yard: yardVehicles,
          all: branchVehicles.concat(yardVehicles),
        };

        if (yardVehicles.length === 0) {
          console.warn('[تقرير الحجوزات القادمة] لم يتم العثور على أي مركبة في الساحة');
        }

        return fetchReturnedRecordsWithRetry();
      })
      .then(function (result) {
        state.returns = parseReturnsFromRecords(result.records);
        console.log('[تقرير الحجوزات القادمة] إجمالي السيارات المسترجعة بنفس الفرع (كل الصفحات):', state.returns.length);

        state.dataLoaded = true;
        state.lastUpdated = new Date();
        setStatus('تم التحديث: ' + state.lastUpdated.toLocaleTimeString('ar-SA'), 'success');
        hideLoadingOverlay();
      })
      .catch(function (error) {
        console.error('[تقرير الحجوزات القادمة]', error);
        setStatus('تعذّر تحميل البيانات: ' + error.message, 'error');
        hideLoadingOverlay();
        [bookingsFrame, branchFrame, yardFrame].forEach(function (f) {
          try {
            if (f && f.isConnected) f.remove();
          } catch (err) {
            /* تجاهل */
          }
        });
        throw error;
      });
  }

  // ==========================================================
  // بناء صفوف التقرير (تجميع حسب المجموعة)
  // ==========================================================

  /**
   * أسطول "الفرع" ثابت دائماً (غير قابل للتعديل). أسطول "الساحة" هو الوحيد
   * القابل للتعديل اليدوي، بمفتاح ثابت لا يعتمد على مصدر السيارات المعروض
   * حالياً - عشان لو المستخدم يعدّل وهو بوضع "الساحة" ثم يرجع لوضع "الكل"،
   * التعديل يبقى منعكساً بنفس القيمة.
   */
  function buildReportRows(bookings, vehiclesBySource, selectedSource, selectedDaysOrdered, vehicleOverrides, returns) {
    var branchCountByGroup = {};
    (vehiclesBySource.branch || []).forEach(function (group) {
      branchCountByGroup[group] = (branchCountByGroup[group] || 0) + 1;
    });

    var yardCountByGroup = {};
    (vehiclesBySource.yard || []).forEach(function (group) {
      yardCountByGroup[group] = (yardCountByGroup[group] || 0) + 1;
    });

    var bookingCountByGroupDay = {};
    bookings.forEach(function (booking) {
      if (!bookingCountByGroupDay[booking.group]) bookingCountByGroupDay[booking.group] = {};
      var dayMap = bookingCountByGroupDay[booking.group];
      dayMap[booking.day] = (dayMap[booking.day] || 0) + 1;
    });

    var returnCountByGroupDay = {};
    (returns || []).forEach(function (ret) {
      if (!returnCountByGroupDay[ret.group]) returnCountByGroupDay[ret.group] = {};
      var dayMap = returnCountByGroupDay[ret.group];
      dayMap[ret.day] = (dayMap[ret.day] || 0) + 1;
    });

    var allGroups = {};
    Object.keys(branchCountByGroup).forEach(function (g) { allGroups[g] = true; });
    Object.keys(yardCountByGroup).forEach(function (g) { allGroups[g] = true; });
    Object.keys(bookingCountByGroupDay).forEach(function (g) { allGroups[g] = true; });
    Object.keys(returnCountByGroupDay).forEach(function (g) { allGroups[g] = true; });

    var rows = Object.keys(allGroups).map(function (group) {
      var branchCount = branchCountByGroup[group] || 0;
      var rawYardCount = yardCountByGroup[group] || 0;
      var overrideKey = yardOverrideKey(group);
      var yardCount = Object.prototype.hasOwnProperty.call(vehicleOverrides, overrideKey)
        ? vehicleOverrides[overrideKey]
        : rawYardCount;

      var vehicleCount =
        selectedSource === 'branch' ? branchCount :
        selectedSource === 'yard' ? yardCount :
        branchCount + yardCount;

      var dayMap = bookingCountByGroupDay[group] || {};
      var returnDayMap = returnCountByGroupDay[group] || {};
      var dayCounts = {};
      var dayReturns = {};
      var totalBookings = 0;
      var totalReturns = 0;
      selectedDaysOrdered.forEach(function (day) {
        var count = dayMap[day] || 0;
        var returnCount = returnDayMap[day] || 0;
        dayCounts[day] = count;
        dayReturns[day] = returnCount;
        totalBookings += count;
        totalReturns += returnCount;
      });

      // نضيف السيارات المسترجعة (نفس الفرع) خلال الأيام المختارة للسيارات
      // الجاهزة حالياً، عشان نسبة الإشغال والفرق تعكس أنه فيه سيارات راح
      // ترجع وتغطي جزء من النقص - بدل ما تُحسب فقط من الجاهز الآن
      var effectiveVehicleCount = vehicleCount + totalReturns;

      var occupancyPercent = effectiveVehicleCount > 0 ? (totalBookings / effectiveVehicleCount) * 100 : totalBookings > 0 ? Infinity : 0;
      var difference = effectiveVehicleCount - totalBookings;

      return {
        group: group,
        vehicleCount: vehicleCount,
        branchCount: branchCount,
        yardCount: yardCount,
        totalBookings: totalBookings,
        totalReturns: totalReturns,
        effectiveVehicleCount: effectiveVehicleCount,
        dayCounts: dayCounts,
        dayReturns: dayReturns,
        occupancyPercent: occupancyPercent,
        difference: difference,
      };
    });

    rows.sort(function (a, b) {
      return a.group.localeCompare(b.group, 'ar');
    });
    return rows;
  }

  // ==========================================================
  // الفرز
  // ==========================================================

  function numOrZero(v) {
    if (v === Infinity) return Number.MAX_SAFE_INTEGER;
    return Number.isFinite(v) ? v : 0;
  }

  function getSortAccessor(key) {
    if (key === 'group') return function (r) { return r.group; };
    if (key === 'vehicles') return function (r) { return r.vehicleCount; };
    if (key === 'bookings') return function (r) { return r.totalBookings; };
    if (key === 'occupancy') return function (r) { return r.occupancyPercent; };
    if (key === 'difference') return function (r) { return r.difference; };
    if (key.indexOf('day:') === 0) {
      var day = key.slice(4);
      return function (r) { return r.dayCounts[day] || 0; };
    }
    return function () { return 0; };
  }

  function sortRows(rows) {
    if (!state.sort.key) return rows;
    var accessor = getSortAccessor(state.sort.key);
    var sorted = rows.slice().sort(function (a, b) {
      var va = accessor(a);
      var vb = accessor(b);
      if (typeof va === 'string') return va.localeCompare(vb, 'ar') * state.sort.dir;
      return (numOrZero(va) - numOrZero(vb)) * state.sort.dir;
    });
    return sorted;
  }

  // ==========================================================
  // تنسيق نسبة الإشغال والفرق
  // ==========================================================

  function formatPercentLabel(percent) {
    if (!Number.isFinite(percent)) return 'بدون سيارات';
    return Math.round(percent) + '%';
  }

  function occupancyLevel(percent) {
    if (!Number.isFinite(percent)) return 'critical';
    if (percent > OCCUPANCY_CRITICAL_THRESHOLD) return 'critical';
    if (percent >= OCCUPANCY_WARNING_THRESHOLD) return 'warning';
    return 'good';
  }

  function buildOccupancyCell(percent, extraClassName) {
    var td = document.createElement('td');
    td.className = 'yqn-occupancy-cell' + (extraClassName ? ' ' + extraClassName : '');
    var label = formatPercentLabel(percent);
    td.dataset.copyText = label;

    var level = occupancyLevel(percent);

    var row = document.createElement('div');
    row.className = 'yqn-occ-row';

    var wrapper = document.createElement('div');
    wrapper.className = 'yqn-bar-wrapper yqn-occ-' + level;

    var fill = document.createElement('div');
    fill.className = 'yqn-bar-fill';
    // نضمن حداً أدنى من العرض المرئي حتى عند 0% حتى لا يبدو الشريط فارغاً/معطوباً
    var widthPercent = Number.isFinite(percent) ? Math.max(Math.min(percent, 100), 4) : 100;
    fill.style.width = widthPercent + '%';
    wrapper.appendChild(fill);

    // النسبة كنص خارج الشريط (بدل الكتابة فوقه) - نفس فكرة تصميم "Main" المعتمد
    var text = document.createElement('span');
    text.className = 'yqn-bar-text yqn-occ-' + level;
    text.textContent = label;

    row.appendChild(wrapper);
    row.appendChild(text);
    td.appendChild(row);
    return td;
  }

  function buildDifferenceCell(difference) {
    var td = document.createElement('td');
    var sign = difference > 0 ? '+' : '';
    td.textContent = sign + difference;
    td.className = 'yqn-diff-cell ' + (difference > 0 ? 'yqn-diff-positive' : difference < 0 ? 'yqn-diff-negative' : 'yqn-diff-zero');
    return td;
  }

  /**
   * خانة عدد السيارات قابلة للتعديل يدوياً: أي تغيير يحفظ قيمة بديلة لهذه
   * المجموعة (بالمصدر الحالي) ويعيد رسم الجدول فوراً حتى تنعكس نسبة الإشغال
   * والفرق على القيمة الجديدة بدون أي طلب شبكة.
   */
  function buildYardInput(row, onCommit) {
    var input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.className = 'yqn-vehicle-input';
    input.value = row.yardCount;
    input.setAttribute('value', row.yardCount);
    input.addEventListener('click', function (e) { e.stopPropagation(); });
    input.addEventListener('change', function () {
      var value = parseInt(input.value, 10);
      if (!Number.isFinite(value) || value < 0) value = 0;
      state.vehicleOverrides[yardOverrideKey(row.group)] = value;
      renderTable();
    });
    return input;
  }

  /**
   * أسطول "الفرع" ثابت وغير قابل للتعديل دائماً. الوحيد القابل للتعديل هو
   * أسطول "الساحة":
   *  - بوضع "الفرع": رقم ثابت فقط، بدون أي حقل تعديل.
   *  - بوضع "الساحة": الرقم المعروض هو نفسه رقم الساحة القابل للتعديل مباشرة.
   *  - بوضع "الكل": نعرض المجموع (ثابت الفرع + ساحة قابلة للتعديل) بالأعلى،
   *    وتحته حقل تعديل صغير مخصص لرقم الساحة فقط - أي تعديل فيه يُعاد حساب
   *    المجموع فوراً (فرع + الساحة الجديدة) دون لمس رقم الفرع.
   */
  function buildVehiclesCell(row, extraClassName) {
    var td = document.createElement('td');
    td.className = ['yqn-vehicles-cell', extraClassName].filter(Boolean).join(' ');
    // نضبط الـ attribute (مو بس الـ property) حتى تنعكس القيمة الحالية بشكل
    // صحيح عند نسخ outerHTML الجدول (بالطباعة/تصدير الصورة لواتساب)
    td.dataset.copyText = row.vehicleCount;

    if (state.selectedSource === 'branch') {
      td.textContent = row.vehicleCount;
      return td;
    }

    if (state.selectedSource === 'yard') {
      td.appendChild(buildYardInput(row));
      return td;
    }

    var totalEl = document.createElement('div');
    totalEl.className = 'yqn-vehicles-total';
    totalEl.textContent = row.vehicleCount;
    td.appendChild(totalEl);

    var yardRow = document.createElement('div');
    yardRow.className = 'yqn-yard-edit';
    yardRow.title = 'عدد سيارات الساحة - يُجمع تلقائياً مع أسطول الفرع (' + row.branchCount + ')';

    var yardInput = buildYardInput(row);
    yardInput.classList.add('yqn-yard-input');
    yardRow.appendChild(yardInput);

    var label = document.createElement('span');
    label.className = 'yqn-yard-label';
    label.textContent = 'ساحة';
    yardRow.appendChild(label);

    td.appendChild(yardRow);
    return td;
  }

  /** خلية عمود يوم: عدد الحجوزات بالخط العريض، وتحته - إن وُجد - عدد السيارات المسترجعة بنفس اليوم/الفرع */
  function buildDayCell(bookingCount, returnCount, extraClassName) {
    var td = document.createElement('td');
    if (extraClassName) td.className = extraClassName;
    td.dataset.copyText = returnCount > 0 ? bookingCount + ' (+' + returnCount + ' مسترجعة)' : String(bookingCount);

    var mainEl = document.createElement('div');
    mainEl.textContent = bookingCount;
    td.appendChild(mainEl);

    if (returnCount > 0) {
      var subEl = document.createElement('div');
      subEl.className = 'yqn-return-sub';
      subEl.title = 'سيارات مسترجعة لنفس الفرع متوقعة بهذا اليوم';
      subEl.textContent = '↩ ' + returnCount;
      td.appendChild(subEl);
    }

    return td;
  }

  // ==========================================================
  // بناء الجدول (الأعمدة تُبنى تلقائياً حسب الأيام المختارة)
  // ==========================================================

  function getSelectedDaysOrdered() {
    return DAY_CHIPS.filter(function (day) {
      return state.selectedDays.has(day);
    });
  }

  function buildColumnDefinitions(selectedDaysOrdered) {
    var columns = [
      { key: 'group', label: 'المجموعة' },
      { key: 'vehicles', label: 'السيارات' },
      { key: 'bookings', label: 'الحجوزات' },
    ];
    // فاصل بصري بين أعمدة الهوية/الملخص وأعمدة الأيام، وبين أعمدة الأيام وأعمدة النتيجة
    selectedDaysOrdered.forEach(function (day, index) {
      columns.push({ key: 'day:' + day, label: day, dividerBefore: index === 0 });
    });
    columns.push({
      key: 'occupancy',
      label: 'نسبة الإشغال',
      dividerBefore: true,
      title: 'السيارات الجاهزة + السيارات المسترجعة (نفس الفرع) بالأيام المختارة، مقابل الحجوزات',
    });
    columns.push({
      key: 'difference',
      label: 'الفرق',
      title: 'السيارات الجاهزة + السيارات المسترجعة (نفس الفرع) بالأيام المختارة - الحجوزات',
    });
    return columns;
  }

  function columnCellClassName(col) {
    return col.dividerBefore ? 'yqn-col-divider' : '';
  }

  function sortIndicator(key) {
    if (state.sort.key !== key) return '';
    return state.sort.dir === 1 ? ' ▲' : ' ▼';
  }

  function buildRowElement(row, columns) {
    var tr = document.createElement('tr');
    columns.forEach(function (col) {
      if (col.key === 'occupancy') {
        tr.appendChild(buildOccupancyCell(row.occupancyPercent, columnCellClassName(col)));
        return;
      }
      if (col.key === 'difference') {
        var diffCell = buildDifferenceCell(row.difference);
        if (columnCellClassName(col)) diffCell.className += ' ' + columnCellClassName(col);
        tr.appendChild(diffCell);
        return;
      }
      if (col.key === 'vehicles') {
        tr.appendChild(buildVehiclesCell(row, columnCellClassName(col)));
        return;
      }
      if (col.key.indexOf('day:') === 0) {
        var day = col.key.slice(4);
        var bookingCount = row.dayCounts[day] || 0;
        var returnCount = (row.dayReturns && row.dayReturns[day]) || 0;
        tr.appendChild(buildDayCell(bookingCount, returnCount, columnCellClassName(col)));
        return;
      }
      var td = document.createElement('td');
      var classNames = [columnCellClassName(col)].filter(Boolean);
      if (col.key === 'group') {
        td.textContent = row.group;
        classNames.push('yqn-group-cell');
      } else if (col.key === 'bookings') {
        td.textContent = row.totalBookings;
      }
      if (classNames.length) td.className = classNames.join(' ');
      tr.appendChild(td);
    });
    return tr;
  }

  function buildTotalsRow(rows, columns) {
    var tr = document.createElement('tr');
    tr.className = 'yqn-totals-row';

    var totalVehicles = 0;
    var totalBookings = 0;
    var totalReturns = 0;
    var totalsByDay = {};
    var returnsByDay = {};
    rows.forEach(function (r) {
      totalVehicles += r.vehicleCount;
      totalBookings += r.totalBookings;
      totalReturns += r.totalReturns || 0;
      Object.keys(r.dayCounts).forEach(function (day) {
        totalsByDay[day] = (totalsByDay[day] || 0) + r.dayCounts[day];
      });
      Object.keys(r.dayReturns || {}).forEach(function (day) {
        returnsByDay[day] = (returnsByDay[day] || 0) + r.dayReturns[day];
      });
    });
    // نفس منطق الصف الفردي: نضيف السيارات المسترجعة للأيام المختارة على
    // الجاهزة حالياً قبل حساب نسبة الإشغال والفرق الإجمالية
    var totalEffectiveVehicles = totalVehicles + totalReturns;
    var totalOccupancy = totalEffectiveVehicles > 0 ? (totalBookings / totalEffectiveVehicles) * 100 : totalBookings > 0 ? Infinity : 0;
    var totalDifference = totalEffectiveVehicles - totalBookings;

    columns.forEach(function (col) {
      if (col.key === 'occupancy') {
        tr.appendChild(buildOccupancyCell(totalOccupancy, columnCellClassName(col)));
        return;
      }
      if (col.key === 'difference') {
        var diffCell = buildDifferenceCell(totalDifference);
        if (columnCellClassName(col)) diffCell.className += ' ' + columnCellClassName(col);
        tr.appendChild(diffCell);
        return;
      }
      if (col.key.indexOf('day:') === 0) {
        var day = col.key.slice(4);
        tr.appendChild(buildDayCell(totalsByDay[day] || 0, returnsByDay[day] || 0, columnCellClassName(col)));
        return;
      }
      var td = document.createElement('td');
      var classNames = [columnCellClassName(col)].filter(Boolean);
      if (col.key === 'group') td.textContent = 'الإجمالي';
      else if (col.key === 'vehicles') td.textContent = totalVehicles;
      else if (col.key === 'bookings') td.textContent = totalBookings;
      if (classNames.length) td.className = classNames.join(' ');
      tr.appendChild(td);
    });
    return tr;
  }

  function onSortClick(key) {
    if (state.sort.key === key) {
      state.sort.dir *= -1;
    } else {
      state.sort.key = key;
      state.sort.dir = 1;
    }
    renderTable(); // إعادة ترتيب محلية فقط - بدون أي طلب شبكة جديد
  }

  function yardOverrideKey(group) {
    return 'yard::' + group;
  }

  /** يحسب صفوف التقرير الحالية (حسب الفلاتر المختارة) بدون أي لمس للـ DOM - تُستخدم لعرض الجدول ولبناء رسالة واتساب */
  function getCurrentReportData() {
    var selectedDaysOrdered = getSelectedDaysOrdered();
    var rows = buildReportRows(state.bookings || [], state.vehiclesBySource, state.selectedSource, selectedDaysOrdered, state.vehicleOverrides, state.returns || []);
    // نعرض أي مجموعة عندها سيارات جاهزة حتى لو بدون أي حجز، أو عندها حجوزات
    // حتى لو بدون سيارات جاهزة حالياً - نخفي فقط الصفوف الفارغة كلياً (لا
    // سيارات ولا حجوزات) لأنها ما تضيف أي معلومة للتقرير
    rows = rows.filter(function (r) {
      return r.vehicleCount > 0 || r.totalBookings > 0;
    });
    return {
      selectedDaysOrdered: selectedDaysOrdered,
      sortedRows: sortRows(rows),
      columns: buildColumnDefinitions(selectedDaysOrdered),
    };
  }

  function renderTable() {
    if (!modalEls) return;

    var reportData = getCurrentReportData();
    var sortedRows = reportData.sortedRows;
    var columns = reportData.columns;

    var theadRow = modalEls.table.querySelector('thead tr');
    var tbody = modalEls.table.querySelector('tbody');
    var tfoot = modalEls.table.querySelector('tfoot');
    theadRow.innerHTML = '';
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    columns.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = col.label + sortIndicator(col.key);
      if (col.title) th.title = col.title;
      var headClassNames = [columnCellClassName(col)].filter(Boolean);
      if (headClassNames.length) th.className = headClassNames.join(' ');
      th.addEventListener('click', function () { onSortClick(col.key); });
      theadRow.appendChild(th);
    });

    if (sortedRows.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = columns.length;
      emptyCell.className = 'yqn-empty';
      emptyCell.textContent = 'لا توجد بيانات مطابقة للاختيار الحالي';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      sortedRows.forEach(function (row) {
        tbody.appendChild(buildRowElement(row, columns));
      });
    }

    tfoot.appendChild(buildTotalsRow(sortedRows, columns));

    modalEls.totalBookingsEl.textContent = (state.bookings || []).length;
    modalEls.totalReturnsEl.textContent = (state.returns || []).length;
  }

  // ==========================================================
  // الإجراءات: تحديث / نسخ / تصدير / طباعة
  // ==========================================================

  function handleRefresh() {
    // التحديث يجيب أعداد السيارات الحقيقية من يقين من جديد، فنمسح أي تعديل
    // يدوي سابق حتى ما يظل يطغى على البيانات الفعلية الجديدة
    state.vehicleOverrides = {};
    fetchAllData(true)
      .then(renderTable)
      .catch(function () { renderTable(); });
  }

  function tableToTsv() {
    var lines = [];
    var headerCells = modalEls.table.querySelectorAll('thead th');
    lines.push(Array.prototype.map.call(headerCells, function (th) { return th.textContent.trim(); }).join('\t'));

    modalEls.table.querySelectorAll('tbody tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      lines.push(Array.prototype.map.call(cells, function (td) {
        return td.dataset.copyText !== undefined ? td.dataset.copyText : td.textContent.trim();
      }).join('\t'));
    });

    var footCells = modalEls.table.querySelectorAll('tfoot td');
    if (footCells.length) {
      lines.push(Array.prototype.map.call(footCells, function (td) {
        return td.dataset.copyText !== undefined ? td.dataset.copyText : td.textContent.trim();
      }).join('\t'));
    }
    return lines.join('\n');
  }

  function handleCopy() {
    var tsv = tableToTsv();
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      setStatus('النسخ التلقائي غير مدعوم في هذا المتصفح', 'error');
      return;
    }
    navigator.clipboard
      .writeText(tsv)
      .then(function () { setStatus('تم نسخ الجدول إلى الحافظة', 'success'); })
      .catch(function () { setStatus('تعذّر نسخ الجدول', 'error'); });
  }

  function tableToExcelHtml() {
    var headerCells = modalEls.table.querySelectorAll('thead th');
    var headerHtml = Array.prototype.map
      .call(headerCells, function (th) { return '<th>' + escapeHtml(th.textContent.trim()) + '</th>'; })
      .join('');

    var bodyHtml = Array.prototype.map
      .call(modalEls.table.querySelectorAll('tbody tr'), function (tr) {
        var cells = tr.querySelectorAll('td');
        var rowHtml = Array.prototype.map
          .call(cells, function (td) {
            var value = td.dataset.copyText !== undefined ? td.dataset.copyText : td.textContent.trim();
            return '<td>' + escapeHtml(value) + '</td>';
          })
          .join('');
        return '<tr>' + rowHtml + '</tr>';
      })
      .join('');

    var footCells = modalEls.table.querySelectorAll('tfoot td');
    var footHtml = footCells.length
      ? '<tr>' +
        Array.prototype.map
          .call(footCells, function (td) {
            var value = td.dataset.copyText !== undefined ? td.dataset.copyText : td.textContent.trim();
            return '<td><b>' + escapeHtml(value) + '</b></td>';
          })
          .join('') +
        '</tr>'
      : '';

    return (
      '<html><head><meta charset="UTF-8"></head><body dir="rtl">' +
      '<table border="1"><thead><tr>' + headerHtml + '</tr></thead><tbody>' + bodyHtml + footHtml + '</tbody></table>' +
      '</body></html>'
    );
  }

  function handleExportExcel() {
    var html = tableToExcelHtml();
    var blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    var dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = 'تقرير-الحجوزات-القادمة-' + dateStr + '.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus('تم تصدير الملف بنجاح', 'success');
  }

  // تنسيقات ثابتة للجدول تُستخدم بمعزل عن نافذة الأداة (بالطباعة وبتصدير الصورة) -
  // مستقلة عن MODAL_CSS لأنها بلا Sticky/تمرير، وبألوان صريحة تُطبَع/تُرسم دائماً
  var TABLE_EXPORT_CSS =
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
    'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
    'h1{font-size:20px;margin:0 0 4px;}' +
    '.yqn-print-meta{color:#555;font-size:14px;margin-bottom:16px;}' +
    'table{border-collapse:collapse;width:100%;font-size:13.5px;}' +
    'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
    'th{background:#f0f0f0;}' +
    '.yqn-totals-row{font-weight:bold;background:#f0f0f0;}' +
    '.yqn-group-cell{font-weight:bold;}' +
    '.yqn-vehicle-input{width:52px;border:0;background:transparent;text-align:center;font:inherit;color:inherit;}' +
    '.yqn-occ-row{display:flex;align-items:center;gap:6px;}' +
    '.yqn-bar-wrapper{position:relative;flex:1;display:block;height:10px;min-width:60px;border-radius:5px;background:#e5e5e5;overflow:hidden;}' +
    '.yqn-bar-fill{position:absolute;inset-inline-start:0;top:0;bottom:0;border-radius:5px;}' +
    '.yqn-occ-good .yqn-bar-fill{background:#22c55e;}' +
    '.yqn-occ-warning .yqn-bar-fill{background:#eab308;}' +
    '.yqn-occ-critical .yqn-bar-fill{background:#ef4444;}' +
    '.yqn-bar-text{font-weight:bold;white-space:nowrap;}' +
    '.yqn-bar-text.yqn-occ-good{color:#16a34a;}' +
    '.yqn-bar-text.yqn-occ-warning{color:#b45309;}' +
    '.yqn-bar-text.yqn-occ-critical{color:#dc2626;}' +
    '.yqn-diff-positive{color:#16a34a;font-weight:bold;}' +
    '.yqn-diff-negative{color:#dc2626;font-weight:bold;}' +
    '.yqn-diff-zero{color:#b45309;font-weight:bold;}' +
    '.yqn-return-sub{font-size:11.5px;color:#16a34a;font-weight:bold;margin-top:2px;}';

  /**
   * ينسخ جدول التقرير كنص HTML ثابت (بدون عناصر <input> التفاعلية لتعديل
   * السيارات) للاستخدام بالطباعة/تصدير الصورة. مهم بالذات لصورة واتساب: عنصر
   * <input> يُسلسَل عبر outerHTML بدون إغلاق ذاتي (مثل <input ...> بدون />)،
   * وهذا غير صالح كـ XML صحيح داخل foreignObject بالـ SVG، فيفشل رسم الصورة
   * بصمت (تعذّر تحويل SVG لصورة) - الحل نستبدل أي خلية فيها عنصر <input>
   * بقيمة data-copy-text النهائية للخلية (المجموع الصحيح، مو رقم حقل الساحة
   * وحده - بوضع "الكل" الخلية فيها رقمان: مجموع ثابت + حقل تعديل الساحة).
   */
  function buildStaticTableHtml() {
    var clone = modalEls.table.cloneNode(true);
    Array.prototype.slice.call(clone.querySelectorAll('input')).forEach(function (input) {
      var td = input.closest('td');
      if (td) td.textContent = td.dataset.copyText !== undefined ? td.dataset.copyText : input.value;
    });
    return clone.outerHTML;
  }

  function buildReportMetaHtml() {
    var now = new Date().toLocaleString('ar-SA');
    var sourceLabel = VEHICLE_SOURCES.filter(function (s) { return s.value === state.selectedSource; })[0].label;
    var daysLabel = getSelectedDaysOrdered().join('، ') || '—';
    return (
      '<h1>📊 تقرير الحجوزات القادمة</h1>' +
      '<div class="yqn-print-meta">' + escapeHtml(now) +
      ' | مصدر السيارات: ' + escapeHtml(sourceLabel) +
      ' | الأيام: ' + escapeHtml(daysLabel) +
      ' | إجمالي الحجوزات: ' + escapeHtml(String((state.bookings || []).length)) +
      ' | إجمالي المسترجعة (نفس الفرع): ' + escapeHtml(String((state.returns || []).length)) + '</div>'
    );
  }

  function handlePrint() {
    var printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      setStatus('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    var printHtml =
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير الحجوزات القادمة</title>' +
      '<style>' + TABLE_EXPORT_CSS + 'body{padding:24px;}</style></head><body>' +
      buildReportMetaHtml() +
      buildStaticTableHtml() +
      '</body></html>';

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  /**
   * يرسم الجدول الحالي (بعنوانه وبياناته الوصفية) كصورة PNG عبر SVG+foreignObject
   * بدون أي مكتبة خارجية. يعيد Promise بصيغة data URL (data:image/png;base64,...).
   */
  /** يحوّل نص UTF-8 (فيه عربي) إلى base64 - btoa العادية تدعم Latin1 بس */
  function utf8ToBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }

  function buildReportImageDataUrl() {
    return new Promise(function (resolve, reject) {
      var settled = false;
      function settleResolve(value) {
        if (settled) return;
        settled = true;
        resolve(value);
      }
      function settleReject(err) {
        if (settled) return;
        settled = true;
        reject(err);
      }

      try {
        var innerHtml = '<style>' + TABLE_EXPORT_CSS + '</style>' + buildReportMetaHtml() + buildStaticTableHtml();
        var wrapperStyle =
          'font-family:Tahoma,Arial,sans-serif;background:#fff;padding:20px;display:inline-block;';

        // نقيس الحجم الطبيعي للمحتوى المُصدَّر فعلياً (بمعزل عن عرض المودال 100%)
        // بدل الاعتماد على قياسات الجدول داخل المودال - لأن الجدول هناك يتمدد
        // width:100% على عرض المودال الواسع (min 1560px)، بينما نفس الجدول بتصميم
        // التصدير المستقل (TABLE_EXPORT_CSS) يرجع لحجمه الطبيعي الأصغر، فكان يترك
        // مساحة فارغة كبيرة حول المحتوى بدل ما يملأ الصورة.
        var measureEl = document.createElement('div');
        measureEl.style.cssText = 'position:fixed;left:-99999px;top:0;visibility:hidden;' + wrapperStyle;
        measureEl.innerHTML = innerHtml;
        document.body.appendChild(measureEl);
        var measuredRect = measureEl.getBoundingClientRect();
        var width = Math.max(Math.ceil(measuredRect.width), 400);
        var height = Math.max(Math.ceil(measuredRect.height), 300);
        document.body.removeChild(measureEl);

        var contentHtml =
          '<div xmlns="http://www.w3.org/1999/xhtml" style="' + wrapperStyle + '">' + innerHtml + '</div>';

        var svgString =
          '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
          '<foreignObject width="100%" height="100%">' + contentHtml + '</foreignObject></svg>';

        // نستخدم data URI (مش blob:) لأن كروم بيعتبر الصورة "ملوّثة" (Tainted Canvas)
        // لو كانت SVG فيها foreignObject ومحمّلة من blob:، فيرفض canvas.toDataURL()
        // بصمت (استثناء غير ملتقط داخل onload) وتظل العملية عالقة للأبد.
        var svgDataUrl = 'data:image/svg+xml;charset=utf-8;base64,' + utf8ToBase64(svgString);

        var img = new Image();
        var timeoutId = setTimeout(function () {
          settleReject(new Error('انتهت مهلة رسم صورة الجدول'));
        }, 15000);

        img.onload = function () {
          clearTimeout(timeoutId);
          try {
            // نقص أي مساحة فاضية (بيضاء) تبقى يمين/تحت المحتوى الفعلي - بغض النظر عن
            // سبب الفرق بين القياس المتوقع والمرسوم فعلياً (مثلاً فروقات محرك رسم
            // foreignObject)، هذا يضمن عدم وجود إطار فاضي حول الصورة النهائية.
            function trimWhitespace(canvas) {
              var ctx2d = canvas.getContext('2d');
              var w = canvas.width;
              var h = canvas.height;
              var data = ctx2d.getImageData(0, 0, w, h).data;
              var stride = Math.max(1, Math.floor(Math.min(w, h) / 600));
              function rowHasContent(y) {
                for (var x = 0; x < w; x += stride) {
                  var i = (y * w + x) * 4;
                  if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                }
                return false;
              }
              function colHasContent(x) {
                for (var y = 0; y < h; y += stride) {
                  var i = (y * w + x) * 4;
                  if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return true;
                }
                return false;
              }
              var lastRow = 0;
              for (var y = h - 1; y >= 0; y -= stride) { if (rowHasContent(y)) { lastRow = y; break; } }
              var lastCol = 0;
              for (var x = w - 1; x >= 0; x -= stride) { if (colHasContent(x)) { lastCol = x; break; } }

              var margin = stride * 2;
              var trimmedW = Math.min(w, lastCol + margin);
              var trimmedH = Math.min(h, lastRow + margin);
              if (trimmedW >= w - stride && trimmedH >= h - stride) return canvas; // ما في مساحة فاضية تُذكر

              var trimmed = document.createElement('canvas');
              trimmed.width = trimmedW;
              trimmed.height = trimmedH;
              trimmed.getContext('2d').drawImage(canvas, 0, 0, trimmedW, trimmedH, 0, 0, trimmedW, trimmedH);
              return trimmed;
            }

            // نرسم بدقة عالية أول شي، ونطلع جودة/دقة أقل بس لو تجاوزت حد كبير جداً
            // (السيرفر الآن يقبل حتى 100mb، فما في داعي نصغّر الصورة كأول خيار)
            function drawAtScale(scale) {
              var canvas = document.createElement('canvas');
              canvas.width = width * scale;
              canvas.height = height * scale;
              var ctx = canvas.getContext('2d');
              ctx.scale(scale, scale);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
              return trimWhitespace(canvas);
            }

            var TARGET_DATA_URL_LENGTH = 8000000; // ~6MB بعد فك التشفير - هامش مريح تحت حد الـ100mb
            var scales = [2, 1.5, 1];
            var qualities = [0.92, 0.85, 0.75, 0.6];
            var best = null;

            outer:
            for (var s = 0; s < scales.length; s++) {
              var canvas = drawAtScale(scales[s]);
              for (var q = 0; q < qualities.length; q++) {
                var dataUrl = canvas.toDataURL('image/jpeg', qualities[q]);
                if (!best || dataUrl.length < best.length) best = dataUrl;
                if (dataUrl.length <= TARGET_DATA_URL_LENGTH) {
                  console.info(
                    '[تقرير الحجوزات القادمة] حجم صورة الإرسال: ~' +
                      Math.round((dataUrl.length * 0.75) / 1024) +
                      'KB (scale=' + scales[s] + ', quality=' + qualities[q] + ')'
                  );
                  break outer;
                }
              }
            }

            if (best.length > TARGET_DATA_URL_LENGTH) {
              console.warn(
                '[تقرير الحجوزات القادمة] تعذّر تصغير الصورة تحت الهدف - أصغر حجم ممكن: ~' +
                  Math.round((best.length * 0.75) / 1024) +
                  'KB. إن استمر خطأ 413 لازم ترفع حد express.json على السيرفر.'
              );
            }

            settleResolve(best);
          } catch (err) {
            settleReject(err);
          }
        };
        img.onerror = function () {
          clearTimeout(timeoutId);
          settleReject(new Error('تعذّر رسم صورة الجدول (قد يكون المتصفح لا يدعم تحويل SVG لصورة)'));
        };
        img.src = svgDataUrl;
      } catch (err) {
        settleReject(err);
      }
    });
  }

  /** إرسال كصورة - حسب توثيق البوت المحدَّث: POST { target, type:"image", imageBase64, caption } */
  function handleSendWhatsApp() {
    if (typeof GM_xmlhttpRequest === 'undefined') {
      setStatus('صلاحية GM_xmlhttpRequest غير مفعّلة - تأكد من تحديث السكربت في Tampermonkey', 'error');
      return;
    }
    setStatus('جارٍ تجهيز صورة التقرير...', 'loading');
    buildReportImageDataUrl()
      .then(function (dataUrl) {
        var approxKb = Math.round((dataUrl.length * 0.75) / 1024);
        setStatus('جارٍ إرسال صورة التقرير عبر واتساب... (~' + approxKb + 'KB)', 'loading');
        GM_xmlhttpRequest({
          method: 'POST',
          url: WHATSAPP_CONFIG.apiUrl,
          headers: {
            Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            target: WHATSAPP_CONFIG.target,
            sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main',
            type: 'image',
            // نرسل base64 خام بدون بادئة data:image/...;base64, لأن أغلب أكواد
            // البوتات تعمل Buffer.from(imageBase64,'base64') مباشرة، والبادئة تفسد البيانات
            imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
            caption: '📊 تقرير الحجوزات القادمة - ' + new Date().toLocaleString('ar-SA'),
          }),
          onload: function (response) {
            if (response.status >= 200 && response.status < 300) {
              setStatus('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
            } else if (response.status === 413) {
              console.error('[تقرير الحجوزات القادمة] فشل إرسال واتساب: 413 - حد حجم الطلب على السيرفر لسا صغير', response.responseText);
              setStatus('فشل الإرسال: السيرفر يرفض حجم الصورة (413) - لازم ترفع limit في express.json على الـ VPS وتعيد تشغيل البوت', 'error');
            } else {
              console.error('[تقرير الحجوزات القادمة] فشل إرسال واتساب:', response.status, response.responseText);
              setStatus('فشل إرسال واتساب (رمز الحالة: ' + response.status + ') - افتح Console لمزيد من التفاصيل', 'error');
            }
          },
          onerror: function (error) {
            console.error('[تقرير الحجوزات القادمة] تعذّر الاتصال ببوت واتساب:', error);
            setStatus('تعذّر الاتصال بخادم بوت واتساب', 'error');
          },
        });
      })
      .catch(function (err) {
        console.error('[تقرير الحجوزات القادمة] تعذّر إنشاء صورة التقرير:', err);
        setStatus('تعذّر إنشاء صورة التقرير: ' + err.message, 'error');
      });
  }

  // ==========================================================
  // بناء واجهة المستخدم (Modal)
  // ==========================================================

  function injectStyles() {
    if (document.getElementById('yqn-booking-report-styles')) return;
    var style = document.createElement('style');
    style.id = 'yqn-booking-report-styles';
    style.textContent = MODAL_CSS;
    document.head.appendChild(style);
  }

  function buildChip(day) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'yqn-chip' + (state.selectedDays.has(day) ? ' yqn-chip--active' : '');
    chip.textContent = day;
    chip.addEventListener('click', function () {
      if (state.selectedDays.has(day)) {
        // منع إفراغ التقرير بالكامل: يجب أن يبقى يوم واحد مختاراً على الأقل
        if (state.selectedDays.size === 1) return;
        state.selectedDays.delete(day);
        chip.classList.remove('yqn-chip--active');
      } else {
        state.selectedDays.add(day);
        chip.classList.add('yqn-chip--active');
      }
      renderTable(); // محلي فقط، بدون إعادة تحميل الصفحات
    });
    return chip;
  }

  function buildModalOnce() {
    if (modalEls) return;
    injectStyles();

    var overlay = document.createElement('div');
    overlay.id = 'yqn-booking-report-overlay';
    overlay.className = 'yqn-overlay';

    var modal = document.createElement('div');
    modal.className = 'yqn-modal';
    modal.dir = 'rtl';

    modal.innerHTML =
      '<header class="yqn-header">' +
      '  <div class="yqn-header-titles">' +
      '    <h2>📊 تقرير الحجوزات القادمة</h2>' +
      '    <div class="yqn-stat-badge">الحجوزات: <strong id="yqn-total-bookings">0</strong> | المسترجعة (نفس الفرع): <strong id="yqn-total-returns">0</strong></div>' +
      '  </div>' +
      '  <button type="button" class="yqn-close" aria-label="إغلاق">✕</button>' +
      '</header>' +
      '<div class="yqn-toolbar">' +
      '  <div class="yqn-actions">' +
      '    <button type="button" class="yqn-icon-btn" data-action="refresh" title="تحديث البيانات">🔄</button>' +
      '    <button type="button" class="yqn-icon-btn" data-action="copy" title="نسخ الجدول">📋</button>' +
      '    <button type="button" class="yqn-icon-btn" data-action="export" title="تصدير Excel">📊</button>' +
      '    <button type="button" class="yqn-icon-btn" data-action="print" title="طباعة التقرير">🖨️</button>' +
      '    <button type="button" class="yqn-icon-btn yqn-icon-btn--whatsapp" data-action="whatsapp" title="إرسال صورة واتساب">📱</button>' +
      '  </div>' +
      '  <div class="yqn-filters">' +
      '    <div class="yqn-filter-group">' +
      '      <span class="yqn-filter-label">مصدر السيارات</span>' +
      '      <fieldset class="yqn-source-filter" aria-label="مصدر السيارات"></fieldset>' +
      '    </div>' +
      '    <div class="yqn-filter-divider" aria-hidden="true"></div>' +
      '    <div class="yqn-filter-group yqn-filter-group--grow">' +
      '      <span class="yqn-filter-label">الأيام</span>' +
      '      <div class="yqn-day-chips"></div>' +
      '    </div>' +
      '  </div>' +
      '</div>' +
      '<div class="yqn-table-wrapper">' +
      '  <table class="yqn-table"><thead><tr></tr></thead><tbody></tbody><tfoot><tr></tr></tfoot></table>' +
      '  <div class="yqn-loading-overlay" id="yqn-loading-overlay">' +
      '    <div class="yqn-spinner-lg" aria-hidden="true"></div>' +
      '    <div>جارٍ تحميل البيانات...</div>' +
      '  </div>' +
      '</div>' +
      '<div class="yqn-status" id="yqn-status"></div>';

    // مصدر السيارات (Radio buttons)
    var sourceFieldset = modal.querySelector('.yqn-source-filter');
    VEHICLE_SOURCES.forEach(function (source) {
      var label = document.createElement('label');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'yqn-source';
      input.value = source.value;
      input.checked = source.value === state.selectedSource;
      input.addEventListener('change', function () {
        state.selectedSource = source.value;
        renderTable(); // محلي فقط، البيانات مخزّنة مسبقاً لكل المصادر
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + source.label));
      sourceFieldset.appendChild(label);
    });

    // أيام (Chips)
    var chipsContainer = modal.querySelector('.yqn-day-chips');
    DAY_CHIPS.forEach(function (day) {
      chipsContainer.appendChild(buildChip(day));
    });

    // أزرار الإجراءات العلوية
    modal.querySelector('[data-action="refresh"]').addEventListener('click', handleRefresh);
    modal.querySelector('[data-action="copy"]').addEventListener('click', handleCopy);
    modal.querySelector('[data-action="export"]').addEventListener('click', handleExportExcel);
    modal.querySelector('[data-action="print"]').addEventListener('click', handlePrint);
    modal.querySelector('[data-action="whatsapp"]').addEventListener('click', handleSendWhatsApp);

    modal.querySelector('.yqn-close').addEventListener('click', hideModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('yqn-overlay--open')) hideModal();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modalEls = {
      overlay: overlay,
      modal: modal,
      table: modal.querySelector('.yqn-table'),
      totalBookingsEl: modal.querySelector('#yqn-total-bookings'),
      totalReturnsEl: modal.querySelector('#yqn-total-returns'),
      statusEl: modal.querySelector('#yqn-status'),
      loadingOverlayEl: modal.querySelector('#yqn-loading-overlay'),
    };
  }

  function showLoadingOverlay() {
    if (modalEls && modalEls.loadingOverlayEl) modalEls.loadingOverlayEl.classList.add('yqn-loading-overlay--visible');
  }

  function hideLoadingOverlay() {
    if (modalEls && modalEls.loadingOverlayEl) modalEls.loadingOverlayEl.classList.remove('yqn-loading-overlay--visible');
  }

  function showModal() {
    modalEls.overlay.classList.add('yqn-overlay--open');
  }

  function hideModal() {
    if (modalEls) modalEls.overlay.classList.remove('yqn-overlay--open');
  }

  function openModal() {
    try {
      buildModalOnce();
      showModal();
      renderTable(); // عرض فوري (من الكاش إن وُجد) قبل انتظار الشبكة
      fetchAllData(false)
        .then(function () {
          renderTable();
          // أول فتح: لو المسترجعة رجعت صفر رغم كل محاولات إعادة الجلب
          // الداخلية (صفحة "المستأجرة" ثقيلة وأحياناً تحتاج وقت إضافي)، نعيد
          // دورة تحميل كاملة صامتة مرة وحدة تلقائياً - نفس اللي كان المستخدم
          // يضطر يسويه يدوياً بالضغط على "تحديث البيانات"
          if ((state.returns || []).length === 0) {
            return fetchAllData(true).then(renderTable);
          }
        })
        .catch(function () { renderTable(); });
    } catch (error) {
      console.error('[تقرير الحجوزات القادمة] خطأ غير متوقع:', error);
      if (modalEls) setStatus('حدث خطأ غير متوقع: ' + error.message, 'error');
    }
  }

  // ==========================================================
  // التنسيقات (CSS) - دعم الوضع الداكن + RTL + Responsive
  // ==========================================================
  var MODAL_CSS =
    '.yqn-overlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;' +
    'background:rgba(20,18,12,.42);padding:24px;font-family:"Tajawal",Arial,Tahoma,sans-serif;font-size:17px;}' +
    '.yqn-overlay--open{display:flex;}' +
    '.yqn-modal{background:#fff;color:#1c1c1a;border-radius:22px;position:relative;' +
    'box-shadow:0 30px 60px -20px rgba(0,0,0,.35);' +
    'width:min(1560px,97vw);height:min(920px,94vh);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;}' +
    // --- الرأس: أبيض مع أيقونة بجانب العنوان + سطر إحصائي تحته (بدل الشريط الأخضر الكامل القديم) ---
    '.yqn-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 28px;' +
    'background:#fff;color:#1c1c1a;border-bottom:1px solid #e9e7df;}' +
    '.yqn-header-titles{display:flex;flex-direction:column;align-items:flex-start;gap:5px;}' +
    '.yqn-header h2{margin:0;font-size:18px;font-weight:800;}' +
    '.yqn-stat-badge{font-size:13.5px;color:#767068;}' +
    '.yqn-stat-badge strong{font-weight:800;color:#1c1c1a;}' +
    '.yqn-close{background:transparent;border:0;font-size:18px;cursor:pointer;color:#a19c92;line-height:1;padding:8px;border-radius:9px;flex-shrink:0;}' +
    '.yqn-close:hover{background:#f1f0ea;color:#1c1c1a;}' +
    // --- شريط موحّد: أيقونات الإجراءات + الفلاتر بصف واحد مضغوط ---
    '.yqn-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;' +
    'padding:14px 28px;border-bottom:1px solid #e9e7df;background:#fbfbf9;}' +
    '.yqn-actions{display:flex;flex-wrap:wrap;gap:8px;}' +
    '.yqn-icon-btn{cursor:pointer;border:1.5px solid #e9e7df;background:#fff;color:#1c1c1a;font-family:inherit;' +
    'width:38px;height:38px;border-radius:11px;font-size:16px;line-height:1;transition:background .15s,border-color .15s;' +
    'display:flex;align-items:center;justify-content:center;}' +
    '.yqn-icon-btn:hover{background:#f1f0ea;border-color:#a19c92;}' +
    '.yqn-icon-btn--whatsapp{background:linear-gradient(160deg,#25D366,#16a34a);border-color:transparent;' +
    'color:#fff;box-shadow:0 6px 14px -6px rgba(22,163,74,.55);}' +
    '.yqn-icon-btn--whatsapp:hover{background:linear-gradient(160deg,#25D366,#16a34a);filter:brightness(1.06);' +
    'border-color:transparent;}' +
    // --- لوحة الفلاتر: قسمين واضحين (مصدر السيارات / الأيام) مع عنوان وفاصل بينهما ---
    '.yqn-filters{display:flex;flex-wrap:wrap;align-items:center;gap:20px;}' +
    '.yqn-filter-group{display:flex;flex-direction:column;gap:7px;}' +
    '.yqn-filter-group--grow{flex:1;min-width:220px;}' +
    '.yqn-filter-label{font-size:11.5px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;}' +
    '.yqn-filter-divider{align-self:stretch;width:1px;background:#e9e7df;}' +
    '.yqn-source-filter{display:flex;align-items:center;gap:12px;border:0;padding:0;margin:0;flex-wrap:wrap;}' +
    '.yqn-source-filter label{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;cursor:pointer;}' +
    '.yqn-source-filter input[type="radio"]{width:15px;height:15px;accent-color:#79a916;}' +
    '.yqn-day-chips{display:flex;flex-wrap:wrap;gap:7px;}' +
    '.yqn-chip{cursor:pointer;border:1.5px solid #e9e7df;background:#fff;color:#1c1c1a;font-family:inherit;' +
    'padding:7px 14px;border-radius:999px;font-size:13.5px;font-weight:700;transition:all .15s;}' +
    '.yqn-chip:hover{border-color:#a19c92;}' +
    '.yqn-chip--active{background:linear-gradient(160deg,#A3E635,#79a916);border-color:transparent;color:#3c4a10;font-weight:800;}' +
    // --- الجدول ---
    // تمرير مرئي بوضوح (سماكة ولون واضحين) حتى يظهر جلياً إن المنطقة قابلة
    // للتمرير حتى بدون تحريك الماوس فوقها - يحل مشكلة عدم ملاحظة إمكانية
    // النزول/الصعود داخل الجدول عند طول قائمة المجموعات
    '.yqn-table-wrapper{overflow:auto;flex:1;padding:0 28px;position:relative;' +
    'scrollbar-width:auto;scrollbar-color:#c7c3b8 #f0efe9;}' +
    '.yqn-table-wrapper::-webkit-scrollbar{width:14px;height:14px;}' +
    '.yqn-table-wrapper::-webkit-scrollbar-track{background:#f0efe9;}' +
    '.yqn-table-wrapper::-webkit-scrollbar-thumb{background:#c7c3b8;border-radius:8px;border:3px solid #f0efe9;}' +
    '.yqn-table-wrapper::-webkit-scrollbar-thumb:hover{background:#a19c92;}' +
    '.yqn-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,.92);display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:5;font-size:14.5px;font-weight:700;color:#1c1c1a;}' +
    '.yqn-loading-overlay--visible{display:flex;}' +
    '.yqn-spinner-lg{width:32px;height:32px;border:3px solid #A3E635;border-left-color:transparent;' +
    'border-radius:50%;animation:yqn-spin .8s linear infinite;}' +
    '.yqn-table{width:100%;border-collapse:collapse;font-size:15px;min-width:760px;}' +
    '.yqn-table th,.yqn-table td{padding:12px 16px;text-align:center;border-bottom:1px solid #e9e7df;white-space:nowrap;}' +
    '.yqn-table thead th{position:sticky;top:0;background:#fafaf6;cursor:pointer;user-select:none;z-index:3;' +
    'font-weight:800;font-size:12px;color:#a19c92;text-transform:uppercase;letter-spacing:.02em;}' +
    // تثبيت أول ٣ أعمدة (المجموعة/السيارات/الحجوزات) عند التمرير الأفقي حتى تبقى هوية الصف ظاهرة دائماً
    '.yqn-table th:nth-child(1),.yqn-table td:nth-child(1){position:sticky;inset-inline-start:0;width:120px;min-width:120px;}' +
    '.yqn-table th:nth-child(2),.yqn-table td:nth-child(2){position:sticky;inset-inline-start:120px;width:96px;min-width:96px;}' +
    '.yqn-table th:nth-child(3),.yqn-table td:nth-child(3){position:sticky;inset-inline-start:216px;width:96px;min-width:96px;' +
    'box-shadow:2px 0 0 rgba(0,0,0,.06);}' +
    '.yqn-table th:nth-child(-n+3){z-index:4;}' +
    '.yqn-table td:nth-child(-n+3){z-index:2;background-color:inherit;}' +
    // فاصل بصري بين مجموعات الأعمدة (أعمدة الأيام) وأعمدة النتيجة (نسبة الإشغال/الفرق)
    '.yqn-col-divider{border-inline-start:2px solid #e9e7df;}' +
    '.yqn-table tbody tr{background-color:#fff;}' +
    '.yqn-table tbody tr:nth-child(even){background-color:#fafaf6;}' +
    '.yqn-table tbody tr:hover{background-color:#f1f0ea;}' +
    '.yqn-group-cell{font-weight:800;font-size:16px;}' +
    // --- صف الإجماليات كشريط داكن مستقل بصرياً بدل صف جدول عادي ---
    '.yqn-totals-row{font-weight:800;position:sticky;bottom:0;z-index:2;}' +
    '.yqn-totals-row td{background-color:#1c1c1a !important;color:#fff;border-bottom:0;border-top:2px solid #1c1c1a;}' +
    '.yqn-totals-row td:first-child{border-radius:0 0 0 12px;}' +
    '.yqn-totals-row .yqn-bar-text{color:#fff !important;}' +
    '.yqn-totals-row .yqn-bar-wrapper{background:rgba(255,255,255,.18);}' +
    '.yqn-totals-row .yqn-diff-positive{color:#86efac;}' +
    '.yqn-totals-row .yqn-diff-negative{color:#fca5a5;}' +
    '.yqn-totals-row .yqn-diff-zero{color:#fcd34d;}' +
    '.yqn-empty{padding:32px !important;opacity:.6;font-size:15px;}' +
    '.yqn-vehicles-cell{padding:4px 8px !important;}' +
    '.yqn-vehicle-input{width:56px;padding:6px 4px;border:1.5px solid #e9e7df;border-radius:8px;text-align:center;' +
    'font:inherit;font-weight:800;color:inherit;background:#fbfbf9;}' +
    '.yqn-vehicle-input:focus{outline:2px solid #79a916;border-color:#79a916;}' +
    '.yqn-vehicles-total{font-weight:bold;font-size:16px;line-height:1.3;}' +
    '.yqn-yard-edit{display:flex;align-items:center;justify-content:center;gap:3px;margin-top:3px;}' +
    '.yqn-yard-edit .yqn-vehicle-input{width:40px;padding:3px 2px;font-size:13px;}' +
    '.yqn-yard-label{font-size:11px;opacity:.55;white-space:nowrap;}' +
    '.yqn-return-sub{font-size:11.5px;color:#16a34a;font-weight:bold;margin-top:2px;line-height:1.2;}' +
    // --- شريط الإشغال: خط رفيع + النسبة كنص ملوّن خارج الشريط (مو فوقه) ---
    '.yqn-occ-row{display:flex;align-items:center;gap:9px;min-width:130px;}' +
    '.yqn-bar-wrapper{position:relative;flex:1;height:8px;border-radius:6px;background:#efeee7;overflow:hidden;min-width:60px;}' +
    '.yqn-bar-fill{position:absolute;inset-inline-start:0;top:0;bottom:0;border-radius:6px;transition:width .2s;}' +
    '.yqn-occ-good .yqn-bar-fill{background:#22c55e;}' +
    '.yqn-occ-warning .yqn-bar-fill{background:#eab308;}' +
    '.yqn-occ-critical .yqn-bar-fill{background:#ef4444;}' +
    '.yqn-bar-text{font-size:13.5px;font-weight:800;white-space:nowrap;flex-shrink:0;}' +
    '.yqn-bar-text.yqn-occ-good{color:#16a34a;}' +
    '.yqn-bar-text.yqn-occ-warning{color:#b45309;}' +
    '.yqn-bar-text.yqn-occ-critical{color:#dc2626;}' +
    '.yqn-diff-cell{font-weight:bold;font-size:17px;}' +
    '.yqn-diff-positive{color:#16a34a;}' +
    '.yqn-diff-negative{color:#dc2626;}' +
    '.yqn-diff-zero{color:#b45309;}' +
    '.yqn-status{padding:12px 28px;font-size:13.5px;font-weight:700;min-height:20px;opacity:.9;display:flex;align-items:center;gap:8px;}' +
    '.yqn-status--loading{color:#2563eb;}' +
    '.yqn-status--success{color:#16a34a;}' +
    '.yqn-status--error{color:#dc2626;}' +
    '.yqn-spinner{width:14px;height:14px;border:2px solid currentColor;border-left-color:transparent;' +
    'border-radius:50%;display:inline-block;flex:none;animation:yqn-spin .7s linear infinite;}' +
    '@keyframes yqn-spin{to{transform:rotate(360deg);}}' +
    '@media (max-width:640px){.yqn-toolbar,.yqn-filters{flex-direction:column;align-items:flex-start;}' +
    '.yqn-filter-divider{display:none;}' +
    '.yqn-actions{width:100%;}.yqn-actions button{flex:1;}' +
    '.yqn-header h2{font-size:18px;}.yqn-modal{height:96vh;max-height:96vh;}}';

  // ==========================================================
  // التسجيل في نظام الأدوات (Core) - بدون أي تعديل عليه
  // ==========================================================
  HOST_WINDOW.YAQEEN_TOOLS.add({
    id: 'booking-report',
    name: '📊 تقرير الحجوزات القادمة',
    run: function () {
      openModal();
    },
  });
})();

// ============================================================
// المصدر: source/yaqeen-vip-booking.user.js
// ============================================================

(function () {

    'use strict';

    // نستخدم unsafeWindow (إن وُجد) لنفس سبب باقي الأدوات - GM_xmlhttpRequest
    // يشغّل السكربت بوضع sandbox معزول عن window الحقيقية لصفحة يقين
    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    // ==========================================================
    // نفس إعدادات موقع vip-reservations (js/config.js بذاك الريبو) - أي
    // تغيير هناك (خصوصاً SUPABASE_ANON_KEY لو تغيّر يوماً) لازم ينعكس هنا يدوياً
    // ==========================================================
    const SUPABASE_URL = 'https://ycguqfilerlkrukiykiy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ3VxZmlsZXJsa3J1a2l5a2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTY0MTMsImV4cCI6MjA5NjQ3MjQxM30.mcA2Bak3OFZSVnz00vAjY68UUaFOh_fmD-b5aCwfyF4';

    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        defaultTarget: '120363021290047142@g.us', // قروب VIP - نفس الافتراضي بالموقع
    };

    const GROUP_LIST = ['A', 'B', 'C', 'D', 'E', 'G', 'F-i', 'GA', 'GB', 'GC', 'IDC-A', 'TA', 'XB', 'XA', 'XC', 'GXI'];
    const DISC_LIST = ['10%', '15%', '20%', '25%', '30%', '35%', '40%', '45%', '50%'];
    const INS_LIST = ['عادي', 'شامل'];
    const MGR_LIST = ['انمار عطية', 'احمد هجرس', 'يحيى هتاني', 'عبدالله الغامدي', 'حياة الرايقي'];

    // نفس قالب الرسالة الافتراضي بالموقع (DEFAULT_WA_TEMPLATE بـjs/config.js) -
    // لو المستخدم غيّر القالب من إعدادات الموقع، هذي النسخة هنا ما تتحدّث تلقائياً
    const WA_TEMPLATE =
        '*📋 حجز VIP*\n' +
        '───────────────\n' +
        '*الاسم:* {name}\n' +
        '*رقم الهوية:* {idNum}\n' +
        '*رقم الجوال:* {phone}\n' +
        '*رقم الحجز:* {bookNum}\n' +
        '*رقم الاتفاقية:* {agreementNum}\n' +
        '───────────────\n' +
        '*السيارة:* {car}\n' +
        '*رقم اللوحة:* {plate}\n' +
        '*الفئة:* {grp}  •  *الأبگريد:* {upg}\n' +
        '───────────────\n' +
        '*الاستلام:* {date}  •  *الوقت المتبقي:* {timeLeft}\n' +
        '*المدة:* {days} أيام  •  *التأمين:* {ins}  •  *الخصم:* {disc}\n' +
        '───────────────\n' +
        '*الحالة:* {status}\n' +
        '───────────────\n' +
        '*📝 ملاحظات:* {notes}';

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "vip-booking-add",
            name: "⭐ إضافة حجز VIP",
            run() {
                runVipBookingTool();
            }
        });
    }

    // ==========================================================
    // اتصال بـSupabase (REST مباشر - نفس ما يسويه موقع vip-reservations من المتصفح)
    // ==========================================================

    function supabaseRequest(method, path, body) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: SUPABASE_URL + path,
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                data: body ? JSON.stringify(body) : undefined,
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response.responseText);
                    } else {
                        console.error('[إضافة حجز VIP] فشل طلب Supabase:', response.status, response.responseText);
                        reject(new Error('فشل الاتصال بقاعدة بيانات VIP (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بقاعدة بيانات VIP')),
            });
        });
    }

    /** نفس منطق nextId() بموقع vip-reservations (js/utils.js) - يحسب رقم الحجز التالي بالتسلسل */
    async function computeNextId() {
        const text = await supabaseRequest('GET', '/rest/v1/reservations?select=id', null);
        let rows = [];
        try { rows = JSON.parse(text) || []; } catch (err) { rows = []; }
        const nums = rows.map(r => {
            const m = (r.id || '').match(/^VIP-(\d+)$/);
            return m ? +m[1] : 0;
        });
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        return 'VIP-' + String(next).padStart(3, '0');
    }

    function insertReservation(record) {
        return supabaseRequest('POST', '/rest/v1/reservations', [record]);
    }

    function sendToBot(message, target) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: WHATSAPP_CONFIG.apiUrl,
                headers: {
                    Authorization: (HOST_WINDOW.YAQEEN_TOOLS.sessionToken || WHATSAPP_CONFIG.apiKey),
                    'Content-Type': 'application/json',
                },
                data: JSON.stringify({ message: message, target: target, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main' }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve();
                    } else {
                        reject(new Error('فشل إرسال الواتساب (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    // ==========================================================
    // بناء رسالة الواتساب - نفس منطق applyTemplate() بـjs/whatsapp.js
    // بموقع vip-reservations (يشيل السطور/الأقسام الفاضية تلقائياً)
    // ==========================================================

    function fmtDateAr(v) {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function timeLeftText(v) {
        if (!v) return '';
        const diff = new Date(v) - Date.now();
        if (isNaN(diff) || diff <= 0) return '';
        const totalH = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        if (totalH === 0) return mins + ' دقيقة';
        if (totalH < 24) return mins > 0 ? totalH + ' ساعة ' + mins + ' د' : totalH + ' ساعة';
        const days = Math.floor(totalH / 24), remH = totalH % 24;
        return remH > 0 ? days + ' يوم و ' + remH + ' ساعة' : days + ' يوم';
    }

    function buildWaMessage(r) {
        const vals = {
            name: r.name || '', idNum: r.id_num || '', phone: r.phone || '',
            bookNum: r.book_num || '', agreementNum: r.agreement_num || '',
            car: r.car || '', plate: r.plate || '', grp: r.grp || '', upg: r.upg || '',
            disc: r.disc || '', ins: r.ins || '', days: r.days || '',
            date: fmtDateAr(r.date), timeLeft: timeLeftText(r.date),
            status: 'حجز جديد', notes: r.notes || '',
        };

        const SEP = '───────────────';

        function cleanLine(line) {
            if (!line.includes('  •  ')) {
                const keys = [...line.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
                if (!keys.length) return line;
                return keys.some(k => vals[k]) ? line : null;
            }
            const kept = line.split('  •  ').filter(seg => {
                const keys = [...seg.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
                return !keys.length || keys.some(k => vals[k]);
            });
            return kept.length ? kept.join('  •  ') : null;
        }

        const sections = WA_TEMPLATE.split(SEP);
        const built = [];
        for (let i = 0; i < sections.length; i++) {
            const cleanedLines = sections[i].split('\n').map(cleanLine).filter(l => l !== null);
            const hasContent = cleanedLines.some(l => l.trim() !== '');
            if (i === 0) built.push(cleanedLines.join('\n'));
            else if (hasContent) built.push(SEP, cleanedLines.join('\n'));
        }

        let msg = built.join('');
        Object.keys(vals).forEach(k => { msg = msg.replace(new RegExp('\\{' + k + '\\}', 'g'), vals[k]); });
        return msg.trim();
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;max-height:90vh;overflow-y:auto;box-sizing:border-box;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:16px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
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
        '.vip-field-wrap{text-align:right;margin-bottom:16px;}' +
        '.vip-field-wrap label{display:block;font-size:13px;font-weight:700;color:#767068;margin-bottom:6px;}' +
        '.vip-field-wrap select,.vip-field-wrap input,.vip-field-wrap textarea{width:100%;padding:11px;' +
        'border:1.5px solid #cec7b4;border-radius:10px;font-size:14.5px;box-sizing:border-box;font-family:inherit;' +
        'background:#fbfbf9;color:#1c1c1a;}' +
        '.vip-field-wrap select:focus,.vip-field-wrap input:focus,.vip-field-wrap textarea:focus{' +
        'outline:2px solid #a8cf5a;border-color:#79a916;}' +
        '.vip-field-wrap textarea{resize:vertical;}' +
        '.vip-form-actions{display:flex;gap:8px;}' +
        '.vip-form-actions button{flex:1;padding:12px;border:0;border-radius:12px;cursor:pointer;' +
        'font-size:14px;font-weight:800;font-family:inherit;background:#f1f0ea;color:#1c1c1a;}' +
        '.vip-form-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
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
        if (document.getElementById('yq-shared-styles-vip-booking')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-vip-booking';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="vip-booking-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function closeBox() {
        document.getElementById('vip-booking-box')?.remove();
    }

    function showMessage(text, type) {
        closeBox();
        showToast(text, type || 'error');
    }

    function showLoading(text) {
        closeBox();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function selectHtml(id, label, options, selected) {
        const opts = ['<option value="">— اختر —</option>'].concat(
            options.map(o => '<option value="' + escapeHtml(o) + '"' + (o === selected ? ' selected' : '') + '>' + escapeHtml(o) + '</option>')
        ).join('');
        return (
            '<div class="vip-field-wrap">' +
            '<label>' + label + '</label>' +
            '<select id="' + id + '">' + opts + '</select>' +
            '</div>'
        );
    }

    function textHtml(id, label, type, required) {
        return (
            '<div class="vip-field-wrap">' +
            '<label>' + label + '</label>' +
            '<input id="' + id + '" type="' + type + '"' + (required ? ' required' : '') + ' />' +
            '</div>'
        );
    }

    function showForm() {
        closeBox();
        injectYqStyles();

        const grid2 = 'display:grid;grid-template-columns:1fr 1fr;gap:0 14px;';

        const html =
            '<h3 style="margin-bottom:14px;">⭐ إضافة حجز VIP</h3>' +
            '<div style="' + grid2 + '">' +
            textHtml('vip-f-name', 'اسم العميل *', 'text', true) +
            textHtml('vip-f-id_num', 'رقم الهوية', 'text', false) +
            textHtml('vip-f-phone', 'الجوال', 'text', false) +
            textHtml('vip-f-book_num', 'رقم الحجز', 'text', false) +
            textHtml('vip-f-agreement_num', 'رقم الاتفاقية', 'text', false) +
            textHtml('vip-f-car', 'السيارة', 'text', false) +
            textHtml('vip-f-plate', 'رقم اللوحة', 'text', false) +
            selectHtml('vip-f-grp', 'الفئة', GROUP_LIST, '') +
            selectHtml('vip-f-upg', 'الأبگريد', GROUP_LIST, '') +
            selectHtml('vip-f-disc', 'الخصم', DISC_LIST, '') +
            selectHtml('vip-f-ins', 'التأمين', INS_LIST, 'عادي') +
            textHtml('vip-f-days', 'عدد الأيام', 'number', false) +
            textHtml('vip-f-date', 'تاريخ الاستلام *', 'datetime-local', true) +
            selectHtml('vip-f-mgr', 'المدير', MGR_LIST, '') +
            '</div>' +
            '<div class="vip-field-wrap">' +
            '<label>ملاحظات</label>' +
            '<textarea id="vip-f-notes" rows="2"></textarea>' +
            '</div>' +
            '<div id="vip-form-err" style="color:#dc2626;font-size:13.5px;font-weight:bold;margin-bottom:10px;display:none;"></div>' +
            '<div class="vip-form-actions">' +
            '<button id="vip-form-cancel">إلغاء</button>' +
            '<button id="vip-form-save">💾 حفظ فقط</button>' +
            '<button id="vip-form-save-send" class="yq-primary">📩 حفظ وإرسال للقروب</button>' +
            '</div>';

        document.body.insertAdjacentHTML('beforeend', overlayShell(html, 540));

        document.getElementById('vip-form-cancel').onclick = closeBox;
        document.getElementById('vip-form-save').onclick = () => handleSave(false);
        document.getElementById('vip-form-save-send').onclick = () => handleSave(true);
    }

    function readFormValues() {
        const val = id => (document.getElementById(id).value || '').trim();
        return {
            name: val('vip-f-name'),
            id_num: val('vip-f-id_num'),
            phone: val('vip-f-phone'),
            book_num: val('vip-f-book_num'),
            agreement_num: val('vip-f-agreement_num'),
            car: val('vip-f-car'),
            plate: val('vip-f-plate'),
            grp: val('vip-f-grp'),
            upg: val('vip-f-upg'),
            disc: val('vip-f-disc'),
            ins: val('vip-f-ins'),
            days: val('vip-f-days'),
            dateRaw: val('vip-f-date'),
            mgr: val('vip-f-mgr'),
            notes: val('vip-f-notes'),
        };
    }

    function showFormError(text) {
        const el = document.getElementById('vip-form-err');
        if (!el) return;
        el.textContent = text;
        el.style.display = 'block';
    }

    async function handleSave(sendWa) {
        const errEl = document.getElementById('vip-form-err');
        if (errEl) errEl.style.display = 'none';

        const f = readFormValues();

        if (!f.name) {
            showFormError('⚠️ اسم العميل مطلوب');
            return;
        }
        if (!f.dateRaw) {
            showFormError('⚠️ تاريخ الاستلام مطلوب');
            return;
        }
        const dateObj = new Date(f.dateRaw);
        if (isNaN(dateObj.getTime()) || dateObj <= new Date()) {
            showFormError('⚠️ لازم يكون تاريخ الاستلام بالمستقبل');
            return;
        }

        showLoading('جارٍ الحفظ...');

        try {
            const id = await computeNextId();
            const record = {
                id: id,
                name: f.name,
                id_num: f.id_num || null,
                phone: f.phone || null,
                book_num: f.book_num || null,
                agreement_num: f.agreement_num || null,
                car: f.car || null,
                plate: f.plate || null,
                grp: f.grp || null,
                upg: f.upg || null,
                disc: f.disc || null,
                ins: f.ins || null,
                days: f.days ? parseInt(f.days, 10) : null,
                date: dateObj.toISOString(),
                mgr: f.mgr || null,
                status: 'new',
                notes: f.notes || null,
                wa_target: WHATSAPP_CONFIG.defaultTarget,
            };

            await insertReservation(record);

            if (sendWa) {
                try {
                    await sendToBot(buildWaMessage(record), WHATSAPP_CONFIG.defaultTarget);
                } catch (waErr) {
                    showMessage('تم إنشاء الحجز ' + id + ' بنجاح، لكن تعذّر إرسال رسالة الواتساب: ' + waErr.message, 'error');
                    return;
                }
                showMessage('تم إنشاء الحجز ' + id + ' وإرسال الرسالة للقروب بنجاح.', 'success');
                return;
            }

            showMessage('تم إنشاء الحجز ' + id + ' بنجاح.', 'success');

        } catch (err) {
            showMessage('تعذّر حفظ الحجز: ' + err.message);
        }
    }

    async function runVipBookingTool() {
        showForm();
    }

    waitCore();

})();

// ============================================================
// المصدر: source/yaqeen-ai-chat.user.js
// ============================================================

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
            '<div style="max-width:80%;padding:11px 14px;border-radius:14px;font-size:14.5px;font-weight:500;line-height:1.7;white-space:pre-wrap;text-align:right;' +
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
            '<span id="ai-chat-remove-image" style="cursor:pointer;font-size:13.5px;font-weight:700;color:#dc2626;margin-inline-start:8px;">✕ إزالة</span>';
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
            'text-align:center;font-weight:800;font-size:16px;position:relative;cursor:move;user-select:none;">🤖 شات AI' +
            '<span id="ai-chat-close" style="position:absolute;left:16px;top:50%;transform:translateY(-50%);cursor:pointer;font-size:17px;opacity:.75;">✕</span>' +
            '</div>' +
            '<div style="padding:10px 16px 0;font-size:12px;font-weight:600;color:#a19c92;text-align:center;">' +
            'يقرأ الصفحة المفتوحة حالياً - اسأل عنها أو أي سؤال عام يخص التأجير، وممكن ترفقين صورة' +
            '</div>' +
            '<div id="ai-chat-messages" style="height:320px;overflow-y:auto;padding:16px;"></div>' +
            '<div id="ai-chat-typing" style="display:none;padding:0 16px 8px;font-size:13px;font-weight:700;color:#a19c92;text-align:right;">... يكتب</div>' +
            '<div id="ai-chat-preview" style="display:none;align-items:center;padding:0 16px 10px;"></div>' +
            '<div style="display:flex;gap:8px;padding:14px 16px;border-top:1px solid #cec7b4;align-items:center;">' +
            '<button id="ai-chat-send" style="padding:0 18px;height:40px;border:0;border-radius:11px;' +
            'background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;cursor:pointer;font-size:14.5px;font-weight:800;font-family:inherit;">إرسال</button>' +
            '<input id="ai-chat-input" type="text" placeholder="اكتب سؤالك..." style="' +
            'flex:1;padding:10px 13px;border:1.5px solid #cec7b4;border-radius:11px;font-size:14.5px;' +
            'text-align:right;direction:rtl;font-family:inherit;background:#fbfbf9;color:#1c1c1a;box-sizing:border-box;" />' +
            '<button id="ai-chat-attach" title="إرفاق صورة" style="width:40px;height:40px;border:1.5px solid #cec7b4;' +
            'border-radius:11px;background:#fbfbf9;cursor:pointer;font-size:16px;">📎</button>' +
            '<input id="ai-chat-file" type="file" accept="image/*" style="display:none;" />' +
            '</div>';

        // ما فيه أي غلاف كامل الشاشة (لا inset:0 ولا خلفية معتمة) - النافذة
        // نفسها بس عنصر position:fixed بحجمها الطبيعي، فباقي الصفحة (يقين)
        // تفضل قابلة للتفاعل الكامل حواليها وتحتها
        document.body.insertAdjacentHTML('beforeend',
            '<div id="ai-chat-box" style="' +
            'position:fixed;right:30px;bottom:190px;width:360px;background:#fff;border-radius:20px;' +
            'border:1.5px solid #cec7b4;' +
            'overflow:hidden;direction:rtl;font-family:"Tajawal",Arial,Tahoma,sans-serif;box-shadow:0 20px 50px -12px rgba(0,0,0,.35);' +
            'z-index:2147483647;">' + html + '</div>'
        );

        const panel = document.getElementById('ai-chat-box');
        const header = document.getElementById('ai-chat-header');
        makeDraggable(panel, header);

        document.getElementById('ai-chat-close').onclick = closeBox;

        const attachBtn = document.getElementById('ai-chat-attach');
        attachBtn.onmouseenter = () => { attachBtn.style.background = '#f1f0ea'; };
        attachBtn.onmouseleave = () => { attachBtn.style.background = '#fbfbf9'; };
        const sendBtn = document.getElementById('ai-chat-send');
        sendBtn.onmouseenter = () => { sendBtn.style.filter = 'brightness(1.06)'; };
        sendBtn.onmouseleave = () => { sendBtn.style.filter = 'none'; };

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

// ============================================================
// المصدر: source/yaqeen-shift-report.user.js
// ============================================================

(function () {

    'use strict';

    const HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const WHATSAPP_CONFIG = {
        apiUrl: 'https://api.yaqeen-vip.space/send',
        apiKey: 'Firas_2026_SuperSecret_Key',
        target: '120363021290047142@g.us',
    };

    const AIRPORT_BRANCH_ID = 29;
    const YARD_BRANCH_ID = 53;

    // حدود الشفتات الثلاث - نفس تقسيم أداة توقع أوقات الذروة
    const SHIFTS = [
        { key: 'morning', label: 'صباحي (8ص - 4م)', labelEn: 'Morning shift', startHour: 8, endHour: 16 },
        { key: 'evening', label: 'مسائي (4م - 12ص)', labelEn: 'Evening shift', startHour: 16, endHour: 24 },
        { key: 'night', label: 'ليلي (12ص - 8ص)', labelEn: 'Night shift', startHour: 0, endHour: 8 },
    ];

    function currentShiftKey() {
        const hour = new Date().getHours();
        return (SHIFTS.find(s => hour >= s.startHour && hour < s.endHour) || SHIFTS[0]).key;
    }

    function shiftByKey(key) {
        return SHIFTS.find(s => s.key === key) || SHIFTS[0];
    }

    function waitCore() {
        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }
        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "shift-report",
            name: "📋 تقرير الشفت",
            run() {
                showShiftPrompt();
            }
        });
    }

    // ==========================================================
    // أدوات عامة
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

    function openHiddenFrame(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1100px;height:750px;border:0;opacity:0;pointer-events:none;';
        document.body.appendChild(iframe);
        return iframe;
    }

    function waitFor(iframe, checkFn, timeoutMs) {
        timeoutMs = timeoutMs || 20000;
        return new Promise(resolve => {
            const start = Date.now();
            (function check() {
                if (!iframe.isConnected) { resolve(null); return; }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) {
                    resolve(null);
                    return;
                }
                if (!doc || doc.readyState !== 'complete') {
                    if (Date.now() - start > timeoutMs) { resolve(doc || null); return; }
                    setTimeout(check, 300);
                    return;
                }
                let result = null;
                try { result = checkFn(doc); } catch (err) { /* تجاهل */ }
                if (result || Date.now() - start > timeoutMs) { resolve(result ? doc : (doc || null)); return; }
                setTimeout(check, 300);
            })();
        });
    }

    function findColumnIndex(headerCells, labelVariants) {
        const normalizedVariants = labelVariants.map(normalizeArabic);
        for (let i = 0; i < headerCells.length; i++) {
            const headerText = normalizeArabic(headerCells[i].textContent);
            if (normalizedVariants.some(v => headerText.indexOf(v) !== -1)) return i;
        }
        return -1;
    }

    function findDataTable(doc, identifyingVariants) {
        const tables = Array.from(doc.querySelectorAll('table'));
        return tables.find(t => {
            const headerCells = Array.from(t.querySelectorAll('thead tr th, thead tr td'));
            return findColumnIndex(headerCells, identifyingVariants) !== -1;
        }) || null;
    }

    // ==========================================================
    // ترقيم الصفحات (نفس منطق باقي الأدوات)
    // ==========================================================

    const NEXT_PAGE_SELECTORS = [
        '[aria-label="Next page"]',
        '[aria-label="التالي"]',
        '[aria-label="الصفحة التالية"]',
        '.MuiTablePagination-actions button:last-of-type',
        '.MuiPagination-ul li:last-child button',
        '.ant-pagination-next',
        '.pagination .page-item:last-child .page-link',
        'button[data-testid*="next" i]',
        'a[data-testid*="next" i]',
    ];
    const NEXT_PAGE_TEXT_PATTERN = /^(التالي|التالية|Next|تحميل المزيد|عرض المزيد|Load more|Show more|›|»|>)$/i;

    function findNextPageControl(doc) {
        for (const selector of NEXT_PAGE_SELECTORS) {
            const el = doc.querySelector(selector);
            if (el) return el;
        }
        const candidates = Array.from(doc.querySelectorAll('button, a, [role="button"]'));
        return candidates.find(el => NEXT_PAGE_TEXT_PATTERN.test((el.textContent || "").trim())) || null;
    }

    function isControlDisabled(el) {
        if (!el) return true;
        if (el.disabled) return true;
        if (el.getAttribute("aria-disabled") === "true") return true;
        const className = (el.className || "").toString().toLowerCase();
        if (className.indexOf("disabled") !== -1) return true;
        if (el.closest && el.closest('[aria-disabled="true"]')) return true;
        return false;
    }

    function collectAllPages(iframe, doc, readRowsFn) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                    }
                });
            }

            function readRowsSafely() {
                try { return readRowsFn(doc); } catch (err) { return []; }
            }

            function waitForPageChange(beforeSignature) {
                const waitStart = Date.now();
                (function poll() {
                    if (!iframe.isConnected) { resolve(allRows); return; }
                    const currentRows = readRowsSafely();
                    const currentLastSignature = currentRows.length ? currentRows[currentRows.length - 1].__signature : null;
                    if (currentLastSignature !== beforeSignature || Date.now() - waitStart > 6000) { step(); return; }
                    setTimeout(poll, 250);
                })();
            }

            function step() {
                if (!iframe.isConnected || pageIndex >= maxIterations) { resolve(allRows); return; }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) { resolve(allRows); return; }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    resolve(allRows);
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            step();
        });
    }

    // ==========================================================
    // تحليل وقت الاستلام/التسليم النصي ("اليوم - 08:30"، "غداً - 14:00"، اسم يوم - وقت)
    // ==========================================================

    function buildDayChips() {
        const WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        const chips = ['اليوم', 'غداً'];
        let cursor = (new Date().getDay() + 2) % 7;
        while (chips.length < 9) {
            chips.push(WEEKDAY_NAMES[cursor]);
            cursor = (cursor + 1) % 7;
        }
        return chips;
    }
    const DAY_CHIPS = buildDayChips();

    function extractDayLabel(timeText) {
        if (!timeText) return null;
        const dayPart = timeText.split('-')[0].trim();
        const normalizedDayPart = normalizeArabic(dayPart);
        return DAY_CHIPS.find(chip => normalizeArabic(chip) === normalizedDayPart) || dayPart;
    }

    function extractHour(timeText) {
        if (!timeText) return null;
        const parts = timeText.split('-');
        const timePart = (parts.length > 1 ? parts[1] : parts[0]).trim();
        const m = timePart.match(/(\d{1,2}):(\d{2})/);
        return m ? parseInt(m[1], 10) : null;
    }

    function shiftForHour(hour) {
        if (hour === null || isNaN(hour)) return null;
        return (SHIFTS.find(s => hour >= s.startHour && hour < s.endHour) || {}).key || null;
    }

    // ==========================================================
    // جلب الأرقام الأربعة من الموقع
    // ==========================================================

    /** صفحة "مستأجر" فيها عنوان h2 بصيغة "مستأجر (401)" - نستخرج الرقم من العنوان مباشرة بدون عد صفوف */
    async function fetchRentedTotal() {
        const url = 'https://yaqeen.lumirental.com/rental/vehicles/rented';
        const frame = openHiddenFrame(url);
        try {
            const doc = await waitFor(frame, d => {
                const h2 = Array.from(d.querySelectorAll('h2')).find(x => x.textContent.indexOf('مستأجر') !== -1);
                return h2 || null;
            }, 20000);
            if (!doc) return null;
            const h2 = Array.from(doc.querySelectorAll('h2')).find(x => x.textContent.indexOf('مستأجر') !== -1);
            if (!h2) return null;
            const match = h2.textContent.match(/\((\d+)\)/);
            return match ? parseInt(match[1], 10) : null;
        } catch (err) {
            return null;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function readReadyRows(doc) {
        const table = findDataTable(doc, ['المجموعة']);
        if (!table) return [];
        const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
        return bodyRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (!cells.length) return null;
            return { __signature: cells.map(c => c.textContent.trim()).join('|') };
        }).filter(Boolean);
    }

    /** إجمالي السيارات الجاهزة بموقع معيّن (مطار/ساحة) - نفس مصدر أداة "السيارات المتوفرة" */
    async function fetchReadyTotal(branchId) {
        const url = 'https://yaqeen.lumirental.com/rental/vehicles/ready?currentLocationIds=' + branchId + '&pageSize=500';
        const frame = openHiddenFrame(url);
        try {
            const doc = await waitFor(frame, d => (findDataTable(d, ['المجموعة']) ? d : null), 20000);
            if (!doc) return null;
            const rows = await collectAllPages(frame, doc, d => readReadyRows(d));
            return rows.length;
        } catch (err) {
            return null;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    function readTimeColumnRows(doc, identifyingVariants, timeColumnVariants) {
        const table = findDataTable(doc, identifyingVariants);
        if (!table) return [];
        const headerCells = Array.from(table.querySelectorAll('thead tr th, thead tr td'));
        const timeIdx = findColumnIndex(headerCells, timeColumnVariants);
        const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
        return bodyRows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            if (!cells.length) return null;
            const timeText = timeIdx >= 0 && cells[timeIdx] ? cells[timeIdx].textContent.trim() : '';
            return { timeText, __signature: cells.map(c => c.textContent.trim()).join('|') };
        }).filter(Boolean);
    }

    /** يعدّ صفوف قائمة معيّنة (مفتوحة أو مغلقة) الواقعة اليوم بساعات الشفت المختار حسب عمود الوقت المطلوب */
    async function fetchShiftCount(url, identifyingVariants, timeColumnVariants, shiftKey) {
        const frame = openHiddenFrame(url);
        try {
            const doc = await waitFor(frame, d => (findDataTable(d, identifyingVariants) ? d : null), 20000);
            if (!doc) return null;
            const rows = await collectAllPages(frame, doc, d => readTimeColumnRows(d, identifyingVariants, timeColumnVariants));
            return rows.filter(r => extractDayLabel(r.timeText) === 'اليوم' && shiftForHour(extractHour(r.timeText)) === shiftKey).length;
        } catch (err) {
            return null;
        } finally {
            try { frame.remove(); } catch (err) { /* تجاهل */ }
        }
    }

    async function fetchAllNumbers(shiftKey) {
        const openedUrl = 'https://yaqeen.lumirental.com/rental/branches/' + AIRPORT_BRANCH_ID + '/bookings?pickupDateRangeStart=TODAY&status=ONGOING&pageSize=500';
        const closedUrl = 'https://yaqeen.lumirental.com/rental/branches/' + AIRPORT_BRANCH_ID + '/bookings/completed?dropOffDateRangeStart=TODAY&pageSize=500';

        const [opened, closed, rented, ready138, ready162] = await Promise.all([
            fetchShiftCount(openedUrl, ['وقت الاستلام'], ['وقت الاستلام'], shiftKey),
            fetchShiftCount(closedUrl, ['وقت التسليم'], ['وقت التسليم'], shiftKey),
            fetchRentedTotal(),
            fetchReadyTotal(AIRPORT_BRANCH_ID),
            fetchReadyTotal(YARD_BRANCH_ID),
        ]);

        return { opened, closed, rented, ready138, ready162 };
    }

    // ==========================================================
    // إرسال واتساب (نص)
    // ==========================================================

    function sendWhatsAppText(message) {
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
                data: JSON.stringify({ target: WHATSAPP_CONFIG.target, sessionId: HOST_WINDOW.YAQEEN_TOOLS.activeSessionId || 'main', type: 'text', message: message }),
                onload: response => {
                    if (response.status >= 200 && response.status < 300) resolve();
                    else {
                        console.error('[تقرير الشفت] فشل الإرسال:', response.status, response.responseText);
                        reject(new Error('فشل الإرسال (رمز الحالة: ' + response.status + ')'));
                    }
                },
                onerror: () => reject(new Error('تعذّر الاتصال بخادم بوت واتساب')),
            });
        });
    }

    // ==========================================================
    // واجهة العرض
    // ==========================================================

    const YQ_CSS =
        '.yq-overlay{position:fixed;inset:0;z-index:999999999;background:rgba(20,18,12,.42);' +
        'display:flex;align-items:center;justify-content:center;padding:16px;font-family:"Tajawal",Arial,Tahoma,sans-serif;}' +
        '.yq-card{width:100%;background:#fff;border-radius:22px;padding:28px 26px;text-align:center;' +
        'direction:rtl;box-shadow:0 30px 60px -20px rgba(0,0,0,.35);color:#1c1c1a;}' +
        '.yq-card h3{margin:0 0 6px;font-size:17px;font-weight:800;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
        '.yq-field{width:100%;padding:13px;border:1.5px solid #cec7b4;border-radius:12px;font-size:16px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
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
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;' +
        'background:linear-gradient(100deg,#A3E635,#b8ec52);color:#3c4a10;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-report-actions{display:flex;gap:9px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;border-top:1px solid #cec7b4;}' +
        '.yq-report-actions button{flex:1;min-width:120px;padding:11px;border:0;border-radius:11px;' +
        'font-size:13.5px;font-weight:800;font-family:inherit;cursor:pointer;background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-actions button.yq-primary{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
        '.yq-report-actions button.yq-send{background:#16a34a;color:#fff;}' +
        '.shift-section-label{font-weight:800;font-size:14px;margin-bottom:8px;color:#1c1c1a;}' +
        '.shift-mini-field{width:100%;padding:11px;border:1.5px solid #cec7b4;border-radius:10px;font-size:15px;' +
        'text-align:center;box-sizing:border-box;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
        '.shift-mini-field:focus{outline:2px solid #a8cf5a;border-color:#79a916;}' +
        '.shift-add-emp-btn{width:100%;padding:10px;margin-top:8px;border:0;border-radius:10px;cursor:pointer;' +
        'background:#f1f0ea;color:#767068;font-size:13px;font-weight:700;font-family:inherit;transition:background .15s;}' +
        '.shift-emp-name,.shift-emp-count{padding:9px;border:1.5px solid #cec7b4;border-radius:9px;font-size:14px;' +
        'text-align:center;font-family:inherit;background:#fbfbf9;color:#1c1c1a;}' +
        '.shift-emp-name{text-align:right;flex:2;}' +
        '.shift-emp-count{flex:1;}' +
        '.shift-emp-remove{padding:0 12px;border:0;border-radius:9px;background:#fdecec;color:#dc2626;cursor:pointer;font-family:inherit;}' +
        '.shift-preview{width:100%;height:190px;box-sizing:border-box;padding:14px;border:1.5px solid #cec7b4;' +
        'border-radius:12px;font-size:14px;text-align:left;resize:vertical;white-space:pre;background:#fbfbf9;color:#1c1c1a;font-family:inherit;}' +
        '.shift-pick-btn{width:100%;padding:13px;margin-top:8px;border:0;border-radius:13px;cursor:pointer;' +
        'font-size:15px;font-weight:800;font-family:inherit;background:#f1f0ea;color:#1c1c1a;}' +
        '.shift-pick-btn.current{background:linear-gradient(160deg,#A3E635,#79a916);color:#3c4a10;}' +
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
        if (document.getElementById('yq-shared-styles-shift-report')) return;
        const style = document.createElement('style');
        style.id = 'yq-shared-styles-shift-report';
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

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="shift-report-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showProgress(text) {
        document.getElementById('shift-report-box')?.remove();
        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<div class="yq-spinner"></div><div style="font-size:14.5px;font-weight:700;">' + text + '</div>',
            300
        ));
    }

    function showMessage(text, type) {
        document.getElementById('shift-report-box')?.remove();
        showToast(text, type || 'error');
    }

    function showShiftPrompt() {
        document.getElementById('shift-report-box')?.remove();
        const current = currentShiftKey();

        const buttonsHtml = SHIFTS.map(s => (
            '<button class="shift-report-pick shift-pick-btn' + (s.key === current ? ' current' : '') + '" data-shift="' + s.key + '">' +
            s.label + (s.key === current ? ' (الحالي)' : '') + '</button>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>📋 تقرير الشفت</h3>' +
            '<div class="yq-desc">اختر الشفت اللي تبي تسحب أرقامه:</div>' +
            buttonsHtml +
            '<button id="shift-report-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            320
        ));

        document.querySelectorAll('.shift-report-pick').forEach(btn => {
            btn.onclick = () => runFetchAndShowForm(btn.getAttribute('data-shift'));
        });
        document.getElementById('shift-report-cancel').onclick = () => {
            document.getElementById('shift-report-box')?.remove();
        };
    }

    async function runFetchAndShowForm(shiftKey) {
        showProgress('جارٍ سحب الأرقام من الموقع (Opened / Closed / Rented / Ready)...');
        try {
            const numbers = await fetchAllNumbers(shiftKey);
            showForm(shiftKey, numbers);
        } catch (err) {
            showMessage('تعذّر سحب الأرقام: ' + err.message);
        }
    }

    function empRowHtml(section) {
        return (
            '<div class="shift-emp-row" data-section="' + section + '" style="display:flex;gap:8px;margin-top:8px;">' +
            '<input type="text" class="shift-emp-name" placeholder="اسم الموظف" />' +
            '<input type="number" class="shift-emp-count" placeholder="العدد" />' +
            '<button class="shift-emp-remove">✕</button>' +
            '</div>'
        );
    }

    function buildMessageFromForm(shiftLabelEn) {
        const openedTotal = document.getElementById('shift-report-opened-total').value || '0';
        const closedTotal = document.getElementById('shift-report-closed-total').value || '0';
        const rentedTotal = document.getElementById('shift-report-rented').value || '0';
        const ready138 = document.getElementById('shift-report-ready138').value || '0';
        const ready162 = document.getElementById('shift-report-ready162').value || '0';

        function empLines(section) {
            return Array.from(document.querySelectorAll('.shift-emp-row[data-section="' + section + '"]'))
                .map(row => {
                    const name = row.querySelector('.shift-emp-name').value.trim();
                    const count = row.querySelector('.shift-emp-count').value.trim();
                    if (!name && !count) return null;
                    return name + (count ? ' ' + count : ' ');
                })
                .filter(Boolean);
        }

        const lines = [];
        lines.push(shiftLabelEn);
        lines.push('');
        lines.push('Opened  ' + openedTotal);
        lines.push(...empLines('opened'));
        lines.push('');
        lines.push('Closed ' + closedTotal);
        lines.push(...empLines('closed'));
        lines.push('');
        lines.push('Rented : ' + rentedTotal);
        lines.push('Ready 138 : ' + ready138);
        lines.push('Ready 162 : ' + ready162);
        return lines.join('\n');
    }

    function updatePreview(shiftLabelEn) {
        const preview = document.getElementById('shift-report-preview');
        if (preview) preview.value = buildMessageFromForm(shiftLabelEn);
    }

    function wireLiveInputs(shiftLabelEn) {
        document.querySelectorAll(
            '#shift-report-opened-total, #shift-report-closed-total, #shift-report-rented, ' +
            '#shift-report-ready138, #shift-report-ready162, .shift-emp-name, .shift-emp-count'
        ).forEach(el => {
            el.oninput = () => updatePreview(shiftLabelEn);
        });
        document.querySelectorAll('.shift-emp-remove').forEach(btn => {
            btn.onclick = () => {
                btn.closest('.shift-emp-row').remove();
                updatePreview(shiftLabelEn);
            };
        });
    }

    function addEmpRow(section, shiftLabelEn) {
        const container = document.getElementById('shift-report-' + section + '-employees');
        container.insertAdjacentHTML('beforeend', empRowHtml(section));
        wireLiveInputs(shiftLabelEn);
    }

    function showForm(shiftKey, numbers) {
        document.getElementById('shift-report-box')?.remove();
        injectYqStyles();
        const shift = shiftByKey(shiftKey);

        const html =
            '<div id="shift-report-box" class="yq-overlay">' +
            '<div style="width:min(520px,95vw);max-height:92vh;display:flex;flex-direction:column;' +
            'background:#fff;border-radius:22px;overflow:hidden;direction:rtl;">' +
            '<div class="yq-report-header">' +
            '<div class="yq-report-title">📋 تقرير الشفت - ' + shift.label + '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:24px;text-align:right;">' +

            '<div class="shift-section-label">Opened (إجمالي من الموقع)</div>' +
            '<input id="shift-report-opened-total" type="number" value="' + (numbers.opened ?? '') + '" class="shift-mini-field" />' +
            '<div id="shift-report-opened-employees"></div>' +
            '<button id="shift-report-add-opened" class="shift-add-emp-btn">+ إضافة موظف</button>' +

            '<div class="shift-section-label" style="margin-top:16px;">Closed (إجمالي من الموقع)</div>' +
            '<input id="shift-report-closed-total" type="number" value="' + (numbers.closed ?? '') + '" class="shift-mini-field" />' +
            '<div id="shift-report-closed-employees"></div>' +
            '<button id="shift-report-add-closed" class="shift-add-emp-btn">+ إضافة موظف</button>' +

            '<div style="display:flex;gap:8px;margin-top:16px;">' +
            '<div style="flex:1;">' +
            '<div class="shift-section-label" style="font-size:13.5px;">Rented</div>' +
            '<input id="shift-report-rented" type="number" value="' + (numbers.rented ?? '') + '" class="shift-mini-field" />' +
            '</div>' +
            '<div style="flex:1;">' +
            '<div class="shift-section-label" style="font-size:13.5px;">Ready 138 (مطار)</div>' +
            '<input id="shift-report-ready138" type="number" value="' + (numbers.ready138 ?? '') + '" class="shift-mini-field" />' +
            '</div>' +
            '<div style="flex:1;">' +
            '<div class="shift-section-label" style="font-size:13.5px;">Ready 162 (ساحة)</div>' +
            '<input id="shift-report-ready162" type="number" value="' + (numbers.ready162 ?? '') + '" class="shift-mini-field" />' +
            '</div>' +
            '</div>' +

            '<div class="shift-section-label" style="margin-top:16px;">معاينة الرسالة</div>' +
            '<textarea id="shift-report-preview" readonly dir="ltr" class="shift-preview"></textarea>' +

            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="shift-report-refresh">🔄 تحديث الأرقام</button>' +
            '<button id="shift-report-cancel2">إلغاء</button>' +
            '<button id="shift-report-send" class="yq-send">📩 إرسال للقروب</button>' +
            '</div></div></div>';

        document.body.insertAdjacentHTML('beforeend', html);

        // صف موظف فاضي واحد جاهز بكل قسم كبداية
        addEmpRow('opened', shift.labelEn);
        addEmpRow('closed', shift.labelEn);
        wireLiveInputs(shift.labelEn);
        updatePreview(shift.labelEn);

        document.getElementById('shift-report-add-opened').onclick = () => addEmpRow('opened', shift.labelEn);
        document.getElementById('shift-report-add-closed').onclick = () => addEmpRow('closed', shift.labelEn);

        document.getElementById('shift-report-cancel2').onclick = () => {
            document.getElementById('shift-report-box')?.remove();
        };

        document.getElementById('shift-report-refresh').onclick = () => {
            runFetchAndShowForm(shiftKey);
        };

        document.getElementById('shift-report-send').onclick = async () => {
            const message = buildMessageFromForm(shift.labelEn);
            if (!confirm('سيتم إرسال هذي الرسالة للقروب:\n\n' + message + '\n\nمتابعة؟')) return;
            const btn = document.getElementById('shift-report-send');
            btn.disabled = true;
            btn.textContent = '... جارٍ الإرسال';
            try {
                await sendWhatsAppText(message);
                document.getElementById('shift-report-box')?.remove();
                showMessage('تم إرسال تقرير الشفت للقروب بنجاح', 'success');
            } catch (err) {
                btn.disabled = false;
                btn.textContent = '📩 إرسال للقروب';
                showToast('تعذّر الإرسال: ' + err.message, 'error');
            }
        };
    }

    waitCore();

})();
