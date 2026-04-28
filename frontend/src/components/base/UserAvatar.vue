<template>
  <div
    class="avatar"
    :style="{
      width: size + 'px',
      height: size + 'px',
      fontSize: Math.max(10, Math.round(size * 0.38)) + 'px',
      background: src ? 'transparent' : bgColor,
    }"
    :title="name"
  >
    <img v-if="src" :src="src" :alt="name" class="avatar-img" />
    <span v-else class="avatar-initials">{{ initials }}</span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  name: { type: String, default: "" },
  src:  { type: String, default: null },
  size: { type: Number, default: 32 },
});

const COLORS = [
  "#4f46e5","#7c3aed","#2563eb","#0891b2",
  "#059669","#d97706","#dc2626","#db2777",
];

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

const initials = computed(() => {
  const parts = (props.name || "?").trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : (parts[0][0] || "?").toUpperCase();
});

const bgColor = computed(() => hashColor(props.name || "?"));
</script>

<style scoped>
.avatar {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  color: #fff;
  font-weight: 600;
  user-select: none;
}
.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-initials { line-height: 1; }
</style>
