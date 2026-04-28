<template>
  <div class="filter-bar">
    <!-- Text search -->
    <div class="filter-input-wrap">
      <SearchIcon :size="14" class="filter-icon" />
      <input
        v-model="filters.text"
        class="filter-input"
        placeholder="Buscar tareas…"
        @input="onTextInput"
      />
      <button v-if="filters.text" class="clear-btn" @click="filters.text = ''">
        <XIcon :size="12" />
      </button>
    </div>

    <!-- Project -->
    <select v-model="filters.project" class="filter-select">
      <option value="">Todos los proyectos</option>
      <option v-for="p in projects" :key="p.name" :value="p.name">
        {{ p.project_name || p.name }}
      </option>
    </select>

    <!-- Assignee -->
    <select v-model="filters.assignee" class="filter-select">
      <option value="">Todos los asignados</option>
      <option v-for="u in users" :key="u.name" :value="u.name">
        {{ u.full_name || u.name }}
      </option>
    </select>

    <!-- Priority -->
    <select v-model="filters.priority" class="filter-select">
      <option value="">Prioridad</option>
      <option v-for="p in PRIORITIES" :key="p.value" :value="p.value">
        {{ p.label }}
      </option>
    </select>

    <!-- Date range -->
    <input v-model="filters.dateFrom" type="date" class="filter-select" title="Desde" />
    <input v-model="filters.dateTo"   type="date" class="filter-select" title="Hasta" />

    <!-- Overdue toggle -->
    <button
      class="filter-toggle"
      :class="{ active: filters.onlyOverdue }"
      @click="filters.onlyOverdue = !filters.onlyOverdue"
    >
      <AlertCircleIcon :size="13" />
      Solo vencidas
    </button>

    <!-- Clear all -->
    <button
      v-if="filters.hasActiveFilters"
      class="clear-all-btn"
      @click="filters.reset()"
    >
      <XIcon :size="13" /> Limpiar
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { SearchIcon, XIcon, AlertCircleIcon } from "lucide-vue-next";
import { useFiltersStore } from "../../stores/filters.js";
import { getProjects, getSystemUsers } from "../../api/index.js";

const filters = useFiltersStore();
const projects = ref([]);
const users = ref([]);

const PRIORITIES = [
  { value: "Urgent", label: "Urgente" },
  { value: "High",   label: "Alta" },
  { value: "Medium", label: "Media" },
  { value: "Low",    label: "Baja" },
];

// Debounced text search
let textTimer = null;
function onTextInput() {
  clearTimeout(textTimer);
  textTimer = setTimeout(() => {}, 400); // filters store is reactive; just debounce UI feel
}

onMounted(async () => {
  [projects.value, users.value] = await Promise.all([getProjects(), getSystemUsers()]);
});
</script>

<style scoped>
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 0 14px;
}

/* Search input */
.filter-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 200px;
  flex: 1 1 220px;
}

.filter-icon {
  position: absolute;
  left: 9px;
  color: var(--tf-text-faint);
  pointer-events: none;
}

.filter-input {
  width: 100%;
  padding: 6px 28px 6px 28px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-surface);
  color: var(--tf-text);
  font-size: 13px;
  outline: none;
  transition: border-color 120ms;
}
.filter-input:focus { border-color: var(--tf-primary); }

.clear-btn {
  position: absolute;
  right: 7px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--tf-text-faint);
  display: flex;
  align-items: center;
  padding: 0;
}
.clear-btn:hover { color: var(--tf-text); }

/* Select */
.filter-select {
  padding: 6px 10px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-surface);
  color: var(--tf-text);
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.filter-select:focus { border-color: var(--tf-primary); }

/* Toggle button */
.filter-toggle {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-surface);
  color: var(--tf-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: all 120ms;
}
.filter-toggle.active {
  background: #fef2f2;
  border-color: var(--tf-overdue);
  color: var(--tf-overdue);
}
.dark .filter-toggle.active { background: #3f1212; }

/* Clear all */
.clear-all-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: var(--tf-hover-bg);
  color: var(--tf-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms;
}
.clear-all-btn:hover { background: var(--tf-border); }

@media (max-width: 900px) {
  .filter-bar {
    gap: 10px;
  }

  .filter-select {
    flex: 1 1 180px;
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .filter-bar {
    padding: 10px 0 12px;
  }

  .filter-input-wrap,
  .filter-select,
  .filter-toggle,
  .clear-all-btn {
    width: 100%;
  }

  .filter-toggle,
  .clear-all-btn {
    justify-content: center;
  }
}
</style>
