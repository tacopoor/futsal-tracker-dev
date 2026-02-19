/* ====== Keys (must match app.js) ====== */
const STORAGE_KEY = "futsal_records_v1";

/* ====== Helpers ====== */
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = String(iso).split("-");
  return `${y}/${m}/${d}`;
}

function labelMMDD(iso) {
  if (!iso) return "";
  const m = String(iso).slice(5, 7);
  const d = String(iso).slice(8, 10);
  return `${Number(m)}/${Number(d)}`; // "02/18" ではなく "2/18"
}

// mode:
//  - "mmdd": 2/18
//  - "mmdd_seq": 2/18(2) のように同日連番
function buildTrendLabels(rows) {
  const countMap = new Map();

  // まず日付ごとの総件数を数える
  for (const r of rows) {
    countMap.set(r.date, (countMap.get(r.date) || 0) + 1);
  }

  const seqMap = new Map();

  return rows.map((r) => {
    const base = labelMMDD(r.date);
    const totalForDate = countMap.get(r.date) || 1;

    const currentSeq = (seqMap.get(r.date) || 0) + 1;
    seqMap.set(r.date, currentSeq);

    // その日が1件だけなら日付のみ
    if (totalForDate === 1) {
      return base;
    }

    // 複数ある場合は (2) 以降を表示
    if (currentSeq === 1) {
      return base; // 1件目はそのまま
    }

    return `${base}(${currentSeq})`;
  });
}

function getGoalTotal(r) {
  const g = r?.goals || {};
  if (typeof g.total === "number" && Number.isFinite(g.total) && g.total >= 0) {
    return g.total;
  }
  return (g.right ?? 0) + (g.left ?? 0) + (g.head ?? 0);
}

function sumGoals(r) {
  return getGoalTotal(r);
}

function getNutTotal(r) {
  const nm = r?.nutmegs;
  if (typeof nm === "number") return nm;
  return n(nm?.total ?? 0);
}
function getNutDetails(r) {
  const nm = r?.nutmegs;
  if (typeof nm === "number") {
    // 旧形式: 詳細不明
    return { goal: 0, assistPass: 0, pass: 0, dribble: 0, only: 0 };
  }
  const d = nm?.details || {};
  return {
    goal: n(d.goal),
    assistPass: n(d.assistPass),
    pass: n(d.pass),
    dribble: n(d.dribble),
    only: n(d.only),
  };
}
function getMatches(r) {
  // 旧データ互換：なければ 1
  return typeof r?.matches === "number" ? Math.max(1, r.matches) : 1;
}
function ymOfDate(date) {
  return String(date || "").slice(0, 7); // YYYY-MM
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/* ====== DOM ====== */
const conditionText = document.getElementById("conditionText");
const errMsg = document.getElementById("errMsg");

const kpiPlayDays = document.getElementById("kpiPlayDays");
const kpiMatches = document.getElementById("kpiMatches");
const kpiGoals = document.getElementById("kpiGoals");
const kpiAssists = document.getElementById("kpiAssists");
const kpiNutmegs = document.getElementById("kpiNutmegs");
const kpiGR = document.getElementById("kpiGR");
const kpiGL = document.getElementById("kpiGL");
const kpiGH = document.getElementById("kpiGH");
const kpiAI = document.getElementById("kpiAI");

const kpiNmGoal = document.getElementById("kpiNmGoal");
const kpiNmAssistPass = document.getElementById("kpiNmAssistPass");
const kpiNmPass = document.getElementById("kpiNmPass");
const kpiNmDribble = document.getElementById("kpiNmDribble");
const kpiNmOnly = document.getElementById("kpiNmOnly");

const trendCanvas = document.getElementById("trendChart");
const goalBreakCanvas = document.getElementById("goalBreakChart");
const nmBreakCanvas = document.getElementById("nmBreakChart");

const placeTableBody = document.getElementById("placeTableBody");
const recordsTbody = document.getElementById("recordsTbody");

// ===== Average table =====
const avgTableBody = document.getElementById("avgTableBody");

// ===== URL list DOM =====
const urlTagFilter = document.getElementById("urlTagFilter");
const urlTableBody = document.getElementById("urlTableBody");
const urlCountText = document.getElementById("urlCountText");

const reloadBtn = document.getElementById("reloadBtn");
const backBtn = document.getElementById("backBtn");

/* ====== Message ====== */
function showError(text) {
  errMsg.textContent = text;
  errMsg.classList.remove("hidden");
}
function clearError() {
  errMsg.textContent = "";
  errMsg.classList.add("hidden");
}

/* ====== Query params ====== */
function readParams() {
  const sp = new URLSearchParams(location.search);

  let ym = (sp.get("ym") || "").trim(); // "" = all
  const place = (sp.get("place") || "").trim(); // "" = all

  // ★ 互換：ym=all / ym=ALL / ym=すべて を “すべて” とみなす
  if (ym.toLowerCase() === "all" || ym === "すべて") ym = "";

  return { ym, place };
}

/* ====== Filter ====== */
function filterRecords(all, { ym, place }) {
  return all.filter((r) => {
    if (!r || !r.date || !r.place) return false;

    // ym:
    // ""        => all
    // "YYYY"    => year
    // "YYYY-MM" => month
    if (ym) {
      if (/^\d{4}$/.test(ym)) {
        // 年フィルタ
        if (!String(r.date).startsWith(ym + "-")) return false;
      } else {
        // 月フィルタ（従来）
        if (ymOfDate(r.date) !== ym) return false;
      }
    }

    if (place && r.place !== place) return false;
    return true;
  });
}

/* ====== Aggregations ====== */
function calcKPIs(records) {
  let matches = 0;

  let gr = 0,
    gl = 0,
    gh = 0,
    goalsTotal = 0,
    assists = 0,
    assistsToTarget = 0,
    nmTotal = 0;

  let nmGoal = 0,
    nmAssistPass = 0,
    nmPass = 0,
    nmDribble = 0,
    nmOnly = 0;

  for (const r of records) {
    matches += getMatches(r);

    goalsTotal += getGoalTotal(r);
    gr += r.goals?.right ?? 0;
    gl += r.goals?.left ?? 0;
    gh += r.goals?.head ?? 0;

    assists += r.assists?.total ?? 0;
    assistsToTarget += r.assists?.toTarget ?? r.assists?.toPivo ?? 0;

    nmTotal += getNutTotal(r);

    const d = getNutDetails(r);
    nmGoal += d.goal;
    nmAssistPass += d.assistPass;
    nmPass += d.pass;
    nmDribble += d.dribble;
    nmOnly += d.only;
  }

  return {
    playDays: records.length,
    matches,
    goals: { total: goalsTotal, right: gr, left: gl, head: gh },
    assists: { total: assists, toTarget: assistsToTarget },
    nutmegs: {
      total: nmTotal,
      details: {
        goal: nmGoal,
        assistPass: nmAssistPass,
        pass: nmPass,
        dribble: nmDribble,
        only: nmOnly,
      },
    },
  };
}

function groupByDate(records) {
  // date => sums
  const map = new Map();
  for (const r of records) {
    const key = r.date;
    if (!map.has(key)) {
      map.set(key, { date: key, goals: 0, assists: 0, nutmegs: 0 });
    }
    const cur = map.get(key);
    cur.goals += sumGoals(r);
    cur.assists += r.assists?.total ?? 0;
    cur.nutmegs += getNutTotal(r);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/* ====== Cumulative trend (per record) ====== */
function buildCumulativeRowsPerRecord(records) {
  // 古い→新しい（同日なら createdAt で安定化）
  const sorted = [...records].sort((a, b) =>
    ((a.date || "") + (a.createdAt || "")).localeCompare(
      (b.date || "") + (b.createdAt || ""),
    ),
  );

  let g = 0;
  let a = 0;
  let nm = 0;

  return sorted.map((r) => {
    g += sumGoals(r);
    a += r.assists?.total ?? 0;
    nm += getNutTotal(r);

    return {
      date: r.date,
      goals: g,
      assists: a,
      nutmegs: nm,
    };
  });
}

function groupByPlace(records) {
  const map = new Map();
  for (const r of records) {
    const p = r.place || "";
    if (!p) continue;

    if (!map.has(p)) {
      map.set(p, {
        place: p,
        dates: new Set(),
        matches: 0,
        goals: 0,
        assists: 0,
        nutmegs: 0,
      });
    }
    const row = map.get(p);
    row.dates.add(r.date);
    row.matches += getMatches(r);
    row.goals += sumGoals(r);
    row.assists += r.assists?.total ?? 0;
    row.nutmegs += getNutTotal(r);
  }

  const arr = [...map.values()].map((x) => ({
    place: x.place,
    playDays: x.dates.size,
    matches: x.matches,
    goals: x.goals,
    assists: x.assists,
    nutmegs: x.nutmegs,
  }));

  arr.sort((a, b) => b.matches - a.matches || b.playDays - a.playDays);
  return arr;
}

// ===== 年別集計（全期間） =====
function buildYearSummary(allRecords) {
  const map = new Map();

  for (const r of allRecords) {
    if (!r || !r.date) continue;

    const year = String(r.date).slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;

    if (!map.has(year)) {
      map.set(year, {
        year,
        playDays: 0, // ★ 登録件数として数える
        matches: 0,
        goals: 0,
        assists: 0,
        nutmegs: 0,
      });
    }

    const row = map.get(year);
    row.playDays += 1; // ★ 1レコード = 1
    row.matches += getMatches(r);
    row.goals += sumGoals(r);
    row.assists += r.assists?.total ?? 0;
    row.nutmegs += getNutTotal(r);
  }

  const arr = [...map.values()];
  arr.sort((a, b) => b.year.localeCompare(a.year)); // 最新年→古い年
  return arr;
}

function renderYearSummaryTable(allRecords) {
  const tbody = document.getElementById("yearSummaryTbody");
  if (!tbody) return;

  const rows = buildYearSummary(allRecords);

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="muted">データがありません。</td></tr>`;
    return;
  }

  tbody.innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td>${r.year}</td>
        <td>${r.playDays}</td>
        <td>${r.matches}</td>
        <td>${r.goals}</td>
        <td>${r.assists}</td>
        <td>${r.nutmegs}</td>
      </tr>
    `,
    )
    .join("");
}

/* ====== Simple Canvas Charts (no libs) ====== */
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(240, Math.floor(rect.height));
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

// ★横スクロール用
function setupScrollableCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;

  const parent = canvas.parentElement;
  const parentRect = parent.getBoundingClientRect();

  const viewW = Math.max(300, Math.floor(parentRect.width));
  const cssH = 260;

  // 横幅はここでは決めない（重要）
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.floor(viewW * dpr);
  canvas.height = Math.floor(cssH * dpr);

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { ctx, w: viewW, h: cssH };
}

function clearChart(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  // bg is CSS; do nothing
}

function drawAxes(ctx, w, h, { padding = 34, top = 10 } = {}) {
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "rgba(156,163,175,0.35)";
  ctx.lineWidth = 1;

  // y axis
  ctx.beginPath();
  ctx.moveTo(padding, top);
  ctx.lineTo(padding, h - padding);
  ctx.stroke();

  // x axis
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - 10, h - padding);
  ctx.stroke();

  ctx.restore();
  return { padding, top };
}

function drawLineSeries(
  ctx,
  w,
  h,
  { xs, ys, color, padding = 34, top = 10, maxY },
) {
  if (!xs.length) return;

  const usableW = w - padding - 10;
  const usableH = h - padding - top;

  const minX = 0;
  const maxX = Math.max(1, xs.length - 1);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  for (let i = 0; i < xs.length; i++) {
    const xNorm = (i - minX) / (maxX - minX || 1);
    const yNorm = (ys[i] || 0) / (maxY || 1);
    const x = padding + xNorm * usableW;
    const y = top + (1 - yNorm) * usableH;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // points
  ctx.fillStyle = color;
  for (let i = 0; i < xs.length; i++) {
    const xNorm = (i - minX) / (maxX - minX || 1);
    const yNorm = (ys[i] || 0) / (maxY || 1);
    const x = padding + xNorm * usableW;
    const y = top + (1 - yNorm) * usableH;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawXLabels(ctx, w, h, labels, { padding = 34, step = 3 } = {}) {
  const usableW = w - padding - 10;
  const y = h - padding + 18;

  ctx.save();
  ctx.fillStyle = "rgba(156,163,175,0.9)";
  ctx.font =
    "12px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans JP, sans-serif";

  const n = labels.length;
  if (n <= 1) {
    if (n === 1) ctx.fillText(labels[0], padding, y);
    ctx.restore();
    return;
  }

  const maxX = n - 1;
  for (let i = 0; i < n; i++) {
    if (i % step !== 0 && i !== n - 1) continue;
    const xNorm = i / maxX;
    const x = padding + xNorm * usableW;
    const text = labels[i];
    // center-ish
    ctx.fillText(text, Math.max(4, x - 14), y);
  }

  ctx.restore();
}

function drawBarChart(
  ctx,
  w,
  h,
  labels,
  values,
  { padding = 34, colors } = {},
) {
  clearChart(ctx, w, h);
  drawAxes(ctx, w, h, { padding });

  const usableW = w - padding - 10;
  const usableH = h - padding - 10;
  const maxV = Math.max(1, ...values);

  const n = labels.length;
  const gap = 10;
  const barW = Math.max(18, (usableW - gap * (n + 1)) / n);

  ctx.save();
  ctx.font =
    "12px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans JP, sans-serif";
  ctx.fillStyle = "rgba(156,163,175,0.9)";
  ctx.strokeStyle = "rgba(156,163,175,0.35)";

  for (let i = 0; i < n; i++) {
    const v = values[i] || 0;
    const x = padding + gap + i * (barW + gap);
    const barH = (v / maxV) * usableH;
    const y = 10 + (usableH - barH);

    // bar
    ctx.fillStyle = colors?.[i] || "rgba(34,197,94,0.85)";
    ctx.fillRect(x, y, barW, barH);

    // value
    ctx.fillStyle = "rgba(229,231,235,0.95)";
    ctx.fillText(String(v), x + 4, Math.max(18, y - 6));

    // label
    ctx.fillStyle = "rgba(156,163,175,0.9)";
    ctx.fillText(labels[i], x, h - padding + 18);
  }
  ctx.restore();
}

function drawGroupedBarsNoInnerGap(
  ctx,
  w,
  h,
  labels,
  series,
  { padding = 34, showValues = true } = {},
) {
  clearChart(ctx, w, h);
  // ★ 数値表示も考慮して上に余白を作る
  const top = 22; // 数値(12px) + 余裕。好みで 18〜28 くらい
  drawAxes(ctx, w, h, { padding, top });

  // usableH も top を反映
  const usableH = h - padding - top;

  const nGroups = labels.length;
  if (nGroups === 0) return;

  const nSeries = series.length; // 3想定
  // maxV に “ヘッドルーム” を持たせる（天井ギリギリを避ける）
  const rawMaxV = Math.max(
    1,
    ...series.flatMap((s) => s.values.map((v) => Number(v) || 0)),
  );

  // ★ 余裕 15%（好みで 1.1〜1.3）
  const maxV = rawMaxV * 1.15;

  // ===== ★ 固定サイズ指定 =====
  const barW = 14; // ← 棒1本の幅（固定）
  const innerGap = 2; // ← 棒と棒の間
  const groupGap = 10; // ← 日付グループ間の間隔

  const groupW = nSeries * barW + (nSeries - 1) * innerGap;

  ctx.save();
  ctx.font =
    "12px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans JP, sans-serif";
  ctx.textBaseline = "bottom";
  ctx.textAlign = "center";

  for (let i = 0; i < nGroups; i++) {
    const baseX = padding + groupGap + i * (groupW + groupGap);

    for (let s = 0; s < nSeries; s++) {
      const v = Number(series[s].values[i] || 0);
      const barH = (v / maxV) * usableH;

      const x = baseX + s * (barW + innerGap);

      const y = top + (usableH - barH);

      // bar
      ctx.fillStyle = series[s].color;
      ctx.fillRect(x, y, barW, barH);

      // value（中央上）
      if (showValues && v > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.fillText(String(v), x + barW / 2, Math.max(top + 12, y - 4));
      }
    }
  }

  ctx.restore();

  // ===== Xラベルも中央固定 =====
  drawXLabelsCentered(ctx, w, h, labels, {
    padding,
    groupW,
    gap: groupGap,
  });
}

function drawXLabelsCentered(ctx, w, h, labels, { padding, groupW, gap }) {
  const y = h - padding + 18;

  ctx.save();
  ctx.fillStyle = "rgba(156,163,175,0.9)";
  ctx.font =
    "12px system-ui, -apple-system, Segoe UI, Roboto, Noto Sans JP, sans-serif";
  ctx.textAlign = "center";

  for (let i = 0; i < labels.length; i++) {
    const baseX = padding + gap + i * (groupW + gap);
    const center = baseX + groupW / 2;

    ctx.fillText(labels[i], center, y);
  }

  ctx.restore();
}

/* ====== Rendering ====== */
function renderCondition({ ym, place }, totalCount) {
  let ymText = "すべて";
  if (ym) {
    if (/^\d{4}$/.test(ym)) ymText = `${ym}年`;
    else ymText = ym;
  }
  const placeText = place ? place : "すべて";
  conditionText.textContent = `表示条件：年月 ${ymText} / 場所 ${placeText}（対象 ${totalCount} 件）`;
}

function renderKPIsToDom(kpis) {
  kpiPlayDays.textContent = String(kpis.playDays);
  kpiMatches.textContent = String(kpis.matches);

  kpiGoals.textContent = String(kpis.goals.total);
  kpiGR.textContent = String(kpis.goals.right);
  kpiGL.textContent = String(kpis.goals.left);
  kpiGH.textContent = String(kpis.goals.head);

  kpiAssists.textContent = String(kpis.assists.total);
  kpiAI.textContent = String(kpis.assists.toTarget);

  kpiNutmegs.textContent = String(kpis.nutmegs.total);
  kpiNmGoal.textContent = String(kpis.nutmegs.details.goal);
  kpiNmAssistPass.textContent = String(kpis.nutmegs.details.assistPass);
  kpiNmPass.textContent = String(kpis.nutmegs.details.pass);
  kpiNmDribble.textContent = String(kpis.nutmegs.details.dribble);
  kpiNmOnly.textContent = String(kpis.nutmegs.details.only);
}

function formatAvg(x) {
  const v = Number(x);
  if (!Number.isFinite(v)) return "0";

  const rounded = Math.round(v * 10) / 10; // 小数1桁に丸め
  return rounded % 1 === 0 ? String(rounded) : rounded.toFixed(1);
}

function renderAverageTable(records) {
  if (!avgTableBody) return;

  // 指定期間の合計試合数（matches合計）
  const matchesTotal = records.reduce((sum, r) => sum + getMatches(r), 0);

  // 指定期間の合計値
  const goalsTotal = records.reduce((sum, r) => sum + sumGoals(r), 0);
  const assistsTotal = records.reduce(
    (sum, r) => sum + (r.assists?.total ?? 0),
    0,
  );
  const nutTotal = records.reduce((sum, r) => sum + getNutTotal(r), 0);

  const denom = Math.max(1, matchesTotal); // 0除算回避（試合数0なら1扱い）

  const rows = [
    { label: "ゴール", total: goalsTotal, avg: goalsTotal / denom },
    { label: "アシスト", total: assistsTotal, avg: assistsTotal / denom },
    { label: "股抜き", total: nutTotal, avg: nutTotal / denom },
  ];

  avgTableBody.innerHTML = rows
    .map(
      (x) => `
      <tr>
        <td>${escapeHtml(x.label)}</td>
        <td>${x.total}</td>
        <td>${matchesTotal}</td>
        <td>${formatAvg(x.avg)}</td>
      </tr>
    `,
    )
    .join("");
}

function renderTrendChart(rows) {
  const labels = buildTrendLabels(rows);

  const nGroups = labels.length;
  const nSeries = 3;

  const barW = 14;
  const innerGap = 2;
  const groupGap = 10;
  const padding = 34;

  const groupW = nSeries * barW + (nSeries - 1) * innerGap;

  // ★ 横幅を正しく計算（これが抜けていた）
  const totalW = padding + groupGap + nGroups * (groupW + groupGap);

  const cssH = 260;
  const dpr = window.devicePixelRatio || 1;

  // ★ ここが最重要
  trendCanvas.style.width = `${totalW}px`;
  trendCanvas.style.height = `${cssH}px`;
  trendCanvas.width = Math.floor(totalW * dpr);
  trendCanvas.height = Math.floor(cssH * dpr);

  const ctx = trendCanvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const goals = rows.map((r) => r.goals);
  const assists = rows.map((r) => r.assists);
  const nutmegs = rows.map((r) => r.nutmegs);

  drawGroupedBarsNoInnerGap(
    ctx,
    totalW,
    cssH,
    labels,
    [
      { name: "Goals", values: goals, color: "rgba(34,197,94,0.85)" },
      { name: "Assists", values: assists, color: "rgba(96,165,250,0.85)" },
      { name: "Nutmegs", values: nutmegs, color: "rgba(245,158,11,0.85)" },
    ],
    { padding, showValues: true },
  );
}

function renderGoalBreak(kpis) {
  const { ctx, w, h } = setupCanvas(goalBreakCanvas);
  drawBarChart(
    ctx,
    w,
    h,
    ["右", "左", "頭"],
    [kpis.goals.right, kpis.goals.left, kpis.goals.head],
    {
      colors: [
        "rgba(34,197,94,0.85)",
        "rgba(96,165,250,0.85)",
        "rgba(245,158,11,0.85)",
      ],
    },
  );
}

function renderNutBreak(kpis) {
  const { ctx, w, h } = setupCanvas(nmBreakCanvas);
  const d = kpis.nutmegs.details;
  drawBarChart(
    ctx,
    w,
    h,
    ["G", "AS", "P", "D", "のみ"],
    [d.goal, d.assistPass, d.pass, d.dribble, d.only],
    {
      colors: [
        "rgba(245,158,11,0.85)",
        "rgba(96,165,250,0.85)",
        "rgba(34,197,94,0.85)",
        "rgba(168,85,247,0.85)",
        "rgba(239,68,68,0.85)",
      ],
    },
  );
}

function renderPlaceTable(records) {
  const rows = groupByPlace(records).slice(0, 12);
  if (rows.length === 0) {
    placeTableBody.innerHTML = `<tr><td colspan="6" class="muted">データがありません。</td></tr>`;
    return;
  }

  placeTableBody.innerHTML = rows
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.place)}</td>
      <td>${r.playDays}</td>
      <td>${r.matches}</td>
      <td>${r.goals}</td>
      <td>${r.assists}</td>
      <td>${r.nutmegs}</td>
    </tr>
  `,
    )
    .join("");
}

function renderRecordsTable(records) {
  const sorted = [...records].sort((a, b) =>
    (b.date + (b.createdAt || "")).localeCompare(a.date + (a.createdAt || "")),
  );

  if (sorted.length === 0) {
    // 列数が 6 になるので colspan も 6
    recordsTbody.innerHTML = `<tr><td colspan="6" class="muted">データがありません。</td></tr>`;
    return;
  }

  recordsTbody.innerHTML = sorted
    .slice(0, 200) // ここは重くなったら調整
    .map((r) => {
      const g = sumGoals(r);
      const m = getMatches(r);
      const a = r.assists?.total ?? 0;
      const nm = getNutTotal(r);
      const memo = r.memo ? escapeHtml(r.memo) : "";

      const dateStr = formatDate(r.date); // 例: YYYY/MM/DD
      const placeStr = escapeHtml(r.place || "");

      return `
      <tr>
        <td class="col-dateplace">
          <div class="datePlaceCell">
            <div class="dp-date">${dateStr}</div>
            <div class="dp-place">${placeStr}</div>
          </div>
        </td>
        <td>${m}</td>
        <td>${g}</td>
        <td>${a}</td>
        <td>${nm}</td>
        <td>${memo}</td>
      </tr>
    `;
    })
    .join("");

  if (sorted.length > 200) {
    // 列数が 6 になるので colspan も 6
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="6" class="muted">※表示は先頭200件まで（全${sorted.length}件）</td>`;
    recordsTbody.appendChild(tr);
  }

  // 件数表示（HTMLに #recordsCountText がある前提）
  const countEl = document.getElementById("recordsCountText");
  if (countEl) countEl.textContent = `（${records.length}件）`;
}

function isValidHttpUrl(s) {
  const v = String(s || "").trim();
  return /^https?:\/\//i.test(v);
}

// filteredRecords（指定期間）から playVideos を取り出して平坦化
function collectUrlsFromRecords(filteredRecords) {
  const rows = [];

  for (const r of filteredRecords) {
    const arr = Array.isArray(r?.playVideos) ? r.playVideos : [];
    for (const v of arr) {
      const tag = (v?.tag || "その他").trim() || "その他";
      const url = (v?.url || "").trim();
      if (!isValidHttpUrl(url)) continue;

      rows.push({
        tag,
        url,
        date: r?.date || "",
        createdAt: r?.createdAt || "",
      });
    }
  }

  // 表示を安定化：新しい記録のURLを上へ（date+createdAt desc）
  rows.sort((a, b) =>
    (b.date + b.createdAt).localeCompare(a.date + a.createdAt),
  );

  return rows;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function renderUrlTable(rows, selectedTag = "") {
  if (!urlTableBody || !urlTagFilter) return;

  const filtered =
    selectedTag && selectedTag !== "all"
      ? rows.filter((x) => x.tag === selectedTag)
      : rows;

  if (urlCountText) {
    urlCountText.textContent = `表示 ${filtered.length} 件 / 全 ${rows.length} 件`;
  }

  if (filtered.length === 0) {
    urlTableBody.innerHTML = `<tr><td colspan="2" class="muted">URLがありません。</td></tr>`;
    return;
  }

  urlTableBody.innerHTML = filtered
    .map(
      (x) => `
      <tr>
        <td><span class="tagBadge">${escapeHtml(x.tag)}</span></td>
        <td class="urlCell">
          <a href="${escapeHtml(x.url)}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(x.url)}
          </a>
        </td>
      </tr>
    `,
    )
    .join("");
}

function buildUrlTagFilterOptions(rows, prefer = "all") {
  if (!urlTagFilter) return;

  const tags = uniq(rows.map((x) => x.tag)).sort((a, b) =>
    a.localeCompare(b, "ja"),
  );

  // "all" = すべて
  urlTagFilter.innerHTML =
    `<option value="all">すべて</option>` +
    tags
      .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
      .join("");

  // 選択復元
  const exists = [...urlTagFilter.options].some((o) => o.value === prefer);
  urlTagFilter.value = exists ? prefer : "all";
}

/* ====== Main ====== */
function render() {
  clearError();

  const params = readParams();
  const all = loadRecords();
  const filtered = filterRecords(all, params);

  renderCondition(params, filtered.length);

  if (all.length === 0) {
    showError("記録データがありません。先に記録を保存してください。");
  }

  const kpis = calcKPIs(filtered);
  renderKPIsToDom(kpis);

  // ★Averageテーブル（指定期間）
  renderAverageTable(filtered);

  const trendRows = buildCumulativeRowsPerRecord(filtered);
  renderTrendChart(trendRows);

  renderGoalBreak(kpis);
  renderNutBreak(kpis);

  renderPlaceTable(filtered);
  renderRecordsTable(filtered);
  renderYearSummaryTable(all);

  // ===== URL一覧（指定期間）=====
  const urlRows = collectUrlsFromRecords(filtered);

  buildUrlTagFilterOptions(urlRows, urlTagFilter?.value || "all");
  renderUrlTable(urlRows, urlTagFilter?.value || "all");

  if (urlTagFilter && !urlTagFilter.__bound) {
    urlTagFilter.__bound = true;
    urlTagFilter.addEventListener("change", () => {
      // フィルタ選択は保持されるので再描画でOK
      render();
    });
  }
}

function init() {
  reloadBtn?.addEventListener("click", () => location.reload());
  backBtn?.addEventListener("click", () => {
    const sp = new URLSearchParams(location.search);

    // ★back があれば最優先でそこへ戻る（フィルタ維持）
    const back = (sp.get("back") || "").trim();
    if (back) {
      // URLSearchParams は自動でデコードしてくれることもありますが、
      // エンコード済みで来る環境があるので安全側で decode する
      location.href = decodeURIComponent(back);
      return;
    }

    // 既存ロジック（保険）
    const returnTo = (sp.get("returnTo") || "").trim();
    if (returnTo === "mypage") location.href = "./index.html#tab=mypage";
    else if (returnTo === "settings")
      location.href = "./index.html#tab=settings";
    else if (returnTo === "record") location.href = "./index.html#tab=record";
    else location.href = "./index.html";
  });

  // リサイズで描画が崩れやすいので再描画
  window.addEventListener("resize", () => {
    // 短い間引きでOK
    clearTimeout(window.__resizeTimer);
    window.__resizeTimer = setTimeout(render, 150);
  });

  render();
}

init();
