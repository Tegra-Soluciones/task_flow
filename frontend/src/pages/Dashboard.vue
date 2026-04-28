<template>
  <div class="page-dashboard">
    <div class="page-header">
      <h2 class="page-title">Tablero Principal</h2>
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

    <div v-else-if="!filteredTasks.length" class="center-wrap">
      <EmptyState title="No hay tareas" description="Crea la primera tarea para empezar." />
    </div>

    <div v-else class="status-groups">
      <div
        v-for="group in groups"
        :key="group.status"
        class="status-group"
        v-show="group.tasks.length > 0 || !hideEmptyGroups"
      >
        <div class="group-header">
          <span class="group-dot" :style="{ background: STATUS_COLOR[group.status] }" />
          <span class="group-label">{{ STATUS_LABEL[group.status] || group.status }}</span>
          <span class="group-count">{{ group.tasks.length }}</span>
        </div>

        <div v-for="projectGroup in group.projectGroups" :key="projectGroup.key" class="project-section">
          <div v-if="prefs.groupByProject" class="project-header">
            <span class="project-name">{{ projectGroup.label }}</span>
            <span class="project-count">{{ projectGroup.tasks.length }}</span>
          </div>

          <VueDraggable
            v-model="projectGroup.tasks"
            group="tasks"
            class="task-grid"
            item-key="name"
            ghost-class="drag-ghost"
            chosen-class="drag-chosen"
            @add="(evt) => onDrop(evt, group.status)"
          >
            <div
              v-for="task in projectGroup.tasks"
              :key="task.name"
              class="card-wrapper"
            >
              <TaskCard
                :task="task"
                :assignee-users="getAssigneeUsers(task)"
                :compact="prefs.compactCards"
                :due-soon-days="prefs.dueSoonDays"
                :quick-actions="true"
                @click="goToTask(task.name)"
                @complete="quickComplete(task)"
                @whatsapp="quickWhatsApp(task)"
                @email="quickEmail(task)"
              />
            </div>
          </VueDraggable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { VueDraggable } from "vue-draggable-plus";
import FilterBar from "../components/shared/FilterBar.vue";
import NewTaskModal from "../components/shared/NewTaskModal.vue";
import TaskCard from "../components/base/TaskCard.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import { useFiltersStore } from "../stores/filters.js";
import { usePrefsStore } from "../stores/prefs.js";
import {
  getTasks, setTaskField, getUser,
  STATUS_COLOR, STATUS_LABEL, todayISO,
} from "../api/index.js";

const filters     = useFiltersStore();
const prefs       = usePrefsStore();
const router      = useRouter();

const allTasks        = ref([]);
const loading         = ref(true);
const showNewTask     = ref(false);
const hideEmptyGroups = ref(true);
const userCache       = ref({});

const BASE_STATUSES = ["Open", "Working", "Pending Review", "Overdue", "Completed"];

const visibleStatuses = computed(() =>
  prefs.showCompleted
    ? BASE_STATUSES
    : BASE_STATUSES.filter((status) => status !== "Completed")
);

const filteredTasks = computed(() =>
  allTasks.value.filter((task) => {
    if (!task) return false;
    if (!prefs.showCompleted && task.status === "Completed") return false;
    if (!filters.text) return true;
    return task.subject?.toLowerCase().includes(filters.text.toLowerCase());
  })
);

const groups = computed(() =>
  visibleStatuses.value.map((status) => {
    const tasks = filteredTasks.value.filter((task) => task.status === status);
    return {
      status,
      tasks,
      projectGroups: buildProjectGroups(status, tasks),
    };
  })
);

function buildProjectGroups(status, tasks) {
  if (!prefs.groupByProject) {
    return [{ key: `${status}::all`, label: "", tasks }];
  }

  const grouped = new Map();
  for (const task of tasks) {
    const key = task.project || "__no_project__";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(task);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => {
      if (left === "__no_project__") return 1;
      if (right === "__no_project__") return -1;
      return left.localeCompare(right, "es-MX");
    })
    .map(([key, projectTasks]) => ({
      key: `${status}::${key}`,
      label: key === "__no_project__" ? "Sin proyecto" : key,
      tasks: projectTasks,
    }));
}

async function load() {
  loading.value = true;
  try {
    const base = [["status", "not in", ["Template", "Cancelled"]]];
    const f = [...base];
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
    await prefetchUsersForTasks(allTasks.value);
  } finally {
    loading.value = false;
  }
}

async function prefetchUsersForTasks(tasks) {
  const emails = new Set(tasks.flatMap(t => t._assignees || []));
  await Promise.all([...emails].map(async e => {
    if (!userCache.value[e]) userCache.value[e] = await getUser(e);
  }));
}

function getAssigneeUsers(task) {
  return (task._assignees || []).map(email =>
    userCache.value[email] || { name: email, full_name: email, user_image: null }
  );
}

watch(
  () => [filters.project, filters.assignee, filters.priority, filters.dateFrom, filters.dateTo, filters.onlyOverdue],
  load,
  { deep: false }
);

onMounted(load);

async function onDrop(evt, newStatus) {
  const taskEl  = evt.item;
  const taskName = taskEl.querySelector("[data-task-name]")?.dataset?.taskName || "";
  const task = allTasks.value.find(t => t.name === taskName);
  if (!task || task.status === newStatus) return;

  const old = task.status;
  task.status = newStatus;
  try {
    await setTaskField(task.name, "status", newStatus);
  } catch {
    task.status = old;
  }
}

async function quickComplete(task) {
  const next = task.status === "Completed" ? "Open" : "Completed";
  task.status = next;
  await setTaskField(task.name, "status", next);
}

async function quickWhatsApp(task) {
  const email = task._assignees?.[0];
  if (!email) return;
  const u = userCache.value[email] || await getUser(email);
  const phone = (u.mobile_no || u.phone || "").replace(/\D/g, "");
  if (!phone) { alert("El asignado no tiene teléfono registrado."); return; }
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent("Sobre la tarea: " + task.subject)}`, "_blank");
}

function quickEmail(task) {
  const to = task._assignees?.[0] || "";
  window.location.href = `mailto:${to}?subject=${encodeURIComponent("[Task Flow] " + task.subject)}`;
}

function goToTask(name) {
  router.push({ name: "TaskDetail", params: { name } });
}

async function onTaskCreated(task) {
  if (task) {
    allTasks.value.push(task);
    await prefetchUsersForTasks([task]);
  }
  showNewTask.value = false;
}
</script>

<style scoped>
.page-dashboard { height: 100%; display: flex; flex-direction: column; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.btn-primary {
  padding: 7px 14px;
  background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px;
  font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover { background: var(--tf-primary-hover); }

.center-wrap {
  flex: 1; display: flex; align-items: center; justify-content: center;
}

.status-groups { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }

.group-header {
  display: flex; align-items: center; gap: 8px;
  margin-bottom: 12px;
}
.group-dot  { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.group-label { font-size: 13px; font-weight: 600; color: var(--tf-text); }
.group-count {
  font-size: 11px; padding: 1px 6px;
  background: var(--tf-hover-bg);
  color: var(--tf-text-muted);
  border-radius: 999px;
}

.project-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.project-section + .project-section {
  margin-top: 14px;
}

.project-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.project-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--tf-text-muted);
}

.project-count {
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--tf-hover-bg);
  color: var(--tf-text-faint);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  min-height: 60px;
}

.drag-ghost  { opacity: 0.4; }
.drag-chosen { transform: rotate(1.5deg); }

@media (max-width: 900px) {
  .page-header {
    align-items: stretch;
  }
}

@media (max-width: 700px) {
  .status-groups {
    gap: 18px;
  }

  .task-grid {
    grid-template-columns: 1fr;
  }
}
</style>
