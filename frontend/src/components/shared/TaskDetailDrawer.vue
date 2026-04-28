<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div v-if="drawer.isOpen" class="drawer-backdrop" @click="drawer.close()" />
    </Transition>

    <!-- Drawer panel -->
    <Transition name="slide">
      <aside v-if="drawer.isOpen" class="drawer-panel">
        <!-- Header -->
        <div class="drawer-header">
          <div class="drawer-title-row">
            <span v-if="task" class="drawer-docname">{{ task.name }}</span>
            <div class="drawer-header-actions">
              <a v-if="task" :href="`/app/task/${task.name}`" target="_blank" class="icon-btn" title="Abrir en ERPNext">
                <ExternalLinkIcon :size="15" />
              </a>
              <button class="icon-btn" @click="drawer.close()"><XIcon :size="16" /></button>
            </div>
          </div>
          <!-- Editable title -->
          <textarea
            v-if="task"
            v-model="editedTask.subject"
            class="drawer-task-title"
            rows="2"
            @blur="saveField('subject', editedTask.subject)"
          />
          <div v-else class="skeleton-line wide" />
        </div>

        <div v-if="task" class="drawer-body">
          <!-- Quick fields row -->
          <div class="meta-grid">
            <MetaField label="Estado">
              <select v-model="editedTask.status" class="meta-select" @change="saveField('status', editedTask.status)">
                <option v-for="s in STATUSES" :key="s" :value="s">{{ STATUS_LABEL[s] || s }}</option>
              </select>
            </MetaField>
            <MetaField label="Prioridad">
              <select v-model="editedTask.priority" class="meta-select" @change="saveField('priority', editedTask.priority)">
                <option value="">—</option>
                <option v-for="p in PRIORITIES" :key="p" :value="p">{{ PRIORITY_LABEL[p] || p }}</option>
              </select>
            </MetaField>
            <MetaField label="Proyecto">
              <select v-model="editedTask.project" class="meta-select" @change="saveField('project', editedTask.project)">
                <option value="">—</option>
                <option v-for="p in projects" :key="p.name" :value="p.name">{{ p.project_name }}</option>
              </select>
            </MetaField>
            <MetaField label="Progreso">
              <div class="progress-row">
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" :style="{ width: (task.progress || 0) + '%' }" />
                </div>
                <span class="progress-label">{{ task.progress || 0 }}%</span>
              </div>
            </MetaField>
            <MetaField label="Fecha inicio">
              <input type="date" v-model="editedTask.exp_start_date" class="meta-input" @change="saveField('exp_start_date', editedTask.exp_start_date)" />
            </MetaField>
            <MetaField label="Fecha venc.">
              <input type="date" v-model="editedTask.exp_end_date" class="meta-input"
                :class="{ overdue: isOverdue(task) }"
                @change="saveField('exp_end_date', editedTask.exp_end_date)"
              />
            </MetaField>
            <MetaField label="Horas est.">
              <input type="number" v-model.number="editedTask.expected_time" class="meta-input" min="0" @change="saveField('expected_time', editedTask.expected_time)" />
            </MetaField>
            <MetaField label="Horas reales">
              <span class="meta-readonly">{{ task.actual_time || 0 }} h</span>
            </MetaField>
          </div>

          <!-- Assignees -->
          <DrawerSection title="Asignados">
            <div class="assignee-list">
              <div v-for="email in task._assignees" :key="email" class="assignee-chip">
                <UserAvatar
                  :name="userCache[email]?.full_name || email"
                  :src="userCache[email]?.user_image || null"
                  :size="28"
                />
                <span class="assignee-name">{{ userCache[email]?.full_name || email }}</span>
                <button class="assignee-remove" @click="doRemoveAssignee(email)" title="Quitar asignación">
                  <XIcon :size="11" />
                </button>
              </div>
              <span v-if="!task._assignees.length" class="meta-empty">Sin asignar</span>
            </div>

            <!-- Add assignee row -->
            <div class="add-assignee-row">
              <select v-model="addAssigneeEmail" class="meta-select add-assignee-select">
                <option value="">+ Agregar asignado…</option>
                <option
                  v-for="u in systemUsers.filter(u => !task._assignees.includes(u.name))"
                  :key="u.name"
                  :value="u.name"
                >{{ u.full_name || u.name }}</option>
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
          </DrawerSection>

          <!-- Modals -->
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

          <!-- Watchers -->
          <DrawerSection title="Observadores">
            <div class="assignee-list">
              <div v-for="w in (task.watchers || [])" :key="w.user" class="assignee-chip">
                <UserAvatar :name="userCache[w.user]?.full_name || w.user" :src="userCache[w.user]?.user_image" :size="24" />
                <span>{{ userCache[w.user]?.full_name || w.user }}</span>
              </div>
              <span v-if="!(task.watchers || []).length" class="meta-empty">Sin observadores</span>
            </div>
          </DrawerSection>

          <!-- Description -->
          <DrawerSection title="Descripción">
            <textarea
              v-model="editedTask.description"
              class="desc-textarea"
              placeholder="Agregar descripción…"
              @blur="saveField('description', editedTask.description)"
            />
          </DrawerSection>

          <!-- Subtasks -->
          <DrawerSection :title="`Subtareas (${subtasks.length})`">
            <div v-for="s in subtasks" :key="s.name" class="subtask-row">
              <button class="subtask-check" @click="toggleSubtask(s)" :class="{ done: s.status === 'Completed' }">
                <CheckIcon :size="11" />
              </button>
              <span :class="{ 'line-through': s.status === 'Completed' }">{{ s.subject }}</span>
            </div>
            <!-- New subtask inline -->
            <div class="new-subtask-row">
              <input v-model="newSubject" class="meta-input" placeholder="+ Nueva subtarea…" @keydown.enter="addSubtask" />
              <button v-if="newSubject" class="icon-btn" @click="addSubtask"><CheckIcon :size="14" /></button>
            </div>
          </DrawerSection>

          <!-- Custom fields -->
          <DrawerSection title="Campos adicionales">
            <div class="meta-grid">
              <MetaField label="Portada">
                <img v-if="task.cover_image" :src="task.cover_image" class="cover-thumb" />
                <span v-else class="meta-empty">—</span>
              </MetaField>
              <MetaField label="Recordatorio enviado">
                <span :class="task.reminder_sent ? 'badge-yes' : 'badge-no'">
                  {{ task.reminder_sent ? "Sí" : "No" }}
                </span>
              </MetaField>
              <MetaField label="Es hito">
                <input type="checkbox" v-model="editedTask.is_milestone"
                  @change="saveField('is_milestone', editedTask.is_milestone ? 1 : 0)" />
              </MetaField>
              <MetaField label="Completado por">
                <span class="meta-readonly">{{ task.completed_by || "—" }}</span>
              </MetaField>
            </div>
          </DrawerSection>

          <!-- Activity / Comments -->
          <DrawerSection title="Actividad">
            <div class="comment-list">
              <div v-for="c in comments" :key="c.name" class="comment-item">
                <UserAvatar :name="c.owner" :size="28" />
                <div class="comment-body">
                  <div class="comment-meta">
                    <span class="comment-owner">{{ c.owner }}</span>
                    <span class="comment-date">{{ fmtDateTime(c.creation) }}</span>
                  </div>
                  <div class="comment-content" v-html="c.content" />
                </div>
              </div>
            </div>
            <div class="new-comment-row">
              <UserAvatar :name="userStore.displayName" :src="userStore.avatar" :size="28" />
              <div class="new-comment-input-wrap">
                <textarea
                  v-model="newComment"
                  class="desc-textarea"
                  placeholder="Agregar comentario…"
                  rows="2"
                />
                <button :disabled="!newComment.trim()" class="submit-comment-btn" @click="submitComment">
                  Enviar
                </button>
              </div>
            </div>
          </DrawerSection>
        </div>

        <!-- Loading state -->
        <div v-else class="drawer-loading">
          <LoadingSpinner :size="32" label="Cargando tarea…" />
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, h, onMounted } from "vue";
import {
  XIcon, ExternalLinkIcon, CheckIcon, PhoneIcon, MailIcon,
} from "lucide-vue-next";
import { useDrawerStore } from "../../stores/drawer.js";
import { useUserStore } from "../../stores/user.js";
import {
  getTask, setTaskField, getSubtasks, createTask,
  getAssignments, getComments, addComment, getProjects, getUser, getSystemUsers,
  addAssignment, removeAssignment,
  TASK_STATUSES, TASK_PRIORITIES, STATUS_LABEL, PRIORITY_LABEL,
  isOverdue, fmtDateTime,
} from "../../api/index.js";
import UserAvatar from "../base/UserAvatar.vue";
import LoadingSpinner from "../base/LoadingSpinner.vue";
import WhatsAppModal from "./WhatsAppModal.vue";
import EmailModal from "./EmailModal.vue";

// ── Sub-components defined inline ────────────────────────────────────────────
const MetaField = {
  props: { label: String },
  setup(props, { slots }) {
    return () => h("div", { class: "meta-field" }, [
      h("label", { class: "meta-label" }, props.label),
      h("div", { class: "meta-value" }, slots.default?.()),
    ]);
  },
};

const DrawerSection = {
  props: { title: String },
  setup(props, { slots }) {
    return () => h("div", { class: "drawer-section" }, [
      h("h4", { class: "section-title" }, props.title),
      h("div", { class: "section-body" }, slots.default?.()),
    ]);
  },
};

// ── State ────────────────────────────────────────────────────────────────────
const drawer    = useDrawerStore();
const userStore = useUserStore();

const task            = ref(null);
const editedTask      = ref({});
const subtasks        = ref([]);
const comments        = ref([]);
const projects        = ref([]);
const systemUsers     = ref([]);
const userCache       = ref({});
const newComment      = ref("");
const newSubject      = ref("");
const addAssigneeEmail = ref("");
const assigneeSaving  = ref(false);
const showWhatsApp    = ref(false);
const showEmail       = ref(false);

const STATUSES   = TASK_STATUSES.filter(s => s !== "Template");
const PRIORITIES = TASK_PRIORITIES;

// ── Load when drawer opens ───────────────────────────────────────────────────
watch(() => drawer.taskName, async (name) => {
  if (!name) { task.value = null; return; }
  task.value = null; // trigger loading state
  showWhatsApp.value = false;
  showEmail.value    = false;
  const [t, subs, coms, projs, sysUsers, assignees] = await Promise.all([
    getTask(name),
    getSubtasks(name),
    getComments(name),
    getProjects(),
    systemUsers.value.length ? Promise.resolve(systemUsers.value) : getSystemUsers(),
    getAssignments("Task", name),
  ]);
  task.value = {
    ...t,
    _assign: JSON.stringify(assignees),
    _assignees: assignees,
  };
  editedTask.value = {
    ...task.value,
    exp_start_date: task.value.exp_start_date?.slice(0, 10),
    exp_end_date: task.value.exp_end_date?.slice(0, 10),
  };
  subtasks.value  = subs;
  comments.value  = coms;
  projects.value  = projs;
  systemUsers.value = sysUsers;
  addAssigneeEmail.value = "";

  // Load user info for assignees + watchers
  const emails = [...assignees, ...((task.value.watchers || []).map(w => w.user))];
  await Promise.all(emails.map(async (e) => {
    if (!userCache.value[e]) userCache.value[e] = await getUser(e);
  }));
});

// ── Save individual field ─────────────────────────────────────────────────────
async function saveField(fieldname, value) {
  if (!task.value) return;
  try {
    await setTaskField(task.value.name, fieldname, value ?? "");
  } catch (err) {
    console.error("Error saving field:", err);
  }
}

// ── Subtasks ─────────────────────────────────────────────────────────────────
async function addSubtask() {
  if (!newSubject.value.trim()) return;
  const sub = await createTask({
    subject: newSubject.value,
    parent_task: task.value.name,
    project: task.value.project,
    status: "Open",
  });
  subtasks.value.push(sub);
  newSubject.value = "";
}

async function toggleSubtask(sub) {
  const next = sub.status === "Completed" ? "Open" : "Completed";
  await setTaskField(sub.name, "status", next);
  sub.status = next;
}

// ── Comments ─────────────────────────────────────────────────────────────────
async function submitComment() {
  if (!newComment.value.trim()) return;
  const c = await addComment(task.value.name, newComment.value);
  comments.value.push({ ...c, owner: userStore.email, creation: new Date().toISOString(), comment_type: "Comment" });
  newComment.value = "";
}

// ── Assignee management ───────────────────────────────────────────────────────
async function doAddAssignee() {
  const email = addAssigneeEmail.value;
  if (!email || !task.value || assigneeSaving.value) return;
  if (task.value._assignees?.includes(email)) {
    addAssigneeEmail.value = "";
    return;
  }
  assigneeSaving.value = true;
  try {
    await addAssignment(task.value.name, email);
    if (!userCache.value[email]) userCache.value[email] = await getUser(email);
    task.value._assignees = [...(task.value._assignees || []), email];
    addAssigneeEmail.value = "";
  } finally {
    assigneeSaving.value = false;
  }
}

async function doRemoveAssignee(email) {
  if (!task.value) return;
  await removeAssignment(task.value.name, email);
  task.value._assignees = task.value._assignees.filter(e => e !== email);
}

// ── Contact actions ───────────────────────────────────────────────────────────
const primaryPhone = computed(() => {
  const first = task.value?._assignees?.[0];
  return first ? userCache.value[first]?.mobile_no || userCache.value[first]?.phone || "" : "";
});
const primaryEmail = computed(() => task.value?._assignees?.[0] || "");
</script>

<style scoped>
/* ── Backdrop ────────────────────────────────────────────────────────────── */
.drawer-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.35);
  z-index: 200;
}

/* ── Panel ───────────────────────────────────────────────────────────────── */
.drawer-panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: min(560px, 100vw);
  background: var(--tf-surface);
  border-left: 1px solid var(--tf-border);
  z-index: 201;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: -4px 0 24px rgba(0,0,0,.12);
}

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 220ms cubic-bezier(.4,0,.2,1); }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }

/* ── Header ──────────────────────────────────────────────────────────────── */
.drawer-header {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--tf-border);
  flex-shrink: 0;
}
.drawer-title-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px;
}
.drawer-docname { font-size: 11px; color: var(--tf-text-faint); font-weight: 500; }
.drawer-header-actions { display: flex; gap: 4px; }

.drawer-task-title {
  width: 100%;
  font-size: 16px; font-weight: 600;
  color: var(--tf-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  resize: none;
  padding: 4px 6px;
  font-family: inherit;
  line-height: 1.4;
  transition: border-color 120ms;
}
.drawer-task-title:focus { outline: none; border-color: var(--tf-primary); background: var(--tf-bg); }

/* ── Body ────────────────────────────────────────────────────────────────── */
.drawer-body {
  flex: 1; overflow-y: auto;
  padding: 0 16px 24px;
}

.drawer-loading {
  flex: 1; display: flex; align-items: center; justify-content: center;
}

/* ── Sections ────────────────────────────────────────────────────────────── */
:deep(.drawer-section) {
  margin-top: 20px;
}
:deep(.section-title) {
  font-size: 11px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: var(--tf-text-faint);
  margin: 0 0 10px;
}
:deep(.section-body) { display: flex; flex-direction: column; gap: 6px; }

/* ── Meta grid ───────────────────────────────────────────────────────────── */
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

:deep(.meta-field) { display: flex; flex-direction: column; gap: 3px; }
:deep(.meta-label) { font-size: 11px; color: var(--tf-text-faint); }
:deep(.meta-value) { }

.meta-select, .meta-input {
  padding: 5px 8px;
  border: 1px solid var(--tf-border);
  border-radius: 5px;
  background: var(--tf-bg);
  color: var(--tf-text);
  font-size: 13px;
  outline: none;
  width: 100%;
}
.meta-select:focus, .meta-input:focus { border-color: var(--tf-primary); }
.meta-input.overdue { border-color: var(--tf-overdue); color: var(--tf-overdue); }
.meta-readonly { font-size: 13px; color: var(--tf-text-muted); }
.meta-empty { font-size: 12px; color: var(--tf-text-faint); font-style: italic; }

/* Progress */
.progress-row { display: flex; align-items: center; gap: 8px; }
.progress-bar-wrap {
  flex: 1; height: 6px; background: var(--tf-border);
  border-radius: 3px; overflow: hidden;
}
.progress-bar-fill { height: 100%; background: var(--tf-primary); border-radius: 3px; transition: width 300ms; }
.progress-label { font-size: 12px; color: var(--tf-text-muted); white-space: nowrap; }

/* Assignees */
.assignee-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
.assignee-chip {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 6px 3px 3px;
  border: 1px solid var(--tf-border);
  border-radius: 999px;
  font-size: 12px; color: var(--tf-text);
}
.assignee-name { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.assignee-remove {
  display: flex; align-items: center; justify-content: center;
  width: 16px; height: 16px;
  background: var(--tf-hover-bg); border: none;
  border-radius: 50%; cursor: pointer;
  color: var(--tf-text-faint);
  flex-shrink: 0;
  transition: background 100ms, color 100ms;
}
.assignee-remove:hover { background: #fee2e2; color: var(--tf-overdue); }

/* Add assignee */
.add-assignee-row { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
.add-assignee-select { flex: 1; min-width: 0; }
.assignee-add-btn {
  padding: 5px 12px;
  background: var(--tf-primary); color: #fff;
  border: none; border-radius: 5px;
  font-size: 12px; cursor: pointer;
  white-space: nowrap;
  transition: background 120ms;
}
.assignee-add-btn:hover:not(:disabled) { background: var(--tf-primary-hover); }
.assignee-add-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Contact actions */
.contact-actions { display: flex; gap: 8px; margin-top: 8px; }
.action-btn {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 12px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  font-size: 12px; cursor: pointer;
  background: var(--tf-surface);
  transition: background 120ms;
}
.action-btn:hover { background: var(--tf-hover-bg); }
.action-btn.whatsapp { color: #16a34a; border-color: #bbf7d0; }
.action-btn.whatsapp:hover { background: #f0fdf4; }
.action-btn.email { color: var(--tf-primary); border-color: color-mix(in srgb, var(--tf-primary) 30%, transparent); }
.action-btn.email:hover { background: var(--tf-active-bg); }

/* Description */
.desc-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid var(--tf-border);
  border-radius: 6px;
  background: var(--tf-bg);
  color: var(--tf-text);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}
.desc-textarea:focus { border-color: var(--tf-primary); }

/* Subtasks */
.subtask-row {
  display: flex; align-items: center; gap: 8px;
  padding: 5px 0;
}
.subtask-check {
  width: 20px; height: 20px;
  border: 1.5px solid var(--tf-border);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  background: transparent;
  color: transparent;
  transition: all 120ms;
  flex-shrink: 0;
}
.subtask-check.done {
  background: var(--tf-completed);
  border-color: var(--tf-completed);
  color: white;
}
.new-subtask-row { display: flex; gap: 6px; margin-top: 6px; }

/* Cover thumb */
.cover-thumb { width: 100%; max-height: 80px; object-fit: cover; border-radius: 4px; }

/* Badge */
.badge-yes { color: var(--tf-completed); font-size: 12px; }
.badge-no  { color: var(--tf-text-faint); font-size: 12px; }

/* Comments */
.comment-list { display: flex; flex-direction: column; gap: 14px; }
.comment-item { display: flex; gap: 10px; align-items: flex-start; }
.comment-body { flex: 1; }
.comment-meta { display: flex; gap: 8px; align-items: baseline; margin-bottom: 2px; }
.comment-owner { font-size: 12px; font-weight: 600; color: var(--tf-text); }
.comment-date  { font-size: 11px; color: var(--tf-text-faint); }
.comment-content { font-size: 13px; color: var(--tf-text); line-height: 1.5; }

.new-comment-row { display: flex; gap: 10px; align-items: flex-start; margin-top: 14px; }
.new-comment-input-wrap { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.submit-comment-btn {
  align-self: flex-end;
  padding: 5px 14px;
  background: var(--tf-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: background 120ms;
}
.submit-comment-btn:hover:not(:disabled) { background: var(--tf-primary-hover); }
.submit-comment-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Skeleton */
.skeleton-line {
  height: 20px; border-radius: 4px;
  background: linear-gradient(90deg, var(--tf-hover-bg) 25%, var(--tf-border) 50%, var(--tf-hover-bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
}
.skeleton-line.wide { width: 80%; }
@keyframes shimmer { to { background-position: -200% 0; } }

.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border: none; background: transparent;
  border-radius: 6px; cursor: pointer;
  color: var(--tf-text-muted);
  transition: background 120ms;
}
.icon-btn:hover { background: var(--tf-hover-bg); color: var(--tf-text); }

.line-through { text-decoration: line-through; color: var(--tf-text-faint); }
</style>
