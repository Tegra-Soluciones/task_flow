<template>
  <span class="badge" :class="variantClass" :style="dotStyle">
    <span v-if="dot" class="badge-dot" />
    {{ label }}
  </span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  /** Pass either status OR priority */
  status:   { type: String, default: null },
  priority: { type: String, default: null },
  dot:      { type: Boolean, default: true },
});

// ── Status map ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  "Open":           { label: "Abierta",        color: "var(--tf-open)" },
  "Working":        { label: "En progreso",     color: "var(--tf-working)" },
  "Pending Review": { label: "En revisión",     color: "var(--tf-review)" },
  "Overdue":        { label: "Vencida",          color: "var(--tf-overdue)" },
  "Completed":      { label: "Completada",      color: "var(--tf-completed)" },
  "Cancelled":      { label: "Cancelada",       color: "var(--tf-cancelled)" },
  "Template":       { label: "Plantilla",       color: "var(--tf-cancelled)" },
};

// ── Priority map ──────────────────────────────────────────────────────────
const PRIORITY_MAP = {
  "Urgent": { label: "Urgente",  color: "var(--tf-urgent)" },
  "High":   { label: "Alta",     color: "var(--tf-high)" },
  "Medium": { label: "Media",    color: "var(--tf-medium)" },
  "Low":    { label: "Baja",     color: "var(--tf-low)" },
};

const entry = computed(() => {
  if (props.status)   return STATUS_MAP[props.status]   || { label: props.status,   color: "var(--tf-text-muted)" };
  if (props.priority) return PRIORITY_MAP[props.priority] || { label: props.priority, color: "var(--tf-text-muted)" };
  return { label: "—", color: "var(--tf-text-muted)" };
});

const label = computed(() => entry.value.label);

const dotStyle = computed(() => ({
  "--badge-color": entry.value.color,
}));

// background = color at 12% opacity — achieved via CSS
const variantClass = computed(() => "badge-themed");
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid color-mix(in srgb, var(--badge-color) 30%, transparent);
  background: color-mix(in srgb, var(--badge-color) 10%, transparent);
  color: var(--badge-color);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--badge-color);
  flex-shrink: 0;
}
</style>
