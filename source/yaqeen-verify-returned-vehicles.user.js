// ==UserScript==
// @name         Yaqeen - تحقق من المسترجعة فعلياً
// @namespace    yaqeen-tools
// @version      1.1.0
// @description  يفحص فعلياً العقود المكتملة (المسترجعة) بيوم أو مدى أيام تختاره في فرعك، عقد عقد، ويستثني أي عقد تم تسليمه بموقع غير موقع فرعك، ويحسب عدد السيارات المسترجعة فعلياً لكل مجموعة - للمقارنة مع أرقام أداة "السيارات المسترجعة"
// @author       -
// @match        https://yaqeen.lumirental.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      api.yaqeen-vip.space
// @run-at       document-idle
// @updateURL    https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// @downloadURL  https://api.yaqeen-vip.space/tools/yaqeen-all-tools.user.js
// ==/UserScript==

/**
 * أداة "تحقق من المسترجعة فعلياً"
 * ------------------------------------------------------------
 * أداة تدقيق تُستخدم نهاية اليوم (أو لمراجعة أي يوم/مدى أيام سابق بنفس
 * الشهر) للتحقق من صحة أرقام أداة "السيارات المسترجعة" - بدل الاعتماد على
 * صفحة "المستأجرة" (rented) اللي تتوقع تواريخ تسليم مستقبلية، هذي الأداة
 * تجيب كل عقود الشهر المكتملة (completed) مرة وحدة، تفلترها محلياً حسب
 * التاريخ المختار (فلتر "من/إلى")، وتفتح فقط العقود المطابقة على حدة
 * (المجموعة ما تظهر إلا داخل تفاصيل العقد نفسه)، وتستثني أي عقد تم تسليمه
 * بموقع مختلف عن موقع فرعك، ثم تحسب عدد السيارات المسترجعة فعلياً لكل مجموعة.
 *
 * ملاحظة: كل عقد مطابق للفلتر يحتاج فتح صفحة تفاصيله الحقيقية (بدون رابط
 * مباشر - الصف قابل للضغط فقط عبر JS)، فالفحص قد يستغرق دقيقة أو أكثر حسب
 * عدد العقود بالمدى المختار - هذا طبيعي ومقصود لأنها أداة تدقيق دقيق وليست
 * تقرير سريع.
 */
(function () {
  'use strict';

  var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  if (!HOST_WINDOW.YAQEEN_TOOLS || typeof HOST_WINDOW.YAQEEN_TOOLS.add !== 'function') {
    console.error('[تحقق من المسترجعة فعلياً] لم يتم العثور على YAQEEN_TOOLS، الأداة لن تعمل.');
    return;
  }

  // ==========================================================
  // إعدادات ثابتة
  // ==========================================================
  var BRANCH_LOCATION_ID = 29;
  // نجيب الشهر كامل مرة وحدة، وفلتر التاريخ (يوم أو مدى أيام) يُطبَّق محلياً
  // على الصفوف قبل ما نفتح تفاصيلها - عشان ما نحتاج نغيّر رابط الطلب لكل يوم
  var COMPLETED_MONTH_URL =
    'https://yaqeen.lumirental.com/rental/branches/' +
    BRANCH_LOCATION_ID +
    '/bookings/completed?dropOffDateRangeStart=THIS_MONTH&pageSize=5000';

  var MAX_ROWS = 2000; // حد أقصى احترازي لعدد العقود المفتوحة فعلياً بالمدى المختار
  var MAX_ITERATIONS = 4000; // يشمل أيضاً تصفّح صفحات الشهر كامل بحثاً عن صفوف بالمدى

  var COMPLETED_COLUMNS_MAP = {
    bookingNumber: ['رقم الحجز'],
    agreementNo: ['رقم الاتفاقية'],
    dropoffText: ['وقت التسليم'],
    plate: ['المركبة'],
  };

  var WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // ==========================================================
  // الحالة
  // ==========================================================
  var state = {
    running: false,
    cancelled: false,
    lastRunAt: null,
    dateFrom: null, // Date (بدون وقت) - يُهيّأ بالقيمة الافتراضية عند بناء الواجهة
    dateTo: null,
    results: [], // [{group, plate, bookingNumber, agreementNo}] - تسليم بنفس موقع الفرع فقط
    excludedCrossBranch: [], // عقود تم استثناؤها (تسليم بموقع مختلف)
    skipped: [], // عقود تعذّر فحصها (فشل تحميل/انتقال)
  };

  var modalEls = null;

  // ==========================================================
  // أدوات مساعدة عامة
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

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function setStatus(message, type) {
    if (!modalEls) return;
    modalEls.statusEl.className = 'yqa-status' + (type ? ' yqa-status--' + type : '');
    if (type === 'loading') {
      modalEls.statusEl.innerHTML = '<span class="yqa-spinner" aria-hidden="true"></span><span>' + escapeHtml(message || '') + '</span>';
    } else {
      modalEls.statusEl.textContent = message || '';
    }
  }

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

  function findListTable(doc) {
    var tables = Array.prototype.slice.call(doc.querySelectorAll('table'));
    if (tables.length === 0) return null;
    var normalizedHint = normalizeArabic(COMPLETED_COLUMNS_MAP.bookingNumber[0]);
    var matching = tables.filter(function (table) {
      var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
      return headerCells.some(function (cell) { return normalizeArabic(cell.textContent).indexOf(normalizedHint) !== -1; });
    });
    if (matching.length > 0) return matching[0];
    // احتياطي: أكبر جدول موجود
    var best = null;
    var bestCount = -1;
    tables.forEach(function (t) {
      var count = t.querySelectorAll('tbody tr').length;
      if (count > bestCount) { best = t; bestCount = count; }
    });
    return best;
  }

  function openHiddenFrame(url) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:960px;height:640px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    return iframe;
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

  // ==========================================================
  // انتظار جاهزية قائمة العقود المكتملة (بعد التحميل الأول أو بعد "رجوع")
  // ==========================================================
  function waitForListReady(iframe, timeoutMs) {
    timeoutMs = timeoutMs || 20000;
    return new Promise(function (resolve) {
      var start = Date.now();
      var completeSince = null;
      (function check() {
        if (!iframe.isConnected) { resolve(null); return; }
        var doc;
        try {
          doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        } catch (err) {
          resolve(null);
          return;
        }
        var ready = doc && doc.readyState === 'complete';
        if (ready) {
          if (completeSince === null) completeSince = Date.now();
          var table = findListTable(doc);
          if (table) {
            var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
            var idx = findColumnIndex(headerCells, COMPLETED_COLUMNS_MAP.bookingNumber);
            var bodyRows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
            var hasData = idx >= 0 && bodyRows.some(function (row) {
              var cells = row.querySelectorAll('td');
              var cell = cells[idx];
              return cell && cell.textContent.trim().length > 0;
            });
            if (hasData) { resolve(doc); return; }
          }
          // ما لقينا جدول فيه بيانات - نمهل 1.5 ثانية بعد اكتمال التحميل قبل
          // اعتبارها حالة "فاضي فعلاً" (بدون عقود مكتملة اليوم)
          if (Date.now() - completeSince > 1500) { resolve(doc); return; }
        }
        if (Date.now() - start > timeoutMs) { resolve(doc || null); return; }
        setTimeout(check, 250);
      })();
    });
  }

  /** ينتظر ظهور تفاصيل العقد (المجموعة + مواقع الاستلام/التسليم) بعد الضغط على صف */
  function waitForDetailReady(iframe, timeoutMs) {
    timeoutMs = timeoutMs || 20000;
    return new Promise(function (resolve) {
      var start = Date.now();
      (function check() {
        if (!iframe.isConnected) { resolve(null); return; }
        var doc;
        try {
          doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        } catch (err) {
          resolve(null);
          return;
        }
        if (doc && doc.readyState === 'complete') {
          var groupEl = doc.querySelector('[data-testid="vehiclegroup"]');
          var dropoffEl = doc.querySelector('[data-testid="drop-off-location"]');
          var pickupEl = doc.querySelector('[data-testid="pickup-location"]');
          if (groupEl && groupEl.textContent.trim() && dropoffEl && dropoffEl.textContent.trim() && pickupEl && pickupEl.textContent.trim()) {
            resolve(doc);
            return;
          }
        }
        if (Date.now() - start > timeoutMs) { resolve(null); return; }
        setTimeout(check, 250);
      })();
    });
  }

  // ==========================================================
  // استخراج بيانات الصفوف/التفاصيل
  // ==========================================================

  function computeListIndices(doc) {
    var table = findListTable(doc);
    if (!table) return null;
    var headerCells = Array.prototype.slice.call(table.querySelectorAll('thead tr th, thead tr td'));
    var indices = {};
    Object.keys(COMPLETED_COLUMNS_MAP).forEach(function (key) {
      indices[key] = findColumnIndex(headerCells, COMPLETED_COLUMNS_MAP[key]);
    });
    return indices;
  }

  function extractRowInfo(row, indices) {
    var cells = Array.prototype.slice.call(row.querySelectorAll('td'));
    if (cells.length === 0) return null;
    function cellText(idx) { return idx >= 0 && cells[idx] ? cells[idx].textContent.trim() : ''; }
    var bookingNumber = cellText(indices.bookingNumber);
    if (!bookingNumber) return null;
    return {
      bookingNumber: bookingNumber,
      agreementNo: cellText(indices.agreementNo),
      dropoffText: cellText(indices.dropoffText),
      plate: cellText(indices.plate),
      rowEl: row,
    };
  }

  /** يبحث عن صف عقد محدد (برقم الحجز) بالصفحة الحالية - يُستخدم لإعادة محاولة عقد فشلت زيارته أول مرة */
  function findRowByBookingNumber(doc, bookingNumber) {
    var indices = computeListIndices(doc);
    if (!indices) return null;
    var table = findListTable(doc);
    if (!table) return null;
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    for (var i = 0; i < rows.length; i++) {
      var info = extractRowInfo(rows[i], indices);
      if (info && info.bookingNumber === bookingNumber) return info;
    }
    return null;
  }

  /**
   * أول صف غير معالَج وتاريخه ضمن المدى المختار. أي صف خارج المدى يُعلَّم
   * "processed" فوراً بدون فتح تفاصيله - نقرأ التاريخ من نص القائمة نفسه
   * فما نحتاج نفتح العقد أصلاً لو تاريخه غير مطلوب، وهذا يوفّر وقت كبير لما
   * يكون المدى المختار يوم أو يومين فقط من شهر كامل.
   */
  function findFirstMatchingUnprocessedRow(doc, processed, dateFrom, dateTo) {
    var indices = computeListIndices(doc);
    if (!indices) return null;
    var table = findListTable(doc);
    if (!table) return null;
    var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));
    for (var i = 0; i < rows.length; i++) {
      var info = extractRowInfo(rows[i], indices);
      if (!info || processed[info.bookingNumber]) continue;
      var dateOnly = parseCompletedDropoffDate(info.dropoffText);
      if (!isDateWithinRange(dateOnly, dateFrom, dateTo)) {
        processed[info.bookingNumber] = true;
        continue;
      }
      return info;
    }
    return null;
  }

  function extractTestIdText(doc, testId) {
    var el = doc.querySelector('[data-testid="' + testId + '"]');
    return el ? el.textContent.trim() : '';
  }

  /** نص عنصر المجموعة يجي بصيغة "المجموعة: GB" - نستخرج الرمز فقط بعد النقطتين */
  function extractGroupFromDetail(doc) {
    var text = extractTestIdText(doc, 'vehiclegroup');
    if (!text) return '';
    var match = /:\s*(.+)$/.exec(text);
    return match ? match[1].trim() : text;
  }

  function todayMidnight() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /** yyyy-mm-dd محلي (بدون تحويل UTC) - يُستخدم كقيمة افتراضية لحقول input[type=date] */
  function toIsoDateLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  /** yyyy-mm-dd -> Date محلي بدون وقت */
  function fromIsoDateLocal(str) {
    var parts = (str || '').split('-');
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    var d = parseInt(parts[2], 10);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  /**
   * يحوّل نص "وقت التسليم" لتاريخ فعلي (بدون وقت). صيغ صفحة "المكتملة":
   * "اليوم - HH:MM"، "أمس - HH:MM"، اسم يوم أسبوع ("الخميس - HH:MM" - يعني
   * أقرب خميس ماضٍ خلال آخر ٧ أيام)، أو تاريخ صريح "DD-MM-YYYY" للأقدم من أسبوع.
   */
  function parseCompletedDropoffDate(text) {
    text = (text || '').trim();
    if (!text) return null;
    var todayMid = todayMidnight();

    var relMatch = /^(اليوم|أمس)\s*-/.exec(text);
    if (relMatch) {
      var d = new Date(todayMid);
      if (normalizeArabic(relMatch[1]) === normalizeArabic('أمس')) d.setDate(d.getDate() - 1);
      return d;
    }

    var normalizedText = normalizeArabic(text);
    for (var i = 0; i < WEEKDAY_NAMES.length; i++) {
      if (normalizedText.indexOf(normalizeArabic(WEEKDAY_NAMES[i])) === 0) {
        var diff = (todayMid.getDay() - i + 7) % 7;
        if (diff === 0) diff = 7; // اليوم نفسه له تسمية "اليوم" مباشرة، فأي اسم يوم أسبوع يعني أسبوع مضى بالحد الأدنى
        var weekdayDate = new Date(todayMid);
        weekdayDate.setDate(weekdayDate.getDate() - diff);
        return weekdayDate;
      }
    }

    var dateMatch = /(\d{1,2})-(\d{1,2})-(\d{4})/.exec(text);
    if (dateMatch) {
      return new Date(parseInt(dateMatch[3], 10), parseInt(dateMatch[2], 10) - 1, parseInt(dateMatch[1], 10));
    }

    return null;
  }

  function isDateWithinRange(dateOnly, from, to) {
    if (!dateOnly) return false;
    return dateOnly.getTime() >= from.getTime() && dateOnly.getTime() <= to.getTime();
  }

  // ==========================================================
  // محرّك الفحص: يمر عقد عقد بالتسلسل (ضغط صف -> قراءة تفاصيل -> رجوع)
  // ==========================================================

  function processedCount(obj) {
    return Object.keys(obj).length;
  }

  /**
   * نشغّل عدة إطارات (iframes) مستقلة بالتوازي، كل واحد يحمّل نفس قائمة
   * العقود من الصفر ويتصفّح صفحاتها لحاله - لكنها كلها تتشارك نفس كائن
   * "processed" و"iterCounter"، وبما إن جافاسكربت أحادي الخيط (event loop
   * واحد)، وضع الصف كـ"processed" يصير فوراً وبشكل متزامن قبل أي await، فما
   * فيه احتمال يعالج فريمان نفس العقد مرتين. هذا يسرّع الفحص تقريباً بعدد
   * الإطارات (بدل عقد عقد بالتسلسل)، مقابل بعض التكرار غير المؤذي (كل فريم
   * يمر على كل الصفحات، بس يتخطى أي عقد سبق فريم ثاني عالجه).
   */
  var WORKER_COUNT = 4;

  function runAudit() {
    if (state.running) return Promise.resolve();

    var dateFrom = fromIsoDateLocal(modalEls.fromDateInput.value) || todayMidnight();
    var dateTo = fromIsoDateLocal(modalEls.toDateInput.value) || todayMidnight();
    if (dateFrom.getTime() > dateTo.getTime()) {
      var swap = dateFrom;
      dateFrom = dateTo;
      dateTo = swap;
    }
    state.dateFrom = dateFrom;
    state.dateTo = dateTo;

    state.running = true;
    state.cancelled = false;
    state.results = [];
    state.excludedCrossBranch = [];
    state.skipped = [];

    var processed = {};
    var frames = [];
    var iterCounter = { count: 0 };

    setStatus('جارٍ تحميل قائمة العقود المكتملة هذا الشهر (' + WORKER_COUNT + ' إطارات بالتوازي)...', 'loading');
    if (modalEls) modalEls.startBtn.disabled = true;
    if (modalEls) modalEls.cancelBtn.hidden = false;

    function finishAll() {
      frames.forEach(function (f) {
        try { if (f && f.isConnected) f.remove(); } catch (err) { /* تجاهل */ }
      });
      state.running = false;
      state.lastRunAt = new Date();
      if (modalEls) {
        modalEls.startBtn.disabled = false;
        modalEls.startBtn.textContent = '🔍 إعادة الفحص';
        modalEls.cancelBtn.hidden = true;
      }
      renderResults();
    }

    // تحت التشغيل بالتوازي (٤ إطارات) يصير الخادم أبطأ أحياناً فتنتهي مهلة
    // انتظار صفحة تفاصيل عقد معيّن قبل ما تكتمل. بدل ما نستسلم من أول مرة،
    // نرجع للقائمة ونعيد محاولة نفس العقد (بالبحث عنه برقم الحجز بالصفحة
    // الحالية) حتى MAX_DETAIL_ATTEMPTS مرات قبل ما نعتبره "تعذّر فحصه" فعلياً.
    var MAX_DETAIL_ATTEMPTS = 4;

    function visitRowAndRecord(frame, found, attempt) {
      attempt = attempt || 1;
      try {
        found.rowEl.click();
      } catch (err) {
        /* العنصر تعطّل - نكمل لمحاولة إعادة البحث أدناه */
      }
      return waitForDetailReady(frame).then(function (detailDoc) {
        if (detailDoc) {
          var groupText = extractGroupFromDetail(detailDoc) || 'غير محدد';
          var dropoffLoc = extractTestIdText(detailDoc, 'drop-off-location');
          var pickupLoc = extractTestIdText(detailDoc, 'pickup-location');
          var sameLocation = dropoffLoc && pickupLoc && normalizeArabic(dropoffLoc) === normalizeArabic(pickupLoc);
          if (sameLocation) {
            state.results.push({ group: groupText, plate: found.plate, bookingNumber: found.bookingNumber, agreementNo: found.agreementNo });
          } else {
            state.excludedCrossBranch.push({ plate: found.plate, bookingNumber: found.bookingNumber, dropoffLocation: dropoffLoc });
          }
          try { frame.contentWindow.history.back(); } catch (err) { /* تجاهل */ }
          return waitForListReady(frame);
        }

        // فشلت هذي المحاولة - نرجع للقائمة ونجرّب من جديد قبل ما نستسلم
        try { frame.contentWindow.history.back(); } catch (err) { /* تجاهل */ }
        return waitForListReady(frame).then(function (listDoc) {
          if (!listDoc) return null;
          if (attempt >= MAX_DETAIL_ATTEMPTS) {
            state.skipped.push(found);
            return listDoc;
          }
          var freshRow = findRowByBookingNumber(listDoc, found.bookingNumber);
          if (!freshRow) {
            state.skipped.push(found);
            return listDoc;
          }
          setStatus('إعادة محاولة فحص العقد #' + found.bookingNumber + ' (محاولة ' + (attempt + 1) + ')...', 'loading');
          return visitRowAndRecord(frame, freshRow, attempt + 1);
        });
      });
    }

    function runWorker() {
      var frame = openHiddenFrame(COMPLETED_MONTH_URL);
      frames.push(frame);

      function step(doc) {
        if (state.cancelled) return Promise.resolve();
        iterCounter.count++;
        if (iterCounter.count > MAX_ITERATIONS || processedCount(processed) > MAX_ROWS) {
          return Promise.resolve();
        }

        var found = findFirstMatchingUnprocessedRow(doc, processed, dateFrom, dateTo);
        if (found) {
          processed[found.bookingNumber] = true;
          var doneSoFar = state.results.length + state.excludedCrossBranch.length + state.skipped.length + 1;
          setStatus('جارٍ فحص العقد #' + found.bookingNumber + ' (' + doneSoFar + ')...', 'loading');
          return visitRowAndRecord(frame, found).then(function (newDoc) {
            if (!newDoc) return;
            renderResults(); // عرض حي أثناء الفحص
            return step(newDoc);
          });
        }

        var nextControl = findNextPageControl(doc);
        if (!nextControl || isControlDisabled(nextControl)) {
          return Promise.resolve();
        }
        try {
          nextControl.click();
        } catch (err) {
          return Promise.resolve();
        }
        return waitForListReady(frame).then(function (newDoc) {
          return newDoc ? step(newDoc) : undefined;
        });
      }

      return waitForListReady(frame, 20000).then(function (doc) {
        return doc ? step(doc) : undefined;
      });
    }

    var workers = [];
    for (var i = 0; i < WORKER_COUNT; i++) {
      workers.push(runWorker());
    }
    return Promise.all(workers).then(finishAll);
  }

  function handleCancel() {
    state.cancelled = true;
    setStatus('جارٍ إيقاف الفحص...', 'loading');
  }

  // ==========================================================
  // تجميع النتائج حسب المجموعة + عرضها
  // ==========================================================

  function buildGroupCounts(results) {
    var byGroup = {};
    results.forEach(function (r) {
      if (!byGroup[r.group]) byGroup[r.group] = [];
      byGroup[r.group].push(r.plate || r.bookingNumber);
    });
    return Object.keys(byGroup)
      .map(function (group) { return { group: group, count: byGroup[group].length, plates: byGroup[group] }; })
      .sort(function (a, b) { return a.group.localeCompare(b.group, 'ar'); });
  }

  function renderResults() {
    if (!modalEls) return;

    var groups = buildGroupCounts(state.results);

    var tbody = modalEls.table.querySelector('tbody');
    var tfoot = modalEls.table.querySelector('tfoot');
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    if (groups.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = 2;
      emptyCell.className = 'yqa-empty';
      emptyCell.textContent = state.running ? 'جارٍ الفحص...' : 'لا توجد نتائج بعد - اضغط "بدء الفحص"';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      groups.forEach(function (g) {
        var tr = document.createElement('tr');
        var groupTd = document.createElement('td');
        groupTd.className = 'yqa-group-cell';
        groupTd.textContent = g.group;
        var countTd = document.createElement('td');
        countTd.className = 'yqa-count-cell';
        countTd.textContent = g.count;
        countTd.title = g.plates.join('، ');
        tr.appendChild(groupTd);
        tr.appendChild(countTd);
        tbody.appendChild(tr);
      });
    }

    var totalTr = document.createElement('tr');
    totalTr.className = 'yqa-totals-row';
    var totalGroupTd = document.createElement('td');
    totalGroupTd.textContent = 'الإجمالي';
    var totalCountTd = document.createElement('td');
    totalCountTd.className = 'yqa-count-cell';
    totalCountTd.textContent = state.results.length;
    totalTr.appendChild(totalGroupTd);
    totalTr.appendChild(totalCountTd);
    tfoot.appendChild(totalTr);

    var rangeLabel = state.dateFrom && state.dateTo
      ? (toIsoDateLocal(state.dateFrom) === toIsoDateLocal(state.dateTo)
          ? toIsoDateLocal(state.dateFrom)
          : toIsoDateLocal(state.dateFrom) + ' → ' + toIsoDateLocal(state.dateTo))
      : '';
    modalEls.summaryEl.textContent =
      (rangeLabel ? 'المدى: ' + rangeLabel + ' | ' : '') +
      'مطابق (نفس موقع الفرع): ' + state.results.length +
      ' | مستبعد (موقع تسليم مختلف): ' + state.excludedCrossBranch.length +
      ' | تعذّر فحصه: ' + state.skipped.length;

    if (!state.running) {
      setStatus(
        state.lastRunAt
          ? 'اكتمل الفحص: ' + state.lastRunAt.toLocaleTimeString('ar-SA')
          : '',
        state.lastRunAt ? 'success' : ''
      );
    }
  }

  // ==========================================================
  // نسخ / واتساب
  // ==========================================================

  function tableToTsv() {
    var lines = ['المجموعة\tالعدد'];
    modalEls.table.querySelectorAll('tbody tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      if (cells.length < 2) return;
      lines.push(cells[0].textContent.trim() + '\t' + cells[1].textContent.trim());
    });
    var footCells = modalEls.table.querySelectorAll('tfoot td');
    if (footCells.length >= 2) {
      lines.push(footCells[0].textContent.trim() + '\t' + footCells[1].textContent.trim());
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

  // ==========================================================
  // بناء واجهة المستخدم (Modal)
  // ==========================================================

  function injectStyles() {
    if (document.getElementById('yqa-verify-styles')) return;
    var style = document.createElement('style');
    style.id = 'yqa-verify-styles';
    style.textContent = MODAL_CSS;
    document.head.appendChild(style);
  }

  function buildModalOnce() {
    if (modalEls) return;
    injectStyles();

    var overlay = document.createElement('div');
    overlay.id = 'yqa-verify-overlay';
    overlay.className = 'yqa-overlay';

    var modal = document.createElement('div');
    modal.className = 'yqa-modal';
    modal.dir = 'rtl';

    modal.innerHTML =
      '<header class="yqa-header">' +
      '  <div class="yqa-header-titles">' +
      '    <h2>✅ تحقق من المسترجعة فعلياً</h2>' +
      '    <div class="yqa-stat-badge">يفحص العقود المكتملة باليوم أو المدى المختار عقداً عقداً ويستثني تسليم فرع آخر</div>' +
      '  </div>' +
      '  <button type="button" class="yqa-close" aria-label="إغلاق">✕</button>' +
      '</header>' +
      '<div class="yqa-filters">' +
      '  <label class="yqa-date-field">من <input type="date" class="yqa-date-input" id="yqa-date-from"></label>' +
      '  <label class="yqa-date-field">إلى <input type="date" class="yqa-date-input" id="yqa-date-to"></label>' +
      '</div>' +
      '<div class="yqa-toolbar">' +
      '  <div class="yqa-actions">' +
      '    <button type="button" class="yqa-start-btn" data-action="start">🔍 بدء الفحص</button>' +
      '    <button type="button" class="yqa-cancel-btn" data-action="cancel" hidden>⏹️ إيقاف</button>' +
      '    <button type="button" data-action="copy">📋 نسخ الجدول</button>' +
      '  </div>' +
      '</div>' +
      '<div class="yqa-summary" id="yqa-summary"></div>' +
      '<div class="yqa-table-wrapper">' +
      '  <table class="yqa-table"><thead><tr><th>المجموعة</th><th>العدد</th></tr></thead><tbody></tbody><tfoot></tfoot></table>' +
      '</div>' +
      '<div class="yqa-status" id="yqa-status"></div>';

    modal.querySelector('[data-action="start"]').addEventListener('click', runAudit);
    modal.querySelector('[data-action="cancel"]').addEventListener('click', handleCancel);
    modal.querySelector('[data-action="copy"]').addEventListener('click', handleCopy);
    modal.querySelector('.yqa-close').addEventListener('click', hideModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('yqa-overlay--open')) hideModal();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modalEls = {
      overlay: overlay,
      modal: modal,
      table: modal.querySelector('.yqa-table'),
      startBtn: modal.querySelector('.yqa-start-btn'),
      cancelBtn: modal.querySelector('.yqa-cancel-btn'),
      summaryEl: modal.querySelector('#yqa-summary'),
      statusEl: modal.querySelector('#yqa-status'),
      fromDateInput: modal.querySelector('#yqa-date-from'),
      toDateInput: modal.querySelector('#yqa-date-to'),
    };

    // افتراضياً: اليوم فقط (مدى من يوم واحد) - يقدر المستخدم يوسّعه لأي مدى داخل الشهر
    var todayIso = toIsoDateLocal(todayMidnight());
    modalEls.fromDateInput.value = todayIso;
    modalEls.toDateInput.value = todayIso;
  }

  function showModal() {
    modalEls.overlay.classList.add('yqa-overlay--open');
  }

  function hideModal() {
    if (modalEls) modalEls.overlay.classList.remove('yqa-overlay--open');
    // إيقاف أي فحص شغّال بالخلفية حتى ما يستمر بالنقر بعد إغلاق النافذة
    state.cancelled = true;
  }

  function openModal() {
    try {
      buildModalOnce();
      showModal();
      renderResults();
    } catch (error) {
      console.error('[تحقق من المسترجعة فعلياً] خطأ غير متوقع:', error);
      if (modalEls) setStatus('حدث خطأ غير متوقع: ' + error.message, 'error');
    }
  }

  // ==========================================================
  // التنسيقات (CSS)
  // ==========================================================
  var MODAL_CSS =
    '.yqa-overlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;' +
    'background:#0008;padding:24px;font-family:Arial,Tahoma,sans-serif;font-size:16px;}' +
    '.yqa-overlay--open{display:flex;}' +
    '.yqa-modal{background:#fff;color:#1a1a1a;border-radius:16px;position:relative;' +
    'width:min(560px,95vw);height:min(720px,90vh);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;}' +
    '.yqa-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 24px;' +
    'background:#A3E635;color:#1a1a1a;}' +
    '.yqa-header-titles{display:flex;flex-direction:column;align-items:flex-start;gap:4px;}' +
    '.yqa-header h2{margin:0;font-size:19px;font-weight:bold;}' +
    '.yqa-stat-badge{font-size:12px;opacity:.8;}' +
    '.yqa-close{background:transparent;border:0;font-size:20px;cursor:pointer;color:inherit;line-height:1;padding:8px;border-radius:8px;flex-shrink:0;}' +
    '.yqa-close:hover{background:rgba(0,0,0,.08);}' +
    '.yqa-filters{display:flex;flex-wrap:wrap;gap:16px;padding:12px 24px;background:#fafafa;border-bottom:1px solid #eee;}' +
    '.yqa-date-field{display:flex;align-items:center;gap:6px;font-size:13px;color:#555;}' +
    '.yqa-date-input{border:1px solid #ddd;border-radius:6px;padding:6px 8px;font:inherit;color:inherit;}' +
    '.yqa-toolbar{display:flex;align-items:center;padding:14px 24px;border-bottom:1px solid #eee;}' +
    '.yqa-actions{display:flex;flex-wrap:wrap;gap:8px;}' +
    '.yqa-actions button{cursor:pointer;border:none;background:#eee;color:#333;' +
    'padding:10px 16px;border-radius:8px;font-size:14px;transition:background .15s;}' +
    '.yqa-actions button:hover{background:#e2e2e2;}' +
    '.yqa-actions button:disabled{opacity:.5;cursor:not-allowed;}' +
    '.yqa-start-btn{background:#78B500 !important;color:#fff !important;font-weight:bold;}' +
    '.yqa-start-btn:hover{background:#699e00 !important;}' +
    '.yqa-cancel-btn{background:#fee2e2 !important;color:#b91c1c !important;}' +
    '.yqa-summary{padding:10px 24px;font-size:12.5px;opacity:.75;border-bottom:1px solid #f0f0f0;}' +
    '.yqa-table-wrapper{overflow:auto;flex:1;padding:0 24px;}' +
    '.yqa-table{width:100%;border-collapse:collapse;font-size:15px;}' +
    '.yqa-table th,.yqa-table td{padding:10px 14px;text-align:center;border-bottom:1px solid #eee;}' +
    '.yqa-table thead th{position:sticky;top:0;background:#f5f5f5;font-weight:bold;font-size:14px;}' +
    '.yqa-group-cell{font-weight:bold;font-size:16px;text-align:start;}' +
    '.yqa-count-cell{font-weight:bold;}' +
    '.yqa-totals-row{font-weight:bold;background-color:#f5f5f5;}' +
    '.yqa-empty{padding:32px !important;opacity:.7;font-size:15px;}' +
    '.yqa-status{padding:12px 24px;font-size:13px;min-height:20px;opacity:.85;display:flex;align-items:center;gap:8px;}' +
    '.yqa-status--loading{color:#2563eb;}' +
    '.yqa-status--success{color:#16a34a;}' +
    '.yqa-status--error{color:#dc2626;}' +
    '.yqa-spinner{width:14px;height:14px;border:2px solid currentColor;border-left-color:transparent;' +
    'border-radius:50%;display:inline-block;flex:none;animation:yqa-spin .7s linear infinite;}' +
    '@keyframes yqa-spin{to{transform:rotate(360deg);}}';

  // ==========================================================
  // التسجيل في نظام الأدوات (Core) - بدون أي تعديل عليه
  // ==========================================================
  HOST_WINDOW.YAQEEN_TOOLS.add({
    id: 'verify-returned-vehicles',
    name: '✅ تحقق من المسترجعة فعلياً',
    run: function () {
      openModal();
    },
  });
})();
