<template>
  <div class="page-kanban">
    <div class="page-header">
      <h2 class="page-title">Kanban</h2>
    </div>

    <FilterBar />

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando…" />
    </div>

    <div v-else-if="!filteredTasks.length" class="center-wrap">
      <EmptyState
        title="No hay tareas"
        description="No hay tareas visibles con la configuración actual."
      />
    </div>

    <div v-else class="kanban-board">
      <div
        v-for="col in columns"
        :key="col.status"
        class="kanban-col"
      >
        <!-- Column header -->
        <div class="col-header">
          <div class="col-title-row">
            <span class="col-dot" :style="{ background: STATUS_COLOR[col.status] }" />
            <span class="col-title">{{ STATUS_LABEL[col.status] }}</span>
            <span class="col-count">{{ col.tasks.length }}</span>
          </div>
        </div>

        <!-- Draggable list -->
        <VueDraggable
          v-model="col.tasks"
          group="kanban"
          class="col-cards"
          item-key="name"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          @add="(evt) => onDrop(evt, col.status)"
        >
          <div
            v-for="task in col.tasks"
            :key="task.name"
            class="kanban-card"
            :class="{
              compact: prefs.compactCards,
              overdue: isOverdue(task),
              'due-soon': isDueSoon(task, prefs.dueSoonDays) || isDueToday(task),
            }"
            @click="goToTask(task.name)"
          >
            <!-- Cover image -->
            <img v-if="task.cover_image" :src="task.cover_image" class="card-cover-img" />

            <div class="card-inner">
              <!-- Badges row -->
              <div class="card-badges">
                <StatusBadge v-if="task.priority" :priority="task.priority" :dot="false" />
                <span v-if="isOverdue(task)" class="badge-overdue">Vencida</span>
                <span v-else-if="isDueToday(task)" class="badge-warning today">Vence hoy</span>
                <span v-else-if="isDueSoon(task, prefs.dueSoonDays)" class="badge-warning">Por vencer</span>
              </div>
              <!-- Title -->
              <p class="card-title">{{ task.subject }}</p>
              <!-- Project -->
              <span v-if="task.project" class="card-project">{{ task.project }}</span>

              <!-- Footer -->
              <div class="card-footer">
                <span
                  v-if="task.exp_end_date"
                  class="card-date"
                  :class="{
                    overdue: isOverdue(task),
                    warning: isDueSoon(task, prefs.dueSoonDays) || isDueToday(task),
                  }"
                >
                  <CalendarIcon :size="11" /> {{ fmtDate(task.exp_end_date) }}
                </span>
                <!-- Assignee avatars -->
                <div class="avatar-stack">
                  <UserAvatar
                    v-for="(email, i) in (task._assignees || []).slice(0, 3)"
                    :key="email"
                    :name="userCache[email]?.full_name || email"
                    :src="userCache[email]?.user_image"
                    :size="20"
                    :style="{ marginLeft: i > 0 ? '-6px' : 0, zIndex: 10 - i }"
                  />
                </div>
              </div>

              <!-- Progress bar -->
              <div v-if="task.progress" class="mini-progress">
                <div class="mini-progress-fill" :style="{ width: task.progress + '%' }" />
              </div>
            </div>

            <!-- Quick actions on hover -->
            <div class="card-quick-actions">
              <button class="qa-btn" @click.stop="quickComplete(task)" title="Completar">
                <CheckIcon :size="12" />
              </button>
              <button class="qa-btn" @click.stop="goToTask(task.name)" title="Editar">
                <PencilIcon :size="12" />
              </button>
            </div>
          </div>
        </VueDraggable>

        <!-- Inline new task form -->
        <div class="col-footer">
          <div v-if="activeNewTask === col.status" class="inline-form">
            <input
              v-model="newTaskSubject"
              class="inline-input"
              placeholder="Nombre de la tarea…"
              @keydown.enter="createInColumn(col.status)"
              @keydown.esc="activeNewTask = null"
              autofocus
            />
            <div class="inline-form-actions">
              <button class="btn-confirm" @click="createInColumn(col.status)">Agregar</button>
              <button class="btn-cancel" @click="activeNewTask = null">✕</button>
            </div>
          </div>
          <button v-else class="add-task-btn" @click="activeNewTask = col.status">
            <PlusIcon :size="13" /> Agregar tarea
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { VueDraggable } from "vue-draggable-plus";
import { CalendarIcon, CheckIcon, PencilIcon, PlusIcon } from "lucide-vue-next";
import FilterBar from "../components/shared/FilterBar.vue";
import StatusBadge from "../components/base/StatusBadge.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import { useFiltersStore } from "../stores/filters.js";
import { usePrefsStore } from "../stores/prefs.js";
import {
  getTasks, setTaskField, createTask, getUser,
  STATUS_COLOR, STATUS_LABEL, fmtDate, isDueSoon, isDueToday, isOverdue,
} from "../api/index.js";

const filters = useFiltersStore();
const prefs = usePrefsStore();
const router = useRouter();

const loading       = ref(true);
const userCache     = ref({});
const activeNewTask = ref(null);
const newTaskSubject = ref("");

const KANBAN_STATUSES = ["Open", "Working", "Pending Review", "Overdue", "Completed"];

const visibleStatuses = computed(() =>
  prefs.showCompleted
    ? KANBAN_STATUSES
    : KANBAN_STATUSES.filter((status) => status !== "Completed")
);

const visibleTasks = computed(() =>
  prefs.showCompleted
    ? rawTasks.value
    : rawTasks.value.filter((task) => task.status !== "Completed")
);

const filteredTasks = computed(() =>
  visibleTasks.value.filter((task) => {
    if (filters.text && !task.subject.toLowerCase().includes(filters.text.toLowerCase())) return false;
    return true;
  })
);

// ── Columns ───────────────────────────────────────────────────────────────────
const rawTasks = ref([]);

const columns = computed(() =>
  visibleStatuses.value.map(status => ({
    status,
    tasks: filteredTasks.value.filter(t => {
      if (t.status !== status) return false;
      return true;
    }),
  }))
);

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    const f = [["status", "not in", ["Template", "Cancelled"]]];
    if (filters.project)  f.push(["project", "=", filters.project]);
    if (filters.assignee) f.push(["_assign", "like", `%${filters.assignee}%`]);
    if (filters.priority) f.push(["priority", "=", filters.priority]);
    if (filters.dateFrom) f.push(["exp_end_date", ">=", filters.dateFrom]);
    if (filters.dateTo)   f.push(["exp_end_date", "<=", filters.dateTo]);
    rawTasks.value = await getTasks(f);
    await prefetchUsers();
  } finally {
    loading.value = false;
  }
}

async function prefetchUsers() {
  const emails = new Set(rawTasks.value.flatMap(t => t._assignees || []));
  await Promise.all([...emails].map(async e => {
    if (!userCache.value[e]) userCache.value[e] = await getUser(e);
  }));
}

watch(
  () => [filters.project, filters.assignee, filters.priority, filters.dateFrom, filters.dateTo],
  load
);
onMounted(load);

function goToTask(name) {
  router.push({ name: "TaskDetail", params: { name } });
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
async function onDrop(evt, newStatus) {
  // vue-draggable-plus provides the moved task's data via the event element
  const name = evt.item?.__vueParentComponent?.props?.task?.name
    || evt.item?.dataset?.taskName;
  if (!name) return;
  const task = rawTasks.value.find(t => t.name === name);
  if (!task || task.status === newStatus) return;
  const old = task.status;
  task.status = newStatus;
  try { await setTaskField(task.name, "status", newStatus); }
  catch { task.status = old; }
}

// ── Quick actions ─────────────────────────────────────────────────────────────
async function quickComplete(task) {
  const next = task.status === "Completed" ? "Open" : "Completed";
  task.status = next;
  await setTaskField(task.name, "status", next);
}

// ── Inline create ─────────────────────────────────────────────────────────────
async function createInColumn(status) {
  if (!newTaskSubject.value.trim()) return;
  const t = await createTask({
    subject: newTaskSubject.value,
    status,
    priority: "Medium",
    project: filters.project || undefined,
  });
  rawTasks.value.push(t);
  newTaskSubject.value = "";
  activeNewTask.value = null;
}
</script>

<style scoped>
.page-kanban { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

/* Board */
.kanban-board {
  flex: 1;
  min-height: 0;          /* allow flex child to shrink so columns can scroll */
  display: flex;
  align-items: stretch;   /* columns fill the full board height */
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
}

/* Column */
.kanban-col {
  flex: 0 0 280px;
  min-width: 260px;
  background: var(--tf-bg);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;        /* clip so border-radius shows correctly */
}

.col-header {
  padding: 12px 12px 8px;
  flex-shrink: 0;
}
.col-title-row { display: flex; align-items: center; gap: 7px; }
.col-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.col-title { font-size: 13px; font-weight: 600; color: var(--tf-text); flex: 1; }
.col-count {
  font-size: 11px; padding: 1px 6px;
  background: var(--tf-border); color: var(--tf-text-muted);
  border-radius: 999px;
}

/* Cards container */
.col-cards {
  flex: 1;
  min-height: 0;           /* key: allows this flex child to scroll */
  overflow-y: auto;
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Card */
.kanban-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
  transition: box-shadow 140ms, transform 140ms;
}
.kanban-card:hover {
  box-shadow: var(--tf-shadow);
  transform: translateY(-1px);
}
.kanban-card:hover .card-quick-actions { opacity: 1; }
.kanban-card.overdue {
  border-color: color-mix(in srgb, var(--tf-overdue) 30%, var(--tf-border));
}
.kanban-card.due-soon {
  border-color: color-mix(in srgb, #d97706 26%, var(--tf-border));
}
.kanban-card.compact .card-cover-img { height: 72px; }
.kanban-card.compact .card-inner { padding: 8px; }
.kanban-card.compact .card-title { font-size: 12px; }
.kanban-card.compact .card-project,
.kanban-card.compact .card-date { font-size: 10px; }

.card-cover-img { width: 100%; height: 90px; object-fit: cover; display: block; }
.card-inner { padding: 10px; }

.card-badges { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 5px; }
.badge-overdue {
  font-size: 10px; padding: 1px 7px; border-radius: 999px;
  background: color-mix(in srgb, var(--tf-overdue) 12%, transparent);
  color: var(--tf-overdue);
  border: 1px solid color-mix(in srgb, var(--tf-overdue) 30%, transparent);
}

.badge-warning {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #ffedd5;
  color: #b45309;
  border: 1px solid #fed7aa;
}

.badge-warning.today {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.card-title {
  margin: 0 0 4px;
  font-size: 13px; font-weight: 500;
  color: var(--tf-text); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.card-project { font-size: 11px; color: var(--tf-text-faint); }

.card-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 8px;
}
.card-date {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px; color: var(--tf-text-faint);
}
.card-date.overdue { color: var(--tf-overdue); }
.card-date.warning { color: #b45309; font-weight: 600; }

.avatar-stack { display: flex; }

.mini-progress {
  margin-top: 8px; height: 3px;
  background: var(--tf-border); border-radius: 2px; overflow: hidden;
}
.mini-progress-fill {
  height: 100%; background: var(--tf-primary); border-radius: 2px;
}

/* Quick actions overlay */
.card-quick-actions {
  position: absolute; top: 6px; right: 6px;
  display: flex; gap: 4px;
  opacity: 0; transition: opacity 120ms;
}
.qa-btn {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  border: none; border-radius: 5px;
  background: var(--tf-surface);
  box-shadow: var(--tf-shadow);
  cursor: pointer;
  color: var(--tf-text-muted);
  transition: background 100ms;
}
.qa-btn:hover { background: var(--tf-hover-bg); color: var(--tf-text); }

/* Column footer */
.col-footer { padding: 8px; flex-shrink: 0; }
.add-task-btn {
  display: flex; align-items: center; gap: 5px;
  width: 100%; padding: 7px 10px;
  background: transparent; border: 1px dashed var(--tf-border);
  border-radius: 6px; color: var(--tf-text-faint);
  font-size: 12px; cursor: pointer;
  transition: all 120ms;
}
.add-task-btn:hover {
  border-color: var(--tf-primary); color: var(--tf-primary);
  background: var(--tf-active-bg);
}

.inline-form { display: flex; flex-direction: column; gap: 6px; }
.inline-input {
  width: 100%; padding: 7px 10px;
  border: 1px solid var(--tf-primary); border-radius: 6px;
  background: var(--tf-surface); color: var(--tf-text);
  font-size: 13px; outline: none;
}
.inline-form-actions { display: flex; gap: 6px; }
.btn-confirm {
  flex: 1; padding: 5px;
  background: var(--tf-primary); color: #fff;
  border: none; border-radius: 5px; font-size: 12px; cursor: pointer;
}
.btn-cancel {
  padding: 5px 10px;
  background: var(--tf-hover-bg); border: none;
  border-radius: 5px; color: var(--tf-text-muted); cursor: pointer;
}

/* Drag */
.drag-ghost { opacity: 0.35; }
.drag-chosen { transform: rotate(1deg); box-shadow: 0 8px 20px rgba(0,0,0,.15); }

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
  }

  .kanban-board {
    gap: 10px;
  }

  .kanban-col {
    flex-basis: min(82vw, 300px);
    min-width: min(82vw, 300px);
  }

  .card-quick-actions {
    opacity: 1;
  }
}
</style>
