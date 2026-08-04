// ==UserScript==
// @name         Yaqeen Tool - Available Vehicles
// @namespace    https://yaqeen.lumirental.com/
// @version      2.0
// @description  السيارات المتوفرة حسب القروب - بدون مغادرة الصفحة الحالية
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-available-vehicles.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-available-vehicles.user.js
// ==/UserScript==

(function () {

    'use strict';

    var GROUP_COLUMN_HINT = ['المجموعة'];
    var lastBranch = null;

    function waitCore() {

        if (!window.YAQEEN_TOOLS) {
            setTimeout(waitCore, 300);
            return;
        }

        YAQEEN_TOOLS.add({
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

    function chooseBranch() {

        document.getElementById("available-box")?.remove();

        const box = document.createElement("div");
        box.id = "available-box";

        box.style = `
            position:fixed;
            inset:0;
            background:#0008;
            display:flex;
            align-items:center;
            justify-content:center;
            z-index:999999999;
            font-family:Arial;
        `;

        box.innerHTML = `
        <div style="
            width:300px;
            background:#fff;
            border-radius:16px;
            padding:25px;
            text-align:center;
        ">
            <h3 style="margin-top:0">🚗 السيارات المتوفرة</h3>

            <button id="airport">✈️ المطار</button>
            <button id="yard">🏢 الساحة</button>
            <button id="all">📍 الكل</button>

            <button id="cancel" style="
                margin-top:10px;
                background:#eee;
                color:#333;
            ">إلغاء</button>
        </div>`;

        document.body.appendChild(box);

        box.querySelectorAll("button").forEach(btn => {

            btn.style.cssText += `
                width:100%;
                padding:12px;
                margin-top:8px;
                border:none;
                border-radius:8px;
                cursor:pointer;
                background:#A3E635;
                font-size:15px;
            `;

        });

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

        const html = `
<div id="available-report" style="
position:fixed;
inset:0;
background:#0008;
display:flex;
justify-content:center;
align-items:center;
z-index:999999999;
font-family:Arial;
">
<div style="
width:280px;
background:white;
border-radius:16px;
padding:30px;
text-align:center;
direction:rtl;
">
جارٍ جلب السيارات المتوفرة...
</div>
</div>`;

        document.body.insertAdjacentHTML("beforeend", html);
    }

    function showMessage(text) {
        document.getElementById("available-report")?.remove();

        const html = `
<div id="available-report" style="
position:fixed;
inset:0;
background:#0008;
display:flex;
justify-content:center;
align-items:center;
z-index:999999999;
font-family:Arial;
">
<div style="
width:300px;
background:white;
border-radius:16px;
padding:25px;
text-align:center;
direction:rtl;
">
<div style="margin-bottom:15px">${text}</div>
<button id="close-report" style="
padding:10px 18px;
border:none;
border-radius:8px;
background:#A3E635;
cursor:pointer;
">إغلاق</button>
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

        let html = `
<div id="available-report"
style="
position:fixed;
inset:0;
background:#0008;
display:flex;
justify-content:center;
align-items:center;
z-index:999999999;
font-family:Arial;
padding:24px;
box-sizing:border-box;
">

<div style="
width:380px;
max-height:85vh;
background:white;
border-radius:16px;
overflow:hidden;
direction:rtl;
display:flex;
flex-direction:column;
">

<div style="
background:#A3E635;
padding:18px;
text-align:center;
flex-shrink:0;
">

<div style="font-size:16px">
إجمالي السيارات المتوفرة
</div>

<div style="
font-size:42px;
font-weight:bold;
margin-top:6px;
">
${total}
</div>

</div>

<div style="overflow:auto;flex:1;">
<table style="
width:100%;
border-collapse:collapse;
">

<tr style="background:#f5f5f5">
<th style="padding:10px">القروب</th>
<th>العدد</th>
</tr>
`;

        Object.keys(groups)
            .sort()
            .forEach(group => {

                html += `
<tr>
<td style="
padding:9px;
border-top:1px solid #eee;
text-align:center;
">
${group}
</td>

<td style="
border-top:1px solid #eee;
text-align:center;
font-weight:bold;
">
${groups[group]}
</td>

</tr>`;

            });

        html += `
</table>
</div>

<div style="padding:15px;text-align:center;display:flex;gap:8px;flex-shrink:0;">

<button id="print-report"
style="
flex:1;
padding:10px;
border:none;
border-radius:8px;
background:#eee;
color:#333;
cursor:pointer;
">
🖨️ طباعة
</button>

<button id="refresh-report"
style="
flex:1;
padding:10px;
border:none;
border-radius:8px;
background:#eee;
color:#333;
cursor:pointer;
">
🔄 تحديث
</button>

<button id="close-report"
style="
flex:1;
padding:10px;
border:none;
border-radius:8px;
background:#A3E635;
cursor:pointer;
">
إغلاق
</button>

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
.meta{color:#555;font-size:13px;margin-bottom:16px;}
table{border-collapse:collapse;width:100%;font-size:14px;}
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
