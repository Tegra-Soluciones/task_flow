<template>
  <div class="projects-page">
    <!-- Header -->
    <div class="page-header">
      <h2 class="page-title">Proyectos</h2>
      <button v-if="perms.canCreateProject" class="btn-primary" @click="openCreate">
        + Nuevo proyecto
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando proyectos…" />
    </div>

    <!-- Empty -->
    <div v-else-if="!projects.length" class="center-wrap">
      <EmptyState title="Sin proyectos" description="Crea tu primer proyecto para organizar tus tareas." />
    </div>

    <!-- Project cards -->
    <div v-else class="projects-grid">
      <div
        v-for="p in projects"
        :key="p.name"
        class="project-card"
        @click="goToProject(p.name)"
      >
        <div class="card-top">
          <div class="card-status-dot" :style="{ background: projectStatusColor(p.status) }" />
          <h3 class="card-name">{{ p.project_name || p.name }}</h3>
          <div class="card-actions" @click.stop>
            <button v-if="perms.canWriteProject" class="icon-btn" title="Editar" @click="openEdit(p)">
              <PencilIcon :size="13" />
            </button>
            <button v-if="perms.canDeleteProject" class="icon-btn danger" title="Eliminar" @click="confirmDelete(p)">
              <Trash2Icon :size="13" />
            </button>
          </div>
        </div>

        <p class="card-desc">{{ p.description || "Sin descripción" }}</p>

        <div class="card-progress-wrap">
          <div class="card-progress-bar">
            <div class="card-progress-fill" :style="{ width: (p.percent_complete || 0) + '%' }" />
          </div>
          <span class="card-progress-label">{{ Math.round(p.percent_complete || 0) }}%</span>
        </div>

        <div class="card-footer">
          <span class="card-status-badge" :style="{ color: projectStatusColor(p.status) }">
            {{ p.status }}
          </span>
          <span v-if="p.expected_end_date" class="card-due">
            Vence {{ fmtDate(p.expected_end_date) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <div v-if="modalOpen" class="modal-backdrop" @click.self="modalOpen = false">
      <div class="modal-box">
        <div class="modal-header">
          <h3 class="modal-title">{{ editing ? "Editar proyecto" : "Nuevo proyecto" }}</h3>
          <button class="icon-btn" @click="modalOpen = false"><XIcon :size="16" /></button>
        </div>
        <div class="modal-body">
          <div class="field">
            <label class="field-label">Nombre *</label>
            <input v-model="form.project_name" class="field-input" placeholder="Nombre del proyecto" />
          </div>
          <div class="field">
            <label class="field-label">Estado</label>
            <select v-model="form.status" class="field-input">
              <option value="Open">Open</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="field-row">
            <div class="field">
              <label class="field-label">Fecha inicio</label>
              <input type="date" v-model="form.expected_start_date" class="field-input" />
            </div>
            <div class="field">
              <label class="field-label">Fecha fin</label>
              <input type="date" v-model="form.expected_end_date" class="field-input" />
            </div>
          </div>
          <div class="field">
            <label class="field-label">Descripción</label>
            <textarea v-model="form.description" class="field-textarea" rows="3" />
          </div>
          <div v-if="saveError" class="error-banner">{{ saveError }}</div>
        </div>
        <div class="modal-actions">
          <button class="btn-primary" :disabled="saving || !form.project_name.trim()" @click="save">
            {{ saving ? "Guardando…" : (editing ? "Guardar cambios" : "Crear proyecto") }}
          </button>
          <button class="btn-cancel" @click="modalOpen = false">Cancelar</button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
      <div class="modal-box modal-sm">
        <div class="modal-header">
          <h3 class="modal-title">Eliminar proyecto</h3>
          <button class="icon-btn" @click="deleteTarget = null"><XIcon :size="16" /></button>
        </div>
        <div class="modal-body">
          <p class="confirm-msg">
            ¿Eliminar <strong>{{ deleteTarget.project_name }}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div v-if="deleteError" class="error-banner">{{ deleteError }}</div>
        </div>
        <div class="modal-actions">
          <button class="btn-danger" :disabled="deleting" @click="doDelete">
            {{ deleting ? "Eliminando…" : "Eliminar" }}
          </button>
          <button class="btn-cancel" @click="deleteTarget = null">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { PencilIcon, Trash2Icon, XIcon } from "lucide-vue-next";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import EmptyState from "../components/base/EmptyState.vue";
import { usePermissionsStore } from "../stores/permissions.js";
import { getProjects, createProject, saveProject, deleteProject, fmtDate } from "../api/index.js";

const router  = useRouter();
const perms   = usePermissionsStore();

const projects     = ref([]);
const loading      = ref(true);
const modalOpen    = ref(false);
const editing      = ref(null);
const saving       = ref(false);
const saveError    = ref("");
const deleteTarget = ref(null);
const deleting     = ref(false);
const deleteError  = ref("");

const form = ref({ project_name: "", status: "Open", expected_start_date: "", expected_end_date: "", description: "" });

onMounted(async () => {
  await perms.load();
  await loadProjects();
});

async function loadProjects() {
  loading.value = true;
  try { projects.value = await getProjects(); }
  finally { loading.value = false; }
}

function projectStatusColor(status) {
  return status === "Completed" ? "#16a34a" : status === "Cancelled" ? "#6b7280" : "#2563eb";
}

function goToProject(name) {
  router.push({ name: "ProjectDetail", params: { name } });
}

function openCreate() {
  editing.value = null;
  form.value = { project_name: "", status: "Open", expected_start_date: "", expected_end_date: "", description: "" };
  saveError.value = "";
  modalOpen.value = true;
}

function openEdit(p) {
  editing.value = p;
  form.value = {
    project_name: p.project_name || p.name,
    status: p.status || "Open",
    expected_start_date: p.expected_start_date?.slice(0, 10) || "",
    expected_end_date: p.expected_end_date?.slice(0, 10) || "",
    description: p.description || "",
  };
  saveError.value = "";
  modalOpen.value = true;
}

async function save() {
  if (!form.value.project_name.trim() || saving.value) return;
  saving.value = true;
  saveError.value = "";
  try {
    if (editing.value) {
      const updated = await saveProject({ ...editing.value, ...form.value });
      const idx = projects.value.findIndex(p => p.name === editing.value.name);
      if (idx !== -1) projects.value[idx] = updated;
    } else {
      const created = await createProject(form.value);
      projects.value.unshift(created);
    }
    modalOpen.value = false;
  } catch {
    saveError.value = "Error al guardar el proyecto. Verifica los campos e intenta de nuevo.";
  } finally {
    saving.value = false;
  }
}

function confirmDelete(p) {
  deleteTarget.value = p;
  deleteError.value = "";
}

async function doDelete() {
  if (!deleteTarget.value || deleting.value) return;
  deleting.value = true;
  deleteError.value = "";
  try {
    await deleteProject(deleteTarget.value.name);
    projects.value = projects.value.filter(p => p.name !== deleteTarget.value.name);
    deleteTarget.value = null;
  } catch {
    deleteError.value = "No se pudo eliminar el proyecto. Puede tener tareas asociadas.";
  } finally {
    deleting.value = false;
  }
}
</script>

<style scoped>
.projects-page {
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
.page-title { margin: 0; font-size: 18px; font-weight: 700; color: var(--tf-text); }

.btn-primary {
  padding: 7px 14px; background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: background 120ms;
}
.btn-primary:hover:not(:disabled) { background: var(--tf-primary-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.center-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }

/* Grid */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* Card */
.project-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  display: flex; flex-direction: column; gap: 10px;
  transition: box-shadow 150ms, transform 150ms;
}
.project-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,.1); transform: translateY(-2px); }

.card-top { display: flex; align-items: flex-start; gap: 8px; }
.card-status-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px; }
.card-name { flex: 1; margin: 0; font-size: 15px; font-weight: 600; color: var(--tf-text); line-height: 1.3; }
.card-actions { display: flex; gap: 2px; flex-shrink: 0; }

.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: none; background: transparent; border-radius: 6px;
  cursor: pointer; color: var(--tf-text-muted);
  transition: background 120ms, color 120ms;
}
.icon-btn:hover { background: var(--tf-hover-bg); color: var(--tf-text); }
.icon-btn.danger:hover { background: #fee2e2; color: var(--tf-overdue); }

.card-desc {
  margin: 0; font-size: 13px; color: var(--tf-text-muted);
  line-height: 1.5; overflow: hidden;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}

.card-progress-wrap { display: flex; align-items: center; gap: 8px; }
.card-progress-bar {
  flex: 1; height: 6px; background: var(--tf-border); border-radius: 3px; overflow: hidden;
}
.card-progress-fill { height: 100%; background: var(--tf-primary); border-radius: 3px; transition: width 300ms; }
.card-progress-label { font-size: 12px; color: var(--tf-text-muted); white-space: nowrap; min-width: 36px; text-align: right; }

.card-footer { display: flex; align-items: center; justify-content: space-between; }
.card-status-badge { font-size: 11px; font-weight: 600; }
.card-due { font-size: 11px; color: var(--tf-text-faint); }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: var(--tf-surface); border-radius: 10px;
  width: min(500px, 96vw);
  box-shadow: 0 20px 48px rgba(0,0,0,.25);
  overflow: hidden;
}
.modal-sm { width: min(360px, 96vw); }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--tf-border);
}
.modal-title { margin: 0; font-size: 15px; font-weight: 700; color: var(--tf-text); }
.modal-body { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.modal-actions {
  padding: 12px 20px 16px;
  display: flex; gap: 8px; justify-content: flex-end;
  border-top: 1px solid var(--tf-border);
}

.field { display: flex; flex-direction: column; gap: 4px; }
.field-row { display: flex; gap: 12px; }
.field-row .field { flex: 1; }
.field-label { font-size: 11px; color: var(--tf-text-faint); text-transform: uppercase; letter-spacing: .04em; }
.field-input, .field-textarea {
  width: 100%; padding: 8px 10px;
  border: 1px solid var(--tf-border); border-radius: 6px;
  background: var(--tf-bg); color: var(--tf-text);
  font-size: 13px; outline: none; font-family: inherit;
  box-sizing: border-box;
}
.field-input:focus, .field-textarea:focus { border-color: var(--tf-primary); }
.field-textarea { resize: vertical; }

.error-banner {
  padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca;
  border-radius: 6px; font-size: 12px; color: var(--tf-overdue);
}
.confirm-msg { margin: 0; font-size: 14px; color: var(--tf-text); line-height: 1.5; }

.btn-cancel {
  padding: 8px 14px; background: var(--tf-hover-bg); border: none;
  border-radius: 6px; color: var(--tf-text-muted); font-size: 13px; cursor: pointer;
}
.btn-danger {
  padding: 8px 18px; background: var(--tf-overdue); color: #fff;
  border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;
  transition: opacity 120ms;
}
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 700px) {
  .page-header,
  .card-footer,
  .modal-actions,
  .field-row {
    flex-direction: column;
    align-items: stretch;
  }

  .btn-primary,
  .btn-danger,
  .btn-cancel {
    width: 100%;
    justify-content: center;
  }

  .modal-box,
  .modal-sm {
    width: min(100vw - 24px, 500px);
  }
}
</style>
