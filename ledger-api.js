/* ─────────────────────────────────────────────
   가계부 — Supabase 연결 모듈 (가계부 ledger_entries)

   URL·key·로그인 토큰은 화면 코드(app.js)가 넘겨 줍니다.
   이 파일 자체에는 비밀 값을 적지 않습니다.

   테이블: public.ledger_entries
      id (uuid, PK) · user_id (uuid, 기본 auth.uid()) · entry_date (date)
      entry_type (text: expense | income) · category (text) · title (text)
      amount (integer) · payment_method (text) · memo (text) · created_at (timestamptz)

   행은 RLS로 보호됩니다. 로그인한 사용자는 자기 user_id의 행만 읽고 쓸 수 있습니다.
   ───────────────────────────────────────────── */
(function (global) {
  "use strict";

  var CONFIG_KEY = "ledger_supabase_base";
  var TABLE = "ledger_entries";
  var COLUMNS = ["entry_date", "entry_type", "category", "title", "amount", "payment_method", "memo"];
  var TYPES = ["expense", "income"];

  var state = { url: "", key: "", token: "" };

  /* ── 연결 정보 ── */

  function normalizeUrl(value) {
    if (typeof value !== "string") return "";
    var raw = value.trim();
    if (!raw) return "";
    // 끝 슬래시와, REST 엔드포인트를 통째로 붙여 넣은 경우를 받아 줍니다.
    raw = raw.replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
    if (!/^https:\/\//i.test(raw)) return "";
    if (typeof global.URL === "function") {
      var u;
      try { u = new global.URL(raw); } catch (e) { return ""; }
      if (u.protocol !== "https:" || !u.hostname) return "";
      return u.origin;
    }
    if (!/^https:\/\/[^\s/?#]+$/i.test(raw)) return "";
    return raw;
  }

  function configure(options) {
    if (!options || typeof options !== "object") {
      throw new Error("configure에는 { url, key } 객체가 필요합니다.");
    }
    var url = normalizeUrl(options.url);
    var key = typeof options.key === "string" ? options.key.trim() : "";
    if (!url) throw new Error("Supabase URL이 올바르지 않습니다. https://로 시작하는 프로젝트 URL을 넣어 주세요.");
    if (!key) throw new Error("Supabase key가 비어 있습니다.");
    state.url = url;
    state.key = key;
    try { global.localStorage.setItem(CONFIG_KEY, url); } catch (e) {}
    return { url: url, key: key };
  }

  function setAccessToken(token) {
    state.token = typeof token === "string" ? token.trim() : "";
  }

  function isReady() {
    return !!(state.url && state.key && state.token);
  }

  function getConfig() {
    return state.url ? { url: state.url, key: state.key } : null;
  }

  /* ── REST 요청 ── */

  function request(method, query, body) {
    if (!state.url || !state.key) {
      return Promise.reject(new Error("Supabase 연결 정보가 없습니다."));
    }
    if (!state.token) {
      return Promise.reject(new Error("로그인이 필요합니다."));
    }
    var url = state.url + "/rest/v1/" + TABLE + (query ? "?" + query : "");
    var headers = {
      apikey: state.key,
      Authorization: "Bearer " + state.token,
      Accept: "application/json"
    };
    var init = { method: method, headers: headers, mode: "cors", cache: "no-store" };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    if (method !== "GET") headers.Prefer = "return=representation";

    var sent;
    try {
      sent = Promise.resolve(global.fetch(url, init));
    } catch (e) {
      return Promise.reject(new Error("Supabase에 연결하지 못했습니다. 네트워크와 URL을 확인해 주세요."));
    }

    return sent.then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        if (text) {
          try { data = JSON.parse(text); } catch (e) { data = text; }
        }
        if (!res.ok) {
          var msg = (data && (data.message || data.details || data.hint || data.error_description || data.error)) ||
                    (typeof data === "string" && data) || res.statusText || "알 수 없는 오류";
          var err = new Error("Supabase 요청 실패 (" + res.status + "): " + msg);
          err.status = res.status;
          err.detail = data;
          throw err;
        }
        return data;
      });
    }, function () {
      throw new Error("Supabase에 연결하지 못했습니다. 네트워크와 URL을 확인해 주세요.");
    });
  }

  /* ── 값 검사 ── */

  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function toInteger(value, label) {
    var n = typeof value === "string" ? Number(value.replace(/[,\s]/g, "")) : value;
    if (typeof n !== "number" || !isFinite(n) || Math.round(n) !== n) {
      throw new Error(label + "은(는) 정수여야 합니다.");
    }
    if (n < 0) throw new Error(label + "은(는) 0보다 작을 수 없습니다.");
    return n;
  }

  function toText(value, label, required) {
    if (value === undefined || value === null) {
      if (required) throw new Error(label + "이(가) 비어 있습니다.");
      return "";
    }
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error(label + "은(는) 글자여야 합니다.");
    }
    var s = String(value).trim();
    if (required && !s) throw new Error(label + "이(가) 비어 있습니다.");
    return s;
  }

  function checkDate(value) {
    var s = toText(value, "날짜", true);
    if (!DATE_RE.test(s)) throw new Error("날짜는 2026-11-26 같은 형식이어야 합니다.");
    return s;
  }

  function checkType(value) {
    var s = toText(value, "구분", true);
    if (TYPES.indexOf(s) === -1) throw new Error("구분은 expense(지출) 또는 income(수입)이어야 합니다.");
    return s;
  }

  /* 새 항목: 필수 값은 반드시 있어야 합니다. */
  function normalizeNewEntry(entry) {
    if (!entry || typeof entry !== "object") throw new Error("저장할 내용이 비어 있습니다.");
    return {
      entry_date: checkDate(entry.entry_date),
      entry_type: checkType(entry.entry_type),
      category: toText(entry.category, "분류", false),
      title: toText(entry.title, "내용", true),
      amount: toInteger(entry.amount, "금액"),
      payment_method: toText(entry.payment_method, "결제수단", false),
      memo: toText(entry.memo, "메모", false)
    };
  }

  /* 고칠 값: 넘어온 항목만 검사해서 담습니다. */
  function normalizePatch(patch) {
    if (!patch || typeof patch !== "object") throw new Error("고칠 내용이 비어 있습니다.");
    var out = {};
    var used = false;
    COLUMNS.forEach(function (col) {
      if (patch[col] === undefined) return;
      used = true;
      if (col === "entry_date") out[col] = checkDate(patch[col]);
      else if (col === "entry_type") out[col] = checkType(patch[col]);
      else if (col === "amount") out[col] = toInteger(patch[col], "금액");
      else if (col === "title") out[col] = toText(patch[col], "내용", true);
      else out[col] = toText(patch[col], col, false);
    });
    if (!used) throw new Error("고칠 항목이 없습니다.");
    return out;
  }

  function checkId(id) {
    var s = toText(id, "id", true);
    return s;
  }

  /* ── 공개 API ── */

  function listEntries(options) {
    var o = options || {};
    var p = new URLSearchParams();
    p.set("select", "*");
    p.set("order", o.order || "entry_date.desc,created_at.desc");
    if (typeof o.limit === "number" && o.limit >= 0) p.set("limit", String(o.limit));
    if (typeof o.offset === "number" && o.offset > 0) p.set("offset", String(o.offset));
    if (o.from) p.append("entry_date", "gte." + checkDate(o.from));
    if (o.to) p.append("entry_date", "lte." + checkDate(o.to));
    if (o.entry_type) p.append("entry_type", "eq." + checkType(o.entry_type));
    if (o.category) p.append("category", "eq." + toText(o.category, "분류", true));
    return request("GET", p.toString()).then(function (rows) {
      return Array.isArray(rows) ? rows : [];
    });
  }

  function createEntry(entry) {
    var body = normalizeNewEntry(entry);
    return request("POST", "select=*", body).then(function (rows) {
      return Array.isArray(rows) ? rows[0] || null : rows;
    });
  }

  function updateEntry(id, patch) {
    var key = checkId(id);
    var body = normalizePatch(patch);
    var query = "id=eq." + encodeURIComponent(key) + "&select=*";
    return request("PATCH", query, body).then(function (rows) {
      return Array.isArray(rows) ? rows[0] || null : rows;
    });
  }

  function deleteEntry(id) {
    var key = checkId(id);
    var query = "id=eq." + encodeURIComponent(key) + "&select=*";
    return request("DELETE", query).then(function (rows) {
      return Array.isArray(rows) ? rows[0] || null : rows;
    });
  }

  /* 검사에서 던진 오류도 화면 코드가 .catch()로 받게 약속(Promise)으로 돌려줍니다. */
  function guard(fn) {
    return function () {
      try {
        return Promise.resolve(fn.apply(null, arguments));
      } catch (e) {
        return Promise.reject(e);
      }
    };
  }

  var LedgerAPI = {
    configKey: CONFIG_KEY,
    table: TABLE,
    configure: configure,
    setAccessToken: function (token) { setAccessToken(token); },
    isReady: isReady,
    getConfig: getConfig,
    listEntries: guard(listEntries),
    createEntry: guard(createEntry),
    updateEntry: guard(updateEntry),
    deleteEntry: guard(deleteEntry)
  };

  global.LedgerAPI = LedgerAPI;
})(typeof window !== "undefined" ? window : this);
