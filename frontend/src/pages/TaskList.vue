<template>
  <div class="page-task-list">
    <!-- ── Header ────────────────────────────────────────────────────────── -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">Todas las Tareas</h2>
        <span v-if="!loading" class="page-count">{{ sortedTasks.length }} {{ sortedTasks.length === 1 ? 'tarea' : 'tareas' }}</span>
      </div>
      <button class="btn-primary" @click="showNewTask = true">
        <PlusIcon :size="14" /> Nueva tarea
      </button>
    </div>

    <FilterBar />

    <NewTaskModal
      v-if="showNewTask"
      @close="showNewTask = false"
      @created="onTaskCreated"
    />

    <!-- ── States: loading / empty ────────────────────────────────────── -->
    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando tareas…" />
    </div>

    <div v-else-if="!sortedTasks.length" class="center-wrap">
      <EmptyState
        title="No hay tareas"
        description="No se encontraron tareas con los filtros actuales."
      />
    </div>

    <!-- ── Table ─────────────────────────────────────────────────────── -->
    <div v-else class="table-wrap">
      <table class="task-table">
        <thead>
          <tr>
            <th class="col-check">
              <label class="checkbox-wrap" @click.stop>
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate.prop="someSelected && !allSelected"
                  @change="toggleSelectAll"
                />
                <span class="checkbox-mark" />
              </label>
            </th>
            <th class="col-subject sortable" @click="sortBy('subject')">
              Tarea <span class="sort-icon">{{ sortIcon('subject') }}</span>
            </th>
            <th class="col-status sortable" @click="sortBy('status')">
              Estado <span class="sort-icon">{{ sortIcon('status') }}</span>
            </th>
            <th class="col-priority sortable" @click="sortBy('priority')">
              Prioridad <span class="sort-icon">{{ sortIcon('priority') }}</span>
            </th>
            <th class="col-project sortable" @click="sortBy('project')">
              Proyecto <span class="sort-icon">{{ sortIcon('project') }}</span>
            </th>
            <th class="col-assignee">Asignado</th>
            <th class="col-date sortable" @click="sortBy('exp_end_date')">
              Vencimiento <span class="sort-icon">{{ sortIcon('exp_end_date') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in displayRows" :key="row.key">
            <tr v-if="row.type === 'group'" class="project-row">
              <td colspan="7" class="project-cell">
                <span class="project-label">{{ row.label }}</span>
                <span class="project-total">{{ row.count }}</span>
              </td>
            </tr>
            <tr
              v-else
              class="task-row"
              :class="{ selected: selected.has(row.task.name) }"
              @click="goToTask(row.task.name)"
            >
              <td class="col-check" @click.stop>
                <label class="checkbox-wrap">
                  <input
                    type="checkbox"
                    :checked="selected.has(row.task.name)"
                    @change="toggleRow(row.task.name)"
                  />
                  <span class="checkbox-mark" />
                </label>
              </td>
              <td class="col-subject">
                <div class="subject-cell">
                  <span
                    class="status-dot"
                    :style="{ background: STATUS_COLOR[row.task.status] }"
                  />
                  <div class="subject-text-wrap">
                    <span class="subject-text">{{ row.task.subject }}</span>
                    <span v-if="isOverdue(row.task)" class="row-tag overdue">Vencida</span>
                    <span v-else-if="isDueToday(row.task)" class="row-tag warn">Vence hoy</span>
                  </div>
                </div>
              </td>
              <td class="col-status">
                <span class="status-badge" :style="{ '--c': STATUS_COLOR[row.task.status] }">
                  {{ STATUS_LABEL[row.task.status] || row.task.status }}
                </span>
              </td>
              <td class="col-priority">
                <span
                  class="priority-pill"
                  :style="{
                    color: PRIORITY_COLOR[row.task.priority],
                    background: row.task.priority ? `color-mix(in srgb, ${PRIORITY_COLOR[row.task.priority]} 12%, transparent)` : 'transparent',
                  }"
                >
                  {{ PRIORITY_LABEL[row.task.priority] || row.task.priority || "—" }}
                </span>
              </td>
              <td class="col-project">
                <span v-if="row.task.project" class="project-chip">{{ row.task.project }}</span>
                <span v-else class="cell-faint">—</span>
              </td>
              <td class="col-assignee">
                <div class="avatar-row">
                  <UserAvatar
                    v-for="email in (row.task._assignees || []).slice(0, 3)"
                    :key="email"
                    :name="email"
                    :size="24"
                    class="stacked-avatar"
                  />
                  <span v-if="(row.task._assignees || []).length > 3" class="avatar-more">
                    +{{ row.task._assignees.length - 3 }}
                  </span>
                  <span v-if="!(row.task._assignees || []).length" class="cell-faint">—</span>
                </div>
              </td>
              <td class="col-date">
                <span
                  :class="[
                    'date-cell',
                    {
                      'date-overdue': isOverdue(row.task),
                      'date-warning': isDueToday(row.task) || isDueSoon(row.task, prefs.dueSoonDays),
                    },
                  ]"
                >
                  {{ row.task.exp_end_date ? fmtDate(row.task.exp_end_date) : "—" }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- ── Floating bulk-action bar ──────────────────────────────────── -->
    <Transition name="actionbar">
      <div v-if="selected.size > 0" class="action-bar">
        <div class="action-count">
          <span class="count-num">{{ selected.size }}</span>
          <span class="count-lbl">{{ selected.size === 1 ? 'seleccionada' : 'seleccionadas' }}</span>
        </div>

        <div class="action-buttons">
          <select
            class="action-select"
            :disabled="bulkSaving"
            @change="bulkSetField('status', $event.target.value); $event.target.value = ''"
          >
            <option value="">Cambiar estado…</option>
            <option v-for="s in BULK_STATUSES" :key="s" :value="s">{{ STATUS_LABEL[s] || s }}</option>
          </select>

          <select
            class="action-select"
            :disabled="bulkSaving"
            @change="bulkSetField('priority', $event.target.value); $event.target.value = ''"
          >
            <option value="">Cambiar prioridad…</option>
            <option v-for="p in TASK_PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] }}</option>
          </select>

          <button class="action-btn danger" :disabled="bulkSaving" @click="confirmDelete = true">
            <Trash2Icon :size="14" /> Eliminar
          </button>
        </div>

        <button class="action-btn ghost" @click="clearSelection">
          <XIcon :size="14" /> Cancelar
        </button>
      </div>
    </Transition>

    <!-- ── Confirm bulk delete ───────────────────────────────────────── -->
    <div v-if="confirmDelete" class="modal-backdrop" @click.self="confirmDelete = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">Eliminar {{ selected.size }} tarea{{ selected.size === 1 ? '' : 's' }}</h3>
          <button class="icon-btn" @click="confirmDelete = false"><XIcon :size="16" /></button>
        </div>
        <div class="modal-body">
          <p class="confirm-msg">
            Esta acción no se puede deshacer. ¿Eliminar las tareas seleccionadas?
          </p>
          <div v-if="bulkError" class="error-banner">{{ bulkError }}</div>
        </div>
        <div class="modal-actions">
          <button class="btn-cancel" @click="confirmDelete = false">Cancelar</button>
          <button class="btn-danger" :disabled="bulkSaving" @click="doBulkDelete">
            {{ bulkSaving ? "Eliminando…" : "Eliminar" }}
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk save toast -->
    <Transition name="toast">
      <div v-if="bulkToast" class="toast" :class="bulkToast.type">{{ bulkToast.text }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PlusIcon, Trash2Icon, XIcon } from "lucide-vue-next";
import FilterBar from "../components/shared/FilterBar.vue";
import NewTaskModal from "../components/shared/NewTaskModal.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import { useFiltersStore } from "../stores/filters.js";
import { usePrefsStore } from "../stores/prefs.js";
import {
  getTasks, bulkUpdateTasks, bulkDeleteTasks,
  STATUS_COLOR, STATUS_LABEL,
  PRIORITY_COLOR, PRIORITY_LABEL,
  TASK_PRIORITIES,
  fmtDate, isDueSoon, isDueToday, isOverdue, todayISO,
} from "../api/index.js";

const filters     = useFiltersStore();
const prefs       = usePrefsStore();
const router      = useRouter();

const allTasks    = ref([]);
const loading     = ref(true);
const showNewTask = ref(false);
const sort        = ref({ field: "exp_end_date", dir: 1 });

// ── Selection state ──────────────────────────────────────────────────
const selected      = ref(new Set());
const bulkSaving    = ref(false);
const bulkError     = ref("");
const bulkToast     = ref(null);
const confirmDelete = ref(false);

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const BULK_STATUSES  = ["Open", "Working", "Pending Review", "Completed", "Cancelled"];

const filteredTasks = computed(() =>
  allTasks.value.filter((task) => {
    if (!task) return false;
    if (!prefs.showCompleted && task.status === "Completed") return false;
    if (!filters.text) return true;
    return task.subject?.toLowerCase().includes(filters.text.toLowerCase());
  })
);

const sortedTasks = computed(() => {
  const arr = [...filteredTasks.value];
  const { field, dir } = sort.value;
  arr.sort((a, b) => {
    if (prefs.groupByProject) {
      const projectA = a.project || "zzzzzzzz";
      const projectB = b.project || "zzzzzzzz";
      const projectCompare = projectA.localeCompare(projectB, "es-MX");
      if (projectCompare !== 0) return projectCompare;
    }
    let va, vb;
    if (field === "priority") {
      va = PRIORITY_ORDER[a.priority] ?? 99;
      vb = PRIORITY_ORDER[b.priority] ?? 99;
    } else {
      va = (a[field] || "").toLowerCase?.() ?? a[field] ?? "";
      vb = (b[field] || "").toLowerCase?.() ?? b[field] ?? "";
    }
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return 0;
  });
  return arr;
});

const displayRows = computed(() => {
  if (!prefs.groupByProject) {
    return sortedTasks.value.map((task) => ({ type: "task", key: task.name, task }));
  }
  const rows = [];
  let currentGroup = null;
  for (const task of sortedTasks.value) {
    const groupKey = task.project || "__no_project__";
    if (groupKey !== currentGroup) {
      const label = task.project || "Sin proyecto";
      const count = sortedTasks.value.filter((item) => (item.project || "__no_project__") === groupKey).length;
      rows.push({ type: "group", key: `group::${groupKey}`, label, count });
      currentGroup = groupKey;
    }
    rows.push({ type: "task", key: task.name, task });
  }
  return rows;
});

// ── Selection helpers ───────────────────────────────────────────────
const allSelected = computed(() =>
  sortedTasks.value.length > 0 && sortedTasks.value.every(t => selected.value.has(t.name))
);
const someSelected = computed(() =>
  sortedTasks.value.some(t => selected.value.has(t.name))
);

function toggleRow(name) {
  const next = new Set(selected.value);
  next.has(name) ? next.delete(name) : next.add(name);
  selected.value = next;
}
function toggleSelectAll() {
  if (allSelected.value) {
    selected.value = new Set();
  } else {
    selected.value = new Set(sortedTasks.value.map(t => t.name));
  }
}
function clearSelection() {
  selected.value = new Set();
}

// ── Bulk actions ────────────────────────────────────────────────────
function showToast(text, type = "info") {
  bulkToast.value = { text, type };
  setTimeout(() => { bulkToast.value = null; }, 2800);
}

async function bulkSetField(field, value) {
  if (!value || !selected.value.size || bulkSaving.value) return;
  const names = [...selected.value];
  bulkSaving.value = true;
  try {
    const res = await bulkUpdateTasks(names, { [field]: value });
    // Optimistically update local state
    for (const t of allTasks.value) {
      if (selected.value.has(t.name)) t[field] = value;
    }
    const updated = res?.updated?.length || 0;
    const errors = res?.errors?.length || 0;
    showToast(
      errors
        ? `${updated} actualizada${updated === 1 ? '' : 's'}, ${errors} con error`
        : `${updated} tarea${updated === 1 ? '' : 's'} actualizada${updated === 1 ? '' : 's'}`,
      errors ? "warn" : "success"
    );
    clearSelection();
  } catch {
    showToast("No se pudo aplicar el cambio.", "error");
  } finally {
    bulkSaving.value = false;
  }
}

async function doBulkDelete() {
  if (!selected.value.size || bulkSaving.value) return;
  const names = [...selected.value];
  bulkSaving.value = true;
  bulkError.value = "";
  try {
    const res = await bulkDeleteTasks(names);
    const deleted = new Set(res?.deleted || []);
    allTasks.value = allTasks.value.filter(t => !deleted.has(t.name));
    confirmDelete.value = false;
    const errors = res?.errors?.length || 0;
    showToast(
      errors
        ? `${deleted.size} eliminada${deleted.size === 1 ? '' : 's'}, ${errors} con error`
        : `${deleted.size} tarea${deleted.size === 1 ? '' : 's'} eliminada${deleted.size === 1 ? '' : 's'}`,
      errors ? "warn" : "success"
    );
    clearSelection();
  } catch (err) {
    bulkError.value = "No se pudo eliminar la selección. Verifica permisos o dependencias.";
  } finally {
    bulkSaving.value = false;
  }
}

// ── Sort ─────────────────────────────────────────────────────────────
function sortBy(field) {
  if (sort.value.field === field) {
    sort.value = { field, dir: sort.value.dir * -1 };
  } else {
    sort.value = { field, dir: 1 };
  }
}
function sortIcon(field) {
  if (sort.value.field !== field) return "↕";
  return sort.value.dir === 1 ? "↑" : "↓";
}

// ── Load ─────────────────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    const f = [["status", "not in", ["Template", "Cancelled"]]];
    if (filters.project)  f.push(["project", "=", filters.project]);
    if (filters.assignee) f.push(["_assign", "like", `%${filters.assignee}%`]);
    if (filters.priority) f.push(["priority", "=", filters.priority]);
    if (filters.dateFrom) f.push(["exp_end_date", ">=", filters.dateFrom]);
    if (filters.dateTo)   f.push(["exp_end_date", "<=", filters.dateTo]);
    if (filters.onlyOverdue) {
      f.push(["exp_end_date", "<", todayISO()]);
      f.push(["status", "not in", ["Completed", "Cancelled"]]);
    }
    allTasks.value = await getTasks(f);
    clearSelection();
  } finally {
    loading.value = false;
  }
}

watch(
  () => [filters.project, filters.assignee, filters.priority, filters.dateFrom, filters.dateTo, filters.onlyOverdue],
  load,
  { deep: false }
);

onMounted(load);

function goToTask(name) {
  router.push({ name: "TaskDetail", params: { name } });
}

function onTaskCreated(task) {
  if (task) allTasks.value.unshift(task);
  showNewTask.value = false;
}
</script>

<style scoped>
.page-task-list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  position: relative;
}

/* ── Header ──────────────────────────────────────────────────────── */
.page-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.header-left { display: flex; align-items: baseline; gap: 12px; }
.page-title { margin: 0; font-size: 20px; font-weight: 700; color: var(--tf-text); }
.page-count {
  font-size: 12px;
  color: var(--tf-text-faint);
  padding: 2px 10px;
  background: var(--tf-hover-bg);
  border-radius: 999px;
  font-weight: 500;
}

.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover { background: var(--tf-primary-hover); }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

/* ── Table ──────────────────────────────────────────────────────── */
.table-wrap {
  flex: 1; overflow: auto; display: flex; flex-direction: column;
  border: 1px solid var(--tf-border); border-radius: 12px;
  -webkit-overflow-scrolling: touch;
  background: var(--tf-surface);
  box-shadow: 0 4px 14px rgba(15, 23, 42, .04);
}

.task-table {
  width: 100%;
  min-width: 880px;
  border-collapse: collapse;
  font-size: 13px;
}

thead { position: sticky; top: 0; z-index: 1; background: var(--tf-surface); }
thead th {
  padding: 12px 14px;
  text-align: left;
  font-size: 11px; font-weight: 700;
  color: var(--tf-text-faint);
  text-transform: uppercase; letter-spacing: .05em;
  border-bottom: 2px solid var(--tf-border);
  white-space: nowrap;
  background: var(--tf-surface);
}
thead th.sortable { cursor: pointer; user-select: none; }
thead th.sortable:hover { color: var(--tf-text); }
.sort-icon { opacity: 0.5; margin-left: 3px; font-size: 10px; }

/* Rows */
tbody tr.task-row {
  border-bottom: 1px solid var(--tf-border);
  cursor: pointer;
  transition: background 100ms;
}
tbody tr.task-row:last-child { border-bottom: none; }
tbody tr.task-row:hover { background: var(--tf-hover-bg); }
tbody tr.task-row.selected {
  background: color-mix(in srgb, var(--tf-primary) 8%, var(--tf-surface));
}
tbody tr.task-row.selected:hover {
  background: color-mix(in srgb, var(--tf-primary) 12%, var(--tf-surface));
}

tbody td {
  padding: 12px 14px;
  vertical-align: middle;
  color: var(--tf-text);
}

.project-row td {
  padding: 10px 14px 6px;
  background: color-mix(in srgb, var(--tf-bg) 50%, var(--tf-surface));
  border-bottom: 1px solid var(--tf-border);
}
.project-cell { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.project-label {
  font-size: 11px; font-weight: 700; color: var(--tf-text-faint);
  letter-spacing: .05em; text-transform: uppercase;
}
.project-total {
  font-size: 10px; color: var(--tf-text-muted);
  padding: 1px 7px; border-radius: 999px; background: var(--tf-hover-bg);
}

/* ── Checkbox ──────────────────────────────────────────────────── */
.col-check { width: 36px; padding-left: 16px !important; padding-right: 0 !important; }
.checkbox-wrap {
  position: relative;
  display: inline-flex;
  width: 18px; height: 18px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}
.checkbox-wrap input {
  appearance: none;
  position: absolute; inset: 0;
  margin: 0;
  cursor: pointer;
  opacity: 0;
  z-index: 2;
}
.checkbox-mark {
  width: 16px; height: 16px;
  border: 1.5px solid var(--tf-border);
  border-radius: 4px;
  background: var(--tf-surface);
  transition: background 120ms, border-color 120ms;
  position: relative;
}
.checkbox-wrap input:checked + .checkbox-mark {
  background: var(--tf-primary);
  border-color: var(--tf-primary);
}
.checkbox-wrap input:checked + .checkbox-mark::after {
  content: "";
  position: absolute;
  top: 1px; left: 4px;
  width: 5px; height: 9px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.checkbox-wrap input:indeterminate + .checkbox-mark {
  background: var(--tf-primary);
  border-color: var(--tf-primary);
}
.checkbox-wrap input:indeterminate + .checkbox-mark::after {
  content: "";
  position: absolute;
  top: 6px; left: 3px;
  width: 8px; height: 2px;
  background: #fff;
  border-radius: 2px;
}
.checkbox-wrap:hover .checkbox-mark { border-color: var(--tf-primary); }

/* Column widths */
.col-subject  { min-width: 240px; }
.col-status   { width: 130px; }
.col-priority { width: 110px; }
.col-project  { width: 150px; }
.col-assignee { width: 120px; }
.col-date     { width: 120px; white-space: nowrap; }

/* Subject cell */
.subject-cell { display: flex; align-items: center; gap: 10px; }
.status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.subject-text-wrap { display: flex; align-items: center; gap: 8px; min-width: 0; }
.subject-text {
  font-weight: 500; color: var(--tf-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row-tag {
  font-size: 10px; font-weight: 700;
  padding: 2px 7px; border-radius: 999px;
  white-space: nowrap; flex-shrink: 0;
}
.row-tag.overdue { background: color-mix(in srgb, var(--tf-overdue) 14%, transparent); color: var(--tf-overdue); }
.row-tag.warn    { background: #fef3c7; color: #92400e; }

/* Status badge */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px; font-weight: 600;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  color: var(--c);
}

/* Priority pill */
.priority-pill {
  display: inline-block;
  font-weight: 600; font-size: 12px;
  padding: 3px 10px; border-radius: 999px;
}

/* Project chip */
.project-chip {
  display: inline-block;
  font-size: 12px;
  color: var(--tf-text);
  background: var(--tf-hover-bg);
  padding: 3px 10px;
  border-radius: 999px;
}

.cell-faint { color: var(--tf-text-faint); }

/* Assignee avatars */
.avatar-row { display: flex; align-items: center; }
.stacked-avatar { margin-left: -6px; border: 2px solid var(--tf-surface); border-radius: 50%; }
.stacked-avatar:first-child { margin-left: 0; }
.avatar-more {
  font-size: 10px; font-weight: 700;
  margin-left: 4px;
  color: var(--tf-text-muted);
}

/* Date */
.date-cell { font-size: 12px; color: var(--tf-text-muted); }
.date-overdue { color: var(--tf-overdue); font-weight: 600; }
.date-warning { color: #b45309; font-weight: 600; }

/* ── Floating action bar ───────────────────────────────────────── */
.action-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--tf-text);
  color: #fff;
  border-radius: 14px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 12px 36px rgba(15, 23, 42, .25);
  z-index: 90;
  flex-wrap: wrap;
  max-width: calc(100vw - 32px);
}
.action-count { display: flex; align-items: center; gap: 6px; }
.count-num {
  font-size: 14px; font-weight: 700;
  background: var(--tf-primary);
  color: #fff;
  padding: 2px 10px;
  border-radius: 999px;
  min-width: 28px;
  text-align: center;
}
.count-lbl { font-size: 12px; opacity: .85; }

.action-buttons { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.action-select {
  background: rgba(255, 255, 255, .12);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, .2);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  outline: none;
}
.action-select option { color: var(--tf-text); }
.action-select:hover { background: rgba(255, 255, 255, .18); }
.action-select:disabled { opacity: .5; cursor: not-allowed; }

.action-btn {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  transition: background 120ms;
}
.action-btn.danger {
  background: var(--tf-overdue); color: #fff;
}
.action-btn.danger:hover:not(:disabled) { background: #b91c1c; }
.action-btn.danger:disabled { opacity: .5; cursor: not-allowed; }
.action-btn.ghost {
  background: transparent;
  color: rgba(255, 255, 255, .8);
  border-color: rgba(255, 255, 255, .25);
}
.action-btn.ghost:hover { background: rgba(255, 255, 255, .1); color: #fff; }

/* Action bar transition */
.actionbar-enter-active,
.actionbar-leave-active { transition: opacity 200ms, transform 200ms; }
.actionbar-enter-from,
.actionbar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ── Modal ─────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(15, 23, 42, .45);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  z-index: 200;
}
.modal-box {
  width: min(420px, 100%);
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, .25);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 1px solid var(--tf-border);
}
.modal-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--tf-text); }
.modal-body { padding: 16px 18px; }
.modal-actions {
  padding: 12px 18px 16px;
  display: flex; justify-content: flex-end; gap: 8px;
  border-top: 1px solid var(--tf-border);
}
.confirm-msg { margin: 0; font-size: 13px; color: var(--tf-text); line-height: 1.5; }
.error-banner {
  margin-top: 10px; padding: 10px 12px;
  background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 8px; color: #b91c1c; font-size: 12px;
}
.btn-cancel {
  padding: 8px 14px; background: var(--tf-hover-bg);
  border: none; border-radius: 8px;
  font-size: 13px; color: var(--tf-text-muted); cursor: pointer;
  font-family: inherit;
}
.btn-danger {
  padding: 8px 16px; background: var(--tf-overdue); color: #fff;
  border: none; border-radius: 8px; font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit;
}
.btn-danger:disabled { opacity: .5; cursor: not-allowed; }

.icon-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: none; border-radius: 6px;
  background: transparent; color: var(--tf-text-muted);
  cursor: pointer;
}
.icon-btn:hover { background: var(--tf-hover-bg); }

/* ── Toast ─────────────────────────────────────────────────────── */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  background: var(--tf-text);
  color: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, .2);
  z-index: 300;
}
.toast.success { background: #16a34a; }
.toast.warn    { background: #d97706; }
.toast.error   { background: var(--tf-overdue); }
.toast-enter-active, .toast-leave-active { transition: opacity 200ms, transform 200ms; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-10px); }

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
    flex-direction: column;
    gap: 10px;
  }
  .btn-primary {
    width: 100%; justify-content: center;
  }

  .action-bar {
    bottom: 12px;
    left: 12px;
    right: 12px;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .actionbar-enter-from,
  .actionbar-leave-to {
    transform: translateY(20px);
  }
  .action-buttons {
    flex-direction: column;
  }
  .action-select,
  .action-btn {
    width: 100%;
    justify-content: center;
  }
  .action-count { justify-content: center; }
}
</style>
