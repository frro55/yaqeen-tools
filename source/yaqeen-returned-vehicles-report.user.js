// ==UserScript==
// @name         Yaqeen - تقرير السيارات المسترجعة
// @namespace    yaqeen-tools
// @version      2.0.0
// @description  نفس أداة "تقرير الحجوزات القادمة" (حجوزات مقابل سيارات جاهزة لكل مجموعة)، مع إضافة عدد السيارات المسترجعة كل يوم (بنفس الفرع فقط) كمعلومة إضافية تحت كل عمود يوم
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
 * نفس فكرة أداة "تقرير الحجوزات القادمة" بالضبط (حجوزات قادمة مقابل سيارات
 * جاهزة لكل مجموعة، بنسبة إشغال وفرق) - بإضافة مصدر بيانات رابع: صفحة
 * السيارات المستأجرة الحالية (المسترجعة/rented)، نأخذ منها فقط السيارات
 * الراجعة لنفس الفرع (نتجاهل الراجعة لفروع ثانية لأنها ما تفيد فرعك)،
 * ونعرض عددها تحت كل عمود يوم كمعلومة إضافية (بدون التأثير على حساب نسبة
 * الإشغال أو الفرق - هذي محسوبة فقط من السيارات الجاهزة حالياً كما هي).
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
  var BRANCH_LOCATION_ID = 29;
  var YARD_LOCATION_ID = 53;
  var PAGE_SIZE = 500;
  var SAME_BRANCH_LABEL = 'نفس الفرع';
  var MAX_FETCH_ATTEMPTS = 3;

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

  // إعدادات بوت واتساب (VPS خاص بالمستخدم)
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

  // عمود "المجموعة" موجود بكل الجداول الثلاثة، لذلك نستخدمه لتمييز جدول
  // البيانات الحقيقي عن أي جداول أخرى بالصفحة
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
    // تعديلات يدوية لعدد سيارات "الساحة" فقط لكل مجموعة - تُستخدم لإعادة حساب
    // نسبة الإشغال والفرق فوراً بدون أي طلب شبكة جديد
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
    modalEls.statusEl.className = 'yqv-status' + (type ? ' yqv-status--' + type : '');
    if (type === 'loading') {
      modalEls.statusEl.innerHTML = '<span class="yqv-spinner" aria-hidden="true"></span><span>' + escapeHtml(message || '') + '</span>';
    } else {
      modalEls.statusEl.textContent = message || '';
    }
  }

  // ==========================================================
  // تحميل صفحة أخرى من نفس الموقع عبر iframe مخفي (بدون نافذة منبثقة)
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
   * بدل فتح نافذة منبثقة حقيقية.
   */
  function openHiddenFrame(url) {
    var iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:820px;height:560px;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);
    return iframe;
  }

  /** يستنى حتى تظهر أول صفحة بيانات (بمعنى فعلي، مو مجرد صف فاضي) داخل الـiframe */
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
  // ترقيم الصفحات (Pagination)
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

  /** يجمع صفوف كل صفحات الجدول */
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
  // استخراج البيانات من الجداول
  // ==========================================================

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
      .filter(function (r) { return r.group; })
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
      .filter(function (r) { return r.group; })
      .map(function (r) { return r.group.trim(); });
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
  // تشخيص (Console)
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

    console.groupCollapsed('[تقرير السيارات المسترجعة] تشخيص مصدر: ' + label);
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
  function fetchReturnedRecordsWithRetry(attempt) {
    attempt = attempt || 1;
    var frame = openHiddenFrame(URLS.returned);
    return fetchAllRecordsFromFrame(frame, URLS.returned, RETURNED_COLUMNS_MAP).then(function (result) {
      if (result.records.length === 0 && attempt < MAX_FETCH_ATTEMPTS) {
        console.warn('[تقرير السيارات المسترجعة] محاولة جلب المسترجعة ' + attempt + ' رجعت بدون بيانات، إعادة محاولة...');
        return fetchReturnedRecordsWithRetry(attempt + 1);
      }
      return result;
    });
  }

  function fetchAllData(force) {
    if (state.dataLoaded && !force) return Promise.resolve();

    setStatus('جارٍ تحميل بيانات الحجوزات والسيارات...', 'loading');
    showLoadingOverlay();

    var bookingsFrame = openHiddenFrame(URLS.bookings);
    var branchFrame = openHiddenFrame(URLS.vehicles.branch);
    var yardFrame = openHiddenFrame(URLS.vehicles.yard);

    return fetchAllRecordsFromFrame(bookingsFrame, URLS.bookings, BOOKING_COLUMNS_MAP)
      .then(function (result) {
        state.bookings = parseBookingsFromRecords(result.records);
        console.log('[تقرير السيارات المسترجعة] إجمالي الحجوزات المجمّعة (كل الصفحات):', state.bookings.length);
        return fetchAllRecordsFromFrame(branchFrame, URLS.vehicles.branch, VEHICLE_COLUMNS_MAP);
      })
      .then(function (result) {
        var branchVehicles = parseVehiclesFromRecords(result.records);
        logSourceDiagnostics('الفرع', URLS.vehicles.branch, result.doc, branchVehicles);
        state.vehiclesBySource.branch = branchVehicles;
        return fetchAllRecordsFromFrame(yardFrame, URLS.vehicles.yard, VEHICLE_COLUMNS_MAP);
      })
      .then(function (result) {
        var yardVehicles = parseVehiclesFromRecords(result.records);
        logSourceDiagnostics('الساحة', URLS.vehicles.yard, result.doc, yardVehicles);
        state.vehiclesBySource.yard = yardVehicles;
        state.vehiclesBySource.all = state.vehiclesBySource.branch.concat(yardVehicles);

        if (yardVehicles.length === 0) {
          console.warn('[تقرير السيارات المسترجعة] لم يتم العثور على أي مركبة في الساحة');
        }

        return fetchReturnedRecordsWithRetry();
      })
      .then(function (result) {
        state.returns = parseReturnsFromRecords(result.records);
        console.log('[تقرير السيارات المسترجعة] إجمالي السيارات المسترجعة بنفس الفرع (كل الصفحات):', state.returns.length);

        state.dataLoaded = true;
        state.lastUpdated = new Date();
        setStatus('تم التحديث: ' + state.lastUpdated.toLocaleTimeString('ar-SA'), 'success');
        hideLoadingOverlay();
      })
      .catch(function (error) {
        console.error('[تقرير السيارات المسترجعة]', error);
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
    td.className = 'yqv-occupancy-cell' + (extraClassName ? ' ' + extraClassName : '');
    var label = formatPercentLabel(percent);
    td.dataset.copyText = label;

    var level = occupancyLevel(percent);
    var wrapper = document.createElement('div');
    wrapper.className = 'yqv-bar-wrapper yqv-occ-' + level;

    var fill = document.createElement('div');
    fill.className = 'yqv-bar-fill';
    var widthPercent = Number.isFinite(percent) ? Math.max(Math.min(percent, 100), 4) : 100;
    fill.style.width = widthPercent + '%';

    var text = document.createElement('span');
    text.className = 'yqv-bar-text';
    text.textContent = label;

    wrapper.appendChild(fill);
    wrapper.appendChild(text);
    td.appendChild(wrapper);
    return td;
  }

  function buildDifferenceCell(difference) {
    var td = document.createElement('td');
    var sign = difference > 0 ? '+' : '';
    td.textContent = sign + difference;
    td.className = 'yqv-diff-cell ' + (difference > 0 ? 'yqv-diff-positive' : difference < 0 ? 'yqv-diff-negative' : 'yqv-diff-zero');
    return td;
  }

  function buildYardInput(row, onCommit) {
    var input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.className = 'yqv-vehicle-input';
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

  function buildVehiclesCell(row, extraClassName) {
    var td = document.createElement('td');
    td.className = ['yqv-vehicles-cell', extraClassName].filter(Boolean).join(' ');
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
    totalEl.className = 'yqv-vehicles-total';
    totalEl.textContent = row.vehicleCount;
    td.appendChild(totalEl);

    var yardRow = document.createElement('div');
    yardRow.className = 'yqv-yard-edit';
    yardRow.title = 'عدد سيارات الساحة - يُجمع تلقائياً مع أسطول الفرع (' + row.branchCount + ')';

    var yardInput = buildYardInput(row);
    yardInput.classList.add('yqv-yard-input');
    yardRow.appendChild(yardInput);

    var label = document.createElement('span');
    label.className = 'yqv-yard-label';
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
      subEl.className = 'yqv-return-sub';
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
    return col.dividerBefore ? 'yqv-col-divider' : '';
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
        classNames.push('yqv-group-cell');
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
    tr.className = 'yqv-totals-row';

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
    renderTable();
  }

  function yardOverrideKey(group) {
    return 'yard::' + group;
  }

  function getCurrentReportData() {
    var selectedDaysOrdered = getSelectedDaysOrdered();
    var rows = buildReportRows(state.bookings || [], state.vehiclesBySource, state.selectedSource, selectedDaysOrdered, state.vehicleOverrides, state.returns || []);
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
      emptyCell.className = 'yqv-empty';
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
    link.download = 'تقرير-الحجوزات-والمسترجعة-' + dateStr + '.xls';
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
    'table{border-collapse:collapse;width:100%;font-size:12.5px;}' +
    'th,td{border:1px solid #999;padding:6px 8px;text-align:center;white-space:nowrap;}' +
    'th{background:#f0f0f0;}' +
    '.yqv-totals-row{font-weight:bold;background:#f0f0f0;}' +
    '.yqv-group-cell{font-weight:bold;}' +
    '.yqv-vehicle-input{width:52px;border:0;background:transparent;text-align:center;font:inherit;color:inherit;}' +
    '.yqv-bar-wrapper{position:relative;display:block;height:16px;min-width:80px;border-radius:5px;background:#e5e5e5;overflow:hidden;}' +
    '.yqv-bar-fill{position:absolute;inset-inline-start:0;top:0;bottom:0;border-radius:5px;}' +
    '.yqv-occ-good .yqv-bar-fill{background:#22c55e;}' +
    '.yqv-occ-warning .yqv-bar-fill{background:#eab308;}' +
    '.yqv-occ-critical .yqv-bar-fill{background:#ef4444;}' +
    '.yqv-bar-text{position:relative;z-index:1;font-weight:bold;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.45);}' +
    '.yqv-diff-positive{color:#16a34a;font-weight:bold;}' +
    '.yqv-diff-negative{color:#dc2626;font-weight:bold;}' +
    '.yqv-diff-zero{color:#b45309;font-weight:bold;}' +
    '.yqv-return-sub{font-size:10.5px;color:#16a34a;font-weight:bold;margin-top:2px;}';

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
      '<h1>📦 تقرير الحجوزات والسيارات المسترجعة</h1>' +
      '<div class="yqv-print-meta">' + escapeHtml(now) +
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
      '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>تقرير الحجوزات والسيارات المسترجعة</title>' +
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
            caption: '📦 تقرير الحجوزات والسيارات المسترجعة - ' + new Date().toLocaleString('ar-SA'),
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

  function buildChip(day) {
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'yqv-chip' + (state.selectedDays.has(day) ? ' yqv-chip--active' : '');
    chip.textContent = day;
    chip.addEventListener('click', function () {
      if (state.selectedDays.has(day)) {
        if (state.selectedDays.size === 1) return;
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
      '    <h2>📦 تقرير الحجوزات والسيارات المسترجعة</h2>' +
      '    <div class="yqv-stat-badge">الحجوزات: <strong id="yqv-total-bookings">0</strong> | المسترجعة (نفس الفرع): <strong id="yqv-total-returns">0</strong></div>' +
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
      '  <div class="yqv-filter-group">' +
      '    <span class="yqv-filter-label">مصدر السيارات</span>' +
      '    <fieldset class="yqv-source-filter" aria-label="مصدر السيارات"></fieldset>' +
      '  </div>' +
      '  <div class="yqv-filter-divider" aria-hidden="true"></div>' +
      '  <div class="yqv-filter-group yqv-filter-group--grow">' +
      '    <span class="yqv-filter-label">الأيام</span>' +
      '    <div class="yqv-day-chips"></div>' +
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

    var sourceFieldset = modal.querySelector('.yqv-source-filter');
    VEHICLE_SOURCES.forEach(function (source) {
      var label = document.createElement('label');
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'yqv-source';
      input.value = source.value;
      input.checked = source.value === state.selectedSource;
      input.addEventListener('change', function () {
        state.selectedSource = source.value;
        renderTable();
      });
      label.appendChild(input);
      label.appendChild(document.createTextNode(' ' + source.label));
      sourceFieldset.appendChild(label);
    });

    var chipsContainer = modal.querySelector('.yqv-day-chips');
    DAY_CHIPS.forEach(function (day) {
      chipsContainer.appendChild(buildChip(day));
    });

    modal.querySelector('[data-action="refresh"]').addEventListener('click', handleRefresh);
    modal.querySelector('[data-action="copy"]').addEventListener('click', handleCopy);
    modal.querySelector('[data-action="export"]').addEventListener('click', handleExportExcel);
    modal.querySelector('[data-action="print"]').addEventListener('click', handlePrint);
    modal.querySelector('[data-action="whatsapp"]').addEventListener('click', handleSendWhatsApp);

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
      totalBookingsEl: modal.querySelector('#yqv-total-bookings'),
      totalReturnsEl: modal.querySelector('#yqv-total-returns'),
      statusEl: modal.querySelector('#yqv-status'),
      loadingOverlayEl: modal.querySelector('#yqv-loading-overlay'),
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
      renderTable();
      fetchAllData(false)
        .then(renderTable)
        .catch(function () { renderTable(); });
    } catch (error) {
      console.error('[تقرير السيارات المسترجعة] خطأ غير متوقع:', error);
      if (modalEls) setStatus('حدث خطأ غير متوقع: ' + error.message, 'error');
    }
  }

  // ==========================================================
  // التنسيقات (CSS) - دعم الوضع الداكن + RTL + Responsive
  // ==========================================================
  var MODAL_CSS =
    '.yqv-overlay{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;' +
    'background:#0008;padding:24px;font-family:Arial,Tahoma,sans-serif;font-size:16px;}' +
    '.yqv-overlay--open{display:flex;}' +
    '.yqv-modal{background:#fff;color:#1a1a1a;border-radius:16px;position:relative;' +
    'width:min(1560px,97vw);height:min(920px,94vh);max-height:94vh;display:flex;flex-direction:column;overflow:hidden;}' +
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
    '.yqv-filters{display:flex;flex-wrap:wrap;align-items:center;gap:24px;padding:16px 28px;' +
    'background:#fafafa;border-bottom:1px solid #eee;}' +
    '.yqv-filter-group{display:flex;flex-direction:column;gap:8px;}' +
    '.yqv-filter-group--grow{flex:1;min-width:260px;}' +
    '.yqv-filter-label{font-size:12.5px;font-weight:bold;opacity:.6;text-transform:uppercase;letter-spacing:.02em;}' +
    '.yqv-filter-divider{align-self:stretch;width:1px;background:#e2e2e2;}' +
    '.yqv-source-filter{display:flex;align-items:center;gap:14px;border:0;padding:0;margin:0;flex-wrap:wrap;}' +
    '.yqv-source-filter label{display:inline-flex;align-items:center;gap:6px;font-size:15px;cursor:pointer;}' +
    '.yqv-source-filter input[type="radio"]{width:16px;height:16px;accent-color:#78B500;}' +
    '.yqv-day-chips{display:flex;flex-wrap:wrap;gap:8px;}' +
    '.yqv-chip{cursor:pointer;border:1px solid #ddd;background:#fff;color:#333;' +
    'padding:8px 16px;border-radius:999px;font-size:14px;transition:all .15s;}' +
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
    '.yqv-table{width:100%;border-collapse:collapse;font-size:15px;min-width:760px;}' +
    '.yqv-table th,.yqv-table td{padding:10px 16px;text-align:center;border-bottom:1px solid #eee;white-space:nowrap;}' +
    '.yqv-table thead th{position:sticky;top:0;background:#f5f5f5;cursor:pointer;user-select:none;z-index:3;font-weight:bold;font-size:14px;}' +
    '.yqv-table th:nth-child(1),.yqv-table td:nth-child(1){position:sticky;inset-inline-start:0;width:120px;min-width:120px;}' +
    '.yqv-table th:nth-child(2),.yqv-table td:nth-child(2){position:sticky;inset-inline-start:120px;width:96px;min-width:96px;}' +
    '.yqv-table th:nth-child(3),.yqv-table td:nth-child(3){position:sticky;inset-inline-start:216px;width:96px;min-width:96px;' +
    'box-shadow:2px 0 0 rgba(0,0,0,.06);}' +
    '.yqv-table th:nth-child(-n+3){z-index:4;}' +
    '.yqv-table td:nth-child(-n+3){z-index:2;background-color:inherit;}' +
    '.yqv-col-divider{border-inline-start:2px solid #eee;}' +
    '.yqv-table tbody tr{background-color:#fff;}' +
    '.yqv-table tbody tr:hover{background-color:#f5f5f5;}' +
    '.yqv-group-cell{font-weight:bold;font-size:16px;}' +
    '.yqv-totals-row{font-weight:bold;background-color:#f5f5f5 !important;position:sticky;bottom:0;z-index:2;}' +
    '.yqv-empty{padding:32px !important;opacity:.7;font-size:16px;}' +
    '.yqv-vehicles-cell{padding:4px 8px !important;}' +
    '.yqv-vehicle-input{width:56px;padding:6px 4px;border:1px solid #ddd;border-radius:6px;text-align:center;' +
    'font:inherit;font-weight:bold;color:inherit;background:#fff;}' +
    '.yqv-vehicle-input:focus{outline:2px solid #78B500;border-color:#78B500;}' +
    '.yqv-vehicles-total{font-weight:bold;font-size:15px;line-height:1.3;}' +
    '.yqv-yard-edit{display:flex;align-items:center;justify-content:center;gap:3px;margin-top:3px;}' +
    '.yqv-yard-edit .yqv-vehicle-input{width:40px;padding:3px 2px;font-size:12px;}' +
    '.yqv-yard-label{font-size:10px;opacity:.55;white-space:nowrap;}' +
    '.yqv-return-sub{font-size:10.5px;color:#16a34a;font-weight:bold;margin-top:2px;line-height:1.2;}' +
    '.yqv-bar-wrapper{position:relative;height:22px;border-radius:7px;background:#e5e5e5;overflow:hidden;min-width:120px;}' +
    '.yqv-bar-fill{position:absolute;inset-inline-start:0;top:0;bottom:0;border-radius:7px;transition:width .2s;}' +
    '.yqv-occ-good .yqv-bar-fill{background:#22c55e;}' +
    '.yqv-occ-warning .yqv-bar-fill{background:#eab308;}' +
    '.yqv-occ-critical .yqv-bar-fill{background:#ef4444;}' +
    '.yqv-bar-text{position:relative;z-index:1;font-size:12.5px;font-weight:bold;line-height:22px;' +
    'text-shadow:0 1px 2px rgba(0,0,0,.35);color:#fff;}' +
    '.yqv-diff-cell{font-weight:bold;font-size:16px;}' +
    '.yqv-diff-positive{color:#16a34a;}' +
    '.yqv-diff-negative{color:#dc2626;}' +
    '.yqv-diff-zero{color:#b45309;}' +
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
