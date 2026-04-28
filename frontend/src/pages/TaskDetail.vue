<template>
  <div class="task-detail-page">
    <div class="detail-topbar">
      <button class="btn-back" @click="goBack">
        <ChevronLeftIcon :size="16" /> Volver
      </button>

      <div class="detail-actions">
        <button
          v-if="task?._assignees?.length"
          class="action-btn whatsapp"
          @click="showWhatsApp = true"
        >
          <PhoneIcon :size="14" /> WhatsApp
        </button>
        <button
          v-if="task?._assignees?.length"
          class="action-btn email"
          @click="showEmail = true"
        >
          <MailIcon :size="14" /> Correo
        </button>
        <a
          v-if="task"
          :href="`/app/task/${task.name}`"
          target="_blank"
          class="action-btn"
        >
          <ExternalLinkIcon :size="14" /> ERPNext
        </a>
        <button
          v-if="perms.canDeleteTask"
          class="action-btn danger"
          @click="confirmDelete = true"
        >
          <Trash2Icon :size="14" /> Eliminar
        </button>
      </div>
    </div>

    <div v-if="loading" class="center-wrap">
      <LoadingSpinner :size="36" label="Cargando tarea…" />
    </div>

    <div v-else-if="!task" class="center-wrap">
      <EmptyState
        title="Tarea no encontrada"
        description="No pudimos cargar la tarea solicitada."
      />
    </div>

    <template v-else>
      <div class="detail-hero">
        <div class="hero-cover-shell" :class="{ empty: !task.cover_image }">
          <img v-if="task.cover_image" :src="task.cover_image" :alt="task.subject" class="hero-cover" />
          <div v-else class="hero-cover-empty">
            <span class="hero-cover-empty-title">Sin portada</span>
            <span class="hero-cover-empty-copy">Agrega una imagen para identificar esta tarea como una página tipo Notion.</span>
          </div>

          <div v-if="canEdit" class="hero-cover-actions">
            <button class="hero-cover-btn" type="button" :disabled="coverSaving" @click="openCoverPicker">
              {{ coverSaving ? "Subiendo…" : (task.cover_image ? "Cambiar imagen" : "Agregar imagen") }}
            </button>
            <button class="hero-cover-btn" type="button" @click="showCoverEditor = !showCoverEditor">
              {{ showCoverEditor ? "Ocultar URL" : "Pegar URL" }}
            </button>
            <button
              v-if="task.cover_image"
              class="hero-cover-btn danger"
              type="button"
              :disabled="coverSaving"
              @click="clearCoverImage"
            >
              Quitar
            </button>
          </div>
        </div>

        <input
          ref="coverFileRef"
          type="file"
          class="cover-file-input"
          accept="image/*"
          @change="onCoverFileChange"
        />

        <div v-if="canEdit && showCoverEditor" class="hero-cover-editor">
          <input
            v-model="coverUrlDraft"
            class="meta-input cover-url-input"
            placeholder="Pega la URL de la portada o usa /files/imagen.png"
            @keydown.enter.prevent="saveCoverFromUrl"
          />
          <button class="assignee-add-btn" :disabled="coverSaving" @click="saveCoverFromUrl">
            {{ coverSaving ? "Guardando…" : "Guardar portada" }}
          </button>
        </div>

        <div v-if="coverError" class="error-banner cover-error">{{ coverError }}</div>

        <div class="hero-meta">
          <span class="hero-docname">{{ task.name }}</span>
          <span class="hero-project" v-if="task.project">{{ task.project }}</span>
        </div>

        <textarea
          v-model="editedTask.subject"
          class="hero-title"
          rows="2"
          :disabled="!canEdit"
          @blur="saveField('subject', editedTask.subject)"
        />

        <div class="hero-badges">
          <StatusBadge v-if="task.status" :status="task.status" :dot="true" />
          <StatusBadge v-if="task.priority" :priority="task.priority" :dot="false" />
          <span v-if="isOverdue(task)" class="hero-overdue">Vencida</span>
        </div>

        <div v-if="canEdit" class="hero-status-rail">
          <span class="hero-status-label">Actualizar estado</span>
          <div class="hero-status-actions">
            <button
              v-for="status in QUICK_STATUS_ACTIONS"
              :key="status"
              class="hero-status-btn"
              :class="{ active: task.status === status }"
              type="button"
              :disabled="statusSaving"
              @click="updateStatus(status)"
            >
              {{ STATUS_LABEL[status] || status }}
            </button>
          </div>
        </div>
      </div>

      <div class="detail-grid">
        <section class="detail-main">
          <SectionBlock title="Detalles">
            <div class="meta-grid">
              <MetaField label="Estado">
                <select
                  v-model="editedTask.status"
                  class="meta-select"
                  :disabled="!canEdit"
                  @change="saveField('status', editedTask.status)"
                >
                  <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABEL[s] || s }}</option>
                </select>
              </MetaField>
              <MetaField label="Prioridad">
                <select
                  v-model="editedTask.priority"
                  class="meta-select"
                  :disabled="!canEdit"
                  @change="saveField('priority', editedTask.priority)"
                >
                  <option value="">—</option>
                  <option v-for="p in PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] || p }}</option>
                </select>
              </MetaField>
              <MetaField label="Proyecto">
                <select
                  v-model="editedTask.project"
                  class="meta-select"
                  :disabled="!canEdit"
                  @change="saveField('project', editedTask.project)"
                >
                  <option value="">—</option>
                  <option v-for="p in projects" :key="p.name" :value="p.name">{{ p.project_name }}</option>
                </select>
              </MetaField>
              <MetaField label="Progreso">
                <div class="progress-row">
                  <div class="progress-bar-wrap">
                    <div class="progress-bar-fill" :style="{ width: `${task.progress || 0}%` }" />
                  </div>
                  <span class="progress-label">{{ task.progress || 0 }}%</span>
                </div>
              </MetaField>
              <MetaField label="Fecha inicio">
                <input
                  type="date"
                  v-model="editedTask.exp_start_date"
                  class="meta-input"
                  :disabled="!canEdit"
                  @change="saveField('exp_start_date', editedTask.exp_start_date)"
                />
              </MetaField>
              <MetaField label="Fecha venc.">
                <input
                  type="date"
                  v-model="editedTask.exp_end_date"
                  class="meta-input"
                  :class="{ overdue: isOverdue(task) }"
                  :disabled="!canEdit"
                  @change="saveField('exp_end_date', editedTask.exp_end_date)"
                />
              </MetaField>
              <MetaField label="Horas est.">
                <input
                  type="number"
                  v-model.number="editedTask.expected_time"
                  class="meta-input"
                  min="0"
                  :disabled="!canEdit"
                  @change="saveField('expected_time', editedTask.expected_time)"
                />
              </MetaField>
              <MetaField label="Horas reales">
                <span class="meta-readonly">{{ task.actual_time || 0 }} h</span>
              </MetaField>
            </div>
          </SectionBlock>

          <SectionBlock title="Descripción">
            <textarea
              v-model="editedTask.description"
              class="desc-textarea"
              placeholder="Agregar descripción…"
              :disabled="!canEdit"
              @blur="saveField('description', editedTask.description)"
            />
          </SectionBlock>

          <SectionBlock :title="`Subtareas (${subtasks.length})`">
            <div v-for="sub in subtasks" :key="sub.name" class="subtask-row">
              <button
                class="subtask-check"
                :class="{ done: sub.status === 'Completed' }"
                :disabled="!canEdit"
                @click="toggleSubtask(sub)"
              >
                <CheckIcon :size="11" />
              </button>
              <span :class="{ 'line-through': sub.status === 'Completed' }">{{ sub.subject }}</span>
            </div>

            <div v-if="canEdit" class="new-subtask-row">
              <input
                v-model="newSubject"
                class="meta-input"
                placeholder="+ Nueva subtarea…"
                @keydown.enter="addSubtask"
              />
              <button v-if="newSubject" class="icon-btn" @click="addSubtask">
                <CheckIcon :size="14" />
              </button>
            </div>
          </SectionBlock>

          <SectionBlock title="Actividad">
            <div class="comment-list">
              <div v-for="comment in comments" :key="comment.name" class="comment-item">
                <UserAvatar :name="comment.owner" :size="28" />
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-owner">{{ comment.owner }}</span>
                    <span class="comment-date">{{ fmtDateTime(comment.creation) }}</span>
                  </div>
                  <div class="comment-content" v-html="comment.content" />
                </div>
              </div>
            </div>

            <div class="new-comment-row">
              <UserAvatar :name="userStore.displayName" :src="userStore.avatar" :size="28" />
              <div class="new-comment-input-wrap">
                <textarea
                  v-model="newComment"
                  class="desc-textarea"
                  rows="2"
                  placeholder="Agregar comentario…"
                />
                <button
                  :disabled="!newComment.trim()"
                  class="submit-comment-btn"
                  @click="submitComment"
                >
                  Enviar
                </button>
              </div>
            </div>
          </SectionBlock>
        </section>

        <aside class="detail-side">
          <SectionBlock title="Equipo">
            <div class="mini-section-head">Asignados</div>
            <div class="assignee-list">
              <div v-for="email in task._assignees" :key="email" class="assignee-chip">
                <UserAvatar
                  :name="userCache[email]?.full_name || email"
                  :src="userCache[email]?.user_image || null"
                  :size="28"
                />
                <span class="assignee-name">{{ userCache[email]?.full_name || email }}</span>
                <button
                  v-if="canEdit"
                  class="assignee-remove"
                  title="Quitar asignación"
                  @click="doRemoveAssignee(email)"
                >
                  <XIcon :size="11" />
                </button>
              </div>
              <span v-if="!task._assignees.length" class="meta-empty">Sin asignar</span>
            </div>

            <div v-if="canEdit" class="add-assignee-row">
              <select v-model="addAssigneeEmail" class="meta-select add-assignee-select">
                <option value="">+ Agregar asignado…</option>
                <option
                  v-for="u in systemUsers.filter(u => !task._assignees.includes(u.name))"
                  :key="u.name"
                  :value="u.name"
                >
                  {{ u.full_name || u.name }}
                </option>
              </select>
              <button
                v-if="addAssigneeEmail"
                class="assignee-add-btn"
                :disabled="assigneeSaving"
                @click="doAddAssignee"
              >
                {{ assigneeSaving ? "…" : "Asignar" }}
              </button>
            </div>

            <div class="contact-actions">
              <button v-if="task._assignees?.length" class="action-btn whatsapp" @click="showWhatsApp = true">
                <PhoneIcon :size="13" /> WhatsApp
              </button>
              <button v-if="task._assignees?.length" class="action-btn email" @click="showEmail = true">
                <MailIcon :size="13" /> Email
              </button>
            </div>

            <div class="inline-divider" />
            <div class="mini-section-head">Observadores</div>
            <div class="assignee-list muted">
              <div v-for="watcher in (task.watchers || [])" :key="watcher.user" class="assignee-chip">
                <UserAvatar
                  :name="userCache[watcher.user]?.full_name || watcher.user"
                  :src="userCache[watcher.user]?.user_image || null"
                  :size="24"
                />
                <span>{{ userCache[watcher.user]?.full_name || watcher.user }}</span>
              </div>
              <span v-if="!(task.watchers || []).length" class="meta-empty">Sin observadores</span>
            </div>
          </SectionBlock>

          <SectionBlock title="Información">
            <div class="meta-grid meta-grid-single">
              <MetaField label="Recordatorio enviado">
                <span :class="task.reminder_sent ? 'badge-yes' : 'badge-no'">
                  {{ task.reminder_sent ? "Sí" : "No" }}
                </span>
              </MetaField>
              <MetaField label="Es hito">
                <input
                  type="checkbox"
                  v-model="editedTask.is_milestone"
                  :disabled="!canEdit"
                  @change="saveField('is_milestone', editedTask.is_milestone ? 1 : 0)"
                />
              </MetaField>
              <MetaField label="Completado por">
                <span class="meta-readonly">{{ task.completed_by || "—" }}</span>
              </MetaField>
            </div>
          </SectionBlock>
        </aside>
      </div>

      <WhatsAppModal
        v-if="showWhatsApp"
        :task="task"
        :assignee-email="primaryEmail"
        :assignee-name="userCache[primaryEmail]?.full_name || primaryEmail"
        :raw-phone="primaryPhone"
        @close="showWhatsApp = false"
      />
      <EmailModal
        v-if="showEmail"
        :task="task"
        :assignee-email="primaryEmail"
        :assignee-name="userCache[primaryEmail]?.full_name || primaryEmail"
        @close="showEmail = false"
        @sent="showEmail = false"
      />

      <div v-if="confirmDelete" class="modal-backdrop" @click.self="confirmDelete = false">
        <div class="modal-box modal-sm">
          <div class="modal-header">
            <h3 class="modal-title">Eliminar tarea</h3>
            <button class="icon-btn" @click="confirmDelete = false"><XIcon :size="16" /></button>
          </div>
          <div class="modal-body">
            <p class="confirm-msg">
              ¿Eliminar <strong>{{ task.subject }}</strong>? Esta acción no se puede deshacer.
            </p>
            <div v-if="deleteError" class="error-banner">{{ deleteError }}</div>
          </div>
          <div class="modal-actions">
            <button class="btn-danger" :disabled="deleting" @click="doDelete">
              {{ deleting ? "Eliminando…" : "Eliminar" }}
            </button>
            <button class="btn-cancel" @click="confirmDelete = false">Cancelar</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  CheckIcon,
  ChevronLeftIcon,
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
  Trash2Icon,
  XIcon,
} from "lucide-vue-next";
import EmptyState from "../components/base/EmptyState.vue";
import LoadingSpinner from "../components/base/LoadingSpinner.vue";
import StatusBadge from "../components/base/StatusBadge.vue";
import UserAvatar from "../components/base/UserAvatar.vue";
import EmailModal from "../components/shared/EmailModal.vue";
import WhatsAppModal from "../components/shared/WhatsAppModal.vue";
import { usePermissionsStore } from "../stores/permissions.js";
import { useUserStore } from "../stores/user.js";
import {
  addAssignment,
  addComment,
  createTask,
  deleteTask,
  fmtDateTime,
  getAssignments,
  getComments,
  getProjects,
  getSubtasks,
  getSystemUsers,
  getTask,
  getUser,
  isOverdue,
  PRIORITY_LABEL,
  removeAssignment,
  setTaskField,
  STATUS_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  uploadFile,
} from "../api/index.js";

const MetaField = {
  props: { label: String },
  setup(props, { slots }) {
    return () => h("div", { class: "meta-field" }, [
      h("label", { class: "meta-label" }, props.label),
      h("div", { class: "meta-value" }, slots.default?.()),
    ]);
  },
};

const SectionBlock = {
  props: { title: String },
  setup(props, { slots }) {
    return () => h("section", { class: "section-block" }, [
      h("h3", { class: "section-title" }, props.title),
      h("div", { class: "section-body" }, slots.default?.()),
    ]);
  },
};

const route = useRoute();
const router = useRouter();
const perms = usePermissionsStore();
const userStore = useUserStore();

const taskName = computed(() => route.params.name);
const task = ref(null);
const editedTask = ref({});
const subtasks = ref([]);
const comments = ref([]);
const projects = ref([]);
const systemUsers = ref([]);
const userCache = ref({});
const coverFileRef = ref(null);
const coverUrlDraft = ref("");
const showCoverEditor = ref(false);
const coverSaving = ref(false);
const coverError = ref("");
const statusSaving = ref(false);
const newComment = ref("");
const newSubject = ref("");
const addAssigneeEmail = ref("");
const assigneeSaving = ref(false);
const showWhatsApp = ref(false);
const showEmail = ref(false);
const loading = ref(true);
const confirmDelete = ref(false);
const deleting = ref(false);
const deleteError = ref("");

const STATUSES = TASK_STATUSES.filter(s => s !== "Template");
const PRIORITIES = TASK_PRIORITIES;
const QUICK_STATUS_ACTIONS = ["Open", "Working", "Pending Review", "Completed"];

const canEdit = computed(() =>
  task.value ? perms.canEditTask(task.value, userStore.email) : false
);

const primaryEmail = computed(() => task.value?._assignees?.[0] || "");
const primaryPhone = computed(() => {
  const first = task.value?._assignees?.[0];
  return first ? userCache.value[first]?.mobile_no || userCache.value[first]?.phone || "" : "";
});

function normalizeTaskPayload(rawTask, assignees) {
  return {
    ...rawTask,
    _assign: JSON.stringify(assignees),
    _assignees: assignees,
  };
}

async function loadTaskPage() {
  if (!taskName.value) {
    task.value = null;
    return;
  }

  loading.value = true;
  showWhatsApp.value = false;
  showEmail.value = false;
  deleteError.value = "";
  confirmDelete.value = false;
  coverError.value = "";
  showCoverEditor.value = false;

  try {
    const [rawTask, rawSubtasks, rawComments, rawProjects, rawUsers, assignees] = await Promise.all([
      getTask(taskName.value),
      getSubtasks(taskName.value),
      getComments(taskName.value),
      getProjects(),
      getSystemUsers(),
      getAssignments("Task", taskName.value),
    ]);

    if (!rawTask) {
      task.value = null;
      return;
    }

    task.value = normalizeTaskPayload(rawTask, assignees);
    editedTask.value = {
      ...task.value,
      exp_start_date: task.value.exp_start_date?.slice(0, 10),
      exp_end_date: task.value.exp_end_date?.slice(0, 10),
    };
    coverUrlDraft.value = task.value.cover_image || "";
    subtasks.value = rawSubtasks;
    comments.value = rawComments;
    projects.value = rawProjects;
    systemUsers.value = rawUsers;
    addAssigneeEmail.value = "";

    const emails = new Set([
      ...assignees,
      ...((task.value.watchers || []).map(w => w.user).filter(Boolean)),
    ]);

    await Promise.all([...emails].map(async (email) => {
      if (!userCache.value[email]) userCache.value[email] = await getUser(email);
    }));
  } finally {
    loading.value = false;
  }
}

async function saveField(fieldname, value) {
  if (!task.value || !canEdit.value) return;
  const previousValue = task.value[fieldname] ?? "";
  try {
    await setTaskField(task.value.name, fieldname, value ?? "");
    task.value[fieldname] = value ?? "";
    if (fieldname === "status" || fieldname === "priority" || fieldname === "project") {
      editedTask.value[fieldname] = value ?? "";
    }
    return true;
  } catch (err) {
    editedTask.value[fieldname] = previousValue;
    console.error("Error saving field:", err);
    return false;
  }
}

async function updateStatus(status) {
  if (!task.value || !canEdit.value || task.value.status === status || statusSaving.value) return;
  statusSaving.value = true;
  editedTask.value.status = status;
  await saveField("status", status);
  statusSaving.value = false;
}

function openCoverPicker() {
  if (!canEdit.value || coverSaving.value) return;
  coverFileRef.value?.click();
}

async function setCoverImage(value) {
  if (!task.value || !canEdit.value) return;
  coverSaving.value = true;
  coverError.value = "";
  try {
    const nextValue = value?.trim?.() ?? value ?? "";
    await setTaskField(task.value.name, "cover_image", nextValue);
    task.value.cover_image = nextValue;
    editedTask.value.cover_image = nextValue;
    coverUrlDraft.value = nextValue;
    if (nextValue) showCoverEditor.value = false;
  } catch {
    coverError.value = "No se pudo guardar la portada.";
  } finally {
    coverSaving.value = false;
  }
}

async function saveCoverFromUrl() {
  await setCoverImage(coverUrlDraft.value);
}

async function clearCoverImage() {
  coverUrlDraft.value = "";
  await setCoverImage("");
}

async function onCoverFileChange(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file || !task.value || !canEdit.value) return;

  coverSaving.value = true;
  coverError.value = "";
  try {
    const uploaded = await uploadFile(file, {
      doctype: "Task",
      docname: task.value.name,
      fieldname: "cover_image",
      isPrivate: false,
    });
    await setCoverImage(uploaded.file_url);
  } catch {
    coverError.value = "No se pudo subir la portada. Intenta con otra imagen.";
    coverSaving.value = false;
  }
}

async function addSubtask() {
  if (!newSubject.value.trim() || !task.value || !canEdit.value) return;
  const sub = await createTask({
    subject: newSubject.value.trim(),
    parent_task: task.value.name,
    project: task.value.project,
    status: "Open",
  });
  subtasks.value.push(sub);
  newSubject.value = "";
}

async function toggleSubtask(subtask) {
  if (!canEdit.value) return;
  const next = subtask.status === "Completed" ? "Open" : "Completed";
  await setTaskField(subtask.name, "status", next);
  subtask.status = next;
}

async function submitComment() {
  if (!newComment.value.trim() || !task.value) return;
  const comment = await addComment(task.value.name, newComment.value.trim());
  comments.value.push({
    ...comment,
    owner: userStore.email,
    creation: new Date().toISOString(),
    comment_type: "Comment",
  });
  newComment.value = "";
}

async function doAddAssignee() {
  const email = addAssigneeEmail.value;
  if (!email || !task.value || assigneeSaving.value || !canEdit.value) return;
  if (task.value._assignees.includes(email)) {
    addAssigneeEmail.value = "";
    return;
  }

  assigneeSaving.value = true;
  try {
    await addAssignment(task.value.name, email);
    if (!userCache.value[email]) userCache.value[email] = await getUser(email);
    task.value._assignees = [...task.value._assignees, email];
    task.value._assign = JSON.stringify(task.value._assignees);
    addAssigneeEmail.value = "";
  } finally {
    assigneeSaving.value = false;
  }
}

async function doRemoveAssignee(email) {
  if (!task.value || !canEdit.value) return;
  await removeAssignment(task.value.name, email);
  task.value._assignees = task.value._assignees.filter(value => value !== email);
  task.value._assign = JSON.stringify(task.value._assignees);
}

async function doDelete() {
  if (!task.value || deleting.value) return;
  deleting.value = true;
  deleteError.value = "";
  try {
    await deleteTask(task.value.name);
    router.push({ name: "Dashboard" });
  } catch {
    deleteError.value = "No se pudo eliminar la tarea. Verifica permisos o dependencias.";
  } finally {
    deleting.value = false;
  }
}

function goBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push({ name: "Dashboard" });
}

onMounted(async () => {
  await perms.load();
  await loadTaskPage();
});

watch(taskName, loadTaskPage);
</script>

<style scoped>
.task-detail-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100%;
  max-width: 1380px;
  margin: 0 auto;
  padding-bottom: 32px;
}

.detail-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-hero {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 22px;
  border: 1px solid var(--tf-border);
  border-radius: 24px;
  background: linear-gradient(180deg, var(--tf-surface), color-mix(in srgb, var(--tf-surface) 78%, var(--tf-bg)));
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.hero-cover-shell {
  position: relative;
  width: 100%;
  border-radius: 14px;
  overflow: hidden;
  background: var(--tf-hover-bg);
  min-height: 220px;
}

.hero-cover-shell.empty {
  border: 1px dashed color-mix(in srgb, var(--tf-primary) 26%, var(--tf-border));
  background:
    linear-gradient(180deg, rgba(255,255,255,.08), rgba(15,23,42,.12)),
    radial-gradient(circle at top right, rgba(255,255,255,.9), rgba(255,255,255,.1) 40%),
    linear-gradient(135deg, #c7d2fe, #cffafe 50%, #fef3c7);
}

.hero-cover {
  display: block;
  width: 100%;
  height: 300px;
  object-fit: cover;
}

.hero-cover-empty {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 6px;
  padding: 18px;
}

.hero-cover-empty-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.hero-cover-empty-copy {
  max-width: 420px;
  font-size: 12px;
  line-height: 1.45;
  color: rgba(15, 23, 42, 0.72);
}

.hero-cover-actions {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.hero-cover-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.42);
  background: rgba(15, 23, 42, .6);
  color: #fff;
  font-size: 12px;
  cursor: pointer;
  backdrop-filter: blur(10px);
}

.hero-cover-btn:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.hero-cover-btn.danger {
  background: rgba(153, 27, 27, 0.84);
  border-color: rgba(254, 202, 202, 0.7);
}

.hero-cover-editor {
  display: flex;
  gap: 10px;
  align-items: center;
}

.cover-url-input {
  flex: 1;
}

.cover-file-input {
  display: none;
}

.cover-error {
  margin-top: -2px;
}

.hero-meta,
.hero-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-docname,
.hero-project,
.hero-overdue {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
}

.hero-docname {
  background: var(--tf-hover-bg);
  color: var(--tf-text-muted);
}

.hero-project {
  background: var(--tf-active-bg);
  color: var(--tf-primary);
}

.hero-overdue {
  background: #fee2e2;
  color: var(--tf-overdue);
}

.hero-title {
  width: 100%;
  min-height: 68px;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  color: var(--tf-text);
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  resize: none;
  padding: 4px 6px;
  font-family: inherit;
  outline: none;
}

.hero-title:focus {
  border-color: var(--tf-primary);
  background: var(--tf-bg);
}

.hero-title:disabled {
  opacity: 1;
  cursor: default;
}

.hero-status-rail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.hero-status-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--tf-text-faint);
}

.hero-status-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hero-status-btn {
  border: 1px solid var(--tf-border);
  background: color-mix(in srgb, var(--tf-surface) 86%, white 14%);
  color: var(--tf-text-muted);
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, color 120ms;
}

.hero-status-btn:hover:not(:disabled) {
  background: var(--tf-hover-bg);
  color: var(--tf-text);
}

.hero-status-btn.active {
  background: var(--tf-active-bg);
  border-color: color-mix(in srgb, var(--tf-primary) 36%, transparent);
  color: var(--tf-primary);
}

.hero-status-btn:disabled {
  opacity: .6;
  cursor: wait;
}

.detail-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 16px;
  min-height: 0;
  align-items: start;
}

.detail-main,
.detail-side {
  display: flex;
  flex-direction: column;
  gap: 0;
  background: color-mix(in srgb, var(--tf-surface) 92%, white 8%);
  border: 1px solid var(--tf-border);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.04);
}

.detail-side {
  position: sticky;
  top: 24px;
}

.section-block {
  border: none;
  border-radius: 0;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.section-block + .section-block {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid color-mix(in srgb, var(--tf-border) 82%, transparent);
}

.section-title {
  margin: 0 0 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--tf-text-faint);
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mini-section-head {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  color: var(--tf-text-faint);
}

.inline-divider {
  height: 1px;
  background: color-mix(in srgb, var(--tf-border) 78%, transparent);
  margin: 2px 0;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 14px;
}

.meta-grid-single {
  grid-template-columns: 1fr;
}

:deep(.meta-field) {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

:deep(.meta-label) {
  font-size: 11px;
  color: var(--tf-text-faint);
}

.meta-select,
.meta-input {
  padding: 10px 12px;
  border: 1px solid var(--tf-border);
  border-radius: 12px;
  background: var(--tf-bg);
  color: var(--tf-text);
  font-size: 13px;
  outline: none;
  width: 100%;
}

.meta-select:focus,
.meta-input:focus,
.desc-textarea:focus {
  border-color: var(--tf-primary);
}

.meta-select:disabled,
.meta-input:disabled,
.desc-textarea:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.meta-input.overdue {
  border-color: var(--tf-overdue);
  color: var(--tf-overdue);
}

.meta-readonly,
.meta-empty {
  font-size: 13px;
  color: var(--tf-text-muted);
}

.meta-empty {
  font-style: italic;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar-wrap {
  flex: 1;
  height: 7px;
  background: var(--tf-border);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--tf-primary);
  border-radius: 999px;
  transition: width 300ms;
}

.progress-label {
  font-size: 12px;
  color: var(--tf-text-muted);
}

.desc-textarea {
  width: 100%;
  min-height: 132px;
  padding: 12px 14px;
  border: 1px solid var(--tf-border);
  border-radius: 14px;
  background: var(--tf-bg);
  color: var(--tf-text);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.assignee-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-height: 32px; /* reserve space even when empty */
}

.assignee-list.muted .assignee-chip {
  background: transparent;
}

.assignee-chip {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px 5px 5px;
  border: 1px solid var(--tf-border);
  border-radius: 999px;
  font-size: 13px;
  color: var(--tf-text);
  background: color-mix(in srgb, var(--tf-bg) 90%, white 10%);
  transition: border-color 120ms, background 120ms;
}
.assignee-chip:hover {
  border-color: color-mix(in srgb, var(--tf-primary) 40%, transparent);
  background: color-mix(in srgb, var(--tf-active-bg) 45%, white 55%);
}

.assignee-name {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.assignee-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: var(--tf-hover-bg);
  color: var(--tf-text-faint);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms, color 120ms;
}
.assignee-remove:hover { background: #fee2e2; color: var(--tf-overdue); }

.add-assignee-row,
.new-subtask-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.add-assignee-row {
  padding-top: 4px;
}

.add-assignee-select {
  flex: 1;
  min-width: 0;
}

/* Contact actions — visually separated from the assignee list above */
.contact-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.contact-actions .action-btn {
  flex: 1;
  justify-content: center;
  min-width: 110px;
}

.assignee-add-btn,
.submit-comment-btn,
.btn-back,
.btn-danger,
.btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms, color 120ms, opacity 120ms;
}

.assignee-add-btn,
.submit-comment-btn,
.btn-back {
  padding: 8px 14px;
}

.assignee-add-btn,
.submit-comment-btn {
  background: var(--tf-primary);
  color: #fff;
}

.assignee-add-btn:hover:not(:disabled),
.submit-comment-btn:hover:not(:disabled) {
  background: var(--tf-primary-hover);
}

.assignee-add-btn:disabled,
.submit-comment-btn:disabled,
.btn-danger:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.btn-back {
  background: transparent;
  color: var(--tf-text);
  border: 1px solid var(--tf-border);
}

.btn-back:hover {
  background: var(--tf-hover-bg);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid var(--tf-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--tf-surface) 84%, white 16%);
  color: var(--tf-text);
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  transition: background 120ms, border-color 120ms;
}

.action-btn:hover {
  background: var(--tf-hover-bg);
}

.action-btn.whatsapp {
  color: #16a34a;
  border-color: #bbf7d0;
}

.action-btn.whatsapp:hover {
  background: #f0fdf4;
}

.action-btn.email {
  color: var(--tf-primary);
  border-color: color-mix(in srgb, var(--tf-primary) 30%, transparent);
}

.action-btn.email:hover {
  background: var(--tf-active-bg);
}

.action-btn.danger,
.btn-danger {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}

.action-btn.danger:hover,
.btn-danger:hover:not(:disabled) {
  background: #fecaca;
}

.subtask-row,
.comment-item,
.new-comment-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.subtask-row {
  align-items: center;
}

.subtask-check {
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--tf-border);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.subtask-check.done {
  background: var(--tf-completed);
  border-color: var(--tf-completed);
  color: #fff;
}

.subtask-check:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.line-through {
  text-decoration: line-through;
  color: var(--tf-text-faint);
}

.cover-thumb {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 10px;
}

.badge-yes {
  color: var(--tf-completed);
  font-size: 12px;
}

.badge-no {
  color: var(--tf-text-faint);
  font-size: 12px;
}

.comment-list,
.new-comment-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.new-comment-input-wrap {
  flex: 1;
}

.comment-body {
  flex: 1;
}

.comment-meta {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.comment-owner {
  font-size: 12px;
  font-weight: 600;
  color: var(--tf-text);
}

.comment-date {
  font-size: 11px;
  color: var(--tf-text-faint);
}

.comment-content {
  font-size: 13px;
  color: var(--tf-text);
  line-height: 1.5;
}

.center-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(15, 23, 42, .38);
}

.modal-box {
  width: min(440px, 100%);
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 16px;
  box-shadow: 0 20px 48px rgba(0, 0, 0, .25);
}

.modal-sm {
  width: min(420px, 100%);
}

.modal-header,
.modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 16px 18px;
}

.modal-header {
  border-bottom: 1px solid var(--tf-border);
}

.modal-body {
  padding: 16px 18px;
}

.modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--tf-text);
}

.confirm-msg,
.error-banner {
  font-size: 13px;
  color: var(--tf-text);
}

.error-banner {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fef2f2;
  color: #b91c1c;
}

.btn-danger,
.btn-cancel {
  padding: 8px 14px;
}

.btn-cancel {
  background: var(--tf-hover-bg);
  color: var(--tf-text-muted);
}

.btn-cancel:hover {
  background: var(--tf-border);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--tf-text-muted);
  cursor: pointer;
}

.icon-btn:hover {
  background: var(--tf-hover-bg);
  color: var(--tf-text);
}

@media (max-width: 1100px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-side {
    position: static;
  }
}

@media (max-width: 700px) {
  .hero-title {
    font-size: 22px;
  }

  .hero-cover {
    height: 220px;
  }

  .task-detail-page {
    gap: 16px;
    padding-bottom: 20px;
  }

  .detail-hero,
  .detail-main,
  .detail-side {
    padding: 18px;
    border-radius: 18px;
  }

  .hero-cover-editor {
    flex-direction: column;
  }

  .hero-cover-actions {
    left: 14px;
    right: 14px;
  }

  .meta-grid {
    grid-template-columns: 1fr;
  }

  .detail-topbar,
  .detail-actions {
    align-items: stretch;
  }

  .detail-actions {
    width: 100%;
  }

  .hero-status-actions,
  .detail-actions,
  .modal-actions {
    width: 100%;
  }

  .hero-cover-btn,
  .assignee-add-btn,
  .hero-status-btn,
  .action-btn,
  .btn-danger,
  .btn-cancel {
    width: 100%;
  }

  .contact-actions .action-btn {
    min-width: 0;
  }

  .modal-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
}
</style>
