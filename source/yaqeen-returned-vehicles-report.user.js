// ==UserScript==
// @name         Yaqeen - تقرير السيارات المسترجعة
// @namespace    yaqeen-tools
// @version      1.0.0
// @description  أداة داخل نظام Yaqeen تعرض السيارات المستأجرة القادمة للتسليم، مجمّعة حسب المجموعة (إجمالي + تفصيل حسب فرع التسليم)، مع فلاتر تاريخ وفروع
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
 * أداة "تقرير السيارات المسترجعة"
 * ------------------------------------------------------------
 * أداة مستقلة تُسجَّل داخل نظام الأدوات الحالي عبر YAQEEN_TOOLS.add()
 * ولا تُعدّل أي شيء في الـ Core أو بقية الأدوات.
 *
 * مصدر البيانات: صفحة السيارات المستأجرة (rented) - كل السيارات المستأجرة
 * حالياً، سواء راح تتسلم بنفس الفرع أو بفرع مختلف. تُقرأ عبر iframe مخفي من
 * نفس النطاق (بدون أي API خارجي)، وتُستخرج البيانات مباشرة من جدول HTML.
 */
(function () {
  'use strict';

  var HOST_WINDOW = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

  if (!HOST_WINDOW.YAQEEN_TOOLS || typeof HOST_WINDOW.YAQEEN_TOOLS.add !== 'function') {
    console.error('[تقرير السيارات المسترجعة] لم يتم العثور على YAQEEN_TOOLS، الأداة لن تعمل.');
    return;
  }

  // ==========================================================
  // إعدادات ثابتة
  // ==========================================================
  var PAGE_SIZE = 500;
  var RETURNED_URL =
    'https://yaqeen.lumirental.com/rental/vehicles/rented?pageSize=' +
    PAGE_SIZE +
    '&sort=dropoffDate&order=desc&pageNumber=0';

  var SAME_BRANCH_LABEL = 'نفس الفرع';

  var WEEKDAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  /**
   * شرائح فلتر التاريخ: "متأخر" (تاريخ تسليم فات ولسا ما تسلمت)، "اليوم"،
   * "غداً"، ثم 5 أيام قادمة بترتيبها الحقيقي، وأخيراً "لاحقاً" (أبعد من ٧ أيام).
   */
  function buildDayChips() {
    var chips = ['متأخر', 'اليوم', 'غداً'];
    var cursor = (new Date().getDay() + 2) % 7; // اليوم اللي بعد "غداً" مباشرة
    for (var i = 0; i < 5; i++) {
      chips.push(WEEKDAY_NAMES[cursor]);
      cursor = (cursor + 1) % 7;
    }
    chips.push('لاحقاً');
    return chips;
  }
  var DAY_CHIPS = buildDayChips();

  // إعدادات بوت واتساب (VPS خاص بالمستخدم)
  var WHATSAPP_CONFIG = {
    apiUrl: 'https://api.yaqeen-vip.space/send',
    apiKey: 'Firas_2026_SuperSecret_Key',
    target: '120363021290047142@g.us',
  };

  // أسماء الأعمدة المطلوب البحث عنها داخل رأس الجدول (مع تحمّل اختلاف الترتيب)
  var RETURNED_COLUMNS_MAP = {
    plate: ['رقم اللوحة'],
    vehicle: ['المركبة'],
    year: ['سنة'],
    group: ['المجموعة'],
    color: ['لون'],
    bookingNo: ['رقم الحجز'],
    dropoffBranch: ['فرع التسليم'],
    dropoffText: ['تاريخ التسليم'],
  };
  var GROUP_COLUMN_HINT = ['المجموعة'];

  // ==========================================================
  // الحالة
  // ==========================================================
  var state = {
    dataLoaded: false,
    lastUpdated: null,
    rows: [], // [{plate, vehicle, year, group, color, bookingNo, branch, dayLabel}]
    selectedDays: new Set(['اليوم']),
    selectedBranches: null, // null = كل الفروع (لسا ما هيّئت القائمة)
    branchesInitialized: false,
    sort: { key: 'group', dir: 1 },
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
    modalEls.statusEl.className = 'yqv-status' + (type ? ' yqv-status--' + type : '');
    if (type === 'loading') {
      modalEls.statusEl.innerHTML = '<span class="yqv-spinner" aria-hidden="true"></span><span>' + escapeHtml(message || '') + '</span>';
    } else {
      modalEls.statusEl.textContent = message || '';
    }
  }

  // ==========================================================
  // تحميل صفحة أخرى من نفس الموقع عبر iframe مخفي + ترقيم الصفحات
  // (نفس آلية أداة "تقرير الحجوزات القادمة" بالضبط)
  // ==========================================================

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

  function openHiddenFrame(url) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:820px;height:560px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    return iframe;
  }

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
        var table = findDataTable(doc, columnsMap.group || GROUP_COLUMN_HINT);
        var hasRows = table && table.querySelectorAll('tbody tr').length > 0;
        if (hasRows || Date.now() - start > timeoutMs) {
          resolve(doc);
          return;
        }
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
  // تحليل تاريخ التسليم إلى شريحة يوم (نفس شرائح DAY_CHIPS)
  // ==========================================================

  /** يستخرج تاريخ/وقت التسليم من نص الخلية (ثلاث صيغ محتملة تعرضها يقين) */
  function parseDropoffDateOnly(text) {
    text = (text || '').trim();
    var now = new Date();
    var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // "اليوم - HH:MM" أو "غداً - HH:MM"
    var relMatch = /^(اليوم|غدا ?ً?)\s*-/.exec(text);
    if (relMatch) {
      var isToday = normalizeArabic(relMatch[1]) === normalizeArabic('اليوم');
      var d = new Date(todayMid);
      d.setDate(d.getDate() + (isToday ? 0 : 1));
      return d;
    }

    // "DD-MM-YYYY" (يُستخدم للتواريخ البعيدة والمتأخرة/الفائتة على حدٍ سواء)
    var dateMatch = /(\d{1,2})-(\d{1,2})-(\d{4})/.exec(text);
    if (dateMatch) {
      var day = parseInt(dateMatch[1], 10);
      var month = parseInt(dateMatch[2], 10);
      var year = parseInt(dateMatch[3], 10);
      return new Date(year, month - 1, day);
    }

    return null;
  }

  /** يحوّل تاريخ التسليم (بدون وقت) إلى اسم الشريحة المطابقة في DAY_CHIPS */
  function dayBucketLabel(dateOnly) {
    if (!dateOnly) return 'غير محدد';
    var now = new Date();
    var todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var diffDays = Math.round((dateOnly - todayMid) / 86400000);
    if (diffDays < 0) return 'متأخر';
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'غداً';
    if (diffDays <= 6) return WEEKDAY_NAMES[dateOnly.getDay()];
    return 'لاحقاً';
  }

  /** يحوّل السجلات الخام المجموعة من كل صفحات الجدول إلى صفوف تقرير */
  function parseReturnedFromRecords(rawRecords) {
    return rawRecords
      .filter(function (r) { return r.group; })
      .map(function (r) {
        var branchRaw = (r.dropoffBranch || '').trim();
        var branch = !branchRaw || normalizeArabic(branchRaw) === normalizeArabic(SAME_BRANCH_LABEL)
          ? SAME_BRANCH_LABEL
          : branchRaw;
        var dateOnly = parseDropoffDateOnly(r.dropoffText);
        return {
          plate: r.plate,
          vehicle: r.vehicle,
          year: r.year,
          group: r.group.trim(),
          color: r.color,
          bookingNo: r.bookingNo,
          branch: branch,
          dropoffText: r.dropoffText,
          dayLabel: dayBucketLabel(dateOnly),
        };
      });
  }

  // ==========================================================
  // تحميل كل البيانات
  // ==========================================================

  function fetchAllData(force) {
    if (state.dataLoaded && !force) return Promise.resolve();

    setStatus('جارٍ تحميل بيانات السيارات المسترجعة...', 'loading');
    showLoadingOverlay();

    var frame = openHiddenFrame(RETURNED_URL);

    return fetchAllRecordsFromFrame(frame, RETURNED_URL, RETURNED_COLUMNS_MAP)
      .then(function (result) {
        state.rows = parseReturnedFromRecords(result.records);
        console.log('[تقرير السيارات المسترجعة] إجمالي السيارات المجمّعة (كل الصفحات):', state.rows.length);

        var discoveredBranches = {};
        state.rows.forEach(function (r) { discoveredBranches[r.branch] = true; });

        if (!state.branchesInitialized) {
          state.selectedBranches = new Set(Object.keys(discoveredBranches));
          state.branchesInitialized = true;
        } else {
          // نضيف أي فرع جديد اكتُشف حديثاً كمُفعّل افتراضياً، بدون لمس اختيارات المستخدم الحالية
          Object.keys(discoveredBranches).forEach(function (b) {
            if (!state.selectedBranches.has(b)) state.selectedBranches.add(b);
          });
        }

        state.dataLoaded = true;
        state.lastUpdated = new Date();
        setStatus('تم التحديث: ' + state.lastUpdated.toLocaleTimeString('ar-SA'), 'success');
        hideLoadingOverlay();
      })
      .catch(function (error) {
        console.error('[تقرير السيارات المسترجعة]', error);
        setStatus('تعذّر تحميل البيانات: ' + error.message, 'error');
        hideLoadingOverlay();
        try {
          if (frame && frame.isConnected) frame.remove();
        } catch (err) {
          /* تجاهل */
        }
        throw error;
      });
  }

  // ==========================================================
  // التجميع حسب المجموعة (إجمالي + تفصيل حسب فرع التسليم)
  // ==========================================================

  function getFilteredRows() {
    var days = state.selectedDays;
    var branches = state.selectedBranches;
    return state.rows.filter(function (r) {
      if (!days.has(r.dayLabel)) return false;
      if (branches && !branches.has(r.branch)) return false;
      return true;
    });
  }

  function buildGroupSummaries(rows) {
    var byGroup = {};
    rows.forEach(function (r) {
      if (!byGroup[r.group]) byGroup[r.group] = { group: r.group, total: 0, byBranch: {} };
      var g = byGroup[r.group];
      g.total++;
      g.byBranch[r.branch] = (g.byBranch[r.branch] || 0) + 1;
    });

    var groups = Object.keys(byGroup).map(function (key) {
      var g = byGroup[key];
      var details = Object.keys(g.byBranch)
        .map(function (branch) { return { branch: branch, count: g.byBranch[branch] }; })
        .sort(function (a, b) {
          if (b.count !== a.count) return b.count - a.count;
          return a.branch.localeCompare(b.branch, 'ar');
        });
      return { group: g.group, total: g.total, details: details };
    });

    groups.sort(function (a, b) {
      if (state.sort.key === 'total') return (b.total - a.total) * state.sort.dir;
      return a.group.localeCompare(b.group, 'ar') * state.sort.dir;
    });

    return groups;
  }

  // ==========================================================
  // بناء الجدول
  // ==========================================================

  function sortIndicator(key) {
    if (state.sort.key !== key) return '';
    return state.sort.dir === 1 ? ' ▲' : ' ▼';
  }

  function onSortClick(key) {
    if (state.sort.key === key) {
      state.sort.dir *= -1;
    } else {
      state.sort.key = key;
      state.sort.dir = key === 'total' ? -1 : 1;
    }
    renderTable();
  }

  function buildGroupRow(group) {
    var tr = document.createElement('tr');
    tr.className = 'yqv-group-row';

    var groupTd = document.createElement('td');
    groupTd.className = 'yqv-group-cell';
    groupTd.textContent = group.group;
    tr.appendChild(groupTd);

    var branchTd = document.createElement('td');
    branchTd.textContent = 'الإجمالي';
    tr.appendChild(branchTd);

    var countTd = document.createElement('td');
    countTd.className = 'yqv-count-cell';
    countTd.textContent = group.total;
    tr.appendChild(countTd);

    return tr;
  }

  function buildDetailRow(detail) {
    var tr = document.createElement('tr');
    tr.className = 'yqv-detail-row' + (detail.branch === SAME_BRANCH_LABEL ? '' : ' yqv-detail-row--cross');

    var groupTd = document.createElement('td');
    tr.appendChild(groupTd);

    var branchTd = document.createElement('td');
    branchTd.className = 'yqv-branch-cell';
    branchTd.textContent = detail.branch;
    tr.appendChild(branchTd);

    var countTd = document.createElement('td');
    countTd.className = 'yqv-count-cell';
    countTd.textContent = detail.count;
    tr.appendChild(countTd);

    return tr;
  }

  function buildTotalsRow(totalCount) {
    var tr = document.createElement('tr');
    tr.className = 'yqv-totals-row';

    var groupTd = document.createElement('td');
    groupTd.textContent = 'الإجمالي الكلي';
    tr.appendChild(groupTd);

    tr.appendChild(document.createElement('td'));

    var countTd = document.createElement('td');
    countTd.className = 'yqv-count-cell';
    countTd.textContent = totalCount;
    tr.appendChild(countTd);

    return tr;
  }

  function getCurrentReportData() {
    var filteredRows = getFilteredRows();
    var groups = buildGroupSummaries(filteredRows);
    return { filteredRows: filteredRows, groups: groups };
  }

  function renderTable() {
    if (!modalEls) return;

    var reportData = getCurrentReportData();
    var groups = reportData.groups;
    var filteredRows = reportData.filteredRows;

    var theadRow = modalEls.table.querySelector('thead tr');
    var tbody = modalEls.table.querySelector('tbody');
    var tfoot = modalEls.table.querySelector('tfoot');
    theadRow.innerHTML = '';
    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    var columns = [
      { key: 'group', label: 'المجموعة' },
      { key: 'branch', label: 'الفرع' },
      { key: 'total', label: 'العدد' },
    ];
    columns.forEach(function (col) {
      var th = document.createElement('th');
      th.textContent = col.label + sortIndicator(col.key);
      if (col.key === 'group' || col.key === 'total') {
        th.addEventListener('click', function () { onSortClick(col.key); });
        th.classList.add('yqv-sortable');
      }
      theadRow.appendChild(th);
    });

    if (groups.length === 0) {
      var emptyRow = document.createElement('tr');
      var emptyCell = document.createElement('td');
      emptyCell.colSpan = columns.length;
      emptyCell.className = 'yqv-empty';
      emptyCell.textContent = 'لا توجد سيارات مطابقة للفلاتر الحالية';
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    } else {
      groups.forEach(function (group) {
        tbody.appendChild(buildGroupRow(group));
        group.details.forEach(function (detail) {
          tbody.appendChild(buildDetailRow(detail));
        });
      });
    }

    tfoot.appendChild(buildTotalsRow(filteredRows.length));

    modalEls.totalMatchedEl.textContent = filteredRows.length;
    modalEls.totalAllEl.textContent = state.rows.length;
  }

  // ==========================================================
  // الإجراءات: تحديث / نسخ / تصدير / طباعة / واتساب
  // ==========================================================

  function handleRefresh() {
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
      lines.push(Array.prototype.map.call(cells, function (td) { return td.textContent.trim(); }).join('\t'));
    });

    var footCells = modalEls.table.querySelectorAll('tfoot td');
    if (footCells.length) {
      lines.push(Array.prototype.map.call(footCells, function (td) { return td.textContent.trim(); }).join('\t'));
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
          .call(cells, function (td) { return '<td>' + escapeHtml(td.textContent.trim()) + '</td>'; })
          .join('');
        return '<tr>' + rowHtml + '</tr>';
      })
      .join('');

    var footCells = modalEls.table.querySelectorAll('tfoot td');
    var footHtml = footCells.length
      ? '<tr>' +
        Array.prototype.map
          .call(footCells, function (td) { return '<td><b>' + escapeHtml(td.textContent.trim()) + '</b></td>'; })
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
    link.download = 'تقرير-السيارات-المسترجعة-' + dateStr + '.xls';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatus('تم تصدير الملف بنجاح', 'success');
  }

  var TABLE_EXPORT_CSS =
    '*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box;}' +
    'body{font-family:Tahoma,Arial,sans-serif;color:#111;background:#fff;margin:0;}' +
    'h1{font-size:20px;margin:0 0 4px;}' +
    '.yqv-print-meta{color:#555;font-size:13px;margin-bottom:16px;}' +
    'table{border-collapse:collapse;width:100%;font-size:13px;}' +
    'th,td{border:1px solid #999;padding:6px 10px;text-align:center;white-space:nowrap;}' +
    'th{background:#f0f0f0;}' +
    '.yqv-totals-row{font-weight:bold;background:#f0f0f0;}' +
    '.yqv-group-cell{font-weight:bold;}';

  function buildStaticTableHtml() {
    return modalEls.table.outerHTML;
  }

  function buildReportMetaHtml() {
    var now = new Date().toLocaleString('ar-SA');
    var daysLabel = DAY_CHIPS.filter(function (d) { return state.selectedDays.has(d); }).join('، ') || '—';
    var branchesLabel =
      state.selectedBranches && state.selectedBranches.size > 0
        ? Array.from(state.selectedBranches).join('، ')
        : 'كل الفروع';
    return (
      '<h1>📦 تقرير السيارات المسترجعة</h1>' +
      '<div class="yqv-print-meta">' + escapeHtml(now) +
      ' | الأيام: ' + escapeHtml(daysLabel) +
      ' | الفروع: ' + escapeHtml(branchesLabel) +
      ' | عدد السيارات المطابقة: ' + escapeHtml(String(getFilteredRows().length)) + '</div>'
    );
  }

  function handlePrint() {
    var printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      setStatus('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير', 'error');
      return;
    }

    var printHtml =
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير السيارات المسترجعة</title>' +
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

            var TARGET_DATA_URL_LENGTH = 8000000;
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
                    '[تقرير السيارات المسترجعة] حجم صورة الإرسال: ~' +
                      Math.round((dataUrl.length * 0.75) / 1024) +
                      'KB (scale=' + scales[s] + ', quality=' + qualities[q] + ')'
                  );
                  break outer;
                }
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
            Authorization: WHATSAPP_CONFIG.apiKey,
            'Content-Type': 'application/json',
          },
          data: JSON.stringify({
            target: WHATSAPP_CONFIG.target,
            type: 'image',
            imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ''),
            caption: '📦 تقرير السيارات المسترجعة - ' + new Date().toLocaleString('ar-SA'),
          }),
          onload: function (response) {
            if (response.status >= 200 && response.status < 300) {
              setStatus('تم إرسال صورة التقرير عبر واتساب بنجاح', 'success');
            } else if (response.status === 413) {
              console.error('[تقرير السيارات المسترجعة] فشل إرسال واتساب: 413', response.responseText);
              setStatus('فشل الإرسال: السيرفر يرفض حجم الصورة (413)', 'error');
            } else {
              console.error('[تقرير السيارات المسترجعة] فشل إرسال واتساب:', response.status, response.responseText);
              setStatus('فشل إرسال واتساب (رمز الحالة: ' + response.status + ')', 'error');
            }
          },
          onerror: function (error) {
            console.error('[تقرير السيارات المسترجعة] تعذّر الاتصال ببوت واتساب:', error);
            setStatus('تعذّر الاتصال بخادم بوت واتساب', 'error');
          },
        });
      })
      .catch(function (err) {
        console.error('[تقرير السيارات المسترجعة] تعذّر إنشاء صورة التقرير:', err);
        setStatus('تعذّر إنشاء صورة التقرير: ' + err.message, 'error');
      });
  }

  // ==========================================================
  // بناء واجهة المستخدم (Modal)
  // ==========================================================

  function injectStyles() {
    if (document.getElementById('yqv-returned-report-styles')) return;
    var style = document.createElement('style');
    style.id = 'yqv-returned-report-styles';
    style.textContent = MODAL_CSS;
    document.head.appendChild(style);
  }

  function buildDayChip(day) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'yqv-chip' + (state.selectedDays.has(day) ? ' yqv-chip--active' : '');
    chip.textContent = day;
    chip.addEventListener('click', function () {
      if (state.selectedDays.has(day)) {
        if (state.selectedDays.size === 1) return; // يبقى يوم واحد مختار على الأقل
        state.selectedDays.delete(day);
        chip.classList.remove('yqv-chip--active');
      } else {
        state.selectedDays.add(day);
        chip.classList.add('yqv-chip--active');
      }
      renderTable();
    });
    return chip;
  }

  function renderBranchChips() {
    if (!modalEls) return;
    var container = modalEls.branchChipsEl;
    container.innerHTML = '';

    var allBranches = Array.from(
      state.rows.reduce(function (set, r) { set.add(r.branch); return set; }, new Set())
    ).sort(function (a, b) {
      if (a === SAME_BRANCH_LABEL) return -1;
      if (b === SAME_BRANCH_LABEL) return 1;
      return a.localeCompare(b, 'ar');
    });

    allBranches.forEach(function (branch) {
      var chip = document.createElement('button');
      chip.type = 'button';
      var isActive = state.selectedBranches && state.selectedBranches.has(branch);
      chip.className = 'yqv-chip' + (isActive ? ' yqv-chip--active' : '');
      chip.textContent = branch;
      chip.addEventListener('click', function () {
        if (!state.selectedBranches) state.selectedBranches = new Set();
        if (state.selectedBranches.has(branch)) {
          state.selectedBranches.delete(branch);
          chip.classList.remove('yqv-chip--active');
        } else {
          state.selectedBranches.add(branch);
          chip.classList.add('yqv-chip--active');
        }
        renderTable();
      });
      container.appendChild(chip);
    });
  }

  function handleSelectAllBranches() {
    var allBranches = state.rows.reduce(function (set, r) { set.add(r.branch); return set; }, new Set());
    state.selectedBranches = allBranches;
    renderBranchChips();
    renderTable();
  }

  function handleClearAllBranches() {
    state.selectedBranches = new Set();
    renderBranchChips();
    renderTable();
  }

  function buildModalOnce() {
    if (modalEls) return;
    injectStyles();

    var overlay = document.createElement('div');
    overlay.id = 'yqv-returned-report-overlay';
    overlay.className = 'yqv-overlay';

    var modal = document.createElement('div');
    modal.className = 'yqv-modal';
    modal.dir = 'rtl';

    modal.innerHTML =
      '<header class="yqv-header">' +
      '  <div class="yqv-header-titles">' +
      '    <h2>📦 تقرير السيارات المسترجعة</h2>' +
      '    <div class="yqv-stat-badge">مطابق للفلتر: <strong id="yqv-total-matched">0</strong> من أصل <strong id="yqv-total-all">0</strong></div>' +
      '  </div>' +
      '  <button type="button" class="yqv-close" aria-label="إغلاق">✕</button>' +
      '</header>' +
      '<div class="yqv-toolbar">' +
      '  <div class="yqv-actions">' +
      '    <button type="button" data-action="refresh">🔄 تحديث البيانات</button>' +
      '    <button type="button" data-action="copy">📋 نسخ الجدول</button>' +
      '    <button type="button" data-action="export">📊 تصدير Excel</button>' +
      '    <button type="button" data-action="print">🖨️ طباعة التقرير</button>' +
      '    <button type="button" data-action="whatsapp">📱 إرسال صورة واتساب</button>' +
      '  </div>' +
      '</div>' +
      '<div class="yqv-filters">' +
      '  <div class="yqv-filter-group yqv-filter-group--grow">' +
      '    <span class="yqv-filter-label">تاريخ التسليم</span>' +
      '    <div class="yqv-day-chips"></div>' +
      '  </div>' +
      '  <div class="yqv-filter-divider" aria-hidden="true"></div>' +
      '  <div class="yqv-filter-group yqv-filter-group--grow">' +
      '    <span class="yqv-filter-label">فرع التسليم' +
      '      <button type="button" class="yqv-mini-btn" data-action="select-all-branches">تحديد الكل</button>' +
      '      <button type="button" class="yqv-mini-btn" data-action="clear-all-branches">إلغاء التحديد</button>' +
      '    </span>' +
      '    <div class="yqv-branch-chips"></div>' +
      '  </div>' +
      '</div>' +
      '<div class="yqv-table-wrapper">' +
      '  <table class="yqv-table"><thead><tr></tr></thead><tbody></tbody><tfoot><tr></tr></tfoot></table>' +
      '  <div class="yqv-loading-overlay" id="yqv-loading-overlay">' +
      '    <div class="yqv-spinner-lg" aria-hidden="true"></div>' +
      '    <div>جارٍ تحميل البيانات...</div>' +
      '  </div>' +
      '</div>' +
      '<div class="yqv-status" id="yqv-status"></div>';

    var chipsContainer = modal.querySelector('.yqv-day-chips');
    DAY_CHIPS.forEach(function (day) {
      chipsContainer.appendChild(buildDayChip(day));
    });

    modal.querySelector('[data-action="refresh"]').addEventListener('click', handleRefresh);
    modal.querySelector('[data-action="copy"]').addEventListener('click', handleCopy);
    modal.querySelector('[data-action="export"]').addEventListener('click', handleExportExcel);
    modal.querySelector('[data-action="print"]').addEventListener('click', handlePrint);
    modal.querySelector('[data-action="whatsapp"]').addEventListener('click', handleSendWhatsApp);
    modal.querySelector('[data-action="select-all-branches"]').addEventListener('click', handleSelectAllBranches);
    modal.querySelector('[data-action="clear-all-branches"]').addEventListener('click', handleClearAllBranches);

    modal.querySelector('.yqv-close').addEventListener('click', hideModal);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) hideModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('yqv-overlay--open')) hideModal();
    });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    modalEls = {
      overlay: overlay,
      modal: modal,
      table: modal.querySelector('.yqv-table'),
      totalMatchedEl: modal.querySelector('#yqv-total-matched'),
      totalAllEl: modal.querySelector('#yqv-total-all'),
      statusEl: modal.querySelector('#yqv-status'),
      loadingOverlayEl: modal.querySelector('#yqv-loading-overlay'),
      branchChipsEl: modal.querySelector('.yqv-branch-chips'),
    };
  }

  function showLoadingOverlay() {
    if (modalEls && modalEls.loadingOverlayEl) modalEls.loadingOverlayEl.classList.add('yqv-loading-overlay--visible');
  }

  function hideLoadingOverlay() {
    if (modalEls && modalEls.loadingOverlayEl) modalEls.loadingOverlayEl.classList.remove('yqv-loading-overlay--visible');
  }

  function showModal() {
    modalEls.overlay.classList.add('yqv-overlay--open');
  }

  function hideModal() {
    if (modalEls) modalEls.overlay.classList.remove('yqv-overlay--open');
  }

  function openModal() {
    try {
      buildModalOnce();
      showModal();
      renderBranchChips();
      renderTable();
      fetchAllData(false)
        .then(function () {
          renderBranchChips();
          renderTable();
        })
        .catch(function () { renderTable(); });
    } catch (error) {
      console.error('[تقرير السيارات المسترجعة] خطأ غير متوقع:', error);
      if (modalEls) setStatus('حدث خطأ غير متوقع: ' + error.message, 'error');
    }
  }

  // ==========================================================
  // التنسيقات (CSS)
  // ==========================================================
  var MODAL_CSS =
    '.yqv-overlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;' +
    'background:#0008;padding:24px;font-family:Arial,Tahoma,sans-serif;font-size:16px;}' +
    '.yqv-overlay--open{display:flex;}' +
    '.yqv-modal{background:#fff;color:#1a1a1a;border-radius:16px;position:relative;' +
    'width:min(1200px,97vw);height:min(880px,94vh);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;}' +
    '.yqv-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 28px;' +
    'background:#A3E635;color:#1a1a1a;}' +
    '.yqv-header-titles{display:flex;flex-direction:column;align-items:flex-start;gap:4px;}' +
    '.yqv-header h2{margin:0;font-size:20px;font-weight:bold;}' +
    '.yqv-stat-badge{font-size:13px;opacity:.85;}' +
    '.yqv-stat-badge strong{font-weight:bold;}' +
    '.yqv-close{background:transparent;border:0;font-size:20px;cursor:pointer;color:inherit;line-height:1;padding:8px;border-radius:8px;flex-shrink:0;}' +
    '.yqv-close:hover{background:rgba(0,0,0,.08);}' +
    '.yqv-toolbar{display:flex;align-items:center;padding:14px 28px;border-bottom:1px solid #eee;}' +
    '.yqv-actions{display:flex;flex-wrap:wrap;gap:8px;}' +
    '.yqv-actions button{cursor:pointer;border:none;background:#eee;color:#333;' +
    'padding:10px 16px;border-radius:8px;font-size:14px;transition:background .15s;}' +
    '.yqv-actions button:hover{background:#e2e2e2;}' +
    '.yqv-filters{display:flex;flex-wrap:wrap;align-items:flex-start;gap:24px;padding:16px 28px;' +
    'background:#fafafa;border-bottom:1px solid #eee;}' +
    '.yqv-filter-group{display:flex;flex-direction:column;gap:8px;}' +
    '.yqv-filter-group--grow{flex:1;min-width:260px;}' +
    '.yqv-filter-label{font-size:12.5px;font-weight:bold;opacity:.6;text-transform:uppercase;letter-spacing:.02em;' +
    'display:flex;align-items:center;gap:8px;}' +
    '.yqv-filter-divider{align-self:stretch;width:1px;background:#e2e2e2;}' +
    '.yqv-mini-btn{cursor:pointer;border:1px solid #ddd;background:#fff;color:#555;' +
    'padding:2px 8px;border-radius:999px;font-size:10.5px;font-weight:normal;text-transform:none;letter-spacing:0;}' +
    '.yqv-mini-btn:hover{background:#f0f0f0;}' +
    '.yqv-day-chips,.yqv-branch-chips{display:flex;flex-wrap:wrap;gap:8px;max-height:90px;overflow-y:auto;}' +
    '.yqv-chip{cursor:pointer;border:1px solid #ddd;background:#fff;color:#333;' +
    'padding:8px 16px;border-radius:999px;font-size:14px;transition:all .15s;white-space:nowrap;}' +
    '.yqv-chip--active{background:#A3E635;border-color:#A3E635;color:#1a1a1a;font-weight:bold;}' +
    '.yqv-table-wrapper{overflow:auto;flex:1;padding:0 28px;position:relative;' +
    'scrollbar-width:auto;scrollbar-color:#9CA3AF #f0f0f0;}' +
    '.yqv-table-wrapper::-webkit-scrollbar{width:14px;height:14px;}' +
    '.yqv-table-wrapper::-webkit-scrollbar-track{background:#f0f0f0;}' +
    '.yqv-table-wrapper::-webkit-scrollbar-thumb{background:#9CA3AF;border-radius:8px;border:3px solid #f0f0f0;}' +
    '.yqv-table-wrapper::-webkit-scrollbar-thumb:hover{background:#6B7280;}' +
    '.yqv-loading-overlay{position:absolute;inset:0;background:rgba(255,255,255,.9);display:none;' +
    'flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:5;font-size:14px;color:#333;}' +
    '.yqv-loading-overlay--visible{display:flex;}' +
    '.yqv-spinner-lg{width:36px;height:36px;border:4px solid #A3E635;border-left-color:transparent;' +
    'border-radius:50%;animation:yqv-spin .8s linear infinite;}' +
    '.yqv-table{width:100%;border-collapse:collapse;font-size:15px;min-width:480px;}' +
    '.yqv-table th,.yqv-table td{padding:10px 16px;text-align:center;border-bottom:1px solid #eee;white-space:nowrap;}' +
    '.yqv-table thead th{position:sticky;top:0;background:#f5f5f5;user-select:none;z-index:3;font-weight:bold;font-size:14px;}' +
    '.yqv-table thead th.yqv-sortable{cursor:pointer;}' +
    '.yqv-table tbody tr.yqv-group-row{background-color:#f9fdf0;font-weight:bold;}' +
    '.yqv-table tbody tr.yqv-detail-row{background-color:#fff;font-size:13.5px;color:#555;}' +
    '.yqv-table tbody tr.yqv-detail-row--cross .yqv-branch-cell{color:#C24A0C;font-weight:bold;}' +
    '.yqv-table tbody tr:hover{background-color:#f0f0f0;}' +
    '.yqv-group-cell{font-weight:bold;font-size:16px;}' +
    '.yqv-branch-cell{padding-inline-start:24px !important;}' +
    '.yqv-count-cell{font-weight:bold;}' +
    '.yqv-totals-row{font-weight:bold;background-color:#f5f5f5 !important;position:sticky;bottom:0;z-index:2;}' +
    '.yqv-empty{padding:32px !important;opacity:.7;font-size:16px;}' +
    '.yqv-status{padding:12px 28px;font-size:13px;min-height:20px;opacity:.85;display:flex;align-items:center;gap:8px;}' +
    '.yqv-status--loading{color:#2563eb;}' +
    '.yqv-status--success{color:#16a34a;}' +
    '.yqv-status--error{color:#dc2626;}' +
    '.yqv-spinner{width:14px;height:14px;border:2px solid currentColor;border-left-color:transparent;' +
    'border-radius:50%;display:inline-block;flex:none;animation:yqv-spin .7s linear infinite;}' +
    '@keyframes yqv-spin{to{transform:rotate(360deg);}}' +
    '@media (max-width:640px){.yqv-toolbar,.yqv-filters{flex-direction:column;align-items:flex-start;}' +
    '.yqv-filter-divider{display:none;}' +
    '.yqv-actions{width:100%;}.yqv-actions button{flex:1;}' +
    '.yqv-header h2{font-size:18px;}.yqv-modal{height:96vh;max-height:96vh;}}';

  // ==========================================================
  // التسجيل في نظام الأدوات (Core) - بدون أي تعديل عليه
  // ==========================================================
  HOST_WINDOW.YAQEEN_TOOLS.add({
    id: 'returned-vehicles-report',
    name: '📦 تقرير السيارات المسترجعة',
    run: function () {
      openModal();
    },
  });
})();
