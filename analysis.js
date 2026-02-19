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
function sumGoals(r) {
  const g = r?.goals || {};
  return (g.right ?? 0) + (g.left ?? 0) + (g.head ?? 0);
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
    if (ym && ymOfDate(r.date) !== ym) return false;
    if (place && r.place !== place) return false;
    return true;
  });
}

/* ====== Aggregations ====== */
function calcKPIs(records) {
  const uniqueDates = new Set(records.map((r) => r.date));
  let matches = 0;

  let gr = 0,
    gl = 0,
    gh = 0,
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
    playDays: uniqueDates.size,
    matches,
    goals: { total: gr + gl + gh, right: gr, left: gl, head: gh },
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

function clearChart(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  // bg is CSS; do nothing
}

function drawAxes(ctx, w, h, { padding = 34 } = {}) {
  // axes: left & bottom
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = "rgba(156,163,175,0.35)"; // muted-ish
  ctx.lineWidth = 1;

  // y axis
  ctx.beginPath();
  ctx.moveTo(padding, 10);
  ctx.lineTo(padding, h - padding);
  ctx.stroke();

  // x axis
  ctx.beginPath();
  ctx.moveTo(padding, h - padding);
  ctx.lineTo(w - 10, h - padding);
  ctx.stroke();

  ctx.restore();
  return { padding };
}

function drawLineSeries(ctx, w, h, { xs, ys, color, padding = 34, maxY }) {
  if (!xs.length) return;
  const usableW = w - padding - 10;
  const usableH = h - padding - 10;
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
    const y = 10 + (1 - yNorm) * usableH;

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
    const y = 10 + (1 - yNorm) * usableH;
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

/* ====== Rendering ====== */
function renderCondition({ ym, place }, totalCount) {
  const ymText = ym ? ym : "すべて";
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

function renderTrendChart(rows) {
  const { ctx, w, h } = setupCanvas(trendCanvas);
  clearChart(ctx, w, h);
  drawAxes(ctx, w, h, { padding: 34 });

  const labels = rows.map((r) => String(r.date).slice(5)); // "MM-DD" くらい
  const goals = rows.map((r) => r.goals);
  const assists = rows.map((r) => r.assists);
  const nutmegs = rows.map((r) => r.nutmegs);

  const maxY = Math.max(1, ...goals, ...assists, ...nutmegs);

  // lines (colors are chosen to match legend)
  drawLineSeries(ctx, w, h, {
    xs: labels,
    ys: goals,
    color: "#22c55e",
    maxY,
  });
  drawLineSeries(ctx, w, h, {
    xs: labels,
    ys: assists,
    color: "#60a5fa",
    maxY,
  });
  drawLineSeries(ctx, w, h, {
    xs: labels,
    ys: nutmegs,
    color: "#f59e0b",
    maxY,
  });

  // x labels (sparse)
  const step = rows.length <= 10 ? 1 : rows.length <= 20 ? 2 : 4;
  drawXLabels(ctx, w, h, labels, { step });
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

  const byDate = groupByDate(filtered);
  renderTrendChart(byDate);

  renderGoalBreak(kpis);
  renderNutBreak(kpis);

  renderPlaceTable(filtered);
  renderRecordsTable(filtered);
}

function init() {
  reloadBtn?.addEventListener("click", () => location.reload());
  backBtn?.addEventListener("click", () => {
    // returnTo=mypage が来ていればマイページへ、それ以外は index へ
    const sp = new URLSearchParams(location.search);
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
