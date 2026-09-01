// ==UserScript==
// @name         Yaqeen Tool - بحث الأسطول
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  بحث متقدم بالأسطول: أي فروع + أي حالة سيارة، مع رقم الشاسيه - بدون مغادرة الصفحة الحالية
// @author       Firas
// @match        https://yaqeen.lumirental.com/*
// @grant        none
// @run-at       document-end
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

(function () {

    'use strict';

    var GROUP_COLUMN_HINT = ['المجموعة', 'Group'];

    // فروع جدة أول شي (الأكثر استخداماً)، بعدها باقي الفروع المسجّلة - نفس
    // القائمة المستخدمة بأدوات الفروع الثانية (late-payments-branches-report
    // وغيرها) بالإضافة لفرع 53 (ساحة جدة) اللي مو موجود بتلك القائمة
    const BRANCHES = [
        { id: 29, name: 'مطار جدة' },
        { id: 11, name: 'طريق المدينة' },
        { id: 12, name: 'شارع التحلية' },
        { id: 53, name: 'ساحة جدة' },
        { id: 30, name: 'مطار الطائف' },
        { id: 10, name: 'ينبع - الهيئة الملكية' },
        { id: 25, name: 'مطار الأمير عبدالمحسن - ينبع' },
        { id: 36, name: 'المدينة المنورة' },
        { id: 59, name: 'مطار الأمير محمد بن عبدالعزيز الدولي - المدينة' },
        { id: 70, name: 'مدينة العلا' },
        { id: 217, name: 'الطائف' },
        { id: 218, name: 'طريق الأمير سلطان' },
    ];

    const STATUSES = [
        { id: 1, name: 'جاهزة' },
        { id: 2, name: 'مؤجرة' },
        { id: 13, name: 'تحتاج تجهيز' },
        { id: 14, name: 'التحويلة مفتوحة' },
        { id: 6, name: 'خارج الخدمة' },
    ];

    function branchName(id) {
        const b = BRANCHES.find(x => x.id === id);
        return b ? b.name : ('فرع #' + id);
    }

    function statusName(id) {
        const s = STATUSES.find(x => x.id === id);
        return s ? s.name : ('حالة #' + id);
    }

    function waitCore() {

        var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

        if (!HOST_WINDOW.YAQEEN_TOOLS) {
            setTimeout(waitCore, 500);
            return;
        }

        HOST_WINDOW.YAQEEN_TOOLS.add({
            id: "fleet-search",
            name: "🔍 بحث الأسطول بالحالة",
            run() {
                showSearchForm();
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
    // اختيار الفروع والحالة
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
        '.yq-btn:not(.yq-btn-primary):not(.yq-btn-secondary):hover{background:#f5f3ec;border-color:#a19c92;}' +
        '.yq-btn-secondary:hover{background:#e5e2d5;}' +
        '.yq-btn-primary:hover{filter:brightness(1.06);}' +
        '.yq-toast-close:hover{color:#1c1c1a;}' +
        '.yq-desc{margin:14px 0;text-align:right;font-size:14px;color:#767068;line-height:1.9;}' +
        '.yq-branch-list{text-align:right;max-height:170px;overflow:auto;border:1.5px solid #cec7b4;' +
        'border-radius:12px;padding:8px 12px;}' +
        '.yq-branch-list label{display:flex;align-items:center;gap:8px;padding:7px 2px;font-size:15px;cursor:pointer;}' +
        '.yq-branch-list input{accent-color:#79a916;width:16px;height:16px;}' +
        '.yq-link-row{margin:14px 0 8px;text-align:right;display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#767068;font-weight:700;}' +
        '.yq-link-row a{color:#79a916;text-decoration:none;font-size:13.5px;}';

    function injectYqStyles() {
        if (document.getElementById('yq-shared-styles-fleet-search')) return;
        var style = document.createElement('style');
        style.id = 'yq-shared-styles-fleet-search';
        style.textContent = YQ_CSS;
        document.head.appendChild(style);
    }

    function overlayShell(innerHtml, width) {
        injectYqStyles();
        return (
            '<div id="fleet-search-box" class="yq-overlay">' +
            '<div class="yq-card" style="max-width:' + width + 'px;">' + innerHtml + '</div></div>'
        );
    }

    function showToast(message, type) {
        let wrap = document.getElementById('yq-toast-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.id = 'yq-toast-wrap';
            wrap.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9999999999;display:flex;flex-direction:column;gap:8px;align-items:center;';
            document.body.appendChild(wrap);
        }
        const toast = document.createElement('div');
        toast.style.cssText = 'background:' + (type === 'error' ? '#dc2626' : '#1c1c1a') + ';color:#fff;padding:12px 18px;' +
            'border-radius:12px;font-family:"Tajawal",Arial,sans-serif;font-size:14px;font-weight:700;box-shadow:0 10px 24px -8px rgba(0,0,0,.4);';
        toast.textContent = message;
        wrap.appendChild(toast);
        setTimeout(() => { toast.remove(); if (!wrap.children.length) wrap.remove(); }, type === 'error' ? 5000 : 3500);
    }

    /** يبني شاشة اختيار الفروع + الحالة (كلها Checkboxes) - الفروع كلها محدَّدة
     * افتراضياً (زي أدوات الفروع الثانية)، والحالة ما فيها تحديد افتراضي
     * (يعني بدون فلترة حالة لو ما اخترتي شي = كل الحالات) */
    function showSearchForm() {
        document.getElementById('fleet-search-box')?.remove();

        const branchCheckboxesHtml = BRANCHES.map(b => (
            '<label><input type="checkbox" class="fs-branch-cb" value="' + b.id + '" checked> ' + b.name + '</label>'
        )).join('');

        const statusCheckboxesHtml = STATUSES.map(s => (
            '<label><input type="checkbox" class="fs-status-cb" value="' + s.id + '"> ' + s.name + '</label>'
        )).join('');

        document.body.insertAdjacentHTML('beforeend', overlayShell(
            '<h3>🔍 بحث الأسطول</h3>' +
            '<div class="yq-link-row">' +
            '<span>الفروع</span>' +
            '<span><a href="#" id="fs-branches-all">تحديد الكل</a> · ' +
            '<a href="#" id="fs-branches-none">إلغاء الكل</a></span>' +
            '</div>' +
            '<div id="fs-branches-list" class="yq-branch-list">' + branchCheckboxesHtml + '</div>' +
            '<div class="yq-link-row">' +
            '<span>الحالة</span>' +
            '<span><a href="#" id="fs-status-all">تحديد الكل</a> · ' +
            '<a href="#" id="fs-status-none">إلغاء الكل</a></span>' +
            '</div>' +
            '<div id="fs-status-list" class="yq-branch-list">' + statusCheckboxesHtml + '</div>' +
            '<div class="yq-desc">اتركي الحالة بدون تحديد للبحث عن كل الحالات.</div>' +
            '<button id="fs-submit" class="yq-btn yq-btn-primary">بحث</button>' +
            '<button id="fs-cancel" class="yq-btn yq-btn-secondary">إلغاء</button>',
            380
        ));

        document.getElementById('fs-branches-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.fs-branch-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('fs-branches-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.fs-branch-cb').forEach(cb => { cb.checked = false; });
        };
        document.getElementById('fs-status-all').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.fs-status-cb').forEach(cb => { cb.checked = true; });
        };
        document.getElementById('fs-status-none').onclick = e => {
            e.preventDefault();
            document.querySelectorAll('.fs-status-cb').forEach(cb => { cb.checked = false; });
        };

        document.getElementById('fs-cancel').onclick = () => {
            document.getElementById('fleet-search-box')?.remove();
        };

        // لازم فتح النافذة متزامن جوّا onclick بدون await قبله، وإلا المتصفح يحظرها
        document.getElementById('fs-submit').onclick = () => {
            const branchIds = Array.from(document.querySelectorAll('.fs-branch-cb:checked')).map(cb => parseInt(cb.value, 10));
            if (branchIds.length === 0) {
                showToast('اختر فرع واحد على الأقل', 'error');
                return;
            }
            const statusIds = Array.from(document.querySelectorAll('.fs-status-cb:checked')).map(cb => parseInt(cb.value, 10));
            start(branchIds, statusIds);
        };
    }

    // ==========================================================
    // التنفيذ: نافذة منبثقة بدل مغادرة الصفحة الحالية
    // ==========================================================

    function start(branchIds, statusIds) {

        document.getElementById('fleet-search-box')?.remove();

        const statusParam = statusIds.length ? `&statusIds=${statusIds.join(',')}` : '';
        const url = `/rental/vehicles/all?currentLocationIds=${branchIds.join(',')}${statusParam}&pageSize=500`;
        const frame = openHiddenFrame(url);

        const branchLabel = branchIds.map(branchName).join('، ');
        const statusLabel = statusIds.length ? statusIds.map(statusName).join(' + ') : 'كل الحالات';
        const printLabel = `${branchLabel} — ${statusLabel}`;

        showLoading("جارٍ تحميل بيانات البحث...");

        waitForFirstFrame(frame)
            .then(() => {
                showLoading("جارٍ تغيير لغة الصفحة إلى الإنجليزية...");
                return changeLanguage(frame, "English");
            })
            .then(() => waitForFirstFrame(frame))
            .then(doc => {
                showLoading("جارٍ جمع كل صفحات الجدول...");
                return collectAllPages(frame, doc, url);
            })
            .then(rows => {
                showLoading("جارٍ إرجاع لغة الصفحة إلى العربية...");
                // نرجّع اللغة عربي قبل الإغلاق حتى ما تظل عالقة إنجليزي بالتبويب الأصلي
                return changeLanguage(frame, "العربية").then(() => rows);
            })
            .then(rows => {
                try { frame.remove(); } catch (err) { /* تجاهل */ }
                if (!rows.length) {
                    showMessage("ما فيه سيارات تطابق الفروع/الحالة المختارة");
                    return;
                }
                return fetchAllChassisNumbers(rows);
            })
            .then(rows => {
                if (!rows) return;
                document.getElementById('fleet-search-box')?.remove();
                printFleet(rows, printLabel);
            })
            .catch(err => {
                try { frame.remove(); } catch (err2) { /* تجاهل */ }
                showMessage("تعذّر جلب بيانات البحث: " + err.message);
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

    // بعض الجداول تعرض صفوف الصفحة الحالية فقط رغم pageSize كبير، فنتنقّل ونجمع كل الصفوف
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

    function collectAllPages(iframe, doc, baseUrl) {
        return new Promise(resolve => {
            const allRows = [];
            const seen = {};
            let pageIndex = 0;
            const maxIterations = 80;

            function addRows(rows) {
                let added = 0;
                rows.forEach(r => {
                    if (!seen[r.__signature]) {
                        seen[r.__signature] = true;
                        allRows.push(r);
                        added++;
                    }
                });
                return added;
            }

            function readRowsSafely(targetDoc) {
                try {
                    return readCurrentPageRows(targetDoc || doc);
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
                    verifyByUrl();
                    return;
                }
                pageIndex++;

                const rows = readRowsSafely();
                addRows(rows);

                const nextControl = findNextPageControl(doc);
                if (!nextControl || isControlDisabled(nextControl)) {
                    verifyByUrl();
                    return;
                }

                const beforeSignature = rows.length ? rows[rows.length - 1].__signature : null;
                try {
                    nextControl.click();
                } catch (err) {
                    verifyByUrl();
                    return;
                }
                waitForPageChange(beforeSignature);
            }

            // بعد ما يخلص التنقّل عبر زر "التالي" (أو حتى لو ما لقى الزر أصلاً)، نتأكد
            // بالتنقّل المباشر عبر رقم الصفحة بالرابط (pageNumber=1,2,3...) حتى ما
            // تفوتنا صفحات إضافية زر "التالي" ما التقطها، حتى مع pageSize كبير مثل 500
            function verifyByUrl() {
                if (!baseUrl || !iframe.isConnected) {
                    resolve(allRows);
                    return;
                }
                const sep = baseUrl.indexOf('?') === -1 ? '?' : '&';
                let checkPage = pageIndex + 1;
                const maxExtraPages = 20;
                let extraChecked = 0;

                function checkNext() {
                    if (extraChecked >= maxExtraPages || !iframe.isConnected) {
                        resolve(allRows);
                        return;
                    }
                    extraChecked++;
                    try {
                        iframe.src = `${baseUrl}${sep}pageNumber=${checkPage}`;
                    } catch (err) {
                        resolve(allRows);
                        return;
                    }
                    waitForPageLoad(iframe).then(pageDoc => {
                        if (!pageDoc || !iframe.isConnected) {
                            resolve(allRows);
                            return;
                        }
                        const rows = readRowsSafely(pageDoc);
                        const added = addRows(rows);
                        if (rows.length === 0 || added === 0) {
                            resolve(allRows);
                            return;
                        }
                        checkPage++;
                        checkNext();
                    });
                }
                checkNext();
            }

            step();
        });
    }

    /** ينتظر اكتمال تحميل مستند الـiframe بعد تغيير رابطه (يُستخدم بالتحقق عبر
     * pageNumber)، ويعطي مهلة إضافية ثابتة بعد اكتمال التحميل حتى يرسم الجدول
     * (فارغًا كان أو لا) - بعكس waitForFirstFrame اللي ينتظر ظهور صفوف بالجدول */
    function waitForPageLoad(iframe, timeoutMs) {
        timeoutMs = timeoutMs || 15000;
        return new Promise(resolve => {
            const start = Date.now();
            (function check() {
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
                if (!doc || doc.readyState !== "complete") {
                    if (Date.now() - start > timeoutMs) {
                        resolve(doc || null);
                        return;
                    }
                    setTimeout(check, 250);
                    return;
                }
                setTimeout(() => resolve(doc), 900);
            })();
        });
    }

    // ==========================================================
    // جلب رقم الشاسيه لكل سيارة من صفحة تفاصيلها (غير موجود بجدول القائمة)
    // ==========================================================

    // رقم الشاسيه بالنسخة العربية "رقم الشاسيه"، وبالإنجليزية "Chassis No." - وبما
    // إن الأداة تبدّل لغة الصفحة الأصلية لجلب الجدول (وممكن ما ترجع عربي بالوقت
    // اللي تفتح فيه صفحات التفاصيل)، نطابق التسميتين مع بعض بدل الاعتماد على لغة وحدة
    const CHASSIS_FIELD_LABELS = ["رقم الشاسيه", "Chassis No."];
    const PLATE_FIELD_LABELS = ["رقم اللوحة", "Plate No."];

    /** يدور بين كل عناصر p.text-slate-500 (تسميات صفحة التفاصيل) عن أي وحدة من
     * تسميات labelVariants، ويرجّع نص العنصر اللي بعدها مباشرة (القيمة) */
    function extractDetailField(doc, labelVariants) {
        const variants = (Array.isArray(labelVariants) ? labelVariants : [labelVariants]).map(normalizeArabic);
        const labels = Array.prototype.slice.call(doc.querySelectorAll("p.text-slate-500"));
        const target = labels.find(p => variants.indexOf(normalizeArabic(p.textContent)) !== -1);
        if (!target) return "";
        const valueEl = target.nextElementSibling;
        return valueEl ? valueEl.textContent.trim() : "";
    }

    function waitForVehicleDetails(iframe, timeoutMs) {
        timeoutMs = timeoutMs || 15000;
        return new Promise(resolve => {
            const start = Date.now();
            (function poll() {
                if (!iframe.isConnected) { resolve(null); return; }
                let doc;
                try {
                    doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                } catch (err) { resolve(null); return; }
                if (!doc || doc.readyState !== "complete") {
                    if (Date.now() - start > timeoutMs) { resolve(doc || null); return; }
                    setTimeout(poll, 300);
                    return;
                }
                const ready = doc.querySelector("p.text-slate-500");
                if (ready || Date.now() - start > timeoutMs) {
                    resolve(doc);
                    return;
                }
                setTimeout(poll, 300);
            })();
        });
    }

    /** يفتح صفحة تفاصيل سيارة وحدة ويرجّع رقم الشاسيه (فاضي لو ما لقاه). نتحقق
     * إن "رقم اللوحة" المكتوب فعلاً بالصفحة اللي فتحناها يطابق اللوحة المطلوبة
     * قبل ما نقبل رقم الشاسيه - احتياط ضروري بما إننا نفتح عدة إطارات بالتوازي
     * (fetchAllChassisNumbers)، فلازم نضمن كل نتيجة ترجع لسيارتها الصح بالضبط */
    function fetchChassis(plate) {
        return new Promise(resolve => {
            const frame = openHiddenFrame(`/rental/vehicles/${encodeURIComponent(plate)}/details`);
            waitForVehicleDetails(frame)
                .then(doc => {
                    let chassis = "";
                    if (doc) {
                        const pagePlate = extractDetailField(doc, PLATE_FIELD_LABELS);
                        if (normalizeArabic(pagePlate) === normalizeArabic(plate)) {
                            chassis = extractDetailField(doc, CHASSIS_FIELD_LABELS);
                        } else {
                            console.warn("[fleet-search] لوحة الصفحة المفتوحة ما تطابق المطلوبة - تجاهلنا النتيجة:", plate, "!=", pagePlate);
                        }
                    }
                    try { frame.remove(); } catch (err) { /* تجاهل */ }
                    resolve(chassis);
                })
                .catch(() => {
                    try { frame.remove(); } catch (err) { /* تجاهل */ }
                    resolve("");
                });
        });
    }

    // نفتح 8 صفحات تفاصيل بالتوازي (بدل وحدة بوحدة) لتسريع البحث - كل طلب مربوط
    // بصف محدد مسبقاً (rows[idx])، فما فيه تشارك بحالة بين الإطارات المتزامنة،
    // وتحقق تطابق اللوحة بـfetchChassis يضمن ما ينكتب رقم شاسيه بصف غلط حتى لو
    // إطار تأخر أو تعثّر
    const CHASSIS_FETCH_CONCURRENCY = 8;
    // ما نقبل صف بدون رقم شاسيه بسهولة - لو رجع فاضي (تحميل بطيء، تعثّر إطار،
    // عدم تطابق لوحة...) نعيد المحاولة على نفس السيارة بدل ما نتخطاها للأبد
    const CHASSIS_FETCH_MAX_ATTEMPTS = 6;

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /** يجلب رقم الشاسيه لسيارة وحدة، وإذا رجع فاضي يعيد المحاولة (بفاصل بسيط)
     * لحد CHASSIS_FETCH_MAX_ATTEMPTS مرة قبل ما يسلّم إنه فعلاً ما قدر */
    function fetchChassisWithRetry(plate, attemptsLeft) {
        attemptsLeft = attemptsLeft == null ? CHASSIS_FETCH_MAX_ATTEMPTS : attemptsLeft;
        return fetchChassis(plate).then(chassis => {
            if (chassis) return chassis;
            if (attemptsLeft <= 1) {
                console.warn("[fleet-search] فشل جلب رقم الشاسيه بعد", CHASSIS_FETCH_MAX_ATTEMPTS, "محاولات - بيضل فاضي بالجدول:", plate);
                return "";
            }
            return delay(500).then(() => fetchChassisWithRetry(plate, attemptsLeft - 1));
        });
    }

    /** يجلب رقم الشاسيه لكل صف (بالتوازي بحد أقصى CHASSIS_FETCH_CONCURRENCY
     * إطارات بنفس الوقت، مع إعادة محاولة تلقائية لأي صف يرجع فاضي) ويحدّث رسالة
     * التحميل بالتقدّم كل ما تخلص وحدة */
    function fetchAllChassisNumbers(rows) {
        return new Promise(resolve => {
            const total = rows.length;
            if (total === 0) { resolve(rows); return; }

            let nextIndex = 0;
            let completed = 0;
            showLoading(`جارٍ جلب رقم الشاسيه (0 من ${total})...`);

            function startNext() {
                if (nextIndex >= total) return;
                const row = rows[nextIndex++];
                fetchChassisWithRetry(row.plate).then(chassis => {
                    row.chassis = chassis;
                    completed++;
                    showLoading(`جارٍ جلب رقم الشاسيه (${completed} من ${total})...`);
                    if (completed >= total) {
                        resolve(rows);
                    } else {
                        startNext();
                    }
                });
            }

            const workers = Math.min(CHASSIS_FETCH_CONCURRENCY, total);
            for (let i = 0; i < workers; i++) startNext();
        });
    }

    // ==========================================================
    // واجهة رسائل بسيطة (تحميل / خطأ)
    // ==========================================================

    function showLoading(text) {
        document.getElementById("fleet-search-box")?.remove();
        injectYqStyles();
        const html = `
<div id="fleet-search-box" class="yq-overlay">
<div class="yq-card" style="max-width:300px;padding:30px;">
<div class="yq-spinner"></div>
<div style="font-size:14.5px;font-weight:700;">${text}</div>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
    }

    function showMessage(text) {
        document.getElementById("fleet-search-box")?.remove();
        injectYqStyles();
        const html = `
<div id="fleet-search-box" class="yq-overlay">
<div class="yq-card" style="max-width:300px;">
<div style="margin-bottom:15px;font-size:14.5px;font-weight:700;">${text}</div>
<button id="close-fleet-search-message" class="yq-btn yq-btn-primary">إغلاق</button>
</div>
</div>`;
        document.body.insertAdjacentHTML("beforeend", html);
        document.getElementById("close-fleet-search-message").onclick = () => {
            document.getElementById("fleet-search-box")?.remove();
        };
    }

    // ==========================================================
    // طباعة نتائج البحث
    // ==========================================================

    function printFleet(rows, label) {

        rows.sort((a, b) =>
            a.group.localeCompare(b.group) ||
            a.plate.localeCompare(b.plate, undefined, { numeric: true })
        );

        const title = label ? `Fleet Search - ${label}` : "Fleet Search";

        let html = `
<html dir="ltr">
<head>
<title>${title}</title>
<style>
body{font-family:Arial;padding:12px;font-size:10.5px;}
h2{text-align:center;font-size:15px;margin:0 0 8px;}
table{width:100%;border-collapse:collapse;}
th,td{border:1px solid #999;padding:2px 4px;text-align:center;}
.check{width:20px;height:14px;}
.box{font-size:13px;font-weight:bold;}
.chassis{font-family:"Courier New",monospace;font-size:12.5px;font-weight:bold;}
</style>
</head>
<body>
<h2>${title}</h2>
<table>
<tr>
<th>#</th>
<th>Plate</th>
<th>✓</th>
<th>Group</th>
<th>Vehicle</th>
<th>Chassis</th>
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
<td class="chassis">${x.chassis || ""}</td>
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
