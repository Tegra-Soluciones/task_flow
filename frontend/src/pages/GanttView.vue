<template>
  <div class="gantt-page">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="page-header">
      <h2 class="page-title">Gantt</h2>
      <div class="week-controls">
        <div class="week-nav">
          <button class="nav-btn" @click="weekOffset--">‹ Anterior</button>
          <button class="nav-btn today-btn" @click="weekOffset = 0">Esta semana</button>
          <button class="nav-btn" @click="weekOffset++">Siguiente ›</button>
        </div>
        <span class="week-label">{{ weekRangeLabel }}</span>
        <div v-if="saving" class="saving-badge">Guardando…</div>
      </div>
    </div>

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando tareas…" />
    </div>

    <!-- ── Unassigned tasks panel ─────────────────────────────────────────── -->
    <div v-if="!loading" class="unassigned-panel">
      <button class="unassigned-toggle" @click="showUnassigned = !showUnassigned">
        <ChevronRightIcon
          class="toggle-chevron"
          :class="{ rotated: showUnassigned }"
          :size="14"
        />
        <span class="toggle-label">Sin asignar</span>
        <span class="unassigned-badge">{{ unassignedTasks.length }}</span>
        <span class="toggle-hint">{{ showUnassigned ? 'Ocultar' : 'Mostrar' }}</span>
      </button>

      <div v-if="showUnassigned" class="unassigned-list">
        <div v-if="!unassignedTasks.length" class="unassigned-empty">
          No hay tareas sin asignar.
        </div>
        <div
          v-for="task in unassignedTasks"
          :key="task.name"
          class="unassigned-row"
        >
          <span
            class="u-priority-dot"
            :style="{ background: PRIORITY_BAR_COLOR[task.priority] || 'var(--tf-primary)' }"
          />
          <button class="u-name" @click="goToTask(task.name)">{{ task.subject }}</button>
          <span class="u-dates">
            {{ task.exp_start_date ? fmtDate(task.exp_start_date) : '—' }}
            <template v-if="task.exp_end_date"> → {{ fmtDate(task.exp_end_date) }}</template>
          </span>
          <div class="u-mini-gantt" title="Semana actual">
            <div
              v-for="(d, i) in weekDays"
              :key="i"
              class="u-mini-cell"
              :class="{
                active: taskSpansDay(task, d.iso),
                today: d.isToday,
              }"
            />
          </div>
          <select
            class="u-assign-select"
            :disabled="saving"
            @change="quickAssign(task, $event.target.value); $event.target.value = ''"
          >
            <option value="">Asignar a…</option>
            <option v-for="u in systemUsers" :key="u.name" :value="u.name">
              {{ u.full_name || u.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- ── Grid ──────────────────────────────────────────────────────────── -->
    <div v-if="!loading" class="gantt-scroll">

      <!-- Sticky column header -->
      <div class="g-head">
        <div class="g-usr-col g-hdr-cell g-hdr-usr">Asignado a</div>
        <div
          v-for="d in weekDays"
          :key="d.iso"
          class="g-day-col g-hdr-cell"
          :class="{ 'is-today': d.isToday }"
        >
          <span class="g-d-name">{{ d.name }}</span>
          <span class="g-d-num">{{ d.num }}</span>
          <span class="g-d-month">{{ d.month }}</span>
        </div>
      </div>

      <!-- User rows -->
      <div
        v-for="row in userRows"
        :key="row.key"
        class="g-row"
        :style="{ height: rowH(row) + 'px' }"
      >
        <!-- Sticky user label -->
        <div class="g-usr-col g-usr-cell">
          <UserAvatar :name="row.label" :src="row.avatar || null" :size="26" />
          <span class="g-usr-name">{{ row.label }}</span>
        </div>

        <!-- Days area: drop zones + absolute task bars -->
        <div class="g-days">

          <!-- Per-day drop zones -->
          <div
            v-for="(d, di) in weekDays"
            :key="di"
            class="g-day-zone"
            :class="{
              'is-today': d.isToday,
              'is-drop':  dropTarget?.rowKey === row.key && dropTarget?.di === di,
            }"
            @dragover.prevent="dropTarget = { rowKey: row.key, di }"
            @drop.prevent="handleDrop(row, d)"
          />

          <!-- Task bars (absolute positioned) -->
          <div
            v-for="(task, ti) in row.tasks"
            :key="task.name"
            class="g-bar"
            :class="[`p-${(task.priority || 'medium').toLowerCase()}`, { 'is-overdue': isOverdue(task), 'no-date': !task.exp_start_date }]"
            :style="barStyle(task, ti)"
            draggable="true"
            @dragstart="onDragStart($event, task, row)"
            @dragend="dropTarget = null"
            @click.stop="goToTask(task.name)"
          >
            <span class="g-bar-label">{{ task.subject }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ChevronRightIcon } from "lucide-vue-next";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import {
  getTasks, setTaskFields, addAssignment, removeAssignment,
  getUser, getSystemUsers, fmtDate, isOverdue,
} from "../api/index.js";

const router = useRouter();

// ── Grid constants ────────────────────────────────────────────────────────────
const CELL_W  = 150; // px per day column
const TASK_H  = 30;  // px per task bar
const TASK_GAP = 4;  // gap between stacked bars in same row
const ROW_PAD  = 6;  // top/bottom padding inside each user row

// ── Priority colors (matches bar colors) ──────────────────────────────────────
const PRIORITY_BAR_COLOR = { Urgent: "#dc2626", High: "#d97706", Medium: "var(--tf-primary)", Low: "#6b7280" };

// ── State ─────────────────────────────────────────────────────────────────────
const allTasks      = ref([]);
const loading       = ref(true);
const saving        = ref(false);
const userCache     = ref({});
const systemUsers   = ref([]);
const weekOffset    = ref(0);
const dragging      = ref(null);    // { task, fromRow }
const dropTarget    = ref(null);    // { rowKey, di }
const showUnassigned = ref(true);

// ── Week dates ────────────────────────────────────────────────────────────────
const weekStart = computed(() => {
  const now = new Date();
  const dow  = now.getDay();
  const diff = dow === 0 ? -6 : 1 - dow; // roll back to Monday
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff + weekOffset.value * 7);
  mon.setHours(0, 0, 0, 0);
  return mon;
});

const DAY_NAMES  = ["Lun", "Mar", "Mié", "Jue", "Vie"];
const MONTH_ABBR = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const weekDays = computed(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return DAY_NAMES.map((name, i) => {
    const d = new Date(weekStart.value);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return {
      date:    d,
      iso:     d.toISOString().slice(0, 10),
      name,
      num:     d.getDate(),
      month:   MONTH_ABBR[d.getMonth()],
      isToday: d.getTime() === today.getTime(),
    };
  });
});

const weekRangeLabel = computed(() => {
  const [a, b] = [weekDays.value[0], weekDays.value[4]];
  return a.month === b.month
    ? `${a.num} – ${b.num} de ${a.month}`
    : `${a.num} ${a.month} – ${b.num} ${b.month}`;
});

// ── User rows (assigned only — unassigned shown in panel above) ───────────────
const userRows = computed(() => {
  const tasks = allTasks.value;
  const emails = new Set();
  tasks.forEach(t => (t._assignees || []).forEach(e => emails.add(e)));

  const rows = [];
  for (const email of emails) {
    const info = userCache.value[email] || {};
    rows.push({
      key:    email,
      email,
      label:  info.full_name || email,
      avatar: info.user_image || null,
      tasks:  tasks.filter(t => (t._assignees || []).includes(email)),
    });
  }
  return rows;
});

// ── Unassigned tasks ──────────────────────────────────────────────────────────
const unassignedTasks = computed(() =>
  allTasks.value.filter(t => !(t._assignees || []).length)
);

// ── Bar geometry ──────────────────────────────────────────────────────────────
function dayDiff(a, b) {
  return Math.round((+b - +a) / 86_400_000);
}

function barStyle(task, ti) {
  const ws = weekStart.value;

  // Parse dates at midnight local to avoid timezone offset issues
  const parseDate = (str) => {
    if (!str) return null;
    const [y, m, d] = str.slice(0, 10).split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0, 0, 0, 0);
    return dt;
  };

  const startDt = parseDate(task.exp_start_date) || new Date(ws);
  const endDt   = parseDate(task.exp_end_date)   || new Date(startDt);

  const s = dayDiff(ws, startDt); // may be < 0
  const e = dayDiff(ws, endDt);   // may be > 4

  // Entirely outside this week → hide
  if (e < 0 || s > 4) return { display: "none" };

  const cs = Math.max(0, s);
  const ce = Math.min(4, e);

  return {
    left:   `${cs * CELL_W + 4}px`,
    width:  `${Math.max(30, (ce - cs + 1) * CELL_W - 8)}px`,
    top:    `${ROW_PAD + ti * (TASK_H + TASK_GAP)}px`,
    height: `${TASK_H}px`,
  };
}

function rowH(row) {
  const n = row.tasks.length;
  return ROW_PAD * 2 + Math.max(TASK_H, n * (TASK_H + TASK_GAP));
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
function onDragStart(e, task, fromRow) {
  dragging.value = { task, fromRow };
  e.dataTransfer.effectAllowed = "move";
}

async function handleDrop(toRow, day) {
  const drag = dragging.value;
  dropTarget.value = null;
  dragging.value   = null;
  if (!drag || saving.value) return;

  const { task, fromRow } = drag;

  // Preserve task duration; default to 1 day (start = end = drop day)
  const prevStart = task.exp_start_date;
  const prevEnd   = task.exp_end_date;
  const dur = (prevStart && prevEnd)
    ? dayDiff(new Date(prevStart + "T00:00:00"), new Date(prevEnd + "T00:00:00"))
    : 0;

  const newStartDt = new Date(day.date);
  const newEndDt   = new Date(day.date);
  newEndDt.setDate(newEndDt.getDate() + Math.max(0, dur));

  const startStr = newStartDt.toISOString().slice(0, 10);
  const endStr   = newEndDt.toISOString().slice(0, 10);

  saving.value = true;
  try {
    // Reassign if dropped onto a different user row
    const userChanged = fromRow.email !== toRow.email;
    if (userChanged) {
      if (fromRow.email) await removeAssignment(task.name, fromRow.email);
      if (toRow.email)   await addAssignment(task.name, toRow.email);
    }

    // Update both dates in a single request — two concurrent set_value calls on
    // the same row cause a MySQL "Record has changed since last read" deadlock.
    await setTaskFields(task.name, {
      exp_start_date: startStr,
      exp_end_date:   endStr,
    });

    await load();
  } finally {
    saving.value = false;
  }
}

function goToTask(name) {
  router.push({ name: "TaskDetail", params: { name } });
}

// ── Unassigned helpers ────────────────────────────────────────────────────────
function taskSpansDay(task, iso) {
  const s = task.exp_start_date?.slice(0, 10);
  const e = task.exp_end_date?.slice(0, 10);
  if (!s && !e) return false;
  const from = s || e;
  const to   = e || s;
  return iso >= from && iso <= to;
}

async function quickAssign(task, email) {
  if (!email || saving.value) return;
  saving.value = true;
  try {
    await addAssignment(task.name, email);
    await load();
  } finally {
    saving.value = false;
  }
}

// ── Data loading ──────────────────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    const [tasks, users] = await Promise.all([
      getTasks([["status", "not in", ["Cancelled", "Template"]]]),
      systemUsers.value.length ? Promise.resolve(systemUsers.value) : getSystemUsers(),
    ]);
    allTasks.value = tasks;
    if (users !== systemUsers.value) systemUsers.value = users;

    // Prefetch user info for all assignees
    const emails = new Set(tasks.flatMap(t => t._assignees || []));
    await Promise.all([...emails].map(async (e) => {
      if (!userCache.value[e]) userCache.value[e] = await getUser(e);
    }));
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
/* ── Page layout ────────────────────────────────────────────────────────────── */
.gantt-page {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 16px; flex-shrink: 0; gap: 12px; flex-wrap: wrap;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.week-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.week-nav      { display: flex; gap: 4px; }

.nav-btn {
  padding: 6px 14px;
  border: 1px solid var(--tf-border);
  border-radius: 7px;
  background: var(--tf-surface);
  color: var(--tf-text);
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms;
  white-space: nowrap;
}
.nav-btn:hover    { background: var(--tf-hover-bg); }
.today-btn        { font-weight: 600; }

.week-label {
  font-size: 14px; font-weight: 600;
  color: var(--tf-text); white-space: nowrap;
  padding: 0 4px;
}

.saving-badge {
  font-size: 11px; color: var(--tf-primary);
  background: var(--tf-active-bg);
  padding: 3px 10px; border-radius: 999px;
  animation: pulse 1s infinite alternate;
}
@keyframes pulse { from { opacity: 1; } to { opacity: .5; } }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

/* ── Scroll container ────────────────────────────────────────────────────────── */
.gantt-scroll {
  flex: 1;
  overflow: auto;
  border: 1px solid var(--tf-border);
  border-radius: 10px;
  -webkit-overflow-scrolling: touch;
  position: relative;
}

/* ── Head + rows share a flex row layout ─────────────────────────────────────── */
.g-head,
.g-row {
  display: flex;
  min-width: max-content; /* allow horizontal scroll */
}

/* ── Sticky header ───────────────────────────────────────────────────────────── */
.g-head {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--tf-surface);
  border-bottom: 2px solid var(--tf-border);
}

/* ── Column widths ────────────────────────────────────────────────────────────── */
.g-usr-col { width: 190px; flex-shrink: 0; }
.g-day-col { width: 150px; flex-shrink: 0; }

/* ── Header cells ─────────────────────────────────────────────────────────────── */
.g-hdr-cell {
  padding: 10px 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-right: 1px solid var(--tf-border);
  font-weight: 600; color: var(--tf-text-muted);
  letter-spacing: .04em;
}
.g-hdr-usr { align-items: flex-start; padding-left: 14px; font-size: 11px; text-transform: uppercase; }

.g-hdr-cell.is-today {
  background: color-mix(in srgb, var(--tf-primary) 7%, transparent);
}

.g-d-name  { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--tf-text-muted); }
.g-d-num   { font-size: 22px; font-weight: 800; color: var(--tf-text); line-height: 1.1; margin: 1px 0; }
.g-d-month { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--tf-text-faint); }
.g-hdr-cell.is-today .g-d-num,
.g-hdr-cell.is-today .g-d-name { color: var(--tf-primary); }

/* ── User (row label) cell ────────────────────────────────────────────────────── */
.g-usr-cell {
  display: flex; align-items: center; gap: 8px;
  padding: 0 12px;
  border-right: 1px solid var(--tf-border);
  border-bottom: 1px solid var(--tf-border);
  background: var(--tf-surface);
  position: sticky; left: 0; z-index: 10;
  height: 100%;
}
.g-usr-name {
  font-size: 12px; font-weight: 600; color: var(--tf-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Days area ────────────────────────────────────────────────────────────────── */
.g-days {
  position: relative;
  flex: 1;
  display: flex;
  border-bottom: 1px solid var(--tf-border);
}

/* ── Day drop zones (background cells) ────────────────────────────────────────── */
.g-day-zone {
  width: 150px;
  flex-shrink: 0;
  border-right: 1px solid var(--tf-border);
  transition: background 80ms;
  cursor: default;
}
.g-day-zone.is-today {
  background: color-mix(in srgb, var(--tf-primary) 4%, transparent);
}
.g-day-zone.is-drop {
  background: color-mix(in srgb, var(--tf-primary) 15%, transparent);
  border-color: color-mix(in srgb, var(--tf-primary) 40%, transparent);
}

/* ── Task bars ────────────────────────────────────────────────────────────────── */
.g-bar {
  position: absolute;
  border-radius: 5px;
  background: var(--tf-primary);
  color: #fff;
  font-size: 11px; font-weight: 500;
  display: flex; align-items: center;
  padding: 0 8px;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .18);
  z-index: 5;
  transition: opacity 120ms, box-shadow 120ms;
}
.g-bar:hover { opacity: .88; box-shadow: 0 2px 10px rgba(0, 0, 0, .22); }
.g-bar:active { cursor: grabbing; }

/* Priority colors */
.g-bar.p-urgent { background: #dc2626; }
.g-bar.p-high   { background: #d97706; }
.g-bar.p-medium { background: var(--tf-primary); }
.g-bar.p-low    { background: #6b7280; }
.g-bar.is-overdue { background: var(--tf-overdue); }

/* Tasks with no date — dashed border, slightly transparent */
.g-bar.no-date {
  background: transparent;
  border: 2px dashed var(--tf-primary);
  color: var(--tf-primary);
  opacity: .7;
}
.g-bar.no-date.p-urgent { border-color: #dc2626; color: #dc2626; }
.g-bar.no-date.p-high   { border-color: #d97706; color: #d97706; }
.g-bar.no-date.p-low    { border-color: #6b7280; color: #6b7280; }

.g-bar-label {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ── Unassigned panel ─────────────────────────────────────────────────────── */
.unassigned-panel {
  flex-shrink: 0;
  border: 1px solid var(--tf-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--tf-surface);
}

.unassigned-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-bottom: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 120ms;
}
.unassigned-toggle:hover { background: var(--tf-hover-bg); }
.unassigned-toggle:has(+ .unassigned-list) { border-bottom-color: var(--tf-border); }

.toggle-chevron {
  color: var(--tf-text-muted);
  flex-shrink: 0;
  transition: transform 200ms;
}
.toggle-chevron.rotated { transform: rotate(90deg); }

.toggle-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--tf-text);
}

.unassigned-badge {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, #d97706 16%, transparent);
  color: #b45309;
  font-weight: 700;
}

.toggle-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--tf-text-faint);
}

.unassigned-list {
  max-height: 310px;
  overflow-y: auto;
}

.unassigned-empty {
  padding: 16px 18px;
  font-size: 13px;
  color: var(--tf-text-muted);
  font-style: italic;
}

.unassigned-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--tf-border);
  transition: background 100ms;
}
.unassigned-row:last-child { border-bottom: none; }
.unassigned-row:hover { background: var(--tf-hover-bg); }

.u-priority-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.u-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--tf-primary);
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0;
  font-family: inherit;
}
.u-name:hover { text-decoration: underline; }

.u-dates {
  font-size: 11px;
  color: var(--tf-text-faint);
  white-space: nowrap;
  flex-shrink: 0;
}

.u-mini-gantt {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.u-mini-cell {
  width: 18px;
  height: 14px;
  border-radius: 3px;
  background: var(--tf-border);
}
.u-mini-cell.active {
  background: var(--tf-primary);
  opacity: .75;
}
.u-mini-cell.today {
  outline: 2px solid var(--tf-primary);
  outline-offset: -1px;
}
.u-mini-cell.active.today { opacity: 1; }

.u-assign-select {
  font-size: 12px;
  padding: 5px 8px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-bg);
  color: var(--tf-text);
  cursor: pointer;
  flex-shrink: 0;
  max-width: 160px;
  outline: none;
  font-family: inherit;
}
.u-assign-select:focus { border-color: var(--tf-primary); }
.u-assign-select:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 700px) {
  .week-controls {
    width: 100%;
    align-items: stretch;
  }

  .week-nav {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .nav-btn {
    width: 100%;
    justify-content: center;
  }

  .week-label,
  .saving-badge {
    width: 100%;
    text-align: center;
  }

  .u-dates,
  .u-mini-gantt {
    display: none;
  }

  .u-assign-select {
    max-width: 100%;
    width: 100%;
  }
}
</style>
