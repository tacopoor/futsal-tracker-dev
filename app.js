/* ====== Storage ====== */
const STORAGE_KEY = "futsal_records_v1";
const SETTINGS_KEY = "futsal_settings_v2";

/* ====== Default master data ====== */
const DEFAULT_PLACES = [
  "マリノストリコールパーク",
  "フットサルクラブ横浜",
  "アイリフットサル",
  "体育館",
  "ジェクサーフットサル",
  "南町田インドア球's倶楽部フットサル",
  "都築スポーツセンター",
  "緑スポーツセンター",
  "港北スポーツセンター",
  "横浜国際プール",
  "フットボールパーク東山田",
  "大会",
  "その他",
];

function loadRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        assistTargets: [],
        selectedAssistTarget: "",
        customPlaces: [],
      };
    }
    const s = JSON.parse(raw);

    const assistTargets = Array.isArray(s.assistTargets)
      ? s.assistTargets
          .filter((v) => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    const selectedAssistTarget =
      typeof s.selectedAssistTarget === "string"
        ? s.selectedAssistTarget.trim()
        : "";

    const customPlaces = Array.isArray(s.customPlaces)
      ? s.customPlaces
          .filter((v) => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

    return { assistTargets, selectedAssistTarget, customPlaces };
  } catch {
    return { assistTargets: [], selectedAssistTarget: "", customPlaces: [] };
  }
}
function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/* ====== Utilities ====== */
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function n(v) {
  const x = Number(v);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}
function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}`;
}
function sumGoals(r) {
  return (r.goals?.right ?? 0) + (r.goals?.left ?? 0) + (r.goals?.head ?? 0);
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function uniq(arr) {
  return [...new Set(arr)];
}
function nowYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/* ====== Message helpers（alert廃止・全画面統一） ====== */
function msgClear(el) {
  if (!el) return;
  el.textContent = "";
  el.classList.add("hidden");
  el.classList.remove("error");
}
function msgInfo(el, text) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  el.classList.remove("error");
}
function msgError(el, text) {
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  el.classList.add("error");
}

/* ====== Places helpers ====== */
function getPlaces(settings) {
  const merged = uniq(
    [...DEFAULT_PLACES, ...(settings.customPlaces || [])]
      .map((v) => v.trim())
      .filter(Boolean),
  );
  const others = merged.filter((v) => v === "その他");
  const rest = merged.filter((v) => v !== "その他");
  return [...rest, ...others];
}
function renderPlaceSelect(
  selectEl,
  places,
  { includeAllOption = false } = {},
) {
  const cur = selectEl.value;

  let html = "";
  if (includeAllOption) {
    html += `<option value="">すべて</option>`;
  } else {
    html += `<option value="" selected disabled>選択してください</option>`;
  }

  for (const p of places) {
    html += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
  }
  selectEl.innerHTML = html;

  if (cur && [...selectEl.options].some((o) => o.value === cur)) {
    selectEl.value = cur;
  }
}

/* ====== Assist targets helpers ====== */
const UNSET = "未設定";

function getAssistTargetsWithUnset(settings) {
  const targets = uniq(
    (settings.assistTargets || []).map((v) => v.trim()).filter(Boolean),
  );
  return [UNSET, ...targets];
}

function renderAssistTargetSelect(settings) {
  const targets = getAssistTargetsWithUnset(settings);
  const cur = (settings.selectedAssistTarget || "").trim();

  assistTargetSelect.innerHTML = targets
    .map(
      (name) =>
        `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`,
    )
    .join("");

  if (cur && targets.includes(cur)) {
    assistTargetSelect.value = cur;
  } else {
    assistTargetSelect.value = UNSET;
  }
}

/* ====== Elements: Views ====== */
const viewRecord = document.getElementById("view-record");
const viewMypage = document.getElementById("view-mypage");
const viewSettings = document.getElementById("view-settings");

/* ====== Elements: Tabs ====== */
const tabRecord = document.getElementById("tabRecord");
const tabMypage = document.getElementById("tabMypage");
const tabSettings = document.getElementById("tabSettings");

/* ====== Elements: Messages ====== */
const recordMsgEl = document.getElementById("saveMsg");
const mypageMsgEl = document.getElementById("mypageMsg");
const settingsMsgEl = document.getElementById("settingsMsg");

/* ====== Elements: Record ====== */
const elDate = document.getElementById("date");
const elPlace = document.getElementById("place");
const elMatches = document.getElementById("matches");

const elGR = document.getElementById("gRight");
const elGL = document.getElementById("gLeft");
const elGH = document.getElementById("gHead");

const elAT = document.getElementById("aTotal");
const elAToTarget = document.getElementById("aToTarget");

const assistTargetSelect = document.getElementById("assistTargetSelect");
const elMemo = document.getElementById("memo");

const elNutTotal = document.getElementById("nutmegsTotal");
const elNmGoal = document.getElementById("nmGoal");
const elNmAssistPass = document.getElementById("nmAssistPass");
const elNmPass = document.getElementById("nmPass");
const elNmDribble = document.getElementById("nmDribble");
const elNmOnly = document.getElementById("nmOnly");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

/* ====== Elements: MyPage ====== */
const kpiGoals = document.getElementById("kpiGoals");
const kpiAssists = document.getElementById("kpiAssists");
const kpiGR = document.getElementById("kpiGR");
const kpiGL = document.getElementById("kpiGL");
const kpiGH = document.getElementById("kpiGH");
const kpiAI = document.getElementById("kpiAI");
const kpiMatches = document.getElementById("kpiMatches");
const kpiPlayDays = document.getElementById("kpiPlayDays");
const kpiNutmegs = document.getElementById("kpiNutmegs");

const kpiNmGoal = document.getElementById("kpiNmGoal");
const kpiNmAssistPass = document.getElementById("kpiNmAssistPass");
const kpiNmPass = document.getElementById("kpiNmPass");
const kpiNmDribble = document.getElementById("kpiNmDribble");
const kpiNmOnly = document.getElementById("kpiNmOnly");

const list = document.getElementById("list");
const wipeBtn = document.getElementById("wipeBtn");

const filterPlace = document.getElementById("filterPlace");
const filterYM = document.getElementById("filterYM");
const analysisBtn = document.getElementById("analysisBtn");

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFile = document.getElementById("importFile");

/* ====== Elements: Settings ====== */
const newAssistTargetName = document.getElementById("newAssistTargetName");
const addAssistTargetBtn = document.getElementById("addAssistTargetBtn");
const assistTargetsContainer = document.getElementById(
  "assistTargetsContainer",
);

const newPlaceName = document.getElementById("newPlaceName");
const addPlaceBtn = document.getElementById("addPlaceBtn");
const placesContainer = document.getElementById("placesContainer");

/* ====== Modals ====== */
const doneModal = document.getElementById("doneModal");
const closeModalBtn = document.getElementById("closeModalBtn");

const wipeModal = document.getElementById("wipeModal");
const wipeCancelBtn = document.getElementById("wipeCancelBtn");
const wipeConfirmBtn = document.getElementById("wipeConfirmBtn");

/* ====== Modal helpers ====== */
function openDoneModal() {
  doneModal.classList.remove("hidden");
}
function closeDoneModal() {
  doneModal.classList.add("hidden");
}
function openWipeModal() {
  wipeModal.classList.remove("hidden");
}
function closeWipeModal() {
  wipeModal.classList.add("hidden");
}

closeModalBtn?.addEventListener("click", closeDoneModal);
doneModal?.addEventListener("click", (e) => {
  if (e.target === doneModal) closeDoneModal();
});
wipeCancelBtn?.addEventListener("click", closeWipeModal);
wipeModal?.addEventListener("click", (e) => {
  if (e.target === wipeModal) closeWipeModal();
});

/* ====== Build select options ====== */
function buildCountSelect(el, { min = 0, max = 20, defaultValue = 0 } = {}) {
  if (!el) return;
  const opts = [];
  for (let i = min; i <= max; i++) {
    opts.push(`<option value="${i}">${i}</option>`);
  }
  el.innerHTML = opts.join("");
  el.value = String(defaultValue);
}

/* ====== Tabs ====== */
function showTab(which) {
  const isRecord = which === "record";
  const isMypage = which === "mypage";
  const isSettings = which === "settings";

  viewRecord.classList.toggle("hidden", !isRecord);
  viewMypage.classList.toggle("hidden", !isMypage);
  viewSettings.classList.toggle("hidden", !isSettings);

  tabRecord.classList.toggle("active", isRecord);
  tabMypage.classList.toggle("active", isMypage);
  tabSettings.classList.toggle("active", isSettings);

  msgClear(recordMsgEl);
  msgClear(mypageMsgEl);
  msgClear(settingsMsgEl);

  if (isMypage) renderMypage();
  if (isSettings) renderSettings();
}
tabRecord.addEventListener("click", () => showTab("record"));
tabMypage.addEventListener("click", () => showTab("mypage"));
tabSettings.addEventListener("click", () => showTab("settings"));

/* ====== Defaults ====== */
function setDefaultDateToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  elDate.value = `${yyyy}-${mm}-${dd}`;
}
function resetForm() {
  setDefaultDateToday();
  elPlace.value = "";
  elMemo.value = "";
  msgClear(recordMsgEl);

  if (elMatches) elMatches.value = "1";

  elGR.value = "0";
  elGL.value = "0";
  elGH.value = "0";
  elAT.value = "0";
  elAToTarget.value = "0";

  elNutTotal.value = "0";
  elNmGoal.value = "0";
  elNmAssistPass.value = "0";
  elNmPass.value = "0";
  elNmDribble.value = "0";
  elNmOnly.value = "0";
}
resetBtn.addEventListener("click", resetForm);

/* ====== Nutmegs validation ====== */
function validateNutmegs(total, details) {
  const detailSum =
    details.goal +
    details.assistPass +
    details.pass +
    details.dribble +
    details.only;

  const anyDetail = detailSum > 0;
  if (anyDetail && detailSum !== total) {
    return { ok: false, sum: detailSum };
  }
  return { ok: true, sum: detailSum };
}

/* ====== Save record ====== */
saveBtn.addEventListener("click", () => {
  const settings = loadSettings();
  msgClear(recordMsgEl);

  const date = elDate.value;
  const place = (elPlace.value || "").trim();
  const matches = elMatches ? Math.max(1, n(elMatches.value)) : 1;

  if (!date) return msgError(recordMsgEl, "日付を入力してください。");
  if (!place)
    return msgError(recordMsgEl, "場所（フットサル場）を選択してください。");

  const selectedTarget = (assistTargetSelect.value || "").trim() || UNSET;

  const assistsTotal = n(elAT.value);
  let assistsToTarget = n(elAToTarget.value);
  if (assistsToTarget > assistsTotal) assistsToTarget = assistsTotal;

  const nutTotal = n(elNutTotal.value);
  const nutDetails = {
    goal: n(elNmGoal.value),
    assistPass: n(elNmAssistPass.value),
    pass: n(elNmPass.value),
    dribble: n(elNmDribble.value),
    only: n(elNmOnly.value),
  };

  const nutCheck = validateNutmegs(nutTotal, nutDetails);
  if (!nutCheck.ok) {
    return msgError(
      recordMsgEl,
      `股抜きの詳細合計（${nutCheck.sum}）が総数（${nutTotal}）と一致しません。修正してください。`,
    );
  }

  const record = {
    id: uid(),
    createdAt: new Date().toISOString(),
    date,
    place,
    matches,
    goals: {
      right: n(elGR.value),
      left: n(elGL.value),
      head: n(elGH.value),
    },
    assists: {
      total: assistsTotal,
      targetName: selectedTarget,
      toTarget: assistsToTarget,
    },
    nutmegs: {
      total: nutTotal,
      details: nutDetails,
    },
    memo: elMemo.value.trim(),
  };

  const records = loadRecords();
  records.push(record);
  saveRecords(records);

  settings.selectedAssistTarget = selectedTarget;
  saveSettings(settings);

  msgInfo(
    recordMsgEl,
    `保存しました：${formatDate(record.date)} / ${record.place}` +
      `（試合数 ${record.matches}、ゴール ${sumGoals(record)}、アシスト ${record.assists.total} / ${selectedTarget} ${record.assists.toTarget}、股抜き ${record.nutmegs.total}）`,
  );

  // 年月候補が増える可能性がある
  if (filterYM) {
    const cur = filterYM.value;
    buildYMOptions(loadRecords(), cur);
  }

  resetForm();
  openDoneModal();
});

/* ====== filterYM options ====== */
function getYMLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}
function buildYMOptions(records, preferValue = "") {
  if (!filterYM) return;

  const yms = uniq(
    records
      .map((r) => String(r?.date || "").slice(0, 7))
      .filter((v) => /^\d{4}-\d{2}$/.test(v)),
  ).sort((a, b) => b.localeCompare(a));

  const currentYM = nowYM();
  const final = yms.includes(currentYM) ? yms : [currentYM, ...yms];

  let html = `<option value="all">すべて</option>`;
  html += final
    .map((ym) => `<option value="${ym}">${getYMLabel(ym)}</option>`)
    .join("");

  filterYM.innerHTML = html;

  let next = currentYM;
  if (preferValue) {
    const exists = [...filterYM.options].some((o) => o.value === preferValue);
    if (exists) next = preferValue;
  }
  filterYM.value = next;
}

/* ====== Filters ====== */
function applyFilters(records) {
  const ym = (filterYM?.value || "").trim(); // "YYYY-MM" or "all"
  const p = filterPlace.value || "";

  return records.filter((r) => {
    if (!r?.date) return false;

    if (ym && ym !== "all") {
      const rYM = String(r.date).slice(0, 7);
      if (rYM !== ym) return false;
    }

    if (p && r.place !== p) return false;
    return true;
  });
}
filterYM?.addEventListener("change", renderMypage);
filterPlace.addEventListener("change", renderMypage);

/* ====== KPI ====== */
function renderKPIs(records) {
  const playDays = uniq(
    records.map((r) => r?.date).filter((v) => typeof v === "string" && v),
  ).length;

  let matchSum = 0;

  let gr = 0,
    gl = 0,
    gh = 0,
    at = 0,
    ai = 0,
    nm = 0;

  let nmGoal = 0,
    nmAssistPass = 0,
    nmPass = 0,
    nmDribble = 0,
    nmOnly = 0;

  for (const r of records) {
    matchSum += typeof r.matches === "number" ? r.matches : 1;

    gr += r.goals?.right ?? 0;
    gl += r.goals?.left ?? 0;
    gh += r.goals?.head ?? 0;

    at += r.assists?.total ?? 0;
    ai += r.assists?.toTarget ?? r.assists?.toPivo ?? 0;

    const nutTotal =
      typeof r.nutmegs === "number" ? r.nutmegs : (r.nutmegs?.total ?? 0);
    nm += nutTotal;

    const d = typeof r.nutmegs === "object" ? r.nutmegs?.details : null;
    nmGoal += d?.goal ?? 0;
    nmAssistPass += d?.assistPass ?? 0;
    nmPass += d?.pass ?? 0;
    nmDribble += d?.dribble ?? 0;
    nmOnly += d?.only ?? 0;
  }

  kpiPlayDays.textContent = playDays;
  kpiMatches.textContent = matchSum;

  kpiGR.textContent = gr;
  kpiGL.textContent = gl;
  kpiGH.textContent = gh;
  kpiGoals.textContent = gr + gl + gh;

  kpiAssists.textContent = at;
  kpiAI.textContent = ai;

  kpiNutmegs.textContent = nm;
  kpiNmGoal.textContent = nmGoal;
  kpiNmAssistPass.textContent = nmAssistPass;
  kpiNmPass.textContent = nmPass;
  kpiNmDribble.textContent = nmDribble;
  kpiNmOnly.textContent = nmOnly;
}

/* ====== Accordion list ====== */
function groupByYM(records) {
  const map = new Map(); // ym -> records[]
  for (const r of records) {
    const ym = String(r?.date || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    if (!map.has(ym)) map.set(ym, []);
    map.get(ym).push(r);
  }
  const yms = [...map.keys()].sort((a, b) => b.localeCompare(a));
  return { map, yms };
}

function renderRecordsItems(recordsInGroup) {
  const sorted = [...recordsInGroup].sort((a, b) =>
    (b.date + b.createdAt).localeCompare(a.date + a.createdAt),
  );

  return sorted
    .map((r) => {
      const g = sumGoals(r);
      const nm =
        typeof r.nutmegs === "number" ? r.nutmegs : (r.nutmegs?.total ?? 0);
      const tName = r.assists?.targetName || r.assists?.pivoName || UNSET;
      const tCount = r.assists?.toTarget ?? r.assists?.toPivo ?? 0;
      const matches = typeof r.matches === "number" ? r.matches : 1;

      return `
        <div class="item" data-id="${r.id}">
          <div class="itemRow">
            <div class="itemMain">
              <div class="itemDate">${formatDate(r.date)}</div>
              <div class="itemPlace">${escapeHtml(r.place)}</div>

              <div class="muted small itemMeta">
                試合数：${matches} /
                ゴール：右${r.goals.right} 左${r.goals.left} 頭${r.goals.head}（計${g}） /
                アシスト：${r.assists.total}（${escapeHtml(tName)} ${tCount}） /
                股抜き：${nm}
              </div>
            </div>

            <div class="itemActions">
              <button class="btn danger small" data-action="delete" data-id="${r.id}">削除</button>
            </div>
          </div>

          ${
            r.memo
              ? `<div class="sep"></div><div class="muted small">メモ：${escapeHtml(
                  r.memo,
                )}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

/* ★「すべて」選択時用：月ごとの合計（試合数/ゴール/アシスト/股抜き） */
function calcMonthSummary(recordsInGroup) {
  let matches = 0;
  let goals = 0;
  let assists = 0;
  let nutmegs = 0;

  for (const r of recordsInGroup) {
    matches += typeof r.matches === "number" ? r.matches : 1;
    goals += sumGoals(r);
    assists += r.assists?.total ?? 0;

    const nm =
      typeof r.nutmegs === "number" ? r.nutmegs : (r.nutmegs?.total ?? 0);
    nutmegs += nm;
  }

  return { matches, goals, assists, nutmegs };
}

function renderList(records, { openYM, showMonthSummary = false } = {}) {
  if (!records || records.length === 0) {
    list.innerHTML = `<div class="muted">該当する記録がありません。</div>`;
    return;
  }

  const { map, yms } = groupByYM(records);

  let ymToOpen = openYM || "";
  if (!ymToOpen) {
    const cur = nowYM();
    ymToOpen = yms.includes(cur) ? cur : yms[0] || "";
  }

  list.innerHTML = yms
    .map((ym) => {
      const group = map.get(ym) || [];
      const isOpen = ym === ymToOpen;

      const headerLabel = getYMLabel(ym);
      const countLabel = `${group.length}件`;

      // ★「すべて」のときだけ、月ヘッダに合計表示
      let summaryHtml = "";
      if (showMonthSummary) {
        const s = calcMonthSummary(group);
        summaryHtml = `
          <span class="sub">
            ${escapeHtml(countLabel)} /
            試合${s.matches} / G${s.goals} / A${s.assists} / NM${s.nutmegs}
          </span>
        `;
      } else {
        summaryHtml = `<span class="sub">${escapeHtml(countLabel)}</span>`;
      }

      return `
        <div class="accItem" data-ym="${ym}">
          <button
            type="button"
            class="accHeaderBtn"
            data-action="toggleYM"
            data-ym="${ym}"
            aria-expanded="${isOpen ? "true" : "false"}"
          >
            <span>${escapeHtml(headerLabel)}</span>
            ${summaryHtml}
          </button>
          <div class="accBody ${isOpen ? "" : "hidden"}" data-ym-body="${ym}">
            ${renderRecordsItems(group)}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderMypage() {
  msgClear(mypageMsgEl);

  const settings = loadSettings();
  const places = getPlaces(settings);
  renderPlaceSelect(filterPlace, places, { includeAllOption: true });

  const all = loadRecords();

  if (filterYM && filterYM.options.length === 0) {
    buildYMOptions(all);
  }

  const filtered = applyFilters(all);
  renderKPIs(filtered);

  const selectedYM = (filterYM?.value || "").trim();

  if (selectedYM === "all") {
    renderList(filtered, {
      openYM: nowYM(), // 「すべて」は現在月だけ開く
      showMonthSummary: true, // ★月ヘッダ合計を表示
    });
  } else {
    renderList(filtered, {
      openYM: selectedYM || nowYM(),
      showMonthSummary: false,
    });
  }
}

/* ====== List click (delete + accordion toggle) ====== */
function closeAllAccBodies(exceptYM = "") {
  const bodies = list.querySelectorAll("[data-ym-body]");
  bodies.forEach((b) => {
    const ym = b.getAttribute("data-ym-body");
    if (ym !== exceptYM) b.classList.add("hidden");
  });

  const headers = list.querySelectorAll("button[data-action='toggleYM']");
  headers.forEach((btn) => {
    const ym = btn.dataset.ym;
    if (ym !== exceptYM) btn.setAttribute("aria-expanded", "false");
  });
}

list.addEventListener("click", (e) => {
  // アコーディオン開閉（排他）
  const toggleBtn = e.target.closest("button[data-action='toggleYM']");
  if (toggleBtn) {
    const ym = toggleBtn.dataset.ym;
    const body = list.querySelector(`[data-ym-body="${ym}"]`);
    if (!body) return;

    const isHidden = body.classList.contains("hidden");

    // ★排他：開く場合は他を閉じる
    if (isHidden) {
      closeAllAccBodies(ym);
      body.classList.remove("hidden");
      toggleBtn.setAttribute("aria-expanded", "true");
    } else {
      // 閉じるのは許可（全部閉じてもOK）
      body.classList.add("hidden");
      toggleBtn.setAttribute("aria-expanded", "false");
    }
    return;
  }

  // 削除
  const delBtn = e.target.closest("button[data-action='delete']");
  if (!delBtn) return;

  const id = delBtn.dataset.id;
  const beforeYM = filterYM?.value || "";

  const records = loadRecords().filter((r) => r.id !== id);
  saveRecords(records);

  msgInfo(mypageMsgEl, "1件削除しました。");

  if (filterYM) {
    buildYMOptions(records, beforeYM);
  }
  renderMypage();
});

/* ====== Wipe all records ====== */
wipeBtn.addEventListener("click", () => {
  msgClear(mypageMsgEl);
  openWipeModal();
});
wipeConfirmBtn.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  closeWipeModal();

  msgInfo(mypageMsgEl, "全データを削除しました。");

  if (filterYM) buildYMOptions([], nowYM());
  renderMypage();
});

/* ====== Export / Import ====== */
exportBtn.addEventListener("click", () => {
  msgClear(mypageMsgEl);

  const data = {
    exportedAt: new Date().toISOString(),
    records: loadRecords(),
    version: 4,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `futsal_records_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  msgInfo(mypageMsgEl, "エクスポートしました。");
});

importBtn.addEventListener("click", () => {
  msgClear(mypageMsgEl);
  importFile.click();
});

importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  if (!file) return;

  msgClear(mypageMsgEl);

  try {
    const text = await file.text();
    const json = JSON.parse(text);

    const incoming = Array.isArray(json.records) ? json.records : [];
    const cleaned = incoming.filter((r) => r && r.id && r.date && r.place);

    const current = loadRecords();
    const byId = new Map(current.map((r) => [r.id, r]));

    for (const r of cleaned) {
      if (!r.assists) r.assists = { total: 0, targetName: UNSET, toTarget: 0 };
      if (!r.goals) r.goals = { right: 0, left: 0, head: 0 };
      if (!r.nutmegs)
        r.nutmegs = {
          total: 0,
          details: { goal: 0, assistPass: 0, pass: 0, dribble: 0, only: 0 },
        };
      if (typeof r.matches !== "number") r.matches = 1;

      if (!byId.has(r.id)) byId.set(r.id, r);
    }

    const merged = [...byId.values()];
    saveRecords(merged);

    if (filterYM) {
      const cur = filterYM.value;
      buildYMOptions(merged, cur);
    }

    msgInfo(mypageMsgEl, `インポート完了：${cleaned.length}件（重複は除外）`);
    renderMypage();
  } catch {
    msgError(
      mypageMsgEl,
      "インポートに失敗しました。JSONファイルを確認してください。",
    );
  } finally {
    importFile.value = "";
  }
});

/* ====== Settings screen ====== */
function renderSettings() {
  msgClear(settingsMsgEl);

  const settings = loadSettings();

  const targets = uniq(
    (settings.assistTargets || []).map((v) => v.trim()).filter(Boolean),
  );
  assistTargetsContainer.innerHTML = targets.length
    ? targets
        .map(
          (name) => `
        <div class="placeRow">
          <div class="name">${escapeHtml(name)}</div>
          <button class="btn danger" data-action="delTarget" data-name="${escapeHtml(
            name,
          )}">削除</button>
        </div>
      `,
        )
        .join("")
    : `<div class="muted small">対象選手が未登録です（未設定でも記録は可能です）。</div>`;

  renderAssistTargetSelect(settings);

  const places = getPlaces(settings);
  renderPlaceSelect(elPlace, places, { includeAllOption: false });
  renderPlaceSelect(filterPlace, places, { includeAllOption: true });

  placesContainer.innerHTML = places
    .map((p) => {
      const isDefault = DEFAULT_PLACES.includes(p);
      const canDelete = !isDefault && p !== "その他";
      return `
      <div class="placeRow">
        <div class="name">${escapeHtml(p)}</div>
        ${
          canDelete
            ? `<button class="btn danger" data-action="delPlace" data-name="${escapeHtml(
                p,
              )}">削除</button>`
            : `<span class="muted small">既定</span>`
        }
      </div>
    `;
    })
    .join("");
}

addAssistTargetBtn.addEventListener("click", () => {
  msgClear(settingsMsgEl);

  const name = (newAssistTargetName.value || "").trim();
  if (!name) return msgError(settingsMsgEl, "対象選手名を入力してください。");
  if (name === UNSET)
    return msgError(settingsMsgEl, "「未設定」は予約語のため追加できません。");

  const s = loadSettings();
  const current = uniq(
    (s.assistTargets || []).map((v) => v.trim()).filter(Boolean),
  );
  if (current.includes(name))
    return msgError(settingsMsgEl, "同じ選手がすでに存在します。");

  s.assistTargets = uniq([...current, name]);
  saveSettings(s);

  newAssistTargetName.value = "";
  msgInfo(settingsMsgEl, "対象選手を追加しました。");
  renderSettings();
});

assistTargetsContainer.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='delTarget']");
  if (!btn) return;

  msgClear(settingsMsgEl);

  const name = (btn.dataset.name || "").trim();
  const s = loadSettings();
  s.assistTargets = (s.assistTargets || []).filter((v) => v !== name);

  if ((s.selectedAssistTarget || "").trim() === name) {
    s.selectedAssistTarget = UNSET;
  }

  saveSettings(s);
  msgInfo(settingsMsgEl, "対象選手を削除しました。");
  renderSettings();
});

assistTargetSelect.addEventListener("change", () => {
  const s = loadSettings();
  s.selectedAssistTarget = (assistTargetSelect.value || "").trim() || UNSET;
  saveSettings(s);
});

addPlaceBtn.addEventListener("click", () => {
  msgClear(settingsMsgEl);

  const name = (newPlaceName.value || "").trim();
  if (!name)
    return msgError(settingsMsgEl, "追加する場所名を入力してください。");
  if (name === "その他")
    return msgError(settingsMsgEl, "「その他」は予約語のため追加できません。");

  const s = loadSettings();
  const all = getPlaces(s);
  if (all.includes(name))
    return msgError(settingsMsgEl, "同じ場所がすでに存在します。");

  s.customPlaces = uniq([...(s.customPlaces || []), name]);
  saveSettings(s);

  newPlaceName.value = "";
  msgInfo(settingsMsgEl, "場所を追加しました。");
  renderSettings();
});

placesContainer.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-action='delPlace']");
  if (!btn) return;

  msgClear(settingsMsgEl);

  const name = (btn.dataset.name || "").trim();
  const s = loadSettings();
  s.customPlaces = (s.customPlaces || []).filter((p) => p !== name);
  saveSettings(s);

  msgInfo(settingsMsgEl, "場所を削除しました。");
  renderSettings();
});

/* ====== Init ====== */
buildCountSelect(elGR);
buildCountSelect(elGL);
buildCountSelect(elGH);

buildCountSelect(elAT);
buildCountSelect(elAToTarget);

buildCountSelect(elNutTotal);
buildCountSelect(elNmGoal);
buildCountSelect(elNmAssistPass);
buildCountSelect(elNmPass);
buildCountSelect(elNmDribble);
buildCountSelect(elNmOnly);

buildCountSelect(elMatches, { min: 1, max: 20, defaultValue: 1 });

resetForm();
closeDoneModal();
closeWipeModal();

/* ====== tab deep-link (from analysis etc.) ====== */
function applyHashTab() {
  const hash = (location.hash || "").toLowerCase();
  if (hash.includes("tab=mypage")) showTab("mypage");
  else if (hash.includes("tab=settings")) showTab("settings");
  else if (hash.includes("tab=record")) showTab("record");
}
window.addEventListener("hashchange", applyHashTab);

/* boot */
(function boot() {
  const s = loadSettings();
  const places = getPlaces(s);

  renderPlaceSelect(elPlace, places, { includeAllOption: false });
  renderPlaceSelect(filterPlace, places, { includeAllOption: true });
  renderAssistTargetSelect(s);
  renderSettings();

  if (filterYM) buildYMOptions(loadRecords());

  // ★ analysis から戻ったときなどにタブ反映
  applyHashTab();
})();

/* ====== Data analysis button ====== */
function openAnalysisPage() {
  // マイページの現在フィルタを取得（存在しない場合にも壊れないように）
  const ym = (filterYM?.value || "").trim(); // "2026-02" or ""(すべて)
  const place = (filterPlace?.value || "").trim(); // "" = すべて

  const params = new URLSearchParams();
  // ym は「すべて」の場合は空になっている想定（必要なら "all" にしてもOK）
  if (ym) params.set("ym", ym);
  if (place) params.set("place", place);

  // ※将来、他の条件も渡したくなったらここに追加できます
  // ★戻り先を判別できるよう returnTo を付ける（analysis.js 側で使う）
  params.set("returnTo", "mypage");

  const url = `analysis.html${params.toString() ? "?" + params.toString() : ""}`;

  // ★PWAで安定：同一画面で遷移（別タブ/別ウィンドウにしない）
  location.href = url;
}

analysisBtn?.addEventListener("click", () => {
  openAnalysisPage();
});

/* ====== Service Worker registration ====== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
