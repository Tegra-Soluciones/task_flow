<template>
  <article
    class="task-card"
    :style="task.color ? { '--card-accent': task.color } : {}"
    :class="{
      'has-accent': !!task.color,
      compact,
      overdue: isOverdueState,
      'due-soon': isDueSoonState || isDueTodayState,
    }"
    :data-task-name="task.name"
    @click="$emit('click', task)"
  >
    <!-- Quick actions overlay (shown on hover when quickActions=true) -->
    <div v-if="quickActions" class="quick-actions" @click.stop>
      <button class="qa-btn" @click="$emit('complete', task)" :title="task.status === 'Completed' ? 'Reabrir' : 'Completar'">
        <CheckIcon :size="12" />
      </button>
      <button class="qa-btn" @click="$emit('whatsapp', task)" title="WhatsApp">
        <PhoneIcon :size="12" />
      </button>
      <button class="qa-btn" @click="$emit('email', task)" title="Email">
        <MailIcon :size="12" />
      </button>
    </div>
    <!-- Cover image -->
    <div v-if="task.cover_image" class="card-cover">
      <img :src="task.cover_image" :alt="task.subject" />
    </div>

    <div class="card-body">
      <!-- Top row: project + badges -->
      <div class="card-top">
        <span v-if="task.project" class="card-project">{{ task.project }}</span>
        <div class="card-badges">
          <span v-if="isDueTodayState" class="due-badge today">Vence hoy</span>
          <span v-else-if="isDueSoonState" class="due-badge warning">Por vencer</span>
          <StatusBadge v-if="task.priority" :priority="task.priority" :dot="false" />
          <StatusBadge v-if="task.status" :status="task.status" :dot="true" />
        </div>
      </div>

      <!-- Title -->
      <h4 class="card-title">{{ task.subject }}</h4>

      <!-- Footer: due date + assignees + watchers -->
      <div class="card-footer">
        <div class="card-meta">
          <span
            v-if="task.exp_end_date"
            class="meta-date"
            :class="{ overdue: isOverdueState, warning: isDueSoonState || isDueTodayState }"
          >
            <CalendarIcon :size="12" />
            {{ fmtDate(task.exp_end_date) }}
          </span>
          <span v-if="task.progress" class="meta-progress">
            {{ task.progress }}%
          </span>
        </div>

        <!-- Assignee avatars -->
        <div v-if="assigneeProfiles.length" class="assignee-stack">
          <UserAvatar
            v-for="(assignee, i) in assigneeProfiles.slice(0, 3)"
            :key="assignee.name"
            :name="assignee.full_name || assignee.name"
            :src="assignee.user_image || null"
            :size="20"
            class="assignee-avatar"
            :style="{ zIndex: 10 - i, marginLeft: i > 0 ? '-6px' : '0' }"
          />
          <span v-if="assigneeProfiles.length > 3" class="assignee-overflow">+{{ assigneeProfiles.length - 3 }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from "vue";
import { CalendarIcon, CheckIcon, PhoneIcon, MailIcon } from "lucide-vue-next";
import { fmtDate, isDueSoon, isDueToday, isOverdue } from "../../api/index.js";
import StatusBadge from "./StatusBadge.vue";
import UserAvatar from "./UserAvatar.vue";

const props = defineProps({
  task: { type: Object, required: true },
  quickActions: { type: Boolean, default: false },
  assigneeUsers: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
  dueSoonDays: { type: Number, default: 3 },
});

defineEmits(["click", "complete", "whatsapp", "email"]);

const assigneeProfiles = computed(() =>
  props.assigneeUsers.length
    ? props.assigneeUsers
    : (props.task._assignees || []).map((email) => ({
        name: email,
        full_name: email,
        user_image: null,
      }))
);

const isOverdueState = computed(() => isOverdue(props.task));
const isDueTodayState = computed(() => isDueToday(props.task));
const isDueSoonState = computed(() => isDueSoon(props.task, props.dueSoonDays));
</script>

<style scoped>
.task-card {
  background: var(--tf-surface);
  border: 1px solid var(--tf-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 150ms, border-color 150ms, transform 150ms;
}

.task-card:hover {
  box-shadow: var(--tf-shadow);
  border-color: color-mix(in srgb, var(--tf-primary) 40%, var(--tf-border));
  transform: translateY(-1px);
}

.task-card.overdue {
  border-color: color-mix(in srgb, var(--tf-overdue) 30%, var(--tf-border));
}

.task-card.due-soon {
  border-color: color-mix(in srgb, #d97706 24%, var(--tf-border));
}

/* Left accent bar from task.color */
.task-card.has-accent {
  border-left: 3px solid var(--card-accent);
}

/* Cover image */
.card-cover {
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: var(--tf-hover-bg);
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-body { padding: 12px; }

.task-card.compact .card-body { padding: 10px; }
.task-card.compact .card-cover { height: 88px; }
.task-card.compact .card-title {
  margin-bottom: 8px;
  font-size: 12px;
  -webkit-line-clamp: 2;
}
.task-card.compact .card-project,
.task-card.compact .meta-date,
.task-card.compact .meta-progress {
  font-size: 10px;
}

/* Top row */
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.card-project {
  font-size: 11px;
  color: var(--tf-text-faint);
  font-weight: 500;
}

.card-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.due-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  letter-spacing: .02em;
}

.due-badge.warning {
  color: #b45309;
  background: #ffedd5;
}

.due-badge.today {
  color: #92400e;
  background: #fef3c7;
}

/* Title */
.card-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tf-text);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-date {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: var(--tf-text-faint);
}
.meta-date.overdue { color: var(--tf-overdue); }
.meta-date.warning { color: #b45309; font-weight: 600; }

.meta-progress {
  font-size: 11px;
  font-weight: 600;
  color: var(--tf-text-muted);
}

/* Assignee stack */
.assignee-stack {
  display: flex;
  align-items: center;
}

.assignee-avatar {
  border: 2px solid var(--tf-surface);
  border-radius: 50%;
}

.assignee-overflow {
  font-size: 10px;
  font-weight: 600;
  color: var(--tf-text-muted);
  margin-left: 4px;
}

/* Quick actions overlay */
.task-card { position: relative; }

.quick-actions {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 120ms;
  z-index: 2;
}
.task-card:hover .quick-actions { opacity: 1; }

.qa-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: var(--tf-surface);
  box-shadow: var(--tf-shadow);
  cursor: pointer;
  color: var(--tf-text-muted);
  transition: background 100ms;
}
.qa-btn:hover { background: var(--tf-hover-bg); color: var(--tf-text); }
</style>
