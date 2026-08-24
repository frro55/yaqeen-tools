// ==UserScript==
// @name         Yaqeen Tool - Available Vehicles
// @namespace    https://yaqeen.lumirental.com/
// @version      2.0
// @description  السيارات المتوفرة حسب القروب - بدون مغادرة الصفحة الحالية
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

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
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;position:relative;' +
        'background:#fff;color:#1c1c1a;border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-close{position:absolute;top:20px;left:24px;background:transparent;border:0;font-size:18px;' +
        'cursor:pointer;color:#a19c92;padding:8px;border-radius:9px;line-height:1;transition:background .15s,color .15s;}' +
        '.yq-report-close:hover{background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-big{font-size:40px;font-weight:800;margin-top:4px;color:#16a34a;}' +
        '.yq-report-actions{display:flex;gap:8px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;' +
        'border-top:1.5px solid #cec7b4;align-items:center;}' +
        '.yq-icon-btn{cursor:pointer;border:1.5px solid #cec7b4;background:#fff;color:#1c1c1a;font-family:inherit;' +
        'width:38px;height:38px;border-radius:11px;font-size:16px;line-height:1;transition:background .15s,border-color .15s;' +
        'display:flex;align-items:center;justify-content:center;}' +
        '.yq-icon-btn:hover{background:#f1f0ea;border-color:#a19c92;}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:16px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:13.5px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
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
<button type="button" class="yq-report-close" id="close-report-x" aria-label="إغلاق">✕</button>
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
<button id="print-report" class="yq-icon-btn" title="طباعة">🖨️</button>
<button id="refresh-report" class="yq-icon-btn" title="تحديث">🔄</button>
</div>

</div>
</div>`;

        document.body.insertAdjacentHTML("beforeend", html);

        document.getElementById("close-report-x").onclick = () => {
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
