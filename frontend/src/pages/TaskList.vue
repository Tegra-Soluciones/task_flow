<template>
  <div class="page-task-list">
    <div class="page-header">
      <h2 class="page-title">Todas las Tareas</h2>
      <button class="btn-primary" @click="showNewTask = true">+ Nueva tarea</button>
    </div>

    <FilterBar />

    <NewTaskModal
      v-if="showNewTask"
      @close="showNewTask = false"
      @created="onTaskCreated"
    />

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando tareas…" />
    </div>

    <div v-else-if="!sortedTasks.length" class="center-wrap">
      <EmptyState
        title="No hay tareas"
        description="No se encontraron tareas con los filtros actuales."
      />
    </div>

    <div v-else class="table-wrap">
      <table class="task-table">
        <thead>
          <tr>
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
              <td colspan="6" class="project-cell">
                <span class="project-label">{{ row.label }}</span>
                <span class="project-total">{{ row.count }}</span>
              </td>
            </tr>
            <tr
              v-else
              class="task-row"
              @click="goToTask(row.task.name)"
            >
            <td class="col-subject">
              <div class="subject-cell">
                <span
                  class="status-dot"
                  :style="{ background: STATUS_COLOR[row.task.status] }"
                />
                <span class="subject-text">{{ row.task.subject }}</span>
              </div>
            </td>
            <td class="col-status">
              <span class="status-badge" :style="{ '--c': STATUS_COLOR[row.task.status] }">
                {{ STATUS_LABEL[row.task.status] || row.task.status }}
              </span>
            </td>
            <td class="col-priority">
              <span
                class="priority-text"
                :style="{ color: PRIORITY_COLOR[row.task.priority] }"
              >
                {{ PRIORITY_LABEL[row.task.priority] || row.task.priority || "—" }}
              </span>
            </td>
            <td class="col-project">
              <span class="cell-muted">{{ row.task.project || "—" }}</span>
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

      <div class="table-footer">
        {{ sortedTasks.length }} tarea{{ sortedTasks.length !== 1 ? "s" : "" }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import FilterBar from "../components/shared/FilterBar.vue";
import NewTaskModal from "../components/shared/NewTaskModal.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import { useFiltersStore } from "../stores/filters.js";
import { usePrefsStore } from "../stores/prefs.js";
import {
  getTasks,
  STATUS_COLOR, STATUS_LABEL,
  PRIORITY_COLOR, PRIORITY_LABEL,
  fmtDate, isDueSoon, isDueToday, isOverdue, todayISO,
} from "../api/index.js";

const filters     = useFiltersStore();
const prefs       = usePrefsStore();
const router      = useRouter();

const allTasks    = ref([]);
const loading     = ref(true);
const showNewTask = ref(false);
const sort        = ref({ field: "exp_end_date", dir: 1 });

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

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
      rows.push({
        type: "group",
        key: `group::${groupKey}`,
        label,
        count,
      });
      currentGroup = groupKey;
    }

    rows.push({ type: "task", key: task.name, task });
  }

  return rows;
});

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
.page-task-list { height: 100%; display: flex; flex-direction: column; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.btn-primary {
  padding: 7px 14px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover { background: var(--tf-primary-hover); }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

/* Table container */
.table-wrap {
  flex: 1; overflow: auto; display: flex; flex-direction: column;
  border: 1px solid var(--tf-border); border-radius: 8px;
  -webkit-overflow-scrolling: touch;
}

.task-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  font-size: 13px;
}

thead {
  position: sticky; top: 0; z-index: 1;
  background: var(--tf-surface);
}

thead th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11px; font-weight: 600;
  color: var(--tf-text-faint);
  text-transform: uppercase; letter-spacing: .04em;
  border-bottom: 1px solid var(--tf-border);
  white-space: nowrap;
}
thead th.sortable { cursor: pointer; user-select: none; }
thead th.sortable:hover { color: var(--tf-text); }

.sort-icon { opacity: 0.5; margin-left: 3px; font-size: 10px; }

tbody tr.task-row {
  border-bottom: 1px solid var(--tf-border);
  cursor: pointer;
  transition: background 100ms;
}
tbody tr.task-row:last-child { border-bottom: none; }
tbody tr.task-row:hover { background: var(--tf-hover-bg); }

tbody td {
  padding: 10px 14px;
  vertical-align: middle;
  color: var(--tf-text);
}

.project-row td {
  padding: 10px 14px 6px;
  background: color-mix(in srgb, var(--tf-surface) 92%, var(--tf-bg));
  border-bottom: 1px solid var(--tf-border);
}

.project-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.project-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--tf-text-faint);
  letter-spacing: .05em;
  text-transform: uppercase;
}

.project-total {
  font-size: 10px;
  color: var(--tf-text-muted);
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--tf-hover-bg);
}

/* Column widths */
.col-subject  { min-width: 200px; }
.col-status   { width: 120px; }
.col-priority { width: 100px; }
.col-project  { width: 140px; }
.col-assignee { width: 100px; }
.col-date     { width: 110px; white-space: nowrap; }

/* Subject cell */
.subject-cell { display: flex; align-items: center; gap: 8px; }
.status-dot   { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.subject-text { font-weight: 500; color: var(--tf-text); }

/* Status badge */
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px; font-weight: 600;
  background: color-mix(in srgb, var(--c) 12%, transparent);
  color: var(--c);
}

.priority-text { font-weight: 500; font-size: 12px; }

.cell-muted { color: var(--tf-text-muted); }
.cell-faint { color: var(--tf-text-faint); }

/* Assignee avatars */
.avatar-row { display: flex; align-items: center; }
.stacked-avatar { margin-left: -6px; }
.stacked-avatar:first-child { margin-left: 0; }

/* Date */
.date-cell { font-size: 12px; color: var(--tf-text-muted); }
.date-overdue { color: var(--tf-overdue); font-weight: 600; }
.date-warning { color: #b45309; font-weight: 600; }

/* Footer */
.table-footer {
  padding: 8px 14px;
  font-size: 12px; color: var(--tf-text-faint);
  border-top: 1px solid var(--tf-border);
  background: var(--tf-surface);
}

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
