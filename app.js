/* ====== Storage ====== */
const STORAGE_KEY = "futsal_records_v1";
const SETTINGS_KEY = "futsal_settings_v2";
const FILTER_STATE_KEY = "futsal_filter_state_v1";

/* ★最後に使った日付を保持 */
const LAST_DATE_KEY = "futsal_last_date_v1";

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
/* ★表示名だけ差し替え（value=旧名のまま） */
const PLACE_LABEL_OVERRIDES = {
  マリノストリコールパーク: "マリノストリコロールパーク新吉田",
};

function placeLabelOf(value) {
  return PLACE_LABEL_OVERRIDES[value] || value;
}

/* ====== Play video tags ====== */
const VIDEO_TAGS = [
  "ゴール",
  "アシスト",
  "股抜き",
  "ベストゴール",
  "ベストアシスト",
  "ナイス連携",
  "Good Play",
  "Bad Play",
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
function loadFilterState() {
  try {
    const raw = localStorage.getItem(FILTER_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveFilterState(state) {
  try {
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(state));
  } catch {}
}

// ★マイページのフィルタ select が用意できた後に呼ぶ
function restoreMypageFilters(filterYMEl, filterPlaceEl) {
  const st = loadFilterState();
  if (!st) return;

  // option生成後にセットするのが重要
  if (filterYMEl && typeof st.ym === "string") {
    // "all" の保存はしない設計なので "" = すべて
    filterYMEl.value = st.ym || "";
  }
  if (filterPlaceEl && typeof st.place === "string") {
    filterPlaceEl.value = st.place || "";
  }
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
function getGoalTotal(r) {
  const g = r?.goals || {};
  // 新形式（goals.total）があれば優先
  if (typeof g.total === "number" && Number.isFinite(g.total) && g.total >= 0) {
    return g.total;
  }
  // 旧形式（right/left/head の合算）
  return (g.right ?? 0) + (g.left ?? 0) + (g.head ?? 0);
}

function sumGoals(r) {
  return getGoalTotal(r);
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
    const label = placeLabelOf(p); // ★表示だけ差し替え
    html += `<option value="${escapeHtml(p)}">${escapeHtml(label)}</option>`;
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
/* ★日付選択時点で保持（即時セット扱い） */
elDate?.addEventListener("input", () => setLastDate(elDate.value));
elDate?.addEventListener("change", () => setLastDate(elDate.value));

const elPlace = document.getElementById("place");
const elMatches = document.getElementById("matches");

const elGT = document.getElementById("gTotal");
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

/* ====== Play video inputs ====== */
const videoInputs = document.getElementById("videoInputs");
const addVideoBtn = document.getElementById("addVideoBtn");

const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");

/* ====== Edit state ====== */
let editingId = null; // null なら新規、id が入っていれば修正中

/* ====== Record Delete Button (edit only) ====== */
// HTMLにボタンが無い場合でも動くように生成する
let recordDeleteBtn = document.getElementById("recordDeleteBtn");
if (!recordDeleteBtn && resetBtn) {
  recordDeleteBtn = document.createElement("button");
  recordDeleteBtn.id = "recordDeleteBtn";
  recordDeleteBtn.type = "button";
  recordDeleteBtn.className = "btn danger"; // 既存のbtnクラスに合わせる
  recordDeleteBtn.textContent = "削除";
  recordDeleteBtn.classList.add("hidden");

  // 「入力をリセット」ボタンの下（同じ親の末尾）に置く
  resetBtn.parentElement?.appendChild(recordDeleteBtn);
}

// 編集モード時だけ削除ボタンを出す
function setEditMode(on) {
  if (on) {
    recordDeleteBtn?.classList.remove("hidden");
  } else {
    recordDeleteBtn?.classList.add("hidden");
    editingId = null;
  }
}

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
const doneModalTitle = document.getElementById("doneModalTitle");
const doneModalText = document.getElementById("doneModalText");

const wipeModal = document.getElementById("wipeModal");
const wipeCancelBtn = document.getElementById("wipeCancelBtn");
const wipeConfirmBtn = document.getElementById("wipeConfirmBtn");

/* ====== Modal helpers ====== */
let doneModalAfterClose = null;

function openDoneModal(
  title = "記録完了",
  text = "保存しました。",
  afterClose = null,
) {
  if (doneModalTitle) doneModalTitle.textContent = title;
  if (doneModalText) doneModalText.textContent = text;
  doneModalAfterClose = typeof afterClose === "function" ? afterClose : null;
  doneModal.classList.remove("hidden");
}

function closeDoneModal() {
  doneModal.classList.add("hidden");
  const fn = doneModalAfterClose;
  doneModalAfterClose = null;
  if (fn) fn();
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

/* ====== Play映像登録 helpers ====== */
const VIDEO_MIN_ROWS = 3;
const VIDEO_MAX_ROWS = 10;

function videoTagOptionsHtml(selected = "") {
  return VIDEO_TAGS.map((t) => {
    const sel = t === selected ? " selected" : "";
    return `<option value="${escapeHtml(t)}"${sel}>${escapeHtml(t)}</option>`;
  }).join("");
}

function createVideoRow({ url = "", tag = "その他" } = {}, rowIndex = 0) {
  const row = document.createElement("div");
  row.className = "videoRow";

  const urlInput = document.createElement("input");
  urlInput.type = "url";
  urlInput.placeholder = "https://...（YouTube等）";
  urlInput.className = "videoUrl";
  urlInput.value = url;

  const tagSelect = document.createElement("select");
  tagSelect.className = "videoTag";
  tagSelect.innerHTML = videoTagOptionsHtml(tag);

  row.appendChild(urlInput);
  row.appendChild(tagSelect);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "btn danger videoDelBtn";
  delBtn.textContent = "×";

  delBtn.addEventListener("click", () => {
    const rows = [...videoInputs.querySelectorAll(".videoRow")];
    const index = rows.indexOf(row);

    // ★先頭3行は削除不可
    if (index < VIDEO_MIN_ROWS) return;

    row.remove();
    updateAddVideoBtnState();
  });

  // ★4行目以降だけ × を表示（0始まりなので 3 以上）
  if (rowIndex >= VIDEO_MIN_ROWS) {
    row.appendChild(delBtn);
  }

  return row;
}

function updateAddVideoBtnState() {
  const count = videoInputs?.querySelectorAll(".videoRow").length || 0;
  if (addVideoBtn) {
    addVideoBtn.disabled = count >= VIDEO_MAX_ROWS;
  }
}

function ensureVideoRows(minCount = VIDEO_MIN_ROWS) {
  if (!videoInputs) return;
  const cur = videoInputs.querySelectorAll(".videoRow").length;
  for (let i = cur; i < minCount; i++) {
    // 初期は「その他」にしておく
    videoInputs.appendChild(createVideoRow({ url: "", tag: "その他" }, i));
  }
  updateAddVideoBtnState();
}

function clearAndInitVideoRows(defaultCount = VIDEO_MIN_ROWS) {
  if (!videoInputs) return;
  videoInputs.innerHTML = "";
  ensureVideoRows(defaultCount);
}

function collectVideosFromUI() {
  if (!videoInputs) return [];
  const rows = [...videoInputs.querySelectorAll(".videoRow")];

  const videos = rows
    .map((row) => {
      const url = (row.querySelector("input.videoUrl")?.value || "").trim();
      const tag =
        (row.querySelector("select.videoTag")?.value || "その他").trim() ||
        "その他";
      return { url, tag };
    })
    // URLが空の行は保存しない（空行が残っててもOK）
    .filter((v) => v.url);

  return videos;
}

function loadVideosToUI(videos = []) {
  if (!videoInputs) return;

  videoInputs.innerHTML = "";

  const src = Array.isArray(videos) ? videos : [];
  src.slice(0, VIDEO_MAX_ROWS).forEach((v, idx) => {
    videoInputs.appendChild(
      createVideoRow({ url: v.url || "", tag: v.tag || "その他" }, idx),
    );
  });

  // 既存が少ない場合は最低3行まで埋める
  ensureVideoRows(VIDEO_MIN_ROWS);
}

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
function getLastDate() {
  const v = (localStorage.getItem(LAST_DATE_KEY) || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}
function setLastDate(iso) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) {
    localStorage.setItem(LAST_DATE_KEY, iso);
  }
}
function setDefaultDateToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  elDate.value = `${yyyy}-${mm}-${dd}`;
}

/* ★優先：最後に使った日付 → なければ今日 */
function setDefaultDatePreferLast() {
  const last = getLastDate();
  if (last) elDate.value = last;
  else setDefaultDateToday();
}
function setDefaultDateToday() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  elDate.value = `${yyyy}-${mm}-${dd}`;
}
function resetForm() {
  setDefaultDatePreferLast(); // ★最後に記録した日付を維持
  elPlace.value = "";
  elMemo.value = "";
  msgClear(recordMsgEl);

  if (elMatches) elMatches.value = "1";

  if (elGT) elGT.value = "0";

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

  // ★Play映像入力も初期化（3行）
  clearAndInitVideoRows(3);

  // リセットしたら修正モード解除
  setEditMode(false);
}
resetBtn.addEventListener("click", resetForm);

/* ====== Play映像：追加ボタン ====== */
addVideoBtn?.addEventListener("click", () => {
  if (!videoInputs) return;

  const count = videoInputs.querySelectorAll(".videoRow").length;
  if (count >= VIDEO_MAX_ROWS) return;

  // ★追加する行は必ず4行目以降扱いになるので count をrowIndexとして渡す
  videoInputs.appendChild(createVideoRow({ url: "", tag: "その他" }, count));

  updateAddVideoBtnState();
});

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

function loadRecordToForm(record) {
  if (!record) return;

  editingId = record.id;
  setEditMode(true);

  // タブ移動（まず記録画面を出す）
  showTab("record");
  location.hash = "#tab=record"; // 任意（戻ったときにタブ維持したい場合）

  // 値を流し込み
  elDate.value = record.date || "";
  elPlace.value = record.place || "";

  if (elMatches) elMatches.value = String(record.matches ?? 1);

  // goals
  const g = record.goals || {};
  if (elGT) elGT.value = String(g.total ?? 0);
  elGR.value = String(g.right ?? 0);
  elGL.value = String(g.left ?? 0);
  elGH.value = String(g.head ?? 0);

  // assists
  const a = record.assists || {};
  elAT.value = String(a.total ?? 0);
  elAToTarget.value = String(a.toTarget ?? 0);

  // 対象選手
  const tName = (a.targetName || UNSET).trim() || UNSET;
  if ([...assistTargetSelect.options].some((o) => o.value === tName)) {
    assistTargetSelect.value = tName;
  } else {
    assistTargetSelect.value = UNSET;
  }

  // nutmegs
  const nm = record.nutmegs || {};
  if (typeof nm === "number") {
    elNutTotal.value = String(nm);
    elNmGoal.value = "0";
    elNmAssistPass.value = "0";
    elNmPass.value = "0";
    elNmDribble.value = "0";
    elNmOnly.value = "0";
  } else {
    elNutTotal.value = String(nm.total ?? 0);
    const d = nm.details || {};
    elNmGoal.value = String(d.goal ?? 0);
    elNmAssistPass.value = String(d.assistPass ?? 0);
    elNmPass.value = String(d.pass ?? 0);
    elNmDribble.value = String(d.dribble ?? 0);
    elNmOnly.value = String(d.only ?? 0);
  }

  // ★Play映像（編集時に復元）
  loadVideosToUI(record.playVideos || []);

  elMemo.value = record.memo || "";

  msgInfo(
    recordMsgEl,
    `修正モード：${formatDate(record.date)} / ${placeLabelOf(record.place)}`,
  );
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

  // ===== ゴール整合性チェック（修正版） =====
  const goalsTotal = n(elGT?.value);
  const goalsRight = n(elGR.value);
  const goalsLeft = n(elGL.value);
  const goalsHead = n(elGH.value);

  const goalsBreakSum = goalsRight + goalsLeft + goalsHead;

  // ★ 内訳が1つでも入力されている場合のみチェック
  const hasGoalBreakdown = goalsRight > 0 || goalsLeft > 0 || goalsHead > 0;

  if (hasGoalBreakdown && goalsTotal !== goalsBreakSum) {
    return msgError(
      recordMsgEl,
      `ゴール総数（${goalsTotal}）と内訳合計（右${goalsRight}+左${goalsLeft}+頭${goalsHead}=${goalsBreakSum}）が一致しません。修正してください。`,
    );
  }

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
      total: goalsTotal,
      right: goalsRight,
      left: goalsLeft,
      head: goalsHead,
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
    playVideos: collectVideosFromUI(),
  };

  const records = loadRecords();

  if (editingId) {
    // 更新：同じIDを探して置換
    const idx = records.findIndex((r) => r.id === editingId);
    if (idx >= 0) {
      // createdAt は保持したい場合は維持（必要なら）
      record.id = editingId;
      record.createdAt = records[idx].createdAt || record.createdAt;
      record.updatedAt = new Date().toISOString();
      records[idx] = record;
    } else {
      // 見つからない場合は新規扱いにフォールバック
      records.push(record);
    }
    saveRecords(records);

    setLastDate(date);

    msgInfo(
      recordMsgEl,
      `更新しました：${formatDate(record.date)} / ${placeLabelOf(record.place)}` +
        `（試合数 ${record.matches}、ゴール ${sumGoals(record)}、アシスト ${record.assists.total} / ${record.assists.targetName} ${record.assists.toTarget}、股抜き ${record.nutmegs.total}）`,
    );

    // 更新後は編集モード解除
    setEditMode(false);
  } else {
    // 新規
    records.push(record);
    saveRecords(records);

    setLastDate(date);

    msgInfo(
      recordMsgEl,
      `保存しました：${formatDate(record.date)} / ${record.place}` +
        `（試合数 ${record.matches}、ゴール ${sumGoals(record)}、アシスト ${record.assists.total} / ${record.assists.targetName} ${record.assists.toTarget}、股抜き ${record.nutmegs.total}）`,
    );
  }

  settings.selectedAssistTarget = selectedTarget;
  saveSettings(settings);

  // 年月候補が増える可能性がある
  if (filterYM) {
    const cur = filterYM.value;
    buildYMOptions(loadRecords(), cur);
  }

  resetForm();
  openDoneModal("記録完了", "保存しました。", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

recordDeleteBtn?.addEventListener("click", () => {
  msgClear(recordMsgEl);

  if (!editingId) return;

  const records = loadRecords();
  const target = records.find((r) => r.id === editingId);
  if (!target) {
    msgError(recordMsgEl, "削除対象データが見つかりません。");
    setEditMode(false);
    return;
  }

  const next = records.filter((r) => r.id !== editingId);
  saveRecords(next);

  // 画面下メッセージ（任意：残してOK）
  msgInfo(
    recordMsgEl,
    `該当データを削除しました：${formatDate(target.date)} / ${target.place}`,
  );

  // 年月候補の更新（必要なら）
  if (filterYM) buildYMOptions(next, filterYM.value);

  // フォームを初期化＆編集解除
  resetForm();
  setEditMode(false);

  // ★ここが今回の要件：削除モーダルを出して、OK押下でマイページへ
  openDoneModal("削除完了", "削除しました。", () => {
    showTab("mypage");
    location.hash = "#tab=mypage"; // 任意（URLにも反映したいなら）
  });
});

/* ====== filterYM options ====== */
function getYMLabel(ym) {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}
function buildYMOptions(records, preferValue = "") {
  if (!filterYM) return;

  // すべての YYYY-MM を抽出
  const yms = uniq(
    records
      .map((r) => String(r?.date || "").slice(0, 7))
      .filter((v) => /^\d{4}-\d{2}$/.test(v)),
  ).sort((a, b) => b.localeCompare(a)); // 新しい月が上

  // 年を抽出（YYYY）
  const years = uniq(yms.map((ym) => ym.slice(0, 4))).sort((a, b) =>
    b.localeCompare(a),
  );

  // 表示用ラベル
  const yearLabel = (y) => `${y}年`;
  const ymLabel = (ym) => {
    const [y, m] = ym.split("-");
    return `${y}年${Number(m)}月`;
  };

  let html = `<option value="all">すべて</option>`;

  // 年 → 月 の順で追加
  html += years
    .map((y) => `<option value="${y}">${yearLabel(y)}</option>`)
    .join("");
  html += yms
    .map((ym) => `<option value="${ym}">${ymLabel(ym)}</option>`)
    .join("");

  filterYM.innerHTML = html;

  // 選択状態の復元
  let next = "all";
  if (preferValue) {
    const exists = [...filterYM.options].some((o) => o.value === preferValue);
    if (exists) next = preferValue;
  }
  filterYM.value = next;
}

/* ====== Filters ====== */
function applyFilters(records) {
  const ym = (filterYM?.value || "").trim(); // "YYYY-MM" or "YYYY" or "all"
  const p = filterPlace.value || "";

  return records.filter((r) => {
    if (!r?.date) return false;

    const rYM = String(r.date).slice(0, 7); // YYYY-MM
    const rY = String(r.date).slice(0, 4); // YYYY

    // 年月フィルタ
    if (ym && ym !== "all") {
      if (/^\d{4}-\d{2}$/.test(ym)) {
        // 月指定
        if (rYM !== ym) return false;
      } else if (/^\d{4}$/.test(ym)) {
        // 年指定
        if (rY !== ym) return false;
      }
    }

    // 場所フィルタ
    if (p && r.place !== p) return false;

    return true;
  });
}

filterYM?.addEventListener("change", () => {
  saveFilterState({
    ym: filterYM?.value || "all",
    place: filterPlace?.value || "",
  });
  renderMypage();
});

filterPlace.addEventListener("change", () => {
  saveFilterState({
    ym: filterYM?.value || "all",
    place: filterPlace?.value || "",
  });
  renderMypage();
});

/* ====== KPI ====== */
function renderKPIs(records) {
  const playDays = records.filter((r) => r && r.date && r.place).length;

  let matchSum = 0;

  let gr = 0,
    gl = 0,
    gh = 0,
    goalSum = 0,
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

    // ★合計は「総数があれば総数、なければ内訳合計」
    goalSum += sumGoals(r);

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
  kpiGoals.textContent = goalSum;

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

/* ===== Play映像：マイページ表示用 ===== */
function renderPlayVideosHtml(r) {
  const arr = Array.isArray(r?.playVideos) ? r.playVideos : [];
  const cleaned = arr
    .map((v) => ({
      tag: (v?.tag || "その他").trim() || "その他",
      url: (v?.url || "").trim(),
    }))
    .filter((v) => /^https?:\/\//i.test(v.url)); // URLがあるものだけ表示

  if (cleaned.length === 0) return "";

  // URL文字列は escapeして表示（hrefはそのまま入れるが安全寄りにしたければ後述のバリデーション追加）
  return `
    <div class="videoLinks">
      ${cleaned
        .map(
          (v) => `
          <div class="videoLine">
            <span class="tagBadge">${escapeHtml(v.tag)}</span>
            <a class="videoUrlLink" href="${escapeHtml(v.url)}" target="_blank" rel="noopener noreferrer">
              ${escapeHtml(v.url)}
            </a>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
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
              <div class="itemPlace">${escapeHtml(placeLabelOf(r.place))}</div>

              <div class="muted small itemMeta">
                試合数：${matches} /
                ゴール：右${r.goals.right} 左${r.goals.left} 頭${r.goals.head}（計${g}） /
                アシスト：${r.assists.total}（${escapeHtml(tName)} ${tCount}） /
                股抜き：${nm}
              </div>
              ${renderPlayVideosHtml(r)}
            </div>

            <div class="itemActions">
              <button class="btn small editBtn" data-action="edit" data-id="${r.id}">修正</button>
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

function latestYMInYear(records, year) {
  const yms = records
    .map((r) => String(r?.date || "").slice(0, 7))
    .filter((ym) => /^\d{4}-\d{2}$/.test(ym) && ym.startsWith(year + "-"))
    .sort((a, b) => b.localeCompare(a)); // 新しい月が先頭
  return yms[0] || "";
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

  // ★復元（option生成後が重要）
  restoreMypageFilters(filterYM, filterPlace);

  const filtered = applyFilters(all);
  renderKPIs(filtered);

  const selectedYM = (filterYM?.value || "").trim(); // all / YYYY / YYYY-MM

  if (selectedYM === "all") {
    renderList(filtered, {
      openYM: nowYM(), // 「すべて」は現在月を開く
      showMonthSummary: true,
    });
  } else if (/^\d{4}$/.test(selectedYM)) {
    // ★「年」選択：その年の最新月を自動で開く
    const openYM = latestYMInYear(filtered, selectedYM) || nowYM();
    renderList(filtered, {
      openYM,
      showMonthSummary: false,
    });
  } else {
    // 月選択（YYYY-MM）
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

  // 修正
  const editBtn = e.target.closest("button[data-action='edit']");
  if (!editBtn) return;

  const id = editBtn.dataset.id;
  const records = loadRecords();
  const record = records.find((r) => r.id === id);

  if (!record) return;

  // 修正モードで記録ページへ
  loadRecordToForm(record);

  // ここで return するのが重要
  return;
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
        <div class="name">${escapeHtml(placeLabelOf(p))}</div>
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
buildCountSelect(elGT);
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

// ★ここに追加
function applyHashFiltersToMypage() {
  const hash = (location.hash || "").replace(/^#/, "");
  const sp = new URLSearchParams(hash);

  const tab = (sp.get("tab") || "").toLowerCase();
  if (tab !== "mypage") return;

  const ym = (sp.get("ym") || "").trim();
  const place = (sp.get("place") || "").trim();

  if (filterYM && ym) {
    const exists = [...filterYM.options].some((o) => o.value === ym);
    if (exists) filterYM.value = ym;
  }

  if (filterPlace) {
    if (place === "") {
      filterPlace.value = "";
    } else {
      const exists = [...filterPlace.options].some((o) => o.value === place);
      if (exists) filterPlace.value = place;
    }
  }
}

// ★applyHashTab を拡張
function applyHashTab() {
  const hash = (location.hash || "").toLowerCase();
  if (hash.includes("tab=mypage")) showTab("mypage");
  else if (hash.includes("tab=settings")) showTab("settings");
  else if (hash.includes("tab=record")) showTab("record");

  // ★フィルタ復元
  applyHashFiltersToMypage();

  // ★復元後に再描画
  if (hash.includes("tab=mypage")) {
    renderMypage();
  }
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
  const ym = (filterYM?.value || "").trim(); // "all" / "YYYY" / "YYYY-MM"
  const place = (filterPlace?.value || "").trim(); // "" = すべて

  // ★ここを追加
  saveFilterState({ ym, place });

  const params = new URLSearchParams();
  if (ym) params.set("ym", ym);
  if (place) params.set("place", place);

  // ★戻り先URLを明示（ym/place 付きで返す）
  const backParams = new URLSearchParams();
  backParams.set("tab", "mypage");
  if (ym) backParams.set("ym", ym);
  if (place) backParams.set("place", place);

  // index.html に戻ったときにハッシュだけでなく ym/place も渡す
  // 例: ./index.html#tab=mypage&ym=2026&place=体育館
  params.set("back", `./index.html#${backParams.toString()}`);

  location.href = `analysis.html${params.toString() ? "?" + params.toString() : ""}`;
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
