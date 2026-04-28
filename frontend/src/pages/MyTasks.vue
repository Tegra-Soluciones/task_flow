<template>
  <div class="page-my-tasks">
    <div class="page-header">
      <div>
        <h2 class="page-title">Mis Tareas</h2>
        <p class="page-sub">{{ userStore.displayName }}</p>
      </div>
      <button class="btn-primary" @click="showNewTask = true">+ Nueva tarea</button>
    </div>

    <NewTaskModal
      v-if="showNewTask"
      :default-assignee="userStore.email"
      @close="showNewTask = false"
      @created="onTaskCreated"
    />

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando…" />
    </div>

    <div v-else-if="!visibleTasks.length" class="center-wrap">
      <EmptyState title="Sin tareas asignadas" description="No tienes tareas pendientes." />
    </div>

    <!-- Kanban board -->
    <div v-else class="kanban-board">
      <div
        v-for="col in columns"
        :key="col.status"
        class="kanban-col"
        @dragover.prevent
        @drop="onDrop($event, col.status)"
      >
        <div class="col-header" :style="{ borderTopColor: col.color }">
          <span class="col-title">{{ col.label }}</span>
          <span class="col-count">{{ col.tasks.length }}</span>
        </div>

        <div class="col-body">
          <div
            v-for="task in col.tasks"
            :key="task.name"
            class="kanban-card"
            :class="{
              overdue: isOverdue(task),
              compact: prefs.compactCards,
              'due-soon': isDueSoon(task, prefs.dueSoonDays) || isDueToday(task),
            }"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @click="goToTask(task.name)"
          >
            <div class="card-subject">{{ task.subject }}</div>

            <div class="card-meta">
              <span v-if="task.project" class="card-project">{{ task.project }}</span>
              <span v-if="isDueToday(task)" class="card-alert today">Vence hoy</span>
              <span v-else-if="isDueSoon(task, prefs.dueSoonDays)" class="card-alert">Por vencer</span>
              <span
                v-if="task.exp_end_date"
                class="card-due"
                :class="{
                  'due-overdue': isOverdue(task),
                  'due-today': isDueToday(task),
                  'due-soon': isDueSoon(task, prefs.dueSoonDays),
                }"
              >
                {{ fmtDate(task.exp_end_date) }}
              </span>
            </div>

            <div v-if="task.progress" class="card-progress-bar">
              <div class="card-progress-fill" :style="{ width: task.progress + '%' }" />
            </div>

            <div class="card-footer">
              <div class="card-assignees">
                <UserAvatar
                  v-for="email in (task._assignees || []).slice(0, 3)"
                  :key="email"
                  :name="email"
                  :size="20"
                  class="card-avatar"
                />
              </div>
              <span v-if="task.priority" class="card-priority" :style="{ color: PRIORITY_COLOR[task.priority] }">
                {{ PRIORITY_LABEL[task.priority] }}
              </span>
            </div>
          </div>

          <div v-if="!col.tasks.length" class="col-empty">Sin tareas</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import NewTaskModal from "../components/shared/NewTaskModal.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import { usePrefsStore } from "../stores/prefs.js";
import { useUserStore } from "../stores/user.js";
import {
  getTasks, setTaskField,
  STATUS_COLOR, STATUS_LABEL, PRIORITY_COLOR, PRIORITY_LABEL,
  fmtDate, isDueSoon, isDueToday, isOverdue,
} from "../api/index.js";

const prefs = usePrefsStore();
const userStore = useUserStore();
const router = useRouter();

const allTasks    = ref([]);
const loading     = ref(true);
const showNewTask = ref(false);
const dragging    = ref(null);

const KANBAN_STATUSES = [
  { status: "Open",           label: "Abiertas",    color: STATUS_COLOR["Open"] },
  { status: "Working",        label: "En progreso", color: STATUS_COLOR["Working"] },
  { status: "Pending Review", label: "En revisión", color: STATUS_COLOR["Pending Review"] },
  { status: "Overdue",        label: "Vencidas",    color: STATUS_COLOR["Overdue"] },
  { status: "Completed",      label: "Completadas", color: STATUS_COLOR["Completed"] },
];

const visibleTasks = computed(() =>
  prefs.showCompleted
    ? allTasks.value
    : allTasks.value.filter((task) => task.status !== "Completed")
);

const visibleStatuses = computed(() =>
  prefs.showCompleted
    ? KANBAN_STATUSES
    : KANBAN_STATUSES.filter((column) => column.status !== "Completed")
);

const columns = computed(() =>
  visibleStatuses.value.map(col => ({
    ...col,
    tasks: visibleTasks.value.filter(t => {
      if (col.status === "Overdue") return isOverdue(t) && t.status !== "Completed";
      if (col.status === "Open")    return t.status === "Open" && !isOverdue(t);
      return t.status === col.status;
    }),
  }))
);

async function load() {
  loading.value = true;
  try {
    allTasks.value = await getTasks([
      ["_assign", "like", `%${userStore.email}%`],
      ["status", "not in", ["Cancelled", "Template"]],
    ]);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

// ── Drag & drop ───────────────────────────────────────────────────────────────
function onDragStart(e, task) {
  dragging.value = task;
  e.dataTransfer.effectAllowed = "move";
}

async function onDrop(e, newStatus) {
  const task = dragging.value;
  dragging.value = null;
  if (!task || task.status === newStatus) return;
  if (newStatus === "Overdue") return; // can't manually drag to overdue
  task.status = newStatus;
  await setTaskField(task.name, "status", newStatus);
}

function onTaskCreated(task) {
  if (task) {
    allTasks.value.unshift(task);
    showNewTask.value = false;
    router.push({ name: "TaskDetail", params: { name: task.name } });
  }
}

function goToTask(name) {
  router.push({ name: "TaskDetail", params: { name } });
}
</script>

<style scoped>
.page-my-tasks {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding-bottom: 16px;
  flex-shrink: 0;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }
.page-sub   { margin: 3px 0 0; font-size: 13px; color: var(--tf-text-muted); }

.btn-primary {
  padding: 7px 14px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px;
  font-weight: 500; cursor: pointer; white-space: nowrap;
  transition: background 120ms;
}
.btn-primary:hover { background: var(--tf-primary-hover); }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

/* ── Kanban ─────────────────────────────────────────────────────────────── */
.kanban-board {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
}

.kanban-col {
  flex: 0 0 240px;
  display: flex;
  flex-direction: column;
  background: var(--tf-bg);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--tf-border);
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-top: 3px solid;
  background: var(--tf-surface);
  flex-shrink: 0;
}
.col-title { font-size: 12px; font-weight: 700; color: var(--tf-text); text-transform: uppercase; letter-spacing: .05em; }
.col-count {
  font-size: 11px;
  background: var(--tf-hover-bg);
  color: var(--tf-text-muted);
  padding: 1px 7px;
  border-radius: 999px;
}

.col-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.col-empty {
  font-size: 12px;
  color: var(--tf-text-faint);
  text-align: center;
  padding: 20px 0;
  font-style: italic;
}

/* ── Card ───────────────────────────────────────────────────────────────── */
.kanban-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 7px;
  padding: 10px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: box-shadow 120ms, transform 120ms;
}
.kanban-card:hover {
  box-shadow: 0 2px 12px rgba(0,0,0,.1);
  transform: translateY(-1px);
}
.kanban-card:active { cursor: grabbing; }
.kanban-card.overdue { border-left: 3px solid var(--tf-overdue); }
.kanban-card.due-soon { border-color: color-mix(in srgb, #d97706 26%, var(--tf-border)); }
.kanban-card.compact {
  padding: 8px;
  gap: 5px;
}
.kanban-card.compact .card-subject { font-size: 12px; }
.kanban-card.compact .card-project,
.kanban-card.compact .card-due,
.kanban-card.compact .card-alert,
.kanban-card.compact .card-priority { font-size: 10px; }

.card-subject { font-size: 13px; font-weight: 500; color: var(--tf-text); line-height: 1.4; }

.card-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.card-project { font-size: 11px; color: var(--tf-text-faint); background: var(--tf-hover-bg); padding: 1px 6px; border-radius: 4px; }
.card-alert {
  font-size: 10px;
  font-weight: 700;
  color: #b45309;
  background: #ffedd5;
  padding: 1px 7px;
  border-radius: 999px;
}
.card-alert.today {
  color: #92400e;
  background: #fef3c7;
}
.card-due { font-size: 11px; color: var(--tf-text-muted); }
.card-due.due-overdue { color: var(--tf-overdue); font-weight: 600; }
.card-due.due-today   { color: #d97706; font-weight: 600; }
.card-due.due-soon    { color: #b45309; font-weight: 600; }

.card-progress-bar {
  height: 3px;
  background: var(--tf-border);
  border-radius: 2px;
  overflow: hidden;
}
.card-progress-fill { height: 100%; background: var(--tf-primary); border-radius: 2px; }

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-assignees { display: flex; gap: -4px; }
.card-avatar { margin-right: -4px; border: 2px solid var(--tf-surface); border-radius: 50%; }
.card-priority { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; }

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
  }

  .kanban-board {
    gap: 10px;
  }

  .kanban-col {
    flex-basis: min(82vw, 300px);
  }

  .btn-primary {
    width: 100%;
    justify-content: center;
  }
}
</style>
