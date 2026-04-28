<template>
  <div class="ntm-backdrop" @click.self="$emit('close')">
    <div class="ntm-box">
      <h3 class="ntm-title">Nueva tarea</h3>

      <input
        ref="titleRef"
        v-model="form.subject"
        class="ntm-input"
        placeholder="Título de la tarea *"
        @keydown.enter="submit"
        @keydown.escape="$emit('close')"
      />

      <div class="ntm-cover-card" :class="{ empty: !form.cover_image }">
        <img
          v-if="form.cover_image"
          :src="form.cover_image"
          :alt="form.subject || 'Portada de tarea'"
          class="ntm-cover-image"
        />
        <div v-else class="ntm-cover-empty">
          <span class="ntm-cover-empty-title">Sin portada</span>
          <span class="ntm-cover-empty-copy">Agrega una imagen para que la tarea se vea como una página tipo Notion.</span>
        </div>

        <div class="ntm-cover-toolbar">
          <button class="ntm-cover-btn" type="button" :disabled="uploadingCover" @click="openCoverPicker">
            {{ uploadingCover ? "Subiendo…" : (form.cover_image ? "Cambiar imagen" : "Agregar imagen") }}
          </button>
          <button class="ntm-cover-btn" type="button" @click="showCoverUrl = !showCoverUrl">
            {{ showCoverUrl ? "Ocultar URL" : "Pegar URL" }}
          </button>
          <button
            v-if="form.cover_image"
            class="ntm-cover-btn danger"
            type="button"
            @click="clearCover"
          >
            Quitar
          </button>
        </div>
      </div>

      <input
        ref="coverFileRef"
        type="file"
        class="ntm-hidden-input"
        accept="image/*"
        @change="onCoverFileChange"
      />

      <div v-if="showCoverUrl" class="ntm-cover-url-row">
        <input
          v-model="coverUrlDraft"
          class="ntm-input"
          placeholder="Pega la URL de la portada o usa /files/imagen.png"
          @keydown.enter.prevent="applyCoverUrl"
        />
        <button class="ntm-cover-btn solid" type="button" @click="applyCoverUrl">Usar</button>
      </div>

      <div class="ntm-row">
        <select v-model="form.status" class="ntm-select">
          <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABEL[s] || s }}</option>
        </select>
        <select v-model="form.priority" class="ntm-select">
          <option v-for="p in PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] || p }}</option>
        </select>
      </div>

      <div class="ntm-row">
        <select v-model="form.project" class="ntm-select">
          <option value="">Sin proyecto</option>
          <option v-for="p in projects" :key="p.name" :value="p.name">
            {{ p.project_name || p.name }}
          </option>
        </select>
        <select v-model="form.assignee" class="ntm-select">
          <option value="">Sin asignar</option>
          <option v-for="u in users" :key="u.name" :value="u.name">
            {{ u.full_name || u.name }}
          </option>
        </select>
      </div>

      <div class="ntm-row">
        <div class="ntm-field">
          <label class="ntm-label">Fecha inicio</label>
          <input type="date" v-model="form.exp_start_date" class="ntm-input" />
        </div>
        <div class="ntm-field">
          <label class="ntm-label">Fecha vencimiento</label>
          <input type="date" v-model="form.exp_end_date" class="ntm-input" />
        </div>
      </div>

      <textarea
        v-model="form.description"
        class="ntm-input ntm-textarea"
        placeholder="Descripción (opcional)"
        rows="3"
      />

      <div v-if="error" class="ntm-error">{{ error }}</div>

      <div class="ntm-actions">
        <button
          class="ntm-btn-primary"
          :disabled="saving || !form.subject.trim()"
          @click="submit"
        >
          {{ saving ? "Guardando…" : "Crear tarea" }}
        </button>
        <button class="ntm-btn-cancel" @click="$emit('close')">Cancelar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  createTask, addAssignment, getAssignments, getTask, getProjects, getSystemUsers,
  TASK_STATUSES, TASK_PRIORITIES, STATUS_LABEL, PRIORITY_LABEL, uploadFile,
} from "../../api/index.js";

const props = defineProps({
  defaultAssignee: { type: String, default: "" },
  defaultProject:  { type: String, default: "" },
});

const emit = defineEmits(["close", "created"]);

const STATUSES   = TASK_STATUSES.filter(s => !["Template", "Cancelled"].includes(s));
const PRIORITIES = TASK_PRIORITIES;

const titleRef = ref(null);
const coverFileRef = ref(null);
const saving   = ref(false);
const uploadingCover = ref(false);
const showCoverUrl = ref(false);
const coverUrlDraft = ref("");
const error    = ref("");
const projects = ref([]);
const users    = ref([]);

const form = ref({
  subject:        "",
  status:         "Open",
  priority:       "Medium",
  project:        props.defaultProject,
  assignee:       props.defaultAssignee,
  exp_start_date: "",
  exp_end_date:   "",
  description:    "",
  cover_image:    "",
});

onMounted(async () => {
  titleRef.value?.focus();
  [projects.value, users.value] = await Promise.all([getProjects(), getSystemUsers()]);
  if (props.defaultAssignee) form.value.assignee = props.defaultAssignee;
});

async function submit() {
  if (!form.value.subject.trim() || saving.value || uploadingCover.value) return;
  error.value = "";
  saving.value = true;
  try {
    const manualCoverUrl = coverUrlDraft.value.trim();
    if (manualCoverUrl) form.value.cover_image = manualCoverUrl;

    const payload = {
      subject:  form.value.subject.trim(),
      status:   form.value.status,
      priority: form.value.priority,
    };
    if (form.value.project)        payload.project        = form.value.project;
    if (form.value.exp_start_date) payload.exp_start_date = form.value.exp_start_date;
    if (form.value.exp_end_date)   payload.exp_end_date   = form.value.exp_end_date;
    if (form.value.description)    payload.description    = form.value.description;
    if (form.value.cover_image)    payload.cover_image    = form.value.cover_image;

    // Create task first, then assign via the proper Frappe assignment API.
    // _assign is a virtual field on Task (backed by ToDo docs) and cannot be
    // set through frappe.client.insert directly.
    let t = await createTask(payload);
    if (form.value.assignee && t?.name) {
      await addAssignment(t.name, form.value.assignee);
      const [reloadedTask, assignees] = await Promise.all([
        getTask(t.name),
        getAssignments("Task", t.name),
      ]);
      t = {
        ...reloadedTask,
        _assign: JSON.stringify(assignees),
        _assignees: assignees,
      };
    }
    emit("created", t);
  } catch (e) {
    error.value = "Error al crear la tarea. Intenta de nuevo.";
  } finally {
    saving.value = false;
  }
}

function openCoverPicker() {
  coverFileRef.value?.click();
}

function clearCover() {
  form.value.cover_image = "";
  coverUrlDraft.value = "";
}

function applyCoverUrl() {
  form.value.cover_image = coverUrlDraft.value.trim();
  if (form.value.cover_image) showCoverUrl.value = false;
}

async function onCoverFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  uploadingCover.value = true;
  error.value = "";
  try {
    const uploaded = await uploadFile(file, { isPrivate: false });
    form.value.cover_image = uploaded.file_url;
    coverUrlDraft.value = uploaded.file_url;
    showCoverUrl.value = false;
  } catch {
    error.value = "No se pudo subir la portada. Intenta con otra imagen.";
  } finally {
    uploadingCover.value = false;
  }
}
</script>

<style scoped>
.ntm-backdrop {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, .45);
  display: flex; align-items: center; justify-content: center;
}

.ntm-box {
  background: var(--tf-surface);
  border-radius: 10px;
  padding: 24px;
  width: min(620px, 96vw);
  display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, .25);
}

.ntm-title {
  margin: 0;
  font-size: 15px; font-weight: 700; color: var(--tf-text);
}

.ntm-input {
  width: 100%; padding: 8px 10px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-bg); color: var(--tf-text);
  font-size: 13px; outline: none; box-sizing: border-box;
  font-family: inherit;
}
.ntm-input:focus { border-color: var(--tf-primary); }

.ntm-select {
  flex: 1; padding: 8px 10px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-bg); color: var(--tf-text);
  font-size: 13px; outline: none; min-width: 0;
}
.ntm-select:focus { border-color: var(--tf-primary); }

.ntm-row { display: flex; gap: 8px; }

.ntm-cover-card {
  position: relative;
  overflow: hidden;
  min-height: 180px;
  border-radius: 12px;
  border: 1px solid var(--tf-border);
  background: linear-gradient(135deg, #dbeafe, #f8fafc 45%, #fef3c7);
}

.ntm-cover-card.empty {
  border-style: dashed;
}

.ntm-cover-image {
  display: block;
  width: 100%;
  height: 220px;
  object-fit: cover;
}

.ntm-cover-empty {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  padding: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(15, 23, 42, 0.12)),
    radial-gradient(circle at top right, rgba(255,255,255,.95), rgba(255,255,255,.15) 40%),
    linear-gradient(135deg, #c7d2fe, #cffafe 48%, #fef3c7);
}

.ntm-cover-empty-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.ntm-cover-empty-copy {
  max-width: 360px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(15, 23, 42, 0.72);
}

.ntm-cover-toolbar {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ntm-cover-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(15, 23, 42, 0.58);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.ntm-cover-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.ntm-cover-btn.solid {
  border-color: var(--tf-primary);
  background: var(--tf-primary);
}

.ntm-cover-btn.danger {
  background: rgba(153, 27, 27, 0.84);
  border-color: rgba(254, 202, 202, 0.7);
}

.ntm-cover-url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ntm-hidden-input {
  display: none;
}

.ntm-field {
  flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0;
}
.ntm-label { font-size: 11px; color: var(--tf-text-faint); }

.ntm-error {
  font-size: 12px; color: var(--tf-overdue);
  background: #fef2f2; border-radius: 5px; padding: 6px 10px;
}

.ntm-actions {
  display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px;
}

.ntm-btn-primary {
  padding: 8px 18px;
  background: var(--tf-primary); color: #fff;
  border: none; border-radius: 6px;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background 120ms;
}
.ntm-btn-primary:hover:not(:disabled) { background: var(--tf-primary-hover); }
.ntm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.ntm-btn-cancel {
  padding: 8px 16px;
  background: var(--tf-hover-bg); border: none;
  border-radius: 6px; color: var(--tf-text-muted);
  font-size: 13px; cursor: pointer;
}
.ntm-btn-cancel:hover { background: var(--tf-border); }

.ntm-textarea { resize: vertical; min-height: 72px; }

@media (max-width: 640px) {
  .ntm-row,
  .ntm-cover-url-row,
  .ntm-actions {
    flex-direction: column;
  }

  .ntm-cover-toolbar {
    left: 12px;
    right: 12px;
    justify-content: stretch;
  }

  .ntm-cover-btn,
  .ntm-btn-primary,
  .ntm-btn-cancel {
    width: 100%;
  }
}
</style>
