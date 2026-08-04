// ==UserScript==
// @name         Yaqeen Tools Core
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0.0
// @description  نظام أدوات يقين
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-core.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-core.user.js
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
        "airport-hours-report",
        "late-payments-report",
        "company-extension-report",
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


    HOST_WINDOW.YAQEEN_TOOLS = {

        tools: [],


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


            // نرتّب نسخة مستقلة عن ترتيب التسجيل حسب TOOL_ORDER - أي أداة
            // غير موجودة بالقائمة تُلحق بالآخر (بترتيب تسجيلها هي بينها)
            const orderedTools = this.tools.slice().sort((a, b) => {
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
