// ==UserScript==
// @name         Yaqeen Tool - حجوزات المطار القادمة + السيارات المتاحة
// @namespace    https://yaqeen.lumirental.com/
// @version      1.0
// @description  تجيب حجوزات فرع المطار خلال عدد ساعات تحدده + عدد السيارات المتاحة لكل قروب في نفس الفرع - بدون مغادرة الصفحة الحالية
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

    // unsafeWindow: مطلوب لأن GM_xmlhttpRequest يشغّل الكود بوضع sandboxed معزول عن window الحقيقية
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

    // تعديلات يدوية على عدد سيارات الحوش لكل قروب - تُمسح مع كل تحديث حقيقي للبيانات
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

        // الإطارات الثلاثة تُفتح فوراً لكن تُقرأ بالتتابع لا بالتوازي - قراءة متزامنة تسبب تنافس موارد
        // يمنع إطار "الحوش" (آخر واحد) من اكتمال تحميله ضمن المهلة
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

                // عمود "سيارات الحوش" يشمل كل قروبات الحوش حتى لو ما عنده سيارة بالمطار ولا حجز
                var yardVehicleCounts = {};
                yardRows.forEach(function (r) {
                    if (!r.group || !r.available) return;
                    yardVehicleCounts[r.group] = (yardVehicleCounts[r.group] || 0) + 1;
                });

                // تحديث حقيقي جديد للبيانات - نمسح أي تعديل يدوي سابق
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
        '.yq-report-header{border-radius:22px 22px 0 0;padding:22px 28px;flex-shrink:0;position:relative;' +
        'background:#fff;color:#1c1c1a;border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-close{position:absolute;top:20px;left:24px;background:transparent;border:0;font-size:18px;' +
        'cursor:pointer;color:#a19c92;padding:8px;border-radius:9px;line-height:1;transition:background .15s,color .15s;}' +
        '.yq-report-close:hover{background:#f1f0ea;color:#1c1c1a;}' +
        '.yq-report-title{font-size:18px;font-weight:800;}' +
        '.yq-report-sub{font-size:13.5px;margin-top:5px;opacity:.85;}' +
        '.yq-stat-row{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}' +
        '.yq-stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
        'font-size:12.5px;font-weight:700;white-space:nowrap;}' +
        '.yq-stat-chip strong{font-size:14px;font-weight:800;}' +
        '.yq-stat-chip--result{background:#fef3c7;color:#b45309;}' +
        '.yq-stat-chip--ok{background:#dcfce7;color:#16a34a;}' +
        '.yq-report-actions{display:flex;gap:8px;padding:16px 28px;flex-wrap:wrap;flex-shrink:0;' +
        'border-top:1.5px solid #cec7b4;align-items:center;}' +
        '.yq-icon-btn{cursor:pointer;border:1.5px solid #cec7b4;background:#fff;color:#1c1c1a;font-family:inherit;' +
        'width:38px;height:38px;border-radius:11px;font-size:16px;line-height:1;transition:background .15s,border-color .15s;' +
        'display:flex;align-items:center;justify-content:center;}' +
        '.yq-icon-btn:hover{background:#f1f0ea;border-color:#a19c92;}' +
        '.yq-btn-labeled{cursor:pointer;border:0;border-radius:11px;height:38px;padding:0 16px;font-size:13.5px;' +
        'font-weight:800;font-family:inherit;display:inline-flex;align-items:center;gap:6px;' +
        'background:#f1f0ea;color:#1c1c1a;transition:background .15s;}' +
        '.yq-btn-labeled:hover{background:#e5e2d5;}' +
        '.yq-btn-labeled--send{background:#16a34a;color:#fff;}' +
        '.yq-btn-labeled--send:hover{filter:brightness(1.06);}' +
        '.yq-btn-labeled--whatsapp{background:linear-gradient(160deg,#25D366,#16a34a);color:#fff;}' +
        '.yq-btn-labeled--whatsapp:hover{filter:brightness(1.06);}' +
        '.yq-report-table{width:100%;border-collapse:collapse;font-size:16px;}' +
        '.yq-report-table thead th{position:sticky;top:0;background:#fafaf6;padding:12px 10px;' +
        'font-size:13.5px;font-weight:800;color:#a19c92;text-transform:uppercase;letter-spacing:.03em;' +
        'border-bottom:1.5px solid #cec7b4;}' +
        '.yq-report-table td{padding:12px 10px;border-bottom:1px solid #cec7b4;}' +
        '.yq-report-table tbody tr:nth-child(even){background:#fafaf6;}' +
        '.yq-row-send-btn{padding:7px 12px;border:0;border-radius:9px;background:#16a34a;color:#fff;' +
        'cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;white-space:nowrap;}' +
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

        // اتحاد كل القروبات (حجوزات + سيارات مطار + سيارات حوش) عشان قروب فيه حوش فقط يظل يظهر
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
            '<button type="button" class="yq-report-close" id="airport-hours-close" aria-label="إغلاق">✕</button>' +
            '<div class="yq-report-title">🛫 حجوزات المطار خلال ' + hours + ' ساعة القادمة</div>' +
            '<div class="yq-stat-row">' +
            '<span class="yq-stat-chip yq-stat-chip--result">📋 <strong>' + totalBookings + '</strong> حجز</span>' +
            '<span class="yq-stat-chip yq-stat-chip--ok">🚗 <strong>' + totalVehicles + '</strong> سيارة متاحة</span>' +
            '</div>' +
            '</div>' +
            '<div style="overflow:auto;flex:1;padding:0 10px;">' +
            '<table class="yq-report-table">' +
            '<tr><th>القروب</th><th>السيارات المتاحة</th><th>الحجوزات</th><th>الفرق</th>' +
            '<th>سيارات الحوش (53)</th>' +
            '</tr>' + rowsHtml + '</table>' +
            '</div>' +
            '<div class="yq-report-actions">' +
            '<button id="airport-hours-refresh" class="yq-icon-btn" title="تحديث">🔄</button>' +
            '<button id="airport-hours-print" class="yq-icon-btn" title="طباعة التقرير">🖨️</button>' +
            '<button id="airport-hours-change" class="yq-btn-labeled">⏱️ تغيير المدة</button>' +
            '<button id="airport-hours-whatsapp" class="yq-btn-labeled yq-btn-labeled--whatsapp">📱 إرسال</button>' +
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
            '.stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
            'font-size:13px;font-weight:700;margin:8px 8px 8px 0;}' +
            '.stat-chip strong{font-size:14px;font-weight:800;}' +
            '.stat-chip--bookings{background:#fef3c7;color:#b45309;}' +
            '.stat-chip--ok{background:#dcfce7;color:#16a34a;}' +
            'table{border-collapse:collapse;width:100%;font-size:15px;}' +
            'th,td{border:1px solid #999;padding:8px 10px;text-align:center;}' +
            'th{background:#f0f0f0;}' +
            '</style></head><body>' +
            '<h1>🛫 حجوزات المطار خلال ' + hours + ' ساعة القادمة</h1>' +
            '<div>' +
            '<span class="stat-chip stat-chip--bookings">📋 <strong>' + totalBookings + '</strong> حجز</span>' +
            '<span class="stat-chip stat-chip--ok">🚗 <strong>' + totalVehicles + '</strong> سيارة متاحة</span>' +
            '</div>' +
            '<div class="meta">' + now + '</div>' +
            '<table><tr><th>القروب</th><th>السيارات المتاحة</th><th>الحجوزات</th><th>الفرق</th><th>سيارات الحوش (53)</th></tr>' +
            rowsHtml + '</table></body></html>';

        printWindow.document.write(printHtml);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // ==========================================================
    // إرسال صورة واتساب (SVG+foreignObject، بدون أي مكتبة خارجية)
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
        '.stat-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;' +
        'font-size:13px;font-weight:700;margin:8px 8px 8px 0;}' +
        '.stat-chip strong{font-size:14px;font-weight:800;}' +
        '.stat-chip--bookings{background:#fef3c7;color:#b45309;}' +
        '.stat-chip--ok{background:#dcfce7;color:#16a34a;}' +
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
            '<div>' +
            '<span class="stat-chip stat-chip--bookings">📋 <strong>' + totalBookings + '</strong> حجز</span>' +
            '<span class="stat-chip stat-chip--ok">🚗 <strong>' + totalVehicles + '</strong> سيارة متاحة</span>' +
            '</div>' +
            '<div class="meta">' + now + '</div>' +
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

                // data URI (مش blob:) لأن كروم يرفض canvas.toDataURL() بصمت على SVG فيها foreignObject من blob: (Tainted Canvas)
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
                        // نرسل base64 خام بدون بادئة data:image/...;base64, لأن البوت يعمل Buffer.from مباشرة
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
