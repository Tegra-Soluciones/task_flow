<template>
  <div class="project-detail">

    <!-- Back + title -->
    <div class="page-header">
      <button class="btn-back" @click="router.push({ name: 'Projects' })">
        <ChevronLeftIcon :size="16" /> Proyectos
      </button>
      <div class="header-right">
        <button class="btn-primary" @click="showNewTask = true">+ Nueva tarea</button>
      </div>
    </div>

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando proyecto…" />
    </div>

    <template v-else-if="project">
      <!-- Project info card -->
      <div class="info-card">
        <div class="info-top">
          <h2 class="project-name">{{ project.project_name || project.name }}</h2>
          <span class="status-badge" :style="{ color: statusColor }">{{ project.status }}</span>
        </div>
        <p v-if="project.description" class="project-desc">{{ project.description }}</p>

        <!-- Stats -->
        <div class="stats-row">
          <div class="stat">
            <span class="stat-val">{{ stats.total }}</span>
            <span class="stat-label">Total</span>
          </div>
          <div class="stat">
            <span class="stat-val text-primary">{{ stats.open }}</span>
            <span class="stat-label">Abiertas</span>
          </div>
          <div class="stat">
            <span class="stat-val text-warning">{{ stats.in_progress }}</span>
            <span class="stat-label">En progreso</span>
          </div>
          <div class="stat">
            <span class="stat-val text-danger">{{ stats.overdue }}</span>
            <span class="stat-label">Vencidas</span>
          </div>
          <div class="stat">
            <span class="stat-val text-success">{{ stats.completed }}</span>
            <span class="stat-label">Completadas</span>
          </div>
        </div>

        <div class="progress-row">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: stats.progress + '%' }" />
          </div>
          <span class="progress-label">{{ stats.progress }}% completado</span>
        </div>
      </div>

      <!-- Kanban board filtered to this project -->
      <div class="section-title-row">
        <h3 class="section-title">Tareas</h3>
      </div>

      <div v-if="tasksLoading" class="center-wrap">
        <LoadingSpinner :size="28" label="Cargando tareas…" />
      </div>

      <div v-else-if="!visibleTasks.length" class="center-wrap small">
        <EmptyState title="Sin tareas" description="Agrega la primera tarea a este proyecto." />
      </div>

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
              <div v-if="task._assignees?.length" class="card-assignees">
                <UserAvatar
                  v-for="email in task._assignees.slice(0, 3)"
                  :key="email"
                  :name="email"
                  :size="20"
                  class="card-avatar"
                />
              </div>
            </div>
            <div v-if="!col.tasks.length" class="col-empty">Sin tareas</div>
          </div>
        </div>
      </div>
    </template>

    <!-- New task modal -->
    <NewTaskModal
      v-if="showNewTask"
      :default-project="routeName"
      @close="showNewTask = false"
      @created="onTaskCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ChevronLeftIcon } from "lucide-vue-next";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import NewTaskModal from "../components/shared/NewTaskModal.vue";
import { usePrefsStore } from "../stores/prefs.js";
import {
  getProject, getProjectStats, getTasks, setTaskField,
  STATUS_COLOR, STATUS_LABEL, fmtDate, isDueSoon, isDueToday, isOverdue,
} from "../api/index.js";

const route = useRoute();
const router = useRouter();
const prefs = usePrefsStore();

const routeName   = computed(() => route.params.name);
const project     = ref(null);
const stats       = ref({ total: 0, open: 0, in_progress: 0, overdue: 0, completed: 0, progress: 0 });
const loading     = ref(true);
const allTasks    = ref([]);
const tasksLoading = ref(true);
const showNewTask = ref(false);
const dragging    = ref(null);

const statusColor = computed(() => {
  const s = project.value?.status;
  return s === "Completed" ? "#16a34a" : s === "Cancelled" ? "#6b7280" : "#2563eb";
});

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

async function loadAll() {
  const name = routeName.value;
  loading.value = true;
  tasksLoading.value = true;
  try {
    const [proj, s, tasks] = await Promise.all([
      getProject(name),
      getProjectStats(name),
      getTasks([["project", "=", name], ["status", "not in", ["Cancelled", "Template"]]]),
    ]);
    project.value = proj;
    if (s) {
      stats.value = {
        total:       s.total       || 0,
        open:        s.by_status?.Open || 0,
        in_progress: (s.by_status?.Working || 0) + (s.by_status?.["Pending Review"] || 0),
        overdue:     s.overdue     || 0,
        completed:   s.completed   || 0,
        progress:    s.progress    || 0,
      };
    }
    allTasks.value = tasks;
  } finally {
    loading.value = false;
    tasksLoading.value = false;
  }
}

onMounted(loadAll);
watch(routeName, loadAll);

function onDragStart(e, task) {
  dragging.value = task;
  e.dataTransfer.effectAllowed = "move";
}

async function onDrop(e, newStatus) {
  const task = dragging.value;
  dragging.value = null;
  if (!task || task.status === newStatus || newStatus === "Overdue") return;
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
.project-detail {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.btn-back {
  display: flex; align-items: center; gap: 4px;
  background: transparent; border: none;
  font-size: 13px; color: var(--tf-text-muted); cursor: pointer;
  padding: 6px 0;
  transition: color 120ms;
}
.btn-back:hover { color: var(--tf-text); }

.btn-primary {
  padding: 7px 14px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover { background: var(--tf-primary-hover); }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
.center-wrap.small { min-height: 120px; flex: unset; }

/* Info card */
.info-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 10px;
  padding: 20px;
  display: flex; flex-direction: column; gap: 14px;
  flex-shrink: 0;
}
.info-top { display: flex; align-items: flex-start; gap: 12px; }
.project-name { margin: 0; font-size: 20px; font-weight: 700; color: var(--tf-text); flex: 1; }
.status-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--tf-hover-bg); }
.project-desc { margin: 0; font-size: 14px; color: var(--tf-text-muted); line-height: 1.5; }

.stats-row { display: flex; gap: 20px; flex-wrap: wrap; }
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat-val { font-size: 22px; font-weight: 700; color: var(--tf-text); }
.stat-label { font-size: 11px; color: var(--tf-text-faint); text-transform: uppercase; }
.text-primary { color: var(--tf-primary); }
.text-warning { color: #7c3aed; }
.text-danger  { color: var(--tf-overdue); }
.text-success { color: #16a34a; }

.progress-row { display: flex; align-items: center; gap: 10px; }
.progress-bar { flex: 1; height: 8px; background: var(--tf-border); border-radius: 4px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--tf-primary); border-radius: 4px; transition: width 400ms; }
.progress-label { font-size: 12px; color: var(--tf-text-muted); white-space: nowrap; }

/* Section */
.section-title-row { flex-shrink: 0; }
.section-title { margin: 0; font-size: 14px; font-weight: 700; color: var(--tf-text); }

/* Kanban — same as MyTasks */
.kanban-board {
  display: flex; gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  flex: 1;
  padding-bottom: 8px;
}
.kanban-col {
  flex: 0 0 220px;
  display: flex; flex-direction: column;
  background: var(--tf-bg); border-radius: 8px;
  overflow: hidden; border: 1px solid var(--tf-border);
}
.col-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px;
  border-top: 3px solid;
  background: var(--tf-surface); flex-shrink: 0;
}
.col-title { font-size: 12px; font-weight: 700; color: var(--tf-text); text-transform: uppercase; letter-spacing: .05em; }
.col-count { font-size: 11px; background: var(--tf-hover-bg); color: var(--tf-text-muted); padding: 1px 7px; border-radius: 999px; }
.col-body { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
.col-empty { font-size: 12px; color: var(--tf-text-faint); text-align: center; padding: 20px 0; font-style: italic; }

.kanban-card {
  background: var(--tf-surface); border: 1px solid var(--tf-border);
  border-radius: 7px; padding: 10px; cursor: grab;
  display: flex; flex-direction: column; gap: 6px;
  transition: box-shadow 120ms;
}
.kanban-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,.1); }
.kanban-card.overdue { border-left: 3px solid var(--tf-overdue); }
.kanban-card.due-soon { border-color: color-mix(in srgb, #d97706 26%, var(--tf-border)); }
.kanban-card.compact {
  padding: 8px;
  gap: 5px;
}
.kanban-card.compact .card-subject { font-size: 12px; }
.kanban-card.compact .card-due,
.kanban-card.compact .card-alert { font-size: 10px; }
.card-subject { font-size: 13px; font-weight: 500; color: var(--tf-text); line-height: 1.4; }
.card-meta { display: flex; align-items: center; gap: 6px; }
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
.card-due.due-today { color: #d97706; font-weight: 600; }
.card-due.due-soon { color: #b45309; font-weight: 600; }
.card-assignees { display: flex; }
.card-avatar { margin-right: -4px; border: 2px solid var(--tf-surface); border-radius: 50%; }

@media (max-width: 700px) {
  .page-header,
  .info-top,
  .progress-row {
    align-items: stretch;
    flex-direction: column;
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
