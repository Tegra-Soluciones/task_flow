<template>
  <div class="page-calendar">
    <div class="page-header">
      <h2 class="page-title">Calendario</h2>
      <div class="header-controls">
        <label class="color-by-label">
          Color por:
          <select v-model="colorBy" class="filter-select">
            <option value="priority">Prioridad</option>
            <option value="status">Estado</option>
          </select>
        </label>
        <button class="btn-primary" @click="showNewTask = true">+ Nueva tarea</button>
      </div>
    </div>

    <NewTaskModal
      v-if="showNewTask"
      @close="showNewTask = false"
      @created="onTaskCreated"
    />

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando…" />
    </div>

    <div v-show="!loading" class="calendar-wrap">
      <FullCalendar ref="calRef" :options="calOptions" />
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import FullCalendar from "@fullcalendar/vue3";
import dayGridPlugin     from "@fullcalendar/daygrid";
import timeGridPlugin    from "@fullcalendar/timegrid";
import listPlugin        from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import NewTaskModal from "../components/shared/NewTaskModal.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import {
  getTasks, setTaskField, createTask,
  STATUS_COLOR, PRIORITY_COLOR,
} from "../api/index.js";

const router = useRouter();

const calRef      = ref(null);
const loading     = ref(true);
const rawTasks    = ref([]);
const colorBy     = ref("priority");
const showNewTask = ref(false);

// ── Build event objects from raw tasks ────────────────────────────────────────
function buildEvents(tasks, by) {
  return tasks
    .filter(t => t.exp_end_date || t.exp_start_date)
    .map(t => ({
      id:    t.name,
      title: t.subject,
      start: (t.exp_start_date || t.exp_end_date).slice(0, 10),
      end:   t.exp_end_date?.slice(0, 10),
      allDay: true,
      backgroundColor: by === "priority"
        ? (PRIORITY_COLOR[t.priority] || "#6b7280")
        : (STATUS_COLOR[t.status]    || "#6b7280"),
      borderColor: "transparent",
      textColor: "#fff",
      extendedProps: { task: t },
    }));
}

// ── Refresh calendar events imperatively ──────────────────────────────────────
function refreshCalendar() {
  const api = calRef.value?.getApi();
  if (!api) return;
  api.removeAllEvents();
  api.addEventSource(buildEvents(rawTasks.value, colorBy.value));
}

// Recolor when colorBy changes
watch(colorBy, refreshCalendar);

// ── FullCalendar static options (not reactive — defined once) ────────────────
const calOptions = {
  plugins:     [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  initialView: "dayGridMonth",
  locale:      "es",
  headerToolbar: {
    left:   "prev,next today",
    center: "title",
    right:  "dayGridMonth,timeGridWeek,listWeek",
  },
  buttonText: {
    today: "Hoy",
    month: "Mes",
    week:  "Semana",
    list:  "Agenda",
  },
  events:     [],
  editable:   true,
  selectable: true,
  height:     "100%",

  eventClick(info) {
    router.push({ name: "TaskDetail", params: { name: info.event.id } });
  },

  async eventDrop(info) {
    const task  = info.event.extendedProps.task;
    const start = info.event.startStr;
    const end   = info.event.endStr || start;
    try {
      await Promise.all([
        setTaskField(task.name, "exp_start_date", start),
        setTaskField(task.name, "exp_end_date",   end),
      ]);
      const t = rawTasks.value.find(t => t.name === task.name);
      if (t) { t.exp_start_date = start; t.exp_end_date = end; }
    } catch {
      info.revert();
    }
  },

  async dateClick(info) {
    const t = await createTask({
      subject:        "Nueva tarea",
      status:         "Open",
      priority:       "Medium",
      exp_start_date: info.dateStr,
      exp_end_date:   info.dateStr,
    });
    if (t) {
      rawTasks.value.push(t);
      refreshCalendar();
      router.push({ name: "TaskDetail", params: { name: t.name } });
    }
  },
};

// ── Load ──────────────────────────────────────────────────────────────────────
async function load() {
  loading.value = true;
  try {
    rawTasks.value = await getTasks([["status", "not in", ["Template", "Cancelled"]]]);
  } finally {
    loading.value = false;
    // Wait for FullCalendar to render, then push events
    setTimeout(refreshCalendar, 50);
  }
}

function onTaskCreated(task) {
  if (task) {
    rawTasks.value.push(task);
    refreshCalendar();
    showNewTask.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.page-calendar { height: 100%; display: flex; flex-direction: column; }

.page-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px; flex-shrink: 0;
}
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.header-controls { display: flex; gap: 10px; align-items: center; }
.color-by-label {
  font-size: 12px; color: var(--tf-text-muted);
  display: flex; align-items: center; gap: 6px;
}
.filter-select {
  padding: 5px 8px; border: 1px solid var(--tf-border);
  border-radius: 6px; background: var(--tf-surface);
  color: var(--tf-text); font-size: 12px; outline: none;
}
.btn-primary {
  padding: 7px 14px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover { background: var(--tf-primary-hover); }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

.calendar-wrap {
  flex: 1;
  overflow: hidden;
  min-height: 0;
  --fc-border-color:                var(--tf-border);
  --fc-button-bg-color:             var(--tf-primary);
  --fc-button-border-color:         var(--tf-primary);
  --fc-button-hover-bg-color:       var(--tf-primary-hover);
  --fc-button-hover-border-color:   var(--tf-primary-hover);
  --fc-button-active-bg-color:      var(--tf-primary-hover);
  --fc-today-bg-color:              color-mix(in srgb, var(--tf-primary) 8%, transparent);
  --fc-page-bg-color:               var(--tf-surface);
  --fc-neutral-bg-color:            var(--tf-bg);
  --fc-list-event-hover-bg-color:   var(--tf-hover-bg);
  color: var(--tf-text);
}
:deep(.fc) { height: 100%; }
:deep(.fc-toolbar-title)          { font-size: 15px; font-weight: 600; color: var(--tf-text); }
:deep(.fc-col-header-cell-cushion){ color: var(--tf-text-muted); font-size: 12px; }
:deep(.fc-daygrid-day-number)     { color: var(--tf-text-muted); font-size: 12px; }
:deep(.fc-event)                  { cursor: pointer; font-size: 12px; border-radius: 4px; }
:deep(.fc-button)                 { font-size: 12px !important; padding: 4px 10px !important; }
:deep(.fc-list-event-title)       { color: var(--tf-text); }

@media (max-width: 700px) {
  .page-header {
    align-items: stretch;
  }

  .header-controls {
    width: 100%;
    flex-wrap: wrap;
  }

  .color-by-label,
  .filter-select,
  .btn-primary {
    width: 100%;
  }

  .btn-primary {
    justify-content: center;
  }

  :deep(.fc-toolbar) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  :deep(.fc-toolbar-chunk) {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
  }

  :deep(.fc-toolbar-title) {
    text-align: center;
  }
}
</style>
