// ==UserScript==
// @name         Yaqeen Tool - جرد الاسطول
// @namespace    https://yaqeen.lumirental.com/
// @version      2.0
// @description  جرد الأسطول - بدون مغادرة الصفحة الحالية
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-fleet-inventory.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-fleet-inventory.user.js
// ==/UserScript==

(function () {

    'use strict';

    var GROUP_COLUMN_HINT = ['المجموعة', 'Group'];
    var lastBranch = null;

    function waitCore() {

        if (!window.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }

        YAQEEN_TOOLS.add({
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

    function chooseBranch() {

        document.getElementById("fleet-box")?.remove();

        let box = document.createElement("div");
        box.id = "fleet-box";

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
        text-align:center">

        <h3>🚗 جرد الأسطول</h3>

        <button id="airport">✈️ المطار</button>
        <button id="yard">🏢 الساحة</button>
        <button id="all">📍 الكل</button>

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
            font-size:16px;
            `;
        });

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
        const html = `
<div id="fleet-box" style="
position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;
z-index:999999999;font-family:Arial;">
<div style="width:300px;background:white;border-radius:16px;padding:30px;text-align:center;direction:rtl;">
${text}
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }

    function showMessage(text) {
        document.getElementById("fleet-box")?.remove();
        const html = `
<div id="fleet-box" style="
position:fixed;inset:0;background:#0008;display:flex;justify-content:center;align-items:center;
z-index:999999999;font-family:Arial;">
<div style="width:300px;background:white;border-radius:16px;padding:25px;text-align:center;direction:rtl;">
<div style="margin-bottom:15px">${text}</div>
<button id="close-fleet-message" style="
padding:10px 18px;border:none;border-radius:8px;background:#A3E635;cursor:pointer;">إغلاق</button>
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
